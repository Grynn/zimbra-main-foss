/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2010 Zimbra, Inc.
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

package com.zimbra.cs.gal;

import java.util.Arrays;
import java.util.List;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.account.AttributeClass;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.ldap.LdapProvisioning;
import com.zimbra.cs.ldap.IAttributes;
import com.zimbra.cs.ldap.ILdapContext;

public class ZimbraGalGroupHandler extends GalGroupHandler {

    private static String[] sEmptyMembers = new String[0];
    
    @Override
    public boolean isGroup(IAttributes ldapAttrs) {
        try {
            List<String> objectclass = ldapAttrs.getMultiAttrStringAsList(Provisioning.A_objectClass);
            return objectclass.contains(AttributeClass.OC_zimbraDistributionList);
        } catch (ServiceException e) {
            ZimbraLog.gal.warn("unable to get attribute " + Provisioning.A_objectClass, e);
        }
        return false;
    }
    
    @Override
    public String[] getMembers(ILdapContext ldapContext, String searchBase, String entryDN, IAttributes ldapAttrs) {
        try {
            ZimbraLog.gal.debug("Fetching members for group " + ldapAttrs.getAttrString(LdapProvisioning.A_mail));
            String[] members = ldapAttrs.getMultiAttrString(Provisioning.A_zimbraMailForwardingAddress);
            Arrays.sort(members);
            return members;
        } catch (ServiceException e) {
            ZimbraLog.gal.warn("unable to retrieve group members ", e);
            return sEmptyMembers;
        }
    }
}
