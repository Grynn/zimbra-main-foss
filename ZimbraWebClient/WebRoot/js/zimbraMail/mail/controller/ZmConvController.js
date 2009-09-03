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
 * Creates a new, empty conversation controller.
 * @constructor
 * @class
 * This class manages the two-pane conversation view. The top pane contains a list
 * view of the messages in the conversation, and the bottom pane contains the current
 * message.
 *
 * @author Conrad Damon
 * 
 * @param container	containing shell
 * @param mailApp	containing app
 */
ZmConvController = function(container, mailApp) {

	ZmDoublePaneController.call(this, container, mailApp);

	this._convDeleteListener = new AjxListener(this, this._deleteListener);
	this._listeners[ZmOperation.DELETE_MENU] = this._convDeleteListener;
	this._msgControllerMode = ZmId.VIEW_CONV;
};

ZmConvController.prototype = new ZmDoublePaneController;
ZmConvController.prototype.constructor = ZmConvController;

ZmMailListController.GROUP_BY_ICON[ZmId.VIEW_CONV]			= "ConversationView";

// Public methods

ZmConvController.prototype.toString = 
function() {
	return "ZmConvController";
};

/**
 * Displays the given conversation in a two-pane view. The view is actually
 * created in _loadConv(), since it is a scheduled method and must execute
 * last.
 *
 * @param activeSearch		[ZmSearch]				the current search results
 * @param conv				[ZmConv]				a conversation
 * @param parentController	[ZmMailController]*		controller that called this method
 * @param callback			[AjxCallback]*			client callback
 * @param markRead			[boolean]*				if true, mark msg read
 */
ZmConvController.prototype.show =
function(activeSearch, conv, parentController, callback, markRead) {
	this._conv = conv;
	var lv = this._listView[this._currentView];
	// always reset offset & sortby to asc.
	if (lv) {
		lv.offset = 0;
		lv.setSortByAsc(ZmItem.F_DATE, false);
	}
	this._parentController = parentController;

	// this._list will be set when conv is loaded
	ZmDoublePaneController.prototype.show.call(this, activeSearch, conv, callback, markRead);
};

ZmConvController.prototype.getConv =
function() {
	return this._conv;
};


// Private and protected methods

ZmConvController.prototype._getReadingPanePref =
function() {
	return appCtxt.get(ZmSetting.READING_PANE_LOCATION_CV);
};

ZmConvController.prototype._setReadingPanePref =
function(value) {
	appCtxt.set(ZmSetting.READING_PANE_LOCATION_CV, value);
};

ZmConvController.prototype._createDoublePaneView =
function() {
	return (new ZmConvView({parent:this._container, controller:this, dropTgt:this._dropTgt}));
};

// Creates the conv view, which is not a standard list view (it's a two-pane sort of thing).
ZmConvController.prototype._initialize =
function(view) {
	ZmDoublePaneController.prototype._initialize.call(this, view);
	
	// set up custom listeners for this view 
	if (this._doublePaneView) {
		this._doublePaneView.addTagClickListener(new AjxListener(this, ZmConvController.prototype._convTagClicked));
	}
};

ZmConvController.prototype._initializeToolBar = 
function(view) {
	if (!this._toolbar[view]) {
		// nuke the double arrows for lower resolutions
		var navArrows = AjxEnv.is1024x768orLower ? ZmNavToolBar.SINGLE_ARROWS : ZmNavToolBar.ALL_ARROWS;

		ZmDoublePaneController.prototype._initializeToolBar.call(this, view, navArrows);
	}
	this._setupDeleteMenu(view);	// ALWAYS call setup to turn delete menu on/off
	this._setupSpamButton(this._toolbar[view]);
	this._setupCheckMailButton(this._toolbar[view]);
};

ZmConvController.prototype._setupViewMenuItems =
function(view, btn) {

	var menu = new ZmPopupMenu(btn);
	btn.setMenu(menu);

	this._setupReadingPaneMenuItems(view, menu, this.isReadingPaneOn());

	return menu;
};

