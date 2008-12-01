/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2005, 2006, 2007 Zimbra, Inc.
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

package com.zimbra.cs.account;

import java.util.Map;
import java.util.Set;

import com.zimbra.common.localconfig.LC;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.account.Provisioning.AccountBy;
import com.zimbra.cs.account.accesscontrol.Right;

public abstract class AccessManager {

    private static AccessManager sManager;
    
    public static AccessManager getInstance() {
        if (sManager == null) {
            String className = LC.zimbra_class_accessmanager.value();
            if (className != null && !className.equals("")) {
                try {
                	sManager = (AccessManager) Class.forName(className).newInstance();
                } catch (Exception e) {
                    ZimbraLog.account.error("could not instantiate AccessManager interface of class '" + className + "'; defaulting to DomainAccessManager", e);
                }
            }
            if (sManager == null)
            	sManager = new DomainAccessManager();
        }
        return sManager;
    }
    
    public abstract boolean isDomainAdminOnly(AuthToken at);

    public Account getAccount(AuthToken at) throws ServiceException {
        return Provisioning.getInstance().get(AccountBy.id, at.getAccountId(), at);
    }
    
    protected Account getAdminAccount(AuthToken at) throws ServiceException {
        String adminAcctId = at.getAdminAccountId();
        if (adminAcctId == null)
            return null;
        else
            return Provisioning.getInstance().get(AccountBy.id, adminAcctId, at);
    }

    public Domain getDomain(AuthToken at) throws ServiceException {
        return Provisioning.getInstance().getDomain(getAccount(at));
    }

    public abstract boolean canAccessAccount(AuthToken at, Account target, boolean asAdmin) throws ServiceException;
    public abstract boolean canAccessAccount(AuthToken at, Account target) throws ServiceException;

    /** @return Returns whether the specified account's credentials are sufficient
     *  to perform operations on the target account.  <i>Note: This method
     *  checks only for admin access, and passing the same account for
     *  <code>credentials</code> and <code>target</code> will not succeed
     *  for non-admin accounts.</i>
     * @param credentials  The authenticated account performing the action. 
     * @param target       The target account for the proposed action. 
     * @param asAdmin      If the authenticated account is acting as an admin accunt */
    public abstract boolean canAccessAccount(Account credentials, Account target, boolean asAdmin) throws ServiceException;
    public abstract boolean canAccessAccount(Account credentials, Account target) throws ServiceException;

    public abstract boolean canAccessDomain(AuthToken at, String domainName) throws ServiceException;
    public abstract boolean canAccessDomain(AuthToken at, Domain domain) throws ServiceException;
    
    public abstract boolean canAccessCos(AuthToken at, String cosId) throws ServiceException;

    public abstract boolean canAccessEmail(AuthToken at, String email) throws ServiceException;

    public abstract boolean canModifyMailQuota(AuthToken at, Account targetAccount, long mailQuota) throws ServiceException;
    
    //
    // ACL based methods
    //
    
    public abstract boolean canDo(Account grantee,     Entry target, Right rightNeeded, boolean asAdmin, boolean defaultGrant);
    public abstract boolean canDo(AuthToken grantee,   Entry target, Right rightNeeded, boolean asAdmin, boolean defaultGrant);
    public abstract boolean canDo(String granteeEmail, Entry target, Right rightNeeded, boolean asAdmin, boolean defaultGrant);
    
    // for admin calls to return the decisive grant that lead to the result 
    public static class ViaGrant {
        private ViaGrant mImpl;
        public void setImpl(ViaGrant impl) { mImpl = impl;}
        public String getTargetType()   { return (mImpl==null)?null:mImpl.getTargetType(); } 
        public String getTargetName()   { return (mImpl==null)?null:mImpl.getTargetName(); } 
        public String getGranteeType()  { return (mImpl==null)?null:mImpl.getGranteeType(); } 
        public String getGranteeName()  { return (mImpl==null)?null:mImpl.getGranteeName(); } 
        public String getRight()        { return (mImpl==null)?null:mImpl.getRight(); } 
        public boolean isNegativeGrant(){ return (mImpl==null)?null:mImpl.isNegativeGrant(); } 
        
        public boolean available() { return mImpl != null; }
    }
    
    public boolean canDo(Account grantee, Entry target, Right rightNeeded, boolean asAdmin, boolean defaultGrant, ViaGrant viaGrant) {
        return canDo(grantee, target, rightNeeded, asAdmin, defaultGrant);
    }
    
    public boolean canDo(AuthToken grantee, Entry target, Right rightNeeded, boolean asAdmin, boolean defaultGrant, ViaGrant viaGrant) {
        return canDo(grantee, target, rightNeeded, asAdmin, defaultGrant);
    }
    
    public boolean canDo(String granteeEmail, Entry target, Right rightNeeded, boolean asAdmin, boolean defaultGrant, ViaGrant viaGrant) {
        return canDo(granteeEmail, target, rightNeeded, asAdmin, defaultGrant);
    }
    
    public boolean canDo(Account grantee, Entry target, Right rightNeeded, Map<String, Object> attrs, ViaGrant viaGrant) throws ServiceException {
        throw ServiceException.FAILURE("not supported", null);
    }
    
    /*
     * returns if grantee can get attrs on target
     */
    public abstract boolean canGetAttrs(Account grantee,   Entry target, Set<String> attrs) throws ServiceException;
    public abstract boolean canGetAttrs(AuthToken grantee, Entry target, Set<String> attrs) throws ServiceException;
    
    /*
     * returns if grantee can set attrs on target, constraints are NOT checked
     */
    public abstract boolean canSetAttrs(Account grantee,   Entry target, Set<String> attrs) throws ServiceException;
    public abstract boolean canSetAttrs(AuthToken grantee, Entry target, Set<String> attrs) throws ServiceException;
    
    /*
     * returns if grantee can set attrs to desired values on target, constraints DOES get checked.
     */
    public abstract boolean canSetAttrs(Account grantee,   Entry target, Map<String, Object> attrs) throws ServiceException;
    public abstract boolean canSetAttrs(AuthToken grantee, Entry target, Map<String, Object> attrs) throws ServiceException;
    


    /**
     * Returns true if authAccount should be allowed access to private data in appointments owned
     * by targetAccount.  Returns true if authAccount and targetAccount are the same account or if
     * authAccount has admin rights over targetAccount.
     * 
     * @param authAccount
     * @param targetAccount
     * @param asAdmin true if authAccount is authenticated with admin privileges
     * @return
     * @throws com.zimbra.common.service.ServiceException
     */
    public boolean allowPrivateAccess(Account authAccount, Account targetAccount, boolean asAdmin)
    throws ServiceException {
        if (authAccount != null && targetAccount != null) {
            if (authAccount.getId().equalsIgnoreCase(targetAccount.getId()))
                return true;
            if (canAccessAccount(authAccount, targetAccount, asAdmin))
                return true;
        }
        return false;
    }
}
