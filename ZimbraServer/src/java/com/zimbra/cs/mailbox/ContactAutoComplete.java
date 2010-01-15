/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2008, 2009 Zimbra, Inc.
 * 
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.2 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * ***** END LICENSE BLOCK *****
 */
package com.zimbra.cs.mailbox;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;

import com.zimbra.common.mailbox.ContactConstants;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.Element;
import com.zimbra.common.soap.MailConstants;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.GalContact;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.Provisioning.GAL_SEARCH_TYPE;
import com.zimbra.cs.gal.GalSearchControl;
import com.zimbra.cs.gal.GalSearchParams;
import com.zimbra.cs.gal.GalSearchResultCallback;
import com.zimbra.cs.index.ContactHit;
import com.zimbra.cs.index.ProxiedHit;
import com.zimbra.cs.index.SortBy;
import com.zimbra.cs.index.ZimbraHit;
import com.zimbra.cs.index.ZimbraQueryResults;
import com.zimbra.cs.index.queryparser.ParseException;
import com.zimbra.cs.service.util.ItemId;

public class ContactAutoComplete {
	public static class AutoCompleteResult {
		public Collection<ContactEntry> entries;
		public boolean canBeCached;
		public int limit;
		public AutoCompleteResult(int l) { 
			entries = new ArrayList<ContactEntry>(); 
			emails = new HashSet<String>();
			canBeCached = true;
			limit = l;
		}
		public void addEntry(ContactEntry entry) {
			if (entries.size() >= limit)
				return;
			String email;
			if (entry.isDlist())
				email = entry.mDisplayName;
			else
				email = entry.mEmail.toLowerCase();
			if (!emails.contains(email)) {
				entries.add(entry);
				emails.add(email);
			}
		}
		public void appendEntries(AutoCompleteResult result) {
		    for (ContactEntry entry : result.entries)
		        addEntry(entry);
		}
		private HashSet<String> emails;
	}
    public static class ContactEntry implements Comparable<ContactEntry> {
        String mEmail;
        String mDisplayName;
        String mLastName;
        String mDlist;
        ItemId mId;
        int mFolderId;
        int mRanking;
        long mLastAccessed;
        
        public String getEmail() {
        	if (mDlist != null)
        		return mDlist;
        	StringBuilder buf = new StringBuilder();
        	if (mDisplayName.length() > 0) {
        		buf.append("\"");
        		buf.append(mDisplayName);
        		buf.append("\" ");
        	}
        	buf.append("<").append(mEmail).append(">");
        	return buf.toString();
		}
        public ItemId getId() {
        	return mId;
        }
        public int getFolderId() {
        	return mFolderId;
        }
        public int getRanking() {
        	return mRanking;
        }
        public boolean isDlist() {
        	return mDlist != null;
        }
        public String getDisplayName() {
        	return mDisplayName;
        }
        void setName(String name) {
    		if (name == null)
    			name = "";
    		mDisplayName = name;
    		mLastName = "";
    		int space = name.lastIndexOf(' ');
    		if (space > 0)
    			mLastName = name.substring(space+1);
        }
        public int compareTo(ContactEntry that) {
        	int diff = this.mRanking - that.mRanking;
        	if (diff != 0)
            	return diff;
        	return this.mEmail.compareToIgnoreCase(that.mEmail);
        }
        public boolean equals(Object obj) {
        	if (obj instanceof ContactEntry)
        		return compareTo((ContactEntry)obj) == 0;
        	return false;
        }
        public String toString() {
        	StringBuilder buf = new StringBuilder();
        	toString(buf);
        	return buf.toString();
        }
        public void toString(StringBuilder buf) {
        	buf.append(mRanking).append(" ");
        	if (isDlist())
        		buf.append(getDisplayName()).append(" (dlist)");
        	else
        		buf.append(getEmail());
        	buf.append(" (").append(mFolderId).append(")");
        	buf.append(" ").append(new Date(mLastAccessed));
        }
	}
    
    public static final int FOLDER_ID_GAL = 0;
    public static final int FOLDER_ID_UNKNOWN = -1;
    
    private String mAccountId;
    private boolean mIncludeGal;
    private boolean mIncludeRankingResults;
    
    private static final byte[] CONTACT_TYPES = new byte[] { MailItem.TYPE_CONTACT };
    
