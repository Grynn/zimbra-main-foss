/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2008, 2009 Zimbra, Inc.
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

ZmImportExportController = function() {
	ZmController.call(this, null);
};
ZmImportExportController.prototype = new ZmController;
ZmImportExportController.prototype.constructor = ZmImportExportController;

ZmImportExportController.prototype.toString = function() {
	return "ZmImportExportController";
};

//
// Constants
//

ZmImportExportController.IMPORT_TIMEOUT = 300;

ZmImportExportController.TYPE_CSV = "csv";
ZmImportExportController.TYPE_ICS = "ics";
ZmImportExportController.TYPE_TGZ = "tgz";

ZmImportExportController.TYPE_DEFAULT = ZmImportExportController.TYPE_TGZ;

ZmImportExportController.SUBTYPE_GMAIL_CSV = "gmail-csv";
ZmImportExportController.SUBTYPE_OUTLOOK_CSV = "outlook-unknown-csv";
ZmImportExportController.SUBTYPE_OUTLOOK_2000_CSV = "outlook-2000-csv";
ZmImportExportController.SUBTYPE_OUTLOOK_2003_CSV = "outlook-2003-csv";
ZmImportExportController.SUBTYPE_THUNDERBIRD_CSV = "thunderbird-csv";
ZmImportExportController.SUBTYPE_YAHOO_CSV = "yahoo-csv";
ZmImportExportController.SUBTYPE_ZIMBRA_CSV = "zimbra-csv";
ZmImportExportController.SUBTYPE_ZIMBRA_ICS = "zimbra-ics"; // for completeness
ZmImportExportController.SUBTYPE_ZIMBRA_TGZ = "zimbra-tgz"; // for completeness

ZmImportExportController.SUBTYPES_TGZ = [
	ZmImportExportController.SUBTYPE_ZIMBRA_TGZ
];
ZmImportExportController.SUBTYPES_ICS = [
	ZmImportExportController.SUBTYPE_ZIMBRA_ICS
];
ZmImportExportController.SUBTYPES_CSV = [
	ZmImportExportController.SUBTYPE_ZIMBRA_CSV,
	ZmImportExportController.SUBTYPE_YAHOO_CSV,
	ZmImportExportController.SUBTYPE_GMAIL_CSV,
	ZmImportExportController.SUBTYPE_OUTLOOK_CSV,
	ZmImportExportController.SUBTYPE_OUTLOOK_2000_CSV,
	ZmImportExportController.SUBTYPE_OUTLOOK_2003_CSV,
	ZmImportExportController.SUBTYPE_THUNDERBIRD_CSV
];

ZmImportExportController.SUBTYPE_DEFAULT_TGZ = ZmImportExportController.SUBTYPE_ZIMBRA_TGZ;
ZmImportExportController.SUBTYPE_DEFAULT_CSV = ZmImportExportController.SUBTYPE_ZIMBRA_CSV;
ZmImportExportController.SUBTYPE_DEFAULT_ICS = ZmImportExportController.SUBTYPE_ZIMBRA_ICS;

ZmImportExportController.SUBTYPE_DEFAULT = {};
ZmImportExportController.SUBTYPE_DEFAULT[ZmImportExportController.TYPE_TGZ] = ZmImportExportController.SUBTYPE_ZIMBRA_TGZ;
ZmImportExportController.SUBTYPE_DEFAULT[ZmImportExportController.TYPE_CSV] = ZmImportExportController.SUBTYPE_ZIMBRA_CSV;
ZmImportExportController.SUBTYPE_DEFAULT[ZmImportExportController.TYPE_ICS] = ZmImportExportController.SUBTYPE_ZIMBRA_ICS;

//
// Public methods
//

