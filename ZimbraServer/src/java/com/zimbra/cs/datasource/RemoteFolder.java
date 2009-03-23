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

import com.zimbra.cs.mailclient.imap.ImapConnection;
import com.zimbra.cs.mailclient.imap.Mailbox;
import com.zimbra.cs.mailclient.imap.Flags;
import com.zimbra.cs.mailclient.imap.ImapConfig;
import com.zimbra.cs.mailclient.imap.Literal;
import com.zimbra.cs.mailclient.imap.ImapData;
import com.zimbra.cs.mailclient.imap.MessageData;
import com.zimbra.cs.mailclient.imap.FetchResponseHandler;
import com.zimbra.cs.mailclient.imap.AppendResult;
import com.zimbra.cs.mailclient.imap.ImapRequest;
import com.zimbra.cs.mailclient.imap.CAtom;
import com.zimbra.cs.mailclient.imap.MailboxName;
import com.zimbra.cs.mailclient.imap.ResponseText;
import com.zimbra.cs.mailclient.imap.CopyResult;
import com.zimbra.cs.mailclient.CommandFailedException;
import com.zimbra.cs.mailclient.MailException;
import com.zimbra.common.util.Log;
import com.zimbra.common.util.ZimbraLog;

import javax.mail.internet.MimeMessage;
import javax.mail.MessagingException;
import java.io.IOException;
import java.io.File;
import java.io.OutputStream;
import java.io.FileOutputStream;
import java.util.Date;
import java.util.List;
import java.util.Collections;
import java.util.ArrayList;

public class RemoteFolder {
    private final ImapConnection connection;
    private final String path;
    private int deleted;

    private static final Log LOG = ZimbraLog.datasource;
    
    RemoteFolder(ImapConnection connection, String path) {
        this.connection = connection;
        this.path = path;
    }

    public void create() throws IOException {
        info("creating folder");
        try {
            connection.create(path);
        } catch (CommandFailedException e) {
            // OK if CREATE failed because mailbox already exists
            if (!exists()) throw e;
        }
    }

    public void delete() throws IOException {
        info("deleting folder");
        try {
            connection.delete(path);
        } catch (CommandFailedException e) {
            // OK if DELETE failed because mailbox didn't exist
            if (exists()) throw e;
        }
    }

    public RemoteFolder renameTo(String newName) throws IOException {
        info("renaming folder to '%s'", newName);
        connection.rename(path, newName);
        return new RemoteFolder(connection, newName);
    }

    public long appendMessage(MimeMessage msg, Flags flags, Date date)
        throws IOException {
        ensureSelected();
        ImapConfig config = connection.getImapConfig();
        File tmp = null;
        OutputStream os = null;
        try {
            tmp = File.createTempFile("lit", null, config.getLiteralDataDir());
            os = new FileOutputStream(tmp);
            msg.writeTo(os);
            os.close();
            AppendResult res = connection.append(path, flags, date, new Literal(tmp));
            return res != null ? res.getUid() : -1;
        } catch (MessagingException e) {
            throw new MailException("Error appending message", e);
        } finally {
            if (os != null) os.close();
            if (tmp != null) tmp.delete();
        }
    }

    public CopyResult copyMessage(long uid, String mbox) throws IOException {
        ensureSelected();
        String seq = String.valueOf(uid);
        ImapRequest req = connection.newUidRequest(CAtom.COPY, seq, new MailboxName(mbox));
        ResponseText rt = req.sendCheckStatus().getResponseText();
        if (rt.getCCode() == CAtom.COPYUID) {
            CopyResult cr = (CopyResult) rt.getData();
            if (cr != null) {
                if (seq.equals(cr.getFromUids())) {
                    // Validate destination UID and return result
                    try {
                        if (Long.parseLong(cr.getToUids()) > 0) {
                            return cr;
                        }
                    } catch (Exception e) {
                    }
                }
                throw req.failed("Invalid COPYUID result");
            }
        }
        return null; // Message not found
    }

