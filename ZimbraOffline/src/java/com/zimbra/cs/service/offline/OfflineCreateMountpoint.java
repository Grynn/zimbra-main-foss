/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2008 Zimbra, Inc.
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
package com.zimbra.cs.service.offline;

import java.util.Map;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.Element;
import com.zimbra.common.soap.MailConstants;
import com.zimbra.cs.account.offline.OfflineProvisioning;
import com.zimbra.cs.account.offline.OfflineAccount;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.mailbox.Flag;
import com.zimbra.cs.mailbox.MailItem;
import com.zimbra.cs.mailbox.MailServiceException;
import com.zimbra.cs.mailbox.Mailbox;
import com.zimbra.cs.mailbox.OfflineMailbox;
import com.zimbra.cs.mailbox.OfflineServiceException;
import com.zimbra.cs.mailbox.OfflineMailbox.OfflineContext;
import com.zimbra.cs.redolog.op.CreateMountpoint;
import com.zimbra.soap.ZimbraSoapContext;

public class OfflineCreateMountpoint extends OfflineServiceProxy {

    public OfflineCreateMountpoint() {
        super("create mountpoint", false, false);
    }
    
    public Element handle(Element request, Map<String, Object> context) throws ServiceException {
        ZimbraSoapContext ctxt = getZimbraSoapContext(context);
        Mailbox mbox = getRequestedMailbox(ctxt);
        if (!(mbox instanceof OfflineMailbox))
            throw OfflineServiceException.MISCONFIGURED("incorrect mailbox class: " + mbox.getClass().getSimpleName());
        OfflineProvisioning prov = OfflineProvisioning.getOfflineInstance();
                       
        Element eLink = request.getElement(MailConstants.E_MOUNT);
        String zid = eLink.getAttribute(MailConstants.A_ZIMBRA_ID, null);
        if (zid != null) {
            OfflineAccount acct = (OfflineAccount)prov.get(Provisioning.AccountBy.id, zid);
            if (acct != null)
                prov.checkMountpointAccount(acct, ctxt.getRequestedAccountId());
        }
        
        Element response = super.handle(request, context);
        
        Element eMount = response.getElement(MailConstants.E_MOUNT);
        int parentId = (int) eMount.getAttributeLong(MailConstants.A_FOLDER);
        int id = (int) eMount.getAttributeLong(MailConstants.A_ID);
        String name = (id == Mailbox.ID_FOLDER_ROOT) ? "ROOT" : MailItem.normalizeItemName(eMount.getAttribute(MailConstants.A_NAME));
        int flags = Flag.flagsToBitmask(eMount.getAttribute(MailConstants.A_FLAGS, null));
        byte color = (byte) eMount.getAttributeLong(MailConstants.A_COLOR, MailItem.DEFAULT_COLOR);
        byte view = MailItem.getTypeForName(eMount.getAttribute(MailConstants.A_DEFAULT_VIEW, null));
        String ownerId = eMount.getAttribute(MailConstants.A_ZIMBRA_ID);
        String ownerName = eMount.getAttribute(MailConstants.A_OWNER_NAME);
        int remoteId = (int) eMount.getAttributeLong(MailConstants.A_REMOTE_ID);
        int mod_content = (int) eMount.getAttributeLong(MailConstants.A_REVISION, -1);
        
        prov.createMountpointAccount(ownerName, ownerId, ((OfflineMailbox)mbox).getOfflineAccount(), false);
        CreateMountpoint redo = new CreateMountpoint(mbox.getId(), parentId, name, ownerId, remoteId, view, flags, color);
        redo.setId(id);
        redo.setChangeId(mod_content);
        try {
            mbox.createMountpoint(new OfflineContext(redo), parentId, name, ownerId, remoteId, view, flags, color);
        } catch (ServiceException e) {
            if (e.getCode() != MailServiceException.ALREADY_EXISTS)
                throw e;
        }
        
        return response;
    }
}