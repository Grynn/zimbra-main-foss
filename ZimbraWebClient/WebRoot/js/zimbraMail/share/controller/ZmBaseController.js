/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2004-2011 Zimbra, Inc.
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

/**
 * @overview
 * This file defines a base controller class.
 *
 */

/**
 * This class is a base class for any controller that manages items such as messages, contacts,
 * appointments, tasks, etc. It handles operations that can be performed on those items such as
 * move, delete, tag, print, etc.
 *
 * @author Conrad Damon
 *
 * @param {DwtControl}	container	the containing shell
 * @param {ZmApp}		app			the containing application
 * 
 * @extends		ZmController
 */
ZmBaseController = function(container, app) {

	if (arguments.length == 0) { return; }
	ZmController.call(this, container, app);

    this._refreshQuickCommandsClosure = this._refreshQuickCommands.bind(this);
    this._quickCommandMenuHandlerClosure = this._quickCommandMenuHandler.bind(this);

	// hashes keyed by view type
	this._view		= {};
	this._toolbar	= {};	// ZmButtonToolbar
	this._tabGroups = {};	// DwtTabGroup

	this._tagList = appCtxt.getTagTree();
	if (this._tagList) {
		this._tagList.addChangeListener(this._tagChangeListener.bind(this));
	}

	// create a listener for each operation
	this._listeners = {};
	this._listeners[ZmOperation.NEW_MENU]		= this._newListener.bind(this);
	this._listeners[ZmOperation.TAG_MENU]		= this._tagButtonListener.bind(this);
	this._listeners[ZmOperation.MOVE_MENU]		= this._moveButtonListener.bind(this);
	this._listeners[ZmOperation.ACTIONS_MENU]	= this._actionsButtonListener.bind(this);
	this._listeners[ZmOperation.TAG]			= this._tagListener.bind(this);
	this._listeners[ZmOperation.PRINT]			= this._printListener.bind(this);
	this._listeners[ZmOperation.DELETE]			= this._deleteListener.bind(this);
	this._listeners[ZmOperation.DELETE_WITHOUT_SHORTCUT]			= this._deleteListener.bind(this);
	this._listeners[ZmOperation.CLOSE]			= this._backListener.bind(this);
	this._listeners[ZmOperation.MOVE]			= this._moveListener.bind(this);
	this._listeners[ZmOperation.SEARCH]			= this._participantSearchListener.bind(this);
	this._listeners[ZmOperation.BROWSE]			= this._participantBrowseListener.bind(this);
	this._listeners[ZmOperation.NEW_MESSAGE]	= this._participantComposeListener.bind(this);
	this._listeners[ZmOperation.CONTACT]		= this._participantContactListener.bind(this);
	this._listeners[ZmOperation.VIEW]			= this._viewMenuItemListener.bind(this);

	// TODO: do this better - avoid referencing specific apps
	if (window.ZmImApp) {
		this._listeners[ZmOperation.IM] = ZmImApp.getImMenuItemListener();
	}
};

ZmBaseController.prototype = new ZmController;
ZmBaseController.prototype.constructor = ZmBaseController;

ZmBaseController.prototype.isZmBaseController = true;
ZmBaseController.prototype.toString = function() { return "ZmBaseController"; };


// public methods

/**
 * Gets the current view.
 * 
 * @return	{ZmListView}	the view
 */
ZmBaseController.prototype.getCurrentView =
function() {
	return this._view[this._currentView];
};

/**
 * Gets the current tool bar.
 * 
 * @return	{ZmButtonToolbar}		the toolbar
 */
ZmBaseController.prototype.getCurrentToolbar =
function() {
	return this._toolbar[this._currentView];
};

/**
 * Returns the list of items to be acted upon.
 */
ZmBaseController.prototype.getItems = function() {};

/**
 * Returns the number of items to be acted upon.
 */
ZmBaseController.prototype.getItemCount = function() {};

/**
 * Handles a shortcut.
 * 
 * @param	{constant}	actionCode		the action code
 * @return	{Boolean}	<code>true</code> if the action is handled
 */
ZmBaseController.prototype.handleKeyAction =
function(actionCode) {

	DBG.println(AjxDebug.DBG3, "ZmBaseController.handleKeyAction");

	switch (actionCode) {

		case ZmKeyMap.FLAG:
			this._doFlag(this.getItems());
			break;

		case ZmKeyMap.MOVE:
			if (!appCtxt.isChildWindow) {
				this._moveListener();
			}
			break;

		case ZmKeyMap.PRINT:
			if (appCtxt.get(ZmSetting.PRINT_ENABLED)) {
				this._printListener();
			}
			break;

		case ZmKeyMap.TAG:
			var items = this.getItems();
			if (items && items.length && (appCtxt.getTagTree().size() > 0)) {
				var dlg = appCtxt.getPickTagDialog();
				ZmController.showDialog(dlg, new AjxCallback(this, this._tagSelectionCallback, [items, dlg]));
			}
			break;

		case ZmKeyMap.UNTAG:
			if (appCtxt.get(ZmSetting.TAGGING_ENABLED)) {
				var items = this.getItems();
				if (items && items.length) {
					this._doRemoveAllTags(items);
				}
			}
			break;

		default:
			return ZmController.prototype.handleKeyAction.call(this, actionCode);
	}
	return true;
};

