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
 * Does nothing.
 * @constructor
 * @class
 * This class is a container for stuff that the overall app may want to know about. That
 * includes environment information (such as whether the browser in use is public), and
 * stuff that is common to the app as a whole (such as tags). The methods are almost all
 * just getters and setters.
 */
ZmAppCtxt = function() {
	this._trees = {};
	this._accounts = {};
	// create dummy account for startup
	this._accounts[ZmZimbraAccount.DEFAULT_ID] = new ZmZimbraAccount(ZmZimbraAccount.DEFAULT_ID, null, false);

	// public properties
	this.inStartup = false;				// true if we are starting app (set in ZmZimbraMail)
	this.currentRequestParams = null;	// params of current SOAP request (set in ZmRequestMgr)
	this.rememberMe = null;

	// account-specific
	this.multiAccounts = false;
	this.numAccounts = 1;				// init to 1 b/c there is always a main account
	this.numVisibleAccounts = 0;
	this.userDomain = "";

	this._evtMgr = new AjxEventMgr();
};

ZmAppCtxt._ZIMLETS_EVENT = 'ZIMLETS'

ZmAppCtxt.prototype.toString =
function() {
	return "ZmAppCtxt";
};

ZmAppCtxt.prototype.setAppController =
function(appController) {
	this._appController = appController;
};

ZmAppCtxt.prototype.getAppController =
function() {
	return this._appController;
};

ZmAppCtxt.prototype.setRequestMgr =
function(requestMgr) {
	this._requestMgr = requestMgr;
};

ZmAppCtxt.prototype.getRequestMgr =
function() {
	return this._requestMgr;
};

/**
 * Displays a status message
 * @param msg the message
 * @param level ZmStatusView.LEVEL_INFO, ZmStatusView.LEVEL_WARNING, or ZmStatusView.LEVEL_CRITICAL (optional)
 * @param detail details (optional)
 * @param transitions transitions (optional)
 * @param toast the toast control (optional)
 */
ZmAppCtxt.prototype.setStatusMsg =
function(params) {
	params = Dwt.getParams(arguments, ZmStatusView.MSG_PARAMS);
	this._appController.setStatusMsg(params);
};

ZmAppCtxt.prototype.getSettings =
function(account) {
	var id = account ? account.id : this._activeAccount ? this._activeAccount.id : ZmZimbraAccount.DEFAULT_ID;
	return this._accounts[id] ? this._accounts[id].settings : null;
};

ZmAppCtxt.prototype.setSettings = 
function(settings, account) {
	var id = account ? account.id : this._activeAccount ? this._activeAccount.id : ZmZimbraAccount.DEFAULT_ID;
	if (this._accounts[id]) {
		this._accounts[id].settings = settings;
	}
};

/**
 * Returns the value of a setting.
 *
 * @param id		[constant]		setting ID
 * @param key		[string]*		setting key (for settings that are of the hash type)
 * @param account	[ZmAccount]*	account to get the ZmSettings instance for
 */
ZmAppCtxt.prototype.get =
function(id, key, account) {
	// for offline / multi-account, global settings should always come from the
	// invisible parent account
	if (this.isOffline && this.multiAccounts && ZmSetting.IS_GLOBAL[id]) {
		return this.getSettings(this.getMainAccount()).get(id, key);
	}
	return this.getSettings(account).get(id, key);
};

/**
 * Sets the value of a setting.
 *
 * @param id			[constant]		setting ID
 * @param value			[any]			setting value
 * @param key			[string]*		setting key (for settings that are of the hash type)
 * @param setDefault	[boolean]*		if true, also replace setting's default value
 * @param skipNotify	[boolean]*		if true, do not notify setting listeners
 */
ZmAppCtxt.prototype.set =
function(id, value, key, setDefault, skipNotify) {
	// for offline / multi-account, global settings should always come from the
	// invisible parent account
	var setting = (this.isOffline && this.multiAccounts && ZmSetting.IS_GLOBAL[id])
		? this.getSettings(this.getMainAccount()).getSetting(id)
		: this.getSettings().getSetting(id);

	if (setting) {
		setting.setValue(value, key, setDefault, skipNotify);
	}
};

