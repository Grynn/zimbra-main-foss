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
package com.zimbra.qa.unittest;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.*;
import static org.junit.Assert.*;

import com.unboundid.ldap.sdk.LDAPConnectionPool;
import com.unboundid.ldap.sdk.LDAPConnectionPoolStatistics;

import com.zimbra.common.localconfig.LC;
import com.zimbra.common.util.CliUtil;
import com.zimbra.cs.ldap.LdapClient;
import com.zimbra.cs.ldap.LdapUsage;
import com.zimbra.cs.ldap.ZAttributes;
import com.zimbra.cs.ldap.LdapTODO.*;
import com.zimbra.cs.ldap.unboundid.LdapConnectionPool;
import com.zimbra.cs.ldap.unboundid.UBIDLdapContext;



public class TestLdapSDK extends TestLdap {
    
    /*
     * For testConnectivity:
     * 
     * The connection configs have to be run in different JVM instances (i.e.
     * run this test manually after changing the static connConfig), because many
     * things are only initialized once and cached.
     * 
     * For other tests, just keep connConfig = ConnectionConfig.LDAP;
     * 
     * Or, write a drive to invoke each config in a separate JVM.  //TODO
     * 
     * Note: ssl_allow_mismatched_certs behavior is different in ZimbraLdapContext(JNDI) 
     *       and unboundid.
     *       
     *       (ssl_allow_mismatched_certs only applies to STRATTLS, *not* ldaps.)
     *       
     *       Legacy ZimbraLdapContext allows it only when ssl_allow_mismatched_certs 
     *       is true.  If ssl_allow_mismatched_certs is false, JNDI throws:
     *       Caused by: java.security.cert.CertificateException: No name matching localhost found
     *   at sun.security.util.HostnameChecker.matchDNS(HostnameChecker.java:210)
     *   at sun.security.util.HostnameChecker.match(HostnameChecker.java:77)
     *   at com.sun.jndi.ldap.ext.StartTlsResponseImpl.verify(StartTlsResponseImpl.java:416)
     *   
     *       because JNDI's StartTlsResponseImpl always verifies the hostname in the ldap server 
     *       certificate against the ldap URL after the SSL handshake is done.
     *       (http://download.oracle.com/javase/jndi/tutorial/ldap/ext/starttls.html)             
     *       If we don't set a custom HostnameVerifier, StartTlsResponseImpl.verify will fail.
     *        
     *       Unboundid LDAP SDK does not do this checking after sslSocket.handshake().
     *       The behavior is that mismatched cert is always allowed, as long as the SSL handshake 
     *       went through.  
     *       
     *       It can be done by override the SSLSocket.startHandshake() method (see CustomSSLSocket).
     *       
     *       But Unboundid StartTLSPostConnectProcessor only takes a SSLContext, not a SSLSocketFactory.
     *       We can only provide the TrustManager to SSLContext, not a SSLSocketFactory.  Thus,
     *       we cannot make StartTLSPostConnectProcessor to create a SSLSocket that we subclass.
     *       
     *       TODO, look into StartTLSRequestHandler in unboundid.  It takes a SSLSocketFactory.
     *       
     *       This issue should not be that bad because ssl_allow_mismatched_certs is default to true.
     *        
     */
    private static ConnectionConfig connConfig = ConnectionConfig.LDAP;
    
    /*
     * for testConnectivity 
     */
    private static enum ConnectionConfig {
        LDAP("ldap://localhost:389", "ldap://localhost:389", "0", "false", "false"),
        
        LDAPS_T_UNTRUSTED_T_MISMATCHED("ldaps://localhost:636", "ldaps://localhost:636", "0", "true", "true"),
        // JNDI: OK
        
        LDAPS_T_UNTRUSTED_F_MISMATCHED("ldaps://localhost:636", "ldaps://localhost:636", "0", "true", "false"),
        // JNDI: OK
        
        LDAPS_F_UNTRUSTED_T_MISMATCHED("ldaps://localhost:636", "ldaps://localhost:636", "0", "false", "true"),
        // JNDI: OK
        
        LDAPS_F_UNTRUSTED_F_MISMATCHED("ldaps://localhost:636", "ldaps://localhost:636", "0", "false", "false"),
        // JNDI: OK
        
        STARTTLS_T_UNTRUSTED_T_MISMATCHED("ldap://localhost:389", "ldap://localhost:389", "1", "true", "true"),    
        // JNDI: OK
        
