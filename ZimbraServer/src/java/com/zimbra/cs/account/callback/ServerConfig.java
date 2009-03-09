/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2004, 2005, 2006 Zimbra, Inc.
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
package com.zimbra.cs.account.callback;

import java.util.Map;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.account.AttributeCallback;
import com.zimbra.cs.account.Entry;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.mailbox.MessageCache;
import com.zimbra.cs.store.FileBlobStore;

/**
 * Central place for updating server attributes that we cache in memory.
 */
public class ServerConfig extends AttributeCallback {

    @Override
    public void postModify(Map context, String attrName, Entry entry,
                           boolean isCreate) {
        try {
            if (attrName.equals(Provisioning.A_zimbraMailDiskStreamingThreshold) ||
                attrName.equals(Provisioning.A_zimbraMailUncompressedCacheMaxBytes) ||
                attrName.equals(Provisioning.A_zimbraMailUncompressedCacheMaxFiles)) {
                FileBlobStore.loadSettings();
            } else if (attrName.equals(Provisioning.A_zimbraMessageCacheSize)) {
                MessageCache.loadSettings();
            }
        } catch (ServiceException e) {
            ZimbraLog.account.warn("Unable to update %s.", attrName, e);
        }
    }

    @Override
    public void preModify(Map context, String attrName, Object attrValue,
                          Map attrsToModify, Entry entry, boolean isCreate)
    throws ServiceException {
    }

}