// abstract protected methods

// Creates the view element
ZmBaseController.prototype._createNewView	 	= function() {};

// Returns the view ID
ZmBaseController.prototype._getViewType 		= function() {};
ZmBaseController.prototype._defaultView 		= function() { return this._getViewType(); };

// Populates the view with data
ZmBaseController.prototype._setViewContents		= function(view) {};

// Returns text for the tag operation
ZmBaseController.prototype._getTagMenuMsg 		= function(num) {};

// Returns text for the move dialog
ZmBaseController.prototype._getMoveDialogTitle	= function(num) {};

// Returns a list of desired toolbar operations
ZmBaseController.prototype._getToolBarOps 		= function() {};

// Returns a list of secondary (non primary) toolbar operations
ZmBaseController.prototype._getSecondaryToolBarOps 		= function() {};


// private and protected methods

/**
 * Creates basic elements and sets the toolbar and action menu.
 * 
 * @private
 */
ZmBaseController.prototype._setup =
function(view) {
	this._initialize(view);
	this._resetOperations(this._toolbar[view], 0);
};

/**
 * Creates the basic elements: toolbar, list view, and action menu.
 *
 * @private
 */
ZmBaseController.prototype._initialize =
function(view) {
	this._initializeToolBar(view);
	this._initializeView(view);
	this._initializeTabGroup(view);
};

// Below are functions that return various groups of operations, for cafeteria-style
// operation selection.

/**
 * @private
 */
ZmBaseController.prototype._standardToolBarOps =
function() {
	return [ZmOperation.DELETE, ZmOperation.MOVE_MENU, ZmOperation.PRINT];
};

/**
 * Initializes the toolbar buttons and listeners.
 * 
 * @private
 */
ZmBaseController.prototype._initializeToolBar =
function(view, className) {

	if (this._toolbar[view]) { return; }

	var buttons = this._getToolBarOps();
	var secondaryButtons = this._getSecondaryToolBarOps();
	if (!(buttons || secondaryButtons)) { return; }

	var tbParams = {
		parent:				this._container,
		buttons:			buttons,
		secondaryButtons:	secondaryButtons,
		context:			view,
		controller:			this,
		refElementId:		ZmId.SKIN_APP_TOP_TOOLBAR,
		className:			className
	};
	var tb = this._toolbar[view] = new ZmButtonToolBar(tbParams);

	var button;
	for (var i = 0; i < tb.opList.length; i++) {
		button = tb.opList[i];
		if (this._listeners[button]) {
			tb.addSelectionListener(button, this._listeners[button]);
		}
	}

	button = tb.getButton(ZmOperation.TAG_MENU);
	if (button) {
		button.noMenuBar = true;
		this._setupTagMenu(tb);
	}

	button = tb.getButton(ZmOperation.MOVE_MENU);
	if (button) {
		button.noMenuBar = true;
		this._setupMoveMenu(tb);
	}


	// add the selection listener for when user clicks on the little drop-down arrow (unfortunately we have to do that here separately) It is done for the main button area in a generic way to all toolbar buttons elsewhere
	var actionsButton = tb.getActionsButton();
	if (actionsButton) {
		actionsButton.addDropDownSelectionListener(this._listeners[ZmOperation.ACTIONS_MENU]);
	}

	var actionsMenu = tb.getActionsMenu();
	if (actionsMenu) {
		this._setSearchMenu(actionsMenu, true);
	}	

	appCtxt.notifyZimlets("initializeToolbar", [this._app, tb, this, view], {waitUntilLoaded:true});
};

/**
 * Initializes the view and its listeners.
 * 
 * @private
 */
ZmBaseController.prototype._initializeView =
function(view) {

	if (this._view[view]) { return; }

	this._view[view] = this._createNewView(view);
	this._view[view].addSelectionListener(this._listSelectionListener.bind(this));
	this._view[view].addActionListener(this._listActionListener.bind(this));
};

// back-compatibility (bug 60073)
ZmBaseController.prototype._initializeListView = ZmBaseController.prototype._initializeView;

/**
 * Sets up tab groups (focus ring).
 * 
 * @private
 */
ZmBaseController.prototype._initializeTabGroup =
function(view) {

	if (this._tabGroups[view]) { return; }

	this._tabGroups[view] = this._createTabGroup();
	this._tabGroups[view].newParent(appCtxt.getRootTabGroup());
	this._toolbar[view].noFocus = true;
	this._tabGroups[view].addMember(this._view[view].getTabGroupMember());
};

