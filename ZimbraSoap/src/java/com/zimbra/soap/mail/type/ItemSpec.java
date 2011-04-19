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

import com.zimbra.common.soap.MailConstants;

@XmlAccessorType(XmlAccessType.FIELD)
public class ItemSpec {

    @XmlAttribute(name=MailConstants.A_ID, required=false)
    private String id;

    @XmlAttribute(name=MailConstants.A_FOLDER, required=false)
    private String folder;

    @XmlAttribute(name=MailConstants.A_NAME, required=false)
    private String name;

    @XmlAttribute(name=MailConstants.A_PATH, required=false)
    private String path;

    public ItemSpec() {
    }

    public void setId(String id) { this.id = id; }
    public void setFolder(String folder) { this.folder = folder; }
    public void setName(String name) { this.name = name; }
    public void setPath(String path) { this.path = path; }
    public String getId() { return id; }
    public String getFolder() { return folder; }
    public String getName() { return name; }
    public String getPath() { return path; }

    @Override
    public String toString() {
        return Objects.toStringHelper(this)
            .add("id", id)
            .add("folder", folder)
            .add("name", name)
            .add("path", path)
            .toString();
    }
}