ZmAppCtxt.prototype.getApp =
function(appName) {
	return this._appController.getApp(appName);
};

ZmAppCtxt.prototype.getCurrentAppName =
function() {
	var context = this.isChildWindow ? parentAppCtxt : this;
	return context._appController.getActiveApp();
};

ZmAppCtxt.prototype.getCurrentApp =
function() {
	return this.getApp(this.getCurrentAppName());
};

ZmAppCtxt.prototype.getAppViewMgr =
function() {
	return this._appController.getAppViewMgr();
};

ZmAppCtxt.prototype.getClientCmdHandler =
function(clientCmdHdlr) {
	if (!this._clientCmdHandler) {
		AjxDispatcher.require("Extras");
		this._clientCmdHandler = new ZmClientCmdHandler();
	}
	return this._clientCmdHandler;
};

/**
* Returns a handle to the search bar's controller.
*/
ZmAppCtxt.prototype.getSearchController =
function() {
	if (!this._searchController) {
		this._searchController = new ZmSearchController(this._shell);
	}
	return this._searchController;
};

/**
* Returns a handle to the overview controller.
*/
ZmAppCtxt.prototype.getOverviewController =
function() {
	if (!this._overviewController) {
		this._overviewController = new ZmOverviewController(this._shell);
	}
	return this._overviewController;
};

ZmAppCtxt.prototype.getImportExportController = function() {
	if (!this._importExportController) {
		AjxDispatcher.require("ImportExport");
		this._importExportController = new ZmImportExportController();
	}
	return this._importExportController;
};

ZmAppCtxt.prototype.getLoginDialog =
function() {
	if (!this._loginDialog) {
		this._loginDialog = new ZmLoginDialog(this._shell);
	}
	return this._loginDialog;
};

ZmAppCtxt.prototype.getMsgDialog =
function() {
	if (!this._msgDialog) {
		this._msgDialog = new DwtMessageDialog({parent:this._shell});
	}
	return this._msgDialog;
};

ZmAppCtxt.prototype.getYesNoMsgDialog =
function() {
	if (!this._yesNoMsgDialog) {
		this._yesNoMsgDialog = new DwtMessageDialog({parent:this._shell, buttons:[DwtDialog.YES_BUTTON, DwtDialog.NO_BUTTON]});
	}	
	return this._yesNoMsgDialog;
};

ZmAppCtxt.prototype.getYesNoCancelMsgDialog =
function() {
	if (!this._yesNoCancelMsgDialog) {
		this._yesNoCancelMsgDialog = new DwtMessageDialog({parent:this._shell, buttons:[DwtDialog.YES_BUTTON, DwtDialog.NO_BUTTON, DwtDialog.CANCEL_BUTTON]});
	}	
	return this._yesNoCancelMsgDialog;
};

ZmAppCtxt.prototype.getOkCancelMsgDialog =
function() {
	if (!this._okCancelMsgDialog) {
		this._okCancelMsgDialog = new DwtMessageDialog({parent:this._shell, buttons:[DwtDialog.OK_BUTTON, DwtDialog.CANCEL_BUTTON]});
	}	
	return this._okCancelMsgDialog;
};

ZmAppCtxt.prototype.getErrorDialog = 
function() {
	if (!this._errorDialog) {
		this._errorDialog = new ZmErrorDialog(this._shell, ZmMsg);
	}
	return this._errorDialog;
};

ZmAppCtxt.prototype.getNewTagDialog =
function() {
	if (!this._newTagDialog) {
		this._newTagDialog = new ZmNewTagDialog(this._shell);
	}
	return this._newTagDialog;
};

ZmAppCtxt.prototype.getRenameTagDialog =
function() {
	if (!this._renameTagDialog) {
		AjxDispatcher.require("Extras");
		this._renameTagDialog = new ZmRenameTagDialog(this._shell);
	}
	return this._renameTagDialog;
};

