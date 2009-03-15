/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2008, 2009 Zimbra, Inc.
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
package com.zimbra.qa.unittest;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.CliUtil;
import com.zimbra.common.util.ZimbraLog;

import com.zimbra.cs.account.AccessManager;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.DistributionList;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.Provisioning.GranteeBy;
import com.zimbra.cs.account.Provisioning.TargetBy;
import com.zimbra.cs.account.accesscontrol.GranteeType;
import com.zimbra.cs.account.accesscontrol.RightModifier;
import com.zimbra.cs.account.accesscontrol.RightUtil;
import com.zimbra.cs.account.accesscontrol.Right;
import com.zimbra.cs.account.accesscontrol.RightManager;
import com.zimbra.cs.account.accesscontrol.Rights.Admin;
import com.zimbra.cs.account.accesscontrol.Rights.User;
import com.zimbra.cs.account.accesscontrol.ACLAccessManager;
import com.zimbra.cs.account.accesscontrol.TargetType;
import com.zimbra.cs.account.accesscontrol.UserRight;
import com.zimbra.cs.account.accesscontrol.ZimbraACE;

public class TestACLGrantee extends TestACL {
    
    /*
     * ======================
     * ======================
     *     Grantee Tests
     * ======================
     * ======================
     */
    
    /*
     * test Zimbra user grantee
     */
    public void testGranteeUser() throws Exception {
        String testName = getName();
        
        /*
         * setup grantees
         */
        Account goodguy = mProv.createAccount(getEmailAddr(testName, "goodguy"), PASSWORD, null);
        Account badguy = mProv.createAccount(getEmailAddr(testName, "badguy"), PASSWORD, null);
        Account nobody = mProv.createAccount(getEmailAddr(testName, "nobody"), PASSWORD, null);
        
        Map<String, Object> attrs = new HashMap<String, Object>();
        attrs.put(Provisioning.A_zimbraIsDomainAdminAccount, Provisioning.TRUE);
        Account admin = mProv.createAccount(getEmailAddr(testName, "admin"), PASSWORD, attrs);
        
        /*
         * setup targets
         */
        Account target = mProv.createAccount(getEmailAddr(testName, "target"), PASSWORD, null);
        
        Set<ZimbraACE> aces = new HashSet<ZimbraACE>();
        aces.add(newUsrACE(goodguy, User.R_viewFreeBusy, ALLOW));
        aces.add(newUsrACE(goodguy, User.R_invite, ALLOW));
        aces.add(newUsrACE(badguy, User.R_viewFreeBusy, DENY));
        aces.add(newPubACE(User.R_viewFreeBusy, ALLOW));
        grantRight(TargetType.account, target, aces);
        
        // self should always be allowed
        verify(target, target, User.R_invite, ALLOW, null);
        
        // admin access using admin privileges
        if (AccessManager.getInstance() instanceof ACLAccessManager) // *all* decisions are based on ACL, admins don't have special rights 
            verify(admin, target, User.R_invite, AS_ADMIN, DENY, null);
        else
            verify(admin, target, User.R_invite, AS_ADMIN, ALLOW, null);
        
        // admin access NOT using admin privileges
        verify(admin, target, User.R_invite, AS_USER, DENY, null);
        
        TestViaGrant via;
        
        // specifically allowed
        via = new TestViaGrant(TargetType.account, target, GranteeType.GT_USER, goodguy.getName(), User.R_viewFreeBusy, POSITIVE);
        verify(goodguy, target, User.R_viewFreeBusy, ALLOW, via);
        
        via = new TestViaGrant(TargetType.account, target, GranteeType.GT_USER, goodguy.getName(), User.R_invite, POSITIVE);
        verify(goodguy, target, User.R_invite, ALLOW, via);
        
        // specifically denied
        via = new TestViaGrant(TargetType.account, target, GranteeType.GT_USER, badguy.getName(), User.R_viewFreeBusy, NEGATIVE);
        verify(badguy, target, User.R_viewFreeBusy, DENY, via);
        
        // not specifically allowed or denied, but PUB is allowed
        verify(nobody, target, User.R_viewFreeBusy, ALLOW, null);
        
        // not specifically allowed or denied
        verify(nobody, target, User.R_invite, DENY, null);
    }
    
