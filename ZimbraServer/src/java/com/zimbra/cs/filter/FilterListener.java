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
package com.zimbra.cs.filter;

import java.util.Map;
import java.util.Set;

import com.google.common.collect.ImmutableSet;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.mailbox.Folder;
import com.zimbra.cs.mailbox.MailItem;
import com.zimbra.cs.mailbox.MailboxListener;
import com.zimbra.cs.mailbox.MailboxOperation;
import com.zimbra.cs.mailbox.Tag;
import com.zimbra.cs.session.PendingModifications;
import com.zimbra.cs.session.PendingModifications.Change;
import com.zimbra.cs.session.PendingModifications.ModificationKey;

public class FilterListener extends MailboxListener {
    
    public static final ImmutableSet<MailboxOperation> EVENTS = ImmutableSet.of(
            MailboxOperation.MoveItem, MailboxOperation.DeleteItem, 
            MailboxOperation.RenameItem, MailboxOperation.RenameItemPath,
            MailboxOperation.RenameTag
    );
    
    public static final ImmutableSet<MailItem.Type> ITEMTYPES = ImmutableSet.of(
            MailItem.Type.FOLDER, MailItem.Type.TAG
    );
    
    @Override
    public void notify(ChangeNotification notification) {
        if (notification.mods.modified != null && notification.mods.preModifyItems != null) {
            for (PendingModifications.Change change : notification.mods.modified.values()) {
                if (!EVENTS.contains(change.op))
                    continue;
                if (change.what instanceof Folder) {
                    if ((change.why & Change.MODIFIED_PARENT) == 0 && (change.why & Change.MODIFIED_NAME) == 0)
                        continue;
                    Folder folder = (Folder) change.what;
                    Folder oldFolder = (Folder)notification.mods.preModifyItems.get(folder.getId());
                    if (oldFolder == null) {
                        ZimbraLog.filter.warn("Cannot determine the old folder name for %s.", folder.getName());
                        continue;
                    }
                    updateFilterRules(notification.mailboxAccount, folder, oldFolder.getPath());
                } else if (change.what instanceof Tag) {
                    if ((change.why & Change.MODIFIED_NAME) == 0)
                        continue;
                    Tag tag = (Tag) change.what;
                    Tag oldTag = (Tag)notification.mods.preModifyItems.get(tag.getId());
                    if (oldTag == null) {
                        ZimbraLog.filter.warn("Cannot determine the old tag name for %s.", tag.getName());
                        continue;
                    }
                    updateFilterRules(notification.mailboxAccount, tag, oldTag.getName());
                }
            }
        }
        if (notification.mods.deleted != null && notification.mods.preModifyItems != null) {
            for (Map.Entry<ModificationKey, MailItem.Type> entry : notification.mods.deleted.entrySet()) {
                if (entry.getValue() == MailItem.Type.FOLDER) {
                    Folder oldFolder = (Folder) notification.mods.preModifyItems.get(entry.getKey().getItemId());
                    if (oldFolder == null) {
                        ZimbraLog.filter.warn("Cannot determine the old folder name for %s.", entry.getKey());
                        continue;
                    }
                    updateFilterRules(notification.mailboxAccount, oldFolder, oldFolder.getPath());
                } else if (entry.getValue() == MailItem.Type.TAG) {
                    Tag oldTag = (Tag) notification.mods.preModifyItems.get(entry.getKey().getItemId());
                    updateFilterRules(notification.mailboxAccount, oldTag);
                }
            }
        }
    }

    @Override
    public Set<MailItem.Type> registerForItemTypes() {
        return ITEMTYPES;
    }

    private void updateFilterRules(Account account, Folder folder, String oldPath) {
        try {
            if (folder == null || folder.inTrash() || folder.isHidden()) {
                ZimbraLog.filter.info("Disabling filter rules that reference %s.", oldPath);
                RuleManager.folderDeleted(account, oldPath);
            } else if (!folder.getPath().equals(oldPath)) {
                ZimbraLog.filter.info("Updating filter rules that reference %s.", oldPath);
                RuleManager.folderRenamed(account, oldPath, folder.getPath());
            }
        } catch (ServiceException e) {
            ZimbraLog.filter.warn("Unable to update filter rules with new folder path.", e);
        }
    }

    private void updateFilterRules(Account account, Tag tag, String oldName) {
        try {
            ZimbraLog.filter.info("Updating filter rules that reference %s.", oldName);
            RuleManager.tagRenamed(account, oldName, tag.getName());
        } catch (ServiceException e) {
            ZimbraLog.filter.warn("Unable to update filter rules with new folder path.", e);
        }
    }

    private void updateFilterRules(Account account, Tag tag) {
        try {
            ZimbraLog.filter.info("Disabling filter rules that reference %s.", tag.getName());
            RuleManager.tagDeleted(account, tag.getName());
        } catch (ServiceException e) {
            ZimbraLog.filter.warn("Unable to update filter rules with new folder path.", e);
        }
    }
}
