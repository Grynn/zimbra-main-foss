/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2006, 2007, 2008, 2009, 2010, 2011 Zimbra, Inc.
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

package com.zimbra.cs.account.soap;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import java.util.TreeMap;

import com.google.common.collect.Lists;
import com.zimbra.common.auth.ZAuthToken;
import com.zimbra.common.localconfig.LC;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.AccountConstants;
import com.zimbra.common.soap.AdminConstants;
import com.zimbra.common.soap.Element;
import com.zimbra.common.soap.Element.XMLElement;
import com.zimbra.common.soap.MailConstants;
import com.zimbra.common.soap.SoapFaultException;
import com.zimbra.common.soap.SoapHttpTransport;
import com.zimbra.common.soap.SoapHttpTransport.HttpDebugListener;
import com.zimbra.common.soap.SoapTransport;
import com.zimbra.common.soap.SoapTransport.DebugListener;
import com.zimbra.common.util.AccountLogger;
import com.zimbra.common.util.CliUtil;
import com.zimbra.common.util.Log.Level;
import com.zimbra.common.util.StringUtil;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.common.zclient.ZClientException;
import com.zimbra.cs.account.*;
import com.zimbra.cs.account.NamedEntry.Visitor;
import com.zimbra.cs.account.accesscontrol.Right;
import com.zimbra.cs.account.accesscontrol.RightCommand;
import com.zimbra.cs.account.accesscontrol.RightModifier;
import com.zimbra.cs.account.accesscontrol.ViaGrantImpl;
import com.zimbra.cs.account.auth.AuthContext;
import com.zimbra.cs.httpclient.URLUtil;
import com.zimbra.cs.mime.MimeTypeInfo;
import com.zimbra.soap.JaxbUtil;
import com.zimbra.soap.account.message.ChangePasswordRequest;
import com.zimbra.soap.admin.message.*;
import com.zimbra.soap.admin.type.AccountInfo;
import com.zimbra.soap.admin.type.AccountLoggerInfo;
import com.zimbra.soap.admin.type.AccountQuotaInfo;
import com.zimbra.soap.admin.type.AccountSelector;
import com.zimbra.soap.admin.type.AliasInfo;
import com.zimbra.soap.admin.type.Attr;
import com.zimbra.soap.admin.type.CacheEntrySelector;
import com.zimbra.soap.admin.type.CacheSelector;
import com.zimbra.soap.admin.type.CalendarResourceInfo;
import com.zimbra.soap.admin.type.CalendarResourceSelector;
import com.zimbra.soap.admin.type.CmdRightsInfo;
import com.zimbra.soap.admin.type.CosCountInfo;
import com.zimbra.soap.admin.type.CosInfo;
import com.zimbra.soap.admin.type.CosSelector;
import com.zimbra.soap.admin.type.DLInfo;
import com.zimbra.soap.admin.type.DistributionListInfo;
import com.zimbra.soap.admin.type.DistributionListMembershipInfo;
import com.zimbra.soap.admin.type.DistributionListSelector;
import com.zimbra.soap.admin.type.DomainSelector;
import com.zimbra.soap.admin.type.DomainInfo;
import com.zimbra.soap.admin.type.EffectiveRightsTarget;
import com.zimbra.soap.admin.type.EffectiveRightsTargetSelector;
import com.zimbra.soap.admin.type.GranteeInfo;
import com.zimbra.soap.admin.type.GranteeSelector;
import com.zimbra.soap.admin.type.LoggerInfo;
import com.zimbra.soap.admin.type.MailboxByAccountIdSelector;
import com.zimbra.soap.admin.type.MailboxWithMailboxId;
import com.zimbra.soap.admin.type.NamedElement;
import com.zimbra.soap.admin.type.PackageRightsInfo;
import com.zimbra.soap.admin.type.PackageSelector;
import com.zimbra.soap.admin.type.PublishFolderInfo;
import com.zimbra.soap.admin.type.ReindexMailboxInfo;
import com.zimbra.soap.admin.type.ReindexProgressInfo;
import com.zimbra.soap.admin.type.RightInfo;
import com.zimbra.soap.admin.type.ServerInfo;
import com.zimbra.soap.admin.type.ServerSelector;
import com.zimbra.soap.admin.type.ShareInfoSelector;

public class SoapProvisioning extends Provisioning {

    public static class Options {
        private String mAccount;
        private AccountBy mAccountBy = AccountBy.name;
        private String mPassword;
        private ZAuthToken mAuthToken;
        private String mUri;
        private int mTimeout = -1;
        private int mRetryCount = -1;
        private SoapTransport.DebugListener mDebugListener;
        private boolean mLocalConfigAuth;

        public Options() {
        }

        public Options(String account, AccountBy accountBy, String password, String uri) {
            mAccount = account;
            mAccountBy = accountBy;
            mPassword = password;
            mUri = uri;
        }

        // AP-TODO-7: retire
        public Options(String authToken, String uri) {
            mAuthToken = new ZAuthToken(null, authToken, null);
            mUri = uri;
        }

        public Options(ZAuthToken authToken, String uri) {
            mAuthToken = authToken;
            mUri = uri;
        }

        public String getAccount() { return mAccount; }
        public void setAccount(String account) { mAccount = account; }

        public AccountBy getAccountBy() { return mAccountBy; }
        public void setAccountBy(AccountBy accountBy) { mAccountBy = accountBy; }

        public String getPassword() { return mPassword; }
        public void setPassword(String password) { mPassword = password; }

        public ZAuthToken getAuthToken() { return mAuthToken; }
        public void setAuthToken(ZAuthToken authToken) { mAuthToken = authToken; }

        // AP-TODO-8: retire
        public void setAuthToken(String authToken) { mAuthToken = new ZAuthToken(null, authToken, null); }

        public String getUri() { return mUri; }
        public void setUri(String uri) { mUri = uri; }

        public int getTimeout() { return mTimeout; }
        public void setTimeout(int timeout) { mTimeout = timeout; }

        public int getRetryCount() { return mRetryCount; }
        public void setRetryCount(int retryCount) { mRetryCount = retryCount; }

        public SoapTransport.DebugListener getDebugListener() { return mDebugListener; }
        public void setDebugListener(SoapTransport.DebugListener liistener) { mDebugListener = liistener; }

        public boolean getLocalConfigAuth() { return mLocalConfigAuth; }
        public void setLocalConfigAuth(boolean auth) { mLocalConfigAuth = auth; }
    }


    private int mTimeout = -1;
    private int mRetryCount;
    private SoapHttpTransport mTransport;
    private ZAuthToken mAuthToken;
    private long mAuthTokenLifetime;
    private long mAuthTokenExpiration;
    private DebugListener mDebugListener;
    private HttpDebugListener mHttpDebugListener;

    public SoapProvisioning() {

    }

    public SoapProvisioning(Options options) throws ServiceException {
        mTimeout = options.getTimeout();
        mRetryCount = options.getRetryCount();
        mDebugListener = options.getDebugListener();
        mAuthToken = options.getAuthToken();
        if (options.getUri() == null) options.setUri(getLocalConfigURI());
        soapSetURI(options.getUri());

        if (options.getLocalConfigAuth()) {
            soapZimbraAdminAuthenticate();
        } else if (mAuthToken != null) {
            soapAdminAuthenticate(mAuthToken);
        } else if (options.getAccount() != null && options.getPassword() != null) {
            // TODO: Can JAXB be used for AuthRequest?  Requires AuthToken to
            //       be properly supported and that might require 3rd party work?
            XMLElement req = new XMLElement(AdminConstants.AUTH_REQUEST);
            switch(options.getAccountBy()) {
                case name:
                    req.addElement(AdminConstants.E_NAME).setText(options.getAccount());
                    break;
                default:
                    Element account = req.addElement(AccountConstants.E_ACCOUNT);
                    account.addAttribute(AccountConstants.A_BY, options.getAccountBy().name());
                    account.setText(options.getAccount());
                    break;
            }
            req.addElement(AdminConstants.E_PASSWORD).setText(options.getPassword());
            Element response = invoke(req);
            mAuthToken = new ZAuthToken(response.getElement(AdminConstants.E_AUTH_TOKEN), true);
            mAuthTokenLifetime = response.getAttributeLong(AdminConstants.E_LIFETIME);
            mAuthTokenExpiration = System.currentTimeMillis() + mAuthTokenLifetime;
            mTransport.setAuthToken(mAuthToken);
        } else {
            throw ZClientException.CLIENT_ERROR("no valid authentication method selected", null);
        }
    }

    @Override
    public String toString() {
        return String.format("[%s %s]", getClass().getName(), mTransport == null ? "" : mTransport.getURI());
    }

    /**
     * @param uri URI of server we want to talk to
     */
    public void soapSetURI(String uri) {
        if (mTransport != null) mTransport.shutdown();
        mTransport = new SoapHttpTransport(uri);
        if (mTimeout >= 0)
            mTransport.setTimeout(mTimeout);
        if (mRetryCount > 0)
            mTransport.setRetryCount(mRetryCount);
        if (mAuthToken != null)
            mTransport.setAuthToken(mAuthToken);
        if (mDebugListener != null)
            mTransport.setDebugListener(mDebugListener);
    }

    public static String getLocalConfigURI() {
        String server = LC.zimbra_zmprov_default_soap_server.value();
        int port = LC.zimbra_admin_service_port.intValue();
        return LC.zimbra_admin_service_scheme.value()+server+":"+port+ AdminConstants.ADMIN_SERVICE_URI;
    }

    /**
     * Construct and return a SoapProvisioning instance using values from localconfig:
     * zimbra_zmprov_default_soap_server, zimbra_admin_service_port, zimbra_admin_service_scheme
     * and calling soapZimbraAdminAuthenticate.
     * @return new SoapProvisionig instance
     *
     * @throws ServiceException
     */
    public static SoapProvisioning getAdminInstance() throws ServiceException {
        Options opts = new Options();
        opts.setLocalConfigAuth(true);
        return new SoapProvisioning(opts);
    }

    public String soapGetURI() {
        return mTransport.getURI();
    }

    public void soapSetTransportTimeout(int timeout) {
        mTimeout = timeout;
        if (mTransport != null && timeout >= 0)
            mTransport.setTimeout(timeout);
    }

    public void soapSetTransportRetryCount(int retryCount) {
        mRetryCount = retryCount;
        if (mTransport != null && retryCount >= 0)
            mTransport.setRetryCount(retryCount);
    }

    public void soapSetTransportDebugListener(DebugListener listener) {
        mDebugListener = listener;
        if (mTransport != null)
            mTransport.setDebugListener(mDebugListener);
    }

    public DebugListener soapGetTransportDebugListener() {
        return mDebugListener;
    }

    public void soapSetHttpTransportDebugListener(HttpDebugListener listener) {
        mHttpDebugListener = listener;
        if (mTransport != null)
            mTransport.setHttpDebugListener(listener);
    }

    public HttpDebugListener soapGetHttpTransportDebugListener() {
        return mHttpDebugListener;
    }

    public ZAuthToken getAuthToken() {
        return mAuthToken;
    }

    public void setAuthToken(ZAuthToken authToken) {
        mAuthToken = authToken;
        if (mTransport != null)
            mTransport.setAuthToken(authToken);
    }

