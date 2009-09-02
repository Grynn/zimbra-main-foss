/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2004, 2005, 2006, 2007, 2008, 2009 Zimbra, Inc.
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
 * Creates a tree controller.
 * @constructor
 * @class
 * This class is a base class for controllers for organizers. Those are
 * represented by trees, both as data and visually. This class uses the support provided by
 * ZmOperation. Each type of organizer has a singleton tree controller which manages all 
 * the tree views of that type.
 *
 * @author Conrad Damon
 * 
 * @param type		[constant]		type of organizer we are displaying/controlling
 */
ZmTreeController = function(type) {

	if (arguments.length == 0) { return; }

	ZmController.call(this, null);

	this.type = type;
	this._opc = appCtxt.getOverviewController();
	
	// common listeners
	this._listeners = {};
	this._listeners[ZmOperation.DELETE]			= new AjxListener(this, this._deleteListener);
	this._listeners[ZmOperation.MOVE]			= new AjxListener(this, this._moveListener);
	this._listeners[ZmOperation.EXPAND_ALL]		= new AjxListener(this, this._expandAllListener);
	this._listeners[ZmOperation.MARK_ALL_READ]	= new AjxListener(this, this._markAllReadListener);
	this._listeners[ZmOperation.SYNC]			= new AjxListener(this, this._syncListener);
	this._listeners[ZmOperation.SYNC_ALL]		= new AjxListener(this, this._syncAllListener);
	this._listeners[ZmOperation.EDIT_PROPS]		= new AjxListener(this, this._editPropsListener);
	this._listeners[ZmOperation.EMPTY_FOLDER]   = new AjxListener(this, this._emptyListener);

	// drag-and-drop
	this._dragSrc = new DwtDragSource(Dwt.DND_DROP_MOVE);
	this._dragSrc.addDragListener(new AjxListener(this, this._dragListener));
	this._dropTgt = new DwtDropTarget(ZmTreeController.DROP_SOURCES[type]);
	this._dropTgt.addDropListener(new AjxListener(this, this._dropListener));

	this._treeView = {};	// hash of tree views of this type, by overview ID
	this._hideEmpty = {};	// which tree views to hide if they have no data
	this._dataTree = {};	// data tree per account
};

ZmTreeController.prototype = new ZmController;
ZmTreeController.prototype.constructor = ZmTreeController;

ZmTreeController.COLOR_CLASS = {};
ZmTreeController.COLOR_CLASS[ZmOrganizer.C_ORANGE]	= "OrangeBg";
ZmTreeController.COLOR_CLASS[ZmOrganizer.C_BLUE]	= "BlueBg";
ZmTreeController.COLOR_CLASS[ZmOrganizer.C_CYAN]	= "CyanBg";
ZmTreeController.COLOR_CLASS[ZmOrganizer.C_GREEN]	= "GreenBg";
ZmTreeController.COLOR_CLASS[ZmOrganizer.C_PURPLE]	= "PurpleBg";
ZmTreeController.COLOR_CLASS[ZmOrganizer.C_RED]		= "RedBg";
ZmTreeController.COLOR_CLASS[ZmOrganizer.C_YELLOW]	= "YellowBg";
ZmTreeController.COLOR_CLASS[ZmOrganizer.C_PINK]	= "PinkBg";
ZmTreeController.COLOR_CLASS[ZmOrganizer.C_GRAY]	= "Gray";	// not GrayBg so it doesn't blend in

// time that selection via up/down arrow must remain on an item to trigger a search
ZmTreeController.TREE_SELECTION_SHORTCUT_DELAY = 750;

// valid sources for drop target for different tree controllers
ZmTreeController.DROP_SOURCES = {};

// Abstract protected methods

// Enables/disables operations based on the given organizer ID
ZmTreeController.prototype.resetOperations = function() {};

// Returns a list of desired header action menu operations
ZmTreeController.prototype._getHeaderActionMenuOps = function() {};

// Returns a list of desired action menu operations
ZmTreeController.prototype._getActionMenuOps = function() {};

// Returns the dialog for organizer creation
ZmTreeController.prototype._getNewDialog = function() {};

// Returns the dialog for renaming an organizer
ZmTreeController.prototype._getRenameDialog = function() {};

// Method that is run when a tree item is left-clicked
ZmTreeController.prototype._itemClicked = function() {};

// Method that is run when a tree item is dbl-clicked
ZmTreeController.prototype._itemDblClicked = function() {};

// Handles a drop event
ZmTreeController.prototype._dropListener = function() {};

// Returns an appropriate title for the "Move To" dialog
ZmTreeController.prototype._getMoveDialogTitle = function() {};

ZmTreeController.prototype._resetOperation =
function(parent, id, text, image, enabled, visible) {
	var op = parent && parent.getOp(id);
	if (!op) return;

	if (text) op.setText(text);
	if (image) op.setImage(image);
	if (enabled != null) op.setEnabled(enabled);
	if (visible != null) op.setVisible(visible);
};

