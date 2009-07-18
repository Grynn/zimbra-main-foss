/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2007, 2008, 2009 Zimbra, Inc.
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
 * Creates an overview.
 * @constructor
 * @class
 * An overview is a DwtComposite that holds tree views.
 * 
 * @author Conrad Damon
 *
 * @param params 				[hash]					hash of params:
 *        overviewId			[constant]				overview ID
 *        treeIds				[array]					array of organizer types that may be displayed in this overview
 *        account				[ZmZimbraAccount]		account this overview belongs to
 *        parent				[DwtControl]*			containing widget
 *        overviewClass			[string]*				class name for overview DIV
 *        posStyle				[constant]*				positioning style for overview DIV
 *        scroll				[constant]*				scrolling style for overview DIV
 *        selectionSupported	[boolean]*				true if left-click selection is supported
 *        actionSupported		[boolean]*				true if right-click action menus are supported
 *        dndSupported			[boolean]*				true if drag-and-drop is supported
 *        headerClass			[string]*				class name for header item
 *        showUnread			[boolean]*				if true, unread counts will be shown
 *        showNewButtons		[boolean]*				if true, tree headers may have buttons for creating new organizers
 *        treeStyle				[constant]*				default display style for tree views
 *        noTooltips			[boolean]*				if true, don't show tooltips for tree items
 * @param controller			[ZmOverviewController]	the overview controller
 */
ZmOverview = function(params, controller) {

	var overviewClass = params.overviewClass ? params.overviewClass : "ZmOverview";
	DwtComposite.call(this, {parent:params.parent, className:overviewClass, posStyle:params.posStyle, id:params.id});

	this.id = params.overviewId;
	this._controller = controller;

	this.setScrollStyle(params.scroll || Dwt.SCROLL);

	this.account			= params.account;
	this.selectionSupported	= params.selectionSupported;
	this.actionSupported	= params.actionSupported;
	this.dndSupported		= params.dndSupported;
	this.headerClass		= params.headerClass;
	this.showUnread			= params.showUnread;
	this.showNewButtons		= params.showNewButtons;
	this.treeStyle			= params.treeStyle;
	this.noTooltips			= params.noTooltips;
	this.isAppOverview		= params.isAppOverview;

	this._treeIds			= [];
	this._treeHash			= {};
	this._treeParents		= {};

	// Create a parent div for each overview tree.
	var doc = document;
	var element = this.getHtmlElement();
	if (params.treeIds) {
		for (var i = 0, count = params.treeIds.length; i < count; i++) {
			var div = doc.createElement("DIV");
			var treeId = params.treeIds[i];
			this._treeParents[treeId] = div.id = [this.id, treeId].join("-parent-");
			element.appendChild(div);
		}
	}

	if (this.dndSupported) {
		var params = {container:this.getHtmlElement(), threshold:15, amount:5, interval:10, id:this.id};
		this._dndScrollCallback = new AjxCallback(null, DwtControl._dndScrollCallback, [params]);
	}
};

ZmOverview.prototype = new DwtComposite;
ZmOverview.prototype.constructor = ZmOverview;

ZmOverview.prototype.toString =
function() {
	return "ZmOverview";
};

/**
 * Returns the id of the parent element for the given tree.
 */
ZmOverview.prototype.getTreeParent =
function(treeId) {
	return this._treeParents[treeId];
};

/**
 * Displays the given list of tree views in this overview.
 *
 * @param treeIds	[array]				list of organizer types
 * @param omit		[hash]*				hash of organizer IDs to ignore
 */
ZmOverview.prototype.set =
function(treeIds, omit) {
	if (treeIds && treeIds.length) {
		for (var i = 0; i < treeIds.length; i++) {
			this.setTreeView(treeIds[i], omit);
		}
	}
};

/**
 * Sets the given tree view. Its tree controller is responsible for using the appropriate
 * data tree to populate the tree view. The tree controller will be lazily created if
 * necessary. The tree view is cleared before it is set. The tree view inherits options
 * from this overview.
 * 
 * @param treeId	[constant]			organizer ID
 * @param omit		[hash]*				hash of organizer IDs to ignore
 */
ZmOverview.prototype.setTreeView =
function(treeId, omit) {
	// check for false since setting precondition is optional (can be null)
	if (appCtxt.get(ZmOrganizer.PRECONDITION[treeId]) === false) { return; }

	AjxDispatcher.require(ZmOrganizer.ORG_PACKAGE[treeId]);
	var treeController = this._controller.getTreeController(treeId);
	if (this._treeHash[treeId]) {
		treeController.clearTreeView(this.id);
	} else {
		this._treeIds.push(treeId);
	}
	var params = {
		overviewId: this.id,
		omit: omit,
		showUnread: this.showUnread,
		account: this.account
	};
	this._treeHash[treeId] = treeController.show(params); // render tree view
};

