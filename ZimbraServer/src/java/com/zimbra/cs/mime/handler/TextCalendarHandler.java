/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2006, 2007, 2009 Zimbra, Inc.
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
package com.zimbra.cs.mime.handler;

import java.io.InputStream;

import javax.activation.DataSource;

import org.apache.lucene.document.Document;

import com.zimbra.cs.convert.AttachmentInfo;
import com.zimbra.cs.mailbox.calendar.ZCalendar.ICalTok;
import com.zimbra.cs.mailbox.calendar.ZCalendar.ZCalendarBuilder;
import com.zimbra.cs.mailbox.calendar.ZCalendar.ZComponent;
import com.zimbra.cs.mailbox.calendar.ZCalendar.ZVCalendar;
import com.zimbra.cs.mime.Mime;
import com.zimbra.cs.mime.MimeHandler;
import com.zimbra.cs.mime.MimeHandlerException;
import com.zimbra.cs.mime.MimeHandlerManager;
import com.zimbra.common.util.ByteUtil;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.common.mime.MimeConstants;

public class TextCalendarHandler extends MimeHandler {
    private String mContent;
    private ZVCalendar miCalendar;

    @Override protected boolean runsExternally() {
        return false;
    }

    @Override public ZVCalendar getICalendar() throws MimeHandlerException {
        analyze();
        return miCalendar;
    }

    @Override protected String getContentImpl() throws MimeHandlerException {
        analyze();
        return mContent;
    }

    private static final ICalTok COMPONENT_TYPES[] = { ICalTok.VEVENT, ICalTok.VTODO };

    private void analyze() throws MimeHandlerException {
        if (mContent != null)
            return;

        DataSource source = getDataSource();
        InputStream is = null;
        int maxLength = MimeHandlerManager.getIndexedTextLimit();
        try {
            is = source.getInputStream();
            String charset = MimeConstants.P_CHARSET_UTF8;
            String ctStr = source.getContentType();
            if (ctStr != null) {
                String cs = Mime.getCharset(ctStr);
                if (cs != null)
                    charset = cs;
            }
            miCalendar = ZCalendarBuilder.build(is, charset);

            mContent = "";
            StringBuilder buf = new StringBuilder(1024);
            for (ICalTok type : COMPONENT_TYPES) {
                ZComponent comp = miCalendar.getComponent(type);
                if (comp == null)
                    continue;

                String content = comp.getPropVal(ICalTok.DESCRIPTION, "").trim();
                if (content.equals(""))
                    content = comp.getPropVal(ICalTok.SUMMARY, "").trim();
                if (content.equals(""))
                    continue;

                if (buf.length() > 0)
                    buf.append(' ');
                if (buf.length() + content.length() > maxLength) {
                    buf.append(content.substring(0, maxLength - buf.length()));
                    break;
                }
                buf.append(content);
            }
            mContent = buf.toString();
        } catch (Exception e) {
            mContent = "";
            ZimbraLog.index.warn("error reading text/calendar mime part", e);
            throw new MimeHandlerException(e);
        } finally {
            ByteUtil.closeStream(is);
        }
    }

    @Override public void addFields(Document doc) {
    }

    @Override public String convert(AttachmentInfo doc, String baseURL) {
        throw new UnsupportedOperationException();
    }

    @Override public boolean doConversion() {
        return false;
    }
}
