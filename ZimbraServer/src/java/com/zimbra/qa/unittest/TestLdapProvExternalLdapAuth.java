package com.zimbra.qa.unittest;

import java.util.HashMap;
import java.util.Map;

import org.junit.*;
import static org.junit.Assert.*;

import com.zimbra.common.localconfig.LC;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.Domain;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.auth.AuthContext;
import com.zimbra.cs.account.ldap.Check;
import com.zimbra.cs.ldap.LdapConstants;
import com.zimbra.cs.prov.ldap.LdapProv;

public class TestLdapProvExternalLdapAuth {

    private static Provisioning prov;
    private static Domain domain;
    
    @BeforeClass
    public static void init() throws Exception {
        TestLdap.manualInit();
        
        prov = Provisioning.getInstance();
        domain = TestLdapProvDomain.createDomain(prov, baseDomainName(), null);
    }
    
    @AfterClass
    public static void cleanup() throws Exception {
        String baseDomainName = baseDomainName();
        TestLdap.deleteEntireBranch(baseDomainName);
    }
    
    private static String baseDomainName() {
        return TestLdapProvExternalLdapAuth.class.getName().toLowerCase();
    }
    
    private Account createAccount(String localPart) throws Exception {
        return createAccount(localPart, null);
    }
    
    private Account createAccount(String localPart, Map<String, Object> attrs) throws Exception {
        return TestLdapProvAccount.createAccount(prov, localPart, domain, attrs);
    }
    
    private void deleteAccount(Account acct) throws Exception {
        TestLdapProvAccount.deleteAccount(prov, acct);
    }
    
    private String getAccountDN(Account acct) throws Exception {
        if (acct instanceof com.zimbra.cs.account.ldap.legacy.entry.LdapAccount) {
            return ((com.zimbra.cs.account.ldap.legacy.entry.LdapAccount) acct).getDN();
        } else if (acct instanceof com.zimbra.cs.prov.ldap.entry.LdapAccount) {
            return ((com.zimbra.cs.prov.ldap.entry.LdapAccount) acct).getDN();
        }
        
        fail();
        return null;  // make the compiler happy
    }
    
    @Test
    public void checkAuthConfigBySearch() throws Exception {
        String ACCT_NAME_LOCALPART = TestLdap.makeAccountNameLocalPart("checkAuthConfigBySearch");
        Account acct = createAccount(ACCT_NAME_LOCALPART);
        String ACCT_DN = getAccountDN(acct);
        String PASSWORD = "test123";
        
        Map<String, Object> attrs = new HashMap<String, Object>();
        attrs.put(Provisioning.A_zimbraAuthMech, Provisioning.AM_LDAP);
        attrs.put(Provisioning.A_zimbraAuthLdapURL, "ldap://" + LC.zimbra_server_hostname.value() + ":389");
        attrs.put(Provisioning.A_zimbraAuthLdapSearchBindPassword, LC.zimbra_ldap_password.value());
        attrs.put(Provisioning.A_zimbraAuthLdapSearchBindDn, LC.zimbra_ldap_userdn.value());
        
        Provisioning.Result result;
        String expectedComputedSearchFilter;
        
        // %n = username with @ (or without, if no @ was specified)
        attrs.put(Provisioning.A_zimbraAuthLdapSearchFilter, "(zimbraMailDeliveryAddress=%n)");
        result = prov.checkAuthConfig(attrs, acct.getName(), PASSWORD);
        assertEquals(Check.STATUS_OK, result.getCode());
        expectedComputedSearchFilter = "(zimbraMailDeliveryAddress=" + acct.getName() + ")";
        assertEquals(expectedComputedSearchFilter, result.getComputedDn());
        
        // %u = username with @ removed
        attrs.put(Provisioning.A_zimbraAuthLdapSearchFilter, "(uid=%u)");
        result = prov.checkAuthConfig(attrs, acct.getName(), PASSWORD);
        assertEquals(Check.STATUS_OK, result.getCode());
        expectedComputedSearchFilter = "(uid=" + ACCT_NAME_LOCALPART + ")";
        assertEquals(expectedComputedSearchFilter.toLowerCase(), result.getComputedDn().toLowerCase());
        
        // %d = domain as foo.com
        attrs.put(Provisioning.A_zimbraAuthLdapSearchFilter, "(mail=%u@%d)");
        result = prov.checkAuthConfig(attrs, acct.getName(), PASSWORD);
        assertEquals(Check.STATUS_OK, result.getCode());
        expectedComputedSearchFilter = "(mail=" + acct.getName() + ")";
        assertEquals(expectedComputedSearchFilter, result.getComputedDn());
        
        // %D = domain as dc=foo,dc=com
        /* Nope: this is not valid, cannot search by DN
        attrs.put(Provisioning.A_zimbraAuthLdapSearchFilter, "(dn=%u,ou=people,%D)");
        result = prov.checkAuthConfig(attrs, acct.getName(), PASSWORD);
        assertEquals(Check.STATUS_OK, result.getCode());
        expectedComputedSearchFilter = "(dn=" + ACCT_DN + ")";
        assertEquals(expectedComputedSearchFilter, result.getComputedDn());
        */
        
        deleteAccount(acct);
    }
    
