/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2008 Zimbra, Inc.
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

package com.zimbra.cs.service.mail;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.Element;
import com.zimbra.common.soap.MailConstants;
import com.zimbra.common.soap.SoapProtocol;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.AccountServiceException;
import com.zimbra.cs.account.AuthToken;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.Server;
import com.zimbra.cs.account.Provisioning.AccountBy;
import com.zimbra.cs.mailbox.MailItem;
import com.zimbra.cs.mailbox.MailServiceException;
import com.zimbra.cs.mailbox.Mailbox;
import com.zimbra.cs.mailbox.MailboxManager;
import com.zimbra.cs.mailbox.Mailbox.OperationContext;
import com.zimbra.cs.mailbox.calendar.ICalTimeZone;
import com.zimbra.cs.mailbox.calendar.cache.CalendarData;
import com.zimbra.cs.mailbox.calendar.cache.CalendarItemData;
import com.zimbra.cs.mailbox.calendar.cache.InstanceData;
import com.zimbra.cs.service.util.ItemId;
import com.zimbra.cs.service.util.ItemIdFormatter;
import com.zimbra.cs.util.AccountUtil;
import com.zimbra.cs.zclient.ZMailbox;
import com.zimbra.soap.ZimbraSoapContext;

/*
<GetMiniCalRequest s="range start time in millis" e="range end time in millis">
  <folder id="..."/>+
</GetMiniCalRequest>

<GetMiniCalResponse>
  <date>yyyymmdd</date>*
</GetMiniCalResponse>
 */

public class GetMiniCal extends CalendarRequest {

	@Override
	public Element handle(Element request, Map<String, Object> context)
			throws ServiceException {
        ZimbraSoapContext zsc = getZimbraSoapContext(context);
        Mailbox mbox = getRequestedMailbox(zsc);
        Account authAcct = getAuthenticatedAccount(zsc);
        OperationContext octxt = getOperationContext(zsc, context);
        AuthToken authToken = zsc.getAuthToken();

        long rangeStart = request.getAttributeLong(MailConstants.A_CAL_START_TIME);
        long rangeEnd = request.getAttributeLong(MailConstants.A_CAL_END_TIME);

        List<ItemId> folderIids = new ArrayList<ItemId>();
        for (Iterator<Element> foldersIter = request.elementIterator(MailConstants.E_FOLDER); foldersIter.hasNext(); ) {
            Element fElem = foldersIter.next();
            ItemId iidFolder = new ItemId(fElem.getAttribute(MailConstants.A_ID), zsc);
            folderIids.add(iidFolder);
        }

        ICalTimeZone tz = ICalTimeZone.getAccountTimeZone(authAcct);  // requestor's time zone, not mailbox owner's
        TreeSet<String> busyDates = new TreeSet<String>();

        Provisioning prov = Provisioning.getInstance();
        MailboxManager mboxMgr = MailboxManager.getInstance();
        Server localServer = prov.getLocalServer();

        Map<Server, Map<String /* account id */, List<Integer> /* folder ids */>> groupedByServer =
            Search.groupByServer(ItemId.groupFoldersByAccount(octxt, mbox, folderIids));

        // for each server
        for (Map.Entry<Server, Map<String, List<Integer>>> serverMapEntry : groupedByServer.entrySet()) {
            Server server = serverMapEntry.getKey();
            Map<String, List<Integer>> accountFolders = serverMapEntry.getValue();
            if (server.equals(localServer)) {  // local server
                for (Map.Entry<String, List<Integer>> entry : accountFolders.entrySet()) {
                    String acctId = entry.getKey();
                    List<Integer> folderIds = entry.getValue();
                    Account targetAcct = prov.get(AccountBy.id, acctId);
                    if (targetAcct == null) {
                        ZimbraLog.calendar.warn("Skipping unknown account " + acctId + " during minical search");
                        continue;
                    }
                    Mailbox targetMbox = mboxMgr.getMailboxByAccount(targetAcct);
                    for (int folderId : folderIds) {
                        try {
                            doLocalFolder(octxt, tz, targetMbox, folderId, rangeStart, rangeEnd, busyDates);
                        } catch (ServiceException e) {
                            String ecode = e.getCode();
                            if (ecode.equals(ServiceException.PERM_DENIED)) {
                                // share permission was revoked
                                ItemIdFormatter ifmt = new ItemIdFormatter(authAcct.getId(), targetMbox.getAccountId(), false);
                                ZimbraLog.calendar.warn(
                                        "Ignoring permission error during calendar search of folder " + ifmt.formatItemId(folderId), e);
                            } else if (ecode.equals(MailServiceException.NO_SUCH_FOLDER)) {
                                // shared calendar folder was deleted by the owner
                                ItemIdFormatter ifmt = new ItemIdFormatter(authAcct.getId(), targetMbox.getAccountId(), false);
                                ZimbraLog.calendar.warn(
                                        "Ignoring deleted calendar folder " + ifmt.formatItemId(folderId));
                            } else {
                                throw e;
                            }
                        }
                    }
                }
            } else {  // remote server
                String nominalTargetAcctId = null;  // mail service soap requests want to see a target account
                List<String> folderList = new ArrayList<String>();
                for (Map.Entry<String, List<Integer>> entry : accountFolders.entrySet()) {
                    String acctId = entry.getKey();
                    if (nominalTargetAcctId == null)
                        nominalTargetAcctId = acctId;
                    ItemIdFormatter ifmt = new ItemIdFormatter(authAcct.getId(), acctId, false);
                    List<Integer> folderIds = entry.getValue();
                    for (int folderId : folderIds) {
                        folderList.add(ifmt.formatItemId(folderId));
                    }
                }
                doRemoteFolders(authToken, nominalTargetAcctId, tz, folderList, rangeStart, rangeEnd, busyDates);
            }
        }

        Element response = getResponseElement(zsc);
        for (String datestamp : busyDates) {
        	Element dateElem = response.addElement(MailConstants.E_CAL_MINICAL_DATE);
        	dateElem.setText(datestamp);
        }

        return response;
	}

