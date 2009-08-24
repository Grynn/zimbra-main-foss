/*
 * ***** BEGIN LICENSE BLOCK *****
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
 * ***** END LICENSE BLOCK *****
 */


/**
 * Alert class that hilites and flashes an account's accordian item.
 *
 * @param app ZmApp
 */
ZmAccountAlert = function(account) {
	ZmAlert.call(this);
	this.account = account;
	this._alertApps = {};
	appCtxt.accountList.addActiveAcountListener(new AjxListener(this, this._accountListener));
};

ZmAccountAlert.prototype = new ZmAlert;
ZmAccountAlert.prototype.constructor = ZmAccountAlert;

ZmAccountAlert.prototype.toString =
function() {
	return "ZmAccountAlert";
};

ZmAccountAlert.get =
function(account) {
	ZmAccountAlert.INSTANCES = ZmAccountAlert.INSTANCES || {};
	if (!ZmAccountAlert.INSTANCES[account.id]) {
		ZmAccountAlert.INSTANCES[account.id] = new ZmAccountAlert(account);
	}
	return ZmAccountAlert.INSTANCES[account.id];
};

ZmAccountAlert.prototype.start =
function(app) {
	if (this.account != appCtxt.getActiveAccount()) {
		this._started = true;
		if (app) {
			this._alertApps[app.getName()] = app;
		}
	}
};

ZmAccountAlert.prototype.stop =
function() {
	this._started = false;
};

ZmAccountAlert.prototype._accountListener =
function(evt) {
	if (evt.account == this.account) {
		this.stop();
		for (var appName in this._alertApps) {
			this._alertApps[appName].startAlert();
		}
		this._alertApps = {};
	}
};
