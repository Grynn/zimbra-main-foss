/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2007, 2008 Zimbra, Inc.
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

package com.zimbra.cs.service.mail;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.Element;
import com.zimbra.common.soap.MailConstants;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.account.ldap.LdapUtil;
import com.zimbra.cs.mailbox.MailServiceException;
import com.zimbra.cs.mailbox.Mailbox;
import com.zimbra.cs.mailbox.OperationContext;
import com.zimbra.cs.mailbox.calendar.Invite;
import com.zimbra.cs.mailbox.calendar.ZCalendar.ZCalendarBuilder;
import com.zimbra.cs.mailbox.calendar.ZCalendar.ZVCalendar;
import com.zimbra.cs.mime.Mime;
import com.zimbra.cs.service.FileUploadServlet;
import com.zimbra.cs.service.FileUploadServlet.Upload;
import com.zimbra.cs.service.util.ItemId;
import com.zimbra.soap.ZimbraSoapContext;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * @author schemers
 */
public class ImportAppointments extends MailDocumentHandler  {

    private static final String[] TARGET_FOLDER_PATH = new String[] { MailConstants.A_FOLDER };
    protected String[] getProxiedIdPath(Element request)     { return TARGET_FOLDER_PATH; }
    protected boolean checkMountpointProxy(Element request)  { return true; }

    String DEFAULT_FOLDER_ID = Mailbox.ID_FOLDER_CALENDAR + "";

    public Element handle(Element request, Map<String, Object> context) throws ServiceException {
        ZimbraSoapContext zsc = getZimbraSoapContext(context);
        Mailbox mbox = getRequestedMailbox(zsc);
        OperationContext octxt = getOperationContext(zsc, context);

        String folder = request.getAttribute(MailConstants.A_FOLDER, DEFAULT_FOLDER_ID);
        ItemId iidFolder = new ItemId(folder, zsc);

        String ct = request.getAttribute(MailConstants.A_CONTENT_TYPE);
        if (!ct.equalsIgnoreCase("ics") && !ct.equalsIgnoreCase(Mime.CT_TEXT_CALENDAR))
            throw ServiceException.INVALID_REQUEST("unsupported content type: " + ct, null);

        Element content = request.getElement(MailConstants.E_CONTENT);
        List<Upload> uploads = null;
        BufferedReader reader = null;
        String attachment = content.getAttribute(MailConstants.A_ATTACHMENT_ID, null);
        String messageId = content.getAttribute(MailConstants.A_MESSAGE_ID, null);
        if (attachment != null && messageId != null)
            throw ServiceException.INVALID_REQUEST("use either aid or mid but not both", null);
        try {
            if (attachment != null) {
                reader = parseUploadedContent(zsc, attachment, uploads = new ArrayList<Upload>());
            } else if (messageId != null) {
                // part of existing message
                ItemId iid = new ItemId(messageId, zsc);
                String part = content.getAttribute(MailConstants.A_PART);
                String[] acceptableTypes = new String[] { Mime.CT_TEXT_CALENDAR };
                String partStr = CreateContact.fetchItemPart(
                        zsc, octxt, mbox, iid, part, acceptableTypes, Mime.P_CHARSET_UTF8);
                reader = new BufferedReader(new StringReader(partStr));
            } else {
                reader = new BufferedReader(new StringReader(content.getText()));
            }

            List<ZVCalendar> icals = ZCalendarBuilder.buildMulti(reader);
            reader.close();

            List<Invite> invites = Invite.createFromCalendar(mbox.getAccount(), null, icals, true, true, null);

            Set<String> uidsSeen = new HashSet<String>();
            StringBuilder ids = new StringBuilder();

            for (Invite inv : invites) {
                // handle missing UIDs on remote calendars by generating them as needed
                String uid = inv.getUid();
                if (uid == null) {
                    uid = LdapUtil.generateUUID();
                    inv.setUid(uid);
                }
                boolean addRevision;
                if (!uidsSeen.contains(uid)) {
                    addRevision = true;
                    uidsSeen.add(uid);
                } else {
                    addRevision = false;
                }
                inv.sanitize(false);  // Clean up known bad patterns to increase the chance of successful import.
                // and add the invite to the calendar!
                try {
                    int[] invIds = mbox.addInvite(octxt, inv, iidFolder.getId(), false, addRevision);
                    if (invIds != null && invIds.length >= 2) {
                        if (ids.length() > 0) ids.append(",");
                        ids.append(invIds[0]).append("-").append(invIds[1]);
                    }
                } catch (ServiceException e) {
                    ZimbraLog.calendar.warn("Skipping bad iCalendar object during import: uid=" + inv.getUid(), e);
                }
            }
            
            Element response = zsc.createElement(MailConstants.IMPORT_APPOINTMENTS_RESPONSE);
            Element cn = response.addElement(MailConstants.E_APPOINTMENT);
            cn.addAttribute(MailConstants.A_IDS, ids.toString());
            cn.addAttribute(MailConstants.A_NUM, invites.size());
            return response;

        } catch (IOException e) {
            throw MailServiceException.UNABLE_TO_IMPORT_APPOINTMENTS(e.getMessage(), e);
        } finally {
            if (reader != null)
                try { reader.close(); } catch (IOException e) { }
            if (attachment != null)
                FileUploadServlet.deleteUploads(uploads);
        }

    }

    private static BufferedReader parseUploadedContent(ZimbraSoapContext lc, String attachId, List<Upload> uploads)
    throws ServiceException {
        Upload up = FileUploadServlet.fetchUpload(lc.getAuthtokenAccountId(), attachId, lc.getAuthToken());
        if (up == null)
            throw MailServiceException.NO_SUCH_UPLOAD(attachId);
        uploads.add(up);
        try {
            return new BufferedReader(new InputStreamReader(up.getInputStream(), "UTF-8"));
        } catch (IOException e) {
            throw ServiceException.FAILURE(e.getMessage(), e);
        }
    }
}