    private boolean mIncludeSharedFolders;
    private Collection<String> mEmailKeys;
    
    private GAL_SEARCH_TYPE mSearchType;
    
	private static final String[] DEFAULT_EMAIL_KEYS = {
		ContactConstants.A_email, ContactConstants.A_email2, ContactConstants.A_email3
	};
	
	
	public ContactAutoComplete(String accountId) {
		Provisioning prov = Provisioning.getInstance();
		try {
			Account acct = prov.get(Provisioning.AccountBy.id, accountId);
			mIncludeSharedFolders = acct.getBooleanAttr(Provisioning.A_zimbraPrefSharedAddrBookAutoCompleteEnabled, false);
			String emailKeys = acct.getAttr(Provisioning.A_zimbraContactAutoCompleteEmailFields);
			if (emailKeys != null)
				mEmailKeys = Arrays.asList(emailKeys.split(","));
	        mIncludeGal = acct.getBooleanAttr(Provisioning.A_zimbraFeatureGalAutoCompleteEnabled , false) &&
	                acct.getBooleanAttr(Provisioning.A_zimbraFeatureGalEnabled , false) &&
	                acct.getBooleanAttr(Provisioning.A_zimbraPrefGalAutoCompleteEnabled , false);
		} catch (ServiceException se) {
			ZimbraLog.gal.warn("error initializing ContactAutoComplete", se);
		}
		mAccountId = accountId;
		if (mEmailKeys == null)
			mEmailKeys = Arrays.asList(DEFAULT_EMAIL_KEYS);
		mIncludeRankingResults = true;
		mSearchType = GAL_SEARCH_TYPE.USER_ACCOUNT;
	}
	
	public Collection<String> getEmailKeys() {
		return mEmailKeys;
	}
	public boolean includeGal() {
		return mIncludeGal;
	}
	public void setIncludeGal(boolean includeGal) {
		mIncludeGal = includeGal;
	}
	public void setIncludeRankingResults(boolean includeRankingResults) {
		mIncludeRankingResults = includeRankingResults;
	}
	public void setSearchType(GAL_SEARCH_TYPE type) {
	    mSearchType = type;
	}
	
	public AutoCompleteResult query(String str, Collection<Integer> folders, int limit) throws ServiceException {
		ZimbraLog.gal.debug("querying "+str);
		long t0 = System.currentTimeMillis();
		AutoCompleteResult result = new AutoCompleteResult(limit);
		if (limit <= 0)
			return result;
		
		if (mIncludeRankingResults)
			queryRankingTable(str, folders, limit, result);
		if (result.entries.size() >= limit)
			return result;
		long t1 = System.currentTimeMillis();
		
		// search other folders
		queryFolders(str, folders, limit, result);
		if (result.entries.size() >= limit)
			return result;
		long t2 = System.currentTimeMillis();
		
		if (mIncludeGal)
			queryGal(str, limit, result);
		long t3 = System.currentTimeMillis();
		
		ZimbraLog.gal.info("autocomplete: overall="+(t3-t0)+"ms, ranking="+(t1-t0)+"ms, folder="+(t2-t1)+"ms, gal="+(t3-t2)+"ms");
		return result;
	}
	
	private void queryRankingTable(String str, Collection<Integer> folders, int limit, AutoCompleteResult result) throws ServiceException {
		ContactRankings rankings = new ContactRankings(mAccountId);
		for (ContactEntry e : rankings.query(str, folders)) {
			result.addEntry(e);
			if (result.entries.size() == limit) {
				result.canBeCached = false;
				break;
			}
		}
	}
	
	private void queryGal(String str, int limit, AutoCompleteResult result) throws ServiceException {
		Provisioning prov = Provisioning.getInstance();
		Account account = prov.get(Provisioning.AccountBy.id, mAccountId);
		ZimbraLog.gal.debug("querying gal");
		GalSearchParams params = new GalSearchParams(account);
		params.setQuery(str);
		params.setType(mSearchType);
		params.setLimit(limit - result.entries.size());
		params.setResultCallback(new AutoCompleteCallback(str, result, params));
		try {
	        GalSearchControl gal = new GalSearchControl(params);
	        gal.autocomplete();
		} catch (Exception e) {
    		ZimbraLog.gal.warn("can't gal search", e);
    		return;
		}
	}
	
