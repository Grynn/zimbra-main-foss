/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2006, 2007 Zimbra, Inc.
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
package com.zimbra.cs.dav.resource;

import java.util.ArrayList;
import java.util.Map;
import java.util.StringTokenizer;

import javax.servlet.http.HttpServletResponse;

import org.apache.commons.collections.map.LRUMap;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.HttpUtil;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.Domain;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.Provisioning.AccountBy;
import com.zimbra.cs.account.Server;
import com.zimbra.cs.dav.DavContext;
import com.zimbra.cs.dav.DavException;
import com.zimbra.cs.dav.service.DavServlet;
import com.zimbra.cs.httpclient.URLUtil;
import com.zimbra.cs.mailbox.CalendarItem;
import com.zimbra.cs.mailbox.Document;
import com.zimbra.cs.mailbox.Folder;
import com.zimbra.cs.mailbox.MailItem;
import com.zimbra.cs.mailbox.MailServiceException;
import com.zimbra.cs.mailbox.Mailbox;
import com.zimbra.cs.mailbox.MailboxManager;
import com.zimbra.cs.mailbox.Message;
import com.zimbra.cs.mailbox.Mountpoint;
import com.zimbra.cs.mailbox.calendar.Invite;
import com.zimbra.cs.service.util.ItemId;

/**
 * UrlNamespace provides a mapping from a URL to a DavResource.
 * 
 * @author jylee
 *
 */
public class UrlNamespace {
	public static final String ATTACHMENTS_PREFIX = "/attachments";
	
	/* Returns Collection at the specified URL. */
	public static Collection getCollectionAtUrl(DavContext ctxt, String url) throws DavException {
		if (url.startsWith("http")) {
			int index = url.indexOf(DavServlet.DAV_PATH);
			if (index == -1 || url.endsWith(DavServlet.DAV_PATH))
				throw new DavException("invalid uri", HttpServletResponse.SC_NOT_FOUND, null);
			index += DavServlet.DAV_PATH.length() + 1;
			url = url.substring(index);
			
			// skip user.
			index = url.indexOf('/');
			if (index == -1)
				throw new DavException("invalid uri", HttpServletResponse.SC_NOT_FOUND, null);
			url = url.substring(index);
		}
		String path = url;
		int lastPos = path.length() - 1;
		if (path.endsWith("/"))
			lastPos--;
		int index = path.lastIndexOf('/', lastPos);
		if (index == -1)
			path = "/";
		else
			path = path.substring(0, index);
		DavResource rsc = getResourceAt(ctxt, ctxt.getUser(), path);
		if (rsc instanceof Collection)
			return (Collection)rsc;
		throw new DavException("invalid uri", HttpServletResponse.SC_NOT_FOUND, null);
	}

	/* Returns DavResource at the specified URL. */
	public static DavResource getResourceAtUrl(DavContext ctxt, String url) throws DavException {
        if (url.startsWith(PRINCIPALS_PATH))
            return getPrincipalAtUrl(ctxt, url);
		int index = url.indexOf(DavServlet.DAV_PATH);
		if (index == -1 || url.endsWith(DavServlet.DAV_PATH))
			throw new DavException("invalid uri", HttpServletResponse.SC_NOT_FOUND, null);
		index += DavServlet.DAV_PATH.length() + 1;
		int delim = url.indexOf("/", index);
		if (delim == -1)
			throw new DavException("invalid uri", HttpServletResponse.SC_NOT_FOUND, null);
		String user = url.substring(index, delim);
		String path = url.substring(delim);
		return getResourceAt(ctxt, user, path);
	}

