/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2009, 2010, 2011 Zimbra, Inc.
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
package com.zimbra.cs.account;

import com.sun.mail.smtp.SMTPMessage;
import com.zimbra.common.account.Key;
import com.zimbra.common.account.Key.AccountBy;
import com.zimbra.common.mime.MimeConstants;
import com.zimbra.common.mime.shim.JavaMailInternetAddress;
import com.zimbra.common.mime.shim.JavaMailMimeBodyPart;
import com.zimbra.common.mime.shim.JavaMailMimeMultipart;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.BlobMetaData;
import com.zimbra.common.util.L10nUtil;
import com.zimbra.common.util.L10nUtil.MsgKey;
import com.zimbra.common.util.Pair;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.account.Provisioning.GroupMembership;
import com.zimbra.cs.account.Provisioning.PublishedShareInfoVisitor;
import com.zimbra.cs.mailbox.ACL;
import com.zimbra.cs.mailbox.Folder;
import com.zimbra.cs.mailbox.MailItem;
import com.zimbra.cs.mailbox.Mailbox;
import com.zimbra.cs.mailbox.Mailbox.FolderNode;
import com.zimbra.cs.mailbox.MailboxManager;
import com.zimbra.cs.mailbox.MetadataList;
import com.zimbra.cs.mailbox.Mountpoint;
import com.zimbra.cs.mailbox.OperationContext;
import com.zimbra.cs.mailbox.acl.AclPushSerializer;
import com.zimbra.cs.servlet.ZimbraServlet;
import com.zimbra.cs.util.AccountUtil;
import com.zimbra.cs.util.JMSession;
import org.apache.commons.codec.binary.Hex;
import org.apache.commons.lang.StringEscapeUtils;

import javax.activation.DataHandler;
import javax.activation.DataSource;
import javax.mail.Address;
import javax.mail.MessagingException;
import javax.mail.Transport;
import javax.mail.internet.AddressException;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMultipart;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;


public class ShareInfo {

    private static String S_DELIMITER = ";";

    protected ShareInfoData mData;

    //
    // Grants that are applicable to the entry the share info is for.
    //
    // It is a list(MetadataList) instead of a single object(Metadata) because the entry we are
    // publishing share info for could belong to multiple groups, and each group can have different
    // rights(e.g. r, w, a, ...) on the folder.  The effective folder rights is union of all grants.
    // But when we publish share info we probably want to record where a right is from.   Ee keep
    // a list of all grants that apply to the entry we are publishing share info for.   In the future
    // when we support share info from cos/domain/all authed users, they will be added in the list too.
    //
    // e.g.
    //    - group dl2 is a member of group dl1
    //    - owner shares /Inbox to dl2 for rw rights
    //    - owner shares /Inbox to dl1 for aid rights
    //
    //    If we are publishing share info on dl2, the mGrants will contain two shares for /Inbox
    //
    protected MetadataList mGrants;

    public ShareInfo() {
        mData = new ShareInfoData();
    }

    public boolean hasGrant() {
        return (mGrants != null);
    }

    /**
     * serialize this ShareInfo into String persisted in LDAP
     *
     * The format is:
     * owner-zimbraId:itemId:btencoded-metadata
     *
     * @return
     */
    protected String serialize() throws ServiceException {
        // callsites should *not* call this if validateAndDiscoverGrants return false.
        if (mGrants == null)
            throw ServiceException.FAILURE("internal error, no matching grants", null);

        StringBuilder sb = new StringBuilder();
        sb.append(serializeOwnerAndFolder());
        sb.append(S_DELIMITER);
        sb.append(mGrants.toString());

        return sb.toString();
    }

    protected String serializeOwnerAndFolder() throws ServiceException {
        if (mGrants == null)
            throw ServiceException.FAILURE("internal error, no matching grants", null);

        StringBuilder sb = new StringBuilder();
        sb.append(mData.getOwnerAcctId());
        sb.append(S_DELIMITER);
        sb.append(mData.getFolderId());

        return sb.toString();
    }

    protected void deserialize(String encodedShareInfo) throws ServiceException {

        String[] parts = encodedShareInfo.split(S_DELIMITER);
        if (parts.length != 3) {
            throw ServiceException.FAILURE("malformed share info: " + encodedShareInfo, null);
        }

        mData.setOwnerAcctId(parts[0]);
        mData.setFolderId(Integer.valueOf(parts[1]));

        String encodedMetadata = parts[2];
        mGrants = new MetadataList(encodedMetadata);
    }

    private static boolean matchesGranteeType(byte onTheGrant, byte wanted) {
        return (wanted == 0 ) || (onTheGrant == wanted);
    }

    /*
     * a convenient method to get the grantee name since Mailbox.ACL.Grant does not set
     * it.  This method is not meant to validate the grant.  If the grantee cannot be found
     * just return empty string.
     */
    private static String granteeName(Provisioning prov, ACL.Grant grant) throws ServiceException {
        String granteeId = grant.getGranteeId();
        byte granteeType = grant.getGranteeType();

        String granteeName = "";
        if (granteeType == ACL.GRANTEE_USER) {
            Account acct = prov.get(AccountBy.id, granteeId);
            if (acct != null)
                granteeName = acct.getName();
        } else if (granteeType == ACL.GRANTEE_GROUP) {
            DistributionList dl = prov.getDLBasic(Key.DistributionListBy.id, granteeId);
            if (dl != null)
                granteeName = dl.getName();
        } else if (granteeType == ACL.GRANTEE_COS) {
            Cos cos = prov.get(Key.CosBy.id, granteeId);
            if (cos != null)
                granteeName = cos.getName();
        } else if (granteeType == ACL.GRANTEE_DOMAIN) {
            Domain domain = prov.get(Key.DomainBy.id, granteeId);
            if (domain != null)
                granteeName = domain.getName();
        } else {
            // GRANTEE_AUTHUSER, GRANTEE_PUBLIC, GRANTEE_GUEST
            granteeName = ACL.typeToString(granteeType);  // good enough
        }
        return granteeName;
    }

