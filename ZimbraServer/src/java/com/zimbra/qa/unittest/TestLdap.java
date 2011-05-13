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

import java.util.ArrayList;
import java.util.List;

import java.io.IOException;

import static org.junit.Assert.*;
import org.junit.runner.JUnitCore;

import com.zimbra.common.localconfig.LC;
import com.zimbra.common.util.CliUtil;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.ldap.LdapClient;
import com.zimbra.cs.ldap.LdapServerType;
import com.zimbra.cs.ldap.ZLdapContext;
import com.zimbra.cs.ldap.ZLdapFilter;
import com.zimbra.cs.ldap.ZLdapFilterFactory;
import com.zimbra.cs.ldap.ZSearchControls;
import com.zimbra.cs.ldap.ZSearchResultEntry;
import com.zimbra.cs.ldap.ZSearchResultEnumeration;
import com.zimbra.cs.ldap.ZSearchScope;
import com.zimbra.cs.prov.ldap.LdapProv;
import com.zimbra.qa.unittest.LdapSuite.ConsoleListener;

public class TestLdap {
    
    // ensure assertion is enabled
    static {
        boolean assertsEnabled = false;
        assert assertsEnabled = true; // Intentional side effect!!!
        if (!assertsEnabled)
            throw new RuntimeException("Asserts must be enabled!!!");
    } 
    
    static void modifyLocalConfig(String key, String value) throws Exception {
        Process process = null;
        try {
            String command = "/opt/zimbra/bin/zmlocalconfig -e " + key + "=" + value;
            System.out.println(command);
            process = Runtime.getRuntime().exec(command);
        } catch (IOException e) {
            e.printStackTrace();
            throw e;
        } 
        
        int exitCode;
        try {
            exitCode = process.waitFor();
            assertEquals(0, exitCode);
        } catch (InterruptedException e) {
            e.printStackTrace();
            throw e;
        } 
        
    }

    enum TestConfig {
        UBID(com.zimbra.cs.ldap.unboundid.UBIDLdapClient.class, com.zimbra.cs.prov.ldap.LdapProvisioning.class),
        JNDI(com.zimbra.cs.ldap.jndi.JNDILdapClient.class, com.zimbra.cs.prov.ldap.LdapProvisioning.class),
        LEGACY(null, com.zimbra.cs.account.ldap.LdapProvisioning.class);
        
        private Class ldapClientClass;
        private Class ldapProvClass;
        
        private TestConfig(Class ldapClientClass, Class ldapProvClass) {
            this.ldapClientClass = ldapClientClass;
            this.ldapProvClass = ldapProvClass;
        }
        
        static void useConfig(TestConfig config) throws Exception {
            if (config.ldapClientClass != null) {
                modifyLocalConfig(LC.zimbra_class_ldap_client.key(), config.ldapClientClass.getCanonicalName());
            } else {
                // remove the key
                modifyLocalConfig(LC.zimbra_class_ldap_client.key(), "");
            }
            modifyLocalConfig(LC.zimbra_class_provisioning.key(), config.ldapProvClass.getCanonicalName());
            LC.reload();
        }
    }

