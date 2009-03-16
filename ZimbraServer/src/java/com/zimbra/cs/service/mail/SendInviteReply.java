/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2005, 2006, 2007, 2008, 2009 Zimbra, Inc.
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

/*
 * Created on Mar 2, 2005
 */
package com.zimbra.cs.service.mail;

import java.util.Locale;
import java.util.Map;

import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMessage;

import com.zimbra.common.util.Log;
import com.zimbra.common.util.LogFactory;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.MailConstants;
import com.zimbra.common.soap.Element;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.CalendarResource;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.mailbox.ACL;
import com.zimbra.cs.mailbox.CalendarItem;
import com.zimbra.cs.mailbox.MailItem;
import com.zimbra.cs.mailbox.MailSender;
import com.zimbra.cs.mailbox.MailServiceException;
import com.zimbra.cs.mailbox.Mailbox;
import com.zimbra.cs.mailbox.Message;
import com.zimbra.cs.mailbox.Mailbox.OperationContext;
import com.zimbra.cs.mailbox.Message.CalendarItemInfo;
import com.zimbra.cs.mailbox.calendar.CalendarMailSender;
import com.zimbra.cs.mailbox.calendar.ICalTimeZone;
import com.zimbra.cs.mailbox.calendar.IcalXmlStrMap;
import com.zimbra.cs.mailbox.calendar.Invite;
import com.zimbra.cs.mailbox.calendar.ParsedDateTime;
import com.zimbra.cs.mailbox.calendar.RecurId;
import com.zimbra.cs.mailbox.calendar.TimeZoneMap;
import com.zimbra.cs.mailbox.calendar.ZAttendee;
import com.zimbra.cs.mailbox.calendar.CalendarMailSender.Verb;
import com.zimbra.cs.mailbox.calendar.ZCalendar.ZVCalendar;
import com.zimbra.cs.mime.ParsedMessage;
import com.zimbra.cs.service.util.ItemId;
import com.zimbra.cs.service.util.ItemIdFormatter;
import com.zimbra.common.util.L10nUtil;
import com.zimbra.common.util.L10nUtil.MsgKey;
import com.zimbra.soap.ZimbraSoapContext;

/**
 * @author tim
 */
public class SendInviteReply extends CalendarRequest {

    private static Log sLog = LogFactory.getLog(SendInviteReply.class);
    
    private static final String[] TARGET_PATH = new String[] { MailConstants.A_ID };
    protected String[] getProxiedIdPath(Element request)     { return TARGET_PATH; }
    protected boolean checkMountpointProxy(Element request)  { return false; }

