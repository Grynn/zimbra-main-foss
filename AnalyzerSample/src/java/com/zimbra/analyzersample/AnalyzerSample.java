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
 * Portions created by Zimbra are Copyright (C) 2005, 2006 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s): 
 * 
 * ***** END LICENSE BLOCK *****
 */

package com.zimbra.analyzersample;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import com.zimbra.cs.extension.ZimbraExtension;
import com.zimbra.cs.index.ZimbraAnalyzer;
import com.zimbra.cs.service.ServiceException;

public class AnalyzerSample implements ZimbraExtension {

    private static Log sLog = LogFactory.getLog(AnalyzerSample.class);

    public AnalyzerSample() {
    }

    public synchronized void init() {
        sLog.info("Initializing "+getName());
        try {
            ZimbraAnalyzer.registerAnalyzer(getName(), new Analyzer());
        } catch (ServiceException e) {
            sLog.error("Error while registering extension "+getName(), e);
        }
    }            

    public synchronized void destroy() {
        sLog.info("Destroying "+getName());
        ZimbraAnalyzer.unregisterAnalyzer(getName());
    }

    public String getName() {
        return "AnalyzerSample";
    }
}
