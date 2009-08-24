/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2006, 2007, 2008, 2009 Zimbra, Inc.
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
 * Creates a request manager.
 * @constructor
 * @class
 * This class manages the sending of requests to the server, and handles the
 * responses, including refresh blocks and notifications.
 *
 * @author Conrad Damon
 * 
 * @param controller	[ZmController]	main controller
 */
ZmRequestMgr = function(controller) {

	this._controller = controller;
	
	appCtxt.setRequestMgr(this);

	ZmCsfeCommand.setServerUri(appCtxt.get(ZmSetting.CSFE_SERVER_URI));
	var cv = appCtxt.get(ZmSetting.CLIENT_VERSION);
	ZmCsfeCommand.clientVersion = (!cv || cv.indexOf('@') == 0) ? "dev build" : cv;
	
	this._shell = appCtxt.getShell();

    this._highestNotifySeen = 0;

	this._cancelActionId = {};
	this._pendingRequests = {};

	this._useXml = appCtxt.get(ZmSetting.USE_XML);
	this._logRequest = appCtxt.get(ZmSetting.LOG_REQUEST);
	this._stdTimeout = appCtxt.get(ZmSetting.TIMEOUT);

	this._unreadListener = new AjxListener(this, this._unreadChangeListener);
};

// request states
ZmRequestMgr._SENT		= 1;
ZmRequestMgr._RESPONSE	= 2;
ZmRequestMgr._CANCEL	= 3;

// retry settings
ZmRequestMgr.RETRY_MAX			= 2;	// number of times to retry before throwing exception
ZmRequestMgr.RETRY_DELAY		= 5;	// seconds to delay between retries
ZmRequestMgr.RETRY_ON_EXCEPTION = {};	// which exceptions to retry on
ZmRequestMgr.RETRY_ON_EXCEPTION[ZmCsfeException.EMPTY_RESPONSE] = true;

ZmRequestMgr._nextReqId = 1;

ZmRequestMgr.prototype.toString =
function() {
	return "ZmRequestMgr";
};

/**
 * Sends a request to the CSFE and processes the response. Notifications and
 * refresh blocks that come in the response header are handled. Also handles
 * exceptions by default, though the caller can pass in a special callback to
 * run for exceptions. The error callback should return true if it has
 * handled the exception, and false if standard exception handling should still
 * be performed.
 *
 * @param params				[hash]			hash of params:
 *        soapDoc				[AjxSoapDoc]	SOAP document that represents the request
 *        jsonObj				[object]		JSON object that represents the request (alternative to soapDoc)
 *        asyncMode				[boolean]*		if true, request will be made asynchronously
 *        callback				[AjxCallback]*	next callback in chain for async request
 *        errorCallback			[AjxCallback]*	callback to run if there is an exception
 *        continueCallback		[AjxCallback]*	callback to run after user re-auths
 *        timeout				[int]*			timeout value (in seconds)
 *        noBusyOverlay			[boolean]*		if true, don't use the busy overlay
 *        accountName			[string]*		name of account to execute on behalf of
 *        response				[object]*		pre-determined response (no request will be made)
 *        skipAuthCheck			[boolean]*		don't check if auth token has changed
 *        resend				[constant]*		reason for resending request
 *        sensitive				[boolean]*		attempt to use secure conn to protect data
 *        noSession				[boolean]*		if true, no session info is included
 *        restUri				[string]*		REST URI to send the request to
 */