    /**
     * Deletes and expunges messages for specified UIDs.
     * 
     * @param uids the UIDs to be deleted and expunged
     * @throws IOException if an I/O error occurred
     */
    public void deleteMessages(List<Long> uids) throws IOException {
        ensureSelected();
        int size = uids.size();
        debug("deleting %d messages(s) from folder", size);
        for (int i = 0; i < size; i += 16) {
            String seq = ImapData.asSequenceSet(
                uids.subList(i, i + Math.min(size - i, 16)));
            connection.uidStore(seq, "+FLAGS.SILENT", "(\\Deleted)");
            // If UIDPLUS supported, then expunge deleted messages
            if (connection.hasUidPlus()) {
                connection.uidExpunge(seq);
            }
        }
        deleted += size;
    }

    public void deleteMessage(long uid) throws IOException {
        ensureSelected();
        debug("deleting message with uid %d", uid);
        String seq = String.valueOf(uid);
        connection.uidStore(seq, "+FLAGS.SILENT", "(\\Deleted)");
        // If UIDPLUS supported, then expunge deleted message
        if (connection.hasUidPlus()) {
            connection.uidExpunge(seq);
        }
        deleted++;
    }

    /**
     * Closes folder and optionally expunges deleted messages.
     * 
     * @throws IOException if an I/O error occurred
     */
    public void close() throws IOException {
        if (deleted > 0 && !connection.hasUidPlus()) {
            connection.mclose();
        }
    }
    
    public List<Long> getUids(long startUid, long endUid) throws IOException {
        ensureSelected();
        String end = endUid > 0 ? String.valueOf(endUid) : "*";
        List<Long> uids = connection.getUids(startUid + ":" + end);
        // If sequence is "<startUid>:*" and there are no messages with UID
        // greater than startUid, the the UID of the last message will always
        // be returned (RFC 3501 6.4.8). We want to make sure to exlude this
        // result.
        if (endUid <= 0 && uids.size() == 1 && uids.get(0) < startUid) {
            return Collections.emptyList();
        }
        // Sort UIDs in reverse order so we download latest messages first
        Collections.sort(uids, Collections.reverseOrder());
        return uids;
    }

    /*
     * Fetch message flags for specific UID sequence. Exclude messages which
     * have been flagged \Deleted.
     */
    public List<MessageData> getFlags(long startUid, long endUid)
        throws IOException {
        final List<MessageData> mds = new ArrayList<MessageData>();
        String end = endUid > 0 ? String.valueOf(endUid) : "*";
        connection.uidFetch(startUid + ":" + end, "FLAGS",
            new FetchResponseHandler() {
                public void handleFetchResponse(MessageData md) {
                    Flags flags = md.getFlags();
                    if (flags != null && !flags.isDeleted()) {
                        mds.add(md);
                    }
                }
            }
        );
        // If sequence is "<startUid>:*" and there are no messages with UID
        // greater than startUid, the the UID of the last message will always
        // be returned (RFC 3501 6.4.8). We want to make sure to exlude this
        // result.
        if (endUid <= 0 && mds.size() == 1 && mds.get(0).getUid() < startUid) {
            return Collections.emptyList();
        }
        return mds;
    }

    public boolean exists() throws IOException {
        return !connection.list("", path).isEmpty();
    }

    public void ensureSelected() throws IOException {
        if (!isSelected()) {
            select();
        }
    }
    
    public Mailbox select() throws IOException {
        return connection.select(path);
    }

    public boolean isSelected() {
        Mailbox mb = connection.getMailbox();
        return mb != null && mb.getName().equals(path);
    }

    public String getPath() {
        return path;
    }

    public void debug(String fmt, Object... args) {
        if (LOG.isDebugEnabled()) {
            LOG.debug(errmsg(String.format(fmt, args)));
        }
    }

    public void info(String fmt, Object... args) {
        LOG.info(errmsg(String.format(fmt, args)));
    }

    public void warn(String msg, Throwable e) {
        LOG.error(errmsg(msg), e);
    }

    public void error(String msg, Throwable e) {
        LOG.error(errmsg(msg), e);
    }

    private String errmsg(String s) {
        return String.format("Remote folder '%s': %s", getPath(), s);
    }
}