ZmAppCtxt.prototype.getNewFolderDialog =
function() {
	if (!this._newFolderDialog) {
		this._newFolderDialog = new ZmNewFolderDialog(this._shell);
	}
	return this._newFolderDialog;
};

ZmAppCtxt.prototype.getNewAddrBookDialog = 
function() {
	if (!this._newAddrBookDialog) {
		AjxDispatcher.require("Contacts");
		this._newAddrBookDialog = new ZmNewAddrBookDialog(this._shell);
	}
	return this._newAddrBookDialog;
}

ZmAppCtxt.prototype.getNewCalendarDialog =
function() {
	if (!this._newCalendarDialog) {
		AjxDispatcher.require(["CalendarCore", "Calendar", "CalendarAppt"]);
		this._newCalendarDialog = new ZmNewCalendarDialog(this._shell);
	}
	return this._newCalendarDialog;
};

ZmAppCtxt.prototype.getNewNotebookDialog =
function() {
	if (!this._newNotebookDialog) {
		AjxDispatcher.require(["NotebookCore", "Notebook"]);
		this._newNotebookDialog = new ZmNewNotebookDialog(this._shell);
	}
	return this._newNotebookDialog;
};

ZmAppCtxt.prototype.getNewTaskFolderDialog =
function() {
	if (!this._newTaskFolderDialog) {
		AjxDispatcher.require(["TasksCore", "Tasks"]);
		this._newTaskFolderDialog = new ZmNewTaskFolderDialog(this._shell);
	}
	return this._newTaskFolderDialog;
};

ZmAppCtxt.prototype.getPageConflictDialog =
function() {
	if (!this._pageConflictDialog) {
		AjxDispatcher.require(["NotebookCore", "Notebook"]);
		this._pageConflictDialog = new ZmPageConflictDialog(this._shell);
	}
	return this._pageConflictDialog;
};

ZmAppCtxt.prototype.getDialog =
function(){
	if(!this._dialog){
		this._dialog = new DwtDialog({parent:this._shell});
	}
	return this._dialog;
};

ZmAppCtxt.prototype.getNewSearchDialog =
function() {
	if (!this._newSearchDialog) {
		this._newSearchDialog = new ZmNewSearchDialog(this._shell);
	}
	return this._newSearchDialog;
};

ZmAppCtxt.prototype.getRenameFolderDialog =
function() {
	if (!this._renameFolderDialog) {
		AjxDispatcher.require("Extras");
		this._renameFolderDialog = new ZmRenameFolderDialog(this._shell);
	}
	return this._renameFolderDialog;
};

ZmAppCtxt.prototype.getChooseFolderDialog =
function() {
	if (!this._chooseFolderDialog) {
		AjxDispatcher.require("Extras");
		this._chooseFolderDialog = new ZmChooseFolderDialog(this._shell);
	}
	return this._chooseFolderDialog;
};

ZmAppCtxt.prototype.getPickTagDialog =
function() {
	if (!this._pickTagDialog) {
		AjxDispatcher.require("Extras");
		this._pickTagDialog = new ZmPickTagDialog(this._shell);
	}
	return this._pickTagDialog;
};

ZmAppCtxt.prototype.getFolderNotifyDialog =
function() {
	if (!this._folderNotifyDialog) {
		this._folderNotifyDialog = new ZmFolderNotifyDialog(this._shell);
	}
	return this._folderNotifyDialog;
};

ZmAppCtxt.prototype.getFolderPropsDialog =
function() {
	if (!this._folderPropsDialog) {
		this._folderPropsDialog = new ZmFolderPropsDialog(this._shell);
	}
	return this._folderPropsDialog;
};

ZmAppCtxt.prototype.getLinkPropsDialog =
function() {
	if (!this._linkPropsDialog) {
		AjxDispatcher.require("Share");
		this._linkPropsDialog = new ZmLinkPropsDialog(this._shell);
	}
	return this._linkPropsDialog;
};