ZmRequestMgr.prototype.sendRequest =
function(params) {

	var response = params.response;
	if (response) {
		if (params.reqId) {
			params = this._pendingRequests[params.reqId] || params;
			params.response = response;
		}
		params.asyncMode = true;	// canned response set up async style
		return this._handleResponseSendRequest(params, new ZmCsfeResult(response));
	}
	
	var reqId = params.reqId = ("Req_"+ZmRequestMgr._nextReqId++);
	var timeout = (params.timeout != null) ? params.timeout : this._stdTimeout;
	if (timeout) {
		timeout = timeout * 1000; // convert seconds to ms
	}
	var asyncCallback = params.asyncMode ? new AjxCallback(this, this._handleResponseSendRequest, [params]) : null;

	if (params.sensitive) {
		DBG.println(AjxDebug.DBG2, "request contains sensitive data");
		// NOTE: If only http mode is available, there's nothing we can
		//       do. And if we're already using https mode, then there's
		//       nothing we need to do. We only attempt to send the
		//       request securely if mixed mode is enabled and the app
		//       was loaded using http.
		var isHttp = document.location.protocol == ZmSetting.PROTO_HTTP;
		var isMixedMode = appCtxt.get(ZmSetting.PROTOCOL_MODE) == ZmSetting.PROTO_MIXED;
		if (isHttp && isMixedMode) {
			DBG.println(AjxDebug.DBG2, "sending request securely");
			// adjust command parameters
			// TODO: Because of timing issues, should we not use session info?
			// TODO: But for batch commands, some updates would not be seen immediately.
			// TODO: To avoid security warning, send response in URL; so limit length
			params.noSession = true;

			// information
			var requestStr = ZmCsfeCommand.getRequestStr(params);
			var loc = document.location;
			var port = appCtxt.get(ZmSetting.HTTPS_PORT);
			if (port && port != ZmSetting.DEFAULT_HTTPS_PORT) {
				port = ":"+port;
			}

			// create iframe
			var iframe = document.createElement("IFRAME");
			iframe.style.display = "none";
			iframe.id = Dwt.getNextId();
			document.body.appendChild(iframe);

			// set contents
			var iframeDoc = Dwt.getIframeDoc(iframe);
			iframeDoc.write(
				"<form ",
					"id=",iframe.id,"-form ",
					"target=",iframe.id,"-iframe ",
					"method=POST ",
					"action='https://",loc.hostname,port,appContextPath,"/public/secureRequest.jsp'",
				">",
					"<input type=hidden name=reqId value='",reqId,"'>",
					"<textarea name=data>",
						AjxStringUtil.htmlEncode(requestStr),
					"</textarea>",
				"</form>",
				"<iframe name=",iframe.id,"-iframe></iframe>"
			);
			iframeDoc.close();

			// save the params for the response
			params.iframeId = iframe.id;
			this._pendingRequests[reqId] = params;

			// submit form
			var form = iframeDoc.getElementById(iframe.id+"-form");
			form.submit();
			return;
		}
	}

	var command = new ZmCsfeCommand();
	// bug fix #10652 - dont set change token if accountName is specified
	// (since we're executing on someone else's mbox)
	var accountName = params.accountName;
	if (!accountName) {
		var acct = appCtxt.getActiveAccount();
		accountName = (acct && acct.id != ZmAccountList.DEFAULT_ID) ? acct.name : null;
	}
	var cmdParams, methodName;

	if (params.restUri) {
		cmdParams =	{	restUri:			params.restUri,
						asyncMode:			params.asyncMode,
						callback:			asyncCallback
					};
	} else {
		cmdParams = {	jsonObj:			params.jsonObj,
						soapDoc:			params.soapDoc,
						accountName:		accountName,
						useXml:				this._useXml,
						changeToken:		(accountName ? null : this._changeToken),
						asyncMode:			params.asyncMode,
						callback:			asyncCallback,
						logRequest:			this._logRequest,
						highestNotifySeen:	this._highestNotifySeen,
						skipAuthCheck:		params.skipAuthCheck,
						resend:				params.resend,
						noSession:			params.noSession
					};
		methodName = params.methodName = ZmCsfeCommand.getMethodName(cmdParams.jsonObj || cmdParams.soapDoc);
	}

	appCtxt.currentRequestParams = params;
	DBG.println(AjxDebug.DBG2, "sendRequest(" + reqId + "): " + methodName);
	var cancelParams = timeout ? [reqId, params.errorCallback, params.noBusyOverlay] : null;
	if (!params.noBusyOverlay) {
		var cancelCallback = null;
		var showBusyDialog = false;
		if (timeout) {
			DBG.println(AjxDebug.DBG1, "ZmRequestMgr.sendRequest: timeout for " + reqId + " is " + timeout);
			cancelCallback = new AjxCallback(this, this.cancelRequest, cancelParams);
			this._shell.setBusyDialogText(ZmMsg.askCancel);
			showBusyDialog = true;
		}
		// put up busy overlay to block user input
		this._shell.setBusy(true, reqId, showBusyDialog, timeout, cancelCallback);
	} else if (timeout) {
		var action = new AjxTimedAction(this, this.cancelRequest, cancelParams);
		this._cancelActionId[reqId] = AjxTimedAction.scheduleAction(action, timeout);
	}

	this._pendingRequests[reqId] = command;

	try {
		var response = params.restUri ? command.invokeRest(cmdParams) : command.invoke(cmdParams);
		command.state = ZmRequestMgr._SENT;
	} catch (ex) {
		this._handleResponseSendRequest(params, new ZmCsfeResult(ex, true));
		return;
	}

	return (params.asyncMode) ? reqId : (this._handleResponseSendRequest(params, response));
};