    private static String granteeDisplay(Provisioning prov, ACL.Grant grant) throws ServiceException {
        String granteeId = grant.getGranteeId();
        byte granteeType = grant.getGranteeType();

        String granteeDisplay = "";
        if (granteeType == ACL.GRANTEE_USER) {
            Account acct = prov.get(AccountBy.id, granteeId);
            if (acct != null)
                granteeDisplay = acct.getDisplayName();
        } else if (granteeType == ACL.GRANTEE_GROUP) {
            DistributionList dl = prov.getDLBasic(Key.DistributionListBy.id, granteeId);
            if (dl != null)
                granteeDisplay = dl.getDisplayName();
        } else if (granteeType == ACL.GRANTEE_COS) {
            Cos cos = prov.get(Key.CosBy.id, granteeId);
            if (cos != null)
                granteeDisplay = cos.getName();
        } else if (granteeType == ACL.GRANTEE_DOMAIN) {
            Domain domain = prov.get(Key.DomainBy.id, granteeId);
            if (domain != null)
                granteeDisplay = domain.getName();
        } else {
            // GRANTEE_AUTHUSER, GRANTEE_PUBLIC, GRANTEE_GUEST
            granteeDisplay = ACL.typeToString(granteeType);  // good enough
        }
        return granteeDisplay;
    }

    private static Set<Folder> getVisibleFolders(OperationContext octxt, Mailbox mbox) throws ServiceException {

        // use the easy one first
        Set<Folder> folders = mbox.getVisibleFolders(octxt);

        // if an admin  is doing this, it can see the entire mailbox of the owner,
        // and mbox.getVisibleFolders will return null
        // in this case get the entire folder tree

        if (folders == null) {
            FolderNode root = mbox.getFolderTree(octxt, null, false);
            // flatten it
            folders = flattenAndSortFolderTree(root);
        }
        return folders;
    }

    private static Set<Folder> flattenAndSortFolderTree(FolderNode root) {
        Set<Folder> folders = new HashSet<Folder>();
        flattenAndSortFolderTree(root, folders);
        return folders;
    }

    private static void flattenAndSortFolderTree(FolderNode node, Set<Folder> flattened) {
        if (node.mFolder != null)
            flattened.add(node.mFolder);
        for (FolderNode subNode : node.mSubfolders)
            flattenAndSortFolderTree(subNode, flattened);
    }


    /*
     * ===========================
     *          MountedFolders
     * ===========================
     */
    public static class MountedFolders {

        /*
         * a map of mounted folders of the account(passed to the ctor) with:
         *     key: {owner-acct-id}:{remote-folder-id}
         *     value: {local-folder-id}
         */
        private Map<String, Integer> mMountedFolders;

        public MountedFolders(OperationContext octxt, Account acct) throws ServiceException {
            mMountedFolders = getLocalMountpoints(octxt, acct);
        }

        public Integer getLocalFolderId(String ownerAcctId, int remoteFolderId) {
            if (mMountedFolders == null)
                return null;
            else {
                String key = getKey(ownerAcctId, remoteFolderId);
                return mMountedFolders.get(key);
            }
        }

        private String getKey(String ownerAcctId, int remoteFolderId) {
            return ownerAcctId + ":" + remoteFolderId;
        }

        /**
         * returns a map of:
         *     key: {owner-acct-id}:{remote-folder-id}
         *     value: {local-folder-id}
         *
         * @param octxt
         * @param acct
         * @return
         * @throws ServiceException
         */
        private Map<String, Integer> getLocalMountpoints(OperationContext octxt, Account acct) throws ServiceException {
            if (octxt == null)
                return null;

            Mailbox mbox = MailboxManager.getInstance().getMailboxByAccount(acct, false);
            if (mbox == null)
                throw ServiceException.FAILURE("mailbox not found for account " + acct.getId(), null);

            return getLocalMountpoints(octxt, mbox);

        }

        private Map<String, Integer> getLocalMountpoints(OperationContext octxt, Mailbox mbox) throws ServiceException {

            Map<String, Integer> mountpoints = new HashMap<String, Integer>();

            mbox.lock.lock();
            try {
                // get the root node...
                int folderId = Mailbox.ID_FOLDER_USER_ROOT;
                Folder folder = mbox.getFolderById(octxt, folderId);

                // for each subNode...
                Set<Folder> visibleFolders = mbox.getVisibleFolders(octxt);
                getLocalMountpoints(folder, visibleFolders, mountpoints);
            } finally {
                mbox.lock.release();
            }

            return mountpoints;
        }