    /**
     * used to authenticate via admin AuthRequest. can only be called after setting the URI with setURI.
     *
     * @param name
     * @param password
     * @throws ServiceException
     * @throws IOException
     */
    public void soapAdminAuthenticate(String name, String password) throws ServiceException {
       if (mTransport == null) throw ZClientException.CLIENT_ERROR("must call setURI before calling adminAuthenticate", null);
        // TODO: Need to resolve issues with AuthToken support before we can
        //       migrate to JAXB?
        //       The ZAuthToken constructor below ends up invoking :
        //       ZAuthToken.fromSoap(Element eAuthToken, boolean isAdmin)
        //       which expects <authToken> to have a value but also optional
        //       <a> sub-elements.  Would probably need @XmlMixed to support
        //       that as @XmlElement and @XmlValue are mutually exclusive
       XMLElement req = new XMLElement(AdminConstants.AUTH_REQUEST);
       req.addElement(AdminConstants.E_NAME).setText(name);
       req.addElement(AdminConstants.E_PASSWORD).setText(password);
       Element response = invoke(req);
       mAuthToken = new ZAuthToken(response.getElement(AdminConstants.E_AUTH_TOKEN), true);
       mAuthTokenLifetime = response.getAttributeLong(AdminConstants.E_LIFETIME);
       mAuthTokenExpiration = System.currentTimeMillis() + mAuthTokenLifetime;
       mTransport.setAuthToken(mAuthToken);
    }

    public void soapAdminAuthenticate(ZAuthToken zat) throws ServiceException {
       // TODO: Do we need 3rd party AuthToken support in JAXB before we can migrate to JAXB?
        if (mTransport == null) throw ZClientException.CLIENT_ERROR("must call setURI before calling adminAuthenticate", null);
        XMLElement req = new XMLElement(AdminConstants.AUTH_REQUEST);
        zat.encodeAuthReq(req, true);
        Element response = invoke(req);
        mAuthToken = new ZAuthToken(response.getElement(AdminConstants.E_AUTH_TOKEN), true);
        mAuthTokenLifetime = response.getAttributeLong(AdminConstants.E_LIFETIME);
        mAuthTokenExpiration = System.currentTimeMillis() + mAuthTokenLifetime;
        mTransport.setAuthToken(mAuthToken);
     }


    /**
     * auth as zimbra admin (over SOAP) using password from localconfig. Can only be called after
     * setting the URI with setUI.
     *
     * @throws ServiceException
     * @throws IOException
     */
    public void soapZimbraAdminAuthenticate() throws ServiceException {
        soapAdminAuthenticate(LC.zimbra_ldap_user.value(), LC.zimbra_ldap_password.value());
    }

    private String serverName() {
        try {
            return new URI(mTransport.getURI()).getHost();
        } catch (URISyntaxException e) {
            return mTransport.getURI();
        }
    }

    private void checkTransport() throws ServiceException {
        if (mTransport == null)
            throw ServiceException.FAILURE("transport has not been initialized", null);
    }

    public synchronized Element invoke(Element request) throws ServiceException {
        checkTransport();

        try {
            return mTransport.invoke(request);
        } catch (SoapFaultException e) {
            throw e; // for now, later, try to map to more specific exception
        } catch (IOException e) {
            throw ZClientException.IO_ERROR("invoke "+e.getMessage()+", server: "+serverName(), e);
        }
    }

    protected synchronized Element invokeOnTargetAccount(Element request, String targetId) throws ServiceException {
        checkTransport();

        String oldTarget = mTransport.getTargetAcctId();
        try {
            mTransport.setTargetAcctId(targetId);
            return mTransport.invoke(request);
        } catch (SoapFaultException e) {
            throw e; // for now, later, try to map to more specific exception
        } catch (IOException e) {
            throw ZClientException.IO_ERROR("invoke "+e.getMessage()+", server: "+serverName(), e);
        } finally {
            mTransport.setTargetAcctId(oldTarget);
        }
    }

    synchronized Element invoke(Element request, String serverName) throws ServiceException {
        checkTransport();

        String oldUri = soapGetURI();
        String newUri = URLUtil.getAdminURL(serverName);
        boolean diff = !oldUri.equals(newUri);
        try {
            if (diff) soapSetURI(newUri);
            return mTransport.invoke(request);
        } catch (SoapFaultException e) {
            throw e; // for now, later, try to map to more specific exception
        } catch (IOException e) {
            throw ZClientException.IO_ERROR("invoke "+e.getMessage()+", server: "+serverName, e);
        } finally {
            if (diff) soapSetURI(oldUri);
        }
    }

    @SuppressWarnings("unchecked")
    public <T> T invokeJaxb(Object jaxbObject) throws ServiceException {
        Element req = JaxbUtil.jaxbToElement(jaxbObject);
        Element res = invoke(req);
        return (T) JaxbUtil.elementToJaxb(res);
    }

    @SuppressWarnings("unchecked")
    public <T> T invokeJaxb(Object jaxbObject, String serverName) throws ServiceException {
        Element req = JaxbUtil.jaxbToElement(jaxbObject);
        Element res = invoke(req, serverName);
        return (T) JaxbUtil.elementToJaxb(res);
    }

    public static Map<String, Object> getAttrs(Element e) throws ServiceException {
        return getAttrs(e, AdminConstants.A_N);
    }

    public static Map<String, Object> getAttrs(Element e, String nameAttr) throws ServiceException {
        Map<String, Object> result = new HashMap<String,Object>();
        for (Element a : e.listElements(AdminConstants.E_A)) {
            StringUtil.addToMultiMap(result, a.getAttribute(nameAttr), a.getText());
        }
        return result;
    }

    public static void addAttrElements(Element req, Map<String, ? extends Object> attrs) throws ServiceException {
        if (attrs == null) return;

        for (Entry<String, ? extends Object> entry : attrs.entrySet()) {
            String key = (String) entry.getKey();
            Object value = entry.getValue();
            if (value instanceof String) {
                Element  a = req.addElement(AdminConstants.E_A);
                a.addAttribute(AdminConstants.A_N, key);
                a.setText((String)value);
            } else if (value instanceof String[]) {
                String[] values = (String[]) value;
                if (values.length == 0) {
                    // an empty array == removing the attr
                    Element  a = req.addElement(AdminConstants.E_A);
                    a.addAttribute(AdminConstants.A_N, key);
                } else {
                    for (String v: values) {
                        Element  a = req.addElement(AdminConstants.E_A);
                        a.addAttribute(AdminConstants.A_N, key);
                        a.setText((String)v);
                    }
                }
            } else if (value == null) {
                Element  a = req.addElement(AdminConstants.E_A);
                a.addAttribute(AdminConstants.A_N, key);
            } else {
                throw ZClientException.CLIENT_ERROR("invalid attr type: "+key+" "+value.getClass().getName(), null);
            }
        }
    }

    @Override
    public void addAlias(Account acct, String alias) throws ServiceException {
        invokeJaxb(new AddAccountAliasRequest(acct.getId(), alias));
        reload(acct);
    }

    @Override
    public void addAlias(DistributionList dl, String alias)
            throws ServiceException {
        invokeJaxb(new AddDistributionListAliasRequest(dl.getId(), alias));
        reload(dl);
    }

    @Override
    public void authAccount(Account acct, String password, AuthContext.Protocol proto)
            throws ServiceException {
        XMLElement req = new XMLElement(AccountConstants.AUTH_REQUEST);
        Element a = req.addElement(AccountConstants.E_ACCOUNT);
        a.addAttribute(AccountConstants.A_BY, "name");
        a.setText(acct.getName());
        req.addElement(AccountConstants.E_PASSWORD).setText(password);
        invoke(req);
    }

    @Override
    public void authAccount(Account acct, String password, AuthContext.Protocol proto, Map<String, Object> context)
            throws ServiceException {
    authAccount(acct, password, proto);
    }


    @Override
    public void changePassword(Account acct, String currentPassword,
            String newPassword) throws ServiceException {
        com.zimbra.soap.account.type.Account jaxbAcct =
            new com.zimbra.soap.account.type.Account(
                    com.zimbra.soap.account.type.Account.By.NAME, acct.getName());
        invokeJaxb(new ChangePasswordRequest(jaxbAcct, currentPassword, newPassword));
    }

    @Override
    public Account createAccount(String emailAddress, String password, Map<String, Object> attrs)
        throws ServiceException
    {
        CreateAccountResponse resp =
            invokeJaxb(new CreateAccountRequest(emailAddress, password, attrs));
        return new SoapAccount(resp.getAccount(), this);
    }

    @Override
    public Account restoreAccount(String emailAddress, String password, Map<String,
            Object> attrs, Map<String, Object> origAttrs) throws ServiceException {
        throw new UnsupportedOperationException();
    }

    @Override
    public CalendarResource createCalendarResource(String emailAddress, String password,
            Map<String, Object> attrs) throws ServiceException {
        CreateCalendarResourceResponse resp =
            invokeJaxb(new CreateCalendarResourceRequest(emailAddress, password,
                    Attr.mapToList(attrs)));
        return new SoapCalendarResource(resp.getCalResource(), this);
    }

    @Override
    public Cos createCos(String name, Map<String, Object> attrs)
            throws ServiceException {
        CreateCosResponse resp = invokeJaxb(new CreateCosRequest(name, attrs));
        return new SoapCos(resp.getCos(), this);
    }

    @Override
    public Cos copyCos(String srcCosId, String destCosName)
            throws ServiceException {
        CopyCosResponse resp = invokeJaxb( new CopyCosRequest(
                    new CosSelector(CosSelector.CosBy.id, srcCosId),
                                    destCosName));
        return new SoapCos(resp.getCos(), this);
    }

    @Override
    public DistributionList createDistributionList(String listAddress,
            Map<String, Object> listAttrs) throws ServiceException {
        CreateDistributionListRequest req = new CreateDistributionListRequest(
                listAddress, Attr.mapToList(listAttrs));
        CreateDistributionListResponse resp = invokeJaxb(req);
        return new SoapDistributionList(resp.getDl(), this);
    }

    @Override
    public Domain createDomain(String name, Map<String, Object> attrs)
            throws ServiceException {
        CreateDomainResponse resp = invokeJaxb(new CreateDomainRequest(name, attrs));
        return new SoapDomain(resp.getDomain(), this);
    }

    @Override
    public Server createServer(String name, Map<String, Object> attrs)
            throws ServiceException {
        CreateServerResponse resp = invokeJaxb(new CreateServerRequest(name, attrs));
        return new SoapServer(resp.getServer(), this);
    }

    /**
     * Unsupported
     */
    @Override
    public Zimlet createZimlet(String name, Map<String, Object> attrs)
            throws ServiceException {
        throw new UnsupportedOperationException();
    }

    @Override
    public void deleteAccount(String zimbraId) throws ServiceException {
        invokeJaxb( new DeleteAccountRequest(zimbraId));
    }

    @Override
    public void deleteCalendarResource(String zimbraId) throws ServiceException {
        invokeJaxb( new DeleteCalendarResourceRequest(zimbraId));
    }

    @Override
    public void deleteCos(String zimbraId) throws ServiceException {
        invokeJaxb( new DeleteCosRequest(zimbraId));
    }

    @Override
    public void deleteDistributionList(String zimbraId) throws ServiceException {
        invokeJaxb(new DeleteDistributionListRequest(zimbraId));
    }

    @Override
    public void deleteDomain(String zimbraId) throws ServiceException {
        invokeJaxb( new DeleteDomainRequest(zimbraId));
    }