ZmRequestMgr.prototype._handleResponseSendRequest =
function(params, result) {
	var isCannedResponse = (params.response != null);
	if (!isCannedResponse) {
		if (!this._pendingRequests[params.reqId]) {
			DBG.println(AjxDebug.DBG2, "ZmRequestMgr.handleResponseSendRequest no pendingRequest entry for " + params.reqId);
			return;
		}
		if (this._pendingRequests[params.reqId].state == ZmRequestMgr._CANCEL) {
			DBG.println(AjxDebug.DBG2, "ZmRequestMgr.handleResponseSendRequest state=CANCEL for " + params.reqId);
			return;
		}
	
		this._pendingRequests[params.reqId].state = ZmRequestMgr._RESPONSE;
	
		if (!params.noBusyOverlay) {
			this._shell.setBusy(false, params.reqId); // remove busy overlay
		} else if (params.timeout) {
			AjxTimedAction.cancelAction(this._cancelActionId[params.reqId]);
			this._cancelActionId[params.reqId] = -1;
		}
	}

	var response;
	try {
		if (params.asyncMode && !params.restUri) {
			response = result.getResponse(); // may throw exception
		} else {
			// for sync responses, manually throw exception if necessary
			if (result._isException) {
				throw result._data;
			} else {
				response = result;
			}
		}
		if (response.Header) {
			this._handleHeader(response.Header);
		}
	} catch (ex) {
		DBG.println(AjxDebug.DBG2, "Request " + params.reqId + " got an exception");
		if (params.errorCallback) {
			var handled = params.errorCallback.run(ex);
			if (!handled) {
				this._handleException(ex, params);
			}
		} else {
			this._handleException(ex, params);
		}
		var hdr = result.getHeader();
		if (hdr) {
			this._handleHeader(hdr);
			this._handleNotifications(hdr);
		}
		this._clearPendingRequest(params.reqId);
		return;
	}

	if (params.asyncMode && !params.restUri) {
		result.set(response.Body);
	}

    // if we didn't get an exception, then we should make sure that the
    // poll timer is running (just in case it got an exception and stopped)
	if (!appCtxt.isOffline && !isCannedResponse) {
		this._controller._kickPolling(true);
	}

	var methodName = (DBG && DBG.getDebugLevel() > 0) ? ZmCsfeCommand.getMethodName(params.jsonObj || params.soapDoc) : "";
	if (params.asyncMode && params.callback) {
		DBG.println(AjxDebug.DBG1, "------------------------- Running response callback for " + methodName);
		params.callback.run(result);
	}

	DBG.println(AjxDebug.DBG1, "------------------------- Processing notifications for " + methodName);
	this._handleNotifications(response.Header);

	this._clearPendingRequest(params.reqId);
	if (!params.asyncMode) {
		return response.Body;
	}
};

ZmRequestMgr.prototype.cancelRequest =
function(reqId, errorCallback, noBusyOverlay) {
	if (!this._pendingRequests[reqId]) { return; }
	if (this._pendingRequests[reqId].state == ZmRequestMgr._RESPONSE) { return; }

	this._pendingRequests[reqId].state = ZmRequestMgr._CANCEL;
	if (!noBusyOverlay) {
		this._shell.setBusy(false, reqId);
	}
	DBG.println(AjxDebug.DBG1, "ZmRequestMgr.cancelRequest: " + reqId);
	this._pendingRequests[reqId].cancel();
	if (errorCallback) {
		var ex = new AjxException("Request canceled", AjxException.CANCELED, "ZmRequestMgr.prototype.cancelRequest");
		errorCallback.run(ex);
	}
	this._clearPendingRequest(reqId);
};

