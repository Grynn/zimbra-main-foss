/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 ("License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.zimbra.com/license
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 *
 * The Original Code is: Zimbra Collaboration Suite Server.
 *
 * The Initial Developer of the Original Code is Zimbra, Inc.
 * Portions created by Zimbra are Copyright (C) 2004, 2005, 2006 Zimbra, Inc.
 * All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK *****
 */

package com.zimbra.cs.lmtpserver;

import com.zimbra.cs.server.ServerConfig;
import com.zimbra.cs.account.Server;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.common.service.ServiceException;

import static com.zimbra.cs.account.Provisioning.*;

public class LmtpConfig extends ServerConfig {
    private String m220Greeting;
    private String m221Goodbye;
    private String m421Error;
    private String mRecipientDelimiter;
    private LmtpBackend mBackend;

    private static final int DEFAULT_MAX_IDLE_SECONDS = 300;
    
    public LmtpConfig() {}

    public LmtpConfig(Provisioning provisioning) throws ServiceException {
        Server server = provisioning.getLocalServer();
        String name = server.getAttr(A_zimbraLmtpAdvertisedName);
        if (name != null && name.length() > 0) setName(name);
        // TODO get this from configuration
        setMaxIdleSeconds(DEFAULT_MAX_IDLE_SECONDS);
        setNumThreads(server.getIntAttr(A_zimbraLmtpNumThreads, -1));
        setBindPort(server.getIntAttr(A_zimbraLmtpBindPort, -1));
        setBindAddress(server.getAttr(A_zimbraLmtpBindAddress));
        setRecipientDelimiter(
            provisioning.getConfig().getAttr(A_zimbraMtaRecipientDelimiter));
        setLmtpBackend(new ZimbraLmtpBackend());
        validate();
    }

    @Override
    public void validate() throws ServiceException {
        if (getNumThreads() < 0) {
            failure("invalid value " + getNumThreads() + " for " +
                    A_zimbraLmtpNumThreads);
        }
        if (getBindPort() < 0) {
            failure("invalid value " + getBindPort() + " for " +
                    A_zimbraLmtpBindPort);
        }
        if (getRecipientDelimiter() == null) {
            failure("missing recipient delimiter");
        }
        if (getLmtpBackend() == null) {
            failure("missing lmtp backend");
        }
        super.validate();
    }

    @Override
    public void setName(String name) {
        super.setName(name);
        m220Greeting = "220 " + name + " Zimbra LMTP ready";
        m221Goodbye = "221 " + name + " closing connection";
        m421Error = "421 4.3.2 " + name + " Service not available, closing " +
                    "transmission channel";
    }
    
    public String get421Error() { return m421Error; }
    public String get220Greeting() { return m220Greeting; }
    public String get221Goodbye() { return m221Goodbye; }
    public String getRecipientDelimiter() { return mRecipientDelimiter; }
    
    public void setRecipientDelimiter(String delimiter) {
        mRecipientDelimiter = delimiter;
    }
    
    public LmtpBackend getLmtpBackend() { return mBackend; }
    
    public void setLmtpBackend(LmtpBackend backend) {
        mBackend = backend;
    }
}
