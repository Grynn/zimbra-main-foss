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
package com.zimbra.cs.dav.caldav;

import java.util.GregorianCalendar;
import java.util.TimeZone;

import org.dom4j.Element;

import com.zimbra.common.service.ServiceException;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.dav.DavElements;

/**
 * draft-dusseault-caldav section 9.9.
 * 
 * @author jylee
 *
 */
public class TimeRange {
	private long mStart;
	private long mEnd;

	public TimeRange(String name) {
		try {
			Account acct = Provisioning.getInstance().get(Provisioning.AccountBy.name, name);
			if (acct != null) {
				mStart = acct.getTimeInterval(Provisioning.A_zimbraCalendarCalDavSyncStart, 0);
				mEnd = acct.getTimeInterval(Provisioning.A_zimbraCalendarCalDavSyncEnd, 0);
			}
		} catch (ServiceException se) {
		}
		long now = System.currentTimeMillis();
		if (mStart == 0)
			mStart = -1;
		else
			mStart = now - mStart;
		if (mEnd == 0)
			mEnd = -1;
		else
			mEnd = now + mEnd;
	}
	public TimeRange(Element elem) {
		mStart = mEnd = 0;
		if (elem != null && elem.getQName().equals(DavElements.E_TIME_RANGE)) {
			String s = elem.attributeValue(DavElements.P_START);
			if (s != null)
				mStart = parseDateWithUTCTime(s);
			
			s = elem.attributeValue(DavElements.P_END);
			if (s != null)
				mEnd = parseDateWithUTCTime(s);
		}
		if (mStart == 0)
			mStart = -1;
		if (mEnd == 0)
			mEnd = -1;
	}
	
    private static long parseDateWithUTCTime(String time) {
    	if (time.length() != 8 && time.length() != 16)
    		return 0;
    	if (!time.endsWith("Z"))
    		return 0;
    	TimeZone tz = TimeZone.getTimeZone("GMT");
    	int year, month, date, hour, min, sec;
    	int index = 0;
    	year = Integer.parseInt(time.substring(index, index+4)); index+=4;
    	month = Integer.parseInt(time.substring(index, index+2))-1; index+=2;
    	date = Integer.parseInt(time.substring(index, index+2)); index+=2;
    	hour = min = sec = 0;
    	if (time.length() == 16) {
    		if (time.charAt(index) == 'T') index++;
    		hour = Integer.parseInt(time.substring(index, index+2)); index+=2;
    		min = Integer.parseInt(time.substring(index, index+2)); index+=2;
    		sec = Integer.parseInt(time.substring(index, index+2)); index+=2;
    	}
    	GregorianCalendar calendar = new GregorianCalendar(tz);
    	calendar.clear();
    	calendar.set(year, month, date, hour, min, sec);
    	return calendar.getTimeInMillis();
    }
    
    public void intersection(TimeRange another) {
    	if (mStart < another.mStart)
    		mStart = another.mStart;
    	if (mEnd > another.mEnd)
    		mEnd = another.mEnd;
    }
	public long getStart() {
		return mStart;
	}
	
	public long getEnd() {
		return mEnd;
	}
}
