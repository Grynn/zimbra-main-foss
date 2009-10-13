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
 * Creates an empty message controller.
 * @constructor
 * @class
 * This class controls the display and management of a single message in the content area. Since it
 * needs to handle pretty much the same operations as a list, it extends ZmMailListController.
 *
 * @author Parag Shah
 * @author Conrad Damon
 * 
 * @param container	containing shell
 * @param mailApp	containing app 
 */
ZmMsgController = function(container, mailApp) {

	ZmMailListController.call(this, container, mailApp);
};

ZmMsgController.prototype = new ZmMailListController;
ZmMsgController.prototype.constructor = ZmMsgController;

ZmMsgController.MODE_TO_CONTROLLER = {};
ZmMsgController.MODE_TO_CONTROLLER[ZmId.VIEW_TRAD]		= "GetTradController";
ZmMsgController.MODE_TO_CONTROLLER[ZmId.VIEW_CONV]		= "GetConvController";
ZmMsgController.MODE_TO_CONTROLLER[ZmId.VIEW_CONVLIST]	= "GetConvListController";

ZmMsgController.DEFAULT_TAB_TEXT = ZmMsg.message;

// Public methods

ZmMsgController.prototype.toString = 
function() {
	return "ZmMsgController";
};

/**
 * Displays a message in the single-pane view.
 *
 * @param msg		[ZmMailMsg]		the message to display
 * @param mode		[const]			owning view ID
 * @param callback	[AjxCallback]*	client callback
 * @param markRead	[boolean]*		if true, mark msg read
 * @param reuse		[boolean]*		if true, reuse the current tab view rather than adding a new tab
 */
ZmMsgController.prototype.show = 
function(msg, mode, callback, markRead, reuse) {

	this.setMsg(msg);
	this._mode = mode;
	this._currentView = this._getViewType();
	this._list = msg.list;
	if (!msg._loaded) {
		var respCallback = new AjxCallback(this, this._handleResponseShow,[callback, reuse]);
		if (msg._loadPending) {
			// override any local callback if we're being launched by double-pane view,
			// so that multiple GetMsgRequest's aren't made
			msg._loadCallback = respCallback;
		} else {
			markRead = markRead || (appCtxt.get(ZmSetting.MARK_MSG_READ) == ZmSetting.MARK_READ_NOW);
			msg.load({callback:respCallback, markRead:markRead});
		}
	} else {
		this._handleResponseShow(callback, reuse);
	}
};

ZmMsgController.prototype._handleResponseShow = 
function(callback, reuse, result) {
	this._showMsg(reuse);
	if (callback) {
		callback.run();
	}
};

/**
* Called by ZmNewWindow.unload to remove tag list listener (which resides in 
* the parent window). Otherwise, after the child window is closed, the parent 
* window is still referencing the child window's msg controller, which has
* been unloaded!!
*/
ZmMsgController.prototype.dispose = 
function() {
	this._tagList.removeChangeListener(this._tagChangeLstnr);
};

ZmMsgController.prototype._showMsg = 
function(reuse) {

	var avm = appCtxt.getAppViewMgr();
	this._setup(this._currentView);
	var elements = {};
	elements[ZmAppViewMgr.C_TOOLBAR_TOP] = this._toolbar[this._currentView];
	elements[ZmAppViewMgr.C_APP_CONTENT] = this._listView[this._currentView];
	var oldId = reuse && avm._currentView;
	var tabParams = {id:this.viewId, image:"MessageView", textPrecedence:85,
					 tooltip:ZmMsgController.DEFAULT_TAB_TEXT, oldId:oldId};
	var viewParams = {view:this._currentView, elements:elements, clear:appCtxt.isChildWindow,
					  tabParams:tabParams, isTransient:true};
	var buttonText = (this._msg && this._msg.subject) ? this._msg.subject.substr(0, ZmAppViewMgr.TAB_BUTTON_MAX_TEXT) :
					 									ZmMsgController.DEFAULT_TAB_TEXT;
	if (avm._tabParams[viewParams.view]) {
		avm._tabParams[viewParams.view].oldId = oldId;
	}
	this._setView(viewParams);
	avm.setTabTitle(this._currentView, buttonText);
	this._resetOperations(this._toolbar[this._currentView], 1); // enable all buttons
};

ZmMsgController.prototype.getKeyMapName =
function() {
	return "ZmMsgController";
};

ZmMsgController.prototype.handleKeyAction =
function(actionCode) {
	DBG.println(AjxDebug.DBG3, "ZmMsgController.handleKeyAction");
	
	switch (actionCode) {
		case ZmKeyMap.CANCEL:
			this._backListener();
			break;
			
		default:
			return ZmMailListController.prototype.handleKeyAction.call(this, actionCode);
			break;
	}
	return true;
};

ZmMsgController.prototype.mapSupported =
function(map) {
	return false;
};

// Private methods (mostly overrides of ZmListController protected methods)

ZmMsgController.prototype._getToolBarOps = 
function() {
	var list;
	if (appCtxt.isChildWindow) {
		list = [ZmOperation.CLOSE, ZmOperation.SEP, ZmOperation.PRINT, ZmOperation.DELETE];
		list.push(ZmOperation.SEP);
		list = list.concat(this._msgOps());
		list.push(ZmOperation.SEP, ZmOperation.SPAM, ZmOperation.SEP, ZmOperation.TAG_MENU);
	}
	else {
		list = this._standardToolBarOps();
		list.push(ZmOperation.SEP);
		list = list.concat(this._msgOps());
		list.push(ZmOperation.SEP,
					ZmOperation.SPAM,
					ZmOperation.SEP,
					ZmOperation.TAG_MENU,
					ZmOperation.SEP);
		if (appCtxt.get(ZmSetting.DETACH_MAILVIEW_ENABLED)) {
			list.push(ZmOperation.DETACH);
		}
	}
	return list;
};