ZmAppCtxt.prototype.getSharePropsDialog =
function() {
	if (!this._sharePropsDialog) {
		AjxDispatcher.require("Share");
		this._sharePropsDialog = new ZmSharePropsDialog(this._shell);
	}
	return this._sharePropsDialog;
};

ZmAppCtxt.prototype.getAcceptShareDialog =
function() {
	if (!this._acceptShareDialog) {
		AjxDispatcher.require("Share");
		this._acceptShareDialog = new ZmAcceptShareDialog(this._shell);
	}
	return this._acceptShareDialog;
};

ZmAppCtxt.prototype.getDeclineShareDialog =
function() {
	if (!this._declineShareDialog) {
		AjxDispatcher.require("Share");
		this._declineShareDialog = new ZmDeclineShareDialog(this._shell);
	}
	return this._declineShareDialog;
};

ZmAppCtxt.prototype.getRevokeShareDialog =
function() {
	if (!this._revokeShareDialog) {
		AjxDispatcher.require("Share");
		this._revokeShareDialog = new ZmRevokeShareDialog(this._shell);
	}
	return this._revokeShareDialog;
};

ZmAppCtxt.prototype.getMountFolderDialog =
function() {
	if (!this._mountFolderDialog) {
		AjxDispatcher.require("Share");
		this._mountFolderDialog = new ZmMountFolderDialog(this._shell);
	}
	return this._mountFolderDialog;
};

/**
* Returns the dialog used to add or edit a filter rule.
*/
ZmAppCtxt.prototype.getFilterRuleDialog =
function() {
	if (!this._filterRuleDialog) {
		AjxDispatcher.require(["PreferencesCore", "Preferences"]);
		this._filterRuleDialog = new ZmFilterRuleDialog();
	}
	return this._filterRuleDialog;
};

ZmAppCtxt.prototype.getConfirmationDialog =
function() {
	if (!this._confirmDialog) {
		this._confirmDialog = new DwtConfirmDialog(this._shell);
	}
	return this._confirmDialog;
};

ZmAppCtxt.prototype.getUploadDialog =
function() {
	if (!this._uploadDialog) {
		AjxDispatcher.require(["NotebookCore", "Notebook"]);
		this._uploadDialog = new ZmUploadDialog(this._shell);
	}
	return this._uploadDialog;
};

ZmAppCtxt.prototype.getImportDialog =
function() {
	if (!this._importDialog) {
		AjxDispatcher.require(["NotebookCore", "Notebook"]);
		this._importDialog = new ZmImportDialog(this._shell);
	}
	return this._importDialog;
};

ZmAppCtxt.prototype.getAttachDialog =
function() {
	if (!this._attachDialog) {
		AjxDispatcher.require("Share");
		this._attachDialog = new ZmAttachDialog(this._shell);
		this.runAttachDialogCallbacks();
	}
	return this._attachDialog;
};

ZmAppCtxt.prototype.runAttachDialogCallbacks =
function() {
	while(this._attachDialogCallback && this._attachDialogCallback.length > 0) {
		var callback = this._attachDialogCallback.shift();
		if(callback && (callback instanceof AjxCallback)) {
			callback.run(this._attachDialog);
		}
	}
};

ZmAppCtxt.prototype.addAttachmentDialogCallback =
function(callback) {
	if(!this._attachDialogCallback) {
		this._attachDialogCallback = [];
	}
	this._attachDialogCallback.push(callback);
};                                              

ZmAppCtxt.prototype.getUploadConflictDialog =
function() {
	if (!this._uploadConflictDialog) {
		AjxDispatcher.require(["NotebookCore", "Notebook"]);
		this._uploadConflictDialog = new ZmUploadConflictDialog(this._shell);
	}
	return this._uploadConflictDialog;
};

ZmAppCtxt.prototype.getNewBriefcaseDialog =
function() {
	if (!this._newBriefcaseDialog) {
		AjxDispatcher.require(["BriefcaseCore", "Briefcase"]);
		this._newBriefcaseDialog = new ZmNewBriefcaseDialog(this._shell);
	}
	return this._newBriefcaseDialog;
};

