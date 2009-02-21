/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2004, 2005, 2006, 2007 Zimbra, Inc.
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

/*
 * Created on Jun 17, 2004
 */
package com.zimbra.cs.service.admin;

import java.util.Iterator;
import java.util.List;
import java.util.Map;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.AdminConstants;
import com.zimbra.common.soap.Element;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.accesscontrol.AdminRight;
import com.zimbra.cs.account.accesscontrol.Rights.Admin;
import com.zimbra.cs.service.account.ToXML;
import com.zimbra.soap.ZimbraSoapContext;

/**
 * @author schemers
 */
public class GetAllAdminAccounts extends AdminDocumentHandler {

	public Element handle(Element request, Map<String, Object> context) throws ServiceException {

        ZimbraSoapContext zsc = getZimbraSoapContext(context);
        Provisioning prov = Provisioning.getInstance();

        boolean applyCos = request.getAttributeBool(AdminConstants.A_APPLY_COS, true);
        List accounts = prov.getAllAdminAccounts();

        Element response = zsc.createElement(AdminConstants.GET_ALL_ADMIN_ACCOUNTS_RESPONSE);
        for (Iterator it=accounts.iterator(); it.hasNext(); ) {
            Account acct = (Account)it.next();
            
            if (!hasRightsToList(zsc, acct, Admin.R_listAccount, Admin.R_getAccount))
                continue;
            
            ToXML.encodeAccountOld(response, acct, applyCos);
        }
	    return response;
	}
	
    @Override
    protected void docRights(List<AdminRight> relatedRights, StringBuilder notes) {
        relatedRights.add(Admin.R_listAccount);
        relatedRights.add(Admin.R_getAccount);
    }
}
