/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2011 Zimbra, Inc.
 * 
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.3 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * ***** END LICENSE BLOCK *****
 */

package com.zimbra.soap.mail.message;

import com.google.common.base.Objects;
import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;
import javax.xml.bind.annotation.XmlRootElement;

import com.zimbra.common.soap.MailConstants;

@XmlAccessorType(XmlAccessType.FIELD)
@XmlRootElement(name=MailConstants.E_SYNC_REQUEST)
public class SyncRequest {

    @XmlAttribute(name=MailConstants.A_TOKEN, required=false)
    private String token;

    @XmlAttribute(name=MailConstants.A_CALENDAR_CUTOFF, required=false)
    private Long calendarCutoff;

    @XmlAttribute(name=MailConstants.A_FOLDER, required=false)
    private String folderId;

    @XmlAttribute(name=MailConstants.A_TYPED_DELETES, required=false)
    private Boolean typedDeletes;

    public SyncRequest() {
    }

    public void setToken(String token) { this.token = token; }
    public void setCalendarCutoff(Long calendarCutoff) {
        this.calendarCutoff = calendarCutoff;
    }
    public void setFolderId(String folderId) { this.folderId = folderId; }
    public void setTypedDeletes(Boolean typedDeletes) {
        this.typedDeletes = typedDeletes;
    }
    public String getToken() { return token; }
    public Long getCalendarCutoff() { return calendarCutoff; }
    public String getFolderId() { return folderId; }
    public Boolean getTypedDeletes() { return typedDeletes; }

    @Override
    public String toString() {
        return Objects.toStringHelper(this)
            .add("token", token)
            .add("calendarCutoff", calendarCutoff)
            .add("folderId", folderId)
            .add("typedDeletes", typedDeletes)
            .toString();
    }
}
