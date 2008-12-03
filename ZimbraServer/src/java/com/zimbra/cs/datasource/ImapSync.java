/*
 * ***** BEGIN LICENSE BLOCK *****
 *
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2007, 2008 Zimbra, Inc.
 *
 * The contents of this file are subject to the Yahoo! Public License
 * Version 1.0 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 *
 * ***** END LICENSE BLOCK *****
 */
package com.zimbra.cs.datasource;
                             
import com.zimbra.cs.mailclient.imap.ImapConfig;
import com.zimbra.cs.mailclient.imap.ImapConnection;
import com.zimbra.cs.mailclient.imap.ListData;
import com.zimbra.cs.mailclient.auth.Authenticator;
import com.zimbra.cs.mailclient.CommandFailedException;
import com.zimbra.cs.account.DataSource;
import com.zimbra.cs.mailbox.Folder;
import com.zimbra.cs.mailbox.MailServiceException;
import com.zimbra.cs.mailbox.MailItem;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.localconfig.LC;
import com.zimbra.common.util.SSLSocketFactoryManager;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.common.util.Log;
import com.zimbra.common.util.StringUtil;

import javax.security.auth.login.LoginException;
import java.io.IOException;
import java.io.PrintStream;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Collections;

public class ImapSync extends MailItemImport {
    private final ImapConnection connection;
    private final Authenticator authenticator;
    private Folder localRootFolder;
    private char delimiter; // Default IMAP hierarchy delimiter (0 if flat)
    private ImapFolderCollection trackedFolders;
    private Map<Integer, ImapFolderSync> syncedFolders;
    // Optional mail client authenticator (default is plaintext login)

    private static final boolean DEBUG =
        Boolean.getBoolean("ZimbraDataSourceImapDebug") ||
        LC.javamail_imap_debug.booleanValue();
    
    private static final Log LOG = ZimbraLog.datasource;
    static {
        if (DEBUG) LOG.setLevel(Log.Level.debug);
    }

    public ImapSync(DataSource ds, Authenticator auth) throws ServiceException {
        super(ds);
        connection = new ImapConnection(getImapConfig(ds));
        authenticator = auth;
    }

    public ImapSync(DataSource ds) throws ServiceException {
        this(ds, null);
    }

    public ImapConnection getConnection() { return connection; }

    public ImapFolderCollection getTrackedFolders() {
        return trackedFolders;
    }

    private static ImapConfig getImapConfig(DataSource ds) {
        ImapConfig config = new ImapConfig();
        config.setHost(ds.getHost());
        config.setPort(ds.getPort());
        config.setAuthenticationId(ds.getUsername());
        config.setMaxLiteralMemSize(LC.data_source_max_message_memory_size.intValue());
        config.setTlsEnabled(LC.javamail_imap_enable_starttls.booleanValue());
        config.setSslEnabled(ds.isSslEnabled());
        config.setDebug(DEBUG);
        if (DEBUG || ds.isDebugTraceEnabled()) {
            enableTrace(config);
        }
        config.setTimeout(LC.javamail_imap_timeout.intValue());
        // config.setRawMode(true);
        config.setSSLSocketFactory(SSLSocketFactoryManager.getDefaultSSLSocketFactory());
        return config;
    }

    public synchronized void test() throws ServiceException {
        validateDataSource();
        enableTrace(connection.getImapConfig());
        try {
            connect();
        } finally {
            connection.close();
        }
    }

    private static void enableTrace(ImapConfig config) {
        config.setTrace(true);
        config.setTraceStream(
            new PrintStream(new LogOutputStream(ZimbraLog.imap), true));
    }
    
    public synchronized void importData(List<Integer> folderIds, boolean fullSync)
        throws ServiceException {
        validateDataSource();
        connect();
        int folderId = dataSource.getFolderId();
        localRootFolder = getMailbox().getFolderById(null, folderId);
        try {
            syncFolders(folderIds, fullSync);
            connection.logout();
        } catch (IOException e) {
            throw ServiceException.FAILURE("Folder sync failed", e);
        } finally {
            connection.close();
        }
    }

