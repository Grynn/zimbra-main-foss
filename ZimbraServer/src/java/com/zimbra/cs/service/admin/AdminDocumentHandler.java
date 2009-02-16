/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2004, 2005, 2006, 2007 Zimbra, Inc.
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

/*
 * Created on Oct 4, 2004
 */
package com.zimbra.cs.service.admin;

import java.util.Map;

import com.zimbra.common.service.ServiceException;
import com.zimbra.cs.account.AccessManager;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.AuthToken;
import com.zimbra.cs.account.CalendarResource;
import com.zimbra.cs.account.Config;
import com.zimbra.cs.account.DistributionList;
import com.zimbra.cs.account.Domain;
import com.zimbra.cs.account.Entry;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.Server;
import com.zimbra.cs.account.AccessManager.ViaGrant;
import com.zimbra.cs.account.Provisioning.AccountBy;
import com.zimbra.cs.account.Provisioning.CalendarResourceBy;
import com.zimbra.cs.account.Provisioning.ServerBy;
import com.zimbra.cs.account.accesscontrol.AdminRight;
import com.zimbra.cs.account.accesscontrol.Right;
import com.zimbra.cs.account.accesscontrol.RoleAccessManager;
import com.zimbra.cs.mailbox.Mailbox;
import com.zimbra.cs.operation.BlockingOperation;
import com.zimbra.cs.operation.Requester;
import com.zimbra.cs.operation.Scheduler.Priority;
import com.zimbra.cs.session.Session;
import com.zimbra.soap.DocumentHandler;
import com.zimbra.common.soap.AdminConstants;
import com.zimbra.common.soap.Element;
import com.zimbra.common.util.EmailUtil;
import com.zimbra.soap.ZimbraSoapContext;

/** @author schemers */
public abstract class AdminDocumentHandler extends DocumentHandler {

    @Override
    public Object preHandle(Element request, Map<String, Object> context) throws ServiceException { 
        ZimbraSoapContext zsc = getZimbraSoapContext(context);
        Session session = getSession(zsc);
        Mailbox.OperationContext octxt = null;
        Mailbox mbox = null;

        if (zsc.getAuthToken() != null)
            octxt = getOperationContext(zsc, context);
        return BlockingOperation.schedule(request.getName(), session, octxt, mbox, Requester.ADMIN, getSchedulerPriority(), 1);   
    }

    @Override
    public void postHandle(Object userObj) { 
        ((BlockingOperation) userObj).finish();
    }

    protected Priority getSchedulerPriority() {
        return Priority.INTERACTIVE_HIGH;
    }


    @Override
    public boolean needsAuth(Map<String, Object> context) {
        return true;
    }

    @Override
    public boolean needsAdminAuth(Map<String, Object> context) {
        return true;
    }

    @Override
    public boolean isAdminCommand() {
        return true;
    }

    protected String[] getProxiedAccountPath()          { return null; }
    protected String[] getProxiedAccountElementPath()   { return null; }
    protected String[] getProxiedResourcePath()         { return null; }
    protected String[] getProxiedResourceElementPath()  { return null; }
    protected String[] getProxiedServerPath()           { return null; }
    
    protected Account getAccount(Provisioning prov, AccountBy accountBy, String value, AuthToken authToken) throws ServiceException {
        Account acct = null;
        
        // first try getting it from master if not in cache
        try {
            acct = prov.get(accountBy, value, true, authToken);
        } catch (ServiceException e) {
            // try the replica
            acct = prov.get(accountBy, value, false, authToken);
        }
        return acct;
    }
    
    private CalendarResource getCalendarResource(Provisioning prov, CalendarResourceBy crBy, String value, AuthToken authToken) throws ServiceException {
        CalendarResource cr = null;
        
        // first try getting it from master if not in cache
        try {
            cr = prov.get(crBy, value, true);
        } catch (ServiceException e) {
            // try the replica
            cr = prov.get(crBy, value, false);
        }
        return cr;
    }