ZmAppCtxt.prototype.getReplaceDialog =
function() {
	if (!this._replaceDialog) {
		AjxDispatcher.require("Share");
		this._replaceDialog = new ZmFindnReplaceDialog(this._shell);
	}
	return this._replaceDialog;
};

ZmAppCtxt.prototype.getRootTabGroup =
function() {
	if (this.isChildWindow) {
		if (!this._childWinTabGrp) {
			this._childWinTabGrp = new DwtTabGroup("CHILD_WINDOW");
		}
	} else {		
		if (!this._rootTabGrp) {
			this._rootTabGrp = new DwtTabGroup("ROOT");
		}
	}
	return this.isChildWindow ? this._childWinTabGrp : this._rootTabGrp;
};

ZmAppCtxt.prototype.getShell =
function() {
	return this._shell;
};

ZmAppCtxt.prototype.setShell =
function(shell) {
	this._shell = shell;
};

ZmAppCtxt.prototype.setAccount =
function(account) {
	this._accounts[account.id] = account;
	if (account.isMain) {
		this._mainAccountId = account.id;
	}
	this.numAccounts++;
};

ZmAppCtxt.prototype.getZimbraAccounts =
function() {
	return this._accounts;
};

ZmAppCtxt.prototype.getAccount =
function(id) {
	return this._accounts[id];
};

ZmAppCtxt.prototype.getAccountByName =
function(name) {
	for (var i in this._accounts) {
		if (this._accounts[i].name == name) {
			return this._accounts[i];
		}
	}
	return null;
};

/**
 * Returns the main account for a multi-mbox login
 *
 * @param checkOfflineMode		[Boolean]	set to true if we want the first
 * non-main account. Applies to only when in offline mode since offline hides
 * the main account in a multi mbox scenario.
 */
ZmAppCtxt.prototype.getMainAccount =
function(checkOfflineMode) {
	for (var id in this._accounts) {
		var account = this._accounts[id];
		// if checking for offline mode, return the first non-main account
		if (checkOfflineMode && appCtxt.isOffline && appCtxt.multiAccounts) {
			if (!account.isMain) { return account; }
			continue;
		}
		if (account.isMain) { return account; }
	}
	return this._accounts[ZmZimbraAccount.DEFAULT_ID];
};

/**
 * Makes the given account the active one, which will then be used
 * when fetching any account-specific data such as settings or folder
 * tree. The account goes and fetches its data if necessary.
 *
 * @param account	[ZmZimbraAccount]		account to make active
 */
ZmAppCtxt.prototype.setActiveAccount =
function(account) {
	this._activeAccount = account;

	this._evt = this._evt || new ZmEvent();
	this._evt.account = account;
	this._evtMgr.notifyListeners("ACCOUNT", this._evt);
};

ZmAppCtxt.prototype.getActiveAccount =
function() {
	return this.isChildWindow ? parentAppCtxt._activeAccount : this._activeAccount;
};

ZmAppCtxt.prototype.addActiveAcountListener =
function(listener, index) {
	return this._evtMgr.addListener("ACCOUNT", listener, index);
};

ZmAppCtxt.prototype.getIdentityCollection =
function(account) {
	var context = this.isChildWindow ? window.opener : window;
	return context.AjxDispatcher.run("GetIdentityCollection", account);
};

ZmAppCtxt.prototype.getDataSourceCollection =
function(account) {
	var context = this.isChildWindow ? window.opener : window;
	return context.AjxDispatcher.run("GetDataSourceCollection", account);
};

ZmAppCtxt.prototype.getSignatureCollection =
function(account) {
	var context = this.isChildWindow ? window.opener : window;
	return context.AjxDispatcher.run("GetSignatureCollection", account);
};