ZmRequestMgr.prototype._clearPendingRequest =
function(reqId) {
	var request = this._pendingRequests[reqId];
	if (request) {
		if (request.iframeId) {
			var iframe = document.getElementById(request.iframeId);
			if (iframe) {
				iframe.parentNode.removeChild(iframe);
			}
		}
		delete this._pendingRequests[reqId];
	}
};

/**
 * Handles a response's SOAP header, except for notifications. Updates our
 * change token, and processes a <refresh> block if there is one (happens
 * when a new session is created on the server).
 *
 * @param hdr	[object]	a SOAP header
 */
ZmRequestMgr.prototype._handleHeader =
function(hdr) {
	if (!hdr) { return; }

	// update change token if we got one
	if (hdr && hdr.context && hdr.context.change) {
		this._changeToken = hdr.context.change.token;
	}

	if (hdr && hdr.context && hdr.context.refresh) {
		this._highestNotifySeen = 0;
		// bug: 24269 - offline does not handle refresh block well so ignore it
		// until we find a better solution
		if (!appCtxt.isOffline || !appCtxt.multiAccounts) {
			this._refreshHandler(hdr.context.refresh);
		}
	}

	// offline/zdesktop only
	if (hdr && hdr.context.zdsync && hdr.context.zdsync.account) {
		var acctList = hdr.context.zdsync.account;
		for (var i = 0; i < acctList.length; i++) {
			var acct = appCtxt.accountList.getAccount(acctList[i].id);
			if (acct) {
				acct.updateState(acctList[i]);
			}
		}
	}
};

/**
 * For transient network exceptions, retry the request after a small delay.
 * We will only retry a limited number of times.
 * 
 * @param ex			[AjxException]		the exception
 * @param params		[object]*			original request params
 */
ZmRequestMgr.prototype._handleException =
function(ex, params) {
	var handled = false;
	if (ZmRequestMgr.RETRY_ON_EXCEPTION[ex.code]) {
		params.retryCount = params.retryCount || 0;
		if (params.retryCount < ZmRequestMgr.RETRY_MAX) {
			DBG.println(AjxDebug.DBG1, "RETRY " + ex.method + " due to " + ex.code);
			params.resend = ZmCsfeCommand.RETRY;
			params.retryCount++;
			AjxTimedAction.scheduleAction(new AjxTimedAction(this, 
				function() {
					this.sendRequest(params);
				}), ZmRequestMgr.RETRY_DELAY * 1000);
			handled = true;
		}
	}
	
	if (!handled) {
		this._controller._handleException(ex, params);
	}
};

/**
 * Handles the <notify> block of a response's SOAP header.
 *
 * @param hdr	[object]	a SOAP header
 */
ZmRequestMgr.prototype._handleNotifications =
function(hdr) {
	if (hdr && hdr.context && hdr.context.notify) {
        for(i = 0; i < hdr.context.notify.length; i++) {
        	var notify = hdr.context.notify[i];
        	var seq = notify.seq;
            // BUG?  What if the array isn't in sequence-order?  Could we miss notifications?
            if (notify.seq > this._highestNotifySeen) {
                DBG.println(AjxDebug.DBG1, "Handling notification[" + i + "] seq=" + seq);
                this._highestNotifySeen = seq;
                this._notifyHandler(notify);
            } else {
            	DBG.println(AjxDebug.DBG1, "SKIPPING notification[" + i + "] seq=" + seq + " highestNotifySeen=" + this._highestNotifySeen);
	      	}
    	}
	}
};

/**
 * A <refresh> block is returned in a SOAP response any time the session ID has 
 * changed. It always happens on the first SOAP command (GetInfoRequest).
 * After that, it happens after a session timeout. 
 * 
 * @param refresh	[object]	refresh block (JSON)
 */
