/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2007 Zimbra, Inc.
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

package com.zimbra.cs.pop3;

import com.zimbra.common.util.Log;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.security.sasl.Authenticator;
import com.zimbra.cs.security.sasl.AuthenticatorUser;

import java.io.IOException;

class Pop3AuthenticatorUser implements AuthenticatorUser {
    private final Pop3Handler mHandler;

    Pop3AuthenticatorUser(Pop3Handler handler) {
        mHandler = handler;
    }
    
    public String getProtocol() { return "pop"; }

    public void sendBadRequest(String s) throws IOException {
        mHandler.sendERR(s);
    }

    public void sendFailed(String s) throws IOException {
        mHandler.sendERR(s);
    }

    public void sendSuccessful(String s) throws IOException {
        mHandler.sendOK(s);
    }

    public void sendContinuation(String s) throws IOException {
        mHandler.sendContinuation(s);
    }

    public boolean authenticate(String authorizationId,
                                String authenticationId,
                                String password,
                                Authenticator auth) throws IOException {
        try {
            mHandler.authenticate(authenticationId, password, auth.getMechanism());
        } catch (Pop3CmdException e) {
            auth.sendFailed(e.getMessage());
            return false;
        }
        return true;
    }

    public Log getLog() { return ZimbraLog.pop; }

    public boolean isSSLEnabled() { return mHandler.isSSLEnabled(); }
}
