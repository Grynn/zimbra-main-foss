/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2005, 2006, 2007 Zimbra, Inc.
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
 * Created on Dec 20, 2004
 * @author Greg Solovyev
 * */
package com.zimbra.cs.service;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.AccountServiceException;
import com.zimbra.cs.account.AccountServiceException.AuthFailedServiceException;
import com.zimbra.cs.account.AuthToken;
import com.zimbra.cs.account.AuthTokenException;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.Provisioning.AccountBy;
import com.zimbra.cs.account.Server;
import com.zimbra.cs.account.auth.AuthContext;
import com.zimbra.cs.httpclient.URLUtil;
import com.zimbra.cs.servlet.ZimbraServlet;
import com.zimbra.soap.SoapEngine;

import javax.servlet.ServletException;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.net.URLEncoder;

public class PreAuthServlet extends ZimbraServlet {

    public static final String PARAM_PREAUTH = "preauth";
    public static final String PARAM_AUTHTOKEN = "authtoken";
    public static final String PARAM_ACCOUNT = "account";
    public static final String PARAM_ADMIN = "admin";
    public static final String PARAM_ISREDIRECT = "isredirect";
    public static final String PARAM_BY = "by";
    public static final String PARAM_REDIRECT_URL = "redirectURL";
    public static final String PARAM_TIMESTAMP = "timestamp";
    public static final String PARAM_EXPIRES = "expires";    
    
    private static final HashSet<String> sPreAuthParams = new HashSet<String>();
    
    static {
        sPreAuthParams.add(PARAM_PREAUTH);
        sPreAuthParams.add(PARAM_AUTHTOKEN);
        sPreAuthParams.add(PARAM_ACCOUNT);
        sPreAuthParams.add(PARAM_ADMIN);
        sPreAuthParams.add(PARAM_ISREDIRECT);
        sPreAuthParams.add(PARAM_BY);
        sPreAuthParams.add(PARAM_TIMESTAMP);
        sPreAuthParams.add(PARAM_EXPIRES);
    }

    public void init() throws ServletException {
        String name = getServletName();
        ZimbraLog.account.info("Servlet " + name + " starting up");
        super.init();
    }

    public void destroy() {
        String name = getServletName();
        ZimbraLog.account.info("Servlet " + name + " shutting down");
        super.destroy();
    }

    private String getRequiredParam(HttpServletRequest req, HttpServletResponse resp, String paramName) throws ServiceException {
        String param = req.getParameter(paramName);
        if (param == null) throw ServiceException.INVALID_REQUEST("missing required param: "+paramName, null);
        else return param;
    }

    private String getOptionalParam(HttpServletRequest req, String paramName, String def) {
        String param = req.getParameter(paramName);
        if (param == null) return def;
        else return param;
    }
    
    public void doGet(HttpServletRequest req, HttpServletResponse resp)
    throws ServletException, IOException
    {
        ZimbraLog.clearContext();
        try {
            boolean revPxyMode = URLUtil.reverseProxiedMode(Provisioning.getInstance().getLocalServer());
            Provisioning prov = Provisioning.getInstance();
            
            String isRedirect = getOptionalParam(req, PARAM_ISREDIRECT, "0");
            String rawAuthToken = getOptionalParam(req, PARAM_AUTHTOKEN, null);
            AuthToken authToken = null;
            if (rawAuthToken != null)
                authToken = AuthProvider.getAuthToken(rawAuthToken);

            if (isRedirect.equals("1") && rawAuthToken != null) {
                setCookieAndRedirect(req, resp, authToken);
            } else if (rawAuthToken != null) {
                // see if we need a redirect to the correct server
                boolean isAdmin = authToken != null && (authToken.isDomainAdmin() || authToken.isAdmin());
                Account acct = prov.get(AccountBy.id, authToken.getAccountId(), authToken);
                if (isAdmin || Provisioning.onLocalServer(acct) || revPxyMode) {
                    setCookieAndRedirect(req, resp, authToken);
                } else {
                    redirectToCorrectServer(req, resp, acct, rawAuthToken);
                }
            } else {
                String preAuth = getRequiredParam(req, resp, PARAM_PREAUTH);            
                String account = getRequiredParam(req, resp, PARAM_ACCOUNT);
                String accountBy = getOptionalParam(req, PARAM_BY, AccountBy.name.name());

                boolean admin = getOptionalParam(req, PARAM_ADMIN, "0").equals("1") && isAdminRequest(req);
                long timestamp = Long.parseLong(getRequiredParam(req, resp, PARAM_TIMESTAMP));
                long expires = Long.parseLong(getRequiredParam(req, resp, PARAM_EXPIRES));
            
                Account acct = null;
                acct = prov.get(AccountBy.fromString(accountBy), account, authToken);                            
            
                if (acct == null)
                    throw AuthFailedServiceException.AUTH_FAILED(account, account, "account not found");

                if (admin) {
                    boolean isDomainAdminAccount = acct.getBooleanAttr(Provisioning.A_zimbraIsDomainAdminAccount, false);
                    boolean isAdminAccount = acct.getBooleanAttr(Provisioning.A_zimbraIsAdminAccount, false);
                    boolean ok = (isDomainAdminAccount || isAdminAccount);
                    if (!ok)
                        throw ServiceException.PERM_DENIED("not an admin account");
                }

                Map<String, Object> authCtxt = new HashMap<String, Object>();
                authCtxt.put(AuthContext.AC_ORIGINATING_CLIENT_IP, getRemoteIp(req));
                authCtxt.put(AuthContext.AC_ACCOUNT_NAME_PASSEDIN, account);
                prov.preAuthAccount(acct, account, accountBy, timestamp, expires, preAuth, admin, authCtxt);
            
                AuthToken at;

                if (admin) {
                    at = (expires ==  0) ? AuthProvider.getAuthToken(acct, admin) : AuthProvider.getAuthToken(acct, expires, admin, null);
                } else {
                    at = (expires ==  0) ? AuthProvider.getAuthToken(acct) : AuthProvider.getAuthToken(acct, expires);
                }

                try {
                    rawAuthToken = at.getEncoded();
                    if (Provisioning.onLocalServer(acct) || revPxyMode || admin) {
                        setCookieAndRedirect(req, resp, at);
                    } else {
                        redirectToCorrectServer(req, resp, acct, rawAuthToken);
                    }
                } catch (AuthTokenException e) {
                    throw  ServiceException.FAILURE("unable to encode auth token", e);
                }
            }
        } catch (ServiceException e) {
            resp.sendError(HttpServletResponse.SC_BAD_REQUEST, e.getMessage());
        } catch (AuthTokenException e) {
            resp.sendError(HttpServletResponse.SC_BAD_REQUEST, e.getMessage());
        }
    }

