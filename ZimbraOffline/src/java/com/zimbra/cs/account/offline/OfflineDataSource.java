/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2006, 2007 Zimbra, Inc.
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
package com.zimbra.cs.account.offline;

import java.io.FileInputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.Collections;

import com.zimbra.common.service.ServiceException;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.DataSource;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.mailbox.DesktopMailbox;
import com.zimbra.cs.mailbox.Flag;
import com.zimbra.cs.mailbox.Folder;
import com.zimbra.cs.mailbox.Mailbox;
import com.zimbra.cs.mailbox.LocalMailbox;
import com.zimbra.cs.mailbox.SyncExceptionHandler;
import com.zimbra.cs.mailbox.MailItem;
import com.zimbra.cs.mailbox.LocalJMSession;
import com.zimbra.cs.mailbox.Message;
import com.zimbra.cs.offline.OfflineLC;
import com.zimbra.cs.offline.OfflineLog;
import com.zimbra.cs.offline.GMailImport;
import com.zimbra.cs.offline.YMailImport;
import com.zimbra.cs.offline.OfflineImport;
import com.zimbra.cs.offline.util.ymail.YMailClient;
import com.zimbra.cs.offline.util.OfflineYAuth;
import com.zimbra.cs.offline.common.OfflineConstants;
import com.zimbra.cs.datasource.SyncState;
import com.zimbra.cs.datasource.ImapSync;
import com.zimbra.cs.mailclient.CommandFailedException;
import com.yahoo.mail.UserData;
import com.yahoo.mail.AllOtherYahooMboxes;
import com.yahoo.mail.YahooMbox;

import javax.mail.Session;

public class OfflineDataSource extends DataSource {
    private KnownService knownService;

    OfflineDataSource(Account acct, DataSource.Type type, String name, String id, Map<String,Object> attrs, Provisioning prov) {
        super(acct, type, name, id, attrs, prov);
        setServiceName(getAttr(OfflineConstants.A_zimbraDataSourceDomain));
    }

    void setName(String name) {
        mName = name;
    }

    void setServiceName(String serviceName) {
    	knownService = serviceName == null ? null : knownServices.get(serviceName);
    }

    public KnownService getKnownService() {
        return knownService;
    }
    
    public static synchronized KnownService getKnownServiceByName(String serviceName) {
        return knownServices.get(serviceName);
    }
    
    public static class KnownService {        
        public String name;
        public boolean saveToSent;
        public KnownFolder[] folders;
        public Map<String, String> attrs;
    }
    
    private static class KnownFolder {
    	String localPath; //zimbra path
    	String remotePath; //imap path
    	boolean isSyncEnabled;
    }
    
    private static Map<String, KnownService> knownServices = new HashMap<String, KnownService>();
    private static boolean isSyncAllFoldersByDefault = false;

    private static final String PROP_DATASOURCE = "datasource";
    private static final String PROP_SYNCALLFOLDERS = "datasource.syncAllFolders";
    private static final String PROP_DATASOURCE_COUNT = "datasource.count";
    private static final String PROP_SERVICENAME = "serviceName";
    private static final String PROP_KNOWNFOLDER = "knownFolder";
    private static final String PROP_SAVETOSENT = "saveToSent";
    private static final String PROP_KNOWNFOLDER_COUNT = "knownFolder.count";
    private static final String PROP_LOCAL = "local";
    private static final String PROP_REMOTE = "remote";
    private static final String PROP_SYNC = "sync";
    private static final String PROP_ATTR_COUNT = "attr.count";
    private static final String PROP_ATTR = "attr";

    private static final String SERVICE_NAME_LIVE = "hotmail.com";
    private static final String SERVICE_NAME_YAHOO = "yahoo.com";
    private static final String SERVICE_NAME_GMAIL = "gmail.com";