        private void getLocalMountpoints(Folder folder, Set<Folder> visible, Map<String, Integer> mountpoints) throws ServiceException {
            boolean isVisible = visible == null || visible.remove(folder);
            if (!isVisible)
                return;

            if (folder instanceof Mountpoint) {
                Mountpoint mpt = (Mountpoint)folder;
                String mid =  getKey(mpt.getOwnerId(), mpt.getRemoteId());
                mountpoints.put(mid, mpt.getId());
            }

            // if this was the last visible folder overall, no need to look at children
            if (visible != null && visible.isEmpty())
                return;

            // write the subfolders' data to the response
            for (Folder subfolder : folder.getSubfolders(null)) {
                getLocalMountpoints(subfolder, visible, mountpoints);
            }
        }
    }


    /*
     * ===========================
     *          Discover
     * ===========================
     */
    public static class Discover extends ShareInfo {

        public static void discover(OperationContext octxt, Provisioning prov, Account targetAcct,
                byte granteeType, Account ownerAcct, PublishedShareInfoVisitor visitor) throws ServiceException {

            Mailbox ownerMbox = MailboxManager.getInstance().getMailboxByAccount(ownerAcct, false);
            if (ownerMbox == null)
                throw ServiceException.FAILURE("mailbox not found for account " + ownerAcct.getId(), null);

            Set<Folder> folders = getVisibleFolders(octxt, ownerMbox);
            for (Folder folder : folders)
                doDiscover(prov, targetAcct, granteeType, ownerAcct, folder, visitor);
        }

        private static void doDiscover(Provisioning prov, Account targetAcct,
                byte granteeType, Account ownerAcct, Folder folder, PublishedShareInfoVisitor visitor)
            throws ServiceException {

            ACL acl = folder.getEffectiveACL();

            if (acl == null)
                return;

            for (ACL.Grant grant : acl.getGrants()) {
                if ((targetAcct == null || grant.matches(targetAcct)) &&
                    matchesGranteeType(grant.getGranteeType(), granteeType)) {
                    ShareInfo si = new ShareInfo();

                    si.mData.setOwnerAcctId(ownerAcct.getId());
                    si.mData.setOwnerAcctEmail(ownerAcct.getName());
                    si.mData.setOwnerAcctDisplayName(ownerAcct.getDisplayName());
                    si.mData.setFolderId(folder.getId());
                    si.mData.setFolderPath(folder.getPath());
                    si.mData.setFolderDefaultView(folder.getDefaultView());
                    si.mData.setRights(grant.getGrantedRights());
                    si.mData.setGranteeType(grant.getGranteeType());
                    si.mData.setGranteeId(grant.getGranteeId());
                    si.mData.setGranteeName(granteeName(prov, grant));
                    si.mData.setGranteeDisplayName(granteeDisplay(prov, grant));

                    visitor.visit(si.mData);
                }
            }
        }
    }


    /*
     * ===========================
     *          Published
     * ===========================
     */
    public static class Published extends ShareInfo {

        /**
         * @param prov
         * @param acct
         * @param granteeType  if not null, return only shares granted to the granteeType
         * @param owner        if not null, return only shares granted by the owner
         * @param visitor
         * @throws ServiceException
         */
        public static void get(
                Provisioning prov, Account acct, byte granteeType, Account owner, PublishedShareInfoVisitor visitor)
            throws ServiceException {

            List<String> granteeIds = new LinkedList<String>();
            boolean includePublic = false;
            if (granteeType == 0) {
                // no grantee type specified, return all published shares
                granteeIds.add(acct.getId());
                GroupMembership aclGroups = prov.getGroupMembership(acct, false);
                granteeIds.addAll(aclGroups.groupIds());
                includePublic = true;

            } else if (granteeType == ACL.GRANTEE_USER) {
                granteeIds.add(acct.getId());

            } else if (granteeType == ACL.GRANTEE_GROUP) {
                GroupMembership aclGroups = prov.getGroupMembership(acct, false);
                granteeIds.addAll(aclGroups.groupIds());

            } else if (granteeType == ACL.GRANTEE_PUBLIC) {
                includePublic = true;

            } else {
                throw ServiceException.INVALID_REQUEST(
                        "unsupported grantee type: " + ACL.typeToString(granteeType), null);
            }

            getSharesPublished(prov, visitor, owner, granteeIds, includePublic);
        }

        public static void getPublished(Provisioning prov, DistributionList dl, boolean directOnly, Account owner,
                                        PublishedShareInfoVisitor visitor)
            throws ServiceException {

            List<String> granteeIds = new LinkedList<String>();
            if (directOnly) {
                // get shares published on the dl
                granteeIds.add(dl.getId());
            } else {
                granteeIds.addAll(prov.getGroupMembership(dl, false).groupIds());
            }
            getSharesPublished(prov, visitor, owner, granteeIds, false);
        }

