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
package com.zimbra.cs.ldap;

import com.zimbra.common.localconfig.LC;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.ldap.legacy.LegacyZimbraLdapContext;
import com.zimbra.cs.ldap.LdapServerConfig.ExternalLdapConfig;
import com.zimbra.cs.ldap.LdapTODO.*;
import com.zimbra.cs.ldap.ZSearchScope.ZSearchScopeFactory;
import com.zimbra.cs.ldap.jndi.JNDILdapClient;
import com.zimbra.cs.ldap.unboundid.UBIDLdapClient;
import com.zimbra.cs.util.Zimbra;

public abstract class LdapClient {
    
    private static LdapClient ldapClient;
    
    synchronized static LdapClient getInstance() {
        if (ldapClient == null) {
            String className = LC.zimbra_class_ldap_client.value();
            if (className != null && !className.equals("")) {
                try {
                    ldapClient = (LdapClient) Class.forName(className).newInstance();
                } catch (Exception e) {
                    ZimbraLog.system.error("could not instantiate LDAP client '" + className + 
                            "'; defaulting to JNDI LDAP SDK", e);
                }
            }
            if (ldapClient == null) {
                ldapClient = new JNDILdapClient();
            }
            
            try {
                ldapClient.init();
            } catch (LdapException e) {
                Zimbra.halt("failed to initialize LDAP client", e);
            }
        }
        return ldapClient;
    }
    
    // for unittest only
    public static void initialize() {
        LdapClient.getInstance();
    }
    
    @TODO  // called from unittest for now, call it from Zimbra
    public static void shutdown() {
        LdapClient.getInstance().terminate();
    }
    
    public static boolean isLegacy() {
        return isLegacy(Provisioning.getInstance());
    }
    
    private static boolean isLegacy(Provisioning prov) {
        return (prov.getClass().equals(com.zimbra.cs.account.ldap.legacy.LegacyLdapProvisioning.class) ||
                prov.getClass().equals(com.zimbra.cs.account.ldap.legacy.LegacyCustomLdapProvisioning.class));
    }
    
    /* 
     * Bridging the legacy ZimbraLdapContext and the new ZLdapContext classes.
     */
    public static LegacyZimbraLdapContext toLegacyZimbraLdapContext(
            com.zimbra.cs.account.Provisioning prov, ILdapContext ldapContext) {
        if (!isLegacy(prov)) {
            Zimbra.halt("Provisioning instance is not LdapProvisioning", 
                    ServiceException.FAILURE("internal error, wrong ldap context instance", null));
        }
        
        if (!(getInstance() instanceof JNDILdapClient)) {
            Zimbra.halt("LdapClient instance is not JNDILdapClient", 
                    ServiceException.FAILURE("internal error, wrong ldap context instance", null));
        }
        
        // just a safety check, this should really not happen at thin point
        if (ldapContext != null && !(ldapContext instanceof LegacyZimbraLdapContext)) {
            Zimbra.halt("ILdapContext instance is not ZimbraLdapContext", 
                    ServiceException.FAILURE("internal error, wrong ldap context instance", null));
        }
        
        return (LegacyZimbraLdapContext)ldapContext;
    }
    
    public static ZLdapContext toZLdapContext(
            com.zimbra.cs.account.Provisioning prov, ILdapContext ldapContext) {
        if (isLegacy(prov)) {
            Zimbra.halt("Provisioning instance is not " + com.zimbra.cs.account.ldap.LdapProvisioning.class.getCanonicalName(),
                    ServiceException.FAILURE("internal error, wrong ldap context instance", null));
        }
        
        if (!(getInstance() instanceof UBIDLdapClient)) {
            Zimbra.halt("LdapClient instance is not UBIDLdapClient", 
                    ServiceException.FAILURE("internal error, wrong ldap context instance", null));
        }
        
        // just a safety check, this should really not happen at this point
        if (ldapContext != null && !(ldapContext instanceof ZLdapContext)) {
            Zimbra.halt("ILdapContext instance is not ZLdapContext", 
                    ServiceException.FAILURE("internal error, wrong ldap context instance", null));
        }
        
        return (ZLdapContext)ldapContext;
    }
    
    
    /*
     * ========================================================
     * static methods just to short-hand the getInstance() call
     * ========================================================
     */
    public static void waitForLdapServer() {
        getInstance().waitForLdapServerImpl();
    }
    
