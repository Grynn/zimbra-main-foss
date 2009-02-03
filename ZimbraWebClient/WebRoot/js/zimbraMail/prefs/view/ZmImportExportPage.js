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

ZmImportExportPage = function(parent, section, controller) {
	ZmPreferencesPage.apply(this, arguments);
};

ZmImportExportPage.prototype = new ZmPreferencesPage;
ZmImportExportPage.prototype.constructor = ZmImportExportPage;

ZmImportExportPage.prototype.toString =
function () {
    return "ZmImportExportPage";
};

//
// ZmPreferencesPage methods
//

ZmImportExportPage.prototype.reset = function(useDefaults) {
	ZmPreferencesPage.prototype.reset.apply(this, arguments);
	var button = this.getFormObject("IMPORT_BUTTON");
	if (button) {
		button.setEnabled(true);
	}
};

//
// Protected methods
//

ZmImportExportPage.prototype._setupCustom = function(id, setup, value) {
	if (id == "EXPORT_FOLDER") {
		var view = new ZmExportView({parent:this});
		this.setFormObject(id, view);
		return view;
	}
	if (id == "EXPORT_BUTTON") {
		var button = new DwtButton({parent:this});
		button.setText(setup.displayName);
		button.addSelectionListener(new AjxListener(this, this._handleExportButton));
		this.setFormObject(id, button);
		return button;
	}
	if (id == "IMPORT_FOLDER") {
		var view = new ZmImportView({parent:this});
		this.setFormObject(id, view);
		return view;
	}
	if (id == "IMPORT_BUTTON") {
		var button = new DwtButton({parent:this});
		button.setText(setup.displayName);
		button.addSelectionListener(new AjxListener(this, this._handleImportButton));
		this.setFormObject(id, button);
		return button;
	}
	return ZmPreferencesPage.prototype._setupCustom.apply(this, arguments);
};

// handlers

ZmImportExportPage.prototype._handleImportButton = function() {
	var button = this.getFormObject("IMPORT_BUTTON");
	if (button) {
		button.setEnabled(false);
	}
	var params = {
		msg:	ZmMsg.importStarted,
		level:	ZmStatusView.LEVEL_INFO
	};
	appCtxt.setStatusMsg(params);

	// get import params
	var importView = this.getFormObject("IMPORT_FOLDER");
	var params = importView.getParams();
	params.callback = params.errorCallback = new AjxCallback(this, this._handleImportComplete);

	// import
	var controller = appCtxt.getImportExportController();
	controller.importData(params);
};

ZmImportExportPage.prototype._handleExportButton = function() {
	// get export params
	var exportView = this.getFormObject("EXPORT_FOLDER");
	var params = exportView.getParams();

	// export
	var controller = appCtxt.getImportExportController();
	controller.exportData(params);
};

ZmImportExportPage.prototype._handleImportComplete = function() {
	var button = this.getFormObject("IMPORT_BUTTON");
	if (button) {
		button.setEnabled(true);
	}
};