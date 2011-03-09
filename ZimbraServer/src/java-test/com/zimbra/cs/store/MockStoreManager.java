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
package com.zimbra.cs.store;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import com.google.common.io.ByteStreams;
import com.zimbra.cs.mailbox.MailItem;
import com.zimbra.cs.mailbox.Mailbox;

/**
 * Mock implementation of {@link StoreManager}.
 *
 * @author jylee
 * @author ysasaki
 */
public final class MockStoreManager extends StoreManager {

    private static final Map<Integer, MockMailboxBlob> BLOBS = new HashMap<Integer, MockMailboxBlob>();

    public static void setBlob(MailItem item, byte[] data) {
        BLOBS.put(item.getId(), new MockMailboxBlob(item.getMailbox(), item.getId(), item.getVersion(), null, data));
    }

    @Override
    public void startup() {
        BLOBS.clear();
    }

    @Override
    public void shutdown() {
        BLOBS.clear();
    }

    @Override
    public BlobBuilder getBlobBuilder() {
        return null;
    }

    @Override
    public Blob storeIncoming(InputStream data, StorageCallback callback, boolean storeAsIs) throws IOException {
        return new MockBlob(ByteStreams.toByteArray(data));
    }

    @Override
    public StagedBlob stage(InputStream data, long actualSize, StorageCallback callback, Mailbox mbox)
            throws IOException {
        return new MockStagedBlob(mbox, ByteStreams.toByteArray(data));
    }

    @Override
    public StagedBlob stage(Blob blob, Mailbox mbox) {
        return new MockStagedBlob(mbox, ((MockBlob) blob).content);
    }

    @Override
    public MailboxBlob copy(MailboxBlob src, Mailbox destMbox, int destMsgId, int destRevision) {
        MockMailboxBlob blob = new MockMailboxBlob(destMbox, destMsgId, destRevision,
                src.getLocator(), ((MockMailboxBlob) src).content);
        BLOBS.put(destMsgId, blob);
        return blob;
    }

    @Override
    public MailboxBlob link(StagedBlob src, Mailbox destMbox, int destMsgId, int destRevision) {
        MockMailboxBlob blob = new MockMailboxBlob(destMbox, destMsgId, destRevision,
                src.getLocator(), ((MockStagedBlob) src).content);
        BLOBS.put(destMsgId, blob);
        return blob;
    }

    @Override
    public MailboxBlob link(MailboxBlob src, Mailbox destMbox, int destMsgId, int destRevision) {
        MockMailboxBlob blob = new MockMailboxBlob(destMbox, destMsgId, destRevision,
                src.getLocator(), ((MockMailboxBlob) src).content);
        BLOBS.put(destMsgId, blob);
        return blob;
    }

    @Override
    public MailboxBlob renameTo(StagedBlob src, Mailbox destMbox, int destMsgId, int destRevision) {
        MockMailboxBlob blob = new MockMailboxBlob(destMbox, destMsgId, destRevision,
                src.getLocator(), ((MockStagedBlob) src).content);
        BLOBS.put(destMsgId, blob);
        return blob;
    }

    @Override
    public boolean delete(Blob blob) {
        return true;
    }

    @Override
    public boolean delete(StagedBlob staged) {
        return true;
    }

    @Override
    public boolean delete(MailboxBlob mblob) {
        BLOBS.remove(mblob.getItemId());
        return true;
    }

    @Override
    public MailboxBlob getMailboxBlob(Mailbox mbox, int msgId, int revision, String locator) {
        return BLOBS.get(Integer.valueOf(msgId));
    }

    @Override
    public InputStream getContent(MailboxBlob mblob) throws IOException {
        return mblob.getLocalBlob().getInputStream();
    }

    @Override
    public InputStream getContent(Blob blob) throws IOException {
        return blob.getInputStream();
    }

    @Override
    public boolean deleteStore(Mailbox mbox) {
        BLOBS.clear();
        return true;
    }

    private static final class MockBlob extends Blob {
        private final byte[] content;

        MockBlob(byte[] data) {
            super(new File("build/test/store"));
            content = data;
        }

        @Override
        public InputStream getInputStream() throws IOException {
            return new ByteArrayInputStream(content);
        }

        @Override
        public long getRawSize() {
            return content.length;
        }
    }

    private static final class MockStagedBlob extends StagedBlob {
        private final byte[] content;

        MockStagedBlob(Mailbox mbox, byte[] data) {
            super(mbox, String.valueOf(data.length), data.length);
            content = data;
        }

        @Override
        public String getLocator() {
            return null;
        }
    }

    private static final class MockMailboxBlob extends MailboxBlob {
        private byte[] content;

        MockMailboxBlob(Mailbox mbox, int itemId, int revision, String locator, byte[] data) {
            super(mbox, itemId, revision, locator);
            content = data;
        }

        @Override
        public Blob getLocalBlob() throws IOException {
            return new MockBlob(content);
        }
    }

}
