/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2006, 2007, 2008 Zimbra, Inc.
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

package com.zimbra.cs.zclient;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.Element;
import com.zimbra.common.soap.Element.KeyValuePair;
import com.zimbra.common.soap.MailConstants;
import com.zimbra.cs.zclient.event.ZModifyContactEvent;
import com.zimbra.cs.zclient.event.ZModifyEvent;
import org.json.JSONException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ZContact implements ZItem, ToZJSONObject {

    /** "File as" setting: &nbsp;<code>Last, First</code> */
    public static final String FA_LAST_C_FIRST = "1";
    /** "File as" setting: &nbsp;<code>First Last</code> */
    public static final String FA_FIRST_LAST = "2";
    /** "File as" setting: &nbsp;<code>Company</code> */
    public static final String FA_COMPANY = "3";
    /** "File as" setting: &nbsp;<code>Last, First (Company)</code> */
    public static final String FA_LAST_C_FIRST_COMPANY = "4";
    /** "File as" setting: &nbsp;<code>First Last (Company)</code> */
    public static final String FA_FIRST_LAST_COMPANY = "5";
    /** "File as" setting: &nbsp;<code>Company (Last, First)</code> */
    public static final String FA_COMPANY_LAST_C_FIRST = "6";
    /** "File as" setting: &nbsp;<code>Company (First Last)</code> */
    public static final String FA_COMPANY_FIRST_LAST = "7";
    /** "File as" setting: <i>[explicitly specified "file as" string]</i> */
    public static final String FA_EXPLICIT = "8";

    private String mId;
    private String mFlags;
    private String mFolderId;
    private String mTagIds;
    private String mRevision;
    private long mDate;
    private long mMetaDataChangedDate;
    private Map<String, String> mAttrs;
    private boolean mGalContact;
    private ZMailbox mMailbox;

    public enum Flag {
        flagged('f'),
        attachment('a');

        private char mFlagChar;
        
        public char getFlagChar() { return mFlagChar; }

        public static String toNameList(String flags) {
            if (flags == null || flags.length() == 0) return "";            
            StringBuilder sb = new StringBuilder();
            for (int i=0; i < flags.length(); i++) {
                String v = null;
                for (Flag f : Flag.values()) {
                    if (f.getFlagChar() == flags.charAt(i)) {
                        v = f.name();
                        break;
                    }
                }
                if (sb.length() > 0) sb.append(", ");
                sb.append(v == null ? flags.substring(i, i+1) : v);
            }
            return sb.toString();
        }
        
        Flag(char flagChar) {
            mFlagChar = flagChar;            
        }
    }

    public ZContact(Element e, boolean galContact, ZMailbox mailbox) throws ServiceException {
        this(e, mailbox);
        mGalContact = galContact;
    }

    public ZContact(Element e, ZMailbox mailbox) throws ServiceException {
        mMailbox = mailbox;
        mId = e.getAttribute(MailConstants.A_ID);
        mFolderId = e.getAttribute(MailConstants.A_FOLDER, null);
        mFlags = e.getAttribute(MailConstants.A_FLAGS, null);
        mTagIds = e.getAttribute(MailConstants.A_TAGS, null);
        mRevision = e.getAttribute(MailConstants.A_REVISION, null);
        mDate = e.getAttributeLong(MailConstants.A_DATE, 0);
        mMetaDataChangedDate = e.getAttributeLong(MailConstants.A_MODIFIED_DATE, 0) * 1000;
        mAttrs = new HashMap<String, String>();

        for (KeyValuePair pair : e.listKeyValuePairs(MailConstants.E_ATTRIBUTE, MailConstants.A_ATTRIBUTE_NAME)) {
            mAttrs.put(pair.getKey(), pair.getValue());
        }
    }

    public ZMailbox getMailbox() {
        return mMailbox;
    }
    
    public String getFolderId() {
        return mFolderId;
    }

    public ZFolder getFolder() throws ServiceException {
        return mMailbox.getFolderById(mFolderId);
    }

    public String getId() {
        return mId;
    }

    public boolean isGalContact() {
        return mGalContact;
    }

    public boolean isGroup() { return getAttrs().get("dlist") != null; }

    public boolean getIsGroup() { return isGroup(); }

    public List<ZEmailAddress> getGroupMembers() throws ServiceException {
        return ZEmailAddress.parseAddresses(getAttrs().get("dlist"), ZEmailAddress.EMAIL_TYPE_TO);
    }

    public ZJSONObject toZJSONObject() throws JSONException {
        ZJSONObject jo = new ZJSONObject();
        jo.put("id", mId);
        jo.put("folderId", mFolderId);
        jo.put("flags", mFlags);
        jo.put("tagIds", mTagIds);
        jo.put("date", mDate);
        jo.put("metaDataChangedDate", mMetaDataChangedDate);
        jo.put("revision", mRevision);
        jo.put("isFlagged", isFlagged());
        jo.put("isGalContact", isGalContact());
        jo.put("isGroup", isGroup());
        jo.put("hasFlags", hasFlags());
        jo.put("hasTags", hasTags());
        jo.putMap("attrs", mAttrs);
        return jo;
    }

    public String toString() {
        return String.format("[ZContact %s]", mId);
    }

    public String dump() {
        return ZJSONObject.toString(this);
    }

    public String getFlags() {
        return mFlags;
    }

    public Map<String, String> getAttrs() {
        return mAttrs;
    }

    public long getDate() {
        return mDate;
    }

    public long getMetaDataChangedDate() {
        return mMetaDataChangedDate;
    }

    public String getRevision() {
        return mRevision;
    }

    public String getTagIds() {
        return mTagIds;
    }

    public boolean hasFlags() {
        return mFlags != null && mFlags.length() > 0;        
    }

    public boolean hasTags() {
        return mTagIds != null && mTagIds.length() > 0;
    }

    public boolean hasAttachment() {
        return hasFlags() && mFlags.indexOf(Flag.attachment.getFlagChar()) != -1;
    }

    public boolean isFlagged() {
        return hasFlags() && mFlags.indexOf(Flag.flagged.getFlagChar()) != -1;
    }

	public void modifyNotification(ZModifyEvent event) throws ServiceException {
		if (event instanceof ZModifyContactEvent) {
			ZModifyContactEvent cevent = (ZModifyContactEvent) event;
            if (cevent.getId().equals(mId)) {
                mTagIds = cevent.getTagIds(mTagIds);
                mFolderId = cevent.getFolderId(mFolderId);
                mFlags = cevent.getFlags(mFlags);
                mRevision = cevent.getRevision(mRevision);
                mMetaDataChangedDate = cevent.getDate(mDate);
                mMetaDataChangedDate = cevent.getMetaDataChangedDate(mMetaDataChangedDate);
                mAttrs = cevent.getAttrs(mAttrs);
            }
        }
	}

    public void delete() throws ServiceException {
        if (isGalContact()) throw ZClientException.CLIENT_ERROR("can't modify GAL contact", null);
        mMailbox.deleteContact(mId);
    }

    public void deleteItem() throws ServiceException {
        delete();
    }
    
    public void trash() throws ServiceException {
        if (isGalContact()) throw ZClientException.CLIENT_ERROR("can't modify GAL contact", null);
        mMailbox.trashContact(mId);
    }

    public void flag(boolean flagged) throws ServiceException {
        if (isGalContact()) throw ZClientException.CLIENT_ERROR("can't modify GAL contact", null);
        mMailbox.flagContact(mId, flagged);
    }

    public void tag(String nameOrId, boolean tagged) throws ServiceException {
        ZTag tag = mMailbox.getTag(nameOrId);
        if (tag == null)
            throw ZClientException.CLIENT_ERROR("unknown tag: "+nameOrId, null);
        else
           tag(tag, tagged);
    }

    public void tag(ZTag tag, boolean tagged) throws ServiceException {
        if (isGalContact()) throw ZClientException.CLIENT_ERROR("can't modify GAL contact", null);
        mMailbox.tagContact(mId, tag.getId(), tagged);
    }

    public void move(String pathOrId) throws ServiceException {
        ZFolder destFolder = mMailbox.getFolder(pathOrId);
        if (destFolder == null)
            throw ZClientException.CLIENT_ERROR("unknown folder: "+pathOrId, null);
        else
            move(destFolder);
    }

    public void move(ZFolder destFolder) throws ServiceException {
        if (isGalContact()) throw ZClientException.CLIENT_ERROR("can't modify GAL contact", null);
        mMailbox.moveContact(mId, destFolder.getId());
    }

    public void modify(Map<String,String> attrs, boolean replace) throws ServiceException {
        if (isGalContact()) throw ZClientException.CLIENT_ERROR("can't modify GAL contact", null);
        mMailbox.modifyContact(mId, replace, attrs, true);
    }

    // TODO: better handling of folder/tag ids
    public void update(String destFolderId, String tagList, String flags) throws ServiceException {
        if (isGalContact()) throw ZClientException.CLIENT_ERROR("can't modify GAL contact", null);
        mMailbox.updateContact(mId, destFolderId, tagList, flags);
    }

}
