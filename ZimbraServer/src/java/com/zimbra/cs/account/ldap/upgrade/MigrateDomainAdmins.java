package com.zimbra.cs.account.ldap.upgrade;

import java.io.IOException;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import javax.naming.NamingEnumeration;
import javax.naming.NamingException;
import javax.naming.directory.Attributes;
import javax.naming.directory.BasicAttributes;
import javax.naming.directory.SearchControls;
import javax.naming.directory.SearchResult;

import com.zimbra.common.service.ServiceException;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.Cos;
import com.zimbra.cs.account.Domain;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.Provisioning.AccountBy;
import com.zimbra.cs.account.Provisioning.CosBy;
import com.zimbra.cs.account.Provisioning.GranteeBy;
import com.zimbra.cs.account.Provisioning.TargetBy;
import com.zimbra.cs.account.accesscontrol.GranteeType;
import com.zimbra.cs.account.accesscontrol.RightModifier;
import com.zimbra.cs.account.accesscontrol.TargetType;
import com.zimbra.cs.account.accesscontrol.generated.RightConsts;
import com.zimbra.cs.account.ldap.LdapDIT;
import com.zimbra.cs.account.ldap.LdapUtil;
import com.zimbra.cs.account.ldap.ZimbraLdapContext;
import com.zimbra.cs.account.ldap.upgrade.DomainObjectClassAmavisAccount.AddDomainObjectClassAmavisAccountVisitor;

public class MigrateDomainAdmins extends LdapUpgrade {
    
    private static String[] sAdminUICompForAllDomainAdmins = new String[] {
        "accountListView",
        "aliasListView",
        "DLListView",
        "resourceListView",
        "saveSearch",
        "accountsContactTab",
        "accountsMemberOfTab",
        "accountsAliasesTab",
        "accountsForwardingTab",
        "dlMembersTab",
        "dlAliasesTab",
        "dlMemberOfTab",
        "dlNotesOfTab",
        "resourcePropertiesTab",
        "resourceContactTab",
        
        "domainListView",
        "domainGeneralTab",
        
        "domainSkinsTab"
    };

    MigrateDomainAdmins(String bug, boolean verbose) throws ServiceException {
        super(bug, verbose);
    }
    
    @Override
    void doUpgrade() throws ServiceException {
        
        Set<String> domainAdminIds = getAllDomainAdmins();
        
        for (String domainAdminId : domainAdminIds) {
            Account domainAdmin = mProv.get(AccountBy.id, domainAdminId);
            if (domainAdmin == null)
                continue;
            
            Domain domain = mProv.getDomain(domainAdmin);
            if (domain == null)
                continue;
            
            try {
                System.out.println("Granting rights to " + domainAdmin.getName());
                grantRights(domain, domainAdmin);
            } catch (ServiceException e) {
                System.out.println("Caught exception:");
                e.printStackTrace();
            }
        }

    }
    
    private Set<String> getAllDomainAdmins() throws ServiceException {
        
        Set<String> domainAdminIds = new HashSet<String>();
        
        LdapDIT dit = mProv.getDIT();
        String returnAttrs[] = new String[] {Provisioning.A_objectClass,
                                             Provisioning.A_zimbraId,
                                             Provisioning.A_zimbraIsAdminAccount,
                                             Provisioning.A_zimbraIsDomainAdminAccount,
                                             Provisioning.A_zimbraIsSystemAdminAccount};
        
        String base = dit.mailBranchBaseDN();
        String query = "(&(objectclass=zimbraAccount)(zimbraIsDomainAdminAccount=TRUE))";
        
        int maxResults = 0; // no limit
        ZimbraLdapContext zlc = null; 
        
        try {
            zlc = new ZimbraLdapContext(true, false);  // use master, do not use connection pool
            
            SearchControls searchControls =
                new SearchControls(SearchControls.SUBTREE_SCOPE, maxResults, 0, returnAttrs, false, false);

            //Set the page size and initialize the cookie that we pass back in subsequent pages
            int pageSize = LdapUtil.adjustPageSize(maxResults, 1000);
            byte[] cookie = null;

            NamingEnumeration ne = null;
            
            try {
                do {
                    zlc.setPagedControl(pageSize, cookie, true);

                    ne = zlc.searchDir(base, query, searchControls);
                    while (ne != null && ne.hasMore()) {
                        SearchResult sr = (SearchResult) ne.nextElement();
                        String dn = sr.getNameInNamespace();

                        Attributes attrs = sr.getAttributes();
                        
                        String zimbraId = getZimbraIdIfDomainOnlyAdmin(attrs);
                        if (zimbraId != null)
                            domainAdminIds.add(zimbraId);
                    }
                    cookie = zlc.getCookie();
                } while (cookie != null);
            } finally {
                if (ne != null) ne.close();
            }
        } catch (NamingException e) {
            throw ServiceException.FAILURE("unable to list all objects", e);
        } catch (IOException e) {
            throw ServiceException.FAILURE("unable to list all objects", e);
        } finally {
            ZimbraLdapContext.closeContext(zlc);
        }
        
        return domainAdminIds;
    }
    
