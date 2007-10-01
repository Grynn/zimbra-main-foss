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

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.AdminConstants;
import com.zimbra.common.soap.Element;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.AccountServiceException;
import com.zimbra.cs.account.Alias;
import com.zimbra.cs.account.CalendarResource;
import com.zimbra.cs.account.DistributionList;
import com.zimbra.cs.account.Domain;
import com.zimbra.cs.account.NamedEntry;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.Provisioning.DomainBy;
import com.zimbra.cs.service.account.ToXML;
import com.zimbra.cs.session.AdminSession;
import com.zimbra.cs.session.Session;
import com.zimbra.soap.ZimbraSoapContext;

import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

/**
 * @author schemers
 */
public class SearchAccounts extends AdminDocumentHandler {

    /**
     * must be careful and only allow access to domain if domain admin
     */
    public boolean domainAuthSufficient(Map context) {
        return true;
    }
    
    public Element handle(Element request, Map<String, Object> context) throws ServiceException {
        ZimbraSoapContext zsc = getZimbraSoapContext(context);
        Provisioning prov = Provisioning.getInstance();

        String query = request.getAttribute(AdminConstants.E_QUERY);

        int limit = (int) request.getAttributeLong(AdminConstants.A_LIMIT, Integer.MAX_VALUE);
        if (limit == 0)
            limit = Integer.MAX_VALUE;
        int offset = (int) request.getAttributeLong(AdminConstants.A_OFFSET, 0);
        String domain = request.getAttribute(AdminConstants.A_DOMAIN, null);
        boolean applyCos = request.getAttributeBool(AdminConstants.A_APPLY_COS, true);
        String attrsStr = request.getAttribute(AdminConstants.A_ATTRS, null);
        String sortBy = request.getAttribute(AdminConstants.A_SORT_BY, null);
        String types = request.getAttribute(AdminConstants.A_TYPES, "accounts");
        boolean sortAscending = request.getAttributeBool(AdminConstants.A_SORT_ASCENDING, true);

        int flags = Provisioning.searchAccountStringToMask(types);

        String[] attrs = attrsStr == null ? null : attrsStr.split(",");

        // if we are a domain admin only, restrict to domain
        if (isDomainAdminOnly(zsc)) {
            if ((flags & Provisioning.SA_DOMAIN_FLAG) == Provisioning.SA_DOMAIN_FLAG)
                throw ServiceException.PERM_DENIED("can not search for domains");

            if (domain == null) {
                domain = getAuthTokenAccountDomain(zsc).getName();
            } else {
                if (!canAccessDomain(zsc, domain)) 
                    throw ServiceException.PERM_DENIED("can not access domain"); 
            }
        }

        Domain d = null;
        if (domain != null) {
            d = prov.get(DomainBy.name, domain);
            if (d == null)
                throw AccountServiceException.NO_SUCH_DOMAIN(domain);
        }

        List accounts;
        AdminSession session = (AdminSession) getSession(zsc, Session.Type.ADMIN);
        if (session != null) {
            accounts = session.searchAccounts(d, query, attrs, sortBy, sortAscending, flags, offset, 0);
        } else {
            if (d != null) {
                accounts = prov.searchAccounts(d, query, attrs, sortBy, sortAscending, flags);
            } else {
                accounts = prov.searchAccounts(query, attrs, sortBy, sortAscending, flags);
            }
        }

        Element response = zsc.createElement(AdminConstants.SEARCH_ACCOUNTS_RESPONSE);
        int i, limitMax = offset+limit;
        for (i=offset; i < limitMax && i < accounts.size(); i++) {
            NamedEntry entry = (NamedEntry) accounts.get(i);
        	if (entry instanceof CalendarResource) {
        	    ToXML.encodeCalendarResourceOld(response, (CalendarResource) entry, applyCos);
        	} else if (entry instanceof Account) {
                ToXML.encodeAccountOld(response, (Account) entry, applyCos);
            } else if (entry instanceof DistributionList) {
                doDistributionList(response, (DistributionList) entry);
            } else if (entry instanceof Alias) {
                doAlias(response, (Alias) entry);
            } else if (entry instanceof Domain) {
                GetDomain.doDomain(response, (Domain) entry, applyCos);
            }
        }          

        response.addAttribute(AdminConstants.A_MORE, i < accounts.size());
        response.addAttribute(AdminConstants.A_SEARCH_TOTAL, accounts.size());
        return response;
    }

    static void doDistributionList(Element e, DistributionList list) {
        Element elist = e.addElement(AdminConstants.E_DL);
        elist.addAttribute(AdminConstants.A_NAME, list.getName());
        elist.addAttribute(AdminConstants.A_ID, list.getId());
        Map attrs = list.getAttrs();
        doAttrs(elist, attrs);
    }

    static void doAlias(Element e, Alias a) {
        Element ealias = e.addElement(AdminConstants.E_ALIAS);
        ealias.addAttribute(AdminConstants.A_NAME, a.getName());
        ealias.addAttribute(AdminConstants.A_ID, a.getId());
        Map attrs = a.getAttrs();
        doAttrs(ealias, attrs);
    }

    static void doAttrs(Element e, Map attrs) {
        for (Iterator mit = attrs.entrySet().iterator(); mit.hasNext(); ) {
            Map.Entry entry = (Entry) mit.next();
            String name = (String) entry.getKey();
            Object value = entry.getValue();
            if (value instanceof String[]) {
                String sv[] = (String[]) value;
                for (int i = 0; i < sv.length; i++)
                    e.addElement(AdminConstants.E_A).addAttribute(AdminConstants.A_N, name).setText(sv[i]);
            } else if (value instanceof String)
                e.addElement(AdminConstants.E_A).addAttribute(AdminConstants.A_N, name).setText((String) value);
        }       
    }   
}