    @Override
    public void deleteServer(String zimbraId) throws ServiceException {
        invokeJaxb( new DeleteServerRequest(zimbraId));
    }

    /**
     * Unsupported
     */
    @Override
    public void deleteZimlet(String name) throws ServiceException {
        throw new UnsupportedOperationException();
    }

    public static class DelegateAuthResponse {
        private ZAuthToken mAuthToken;
        private long mExpires;
        private long mLifetime;

        DelegateAuthResponse(Element e) throws ServiceException {
            // mAuthToken = e.getElement(AccountConstants.E_AUTH_TOKEN).getText();
            mAuthToken = new ZAuthToken(e.getElement(AccountConstants.E_AUTH_TOKEN), false);
            mLifetime = e.getAttributeLong(AccountConstants.E_LIFETIME);
            mExpires = System.currentTimeMillis() + mLifetime;
            Element re = e.getOptionalElement(AccountConstants.E_REFERRAL);
        }

        public ZAuthToken getAuthToken() {
            return mAuthToken;
        }

        public long getExpires() {
            return mExpires;
        }

        public long getLifetime() {
            return mLifetime;
        }
    }

    public DelegateAuthResponse delegateAuth(AccountBy keyType, String key, int durationSeconds) throws ServiceException {
        XMLElement req = new XMLElement(AdminConstants.DELEGATE_AUTH_REQUEST);
        req.addAttribute(AdminConstants.A_DURATION, durationSeconds);
        Element acct = req.addElement(AdminConstants.E_ACCOUNT);
        acct.addAttribute(AccountConstants.A_BY, keyType.name());
        acct.setText(key);
        return new DelegateAuthResponse(invoke(req));
    }

    public SoapAccountInfo getAccountInfo(AccountBy keyType, String key)
    throws ServiceException {
        GetAccountInfoResponse resp = invokeJaxb(new GetAccountInfoRequest(
                new AccountSelector(AccountBy.toJaxb(keyType), key)));
        return new SoapAccountInfo(resp);
    }

    @Override
    public Account get(AccountBy keyType, String key) throws ServiceException {
        return get(keyType, key, true);
    }

    /**
     * @param key
     * @param applyDefault
     * @return
     * @throws ServiceException
     */
    // SoapProvisioning only, for zmprov
    public Account getAccount(String key, boolean applyDefault) throws ServiceException {
        Account acct = null;

        if (Provisioning.isUUID(key))
            acct = get(AccountBy.id, key, applyDefault);
        else {
            // could be id or name, try name first, if not found then try id
            acct = get(AccountBy.name, key, applyDefault);
            if (acct == null)
                acct = get(AccountBy.id, key, applyDefault);
        }

        return acct;
    }

    // SoapProvisioning only, for zmprov
    @Override
    public Account get(AccountBy keyType, String key, boolean applyDefault)
    throws ServiceException {
        try {
            GetAccountResponse resp = invokeJaxb(new GetAccountRequest(
                    new AccountSelector(AccountBy.toJaxb(keyType), key),
                                        applyDefault));
            return new SoapAccount(resp.getAccount(), this);
        } catch (ServiceException e) {
            if (e.getCode().equals(AccountServiceException.NO_SUCH_ACCOUNT))
                return null;
            else
                throw e;
        }
    }

    @Override
    public List<Account> getAllAdminAccounts() throws ServiceException {
        return getAllAdminAccounts(true);
    }

    // SoapProvisioning only, for zmprov
    public List<Account> getAllAdminAccounts(boolean applyDefault) throws ServiceException {
        ArrayList<Account> result = new ArrayList<Account>();
        GetAllAdminAccountsResponse resp =
                invokeJaxb(new GetAllAdminAccountsRequest(applyDefault));
        for (AccountInfo acct : resp.getAccountList()) {
            result.add(new SoapAccount(acct, this));
        }
        return result;
    }

    @Override
    public List<Cos> getAllCos() throws ServiceException {
        ArrayList<Cos> result = new ArrayList<Cos>();
        GetAllCosResponse resp = invokeJaxb(new GetAllCosRequest());
        for (CosInfo cosInfo : resp.getCosList()) {
            result.add(new SoapCos(cosInfo, this));
        }
        return result;
    }

    @Override
    public List<Domain> getAllDomains() throws ServiceException {
        return getAllDomains(true);
    }

    // SoapProvisioning only, for zmprov
    public List<Domain> getAllDomains(boolean applyDefault)
    throws ServiceException {
        ArrayList<Domain> result = new ArrayList<Domain>();
        GetAllDomainsResponse resp =
                invokeJaxb(new GetAllDomainsRequest(applyDefault));
        for (DomainInfo domainInfo : resp.getDomainList()) {
            result.add(new SoapDomain(domainInfo, this));
        }
        return result;
    }

    @Override
    public List<Server> getAllServers() throws ServiceException {
        return getAllServers(null, true);
    }

    public static class QuotaUsage {
        public String mName;
        public String mId;
        long mUsed;
        long mLimit;

        public String getName() { return mName; }
        public String getId() { return mId; }
        public long getUsed() { return mUsed; }
        public long getLimit() { return mLimit; }

        QuotaUsage(AccountQuotaInfo quotaInfo) throws ServiceException {
            mName = quotaInfo.getName();
            mId = quotaInfo.getId();
            mUsed = quotaInfo.getQuotaUsed();
            mLimit = quotaInfo.getQuotaLimit();
        }
    }

    public List<QuotaUsage> getQuotaUsage(String server) throws ServiceException {
        ArrayList<QuotaUsage> result = new ArrayList<QuotaUsage>();
        GetQuotaUsageResponse resp =
                invokeJaxb(new GetQuotaUsageRequest(), server);
        for (AccountQuotaInfo quotaInfo : resp.getAccountQuotas()) {
            result.add(new QuotaUsage(quotaInfo));
        }
        return result;
    }

    public List<AccountLogger> addAccountLogger(Account account,
            String category, String level, String server)
    throws ServiceException {
        if (server == null) {
            server = getServer(account).getName();
        }
        AccountSelector acctSel = AccountSelector.fromId(account.getId());
        LoggerInfo logger = new LoggerInfo(category, level);
        AddAccountLoggerResponse resp =
                invokeJaxb(new AddAccountLoggerRequest(acctSel, logger),
                        server);
        return accountLoggersFromLoggerInfos(resp.getLoggers(),
                account.getName());
    }

    private AccountLogger accountLoggerFromLoggerInfo(
            LoggerInfo loggerInfo, String accountName) {
        return new AccountLogger(loggerInfo.getCategory(),
                    accountName, Level.valueOf(loggerInfo.getLevel()));
    }

    private List<AccountLogger> accountLoggersFromLoggerInfos(
            List <LoggerInfo> loggerInfos, String accountName) {
        List<AccountLogger> loggers = Lists.newArrayList();
        for (LoggerInfo loggerInfo : loggerInfos) {
            loggers.add(accountLoggerFromLoggerInfo(loggerInfo, accountName));
        }
        return loggers;
    }

    public List<AccountLogger> getAccountLoggers(Account account, String server)
    throws ServiceException {
        if (server == null) {
            server = getServer(account).getName();
        }
        AccountSelector acctSel = AccountSelector.fromId(account.getId());
        GetAccountLoggersResponse resp =
                invokeJaxb(new GetAccountLoggersRequest(acctSel), server);
        return accountLoggersFromLoggerInfos(resp.getLoggers(),
                account.getName());
    }

    /**
     * Returns all account loggers for the given server.  The <tt>Map</tt>'s key is
     * the account name, and values are all the <tt>AccountLogger</tt> objects for
     * that account.
     *
     * @server the server name, or <tt>null</tt> for the local server
     */
    public Map<String, List<AccountLogger>> getAllAccountLoggers(String server)
    throws ServiceException {
        if (server == null) {
            server = getLocalServer().getName();
        }
        GetAllAccountLoggersResponse resp =
                invokeJaxb(new GetAllAccountLoggersRequest(), server);
        Map<String, List<AccountLogger>> result =
                new HashMap<String, List<AccountLogger>>();
        for (AccountLoggerInfo acctLogger : resp.getLoggers()) {
            String acctName = acctLogger.getName();
            result.put(acctName, accountLoggersFromLoggerInfos(
                                        acctLogger.getLoggers(), acctName));
        }
        return result;
    }

    /**
     * Removes one or more account loggers.
     * @param account the account, or {@code null} for all accounts on the given server
     * @param category the log category, or {@code null} for all log categories
     * @param server the server name, or {@code null} for the local server
     */
    public void removeAccountLoggers(Account account, String category, String server) throws ServiceException {
        if (server == null) {
            if (account == null) {
                server = getLocalServer().getName();
            } else {
                server = getServer(account).getName();
            }
        }
        AccountSelector acctSel = null;
        if (account != null)
            acctSel = AccountSelector.fromId(account.getId());
        LoggerInfo logger = null;
        if (category != null)
            logger = new LoggerInfo(category, null);
        invokeJaxb(new RemoveAccountLoggerRequest(acctSel, logger), server);
    }

    public static class MailboxInfo {
        private long mUsed;
        private String mMboxId;

        public long getUsed() { return mUsed; }
        public String getMailboxId() { return mMboxId; }

        public MailboxInfo(MailboxWithMailboxId jaxbMboxInfo) {
            mMboxId = Integer.toString(jaxbMboxInfo.getMbxid());
            mUsed = jaxbMboxInfo.getSize();
        }

        public MailboxInfo(String id, long used) {
            mMboxId = id;
            mUsed = used;
        }
    }

    public MailboxInfo getMailbox(Account acct) throws ServiceException {
        Server server = getServer(acct);
        String serviceHost = server.getAttr(A_zimbraServiceHostname);
        MailboxByAccountIdSelector mbox =
                new MailboxByAccountIdSelector(acct.getId());
        GetMailboxResponse resp = invokeJaxb(new GetMailboxRequest(mbox), serviceHost);
        resp.getMbox();
        return new MailboxInfo(resp.getMbox());
    }

    public static enum ReIndexBy {
        types, ids;
    }

    public static final class ReIndexInfo {
        private String status;
        private Progress progress;

        public String getStatus() {
            return status;
        }

        public Progress getProgress() {
            return progress;
        }

        ReIndexInfo(String status, Progress progress) {
            this.status = status;
            this.progress = progress;
        }

        public static final class Progress {
            private long numSucceeded;
            private long numFailed;
            private long numRemaining;

            public long getNumSucceeded() {
                return numSucceeded;
            }

            public long getNumFailed() {
                return numFailed;
            }

            public long getNumRemaining() {
                return numRemaining;
            }

            Progress() {
            }

            Progress(long succeeded, long failed, long remaining) {
                numSucceeded = succeeded;
                numFailed = failed;
                numRemaining = remaining;
            }
        }
    }

    public ReIndexInfo reIndex(Account acct, String action, ReIndexBy by,
            String[] values)
    throws ServiceException {
        Server server = getServer(acct);
        ReindexMailboxInfo mbox = new ReindexMailboxInfo(acct.getId());
        if (by != null) {
            String vals = StringUtil.join(",", values);
            if (by == ReIndexBy.types) {
                mbox.setTypes(vals);
            } else {
                mbox.setIds(vals);
            }
        }
        ReIndexRequest req = new ReIndexRequest(action, mbox);
        ReIndexResponse resp = this.invokeJaxb(req,
                server.getAttr(A_zimbraServiceHostname));
        ReIndexInfo.Progress progress = null;
        ReindexProgressInfo progInfo = resp.getProgress();
        if (progInfo != null) {
            progress = new ReIndexInfo.Progress(progInfo.getNumSucceeded(),
                    progInfo.getNumFailed(),
                    progInfo.getNumRemaining());
        }
        return new ReIndexInfo(resp.getStatus(), progress);
    }

