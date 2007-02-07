/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: ZPL 1.2
 * 
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.2 ("License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.zimbra.com/license
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is: Zimbra Collaboration Suite Web Client
 * 
 * The Initial Developer of the Original Code is Zimbra, Inc.
 * Portions created by Zimbra are Copyright (C) 2005, 2006 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s):
 * 
 * ***** END LICENSE BLOCK *****
 */

function ZmMailApp(appCtxt, container, parentController) {

	ZmApp.call(this, ZmApp.MAIL, appCtxt, container, parentController);

	AjxDispatcher.registerMethod("Compose", "Mail", new AjxCallback(this, this.compose));
	AjxDispatcher.registerMethod("GetAttachmentListController", "Mail", new AjxCallback(this, this.getAttachmentListController));
	AjxDispatcher.registerMethod("GetComposeController", "Mail", new AjxCallback(this, this.getComposeController));
	AjxDispatcher.registerMethod("GetConvController", "Mail", new AjxCallback(this, this.getConvController));
	AjxDispatcher.registerMethod("GetConvListController", "Mail", new AjxCallback(this, this.getConvListController));
	AjxDispatcher.registerMethod("GetMsgController", "Mail", new AjxCallback(this, this.getMsgController));
	AjxDispatcher.registerMethod("GetTradController", "Mail", new AjxCallback(this, this.getTradController));
	AjxDispatcher.registerMethod("GetMailListController", "Mail", new AjxCallback(this, this.getMailListController));

	ZmItem.registerItem(ZmItem.CONV,
						{app:			ZmApp.MAIL,
						 nameKey:		"conversation",
						 icon:			"Conversation",
						 soapCmd:		"ConvAction",
						 itemClass:		"ZmConv",
						 node:			"c",
						 organizer:		ZmOrganizer.FOLDER,
						 searchType:	"conversation",
						 stbTooltipKey:	"searchForConvs",
						 stbIcon:		"ContactsFolder",
						 resultsList:
		AjxCallback.simpleClosure(function(search) {
			AjxDispatcher.require("Mail");
			return new ZmMailList(ZmItem.CONV, this._appCtxt, search);
		}, this)
						});

	ZmItem.registerItem(ZmItem.MSG,
						{app:			ZmApp.MAIL,
						 nameKey:		"message",
						 icon:			"Message",
						 soapCmd:		"MsgAction",
						 itemClass:		"ZmMailMsg",
						 node:			"m",
						 organizer:		ZmOrganizer.FOLDER,
						 searchType:	"message",
						 stbTooltipKey:	"searchForMessages",
						 stbIcon:		"ContactsFolder",
						 resultsList:
		AjxCallback.simpleClosure(function(search) {
			AjxDispatcher.require("Mail");
			return new ZmMailList(ZmItem.MSG, this._appCtxt, search);
		}, this)
						});

	ZmItem.registerItem(ZmItem.ATT,
						{nameKey:		"attachment",
						 icon:			"Attachment",
						 itemClass:		"ZmMimePart",
						 node:			"mp",
						 resultsList:
		AjxCallback.simpleClosure(function(search) {
			return new ZmMailList(ZmItem.ATT, this._appCtxt, search);
		}, this)
						});

	ZmApp.registerApp(ZmApp.MAIL,
							 {mainPkg:				"Mail",
							  nameKey:				"mail",
							  icon:					"MailApp",
							  chooserTooltipKey:	"goToMail",
							  viewTooltipKey:		"displayMail",
							  defaultSearch:		ZmSearchToolBar.FOR_MAIL_MI,
							  overviewTrees:		[ZmOrganizer.FOLDER, ZmOrganizer.SEARCH, ZmOrganizer.TAG],
							  showZimlets:			true,
							  assistants:			{"ZmMailAssistant":"Mail"},
							  searchTypes:			[ZmItem.MSG, ZmItem.CONV],
							  actionCode:			ZmKeyMap.GOTO_MAIL,
							  qsViews:				["compose", "msg"],
							  trashViewOp:			ZmOperation.SHOW_ONLY_MAIL,
							  chooserSort:			10,
							  defaultSort:			10
							  });

	ZmSearchToolBar.FOR_MAIL_MI = "FOR MAIL";
	ZmSearchToolBar.MSG_KEY[ZmSearchToolBar.FOR_MAIL_MI]	= "searchMail";
	ZmSearchToolBar.ICON[ZmSearchToolBar.FOR_MAIL_MI]		= "SearchMail";
	ZmSearchToolBar.MENU_ITEMS.push(ZmSearchToolBar.FOR_MAIL_MI);
};