ZmTreeController.prototype._resetButtonPerSetting =
function(parent, op, isSupported) {
	var button = parent.getOp(op);
	if (button) {
		if (isSupported) {
			button.setVisible(true);
			if (appCtxt.isOffline && !appCtxt.getActiveAccount().isZimbraAccount) {
				button.setEnabled(false);
			}
		} else {
			button.setVisible(false);
		}
	}
};

// Public methods

ZmTreeController.prototype.toString =
function() {
	return "ZmTreeController";
};

/**
 * Displays the tree of this type.
 *
 * @param params		[hash]		hash of params:
 *        overviewId	[constant]	overview ID
 *        showUnread	[boolean]*	if true, unread counts will be shown
 *        omit			[Object]*	hash of organizer IDs to ignore
 *        include		[object]*	hash of organizer IDs to include
 *        forceCreate	[boolean]*	if true, tree view will be created
 *        app			[string]*	app that owns the overview
 *        hideEmpty		[boolean]*	if true, don't show header if there is no data
 *        noTooltips	[boolean]*	if true, don't show tooltips for tree items
 */
ZmTreeController.prototype.show =
function(params) {
	var id = params.overviewId;
	this._hideEmpty[id] = params.hideEmpty;

	if (!this._treeView[id] || params.forceCreate) {
		this._treeViewCreated = false;
		this._treeView[id] = null;
		this._treeView[id] = this.getTreeView(id, true);
	}

	// bug fix #24241 - for offline, zimlet tree is re-used across accounts
	var isMultiAccountZimlet = (appCtxt.multiAccounts && this.type == ZmOrganizer.ZIMLET);
	var account = isMultiAccountZimlet ? appCtxt.accountList.mainAccount : params.account;
	var dataTree = this.getDataTree(account);

	if (dataTree) {
		params.dataTree = dataTree;
		var setting = ZmOrganizer.OPEN_SETTING[this.type];
		params.collapsed = (!isMultiAccountZimlet && (!(!setting || (appCtxt.get(setting, null, account) !== false)))); // yikes!
		var overview = this._opc.getOverview(id);
		if (overview.showNewButtons) {
			this._setupNewOp(params);
		}
		this._treeView[id].set(params);
		this._checkTreeView(id);
	}

	if (!this._treeViewCreated) {
		this._treeViewCreated = true;
		this._postSetup(id, params.account);
	}

	return this._treeView[id];
};

/**
 * Returns the tree view for the given overview.
 *
 * @param overviewId	[constant]			overview ID
 * @param force			[boolean]*			force tree view creation
 */
ZmTreeController.prototype.getTreeView =
function(overviewId, force) {
	// TODO: What side-effects will this have in terms of the _postSetup???
	if (force && !this._treeView[overviewId]) {
		this._treeView[overviewId] = this._setup(overviewId);
	}
	return this._treeView[overviewId];
};

/**
 * Clears the tree view for the given overview.
 *
 * @param overviewId		[constant]	overview ID
 *
 * TODO: remove change listener if last tree view cleared
 */
ZmTreeController.prototype.clearTreeView =
function(overviewId) {
	if (this._treeView[overviewId]) {
		this._treeView[overviewId].dispose();
		delete this._treeView[overviewId];
	}
};

/**
 * Returns this controller's drop target.
 */
ZmTreeController.prototype.getDropTarget =
function() {
	return this._dropTgt;
};

ZmTreeController.prototype.getDataTree =
function(account) {
	account = account || appCtxt.getActiveAccount();
	var dataTree = this._dataTree[account.id];
	if (!dataTree) {
		dataTree = this._dataTree[account.id] = appCtxt.getTree(this.type, account);
		if (dataTree) {
			dataTree.addChangeListener(this._getTreeChangeListener());
		}
	}
	return dataTree;
};

// Private and protected methods

/**
 * Sets up the params for the new button in the header item
 *
 * @param overviewId		[constant]	overview ID
 */
ZmTreeController.prototype._setupNewOp =
function(params) {
	var newOp = ZmOrganizer.NEW_OP[this.type];
	if (newOp) {
		var newSetting = ZmOperation.SETTING[newOp];
		if (!newSetting || appCtxt.get(newSetting)) {
			var tooltipKey = ZmOperation.getProp(newOp, "tooltipKey")
			params.newButton = {
				image: ZmOperation.getProp(newOp, "image"),
				tooltip: tooltipKey ? ZmMsg[tooltipKey] : null,
				callback: new AjxCallback(this, this._newListener)
			};
		}
	}
};

ZmTreeController.prototype._getTreeChangeListener =
function() {
	if (!this._dataChangeListener) {
		this._dataChangeListener = new AjxListener(this, this._treeChangeListener);
	}
	return this._dataChangeListener;
};

/**
 * Performs initialization.
 *
 * @param overviewId		[constant]	overview ID
 */
ZmTreeController.prototype._setup =
function(overviewId) {
	var treeView = this._initializeTreeView(overviewId);
	if (this._opc.getOverview(overviewId).actionSupported) {
		this._initializeActionMenus();
	}
	return treeView;
};