ZmConvController.prototype._setupDeleteMenu =
function(view) {
	var delButton = this._toolbar[view].getButton(ZmOperation.DELETE_MENU);
	if (this._conv.numMsgs > 1) {
		var menu = new ZmPopupMenu(delButton);
		delButton.setMenu(menu);
		delButton.noMenuBar = true;

		var id = ZmOperation.DELETE_MSG;
		var mi = menu.createMenuItem(id, {image:ZmOperation.getProp(id, "image"), text:ZmMsg[ZmOperation.getProp(id, "textKey")]});
		mi.setData(ZmOperation.MENUITEM_ID, ZmOperation.DELETE_MSG);
		mi.addSelectionListener(this._listeners[ZmOperation.DELETE]);

		id = ZmOperation.DELETE_CONV;
		mi = menu.createMenuItem(id, {image:ZmOperation.getProp(id, "image"), text:ZmMsg[ZmOperation.getProp(id, "textKey")]});
		mi.setData(ZmOperation.MENUITEM_ID, ZmOperation.DELETE_CONV);
		mi.addSelectionListener(this._listeners[ZmOperation.DELETE]);
	}
	else if (delButton.getMenu()) {
		delButton.setMenu(null);
	}
};

/**
 * Override to replace DELETE with DELETE_MENU
 */
ZmConvController.prototype._standardToolBarOps =
function() {
	return [ZmOperation.NEW_MENU,
			ZmOperation.SEP,
			ZmOperation.CHECK_MAIL,
			ZmOperation.SEP,
			ZmOperation.DELETE_MENU, ZmOperation.MOVE, ZmOperation.PRINT];
};

ZmConvController.prototype._getViewType =
function() {
	return ZmId.VIEW_CONV;
};

ZmConvController.prototype._setActiveSearch =
function(view) {
	// bug fix #7389 - do nothing!
};

// Operation listeners

// Delete one or more items.
ZmConvController.prototype._deleteListener =
function(ev) {
	if (ev.item.getData(ZmOperation.MENUITEM_ID) == ZmOperation.DELETE_CONV) {
		// use conv list controller to delete conv
		var clc = AjxDispatcher.run("GetConvListController");
		clc._doDelete([this._conv]);
		this._app.popView();
	}
	else if (ev.item.getMenu() == null) {
		var items = this._listView[this._currentView].getSelection();
		var delItems = [];
		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			var folder = item.folderId ? appCtxt.getById(item.folderId) : null;
			var canDelete = (!folder || (folder && !folder.isHardDelete()));
			if (canDelete) {
				delItems.push(item);
			}
		}
		if (delItems.length) {
			this._doDelete(delItems);
		}
	} else {
		ev.item.popup();
	}
};

// Tag in the summary area clicked, do a tag search.
ZmConvController.prototype._convTagClicked =
function(tagId) {
	var tag = appCtxt.getById(tagId);
	appCtxt.getSearchController().search({query: tag.createQuery()});
};

// Handle DnD tagging (can only add a tag to a single item) - if a tag got dropped onto
// a msg, we need to update its conv
ZmConvController.prototype._dropListener =
function(ev) {
	ZmListController.prototype._dropListener.call(this, ev);
	// need to check to make sure tagging actually happened
	if (ev.action == DwtDropEvent.DRAG_DROP) {
		var div = this._listView[this._currentView].getTargetItemDiv(ev.uiEvent);
		if (div) {
			var tag = ev.srcData;
			if (!this._conv.hasTag(tag.id)) {
				this._doublePaneView._setTags(this._conv); 	// update tag summary
			}
		}
	}
};

// same as for ZmTradController
ZmConvController.prototype._listSelectionListener =
function(ev) {
	var item = ev.item;
	if (!item) { return; }
	var handled = ZmDoublePaneController.prototype._listSelectionListener.apply(this, arguments);
	if (!handled && ev.detail == DwtListView.ITEM_DBL_CLICKED) {
		var respCallback = new AjxCallback(this, this._handleResponseListSelectionListener, item);
		AjxDispatcher.run("GetMsgController").show(item, this._msgControllerMode, respCallback, true);
	}
};

// Miscellaneous

// Called after a delete/move notification has been received.
// Return value indicates whether view was popped as a result of a delete.
ZmConvController.prototype.handleDelete =
function() {

	var popView = true;

	if (this._conv.numMsgs > 1) {
		popView = !this._conv.hasMatchingMsg(AjxDispatcher.run("GetConvListController").getList().search, true);
	}

	// Don't pop unless we're currently visible!
	var currViewId = appCtxt.getCurrentViewId();

	// bug fix #4356 - if currViewId is compose (among other restrictions) then still pop
	var popAnyway = false;
	if (currViewId == ZmId.VIEW_COMPOSE && this._conv.numMsgs == 1 && this._conv.msgs) {
		var msg = this._conv.msgs.getArray()[0];
		popAnyway = (msg.isInvite() && msg.folderId == ZmFolder.ID_TRASH);
	}

	popView = popView && ((currViewId == this._currentView) || popAnyway);

	if (popView) {
		this._app.popView();
	} else {
		var delButton = this._toolbar[this._currentView].getButton(ZmOperation.DELETE_MENU);
		var delMenu = delButton ? delButton.getMenu() : null;
		if (delMenu) {
			delMenu.enable(ZmOperation.DELETE_MSG, false);
		}
	}

	return popView;
};