/**
 * Creates the desired application view.
 *
 * @param params		[hash]			hash of params:
 *        view			[constant]		view ID
 *        elements		[array]			array of view components
 *        controller	[ZmController]	controller responsible for this view
 *        isAppView		[boolean]*		this view is a top-level app view
 *        clear			[boolean]*		if true, clear the hidden stack of views
 *        pushOnly		[boolean]*		don't reset the view's data, just swap the view in
 *        isTransient	[boolean]*		this view doesn't go on the hidden stack
 *        stageView		[boolean]*		stage the view rather than push it
 *        tabParams		[hash]*			button params; view is opened in app tab instead of being stacked
 *        
 * @private
 */
ZmBaseController.prototype._setView =
function(params) {

	var view = params.view;
	if (this.sessionId && this.sessionId.indexOf(ZmId.VIEW_SEARCH_RESULTS) == 0) {
		// view is being embedded within search results, so don't push it
		this._setViewContents(view);
		return;
	}
	
	// create the view (if we haven't yet)
	if (!this._appViews[view]) {
		// view management callbacks
		var callbacks = {};
		callbacks[ZmAppViewMgr.CB_PRE_HIDE]		= this._preHideCallback.bind(this);
		callbacks[ZmAppViewMgr.CB_PRE_UNLOAD]	= this._preUnloadCallback.bind(this);
		callbacks[ZmAppViewMgr.CB_POST_HIDE]	= this._postHideCallback.bind(this);
		callbacks[ZmAppViewMgr.CB_PRE_SHOW]		= this._preShowCallback.bind(this);
		callbacks[ZmAppViewMgr.CB_POST_SHOW]	= this._postShowCallback.bind(this);

		params.callbacks = callbacks;
		params.viewId = view;
		this._app.createView(params);
		this._appViews[view] = true;
	}

	// populate the view
	if (!params.pushOnly) {
		this._setViewContents(view);
	}

	// push the view
	if (params.stageView) {
		this._app.stageView(view);
	} else {
		return (params.clear ? this._app.setView(view) : this._app.pushView(view));
	}
};



// Operation listeners

/**
 * Tag button has been pressed. We don't tag anything (since no tag has been selected),
 * we just show the dynamic tag menu.
 * 
 * @private
 */
ZmBaseController.prototype._tagButtonListener =
function(ev) {
	var toolbar = this._toolbar[this._currentView];
	if (ev.item.parent == toolbar) {
		this._setTagMenu(toolbar);
	}
};

/**
 * Move button has been pressed. We don't move anything (since no folder has been selected),
 * we just show the dynamic move menu.
 *
 * @private
 */
ZmBaseController.prototype._moveButtonListener =
function(ev, list) {
	this._pendingActionData = list || this.getItems();

	var toolbar = this._toolbar[this._currentView];

	var moveButton = toolbar.getOp(ZmOperation.MOVE_MENU);
	if (!moveButton) {
		return;
	}
	if (!this._moveButtonInitialized) {
		this._moveButtonInitialized = true;
		appCtxt.getShell().setBusy(true);
		this._setMoveButton(moveButton);
		appCtxt.getShell().setBusy(false);
	}
	else {
		//need to update this._data so the chooser knows from which folder we are trying to move.
		this._folderChooser.updateData(this._getMoveParams(this._folderChooser).data);
	}
	moveButton.popup();
	moveButton.getMenu().getHtmlElement().style.width = "auto"; //reset the width so it's dynamic. without this it is set to 0, and in any case even if it was set to some other > 0 value, it needs to be dynamic due to collapse/expand (width changes)
	this._folderChooser.focus();
};

/**
 * Actions button has been pressed.
 * @private
 */
ZmBaseController.prototype._actionsButtonListener =
function(ev) {
	var menu = this._getCurrentToolbar().getActionsMenu();
	menu.parent.popup();	
};


/**
 * Tag/untag items.
 * 
 * @private
 */
ZmBaseController.prototype._tagListener =
function(ev, items) {

	var curView = appCtxt.getAppViewMgr().getCurrentViewId();
	if (curView == this._getViewType()) {
		var tagEvent = ev.getData(ZmTagMenu.KEY_TAG_EVENT);
		var tagAdded = ev.getData(ZmTagMenu.KEY_TAG_ADDED);
		items = items || this.getItems();
		if (tagEvent == ZmEvent.E_TAGS && tagAdded) {
			this._doTag(items, ev.getData(Dwt.KEY_OBJECT), true);
		} else if (tagEvent == ZmEvent.E_CREATE) {
			this._pendingActionData = items;
			var newTagDialog = appCtxt.getNewTagDialog();
			if (!this._newTagCb) {
				this._newTagCb = new AjxCallback(this, this._newTagCallback);
			}
			ZmController.showDialog(newTagDialog, this._newTagCb);
			newTagDialog.registerCallback(DwtDialog.CANCEL_BUTTON, this._clearDialog, this, newTagDialog);
		} else if (tagEvent == ZmEvent.E_TAGS && !tagAdded) {
			//remove tag
			this._doTag(items, ev.getData(Dwt.KEY_OBJECT), false);
		} else if (tagEvent == ZmEvent.E_REMOVE_ALL) {
			// bug fix #607
			this._doRemoveAllTags(items);
		}
	}
};