	private static void doLocalFolder(OperationContext octxt, ICalTimeZone tz, Mailbox mbox, int folderId,
									  long rangeStart, long rangeEnd, Set<String> busyDates)
	throws ServiceException {
		Calendar cal = new GregorianCalendar(tz);
        CalendarData calData = mbox.getCalendarSummaryForRange(
                octxt, folderId, MailItem.TYPE_APPOINTMENT, rangeStart, rangeEnd);
        if (calData != null) {
        	for (Iterator<CalendarItemData> itemIter = calData.calendarItemIterator(); itemIter.hasNext(); ) {
        		CalendarItemData item = itemIter.next();
        		for (Iterator<InstanceData> instIter = item.instanceIterator(); instIter.hasNext(); ) {
        			InstanceData inst = instIter.next();
        			Long start = inst.getDtStart();
        			if (start != null) {
        				String datestampStart = getDatestamp(cal, start);
        				busyDates.add(datestampStart);
        				Long duration = inst.getDuration();
        				if (duration != null) {
        					long end = start + duration;
        					String datestampEnd = getDatestamp(cal, end);
        					busyDates.add(datestampEnd);
        				}
        			}
        		}
        	}
        }
	}

    private static void doRemoteFolders(AuthToken authToken, String remoteAccountId, ICalTimeZone tz, List<String> remoteFolders,
    								    long rangeStart, long rangeEnd, Set<String> busyDates)
    throws ServiceException {

        Account target = Provisioning.getInstance().get(Provisioning.AccountBy.id, remoteAccountId);
        if (target == null)
            throw AccountServiceException.NO_SUCH_ACCOUNT(remoteAccountId);
        ZMailbox.Options zoptions = new ZMailbox.Options(authToken.toZAuthToken(), AccountUtil.getSoapUri(target));
        zoptions.setTargetAccount(remoteAccountId);
        zoptions.setTargetAccountBy(AccountBy.id);
        zoptions.setNoSession(true);
        zoptions.setRequestProtocol(SoapProtocol.SoapJS);
        zoptions.setResponseProtocol(SoapProtocol.SoapJS);
        ZMailbox zmbx = ZMailbox.getMailbox(zoptions);
        String remoteIds[] = new String[remoteFolders.size()];
        for (int i=0; i < remoteIds.length; i++) remoteIds[i] = remoteFolders.get(i).toString();
        Set<String> result = zmbx.getMiniCal(rangeStart, rangeEnd, remoteIds);

        for (String datestamp : result) {
        	busyDates.add(datestamp);
        }
    }

	private static String getDatestamp(Calendar cal, long millis) {
		cal.setTimeInMillis(millis);
		int year = cal.get(Calendar.YEAR);
		int month = cal.get(Calendar.MONTH) + 1;
		int day = cal.get(Calendar.DAY_OF_MONTH);
		return Integer.toString(year * 10000 + month * 100 + day);
	}
}
