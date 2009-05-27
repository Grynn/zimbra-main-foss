/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2004, 2005, 2006, 2007, 2008, 2009 Zimbra, Inc.
 * 
 * The contents of this file are subject to the Yahoo! Public License
 * Version 1.0 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * ***** END LICENSE BLOCK *****
 */

/*
 * SoapHttpTransport.java
 */

package com.zimbra.common.soap;

import java.io.IOException;
import java.io.InputStreamReader;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.commons.httpclient.Cookie;
import org.apache.commons.httpclient.DefaultHttpMethodRetryHandler;
import org.apache.commons.httpclient.Header;
import org.apache.commons.httpclient.HostConfiguration;
import org.apache.commons.httpclient.HttpClient;
import org.apache.commons.httpclient.HttpException;
import org.apache.commons.httpclient.HttpState;
import org.apache.commons.httpclient.HttpVersion;
import org.apache.commons.httpclient.UsernamePasswordCredentials;
import org.apache.commons.httpclient.auth.AuthScope;
import org.apache.commons.httpclient.cookie.CookiePolicy;
import org.apache.commons.httpclient.methods.PostMethod;
import org.apache.commons.httpclient.methods.StringRequestEntity;
import org.apache.commons.httpclient.params.HttpMethodParams;
import org.apache.commons.httpclient.URI;
import org.dom4j.ElementHandler;

import com.zimbra.common.localconfig.LC;
import com.zimbra.common.util.ByteUtil;
import com.zimbra.common.util.RemoteIP;
import com.zimbra.common.util.ZimbraHttpConnectionManager;

public class SoapHttpTransport extends SoapTransport {
    private HttpClient mClient = ZimbraHttpConnectionManager.getInternalHttpConnMgr().getDefaultHttpClient();
    private Map<String, String> mCustomHeaders;
    private HostConfiguration mHostConfig = null;
    private HttpDebugListener mHttpDebugListener;
    private boolean mKeepAlive = keepAlive;
    private int mRetryCount = retryCount;
    private int mTimeout = timeout;
    private String mUri;
    private URI mURI;
    private static boolean keepAlive = LC.httpclient_connmgr_keepalive_connections.booleanValue();
    private static int retryCount = LC.httpclient_connmgr_retry_count.intValue();
    private static int timeout = LC.httpclient_connmgr_so_timeout.intValue();
    
    public interface HttpDebugListener {
        public void sendSoapMessage(PostMethod postMethod, Element envelope);
        public void receiveSoapMessage(PostMethod postMethod, Element envelope);
    }
    
    public String toString() { 
        return "SoapHTTPTransport(uri="+mUri+")";
    }

    /**
     * Create a new SoapHttpTransport object for the specified URI.
     * Supported schemes are http and https. The connection
     * is not made until invoke or connect is called.
     *
     * Multiple threads using this transport must do their own
     * synchronization.
     */
    public SoapHttpTransport(String uri) {
    	this(uri, null, 0);
    }
    
    /**
     * Create a new SoapHttpTransport object for the specified URI, with specific
     *  proxy information.
     * 
     * @param uri the origin server URL
     * @param proxyHost hostname of proxy
     * @param proxyPort port of proxy
     */
    public SoapHttpTransport(String uri, String proxyHost, int proxyPort) {
    	this(uri, proxyHost, proxyPort, null, null);
    }
    
    /**
     * Create a new SoapHttpTransport object for the specified URI, with specific
     *  proxy information including proxy auth credentials.
     * 
     * @param uri the origin server URL
     * @param proxyHost hostname of proxy
     * @param proxyPort port of proxy
     * @param proxyUser username for proxy auth
     * @param proxyPass password for proxy auth
     */
    public SoapHttpTransport(String uri, String proxyHost, int proxyPort,
        String proxyUser, String proxyPass) {
    	super();
        mUri = uri;
        try {
            mURI = new URI(uri, false);
        } catch (Exception e) {
        }
    	if (proxyHost != null && proxyHost.length() > 0 && proxyPort > 0) {
    	    mHostConfig = new HostConfiguration();
            mHostConfig.setHost(mURI);
            mHostConfig.setProxy(proxyHost, proxyPort);
    	    if (proxyUser != null && proxyUser.length() > 0 && proxyPass != null &&
    	        proxyPass.length() > 0) {
    	        mClient = ZimbraHttpConnectionManager.getInternalHttpConnMgr().newHttpClient();
    	        mClient.getState().setProxyCredentials(new AuthScope(proxyHost, proxyPort),
    	            new UsernamePasswordCredentials(proxyUser, proxyPass));
    	    }
    	}
    }

    public void setHttpDebugListener(HttpDebugListener listener) {
        mHttpDebugListener = listener;
    }

    public HttpDebugListener getHttpDebugListener() {
        return mHttpDebugListener;
    }

    /**
     * Frees any resources such as connection pool held by this transport.
     */
    public void shutdown() {
        if (mClient != null && mClient != ZimbraHttpConnectionManager.getInternalHttpConnMgr().getDefaultHttpClient()) {
            mClient.getHttpConnectionManager().closeIdleConnections(0);
            mClient = null;
            mHostConfig = null;
        }
    }
    
    public Map<String, String> getCustomHeaders() {
        if (mCustomHeaders == null)
            mCustomHeaders = new HashMap<String, String>();
        return mCustomHeaders;
    }

    /**
     * Whether to use HTTP keep-alive connections 
     *
     * <p> Default value is <code>true</code>.
     */
    public void setKeepAlive(boolean keepAlive) {
        mKeepAlive = keepAlive;
    }

   
    /**
     * The number of times the invoke method retries 
     *
     * <p> Default value is <code>1</code>.
     */
    public void setRetryCount(int newRetryCount) {
        mRetryCount = newRetryCount < 0 ? retryCount : newRetryCount;
    }

