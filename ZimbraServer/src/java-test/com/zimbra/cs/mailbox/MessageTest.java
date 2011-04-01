/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2011 Zimbra, Inc.
 *
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.3 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * ***** END LICENSE BLOCK *****
 */
package com.zimbra.cs.mailbox;

import java.util.HashMap;
import java.util.List;

import org.junit.Assert;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;

import com.google.common.io.ByteStreams;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.MockProvisioning;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.db.DbMailAddress;
import com.zimbra.cs.db.DbPool;
import com.zimbra.cs.db.DbUtil;
import com.zimbra.cs.db.DbPool.DbConnection;
import com.zimbra.cs.index.IndexDocument;
import com.zimbra.cs.index.LuceneFields;
import com.zimbra.cs.mime.ParsedMessage;

/**
 * Unit test for {@link Message}.
 *
 * @author ysasaki
 */
public final class MessageTest {

    @BeforeClass
    public static void init() throws Exception {
        MailboxTestUtil.initServer();

        Provisioning prov = Provisioning.getInstance();
        prov.createAccount("test@zimbra.com", "secret", new HashMap<String, Object>());
    }

    @Before
    public void setUp() throws Exception {
        MailboxTestUtil.clearData();
    }

    @Test
    public void indexRawMimeMessage() throws Exception {
        Account account = Provisioning.getInstance().getAccountById(MockProvisioning.DEFAULT_ACCOUNT_ID);
        account.setPrefMailDefaultCharset("ISO-2022-JP");
        Mailbox mbox = MailboxManager.getInstance().getMailboxByAccount(account);
        DeliveryOptions opt = new DeliveryOptions();
        opt.setFolderId(Mailbox.ID_FOLDER_INBOX);
        byte[] raw = ByteStreams.toByteArray(getClass().getResourceAsStream("raw-jis-msg.txt"));
        ParsedMessage pm = new ParsedMessage(raw, false);
        Message message = mbox.addMessage(null, pm, opt);
        Assert.assertEquals("\u65e5\u672c\u8a9e", pm.getFragment());
        List<IndexDocument> docs = message.generateIndexData();
        Assert.assertEquals(2, docs.size());
        String subject = docs.get(0).toDocument().getField(LuceneFields.L_H_SUBJECT).stringValue();
        String body = docs.get(0).toDocument().getField(LuceneFields.L_CONTENT).stringValue();
        Assert.assertEquals("\u65e5\u672c\u8a9e", subject);
        Assert.assertEquals("\u65e5\u672c\u8a9e", body.trim());
    }

    @Test
    public void senderId() throws Exception {
        Mailbox mbox = MailboxManager.getInstance().getMailboxByAccountId(MockProvisioning.DEFAULT_ACCOUNT_ID);
        DeliveryOptions opt = new DeliveryOptions();
        opt.setFolderId(Mailbox.ID_FOLDER_INBOX);
        Message msg1 = mbox.addMessage(null, new ParsedMessage("From: test1@zimbra.com".getBytes(), false), opt);
        Message msg2 = mbox.addMessage(null, new ParsedMessage("From: test2@zimbra.com".getBytes(), false), opt);
        Message msg3 = mbox.addMessage(null, new ParsedMessage("From: test3@zimbra.com".getBytes(), false), opt);

        DbConnection conn = DbPool.getConnection(mbox);
        int senderId1 = DbUtil.executeQuery(conn,
                "SELECT sender_id FROM mboxgroup1.mail_item WHERE mailbox_id = ? AND id = ?",
                mbox.getId(), msg1.getId()).getInt(1);
        int senderId2 = DbUtil.executeQuery(conn,
                "SELECT sender_id FROM mboxgroup1.mail_item WHERE mailbox_id = ? AND id = ?",
                mbox.getId(), msg2.getId()).getInt(1);
        int senderId3 = DbUtil.executeQuery(conn,
                "SELECT sender_id FROM mboxgroup1.mail_item WHERE mailbox_id = ? AND id = ?",
                mbox.getId(), msg3.getId()).getInt(1);
        Assert.assertEquals(DbMailAddress.getId(conn, mbox, "test1@zimbra.com"), senderId1);
        Assert.assertEquals(DbMailAddress.getId(conn, mbox, "test2@zimbra.com"), senderId2);
        Assert.assertEquals(DbMailAddress.getId(conn, mbox, "test3@zimbra.com"), senderId3);
        Assert.assertEquals(0, DbMailAddress.getCount(conn, mbox, senderId1));
        Assert.assertEquals(0, DbMailAddress.getCount(conn, mbox, senderId2));
        Assert.assertEquals(0, DbMailAddress.getCount(conn, mbox, senderId3));
        conn.closeQuietly();
    }

    @Test
    public void getSortRecipients() throws Exception {
        Mailbox mbox = MailboxManager.getInstance().getMailboxByAccountId(MockProvisioning.DEFAULT_ACCOUNT_ID);
        DeliveryOptions opt = new DeliveryOptions();
        opt.setFolderId(Mailbox.ID_FOLDER_INBOX);
        Message msg1 = mbox.addMessage(null, new ParsedMessage(
                "From: from1@zimbra.com\r\nTo: to1@zimbra.com".getBytes(), false), opt);
        Message msg2 = mbox.addMessage(null, new ParsedMessage(
                "From: from2@zimbra.com\r\nTo: to2 <to2@zimbra.com>".getBytes(), false), opt);
        Message msg3 = mbox.addMessage(null, new ParsedMessage(
                "From: from3@zimbra.com\r\nTo: to3-1 <to3-1@zimbra.com>, to3-2 <to3-2@zimbra.com>".getBytes(),
                false), opt);

        Assert.assertEquals("to1@zimbra.com", msg1.getSortRecipients());
        Assert.assertEquals("to2", msg2.getSortRecipients());
        Assert.assertEquals("to3-1, to3-2", msg3.getSortRecipients());

        DbConnection conn = DbPool.getConnection(mbox);
        Assert.assertEquals("to1@zimbra.com", DbUtil.executeQuery(conn,
                "SELECT recipients FROM mboxgroup1.mail_item WHERE mailbox_id = ? AND id = ?",
                mbox.getId(), msg1.getId()).getString(1));
        Assert.assertEquals("to2", DbUtil.executeQuery(conn,
                "SELECT recipients FROM mboxgroup1.mail_item WHERE mailbox_id = ? AND id = ?",
                mbox.getId(), msg2.getId()).getString(1));
        Assert.assertEquals("to3-1, to3-2", DbUtil.executeQuery(conn,
                "SELECT recipients FROM mboxgroup1.mail_item WHERE mailbox_id = ? AND id = ?",
                mbox.getId(), msg3.getId()).getString(1));
        conn.closeQuietly();
    }

}