/**
 * Called after tag selection via dialog.
 * 
 * @private
 */
ZmBaseController.prototype._tagSelectionCallback =
function(items, dialog, tag) {
	if (tag) {
		this._doTag(items, tag, true);
	}
	dialog.popdown();
};

/**
 * overload if you want to print in a different way.
 * 
 * @private
 */
ZmBaseController.prototype._printListener =
function(ev) {
	var items = this.getItems();
    if (items && items[0]) {
	    window.open(items[0].getRestUrl(), "_blank");
	}
};

ZmBaseController.prototype._backListener =
function(ev) {
	this._app.popView();
};

/**
 * Delete one or more items.
 * 
 * @private
 */
ZmBaseController.prototype._deleteListener =
function(ev) {
	this._doDelete(this.getItems(), ev.shiftKey);
};

/**
 * Move button has been pressed, show the dialog.
 * 
 * @private
 */
ZmBaseController.prototype._moveListener =
function(ev, list) {

	this._pendingActionData = list || this.getItems();
	var moveToDialog = appCtxt.getChooseFolderDialog();
	if (!this._moveCb) {
		this._moveCb = new AjxCallback(this, this._moveCallback);
	}
	ZmController.showDialog(moveToDialog, this._moveCb, this._getMoveParams(moveToDialog));
	moveToDialog.registerCallback(DwtDialog.CANCEL_BUTTON, this._clearDialog, this, moveToDialog);
};

/**
 * From Search based on email address.
 *
 * @private
 */
ZmBaseController.prototype._participantSearchListener =
function(ev) {
};

/**
 * Browse based on email address.
 *
 * @private
 */
ZmBaseController.prototype._participantBrowseListener =
function(ev) {
};

/**
 * Compose message to participant.
 *
 * @private
 */
ZmBaseController.prototype._participantComposeListener =
function(ev) {
};

/**
 * If there's a contact for the participant, edit it, otherwise add it.
 *
 * @private
 */
ZmBaseController.prototype._participantContactListener =
function(ev) {
};

/**
 * @protected
 */
ZmBaseController.prototype._getMoveParams =
function(dlg) {

	var org = ZmApp.ORGANIZER[this._app._name] || ZmOrganizer.FOLDER;
	return {
		overviewId:		dlg.getOverviewId(this._app._name),
		data:			this._pendingActionData,
		treeIds:		[org],
		title:			this._getMoveDialogTitle(this._pendingActionData.length),
		description:	ZmMsg.targetFolder,
		treeStyle:		DwtTree.SINGLE_STYLE,
		appName:		this._app._name
	};
};

/**
 * Switch to selected view.
 * 
 * @private
 */
ZmBaseController.prototype._viewMenuItemListener =
function(ev) {
	if (ev.detail == DwtMenuItem.CHECKED || ev.detail == DwtMenuItem.UNCHECKED) {
		this.switchView(ev.item.getData(ZmOperation.MENUITEM_ID));
	}
};


// new organizer callbacks

/**
 * Created a new tag, now apply it.
 * 
 * @private
 */
ZmBaseController.prototype._tagChangeListener =
function(ev) {

	// only process if current view is this view!
	var curView = appCtxt.getAppViewMgr().getCurrentViewId();
	if (curView == this._getViewType()) {
		if (ev.type == ZmEvent.S_TAG && ev.event == ZmEvent.E_CREATE && this._pendingActionData) {
			var tag = ev.getDetail("organizers")[0];
			this._doTag(this._pendingActionData, tag, true);
			this._pendingActionData = null;
			this._menuPopdownActionListener();
		}
	}
};

/**
 * Move stuff to a new folder.
 * 
 * @private
 */
ZmBaseController.prototype._moveCallback =
function(folder) {
	this._doMove(this._pendingActionData, folder);
	this._clearDialog(appCtxt.getChooseFolderDialog());
	this._pendingActionData = null;
};

/**
 * Move stuff to a new folder. 
 *
 * @private
 */
ZmBaseController.prototype._moveMenuCallback =
function(moveButton, folder) {
	this._doMove(this._pendingActionData, folder);
	moveButton.getMenu().popdown();
	this._pendingActionData = null;
};

// Data handling

// Actions on items are performed through their containing list
ZmBaseController.prototype._getList =
function(items) {

	items = AjxUtil.toArray(items);
	var item = items[0];
	return item && item.list;
};

