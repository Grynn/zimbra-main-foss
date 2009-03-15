/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2008 Zimbra, Inc.
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
package com.zimbra.cs.offline.jsp;

import javax.servlet.http.HttpServlet;

public class ConfigServlet extends HttpServlet {

	private static final long serialVersionUID = 8124246834674440988L;

    private static final String LOCALHOST_URL_PREFIX = "http://localhost:";
    
    public static String LOCALHOST_SOAP_URL;
    public static String LOCALHOST_ADMIN_URL;
    
	@Override
	public void init() {
		int port = Integer.parseInt(getServletConfig().getInitParameter("port"));
		int adminPort = Integer.parseInt(getServletConfig().getInitParameter("adminPort"));
		
		//setting static variables
		LOCALHOST_SOAP_URL = LOCALHOST_URL_PREFIX + port + "/service/soap/";
		LOCALHOST_ADMIN_URL = LOCALHOST_URL_PREFIX + adminPort + "/service/admin/soap/";
    }
}
