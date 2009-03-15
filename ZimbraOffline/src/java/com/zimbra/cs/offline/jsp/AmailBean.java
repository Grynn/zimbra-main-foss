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

public class AmailBean extends ImapBean {
    public static final String Domain = "aol.com";

    public AmailBean() {}

    @Override
    protected void doRequest() {
	domain = Domain;
	if (verb != null && (verb.isAdd() || verb.isModify()) && !isEmpty(email)) {
	    if (email.indexOf('@') < 0)
		email += '@' + domain;
	    if (email.endsWith("@" + domain))
		username = email.substring(0, email.length() - 1 -  domain.length());
            else
		addInvalid("email");
        }
	host = "imap.aol.com";
	isSsl = false;
	port = "143";

	smtpHost = "smtp.aol.com";
	smtpPort = "465";
	isSmtpSsl = true;
	isSmtpAuth = true;
	smtpUsername = username;
	smtpPassword = password;
	super.doRequest();
    }

    public boolean isServerConfigSupported() {
	return false;
    }

    public boolean isSmtpConfigSupported() {
	return false;
    }
}

