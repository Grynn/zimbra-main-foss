/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2008, 2009 Zimbra, Inc.
 * 
 * The contents of this file are subject to the Yahoo! Public License
 * Version 1.0 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * ***** END LICENSE BLOCK *****
 */
package com.zimbra.cs.datasource;

import java.io.IOException;
import java.io.InputStream;
import java.io.PrintStream;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.mail.MessagingException;
import javax.security.auth.login.LoginException;

import com.zimbra.common.localconfig.LC;
import com.zimbra.common.service.RemoteServiceException;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.Log;
import com.zimbra.common.util.SSLSocketFactoryManager;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.account.DataSource;
import com.zimbra.cs.filter.RuleManager;
import com.zimbra.cs.mailbox.Flag;
import com.zimbra.cs.mailbox.MailServiceException;
import com.zimbra.cs.mailbox.Message;
import com.zimbra.cs.mailbox.DeliveryContext;
import com.zimbra.cs.mailclient.CommandFailedException;
import com.zimbra.cs.mailclient.pop3.Pop3Capabilities;
import com.zimbra.cs.mailclient.pop3.Pop3Config;
import com.zimbra.cs.mailclient.pop3.Pop3Connection;
import com.zimbra.cs.mime.ParsedMessage;

public class Pop3Sync extends MailItemImport {
    private final Pop3Connection connection;
    private final boolean indexAttachments;

    private static final boolean DEBUG = LC.javamail_pop3_debug.booleanValue();

    private static final Log LOG = ZimbraLog.datasource;
    static {
        if (DEBUG) LOG.setLevel(Log.Level.debug);
    }

    // Zimbra UID format is: item_id "." blob_digest
    private static final Pattern PATTERN_ZIMBRA_UID =
        Pattern.compile("(\\d+)\\.([^\\.]+)");

    public Pop3Sync(DataSource ds) throws ServiceException {
        super(ds);
        connection = new Pop3Connection(getPop3Config(ds));
        indexAttachments = mbox.attachmentsIndexingEnabled();
    }

    private static Pop3Config getPop3Config(DataSource ds) {
        Pop3Config config = new Pop3Config();
        config.setHost(ds.getHost());
        config.setPort(ds.getPort());
        config.setAuthenticationId(ds.getUsername());
        config.setTlsEnabled(LC.javamail_pop3_enable_starttls.booleanValue());
        config.setSslEnabled(ds.isSslEnabled());
        config.setDebug(DEBUG);
        if (DEBUG || ds.isDebugTraceEnabled()) {
            enableTrace(config);
        }
        config.setReadTimeout(LC.javamail_pop3_timeout.intValue());
        config.setConnectTimeout(config.getReadTimeout());
        // config.setRawMode(true);
        config.setSSLSocketFactory(SSLSocketFactoryManager.getDefaultSSLSocketFactory());
        return config;
    }
    
    public synchronized void test() throws ServiceException {
        validateDataSource();
        enableTrace(connection.getPop3Config());
        try {
            connect();
        } finally {
            connection.close();
        }
    }

    private static void enableTrace(Pop3Config config) {
        config.setTrace(true);
        config.setTraceStream(
            new PrintStream(new LogOutputStream(ZimbraLog.pop), true));
    }

    public synchronized void importData(List<Integer> folderIds, boolean fullSync)
        throws ServiceException {
        validateDataSource();
        connect();
        try {
            if (dataSource.leaveOnServer()) {
                fetchAndRetainMessages();
            } else {
                fetchAndDeleteMessages();
            }
            connection.quit();
        } catch (ServiceException e) {
            throw e;
        } catch (Exception e) {
            throw ServiceException.FAILURE(
                "Synchronization of POP3 folder failed", e);
        } finally {
            connection.close();
        }
    }