ZmAppCtxt.prototype.getTree =
function(type, account) {
	if (this.isChildWindow) {
		return parentAppCtxt.getTree(type, account);
	}
	var id = account ? account.id : this._activeAccount ? this._activeAccount.id : ZmZimbraAccount.DEFAULT_ID;
	var acct = this._accounts[id];
	return acct ? acct.trees[ZmOrganizer.TREE_TYPE[type]] : null;
};

ZmAppCtxt.prototype.setTree =
function(type, tree, account) {
	var id = account ? account.id : this._activeAccount ? this._activeAccount.id : ZmZimbraAccount.DEFAULT_ID;
	if (this._accounts[id]) {
		this._accounts[id].trees[type] = tree;
	}
};

ZmAppCtxt.prototype.getFolderTree =
function(account) {
    return this.getTree(ZmOrganizer.FOLDER, account);
};

ZmAppCtxt.prototype.getTagTree =
function(account) {
	return this.getTree(ZmOrganizer.TAG, account);
};

ZmAppCtxt.prototype.getZimletTree =
function(account) {
	return this.getTree(ZmOrganizer.ZIMLET, account);
};

// Note: the username is an email address
ZmAppCtxt.prototype.getUsername =
function(account) { 
	return this.get(ZmSetting.USERNAME, account);
};

ZmAppCtxt.prototype.getUserDomain =
function(account) {
	if (!this.userDomain) {
		var username = this.getUsername(account);
		if (username) {
			var parts = username.split("@");
			this.userDomain = (parts && parts.length) ? parts[1] : "";
		}
	}
	return this.userDomain;
};

ZmAppCtxt.prototype.getUploadFrameId =
function() {
	if (!this._uploadManagerIframeId) {
		var iframeId = Dwt.getNextId();
		var html = [ "<iframe name='", iframeId, "' id='", iframeId,
			     "' src='", (AjxEnv.isIE && location.protocol == "https:") ? appContextPath+"/public/blank.html" : "javascript:\"\"",
			     "' style='position: absolute; top: 0; left: 0; visibility: hidden'></iframe>" ];
		var div = document.createElement("div");
		div.innerHTML = html.join("");
		document.body.appendChild(div.firstChild);
		this._uploadManagerIframeId = iframeId;
	}
	return this._uploadManagerIframeId;
};

ZmAppCtxt.prototype.getUploadManager = 
function() {
	if (!this._uploadManager) {
		// Create upload manager (for sending attachments)
		this._uploadManager = new AjxPost(this.getUploadFrameId());
	}
	return this._uploadManager;
};

ZmAppCtxt.prototype.getCurrentSearch =
function() { 
	return this.getCurrentApp().currentSearch;
};

ZmAppCtxt.prototype.getCurrentViewId =
function() {
	return this.getAppViewMgr().getCurrentViewId();
};

ZmAppCtxt.prototype.getCurrentView =
function() {
	return this.getAppViewMgr().getCurrentView();
};

ZmAppCtxt.prototype.getCurrentController =
function() {
	var view = this.getCurrentView();
	return (view && view.getController) ? view.getController() : null;
};

ZmAppCtxt.prototype.setCurrentList =
function(list) {
	this._list = list;
};

ZmAppCtxt.prototype.getCurrentList =
function() {
	var ctlr = this.getCurrentController();
	return (ctlr && ctlr.getList) ? ctlr.getList() : this._list ? this._list : null;
};

ZmAppCtxt.prototype.getNewWindow = 
function(fullVersion, width, height) {
	// build url
	var url = [];
	var i = 0;
	url[i++] = document.location.protocol;
	url[i++] = "//";
	url[i++] = document.domain;
	url[i++] = (!location.port || location.port == "80") ? "" : (":" + location.port);
	url[i++] = appContextPath;
	url[i++] = "/public/launchNewWindow.jsp?skin=";
	url[i++] = appCurrentSkin;
	url[i++] = "&localeId=";
	url[i++] = AjxEnv.DEFAULT_LOCALE || "";
	if (fullVersion) {
		url[i++] = "&full=1";
	}
	if (appDevMode) {
		url[i++] = "&dev=1";
	}

	width = width || 705;
	height = height || 465;
	var args = ["height=", height, ",width=", width, ",location=no,menubar=no,resizable=yes,scrollbars=no,status=yes,toolbar=no"].join("");
	var newWin = window.open(url.join(""), "_blank", args);

	if (!newWin) {
		this.setStatusMsg(ZmMsg.popupBlocker, ZmStatusView.LEVEL_CRITICAL);
	} else {
		// add this new window to global list so parent can keep track of child windows!
		return this.getAppController().addChildWindow(newWin);
	}
};