ZmOverview.prototype.getTreeView =
function(treeId) {
	return this._treeHash[treeId];
};

ZmOverview.prototype.getTreeViews =
function() {
	return this._treeIds;
};

/**
 * Searches the tree views for the tree item
 * whose data object has the given ID and type.
 * 
 * @param id			[int]			ID to look for
 * @param type			[constant]*		item must also have this type
 */
ZmOverview.prototype.getTreeItemById =
function(id, type) {
	if (!id) { return null; }
	for (var i = 0; i < this._treeIds.length; i++) {
		var treeView = this._treeHash[this._treeIds[i]];
		if (treeView) {
			var item = treeView.getTreeItemById && treeView.getTreeItemById(id);
			if (item && (!type || (this._treeIds[i] == type))) {
				return item;
			}
		}
	}
	return null;
};

/**
* Returns the first selected item within this overview.
*/
ZmOverview.prototype.getSelected =
function(typeOnly) {
	for (var i = 0; i < this._treeIds.length; i++) {
		var treeView = this._treeHash[this._treeIds[i]];
		if (treeView) {
			var item = treeView.getSelected();
			if (item) {
				return typeOnly ? treeView.type : item;
			} // otherwise continue with other treeviews to look for selected item
		}
	}
	return null;
};

/**
 * Selects the item with the given ID within the given tree in this overview.
 *
 * @param id	[string]		item ID
 * @param type	[constant]*		tree type
 */
ZmOverview.prototype.setSelected =
function(id, type) {
	var ti, treeView;
	if (type) {
		treeView = this._treeHash[type];
		ti = treeView && treeView.getTreeItemById(id);
	} else {
		for (var type in this._treeHash) {
			treeView = this._treeHash[type];
			ti = treeView && treeView.getTreeItemById(id);
			if (ti) { break; }
		}
	}

	if (ti && (this._selectedTreeItem != ti)) {
		treeView.setSelected(id, true, true);
	}
	this.itemSelected(ti);
};

/**
 * Given a tree item, deselects all items in the overview's
 * other tree views, enforcing single selection within the overview.
 * Passing a null argument will clear selection in all tree views.
 *
 * @param treeItem			[DwtTreeItem]
 */
ZmOverview.prototype.itemSelected =
function(treeItem) {
	if (appCtxt.multiAccounts && treeItem) {
		var name = this.id.substring(0, this.id.indexOf(":"));
		var container = this._controller.getOverviewContainer(name);
		if (container) {
			container.deselectAll(this);
		}
	}

	if (this._selectedTreeItem && (this._selectedTreeItem._tree != (treeItem && treeItem._tree))) {
		this._selectedTreeItem._tree.deselectAll();
	}

	this._selectedTreeItem = treeItem;
};

/**
 * Clears the tree views.
 */
ZmOverview.prototype.clear =
function() {
	for (var i = 0; i < this._treeIds.length; i++) {
		var treeId = this._treeIds[i];
		if (this._treeHash[treeId]) {
			var treeController = this._controller.getTreeController(treeId);
			treeController.clearTreeView(this.id);
			delete this._treeHash[treeId];
		}
	}
};

ZmOverview.prototype._initialize =
function() {
	// do nothing. 
	// - called by DwtTreeItem b/c it thinks its adding another tree item
};

ZmOverview.prototype._focus =
function() {
	var item = this._selectedTreeItem;
	if (!item) {
		var tree = this._treeHash[this._treeIds[0]];
		if (tree) {
			item = tree._getNextTreeItem(true);
		}
	}

	if (item) {
		item.focus();
	}
};

ZmOverview.prototype._blur =
function() {
	var item = this._selectedTreeItem;
	if (item) {
		item._blur();
	}
};

/**
 * Returns the next/previous selectable tree item within this overview, starting with the
 * tree immediately after/before the given one. Used to handle tree item selection that
 * spans trees.
 *
 * @param next		[boolean]		if true, look for next item as opposed to previous item
 * @param tree		[ZmTreeView]    tree that we are just leaving
 */
ZmOverview.prototype._getNextTreeItem =
function(next, tree) {

	for (var i = 0; i < this._treeIds.length; i++) {
		if (this._treeHash[this._treeIds[i]] == tree) {
			break;
		}
	}

	var nextItem = null;
	var idx = next ? i + 1 : i - 1;
	tree = this._treeHash[this._treeIds[idx]];
	while (tree) {
		nextItem = DwtTree.prototype._getNextTreeItem.call(tree, next);
		if (nextItem) {
			break;
		}
		idx = next ? idx + 1 : idx - 1;
		tree = this._treeHash[this._treeIds[idx]];
	}

	return nextItem;
};