    /*
     * test all(all authed Zimbra users) grantee
     */
    public void testGranteeAllAuthUser() throws Exception {
        String testName = getName();
        
        /*
         * setup grantees
         */
        Account guest = guestAccount("guest@external.com", "whocares");
        Account zimbra = mProv.createAccount(getEmailAddr(testName, "zimbra"), PASSWORD, null);
        
        /*
         * setup targets
         */
        Account target = mProv.createAccount(getEmailAddr(testName, "target"), PASSWORD, null);
        Set<ZimbraACE> aces = new HashSet<ZimbraACE>();
        aces.add(newAllACE(User.R_viewFreeBusy, ALLOW));
        grantRight(TargetType.account, target, aces);
        
        TestViaGrant via;
        
        // zimbra user should be allowed
        via = new AuthUserViaGrant(TargetType.account, target, User.R_viewFreeBusy, POSITIVE);
        verify(zimbra, target, User.R_viewFreeBusy, ALLOW, via);
        
        // external usr should not be allowed
        verify(guest, target, User.R_viewFreeBusy, DENY, null);
        
        // non granted right should honor callsite default
        verifyDefault(zimbra, target, User.R_invite);
        verifyDefault(guest, target, User.R_invite);
    }
    
    /*
     * test guest(with a non-Zimbra email address, and a password) grantee
     * Note: GST grantee is not yet implemented for now, the result will be the same as PUB grantee, which is supported)
     */
    public void testGranteeGuest() throws Exception {
        String testName = getName();
        
        /*
         * setup grantees
         */
        Account guest = guestAccount("guest@external.com", "whocares");
        
        /*
         * setup targets
         */
        Account target = mProv.createAccount(getEmailAddr(testName, "target"), PASSWORD, null);
        Set<ZimbraACE> aces = new HashSet<ZimbraACE>();
        aces.add(newPubACE(User.R_viewFreeBusy, ALLOW));
        grantRight(TargetType.account, target, aces);
        
        TestViaGrant via;
        
        // right allowed for PUB
        via = new PubViaGrant(TargetType.account, target, User.R_viewFreeBusy, POSITIVE);
        verify(guest, target, User.R_viewFreeBusy, ALLOW, via);
        
        // right not in ACL
        verifyDefault(guest, target, User.R_invite);
    }
    