ZmAppCtxt.prototype.setItemCache =
function(cache) {
	this._itemCache = cache;
};

ZmAppCtxt.prototype.getItemCache =
function() {
	return this._itemCache;
};

ZmAppCtxt.prototype.cacheSet =
function(key, value) {
	if (this._itemCache)
		this._itemCache.set(key, value);
};

ZmAppCtxt.prototype.cacheGet =
function(key) {
	return this._itemCache ? this._itemCache.get(key) : null;
};

ZmAppCtxt.prototype.cacheRemove =
function(key) {
	this._itemCache.clear(key);
};

ZmAppCtxt.prototype.getById =
function(id) {
	return this._itemCache && this._itemCache.get(id) || (this.isChildWindow ? window.opener.appCtxt.getById(id) : null);
};

ZmAppCtxt.prototype.getKeyboardMgr =
function() {
	return this._shell.getKeyboardMgr();
};

ZmAppCtxt.prototype.getHistoryMgr =
function() {
	if (!this._historyMgr) {
		this._historyMgr = new AjxHistoryMgr();
	}
	return this._historyMgr;
};

ZmAppCtxt.prototype.zimletsPresent =
function() {
	return this._zimletsPresent;
};

ZmAppCtxt.prototype.setZimletsPresent =
function(zimletsPresent) {
	this._zimletsPresent = zimletsPresent;
};

ZmAppCtxt.prototype.getZimletMgr =
function() {
	if (!this._zimletMgr) {
		AjxDispatcher.require("Zimlet");
		this._zimletMgr = new ZmZimletMgr();
	}
	return this._zimletMgr;
};

ZmAppCtxt.prototype.areZimletsLoaded =
function() {
	return this._zimletsLoaded;
};

ZmAppCtxt.prototype.addZimletsLoadedListener =
function(listener, index) {
	if (!this._zimletsLoaded) {
		return this._evtMgr.addListener(ZmAppCtxt._ZIMLETS_EVENT, listener, index);
	}
};

ZmAppCtxt.prototype.allZimletsLoaded =
function() {
	this._zimletsLoaded = true;
	if (this._zimletMgr && !this.isChildWindow && appCtxt.get(ZmSetting.PORTAL_ENABLED)) {
		var portletMgr = this.getApp(ZmApp.PORTAL).getPortletMgr();
		if (portletMgr) {
			portletMgr.allZimletsLoaded();
		}
	}

	if (this.isOffline && !this.multiAccounts) {
		this.getAppController().setInstantNotify(true);
	}
	
	if (this._evtMgr.isListenerRegistered(ZmAppCtxt._ZIMLETS_EVENT)) {
		this._evtMgr.notifyListeners(ZmAppCtxt._ZIMLETS_EVENT, new ZmEvent());
		this._evtMgr.removeAll(ZmAppCtxt._ZIMLETS_EVENT);
	}
};

/**
 * Notifies zimlets if they are present and loaded.
 *
 * @param event				[string]	zimlet event (called as a zimlet function)
 * @param args				[array]		list of args to the function
 * @param options			[hash]*		hash of options:
 *        noChildWindow		[boolean]	if true, skip notify if we are in a child window
 *        waitUntilLoaded	[boolean]	if true and zimlets aren't yet loaded, add a listener
 * 										so that notify happens on load
 */
