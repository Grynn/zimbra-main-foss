/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2005, 2006, 2007 Zimbra, Inc.
 * 
 * The contents of this file are subject to the Yahoo! Public License
 * Version 1.0 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * 
 * ***** END LICENSE BLOCK *****
 */

ZmCalendarTreeController = function() {

	ZmTreeController.call(this, ZmOrganizer.CALENDAR);

	this._listeners[ZmOperation.NEW_CALENDAR] = new AjxListener(this, this._newListener);
	this._listeners[ZmOperation.CHECK_ALL] = new AjxListener(this, this._checkAllListener);
	this._listeners[ZmOperation.CLEAR_ALL] = new AjxListener(this, this._clearAllListener);
    this._listeners[ZmOperation.BROWSE] = new AjxListener(this, this._browseListener);
    this._listeners[ZmOperation.DETACH_WIN] = new AjxListener(this, this._detachListener);
    this._listeners[ZmOperation.FREE_BUSY_LINK] = new AjxListener(this, this._freeBusyLinkListener);
    if (appCtxt.get(ZmSetting.GROUP_CALENDAR_ENABLED)) {
		this._listeners[ZmOperation.SHARE_CALENDAR] = new AjxListener(this, this._shareCalListener);
		this._listeners[ZmOperation.MOUNT_CALENDAR] = new AjxListener(this, this._mountCalListener);
	}

	this._eventMgrs = {};
};

ZmCalendarTreeController.prototype = new ZmTreeController;
ZmCalendarTreeController.prototype.constructor = ZmCalendarTreeController;

ZmCalendarTreeController.prototype.toString = function() {
	return "ZmCalendarTreeController";
};

// Public methods

ZmCalendarTreeController.prototype.getCheckedCalendars =
function(overviewId) {
	var calendars = [];
	var items = this._getItems(overviewId);
	for (var i = 0; i < items.length; i++) {
		var item = items[i];
		if (item._isSeparator) continue;
		if (item.getChecked()) {
			var calendar = item.getData(Dwt.KEY_OBJECT);
			calendars.push(calendar);
		}
	}

	return calendars;
};

ZmCalendarTreeController.prototype.getOwnedCalendars =
function(overviewId, owner) {
	var calendars = [];
	var items = this._getItems(overviewId);
	for (var i = 0; i < items.length; i++) {
		var item = items[i];		
		if (!item || item._isSeparator) continue;
		var calendar = item.getData(Dwt.KEY_OBJECT);
		if(calendar.getOwner() == owner){
			calendars.push(calendar);				
		}
	}

	return calendars;
};

// XXX: 6/1/07 - each app manages own overview now, do we need this?
ZmCalendarTreeController.prototype.addSelectionListener =
function(overviewId, listener) {
	// Each overview gets its own event manager
	if (!this._eventMgrs[overviewId]) {
		this._eventMgrs[overviewId] = new AjxEventMgr;
		// Each event manager has its own selection event to avoid
		// multi-threaded collisions
		this._eventMgrs[overviewId]._selEv = new DwtSelectionEvent(true);
	}
	this._eventMgrs[overviewId].addListener(DwtEvent.SELECTION, listener);
};

ZmCalendarTreeController.prototype.removeSelectionListener =
function(overviewId, listener) {
	if (this._eventMgrs[overviewId]) {
		this._eventMgrs[overviewId].removeListener(DwtEvent.SELECTION, listener);
	}
};

// Protected methods

ZmCalendarTreeController.prototype.resetOperations = 
function(actionMenu, type, id) {
	if (actionMenu) {
		var calendar = appCtxt.getById(id);
		var nId;
		if (calendar) {
			nId = calendar.nId;
			actionMenu.enable(ZmOperation.SHARE_CALENDAR, (!calendar.link || calendar.isAdmin()));
			actionMenu.enable(ZmOperation.SYNC, calendar.isFeed());
		} else {
			nId = ZmOrganizer.normalizeId(id);
		}
		actionMenu.enable(ZmOperation.DELETE, nId != ZmOrganizer.ID_CALENDAR);
		var rootId = ZmOrganizer.getSystemId(ZmOrganizer.ID_ROOT);
		if (id == rootId) {
			var items = this._getItems(this._actionedOverviewId);
			var foundChecked = false;
			var foundUnchecked = false;
			for (var i = 0; i < items.length; i++) {
				var item = items[i];
				if (item._isSeparator) continue;
				item.getChecked() ? foundChecked = true : foundUnchecked = true;
			}
			actionMenu.enable(ZmOperation.CHECK_ALL, foundUnchecked);
			actionMenu.enable(ZmOperation.CLEAR_ALL, foundChecked);
		}
//		this._resetOperation(actionMenu, ZmOperation.EXPORT_FOLDER, ZmMsg.exportCalendar);
//		this._resetOperation(actionMenu, ZmOperation.IMPORT_FOLDER, ZmMsg.importCalendar);
	}
};