    /*
     * test key(with an accesskey) grantee
     * Note: GST grantee is not yet implemented for now, the result will be the same as PUB grantee, which is supported)
     */
    public void testGranteeKey() throws Exception {
        String testName = getName();
        
        final String GRANTEE_NAME_ALLOWED_KEY_KEY_PROVIDED          = "allowedKeyProvided with space";
        final String KEY_FOR_GRANTEE_NAME_ALLOWED_KEY_KEY_PROVIDED  = "allowed my access key";
        final String GRANTEE_NAME_ALLOWED_KEY_KEY_GENERATED         = "allowedKeyGenerated@external.com";
              String KEY_FOR_GRANTEE_NAME_ALLOWED_KEY_KEY_GENERATED = null;  // will know after the grant
        
        final String GRANTEE_NAME_DENIED_KEY_KEY_PROVIDED           = "deniedKeyProvided with space";
        final String KEY_FOR_GRANTEE_NAME_DENIED_KEY_KEY_PROVIDED   = "denied my access key";
        final String GRANTEE_NAME_DENIED_KEY_KEY_GENERATED          = "deniedKeyGenerated@external.com";
              String KEY_FOR_GRANTEE_NAME_DENIED_KEY_KEY_GENERATED  = null;  // will know after the grant
        
        /*
         * setup targets
         */
        Account target = mProv.createAccount(getEmailAddr(testName, "target"), PASSWORD, null);
        Set<ZimbraACE> aces = new HashSet<ZimbraACE>();
        aces.add(newKeyACE(GRANTEE_NAME_ALLOWED_KEY_KEY_PROVIDED, KEY_FOR_GRANTEE_NAME_ALLOWED_KEY_KEY_PROVIDED, User.R_viewFreeBusy, ALLOW));
        aces.add(newKeyACE(GRANTEE_NAME_ALLOWED_KEY_KEY_GENERATED, null, User.R_viewFreeBusy, ALLOW));
        aces.add(newKeyACE(GRANTEE_NAME_DENIED_KEY_KEY_PROVIDED, KEY_FOR_GRANTEE_NAME_DENIED_KEY_KEY_PROVIDED, User.R_viewFreeBusy, DENY));
        aces.add(newKeyACE(GRANTEE_NAME_DENIED_KEY_KEY_GENERATED, null, User.R_viewFreeBusy, DENY));
        List<ZimbraACE> grantedAces = grantRight(TargetType.account, target, aces);
        
        /*
         * get generated accesskey to build our test accounts
         */
        for (ZimbraACE ace : grantedAces) {
            if (ace.getGrantee().equals(GRANTEE_NAME_ALLOWED_KEY_KEY_GENERATED))
                KEY_FOR_GRANTEE_NAME_ALLOWED_KEY_KEY_GENERATED = ace.getSecret();
            if (ace.getGrantee().equals(GRANTEE_NAME_DENIED_KEY_KEY_GENERATED))
                KEY_FOR_GRANTEE_NAME_DENIED_KEY_KEY_GENERATED = ace.getSecret();
        }
        
        /*
         * setup grantees
         */
        Account allowedKeyProvided = keyAccount(GRANTEE_NAME_ALLOWED_KEY_KEY_PROVIDED, KEY_FOR_GRANTEE_NAME_ALLOWED_KEY_KEY_PROVIDED);
        Account allowedKeyGenerated = keyAccount(GRANTEE_NAME_ALLOWED_KEY_KEY_GENERATED, KEY_FOR_GRANTEE_NAME_ALLOWED_KEY_KEY_GENERATED);
        Account allowedKeyGeneratedWrongAccessKey = keyAccount(GRANTEE_NAME_ALLOWED_KEY_KEY_GENERATED, KEY_FOR_GRANTEE_NAME_ALLOWED_KEY_KEY_GENERATED+"bogus");
        Account deniedKeyProvided = keyAccount(GRANTEE_NAME_DENIED_KEY_KEY_PROVIDED, KEY_FOR_GRANTEE_NAME_DENIED_KEY_KEY_PROVIDED);
        Account deniedKeyGenerated = keyAccount(GRANTEE_NAME_DENIED_KEY_KEY_GENERATED, KEY_FOR_GRANTEE_NAME_DENIED_KEY_KEY_GENERATED);
        
        TestViaGrant via;
        
        /*
         * test allowed
         */
        via = new TestViaGrant(TargetType.account, target, GranteeType.GT_KEY, allowedKeyProvided.getName(), User.R_viewFreeBusy, POSITIVE);
        verify(allowedKeyProvided, target, User.R_viewFreeBusy, ALLOW, via);
        
        via = new TestViaGrant(TargetType.account, target, GranteeType.GT_KEY, allowedKeyGenerated.getName(), User.R_viewFreeBusy, POSITIVE);
        verify(allowedKeyGenerated, target, User.R_viewFreeBusy, ALLOW, via);
        
        verify(allowedKeyGeneratedWrongAccessKey, target, User.R_viewFreeBusy, DENY, null);
        
        via = new TestViaGrant(TargetType.account, target, GranteeType.GT_KEY, deniedKeyProvided.getName(), User.R_viewFreeBusy, NEGATIVE);
        verify(deniedKeyProvided, target, User.R_viewFreeBusy, DENY, via);
        
        via = new TestViaGrant(TargetType.account, target, GranteeType.GT_KEY, deniedKeyGenerated.getName(), User.R_viewFreeBusy, NEGATIVE);
        verify(deniedKeyGenerated, target, User.R_viewFreeBusy, DENY, via);
        
        /*
         * add a pub grant
         */
        aces.add(newPubACE(User.R_viewFreeBusy, ALLOW));
        grantRight(TargetType.account, target, aces);
        
        /*
         * verify the effect
         */
        via = new TestViaGrant(TargetType.account, target, GranteeType.GT_KEY, allowedKeyProvided.getName(), User.R_viewFreeBusy, POSITIVE);
        verify(allowedKeyProvided, target, User.R_viewFreeBusy, ALLOW, via);  // still allowed
        
        via = new TestViaGrant(TargetType.account, target, GranteeType.GT_KEY, allowedKeyGenerated.getName(), User.R_viewFreeBusy, POSITIVE);
        verify(allowedKeyGenerated, target, User.R_viewFreeBusy, ALLOW, via); // still allowed
        
        via = new PubViaGrant(TargetType.account, target, User.R_viewFreeBusy, POSITIVE);
        verify(allowedKeyGeneratedWrongAccessKey, target, User.R_viewFreeBusy, ALLOW, via); // wrong key doesn't matter now, because it will be allowed via the pub grant
        
        via = new TestViaGrant(TargetType.account, target, GranteeType.GT_KEY, deniedKeyProvided.getName(), User.R_viewFreeBusy, NEGATIVE);
        verify(deniedKeyProvided, target, User.R_viewFreeBusy, DENY, via);  // specifically denied should still be denied
        
        via = new TestViaGrant(TargetType.account, target, GranteeType.GT_KEY, deniedKeyGenerated.getName(), User.R_viewFreeBusy, NEGATIVE);
        verify(deniedKeyGenerated, target, User.R_viewFreeBusy, DENY, via); // specifically denied should still be denied
        
        
        /*
         * revoke the denied grants
         */
        aces.clear();
        aces.add(newKeyACE(GRANTEE_NAME_DENIED_KEY_KEY_PROVIDED, "doesn't matter", User.R_viewFreeBusy, DENY));
        aces.add(newKeyACE(GRANTEE_NAME_DENIED_KEY_KEY_GENERATED, null, User.R_viewFreeBusy, DENY));
        revokeRight(TargetType.account, target, aces);
        
        /*
         * now everybody should be allowed
         */
        via = new TestViaGrant(TargetType.account, target, GranteeType.GT_KEY, allowedKeyProvided.getName(), User.R_viewFreeBusy, POSITIVE);
        verify(allowedKeyProvided, target, User.R_viewFreeBusy, ALLOW, via);
        
        via = new TestViaGrant(TargetType.account, target, GranteeType.GT_KEY, allowedKeyGenerated.getName(), User.R_viewFreeBusy, POSITIVE);
        verify(allowedKeyGenerated, target, User.R_viewFreeBusy, ALLOW, via);
        
        via = new PubViaGrant(TargetType.account, target, User.R_viewFreeBusy, POSITIVE);
        verify(allowedKeyGeneratedWrongAccessKey, target, User.R_viewFreeBusy, ALLOW, via);
        
        via = new PubViaGrant(TargetType.account, target, User.R_viewFreeBusy, POSITIVE);
        verify(deniedKeyProvided, target, User.R_viewFreeBusy, ALLOW, via);
        
        via = new PubViaGrant(TargetType.account, target, User.R_viewFreeBusy, POSITIVE);
        verify(deniedKeyGenerated, target, User.R_viewFreeBusy, ALLOW, via);

        // right not in ACL
        verifyDefault(allowedKeyGenerated, target, User.R_invite);
    }
    