    private void connect() throws ServiceException {
        if (!connection.isClosed()) return;
        try {
            connection.connect();
            try {
                connection.login(dataSource.getDecryptedPassword());
            } catch (CommandFailedException e) {
                throw new LoginException(e.getError());
            }
        } catch (Exception e) {
            connection.close();
            throw ServiceException.FAILURE(
                "Unable to connect to POP3 server: " + dataSource, e);
        }
        if (dataSource.leaveOnServer()) {
            checkHasUIDL();
        }
    }

    private void checkHasUIDL() throws ServiceException {
        if (!connection.hasCapability(Pop3Capabilities.UIDL)) {
            throw RemoteServiceException.POP3_UIDL_REQUIRED();
        }
    }
    
    private void fetchAndDeleteMessages()
        throws ServiceException, MessagingException, IOException {
        Integer sizes[] = connection.getMessageSizes();
        
        LOG.info("Found %d new message(s) on remote server", sizes.length);
        for (int msgno = sizes.length; msgno > 0; --msgno) {
            LOG.debug("Fetching message number %d", msgno);
            fetchAndAddMessage(msgno, sizes[msgno - 1], null);
            connection.deleteMessage(msgno);
        }
    }

    private void fetchAndRetainMessages()
        throws ServiceException, MessagingException, IOException {
        String[] uids = connection.getMessageUids();
        Set<String> existingUids = PopMessage.getMatchingUids(dataSource, uids);
        int count = uids.length - existingUids.size();
        
        LOG.info("Found %d new message(s) on remote server", count);
        if (count == 0) {
            return; // No new messages
        }
        if (poppingSelf(uids[0])) {
            throw ServiceException.INVALID_REQUEST(
                "User attempted to import messages from his own mailbox", null);
        }
        for (int msgno = uids.length; msgno > 0; --msgno) {
            String uid = uids[msgno - 1];
            
            if (!existingUids.contains(uid)) {
                LOG.debug("Fetching message with uid %s", uid);
                fetchAndAddMessage(msgno, connection.getMessageSize(msgno), uid);
            }
        }
    }

    private void fetchAndAddMessage(int msgno, int size, String uid)
        throws ServiceException, MessagingException, IOException {
        MessageContent mc = null;
        try {
            mc = MessageContent.read(connection.getMessage(msgno), size);
            ParsedMessage pm = mc.getParsedMessage(null, indexAttachments);
            Message msg = null;

            DeliveryContext dc = mc.getDeliveryContext();
            if (isOffline()) {
                msg = addMessage(null, pm, dataSource.getFolderId(), Flag.BITMASK_UNREAD, dc);
            } else {
                Integer localId = getFirstLocalId(
                    RuleManager.applyRulesToIncomingMessage(
                        mbox, pm, dataSource.getEmailAddress(), dc, dataSource.getFolderId()));
                if (localId != null) {
                    msg = mbox.getMessageById(null, localId);
                }
            }
            if (msg != null && uid != null) {
                PopMessage msgTracker = new PopMessage(dataSource, msg.getId(), uid);
                msgTracker.add();
            }
        } catch (CommandFailedException e) {
            LOG.warn("Error fetching message number %d: %s", msgno, e.getMessage());
        } finally {
            if (mc != null) {
                mc.cleanup();
            }
        }
    }

    private boolean poppingSelf(String uid)
        throws ServiceException {
        Matcher matcher = PATTERN_ZIMBRA_UID.matcher(uid);
        if (!matcher.matches()) {
            return false; // Not a Zimbra UID
        }
        // See if this UID comes from the specified mailbox. Popping from
        // another Zimbra mailbox is ok.
        int itemId;
        try {
            itemId = Integer.parseInt(matcher.group(1));
        } catch (NumberFormatException e) {
            return false;
        }
        String digest = matcher.group(2);
        Message msg;
        try {
            msg = mbox.getMessageById(null, itemId);
        } catch (MailServiceException.NoSuchItemException e) {
            return false;
        }
        return digest.equals(msg.getDigest());
    }
}
