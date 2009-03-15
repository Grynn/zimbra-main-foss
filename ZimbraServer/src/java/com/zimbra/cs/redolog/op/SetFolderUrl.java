/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2005, 2006, 2007 Zimbra, Inc.
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
/*
 * Created on Nov 12, 2005
 */
package com.zimbra.cs.redolog.op;

import java.io.IOException;

import com.zimbra.cs.mailbox.Mailbox;
import com.zimbra.cs.mailbox.MailboxManager;
import com.zimbra.cs.redolog.RedoLogInput;
import com.zimbra.cs.redolog.RedoLogOutput;

/**
 * @author dkarp
 */
public class SetFolderUrl extends RedoableOp {

    private int mFolderId;
    private String mURL;

    public SetFolderUrl() {
        mFolderId = Mailbox.ID_AUTO_INCREMENT;
        mURL = "";
    }

    public SetFolderUrl(int mailboxId, int folderId, String url) {
        setMailboxId(mailboxId);
        mFolderId = folderId;
        mURL = url == null ? "" : url;
    }

    public int getOpCode() {
        return OP_SET_URL;
    }

    protected String getPrintableData() {
        StringBuffer sb = new StringBuffer("id=").append(mFolderId);
        sb.append(", url=").append(mURL);
        return sb.toString();
    }

    protected void serializeData(RedoLogOutput out) throws IOException {
        out.writeInt(mFolderId);
        out.writeUTF(mURL);
    }

    protected void deserializeData(RedoLogInput in) throws IOException {
        mFolderId = in.readInt();
        mURL = in.readUTF();
    }

    public void redo() throws Exception {
        Mailbox mbox = MailboxManager.getInstance().getMailboxById(getMailboxId());
        mbox.setFolderUrl(getOperationContext(), mFolderId, mURL);
    }
}