ZmAppCtxt.prototype.notifyZimlets =
function(event, args, options) {

	var context = this.isChildWindow ? parentAppCtxt : this;

	if (!context.zimletsPresent()) { return; }
	if (options && options.noChildWindow && this.isChildWindow) { return; }

	if (!context.areZimletsLoaded()) {
		if (options && options.waitUntilLoaded) {
			context.addZimletsLoadedListener(new AjxListener(this, this.notifyZimlets, [event, args]));
		}
		return;
	}

	this.getZimletMgr().notifyZimlets(event, args);
};

ZmAppCtxt.prototype.getCalManager =
function() {
	if (!this._calMgr) {
		this._calMgr = new ZmCalMgr(this._shell);
	}
	return this._calMgr;
};

ZmAppCtxt.prototype.getACL =
function(account, callback) {
	var id = account ? account.id : this._activeAccount ? this._activeAccount.id : ZmZimbraAccount.DEFAULT_ID;
	return this._accounts[id] && this._accounts[id].acl;
};

/**
 * Returns brief display version of the given shortcut
 *
 * @param keyMap	[string]	key map
 * @param shortcut	[string]	shortcut action
 */
ZmAppCtxt.prototype.getShortcutHint =
function(keyMap, shortcut) {
	
	var text = null;
	keyMap = keyMap || "global";
	while (!text && keyMap) {
		var scKey = [keyMap, shortcut, "display"].join(".");
		var text = AjxKeys[scKey] || ZmKeys[scKey];
		if (text) {
			// try to pick first single-character shortcut
			var list = text.split(/;\s*/);
			var sc = list[0];
			for (var i = 0; i < list.length; i++) {
				var s = list[i];
				if (s.indexOf(",") == -1) {
					sc = list[i];
					break;
				}
			}
			if (!sc) { return null; }
			sc = sc.replace(/\b[A-Z]\b/g, function(let) { return let.toLowerCase(); });
			text = [" [", sc.replace(",", ""), "]"].join("");
		} else {
			var key = [keyMap, "INHERIT"].join(".");
			keyMap = AjxKeys[key] || ZmKeys[key];
		}
	}

	return text;
};

ZmAppCtxt.prototype.getShortcutsPanel =
function() {
	if (!this._shortcutsPanel) {
		AjxDispatcher.require(["PreferencesCore", "Preferences"]);
		var style = this.isChildWindow ? ZmShortcutList.WINDOW_STYLE : ZmShortcutList.PANEL_STYLE;
		this._shortcutsPanel = new ZmShortcutsPanel(style);
	}
	return this._shortcutsPanel;
};

/**
 * Returns the skin hint for the given argument(s), which will be used to look
 * successively down the properties chain. For example, getSkinHint("a", "b")
 * will return the value of skin.hints.a.b
 */
ZmAppCtxt.prototype.getSkinHint =
function() {
	if (arguments.length == 0) return "";
	
	var cur = skin && skin.hints;
	if (!cur) { return ""; }
	for (var i = 0; i < arguments.length; i++) {
		var arg = arguments[i];
		if (!cur[arg]) { return ""; }
		cur = cur[arg];
	}
	return cur;
};

ZmAppCtxt.prototype.getAutocompleter =
function() {
	if (!this._autocompleter) {
		this._autocompleter = new ZmAutocomplete();
	}
	return this._autocompleter;
};

/**
 * Returns true if the given address belongs to the current user, including aliases.
 *
 * @param addr			[string]		address
 * @param allowLocal	[boolean]*		if true, domain is not required
 */
ZmAppCtxt.prototype.isMyAddress =
function(addr, allowLocal) {

	if (allowLocal && (addr.indexOf('@') == -1)) {
		addr = [addr, this.getUserDomain()].join("@");
	}
	
	if (addr == this.get(ZmSetting.USERNAME)) {
		return true;
	}

	var aliases = this.get(ZmSetting.MAIL_ALIASES);
	if (aliases && aliases.length) {
		for (var i = 0; i < aliases.length; i++) {
			if (addr == aliases[i])
				return true;
		}
	}

	return false;
};