/**
 * Imports user data as specified in the <code>params</code> object.
 * @param params		[object]	Parameters:
 *        form			[Element]	Form containing file input field.
 *        folderId		[string]	Folder id for import. If not specified,
 * 									assumes import to root folder.
 *        type			[string]*	Type. Defaults to <code>TYPE_TGZ</code>.
 *        subType		[string]*	Sub-type. Defaults to <code>SUBTYPE_DEFAULT[type]</code>.
 *        resolve		[string]*	Resolve duplicates: "ignore", "replace", "reset".
 * 									Defaults to <code>"ignore"</code>.
 *        views			[string]*	Comma-separated list of views.
 *        callback		[AjxCallback]*	Callback for success.
 *        errorCallback	[AjxCallback]*	Callback for errors.
 */
ZmImportExportController.prototype.importData = function(params) {
	// error checking
	params = params || {};
	var folderId = params.folderId || -1;
	if (folderId == -1) {
		var params = {
			msg:	ZmMsg.importErrorMissingFolder,
			level:	ZmStatusView.LEVEL_CRITICAL
		};
		appCtxt.setStatusMsg(params);
		return false;
	}

	var type = params.type;
	var isZimbra = type == ZmImportExportController.TYPE_TGZ;
	var folder = appCtxt.getById(folderId);
	if (!isZimbra && folder && folder.nId == ZmOrganizer.ID_ROOT) {
		var params = {
			msg:	ZmMsg.importErrorRootNotAllowed,
			level:	ZmStatusView.LEVEL_CRITICAL
		};
		appCtxt.setStatusMsg(params);
		return false;
	}

	if (params.form && !params.form.elements["file"].value) {
		var params = {
			msg:	ZmMsg.importErrorMissingFile,
			level:	ZmStatusView.LEVEL_CRITICAL
		};
		appCtxt.setStatusMsg(params);
		return false;
	}

	if (params.resolve == "reset") {
		var dialog = appCtxt.getOkCancelMsgDialog();
		dialog.registerCallback(DwtDialog.OK_BUTTON, this._confirmImportReset, this, [params]);
		dialog.registerCallback(DwtDialog.CANCEL_BUTTON, this._cancelImportReset, this);
		var msg = ZmMsg.importResetWarning;
		var style = DwtMessageDialog.WARNING_STYLE;
		dialog.setMessage(msg, style);
		dialog.popup();
		return false;
	}

	// import
	return this._doImportData(params);
};

/**
 * Exports user data as specified in the <code>params</code> object.
 *
 * @param params		[object]	Parameters:
 *        folderId		[string]	Folder id for export. If not specified,
 * 									assumes all folders want to be exported.
 *        type			[string]*	Type. Defaults to <code>TYPE_TGZ</code>.
 *        subType		[string]*	Sub-type. Defaults to <code>SUBTYPE_DEFAULT[type]</code>.
 *        views			[string]*	Comma-separated list of views.
 *        filename		[string]*	Filename for exported file.
 *        searchFilter	[string]*	Search filter.
 *        skipMeta      [boolean]*  True to skip export of meta-data.
 *        callback		[AjxCallback]*	Callback for success.
 *        errorCallback	[AjxCallback]*	Callback for errors.
 */
ZmImportExportController.prototype.exportData = function(params) {
	// error checking
	params = params || {};
	var folderId = params.folderId || -1;
	if (folderId == -1) {
		var params = {
			msg:	ZmMsg.exportErrorMissingFolder,
			level:	ZmStatusView.LEVEL_CRITICAL
		};
		appCtxt.setStatusMsg(params);
		return false;
	}

	var type = params.type;
	var isZimbra = type == ZmImportExportController.TYPE_TGZ;
	var folder = appCtxt.getById(folderId);
	if (!isZimbra && folder && folder.nId == ZmOrganizer.ID_ROOT) {
		var params = {
			msg:	ZmMsg.exportErrorRootNotAllowed,
			level:	ZmStatusView.LEVEL_CRITICAL
		};
		appCtxt.setStatusMsg(params);
		return false;
	}

	// export
	return this._doExportData(params);
};