    @Test
    public void checkAuthConfigByBindDNTemplate() throws Exception {
        // TODO: doesn't work with special chars, even in the legacy implementation.
        // String ACCT_NAME_LOCALPART = TestLdap.makeAccountNameLocalPart("checkAuthConfigByBindDNTemplate");
        String ACCT_NAME_LOCALPART = "checkAuthConfigByBindDNTemplate";
        Account acct = createAccount(ACCT_NAME_LOCALPART);
        String ACCT_DN = getAccountDN(acct);
        String PASSWORD = "test123";
        
        Map<String, Object> attrs = new HashMap<String, Object>();
        attrs.put(Provisioning.A_zimbraAuthMech, Provisioning.AM_LDAP);
        attrs.put(Provisioning.A_zimbraAuthLdapURL, "ldap://" + LC.zimbra_server_hostname.value() + ":389");
        attrs.put(Provisioning.A_zimbraAuthLdapSearchBindPassword, LC.zimbra_ldap_password.value());
        attrs.put(Provisioning.A_zimbraAuthLdapSearchBindDn, LC.zimbra_ldap_userdn.value());
        
        Provisioning.Result result;
        
        // %D = domain as dc=foo,dc=com
        attrs.put(Provisioning.A_zimbraAuthLdapBindDn, "uid=%u,ou=people,%D");
        result = prov.checkAuthConfig(attrs, acct.getName(), PASSWORD);
        assertEquals(Check.STATUS_OK, result.getCode());
        // expectedComputedSearchFilter = "(zimbraMailDeliveryAddress=" + acct.getName() + ")";
        assertEquals(ACCT_DN, result.getComputedDn());
        
        deleteAccount(acct);
    }
    