    public static final class VerifyIndexResult {
        public final boolean status;
        public final String message;

        VerifyIndexResult(boolean status, String message) {
            this.status = status;
            this.message = message;
        }
    }

    public VerifyIndexResult verifyIndex(Account account) throws ServiceException {
        VerifyIndexRequest req = new VerifyIndexRequest(
                new MailboxByAccountIdSelector(account.getId()));
        VerifyIndexResponse resp = invokeJaxb(req,
                getServer(account).getAttr(A_zimbraServiceHostname));
        return new VerifyIndexResult(resp.isStatus(), resp.getMessage());
    }

    public long recalculateMailboxCounts(Account acct) throws ServiceException {
        Server server = getServer(acct);
        String serviceHost = server.getAttr(A_zimbraServiceHostname);
        MailboxByAccountIdSelector mbox =
                new MailboxByAccountIdSelector(acct.getId());
        RecalculateMailboxCountsResponse resp =
            invokeJaxb(new RecalculateMailboxCountsRequest(mbox), serviceHost);
        return resp.getMailbox().getQuotaUsed();
    }

    @Override
    public List<Server> getAllServers(String service) throws ServiceException {
        return getAllServers(service, true);
    }

    // SoapProvisioning only, for zmprov
    public List<Server> getAllServers(String service, boolean applyDefault)
    throws ServiceException {
        ArrayList<Server> result = new ArrayList<Server>();
        GetAllServersResponse resp =
                invokeJaxb(new GetAllServersRequest(service, applyDefault));
        for (ServerInfo serverInfo : resp.getServerList()) {
            result.add(new SoapServer(serverInfo, this));
        }
        return result;
    }

    @Override
    public CalendarResource get(CalendarResourceBy keyType, String key) throws ServiceException {
        try {
            GetCalendarResourceRequest req = 
                new GetCalendarResourceRequest(
                    new CalendarResourceSelector(
                            CalendarResourceBy.toJaxb(keyType), key));
            GetCalendarResourceResponse resp = invokeJaxb(req);
            return new SoapCalendarResource(resp.getCalResource(), this);
        } catch (ServiceException e) {
            if (e.getCode().equals(AccountServiceException.NO_SUCH_CALENDAR_RESOURCE))
                return null;
            else
                throw e;
        }
    }

    @Override
    public Config getConfig() throws ServiceException {
        GetAllConfigResponse resp = invokeJaxb(new GetAllConfigRequest());
        return new SoapConfig(resp, this);
    }
    
    @Override
    public Config getConfig(String needAttr) throws ServiceException {
        GetConfigRequest req = new GetConfigRequest();
        Attr attr = new Attr();
        attr.setN(needAttr);
        req.setAttr(attr);
        GetConfigResponse resp = invokeJaxb(req);
        return new SoapConfig(resp, this);
    }

    @Override
    public GlobalGrant getGlobalGrant() throws ServiceException {
        throw ServiceException.FAILURE("not supported", null);
    }

    @Override
    public Cos get(CosBy keyType, String key) throws ServiceException {
        try {
            GetCosResponse resp = invokeJaxb(new GetCosRequest(
                            new CosSelector(CosBy.toJaxb(keyType), key)));
            return new SoapCos(resp.getCos(), this);
        } catch (ServiceException e) {
            if (e.getCode().equals(AccountServiceException.NO_SUCH_COS))
                return null;
            else
                throw e;
        }
    }

    @Override
    public DistributionList get(DistributionListBy keyType, String key) throws ServiceException {
        try {
            GetDistributionListResponse resp = invokeJaxb(new GetDistributionListRequest(
                            new DistributionListSelector(keyType.toJaxb(), key)));
            return new SoapDistributionList(resp.getDl(), this);
        } catch (ServiceException e) {
            if (e.getCode().equals(AccountServiceException.NO_SUCH_DISTRIBUTION_LIST))
                return null;
            else
                throw e;
        }
    }

    public Domain getDomainInfo(DomainBy keyType, String key)
    throws ServiceException {
        DomainSelector domSel =
                new DomainSelector(DomainBy.toJaxb(keyType), key);
        try {
            GetDomainInfoResponse resp =
                invokeJaxb(new GetDomainInfoRequest(domSel, null));
            DomainInfo domainInfo = resp.getDomain();
            return domainInfo == null ? null : new SoapDomain(domainInfo, this);
        } catch (ServiceException e) {
            if (e.getCode().equals(AccountServiceException.NO_SUCH_DOMAIN))
                return null;
            else
                throw e;
        }
    }

    @Override
    public Domain get(DomainBy keyType, String key) throws ServiceException {
        return get(keyType, key, true);
    }

    // SoapProvisioning only, for zmprov
    public Domain get(DomainBy keyType, String key, boolean applyDefault)
    throws ServiceException {
        DomainSelector domSel =
                new DomainSelector(DomainBy.toJaxb(keyType), key);
        try {
            GetDomainResponse resp =
                invokeJaxb(new GetDomainRequest(domSel, applyDefault));
            return new SoapDomain(resp.getDomain(), this);
        } catch (ServiceException e) {
            if (e.getCode().equals(AccountServiceException.NO_SUCH_DOMAIN))
                return null;
            else
                throw e;
        }
    }

    @Override
    public Server getLocalServer() throws ServiceException {
        String hostname = LC.zimbra_server_hostname.value();
        if (hostname == null)
            throw ServiceException.FAILURE("zimbra_server_hostname not specified in localconfig.xml", null);
        Server local = get(ServerBy.name, hostname);
        if (local == null)
            throw ServiceException.FAILURE("Could not find an LDAP entry for server '" + hostname + "'", null);
        return local;
    }

    /**
     * Unsupported
     */
    @Override
    public List<MimeTypeInfo> getMimeTypes(String name) throws ServiceException {
        throw new UnsupportedOperationException();
    }

    /**
     * Unsupported
     */
    @Override
    public List<MimeTypeInfo> getAllMimeTypes()
    throws ServiceException {
        throw new UnsupportedOperationException();
    }

    /**
     * Unsupported
     */
    @Override
    public List<Zimlet> getObjectTypes() throws ServiceException {
        throw new UnsupportedOperationException();
    }

    @Override
    public Server get(ServerBy keyType, String key) throws ServiceException {
        return get(keyType, key, true);
    }

    // SoapProvisioning only, for zmprov
    public Server get(ServerBy keyType, String key, boolean applyDefault)
    throws ServiceException {
        ServerSelector sel =
                new ServerSelector(ServerBy.toJaxb(keyType), key);
        try {
            GetServerResponse resp =
                invokeJaxb(new GetServerRequest(sel, applyDefault));
            return new SoapServer(resp.getServer(), this);
        } catch (ServiceException e) {
            if (e.getCode().equals(AccountServiceException.NO_SUCH_SERVER))
                return null;
            else
                throw e;
        }
    }

    /**
     * Unsupported
     */
    @Override
    public Zimlet getZimlet(String name) throws ServiceException {
        throw new UnsupportedOperationException();
    }

    @Override
    public boolean healthCheck() throws ServiceException {
        CheckHealthResponse resp = invokeJaxb(new CheckHealthRequest());
        return resp.isHealthy();
    }

    /**
     * Unsupported
     */
    @Override
    public List<Zimlet> listAllZimlets() throws ServiceException {
        throw new UnsupportedOperationException();
    }

    @Override
    public void modifyAccountStatus(Account acct, String newStatus)
            throws ServiceException {
        HashMap<String, String> attrs = new HashMap<String,String>();
        attrs.put(Provisioning.A_zimbraAccountStatus, newStatus);
        modifyAttrs(acct, attrs);
    }

    @Override
    public void preAuthAccount(Account acct, String accountName,
            String accountBy, long timestamp, long expires, String preAuth,
            Map<String, Object> authCtxt)
            throws ServiceException {
        XMLElement req = new XMLElement(AccountConstants.AUTH_REQUEST);
        Element a = req.addElement(AccountConstants.E_ACCOUNT);
        a.addAttribute(AccountConstants.A_BY, "name");
        a.setText(accountName);
        Element p = req.addElement(AccountConstants.E_PREAUTH);
        p.addAttribute(AccountConstants.A_TIMESTAMP, timestamp);
        p.addAttribute(AccountConstants.A_BY, accountBy);
        p.addAttribute(AccountConstants.A_EXPIRES, expires);
        p.setText(preAuth);
        invoke(req);
    }

    @Override
    public void removeAlias(Account acct, String alias) throws ServiceException {
        this.invokeJaxb(new RemoveAccountAliasRequest(
                (acct == null) ? null : acct.getId(), alias));
        if (acct != null)
            reload(acct);
    }

    @Override
    public void removeAlias(DistributionList dl, String alias)
            throws ServiceException {
        this.invokeJaxb(new RemoveDistributionListAliasRequest(
                (dl == null) ? null : dl.getId(), alias));
        if (dl != null)
            reload(dl);
    }

    @Override
    public void renameAccount(String zimbraId, String newName)
            throws ServiceException {
        invokeJaxb(new RenameAccountRequest(zimbraId, newName));
    }

    @Override
    public void renameCalendarResource(String zimbraId, String newName)
            throws ServiceException {
        invokeJaxb(new RenameCalendarResourceRequest(zimbraId, newName));
    }

    @Override
    public void renameCos(String zimbraId, String newName)
            throws ServiceException {
        invokeJaxb(new RenameCosRequest(zimbraId, newName));
    }

    @Override
    public void renameDistributionList(String zimbraId, String newName)
            throws ServiceException {
        invokeJaxb(new RenameDistributionListRequest(zimbraId, newName));
    }

    @Override
    public List<NamedEntry> searchAccounts(String query, String[] returnAttrs,
            String sortAttr, boolean sortAscending, int flags)
            throws ServiceException {
        return searchAccounts((Domain) null, query, returnAttrs, sortAttr, sortAscending, flags);
    }

    @SuppressWarnings("unchecked")
    @Override
    public List<NamedEntry> searchCalendarResources(EntrySearchFilter filter,
            String[] returnAttrs, String sortAttr, boolean sortAscending)
            throws ServiceException {
        return searchCalendarResources((Domain)null, filter, returnAttrs, sortAttr, sortAscending);
    }

    @Override
    public void setCOS(Account acct, Cos cos) throws ServiceException {
        HashMap<String, String> attrs = new HashMap<String, String>();
        attrs.put(Provisioning.A_zimbraCOSId, cos.getId());
        modifyAttrs(acct, attrs);
    }

    @Override
    public SetPasswordResult setPassword(Account acct, String newPassword) throws ServiceException {
        SetPasswordResponse resp =
            invokeJaxb(new SetPasswordRequest(acct.getId(), newPassword));
        SetPasswordResult result = new SetPasswordResult();
        String eMsg = resp.getMessage();
        if (eMsg != null)
            result.setMessage(eMsg);
        return result;
    }