//
// Protected methods
//

ZmImportExportController.prototype._doImportData = function(params) {
	var type = params.type || ZmImportExportController.TYPE_DEFAULT;
	var isContacts = type == ZmImportExportController.TYPE_CSV;
	var isCalendar = type == ZmImportExportController.TYPE_ICS;
	if (params.folderId != -1) {
		if (isContacts || isCalendar) {
			var folder = appCtxt.getById(params.folderId);
			return this._doImportUpload(params, type, folder);
		}
	}
	else {
		if (type == ZmImportExportController.TYPE_CSV) {
			return this._doImportSelectFolder(params, ZmImportExportController.TYPE_CSV);
		}
		if (type == ZmImportExportController.TYPE_ICS) {
			return this._doImportSelectFolder(params, ZmImportExportController.TYPE_ICS);
		}
	}
	return this._doImportTGZ(params);
};

ZmImportExportController.prototype._doImportSelectFolder = function(params, type) {
	var dialog = appCtxt.getChooseFolderDialog();
	dialog.reset();
	dialog.setTitle(ZmMsg._import);
	dialog.registerCallback(DwtDialog.OK_BUTTON, this._doImportUpload, this, [params, type]);

	var overviewId = [this.toString(), type].join("-");
	var omit = {};
	omit[ZmFolder.ID_TRASH] = true;
	if (type == ZmImportExportController.TYPE_CSV) {
		AjxDispatcher.require(["ContactsCore", "Contacts"]);
		var noNew = !appCtxt.get(ZmSetting.NEW_ADDR_BOOK_ENABLED);
		dialog.popup({
			treeIds: [ZmOrganizer.ADDRBOOK],
			title: ZmMsg.chooseAddrBook,
			overviewId: overviewId,
			description: ZmMsg.chooseAddrBookToImport,
			skipReadOnly: true,
			hideNewButton: noNew,
			omit:omit
		});
		return;
	}

	if (type == ZmImportExportController.TYPE_ICS) {
		AjxDispatcher.require(["CalendarCore", "Calendar"]);
		dialog.popup({
			treeIds: [ZmOrganizer.CALENDAR],
			title: ZmMsg.chooseCalendar,
			overviewId: overviewId,
			description: ZmMsg.chooseCalendarToImport,
			skipReadOnly: true,
			omit:omit
		});
		return;
	}
};

ZmImportExportController.prototype._doImportUpload = function(params, type, folder) {
	if (folder && folder.nId != ZmOrganizer.ID_ROOT) {
		var dialog = appCtxt.getChooseFolderDialog();
		dialog.popdown();

		params.folderId = folder.id;

		var form = params.form;
		form.action = appCtxt.get(ZmSetting.CSFE_UPLOAD_URI);
		form.method = "POST";
		form.enctype = "multipart/form-data";

		var callback = new AjxCallback(this, this._doImportUploadDone, [params, type]);
		var um = appCtxt.getUploadManager();
		window._uploadManager = um;
		try {
			um.execute(callback, params.form);
			return true;
		}
		catch (ex) {
			appCtxt.setStatusMsg({
				msg:	ex.msg || ZmMsg.importErrorUpload,
				level:	ZmStatusView.LEVEL_CRITICAL
			});
			return false;
		}
	}
	return false;
};

ZmImportExportController.prototype._doImportUploadDone =
function(params, type, status, aid) {
	if (status == 200) {
		if (type == ZmImportExportController.TYPE_CSV) {
			this._doImportCSV(params, aid);
			return;
		}
		if (type == ZmImportExportController.TYPE_ICS) {
			this._doImportICS(params, aid);
			return;
		}
	}
	else {
		var msg = (status == AjxPost.SC_NO_CONTENT)
			? ZmMsg.errorImportNoContent
			: (AjxMessageFormat.format(ZmMsg.errorImportStatus, status));
		appCtxt.setStatusMsg(msg, ZmStatusView.LEVEL_CRITICAL);
	}
};

