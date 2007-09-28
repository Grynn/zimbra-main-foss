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
package com.zimbra.cs.im;

import java.util.Formatter;

import com.zimbra.common.util.ZimbraLog;
import com.zimbra.common.soap.IMConstants;
import com.zimbra.common.soap.Element;

/**
 * Someone is trying to add us to their buddy list
 */
public class IMSubscribeNotification extends IMNotification {
    IMAddr mFromAddr;
    
    IMSubscribeNotification(IMAddr fromAddr) {
        mFromAddr = fromAddr;
    }
    
    public String toString() {
        return new Formatter().format("IMSubscribeNotification: From: %s", mFromAddr).toString();
    }

    public Element toXml(Element parent) {
        ZimbraLog.im.debug(this.toString());
        Element toRet = create(parent, IMConstants.E_SUBSCRIBE);
        toRet.addAttribute(IMConstants.A_FROM, mFromAddr.getAddr());
        return toRet;
    }
}