        private static void getSharesPublished(Provisioning prov, PublishedShareInfoVisitor visitor, Account owner,
                                               List<String> granteeIds, boolean includePublic)
                throws ServiceException {

            if (granteeIds.isEmpty() && !includePublic) {
                return;
            }

            // construct search query
            StringBuilder searchQuery = new StringBuilder().append("(&(objectclass=zimbraAccount)(|");
            for (String id : granteeIds) {
                searchQuery.append("(zimbraSharedItem=granteeId:").append(id).append("*)");
            }
            if (includePublic) {
                searchQuery.append("(zimbraSharedItem=*granteeType:pub*)");
            }
            searchQuery.append("))");

            List<NamedEntry> accounts =
                    prov.searchAccounts(searchQuery.toString(),
                                        new String[] {
                                                Provisioning.A_zimbraId,
                                                Provisioning.A_zimbraSharedItem,
                                                Provisioning.A_displayName },
                                        null, false, Provisioning.SD_ACCOUNT_FLAG);

            //TODO - check for dups
            for (NamedEntry ne : accounts) {
                Account account = (Account) ne;
                if (owner != null) {
                    if (!owner.getId().equals(account.getId())) {
                        continue;
                    }
                }
                String[] sharedItems = account.getSharedItem();
                for (String sharedItem : sharedItems) {
                    ShareInfoData shareData = AclPushSerializer.deserialize(sharedItem);
                    if (granteeIds.contains(shareData.getGranteeId()) ||
                            (includePublic && shareData.getGranteeTypeCode() == ACL.GRANTEE_PUBLIC)) {
                        shareData.setOwnerAcctId(account.getId());
                        shareData.setOwnerAcctEmail(account.getName());
                        shareData.setOwnerAcctDisplayName(account.getDisplayName());
                        visitor.visit(shareData);
                    }
                }
            }
        }

    }

    /*
     * ===========================
     *      NotificationSender
     * ===========================
     */
    public static class NotificationSender {

        private static final short ROLE_VIEW  = ACL.RIGHT_READ;
        private static final short ROLE_ADMIN = ACL.RIGHT_READ |
                                                ACL.RIGHT_WRITE |
                                                ACL.RIGHT_INSERT |
                                                ACL.RIGHT_DELETE |
                                                ACL.RIGHT_ACTION |
                                                ACL.RIGHT_ADMIN;
        private static final short ROLE_MANAGER = ACL.RIGHT_READ |
                                                  ACL.RIGHT_WRITE |
                                                  ACL.RIGHT_INSERT |
                                                  ACL.RIGHT_DELETE |
                                                  ACL.RIGHT_ACTION;


        public static MimeMultipart genNotifBody(ShareInfoData sid, MsgKey intro, String notes, Locale locale)
                throws MessagingException, ServiceException {

            // Body
            MimeMultipart mmp = new JavaMailMimeMultipart("alternative");

            String guestUrl = null;
            if (sid.getGranteeTypeCode() == ACL.GRANTEE_GUEST) {
                Account owner = Provisioning.getInstance().getAccountById(sid.getOwnerAcctId());
                guestUrl = getGuestURL(owner, sid.getFolderId(), sid.getGranteeName());
            }

            // TEXT part (add me first!)
            MimeBodyPart textPart = new JavaMailMimeBodyPart();
            textPart.setText(genTextPart(sid, intro, notes, guestUrl, locale, null), MimeConstants.P_CHARSET_UTF8);
            mmp.addBodyPart(textPart);

            // HTML part
            MimeBodyPart htmlPart = new JavaMailMimeBodyPart();
            htmlPart.setDataHandler(
                    new DataHandler(new HtmlPartDataSource(genHtmlPart(sid, intro, notes, guestUrl, locale, null))));
            mmp.addBodyPart(htmlPart);

            // XML part
            MimeBodyPart xmlPart = new JavaMailMimeBodyPart();
            xmlPart.setDataHandler(new DataHandler(new XmlPartDataSource(genXmlPart(sid, notes, null))));
            mmp.addBodyPart(xmlPart);

            return mmp;
        }

        private static String getGuestURL(Account account, int folderId, String externalUserEmail)
                throws ServiceException {
            StringBuilder encodedBuff = new StringBuilder();
            BlobMetaData.encodeMetaData("aid", account.getId(), encodedBuff);
            BlobMetaData.encodeMetaData("fid", folderId, encodedBuff);
            BlobMetaData.encodeMetaData("email", externalUserEmail, encodedBuff);
            String data = new String(Hex.encodeHex(encodedBuff.toString().getBytes()));
            AuthTokenKey key = AuthTokenKey.getCurrentKey();
            String hmac = ZimbraAuthToken.getHmac(data, key.getKey());
            String encoded = key.getVersion() + "_" + hmac + "_" + data;
            String path = "/service/extuserprov/?p=" + encoded;
            return ZimbraServlet.getServiceUrl(
                    account.getServer(), Provisioning.getInstance().getDomain(account), path);
        }


        private static String genTextPart(
                ShareInfoData sid, MsgKey intro, String senderNotes, String guestUrl, Locale locale, StringBuilder sb) {
            if (sb == null)
                sb = new StringBuilder();

            sb.append("\n");
            if (intro != null) {
                sb.append(L10nUtil.getMessage(intro, locale));
                sb.append("\n\n");
            }

            sb.append(formatTextShareInfo(
                    MsgKey.shareNotifBodySharedItem, sid.getFolderName(), locale, formatFolderDesc(locale, sid)));
            sb.append(formatTextShareInfo(MsgKey.shareNotifBodyOwner, sid.getOwnerNotifName(), locale, null));
            sb.append("\n");
            sb.append(formatTextShareInfo(MsgKey.shareNotifBodyGrantee, sid.getGranteeNotifName(), locale, null));
            sb.append(formatTextShareInfo(MsgKey.shareNotifBodyRole, getRoleFromRights(sid, locale), locale, null));
            sb.append(formatTextShareInfo(
                    MsgKey.shareNotifBodyAllowedActions, getRightsText(sid, locale), locale, null));
            sb.append("\n");

            String notes;
            if (sid.getGranteeTypeCode() == ACL.GRANTEE_GUEST) {
                StringBuilder guestNotes = new StringBuilder();
                guestNotes.append("URL: " + guestUrl + "\n");
                guestNotes.append("\n");
                notes = guestNotes + (senderNotes==null?"":senderNotes) + "\n";
            } else
                notes = senderNotes;

            if (notes != null) {
                sb.append("*~*~*~*~*~*~*~*~*~*\n");
                sb.append(notes + "\n");
            }

            return sb.toString();
        }