    @Test
    public void checkAuthConfigFailures() throws Exception {
        String ACCT_NAME_LOCALPART = "checkAuthConfigFailures";
        Account acct = createAccount(ACCT_NAME_LOCALPART);
        String ACCT_DN = getAccountDN(acct);
        String PASSWORD = "test123";
        
        Provisioning.Result result;
        
        Map<String, Object> attrs = new HashMap<String, Object>();
        attrs.put(Provisioning.A_zimbraAuthMech, Provisioning.AM_LDAP);
        attrs.put(Provisioning.A_zimbraAuthLdapURL, "ldap://" + "bogus" + ":389");
        attrs.put(Provisioning.A_zimbraAuthLdapSearchBindPassword, LC.zimbra_ldap_password.value());
        attrs.put(Provisioning.A_zimbraAuthLdapSearchBindDn, LC.zimbra_ldap_userdn.value());
        attrs.put(Provisioning.A_zimbraAuthLdapSearchFilter, "(zimbraMailDeliveryAddress=%n)");
        result = prov.checkAuthConfig(attrs, acct.getName(), PASSWORD);
        assertEquals(Check.STATUS_UNKNOWN_HOST, result.getCode());
        
        attrs.clear();
        attrs.put(Provisioning.A_zimbraAuthMech, Provisioning.AM_LDAP);
        attrs.put(Provisioning.A_zimbraAuthLdapURL, "ldap://" + LC.zimbra_server_hostname.value() + ":38900");
        attrs.put(Provisioning.A_zimbraAuthLdapSearchBindPassword, LC.zimbra_ldap_password.value());
        attrs.put(Provisioning.A_zimbraAuthLdapSearchBindDn, LC.zimbra_ldap_userdn.value());
        attrs.put(Provisioning.A_zimbraAuthLdapSearchFilter, "(zimbraMailDeliveryAddress=%n)");
        result = prov.checkAuthConfig(attrs, acct.getName(), PASSWORD);
        assertEquals(Check.STATUS_CONNECTION_REFUSED, result.getCode());
        
        attrs.clear();
        attrs.put(Provisioning.A_zimbraAuthMech, Provisioning.AM_LDAP);
        attrs.put(Provisioning.A_zimbraAuthLdapURL, "ldap://" + LC.zimbra_server_hostname.value() + ":389");
        attrs.put(Provisioning.A_zimbraAuthLdapStartTlsEnabled, LdapConstants.LDAP_TRUE);
        attrs.put(Provisioning.A_zimbraAuthLdapSearchBindPassword, LC.zimbra_ldap_password.value());
        attrs.put(Provisioning.A_zimbraAuthLdapSearchBindDn, LC.zimbra_ldap_userdn.value());
        attrs.put(Provisioning.A_zimbraAuthLdapSearchFilter, "(zimbraMailDeliveryAddress=%n)");
        result = prov.checkAuthConfig(attrs, acct.getName(), PASSWORD);
        // assertEquals(Check.STATUS_SSL_HANDSHAKE_FAILURE, result.getCode());  // if TLS is enabled in sladp.conf
        assertEquals(Check.STATUS_COMMUNICATION_FAILURE, result.getCode());     // if TLS is not enabled in sladp.conf
        
        attrs.clear();
        attrs.put(Provisioning.A_zimbraAuthMech, Provisioning.AM_LDAP);
        attrs.put(Provisioning.A_zimbraAuthLdapURL, "ldap://" + LC.zimbra_server_hostname.value() + ":389");
        attrs.put(Provisioning.A_zimbraAuthLdapSearchBindPassword, "bogus");
        attrs.put(Provisioning.A_zimbraAuthLdapSearchBindDn, LC.zimbra_ldap_userdn.value());
        attrs.put(Provisioning.A_zimbraAuthLdapSearchFilter, "(zimbraMailDeliveryAddress=%n)");
        result = prov.checkAuthConfig(attrs, acct.getName(), PASSWORD);
        assertEquals(Check.STATUS_AUTH_FAILED, result.getCode());
        
        attrs.clear();
        attrs.put(Provisioning.A_zimbraAuthMech, Provisioning.AM_LDAP);
        attrs.put(Provisioning.A_zimbraAuthLdapURL, "ldap://" + LC.zimbra_server_hostname.value() + ":389");
        attrs.put(Provisioning.A_zimbraAuthLdapSearchBindPassword, LC.zimbra_ldap_password.value());
        attrs.put(Provisioning.A_zimbraAuthLdapSearchBindDn, LC.zimbra_ldap_userdn.value());
        attrs.put(Provisioning.A_zimbraAuthLdapSearchFilter, "(zimbraMailDeliveryAddress=%n)");
        result = prov.checkAuthConfig(attrs, acct.getName(), "bogus");
        assertEquals(Check.STATUS_AUTH_FAILED, result.getCode());
        
        // TODO, how to test this?
        // STATUS_AUTH_NOT_SUPPORTED
        
        attrs.clear();
        attrs.put(Provisioning.A_zimbraAuthMech, Provisioning.AM_LDAP);
        attrs.put(Provisioning.A_zimbraAuthLdapURL, "ldap://" + LC.zimbra_server_hostname.value() + ":389");
        attrs.put(Provisioning.A_zimbraAuthLdapSearchBindPassword, LC.zimbra_ldap_password.value());
        attrs.put(Provisioning.A_zimbraAuthLdapSearchBindDn, LC.zimbra_ldap_userdn.value());
        attrs.put(Provisioning.A_zimbraAuthLdapSearchBase, "dc=bogus");
        attrs.put(Provisioning.A_zimbraAuthLdapSearchFilter, "(zimbraMailDeliveryAddress=%n)");
        result = prov.checkAuthConfig(attrs, acct.getName(), PASSWORD);
        assertEquals(Check.STATUS_NAME_NOT_FOUND, result.getCode());
        
        attrs.clear();
        attrs.put(Provisioning.A_zimbraAuthMech, Provisioning.AM_LDAP);
        attrs.put(Provisioning.A_zimbraAuthLdapURL, "ldap://" + LC.zimbra_server_hostname.value() + ":389");
        attrs.put(Provisioning.A_zimbraAuthLdapSearchBindPassword, LC.zimbra_ldap_password.value());
        attrs.put(Provisioning.A_zimbraAuthLdapSearchBindDn, LC.zimbra_ldap_userdn.value());
        attrs.put(Provisioning.A_zimbraAuthLdapSearchFilter, "(zimbraMailDeliveryAddress=%n"); // missing the closing paren
        result = prov.checkAuthConfig(attrs, acct.getName(), PASSWORD);
        assertEquals(Check.STATUS_INVALID_SEARCH_FILTER, result.getCode());
        
        deleteAccount(acct);
    }
    