ZmConvController.prototype.getKeyMapName =
function() {
	return "ZmConvController";
};

ZmConvController.prototype.handleKeyAction =
function(actionCode) {
	DBG.println(AjxDebug.DBG3, "ZmConvController.handleKeyAction");

	switch (actionCode) {
		case ZmKeyMap.CANCEL:
			this._backListener();
			break;

		case ZmKeyMap.NEXT_CONV:
			if (this._navToolBar[this._currentView].getButton(ZmOperation.PAGE_DBL_FORW).getEnabled()) {
				this._paginateDouble(true);
			}
			break;

		case ZmKeyMap.PREV_CONV:
			if (this._navToolBar[this._currentView].getButton(ZmOperation.PAGE_DBL_BACK).getEnabled()) {
				this._paginateDouble(false);
			}
			break;

		default:
			return ZmMailListController.prototype.handleKeyAction.call(this, actionCode);
			break;
	}
	return true;
};


ZmConvController.prototype._resetOperations =
function(parent, num) {
	ZmDoublePaneController.prototype._resetOperations.call(this, parent, num);

	var canDelete = false;
	var items = this._doublePaneView.getSelection();
	for (var i = 0; i < items.length; i++) {
		var item = items[i];
		var folder = item.folderId ? appCtxt.getById(item.folderId) : null;
		canDelete = (!folder || (folder && !folder.isInTrash()));
		if (canDelete) {
			break;
		}
	}

	parent.enable(ZmOperation.DELETE, canDelete);

	if (parent instanceof ZmButtonToolBar) {
		parent.enable(ZmOperation.DELETE_MENU, true);
		var delButton = parent.getButton(ZmOperation.DELETE_MENU);
		var delMenu = delButton ? delButton.getMenu() : null;
		if (delMenu) {
			delMenu.enable(ZmOperation.DELETE_MSG, canDelete);
		}
	}
};

ZmConvController.prototype._resetNavToolBarButtons =
function(view) {
	if (!this._navToolBar[view]) { return; }
	ZmDoublePaneController.prototype._resetNavToolBarButtons.call(this, view);

	var list = this._conv.list.getVector();

	// enable/disable up/down buttons per conversation index
	var first = list.get(0);
	this._navToolBar[view].enable(ZmOperation.PAGE_DBL_BACK, (first && first != this._conv));
	var enablePgDn = this._conv.list.hasMore() || (list.getLast() != this._conv);
	this._navToolBar[view].enable(ZmOperation.PAGE_DBL_FORW, enablePgDn);

	this._navToolBar[view].setToolTip(ZmOperation.PAGE_BACK, ZmMsg.previousPage);
	this._navToolBar[view].setToolTip(ZmOperation.PAGE_FORWARD, ZmMsg.nextPage);
	this._navToolBar[view].setToolTip(ZmOperation.PAGE_DBL_BACK, ZmMsg.previousConversation);
	this._navToolBar[view].setToolTip(ZmOperation.PAGE_DBL_FORW, ZmMsg.nextConversation);
};

ZmConvController.prototype._getNumTotal =
function() {
	return this._conv.numMsgs;
};

// overloaded...
ZmConvController.prototype._search = 
function(view, offset, limit, callback) {
	var params = {
		sortBy: appCtxt.get(ZmSetting.SORTING_PREF, view),
		offset: offset,
		limit: limit,
		getFirstMsg: this.isReadingPaneOn()
	};
	this._conv.load(params, callback);
};

ZmConvController.prototype._paginateDouble = 
function(bDoubleForward) {
	var ctlr = this._parentController || AjxDispatcher.run("GetConvListController");
	if (ctlr) {
		ctlr.pageItemSilently(this._conv, bDoubleForward);
	}
};

ZmConvController.prototype._getSearchFolderId = 
function() {
	return this._conv.list.search.folderId;
};

// top level view means this view is allowed to get shown when user clicks on 
// app icon in app toolbar - we dont want conv view to be top level (always show CLV)
ZmConvController.prototype._isTopLevelView = 
function() {
	return false;
};
