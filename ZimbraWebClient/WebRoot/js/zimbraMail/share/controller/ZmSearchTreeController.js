/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2005, 2006, 2007, 2008 Zimbra, Inc.
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

/**
 * Creates a saved search tree controller.
 * @constructor
 * @class
 * This class controls a tree display of saved searches.
 *
 * @author Conrad Damon
 */
ZmSearchTreeController = function() {

	ZmFolderTreeController.call(this, ZmOrganizer.SEARCH);

	this._listeners[ZmOperation.RENAME_SEARCH] = new AjxListener(this, this._renameListener);
    this._listeners[ZmOperation.BROWSE] = new AjxListener(this, this._browseListener);
};

ZmSearchTreeController.prototype = new ZmFolderTreeController;
ZmSearchTreeController.prototype.constructor = ZmSearchTreeController;

ZmSearchTreeController.APP_JOIN_CHAR = "-";

// Public methods

ZmSearchTreeController.prototype.toString = 
function() {
	return "ZmSearchTreeController";
};

/**
 * Displays the tree of this type.
 *
 * @param overviewId		[constant]			overview ID
 * @param showUnread		[boolean]*			if true, unread counts will be shown
 * @param omit				[Object]*			hash of organizer IDs to ignore
 * @param forceCreate		[boolean]*			if true, tree view will be created
 * @param account			[ZmZimbraAccount]*	account we're showing tree for (if not currently active account)
 * @param forceShowRoot		[boolean]*			if true, show root tree item regardless of item count
 */
ZmSearchTreeController.prototype.show =
function(params) {
	var id = params.overviewId;
	if (!this._treeView[id] || params.forceCreate) {
		this._treeView[id] = this._setup(id);
	}
	// mixed app should be filtered based on the previous app!
    var dataTree = this.getDataTree(params.account);
    if (dataTree) {
		params.dataTree = dataTree;
		params.searchTypes = {};
		params.omit = params.omit || {};
		params.omit[ZmFolder.ID_TRASH] = true;
		params.omitParents = true;
        var setting = ZmOrganizer.OPEN_SETTING[this.type];
        params.collapsed = !(!setting || (appCtxt.get(setting, null, params.account) !== false));
		this._setupNewOp(params);
		this._treeView[id].set(params);
		if (!params.forceShowRoot) {
			this._checkTreeView(id, params.account);
		}
	}
	
	return this._treeView[id];
};

ZmSearchTreeController.prototype.getTreeStyle =
function() {
	return null;
};

/**
* Enables/disables operations based on context.
*
* @param parent		the widget that contains the operations
* @param id			the currently selected/activated organizer
*/
ZmSearchTreeController.prototype.resetOperations =
function(parent, type, id) {
	parent.enableAll(true);
	var search = appCtxt.getById(id);
	parent.enable(ZmOperation.EXPAND_ALL, (search.size() > 0));
};

ZmSearchTreeController.prototype._newListener =
function(ev){
	AjxDispatcher.require("Browse");
	appCtxt.getSearchController().showBrowseView();
};


ZmSearchTreeController.prototype._browseListener =
function(ev){
    var search = this._getActionedOrganizer(ev);
    if (search) {
        AjxDispatcher.require("Browse");
        appCtxt.getSearchController().showBrowsePickers([ZmPicker.SEARCH]);
    }
};


// Private methods

/**
 * Returns ops available for "Searches" container.
 */
ZmSearchTreeController.prototype._getHeaderActionMenuOps =
function() {
	return [ZmOperation.EXPAND_ALL,
            ZmOperation.BROWSE];
};

/**
 * Returns ops available for saved searches.
 */
ZmSearchTreeController.prototype._getActionMenuOps =
function() {
	return [ZmOperation.DELETE,
			ZmOperation.RENAME_SEARCH,
			ZmOperation.MOVE,
			ZmOperation.EXPAND_ALL];
};

// override the ZmFolderTreeController override
ZmSearchTreeController.prototype._getAllowedSubTypes =
function() {
	return ZmTreeController.prototype._getAllowedSubTypes.call(this);
};

/**
 * Returns a "New Saved Search" dialog.
 */
ZmSearchTreeController.prototype._getNewDialog =
function() {
	return appCtxt.getNewSearchDialog();
};

/**
 * Called when a left click occurs (by the tree view listener). The saved
 * search will be run.
 *
 * @param searchFolder		ZmSearchFolder		search that was clicked
 */
ZmSearchTreeController.prototype._itemClicked =
function(searchFolder) {
	if (searchFolder._showFoldersCallback) {
		searchFolder._showFoldersCallback.run();
		return;
	}
	var params = {
		getHtml: appCtxt.get(ZmSetting.VIEW_AS_HTML),
		searchAllAccounts: (appCtxt.multiAccounts && searchFolder.isUnder(ZmOrganizer.ID_GLOBAL_SEARCHES))
	};
	appCtxt.getSearchController().redoSearch(searchFolder.search, false, params);
};

ZmSearchTreeController.prototype._getMoveParams =
function(dlg) {
	var params = ZmTreeController.prototype._getMoveParams.apply(this, arguments);
	params.overviewId = dlg.getOverviewId(this.type);
	params.treeIds = [ZmOrganizer.FOLDER, ZmOrganizer.SEARCH];
	return params;
};

// Miscellaneous

/**
 * Returns a title for moving a saved search.
 */
ZmSearchTreeController.prototype._getMoveDialogTitle =
function() {
	return AjxMessageFormat.format(ZmMsg.moveSearch, this._pendingActionData.name);
};

/**
 * Shows or hides the tree view. It is hidden only if there are no saved
 * searches that belong to the owning app, and we have been told to hide empty
 * tree views of this type.
 * 
 * @param overviewId		[constant]			overview ID
 * @param account			[ZmZimbraAccount]*	account to check tree view against
 */
ZmSearchTreeController.prototype._checkTreeView =
function(overviewId, account) {
	var treeView = this._treeView[overviewId];
	if (!overviewId || !treeView) { return;	}

	var rootId = (account != null || appCtxt.multiAccounts)
		? (ZmOrganizer.getSystemId(ZmOrganizer.ID_ROOT, account))
		: ZmOrganizer.ID_ROOT;
	var hide = ZmOrganizer.HIDE_EMPTY[this.type] && !treeView.getTreeItemById(rootId).getItemCount();
	this._treeView[overviewId].setVisible(!hide);
};