    /**
     * Get the mRetryCount value.
     */
    public int getRetryCount() {
        return mRetryCount;
    }

    /**
     * Sets the number of milliseconds to wait when connecting or reading
     * during a invoke call. 
     */
    public void setTimeout(int newTimeout) {
        mTimeout = newTimeout < 0 ? timeout : newTimeout;
    }

    /**
     * Get the mTimeout value in milliseconds.  The default is <tt>60000</tt>,
     * specified by the <tt>httpclient_connmgr_so_timeout</tt> localconfig variable.
     */
    public int getTimeout() {
        return mTimeout;
    }
    
    /**
     *  Gets the URI
     */
    public String getURI() {
        return mUri;
    }

    public Element invoke(Element document, boolean raw, boolean noSession,
        String requestedAccountId, String changeToken, String tokenType) 
        throws SoapFaultException, IOException, HttpException {
        return invoke(document, raw, noSession, requestedAccountId, changeToken,
            tokenType, null);
    }
    
    public Element invoke(Element document, boolean raw, boolean noSession,
        String requestedAccountId, String changeToken, String tokenType,
        Map<String, ElementHandler> saxHandlers) throws SoapFaultException,
        IOException, HttpException {
        Map<String, String> cookieMap = getAuthToken() == null ? null :
            getAuthToken().cookieMap(false);
        HttpState state = null;
        PostMethod method = null;
        
        try {
            // Assemble post method.  Append document name, so that the request
            // type is written to the access log.
            String uri = mUri;
            
            if (!uri.endsWith("/"))
                uri += '/';
            uri += getDocumentName(document);
            method = new PostMethod(uri);
            
            // Set user agent if it's specified.
            String agentName = getUserAgentName();
            
            if (agentName != null) {
                String agentVersion = getUserAgentVersion();
                
                if (agentVersion != null)
                    agentName += " " + agentVersion;
                method.setRequestHeader(new Header("User-Agent", agentName));
            }            

            // the content-type charset will determine encoding used
            // when we set the request body
            method.setRequestHeader("Content-Type",
                getRequestProtocol().getContentType());
            if (getClientIp() != null)
                method.setRequestHeader(RemoteIP.X_ORIGINATING_IP_HEADER, getClientIp());

            Element soapReq = generateSoapMessage(document, raw, noSession,
                requestedAccountId, changeToken, tokenType);
            String soapMessage = SoapProtocol.toString(soapReq, getPrettyPrint());
            HttpMethodParams params = method.getParams();
            
            method.setRequestEntity(new StringRequestEntity(soapMessage, null, "UTF-8"));
    	
            if (getRequestProtocol().hasSOAPActionHeader())
                method.setRequestHeader("SOAPAction", mUri);

            if (mCustomHeaders != null) {
                for (Map.Entry<String, String> entry : mCustomHeaders.entrySet())
                    method.setRequestHeader(entry.getKey(), entry.getValue());
            }
            
            if (cookieMap != null) {
                for (Map.Entry<String, String> ck : cookieMap.entrySet()) {
                    if (state == null)
                        state = new HttpState();
                    state.addCookie(new Cookie(method.getURI().getHost(),
                        ck.getKey(), ck.getValue(), "/", null, false));
                }
            }

            if (mHttpDebugListener != null)
                mHttpDebugListener.sendSoapMessage(method, soapReq);
            
            params.setCookiePolicy(state == null ? CookiePolicy.IGNORE_COOKIES :
                CookiePolicy.BROWSER_COMPATIBILITY);
            params.setParameter(HttpMethodParams.RETRY_HANDLER,
                new DefaultHttpMethodRetryHandler(mRetryCount - 1, true));
            params.setSoTimeout(mTimeout);
            params.setVersion(HttpVersion.HTTP_1_1);
            method.setRequestHeader("Connection", mKeepAlive ? "Keep-alive" :
                "Close");

            mClient.executeMethod(mHostConfig, method, state);

            // Read the response body.  Use the stream API instead of the byte[]
            // version to avoid HTTPClient whining about a large response.        
            InputStreamReader reader = new InputStreamReader(
                method.getResponseBodyAsStream(), SoapProtocol.getCharset());
            String responseStr = "";
            
            try {
                if (saxHandlers != null) {
                    parseLargeSoapResponse(reader, saxHandlers);
                    return null;
                } else {
                    responseStr = ByteUtil.getContent(reader,
                        (int)method.getResponseContentLength(), false);
                    Element soapResp = parseSoapResponse(responseStr, raw);
                    
                    if (mHttpDebugListener != null)
                        mHttpDebugListener.receiveSoapMessage(method, soapResp);
                    return soapResp;
                }
            } catch (SoapFaultException x) {
            	// attach request/response to the exception and rethrow
            	x.setFaultRequest(soapMessage);
            	x.setFaultResponse(responseStr.substring(0, Math.min(10240,
            	    responseStr.length())));
            	throw x;
            }
        } finally {
            // Release the connection.
            if (method != null)
                method.releaseConnection();    
            if (!mKeepAlive)
                mClient.getHttpConnectionManager().closeIdleConnections(0);
        }
    }
    
    /**
     * Returns the document name.  If the given document is an <tt>Envelope</tt>
     * element, returns the name of the first child of the <tt>Body</tt> subelement.
     */
    private String getDocumentName(Element document) {
        if (document == null || document.getName() == null) {
            return null;
        }
        String name = document.getName();
        if (name.equals("Envelope")) {
            Element body = document.getOptionalElement("Body");
            if (body != null) {
                List<Element> children = body.listElements(); 
                if (children.size() > 0) {
                    name = children.get(0).getName();
                }
            }
        }
        return name;
    }
}