    public static void alwasyUseMaster() {
        getInstance().alwaysUseMasterImpl();
    }
    
    public static ZLdapContext getContext(LdapUsage usage) throws ServiceException {
        return getContext(LdapServerType.REPLICA, usage);
    }
    
    public static ZLdapContext getContext(LdapServerType serverType, LdapUsage usage) 
    throws ServiceException {
        return getInstance().getContextImpl(serverType, usage);
    }
    
    public static ZLdapContext getContext(LdapServerType serverType, boolean useConnPool,
            LdapUsage usage) 
    throws ServiceException {
        return getInstance().getContextImpl(serverType, useConnPool, usage);
    }
    
    public static ZLdapContext getExternalContext(ExternalLdapConfig ldapConfig,
            LdapUsage usage) 
    throws ServiceException {
        return getInstance().getExternalContextImpl(ldapConfig, usage);
    }
    
    public static void closeContext(ZLdapContext lctxt) {
        if (lctxt != null) {
            lctxt.closeContext();
        }
    }
    
    public static ZMutableEntry createMutableEntry() {
        return getInstance().createMutableEntryImpl();
    }
    
    public static void externalLdapAuthenticate(String urls[], boolean wantStartTLS, 
            String bindDN, String password, String note) 
    throws ServiceException {
        getInstance().externalLdapAuthenticateImpl(urls, wantStartTLS, 
                bindDN, password, note);
    }
    
    /**
     * LDAP authenticate to the Zimbra LDAP server.
     * Used when stored password is not SSHA.
     * 
     * @param principal
     * @param password
     * @param note
     * @throws ServiceException
     */
    public static void zimbraLdapAuthenticate(String bindDN, String password) 
    throws ServiceException {
        getInstance().zimbraLdapAuthenticateImpl(bindDN, password);
    }
    
    /*
     * ========================================================
     * abstract methods
     * ========================================================
     */
    protected void init() throws LdapException {
        ZSearchScope.init(getSearchScopeFactoryInstance());
        ZLdapFilterFactory.setInstance(getLdapFilterFactoryInstance());
    }
    
    protected abstract void terminate();
    
    protected abstract ZSearchScopeFactory getSearchScopeFactoryInstance(); 
    
    protected abstract ZLdapFilterFactory getLdapFilterFactoryInstance() 
    throws LdapException;
    
    protected abstract void waitForLdapServerImpl();
    
    protected abstract void alwaysUseMasterImpl();
    
    protected abstract ZLdapContext getContextImpl(LdapServerType serverType, LdapUsage usage) 
    throws ServiceException;
    
    protected abstract ZLdapContext getContextImpl(LdapServerType serverType, 
            boolean useConnPool, LdapUsage usage) 
    throws ServiceException;
    
    protected abstract ZLdapContext getExternalContextImpl(ExternalLdapConfig ldapConfig,
            LdapUsage usage) 
    throws ServiceException;
    
    protected abstract ZMutableEntry createMutableEntryImpl();
    
    protected abstract ZSearchControls createSearchControlsImpl(
            ZSearchScope searchScope, int sizeLimit, String[] returnAttrs);
    
    protected abstract void externalLdapAuthenticateImpl(String urls[], 
            boolean wantStartTLS, String bindDN, String password, String note) 
    throws ServiceException;
    
    protected abstract void zimbraLdapAuthenticateImpl(String bindDN, String password) 
    throws ServiceException;
}
