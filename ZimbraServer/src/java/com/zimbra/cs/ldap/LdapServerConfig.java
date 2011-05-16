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

import java.util.Set;

import com.zimbra.common.localconfig.LC;
import com.zimbra.common.util.StringUtil;

public abstract class LdapServerConfig {
    private static final String DEFALT_LDAP_PORT = "389";
    
    protected String ldapURL;  // space separated URLs
    protected String adminBindDN;
    protected String adminBindPassword;
    
    // whether startTLS is wanted
    // if ldapURL contains ldaps URL, then ldaps is honored not startTLS.
    protected boolean wantStartTLS; 
    
    // the actual connection type
    protected LdapConnType connType;
    
    // common settings from LC for both internal and external LDAP server
    // make them final - they are NOT taken into account for building 
    // connection pool keys.  If any of these becomes set-able, 
    // ExternalLdapConfig.getConnPoolKey() has to be modified accordingly.
    protected final  boolean sslAllowUntrustedCerts;
    protected final int connPoolMaxSize;
    protected final int connPoolTimeoutMillis;
    protected final int connectTimeoutMillis;
    protected final int readTimeoutMillis;
    
    public abstract int getConnPoolInitSize();
    
    
    private LdapServerConfig() {
        
        // load common settings, for both Zimbra LDAP and external LDAP
        
        //
        // SSL settings
        //
        this.sslAllowUntrustedCerts = LC.ssl_allow_untrusted_certs.booleanValue();
            
        //
        // connection pool settings
        //
        // System.setProperty("com.sun.jndi.ldap.connect.pool.debug", LC.ldap_connect_pool_debug.value());
        this.connPoolMaxSize = LC.ldap_connect_pool_maxsize.intValue();
        // System.setProperty("com.sun.jndi.ldap.connect.pool.prefsize", LC.ldap_connect_pool_prefsize.value());
        this.connPoolTimeoutMillis = LC.ldap_connect_pool_timeout.intValue();
        
        // timeout setting
        this.connectTimeoutMillis = LC.ldap_connect_timeout.intValue();
        this.readTimeoutMillis = LC.ldap_read_timeout.intValue();
    }
    
    
    public static class ZimbraLdapConfig extends LdapServerConfig {
        private LdapServerType serverType;
        
        // This is a Zimbra LDAP setting only.
        private final int connPoolInitSize;
        
        public ZimbraLdapConfig(LdapServerType serverType) {
            super();
            
            this.serverType = serverType;
            this.connPoolInitSize = LC.ldap_connect_pool_initsize.intValue();
            
            if (LdapServerType.MASTER == this.serverType) {
                this.ldapURL = getMasterURL();
            } else {
                this.ldapURL = getReplicaURL();
            }
            
            /*
             * admin bind DN and bind password
             */
            this.adminBindDN = LC.zimbra_ldap_userdn.value();
            this.adminBindPassword = LC.zimbra_ldap_password.value();
            
            /*
             * startTLS settings
             */
            // Whether the LDAP server supports the startTLS operation.
            boolean ldap_starttls_supported = "1".equals(LC.ldap_starttls_supported.value());
            // Whether starttls is required for java ldap client when it establishes connections to the Zimbra ldap server
            boolean ldap_starttls_required = LC.ldap_starttls_required.booleanValue();
            boolean zimbra_require_interprocess_security = "1".equals(LC.zimbra_require_interprocess_security.value());
            
            this.wantStartTLS = (ldap_starttls_supported && ldap_starttls_required && zimbra_require_interprocess_security);
            
            this.connType = LdapConnType.getConnType(this.ldapURL, this.wantStartTLS);
        }
        
        @Override
        public int getConnPoolInitSize() {
            return connPoolInitSize;
        }
        
        private String getReplicaURL() {
            String replicaURL;
            
            replicaURL = LC.ldap_url.value().trim();
            if (replicaURL.length() == 0) {
                String ldapHost = LC.ldap_host.value();
                String ldapPort = LC.ldap_port.value();
                
                if (StringUtil.isNullOrEmpty(ldapHost)) {
                    ldapHost = "localhost";
                }
                if (StringUtil.isNullOrEmpty(ldapPort)) {
                    ldapPort = DEFALT_LDAP_PORT;
                }
                replicaURL = "ldap://" + ldapHost + ":" + ldapPort + "/";
            }
            
            return replicaURL;
        }
        