    public static DavResource getPrincipalAtUrl(DavContext ctxt, String url) throws DavException {
        ZimbraLog.dav.debug("getPrincipalAtUrl");
        int index = url.indexOf(PRINCIPALS_PATH);
        if (index == -1 || url.endsWith(PRINCIPALS_PATH))
            throw new DavException("invalid uri", HttpServletResponse.SC_NOT_FOUND, null);
        index += PRINCIPALS_PATH.length();
        String name = url.substring(index);
        if (name.endsWith("/"))
            name = name.substring(0, name.length()-1);
        ZimbraLog.dav.debug("name: "+name);
        try {
            Account a = Provisioning.getInstance().get(Provisioning.AccountBy.name, name);
            // allow only the owner can access the principal URL for now.
            if (a == null || ctxt.getAuthAccount().compareTo(a) != 0)
                throw new DavException("user not found", HttpServletResponse.SC_NOT_FOUND, null);
            return new User(url, a);
        } catch (ServiceException se) {
            throw new DavException("user not found", HttpServletResponse.SC_NOT_FOUND, null);
        }
    }
    
    public static DavResource getPrincipal(Account acct) throws DavException {
        try {
            return new User(getPrincipalUrl(acct.getName()), acct);
        } catch (ServiceException se) {
            throw new DavException("user not found", HttpServletResponse.SC_NOT_FOUND, null);
        }
    }
    
	/* Returns DavResource in the user's mailbox at the specified path. */
	public static DavResource getResourceAt(DavContext ctxt, String user, String path) throws DavException {
        ZimbraLog.dav.debug("getResource at "+user+" "+path);
		if (path == null)
			throw new DavException("invalid uri", HttpServletResponse.SC_NOT_FOUND, null);
		
		String target = path.toLowerCase();
		DavResource resource = null;
		
		if (target.startsWith(ATTACHMENTS_PREFIX)) {
			resource = getPhantomResource(ctxt, user);
		} else {
		    try {
		        resource = getMailItemResource(ctxt, user, target);
		    } catch (ServiceException se) {
		        ZimbraLog.dav.warn("can't get mail item resource for "+user+", "+target, se);
		    }
		}
		
		if (resource == null)
			throw new DavException("no DAV resource for "+target, HttpServletResponse.SC_NOT_FOUND, null);
		
		return resource;
	}

	/* Returns DavResource identified by MailItem id .*/
	public static DavResource getResourceByItemId(DavContext ctxt, String user, int id) throws ServiceException, DavException {
		MailItem item = getMailItemById(ctxt, user, id);
		return getResourceFromMailItem(ctxt, item);
	}
	
    public static final String PRINCIPALS      = "principals";
    public static final String PRINCIPAL_USERS = "users";
    public static final String PRINCIPALS_PATH = "/" + PRINCIPALS + "/" + PRINCIPAL_USERS + "/";
	
	public static final String ACL_USER   = PRINCIPALS_PATH;
	public static final String ACL_GROUP  = "/" + PRINCIPALS + "/" + "group" + "/";
	public static final String ACL_COS    = "/" + PRINCIPALS + "/" + "cos" + "/";
	public static final String ACL_DOMAIN = "/" + PRINCIPALS + "/" + "domain" + "/";
    
	/* RFC 3744 */
	public static String getAclUrl(String principal, String type) throws DavException {
		Account account = null;
		Provisioning prov = Provisioning.getInstance();
		try {
			account = prov.get(AccountBy.id, principal);
			StringBuilder buf = new StringBuilder();
			buf.append(type);
			if (account != null)
				buf.append(account.getName());
			else
				buf.append(principal);
			return getAbsoluteUrl(null, buf.toString());
		} catch (ServiceException e) {
			throw new DavException("cannot create ACL URL for principal "+principal, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, e);
		}
	}

	/* Returns URL to the resource. */
	public static String getResourceUrl(DavResource rs) {
		return getResourceUrl(rs.getOwner(), rs.getUri());
	}

	public static String getResourceUrl(String user, String resourcePath) {
	    //return urlEscape(DavServlet.getDavUrl(user) + resourcePath);
        return URLUtil.urlEscape(DavServlet.DAV_PATH + "/" + user + resourcePath);
	}
    
    public static String getPrincipalUrl(String user) {
        return URLUtil.urlEscape(PRINCIPALS_PATH + user + "/");
    }
	
    public static String getPrincipalCollectionUrl(Account acct) throws ServiceException {
    	return getAbsoluteUrl(acct, PRINCIPALS_PATH);
    }
    