    private void connect() throws ServiceException {
        if (!connection.isClosed()) return;
        try {
            connection.connect();
            try {
                if (authenticator != null) {
                    connection.authenticate(authenticator);
                } else {
                    connection.login(dataSource.getDecryptedPassword());
                }
            } catch (CommandFailedException e) {
                throw new LoginException(e.getError());
            }
            delimiter = connection.getDelimiter();
        } catch (Exception e) {
            connection.close();
            throw ServiceException.FAILURE(
                "Unable to connect to IMAP server: " + dataSource, e);
        }
    }

    private void syncFolders(List<Integer> folderIds, boolean fullSync)
        throws ServiceException, IOException {
        if (dataSource.isOffline()) {
            getMailbox().beginTrackingSync();
        }
        trackedFolders = dataSource.getImapFolders();
        syncedFolders = new HashMap<Integer, ImapFolderSync>();
        syncRemoteFolders(ImapUtil.listFolders(connection, "*"));
        syncLocalFolders(getLocalFolders());
        syncMessages(folderIds, fullSync);
        finishSync();
    }

    private List<Folder> getLocalFolders() {
        List<Folder> folders = localRootFolder.getSubfolderHierarchy();
        // Reverse order of local folders to ensure that children are
        // processed before parent folders. This avoids problems when
        // deleting folders.
        Collections.reverse(folders);
        return folders;
    }

    private void syncRemoteFolders(List<ListData> folders) throws ServiceException {
        for (ListData ld : folders) {
            try {
                ImapFolderSync ifs = new ImapFolderSync(this);
                ImapFolder tracker = ifs.syncFolder(ld);
                if (tracker != null) {
                    syncedFolders.put(tracker.getItemId(), ifs);
                }
            } catch (Exception e) {
                syncFailed(ld.getMailbox(), 0, e);
            }
        }
    }

    private void syncLocalFolders(List<Folder> folders) throws ServiceException {
        for (Folder folder : folders) {
            int id = folder.getId();
            if (id != localRootFolder.getId() && !syncedFolders.containsKey(id)) {
                try {
                    folder = getFolder(id);
                    if (folder != null) {
                        ImapFolderSync ifs = new ImapFolderSync(this);
                        ImapFolder tracker = ifs.syncFolder(folder);
                        if (tracker != null) {
                            syncedFolders.put(tracker.getItemId(), ifs);
                        }
                    }
                } catch (Exception e) {
                    syncFailed(folder.getPath(), folder.getId(), e);
                }
            }
        }
    }

    private void syncMessages(List<Integer> folderIds, boolean fullSync)
        throws ServiceException {
        // If folder ids specified, then only sync messages for specified
        // folders, otherwise sync messages for all folders.
        int lastModSeq = getMailbox().getLastChangeID();
        for (ImapFolderSync ifs : syncedFolders.values()) {
            LocalFolder folder = ifs.getLocalFolder();
            int folderId = folder.getId();
            try {
                if (folderIds == null || folderIds.contains(folderId) ||
                    hasLocalChanges(folderId, lastModSeq)) {
                    ifs.syncMessages(fullSync);
                }
            } catch (Exception e) {
                syncFailed(folder.getPath(), folder.getId(), e);
            }
        }
    }

    private boolean hasLocalChanges(int folderId, int lastModSeq) {
        SyncState ss = dataSource.getSyncState(folderId);
        return ss == null || ss.getLastModSeq() < lastModSeq;
    }

    private void finishSync() throws ServiceException {
        // Append new IMAP messages for folders which have been synchronized.
        // This is done after IMAP messages have been deleted in order to
        // avoid problems when local messages are moved between folders
        // (see bug 27924).
        for (ImapFolderSync ifs : syncedFolders.values()) {
            try {
                ifs.finishSync();
            } catch (Exception e) {
                LocalFolder folder = ifs.getLocalFolder();
                syncFailed(folder.getPath(), folder.getId(), e);
            }
        }
    }

