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
package com.zimbra.cs.service.account;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.AccountConstants;
import com.zimbra.common.soap.AdminConstants;
import com.zimbra.common.soap.Element;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.Group;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.soap.ZimbraSoapContext;

public class GetAccountMembership extends AccountDocumentHandler {

    @Override
    public Element handle(Element request, Map<String, Object> context)
            throws ServiceException {
        
        ZimbraSoapContext zsc = getZimbraSoapContext(context);
        Provisioning prov = Provisioning.getInstance();
        
        Account acct = getRequestedAccount(zsc);
        boolean directOnly = request.getAttributeBool(AccountConstants.A_DIRECT_ONLY, true);
        
        HashMap<String,String> via = new HashMap<String, String>();
        List<Group> groups = prov.getGroups(acct, directOnly, via);
        
        Element response = zsc.createElement(AccountConstants.GET_ACCOUNT_MEMBERSHIP_RESPONSE);
        for (Group group: groups) {
            Element eDL = response.addElement(AdminConstants.E_DL);
            eDL.addAttribute(AdminConstants.A_NAME, group.getName());
            eDL.addAttribute(AdminConstants.A_ID,group.getId());
            eDL.addAttribute(AdminConstants.A_DYNAMIC, group.isDynamic());
            String viaDl = via.get(group.getName());
            if (viaDl != null) {
                eDL.addAttribute(AdminConstants.A_VIA, viaDl);
            }
        }
        return response;
    }

}