	private class AutoCompleteCallback extends GalSearchResultCallback {
		AutoCompleteResult result;
		String str;
		
	    public AutoCompleteCallback(String str, AutoCompleteResult result, GalSearchParams params) {
	    	super(params);
	    	this.result = result;
	    	this.str = str;
	    }
	    public void handleContactAttrs(Map<String,? extends Object> attrs) throws ServiceException {
	    	addMatchedContacts(str, attrs, FOLDER_ID_GAL, null, result);
	    }
	    public Element handleContact(Contact c) throws ServiceException {
			ZimbraLog.gal.debug("gal entry: "+""+c.getId());
	        handleContactAttrs(c.getFields());
	        return null;
	    }
	    public void visit(GalContact c) throws ServiceException {
			ZimbraLog.gal.debug("gal entry: "+""+c.getId());
	        handleContactAttrs(c.getAttrs());
	    }
	    public void handleElement(Element e) throws ServiceException {
			ZimbraLog.gal.debug("gal entry: "+""+e.getAttribute(MailConstants.A_ID));
	        handleContactAttrs(parseContactElement(e));
	    }
	    public void setSortBy(String sortBy) {
	    }
	    public void setQueryOffset(int offset) {
	    }
	    public void setHasMoreResult(boolean more) {
	    	if (more) {
	    		ZimbraLog.gal.debug("result can't be cached by client");
	    		result.canBeCached = false;
	    	}
	    }
	}
	private static boolean matches(String query, String text) {
		if (query == null || text == null)
			return false;
		return text.toLowerCase().startsWith(query);
	}
	
	private void addMatchedContacts(String query, Map<String,? extends Object> attrs, int folderId, ItemId id, AutoCompleteResult result) {
	    addMatchedContacts(query, attrs, mEmailKeys, folderId, id, result);
	}
	
	public static void addMatchedContacts(String query, Map<String,? extends Object> attrs, Collection<String> emailKeys, int folderId, ItemId id, AutoCompleteResult result) {
		String[] tokens = query.split(" ");
		if (tokens.length == 2 && tokens[1].length() == 1)
			query = tokens[0];
    	String firstName = (String)attrs.get(ContactConstants.A_firstName);
    	String lastName = (String)attrs.get(ContactConstants.A_lastName);
    	String fullName = (String)attrs.get(ContactConstants.A_fullName);
    	String nickname = (String)attrs.get(ContactConstants.A_nickname);
        if (attrs.get(ContactConstants.A_dlist) == null) {
        	boolean nameMatches = 
        		matches(query, firstName) ||
                matches(query, lastName) ||
                matches(query, fullName) ||
                matches(query, nickname);
        	
        	// matching algorithm is slightly different between matching
        	// personal Contacts in the addressbook vs GAL entry if there is
        	// multiple email address associated to the entry.  multiple
        	// email address in Contact typically means alternative email
        	// address, such as work email, home email, etc.  however in GAL,
        	// multiple email address indicates an alias to the same contact
        	// object.  for Contacts we want to show all the email addresses
        	// available for the Contact entry.  but for GAL we need to show
        	// just one email address.
        		
        	for (String emailKey : emailKeys) {
        		String email = (String)attrs.get(emailKey);
        		if (email != null && (nameMatches || matches(query, email))) {
        			ContactEntry entry = new ContactEntry();
        			entry.mEmail = email;
        			// use fullName if available
        			if (fullName != null) {
        				entry.setName(fullName);
        			} else {
        				// otherwise displayName is firstName." ".lastName
        				entry.mLastName = lastName;
        				if (entry.mLastName == null)
        					entry.mLastName = "";
        				entry.mDisplayName = (firstName == null) ? "" : firstName + " " + entry.mLastName;
        			}
        			entry.mId = id;
        			entry.mFolderId = folderId;
        			result.addEntry(entry);
        			ZimbraLog.gal.debug("adding "+entry.getEmail());
        			if (folderId == FOLDER_ID_GAL) {
        				// we've matched the first email address for this 
        				// GAL contact.  move onto the next contact.
        				return;
        			}
        		}
        	}
        } else {
        	// distribution list
        	ContactEntry entry = new ContactEntry();
        	entry.mDisplayName = nickname;
        	entry.mDlist = (String)attrs.get(ContactConstants.A_dlist);
        	entry.mId = id;
        	entry.mFolderId = folderId;
        	result.addEntry(entry);
        	ZimbraLog.gal.debug("adding "+entry.getEmail());
        }
	}
	
