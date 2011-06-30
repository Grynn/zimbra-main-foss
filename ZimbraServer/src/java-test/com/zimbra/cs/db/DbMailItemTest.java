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
package com.zimbra.cs.db;

import java.util.HashMap;

import org.junit.Assert;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;

import com.google.common.collect.ImmutableSet;
import com.google.common.collect.Multimap;
import com.zimbra.common.localconfig.LC;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.MockProvisioning;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.db.DbPool.DbConnection;
import com.zimbra.cs.mailbox.Flag;
import com.zimbra.cs.mailbox.Folder;
import com.zimbra.cs.mailbox.MailItem;
import com.zimbra.cs.mailbox.Mailbox;
import com.zimbra.cs.mailbox.MailboxManager;

/**
 * Unit test for {@link DbMailItem}.
 *
 * @author ysasaki
 */
public class DbMailItemTest {

    @BeforeClass
    public static void init() throws Exception {
        Provisioning prov = new MockProvisioning();
        prov.createAccount("test@zimbra.com", "secret", new HashMap<String, Object>());
        Provisioning.setInstance(prov);

        LC.zimbra_class_database.setDefault(HSQLDB.class.getName());
        DbPool.startup();
        HSQLDB.createDatabase();
    }

    @Before
    public void setUp() throws Exception {
        HSQLDB.clearDatabase();
        MailboxManager.getInstance().clearCache();
    }

    @Test
    public void getIndexDeferredIds() throws Exception {
        Account account = Provisioning.getInstance().getAccountById(MockProvisioning.DEFAULT_ACCOUNT_ID);
        Mailbox mbox = MailboxManager.getInstance().getMailboxByAccount(account);

        DbConnection conn = DbPool.getConnection(mbox);
        DbUtil.executeUpdate(conn, "INSERT INTO mboxgroup1.mail_item " +
                "(mailbox_id, id, type, index_id, date, size, flags, tags, mod_metadata, mod_content) " +
                "VALUES(?, ?, ?, ?, 0, 0, 0, 0, 0, 0)", mbox.getId(), 100, MailItem.Type.MESSAGE.toByte(), 0);
        DbUtil.executeUpdate(conn, "INSERT INTO mboxgroup1.mail_item " +
                "(mailbox_id, id, type, index_id, date, size, flags, tags, mod_metadata, mod_content) " +
                "VALUES(?, ?, ?, ?, 0, 0, 0, 0, 0, 0)", mbox.getId(), 101, MailItem.Type.MESSAGE.toByte(), 0);
        DbUtil.executeUpdate(conn, "INSERT INTO mboxgroup1.mail_item " +
                "(mailbox_id, id, type, index_id, date, size, flags, tags, mod_metadata, mod_content) " +
                "VALUES(?, ?, ?, ?, 0, 0, 0, 0, 0, 0)", mbox.getId(), 102, MailItem.Type.MESSAGE.toByte(), 0);
        DbUtil.executeUpdate(conn, "INSERT INTO mboxgroup1.mail_item " +
                "(mailbox_id, id, type, index_id, date, size, flags, tags, mod_metadata, mod_content) " +
                "VALUES(?, ?, ?, ?, 0, 0, 0, 0, 0, 0)", mbox.getId(), 103, MailItem.Type.MESSAGE.toByte(), 103);
        DbUtil.executeUpdate(conn, "INSERT INTO mboxgroup1.mail_item " +
                "(mailbox_id, id, type, index_id, date, size, flags, tags, mod_metadata, mod_content) " +
                "VALUES(?, ?, ?, ?, 0, 0, 0, 0, 0, 0)", mbox.getId(), 200, MailItem.Type.CONTACT.toByte(), 0);
        DbUtil.executeUpdate(conn, "INSERT INTO mboxgroup1.mail_item " +
                "(mailbox_id, id, type, index_id, date, size, flags, tags, mod_metadata, mod_content) " +
                "VALUES(?, ?, ?, ?, 0, 0, 0, 0, 0, 0)", mbox.getId(), 201, MailItem.Type.CONTACT.toByte(), 0);
        DbUtil.executeUpdate(conn, "INSERT INTO mboxgroup1.mail_item " +
                "(mailbox_id, id, type, index_id, date, size, flags, tags, mod_metadata, mod_content) " +
                "VALUES(?, ?, ?, ?, 0, 0, 0, 0, 0, 0)", mbox.getId(), 202, MailItem.Type.CONTACT.toByte(), 202);

        Multimap<MailItem.Type, Integer> result = DbMailItem.getIndexDeferredIds(conn, mbox);
        Assert.assertEquals(5, result.size());
        Assert.assertEquals(ImmutableSet.of(100, 101, 102), result.get(MailItem.Type.MESSAGE));
        Assert.assertEquals(ImmutableSet.of(200, 201), result.get(MailItem.Type.CONTACT));

        DbPool.quietClose(conn);
    }