    public Element handle(Element request, Map<String, Object> context)
    throws ServiceException {
        ZimbraSoapContext zsc = getZimbraSoapContext(context);
        Mailbox mbox = getRequestedMailbox(zsc);
        Account acct = getRequestedAccount(zsc);
        Account authAcct = getAuthenticatedAccount(zsc);
        boolean isAdmin = zsc.isUsingAdminPrivileges();
        OperationContext octxt = getOperationContext(zsc, context);

        boolean onBehalfOf = zsc.isDelegatedRequest();

        ItemId iid = new ItemId(request.getAttribute(MailConstants.A_ID), zsc);
        int compNum = (int) request.getAttributeLong(MailConstants.A_CAL_COMPONENT_NUM);
        
        String verbStr = request.getAttribute(MailConstants.A_VERB);
        Verb verb = CalendarMailSender.parseVerb(verbStr);
        
        boolean updateOrg = request.getAttributeBool(MailConstants.A_CAL_UPDATE_ORGANIZER, true);
        
        if (sLog.isInfoEnabled()) {
            sLog.info("<SendInviteReply id=" + new ItemIdFormatter(zsc).formatItemId(iid) + " verb=" + verb + " updateOrg=" + updateOrg + "> " + zsc.toString());
        }
        
        Element response = getResponseElement(zsc);
        
        //synchronized (mbox) {
            
            Invite oldInv = null;
            int calItemId; 
            int inviteMsgId;
            CalendarItem calItem;
            
            // the user could be accepting EITHER the original-mail-item (id="nnn") OR the
            // calendar item (id="aaaa-nnnn") --- work in both cases
            if (iid.hasSubpart()) {
                // directly accepting the calendar item
                calItemId = iid.getId();
                inviteMsgId = iid.getSubpartId();
                calItem = mbox.getCalendarItemById(octxt, calItemId); 
                if (calItem == null)
                	throw MailServiceException.NO_SUCH_CALITEM(iid.toString(), "Could not find calendar item");
                oldInv = calItem.getInvite(inviteMsgId, compNum);
            } else {
                // accepting the message: go find the calendar item and then the invite
                inviteMsgId = iid.getId();
                Message msg = mbox.getMessageById(octxt, inviteMsgId);
                Message.CalendarItemInfo info = msg.getCalendarItemInfo(compNum);
                if (info == null)
                	throw MailServiceException.NO_SUCH_CALITEM(iid.toString(), "Could not find calendar item");
                calItemId = info.getCalendarItemId();
                if (info.calItemCreated()) {
                    calItem = mbox.getCalendarItemById(octxt, calItemId);
                    if (calItem == null)
                    	throw MailServiceException.NO_SUCH_CALITEM(iid.toString(), "Could not find calendar item");
                    oldInv = calItem.getInvite(inviteMsgId, compNum);
                } else if (info.getInvite() != null) {
                    // Appointment wasn't auto-added upon invite delivery.  Add it now.
                    Invite inv = info.getInvite().newCopy();
                    inv.setMailItemId(inviteMsgId);
                    // Let's first try to lookup the appointment by UID.
                    calItem = mbox.getCalendarItemByUid(octxt, inv.getUid());
                    calItemId = calItem != null ? calItem.getId() : CalendarItemInfo.CALITEM_ID_NONE;
                    if (calItem != null) {
                        // If appointment exists, check if our invite has been outdated.
                        Invite curr = calItem.getInvite(inv.getRecurId());
                        if (curr != null && !inv.isSameOrNewerVersion(curr))
                            throw MailServiceException.INVITE_OUT_OF_DATE(iid.toString());
                    }
                    // If appointment already exists, we must apply the new invite, even when declining.
                    // If appointment doesn't already exists and we're declining, skip the add.
                    if (calItem != null || !CalendarMailSender.VERB_DECLINE.equals(verb)) {
                        // Add the invite.  This will either create or update the appointment.
                        int folder;
                        if (calItem != null && calItem.getFolderId() != Mailbox.ID_FOLDER_TRASH)
                            folder = calItem.getFolderId();
                        else
                            folder = inv.isTodo() ? Mailbox.ID_FOLDER_TASKS : Mailbox.ID_FOLDER_CALENDAR;
                        ParsedMessage pm = new ParsedMessage(msg.getMimeMessage(), false);
                        int[] ids = mbox.addInvite(octxt, inv, folder, pm);
                        if (ids != null && ids.length > 0)
                            calItemId = ids[0];
                        calItem = mbox.getCalendarItemById(octxt, calItemId);
                        if (calItem == null)
                            throw ServiceException.FAILURE("Could not create/update calendar item", null);
                    }
                    oldInv = inv;
                } else {
                    throw ServiceException.FAILURE("Missing invite data", null);
                }
            }
            if (oldInv == null)
                throw MailServiceException.INVITE_OUT_OF_DATE(iid.toString());
            
            if (calItem != null && (mbox.getEffectivePermissions(octxt, calItemId, MailItem.TYPE_UNKNOWN) & ACL.RIGHT_ACTION) == 0)
                throw ServiceException.PERM_DENIED("You do not have ACTION rights for CalendarItem "+calItemId);

            // Don't allow creating/editing a private appointment on behalf of another user,
            // unless that other user is a calendar resource.
            boolean allowPrivateAccess = calItem != null ? calItem.allowPrivateAccess(authAcct, isAdmin) : true;
            boolean isCalendarResource = acct instanceof CalendarResource;
            if (!allowPrivateAccess && !oldInv.isPublic() && !isCalendarResource)
                throw ServiceException.PERM_DENIED("Cannot reply to a private appointment/task on behalf of another user");

            // see if there is a specific Exception being referenced by this reply...
            Element exc = request.getOptionalElement(MailConstants.E_CAL_EXCEPTION_ID);
            ParsedDateTime exceptDt = null;
            if (exc != null) {
                TimeZoneMap tzmap = oldInv.getTimeZoneMap();
                Element tzElem = request.getOptionalElement(MailConstants.E_CAL_TZ);
                ICalTimeZone tz = null;
                if (tzElem != null) {
                    tz = CalendarUtils.parseTzElement(tzElem);
                    tzmap.add(tz);
                }
                exceptDt = CalendarUtils.parseDateTime(exc, tzmap);
            } else if (oldInv.hasRecurId()) {
                exceptDt = oldInv.getRecurId().getDt();
            }

            // If we're replying to a non-exception instance of a recurring appointment, create a local
            // exception instance first.  Then reply to it.
            if (calItem != null && oldInv.isRecurrence() && exceptDt != null) {
                Invite localException = oldInv.newCopy();
                localException.setLocalOnly(true);

                localException.setRecurrence(null);
                RecurId rid = new RecurId(exceptDt, RecurId.RANGE_NONE);
                localException.setRecurId(rid);
                long now = octxt != null ? octxt.getTimestamp() : System.currentTimeMillis();
                localException.setDtStamp(now);
                ParsedDateTime dtEnd = exceptDt.add(localException.getEffectiveDuration());
                localException.setDtStart(exceptDt);
                localException.setDtEnd(dtEnd);

                String partStat = verb.getXmlPartStat();
                localException.setPartStat(partStat);
                ZAttendee at = localException.getMatchingAttendee(acct);
                if (at != null)
                    at.setPartStat(partStat);

                // Carry over the MimeMessage/ParsedMessage to preserve any attachments.
                MimeMessage mmInv = calItem.getSubpartMessage(oldInv.getMailItemId());
                ParsedMessage pm = mmInv != null ? new ParsedMessage(mmInv, false) : null;

                mbox.addInvite(octxt, localException, calItem.getFolderId(), pm, true, false, true);

                // Refetch the updated calendar item and set oldInv to refetched local exception instance.
                calItem = mbox.getCalendarItemById(octxt, calItemId);
                oldInv = calItem.getInvite(rid);
            }

            if (updateOrg && oldInv.hasOrganizer()) {
                Locale locale;
                Account organizer = oldInv.getOrganizerAccount();
                if (organizer != null)
                    locale = organizer.getLocale();
                else
                    locale = !onBehalfOf ? acct.getLocale() : authAcct.getLocale();
                String subject;
                if (!allowPrivateAccess && !oldInv.isPublic())
                    subject = L10nUtil.getMessage(MsgKey.calendarSubjectWithheld, locale);
                else
                    subject = oldInv.getName();
                String replySubject =
                    CalendarMailSender.getReplySubject(verb, subject, locale);

                CalSendData csd = new CalSendData();
                csd.mOrigId = new ItemId(mbox, oldInv.getMailItemId());
                csd.mReplyType = MailSender.MSGTYPE_REPLY;
                csd.mInvite = CalendarMailSender.replyToInvite(acct, authAcct, onBehalfOf, allowPrivateAccess, oldInv, verb, replySubject, exceptDt);

                ZVCalendar iCal = csd.mInvite.newToICalendar(true);
                
                ParseMimeMessage.MimeMessageData parsedMessageData = new ParseMimeMessage.MimeMessageData();
                
                // did they specify a custom <m> message?  If so, then we don't have to build one...
                Element msgElem = request.getOptionalElement(MailConstants.E_MSG);
                if (msgElem != null) {
                    String text = ParseMimeMessage.getTextPlainContent(msgElem);
                    String html = ParseMimeMessage.getTextHtmlContent(msgElem);
                    iCal.addDescription(text, html);

                    MimeBodyPart[] mbps = new MimeBodyPart[1];
                    mbps[0] = CalendarMailSender.makeICalIntoMimePart(oldInv.getUid(), iCal);

                    // the <inv> element is *NOT* allowed -- we always build it manually
                    // based on the params to the <SendInviteReply> and stick it in the 
                    // mbps (additionalParts) parameter...
                    csd.mMm = ParseMimeMessage.parseMimeMsgSoap(zsc, octxt, mbox, msgElem, 
                        mbps, ParseMimeMessage.NO_INV_ALLOWED_PARSER, parsedMessageData);
                } else {
                    // build a default "Accepted" response
                    csd.mMm = CalendarMailSender.createDefaultReply(
                            acct, authAcct, isAdmin, onBehalfOf, calItem, oldInv, null, replySubject,
                            verb, null, iCal);
                }

                int apptFolderId;
                if (calItem != null)
                    apptFolderId = calItem.getFolderId();
                else
                    apptFolderId = oldInv.isTodo() ? Mailbox.ID_FOLDER_TASKS : Mailbox.ID_FOLDER_CALENDAR;
                sendCalendarMessage(zsc, octxt, apptFolderId, acct, mbox, csd, response, false);
            }

            RecurId recurId = null;
            if (exceptDt != null) {
                recurId = new RecurId(exceptDt, RecurId.RANGE_NONE);
            }
            ZAttendee me = oldInv.getMatchingAttendee(acct);
            String cnStr = null;
            String addressStr = acct.getName();
            String role = IcalXmlStrMap.ROLE_OPT_PARTICIPANT;
            int seqNo = oldInv.getSeqNo();
            long dtStamp = oldInv.getDTStamp();
            if (me != null) { 
                if (me.hasCn()) {
                    cnStr = me.getCn();
                }
                addressStr = me.getAddress();
                if (me.hasRole()) {
                    role = me.getRole();
                }
            }

            if (calItem != null)
                mbox.modifyPartStat(octxt, calItemId, recurId, cnStr, addressStr, null, role, verb.getXmlPartStat(), Boolean.FALSE, seqNo, dtStamp);
            
            // move the invite to the Trash if the user wants it
            if (acct.getBooleanAttr(Provisioning.A_zimbraPrefDeleteInviteOnReply, true)) {
                try {
                    if (onBehalfOf) {
                        // HACK: Run the move in the context of the organizer
                        // mailbox because the authenticated account doesn't
                        // have rights on Inbox and Trash folders.
                        octxt = new OperationContext(mbox);
                    }
                    mbox.move(octxt, inviteMsgId, MailItem.TYPE_MESSAGE, Mailbox.ID_FOLDER_TRASH);
                } catch (MailServiceException.NoSuchItemException nsie) {
                    sLog.debug("can't move nonexistent invite to Trash: " + inviteMsgId);
                }
            }
        //}  // synchronized (mbox)
        
        return response;
    }
}