ZmRequestMgr.prototype._refreshHandler =
function(refresh) {
	DBG.println(AjxDebug.DBG1, "Handling REFRESH");
	this._controller.runAppFunction("_clearDeferredFolders");
	
	if (refresh.version) {
		if (!this._canceledReload) {
			var curVersion = appCtxt.get(ZmSetting.SERVER_VERSION);
			if (curVersion != refresh.version) {
				appCtxt.set(ZmSetting.SERVER_VERSION, refresh.version);
				if (curVersion) {
					var dlg = appCtxt.getYesNoMsgDialog();
					dlg.reset();
					dlg.registerCallback(DwtDialog.YES_BUTTON, this._reloadYesCallback, this, [dlg, curVersion, refresh.version]);
					dlg.registerCallback(DwtDialog.NO_BUTTON, this._reloadNoCallback, this, [dlg, refresh]);
					var msg = AjxMessageFormat.format(ZmMsg.versionChangeRestart, [curVersion, refresh.version]);
					dlg.setMessage(msg, DwtMessageDialog.WARNING_STYLE);
					dlg.popup();
					return;
				}
			}
		}
	}

	var unread = {};
	this._loadTree(ZmOrganizer.TAG, unread, refresh.tags);
	this._loadTree(ZmOrganizer.FOLDER, unread, refresh.folder[0], "folder");

	// Run any app-requested refresh routines
	this._controller.runAppFunction("refresh", false, refresh);
};

/**
 * User has accepted reload due to change in server version.
 */
ZmRequestMgr.prototype._reloadYesCallback =
function(dialog) {
	dialog.popdown();
    window.onbeforeunload = null;
    var url = AjxUtil.formatUrl();
	DBG.println(AjxDebug.DBG1, "SERVER_VERSION changed!");
    ZmZimbraMail.sendRedirect(url); // redirect to self to force reload
};

/**
 * User has canceled reload due to change in server version.
 */
ZmRequestMgr.prototype._reloadNoCallback =
function(dialog, refresh) {
	dialog.popdown();
	this._canceledReload = true;
	this._refreshHandler(refresh);
};

ZmRequestMgr.prototype._loadTree =
function(type, unread, obj, objType, account) {
	var isTag = (type == ZmOrganizer.TAG);
	var tree = appCtxt.getTree(type, account);
	if (tree) {
		tree.reset();
	} else {
		tree = isTag ? new ZmTagTree(account) : new ZmFolderTree();
	}
	appCtxt.setTree(type, tree, account);
	tree.addChangeListener(this._unreadListener);
	tree.getUnreadHash(unread);
	tree.loadFromJs(obj, objType, (account && account.id));
};

// To handle notifications, we keep track of all the models in use. A model could
// be an item, a list of items, or an organizer tree. Currently we never get an
// organizer by itself.
ZmRequestMgr.prototype._notifyHandler =
function(notify) {
	DBG.println(AjxDebug.DBG2, "Handling NOTIFY");
	this._controller.runAppFunction("preNotify", false, notify);
	if (notify.deleted && notify.deleted.id) {
		this._handleDeletes(notify.deleted);
	}
	if (notify.created) {
		this._handleCreates(notify.created);
	}
	if (notify.modified) {
		this._handleModifies(notify.modified);
	}
	this._controller.runAppFunction("postNotify", false, notify);
};

/**
 * A delete notification hands us a list of IDs which could be anything. First, we
 * run any app delete handlers. Any IDs which have been handled by an app will
 * be nulled out. The generic handling here will be applied to the rest - the item is
 * retrieved from the item cache and told it has been deleted.
 *
 * @param deletes	[object]	node containing all 'deleted' notifications
 */
ZmRequestMgr.prototype._handleDeletes =
function(deletes) {
	var ids = deletes.id.split(",");
	this._controller.runAppFunction("deleteNotify", false, ids);

	for (var i = 0; i < ids.length; i++) {
		var id = ids[i];
		if (!id) { continue; }
		var item = appCtxt.cacheGet(id);
		DBG.println(AjxDebug.DBG2, "ZmRequestMgr: handling delete notif for ID " + id);
		if (item) {
			item.notifyDelete();
			appCtxt.cacheRemove(id);
			item = null;
		}
	}
};

/**
 * Create notifications hand us full XML nodes. First, we run any app
 * create handlers, which will mark any create nodes that they handle. Remaining
 * creates are handled here.
 * 
 * @param creates	[object]	node containing all 'created' notifications
 */
