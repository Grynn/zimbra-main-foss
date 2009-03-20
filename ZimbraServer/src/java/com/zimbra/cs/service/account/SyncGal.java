/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2005, 2006, 2007, 2008, 2009 Zimbra, Inc.
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
 * Created on May 26, 2004
 */
package com.zimbra.cs.service.account;

import java.util.Map;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.AccountConstants;
import com.zimbra.common.soap.MailConstants;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.Domain;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.Provisioning.SearchGalResult;
import com.zimbra.cs.localconfig.DebugConfig;
import com.zimbra.common.soap.Element;
import com.zimbra.soap.ZimbraSoapContext;

/**
 * @author schemers
 */
public class SyncGal extends AccountDocumentHandler {

    public Element handle(Element request, Map<String, Object> context) throws ServiceException {
        ZimbraSoapContext zsc = getZimbraSoapContext(context);
        Account account = getRequestedAccount(getZimbraSoapContext(context));

        if (!canAccessAccount(zsc, account))
            throw ServiceException.PERM_DENIED("can not access account");
        
        if (!zsc.getAuthToken().isAdmin() && !zsc.getAuthToken().isDomainAdmin()) {
            if (!(account.getBooleanAttr(Provisioning.A_zimbraFeatureGalSyncEnabled, false) &&
                  account.getBooleanAttr(Provisioning.A_zimbraFeatureGalEnabled, false)))
                throw ServiceException.PERM_DENIED("cannot sync GAL");
        }
        
        String tokenAttr = request.getAttribute(MailConstants.A_TOKEN, "");
        Element response = zsc.createElement(AccountConstants.SYNC_GAL_RESPONSE);

        boolean galAccountSearchSucceeded = SearchGal.doGalAccountSearch(context, account, tokenAttr, null, Provisioning.GAL_SEARCH_TYPE.ALL, request, response);
        if (!galAccountSearchSucceeded) {
        	response = zsc.createElement(AccountConstants.SYNC_GAL_RESPONSE);
        	doLdapSearch(account, tokenAttr, response);
        }
        return response;
    }

    @Override
    public boolean needsAuth(Map<String, Object> context) {
        return true;
    }

    private void doLdapSearch(Account account, String tokenAttr, Element response) throws ServiceException {
        Provisioning prov = Provisioning.getInstance();
        Domain d = prov.getDomain(account);
        
        SearchGal.GalContactVisitor visitor = null;
        if (!DebugConfig.disableGalSyncVisitor)
            visitor = new SearchGal.GalContactVisitor(response);

        SearchGalResult result = prov.searchGal(d, "", Provisioning.GAL_SEARCH_TYPE.ALL, tokenAttr, visitor);
        
        if (result.getToken() != null)
            response.addAttribute(MailConstants.A_TOKEN, result.getToken());
        
        com.zimbra.cs.service.account.SearchGal.addContacts(response, result);
    }
}
