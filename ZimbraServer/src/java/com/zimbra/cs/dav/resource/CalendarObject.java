/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2006, 2007, 2008, 2009 Zimbra, Inc.
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
package com.zimbra.cs.dav.resource;

import java.io.ByteArrayInputStream;
import java.io.CharArrayWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;

import javax.servlet.http.HttpServletResponse;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.AuthToken;
import com.zimbra.cs.dav.DavContext;
import com.zimbra.cs.dav.DavElements;
import com.zimbra.cs.dav.DavException;
import com.zimbra.cs.dav.caldav.Filter;
import com.zimbra.cs.dav.caldav.TimeRange;
import com.zimbra.cs.dav.property.CalDavProperty;
import com.zimbra.cs.mailbox.CalendarItem;
import com.zimbra.cs.mailbox.Folder;
import com.zimbra.cs.mailbox.Mailbox;
import com.zimbra.cs.mailbox.Mailbox.OperationContext;
import com.zimbra.cs.mailbox.calendar.ICalTimeZone;
import com.zimbra.cs.mailbox.calendar.IcalXmlStrMap;
import com.zimbra.cs.mailbox.calendar.Invite;
import com.zimbra.cs.mailbox.calendar.TimeZoneMap;
import com.zimbra.cs.mailbox.calendar.ZAttendee;
import com.zimbra.cs.mailbox.calendar.ZCalendar;
import com.zimbra.cs.mime.Mime;
import com.zimbra.cs.service.AuthProvider;
import com.zimbra.cs.service.UserServlet;
import com.zimbra.cs.service.util.ItemId;
import com.zimbra.cs.zclient.ZAppointmentHit;

/**
 * CalendarObject is a single instance of iCalendar (RFC 2445) object, such as
 * VEVENT or VTODO.
 * 
 * @author jylee
 *
 */
public interface CalendarObject {

    public static final String CAL_EXTENSION = ".ics";
    
    public String getUid();
    public boolean match(Filter filter);
    public String getVcalendar(DavContext ctxt, Filter filter) throws IOException, DavException;

    public static class CalendarPath {
        public static String generate(DavContext ctxt, String itemPath, String uid, int extra) {
        	if (ctxt != null && ctxt.getCollectionPath() != null)
        		itemPath = ctxt.getCollectionPath();
            // escape uid
            StringBuilder path = new StringBuilder();
            path.append(itemPath);
            if (path.charAt(path.length()-1) != '/')
                path.append("/");
            path.append(uid);
            if (extra >= 0)
            	path.append(",").append(extra);
            path.append(CAL_EXTENSION);
            return path.toString();
        }
    }
    public static class LightWeightCalendarObject extends DavResource implements CalendarObject {
    	private int mMailboxId;
    	private int mId;
    	private String mUid;
    	private String mEtag;
    	private long mStart;
    	private long mEnd;
    	
    	public LightWeightCalendarObject(String path, String owner, CalendarItem.CalendarMetadata data) {
    		super(CalendarPath.generate(null, path, data.uid, -1), owner);
    		mMailboxId = data.mailboxId;
    		mId = data.itemId;
    		mUid = data.uid;
    		mStart = data.start_time;
    		mEnd = data.end_time;
    		mEtag = MailItemResource.getEtag(Integer.toString(data.mod_metadata), Integer.toString(data.mod_content));
    		setProperty(DavElements.P_GETETAG, mEtag);
    	}
        public String getUid() {
        	return mUid;
        }
        public boolean match(Filter filter) {
        	TimeRange range = filter.getTimeRange();
        	if (range == null)
        		return true;
        	return range.matches(mMailboxId, mId, mStart, mEnd);
        }
        public String getEtag() {
    		return mEtag;
    	}
        public String getVcalendar(DavContext ctxt, Filter filter) throws IOException, DavException {
            ZimbraLog.dav.debug("constructing full resource");
    		return getFullResource(ctxt).getVcalendar(ctxt, filter);
        }
    	public InputStream getContent(DavContext ctxt) throws IOException, DavException {
    		return null;
    	}
    	public boolean isCollection() {
    		return false;
    	}
    	public void delete(DavContext ctxt) throws DavException {
    	}
    	private CalendarObject getFullResource(DavContext ctxt) throws DavException {
    		String user = null;
    		Account acct = ctxt.getOperationContext().getAuthenticatedUser();
    		if (acct != null)
    			user = acct.getName();
    		try {
    			DavResource rs = UrlNamespace.getResourceByItemId(ctxt, user, mId);
    			if (rs instanceof LocalCalendarObject)
    				return (LocalCalendarObject)rs;
    			else if (rs instanceof RemoteCalendarObject)
    				return (RemoteCalendarObject)rs;
    			else
        			throw new DavException("not a calendar item", HttpServletResponse.SC_BAD_REQUEST);
    		} catch (ServiceException se) {
    			throw new DavException("can't fetch item", se);
    		}
    	}
    }
    public static class LocalCalendarObject extends MailItemResource implements CalendarObject {