    private static String getAbsoluteUrl(Account user, String path) throws ServiceException {
		Provisioning prov = Provisioning.getInstance();
		Domain domain = null;
		Server server = prov.getLocalServer();
		if (user != null) {
			domain = prov.getDomain(user);
			server = prov.getServer(user);
		}
		return DavServlet.getServiceUrl(server, domain, path);
    }
    
	private static LRUMap sApptSummariesMap = new LRUMap(100);
	private static LRUMap sRenamedResourceMap = new LRUMap(100);
	
	private static class RemoteFolder {
	    static final long AGE = 60L * 1000L;
	    RemoteCalendarCollection folder;
	    long ts;
	    boolean isStale(long now) {
	        return (ts + AGE) < now;
	    }
	}
	
	public static void addToRenamedResource(String path, DavResource rsc) {
		synchronized (sRenamedResourceMap) {
			sRenamedResourceMap.put(path.toLowerCase(), rsc);
		}
	}
	public static DavResource checkRenamedResource(String path) {
        synchronized (sRenamedResourceMap) {
        	if (sRenamedResourceMap.containsKey(path.toLowerCase()))
        		return (DavResource)sRenamedResourceMap.get(path.toLowerCase());
        }
        return null;
	}
    private static DavResource getMailItemResource(DavContext ctxt, String user, String path) throws ServiceException, DavException {
        Provisioning prov = Provisioning.getInstance();
        Account account = prov.get(AccountBy.name, user);
        if (account == null)
            throw new DavException("no such accout "+user, HttpServletResponse.SC_NOT_FOUND, null);

        Mailbox mbox = MailboxManager.getInstance().getMailboxByAccount(account);
        String id = null;
        int index = path.indexOf('?');
        if (index > 0) {
            Map<String, String> params = HttpUtil.getURIParams(path.substring(index+1));
            path = path.substring(0, index);
            id = params.get("id");
        }
        Mailbox.OperationContext octxt = ctxt.getOperationContext();
        MailItem item = null;
        
        DavResource rs = checkRenamedResource(path);
        if (rs != null)
        	return rs;
        
        // simple case.  root folder or if id is specified.
        if (path.equals("/"))
            item = mbox.getFolderByPath(octxt, "/");
        else if (id != null)
            item = mbox.getItemById(octxt, Integer.parseInt(id), MailItem.TYPE_UNKNOWN);

        if (item != null)
            return getResourceFromMailItem(ctxt, item);
        
        try {
            return getResourceFromMailItem(ctxt, mbox.getItemByPath(octxt, path));
        } catch (MailServiceException.NoSuchItemException e) {
        }
        
        // look up the item from path
        index = path.lastIndexOf('/');
        String folderPath = path.substring(0, index);
        Folder f = null;
        if (index != -1) {
            try {
                f = mbox.getFolderByPath(octxt, folderPath);
            } catch (MailServiceException.NoSuchItemException e) {
            }
        }
        if (f != null && path.endsWith(CalendarObject.CAL_EXTENSION)) {
            String uid = path.substring(index + 1, path.length() - CalendarObject.CAL_EXTENSION.length());
            index = uid.indexOf(',');
            if (f.getType() == MailItem.TYPE_MOUNTPOINT) {
                Mountpoint mp = (Mountpoint)f;
                // if the folder is a mountpoint instantiate a remote object.
                // the only information we have is the calendar UID and remote account folder id.
                // we need the itemId for the calendar appt in order to query from the remote server.
                // so we'll need to do getApptSummaries on the remote folder, then cache the result.
                ItemId remoteId = new ItemId(mp.getOwnerId(), mp.getRemoteId());
                RemoteFolder remoteFolder = null;
                synchronized (sApptSummariesMap) {
                    remoteFolder = (RemoteFolder)sApptSummariesMap.get(remoteId);
                    long now = System.currentTimeMillis();
                    if (remoteFolder != null && remoteFolder.isStale(now)) {
                        sApptSummariesMap.remove(remoteId);
                        remoteFolder = null;
                    }
                    if (remoteFolder == null) {
                        remoteFolder = new RemoteFolder();
                        remoteFolder.folder = new RemoteCalendarCollection(ctxt, mp);
                        remoteFolder.ts = now;
                        sApptSummariesMap.put(remoteId, remoteFolder);
                    }
                }
                DavResource res = remoteFolder.folder.getAppointment(ctxt, uid);
                if (res == null)
                    throw new DavException("no such appointment "+user+", "+uid, HttpServletResponse.SC_NOT_FOUND, null);
                return res;
            } else if (index > 0) {
            	id = uid.substring(index+1);
            	item = mbox.getItemById(octxt, Integer.parseInt(id), MailItem.TYPE_UNKNOWN);

            } else {
                item = mbox.getCalendarItemByUid(octxt, uid);
            }
        }
        
        return getResourceFromMailItem(ctxt, item);
    }
    