    private Folder getFolder(int id) throws ServiceException {
        try {
            return localRootFolder.getMailbox().getFolderById(null, id);
        } catch (MailServiceException.NoSuchItemException e) {
            return null;
        }
    }

    private void syncFailed(String path, int itemId, Exception e)
        throws ServiceException {
        String error = String.format("Synchronization of folder '%s' failed", path);
        LOG.error(error, e);
        if (canContinue(e)) {
            error += ". Synchronization has been disabled for this folder";
            // Report the error and continue synchronization of other folders...
            dataSource.reportError(itemId, error, e);
            if (itemId > 0) {
                dataSource.disableSync(itemId);
            }
        } else if (e instanceof ServiceException) {
            throw (ServiceException) e;
        } else {
            throw ServiceException.FAILURE(error, e);
        }
    }

    /*
     * Returns true if synchronization of other folders can continue following
     * the specified sync error.
     */
    private boolean canContinue(Exception e) {
        return e instanceof ServiceException || e instanceof CommandFailedException;
    }
    /*
     * Returns the path to the Zimbra folder that stores messages for the given
     * IMAP folder. The Zimbra folder has the same path as the IMAP folder,
     * but is relative to the root folder specified by the DataSource.
     */
    String getLocalPath(ListData ld) {
        String remotePath = ld.getMailbox();
        char delimiter = ld.getDelimiter();
        String relativePath = ld.getMailbox();
        if (delimiter != '/' && (remotePath.indexOf(delimiter) >= 0 ||
                                 remotePath.indexOf('/') >= 0)) {
            // Change remote path to use our separator
            String[] parts = remotePath.split("\\" + delimiter);
            for (int i = 0; i < parts.length; i++) {
                // TODO Handle case where separator is not valid in Zimbra folder name
                parts[i] = parts[i].replace('/', delimiter);
            }
            relativePath = StringUtil.join("/", parts);
        }
        String zimbraPath = dataSource.matchKnownLocalPath(relativePath);
        if ("".equals(zimbraPath)) {
            return null; // Do not synchronize folder
        }
        if (zimbraPath == null) {
            // Remove leading slashes and append to root folder
            while (relativePath.startsWith("/")) {
                relativePath = relativePath.substring(1);
            }
            if (localRootFolder.getId() == com.zimbra.cs.mailbox.Mailbox.ID_FOLDER_USER_ROOT) {
                zimbraPath = "/" + relativePath;
            } else {
                zimbraPath = localRootFolder.getPath() + "/" + relativePath;
            }
        }
        return zimbraPath;
    }

    /*
     * Returns the IMAP path name for the specified local folder. Returns null
     * if the folder should not be imported.
     */
    String getRemotePath(Folder folder) throws ServiceException {
        if (!localRootFolder.isDescendant(folder)) {
            return null;
        }
        String imapPath = dataSource.matchKnownRemotePath(folder.getPath());
        if ("".equals(imapPath)) {
            return null; // Ignore folder
        }
        if (imapPath == null) {
            if (folder.getId() < com.zimbra.cs.mailbox.Mailbox.FIRST_USER_ID) {
                return null;
            }
            // Determine imap path from folder path
            imapPath = folder.getPath();
            // Strip root path from folder path
            String rootPath = localRootFolder.getPath();
            if (!rootPath.endsWith("/")) {
                rootPath += "/";
            }
            if (!imapPath.startsWith(rootPath)) {
                return null; // Folder no longer data source root
            }
            imapPath = imapPath.substring(rootPath.length());
        }
        // Handling for IMAP folder delimiter different from Zimbra's
        if (delimiter != 0 && delimiter != '/') {
            String[] parts = imapPath.split("/");
            for (int i = 0; i < parts.length; i++) {
                parts[i] = parts[i].replace(delimiter, '/');
            }
            imapPath = StringUtil.join(String.valueOf(delimiter), parts);
        }
        return imapPath;
    }
}
