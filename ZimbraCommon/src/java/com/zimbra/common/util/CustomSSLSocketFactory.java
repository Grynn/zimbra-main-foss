/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2006, 2007 Zimbra, Inc.
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
package com.zimbra.common.util;

import java.io.IOException;
import java.net.InetAddress;
import java.net.Socket;
import java.security.GeneralSecurityException;

import javax.net.SocketFactory;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;

/**
 * Override SSLSocketFactory to provide a createSocket() interface
 *  
 * @author jjzhuang
 */
public class CustomSSLSocketFactory extends SSLSocketFactory {
    private SSLSocketFactory factory;
    
    boolean verifyHostname = true;
    
    public CustomSSLSocketFactory(boolean verifyHostname)  throws GeneralSecurityException {
        SSLContext sslcontext = SSLContext.getInstance("TLS");
        sslcontext.init(null, new TrustManager[] { CustomTrustManager.getInstance() }, null);
        factory = sslcontext.getSocketFactory();
        this.verifyHostname = verifyHostname;
    }
    
    public CustomSSLSocketFactory() throws GeneralSecurityException {
    	this(true);
    }
    
    @Override
    public Socket createSocket() throws IOException {
    	//unfortunately javamail smtp still uses it
    	return factory.createSocket();
    }
    
    @Override
    public Socket createSocket(InetAddress address, int port) throws IOException {
    	SSLSocket sslSocket = (SSLSocket)factory.createSocket(address, port);
    	if (verifyHostname)
    		CustomSSLSocketUtil.checkCertificate(address.getHostName(), sslSocket);
    	return sslSocket;
    }
    
    @Override
    public Socket createSocket(InetAddress address, int port, InetAddress localAddress, int localPort) throws IOException {
    	SSLSocket sslSocket = (SSLSocket)factory.createSocket(address, port, localAddress, localPort);
    	if (verifyHostname)
    		CustomSSLSocketUtil.checkCertificate(address.getHostName(), sslSocket);
    	return sslSocket;
    }

    @Override
    public Socket createSocket(String host, int port) throws IOException {
    	SSLSocket sslSocket = (SSLSocket)factory.createSocket(host, port);
    	if (verifyHostname)
    		CustomSSLSocketUtil.checkCertificate(host, sslSocket);
    	return sslSocket;
    }
    
    @Override
    public Socket createSocket(String host, int port, InetAddress localHost, int localPort) throws IOException {
    	SSLSocket sslSocket = (SSLSocket)factory.createSocket(host, port, localHost, localPort);
    	if (verifyHostname)
    		CustomSSLSocketUtil.checkCertificate(host, sslSocket);
    	return sslSocket;
    }
    
    @Override
    public Socket createSocket(Socket socket, String host, int port, boolean flag) throws IOException {
    	SSLSocket sslSocket = (SSLSocket)factory.createSocket(socket, host, port, flag);
    	if (verifyHostname)
    		CustomSSLSocketUtil.checkCertificate(host, sslSocket);
    	return sslSocket;
    }

    public static SocketFactory getDefault() {
    	try {
    		return new CustomSSLSocketFactory();
    	} catch (GeneralSecurityException x) {
    		ZimbraLog.security.error(x);
    		return null;
    	}
    }
    
    @Override
    public String[] getDefaultCipherSuites() {
        return factory.getDefaultCipherSuites();
    }

    @Override
    public String[] getSupportedCipherSuites() {
        return factory.getSupportedCipherSuites();
    }
}