/**
 * Performs any little fixups after the tree view is first created
 * and shown.
 *
 * @param overviewId		[constant]		overview ID
 * @param account			[ZmZimbraAccount]*	current account
 */
ZmTreeController.prototype._postSetup =
function(overviewId, account) {

	var treeView = this.getTreeView(overviewId);
	if (!treeView.isCheckedStyle && !ZmOrganizer.HAS_COLOR[this.type]) { return; }

	var rootId = ZmOrganizer.getSystemId(ZmOrganizer.ID_ROOT, account);
	var rootTreeItem = treeView.getTreeItemById(rootId);
	if (!rootTreeItem) { return; }
	if (treeView.isCheckedStyle) {
		rootTreeItem.showCheckBox(false);
	}
	var treeItems = rootTreeItem.getItems();
	for (var i = 0; i < treeItems.length; i++) {
		this._fixupTreeNode(treeItems[i], null, treeView);
	}
};

/**
 * Takes care of the tree item's color and/or checkbox.
 *
 * @param treeItem	[DwtTreeItem]		tree item
 * @param organizer	[ZmOrganizer]		organizer it represents
 * @param treeView	[ZmTreeView]		tree view this organizer belongs to
 */
ZmTreeController.prototype._fixupTreeNode =
function(treeItem, organizer, treeView) {
	if (treeItem._isSeparator) { return; }
	organizer = organizer || treeItem.getData(Dwt.KEY_OBJECT);
	if (organizer) {
		if (ZmOrganizer.HAS_COLOR[this.type]) {
			this._setTreeItemColor(treeItem, organizer);
		}
		if (treeView.isCheckedStyle) {
			if (organizer.type == this.type && treeView.isCheckedStyle) {
				treeItem.setChecked(organizer.isChecked, true);
			} else {
				treeItem.showCheckBox(false);
				treeItem.enableSelection(true);
			}
		}
	}
    var treeItems = treeItem.getItems();
    for (var i = 0; i < treeItems.length; i++) {
        this._fixupTreeNode(treeItems[i], null, treeView);
    }
};

/**
 * Sets the background color of the tree item.
 *
 * @param treeItem	[DwtTreeItem]		tree item
 * @param organizer	[ZmOrganizer]		organizer it represents
 */
ZmTreeController.prototype._setTreeItemColor =
function(treeItem, organizer) {
	treeItem.setImage(organizer.getIconWithColor());
};

ZmTreeController.prototype._getTreeItemColorClassName =
function(treeItem, organizer) {
	if (!treeItem || !organizer) { return null; }
	if (organizer.isInTrash()) { return null; }

	// a color value of 0 means DEFAULT
	var color = organizer.color
		? organizer.color
		: ZmOrganizer.DEFAULT_COLOR[organizer.type];

	return (color && (color != ZmOrganizer.C_NONE))
		? ZmTreeController.COLOR_CLASS[color] : "";
};

/**
 * Lazily creates a tree view of this type, using options from the overview.
 *
 * @param overviewId		[constant]	overview ID
 */
ZmTreeController.prototype._initializeTreeView =
function(overviewId) {
	var overview = this._opc.getOverview(overviewId);
	var params = {
		parent: overview,
		parentElement: overview.getTreeParent(this.type),
		overviewId: overviewId,
		type: this.type,
		headerClass: overview.headerClass,
		dragSrc: (overview.dndSupported ? this._dragSrc : null),
		dropTgt: (overview.dndSupported ? this._dropTgt : null),
		treeStyle: overview.treeStyle,
		isCheckedByDefault: overview.isCheckedByDefault,
		allowedTypes: this._getAllowedTypes(),
		allowedSubTypes: this._getAllowedSubTypes()
	};
	params.id = ZmId.getTreeId(overviewId, params.type);
	var treeView = this._createTreeView(params);
	treeView.addSelectionListener(new AjxListener(this, this._treeViewListener));
	treeView.addTreeListener(new AjxListener(this, this._treeListener));

	return treeView;
};

ZmTreeController.prototype._createTreeView =
function(params) {
	return new ZmTreeView(params);
};

/**
 * Creates up to two action menus, one for the tree view's header item, and
 * one for the rest of the items. Note that each of these two menus is a
 * singleton, shared among the tree views of this type.
 */
ZmTreeController.prototype._initializeActionMenus =
function() {
	var obj = this;
	var func = this._createActionMenu;

	var ops = this._getHeaderActionMenuOps();
	if (!this._headerActionMenu && ops) {
		var args = [this._shell, ops];
		this._headerActionMenu = new AjxCallback(obj, func, args);
	}
	var ops = this._getActionMenuOps();
	if (!this._actionMenu && ops) {
		var args = [this._shell, ops];
		this._actionMenu = new AjxCallback(obj, func, args);
	}
};

/**
 * Instantiates the header action menu if necessary.
 */
ZmTreeController.prototype._getHeaderActionMenu =
function(ev) {
	if (this._headerActionMenu instanceof AjxCallback) {
		var callback = this._headerActionMenu;
		this._headerActionMenu = callback.run();
	}
	return this._headerActionMenu;
};

