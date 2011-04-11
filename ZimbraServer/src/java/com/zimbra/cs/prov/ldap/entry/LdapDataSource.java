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
package com.zimbra.cs.prov.ldap.entry;

import java.util.List;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.AttributeClass;
import com.zimbra.cs.account.DataSource;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.ldap.LdapException;
import com.zimbra.cs.ldap.LdapUtil;
import com.zimbra.cs.ldap.ZSearchResultEntry;

/**
 * 
 * @author pshao
 *
 */
class LdapDataSource extends DataSource implements LdapEntry {

	private String mDn;

	LdapDataSource(Account acct, ZSearchResultEntry entry, Provisioning prov) throws LdapException, ServiceException {
		super(acct, getObjectType(entry),
		        LdapUtil.getAttrString(entry, Provisioning.A_zimbraDataSourceName),
		        LdapUtil.getAttrString(entry, Provisioning.A_zimbraDataSourceId),                
		        LdapUtil.getAttrs(entry), 
		        prov);
		mDn = entry.getDN();
	}
	
	public String getDN() {
		return mDn;
	}

    static String getObjectClass(Type type) {
        switch (type) {
            case pop3:
                return AttributeClass.OC_zimbraPop3DataSource;
            case imap:
                return AttributeClass.OC_zimbraImapDataSource;
            case rss:
                return AttributeClass.OC_zimbraRssDataSource;
            case gal:
                return AttributeClass.OC_zimbraGalDataSource;
            default: 
                return null;
        }
    }

    static Type getObjectType(ZSearchResultEntry entry) throws ServiceException {
        try {
            String dsType = LdapUtil.getAttrString(entry, Provisioning.A_zimbraDataSourceType);
            if (dsType != null)
                return Type.fromString(dsType);
        } catch (LdapException e) {
            ZimbraLog.datasource.error("cannot get DataSource type", e);
        }
        
        List<String> attr = entry.getMultiAttrString(Provisioning.A_objectClass);
        if (attr.contains(AttributeClass.OC_zimbraPop3DataSource)) 
            return Type.pop3;
        else if (attr.contains(AttributeClass.OC_zimbraImapDataSource))
            return Type.imap;
        else if (attr.contains(AttributeClass.OC_zimbraRssDataSource))
            return Type.rss;
        else if (attr.contains(AttributeClass.OC_zimbraGalDataSource))
            return Type.gal;
        else
            throw ServiceException.FAILURE("unable to determine data source type from object class", null);
    }
}
