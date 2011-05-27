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

import java.util.HashSet;
import java.util.Set;

import org.junit.*;
import static org.junit.Assert.*;

import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.ldap.LdapDIT;
import com.zimbra.cs.account.ldap.LdapHelper;
import com.zimbra.cs.account.ldap.LdapProv;
import com.zimbra.cs.ldap.LdapException.LdapEntryNotFoundException;
import com.zimbra.cs.ldap.LdapException.LdapMultipleEntriesMatchedException;
import com.zimbra.cs.ldap.LdapException.LdapSizeLimitExceededException;
import com.zimbra.cs.ldap.LdapConstants;
import com.zimbra.cs.ldap.ZAttributes;
import com.zimbra.cs.ldap.ZLdapFilter;
import com.zimbra.cs.ldap.ZLdapFilterFactory;
import com.zimbra.cs.ldap.ZSearchControls;
import com.zimbra.cs.ldap.ZSearchResultEntry;
import com.zimbra.cs.ldap.ZSearchResultEnumeration;
import com.zimbra.cs.ldap.ZSearchScope;

public class TestLdapHelper extends TestLdap {
    private static TestLdap.TestConfig testConfig;
    private static LdapProv prov;
    private static LdapHelper ldapHelper;
    
    @BeforeClass
    public static void init() throws Exception {
        testConfig = getCurrentTestConfig();
        
        prov = ((LdapProv) Provisioning.getInstance());
        ldapHelper = prov.getHelper();
    }
    
    @Test
    public void searchForEntry() throws Exception {
        LdapDIT dit = prov.getDIT();
        String base = dit.configBranchBaseDN();
        ZLdapFilter filter = ZLdapFilterFactory.getInstance().fromFilterString("(cn=config)");
        
        ZSearchResultEntry sr = ldapHelper.searchForEntry(
                base, filter, null, false);
        assertNotNull(sr);
        assertEquals("cn=config,cn=zimbra", sr.getDN());
    }
    
    @Test
    public void searchForEntryMultipleMatchedEntries() throws Exception {
        LdapDIT dit = prov.getDIT();
        String base = dit.configBranchBaseDN();
        ZLdapFilter filter = ZLdapFilterFactory.getInstance().allAccounts();
        
        boolean caughtException = false;
        try {
            ZSearchResultEntry entry = ldapHelper.searchForEntry(
                    base, filter, null, false);
            assertNotNull(entry);
        } catch (LdapMultipleEntriesMatchedException e) {
            caughtException = true;
        }
        assertTrue(caughtException);
    }
    
    @Test
    public void searchForEntryNotFound() throws Exception {
        LdapDIT dit = prov.getDIT();
        String base = dit.configBranchBaseDN();
        ZLdapFilter filter = ZLdapFilterFactory.getInstance().fromFilterString("(cn=bogus)");
        
        ZSearchResultEntry sr = ldapHelper.searchForEntry(
                base, filter, null, false);
        assertNull(sr);
    }
    
    @Test
    public void getAttributes() throws Exception {
        String dn = prov.getDIT().configDN();
        ZAttributes attrs = ldapHelper.getAttributes(dn);
        assertEquals("config", attrs.getAttrString(Provisioning.A_cn));
    }
    
    @Test
    public void getAttributesEntryNotFound() throws Exception {
        String dn = prov.getDIT().configDN() + "-not";
        
        boolean caughtException = false;
        try {
            ZAttributes attrs = ldapHelper.getAttributes(dn);
            
        } catch (LdapEntryNotFoundException e) {
            caughtException = true;
        }
        assertTrue(caughtException);
    }
    
    @Test
    public void searchDir() throws Exception {
        LdapDIT dit = prov.getDIT();
        String base = dit.configBranchBaseDN();
        ZLdapFilter filter = ZLdapFilterFactory.getInstance().anyEntry();
        String returnAttrs[] = new String[]{"objectClass"};
        
        ZSearchControls searchControls = ZSearchControls.createSearchControls(
                ZSearchScope.SEARCH_SCOPE_ONELEVEL, 
                ZSearchControls.SIZE_UNLIMITED, returnAttrs);
        
        ZSearchResultEnumeration ne = ldapHelper.searchDir(base, filter, searchControls);
        
        Set<String> expected = new HashSet<String>();
        
        expected.add(dit.adminBaseDN());
        expected.add(dit.appAdminBaseDN());
        expected.add(dit.zimletBaseDN());
        expected.add(dit.cosBaseDN());
        expected.add(dit.serverBaseDN());
        expected.add(dit.xmppcomponentBaseDN());
        expected.add(dit.globalGrantDN());
        expected.add(dit.configDN());
        
        int numFound = 0;
        while (ne.hasMore()) {
            ZSearchResultEntry sr = ne.next();
            assertTrue(expected.contains(sr.getDN()));
            numFound++;
        }
        ne.close();
        
        assertEquals(expected.size(), numFound);
    }
    
    @Test
    public void searchDirNotFound() throws Exception {
        LdapDIT dit = prov.getDIT();
        String base = dit.configBranchBaseDN();
        ZLdapFilter filter = ZLdapFilterFactory.getInstance().allSignatures();
        String returnAttrs[] = new String[]{"objectClass"};
        
        ZSearchControls searchControls = ZSearchControls.createSearchControls(
                ZSearchScope.SEARCH_SCOPE_SUBTREE, 
                ZSearchControls.SIZE_UNLIMITED, returnAttrs);
        
        ZSearchResultEnumeration ne = 
            ldapHelper.searchDir(base, filter, searchControls);
        
        int numFound = 0;
        while (ne.hasMore()) {
            ZSearchResultEntry sr = ne.next();
            numFound++;
        }
        ne.close();
        
        assertEquals(0, numFound);
    }
    
    @Test
    public void searchDirSizeLimitExceeded() throws Exception {
        int SIZE_LIMIT = 5;
        
        String base = LdapConstants.DN_ROOT_DSE;
        ZLdapFilter filter = ZLdapFilterFactory.getInstance().anyEntry();
        String returnAttrs[] = new String[]{"objectClass"};
        
        ZSearchControls searchControls = ZSearchControls.createSearchControls(
                ZSearchScope.SEARCH_SCOPE_SUBTREE, 
                SIZE_LIMIT, returnAttrs);
        
        int numFound = 0;
        boolean caughtException = false;
        try {
            ZSearchResultEnumeration ne = ldapHelper.searchDir(base, filter, searchControls);
            while (ne.hasMore()) {
                ZSearchResultEntry sr = ne.next();
                numFound++;
            }
            ne.close();
            
        } catch (LdapSizeLimitExceededException e) {
            caughtException = true;
        }
        assertTrue(caughtException);
     
        // unboundid does not return entries if LdapSizeLimitExceededException
        // is thrown,  See commons on ZLdapContext.searchDir().
        if (testConfig != TestLdap.TestConfig.UBID) {
            assertEquals(SIZE_LIMIT, numFound);
        }
    }
}