// Organizer and item-related constants
ZmEvent.S_CONV				= "CONV";
ZmEvent.S_MSG				= "MSG";
ZmEvent.S_ATT				= "ATT";
ZmItem.CONV					= ZmEvent.S_CONV;
ZmItem.MSG					= ZmEvent.S_MSG;
ZmItem.ATT					= ZmEvent.S_ATT;

// convert between server values for "group mail by" and item types
ZmMailApp.GROUP_MAIL_BY_ITEM	= {};
ZmMailApp.GROUP_MAIL_BY_VALUE	= {};
ZmMailApp.GROUP_MAIL_BY_ITEM[ZmSetting.GROUP_BY_CONV]		= ZmItem.CONV;
ZmMailApp.GROUP_MAIL_BY_ITEM[ZmSetting.GROUP_BY_MESSAGE]	= ZmItem.MSG;
ZmMailApp.GROUP_MAIL_BY_VALUE[ZmItem.CONV]					= ZmSetting.GROUP_BY_CONV;
ZmMailApp.GROUP_MAIL_BY_VALUE[ZmItem.MSG]					= ZmSetting.GROUP_BY_MESSAGE;

// App-related constants
ZmApp.MAIL					= "Mail";
ZmApp.CLASS[ZmApp.MAIL]		= "ZmMailApp";
ZmApp.SETTING[ZmApp.MAIL]	= ZmSetting.MAIL_ENABLED;
ZmApp.LOAD_SORT[ZmApp.MAIL]	= 20;

ZmMailApp.prototype = new ZmApp;
ZmMailApp.prototype.constructor = ZmMailApp;

ZmMailApp.prototype.toString = 
function() {
	return "ZmMailApp";
};

ZmMailApp.prototype.startup =
function(result) {
	AjxDispatcher.run("GetComposeController").initComposeView(true);
};

ZmMailApp.prototype.preNotify =
function(notify) {
	this._adjustNotifies(notify);
};

/**
 * For mail creates, there is no authoritative list (mail lists are always the result,
 * of a search), so we notify each ZmMailList that we know about. To make life easier,
 * we figure out which folder(s) a conv spans before we hand it off.
 * 
 * @param list	[array]		list of create notifications
 */
ZmMailApp.prototype.createNotify =
function(list) {
	if (this._deferNotifications("create", list)) { return; }
	var convs = {};
	var msgs = {};
	var folders = {};
	var numMsgs = {};
	var gotMail = false;
	for (var i = 0; i < list.length; i++) {
		var create = list[i];
		var name = create._name;
		// ignore stuff we already have, and virtual convs that got normalized
		if (this._appCtxt.cacheGet(create.id) || ((name == "c") && create._wasVirtConv)) {
			create._handled = true;
			continue;
		}

		if (name == "m") {
			DBG.println(AjxDebug.DBG1, "ZmMailApp: handling CREATE for node: " + name);
			var msg = ZmMailMsg.createFromDom(create, {appCtxt: this._appCtxt}, true);
			msgs[msg.id] = msg;
			var cid = msg.cid;
			var folder = msg.folderId;
			if (cid && folder) {
				if (!folders[cid]) {
					folders[cid] = {};
				}
				folders[cid][folder] = true;
			}
			numMsgs[cid] = numMsgs[cid] ? numMsgs[cid] + 1 : 1;
			gotMail = true;
			create._handled = true;
		} else if (name == "c") {
			DBG.println(AjxDebug.DBG1, "ZmMailApp: handling CREATE for node: " + name);
			var conv = ZmConv.createFromDom(create, {appCtxt: this._appCtxt}, true);
			convs[conv.id] = conv;
			gotMail = true;
			create._handled = true;
		}
	}
	if (gotMail) {
		for (var cid in convs) {
			var conv = convs[cid];
			conv.folders = folders[cid] ? folders[cid] : null;
		}
		var list = this._appCtxt.getCurrentList();
		if (list && (list instanceof ZmMailList)) {
			list.notifyCreate(convs, msgs);
		}
	}
};