ZmImportExportController.prototype._doImportCSV = function(params, aid) {
	var soapDoc = AjxSoapDoc.create("ImportContactsRequest", "urn:zimbraMail");
	var method = soapDoc.getMethod();
	method.setAttribute("ct", params.type);
	if (params.subType) {
		method.setAttribute(params.type+"fmt", params.subType);
	}
	method.setAttribute("l", params.folderId);
	var content = soapDoc.set("content", "");
	content.setAttribute("aid", aid);

	this._doImportRequest(soapDoc, params, ZmImportExportController.TYPE_CSV);
};

ZmImportExportController.prototype._doImportICS = function(params, aid) {
	var soapDoc = AjxSoapDoc.create("ImportAppointmentsRequest", "urn:zimbraMail");
	var method = soapDoc.getMethod();
	method.setAttribute("ct", "ics");
	method.setAttribute("l", params.folderId);
	var content = soapDoc.set("content", "");
	content.setAttribute("aid", aid);

	this._doImportRequest(soapDoc, params, ZmImportExportController.TYPE_ICS);
};

ZmImportExportController.prototype._doImportRequest = function(soapDoc, params, type) {
	var respCallback = new AjxCallback(this, this._importSuccess, [params.callback]);
	var errorCallback = new AjxCallback(this, this._importError, [params.errorCallback]);
	appCtxt.getAppController().sendRequest({
		soapDoc: soapDoc,
		asyncMode: true,
		callback: respCallback,
		errorCallback: errorCallback,
		timeout: ZmImportExportController.IMPORT_TIMEOUT
	});
};

ZmImportExportController.prototype._doImportTGZ = function(params) {
	var folder = params.folderId && appCtxt.getById(params.folderId);
	if (folder && folder.nId == ZmOrganizer.ID_ROOT) folder = null;
	var path = folder ? folder.getPath(null, null, null, null, true) : "";

	var url = [
		"/home/",
		encodeURIComponent(appCtxt.get(ZmSetting.USERNAME)),
		"/",
		path,
		"?",
		"fmt=",encodeURIComponent(params.type),
		params.views ? "&types="+encodeURIComponent(params.views) : "",
		params.resolve ? "&resolve="+encodeURIComponent(params.resolve) : "",
		"&callback=ZmImportExportController__callback"
	].join("");

	// initialize form
	var form = params.form;
	form.action = url;
	form.method = "POST";
	form.enctype = "multipart/form-data";

	// destination iframe
	var onload = AjxCallback.simpleClosure(this._importSuccess, this, params.callback);
	var onerror = AjxCallback.simpleClosure(this._importError, this, params.errorCallback);
	var iframe = ZmImportExportController.__createIframe(form, onload, onerror);

	// import
	form.submit();
	return true;
};

ZmImportExportController.prototype._confirmImportReset = function(params) {
	this._cancelImportReset();
	this._doImportData(params);
};

ZmImportExportController.prototype._cancelImportReset = function() {
	var dialog = appCtxt.getOkCancelMsgDialog();
	dialog.reset();
	dialog.popdown();
};