    //
    // TODO: merge with LdapSuite
    //
    private static void runTests(JUnitCore junit, TestConfig testConfig) throws Exception {
        TestConfig.useConfig(testConfig);
        
        if (testConfig == TestConfig.UBID) {
            // junit.run(TestLdapSDK.class);
        }
        junit.run(TestLdapHelper.class);
        junit.run(TestLdapProvAccount.class);
        junit.run(TestLdapProvAlias.class);
        junit.run(TestLdapProvCos.class);
        junit.run(TestLdapProvDataSource.class);
        junit.run(TestLdapProvDistributionList.class);
        junit.run(TestLdapProvDIT.class);
        junit.run(TestLdapProvDomain.class);
        junit.run(TestLdapProvEntry.class);
        junit.run(TestLdapProvExternalLdapAuth.class);
        junit.run(TestLdapProvGal.class);
        junit.run(TestLdapProvGlobalConfig.class);
        junit.run(TestLdapProvGlobalGrant.class);
        junit.run(TestLdapProvIdentity.class);
        junit.run(TestLdapProvMimeType.class);
        junit.run(TestLdapProvMisc.class);
        junit.run(TestLdapProvModifyAttrs.class);
        junit.run(TestLdapProvServer.class);
        junit.run(TestLdapProvSignature.class);
        junit.run(TestLdapProvXMPPComponent.class);
        junit.run(TestLdapProvZimlet.class);
        junit.run(TestLdapUtil.class);
        junit.run(TestLdapZLdapContext.class);
        junit.run(TestLdapZLdapFilter.class);
        junit.run(TestLdapZMutableEntry.class);
    }
    
    /*
     * given a domain name like test.com, delete the entire tree under 
     * dc=com in LDAP
     */
    static void deleteEntireBranch(String domainName) throws Exception {
        String parts[] = domainName.split("\\.");
        String[] dns = ((LdapProv) Provisioning.getInstance()).getDIT().domainToDNs(parts);
        String topMostRDN = dns[dns.length-1];
        TestLdap.deleteEntireBranchByDN(topMostRDN);
    }
    
    static void deleteEntireBranchByDN(String dn) throws Exception {
        ZLdapContext zlc = null;
        
        try {
            zlc = LdapClient.getContext();
            deleteEntireBranch(zlc, dn);
        } finally {
            LdapClient.closeContext(zlc);
        }
    }
    
    private static void deleteEntireBranch(ZLdapContext zlc, String dn) throws Exception {
        
        if (isLeaf(zlc, dn)) {
            deleteEntry(dn);
            return;
        }
        
        List<String> childrenDNs = getDirectChildrenDNs(zlc, dn);
        for (String childDN : childrenDNs) {
            deleteEntireBranch(zlc, childDN);
        }
        deleteEntry(dn);
    }
    
    private static void deleteEntry(String dn) throws Exception {
        ZLdapContext zlc = null;
        try {
            zlc = LdapClient.getContext(LdapServerType.MASTER);
            zlc.unbindEntry(dn);
        } finally {
            LdapClient.closeContext(zlc);
        }
    }
    
    private static boolean isLeaf(ZLdapContext zlc, String dn) throws Exception {
        return getDirectChildrenDNs(zlc, dn).size() == 0;
    }
    
    private static List<String> getDirectChildrenDNs(ZLdapContext zlc, String dn) throws Exception {
        final List<String> childrenDNs = new ArrayList<String>();

        ZLdapFilter filter = ZLdapFilterFactory.getInstance().anyEntry();
        
        ZSearchControls searchControls = ZSearchControls.createSearchControls(
                ZSearchScope.SEARCH_SCOPE_ONELEVEL, 
                ZSearchControls.SIZE_UNLIMITED, new String[]{"objectClass"});
        
        ZSearchResultEnumeration sr = zlc.searchDir(dn, filter, searchControls);
        while (sr.hasMore()) {
            ZSearchResultEntry entry = sr.next();
            childrenDNs.add(entry.getDN());
        }
        sr.close();
        
        return childrenDNs;
    }
    