    String getZimbraIdIfDomainOnlyAdmin(Attributes attrs) throws NamingException {
        String isAdmin = LdapUtil.getAttrString(attrs, Provisioning.A_zimbraIsAdminAccount);
        String isDomainAdmin = LdapUtil.getAttrString(attrs, Provisioning.A_zimbraIsDomainAdminAccount);
        String isSystemAdmin = LdapUtil.getAttrString(attrs, Provisioning.A_zimbraIsSystemAdminAccount);
        
        if (LdapUtil.LDAP_TRUE.equals(isDomainAdmin) &&
            !LdapUtil.LDAP_TRUE.equals(isAdmin) &&
            !LdapUtil.LDAP_TRUE.equals(isSystemAdmin))
            return LdapUtil.getAttrString(attrs, Provisioning.A_zimbraId);
        else
            return null;
    }
    
    private void grantRights(Domain domain, Account domainAdmin) throws ServiceException {
        
        //
        // domain rights
        //
        mProv.grantRight(TargetType.domain.getCode(), TargetBy.id, domain.getId(), 
                GranteeType.GT_USER.getCode(), GranteeBy.id, domainAdmin.getId(), 
                RightConsts.RT_domainAdminRights, RightModifier.RM_CAN_DELEGATE);
        
        //
        // cos rights
        //
        grantCosRights(domain, domainAdmin);
        
        //
        // zimlet rights
        //
        mProv.grantRight(TargetType.global.getCode(), null, null, 
                GranteeType.GT_USER.getCode(), GranteeBy.id, domainAdmin.getId(), 
                RightConsts.RT_listZimlet, RightModifier.RM_CAN_DELEGATE);
        
        mProv.grantRight(TargetType.global.getCode(), null, null, 
                GranteeType.GT_USER.getCode(), GranteeBy.id, domainAdmin.getId(), 
                RightConsts.RT_getZimlet, RightModifier.RM_CAN_DELEGATE);
        
        //
        // admin UI components
        //
        setAdminUIComp(domainAdmin);
    }
    
    private void grantCosRights(Domain domain, Account domainAdmin) throws ServiceException {
        Set<String> allowedCoses = domain.getMultiAttrSet(Provisioning.A_zimbraDomainCOSMaxAccounts);
        
        for (String c : allowedCoses) {
            String[] parts = c.split(":");
            if (parts.length != 2)
                continue;  // bad value skip
            String cosId = parts[0];
            
            // sanity check
            Cos cos = mProv.get(CosBy.id, cosId);
            if (cos == null) {
                System.out.println("    cannot find cos " + cosId + ", skipping granting cos right to " + domainAdmin.getName());
                continue;
            }
            
            mProv.grantRight(TargetType.cos.getCode(), TargetBy.id, cosId, 
                    GranteeType.GT_USER.getCode(), GranteeBy.id, domainAdmin.getId(), 
                    RightConsts.RT_listCos, RightModifier.RM_CAN_DELEGATE);
            
            mProv.grantRight(TargetType.cos.getCode(), TargetBy.id, cosId, 
                    GranteeType.GT_USER.getCode(), GranteeBy.id, domainAdmin.getId(), 
                    RightConsts.RT_getCos, RightModifier.RM_CAN_DELEGATE);
            
            mProv.grantRight(TargetType.cos.getCode(), TargetBy.id, cosId, 
                    GranteeType.GT_USER.getCode(), GranteeBy.id, domainAdmin.getId(), 
                    RightConsts.RT_assignCos, RightModifier.RM_CAN_DELEGATE);
        }
        
    }
    
    private void setAdminUIComp(Account domainAdmin) throws ServiceException {
        
        String attrName = Provisioning.A_zimbraAdminConsoleUIComponents;
        
        /*
         * admin UI components should not be sensitive to feature enabling attrs
         * They should really be determined by rights.
         * 
         * Just add them all in sAdminUICompForAllDomainAdmins
         * 
        List<String> values = new ArrayList<String>(Arrays.asList(sAdminUICompForAllDomainAdmins));
        
        boolean canViewDomainInfo = 
            domainAdmin.getBooleanAttr(Provisioning.A_zimbraAdminConsoleCatchAllAddressEnabled, false) ||
            domainAdmin.getBooleanAttr(Provisioning.A_zimbraAdminConsoleSkinEnabled, false) ||
            domainAdmin.getBooleanAttr(Provisioning.A_zimbraAdminConsoleDNSCheckEnabled, false) ||
            domainAdmin.getBooleanAttr(Provisioning.A_zimbraAdminConsoleLDAPAuthEnabled, false);
            
        if (canViewDomainInfo) {
            values.add("domainListView");
            values.add("domainGeneralTab");
        }
        
        boolean canViewSkinTab = 
            domainAdmin.getBooleanAttr(Provisioning.A_zimbraAdminConsoleSkinEnabled, false);
        
        if (canViewSkinTab)
            values.add("domainSkinsTab");
        */
        
        Map<String, Object> attrs = new HashMap<String, Object>();
        attrs.put("+" + attrName, sAdminUICompForAllDomainAdmins);
        
        mProv.modifyAttrs(domainAdmin, attrs);
    }

}