    @Override
    protected Element proxyIfNecessary(Element request, Map<String, Object> context) throws ServiceException {
        // if we've explicitly been told to execute here, don't proxy
        ZimbraSoapContext zsc = getZimbraSoapContext(context);
        if (zsc.getProxyTarget() != null)
            return null;

        try {
            Provisioning prov = Provisioning.getInstance();

            // check whether we need to proxy to the home server of a target account
            String[] xpath = getProxiedAccountPath();
            String acctId = (xpath != null ? getXPath(request, xpath) : null);
            if (acctId != null) {
                Account acct = getAccount(prov, AccountBy.id, acctId, zsc.getAuthToken());
                if (acct != null && !Provisioning.onLocalServer(acct))
                    return proxyRequest(request, context, acctId);
            }

            xpath = getProxiedAccountElementPath();
            Element acctElt = (xpath != null ? getXPathElement(request, xpath) : null);
            if (acctElt != null) {
                Account acct = getAccount(prov, AccountBy.fromString(acctElt.getAttribute(AdminConstants.A_BY)), acctElt.getText(), zsc.getAuthToken());   
                if (acct != null && !Provisioning.onLocalServer(acct))
                    return proxyRequest(request, context, acct.getId());
            }

            // check whether we need to proxy to the home server of a target calendar resource
            xpath = getProxiedResourcePath();
            String rsrcId = (xpath != null ? getXPath(request, xpath) : null);
            if (rsrcId != null) {
                CalendarResource rsrc = getCalendarResource(prov, CalendarResourceBy.id, rsrcId, zsc.getAuthToken());
                if (rsrc != null) {
                    Server server = prov.get(ServerBy.name, rsrc.getAttr(Provisioning.A_zimbraMailHost));
                    if (server != null && !LOCAL_HOST_ID.equalsIgnoreCase(server.getId()))
                        return proxyRequest(request, context, server, zsc);
                }
            }
            
            xpath = getProxiedResourceElementPath();
            Element resourceElt = (xpath != null ? getXPathElement(request, xpath) : null);
            if (resourceElt != null) {
                CalendarResource rsrc = getCalendarResource(prov, CalendarResourceBy.fromString(resourceElt.getAttribute(AdminConstants.A_BY)), resourceElt.getText(), zsc.getAuthToken());
                if (rsrc != null) {
                    Server server = prov.get(ServerBy.name, rsrc.getAttr(Provisioning.A_zimbraMailHost));
                    if (server != null && !LOCAL_HOST_ID.equalsIgnoreCase(server.getId()))
                        return proxyRequest(request, context, server, zsc);
                }
            }
 
            // check whether we need to proxy to a target server
            xpath = getProxiedServerPath();
            String serverId = (xpath != null ? getXPath(request, xpath) : null);
            if (serverId != null) {
                Server server = prov.get(ServerBy.id, serverId);
                if (server != null && !LOCAL_HOST_ID.equalsIgnoreCase(server.getId()))
                    return proxyRequest(request, context, server, zsc);
            }

            return null;
        } catch (ServiceException e) {
            // if something went wrong proxying the request, just execute it locally
            if (ServiceException.PROXY_ERROR.equals(e.getCode()))
                return null;
            // but if it's a real error, it's a real error
            throw e;
        }
    }


    @Override
    public Session.Type getDefaultSessionType() {
        return Session.Type.ADMIN;
    }

    public boolean isDomainAdminOnly(ZimbraSoapContext zsc) {
        return AccessManager.getInstance().isDomainAdminOnly(zsc.getAuthToken());
    }

    public Domain getAuthTokenAccountDomain(ZimbraSoapContext zsc) throws ServiceException {
        return AccessManager.getInstance().getDomain(zsc.getAuthToken());
    }

    public boolean canAccessDomain(ZimbraSoapContext zsc, String domainName) throws ServiceException {
        return AccessManager.getInstance().canAccessDomain(zsc.getAuthToken(), domainName);
    }