/**
 * Instantiates the action menu if necessary.
 */
ZmTreeController.prototype._getActionMenu =
function(ev) {
	if (this._actionMenu instanceof AjxCallback) {
		var callback = this._actionMenu;
		this._actionMenu = callback.run();
	}
	return this._actionMenu;
};

/**
 * Creates and returns an action menu, and sets its listeners.
 *
 * @param parent		[DwtControl]	menu's parent widget
 * @param menuItems		[Array]*		list of menu items
 */
ZmTreeController.prototype._createActionMenu =
function(parent, menuItems) {
	if (!menuItems) return;

	var actionMenu = new ZmActionMenu({parent:parent, menuItems:menuItems});
	menuItems = actionMenu.opList;
	for (var i = 0; i < menuItems.length; i++) {
		var menuItem = menuItems[i];
		if (this._listeners[menuItem]) {
			actionMenu.addSelectionListener(menuItem, this._listeners[menuItem]);
		}
	}
	actionMenu.addPopdownListener(new AjxListener(this, this._menuPopdownActionListener));

	return actionMenu;
};

/**
 * Determines which types of organizer may be displayed at the top level. By default,
 * the tree shows its own type.
 */
ZmTreeController.prototype._getAllowedTypes =
function() {
	var types = {};
	types[this.type] = true;
	return types;
};

/**
 * Determines which types of organizer may be displayed below the top level. By default,
 * the tree shows its own type.
 */
ZmTreeController.prototype._getAllowedSubTypes =
function() {
	var types = {};
	types[this.type] = true;
	return types;
};

// Actions

/**
 * Creates a new organizer and adds it to the tree of that type.
 *
 * @param params	[hash]			hash of params:
 *        type		[constant]		type of organizer
 *        parent	[ZmOrganizer]	parent of the new organizer
 *        name		[string]		name of the new organizer
 */
ZmTreeController.prototype._doCreate =
function(params) {
	params.type = this.type;
	var funcName = ZmOrganizer.CREATE_FUNC[this.type];
	if (funcName) {
		var func = eval(funcName);
		func(params);
	}
};

/**
 * Deletes an organizer and removes it from the tree.
 *
 * @param organizer		[ZmOrganizer]	organizer to delete
 */
ZmTreeController.prototype._doDelete =
function(organizer) {
	organizer._delete();
};

ZmTreeController.prototype._doEmpty =
function(organizer) {
    var recursive = false;
    organizer._empty(recursive);
	var ctlr = appCtxt.getCurrentController();
	if (ctlr && ctlr._getSearchFolderId) {
		var folderId = ctlr._getSearchFolderId();
		if (folderId && (folderId == organizer.id)) {
			var view = ctlr.getCurrentView();
			view._resetList();
			view._setNoResultsHtml();
		}
	}
};

/**
 * Renames an organizer.
 *
 * @param organizer	[ZmOrganizer]	organizer to rename
 * @param name		[string]		new name of the organizer
 */
ZmTreeController.prototype._doRename =
function(organizer, name) {
	organizer.rename(name);
};

/**
 * Moves an organizer to a new folder.
 *
 * @param organizer	[ZmOrganizer]	organizer to move
 * @param folder		[ZmFolder]		target folder
 */
ZmTreeController.prototype._doMove =
function(organizer, folder) {
	organizer.move(folder);
};

/**
 * Marks an organizer's items as read.
 *
 * @param organizer	[ZmOrganizer]	organizer
 */
ZmTreeController.prototype._doMarkAllRead =
function(organizer) {
	organizer.markAllRead();
};

/**
 * Syncs an organizer to its feed (URL).
 *
 *  @param organizer	[ZmOrganizer]	organizer
 */
ZmTreeController.prototype._doSync =
function(organizer) {
	organizer.sync();
};

// Listeners

/**
 * Handles left and right mouse clicks. A left click generates a selection event.
 * If selection is supported for the overview, some action (typically a search)
 * will be performed. A right click generates an action event, which pops up an
 * action menu if supported.
 *
 * @param ev		[DwtUiEvent]	the UI event
 */
ZmTreeController.prototype._treeViewListener =
function(ev) {
	if (ev.detail != DwtTree.ITEM_ACTIONED &&
		ev.detail != DwtTree.ITEM_SELECTED &&
		ev.detail != DwtTree.ITEM_DBL_CLICKED)
	{
		return;
	}

	var treeItem = ev.item;

	var type = treeItem.getData(ZmTreeView.KEY_TYPE);
	if (!type) { return; }

	var item = treeItem.getData(Dwt.KEY_OBJECT);
	if (item) {
		this._actionedOrganizer = item;
		if (item.noSuchFolder) {
			var folderTree = appCtxt.getFolderTree();
			if (folderTree) {
				folderTree.handleDeleteNoSuchFolder(item);
			}
			return;
		}
	}

	var id = treeItem.getData(Dwt.KEY_ID);
	var overviewId = this._actionedOverviewId = treeItem.getData(ZmTreeView.KEY_ID);
	var overview = this._opc.getOverview(overviewId);
	if (!overview) { return; }

	if (ev.detail == DwtTree.ITEM_ACTIONED) {
		// right click
		if (overview.actionSupported) {
			var actionMenu = (item.nId == ZmOrganizer.ID_ROOT || item.isDataSource(ZmAccount.TYPE_IMAP))
				? this._getHeaderActionMenu(ev)
				: this._getActionMenu(ev);
			if (actionMenu) {
				this.resetOperations(actionMenu, type, id);
				actionMenu.popup(0, ev.docX, ev.docY);
			}
		}
	} else if ((ev.detail == DwtTree.ITEM_SELECTED) && item) {
		if (appCtxt.multiAccounts && (item instanceof ZmOrganizer)) {
			this._handleMultiAccountItemSelection(ev, overview, treeItem, item);
		} else {
			this._handleItemSelection(ev, overview, treeItem, item);
		}
	} else if ((ev.detail == DwtTree.ITEM_DBL_CLICKED) && item) {
		this._itemDblClicked(item);
	}
};

