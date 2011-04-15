/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2006, 2007, 2008, 2009, 2010 Zimbra, Inc.
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

package com.zimbra.cs.account.ldap.legacy.entry;

import java.util.Map;

import javax.naming.NamingException;
import javax.naming.directory.Attributes;

import com.zimbra.cs.account.CalendarResource;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.ldap.LdapUtil;
import com.zimbra.cs.prov.ldap.entry.LdapEntry;

/**
 * @author jhahm
 */
public class LdapCalendarResource extends CalendarResource implements LdapEntry {

    private String mDn;

    public LdapCalendarResource(String dn, String email, Attributes attrs, Map<String, Object> defaults, Provisioning prov) throws NamingException {
        super(email,
              LdapUtil.getAttrString(attrs, Provisioning.A_zimbraId), 
              LdapUtil.getAttrs(attrs), defaults, prov);
        mDn = dn;
    }

    public String getDN() { return mDn; }
}
