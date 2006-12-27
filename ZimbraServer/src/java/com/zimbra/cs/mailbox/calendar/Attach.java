/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 * 
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 ("License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.zimbra.com/license
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is: Zimbra Collaboration Suite Server.
 * 
 * The Initial Developer of the Original Code is Zimbra, Inc.
 * Portions created by Zimbra are Copyright (C) 2006 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s): 
 * 
 * ***** END LICENSE BLOCK *****
 */
package com.zimbra.cs.mailbox.calendar;

import com.zimbra.common.service.ServiceException;
import com.zimbra.cs.mailbox.Metadata;
import com.zimbra.cs.mailbox.calendar.ZCalendar.ICalTok;
import com.zimbra.cs.mailbox.calendar.ZCalendar.ZParameter;
import com.zimbra.cs.mailbox.calendar.ZCalendar.ZProperty;
import com.zimbra.cs.service.mail.MailService;
import com.zimbra.soap.Element;

/**
 * iCalendar ATTACH property
 */
public class Attach {

    private String mContentType;
    private String mUri;
    private String mBinaryB64Data;

    private Attach(String uri, String contentType) {
        mUri = uri;
        mContentType = contentType;
    }

    private Attach(String binaryB64Data) {
        mBinaryB64Data = binaryB64Data;
    }

    public String toString() {
        StringBuilder sb = new StringBuilder();
        if (mUri != null) {
            sb.append("uri=").append(mUri);
            if (mContentType != null)
                sb.append(", ct=").append(mContentType);
        } else
            sb.append("binaryBase64=").append(mBinaryB64Data);
        return sb.toString();
    }

    public Element toXml(Element parent) {
        Element attachElem = parent.addElement(MailService.E_CAL_ATTACH);
        if (mUri != null) {
            attachElem.addAttribute(MailService.A_CAL_ATTACH_URI, mUri);
            if (mContentType != null) {
                attachElem.addAttribute(MailService.A_CAL_ATTACH_CONTENT_TYPE, mContentType);
            }
        } else {
            attachElem.setText(mBinaryB64Data);
        }
        return attachElem;
    }

    public static Attach parse(Element element) throws ServiceException {
        String uri = element.getAttribute(MailService.A_CAL_ATTACH_URI, null);
        if (uri != null) {
            String ct = element.getAttribute(MailService.A_CAL_ATTACH_CONTENT_TYPE, null);
            return new Attach(uri, ct);
        } else {
            String binB64 = element.getTextTrim();
            return new Attach(binB64);
        }
    }

    public ZProperty toZProperty() {
        if (mUri != null) {
            ZProperty prop = new ZProperty(ICalTok.ATTACH, mUri);
            if (mContentType != null)
                prop.addParameter(new ZParameter(ICalTok.FMTTYPE, mContentType));
            return prop;
        } else {
            ZProperty prop = new ZProperty(ICalTok.ATTACH, mBinaryB64Data);
            prop.addParameter(new ZParameter(ICalTok.VALUE, "BINARY"));
            prop.addParameter(new ZParameter(ICalTok.ENCODING, "BASE64"));
            return prop;
        }
    }

    public static Attach parse(ZProperty prop) {
        String value = prop.getValue();
        ZParameter valueType = prop.getParameter(ICalTok.VALUE);
        if (valueType != null) {
            if (valueType.getValue().equals("BINARY"))
                return new Attach(value);
        }

        // URI
        String ct = null;
        ZParameter fmttype = prop.getParameter(ICalTok.FMTTYPE);
        if (fmttype != null)
            ct = fmttype.getValue();
        return new Attach(value, ct);
    }

    private static final String FN_CONTENT_TYPE = "ct";
    private static final String FN_URI = "uri";
    private static final String FN_BINARY = "bin";

    public Metadata encodeMetadata() {
        Metadata meta = new Metadata();
        if (mUri != null) {
            meta.put(FN_URI, mUri);
            meta.put(FN_CONTENT_TYPE, mContentType);
        } else {
            meta.put(FN_BINARY, mBinaryB64Data);
        }
        return meta;
    }

    public static Attach decodeMetadata(Metadata meta) throws ServiceException {
        String uri = meta.get(FN_URI, null);
        if (uri != null) {
            String ct = meta.get(FN_CONTENT_TYPE, null);
            return new Attach(uri, ct);
        } else {
            String binary = meta.get(FN_BINARY, null);
            return new Attach(binary);
        }
    }
}
