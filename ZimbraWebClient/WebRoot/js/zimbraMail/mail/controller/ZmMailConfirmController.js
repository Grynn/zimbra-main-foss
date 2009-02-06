/*
 * ***** BEGIN LICENSE BLOCK *****
 *
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2008 Zimbra, Inc.
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

/**
 * Creates a new controller to show mail send confirmation.
 * @class ZmMailConfirmController
 * @constructor
 *
 * @param container		the containing element
 * @param mailApp		a handle to the mail application
 */
ZmMailConfirmController = function(container, mailApp, sessionId) {

	ZmController.call(this, container, mailApp);
	this.sessionId = sessionId;
	this.viewId = [ZmId.VIEW_MAIL_CONFIRM, this.sessionId].join("");
};

ZmMailConfirmController.prototype = new ZmController();
ZmMailConfirmController.prototype.constructor = ZmMailConfirmController;

ZmMailConfirmController.prototype.toString =
function() {
	return "ZmMailConfirmController";
};

/**
 * Shows confimation that the message was sent.
 *
 * @param msg			[ZmMailMsg]*	the message that was sent
 */
ZmMailConfirmController.prototype.showConfirmation =
function(msg, tabId) {
	this._tabId = tabId;

	if (!this._view) {
		this._initView();
	}

    this._initializeToolBar();
	this.resetToolbarOperations(this._toolbar);
	this._view.showConfirmation(msg);
	appCtxt.getAppViewMgr().pushView(this.viewId, false, true);
};

ZmMailConfirmController.prototype.resetToolbarOperations =
function() {
	this._toolbar.enableAll(true);
};

ZmMailConfirmController.prototype.getKeyMapName =
function() {
	return "Global";
};

ZmMailConfirmController.prototype.handleKeyAction =
function(actionCode) {
	switch (actionCode) {
		case ZmKeyMap.CANCEL:
			this._closeListener();
			break;

		default:
			return ZmController.prototype.handleKeyAction.call(this, actionCode);
			break;
	}
	return true;
};

ZmMailConfirmController.prototype._initView =
function() {
	this._view = new ZmMailConfirmView(this._container, this);
	this._view.addNewContactsListener(new AjxListener(this, this._addNewContactsListener));

	var tg = this._createTabGroup();
	var rootTg = appCtxt.getRootTabGroup();
	tg.newParent(rootTg);
	tg.addMember(this._view.getTabGroupMember());

	var elements = {};
	this._initializeToolBar();
	elements[ZmAppViewMgr.C_TOOLBAR_TOP] = this._toolbar;
	elements[ZmAppViewMgr.C_APP_CONTENT] = this._view;
	var callbacks = {};
	callbacks[ZmAppViewMgr.CB_PRE_HIDE] = new AjxCallback(this, this._preHideCallback);
	callbacks[ZmAppViewMgr.CB_POST_SHOW] = new AjxCallback(this, this._postShowCallback);
    this._app.createView({viewId:this.viewId, elements:elements, callbacks:callbacks, isTransient:true, tabParams: { id: this._tabId }});
};

ZmMailConfirmController.prototype._initializeToolBar =
function() {
	if (this._toolbar) return;

	var buttons = [ZmOperation.CLOSE];

	var className = appCtxt.isChildWindow ? "ZmAppToolBar_cw" : "ZmAppToolBar";
	this._toolbar = new ZmButtonToolBar({parent:this._container, buttons:buttons, className:className+" ImgSkin_Toolbar",
										 context:ZmId.VIEW_MAIL_CONFIRM});
	this._toolbar.addSelectionListener(ZmOperation.CLOSE, new AjxListener(this, this._closeListener));
};

ZmMailConfirmController.prototype._getDefaultFocusItem =
function() {
	return this._view.getDefaultFocusItem();
};

ZmMailConfirmController.prototype._closeListener =
function() {
	this._doClose();
};

ZmMailConfirmController.prototype._addNewContactsListener =
function(attrs) {
	if (!attrs.length) {
		appCtxt.getAppViewMgr().popView(true);
		return;
	}
	
	var batchCommand = new ZmBatchCommand(false, null, true);
	for (var i = 0, count = attrs.length; i < count; i++) {
		var contact = new ZmContact();
		batchCommand.add(new AjxCallback(contact, contact.create, [attrs[i]]));
	}
	batchCommand.run(new AjxCallback(this, this._handleResponseCreateContacts));
};

ZmMailConfirmController.prototype._handleResponseCreateContacts =
function() {
	this._doClose();
};

ZmMailConfirmController.prototype._doClose =
function() {
	appCtxt.getAppViewMgr().popView(true); // Pop mail confirm.
	appCtxt.getAppViewMgr().popView(true); // Pop compose.
};