    @Override
    public void checkPasswordStrength(Account acct, String password) throws ServiceException {
        invokeJaxb(new CheckPasswordStrengthRequest(acct.getId(), password));
    }

    @Override
    public void modifyAttrs(com.zimbra.cs.account.Entry e,
                            Map<String, ? extends Object> attrs,
                            boolean checkImmutable)
    throws ServiceException {
        SoapEntry se = (SoapEntry) e;
        se.modifyAttrs(this, attrs, checkImmutable);
    }

    @Override
    public void modifyAttrs(com.zimbra.cs.account.Entry e,
                            Map<String, ? extends Object> attrs,
                            boolean checkImmutable,
                            boolean allowCallback)
    throws ServiceException {
        // allowCallback is ignored over SOAP interface
        modifyAttrs(e, attrs, checkImmutable);
    }

    @Override
    public void reload(com.zimbra.cs.account.Entry e) throws ServiceException {
        SoapEntry se = (SoapEntry) e;
        se.reload(this);
    }

    private static final String DATA_DL_SET = "DL_SET";

    @SuppressWarnings("unchecked")
    @Override
    public Set<String> getDistributionLists(Account acct) throws ServiceException {
        Set<String> dls = (Set<String>) acct.getCachedData(DATA_DL_SET);
        if (dls != null) return dls;

        dls = new HashSet<String>();

       List<DistributionList> lists = getDistributionLists(acct, false, null);

        for (DistributionList dl : lists) {
            dls.add(dl.getId());
        }
        dls = Collections.unmodifiableSet(dls);
        acct.setCachedData(DATA_DL_SET, dls);
        return dls;
    }

    @Override
    public List<DistributionList> getDistributionLists(Account acct,
                boolean directOnly, Map<String, String> via)
    throws ServiceException {
        ArrayList<DistributionList> result = new ArrayList<DistributionList>();
        GetAccountMembershipResponse resp = invokeJaxb(
            new GetAccountMembershipRequest(
                    AccountSelector.fromId(acct.getId())));
        for (DLInfo dlInfo : resp.getDlList()) {
            String viaList = dlInfo.getVia();
            if (directOnly && viaList != null) continue;
            DistributionList dl = new SoapDistributionList(dlInfo, this);
            if (via != null && viaList != null)
                via.put(dl.getName(), viaList);
            result.add(dl);
        }
        return result;
    }

    @Override
    public boolean inDistributionList(Account acct, String zimbraId) throws ServiceException {
        return getDistributionLists(acct).contains(zimbraId);
    }

    @Override
    public List<DistributionList> getDistributionLists(DistributionList list,
            boolean directOnly, Map<String, String> via)
    throws ServiceException {
        ArrayList<DistributionList> result = new ArrayList<DistributionList>();
        GetDistributionListMembershipRequest req =
            new GetDistributionListMembershipRequest(
                    DistributionListSelector.fromId(list.getId()), null, null);
        GetDistributionListMembershipResponse resp = invokeJaxb(req);
        for (DistributionListMembershipInfo dlMemInfo : resp.getDls()) {
            String viaList = dlMemInfo.getVia();
            if (directOnly && viaList != null)
                continue;
            DistributionList dl = new SoapDistributionList(dlMemInfo, this);
            if (via != null && viaList != null) {
                via.put(dl.getName(), viaList);
            }
            result.add(dl);
        }
        return result;
    }

    private List <AccountInfo> getAllAccountsInfo(Domain d, Server s)
    throws ServiceException {
        DomainSelector domSel = null;
        if (d != null)
            domSel = new DomainSelector(DomainSelector.DomainBy.id, d.getId());
        ServerSelector svrSel = null;
        if (s != null)
            svrSel = new ServerSelector(ServerSelector.ServerBy.id, s.getId());
        GetAllAccountsResponse resp =
                invokeJaxb(new GetAllAccountsRequest(svrSel, domSel));
        return resp.getAccountList();
        
    }

    @Override
    public List <Account> getAllAccounts(Domain d)
    throws ServiceException {
        return getAllAccounts(d, (Server)null);
    }

    public List <Account> getAllAccounts(Domain d, Server s)
    throws ServiceException {
        ArrayList<Account> result = new ArrayList<Account>();
        for (AccountInfo acct : getAllAccountsInfo(d, s)) {
            result.add(new SoapAccount(acct, this));
        }
        return result;
    }

    @Override
    public void getAllAccounts(Domain d, Visitor visitor)
    throws ServiceException {
        getAllAccounts(d, (Server)null, visitor);
    }

    @Override
    public void getAllAccounts(Domain d, Server s, Visitor visitor)
    throws ServiceException {
        for (AccountInfo acct : getAllAccountsInfo(d, s)) {
            visitor.visit(new SoapAccount(acct, this));
        }
    }

    private List <CalendarResourceInfo> getAllCalendarResourcesInfo(
            Domain d, Server s) 
    throws ServiceException {
        DomainSelector domSel = null;
        if (d != null)
            domSel = new DomainSelector(DomainSelector.DomainBy.id, d.getId());
        ServerSelector svrSel = null;
        if (s != null)
            svrSel = new ServerSelector(ServerSelector.ServerBy.id, s.getId());
        GetAllCalendarResourcesResponse resp =
                invokeJaxb(new GetAllCalendarResourcesRequest(svrSel, domSel));
        return resp.getCalendarResourceList();
    }

    @Override
    public List <CalendarResource> getAllCalendarResources(Domain d)
    throws ServiceException {
        return getAllCalendarResources(d, (Server)null);
    }

    public List <CalendarResource> getAllCalendarResources(Domain d, Server s)
    throws ServiceException {
        ArrayList<CalendarResource> result = new ArrayList<CalendarResource>();
        for (CalendarResourceInfo rsrc : getAllCalendarResourcesInfo(d, s)) {
            result.add(new SoapCalendarResource(rsrc, this));
        }
        return result;
    }

    @Override
    public void getAllCalendarResources(Domain d, Visitor visitor)
    throws ServiceException {
        getAllCalendarResources(d, (Server)null, visitor);
    }

    @Override
    public void getAllCalendarResources(Domain d, Server s, Visitor visitor)
    throws ServiceException {
        for (CalendarResourceInfo rsrc : getAllCalendarResourcesInfo(d, s)) {
            visitor.visit(new SoapCalendarResource(rsrc, this));
        }
    }

    @Override
    public List <DistributionList> getAllDistributionLists(Domain d)
    throws ServiceException {
        ArrayList<DistributionList> result = new ArrayList<DistributionList>();
        DomainSelector domSel = new DomainSelector(
                DomainSelector.DomainBy.id, d.getId());
        GetAllDistributionListsResponse resp =
                invokeJaxb(new GetAllDistributionListsRequest(domSel));
        for (DistributionListInfo dl : resp.getDls()) {
            result.add(new SoapDistributionList(dl, this));
        }
        return result;
    }

    @Override
    public SearchGalResult autoCompleteGal(Domain d, String query, GalSearchType type, int limit) throws ServiceException {
        String typeStr = type == null ? GalSearchType.all.name() : type.name();

        XMLElement req = new XMLElement(AdminConstants.AUTO_COMPLETE_GAL_REQUEST);
        req.addElement(AdminConstants.E_NAME).setText(query);
        req.addAttribute(AdminConstants.A_DOMAIN, d.getName());
        req.addAttribute(AdminConstants.A_TYPE, typeStr);
        req.addAttribute(AdminConstants.A_LIMIT, limit);

        Element resp = invoke(req);

        SearchGalResult result = SearchGalResult.newSearchGalResult(null);
        result.setHadMore(resp.getAttributeBool(AdminConstants.A_MORE, false));
        result.setTokenizeKey(resp.getAttribute(AccountConstants.A_TOKENIZE_KEY, null));
        for (Element e: resp.listElements(AdminConstants.E_CN)) {
            result.addMatch(new GalContact(AdminConstants.A_ID, getAttrs(e)));
        }
        return result;
    }

    @Override
    public List<NamedEntry> searchAccounts(Domain d, String query, String[] returnAttrs, String sortAttr, boolean sortAscending, int flags) throws ServiceException {
        List<NamedEntry> result = new ArrayList<NamedEntry>();
        XMLElement req = new XMLElement(AdminConstants.SEARCH_ACCOUNTS_REQUEST);
        req.addElement(AdminConstants.E_QUERY).setText(query);
        if (d != null) req.addAttribute(AdminConstants.A_DOMAIN, d.getName());
        if (sortAttr != null) req.addAttribute(AdminConstants.A_SORT_BY, sortAttr);
        if (flags != 0) req.addAttribute(AdminConstants.A_TYPES, Provisioning.searchAccountMaskToString(flags));
        req.addAttribute(AdminConstants.A_SORT_ASCENDING, sortAscending ? "1" : "0");
        if (returnAttrs != null) {
            req.addAttribute(AdminConstants.A_ATTRS, StringUtil.join(",", returnAttrs));
        }
        // TODO: handle ApplyCos, limit, offset?
        Element resp = invoke(req);
        for (Element e: resp.listElements(AdminConstants.E_DL))
            result.add(new SoapDistributionList(e, this));

        for (Element e: resp.listElements(AdminConstants.E_ALIAS))
            result.add(new SoapAlias(e, this));

        for (Element e: resp.listElements(AdminConstants.E_ACCOUNT))
            result.add(new SoapAccount(e, this));

        return result;
    }

    @Override
    public List<NamedEntry> searchDirectory(SearchOptions options) throws ServiceException {
        List<NamedEntry> result = new ArrayList<NamedEntry>();
        SearchDirectoryRequest req = new SearchDirectoryRequest();
        req.setQuery(options.getQuery());
        if (options.getMaxResults() != 0)
            req.setMaxResults(options.getMaxResults());
        if (options.getDomain() != null)
            req.setDomain(options.getDomain().getName());
        if (options.getSortAttr() != null)
            req.setSortBy(options.getSortAttr());
        if (options.getFlags() != 0)
            req.setTypes(Provisioning.searchAccountMaskToString(options.getFlags()));
        req.setSortAscending(options.isSortAscending());
        if (options.getReturnAttrs() != null)
            req.addAttrs(options.getReturnAttrs());
        // TODO: handle ApplyCos, limit, offset?
        SearchDirectoryResponse resp = invokeJaxb(new SearchDirectoryRequest());

        for (DistributionListInfo dl : resp.getDistributionLists())
            result.add(new SoapDistributionList(dl, this));
        for (AliasInfo alias : resp.getAliases())
            result.add(new SoapAlias(alias, this));
        for (AccountInfo acct : resp.getAccounts())
            result.add(new SoapAccount(acct, this));
        for (DomainInfo dom : resp.getDomains())
            result.add(new SoapDomain(dom, this));
        return result;
    }

    @Override
    public List searchCalendarResources(Domain d, EntrySearchFilter filter, String[] returnAttrs, String sortAttr, boolean sortAscending) throws ServiceException {
        // TODO
        throw new UnsupportedOperationException();
/*
        List<NamedEntry> result = new ArrayList<NamedEntry>();
        XMLElement req = new XMLElement(AdminService.SEARCH_CALENDAR_RESOURCES_REQUEST);
        req.addElement(MailSer).setText(query);
        if (d != null) req.addAttribute(AdminService.A_DOMAIN, d.getName());
        if (sortAttr != null) req.addAttribute(AdminService.A_SORT_BY, sortAttr);
        if (flags != 0) req.addAttribute(AdminService.A_TYPES, Provisioning.searchAccountMaskToString(flags));
        req.addAttribute(AdminService.A_SORT_ASCENDING, sortAscending ? "1" : "0");
        if (returnAttrs != null) {
            req.addAttribute(AdminService.A_ATTRS, StringUtil.join(",", returnAttrs));
        }
        // TODO: handle ApplyCos, limit, offset?
        Element resp = invoke(req);
        for (Element e: resp.listElements(AdminService.E_CALENDAR_RESOURCE))
            result.add(new SoapCalendarResource(e));

        return result;
*/
    }

