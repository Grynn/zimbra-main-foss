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

package com.zimbra.soap.mail.type;

import com.google.common.base.Objects;
import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;
import javax.xml.bind.annotation.XmlElement;

import com.zimbra.common.soap.MailConstants;

@XmlAccessorType(XmlAccessType.FIELD)
public class ShareNotification {

    @XmlAttribute(name=MailConstants.A_TRUNCATED_CONTENT, required=false)
    private Boolean truncatedContent;

    @XmlElement(name=MailConstants.E_CONTENT, required=false)
    private String content;

    public ShareNotification() {
    }

    public void setTruncatedContent(Boolean truncatedContent) {
        this.truncatedContent = truncatedContent;
    }
    public void setContent(String content) { this.content = content; }
    public Boolean getTruncatedContent() { return truncatedContent; }
    public String getContent() { return content; }

    @Override
    public String toString() {
        return Objects.toStringHelper(this)
            .add("truncatedContent", truncatedContent)
            .add("content", content)
            .toString();
    }
}