    public void testGranteeKeyInvalidParams() throws Exception {
        String testName = getName();
        
        Account user1 = mProv.createAccount(getEmailAddr(testName, "user1"), PASSWORD, null);
        
        Account target = mProv.createAccount(getEmailAddr(testName, "target"), PASSWORD, null);
        Set<ZimbraACE> aces = new HashSet<ZimbraACE>();
        aces.add(newKeyACE("good", "abc", User.R_viewFreeBusy, ALLOW));
        aces.add(newKeyACE("bad:aaa:bbb", "xxx:yyy", User.R_viewFreeBusy, ALLOW));  // bad name/accesskey, containing ":"
        aces.add(newUsrACE(user1, User.R_viewFreeBusy, ALLOW));
        
        try {
            List<ZimbraACE> grantedAces = grantRight(TargetType.account, target, aces);
        } catch (ServiceException e) {
            if (e.getCode().equals(ServiceException.INVALID_REQUEST)) {
                // make sure nothing is granted, including the good ones
                if (RightUtil.getAllACEs(target) == null)
                    return; // good!
            }
        }
        fail();  
    }
    
    /*
     * test anonymous(without any identity) grantee
     */
    public void testGranteeAnon() throws Exception {
        String testName = getName();
        
        /*
         * setup grantees
         */
        Account anon = anonAccount();
        
        /*
         * setup targets
         */
        Account target = mProv.createAccount(getEmailAddr(testName, "target"), PASSWORD, null);
        Set<ZimbraACE> aces = new HashSet<ZimbraACE>();
        aces.add(newPubACE(User.R_viewFreeBusy, ALLOW));
        grantRight(TargetType.account, target, aces);
        
        TestViaGrant via;
        
        // anon grantee
        via = new PubViaGrant(TargetType.account, target, User.R_viewFreeBusy, POSITIVE);
        verify(anon, target, User.R_viewFreeBusy, ALLOW, via);
        
        verifyDefault(anon, target, User.R_invite);
        
        // null grantee
        via = new PubViaGrant(TargetType.account, target, User.R_viewFreeBusy, POSITIVE);
        verify(null, target, User.R_viewFreeBusy, ALLOW, via);
        
        verifyDefault(null, target, User.R_invite);
    }
    