// callback (closure) to run when an action has completely finished
ZmBaseController.prototype._getAllDoneCallback = function() {};

/**
 * Shows the given summary as status toast.
 *
 * @param {String}		summary						the text that summarizes the recent action
 * @param {ZmAction}	actionLogItem				the logged action for possible undoing
 * @param {boolean}		showToastOnParentWindow		the toast message should be on the parent window (since the child window is being closed)
 */
ZmBaseController.showSummary =
function(summary, actionLogItem, showToastOnParentWindow) {
	
	if (!summary) {
		return;
	}
	summary = AjxStringUtil.htmlEncode(summary); //encode html special chars such as < and > so won't be interpreted as html (both for security and for not losing visibility of characters)
	var ctxt = showToastOnParentWindow ? parentAppCtxt : appCtxt;
	var actionController = ctxt.getActionController();
	var undoLink = actionLogItem && actionController && actionController.getUndoLink(actionLogItem);
	if (undoLink && actionController) {
		actionController.onPopup();
		ctxt.setStatusMsg({msg: summary + undoLink, transitions: actionController.getStatusTransitions()});
	} else {
		ctxt.setStatusMsg(summary);
	}
};

/**
 * Flag/unflag an item
 * 
 * @private
 */
ZmBaseController.prototype._doFlag =
function(items, on) {

	items = AjxUtil.toArray(items);
	if (!items.length) { return; }

	if (items[0] instanceof ZmItem) {
		if (on !== true && on !== false) {
			on = !items[0].isFlagged;
		}
		var items1 = [];
		for (var i = 0; i < items.length; i++) {
			if (items[i].isFlagged != on) {
				items1.push(items[i]);
			}
		}
	} else {
		items1 = items;
	}

	var params = {items:items1, op:"flag", value:on};
    params.actionText = on ? ZmMsg.actionFlag : ZmMsg.actionUnflag;
	var list = params.list = this._getList(params.items);
	this._setupContinuation(this._doFlag, [on], params);
	list.flagItems(params);
};

ZmBaseController.prototype._doMsgPriority = 
function(items, on) {
	items = AjxUtil.toArray(items);
	if (!items.length) { return; }

	if (items[0] instanceof ZmItem) {
		if (on !== true && on !== false) {
			on = !items[0].isPriority;
		}
		var items1 = [];
		for (var i = 0; i < items.length; i++) {
			if (items[i].isPriority != on) {
				items1.push(items[i]);
			}
		}
	} else {
		items1 = items;
	}

	var params = {items:items1, op:"priority", value:on};
    params.actionText = on ? ZmMsg.actionMsgPriority : ZmMsg.actionUnMsgPriority; 
	var list = params.list = this._getList(params.items);
	this._setupContinuation(this._doMsgPriority, [on], params);
	list.flagItems(params);	
};

/**
 * Tag/untag items
 * 
 * @private
 */
ZmBaseController.prototype._doTag =
function(items, tag, doTag) {

	items = AjxUtil.toArray(items);
	if (!items.length) { return; }

	var params = {items:items, tag:tag, doTag:doTag};
	var list = params.list = this._getList(params.items);
	this._setupContinuation(this._doTag, [tag, doTag], params);
	list.tagItems(params);
};

/**
 * Remove all tags for given items
 * 
 * @private
 */
ZmBaseController.prototype._doRemoveAllTags =
function(items) {

	items = AjxUtil.toArray(items);
	if (!items.length) { return; }

	var params = {items:items};
	var list = params.list = this._getList(params.items);
	this._setupContinuation(this._doRemoveAllTags, null, params);
	list.removeAllTags(params);
};

/**
* Deletes one or more items from the list.
*
* @param items			[Array]			list of items to delete
* @param hardDelete		[boolean]*		if true, physically delete items
* @param attrs			[Object]*		additional attrs for SOAP command
* @param confirmDelete  [Boolean]       user already confirmed hard delete (see ZmBriefcaseController.prototype._doDelete and ZmBriefcaseController.prototype._doDelete2) 
* 
* @private
*/
ZmBaseController.prototype._doDelete =
function(items, hardDelete, attrs, confirmDelete) {

	items = AjxUtil.toArray(items);
	if (!items.length) { return; }

	var params = {
		items:			items,
		hardDelete:		hardDelete,
		attrs:			attrs,
		childWin:		appCtxt.isChildWindow && window,
		closeChildWin:	appCtxt.isChildWindow,
		confirmDelete:	confirmDelete
	};
	var allDoneCallback = this._getAllDoneCallback();
	var list = params.list = this._getList(params.items);
	this._setupContinuation(this._doDelete, [hardDelete, attrs], params, allDoneCallback);
	
	if (!hardDelete) {
		var anyScheduled = false;
		for (var i=0, cnt=items.length; i<cnt; i++) {
			if (items[i] && items[i].isScheduled) {
				anyScheduled = true;
				break;
			}
		}
		if (anyScheduled) {
			params.noUndo = true;
			this._popupScheduledWarningDialog(list.deleteItems.bind(list, params));
		} else {
			list.deleteItems(params);
		}
	} else {
		list.deleteItems(params);
	}
};