    public static void invalidateApptSummariesCache(String acctId, int itemId) {
        ItemId remoteId = new ItemId(acctId, itemId);
        synchronized (sApptSummariesMap) {
            sApptSummariesMap.remove(remoteId);
        }
    }
    
    private static MailItemResource getCalendarItemForMessage(DavContext ctxt, Message msg) throws ServiceException {
    	Mailbox mbox = msg.getMailbox();
    	if (msg.isInvite() && msg.hasCalendarItemInfos()) {
    		Message.CalendarItemInfo calItemInfo = msg.getCalendarItemInfo(0);
    		try {
    			CalendarItem item = mbox.getCalendarItemById(ctxt.getOperationContext(), calItemInfo.getCalendarItemId());
    			int compNum = calItemInfo.getComponentNo();
    			Invite invite = item.getInvite(msg.getId(), compNum);
    			if (item != null && invite != null) {
    				String path = CalendarObject.CalendarPath.generate(msg.getPath(), item.getUid(), msg.getId());
    				return new CalendarObject.LocalCalendarObject(ctxt, path, item, compNum, msg.getId());
    			}
            } catch (MailServiceException.NoSuchItemException e) {
            	// the appt must have been cancelled or deleted.
            	// bug 26315
            }
    	}
    	return null;
    }
    
	/* Returns DavResource for the MailItem. */
	public static MailItemResource getResourceFromMailItem(DavContext ctxt, MailItem item) throws DavException {
		MailItemResource resource = null;
		if (item == null)
			return resource;
		byte itemType = item.getType();
		
		try {
			byte viewType;
			switch (itemType) {
            case MailItem.TYPE_MOUNTPOINT :
				Mountpoint mp = (Mountpoint) item;
            	viewType = mp.getDefaultView();
            	if (viewType == MailItem.TYPE_APPOINTMENT)
            		resource = new RemoteCalendarCollection(ctxt, mp);
            	else
            		resource = new RemoteCollection(ctxt, mp);
                break;
			case MailItem.TYPE_FOLDER :
				boolean useDistinctCollectionType = false;
				try {
					Provisioning prov = Provisioning.getInstance();
					useDistinctCollectionType = prov.getConfig().getBooleanAttr(Provisioning.A_zimbraCalendarCalDavUseDistinctAppointmentAndToDoCollection, false);
				} catch (ServiceException se) {
					ZimbraLog.dav.warn("can't get zimbraCalendarCalDavUseDistinctAppointmentAndToDoCollection in globalConfig", se);
				}
				Folder f = (Folder) item;
				viewType = f.getDefaultView();
				if (f.getId() == Mailbox.ID_FOLDER_INBOX)
					resource = new ScheduleInbox(ctxt, f);
				else if (f.getId() == Mailbox.ID_FOLDER_SENT)
					resource = new ScheduleOutbox(ctxt, f);
				else if (viewType == MailItem.TYPE_APPOINTMENT)
					resource = getCalendarCollection(ctxt, f);
				else if (useDistinctCollectionType && viewType == MailItem.TYPE_TASK)
					resource = getCalendarCollection(ctxt, f);
				else
					resource = new Collection(ctxt, f);
				break;
			case MailItem.TYPE_WIKI :
			case MailItem.TYPE_DOCUMENT :
				resource = new Notebook(ctxt, (Document)item);
				break;
			case MailItem.TYPE_APPOINTMENT :
			case MailItem.TYPE_TASK :
				resource = new CalendarObject.LocalCalendarObject(ctxt, (CalendarItem)item);
				break;
			case MailItem.TYPE_MESSAGE :
				resource = getCalendarItemForMessage(ctxt, (Message)item);
				break;
			}
		} catch (ServiceException e) {
			resource = null;
			ZimbraLog.dav.info("cannot create DavResource", e);
		}
		return resource;
	}
	