    public boolean canAccessDomain(ZimbraSoapContext zsc, Domain domain) throws ServiceException {
        return canAccessDomain(zsc, domain.getName());
    }

    public boolean canModifyMailQuota(ZimbraSoapContext zsc, Account target, long mailQuota) throws ServiceException {
        return AccessManager.getInstance().canModifyMailQuota(zsc.getAuthToken(), target, mailQuota);
    }

    public boolean canAccessEmail(ZimbraSoapContext zsc, String email) throws ServiceException {
        String parts[] = EmailUtil.getLocalPartAndDomain(email);
        if (parts == null)
            throw ServiceException.INVALID_REQUEST("must be valid email address: "+email, null);
        return canAccessDomain(zsc, parts[1]);
    }
    
    public boolean canAccessCos(ZimbraSoapContext zsc, String cosId) throws ServiceException {
        return AccessManager.getInstance().canAccessCos(zsc.getAuthToken(), cosId);
    }
    
    
    public Domain getDomainFromEmailAddr(String email) throws ServiceException  {
        String parts[] = EmailUtil.getLocalPartAndDomain(email);
        if (parts == null)
            throw ServiceException.INVALID_REQUEST("must be valid email address: "+email, null);
        return Provisioning.getInstance().get(Provisioning.DomainBy.name, parts[1]);
    }
    
    /*
     * ======================================================================
     *     connector methods between domain based access manager and 
     *     pure ACL based access manager.
     *     
     *     Maybe we should just make them all AccessManager methods, instead 
     *     if doing the isDomainBasedAccessManager test here.  TODO
     *     
     *     TODO: make sure only the following methods are called from
     *           all admin handlers, not the legacy ones.
     * ======================================================================
     */
    /*
    private boolean canDo(AccessManager am, ZimbraSoapContext zsc, Entry target, Right rightNeeded) {
        return am.canDo(zsc.getAuthToken(), target, rightNeeded, true, false);
    }
    */
    
    private boolean canPerform(AccessManager am, ZimbraSoapContext zsc,
                               Entry target, Right rightNeeded, Map<String, Object> attrs) throws ServiceException {
        AuthToken authToken = zsc.getAuthToken();
        Account authedAcct = Provisioning.getInstance().get(Provisioning.AccountBy.id, authToken.getAccountId());
        if (authedAcct == null)
            throw ServiceException.PERM_DENIED("no admin account");
        
        return am.canPerform(authedAcct, target, rightNeeded, false, null, true, null);
    }
    
    private boolean isDomainBasedAccessManager(AccessManager am) {
        return (!(am instanceof RoleAccessManager));
    }
    
    /* 
     * -------------
     * account right
     * -------------
     */
    private boolean hasAccountRight(ZimbraSoapContext zsc, Account account, AdminRight rightNeeded, boolean throwIfNoRight) throws ServiceException {
        AccessManager am = AccessManager.getInstance();
        boolean hasRight;
        
        if (isDomainBasedAccessManager(am)) {
            hasRight = canAccessAccount(zsc, account);
            if (throwIfNoRight && !hasRight)
                throw ServiceException.PERM_DENIED("can not access account");
        } else {
            hasRight = canPerform(am, zsc, account, rightNeeded, null);
            if (throwIfNoRight && !hasRight)
                throw ServiceException.PERM_DENIED("need right " + rightNeeded.getName());
        }
        
        return hasRight;
    }
    
