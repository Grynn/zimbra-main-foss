/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: ZPL 1.1
 * 
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.1 ("License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.zimbra.com/license
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is: Zimbra Collaboration Suite.
 * 
 * The Initial Developer of the Original Code is Zimbra, Inc.
 * Portions created by Zimbra are Copyright (C) 2005 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s): 
 * 
 * ***** END LICENSE BLOCK *****
 */
package com.zimbra.cs.account.ldap;

import java.util.HashMap;
import java.util.Map;

import javax.naming.directory.Attributes;

import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.Zimlet;
import com.zimbra.cs.object.ObjectType;
import com.zimbra.cs.service.ServiceException;
import com.zimbra.cs.zimlet.ZimletHandler;
import com.zimbra.cs.zimlet.ZimletUtil;

public class LdapZimlet extends LdapNamedEntry implements Zimlet, ObjectType {

	public LdapZimlet(String dn, Attributes attrs) {
		super(dn, attrs);
	}
	
	public String getName() {
		return getType();
	}
	
	public String getId() {
		return getType();
	}
	
    public String getType() {
        return getAttr(Provisioning.A_cn);
    }
    
    public String getDescription() {
        return getAttr(Provisioning.A_zimbraZimletDescription);
    }
    
    public boolean isIndexingEnabled() {
        return getBooleanAttr(Provisioning.A_zimbraZimletIndexingEnabled, false);
    }
    
    public boolean isStoreMatched() {
        return false;
    }
    
    public String getHandlerClassName() {
        return getAttr(Provisioning.A_zimbraZimletHandlerClass);
    }
    
    public ZimletHandler getHandler() {
    	return ZimletUtil.getHandler(getName());
    }
    
    public String getHandlerConfig() {
        return getAttr(Provisioning.A_zimbraZimletHandlerConfig);
    }

    public String getServerIndexRegex() {
    	return getAttr(Provisioning.A_zimbraZimletServerIndexRegex);
    }

    public boolean isEnabled() {
    	return getBooleanAttr(Provisioning.A_zimbraZimletEnabled, false);
    }

    public void setEnabled(boolean enabled) throws ServiceException {
    	Map attr = new HashMap();
    	String val = LdapUtil.LDAP_FALSE;
    	if (enabled) {
    		val = LdapUtil.LDAP_TRUE;
    	}
    	attr.put(Provisioning.A_zimbraZimletEnabled, val);
   		modifyAttrs(attr);
    }
    
    public int getPriority() {
    	return getIntAttr(Provisioning.A_zimbraZimletPriority, -1);
    }
    
    public void setPriority(int priority) throws ServiceException {
    	Map attr = new HashMap();
    	attr.put(Provisioning.A_zimbraZimletPriority, Integer.toString(priority));
    	modifyAttrs(attr);
    }
}