	private static MailItemResource getCalendarCollection(DavContext ctxt, Folder f) throws ServiceException, DavException {
		String[] homeSets = Provisioning.getInstance().getConfig().getMultiAttr(Provisioning.A_zimbraCalendarCalDavAlternateCalendarHomeSet);
		// if alternate homeSet is set then default Calendar and Tasks folders 
		// are no longer being used to store appointments and tasks.
		if (homeSets.length > 0 && 
				(f.getId() == Mailbox.ID_FOLDER_CALENDAR ||
				 f.getId() == Mailbox.ID_FOLDER_TASKS))
			return new Collection(ctxt, f);
		return new CalendarCollection(ctxt, f);
	}
	
	private static DavResource getPhantomResource(DavContext ctxt, String user) throws DavException {
		DavResource resource;
		String target = ctxt.getPath();
		
		ArrayList<String> tokens = new ArrayList<String>();
		StringTokenizer tok = new StringTokenizer(target, "/");
		int numTokens = tok.countTokens();
		while (tok.hasMoreTokens()) {
			tokens.add(tok.nextToken());
		}
		
		//
		// return BrowseWrapper
		//
		// /attachments/
		// /attachments/by-date/
		// /attachments/by-type/
		// /attachments/by-type/image/
		// /attachments/by-sender/
		// /attachments/by-sender/zimbra.com/

		//
		// return SearchWrapper
		//
		// /attachments/by-date/today/
		// /attachments/by-type/image/last-month/
		// /attachments/by-sender/zimbra.com/last-week/
		
		//
		// return AttachmentWrapper
		//
		// /attachments/by-date/today/image.gif
		// /attachments/by-type/image/last-month/image.gif
		// /attachments/by-sender/zimbra.com/last-week/image.gif

		switch (numTokens) {
		case 1:
		case 2:
			resource = new BrowseWrapper(target, user, tokens);
			break;
		case 3:
			if (tokens.get(1).equals(PhantomResource.BY_DATE))
				resource = new SearchWrapper(target, user, tokens);
			else
				resource = new BrowseWrapper(target, user, tokens);
			break;
		case 4:
			if (tokens.get(1).equals(PhantomResource.BY_DATE))
				resource = new Attachment(target, user, tokens, ctxt);
			else
				resource = new SearchWrapper(target, user, tokens);
			break;
		case 5:
			resource = new Attachment(target, user, tokens, ctxt);
			break;
		default:
			resource = null;
		}
		
		return resource;
	}
	
	private static MailItem getMailItemById(DavContext ctxt, String user, int id) throws DavException, ServiceException {
		Provisioning prov = Provisioning.getInstance();
		Account account = prov.get(AccountBy.name, user);
		if (account == null)
			throw new DavException("no such accout "+user, HttpServletResponse.SC_NOT_FOUND, null);
		
		Mailbox mbox = MailboxManager.getInstance().getMailboxByAccount(account);
		return mbox.getItemById(ctxt.getOperationContext(), id, MailItem.TYPE_UNKNOWN);
	}
	
	public static Account getPrincipal(String principalUrl) throws ServiceException {
		int index = principalUrl.indexOf(PRINCIPALS_PATH);
		if (index == -1)
			return null;
		String acct = principalUrl.substring(index + PRINCIPALS_PATH.length());
		Provisioning prov = Provisioning.getInstance();
		return prov.get(AccountBy.name, acct);
	}
}
