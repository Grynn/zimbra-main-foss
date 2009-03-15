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

import com.zimbra.cs.account.DataSource;

public class LiveBean extends XmailBean {
    public static final String Domain = "hotmail.com";

    public LiveBean() {}

    @Override
    protected void doRequest() {
	domain = Domain;
        type = DataSource.Type.live.toString();
        if (verb != null && (verb.isAdd() || verb.isModify())) {
            if (!isEmpty(email) && email.indexOf('@') < 0)
                email += '@' + domain;
	    username = email;
        }
        host = "www.hotmail.com";
        isSsl = false;
        port = "80";
        super.doRequest();
    }

    public boolean isContactSyncSupported() {
	return true;
    }

    public boolean isFolderSyncSupported() {
	return true;
    }

    public boolean isServerConfigSupported() {
	return false;
    }

    public boolean isSmtpConfigSupported() {
	return false;
    }

    public boolean isUsernameRequired() {
	return false;
    }
}