ZmTreeController.prototype._handleItemSelection =
function(ev, overview, treeItem, item) {
	// left click or selection via shortcut
	overview.itemSelected(treeItem);

	if (ev.kbNavEvent) {
		DwtControl._scrollIntoView(treeItem._itemDiv, overview.getHtmlElement());
		ZmController.noFocus = true;
	}

	if (overview._treeSelectionShortcutDelayActionId) {
		AjxTimedAction.cancelAction(overview._treeSelectionShortcutDelayActionId);
	}

	if ((overview.selectionSupported || item._showFoldersCallback) && !treeItem._isHeader) {
		if (ev.kbNavEvent && ZmTreeController.TREE_SELECTION_SHORTCUT_DELAY) {
			var action = new AjxTimedAction(this, ZmTreeController.prototype._treeSelectionTimedAction, [item, overview]);
			overview._treeSelectionShortcutDelayActionId =
				AjxTimedAction.scheduleAction(action, ZmTreeController.TREE_SELECTION_SHORTCUT_DELAY);
		} else {
			if (appCtxt.multiAccounts && (item instanceof ZmOrganizer)) {

				appCtxt.getCurrentApp().getOverviewContainer().deselectAll(overview);

				// set the active account based on the item clicked
				var account = item.accountId
					? appCtxt.accountList.getAccount(item.accountId)
					: appCtxt.accountList.mainAccount;
				appCtxt.accountList.setActiveAccount(account);
			}

			this._itemSelected(item);
		}
	}
};

ZmTreeController.prototype._itemSelected =
function(item) {
	if (item && item._showFoldersCallback) {
		item._showFoldersCallback.run();
	} else {
		this._itemClicked(item);
	}

};

/**
 * Allows subclass to overload in case something needs to be done before
 * processing tree item selection in a multi-account environment. Otherwise,
 * do the normal tree item selection.
 */
ZmTreeController.prototype._handleMultiAccountItemSelection =
function(ev, overview, treeItem, item) {
	this._handleItemSelection(ev, overview, treeItem, item);
};

ZmTreeController.prototype._treeSelectionTimedAction =
function(item, overview) {
	if (overview._treeSelectionShortcutDelayActionId) {
		AjxTimedAction.cancelAction(overview._treeSelectionShortcutDelayActionId);
	}
	this._itemSelected(item);
};

/**
 * Propagates a change in tree state to other trees of the same type in app overviews.
 * 
 * @param ev		[ZmTreeEvent]	a tree event
 */
ZmTreeController.prototype._treeListener =
function(ev) {
	var treeItem = ev && ev.item;
	var overviewId = treeItem && treeItem._tree && treeItem._tree.overviewId;

	// only handle events that come from headers in app overviews
	var overview = appCtxt.getOverviewController().getOverview(overviewId);
	if (!(ev && ev.detail && overview && overview.isAppOverview && treeItem._isHeader)) { return; }

	var settings = appCtxt.getSettings(overview.account);
	var setting = settings.getSetting(ZmOrganizer.OPEN_SETTING[this.type]);
	if (setting) {
		setting.setValue(ev.detail == DwtTree.ITEM_EXPANDED);
	}
};

/**
 * Handles changes to the underlying model. The change is propagated to
 * all the tree views known to this controller.
 *
 * @param ev		[ZmEvent]	a change event
 */
ZmTreeController.prototype._treeChangeListener =
function(ev) {
	this._evHandled = {};
	for (var overviewId in this._treeView) {
		this._changeListener(ev, this._treeView[overviewId], overviewId);
	}
};

/**
 * Handles a change event for one tree view.
 *
 * @	param ev				[ZmEvent]		a change event
 * @param treeView		[ZmTreeView]	a tree view
 * @param overviewId		[constant]		overview ID
 */
