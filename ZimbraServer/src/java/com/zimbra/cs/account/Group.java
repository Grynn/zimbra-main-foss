/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2005, 2006, 2007, 2009, 2010 Zimbra, Inc.
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
package com.zimbra.cs.account;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.zimbra.common.account.ZAttrProvisioning.DistributionListSubscriptionPolicy;
import com.zimbra.common.account.ZAttrProvisioning.DistributionListUnsubscriptionPolicy;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.AdminConstants;
import com.zimbra.common.soap.Element;
import com.zimbra.cs.account.accesscontrol.ACLUtil;
import com.zimbra.cs.account.accesscontrol.GranteeType;
import com.zimbra.cs.account.accesscontrol.Right;
import com.zimbra.cs.account.accesscontrol.ZimbraACE;
import com.zimbra.cs.account.accesscontrol.Rights.User;

public abstract class Group extends MailTarget implements AliasedEntry {
    
    public static final DistributionListSubscriptionPolicy 
            DEFAULT_SUBSCRIPTION_POLICY = DistributionListSubscriptionPolicy.REJECT;
    
    public static final DistributionListUnsubscriptionPolicy 
            DEFAULT_UNSUBSCRIPTION_POLICY = DistributionListUnsubscriptionPolicy.REJECT;
    
    public Group(String name, String id, Map<String, Object> attrs, Provisioning prov) {
        super(name, id, attrs, null, prov);
    }
    
    public abstract boolean isDynamic();

    public abstract Domain getDomain() throws ServiceException;
    
    public abstract String[] getAllMembers() throws ServiceException;
    
    public abstract Set<String> getAllMembersSet() throws ServiceException;
    
    public abstract String getDisplayName();
    
    abstract DistributionListSubscriptionPolicy getDistributionListSubscriptionPolicy();
    abstract DistributionListUnsubscriptionPolicy getDistributionListUnsubscriptionPolicy();
    
    public DistributionListSubscriptionPolicy getSubscriptionPolicy() {
        DistributionListSubscriptionPolicy policy = getDistributionListSubscriptionPolicy();
        if (policy == null) {
            return DEFAULT_SUBSCRIPTION_POLICY;
        } else {
            return policy;
        }
    }
    
    public DistributionListUnsubscriptionPolicy getUnsubscriptionPolicy() {
        DistributionListUnsubscriptionPolicy policy = getDistributionListUnsubscriptionPolicy();
        if (policy == null) {
            return DEFAULT_UNSUBSCRIPTION_POLICY;
        } else {
            return policy;
        }
    }

    @Override
    public boolean isAddrOfEntry(String addr) {
        addr = addr.toLowerCase();
        if (getName().equals(addr)) {
            return true;
        } else {
            Set<String> aliases = getMultiAttrSet(Provisioning.A_zimbraMailAlias);
            return aliases.contains(addr);
        }
    }
    
    
    public static class GroupOwner {
        public static Right GROUP_OWNER_RIGHT = User.R_ownDistList;
        
        private GranteeType type;
        private String id;
        private String name;
        
        public GranteeType getType() {
            return type;
        }
        
        public String getId() {
            return id;
        }
        
        public String getName() {
            return name;
        }
        
        public static List<GroupOwner> getOwners(Group group, boolean needName) 
        throws ServiceException {
            List<GroupOwner> owners = new ArrayList<GroupOwner>();
            
            List<ZimbraACE> acl = ACLUtil.getAllACEs(group);
            if (acl != null) {
                for (ZimbraACE ace : acl) {
                    Right right = ace.getRight();
                    if (GROUP_OWNER_RIGHT == right) {
                        owners.add(new GroupOwner(ace, needName));
                    }
                }
            }
            
            return owners;
        }
        
        public static void getOwnerEmails(Group group, Collection<String> result) 
        throws ServiceException {
            List<ZimbraACE> acl = ACLUtil.getAllACEs(group);
            if (acl != null) {
                for (ZimbraACE ace : acl) {
                    Right right = ace.getRight();
                    if (GROUP_OWNER_RIGHT == right) {
                        result.add(ace.getGranteeDisplayName());
                    }
                }
            }
        }
        
        private GroupOwner(ZimbraACE ace, boolean needName) {
            type = ace.getGranteeType();
            id = ace.getGrantee();
            if (needName) {
                name = ace.getGranteeDisplayName();
            }
        }
    }
}