        private static String genHtmlPart(
                ShareInfoData sid, MsgKey intro, String senderNotes, String guestUrl, Locale locale, StringBuilder sb) {
            if (sb == null)
                sb = new StringBuilder();

            if (intro != null) {
                sb.append("<h3>" + L10nUtil.getMessage(intro, locale) + "</h3>\n");
            }

            sb.append("<p>\n");
            sb.append("<table border=\"0\">\n");
            sb.append(formatHtmlShareInfo(MsgKey.shareNotifBodySharedItem, sid.getFolderName(), locale, formatFolderDesc(locale, sid)));
            sb.append(formatHtmlShareInfo(MsgKey.shareNotifBodyOwner, sid.getOwnerNotifName(), locale, null));
            sb.append("</table>\n");
            sb.append("</p>\n");

            sb.append("<table border=\"0\">\n");
            sb.append(formatHtmlShareInfo(MsgKey.shareNotifBodyGrantee, sid.getGranteeNotifName(), locale, null));
            sb.append(formatHtmlShareInfo(MsgKey.shareNotifBodyRole, getRoleFromRights(sid, locale), locale, null));
            sb.append(formatHtmlShareInfo(MsgKey.shareNotifBodyAllowedActions, getRightsText(sid, locale), locale, null));
            sb.append("</table>\n");

            if (sid.getGranteeTypeCode() == ACL.GRANTEE_GUEST) {
                sb.append("<p>\n");
                sb.append("<table border=\"0\">\n");
                sb.append("<tr valign=\"top\"><th align=\"left\">" +
                                  L10nUtil.getMessage(MsgKey.shareNotifBodyNotes) + ":" + "</th><td>" +
                                  "URL: " + guestUrl + "<br><br>");
                if (senderNotes != null)
                    sb.append(senderNotes);
                sb.append("</td></tr></table>\n");
                sb.append("</p>\n");
            } else if (senderNotes != null) {
                sb.append("<p>\n");
                sb.append("<table border=\"0\">\n");
                sb.append("<tr valign=\"top\"><th align=\"left\">" +
                        L10nUtil.getMessage(MsgKey.shareNotifBodyNotes) + ":" + "</th><td>" +
                        senderNotes + "</td></tr></table>\n");
                sb.append("</p>\n");
            }

            return sb.toString();
        }

        private static String genXmlPart(ShareInfoData sid, String senderNotes, StringBuilder sb) {
            if (sb == null)
                sb = new StringBuilder();
            /*
             * from ZimbraWebClient/WebRoot/js/zimbraMail/share/model/ZmShare.js

               ZmShare.URI = "urn:zimbraShare";
               ZmShare.VERSION = "0.1";
               ZmShare.NEW     = "new";
            */
            final String URI = "urn:zimbraShare";
            final String VERSION = "0.1";

            String notes = null;
            if (sid.getGranteeTypeCode() == ACL.GRANTEE_GUEST) {
                StringBuilder guestNotes = new StringBuilder();
                guestNotes.append("URL: " + sid.getUrl() + "\n");
                guestNotes.append("Username: " + sid.getGranteeName() + "\n");
                guestNotes.append("Password: " + sid.getGuestPassword() + "\n");
                guestNotes.append("\n");
                notes = guestNotes + (senderNotes==null?"":senderNotes) + "\n";
            } else
                notes = senderNotes;

            // make xml friendly
            notes = StringEscapeUtils.escapeXml(notes);
            
            sb.append("<share xmlns=\"" + URI + "\" version=\"" + VERSION + "\" action=\"new\">\n");
            sb.append("  <grantee id=\"" + sid.getGranteeId() + "\" email=\"" + sid.getGranteeName() + "\" name=\"" + sid.getGranteeNotifName() +"\"/>\n");
            sb.append("  <grantor id=\"" + sid.getOwnerAcctId() + "\" email=\"" + sid.getOwnerAcctEmail() + "\" name=\"" + sid.getOwnerNotifName() +"\"/>\n");
            sb.append("  <link id=\"" + sid.getFolderId() + "\" name=\"" + sid.getFolderName() + "\" view=\"" + sid.getFolderDefaultView() + "\" perm=\"" + ACL.rightsToString(sid.getRightsCode()) + "\"/>\n");
            sb.append("  <notes>" + (notes==null?"":notes) + "</notes>\n");
            sb.append("</share>\n");

            return sb.toString();
        }

        private static String formatTextShareInfo(MsgKey key, String value, Locale locale, String extra) {
            return L10nUtil.getMessage(key, locale) + ": " + value + (extra==null?"":" "+extra) + "\n";
        }

        private static String formatHtmlShareInfo(MsgKey key, String value, Locale locale, String extra) {
            return "<tr>" +
                   "<th align=\"left\">" + L10nUtil.getMessage(key, locale) + ":" + "</th>" +
                   "<td align=\"left\">" + value + (extra==null?"":" "+extra) + "</td>" +
                   "</tr>\n";
        }

        private static void appendCommaSeparated(StringBuffer sb, String s) {
            if (sb.length() > 0)
                sb.append(", ");
            sb.append(s);
        }