ZmTreeController.prototype._changeListener =
function(ev, treeView, overviewId) {
	if (this._evHandled[overviewId]) { return; }
	if (!treeView.allowedTypes[ev.type] && !treeView.allowedSubTypes[ev.type]) { return; }

	var organizers = ev.getDetail("organizers");
	if (!organizers && ev.source) {
		organizers = [ev.source];
	}

	// handle one organizer at a time
	for (var i = 0; i < organizers.length; i++) {
		var organizer = organizers[i];
		var node = treeView.getTreeItemById(organizer.id);
		// Note: source tree handles moves - it will have node
		if (!node && (ev.event != ZmEvent.E_CREATE)) { continue; }

		var fields = ev.getDetail("fields");
		if (ev.event == ZmEvent.E_FLAGS) {
			var flag = ev.getDetail("flag");
			var state = ev.getDetail("state");
			// handle "Mark All As Read" by clearing unread count
			if ((flag == ZmItem.FLAG_UNREAD) && !state) {
				node.setText(organizer.getName(false));
				this._evHandled[overviewId] = true;
			}
		} else if (ev.event == ZmEvent.E_DELETE) {
			if (organizer.nId == ZmFolder.ID_TRASH || organizer.nId == ZmFolder.ID_SPAM) {
				node.setText(organizer.getName(false));	// empty Trash or Junk
			} else {
				node.dispose();
			}
            this._checkTreeView(overviewId);
			this._evHandled[overviewId] = true;
		} else if (ev.event == ZmEvent.E_CREATE || ev.event == ZmEvent.E_MOVE) {
			// for multi-account, make sure this organizer applies to the given overview
			if (appCtxt.multiAccounts) {
				var account = appCtxt.accountList.getAccount(organizer.accountId);
				var overview = this._opc.getOverview(overviewId);
				if (overview && overview.account != account) {
					continue;
				}
			}
			var parentNode = this._getParentNode(organizer, ev, overviewId);
			var idx = parentNode ? ZmTreeView.getSortIndex(parentNode, organizer, eval(ZmTreeView.COMPARE_FUNC[organizer.type])) : null;
			if (parentNode && (ev.event == ZmEvent.E_CREATE)) {
				// parent's tree controller should handle creates - root is shared by all folder types
				var type = (organizer.parent.nId == ZmOrganizer.ID_ROOT) ? ev.type : organizer.parent.type;
				if (type != this.type) { continue; }
				node = this._addNew(treeView, parentNode, organizer, idx); // add to new parent
			} else if (ev.event == ZmEvent.E_MOVE) {
				node.dispose();
				if (parentNode) {
					node = this._addNew(treeView, parentNode, organizer, idx); // add to new parent
				}
			}
			if (parentNode) {
				parentNode.setExpanded(true); // so that new node is visible
				this._fixupTreeNode(node, organizer, treeView);
			}
			this._checkTreeView(overviewId);
			this._evHandled[overviewId] = true;
		} else if (ev.event == ZmEvent.E_MODIFY) {
			if (!fields) { return; }
			if (fields[ZmOrganizer.F_TOTAL] || fields[ZmOrganizer.F_SIZE]) {
				node.setToolTipContent(organizer.getToolTip(true));
			}
			var parentNode = this._getParentNode(organizer, ev, overviewId);
			if (!parentNode) { return; }

			if (fields[ZmOrganizer.F_NAME] ||
				fields[ZmOrganizer.F_UNREAD] ||
				fields[ZmOrganizer.F_FLAGS] ||
				fields[ZmOrganizer.F_COLOR] ||
				((organizer.nId == ZmFolder.ID_DRAFTS ||
				  organizer.nId == ZmOrganizer.ID_OUTBOX) && fields[ZmOrganizer.F_TOTAL]))
			{
				this._updateOverview(parentNode, node, fields, organizer, treeView);
				this._evHandled[overviewId] = true;
			}
		}
	}
};

ZmTreeController.prototype._updateOverview =
function(parentNode, node, fields, organizer, treeView) {
	node.setText(organizer.getName(treeView._showUnread));
	if (fields && fields[ZmOrganizer.F_NAME]) {
		if (parentNode && (parentNode.getNumChildren() > 1)) {
			// remove and re-insert the node (if parent has more than one child)
			node.dispose();
			var idx = ZmTreeView.getSortIndex(parentNode, organizer, eval(ZmTreeView.COMPARE_FUNC[organizer.type]));
			node = treeView._addNew(parentNode, organizer, idx);
		} else {
			node.setDndText(organizer.getName());
		}
		appCtxt.getAppViewMgr().updateTitle();
	}

	this._fixupTreeNode(node, organizer, treeView);
};

ZmTreeController.prototype._getParentNode =
function(organizer, ev, overviewId) {
	if (organizer.parent) {
		// if node being moved to root, we assume new parent must be the container of its type
		var type = (organizer.parent.nId == ZmOrganizer.ID_ROOT) ? ev.type : null;
		return this._opc.getOverview(overviewId).getTreeItemById(organizer.parent.id, type);
	}
};

/**
 * Makes a request to add a new item to the tree, returning true if the item was
 * actually added, or false if it was omitted.
 *
 * @param treeView		[ZmTreeView]	a tree view
 * @param parentNode	[DwtTreeItem]	node under which to add the new one
 * @param organizer		[ZmOrganizer]	organizer for the new node
 * @param idx			[int]*			position at which to add the new node
 */
