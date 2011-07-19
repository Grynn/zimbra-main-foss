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

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.*;
import static org.junit.Assert.*;

import com.zimbra.common.service.ServiceException;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.NamedEntry;
import com.zimbra.cs.account.Domain;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.Provisioning.SearchOptions;
import com.zimbra.cs.account.ldap.LdapObjectClassHierarchy;
import com.zimbra.cs.account.ldap.LdapProv;
import com.zimbra.cs.account.AccountServiceException;

public class TestLdapProvMisc extends TestLdap {

    private static Provisioning prov;
    private static Domain domain;
    
    @BeforeClass
    public static void init() throws Exception {
        prov = Provisioning.getInstance();
        domain = TestLdapProvDomain.createDomain(prov, baseDomainName(), null);
    }
    
    @AfterClass
    public static void cleanup() throws Exception {
        String baseDomainName = baseDomainName();
        TestLdap.deleteEntireBranch(baseDomainName);
    }
    
    private static String baseDomainName() {
        return TestLdapProvMisc.class.getName().toLowerCase();
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
    
    @Test
    public void healthCheck() throws Exception {
        prov.healthCheck();
    }
    
    @Test
    public void getMostSpecificOC() throws Exception {
        LdapProv ldapProv = (LdapProv) prov;
        
        assertEquals("inetOrgPerson" , 
                LdapObjectClassHierarchy.getMostSpecificOC(ldapProv, 
                        new String[]{"zimbraAccount", "organizationalPerson", "person"}, "inetOrgPerson"));
        
        assertEquals("inetOrgPerson" , 
                LdapObjectClassHierarchy.getMostSpecificOC(ldapProv, 
                        new String[]{"inetOrgPerson"}, "organizationalPerson"));
        
        assertEquals("inetOrgPerson" , 
                LdapObjectClassHierarchy.getMostSpecificOC(ldapProv, 
                        new String[]{"organizationalPerson", "inetOrgPerson"}, "person"));
        
        assertEquals("bbb" , 
                LdapObjectClassHierarchy.getMostSpecificOC(ldapProv, 
                        new String[]{"inetOrgPerson"}, "bbb"));
        
        assertEquals("inetOrgPerson" , 
                LdapObjectClassHierarchy.getMostSpecificOC(ldapProv, 
                        new String[]{"aaa"}, "inetOrgPerson"));
        
        assertEquals("inetOrgPerson" , 
                LdapObjectClassHierarchy.getMostSpecificOC(ldapProv, 
                        new String[]{"aaa"}, "inetOrgPerson"));
        
        assertEquals("inetOrgPerson" , 
                LdapObjectClassHierarchy.getMostSpecificOC(ldapProv, 
                        new String[]{"person", "inetOrgPerson"}, "organizationalPerson"));
 
    }
    
    @Test
    public void getAttrsInOCs() throws Exception {
        LdapProv ldapProv = (LdapProv) prov;
        
        String[] ocs = { "amavisAccount" };
        Set<String> attrsInOCs = new HashSet<String>();
        ldapProv.getAttrsInOCs(ocs, attrsInOCs);
        
        assertEquals(36, attrsInOCs.size());
        assertTrue(attrsInOCs.contains("amavisBlacklistSender"));
        assertTrue(attrsInOCs.contains("amavisWhitelistSender"));
        
        /*
        for (String attr : attrsInOCs) {
            System.out.println(attr);
        }
        */
    }
    
    @Test
    @Ignore
    public void searchDirectory() throws Exception {
        int NUM_ACCTS = 10;
        
        for (int i = 0; i < NUM_ACCTS; i++) {
            Map<String, Object> attrs = new HashMap<String, Object>();
            attrs.put(Provisioning.A_displayName, "acct-" + i);
            
            String ACCT_LOCALPART = TestLdap.makeAccountNameLocalPart("acct-" + i);
            createAccount(ACCT_LOCALPART, attrs);
        }
        
        String filter = "(uid=*)";
        boolean sortAscending = true;
        String sortAttr = Provisioning.A_displayName;
        
        String[] returnAttrs = new String[] {
                Provisioning.A_displayName,
                Provisioning.A_zimbraId,
                Provisioning.A_zimbraMailHost,
                Provisioning.A_uid,
                Provisioning.A_zimbraAccountStatus,
                Provisioning.A_zimbraIsAdminAccount,
                Provisioning.A_zimbraMailStatus
        };
        
        SearchOptions searchOpts = new SearchOptions();
        searchOpts.setDomain(domain);
        searchOpts.setFlags(Provisioning.SD_ACCOUNT_FLAG);
        searchOpts.setMaxResults(0);  // unlimited
        searchOpts.setQuery(filter);
        searchOpts.setReturnAttrs(returnAttrs);
        searchOpts.setSortAscending(sortAscending);
        searchOpts.setSortAttr(sortAttr);
        
        List<NamedEntry> result = prov.searchDirectory(searchOpts);
        assertEquals(NUM_ACCTS, result.size());
        for (int i = 0; i < NUM_ACCTS; i++) {
            assertEquals("acct-" + i, result.get(i).getAttr(sortAttr));
        }
        
        searchOpts.setMaxResults(5);
        boolean caughtException = false;
        try {
            prov.searchDirectory(searchOpts);
        } catch (ServiceException e) {
            if (AccountServiceException.TOO_MANY_SEARCH_RESULTS.equals(e.getCode())) {
                caughtException = true;
            }
        }
        assertTrue(caughtException);
    }

    
}