        public LocalCalendarObject(DavContext ctxt, CalendarItem calItem) throws ServiceException {
            this(ctxt, calItem, false);
        }

        public LocalCalendarObject(DavContext ctxt, CalendarItem calItem, boolean newItem) throws ServiceException {
            this(ctxt, CalendarPath.generate(ctxt, calItem.getPath(), calItem.getUid(), -1), calItem);
            mNewlyCreated = newItem;
        }

        public LocalCalendarObject(DavContext ctxt, String path, CalendarItem calItem) throws ServiceException {
        	this(ctxt, path, calItem, -1, -1);
        }
        
        public LocalCalendarObject(DavContext ctxt, String path, CalendarItem calItem, int compNum, int msgId) throws ServiceException {
            super(ctxt, path, calItem);
            mUid = calItem.getUid();
            if (compNum < 0 || msgId < 0) {
                mInvites = calItem.getInvites();
            } else {
            	isSchedulingMessage = true;
            	mId = msgId;
            	mInvites = new Invite[1];
            	mInvites[0] = calItem.getInvite(compNum);
            }
            mTzmap = calItem.getTimeZoneMap();
            Invite defInv = calItem.getDefaultInviteOrNull();
            if (defInv != null)
                setProperty(DavElements.P_DISPLAYNAME, defInv.getName());
            setProperty(DavElements.P_GETCONTENTTYPE, Mime.CT_TEXT_CALENDAR);
            setProperty(DavElements.P_GETCONTENTLENGTH, Long.toString(calItem.getSize()));
            addProperty(CalDavProperty.getCalendarData(this));
            if (mInvites[0].hasRecurId() && mInvites.length > 1) {
            	// put the main series to be the first invite, otherwise iCal won't like it.
            	ArrayList<Invite> newList = new ArrayList<Invite>();
            	ArrayList<Invite> exceptions = new ArrayList<Invite>();
            	for (Invite i : mInvites) {
            		if (i.hasRecurId())
            			exceptions.add(i);
            		else
            			newList.add(i);
            	}
            	newList.addAll(exceptions);
            	mInvites = newList.toArray(new Invite[0]);
            }
            mMailboxId = calItem.getMailboxId();
            mStart = calItem.getStartTime();
            mEnd = calItem.getEndTime();
        }

        private String mUid;
        private Invite[] mInvites;
        private TimeZoneMap mTzmap;
        private boolean isSchedulingMessage;
        private int mMailboxId;
        private long mStart;
        private long mEnd;

        /* Returns true if the supplied Filter matches this calendar object. */
        public boolean match(Filter filter) {
        	TimeRange range = filter.getTimeRange();
        	if (range != null && !range.matches(mMailboxId, mId, mStart, mEnd))
        		return false;
            for (Invite inv : mInvites) {
            	try {
            		ZCalendar.ZComponent vcomp = inv.newToVComponent(false, false);
            		if (filter.match(vcomp))
            			return true;
            	} catch (ServiceException se) {
                    ZimbraLog.dav.warn("cannot convert to ICalendar", se);
            		continue;
            	}
            }

            return false;
        }

        /* Returns iCalendar representation of events that matches
         * the supplied filter.
         */
        public String getVcalendar(DavContext ctxt, Filter filter) throws IOException, DavException {
            StringBuilder buf = new StringBuilder();

            buf.append("BEGIN:VCALENDAR\r\n");
            buf.append("VERSION:").append(ZCalendar.sIcalVersion).append("\r\n");
            buf.append("PRODID:").append(ZCalendar.sZimbraProdID).append("\r\n");
			if (isSchedulingMessage)
	            buf.append("METHOD:REQUEST").append("\r\n");
            Iterator<ICalTimeZone> iter = mTzmap.tzIterator();
            while (iter.hasNext()) {
                ICalTimeZone tz = (ICalTimeZone) iter.next();
                CharArrayWriter wr = new CharArrayWriter();
                tz.newToVTimeZone().toICalendar(wr, true);
                wr.flush();
                buf.append(wr.toCharArray());
                wr.close();
            }
            Account acct = ctxt.getAuthAccount();
            for (Invite inv : mInvites) {
                CharArrayWriter wr = new CharArrayWriter();
                try {
                    Mailbox mbox = getMailbox(ctxt);
                    OperationContext octxt = ctxt.getOperationContext();
                    Folder folder = mbox.getFolderById(octxt, mFolderId);
                    boolean allowPrivateAccess = CalendarItem.allowPrivateAccess(
                            folder, ctxt.getAuthAccount(), octxt.isUsingAdminPrivileges());
                    ZAttendee attendee = inv.getMatchingAttendee(acct);
                    if (attendee != null && attendee.hasRsvp() && attendee.getRsvp() && IcalXmlStrMap.PARTSTAT_NEEDS_ACTION.equals(attendee.getPartStat())) {
                    	ZCalendar.ZProperty prop = new ZCalendar.ZProperty("X-APPLE-NEEDS-REPLY");
                    	prop.setValue("TRUE");
                    	inv.addXProp(prop);
                    }
                    ZCalendar.ZComponent vcomp = inv.newToVComponent(false, allowPrivateAccess);
                    if (filter != null && !filter.match(vcomp))
                        continue;
                    vcomp.toICalendar(wr, true);
                } catch (ServiceException se) {
                    ZimbraLog.dav.warn("cannot convert to ICalendar", se);
                    continue;
                }
                wr.flush();
                buf.append(wr.toCharArray());
                wr.close();
            }
            buf.append("END:VCALENDAR\r\n");
            return buf.toString();
        }

