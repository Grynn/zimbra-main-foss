/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2009 Zimbra, Inc.
 * 
 * The contents of this file are subject to the Yahoo! Public License
 * Version 1.0 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * ***** END LICENSE BLOCK *****
 */
package com.zimbra.cs.gal;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Iterator;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.Element;
import com.zimbra.common.soap.MailConstants;
import com.zimbra.cs.account.GalContact;
import com.zimbra.cs.account.Provisioning.SearchGalResult;
import com.zimbra.cs.mailbox.Contact;
import com.zimbra.cs.service.mail.ToXML;
import com.zimbra.cs.service.util.ItemIdFormatter;

public class GalSearchResultCallback implements GalContact.Visitor {
    private Element mResponse;
	private ItemIdFormatter mFormatter;
    
    public GalSearchResultCallback(GalSearchParams params) {
    	reset(params);
    }
    
    public void reset(GalSearchParams params) {
    	if (params.getSoapContext() != null) {
    		mResponse = params.getSoapContext().createElement(params.getResponseName());
        	mFormatter = new ItemIdFormatter(params.getSoapContext());
    	}
    	params.setGalResult(SearchGalResult.newSearchGalResult(this));
    }
    
    public void visit(GalContact c) throws ServiceException {
    	handleContact(c);
    }
    
    public Element getResponse() {
    	return mResponse;
    }
    
    public void handleContact(Contact c) throws ServiceException {
		ToXML.encodeContact(mResponse, mFormatter, c, true, null);
    }
    
    public void handleContact(GalContact c) throws ServiceException {
		ToXML.encodeGalContact(mResponse, c);
    }
    
    public void handleElement(Element e) throws ServiceException {
    	mResponse.addElement(e.detach());
    }
    
    protected HashMap<String,Object> parseContactElement(Element e) {
    	HashMap<String,Object> map = new HashMap<String,Object>();
    	Iterator<Element> iter = e.elementIterator(MailConstants.E_ATTRIBUTE);
    	while (iter.hasNext()) {
    		Element elem = iter.next();
    		String key = elem.getAttribute(MailConstants.A_ATTRIBUTE_NAME, null);
    		String value = elem.getText();
    		if (key == null)
    			continue;
    		Object obj = map.get(key);
    		if (obj != null) {
    			if (obj instanceof String) {
    				String[] str = new String[2];
    				str[0] = (String)obj;
    				str[1] = value;
    				map.put(key, str);
    			} else if (obj instanceof String[]) {
    				ArrayList<String> arr = new ArrayList<String>();
    				arr.addAll(Arrays.asList((String[])obj));
    				arr.add(value);
    				map.put(key, arr.toArray(new String[0]));
    			}
    		} else {
    			map.put(key, value);
    		}
    	}
    	return map;
    }
    public void setNewToken(String newToken) {
    	mResponse.addAttribute(MailConstants.A_TOKEN, newToken);
    }
    public void setSortBy(String sortBy) {
        mResponse.addAttribute(MailConstants.A_SORTBY, sortBy);
    }
    public void setQueryOffset(int offset) {
        mResponse.addAttribute(MailConstants.A_QUERY_OFFSET, offset);
    }
    public void setHasMoreResult(boolean more) {
        mResponse.addAttribute(MailConstants.A_QUERY_MORE, more);
    }
}