	private void queryFolders(String str, Collection<Integer> folders, int limit, AutoCompleteResult result) throws ServiceException {
		str = str.toLowerCase();
		String[] tokens = str.split(" ");
		if (tokens.length == 2 && tokens[1].length() == 1)
			str = tokens[0];
        ZimbraQueryResults qres = null;
        try {
    		Mailbox mbox = MailboxManager.getInstance().getMailboxByAccountId(mAccountId);
    		OperationContext octxt = new OperationContext(mbox);
    		HashMap<ItemId,Integer> mountpoints = new HashMap<ItemId,Integer>();
    		if (folders == null) {
    			ArrayList<Integer> allFolders = new ArrayList<Integer>();
    			for (Folder f : mbox.getFolderList(octxt, SortBy.NONE)) {
    				boolean isMountpoint = false;
    				if (f.getDefaultView() != MailItem.TYPE_CONTACT)
    					continue;
        			if (f instanceof Mountpoint) {
        				mountpoints.put(((Mountpoint) f).getTarget(), f.getId());
        				isMountpoint = true;
        			}
    				if (!isMountpoint || mIncludeSharedFolders)
    					allFolders.add(f.getId());
    			}
    			folders = allFolders;
    		} else {
        		for (int fid : folders) {
        			Folder f = mbox.getFolderById(octxt, fid);
        			if (f instanceof Mountpoint) {
        				mountpoints.put(((Mountpoint) f).getTarget(), fid);
        			}
        		}
    		}
    		String query = generateQuery(str, folders);
    		ZimbraLog.gal.debug("querying folders: "+query);
			qres = mbox.search(octxt, query, CONTACT_TYPES, SortBy.NONE, limit);
            while (qres.hasNext()) {
                ZimbraHit hit = qres.getNext();
                Map<String,String> fields = null;
                ItemId id = null;
                int folderId = 0;
                if (hit instanceof ContactHit) {
                    Contact c = ((ContactHit) hit).getContact();
                    ZimbraLog.gal.debug("hit: "+c.getId());
                	fields = c.getFields();
                	id = new ItemId(c);
                	folderId = c.getFolderId();
                } else if (hit instanceof ProxiedHit) {
                    fields = new HashMap<String, String>();
                    Element top = ((ProxiedHit)hit).getElement();
                    id = new ItemId(top.getAttribute(MailConstants.A_ID), (String) null);
                    ZimbraLog.gal.debug("hit: "+id);
                    ItemId fiid = new ItemId(top.getAttribute(MailConstants.A_FOLDER), (String) null);
                    folderId = mountpoints.get(fiid);
                    for (Element elt : top.listElements(MailConstants.E_ATTRIBUTE)) {
                    	try {
                            String name = elt.getAttribute(MailConstants.A_ATTRIBUTE_NAME);
                            fields.put(name, elt.getText());
                    	} catch (ServiceException se) {
                			ZimbraLog.gal.warn("error handling proxied query result "+hit);
                    	}
                    }
                } else
                	continue;

                addMatchedContacts(str, fields, folderId, id, result);
    			if (result.entries.size() == limit) {
            		ZimbraLog.gal.debug("mbox query result exceeded request limit "+limit);
    				result.canBeCached = false;
    				break;
    			}
            }
        } catch (IOException e) {
            throw ServiceException.FAILURE(e.getMessage(), e);
        } catch (ParseException e) {
            throw ServiceException.FAILURE(e.getMessage(), e);
        } finally {
            if (qres != null)
                qres.doneWithSearchResults();
        }
	}
	
	private String generateQuery(String query, Collection<Integer> folders) {
		StringBuilder buf = new StringBuilder();
		boolean first = true;
		buf.append("(");
		for (int fid : folders) {
			if (fid < 1)
				continue;
			if (!first)
				buf.append(" OR ");
			first = false;
			buf.append("inid:").append(fid);
		}
		buf.append(") AND contact:(").append(query).append(")");
		return buf.toString();
	}
}
