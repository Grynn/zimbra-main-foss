/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: ZPL 1.1
 * 
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.1 ("License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.zimbra.com/license
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is: Zimbra Collaboration Suite.
 * 
 * The Initial Developer of the Original Code is Zimbra, Inc.
 * Portions created by Zimbra are Copyright (C) 2005 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s): 
 * 
 * ***** END LICENSE BLOCK *****
 */

/*
 * Created on Aug 27, 2004
 */
package com.zimbra.cs.service.mail;

import java.util.Map;

import com.zimbra.cs.mailbox.Folder;
import com.zimbra.cs.mailbox.MailItem;
import com.zimbra.cs.mailbox.Mailbox;
import com.zimbra.cs.mailbox.MailServiceException;
import com.zimbra.cs.service.ServiceException;
import com.zimbra.cs.service.util.ItemId;
import com.zimbra.soap.Element;
import com.zimbra.soap.ZimbraContext;
import com.zimbra.soap.WriteOpDocumentHandler;

/**
 * @author dkarp
 */
public class CreateFolder extends WriteOpDocumentHandler {

    private static final String[] TARGET_FOLDER_PATH = new String[] { MailService.E_FOLDER, MailService.A_FOLDER };
    private static final String[] RESPONSE_ITEM_PATH = new String[] { };
    protected String[] getProxiedIdPath()     { return TARGET_FOLDER_PATH; }
    protected boolean checkMountpointProxy()  { return true; }
    protected String[] getResponseItemPath()  { return RESPONSE_ITEM_PATH; }

    public Element handle(Element request, Map context) throws ServiceException {
        ZimbraContext lc = getZimbraContext(context);
        Mailbox mbox = getRequestedMailbox(lc);

        Element t = request.getElement(MailService.E_FOLDER);
        String name      = t.getAttribute(MailService.A_NAME);
        String view      = t.getAttribute(MailService.A_DEFAULT_VIEW, null);
        ItemId iidParent = new ItemId(t.getAttribute(MailService.A_FOLDER), lc);

        Folder folder;
        try {
            folder = mbox.createFolder(lc.getOperationContext(), name, iidParent.getId(), MailItem.getTypeForName(view));
        } catch (ServiceException se) {
            if (se.getCode() == MailServiceException.ALREADY_EXISTS && t.getAttributeBool(MailService.A_FETCH_IF_EXISTS, false))
                folder = mbox.getFolderByName(lc.getOperationContext(), iidParent.getId(), name);
            else
                throw se;
        }

        Element response = lc.createElement(MailService.CREATE_FOLDER_RESPONSE);
        if (folder != null)
            ToXML.encodeFolder(response, lc, folder);
        return response;
    }
}