    @Test
    public void getConversationCount() throws Exception {
        Account account = Provisioning.getInstance().getAccountById(MockProvisioning.DEFAULT_ACCOUNT_ID);
        Mailbox mbox = MailboxManager.getInstance().getMailboxByAccount(account);
        Folder folder = mbox.getFolderById(null, Mailbox.ID_FOLDER_INBOX);

        DbConnection conn = DbPool.getConnection(mbox);
        Assert.assertEquals(0, DbMailItem.getConversationCount(conn, folder));

        DbUtil.executeUpdate(conn, "INSERT INTO mboxgroup1.mail_item " +
                "(mailbox_id, id, type, index_id, date, size, flags, tags, mod_metadata, mod_content) " +
                "VALUES(?, ?, ?, 0, 0, 0, 0, 0, 0, 0)", mbox.getId(), 200, MailItem.Type.CONVERSATION.toByte());
        DbUtil.executeUpdate(conn, "INSERT INTO mboxgroup1.mail_item " +
                "(mailbox_id, id, type, index_id, date, size, flags, tags, mod_metadata, mod_content) " +
                "VALUES(?, ?, ?, 0, 0, 0, 0, 0, 0, 0)", mbox.getId(), 201, MailItem.Type.CONVERSATION.toByte());

        DbUtil.executeUpdate(conn, "INSERT INTO mboxgroup1.mail_item " +
                "(mailbox_id, id, type, folder_id, parent_id, index_id, date, size, flags, tags, mod_metadata, mod_content) " +
                "VALUES(?, ?, ?, ?, NULL, 0, 0, 0, 0, 0, 0, 0)", mbox.getId(), 100,
                MailItem.Type.MESSAGE.toByte(), Mailbox.ID_FOLDER_INBOX);
        DbUtil.executeUpdate(conn, "INSERT INTO mboxgroup1.mail_item " +
                "(mailbox_id, id, type, folder_id, parent_id, index_id, date, size, flags, tags, mod_metadata, mod_content) " +
                "VALUES(?, ?, ?, ?, 200, 0, 0, 0, 0, 0, 0, 0)", mbox.getId(), 101,
                MailItem.Type.MESSAGE.toByte(), Mailbox.ID_FOLDER_INBOX);
        DbUtil.executeUpdate(conn, "INSERT INTO mboxgroup1.mail_item " +
                "(mailbox_id, id, type, folder_id, parent_id, index_id, date, size, flags, tags, mod_metadata, mod_content) " +
                "VALUES(?, ?, ?, ?, 200, 0, 0, 0, 0, 0, 0, 0)", mbox.getId(), 102,
                MailItem.Type.MESSAGE.toByte(), Mailbox.ID_FOLDER_INBOX);
        DbUtil.executeUpdate(conn, "INSERT INTO mboxgroup1.mail_item " +
                "(mailbox_id, id, type, folder_id, parent_id, index_id, date, size, flags, tags, mod_metadata, mod_content) " +
                "VALUES(?, ?, ?, ?, NULL, 0, 0, 0, 0, 0, 0, 0)", mbox.getId(), 103,
                MailItem.Type.MESSAGE.toByte(), Mailbox.ID_FOLDER_INBOX);
        DbUtil.executeUpdate(conn, "INSERT INTO mboxgroup1.mail_item " +
                "(mailbox_id, id, type, folder_id, parent_id, index_id, date, size, flags, tags, mod_metadata, mod_content) " +
                "VALUES(?, ?, ?, ?, NULL, 0, 0, 0, 0, 0, 0, 0)", mbox.getId(), 104,
                MailItem.Type.MESSAGE.toByte(), Mailbox.ID_FOLDER_INBOX);
        DbUtil.executeUpdate(conn, "INSERT INTO mboxgroup1.mail_item " +
                "(mailbox_id, id, type, folder_id, parent_id, index_id, date, size, flags, tags, mod_metadata, mod_content) " +
                "VALUES(?, ?, ?, ?, 201, 0, 0, 0, 0, 0, 0, 0)", mbox.getId(), 105,
                MailItem.Type.MESSAGE.toByte(), Mailbox.ID_FOLDER_INBOX);

        folder.getUnderlyingData().size = 6;
        // 100, [101, 102], 103, 104, [105]
        Assert.assertEquals(5, DbMailItem.getConversationCount(conn, folder));

        DbPool.quietClose(conn);
    }