ZmTreeController.prototype._addNew =
function(treeView, parentNode, organizer, idx) {
	return treeView._addNew(parentNode, organizer, idx);
};

/**
 * Pops up the appropriate "New ..." dialog.
 *
 * @param ev		[DwtUiEvent]			the UI event
 * @param account	[ZmZimbraAccount]*		Optional. Used by multi-account mbox
 */
ZmTreeController.prototype._newListener =
function(ev, account) {
	this._pendingActionData = this._getActionedOrganizer(ev);
	var newDialog = this._getNewDialog();
	if (!this._newCb) {
		this._newCb = new AjxCallback(this, this._newCallback);
	}
	if (this._pendingActionData && !appCtxt.getById(this._pendingActionData.id)) {
		this._pendingActionData = appCtxt.getFolderTree(account).root;
	}

	if (!account && appCtxt.multiAccounts) {
		var ov = this._opc.getOverview(this._actionedOverviewId);
		account = ov && ov.account;
	}

	ZmController.showDialog(newDialog, this._newCb, this._pendingActionData, account);
	newDialog.registerCallback(DwtDialog.CANCEL_BUTTON, this._clearDialog, this, newDialog);
};

/**
 * Pops up the appropriate "Rename ..." dialog.
 *
 * @param ev		[DwtUiEvent]	the UI event
 */
ZmTreeController.prototype._renameListener =
function(ev) {
	this._pendingActionData = this._getActionedOrganizer(ev);
	var renameDialog = this._getRenameDialog();
	if (!this._renameCb) {
		this._renameCb = new AjxCallback(this, this._renameCallback);
	}
	ZmController.showDialog(renameDialog, this._renameCb, this._pendingActionData);
	renameDialog.registerCallback(DwtDialog.CANCEL_BUTTON, this._clearDialog, this, renameDialog);
};

/**
 * Deletes an organizer.
 *
 * @param ev		[DwtUiEvent]	the UI event
 */
ZmTreeController.prototype._deleteListener =
function(ev) {
	this._doDelete(this._getActionedOrganizer(ev));
};


ZmTreeController.prototype._emptyListener =
function(ev) {
	this._doEmpty(this._getActionedOrganizer(ev));
};

/**
 * Moves an organizer into another folder.
 *
 * @param ev		[DwtUiEvent]	the UI event
 */
ZmTreeController.prototype._moveListener =
function(ev) {
	this._pendingActionData = this._getActionedOrganizer(ev);
	var moveToDialog = appCtxt.getChooseFolderDialog();
	if (!this._moveCb) {
		this._moveCb = new AjxCallback(this, this._moveCallback);
	}
	ZmController.showDialog(moveToDialog, this._moveCb, this._getMoveParams(moveToDialog));
	moveToDialog.registerCallback(DwtDialog.CANCEL_BUTTON, this._clearDialog, this, moveToDialog);
};

ZmTreeController.prototype._getMoveParams =
function(dlg) {
	var omit = {};
	omit[ZmFolder.ID_SPAM] = true;
	return {
		data:			this._pendingActionData,
		treeIds:		[this.type],
		overviewId:		dlg.getOverviewId(ZmOrganizer.APP[this.type]),
		omit:			omit,
		title:			this._getMoveDialogTitle(),
		description:	ZmMsg.targetFolder,
		appName:		ZmOrganizer.APP[this.type]
	};
};

/**
 * Expands the tree below the actioned node.
 *
 * @param ev		[DwtUiEvent]	the UI event
 */
ZmTreeController.prototype._expandAllListener =
function(ev) {
	var organizer = this._getActionedOrganizer(ev);
	var treeView = this.getTreeView(this._actionedOverviewId);
	var ti = treeView.getTreeItemById(organizer.id);
	ti.setExpanded(true, true);
};

/**
 * Mark's an organizer's contents as read.
 *
 * @param ev		[DwtUiEvent]	the UI event
 */
ZmTreeController.prototype._markAllReadListener =
function(ev) {
	this._doMarkAllRead(this._getActionedOrganizer(ev));
};

/**
 * Syncs all the organizers to its feed (URL).
 *
 * @param ev		[DwtUiEvent]	the UI event
 */
ZmTreeController.prototype._syncAllListener =
function(ev) {
	var f = this._getActionedOrganizer(ev);
	if (f.isFeed()) {
		// Loop over all the TreeViews
		for (var overviewId in this._treeView) {
			var treeView = this.getTreeView(overviewId);
			var rootId = ZmOrganizer.getSystemId(ZmOrganizer.ID_ROOT, appCtxt.getActiveAccount());
			var rootTreeItem = treeView.getTreeItemById(rootId);
			if (!rootTreeItem) { return; }
			var treeItems = rootTreeItem.getItems();
			if (treeItems && treeItems[i] &&
				(treeItems[i].isFeed && treeItems[i].isFeed() || (treeItems[i].hasFeeds && treeItems[i].hasFeeds())))
			{
				this._syncFeeds(treeItems[i]);
			}
		}
	} else {
		this._syncListener(ev);
	}
};