    @Override
    public SearchGalResult searchGal(Domain d, String query, GalSearchType type, String token) throws ServiceException {
        return searchGal(d, query, type, token, 0, 0, null);
    }

    public SearchGalResult searchGal(Domain d, String query, GalSearchType type, String token, int limit, int offset, String sortBy) throws ServiceException {
        String typeStr = type == null ? GalSearchType.all.name() : type.name();

        XMLElement req = new XMLElement(AdminConstants.SEARCH_GAL_REQUEST);
        req.addElement(AdminConstants.E_NAME).setText(query);
        req.addAttribute(AdminConstants.A_DOMAIN, d.getName());
        req.addAttribute(AdminConstants.A_TYPE, typeStr);
        if (limit > 0)
            req.addAttribute(AdminConstants.A_LIMIT, limit);
        if (offset > 0)
            req.addAttribute(AdminConstants.A_OFFSET, limit);
        if (sortBy != null)
            req.addAttribute(AdminConstants.A_SORT_BY, sortBy);

        if (token != null) req.addAttribute(AdminConstants.A_TOKEN, token);

        Element resp = invoke(req);

        SearchGalResult result = SearchGalResult.newSearchGalResult(null);
        result.setToken(resp.getAttribute(AdminConstants.A_TOKEN, null));
        result.setHadMore(resp.getAttributeBool(AdminConstants.A_MORE, false));
        result.setTokenizeKey(resp.getAttribute(AccountConstants.A_TOKENIZE_KEY, null));
        for (Element e: resp.listElements(AdminConstants.E_CN)) {
            result.addMatch(new GalContact(AdminConstants.A_ID, getAttrs(e)));
        }
        return result;
    }

    @Override
    public void addMembers(DistributionList list, String[] members)
    throws ServiceException {
        invokeJaxb(new AddDistributionListMemberRequest(list.getId(),
                            Arrays.asList(members)));
        reload(list);
    }

    @Override
    public void removeMembers(DistributionList list, String[] members) throws ServiceException {
        invokeJaxb(new RemoveDistributionListMemberRequest(list.getId(),
                            Arrays.asList(members)));
        reload(list);
    }

    static void addAttrElementsMailService(Element req, Map<String, ? extends Object> attrs) throws ServiceException {
        if (attrs == null) return;

        for (Entry entry : attrs.entrySet()) {
            String key = (String) entry.getKey();
            Object value = entry.getValue();
            if (value instanceof String) {
                Element  a = req.addElement(MailConstants.E_ATTRIBUTE);
                a.addAttribute(MailConstants.A_NAME, key);
                a.setText((String)value);
            } else if (value instanceof String[]) {
                String[] values = (String[]) value;
                for (String v: values) {
                    Element  a = req.addElement(MailConstants.E_ATTRIBUTE);
                    a.addAttribute(MailConstants.A_NAME, key);
                    a.setText(v);
                }
            } else {
                throw ZClientException.CLIENT_ERROR("invalid attr type: "+key+" "+value.getClass().getName(), null);
            }
        }
    }

    @Override
    public Identity createIdentity(Account account, String identityName, Map<String, Object> attrs) throws ServiceException {
        XMLElement req = new XMLElement(AccountConstants.CREATE_IDENTITY_REQUEST);
        Element identity = req.addElement(AccountConstants.E_IDENTITY);
        identity.addAttribute(AccountConstants.A_NAME, identityName);
        addAttrElementsMailService(identity, attrs);
        Element response = invokeOnTargetAccount(req, account.getId()).getElement(AccountConstants.E_IDENTITY);
        return new SoapIdentity(account, response, this);
    }

    @Override
    public Identity restoreIdentity(Account account, String identityName, Map<String, Object> attrs) throws ServiceException {
        throw new UnsupportedOperationException();
    }

    @Override
    public void deleteIdentity(Account account, String identityName) throws ServiceException {
        XMLElement req = new XMLElement(AccountConstants.DELETE_IDENTITY_REQUEST);
        Element identity = req.addElement(AccountConstants.E_IDENTITY);
        identity.addAttribute(AccountConstants.A_NAME, identityName);
        invokeOnTargetAccount(req, account.getId());
    }

    @Override
    public List<Identity> getAllIdentities(Account account) throws ServiceException {
        List<Identity> result = new ArrayList<Identity>();
        XMLElement req = new XMLElement(AccountConstants.GET_IDENTITIES_REQUEST);
        Element resp = invokeOnTargetAccount(req, account.getId());
        for (Element identity: resp.listElements(AccountConstants.E_IDENTITY)) {
            result.add(new SoapIdentity(account, identity, this));
        }
        return result;
    }

    @Override
    public void modifyIdentity(Account account, String identityName, Map<String, Object> attrs) throws ServiceException {
        XMLElement req = new XMLElement(AccountConstants.MODIFY_IDENTITY_REQUEST);
        Element identity = req.addElement(AccountConstants.E_IDENTITY);
        identity.addAttribute(AccountConstants.A_NAME, identityName);
        addAttrElementsMailService(identity, attrs);
        invokeOnTargetAccount(req, account.getId());
    }

    @Override
    public Signature createSignature(Account account, String signatureName, Map<String, Object> attrs) throws ServiceException {
        if (attrs.get(Provisioning.A_zimbraSignatureName) != null)
            throw ZClientException.CLIENT_ERROR("invalid attr: "+Provisioning.A_zimbraSignatureName, null);

        XMLElement req = new XMLElement(AccountConstants.CREATE_SIGNATURE_REQUEST);
        Element signature = req.addElement(AccountConstants.E_SIGNATURE);
        signature.addAttribute(AccountConstants.A_NAME, signatureName);
        SoapSignature.toXML(signature, attrs);
        Element response = invokeOnTargetAccount(req, account.getId()).getElement(AccountConstants.E_SIGNATURE);
        return new SoapSignature(account, response, this);
    }

    @Override
    public Signature restoreSignature(Account account, String signatureName, Map<String, Object> attrs) throws ServiceException {
        throw new UnsupportedOperationException();
    }

    @Override
    public void modifySignature(Account account, String signatureId, Map<String, Object> attrs) throws ServiceException {
        if (attrs.get(Provisioning.A_zimbraSignatureId) != null)
            throw ZClientException.CLIENT_ERROR("invalid attr: "+Provisioning.A_zimbraSignatureId, null);

        XMLElement req = new XMLElement(AccountConstants.MODIFY_SIGNATURE_REQUEST);
        Element signature = req.addElement(AccountConstants.E_SIGNATURE);
        signature.addAttribute(AccountConstants.A_ID, signatureId);
        SoapSignature.toXML(signature, attrs);
        invokeOnTargetAccount(req, account.getId());
    }

    @Override
    public void deleteSignature(Account account, String signatureId) throws ServiceException {
        XMLElement req = new XMLElement(AccountConstants.DELETE_SIGNATURE_REQUEST);
        Element signature = req.addElement(AccountConstants.E_SIGNATURE);
        signature.addAttribute(AccountConstants.A_ID, signatureId);
        invokeOnTargetAccount(req, account.getId());
    }

    @Override
    public List<Signature> getAllSignatures(Account account) throws ServiceException {
        List<Signature> result = new ArrayList<Signature>();
        XMLElement req = new XMLElement(AccountConstants.GET_SIGNATURES_REQUEST);
        Element resp = invokeOnTargetAccount(req, account.getId());
        for (Element signature: resp.listElements(AccountConstants.E_SIGNATURE)) {
            result.add(new SoapSignature(account, signature, this));
        }
        return result;
    }

    @Override
    public DataSource createDataSource(Account account, DataSource.Type dsType, String dsName, Map<String, Object> attrs) throws ServiceException {
        XMLElement req = new XMLElement(AdminConstants.CREATE_DATA_SOURCE_REQUEST);
        req.addElement(AdminConstants.E_ID).setText(account.getId());
        Element ds = req.addElement(AccountConstants.E_DATA_SOURCE);
        ds.addAttribute(AccountConstants.A_NAME, dsName);
        ds.addAttribute(AccountConstants.A_TYPE, dsType.name());
        addAttrElements(ds, attrs);
        Element response = invoke(req).getElement(AccountConstants.E_DATA_SOURCE);
        return new SoapDataSource(account, response, this);
    }

    @Override
    public DataSource createDataSource(Account account, DataSource.Type dsType, String dsName, Map<String, Object> attrs, boolean passwdAlreadyEncrypted) throws ServiceException {
        throw new UnsupportedOperationException();
    }

    @Override
    public DataSource restoreDataSource(Account account, DataSource.Type dsType, String dsName, Map<String, Object> attrs) throws ServiceException {
        throw new UnsupportedOperationException();
    }

    @Override
    public void deleteDataSource(Account account, String dataSourceId) throws ServiceException {
        XMLElement req = new XMLElement(AdminConstants.DELETE_DATA_SOURCE_REQUEST);
        req.addElement(AdminConstants.E_ID).setText(account.getId());
        Element ds = req.addElement(AccountConstants.E_DATA_SOURCE);
        ds.addAttribute(AccountConstants.A_ID, dataSourceId);
        invoke(req);
    }

    @Override
    public List<DataSource> getAllDataSources(Account account) throws ServiceException {
        List<DataSource> result = new ArrayList<DataSource>();
        XMLElement req = new XMLElement(AdminConstants.GET_DATA_SOURCES_REQUEST);
        req.addElement(AdminConstants.E_ID).setText(account.getId());
        Element resp = invoke(req);
        for (Element dataSource: resp.listElements(AccountConstants.E_DATA_SOURCE)) {
            result.add(new SoapDataSource(account, dataSource, this));
        }
        return result;
    }

    @Override
    public void modifyDataSource(Account account, String dataSourceId, Map<String, Object> attrs) throws ServiceException {
        XMLElement req = new XMLElement(AdminConstants.MODIFY_DATA_SOURCE_REQUEST);
        req.addElement(AdminConstants.E_ID).setText(account.getId());
        Element ds = req.addElement(AccountConstants.E_DATA_SOURCE);
        ds.addAttribute(AccountConstants.A_ID, dataSourceId);
        addAttrElements(ds, attrs);
        invoke(req);
    }

    @Override
    public DataSource get(Account account, DataSourceBy keyType, String key) throws ServiceException {
        // TOOD: more efficient version and/or caching on account?
        switch (keyType) {
        case name:
            for (DataSource source : getAllDataSources(account))
                if (source.getName().equalsIgnoreCase(key))
                    return source;
            return null;
        case id:
            for (DataSource source : getAllDataSources(account))
                if (source.getId().equalsIgnoreCase(key))
                    return source;
            return null;
        default:
            return null;

        }
    }
    @Override
    public List<XMPPComponent> getAllXMPPComponents() throws ServiceException {
        XMLElement req = new XMLElement(AdminConstants.GET_ALL_XMPPCOMPONENTS_REQUEST);
        Element response = invoke(req);

        List<XMPPComponent> toRet = new ArrayList<XMPPComponent>();
        for (Element e : response.listElements(AdminConstants.E_XMPP_COMPONENT)) {
            toRet.add(new SoapXMPPComponent(e, this));
        }
        return toRet;
    }