ZmMsgController.prototype._initializeToolBar =
function(view) {
	if (!appCtxt.isChildWindow) {
		ZmMailListController.prototype._initializeToolBar.call(this, view);
	} else {
		var buttons = this._getToolBarOps();
		if (!buttons) return;
		var params = {
			parent:this._container,
			buttons:buttons,
			className:"ZmMsgViewToolBar_cw",
			context:this._getViewType(),
			controller:this
		};
		var tb = this._toolbar[view] = new ZmButtonToolBar(params);

		buttons = tb.opList;
		for (var i = 0; i < buttons.length; i++) {
			var button = buttons[i];
			if (this._listeners[button]) {
				tb.addSelectionListener(button, this._listeners[button]);
			}
		}

		this._setupSpamButton(tb);
		button = tb.getButton(ZmOperation.TAG_MENU);
		if (button) {
			button.noMenuBar = true;
			this._setupTagMenu(tb);
		}
	}
};

ZmMsgController.prototype._navBarListener =
function(ev) {
	var op = ev.item.getData(ZmOperation.KEY_ID);
	if (op == ZmOperation.PAGE_BACK || op == ZmOperation.PAGE_FORWARD) {
		this._goToMsg(this._currentView, (op == ZmOperation.PAGE_FORWARD));
	}
};

// message view has no view menu button
ZmMsgController.prototype._setupViewMenu = function(view, firstTime) {};

ZmMsgController.prototype._getActionMenuOps =
function() {
	return null;
};

ZmMsgController.prototype._getViewType =
function() {
	return this.viewId;
};

ZmMsgController.prototype._initializeListView =
function(view) {
	if (!this._listView[view]) {
		var params = {
			parent:		this._container,
			id:			ZmId.getViewId(ZmId.VIEW_MSG, null, view),
			posStyle:	Dwt.ABSOLUTE_STYLE,
			mode:		ZmId.VIEW_MSG,
			controller:	this
		};
		this._listView[view] = new ZmMailMsgView(params);
		this._listView[view].addInviteReplyListener(this._inviteReplyListener);
		this._listView[view].addShareListener(this._shareListener);
	}
};

ZmMsgController.prototype.getReferenceView =
function () {
	return this._listView[this._currentView];
};

ZmMsgController.prototype._getSearchFolderId =
function() {
	return this._msg.folderId ? this._msg.folderId : (this._msg.list && this._msg.list.search) ?
		this._msg.list.search.folderId : null;
};

ZmMsgController.prototype._getTagMenuMsg =
function() {
	return ZmMsg.tagMessage;
};

ZmMsgController.prototype._getMoveDialogTitle =
function() {
	return ZmMsg.moveMessage;
};

ZmMsgController.prototype._setViewContents =
function(view) {
	this._listView[view].set(this._msg);
};

ZmMsgController.prototype._resetNavToolBarButtons =
function(view) {
	if (!this._navToolBar[view]) { return; }
	// NOTE: we purposely do not call base class here!
	if (!appCtxt.isChildWindow) {
		var list = this._msg.list && this._msg.list.getVector();

		this._navToolBar[view].enable(ZmOperation.PAGE_BACK, (list && (list.get(0) != this._msg)));

		var bEnableForw = list && (this._msg.list.hasMore() || (list.getLast() != this._msg));
		this._navToolBar[view].enable(ZmOperation.PAGE_FORWARD, bEnableForw);

		this._navToolBar[view].setToolTip(ZmOperation.PAGE_BACK, ZmMsg.previousMessage);
		this._navToolBar[view].setToolTip(ZmOperation.PAGE_FORWARD, ZmMsg.nextMessage);
	}
};

ZmMsgController.prototype._goToMsg =
function(view, next) {
	var controller = AjxDispatcher.run(ZmMsgController.MODE_TO_CONTROLLER[this._mode]);
	if (controller) {
		controller.pageItemSilently(this._msg, next);
		this._resetNavToolBarButtons(view);
	}
};

ZmMsgController.prototype._menuPopdownActionListener =
function(ev) {
	// dont do anything since msg view has no action menus
};

// Miscellaneous

ZmMsgController.prototype.getMsg =
function(params) {
	return this._msg;
};

ZmMsgController.prototype._getLoadedMsg =
function(params, callback) {
	callback.run(this._msg);
};

ZmMsgController.prototype._getSelectedMsg =
function() {
	return this._msg;
};

ZmMsgController.prototype.setMsg =
function (msg) {
	this._msg = msg;
};

// No-op replenishment
ZmMsgController.prototype._checkReplenish =
function(params) {
	// XXX: remove this when replenishment is fixed for msg controller!
	DBG.println("SORRY. NO REPLENISHMENT FOR YOU.");
};

ZmMsgController.prototype._getDefaultFocusItem = 
function() {
	return this._toolbar[this._currentView];
};

ZmMsgController.prototype._backListener =
function(ev) {
	var isChildWindow = appCtxt.isChildWindow;
	if (!this._app.popView() && !isChildWindow) {
		this._app.mailSearch();
	}
};
