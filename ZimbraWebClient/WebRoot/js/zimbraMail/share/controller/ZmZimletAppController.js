/*
 * ***** BEGIN LICENSE BLOCK *****
 *
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2006, 2007 Zimbra, Inc.
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

ZmZimletAppController = function(name, container, app) {
	if (arguments.length == 0) { return; }
	ZmController.call(this, container, app);
	this._name = name;
};

ZmZimletAppController.prototype = new ZmController;
ZmZimletAppController.prototype.constructor = ZmZimletAppController;

ZmZimletAppController.prototype.toString = function() {
	return "ZmZimletAppController";
};

//
// Public methods
//

ZmZimletAppController.prototype.show = function() {
	this.getView();
	this._app.pushView(this._getViewType());
};

ZmZimletAppController.prototype.getView = function() {
	if (!this._view) {
		// create components
		this._view = new ZmZimletAppView(this._container, this);
		// TODO: expose ability for zimlets to specify a toolbar
//		if (!this._toolbar) {
//			this._createToolBar();
//		}

		// setup app elements
		var elements = {};
//		elements[ZmAppViewMgr.C_TOOLBAR_TOP] = this._toolbar;
		elements[ZmAppViewMgr.C_APP_CONTENT] = this._view;

		// create callbacks
		var callbacks = {};
//		callbacks[ZmAppViewMgr.CB_PRE_HIDE] = new AjxCallback(this, this._preHideCallback);
//		callbacks[ZmAppViewMgr.CB_PRE_UNLOAD] = new AjxCallback(this, this._preUnloadCallback);
//		callbacks[ZmAppViewMgr.CB_POST_SHOW] = new AjxCallback(this, this._postShowCallback);
//		callbacks[ZmAppViewMgr.CB_POST_HIDE] = new AjxCallback(this, this._postHideCallback);

		// create app view
	    this._app.createView({viewId:this._getViewType(), elements:elements, callbacks:callbacks, isAppView:true, isTransient:true});
	}
	return this._view;
};

//
// Protected methods
//

ZmZimletAppController.prototype._getViewType = function() {
	return this._name;
};