    @Override
    public XMPPComponent createXMPPComponent(String name, Domain domain, Server server, Map<String, Object> attrs) throws ServiceException {
        XMLElement req = new XMLElement(AdminConstants.CREATE_XMPPCOMPONENT_REQUEST);

        Element c = req.addElement(AccountConstants.E_XMPP_COMPONENT);
        c.addAttribute(AdminConstants.A_NAME, name);

        Element domainElt = c.addElement(AdminConstants.E_DOMAIN);
        domainElt.addAttribute(AdminConstants.A_BY, "id");
        domainElt.setText(domain.getId());

        Element serverElt = c.addElement(AdminConstants.E_SERVER);
        serverElt.addAttribute(AdminConstants.A_BY, "id");
        serverElt.setText(server.getId());

        addAttrElements(c, attrs);
        Element response = invoke(req);
        response = response.getElement(AccountConstants.E_XMPP_COMPONENT);
        return new SoapXMPPComponent(response, this);
    }

    @Override
    public XMPPComponent get(XMPPComponentBy keyType, String key) throws ServiceException {
        XMLElement req = new XMLElement(AdminConstants.GET_XMPPCOMPONENT_REQUEST);

        Element c = req.addElement(AccountConstants.E_XMPP_COMPONENT);
        c.addAttribute(AdminConstants.A_BY, keyType.name());
        c.setText(key);
        Element response = invoke(req);
        response = response.getElement(AccountConstants.E_XMPP_COMPONENT);
        return new SoapXMPPComponent(response, this);
    }

    @Override
    public void deleteXMPPComponent(XMPPComponent comp) throws ServiceException {
        XMLElement req = new XMLElement(AdminConstants.DELETE_XMPPCOMPONENT_REQUEST);

        Element c = req.addElement(AccountConstants.E_XMPP_COMPONENT);
        c.addAttribute(AdminConstants.A_BY, "id");
        c.setText(comp.getId());
        invoke(req);
    }

    @Override
    public Identity get(Account account, IdentityBy keyType, String key) throws ServiceException {
        // TOOD: more efficient version and/or caching on account?
        switch (keyType) {
        case name:
            for (Identity identity : getAllIdentities(account))
                if (identity.getName().equalsIgnoreCase(key))
                    return identity;
            return null;
        case id:
            for (Identity identity : getAllIdentities(account))
                if (identity.getId().equalsIgnoreCase(key))
                    return identity;
            return null;
        default:
            return null;

        }
    }

    @Override
    public Signature get(Account account, SignatureBy keyType, String key) throws ServiceException {
        // TOOD: more efficient version and/or caching on account?
        switch (keyType) {
        case name:
            for (Signature signature : getAllSignatures(account))
                if (signature.getName().equalsIgnoreCase(key))
                    return signature;
            return null;
        case id:
            for (Signature signature : getAllSignatures(account))
                if (signature.getId().equalsIgnoreCase(key))
                    return signature;
            return null;
        default:
            return null;

        }
    }

    public void deleteMailbox(String accountId) throws ServiceException {
        invokeJaxb(new DeleteMailboxRequest(accountId));
    }


    //
    // rights
    //

    // target
    private Element toXML(Element req,
                       String targetType, TargetBy targetBy, String target) {
        Element eTarget = req.addElement(AdminConstants.E_TARGET);
        eTarget.addAttribute(AdminConstants.A_TYPE, targetType);
        if (target != null) {
            eTarget.addAttribute(AdminConstants.A_BY, targetBy.toString());
            eTarget.setText(target);
        }

        return eTarget;
    }

    // grantee
    private Element toXML(Element req,
            String granteeType, GranteeBy granteeBy, String grantee) {
        return toXML(req, granteeType,  granteeBy,  grantee, null);
    }

    private Element toXML(Element req,
                       String granteeType, GranteeBy granteeBy, String grantee, String secret) {
        Element eGrantee = req.addElement(AdminConstants.E_GRANTEE);
        if (granteeType != null)
            eGrantee.addAttribute(AdminConstants.A_TYPE, granteeType);

        if (granteeBy != null)
            eGrantee.addAttribute(AdminConstants.A_BY, granteeBy.toString());

        if (secret != null)
            eGrantee.addAttribute(AdminConstants.A_SECRET, secret);

        if (grantee != null)
            eGrantee.setText(grantee);

        return eGrantee;
    }

    // right
    private Element toXML(Element req,
                       String right, RightModifier rightModifier) {
        Element eRight = req.addElement(AdminConstants.E_RIGHT);
        if (rightModifier != null) {
            eRight.addAttribute(rightModifier.getSoapAttrMapping(), true);
        }
        eRight.setText(right);

        return eRight;
    }

    @Override
    public Map<String, List<RightsDoc>> getRightsDoc(String[] pkgs)
    throws ServiceException {
        GetRightsDocRequest req = new GetRightsDocRequest();
        if (pkgs != null) {
            for (String pkg: pkgs)
                req.addPkg(new PackageSelector(pkg));
        }
        GetRightsDocResponse resp = invokeJaxb(req);

        Map<String, List<RightsDoc>> allDocs =
                new TreeMap<String, List<RightsDoc>>();
        for (PackageRightsInfo ePkg : resp.getPackages()) {
            List <RightsDoc> docs = Lists.newArrayList();
            allDocs.put(ePkg.getName(), docs);
            for (CmdRightsInfo eCmd : ePkg.getCmds())
                docs.add(new RightsDoc(eCmd));
        }
        return allDocs;
    }

    @Override
    public Right getRight(String rightName, boolean expandAllAttrs)
    throws ServiceException {
        GetRightResponse resp = invokeJaxb(
                new GetRightRequest(rightName, expandAllAttrs));
        // Note: Hack which ignores response details and gets right
        //       directly from Rights manager by name
        return RightCommand.RightNameToRight(resp.getRight().getName());
    }

    @Override
    public List<Right> getAllRights(String targetType, boolean expandAllAttrs,
            String rightClass)
    throws ServiceException {
        GetAllRightsResponse resp = invokeJaxb(new GetAllRightsRequest(
                targetType, expandAllAttrs, rightClass));
        List<Right> rights = new ArrayList<Right>();
        for (RightInfo rInfo : resp.getRights()) {
            // Note: Hack which ignores rInfo details and gets right
            //       directly from Rights manager by name
            rights.add(RightCommand.RightNameToRight(rInfo.getName()));
        }
        return rights;
    }

    @Override
    public boolean checkRight(String targetType, TargetBy targetBy, String target,
                              GranteeBy granteeBy, String grantee,
                              String right, Map<String, Object> attrs,
                              AccessManager.ViaGrant via) throws ServiceException {
        XMLElement req = new XMLElement(AdminConstants.CHECK_RIGHT_REQUEST);
        toXML(req, targetType, targetBy, target);
        toXML(req, null, granteeBy, grantee);
        toXML(req, right, null);

        SoapProvisioning.addAttrElements(req, attrs);

        Element resp = invoke(req);
        boolean result = resp.getAttributeBool(AdminConstants.A_ALLOW);
        if (via != null) {
            Element eVia = resp.getOptionalElement(AdminConstants.E_VIA);
            if (eVia != null) {
                Element eTarget = eVia.getElement(AdminConstants.E_TARGET);
                Element eGrantee = eVia.getElement(AdminConstants.E_GRANTEE);
                Element eRight = eVia.getElement(AdminConstants.E_RIGHT);
                via.setImpl(new ViaGrantImpl(eTarget.getAttribute(AdminConstants.A_TYPE),
                                             eTarget.getText(),
                                             eGrantee.getAttribute(AdminConstants.A_TYPE),
                                             eGrantee.getText(),
                                             eRight.getText(),
                                             eRight.getAttributeBool(AdminConstants.A_DENY, false)));
            }
        }
        return result;
    }

    @Override
    public RightCommand.AllEffectiveRights getAllEffectiveRights(
            String granteeType, GranteeBy granteeBy, String grantee,
            boolean expandSetAttrs, boolean expandGetAttrs)
    throws ServiceException {
        GranteeSelector granteeSel = null;
        if (granteeType != null && granteeBy != null && grantee != null) {
            granteeSel = new GranteeSelector(
                    GranteeInfo.GranteeType.fromString(granteeType),
                    granteeBy.toJaxb(), grantee);
        }
        GetAllEffectiveRightsResponse resp =
            invokeJaxb(new GetAllEffectiveRightsRequest(granteeSel,
                    expandSetAttrs, expandGetAttrs));
        return RightCommand.AllEffectiveRights.fromJaxb(resp);
    }

    @Override
    public RightCommand.EffectiveRights getEffectiveRights(
            String targetType, TargetBy targetBy, String target,
            GranteeBy granteeBy, String grantee,
            boolean expandSetAttrs, boolean expandGetAttrs)
    throws ServiceException {
        GranteeSelector granteeSel = null;
        if (granteeBy != null && grantee != null) {
            granteeSel = new GranteeSelector(
                    granteeBy.toJaxb(), grantee);
        }
        EffectiveRightsTargetSelector targetSel =
            new EffectiveRightsTargetSelector(
                    EffectiveRightsTarget.TargetType.fromString(targetType),
                    targetBy.toJaxb(), target);
        GetEffectiveRightsResponse resp =
            invokeJaxb(new GetEffectiveRightsRequest(targetSel, granteeSel,
                    expandSetAttrs, expandGetAttrs));
        return RightCommand.EffectiveRights.fromJaxb_EffectiveRights(resp);
    }

    @Override
    public RightCommand.EffectiveRights getCreateObjectAttrs(
            String targetType,
            DomainBy domainBy, String domain,
            CosBy cosBy, String cos,
            GranteeBy granteeBy, String grantee) throws ServiceException {
        XMLElement req = new XMLElement(AdminConstants.GET_CREATE_OBJECT_ATTRS_REQUEST);

        Element eTarget = req.addElement(AdminConstants.E_TARGET);
        eTarget.addAttribute(AdminConstants.A_TYPE, targetType);

        if (domainBy != null && domain != null) {
            Element eDomain = req.addElement(AdminConstants.E_DOMAIN);
            eDomain.addAttribute(AdminConstants.A_BY, domainBy.toString());
            eDomain.setText(domain);
        }

        if (cosBy != null && cos != null) {
            Element eCos = req.addElement(AdminConstants.E_COS);
            eCos.addAttribute(AdminConstants.A_BY, cosBy.toString());
            eCos.setText(cos);
        }

        /*
        if (granteeBy != null && grantee != null)
            toXML(req, null, granteeBy, grantee);
        */

        Element resp = invoke(req);
        return RightCommand.EffectiveRights.fromXML_CreateObjectAttrs(resp);
    }