ZmMailApp.prototype.launch =
function(callback, checkQS) {
	var loadCallback = new AjxCallback(this, this._handleLoadLaunch, [callback, checkQS]);
	AjxDispatcher.require("Mail", false, loadCallback, null, true);
};

ZmMailApp.prototype._handleLoadLaunch =
function(callback, checkQS) {
	var respCallback = new AjxCallback(this, this._handleResponseLaunch, [callback]);
	var query = null;
	if (checkQS) {
		if (location && (location.search.match(/\bview=compose\b/))) {
			var cc = AjxDispatcher.run("GetComposeController");
			var match = location.search.match(/\bsubject=([^&]+)/);
			var subject = match ? decodeURIComponent(match[1]) : null;
			match = location.search.match(/\bto=([^&]+)/);
			var to = match ? decodeURIComponent(match[1]) : null;
			match = location.search.match(/\bbody=([^&]+)/);
			var body = match ? decodeURIComponent(match[1]) : null;
			var params = {action:ZmOperation.NEW_MESSAGE, toOverride:to, subjOverride:subject,
						  extraBodyText:body, callback:respCallback};
			cc.doAction(params);
			return;
		} else if (location.search && (location.search.match(/\bview=msg\b/))) {
			var match = location.search.match(/\bid=(\d+)/);
			var id = match ? match[1] : null;
			if (id) {
				query = ["item:", id].join("");
			}
		}
	}
	query = query ? query : this._appCtxt.get(ZmSetting.INITIAL_SEARCH);
	var types = new AjxVector();
	types.add(this.getGroupMailBy());
	
	var params = {query:query, callback:respCallback, types:types};
	this._appCtxt.getSearchController().search(params);
};

ZmMailApp.prototype._handleResponseLaunch =
function(callback) {
	if (callback) {
		callback.run();
	}
};

ZmMailApp.prototype.showSearchResults =
function(results, callback) {
	var loadCallback = new AjxCallback(this, this._handleLoadShowSearchResults, [results, callback]);
	AjxDispatcher.require("Mail", false, loadCallback, null, true);
};

ZmMailApp.prototype._handleLoadShowSearchResults =
function(results, callback) {
	if (results.type == ZmItem.CONV) {
		this.getConvListController().show(results);
	} else if (results.type == ZmItem.MSG) {
		this.getTradController().show(results);
	}
	if (callback) {
		callback.run();
	}
};

ZmMailApp.prototype.getAttachmentListController =
function() {
	if (!this._attachmentListController) {
		this._attachmentListController = new ZmAttachmentListController(this._appCtxt, this._container, this);
	}
	return this._attachmentListController;
};

ZmMailApp.prototype.getConvListController =
function() {
	if (!this._convListController) {
		this._convListController = new ZmConvListController(this._appCtxt, this._container, this);
	}
	return this._convListController;
};

ZmMailApp.prototype.getConvController =
function() {
	if (!this._convController) {
		this._convController = new ZmConvController(this._appCtxt, this._container, this);
	}
	return this._convController;
};

ZmMailApp.prototype.getTradController = 
function() {
	if (!this._tradController) {
		this._tradController = new ZmTradController(this._appCtxt, this._container, this);
	}
	return this._tradController;
};

ZmMailApp.prototype.getMsgController = 
function() {
	if (!this._msgController) {
		this._msgController = new ZmMsgController(this._appCtxt, this._container, this);
	}
	return this._msgController;
};

ZmMailApp.prototype.getComposeController =
function() {
	if (!this._composeController) {
		this._composeController = new ZmComposeController(this._appCtxt, this._container, this);
	}
	return this._composeController;
};

ZmMailApp.prototype.getMailListController =
function() {
	var groupMailBy = this._appCtxt.get(ZmSetting.GROUP_MAIL_BY);
	return (groupMailBy == ZmSetting.GROUP_BY_CONV) ? AjxDispatcher.run("GetConvListController") :
													  AjxDispatcher.run("GetTradController");
};