/**
 * Syncs an organizer to its feed (URL).
 *
 * @param ev		[DwtUiEvent]	the UI event
 */
ZmTreeController.prototype._syncListener =
function(ev) {
	var f = this._getActionedOrganizer(ev);
	this._syncFeeds(f);
};

ZmTreeController.prototype._syncFeeds =
function(f) {
	if (f.isFeed()) {
		this._doSync(f);
	} else if(f.hasFeeds()) {
		var a = f.children.getArray();
		var sz = f.children.size();
		for (var i = 0; i < sz; i++) {
			if (a[i].isFeed() || (a[i].hasFeeds && a[i].hasFeeds())) {
				this._syncFeeds(a[i]);
			}
		}
	}
};

/**
 * Brings up a dialog for editing organizer properties.
 *
 * @param ev		[DwtUiEvent]	the UI event
 */
ZmTreeController.prototype._editPropsListener = 
function(ev) {
	var folderPropsDialog = appCtxt.getFolderPropsDialog();
	folderPropsDialog.popup(this._getActionedOrganizer(ev));
};

/**
 * Handles a drag event by setting the source data.
 *
 * @param ev		[DwtDragEvent]		a drag event
 */
ZmTreeController.prototype._dragListener =
function(ev) {
	switch (ev.action) {
		case DwtDragEvent.SET_DATA:
			ev.srcData = {data:ev.srcControl.getData(Dwt.KEY_OBJECT), controller:this};
			break;
	}
};

/**
 * Called when a dialog we opened is closed. Sets the style of the actioned
 * tree item from "actioned" back to its normal state.
 */
ZmTreeController.prototype._menuPopdownActionListener = 
function() {
	if (this._pendingActionData) { return; }

	var treeView = this.getTreeView(this._actionedOverviewId);
	if (this._actionedOrganizer && (treeView.getSelected() != this._actionedOrganizer)) {
		var ti = treeView.getTreeItemById(this._actionedOrganizer.id);
		if (ti) {
			ti._setActioned(false);
		}
	}
};

// Callbacks

/**
 * Called when a "New ..." dialog is submitted to create the organizer.
 *
 * @param params	[hash]			hash of params:
 *        organizer	[ZmOrganizer]	parent organizer
 *        name		[string]		the name of the new organizer
 */
ZmTreeController.prototype._newCallback =
function(params) {
	this._doCreate(params);
	this._clearDialog(this._getNewDialog());
};

/**
 * Called when a "Rename ..." dialog is submitted to rename the organizer.
 *
 * @param organizer		[ZmOrganizer]	the organizer
 * @param name			[string]		the new name of the organizer
 */
ZmTreeController.prototype._renameCallback =
function(organizer, name) {
	this._doRename(organizer, name);
	this._clearDialog(this._getRenameDialog());
};

/**
 * Called when a "Move To ..." dialog is submitted to move the organizer.
 *
 * @param folder		[ZmFolder]		the target folder
 */
ZmTreeController.prototype._moveCallback =
function(folder) {
	this._doMove(this._pendingActionData, folder);
	this._clearDialog(appCtxt.getChooseFolderDialog());
};

/**
 * Called if a user has agreed to go ahead and delete an organizer.
 *
 * @param organizer	[ZmOrganizer]	organizer to delete
 */
ZmTreeController.prototype._deleteShieldYesCallback =
function(organizer) {
	this._doDelete(organizer);
	this._clearDialog(this._deleteShield);
};

ZmTreeController.prototype._emptyShieldYesCallback = 
function(organizer) {
	this._doEmpty(organizer);
	this._clearDialog(this._emptyShield);
};

// Miscellaneous private methods

/**
 * Returns the organizer that's currently selected for action (via right-click).
 * Note: going up the object tree to find the actioned organizer will only work 
 * for tree item events; it won't work for action menu item events, since action
 * menus are children of the shell.
 *
 * @param ev		[DwtUiEvent]	the UI event
 */
ZmTreeController.prototype._getActionedOrganizer =
function(ev) {
	if (this._actionedOrganizer) {
		return this._actionedOrganizer;
	}
		
	var obj = ev.item;
	while (obj) {
		var data = obj.getData(Dwt.KEY_OBJECT);
		if (data instanceof ZmOrganizer) {
			this._actionedOrganizer = data;
			return this._actionedOrganizer;
		}
		obj = obj.parent;
	}
	return null;
};

/**
 * Shows or hides the tree view. It is hidden only if there is no data, and we
 * have been told to hide empty tree views of this type.
 * 
 * @param overviewId		[constant]		overview ID
 */
ZmTreeController.prototype._checkTreeView =
function(overviewId) {
	if (!overviewId || !this._treeView[overviewId]) { return; }

	var account = this._opc.getOverview(overviewId).account;
	var dataTree = this.getDataTree(account);
	var hide = (ZmOrganizer.HIDE_EMPTY[this.type] && dataTree && (dataTree.size() == 0));
	this._treeView[overviewId].setVisible(!hide);
};