ZmRequestMgr.prototype._handleCreates =
function(creates) {
	this._controller.runAppFunction("createNotify", false, creates);

	for (var name in creates) {
		var list = creates[name];
		for (var i = 0; i < list.length; i++) {
			var create = list[i];
			if (create._handled) { continue; }
			// ignore create notif for item we already have (except tags, which can reuse IDs)
			if (appCtxt.cacheGet(create.id) && name != "tag") { continue; }
	
			DBG.println(AjxDebug.DBG1, "ZmRequestMgr: handling CREATE for node: " + name);
			if (name == "tag") {
				var tagTree = appCtxt.getTagTree();
				if (tagTree) {
					tagTree.root.notifyCreate(create);
				}
			} else if (name == "folder" || name == "search" || name == "link") {
				var parentId = create.l;
				var parent = appCtxt.getById(parentId);
				if (parent && parent.type != ZmOrganizer.TAG) { // bug #37148
					parent.notifyCreate(create, (name == "search"));
				}
			}
		}
	}
};

/**
 * First, we run any app modify handlers, which will mark any nodes that
 * they handle. Remaining modify notifications are handled here.
 * 
 * @param modifies	[object]	node containing all 'modified' notifications
 */
ZmRequestMgr.prototype._handleModifies =
function(modifies) {

	this._controller.runAppFunction("modifyNotify", false, modifies);

	for (var name in modifies) {
		if (name == "mbx") {
			// bug fix #26318 - only update quota for the active account
			var mboxes = modifies[name];
			for (var i = 0; i < mboxes.length; i++) {
				var mbox = mboxes[i];
				var acct = mbox.acct;
				if (!acct || (acct && acct == appCtxt.getActiveAccount().id)) {
					var setting = appCtxt.getSettings().getSetting(ZmSetting.QUOTA_USED);
					setting.notifyModify({_name:name, s:mbox.s});
				}
			}
			continue;
		}

		var list = modifies[name];
		for (var i = 0; i < list.length; i++) {
			var mod = list[i];
			if (mod._handled) { continue; }
			DBG.println(AjxDebug.DBG2, "ZmRequestMgr: handling modified notif for ID " + mod.id + ", node type = " + name);
			var item = appCtxt.cacheGet(mod.id);

			// bug fix #31991 - for contact modifies, check the contact list
			// Since we lazily create ZmContact items, it wont be in the global cache.
			if (!item && name == "cn" && AjxDispatcher.loaded("ContactsCore")) {
				var capp = appCtxt.getApp(ZmApp.CONTACTS);
				if (capp.isContactListLoaded()) {
					item = capp.getContactList().getById(mod.id);
				}
			}

			if (item) {
				mod._isRemote = (name == "folder" && item.link);	// remote subfolder
				item.notifyModify(mod);
			}
		}
	}
};

/**
 * Returns a list of objects that have the given parent, flattening child
 * arrays in the process. It also saves each child's name into it.
 *
 * @param parent	[object]	notification subnode
 *
 * TODO: remove this func (still used by ZmMailApp::_adjustNotifies)
 */
ZmRequestMgr._getObjList =
function(parent) {
	var list = [];
	for (var name in parent) {
		var obj = parent[name];
		if (obj instanceof Array) {
			for (var i = 0; i < obj.length; i++) {
				obj[i]._name = name;
				list.push(obj[i]);
			}
		} else {
			obj._name = name;
			list.push(obj);
		}
	}
	return list;
};

/**
 * Changes browser title if it's a folder or tag whose unread count has changed.
 *
 * @param ev
 */
ZmRequestMgr.prototype._unreadChangeListener =
function(ev) {
	if (ev.event == ZmEvent.E_MODIFY) {
		var fields = ev.getDetail("fields");
		if (fields && fields[ZmOrganizer.F_UNREAD]) {
			var organizers = ev.getDetail("organizers");
			var organizer = organizers ? organizers[0] : null;
			var id = organizer ? (organizer.isSystem() ? organizer.nId : organizer.id) : null;
			var search = appCtxt.getCurrentSearch();
			if (search && id && (id == search.folderId || id == search.tagId)) {
				Dwt.setTitle(search.getTitle());
			}
			var mailApp = appCtxt.getApp(ZmApp.MAIL);
			if (mailApp) {
				mailApp.setNewMailNotice(organizer);
			}
		}
	}
};