/**
 * Begins a compose session by presenting a form to the user.
 * 
 * @param action		[constant]		new message, reply, forward, or an invite action
 * @param inNewWindow	[boolean]*		if true, we are in detached window
 * @param msg			[ZmMailMsg]*	the original message (reply/forward), or address (new message)
 * @param toOverride 	[string]*		initial value for To: field
 * @param subjOverride 	[string]*		initial value for Subject: field
 * @param extraBodyText [string]*		canned text to prepend to body (invites)
 * @param callback		[AjxCallback]*	callback to run after view has been set
 * @param accountName	[string]*		on-behalf-of From address
 */
ZmMailApp.prototype.compose =
function(params) {
	AjxDispatcher.run("GetComposeController").doAction(params);
};

/**
* Convenience method to convert "group mail by" between server (string)
* and client (int constant) versions.
*/
ZmMailApp.prototype.getGroupMailBy =
function() {
	var setting = this._appCtxt.get(ZmSetting.GROUP_MAIL_BY);
	return setting ? ZmMailApp.GROUP_MAIL_BY_ITEM[setting] : ZmItem.MSG;
};

// Normalize the notifications that occur when a virtual conv gets promoted to a real conv.
ZmMailApp.prototype._adjustNotifies =
function(notify) {
	if (!(notify.deleted && notify.created && notify.modified))	return notify;
	
	var virtConvDeleted = false;
	var deletedIds = notify.deleted.id.split(",");
	var virtConv = {};
	var newDeletedIds = [];
	for (var i = 0; i < deletedIds.length; i++) {
		var id = deletedIds[i];
		if (id < 0) {
			virtConv[id] = true;
			virtConvDeleted = true;
		} else {
			newDeletedIds.push(id);
		}
	}
	if (!virtConvDeleted) return notify;

	var gotNewConv = false;
	var createList = ZmRequestMgr._getObjList(notify.created);
	var createdMsgs = {};
	var createdConvs = {};
	for (var i = 0; i < createList.length; i++) {
		var create = createList[i];
		var id = create.id;
		var name = create._name;
		if (name == "m") {
			createdMsgs[id] = create;
		} else if (name == "c" && (create.n > 1)) {
			createdConvs[id] = create;
			gotNewConv = true;
		}
	}
	if (!gotNewConv) return notify;
	
	var msgMoved = false;
	var newToOldCid = {};
	var modList = ZmRequestMgr._getObjList(notify.modified);
	var movedMsgs = {};
	for (var i = 0; i < modList.length; i++) {
		var mod = modList[i];
		var id = mod.id;
		var name = mod._name;
		if (name == "m") {
			var virtCid = id * -1;
			if (virtConv[virtCid] && createdConvs[mod.cid]) {
				msgMoved = true;
				movedMsgs[id] = mod;
				newToOldCid[mod.cid] = virtCid;
			}
		}
	}
	if (!msgMoved) return notify;
	
	// We're promoting a virtual conv. Normalize the notifications object, and
	// process a preliminary notif that will update the virtual conv's ID to its
	// new value.
	
	// First, ignore the deleted notif for the virtual conv
	notify.deleted.id = newDeletedIds.join(",");
	
	// Next, make sure we ignore the create for the real conv by placing a marker in its node.
	for (var i = 0; i < createList.length; i++) {
		var create = createList[i];
		var id = create.id;
		var name = create._name;
		if (name == "c" && virtConv[newToOldCid[id]]) {
			createdConvs[id]._wasVirtConv = true;
		}
	}

	// Create modified notifs for the virtual convs that have been promoted.
	var newMods = [];
	for (var cid in newToOldCid) {
		var node = createdConvs[cid];
		node.id = newToOldCid[cid];
		node._newId = cid;
		newMods.push(node);
	}
	
	// Go ahead and process these changes, which will change the ID of each promoted conv
	// from its virtual (negative) ID to its real (positive) one.
	if (newMods.length) {
		var mods = {};
		mods.c = newMods;
		this._appCtxt.getRequestMgr()._handleModifies(mods);
	}
	
	return notify;
};