    public static void init() throws IOException {
        EProperties props = new EProperties();
        props.load(new FileInputStream(OfflineLC.zdesktop_datasource_properties.value()));

        isSyncAllFoldersByDefault = props.getPropertyAsBoolean(PROP_SYNCALLFOLDERS, false);

        int dsCount = props.getPropertyAsInteger(PROP_DATASOURCE_COUNT, 0);
        for (int i = 0; i < dsCount; ++i) {
            String serviceName = props.getNumberedProperty(PROP_DATASOURCE, i, PROP_SERVICENAME);
            if (serviceName != null && serviceName.length() > 0) {
                KnownService ks = new KnownService();
                ks.name = serviceName;
                ks.saveToSent = "true".equalsIgnoreCase(
                    props.getNumberedProperty(PROP_DATASOURCE, i, PROP_SAVETOSENT, "true"));
                
                int folderCount = props.getNumberedPropertyAsInteger(PROP_DATASOURCE, i, PROP_KNOWNFOLDER_COUNT, 0);
                if (folderCount > 0) {
                    OfflineLog.offline.debug("Loading %d folder mappings for service '%s'", folderCount, serviceName);                    
                    ks.folders = new KnownFolder[folderCount];
                    for (int j = 0; j < folderCount; ++j) {
                        KnownFolder kf = new KnownFolder();
                        kf.localPath = props.getNumberedProperty(PROP_DATASOURCE, i, PROP_KNOWNFOLDER, j, PROP_LOCAL);
                        kf.localPath = ".ignore".equals(kf.localPath) ? "" : kf.localPath;
                        kf.remotePath = props.getNumberedProperty(PROP_DATASOURCE, i, PROP_KNOWNFOLDER, j, PROP_REMOTE);
                        kf.remotePath = ".ignore".equals(kf.remotePath) ? "" : kf.remotePath;
                        kf.isSyncEnabled = props.getNumberedPropertyAsBoolean(PROP_DATASOURCE, i, PROP_KNOWNFOLDER, j, PROP_SYNC, false);
                        ks.folders[j] = kf;
                    }                    
                }
                                
                int attrCount = props.getNumberedPropertyAsInteger(PROP_DATASOURCE, i, PROP_ATTR_COUNT, 0);
                if (attrCount > 0) {
                    OfflineLog.offline.debug("Loading %d attrs for service '%s'", attrCount, serviceName);
                    ks.attrs = new HashMap <String, String> ();
                    for (int j = 0; j < attrCount; ++j) {
                        String kv = props.getNumberedProperty(PROP_DATASOURCE, i, PROP_ATTR, j);
                        int pos;
                        if (kv != null && (pos = kv.indexOf(':')) > 0)
                            ks.attrs.put(kv.substring(0, pos), kv.substring(pos + 1)); 
                    }
                } else {
                    ks.attrs = null;
                }
                
                if (folderCount > 0 || attrCount > 0)
                    knownServices.put(serviceName, ks);
            }
        }
    }

    private KnownFolder getKnownFolderByRemotePath(String remotePath) {
        if (knownService != null && knownService.folders != null)
            for (KnownFolder kf : knownService.folders)
                if (remotePath.equals(kf.remotePath))
                    return kf;
        return null;
    }

    private KnownFolder getKnownFolderByLocalPath(String localPath) {
        if (knownService != null && knownService.folders != null)
            for (KnownFolder kf : knownService.folders)
                if (localPath.equals(kf.localPath))
                    return kf;
        return null;
    }

    public boolean isSyncEnabledByDefault(String localPath) {
        if (localPath.equalsIgnoreCase("/Inbox"))
            return true;
        KnownFolder kf = getKnownFolderByLocalPath(localPath);
        return kf == null ? isSyncAllFoldersByDefault || getBooleanAttr(OfflineConstants.A_zimbraDataSourceSyncAllServerFolders, false) : kf.isSyncEnabled;
    }

    @Override
    public String matchKnownLocalPath(String remotePath) {
        KnownFolder kf = getKnownFolderByRemotePath(remotePath);
        return kf == null ? null : kf.localPath;
    }

    @Override
    public String matchKnownRemotePath(String localPath) {
    	if (DesktopMailbox.isInArchive(localPath))
    		return ""; //empty means to ignore
        KnownFolder kf = getKnownFolderByLocalPath(localPath);
        return kf == null ? null : kf.remotePath;
    }

	@Override
	public boolean isSyncInboxOnly() {
		return !getBooleanAttr(OfflineConstants.A_zimbraDataSourceSyncAllServerFolders, false);
	}

	@Override
	public boolean isSyncCapable(Folder folder) {
		if (isSyncInboxOnly())
			return folder.getId() == Mailbox.ID_FOLDER_INBOX;
		return (folder.getFlagBitmask() & Flag.BITMASK_SYNCFOLDER) != 0;
	}