    public void testGranteeGroupSimple() throws Exception {
        String testName = getName();
        
        /*
         * setup grantees
         */
        Account user1 = mProv.createAccount(getEmailAddr(testName, "user1"), PASSWORD, null);
        Account user2 = mProv.createAccount(getEmailAddr(testName, "user2"), PASSWORD, null);
        Account user3 = mProv.createAccount(getEmailAddr(testName, "user3"), PASSWORD, null);
        
        /*
         * setup groups
         */
        DistributionList groupA = mProv.createDistributionList(getEmailAddr(testName, "groupA"), new HashMap<String, Object>());
        mProv.addMembers(groupA, new String[] {user1.getName(), user2.getName()});
        
        /*
         * setup targets
         */
        Account target = mProv.createAccount(getEmailAddr("testGroup-target"), PASSWORD, null);
        Set<ZimbraACE> aces = new HashSet<ZimbraACE>();
        aces.add(newUsrACE(user1, User.R_viewFreeBusy, DENY));
        aces.add(newGrpACE(groupA, User.R_viewFreeBusy, ALLOW));
        grantRight(TargetType.account, target, aces);
        
        TestViaGrant via;
        
        // group member, but account is specifically denied
        via = new TestViaGrant(TargetType.account, target, GranteeType.GT_USER, user1.getName(), User.R_viewFreeBusy, NEGATIVE);
        verify(user1, target, User.R_viewFreeBusy, DENY, via);
        
        // group member
        via = new TestViaGrant(TargetType.account, target, GranteeType.GT_GROUP, groupA.getName(), User.R_viewFreeBusy, POSITIVE);
        verify(user2, target, User.R_viewFreeBusy, ALLOW, via);
        
        // not group member
        verify(user3, target, User.R_viewFreeBusy, DENY, null);
    }

    
    /*
     * test target with no ACL, should return caller default regardless who is the grantee and which right to ask for
     */
    public void testNoACL() throws Exception {
        String testName = getName();
        
        /*
         * setup grantees
         */
        Account zimbraUser = mProv.createAccount(getEmailAddr(testName, "user"), PASSWORD, null);
        Account guest = guestAccount("guest@external.com", "whocares");
        Account anon = anonAccount();
        
        /*
         * setup targets
         */
        Account target = mProv.createAccount(getEmailAddr(testName, "target"), PASSWORD, null);
        
        for (Right right : RightManager.getInstance().getAllUserRights().values()) {
            verifyDefault(zimbraUser, target, right);
            verifyDefault(guest, target, right);
            verifyDefault(anon, target, right);
        }
    }
    