ZmCalendarTreeController.prototype._browseListener =
function(ev){
    var folder = this._getActionedOrganizer(ev);
    if (folder) {
        AjxDispatcher.require("Browse");
        appCtxt.getSearchController().showBrowsePickers([ZmPicker.DATE,ZmPicker.TIME]);
    }
};
ZmCalendarTreeController.prototype._detachListener =
function(ev){
    var folder = this._getActionedOrganizer(ev);
    if (folder) {
        var url = folder.getRestUrl();
        if(url){
            var newWin = window.open(url+".html", "_blank");
        }
    }
};
ZmCalendarTreeController.prototype._freeBusyLinkListener =
function(ev){
    var inNewWindow = false;
    var app = appCtxt.getApp(ZmApp.CALENDAR);
    if(app){
        inNewWindow = app._inNewWindow(ev);
    }
    var restUrl = appCtxt.get(ZmSetting.REST_URL);
    if(restUrl){
       restUrl += "?fmt=freebusy";
    }
    var action = ZmOperation.NEW_MESSAGE;
	var msg = new ZmMailMsg();
	var toOverride = null;
	var subjOverride = null;
	var extraBodyText = restUrl;
	AjxDispatcher.run("Compose", {action: action, inNewWindow: inNewWindow, msg: msg,
								  toOverride: toOverride, subjOverride: subjOverride,
								  extraBodyText: extraBodyText});
};

// Returns a list of desired header action menu operations
ZmCalendarTreeController.prototype._getHeaderActionMenuOps =
function() {
	var ops = [ZmOperation.NEW_CALENDAR];
	if (appCtxt.get(ZmSetting.GROUP_CALENDAR_ENABLED) && !appCtxt.isOffline) {
		ops.push(ZmOperation.MOUNT_CALENDAR);
	}
	ops.push(ZmOperation.CHECK_ALL);
	ops.push(ZmOperation.CLEAR_ALL);
    ops.push(ZmOperation.BROWSE);
	if (!appCtxt.isOffline) {
		ops.push(ZmOperation.SEP, ZmOperation.FREE_BUSY_LINK);
	}

	return ops;
};

// Returns a list of desired action menu operations
ZmCalendarTreeController.prototype._getActionMenuOps =
function() {
	var ops = [];
	if (appCtxt.get(ZmSetting.GROUP_CALENDAR_ENABLED) && !appCtxt.isOffline) {
		ops.push(ZmOperation.SHARE_CALENDAR);
	}
	ops.push(ZmOperation.DELETE);
	ops.push(ZmOperation.EDIT_PROPS);
	ops.push(ZmOperation.SYNC);
    ops.push(ZmOperation.DETACH_WIN);
//	if (appCtxt.get(ZmSetting.IMPORT_EXPORT_ENABLED)) {
//		ops.push(ZmOperation.EXPORT_FOLDER, ZmOperation.IMPORT_FOLDER);
//	}

    return ops;
};

ZmCalendarTreeController.prototype._getActionMenu =
function(ev) {
	var organizer = ev.item.getData(Dwt.KEY_OBJECT);
	if (organizer.type != this.type) {
		return null;
	}
	return ZmTreeController.prototype._getActionMenu.apply(this, arguments);
};

ZmCalendarTreeController.prototype.getTreeStyle =
function() {
	return DwtTree.CHECKEDITEM_STYLE;
};