    @Test
    @Ignore // TODO
    public void externalLdapAuthByDNOnAccount() throws Exception {
        LdapProv ldapProv = (LdapProv) prov;
        
        String DOMAIN_NAME = TestLdap.makeDomainName(
                "externalLdapAuthByDNOnAccount.".toLowerCase() + baseDomainName());
        
        String authMech = Provisioning.AM_LDAP;
        Map<String, Object> domainAttrs = new HashMap<String, Object>();
        domainAttrs.put(Provisioning.A_zimbraAuthMech, authMech);
        domainAttrs.put(Provisioning.A_zimbraAuthMech, Provisioning.AM_LDAP);
        domainAttrs.put(Provisioning.A_zimbraAuthLdapURL, "ldap://" + LC.zimbra_server_hostname.value() + ":389");
        // domainAttrs.put(Provisioning.A_zimbraAuthLdapSearchFilter, "(zimbraMailDeliveryAddress=%n)");
        domainAttrs.put(Provisioning.A_zimbraAuthLdapSearchBindPassword, LC.zimbra_ldap_password.value());
        domainAttrs.put(Provisioning.A_zimbraAuthLdapSearchBindDn, LC.zimbra_ldap_userdn.value());

        /*
        if (startTLS)
            domainAttrs.put(Provisioning.A_zimbraAuthLdapStartTlsEnabled, "TRUE");
        */
        
        Domain domain = TestLdapProvDomain.createDomain(prov, DOMAIN_NAME, domainAttrs);
        
        String ACCT_NAME_LOCALPART = TestLdap.makeAccountNameLocalPart("externalLdapAuthByDNOnAccount");
        Account acct = TestLdapProvAccount.createAccount(prov, ACCT_NAME_LOCALPART, domain, null);
        
        String ACCT_DN = getAccountDN(acct);
        
        Map<String, Object> acctAttrs = new HashMap<String, Object>();
        acctAttrs.put(Provisioning.A_zimbraAuthLdapExternalDn, ACCT_DN);
        ldapProv.modifyAttrs(acct, acctAttrs);
        
        prov.authAccount(acct, "test123", AuthContext.Protocol.test);
              
    }
    
}