    private void addNonPreAuthParams(HttpServletRequest req, StringBuilder sb, boolean first) {
        Enumeration names = req.getParameterNames();
        while (names.hasMoreElements()) {
            String name = (String) names.nextElement();
            if (sPreAuthParams.contains(name)) continue;
            String values[] = req.getParameterValues(name);
            if (values != null) {
                for (String value : values) {
                    if (first) {
                        first = false;
                    } else {
                        sb.append('&');
                    }
                    try {
                        sb.append(name).append("=").append(URLEncoder.encode(value, "utf-8"));
                    } catch (UnsupportedEncodingException e) {
                        // this should never happen...
                        sb.append(name).append("=").append(URLEncoder.encode(value));
                    }
                }
            }
        }
    }
    
    private void redirectToCorrectServer(HttpServletRequest req, HttpServletResponse resp, Account acct, String token) throws ServiceException, IOException {
        StringBuilder sb = new StringBuilder();
        Provisioning prov = Provisioning.getInstance();        
        sb.append(URLUtil.getServiceURL(prov.getServer(acct), req.getRequestURI(), true));
        sb.append('?').append(PARAM_ISREDIRECT).append('=').append('1');
        sb.append('&').append(PARAM_AUTHTOKEN).append('=').append(token);
        addNonPreAuthParams(req, sb, false);
        resp.sendRedirect(sb.toString());
    }

    private static final String DEFAULT_MAIL_URL = "/zimbra";
    private static final String DEFAULT_ADMIN_URL = "/zimbraAdmin";

    private void setCookieAndRedirect(HttpServletRequest req, HttpServletResponse resp, AuthToken authToken) throws IOException, ServiceException {
        boolean isAdmin = authToken.isDomainAdmin() || authToken.isAdmin();
        boolean secureCookie = req.getScheme().equals("https");
        authToken.encode(resp, isAdmin, secureCookie);

        String redirectURL = getOptionalParam(req, PARAM_REDIRECT_URL, null);
        if (redirectURL != null) {
            resp.sendRedirect(redirectURL);
        } else {
            StringBuilder sb = new StringBuilder();
            addNonPreAuthParams(req, sb, true);
            Provisioning prov = Provisioning.getInstance();
            Server server = prov.getLocalServer();
            String redirectUrl;

            if (isAdmin) {
                redirectUrl = server.getAttr(Provisioning.A_zimbraAdminURL, DEFAULT_ADMIN_URL);
            } else {
                redirectUrl = server.getAttr(Provisioning.A_zimbraMailURL, DEFAULT_MAIL_URL);
                // NB: do we really have to add the mail app to the end?
                if (redirectUrl.charAt(redirectUrl.length() - 1) == '/') {
                    redirectUrl += "mail";
                } else {
                    redirectUrl += "/mail";
                }
            }
            if (sb.length() > 0) {
                resp.sendRedirect(redirectUrl + "?" + sb.toString());
            } else {
                resp.sendRedirect(redirectUrl);
            }
        }
    }

    
}