/**
 * Moves a list of items to the given folder. Any item already in that folder is excluded.
 *
 * @param {Array}	items		a list of items to move
 * @param {ZmFolder}	folder		the destination folder
 * @param {Object}	attrs		the additional attrs for SOAP command
 * @param {Boolean}		isShiftKey	<code>true</code> if forcing a copy action
 * @private
 */
ZmBaseController.prototype._doMove =
function(items, folder, attrs, isShiftKey) {

	items = AjxUtil.toArray(items);
	if (!items.length) { return; }

	var move = [];
	var copy = [];
	if (items[0] instanceof ZmItem) {
		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			if (!item.folderId || (item.folderId != folder.id || (attrs && attrs.op == "recover"))) {
				if (!this._isItemMovable(item, isShiftKey, folder)) {
					copy.push(item);
				} else {
					move.push(item);
				}
			}
		}
	} else {
		move = items;
	}

	var params = {folder:folder, attrs:attrs};
    params.errorCallback = this._actionErrorCallback.bind(this);

	var allDoneCallback = this._getAllDoneCallback();
	if (move.length) {
		params.items = move;
		var list = params.list = this._getList(params.items);
		this._setupContinuation(this._doMove, [folder, attrs, isShiftKey], params, allDoneCallback);

		if (folder.isInTrash()) {
			var anyScheduled = false;
			var mItems = AjxUtil.toArray(move);
			for (var i=0, cnt=mItems.length; i<cnt; i++) {
				if (mItems[i] && mItems[i].isScheduled) {
					anyScheduled = true;
					break;
				}
			}
			if (anyScheduled) {
				params.noUndo = true;
				this._popupScheduledWarningDialog(list.moveItems.bind(list, params));
			} else {
				list.moveItems(params);
			}
		}
		else if (folder.getName() == ZmMsg.activityStreamsRule && items.length == 1) { //TODO: does this need to be a system folder for comaparison?
			list.moveItems(params);
			var activityStreamDialog = appCtxt.getActivityStreamFilterDialog();
			activityStreamDialog.setFields(items[0]);
			activityStreamDialog.popup();
		}
		else {
			list.moveItems(params);
		}
	}

	if (copy.length) {
		params.items = copy;
		var list = params.list = this._getList(params.items);
		this._setupContinuation(this._doMove, [folder, attrs, isShiftKey], params, allDoneCallback);
		list.copyItems(params);
	}
};

ZmBaseController.prototype._actionErrorCallback =
function(ex){
    return false;
};

ZmBaseController.prototype._popupScheduledWarningDialog =
function(callback) {
	var dialog = appCtxt.getOkCancelMsgDialog();
	dialog.reset();
	dialog.setMessage(ZmMsg.moveScheduledMessageWarning, DwtMessageDialog.WARNING_STYLE);
	dialog.registerCallback(DwtDialog.OK_BUTTON, this._scheduledWarningDialogListener.bind(this, callback, dialog));
	dialog.associateEnterWithButton(DwtDialog.OK_BUTTON);
	dialog.popup(null, DwtDialog.OK_BUTTON);
};

ZmBaseController.prototype._scheduledWarningDialogListener =
function(callback, dialog) {
	dialog.popdown()
	callback();
};

/**
 * Decides whether an item is movable
 *
 * @param {Object}	item			the item to be checked
 * @param {Boolean}		isShiftKey	<code>true</code> if forcing a copy (not a move)
 * @param {ZmFolder}	folder		the folder this item belongs under
 * 
 * @private
 */
ZmBaseController.prototype._isItemMovable =
function(item, isShiftKey, folder) {
	return (!isShiftKey && !item.isReadOnly() && !folder.isReadOnly());
};

/**
 * Modify an item.
 * 
 * @private
 */
ZmBaseController.prototype._doModify =
function(item, mods) {
	var list = this._getList(item);
	list.modifyItem(item, mods);
};

/**
 * Create an item. We need to be passed a list since we may not have one.
 * 
 * @private
 */
ZmBaseController.prototype._doCreate =
function(list, args) {
	list.create(args);
};

// Miscellaneous


/**
 * Add listener to tag menu
 * 
 * @private
 */
ZmBaseController.prototype._setupTagMenu =
function(parent) {
	if (!parent) return;
	var tagMenu = parent.getTagMenu();
	if (tagMenu) {
		tagMenu.addSelectionListener(this._listeners[ZmOperation.TAG]);
	}
	if (parent instanceof ZmButtonToolBar) {
		var tagButton = parent.getOp(ZmOperation.TAG_MENU);
		if (tagButton) {
			tagButton.addDropDownSelectionListener(this._listeners[ZmOperation.TAG_MENU]);
		}
	}
};