	@Override
	public boolean isSyncEnabled(Folder folder) {
        if (isSyncInboxOnly() && folder.getId() != Mailbox.ID_FOLDER_INBOX) {
            return false;
        }
        int bits = folder.getFlagBitmask();
        return (bits & Flag.BITMASK_SYNCFOLDER) != 0 && (bits & Flag.BITMASK_SYNC) != 0;
	}

	@Override
	public boolean isSyncEnabled(String localPath) {
		if (isSyncInboxOnly())
			return localPath.equalsIgnoreCase("/Inbox");
		try {
			Mailbox mbox = getMailbox();
			Folder folder = mbox.getFolderByPath(new Mailbox.OperationContext(mbox), localPath);
			if (folder != null)
				return isSyncEnabled(folder);
            else
                OfflineLog.offline.warn("local path " + localPath + " not found");
		} catch (ServiceException x) {
			OfflineLog.offline.warn(x);
		}
		return isSyncEnabledByDefault(localPath);
	}

    public boolean isSaveToSent() {
        return getType() == Type.pop3 || knownService == null || knownService.saveToSent;
    }

    public boolean isLive() {
        return knownService != null && knownService.name.equals(SERVICE_NAME_LIVE);
    }
    
    public boolean isYahoo() {
        return knownService != null && knownService.name.equals(SERVICE_NAME_YAHOO);
    }
    
    public boolean isGmail() {
        return knownService != null && knownService.name.equals(SERVICE_NAME_GMAIL);
    }
    
    private static final int MAX_ENTRIES = 64 * 1024;

    private static final Map<Object, SyncState> sSyncStateMap =
        Collections.synchronizedMap(new LinkedHashMap<Object, SyncState>() {
            @SuppressWarnings("unchecked")
            protected boolean removeEldestEntry(Map.Entry eldest) {
                return size() > MAX_ENTRIES;
            }
        });

    @Override
    public boolean hasSyncState(int folderId) {
        Object key = key(folderId);
        return key != null && sSyncStateMap.containsKey(key);
    }

    @Override
    public SyncState getSyncState(int folderId) {
        Object key = key(folderId);
        SyncState ss = key != null ? sSyncStateMap.get(key) : null;
        OfflineLog.offline.debug("getSyncState: folder = %d, key = %s, state = %s",
                                 folderId, key, ss);
        return ss;
    }
    
    @Override
    public SyncState removeSyncState(int folderId) {
        Object key = key(folderId);
        SyncState ss = key != null ? sSyncStateMap.remove(key) : null;
        OfflineLog.offline.debug("getSyncState: folder = %d, key = %s, state = %s",
                                 folderId, key, ss);
        return ss;
    }
    
    @Override
    public void putSyncState(int folderId, SyncState ss) {
        Object key = key(folderId);
        OfflineLog.offline.debug("putSyncState: folder %d, key = %s, state = %s",
                                 folderId, key, ss);
        if (key != null) {
            sSyncStateMap.put(key, ss);
        }
    }

    @Override
    public void clearSyncState(int folderId) {
        Object key = key(folderId);
        OfflineLog.offline.debug("clearSyncState: folder %d, key = %s", folderId, key);
        if (key != null) {
            sSyncStateMap.remove(key);
        }
    }

    private Object key(int folderId) {
        try {
            int mailboxId = getMailbox().getId();
            return (long) mailboxId << 32 | (folderId & 0xffffffffL);
        } catch (ServiceException e) {
            return null;
        }
    }

    @Override
    public void reportError(int itemId, String error, Exception e) {
        String data = "";
        try {
            // If this is a message, then indicate folder name
            Mailbox mbox = getMailbox();
            Message msg = mbox.getMessageById(null, itemId);
            Folder folder = mbox.getFolderById(null, msg.getFolderId());
            data = "Local folder: " + folder.getPath() + "\n";
        } catch (ServiceException ex) {
        }
        if (e instanceof CommandFailedException) {
            String req = ((CommandFailedException) e).getRequest();
            if (req != null) {
                data += "Failed request: " + req;
            }
        }
        try {
            SyncExceptionHandler.saveFailureReport((DesktopMailbox) getMailbox(), itemId, error, data, 0, e);
        } catch (ServiceException x) {
            // Ignore
        }
    }

