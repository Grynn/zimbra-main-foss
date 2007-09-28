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

package com.zimbra.cs.redolog.op;

import java.io.IOException;

import com.zimbra.cs.mailbox.Document;
import com.zimbra.cs.mailbox.Mailbox;
import com.zimbra.cs.mailbox.MailboxManager;
import com.zimbra.cs.mailbox.Mailbox.OperationContext;
import com.zimbra.cs.mailbox.MailItem;
import com.zimbra.cs.redolog.RedoLogInput;
import com.zimbra.cs.redolog.RedoLogOutput;

public class AddDocumentRevision extends SaveDocument {
	private int mDocId;
	
	public AddDocumentRevision() {
	}
	
    public AddDocumentRevision(int mailboxId, String digest, int msgSize, int folderId) {
        super(mailboxId, digest, msgSize, folderId);
    }

    public int getOpCode() {
        return OP_ADD_DOCUMENT_REVISION;
    }

    public int getDocId() {
    	return mDocId;
    }
    
    public void setDocument(Document doc) {
    	mDocId = doc.getId();
    	setFilename(doc.getName());
    	setMimeType(doc.getContentType());
    }
    
    protected void serializeData(RedoLogOutput out) throws IOException {
        out.writeInt(mDocId);
        super.serializeData(out);
    }

    protected void deserializeData(RedoLogInput in) throws IOException {
        mDocId = in.readInt();
        super.deserializeData(in);
    }
    
    public void redo() throws Exception {
    	OperationContext octxt = getOperationContext();
        int mboxId = getMailboxId();
        Mailbox mbox = MailboxManager.getInstance().getMailboxById(mboxId);
        mbox.addDocumentRevision(octxt, mDocId, MailItem.TYPE_DOCUMENT, getMessageBody(), getAuthor());
    }
}