/**
 * setup the move menu
 *
 * @private
 */
ZmBaseController.prototype._setupMoveMenu =
function(parent) {
	if (!parent) {
		return;
	}
	if (!parent instanceof ZmButtonToolBar) {
		return;
	}
	var moveButton = parent.getOp(ZmOperation.MOVE_MENU);
	if (moveButton) {
		moveButton.addDropDownSelectionListener(this._listeners[ZmOperation.MOVE_MENU]);
	}
};


/**
 * Dynamically build the tag menu based on selected items and their tags.
 * 
 * @private
 */
ZmBaseController.prototype._setTagMenu =
function(parent) {

	if (!parent) { return; }

	var tagOp = parent.getOp(ZmOperation.TAG_MENU);
	if (tagOp) {
		var tagMenu = parent.getTagMenu();
		if (!tagMenu) { return; }

		// dynamically build tag menu add/remove lists
		var items = this.getItems();
		items = AjxUtil.toArray(items);

		var account = (appCtxt.multiAccounts && items.length == 1) ? items[0].getAccount() : null;

		// fetch tag tree from appctxt (not cache) for multi-account case
		tagMenu.set(items, appCtxt.getTagTree(account));
		if (parent instanceof ZmActionMenu) {
			tagOp.setText(this._getTagMenuMsg(items.length));
		}
		else {
			tagMenu.parent.popup();

			// bug #17584 - we currently don't support creating new tags in new window
			if (appCtxt.isChildWindow) {
				var mi = tagMenu.getMenuItem(ZmTagMenu.MENU_ITEM_ADD_ID);
				if (mi) {
					mi.setVisible(false);
				}
			}
		}
	}
};


/**
 * copied some from ZmCalendarApp.createMiniCalButton
 * initializes the move button with {@link DwtFolderChooser} as the menu.
 *
 * @param	{DwtButton}	the button
 */
ZmBaseController.prototype._setMoveButton =
function(moveButton) {

	AjxDispatcher.require("Extras");

	// create menu for button
	var moveMenu = new DwtMenu({parent: moveButton, style:DwtMenu.CALENDAR_PICKER_STYLE});
	moveMenu.getHtmlElement().style.width = "auto"; //make it dynamic  (so expanding long named sub-folders would expand width. (plus right now it sets it to 0 due to some styles)
	moveButton.setMenu(moveMenu, true);

	var chooser = this._folderChooser = new DwtFolderChooser({parent:moveMenu});
	var moveParams = this._getMoveParams(chooser);
	moveParams.overviewId += this._currentView; //so it works when switching views (cuz the tree has a listener and the tree is shared unless it's different ID). maybe there's a different way to solve this.
	chooser.setupFolderChooser(moveParams, this._moveMenuCallback.bind(this, moveButton));
	chooser.setSkipNotifyOnPage(true);

	return moveButton;
};

/**
 * Resets the available options on a toolbar or action menu.
 * 
 * @private
 */
ZmBaseController.prototype._resetOperations =
function(parent, num) {

	if (!parent) { return; }

	if (num == 0) {
		parent.enableAll(false);
		parent.enable(ZmOperation.NEW_MENU, true);
	} else if (num == 1) {
		parent.enableAll(true);
	} else if (num > 1) {
		// enable only the tag and delete operations
		parent.enableAll(false);
		parent.enable([ZmOperation.NEW_MENU, ZmOperation.TAG_MENU, ZmOperation.DELETE, ZmOperation.MOVE, ZmOperation.MOVE_MENU, ZmOperation.FORWARD, ZmOperation.ACTIONS_MENU], true);
    }

	// bug: 41758 - don't allow shared items to be tagged
	var folder = (num > 0) && this._getSearchFolder();
	if (folder && folder.isRemote()) {
		parent.enable(ZmOperation.TAG_MENU, false);
	};

    this._resetQuickCommandOperations(parent);
};

/**
 * Resets the available options on the toolbar.
 * 
 * @private
 */
ZmBaseController.prototype._resetToolbarOperations =
function() {
	this._resetOperations(this._toolbar[this._currentView], this.getItemCount());
};


/**
 * @private
 */
ZmBaseController.prototype._getDefaultFocusItem =
function() {
	return this.getCurrentView();
};

/**
 * Sets a callback that shows a summary of what was done. The first three arguments are
 * provided for overriding classes that want to apply an action to an extended list of
 * items (retrieved via successive search, for example).
 *
 * @param {function}	actionMethod		the controller action method
 * @param {Array}		args				an arg list for above (except for items arg)
 * @param {Hash}		params				the params that will be passed to list action method
 * @param {closure}		allDoneCallback		the callback to run after all items processed
 * 
 * @private
 */
ZmBaseController.prototype._setupContinuation =
function(actionMethod, args, params, allDoneCallback) {
	params.finalCallback = this._continueAction.bind(this, {allDoneCallback:allDoneCallback});
};