        STARTTLS_T_UNTRUSTED_F_MISMATCHED("ldap://localhost:389", "ldap://localhost:389", "1", "true", "false"),
        // JNDI: ERROR: service.FAILURE (system failure: ZimbraLdapContext) (cause: javax.net.ssl.SSLPeerUnverifiedException hostname of the server 'localhost' does not match the hostname in the server's certificate.)
        /*
        Caused by: java.security.cert.CertificateException: No name matching localhost found
        at sun.security.util.HostnameChecker.matchDNS(HostnameChecker.java:210)
        at sun.security.util.HostnameChecker.match(HostnameChecker.java:77)
        at com.sun.jndi.ldap.ext.StartTlsResponseImpl.verify(StartTlsResponseImpl.java:416)
         */
        
        STARTTLS_F_UNTRUSTED_T_MISMATCHED("ldap://localhost:389", "ldap://localhost:389", "1", "false", "true"),
        // JNDI: OK
        
        STARTTLS_F_UNTRUSTED_F_MISMATCHED("ldap://localhost:389", "ldap://localhost:389", "1", "false", "false");
        // JNDI: ERROR: service.FAILURE (system failure: ZimbraLdapContext) (cause: javax.net.ssl.SSLPeerUnverifiedException hostname of the server 'localhost' does not match the hostname in the server's certificate.)
        
        
        private String ldap_url;
        private String ldap_master_url;
        private String ldap_starttls_supported;
        // private String ldap_starttls_required;   default(true) is OK
        // private String zimbra_require_interprocess_security;  default(1) is OK
        private String ssl_allow_untrusted_certs;
        private String ssl_allow_mismatched_certs;
        
        ConnectionConfig(String ldap_url,
                String ldap_master_url,
                String ldap_starttls_supported,
                String ssl_allow_untrusted_certs,
                String ssl_allow_mismatched_certs) {
            this.ldap_url = ldap_url;
            this.ldap_master_url = ldap_master_url;
            this.ldap_starttls_supported = ldap_starttls_supported;
            this.ssl_allow_untrusted_certs = ssl_allow_untrusted_certs;
            this.ssl_allow_mismatched_certs = ssl_allow_mismatched_certs;
        }
        
        void setLocalConfig() throws Exception {
            TestLdap.modifyLocalConfig(LC.ldap_url.key(), ldap_url);
            TestLdap.modifyLocalConfig(LC.ldap_master_url.key(), ldap_master_url);
            TestLdap.modifyLocalConfig(LC.ldap_starttls_supported.key(), ldap_starttls_supported);
            TestLdap.modifyLocalConfig(LC.ssl_allow_untrusted_certs.key(), ssl_allow_untrusted_certs);
            TestLdap.modifyLocalConfig(LC.ssl_allow_mismatched_certs.key(), ssl_allow_mismatched_certs);
            LC.reload();
        }
    }

    
    @BeforeClass
    public static void init() throws Exception {
        // these two lines are only needed for ldaps when not running inside the server,
        // because CustomTrustManafer is not used when running in CLI
        //
        // these two lines are not needed for starttls
        System.setProperty("javax.net.ssl.trustStore", LC.mailboxd_truststore.value());
        System.setProperty("javax.net.ssl.trustStorePassword", LC.mailboxd_truststore_password.value());
        
        CliUtil.toolSetup();
        
        connConfig.setLocalConfig();
        TestLdap.TestConfig.useConfig(TestLdap.TestConfig.UBID);
        // TestLdap.TestConfig.useConfig(TestLdap.TestConfig.LEGACY);
        
        LdapClient.initialize();
    }

    @AfterClass
    public static void cleanup() throws Exception {
        LdapClient.shutdown();
    }
    
    private UBIDLdapContext getContext() throws Exception {
        return (UBIDLdapContext) LdapClient.getContext(LdapUsage.UNITTEST);
    }
    
    private void closeContext(UBIDLdapContext zlc) {
        LdapClient.closeContext(zlc);
    }
    
    private void dumpUBIDSDKOject(String desc, Object obj) {
        
        System.out.println("\n--- " + desc);
        
        Pattern sPattern = Pattern.compile("([^(]*)\\((.*)");
        String asString = obj.toString();
        
        System.out.println(asString);
        
        Matcher matcher = sPattern.matcher(asString);
        if (matcher.matches()) {
            String className = matcher.group(1);
            String fields = matcher.group(2);
            
            if (fields.charAt(fields.length()-1) == ')') {
                fields = fields.substring(0, fields.length() -1);
            }
            
            String[] fieldArray = fields.split(",");
            
            System.out.println(className);
            for (String var : fieldArray) {
                System.out.println("  " + var.trim());
            }
        }
    }
    
    private void dumpConnPool(LDAPConnectionPool connPool) {
        dumpUBIDSDKOject("connPool", connPool);
        
        LDAPConnectionPoolStatistics poolStats = connPool.getConnectionPoolStatistics();
        dumpUBIDSDKOject("poolStats", poolStats);
    }
    