        @Override
        public InputStream getRawContent(DavContext ctxt) throws IOException, DavException {
            return new ByteArrayInputStream(getVcalendar(ctxt, null).getBytes("UTF-8"));
        }

        @Override
        public boolean isCollection() {
            return false;
        }

        public String getUid() {
            return mUid;
        }
    }
	
	public static class RemoteCalendarObject extends DavResource implements CalendarObject {

	    public RemoteCalendarObject(String uri, String owner, ZAppointmentHit appt, RemoteCalendarCollection parent) {
	        super(CalendarPath.generate(null, uri, appt.getUid(), -1), owner);
	        mParent = parent;
	        mUid = appt.getUid();
            ItemId iid;
            try {
                iid = new ItemId(appt.getId(), (String)null);
                mRemoteId = iid.getAccountId();
                mItemId = iid.getId();
            } catch (ServiceException e) {
                ZimbraLog.dav.warn("can't generate itemId from "+appt.getId(), e);
            }
	        mEtag = getEtag(appt);
			setProperty(DavElements.E_GETETAG, getEtag(), true);
            setProperty(DavElements.P_GETCONTENTTYPE, Mime.CT_TEXT_CALENDAR);
            addProperty(CalDavProperty.getCalendarData(this));
            mStart = appt.getStartTime();
            mEnd = appt.getEndTime();
	    }

	    public RemoteCalendarObject(String uri, String owner, String etag, RemoteCalendarCollection parent, boolean newlyCreated) {
	        super(uri, owner);
	        mParent = parent;
	        mEtag = etag;
            setProperty(DavElements.P_GETCONTENTTYPE, Mime.CT_TEXT_CALENDAR);
            mNewlyCreated = newlyCreated;
	    }
	    
	    public boolean hasEtag() {
	    	return true;
	    }
	    
	    public String getEtag() {
	    	return mEtag;
	    }
	    
        public static String getEtag(ZAppointmentHit item) {
            return "\""+Long.toString(item.getModifiedSeq())+"-"+Long.toString(item.getSavedSeq())+"\"";
        }
		private RemoteCalendarCollection mParent;
	    private String mRemoteId;
	    private int mItemId;
	    private String mUid;
	    private String mEtag;
	    private byte[] mContent;
	    private long mStart;
	    private long mEnd;
	    
	    @Override
	    public void delete(DavContext ctxt) throws DavException {
	    	mParent.deleteAppointment(ctxt, mItemId);
	    }

	    @Override
	    public InputStream getContent(DavContext ctxt) throws IOException, DavException {
            byte[] result = getRemoteContent(ctxt);
            if (result != null)
                return new ByteArrayInputStream(result);
	        return null;
	    }

	    @Override
	    public boolean isCollection() {
	        return false;
	    }
	    
	    @Override
	    public boolean hasContent(DavContext ctxt) {
	        return true;
	    }
	    
	    public String getUid() {
	        return mUid;
	    }
	    
	    public boolean match(Filter filter) {
        	TimeRange range = filter.getTimeRange();
        	if (range == null)
        		return true;
        	return range.matches(mParent.getMailboxId(), mItemId, mStart, mEnd);
	    }
	    
	    public String getVcalendar(DavContext ctxt, Filter filter) throws IOException {
            byte[] result = getRemoteContent(ctxt);
            if (result != null)
                return new String(result, "UTF-8");
            return "";
	    }
	    
        public byte[] getRemoteContent(DavContext ctxt) {
        	if (mContent != null)
        		return mContent;
        	String data = mParent.getCalendarData(mUid);
        	if (data != null) {
        		try {
                    mContent = data.getBytes("UTF-8");
                } catch (UnsupportedEncodingException e) {
                    ZimbraLog.dav.warn("can't get remote contents for "+mRemoteId+", "+mItemId, e);
                }
        		return mContent;
        	}
            try {
                AuthToken authToken = AuthProvider.getAuthToken(ctxt.getAuthAccount());
                ItemId iid = new ItemId(mRemoteId, mItemId);
                HashMap<String,String> params = new HashMap<String,String>();
                mContent = UserServlet.getRemoteContent(authToken, iid, params);
            } catch (ServiceException e) {
                ZimbraLog.dav.warn("can't get remote contents for "+mRemoteId+", "+mItemId, e);
            }
            return mContent;
        }
	}
}