        private static String getRoleFromRights(ShareInfoData sid, Locale locale) {
            short rights = sid.getRightsCode();
            if (ROLE_VIEW == rights)
                return L10nUtil.getMessage(MsgKey.shareNotifBodyGranteeRoleViewer, locale);
            else if (ROLE_ADMIN == rights)
                return L10nUtil.getMessage(MsgKey.shareNotifBodyGranteeRoleAdmin, locale);
            else if (ROLE_MANAGER == rights)
                return L10nUtil.getMessage(MsgKey.shareNotifBodyGranteeRoleManager, locale);
            else
                return "";
        }

        private static String getRightsText(ShareInfoData sid, Locale locale) {
            short rights = sid.getRightsCode();
            StringBuffer r = new StringBuffer();
            if ((rights & ACL.RIGHT_READ) != 0)      appendCommaSeparated(r, L10nUtil.getMessage(MsgKey.shareNotifBodyActionRead, locale));
            if ((rights & ACL.RIGHT_WRITE) != 0)     appendCommaSeparated(r, L10nUtil.getMessage(MsgKey.shareNotifBodyActionWrite, locale));
            if ((rights & ACL.RIGHT_INSERT) != 0)    appendCommaSeparated(r, L10nUtil.getMessage(MsgKey.shareNotifBodyActionInsert, locale));
            if ((rights & ACL.RIGHT_DELETE) != 0)    appendCommaSeparated(r, L10nUtil.getMessage(MsgKey.shareNotifBodyActionDelete, locale));
            if ((rights & ACL.RIGHT_ACTION) != 0)    appendCommaSeparated(r, L10nUtil.getMessage(MsgKey.shareNotifBodyActionAction, locale));
            if ((rights & ACL.RIGHT_ADMIN) != 0)     appendCommaSeparated(r, L10nUtil.getMessage(MsgKey.shareNotifBodyActionAdmin, locale));
            if ((rights & ACL.RIGHT_PRIVATE) != 0)   appendCommaSeparated(r, L10nUtil.getMessage(MsgKey.shareNotifBodyActionPrivate, locale));
            if ((rights & ACL.RIGHT_FREEBUSY) != 0)  appendCommaSeparated(r, L10nUtil.getMessage(MsgKey.shareNotifBodyActionFreebusy, locale));
            if ((rights & ACL.RIGHT_SUBFOLDER) != 0) appendCommaSeparated(r, L10nUtil.getMessage(MsgKey.shareNotifBodyActionSubfolder, locale));

            return r.toString();
        }

        private static String formatFolderDesc(Locale locale, ShareInfoData sid) {
            MailItem.Type view = sid.getFolderDefaultViewCode();

            String folderView;  // need to L10N these?
            switch (view) {
            case MESSAGE:
                folderView = "Mail";
                break;
            case APPOINTMENT:
                folderView = "Calendar";
                break;
            case TASK:
                folderView = "Task";
                break;
            case CONTACT:
                folderView = "Addres";
                break;
            case WIKI:
                folderView = "Notebook";
                break;
            default:
                folderView = sid.getFolderDefaultView();
                break;
            }

            return L10nUtil.getMessage(MsgKey.shareNotifBodyFolderDesc, locale, folderView);
        }

        private static class MailSenderVisitor implements PublishedShareInfoVisitor {

            List<ShareInfoData> mShares = new ArrayList<ShareInfoData>();

            @Override
            public void visit(ShareInfoData sid) throws ServiceException {
                mShares.add(sid);
            }

            private int getNumShareInfo() {
                return mShares.size();
            }

            private String genText(String dlName, Locale locale, Integer idx) {
                StringBuilder sb = new StringBuilder();

                sb.append("\n");
                sb.append(L10nUtil.getMessage(MsgKey.shareNotifBodyAddedToGroup1, locale, dlName));
                sb.append("\n\n");
                sb.append(L10nUtil.getMessage(MsgKey.shareNotifBodyAddedToGroup2, locale, dlName));
                sb.append("\n\n");

                if (idx == null) {
                    for (ShareInfoData sid : mShares) {
                        genTextPart(sid, null, null, null, locale, sb);
                    }
                } else
                    genTextPart(mShares.get(idx), null, null, null, locale, sb);

                sb.append("\n\n");
                return sb.toString();
            }


            private String genHtml(String dlName, Locale locale, Integer idx) {
                StringBuilder sb = new StringBuilder();

                sb.append("<h4>\n");
                sb.append("<p>" + L10nUtil.getMessage(MsgKey.shareNotifBodyAddedToGroup1, locale, dlName) + "</p>\n");
                sb.append("<p>" + L10nUtil.getMessage(MsgKey.shareNotifBodyAddedToGroup2, locale, dlName) + "</p>\n");
                sb.append("</h4>\n");
                sb.append("\n");

                if (idx == null) {
                    for (ShareInfoData sid : mShares) {
                        genHtmlPart(sid, null, null, null, locale, sb);
                    }
                } else
                    genHtmlPart(mShares.get(idx), null, null, null, locale, sb);

                return sb.toString();
            }

            private String genXml(Integer idx) {
                StringBuilder sb = new StringBuilder();

                 if (idx == null) {
                    for (ShareInfoData sid : mShares) {
                        genXmlPart(sid, null, sb);
                    }
                } else {
                    genXmlPart(mShares.get(idx), null, sb);
                }
                return sb.toString();
            }
        }