/**
 * Runs the "all done" callback and shows a summary of what was done.
 *
 * @param {Hash}		params				a hash of parameters
 * @param {closure}	 	allDoneCallback		the callback to run when we're all done
 * 
 * @private
 */
ZmBaseController.prototype._continueAction =
function(params) {

	if (params.allDoneCallback) {
		params.allDoneCallback();
	}
	ZmBaseController.showSummary(params.actionSummary, params.actionLogItem, params.closeChildWin);
};

ZmBaseController.prototype._quickCommandMenuHandler = function(evt, batchCmd) {
    var selectedItems = this.getItems();
    if (!selectedItems || !selectedItems.length) {return;}

    var menuItem = evt.dwtObj;
    var quickCommand = menuItem.getData(Dwt.KEY_OBJECT);
    if (!quickCommand) {return;}

    var actions = quickCommand.actions;
    var len = actions.length;
    for (var i = 0; i < len; i++) {
        var action = actions[i];
        if (!action.isActive) {continue;}
        var actionValue = action.value;
        if (action.type == ZmQuickCommandAction[ZmQuickCommandAction.A_NAME_TAG]) {
            if (actionValue) {
                var tag = appCtxt.getById(actionValue);
                if (tag) {
                    this._doTag(selectedItems, tag, true);
                }
            }
        } else if (action.type == ZmQuickCommandAction[ZmQuickCommandAction.A_NAME_FLAG]) {
            if (actionValue == "flagged" || actionValue == "unflagged") {
                this._applyAction(selectedItems, "_doFlag", [actionValue == "flagged"]);
            }

        } else if (action.type == ZmQuickCommandAction[ZmQuickCommandAction.A_NAME_FOLDER]) {
            if (actionValue) {
                var folder = appCtxt.getById(actionValue);
                if (folder) {
                    this._doMove(selectedItems, folder);
                }
            }
        }
    }
};

ZmBaseController.prototype._refreshQuickCommands = function(evt) {
    if (!this._app) {return;}

    var quickCommandType = ZmApp.QUICK_COMMAND_TYPE[this._app._name];
    if (!quickCommandType) {return;}
    
    var quickCommand;
    var quickCommandMenuItem = evt.dwtObj;
    var quickCommands = ZmQuickCommands.getInstance().getQuickCommandsByItemType(quickCommandType, false);
    var quickCommandSubMenu = quickCommandMenuItem.getMenu(true);
    var existingMenuItems = quickCommandSubMenu.getMenuItems();
    existingMenuItems = AjxUtil.hashCopy(existingMenuItems);

    if (quickCommands) {
        for (var i = 0; i < quickCommands.length; i++) {
            quickCommand = quickCommands[i];

            if (quickCommand.isActive) {
                var mi = existingMenuItems[quickCommand.id];
                if (!mi) {
                    mi = quickCommandSubMenu.createMenuItem(quickCommand.id, {text:quickCommand.name, id: Dwt.getNextId("quickCommand_")});
                    mi.setData(Dwt.KEY_OBJECT, quickCommand);
                    mi.addSelectionListener(this._quickCommandMenuHandlerClosure);
                } else {
                    //refresh the object reference and the text.
                    mi.setText(quickCommand.name);
                    mi.setData(Dwt.KEY_OBJECT, quickCommand);
                    delete existingMenuItems[quickCommand.id];
                }
            }
        }
    }

    for (var quickCommandId in existingMenuItems) {
        quickCommandSubMenu.removeMenuItemById(quickCommandId);
    }
};

ZmBaseController.prototype._resetQuickCommandOperations = function(parent) {
    if (!this._app) {return;}

    var quickCommandType = ZmApp.QUICK_COMMAND_TYPE[this._app._name];
    if (quickCommandType) {
        var quickCommandMenuItem = parent.getOp(ZmOperation.QUICK_COMMANDS);
        if (quickCommandMenuItem) {
            var quickCommands = ZmQuickCommands.getInstance().getQuickCommandsByItemType(quickCommandType, false);
			if (quickCommands) {
				var quickCommandSubMenu = quickCommandMenuItem.getMenu(true);
				if (!quickCommandSubMenu) {
					//add listener and quickCommandSubMenu one time only
					quickCommandMenuItem.addListener(DwtEvent.ONMOUSEOVER, this._refreshQuickCommandsClosure);
					quickCommandSubMenu = new ZmActionMenu({parent:parent, menuItems:ZmOperation.NONE, id: Dwt.getNextId("quickCommandSubMenu_")});
					quickCommandMenuItem.setMenu(quickCommandSubMenu);
				}
			}
			parent._hasQuickCommands = (quickCommands && quickCommands.length);
			parent.enable(ZmOperation.QUICK_COMMANDS, parent._hasQuickCommands);
        }
    }
};