    @Override
    public boolean isOffline() {
        return true;
    }

    @Override
    public boolean checkPendingMessages() throws ServiceException {
        LocalMailbox mbox = (LocalMailbox) getMailbox();
        return mbox.getFolderById(null, LocalMailbox.ID_FOLDER_OUTBOX).getSize() > 0 &&
               mbox.sendPendingMessages(true) > 0;
    }

    @Override
    public long getSyncFrequency() {
        return getTimeInterval(OfflineProvisioning.A_zimbraDataSourceSyncFreq,
                               OfflineConstants.DEFAULT_SYNC_FREQ);
    }

    @Override
    public DataImport getDataImport() throws ServiceException {
        if (getType() == Type.imap) {
            if (isYahoo()) {
                return new YMailImport(this);
            } else if (isGmail()) {
                return new GMailImport(this);
            } else {
                return new OfflineImport(this, new ImapSync(this), OfflineImport.IMAP_INTERVAL);
            }
        }
        return super.getDataImport();
    }
    
    public boolean isEmail() {
    	return getType() == Type.imap || getType() == Type.pop3;
    }
    
    public boolean needsSmtpAuth() {
    	return isEmail() && !isLive() && !isYahoo();
    }

    public boolean isContactSyncEnabled() {
        return getBooleanAttr(OfflineProvisioning.A_zimbraDataSourceContactSyncEnabled, false);
    }

    public boolean isCalendarSyncEnabled() {
        return getBooleanAttr(OfflineProvisioning.A_zimbraDataSourceCalendarSyncEnabled, false);
    }

    public void setContactSyncEnabled(boolean enabled) throws ServiceException {
        OfflineProvisioning op = (OfflineProvisioning) Provisioning.getInstance();
        op.setDataSourceAttribute(
            this, OfflineProvisioning.A_zimbraDataSourceContactSyncEnabled,
            enabled ? Provisioning.TRUE : Provisioning.FALSE);
    }

    public void setCalendarSyncEnabled(boolean enabled) throws ServiceException {
        OfflineProvisioning op = (OfflineProvisioning) Provisioning.getInstance();
        op.setDataSourceAttribute(
            this, OfflineProvisioning.A_zimbraDataSourceCalendarSyncEnabled,
            enabled ? Provisioning.TRUE : Provisioning.FALSE);
    }
    
    @Override
    public boolean isDebugTraceEnabled() {
    	if (super.isDebugTraceEnabled())
    		return true;
    	boolean accountDebugTrace = false;
    	try {
    		accountDebugTrace = ((OfflineAccount)getAccount()).isDebugTraceEnabled();
    	} catch (ServiceException x) {}
    	return  accountDebugTrace;
    }


    /*
     * Returns true if the Yahoo email address associated with the specified
     * data source refers to a YMail small biz account, in which case we use
     * SMTP rather than Cascade to send the message.
     */
    public boolean isYBizmail() {
        if (!isYahoo()) return false;
        try {
            YMailClient ymc = new YMailClient(OfflineYAuth.authenticate(this));
            UserData ud = ymc.getUserData();
            AllOtherYahooMboxes mbs = ud.getOtherYahooMboxes();
            if (mbs != null && mbs.getOtherYahooMboxesTotal() > 0) {
                String email = getEmailAddress();
                for (YahooMbox mb : mbs.getYMbox()) {
                    if (email.equalsIgnoreCase(mb.getEmail())) {
                        return mb.isIsBizmail();
                    }
                }
            }
        } catch (Exception e) {
            OfflineLog.ymail.warn(
                "Unable to get UserData for address %s", getEmailAddress());
        }
        return false;
    }

    public Session getYBizmailSession() throws ServiceException {
        return LocalJMSession.getSession(
            OfflineLC.zdesktop_ybizmail_smtp_host.value(),
            OfflineLC.zdesktop_ybizmail_smtp_port.intValue(),
            true, // isAuthRequired
            getUsername(),
            getDecryptedPassword(),
            true, // useSSL
            false,// useProxy
            null, // proxyHost
            0,    // proxyPort
            isDebugTraceEnabled());
    }
    
}