    @Test
    @Ignore  // has to be run manually for each connConfig
    public void testConnectivity() throws Exception {
        int expectedPort;
        
        if (connConfig == ConnectionConfig.LDAP || 
                connConfig == ConnectionConfig.STARTTLS_T_UNTRUSTED_T_MISMATCHED || 
                connConfig == ConnectionConfig.STARTTLS_T_UNTRUSTED_F_MISMATCHED || 
                connConfig == ConnectionConfig.STARTTLS_F_UNTRUSTED_T_MISMATCHED || 
                connConfig == ConnectionConfig.STARTTLS_F_UNTRUSTED_F_MISMATCHED) {
            expectedPort = 389;
        } else {
            expectedPort = 636;
        }
        
        UBIDLdapContext zlc1 = getContext();
        assertEquals(expectedPort, zlc1.getNative().getConnectedPort());
        
        ZAttributes attrs = zlc1.getAttributes("cn=zimbra");
        assertEquals("Zimbra Systems Application Data", attrs.getAttrString("description"));
        
        UBIDLdapContext zlc2 = getContext();
        assertEquals(expectedPort, zlc2.getNative().getConnectedPort());
        
        closeContext(zlc1);
        closeContext(zlc2);
    }
    
    @Test
    @Ignore  // TODO: must be the first test to run
    public void testConnPoolNumAvailConns() throws Exception {
        
        int INIT_POOL_SIZE = LC.ldap_connect_pool_initsize.intValue();
        int MAX_POOL_SIZE = LC.ldap_connect_pool_maxsize.intValue();
        
        LDAPConnectionPool connPool = LdapConnectionPool.getConnPoolByName(
                LdapConnectionPool.CP_ZIMBRA_REPLICA);
        
        assertEquals(INIT_POOL_SIZE, connPool.getCurrentAvailableConnections());
        assertEquals(MAX_POOL_SIZE, connPool.getMaximumAvailableConnections());
        
        UBIDLdapContext zlc = getContext();
        String poolName = connPool.getConnectionPoolName();
        closeContext(zlc);
        
        assertEquals(LdapConnectionPool.CP_ZIMBRA_REPLICA, poolName);
        
        //
        // available connections: 
        //   connections that are connected and is available to be checked out.
        //
        
        // get a connection and close it, num available connections in the pool 
        // should not change.
        for (int i = 0; i < 10; i++) {
            UBIDLdapContext conn = getContext();
            closeContext(conn);
            assertEquals(INIT_POOL_SIZE, connPool.getCurrentAvailableConnections());
        }
        
        int numOpen = 20;
        // make sure numOpen is a good number to test
        assertTrue(numOpen > INIT_POOL_SIZE);
        assertTrue(numOpen < MAX_POOL_SIZE);
        
        // get connections, not closing them, num available connections in the pool 
        // should keep decreasing until there is no more.
        UBIDLdapContext[] conns = new UBIDLdapContext[numOpen];
        for (int i = 0; i < numOpen; i++) {
            conns[i] = getContext();
            int expected = Math.max(0, INIT_POOL_SIZE - (i + 1));
            assertEquals(expected, connPool.getCurrentAvailableConnections());
        }
        
        // now, release all the open connections, num available connections in the pool 
        // should keep increasing.
        for (int i = 0; i < numOpen; i++) {
            closeContext(conns[i]);
            int expected = i + 1;
            assertEquals(expected, connPool.getCurrentAvailableConnections());
        }
        
        // dumpConnPool(connPool);
    }
    
    @Test
    @Ignore
    @TODO  // doesn't seem to work
    public void testConnPoolIdleTimeout() throws Exception {
        LDAPConnectionPool connPool = LdapConnectionPool.getConnPoolByName(
                LdapConnectionPool.CP_ZIMBRA_REPLICA);
        
        int numCurAvailConns = connPool.getCurrentAvailableConnections();
        long curMaxConnAgeMillis = connPool.getMaxConnectionAgeMillis();
        
        System.out.println("numCurAvailConns = " + numCurAvailConns);
        System.out.println("curMaxConnAgeMillis = " + curMaxConnAgeMillis);
        
        long maxConnAgeMillis = 3000;
        connPool.setMaxConnectionAgeMillis(maxConnAgeMillis);
        
        long millisToWait = maxConnAgeMillis + 1000;
        System.out.println("Waiting for " + millisToWait + " milli seconds");
        Thread.sleep(millisToWait);
        
        numCurAvailConns = connPool.getCurrentAvailableConnections();
        System.out.println("numCurAvailConns = " + numCurAvailConns);
        assertEquals(0, numCurAvailConns);
    }

    
}