    @Override
    public RightCommand.Grants getGrants(
            String targetType, TargetBy targetBy, String target,
            String granteeType, GranteeBy granteeBy, String grantee,
            boolean granteeIncludeGroupsGranteeBelongs) throws ServiceException {
        XMLElement req = new XMLElement(AdminConstants.GET_GRANTS_REQUEST);

        if (targetType != null)
            toXML(req, targetType, targetBy, target);

        if (granteeType != null) {
            Element eGrantee = toXML(req, granteeType, granteeBy, grantee);
            eGrantee.addAttribute(AdminConstants.A_ALL, granteeIncludeGroupsGranteeBelongs);
        }

        Element resp = invoke(req);
        return new RightCommand.Grants(resp);
    }

    @Override
    public void grantRight(String targetType, TargetBy targetBy, String target,
                           String granteeType, GranteeBy granteeBy, String grantee, String secret,
                           String right, RightModifier rightModifier) throws ServiceException {
        XMLElement req = new XMLElement(AdminConstants.GRANT_RIGHT_REQUEST);
        toXML(req, targetType, targetBy, target);
        toXML(req, granteeType, granteeBy, grantee, secret);
        toXML(req, right, rightModifier);

        Element resp = invoke(req);
    }

    @Override
    public void revokeRight(String targetType, TargetBy targetBy, String target,
                            String granteeType, GranteeBy granteeBy, String grantee,
                            String right, RightModifier rightModifier)  throws ServiceException {
        XMLElement req = new XMLElement(AdminConstants.REVOKE_RIGHT_REQUEST);
        toXML(req, targetType, targetBy, target);
        toXML(req, granteeType, granteeBy, grantee);
        toXML(req, right, rightModifier);

        Element resp = invoke(req);
    }

    @Override
    public void flushCache(CacheEntryType type, CacheEntry[] entries) throws ServiceException {
        flushCache(type.name(), entries, false);
    }

    /*
     * invoked from ProvUtil, as it has to support skin and locale caches, which are not
     * managed by Provisioning.
     */
    public void flushCache(String type, CacheEntry[] entries, boolean allServers) throws ServiceException {
        CacheSelector sel = new CacheSelector(allServers, type);

        if (entries != null) {
            for (CacheEntry entry : entries) {
                sel.addEntry(new CacheEntrySelector(
                        CacheEntryBy.toJaxb(entry.mEntryBy),
                        entry.mEntryIdentity));
            }
        }
        invokeJaxb(new FlushCacheRequest(sel));
    }

    @Override
    public CountAccountResult countAccount(Domain domain) throws ServiceException {
        DomainSelector domSel = new DomainSelector(
                DomainSelector.DomainBy.id, domain.getId());
        CountAccountResponse resp = invokeJaxb(new CountAccountRequest(domSel));
        CountAccountResult result = new CountAccountResult();
        for (CosCountInfo cosInfo :resp.getCos()) {
            result.addCountAccountByCosResult(cosInfo.getId(),
                    cosInfo.getName(), cosInfo.getValue());
        }
        return result;
    }

    @Override
    public void purgeAccountCalendarCache(String accountId) throws ServiceException {
        XMLElement req = new XMLElement(AdminConstants.PURGE_ACCOUNT_CALENDAR_CACHE_REQUEST);
        req.addAttribute(AdminConstants.A_ID, accountId);
        invoke(req);
    }

    @Override
    public void reloadMemcachedClientConfig() throws ServiceException {
        XMLElement req = new XMLElement(AdminConstants.RELOAD_MEMCACHED_CLIENT_CONFIG_REQUEST);
        invoke(req);
    }

    public class MemcachedClientConfig {
        public String serverList;
        public String hashAlgorithm;
        public boolean binaryProtocol;
        public int defaultExpirySeconds;
        public long defaultTimeoutMillis;
    }

    public MemcachedClientConfig getMemcachedClientConfig() throws ServiceException {
        XMLElement req = new XMLElement(AdminConstants.GET_MEMCACHED_CLIENT_CONFIG_REQUEST);
        Element resp = invoke(req);
        MemcachedClientConfig config = new MemcachedClientConfig();
        config.serverList = resp.getAttribute(AdminConstants.A_MEMCACHED_CLIENT_CONFIG_SERVER_LIST, null);
        config.hashAlgorithm = resp.getAttribute(AdminConstants.A_MEMCACHED_CLIENT_CONFIG_HASH_ALGORITHM, null);
        config.binaryProtocol = resp.getAttributeBool(AdminConstants.A_MEMCACHED_CLIENT_CONFIG_BINARY_PROTOCOL, false);
        config.defaultExpirySeconds = (int) resp.getAttributeLong(AdminConstants.A_MEMCACHED_CLIENT_CONFIG_DEFAULT_EXPIRY_SECONDS, 0);
        config.defaultTimeoutMillis = resp.getAttributeLong(AdminConstants.A_MEMCACHED_CLIENT_CONFIG_DEFAULT_TIMEOUT_MILLIS, 0);
        return config;
    }

    @Override
    public void publishShareInfo(DistributionList dl,
            PublishShareInfoAction action, Account ownerAcct,
            String folderIdOrPath)
    throws ServiceException {
        DistributionListSelector dlSel =
                DistributionListSelector.fromId(dl.getId());
        ShareInfoSelector shareSel = new ShareInfoSelector(
                PublishShareInfoAction.toJaxb(action),
                PublishFolderInfo.fromPathOrId(folderIdOrPath),
                AccountSelector.fromId(ownerAcct.getId()));
        invokeJaxb(new PublishShareInfoRequest(dlSel, shareSel));
    }

    @Override
    public void getPublishedShareInfo(DistributionList dl, Account ownerAcct,
            PublishedShareInfoVisitor visitor) throws ServiceException {
        GetPublishedShareInfoResponse rsp = invokeJaxb(
                new GetPublishedShareInfoRequest(
                        DistributionListSelector.fromId(dl.getId()),
                        AccountSelector.fromId(ownerAcct.getId())));
        for (com.zimbra.soap.admin.type.ShareInfo sInfo : rsp.getShareInfos()) {
            ShareInfoData sid = ShareInfoData.fromJaxbShareInfo(sInfo);
            visitor.visit(sid);
        }
    }

    @Override
    public void getShareInfo(Account ownerAcct,
            PublishedShareInfoVisitor visitor)
    throws ServiceException {
        GetShareInfoResponse rsp = invokeJaxb(
                new GetShareInfoRequest(
                        AccountSelector.fromId(ownerAcct.getId())));
        for (com.zimbra.soap.admin.type.ShareInfo sInfo : rsp.getShareInfos()) {
            ShareInfoData sid = ShareInfoData.fromJaxbShareInfo(sInfo);
            visitor.visit(sid);
        }
    }
    
    
    @Override
    public Map<String, Map<String, Object>> getDomainSMIMEConfig(Domain domain, String configName) throws ServiceException {
        XMLElement req = new XMLElement(AdminConstants.GET_SMIME_CONFIG_REQUEST);
        
        Element eDomain = req.addElement(AdminConstants.E_DOMAIN);
        eDomain.addAttribute(AdminConstants.A_BY, AdminConstants.BY_ID).setText(domain.getId());
        
        if (configName != null) {
            Element eConfig = req.addElement(AdminConstants.E_CONFIG);
            eConfig.addAttribute(AdminConstants.A_NAME, configName);
        }
        
        Element resp = invoke(req);
        Map<String, Map<String, Object>> result = new HashMap<String, Map<String, Object>>();
        for (Element eConfig : resp.listElements(AdminConstants.E_CONFIG)) {
            result.put(eConfig.getAttribute(AdminConstants.A_NAME), getAttrs(eConfig));
        }
        
        return result;
    }
    
    @Override
    public void modifyDomainSMIMEConfig(Domain domain, String configName, Map<String, Object> attrs) throws ServiceException {
        XMLElement req = new XMLElement(AdminConstants.MODIFY_SMIME_CONFIG_REQUEST);
        
        Element eDomain = req.addElement(AdminConstants.E_DOMAIN);
        eDomain.addAttribute(AdminConstants.A_BY, AdminConstants.BY_ID).setText(domain.getId());
        
        Element eConfig = req.addElement(AdminConstants.E_CONFIG);
        eConfig.addAttribute(AdminConstants.A_NAME, configName);
        eConfig.addAttribute(AdminConstants.A_OP, AdminConstants.OP_MODIFY);
        
        addAttrElements(eConfig, attrs);
        
        invoke(req);
    }
    
    @Override
    public void removeDomainSMIMEConfig(Domain domain, String configName) throws ServiceException {
        XMLElement req = new XMLElement(AdminConstants.MODIFY_SMIME_CONFIG_REQUEST);
        
        Element eDomain = req.addElement(AdminConstants.E_DOMAIN);
        eDomain.addAttribute(AdminConstants.A_BY, AdminConstants.BY_ID).setText(domain.getId());
        
        Element eConfig = req.addElement(AdminConstants.E_CONFIG);
        eConfig.addAttribute(AdminConstants.A_NAME, configName);
        eConfig.addAttribute(AdminConstants.A_OP, AdminConstants.OP_REMOVE);
        
        invoke(req);
    }

    @Override
    public Map<String, Map<String, Object>> getConfigSMIMEConfig(String configName) throws ServiceException {
        XMLElement req = new XMLElement(AdminConstants.GET_SMIME_CONFIG_REQUEST);
        
        if (configName != null) {
            Element eConfig = req.addElement(AdminConstants.E_CONFIG);
            eConfig.addAttribute(AdminConstants.A_NAME, configName);
        }
        
        Element resp = invoke(req);
        Map<String, Map<String, Object>> result = new HashMap<String, Map<String, Object>>();
        for (Element eConfig : resp.listElements(AdminConstants.E_CONFIG)) {
            result.put(eConfig.getAttribute(AdminConstants.A_NAME), getAttrs(eConfig));
        }
        
        return result;
    }

    
    @Override
    public void modifyConfigSMIMEConfig(String configName, Map<String, Object> attrs) throws ServiceException {
        XMLElement req = new XMLElement(AdminConstants.MODIFY_SMIME_CONFIG_REQUEST);
        
        Element eConfig = req.addElement(AdminConstants.E_CONFIG);
        eConfig.addAttribute(AdminConstants.A_NAME, configName);
        eConfig.addAttribute(AdminConstants.A_OP, AdminConstants.OP_MODIFY);
        
        addAttrElements(eConfig, attrs);
        
        invoke(req);
    }
    
    @Override
    public void removeConfigSMIMEConfig(String configName) throws ServiceException {
        XMLElement req = new XMLElement(AdminConstants.MODIFY_SMIME_CONFIG_REQUEST);
        
        Element eConfig = req.addElement(AdminConstants.E_CONFIG);
        eConfig.addAttribute(AdminConstants.A_NAME, configName);
        eConfig.addAttribute(AdminConstants.A_OP, AdminConstants.OP_REMOVE);
        
        invoke(req);
    }

    public static void main(String[] args) throws Exception {
        CliUtil.toolSetup();

        SoapProvisioning prov = new SoapProvisioning();
        prov.soapSetURI("https://localhost:7071/service/admin/soap/");
        prov.soapZimbraAdminAuthenticate();

        Map<String, Object> acctAttrs = new HashMap<String, Object>();
        // acctAttrs.put("zimbraForeignPrincipal", null);
        acctAttrs.put("zimbraForeignPrincipal", new String[0]);
        // acctAttrs.put("zimbraForeignPrincipal", new String[]{"aaa", "bbb"});
        Account acct = prov.get(AccountBy.name, "user1");
        prov.modifyAttrs(acct, acctAttrs);
    }
}