    /**
     * Given a name (which is to be turn into a DN), mix in chars 
     * defined in rfc2253.txt that need to be escaped in RDN value.
     * 
     * http://www.ietf.org/rfc/rfc2253.txt?number=2253
     * 
     * - a space or "#" character occurring at the beginning of the
     *   string
     *
     * - a space character occurring at the end of the string
     *
     * - one of the characters ",", "+", """, "\", "<", ">" or ";"
     * 
     * Implementations MAY escape other characters.
     *
     * If a character to be escaped is one of the list shown above, then it
     * is prefixed by a backslash ('\' ASCII 92).
     *
     * Otherwise the character to be escaped is replaced by a backslash and
     * two hex digits, which form a single byte in the code of the
     * character.
     * 
     * @param name
     * @return
     */    
    private static String makeRFC2253Name(String name, boolean wantTrailingBlank) {
        String LEADING_CHARS = "#";
        String TRAILING_CHARS = " ";
        String BACKSLASH_ESCAPED_CHARS = "# ,+\"\\<>;";
        String UNICODE_CHARS = "\u4e2d\u6587";
        
        if (wantTrailingBlank) {
            return LEADING_CHARS + BACKSLASH_ESCAPED_CHARS + DOT_ATOM_CHARS + UNICODE_CHARS + "---" + name + TRAILING_CHARS;
        } else {
            return LEADING_CHARS + BACKSLASH_ESCAPED_CHARS + DOT_ATOM_CHARS + UNICODE_CHARS + "---" + name;
        }
    }
    
    // RFC 2822
    private static final String ATOM_CHARS = "!#$%&'*+-/=?^_`{|}~";   
    private static final String DOT_ATOM_CHARS = "." + ATOM_CHARS;
    
    private static String makeRFC2253NameEmailLocalPart(String name) {
        String LEADING_CHAR = "#";
        return LEADING_CHAR + DOT_ATOM_CHARS + "---" + name;
    }
    
    private static String makeRFC2253NameDomainName(String name) {
        String UNICODE_CHARS = "\u4e2d\u6587";
        
        // hmm, javamail does not like any of the ATOM_CHARS 
        return /* ATOM_CHARS + */ UNICODE_CHARS + "---" + name;
    }

    static String makeAccountNameLocalPart(String localPart) {
        return makeRFC2253NameEmailLocalPart(localPart);
    }

    static String makeAliasNameLocalPart(String localPart) {
        return makeRFC2253NameEmailLocalPart(localPart);
    }

    static String makeCosName(String name) {
        return makeRFC2253Name(name, false);
    }

    static String makeDataSourceName(String name) {
        // historically we allow trailing blank in data source name
        // should probably make it consistent across the board.
        return makeRFC2253Name(name, true);
    }
    
    static String makeDLNameLocalPart(String localPart) {
        return makeRFC2253NameEmailLocalPart(localPart);
    }
    
    static String makeDomainName(String name) {
        return TestLdap.makeRFC2253NameDomainName(name);
    }
    
    static String makeIdentityName(String name) {
        // historically we allow trailing blank in identity name
        // should probably make it consistent across the board.
        return makeRFC2253Name(name, true);
    }
    
    static String makeServerName(String name) {
        return makeRFC2253Name(name, false);
    }
    
    static String makeSignatureName(String name) {
        return makeRFC2253Name(name, false);
    }
    
    static String makeXMPPName(String name) {
        return makeRFC2253Name(name, false);
    }
    
    static String makeZimletName(String name) {
        return makeRFC2253Name(name, false);
    }
    
    // so tests can be called directly, without running from TestLdap.
    public static TestConfig manualInit() throws Exception {
        
        CliUtil.toolSetup();
        
        TestConfig testConfig = TestConfig.UBID;
        // TestConfig testConfig = TestConfig.JNDI;
        // TestConfig testConfig = TestConfig.LEGACY;
        
        TestConfig.useConfig(testConfig);
        return testConfig;
    }
    
    /*
     * zmjava -ea com.zimbra.qa.unittest.TestLdap > ~/temp/out.txt
     */
    public static void main(String[] args) throws Exception {
        CliUtil.toolSetup();
        
        JUnitCore junit = new JUnitCore();
        junit.addListener(new ConsoleListener());
        
        // TestConfig.useConfig(TestConfig.LEGACY);
        
        runTests(junit, TestConfig.UBID);
        // runTests(junit, TestConfig.JNDI);
        // runTests(junit, TestConfig.LEGACY);
        
        System.out.println();
        System.out.println("=== Finished ===");
    }

}