        /**
         * returns if we should send one mail per share or put all shares in one mail.
         *
         * if all shares are put in one mail, there is no XML part.
         *
         * @return
         */
        private static boolean sendOneMailPerShare() {
            return true;
        }

        public static void sendShareInfoMessage(OperationContext octxt, DistributionList dl, String[] members) {

            Provisioning prov = Provisioning.getInstance();
            Account authedAcct = octxt.getAuthenticatedUser();

            MailSenderVisitor visitor = new MailSenderVisitor();
            try {
                // get all shares published on the DL and all parent DLs
                Published.getPublished(prov, dl, false, null, visitor);
            } catch (ServiceException e) {
                ZimbraLog.account.warn("failed to retrieve share info for dl: " + dl.getName(), e);
                return;
            }

            // no published share, don't send the message.
            if (visitor.getNumShareInfo() == 0)
                return;

            try {
                // send a separate mail to each member being added instead of sending one mail to all members being added
                for (String member : members)
                    sendMessage(prov, authedAcct, dl, member, visitor);
            } catch (ServiceException e) {
                ZimbraLog.account.warn("failed to send share info message", e);
            }
        }

        private static Locale getLocale(Provisioning prov, Account fromAcct, String toAddr) throws ServiceException {
            Locale locale;
            Account rcptAcct = prov.get(AccountBy.name, toAddr);
            if (rcptAcct != null)
                locale = rcptAcct.getLocale();
            else if (fromAcct != null)
                locale = fromAcct.getLocale();
            else
                locale = prov.getConfig().getLocale();

            return locale;
        }

        /*
         * 1. if dl.zimbraDistributionListSendShareMessageFromAddress is set, use that.
         * 2. otherwise if the authed admin has a valid email address, use that.
         * 3. otherwise use the DL's address.
         */
        private static Pair<Address, Address> getFromAndReplyToAddr(Account fromAcct, DistributionList dl)
                throws AddressException {

            InternetAddress addr;

            // 1. if dl.zimbraDistributionListSendShareMessageFromAddress is set, use that.
            String dlssmfa = dl.getAttr(Provisioning.A_zimbraDistributionListSendShareMessageFromAddress);
            try {
                if (dlssmfa != null) {
                    addr = new JavaMailInternetAddress(dlssmfa);
                    return new Pair<Address, Address>(addr, addr);
                }
            } catch (AddressException e) {
                // log and try the next one
                ZimbraLog.account.warn("invalid address in " +
                        Provisioning.A_zimbraDistributionListSendShareMessageFromAddress +
                        " on distribution list entry " + dl.getName() +
                        ", ignored", e);
            }

            // 2. otherwise if the authed admin has a valid email address, use that.
            if (fromAcct != null) {
                addr = AccountUtil.getFriendlyEmailAddress(fromAcct);
                try {
                    // getFriendlyEmailAddress always return an Address, validate it
                    addr.validate();

                    Address replyToAddr = addr;
                    String replyTo = fromAcct.getAttr(Provisioning.A_zimbraPrefReplyToAddress);
                    if (replyTo != null)
                        replyToAddr = new JavaMailInternetAddress(replyTo);
                    return new Pair<Address, Address>(addr, replyToAddr);
                } catch (AddressException ignored) {
                }
            }

            // 3. otherwise use the DL's address.
            addr = new JavaMailInternetAddress(dl.getName());
            return new Pair<Address, Address>(addr, addr);
        }

        private static MimeMultipart buildMailContent(DistributionList dl, MailSenderVisitor visitor, Locale locale, Integer idx)
            throws MessagingException {

            String shareInfoText = visitor.genText(dl.getName(), locale, idx);
            String shareInfoHtml = visitor.genHtml(dl.getName(), locale, idx);
            String shareInfoXml = null;
            if (idx != null) {
                shareInfoXml = visitor.genXml(idx);
            }
            // Body
            MimeMultipart mmp = new JavaMailMimeMultipart("alternative");

            // TEXT part (add me first!)
            MimeBodyPart textPart = new JavaMailMimeBodyPart();
            textPart.setText(shareInfoText, MimeConstants.P_CHARSET_UTF8);
            mmp.addBodyPart(textPart);

            // HTML part
            MimeBodyPart htmlPart = new JavaMailMimeBodyPart();
            htmlPart.setDataHandler(new DataHandler(new HtmlPartDataSource(shareInfoHtml)));
            mmp.addBodyPart(htmlPart);

            // XML part
            if (shareInfoXml != null) {
                MimeBodyPart xmlPart = new JavaMailMimeBodyPart();
                xmlPart.setDataHandler(new DataHandler(new XmlPartDataSource(shareInfoXml)));
                mmp.addBodyPart(xmlPart);
            }

            return mmp;
        }

        private static void buildContentAndSend(SMTPMessage out, DistributionList dl, MailSenderVisitor visitor, Locale locale, Integer idx)
            throws MessagingException {

            MimeMultipart mmp = buildMailContent(dl, visitor, locale, idx);
            out.setContent(mmp);
            Transport.send(out);

            // log
            Address[] rcpts = out.getRecipients(javax.mail.Message.RecipientType.TO);
            StringBuilder rcptAddr = new StringBuilder();
            for (Address a : rcpts)
                rcptAddr.append(a.toString());
            ZimbraLog.account.info("share info notification sent rcpt='" + rcptAddr + "' Message-ID=" + out.getMessageID());
        }