// Method that is run when a tree item is left-clicked
ZmCalendarTreeController.prototype._itemClicked =
function(organizer) {
	if (organizer.type != ZmOrganizer.CALENDAR) {
		var appId = ZmOrganizer.APP[organizer.type];
		var app = appId && appCtxt.getApp(appId);
		if (app) {
			var callback = new AjxCallback(this, this._postActivateApp, [organizer, app]);
			appCtxt.getAppController().activateApp(appId, null, callback);
		}
		else {
			appCtxt.setStatusMsg({
				msg:	AjxMessageFormat.format(ZmMsg.appUnknown, [appId]),
				level:	ZmStatusView.LEVEL_WARNING
			});
		}
	}
};

ZmCalendarTreeController.prototype._postActivateApp =
function(organizer, app) {
	var controller = appCtxt.getOverviewController();
	var overviewId = app.getOverviewId();
	var treeId = organizer.type;
	var treeView = controller.getTreeView(overviewId, treeId);
	if (treeView) {
		treeView.setSelected(organizer);
	}
};

// Handles a drop event
ZmCalendarTreeController.prototype._dropListener =
function(ev) {
	var data = ev.srcData.data;
	var appts = (!(data instanceof Array)) ? [data] : data;
	var dropFolder = ev.targetControl.getData(Dwt.KEY_OBJECT);
	var isShiftKey = (ev.shiftKey || ev.uiEvent.shiftKey);

	if (ev.action == DwtDropEvent.DRAG_ENTER) {
		if (!(appts[0] instanceof ZmAppt)) {
			ev.doIt = false;
		}
		else if (this._dropTgt.isValidTarget(data)) {
			var type = ev.targetControl.getData(ZmTreeView.KEY_TYPE);
			ev.doIt = dropFolder.mayContain(data, type);

			var action;
			// walk thru the array and find out what action is allowed
			for (var i = 0; i < appts.length; i++) {
				if (appts[i] instanceof ZmItem) {
					action |= appts[i].getDefaultDndAction(isShiftKey);
				}
			}

			if (((action & ZmItem.DND_ACTION_COPY) != 0)) {
				var plusDiv = ev.dndProxy.firstChild.nextSibling;
				Dwt.setVisibility(plusDiv, true);
			}
		}
	}
	else if (ev.action == DwtDropEvent.DRAG_DROP) {
		var ctlr = ev.srcData.controller;
		var cc = AjxDispatcher.run("GetCalController");
		if (!isShiftKey && cc.isMovingBetwAccounts(appts, dropFolder.id)) {
			var dlg = appCtxt.getYesNoMsgDialog();
			dlg.registerCallback(DwtDialog.YES_BUTTON, this._changeOrgCallback, this, [ctlr, dlg, appts, dropFolder]);
			var msg = AjxMessageFormat.format(ZmMsg.orgChange, dropFolder.getOwner());
			dlg.setMessage(msg, DwtMessageDialog.WARNING_STYLE);
			dlg.popup();
		} else {
			ctlr._doMove(appts, dropFolder, null, !isShiftKey);
		}
	}
};

ZmCalendarTreeController.prototype._changeOrgCallback =
function(controller, dialog, appts, dropFolder) {
	dialog.popdown();
	controller._doMove(appts, dropFolder, null, true);
};

/*
* Returns a "New Calendar" dialog.
*/
ZmCalendarTreeController.prototype._getNewDialog =
function() {
	return appCtxt.getNewCalendarDialog();
};

// Listener callbacks

ZmCalendarTreeController.prototype._changeListener =
function(ev, treeView, overviewId) {
	ZmTreeController.prototype._changeListener.call(this, ev, treeView, overviewId);

	if (ev.type != this.type) return;
	
	var fields = ev.getDetail("fields") || {};
	if (ev.event == ZmEvent.E_CREATE || ev.event == ZmEvent.E_DELETE || (ev.event == ZmEvent.E_MODIFY && fields[ZmOrganizer.F_FLAGS])) {
		var app = appCtxt.getApp(ZmApp.CALENDAR);
		var controller = app.getCalController();
		controller._updateCheckedCalendars();
		controller._refreshAction(true);
	}
};