    @Test
    public void completeConversation() throws Exception {
        Account account = Provisioning.getInstance().getAccountById(MockProvisioning.DEFAULT_ACCOUNT_ID);
        Mailbox mbox = MailboxManager.getInstance().getMailboxByAccount(account);

        DbConnection conn = DbPool.getConnection(mbox);

        DbUtil.executeUpdate(conn, "INSERT INTO mboxgroup1.mail_item " +
                "(mailbox_id, id, type, index_id, date, size, flags, tags, mod_metadata, mod_content) " +
                "VALUES(?, ?, ?, 0, 0, 0, 0, 0, 0, 0)", mbox.getId(), 200, MailItem.Type.CONVERSATION.toByte());
        DbUtil.executeUpdate(conn, "INSERT INTO mboxgroup1.mail_item " +
                "(mailbox_id, id, type, index_id, date, size, flags, tags, mod_metadata, mod_content) " +
                "VALUES(?, ?, ?, 0, 0, 0, 0, 0, 0, 0)", mbox.getId(), 201, MailItem.Type.CONVERSATION.toByte());

        DbUtil.executeUpdate(conn, "INSERT INTO mboxgroup1.mail_item " +
                "(mailbox_id, id, type, folder_id, parent_id, index_id, date, size, flags, tags, mod_metadata, mod_content) " +
                "VALUES(?, ?, ?, ?, ?, 0, 0, 0, ?, 0, 0, 0)", mbox.getId(), 100, MailItem.Type.MESSAGE.toByte(),
                Mailbox.ID_FOLDER_INBOX, 200, 0);
        DbUtil.executeUpdate(conn, "INSERT INTO mboxgroup1.mail_item " +
                "(mailbox_id, id, type, folder_id, parent_id, index_id, date, size, flags, tags, mod_metadata, mod_content) " +
                "VALUES(?, ?, ?, ?, ?, 0, 0, 0, ?, 0, 0, 0)", mbox.getId(), 101, MailItem.Type.MESSAGE.toByte(),
                Mailbox.ID_FOLDER_INBOX, 200, 0);
        DbUtil.executeUpdate(conn, "INSERT INTO mboxgroup1.mail_item " +
                "(mailbox_id, id, type, folder_id, parent_id, index_id, date, size, flags, tags, mod_metadata, mod_content) " +
                "VALUES(?, ?, ?, ?, ?, 0, 0, 0, ?, 0, 0, 0)", mbox.getId(), 102, MailItem.Type.MESSAGE.toByte(),
                Mailbox.ID_FOLDER_INBOX, 200, 0);
        DbUtil.executeUpdate(conn, "INSERT INTO mboxgroup1.mail_item " +
                "(mailbox_id, id, type, folder_id, parent_id, index_id, date, size, flags, tags, mod_metadata, mod_content) " +
                "VALUES(?, ?, ?, ?, ?, 0, 0, 0, ?, 0, 0, 0)", mbox.getId(), 103, MailItem.Type.MESSAGE.toByte(),
                Mailbox.ID_FOLDER_INBOX, 201, Flag.BITMASK_FROM_ME);
        DbUtil.executeUpdate(conn, "INSERT INTO mboxgroup1.mail_item " +
                "(mailbox_id, id, type, folder_id, parent_id, index_id, date, size, flags, tags, mod_metadata, mod_content) " +
                "VALUES(?, ?, ?, ?, ?, 0, 0, 0, ?, 0, 0, 0)", mbox.getId(), 104, MailItem.Type.MESSAGE.toByte(),
                Mailbox.ID_FOLDER_INBOX, 201, 0);
        DbUtil.executeUpdate(conn, "INSERT INTO mboxgroup1.mail_item " +
                "(mailbox_id, id, type, folder_id, parent_id, index_id, date, size, flags, tags, mod_metadata, mod_content) " +
                "VALUES(?, ?, ?, ?, ?, 0, 0, 0, ?, 0, 0, 0)", mbox.getId(), 105, MailItem.Type.MESSAGE.toByte(),
                Mailbox.ID_FOLDER_INBOX, 201, 0);

        MailItem.UnderlyingData data = new MailItem.UnderlyingData();
        data.id = 200;
        data.type = MailItem.Type.CONVERSATION.toByte();
        DbMailItem.completeConversation(mbox, conn, data);
        Assert.assertFalse(data.isSet(Flag.FlagInfo.FROM_ME));

        data = new MailItem.UnderlyingData();
        data.id = 201;
        data.type = MailItem.Type.CONVERSATION.toByte();
        DbMailItem.completeConversation(mbox, conn, data);
        Assert.assertTrue(data.isSet(Flag.FlagInfo.FROM_ME));

        conn.closeQuietly();
    }

}