        private static void sendMessage(Provisioning prov,
                                        Account fromAcct, DistributionList dl, String toAddr,
                                        MailSenderVisitor visitor) throws ServiceException {
            try {
                SMTPMessage out = new SMTPMessage(JMSession.getSmtpSession());

                Pair<Address, Address> senderAddrs = getFromAndReplyToAddr(fromAcct, dl);
                Address fromAddr = senderAddrs.getFirst();
                Address replyToAddr = senderAddrs.getSecond();

                // From
                out.setFrom(fromAddr);

                // Reply-To
                out.setReplyTo(new Address[]{replyToAddr});

                // To
                out.setRecipient(javax.mail.Message.RecipientType.TO, new JavaMailInternetAddress(toAddr));

                // Date
                out.setSentDate(new Date());

                // Subject
                Locale locale = getLocale(prov, fromAcct, toAddr);
                String subject = L10nUtil.getMessage(MsgKey.shareNotifSubject, locale);
                out.setSubject(subject);

                if (sendOneMailPerShare()) {
                    // send a separate message per share
                    // each message will have text/html/xml parts
                    int numShareInfo = visitor.getNumShareInfo();
                    for (int idx = 0; idx < numShareInfo; idx++) {
                        buildContentAndSend(out, dl, visitor, locale, idx);
                    }
                } else {
                    // send only one message that includes all shares
                    // the message will have only text/html parts, no xml part
                    buildContentAndSend(out, dl, visitor, locale, null);
                }

            } catch (MessagingException e) {
                ZimbraLog.account.warn("send share info notification failed rcpt='" + toAddr +"'", e);
            }
        }

        private static abstract class MimePartDataSource implements DataSource {

            private String mText;
            private byte[] mBuf = null;

            public MimePartDataSource(String text) {
                mText = text;
            }

            @Override
            public InputStream getInputStream() throws IOException {
                synchronized(this) {
                    if (mBuf == null) {
                        ByteArrayOutputStream buf = new ByteArrayOutputStream();
                        OutputStreamWriter wout =
                            new OutputStreamWriter(buf, MimeConstants.P_CHARSET_UTF8);
                        String text = mText;
                        wout.write(text);
                        wout.flush();
                        mBuf = buf.toByteArray();
                    }
                }
                return new ByteArrayInputStream(mBuf);
            }

            @Override
            public OutputStream getOutputStream() {
                throw new UnsupportedOperationException();
            }
        }

        private static class HtmlPartDataSource extends MimePartDataSource {
            private static final String CONTENT_TYPE =
                MimeConstants.CT_TEXT_HTML + "; " + MimeConstants.P_CHARSET + "=" + MimeConstants.P_CHARSET_UTF8;
            private static final String NAME = "HtmlDataSource";

            HtmlPartDataSource(String text) {
                super(text);
            }

            @Override
            public String getContentType() {
                return CONTENT_TYPE;
            }

            @Override
            public String getName() {
                return NAME;
            }
        }

        private static class XmlPartDataSource extends MimePartDataSource {
            private static final String CONTENT_TYPE =
                MimeConstants.CT_XML_ZIMBRA_SHARE + "; " + MimeConstants.P_CHARSET + "=" + MimeConstants.P_CHARSET_UTF8;
            private static final String NAME = "XmlDataSource";

            XmlPartDataSource(String text) {
                super(text);
            }

            @Override
            public String getContentType() {
                return CONTENT_TYPE;
            }

            @Override
            public String getName() {
                return NAME;
            }
        }
    }

    /*
     * for debugging/unittest
     */
    public static class DumpShareInfoVisitor implements PublishedShareInfoVisitor {

        private static final String mFormat =
            "%-36.36s %-15.15s %-15.15s %-5.5s %-20.20s %-10.10s %-10.10s %-5.5s %-5.5s %-36.36s %-15.15s %-15.15s\n";

        public static void printHeadings() {
            System.out.printf(mFormat,
                              "owner id",
                              "owner email",
                              "owner display",
                              "fid",
                              "folder path",
                              "view",
                              "rights",
                              "mid",
                              "gt",
                              "grantee id",
                              "grantee name",
                              "grantee display");

            System.out.printf(mFormat,
                              "------------------------------------",      // owner id
                              "---------------",                           // owner email
                              "---------------",                           // owner display
                              "-----",                                     // folder id
                              "--------------------",                      // folder path
                              "----------",                                // default view
                              "----------",                                // rights
                              "-----",                                     // mountpoint id if mounted
                              "-----",                                     // grantee type
                              "------------------------------------",      // grantee id
                              "---------------",                           // grantee name
                              "---------------");                          // grantee display
        }

        @Override
        public void visit(ShareInfoData shareInfoData) throws ServiceException {
            System.out.printf(mFormat,
                    shareInfoData.getOwnerAcctId(),
                    shareInfoData.getOwnerAcctEmail(),
                    shareInfoData.getOwnerAcctDisplayName(),
                    String.valueOf(shareInfoData.getFolderId()),
                    shareInfoData.getFolderPath(),
                    shareInfoData.getFolderDefaultView(),
                    shareInfoData.getRights(),
                    shareInfoData.getMountpointId_zmprov_only(),
                    shareInfoData.getGranteeType(),
                    shareInfoData.getGranteeId(),
                    shareInfoData.getGranteeName(),
                    shareInfoData.getGranteeDisplayName());
        }
    }
}



