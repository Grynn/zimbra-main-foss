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
import com.google.common.collect.Iterables;
import com.google.common.collect.Lists;

import java.util.Collections;
import java.util.List;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlType;

import com.zimbra.common.soap.MailConstants;
import com.zimbra.soap.type.CustomMetadata;

@XmlAccessorType(XmlAccessType.FIELD)
@XmlType(propOrder = { "metadatas", "fragment" })
public class CommonDocumentInfo {

    @XmlAttribute(name=MailConstants.A_ID, required=true)
    private final String id;

    @XmlAttribute(name=MailConstants.A_NAME, required=false)
    private String name;

    @XmlAttribute(name=MailConstants.A_SIZE, required=false)
    private Long size;

    @XmlAttribute(name=MailConstants.A_DATE, required=false)
    private Long date;

    @XmlAttribute(name=MailConstants.A_FOLDER, required=false)
    private String folderId;

    @XmlAttribute(name=MailConstants.A_MODIFIED_SEQUENCE, required=false)
    private Integer modifiedSequence;

    @XmlAttribute(name=MailConstants.A_CHANGE_DATE, required=false)
    private Long changeDate;

    @XmlAttribute(name=MailConstants.A_REVISION, required=false)
    private Integer revision;

    @XmlAttribute(name=MailConstants.A_FLAGS, required=false)
    private String flags;

    @XmlAttribute(name=MailConstants.A_TAGS, required=false)
    private String tags;

    @XmlAttribute(name=MailConstants.A_DESC, required=false)
    private String description;

    @XmlAttribute(name=MailConstants.A_CONTENT_TYPE, required=false)
    private String contentType;

    @XmlAttribute(name=MailConstants.A_DESC_ENABLED, required=false)
    private Boolean descEnabled;

    @XmlAttribute(name=MailConstants.A_VERSION, required=false)
    private Integer version;

    @XmlAttribute(name=MailConstants.A_LAST_EDITED_BY, required=false)
    private String lastEditedBy;

    @XmlAttribute(name=MailConstants.A_CREATOR, required=false)
    private String creator;

    @XmlAttribute(name=MailConstants.A_CREATED_DATE, required=false)
    private Long createdDate;

    @XmlElement(name=MailConstants.E_METADATA, required=false)
    private List<CustomMetadata> metadatas = Lists.newArrayList();

    @XmlElement(name=MailConstants.E_FRAG, required=false)
    private String fragment;

    /**
     * no-argument constructor wanted by JAXB
     */
    @SuppressWarnings("unused")
    private CommonDocumentInfo() {
        this((String) null);
    }

    public CommonDocumentInfo(String id) {
        this.id = id;
    }

    public void setName(String name) { this.name = name; }
    public void setSize(Long size) { this.size = size; }
    public void setDate(Long date) { this.date = date; }
    public void setFolderId(String folderId) { this.folderId = folderId; }
    public void setModifiedSequence(Integer modifiedSequence) {
        this.modifiedSequence = modifiedSequence;
    }
    public void setChangeDate(Long changeDate) { this.changeDate = changeDate; }
    public void setRevision(Integer revision) { this.revision = revision; }
    public void setFlags(String flags) { this.flags = flags; }
    public void setTags(String tags) { this.tags = tags; }
    public void setDescription(String description) {
        this.description = description;
    }
    public void setContentType(String contentType) {
        this.contentType = contentType;
    }
    public void setDescEnabled(Boolean descEnabled) {
        this.descEnabled = descEnabled;
    }
    public void setVersion(Integer version) { this.version = version; }
    public void setLastEditedBy(String lastEditedBy) {
        this.lastEditedBy = lastEditedBy;
    }
    public void setCreator(String creator) { this.creator = creator; }
    public void setCreatedDate(Long createdDate) {
        this.createdDate = createdDate;
    }
    public void setMetadatas(Iterable <CustomMetadata> metadatas) {
        this.metadatas.clear();
        if (metadatas != null) {
            Iterables.addAll(this.metadatas,metadatas);
        }
    }

    public CommonDocumentInfo addMetadata(CustomMetadata metadata) {
        this.metadatas.add(metadata);
        return this;
    }

    public void setFragment(String fragment) { this.fragment = fragment; }
    public String getId() { return id; }
    public String getName() { return name; }
    public Long getSize() { return size; }
    public Long getDate() { return date; }
    public String getFolderId() { return folderId; }
    public Integer getModifiedSequence() { return modifiedSequence; }
    public Long getChangeDate() { return changeDate; }
    public Integer getRevision() { return revision; }
    public String getFlags() { return flags; }
    public String getTags() { return tags; }
    public String getDescription() { return description; }
    public String getContentType() { return contentType; }
    public Boolean getDescEnabled() { return descEnabled; }
    public Integer getVersion() { return version; }
    public String getLastEditedBy() { return lastEditedBy; }
    public String getCreator() { return creator; }
    public Long getCreatedDate() { return createdDate; }
    public List<CustomMetadata> getMetadatas() {
        return Collections.unmodifiableList(metadatas);
    }
    public String getFragment() { return fragment; }

    @Override
    public String toString() {
        return Objects.toStringHelper(this)
            .add("id", id)
            .add("name", name)
            .add("size", size)
            .add("date", date)
            .add("folderId", folderId)
            .add("modifiedSequence", modifiedSequence)
            .add("changeDate", changeDate)
            .add("revision", revision)
            .add("flags", flags)
            .add("tags", tags)
            .add("description", description)
            .add("contentType", contentType)
            .add("descEnabled", descEnabled)
            .add("version", version)
            .add("lastEditedBy", lastEditedBy)
            .add("creator", creator)
            .add("createdDate", createdDate)
            .add("metadatas", metadatas)
            .add("fragment", fragment)
            .toString();
    }
}