        private String getMasterURL() {
            String masterURL = LC.ldap_master_url.value().trim();
            if (masterURL.length() == 0) {
                masterURL = getReplicaURL();
            }
            
            return masterURL;
        }
    }
    
    public static class ExternalLdapConfig extends LdapServerConfig {
        
        // only in external LDAP settings, in ZimbraLDAP the deref policy is never
        protected String derefAliasPolicy;  
        
        private String authMech;
        private Set<String> binaryAttrs;  // not needed for unboundid
        private String notes;  // for debugging purpose

        /**
         * Instantiate an external LDAP config
         * 
         * @param urls          space separated URLs
         * @param wantStartTLS  whether startTLS is wanted (won't be honored if urls is ldaps)
         * @param authMech      // TODO: cleanup.  For now, if null: simple bind if binDN/password is not null, anon bind otherwise
         * @param bindDn
         * @param bindPassword
         * @param binaryAttrs
         * @param note
         */
        public ExternalLdapConfig(String urls, boolean wantStartTLS, String authMech, 
                String bindDn, String bindPassword, Set<String> binaryAttrs, String note) {
            super();
            
            this.ldapURL = urls;
            this.adminBindDN = bindDn;
            this.adminBindPassword = bindPassword;
            this.wantStartTLS = wantStartTLS;
            
            this.authMech = authMech;
            this.binaryAttrs = binaryAttrs;
            this.notes = notes;
            
            this.derefAliasPolicy = LC.ldap_deref_aliases.value();
            
            this.connType = LdapConnType.getConnType(this.ldapURL, this.wantStartTLS);
        }
        
        /**
         * Instantiate an external LDAP config. 
         * 
         * @param urls          array of URLs
         * @param wantStartTLS
         * @param authMech
         * @param bindDn
         * @param bindPassword
         * @param binaryAttrs
         * @param note
         */
        public ExternalLdapConfig(String[] urls, boolean wantStartTLS, String authMech, 
                String bindDn, String bindPassword, Set<String> binaryAttrs, String note) {
            this (LdapServerConfig.joinURLS(urls), wantStartTLS, authMech, 
                    bindDn, bindPassword, binaryAttrs,  note);
        }
        
        public String getAuthMech() {
            return authMech;
        }
        
        public Set<String> getBinaryAttrs() {
            return binaryAttrs;
        }
        
        public String getNotes() {
            return notes;
        }
        
        public String getDerefAliasPolicy() {
            return derefAliasPolicy;
        }
        
        public String getConnPoolKey() {
            StringBuilder key = new StringBuilder();
            key.append(ldapURL + ":");
            key.append(connType.toString() + ":");
            key.append((authMech == null ? "" : authMech) + ":");
            key.append((adminBindDN == null ? "" : adminBindDN) + ":");
            key.append((adminBindPassword == null ? "" :  adminBindPassword) + ":");
            
            // do not take into account common settings set in LdapConfig
            // they should be all the same.  
            
            return key.toString();
        }

        @Override
        public int getConnPoolInitSize() {
            /*
             * ALWAYS return 0.
             * We don't want to create any connection during connection pool
             * creation, because ConnectionPool.getConnPoolByName() has to be 
             * guarded in a static synchronized block.  We do not want to block 
             * all threads needing this pool wait on this lock when the initial 
             * connection takes too long.
             */
            return 0;
        }
        
    }


    public static String joinURLS(String urls[]) {
        if (urls.length == 1) return urls[0];
        StringBuffer url = new StringBuffer();
        for (int i=0; i < urls.length; i++) {
            if (i > 0) url.append(' ');
            url.append(urls[i]);
        }
        return url.toString();
    }
    
    // return space separated URLs
    public String getLdapURL() {
        return ldapURL; 
    }
    
    public String getAdminBindDN() {
        return adminBindDN;
    }
    
    public String getAdminBindPassword() {
        return adminBindPassword;
    }
    
    public boolean getWantStartTLS() {
        return wantStartTLS;
    }
    
    public LdapConnType getConnType() {
        return connType;
    }
    
    public boolean sslAllowUntrustedCerts() {
        return sslAllowUntrustedCerts;
    }
    
    public int getConnPoolMaxSize() {
        return connPoolMaxSize;
    }
    
    public int getConnPoolTimeoutMillis() {
        return connPoolTimeoutMillis;
    }
    
    public int getConnectTimeoutMillis() {
        return connectTimeoutMillis;
    }
    
    public int getReadTimeoutMillis() {
        return readTimeoutMillis;
    }

}