ZmCalendarTreeController.prototype._treeViewListener =
function(ev) {
	// handle item(s) clicked
	if (ev.detail == DwtTree.ITEM_CHECKED) { 
		var overviewId = ev.item.getData(ZmTreeView.KEY_ID);
		var calendar = ev.item.getData(Dwt.KEY_OBJECT);

		//checkbox event may not be propagated to close action menu
		if(this._getActionMenu(ev)){
			this._getActionMenu(ev).popdown();
		}
		
		// notify listeners of selection
		if (this._eventMgrs[overviewId]) {
			this._eventMgrs[overviewId].notifyListeners(DwtEvent.SELECTION, ev);
		}
		return;
	}

	// default processing
	ZmTreeController.prototype._treeViewListener.call(this, ev);
};

ZmCalendarTreeController.prototype._checkAllListener =
function(ev) {
	this._setAllChecked(ev, true);
};

ZmCalendarTreeController.prototype._clearAllListener =
function(ev) {
	this._setAllChecked(ev, false);
};

ZmCalendarTreeController.prototype._shareCalListener =
function(ev) {
	this._pendingActionData = this._getActionedOrganizer(ev);
	
	var calendar = this._pendingActionData;
	var share = null;
	
	var sharePropsDialog = appCtxt.getSharePropsDialog();
	sharePropsDialog.popup(ZmSharePropsDialog.NEW, calendar, share);
};

ZmCalendarTreeController.prototype._mountCalListener =
function(ev) {
	var dialog = appCtxt.getMountFolderDialog();
	dialog.popup(ZmOrganizer.CALENDAR/*, ...*/);
};

ZmCalendarTreeController.prototype._deleteListener = function(ev) {
	var organizer = this._getActionedOrganizer(ev);
	var callback = new AjxCallback(this, this._deleteListener2, [ organizer ]);
	var message = AjxMessageFormat.format(ZmMsg.confirmDeleteCalendar, organizer.name);

	var dialog = appCtxt.getConfirmationDialog();
	dialog.popup(message, callback);
};

ZmCalendarTreeController.prototype._deleteListener2 = function(organizer) {
	this._doDelete(organizer);
}

ZmCalendarTreeController.prototype._notifyListeners =
function(overviewId, type, items, detail, srcEv, destEv) {
	if (this._eventMgrs[overviewId] && this._eventMgrs[overviewId].isListenerRegistered(type)) {
		if (srcEv) DwtUiEvent.copy(destEv, srcEv);
		destEv.items = items;
		if (items.length == 1) destEv.item = items[0];
		destEv.detail = detail;
		this._eventMgrs[overviewId].notifyListeners(type, destEv);
	}
};

ZmCalendarTreeController.prototype._getItems =
function(overviewId) {
	var treeView = this.getTreeView(overviewId);
	if (treeView) {
		var rootId = ZmOrganizer.getSystemId(ZmOrganizer.ID_ROOT);
		var root = treeView.getTreeItemById(rootId);
		if (root) {
			var totalItems = [];
			this._getSubItems(root, totalItems);			
			return totalItems;
		}
	}
	return [];
};

ZmCalendarTreeController.prototype._getSubItems =
function(root, totalItems) {
	if(!root) return;
	if(root._isSeparator) return;
	var items = root.getItems();
	for(var i in items){				
		var item = items[i];
		if(item && !item._isSeparator){
			totalItems.push(item);
			this._getSubItems(item, totalItems);
		}
	}	
};

ZmCalendarTreeController.prototype._setAllChecked =
function(ev, checked) {
	var overviewId = this._actionedOverviewId;
	var items = this._getItems(overviewId);
	var checkedItems = [];
	var item, organizer;
	for (var i = 0;  i < items.length; i++) {
		item = items[i];
		if (item._isSeparator) continue;
		organizer = item.getData(Dwt.KEY_OBJECT);
		if (!organizer || organizer.type != ZmOrganizer.CALENDAR) continue;
		item.setChecked(checked);
		checkedItems.push(item);
	}

	// notify listeners of selection
	if (checkedItems.length && this._eventMgrs[overviewId]) {
		this._notifyListeners(overviewId, DwtEvent.SELECTION, checkedItems, DwtTree.ITEM_CHECKED,
							  ev, this._eventMgrs[overviewId]._selEv);
	}
};