ZmImportExportController.prototype._doExportData = function(params) {
	var type = params.type || ZmImportExportController.TYPE_DEFAULT;
	var isTGZ = type == ZmImportExportController.TYPE_TGZ;
	var isCSV = type == ZmImportExportController.TYPE_CSV;
	var subType = params.subType || ZmImportExportController.SUBTYPE_DEFAULT[type];

	var folder = params.folderId && appCtxt.getById(params.folderId);
	if (folder && folder.nId == ZmOrganizer.ID_ROOT) folder = null;
	var path = folder ? folder.getPath(null, null, null, null, true) : "";

	// generate request URL
	var url = [
		"/home/",encodeURIComponent(appCtxt.get(ZmSetting.USERNAME)),"/",path
	].join("");

	var formParams = { "fmt" : type };
	if (isCSV) { formParams[type+"fmt"] = subType; }
	if (isTGZ && params.views) { formParams["types"] = params.views; }
	if (isTGZ && params.searchFilter) { formParams["query"] = params.searchFilter; }
	if (params.skipMeta) { formParams["meta"] = "0"; }
	if (params.filename) { formParams["filename"] = params.filename; }
	formParams.emptyname = ZmMsg.exportEmptyName;

	// initialize form
	var form = ZmImportExportController.__createForm(url, formParams);

	// destination form
	var onload = AjxCallback.simpleClosure(this._exportSuccess, this, params.callback);
	var onerror = AjxCallback.simpleClosure(this._exportError, this, params.errorCallback);
	var iframe = ZmImportExportController.__createIframe(form, onload, onerror);

	// export
	form.submit();
};

ZmImportExportController__callback = function(message) {
	var msg = message ? ZmMsg.importFailed : ZmMsg.importSuccess;
	var level = message ? DwtMessageDialog.CRITICAL_STYLE : DwtMessageDialog.INFO_STYLE; 
	ZmImportExportController.__showMessage(msg, level);
};

ZmImportExportController.prototype._importSuccess = function(callback) {
	if (callback) {
		callback.run(true);
	}
	ZmImportExportController.__showMessage(ZmMsg.importSuccess, DwtMessageDialog.INFO_STYLE);
	return true;
};

ZmImportExportController.prototype._importError = function(errorCallback) {
	if (errorCallback) {
		errorCallback.run(false);
	}
	ZmImportExportController.__showMessage(ZmMsg.importFailed, DwtMessageDialog.CRITICAL_STYLE);
	return true;
};

ZmImportExportController.prototype._exportSuccess = function(callback) {
	if (callback) {
		callback.run(true);
	}
	ZmImportExportController.__showMessage(ZmMsg.exportSuccess, DwtMessageDialog.INFO_STYLE);
	return true;
};

ZmImportExportController.prototype._exportError = function(errorCallback) {
	if (errorCallback) {
		errorCallback.run(false);
	}
	ZmImportExportController.__showMessage(ZmMsg.exportFailed, DwtMessageDialog.CRITICAL_STYLE);
	return true;
};

//
// Private methods
//

ZmImportExportController.__showMessage = function(msg, level) {
	var dialog = appCtxt.getErrorDialog();
	dialog.setMessage(msg, null, level);
	dialog.popup(null, true);
};

ZmImportExportController.__createForm = function(action, params, method) {
	var form = document.createElement("FORM");
	form.action = action;
	form.method = method || "GET";
	for (var name in params) {
		var value = params[name];
		if (!value) continue;
		var input = document.createElement("INPUT");
		input.type = "hidden";
		input.name = name;
		input.value = value;
		form.appendChild(input);
	}
	form.style.display = "none";
	document.body.appendChild(form);
	return form;
};

ZmImportExportController.__createIframe = function(form, onload, onerror) {
	var id = Dwt.getNextId() + "_iframe";
	var iframe;
	if (AjxEnv.isIE) {
		// NOTE: This has to be done because IE doesn't recognize the name
		//       attribute if set programmatically. And without that, the
		//       form target will cause it to return in a new window which
		//       breaks the callback.
		var html = [ "<IFRAME id='",id,"' name='",id,"'>" ].join("");
		iframe = document.createElement(html);
	}
	else {
		iframe = document.createElement("IFRAME");
		iframe.name = iframe.id = id;
	}
	// NOTE: Event handlers won't be called when iframe hidden.
//	iframe.style.display = "none";
	iframe.style.position = "absolute";
	iframe.style.width = 1;
	iframe.style.height = 1;
	iframe.style.top = 10;
	iframe.style.left = -10;
	document.body.appendChild(iframe);
	form.target = iframe.name;

	iframe.onload = onload;
	iframe.onerror = onerror;

	return iframe;
};