    /*
     * test target with no ACL for the requested right but does have ACL for some other rights.
     * should return caller default for the right that does not have any ACL (bug 30241), 
     * should allow/disallow for the rights according to the ACE.
     */
    public void testDefaultWithNonEmptyACL() throws Exception {
        String testName = getName();
        
        /*
         * setup grantees
         */
        Account zimbraUser = mProv.createAccount(getEmailAddr(testName, "user"), PASSWORD, null);
        Account guest = guestAccount("guest@external.com", "whocares");
        Account anon = anonAccount();
        
        Right rightGranted = User.R_viewFreeBusy;
        Right rightNotGranted = User.R_invite;
        
        /*
         * setup targets
         */
        Account target = mProv.createAccount(getEmailAddr(testName, "target"), PASSWORD, null);
        Set<ZimbraACE> aces = new HashSet<ZimbraACE>();
        aces.add(newUsrACE(zimbraUser, rightGranted, ALLOW));
        grantRight(TargetType.account, target, aces);
        
        TestViaGrant via;
        
        // verify callsite default is honored for not granted right
        verifyDefault(zimbraUser, target, rightNotGranted);
        verifyDefault(guest, target, rightNotGranted);
        verifyDefault(anon, target, rightNotGranted);
        
        // verify granted right is properly processed
        via = new TestViaGrant(TargetType.account, target, GranteeType.GT_USER, zimbraUser.getName(), rightGranted, POSITIVE);
        verify(zimbraUser, target, rightGranted, ALLOW, via);
        
        verify(guest, target, rightGranted, DENY, null);
    }    
    
    public void testGrantConflict() throws Exception {
        String testName = getName();
        
        /*
         * setup grantees
         */
        Account grantee = mProv.createAccount(getEmailAddr(testName, "grantee"), PASSWORD, null);
        
        /*
         * setup targets
         */
        Account target = mProv.createAccount(getEmailAddr(testName, "target"), PASSWORD, null);
        Set<ZimbraACE> aces = new HashSet<ZimbraACE>();
        aces.add(newUsrACE(grantee, User.R_viewFreeBusy, ALLOW));
        aces.add(newUsrACE(grantee, User.R_viewFreeBusy, DENY));
        grantRight(TargetType.account, target, aces);
        
        // verify that only one is added 
        List<ZimbraACE> acl = RightUtil.getAllACEs(target);
        assertEquals(1, acl.size());
    }
    

    public void testGrantDuplicate() throws Exception {
        String testName = getName();
        
        /*
         * setup grantees
         */
        Account duplicate = mProv.createAccount(getEmailAddr(testName, "duplicate"), PASSWORD, null);
        
        /*
         * setup targets
         */
        Account target = mProv.createAccount(getEmailAddr(testName, "target"), PASSWORD, null);
        Set<ZimbraACE> aces = new HashSet<ZimbraACE>();
        aces.add(newUsrACE(duplicate, User.R_viewFreeBusy, DENY));
        aces.add(newUsrACE(duplicate, User.R_viewFreeBusy, DENY));
        grantRight(TargetType.account, target, aces);
        
        // verify that only one is added 
        List<ZimbraACE> acl = RightUtil.getAllACEs(target);
        assertEquals(1, acl.size());
    }
    
    public void testGrant() throws Exception {
        String testName = getName();
        
        /*
         * setup grantees
         */
        Account user = mProv.createAccount(getEmailAddr(testName, "user"), PASSWORD, null);
        DistributionList group = mProv.createDistributionList(getEmailAddr(testName, "group"), new HashMap<String, Object>());
        
        /*
         * setup targets
         */
        Account target = mProv.createAccount(getEmailAddr(testName, "target"), PASSWORD, null);
        
        // grant some permissions 
        Set<ZimbraACE> aces = new HashSet<ZimbraACE>();
        aces.add(newUsrACE(user, User.R_viewFreeBusy, DENY));
        aces.add(newGrpACE(group, User.R_viewFreeBusy, DENY));
        grantRight(TargetType.account, target, aces);
        
        // verify the grants were added
        List<ZimbraACE> acl = RightUtil.getAllACEs(target);
        assertEquals(2, acl.size());
        
        // grant some more
        aces.clear();
        aces.add(newPubACE(User.R_viewFreeBusy, ALLOW));
        grantRight(TargetType.account, target, aces);
        
        // verify the grants were added
        acl = RightUtil.getAllACEs(target);
        assertEquals(3, acl.size());
        
        // grant some more
        aces.clear();
        aces.add(newAllACE(User.R_viewFreeBusy, ALLOW));
        grantRight(TargetType.account, target, aces);
        
        // verify the grants were added
        acl = RightUtil.getAllACEs(target);
        assertEquals(4, acl.size());
        
    }
    