    protected void checkAccountRight(ZimbraSoapContext zsc, Account account, AdminRight rightNeeded) throws ServiceException {
        hasAccountRight(zsc, account, rightNeeded, true);
    }
    
        
    /* 
     * --------
     * DL right
     * --------
     */
    private boolean hasDistributionListRight(ZimbraSoapContext zsc, DistributionList dl, AdminRight rightNeeded, boolean throwIfNoRight) throws ServiceException {
        AccessManager am = AccessManager.getInstance();
        boolean hasRight;
        
        if (isDomainBasedAccessManager(am)) {
            hasRight = canAccessEmail(zsc, dl.getName());
            if (throwIfNoRight && !hasRight)
                throw ServiceException.PERM_DENIED("can not access dl");
        } else {
            hasRight = canPerform(am, zsc, dl, rightNeeded, null);
            if (throwIfNoRight && !hasRight)
                throw ServiceException.PERM_DENIED("need right " + rightNeeded.getName());
        }
        
        return hasRight;
    }

    protected void checkDistributionListRight(ZimbraSoapContext zsc, DistributionList dl, AdminRight rightNeeded) throws ServiceException {
        hasDistributionListRight(zsc, dl, rightNeeded, true);
    }
    
    /*
     * ------------
     * domain right
     * ------------
     */
    private boolean hasDomainRightByEmail(ZimbraSoapContext zsc, String email, AdminRight rightNeeded, boolean throwIfNoRight) throws ServiceException {
        AccessManager am = AccessManager.getInstance();
        boolean hasRight;
        
        if (isDomainBasedAccessManager(am)) {
            hasRight = canAccessEmail(zsc, email);
            if (throwIfNoRight && !hasRight)
                throw ServiceException.PERM_DENIED("can not access email: " + email);
        } else {
            Domain domain = getDomainFromEmailAddr(email);
            if (domain == null)
                throw ServiceException.PERM_DENIED("no such domain: " + email);
            
            hasRight = canPerform(am, zsc, domain, rightNeeded, null);
            if (throwIfNoRight && !hasRight)
                throw ServiceException.PERM_DENIED("need right " + rightNeeded.getName());
        }
        
        return hasRight;
    }
    
    protected void checkDomainRightByEmail(ZimbraSoapContext zsc, String email, AdminRight rightNeeded) throws ServiceException {
        hasDomainRightByEmail(zsc, email, rightNeeded, true);
    }

    private boolean hasDomainRight(ZimbraSoapContext zsc, Domain domain, AdminRight rightNeeded, boolean throwIfNoRight) throws ServiceException {
        AccessManager am = AccessManager.getInstance();
        boolean hasRight;
        
        if (isDomainBasedAccessManager(am)) {
            hasRight = (isDomainAdminOnly(zsc) && !canAccessDomain(zsc, domain));
            if (throwIfNoRight && !hasRight)
                throw ServiceException.PERM_DENIED("can not access domain");
        } else {
            hasRight = canPerform(am, zsc, domain, rightNeeded, null);
            if (throwIfNoRight && !hasRight)
                throw ServiceException.PERM_DENIED("need right " + rightNeeded.getName());
        }
        return hasRight;
    }
    
    protected void checkDomainRight(ZimbraSoapContext zsc, Domain domain, AdminRight rightNeeded) throws ServiceException {
        hasDomainRight(zsc, domain, rightNeeded, true);
    }
    
    /*
     * -------------------
     * global config right
     * -------------------
     */
    private boolean hasGlobalConfigRight(ZimbraSoapContext zsc, Config config, AdminRight rightNeeded, boolean throwIfNoRight) throws ServiceException {
        AccessManager am = AccessManager.getInstance();
        boolean hasRight;
        
        if (isDomainBasedAccessManager(am)) {
            hasRight =  !isDomainAdminOnly(zsc);
            if (throwIfNoRight && !hasRight)
                throw ServiceException.PERM_DENIED("can not access global config");
        } else {
            hasRight = canPerform(am, zsc, config, rightNeeded, null);
            if (throwIfNoRight && !hasRight)
                throw ServiceException.PERM_DENIED("need right " + rightNeeded.getName());
        }
        return hasRight;
    }
    
    protected void checkGlobalConfigRight(ZimbraSoapContext zsc, Config config, AdminRight rightNeeded) throws ServiceException {
        hasGlobalConfigRight(zsc, config, rightNeeded, true);
    }
}