    public void testLoginAsRight() throws Exception {
        String testName = getName();
        
        /*
         * setup grantees
         */
        Account user = mProv.createAccount(getEmailAddr(testName, "user"), PASSWORD, null);
        
        /*
         * setup targets
         */
        Account target = mProv.createAccount(getEmailAddr(testName, "target"), PASSWORD, null);
        
        TestViaGrant via;
        
        // grant some permissions 
        Set<ZimbraACE> aces = new HashSet<ZimbraACE>();
        aces.add(newUsrACE(user, User.R_loginAs, ALLOW));
        grantRight(TargetType.account, target, aces);
        
        // verify the grant was added
        List<ZimbraACE> acl = RightUtil.getAllACEs(target);
        assertEquals(1, acl.size());
        via = new TestViaGrant(TargetType.account, target, GranteeType.GT_USER, user.getName(), User.R_loginAs, POSITIVE);
        verify(user, target, User.R_loginAs, ALLOW, via);
        
        // verify user can access target's account
        boolean canAccessAccount = mAM.canAccessAccount(user, target, false);
        assertTrue(canAccessAccount);
        
    }
    
    public void testRevoke() throws Exception {
        String testName = getName();
        
        /*
         * setup grantees
         */
        Account user = mProv.createAccount(getEmailAddr(testName, "user"), PASSWORD, null);
        
        /*
         * setup targets
         */
        Account target = mProv.createAccount(getEmailAddr(testName, "target"), PASSWORD, null);
        
        TestViaGrant via;
        
        // grant some permissions 
        Set<ZimbraACE> aces = new HashSet<ZimbraACE>();
        aces.add(newUsrACE(user, User.R_invite, ALLOW));
        aces.add(newUsrACE(user, User.R_viewFreeBusy, ALLOW));
        grantRight(TargetType.account, target, aces);
        
        // verify the grant was added
        List<ZimbraACE> acl = RightUtil.getAllACEs(target);
        assertEquals(2, acl.size());
        
        via = new TestViaGrant(TargetType.account, target, GranteeType.GT_USER, user.getName(), User.R_invite, POSITIVE);
        verify(user, target, User.R_invite, ALLOW, via);
        
        // revoke one right
        Set<ZimbraACE> acesToRevoke = new HashSet<ZimbraACE>();
        acesToRevoke.add(newUsrACE(user, User.R_invite, ALLOW));
        revokeRight(TargetType.account, target, acesToRevoke);
        
        // verify the grant was removed
        acl = RightUtil.getAllACEs(target);
        assertEquals(1, acl.size());
        verifyDefault(user, target, User.R_invite); // callsite default should now apply
        
        // verify the other right is still there
        via = new TestViaGrant(TargetType.account, target, GranteeType.GT_USER, user.getName(), User.R_viewFreeBusy, POSITIVE);
        verify(user, target, User.R_viewFreeBusy, ALLOW, via);
        
        // revoke the other right
        acesToRevoke = new HashSet<ZimbraACE>();
        acesToRevoke.add(newUsrACE(user, User.R_viewFreeBusy, ALLOW));
        revokeRight(TargetType.account, target, acesToRevoke);
        
        // verify all right are gone
        verifyDefault(user, target, User.R_invite);
        verifyDefault(user, target, User.R_viewFreeBusy);
        acl = RightUtil.getAllACEs(target);
        assertNull(acl);

        // revoke non-existing right, make sure we don't crash
        acesToRevoke = new HashSet<ZimbraACE>();
        acesToRevoke.add(newUsrACE(user, User.R_invite, ALLOW));
        revokeRight(TargetType.account, target, acesToRevoke);
    }
    
    public static void main(String[] args) throws Exception {
        CliUtil.toolSetup("INFO");
        // TestACL.logToConsole("DEBUG");
        
        TestUtil.runTest(TestACLGrantee.class);
    }
}
