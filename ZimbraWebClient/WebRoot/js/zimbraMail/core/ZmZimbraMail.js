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
 * Creates a controller to run ZimbraMail. Do not call directly, instead use the run()
 * factory method.
 * @constructor
 * @class
 * This class is the "ubercontroller", as it manages all the apps as well as bootstrapping
 * the ZimbraMail application.
 *
 * @param params	[hash]			hash of params:
 *        app		[constant]		starting app
 *        userShell	[Element]		top-level skin container
 */
ZmZimbraMail = function(params) {

	ZmController.call(this, null);

	this._userShell = params.userShell;
	this._requestMgr = new ZmRequestMgr(this);

	// app event handling
	this._evt = new ZmAppEvent();
	this._evtMgr = new AjxEventMgr();
	// copy over any statically registered listeners
	for (var type in ZmZimbraMail._listeners) {
		var list = ZmZimbraMail._listeners[type];
		if (list && list.length) {
			for (var i = 0; i < list.length; i++) {
				this._evtMgr.addListener(type, list[i]);
			}
		}
	}

	// all subsequent calls to register static app listeners go to instance
	ZmZimbraMail.addListener = AjxCallback.simpleClosure(this.addListener, this);
	ZmZimbraMail.addAppListener = AjxCallback.simpleClosure(this.addAppListener, this);

	// ALWAYS set back reference into our world (also used by unload handler)
	window._zimbraMail = this;

	// setup history support
	if (appCtxt.get(ZmSetting.HISTORY_SUPPORT_ENABLED) && !AjxEnv.isSafari) {
		window.historyMgr = appCtxt.getHistoryMgr();
	}

	// settings structure and defaults
	this._settings = appCtxt.getSettings();
	var branch = appCtxt.get(ZmSetting.BRANCH);
    if (window.DBG && !DBG.isDisabled()) {
		DBG.setTitle("Debug (" + branch + ")");
    }

	appCtxt.setAppController(this);

	this._shell = appCtxt.getShell();

	this._apps = {};
	this._upsellView = {};
	this._activeApp = null;
	this._sessionTimer = new AjxTimedAction(null, ZmZimbraMail.logOff);
	this._sessionTimerId = -1;
	this._pollActionId = null;	// AjaxTimedAction ID of timer counting down to next poll time
	this._pollRequest = null;	// HTTP request of poll we've sent to server
	this._pollInstantNotifications = false; // if TRUE, we're in "instant notification" mode

	this.statusView = null;

	AjxDispatcher.setPackageLoadFunction("Zimlet", new AjxCallback(this, this._postLoadZimlet));

	AjxDispatcher.setPreLoadFunction(new AjxCallback(this, function() {
		this._appViewMgr.pushView(ZmId.VIEW_LOADING);
	}));
	AjxDispatcher.setPostLoadFunction(new AjxCallback(this, function() {
		this._appViewMgr._toRemove.push(ZmId.VIEW_LOADING);
	}));

	for (var i in ZmApp.QS_ARG) {
		ZmApp.QS_ARG_R[ZmApp.QS_ARG[i]] = i;
	}

	this.startup(params);
};

ZmZimbraMail.prototype = new ZmController;
ZmZimbraMail.prototype.constructor = ZmZimbraMail;

// REVISIT: This is done so that we when we switch from being "beta"
//          to production, we don't have to ensure that all of the
//          translations are changed at the same time. We can simply
//          remove the beta suffix from the app name.
ZmMsg.BETA_documents = [ZmMsg.documents, ZmMsg.beta].join(" ");

// dummy app (needed when defining drop targets in _registerOrganizers)
ZmApp.MAIN = "ZmZimbraMail";
ZmApp.DROP_TARGETS[ZmApp.MAIN] = {};

// Static listener registration
ZmZimbraMail._listeners = {};

// Public methods

ZmZimbraMail.prototype.toString =
function() {
	return "ZmZimbraMail";
};

/**
 * Sets up ZimbraMail, and then starts it by calling its constructor. It is assumed that the
 * CSFE is on the same host.
 *
 * @param params			[hash]			hash of params:
 *        app				[constant]*		starting app
 *        offlineMode		[boolean]*		if true, this is the offline client
 *        devMode			[boolean]*		if true, we are in development environment
 *        settings			[hash]*			server prefs/attrs
 *        protocolMode		[constant]*		http, https, or mixed
 *        noSplashScreen	[boolean]*		if true, do not show splash screen during startup
 */
ZmZimbraMail.run =
function(params) {

	if (!window.DBG) {
		ZmZimbraMail._createDummyDBG();
	}

	if (params.noSplashScreen) {
		ZmZimbraMail.killSplash();
	}

	// Create the global app context
	window.appCtxt = new ZmAppCtxt();
	appCtxt.rememberMe = false;

	// Handle offline mode
	if (params.offlineMode) {
		DBG.println(AjxDebug.DBG1, "OFFLINE MODE");
		appCtxt.isOffline = true;
	}

	// Create and initialize settings
	var settings = new ZmSettings();
	appCtxt.setSettings(settings);

	// Note: removing cookie support will affect zdesktop when connecting 4.x remote server
	if (params.offlineMode) {
		var apps = AjxCookie.getCookie(document, ZmSetting.APPS_COOKIE);
		DBG.println(AjxDebug.DBG1, "apps: " + apps);
		if (apps) {
			for (var appsetting in ZmSetting.APP_LETTER) {
				var letter = ZmSetting.APP_LETTER[appsetting];
				if (apps.indexOf(letter) != -1) {
					settings.getSetting(appsetting).setValue(true);
				}
			}
		}
	}

	if (params.settings) {
		for (var name in params.settings) {
			var id = settings.getSettingByName(name);
			if (id) {
				settings.getSetting(id).setValue(params.settings[name]);
			}
		}
	}

	// Create generic operations
	ZmOperation.initialize();

	// reset polling interval for offline
	if (appCtxt.isOffline) {
		appCtxt.set(ZmSetting.POLLING_INTERVAL, 60, null, null, true);
	}

	// Handle dev mode
	if (params.devMode == "1") {
		DBG.println(AjxDebug.DBG1, "DEV MODE");
		appCtxt.set(ZmSetting.DEV, true);
		appCtxt.set(ZmSetting.POLLING_INTERVAL, 0);
	}

	// Handle protocol mode - standardize on trailing :
	if (params.protocolMode) {
		var proto = (params.protocolMode.indexOf(":") == -1) ? params.protocolMode + ":" : params.protocolMode;
		appCtxt.set(ZmSetting.PROTOCOL_MODE, proto);
	}
	if (params.httpPort) {
		appCtxt.set(ZmSetting.HTTP_PORT, params.httpPort);
	}
	if (params.httpsPort) {
		appCtxt.set(ZmSetting.HTTPS_PORT, params.httpsPort);
	}

	if (/dogfood/.test(location.hostname) || (params.devMode == "1")) {
		AjxUtil.enableLogType("rpc", true);
	}

	// Create the shell
	var userShell = params.userShell = window.document.getElementById(ZmId.SKIN_SHELL);
	if (!userShell) {
		alert("Could not get user shell - skin file did not load properly");
	}
	var shell = new DwtShell({userShell:userShell, docBodyScrollable:false, id:ZmId.SHELL});
	appCtxt.setShell(shell);

	appCtxt.setItemCache(new AjxCache());

	// Go!
	new ZmZimbraMail(params);
};

/**
* Allows parent window to walk list of open child windows and either nuke them
* or "disable" them.
*/
ZmZimbraMail.unload =
function() {

	if (!ZmZimbraMail._endSessionDone) {
		ZmZimbraMail._endSession();
	}

	if (ZmZimbraMail._isLogOff) {
		ZmZimbraMail._isLogOff = false;
		// stop keeping track of user input (if applicable)
		if (window._zimbraMail) {
			window._zimbraMail.setSessionTimer(false);
		}

		ZmCsfeCommand.clearAuthToken();
	}

	var childWinList = window._zimbraMail ? window._zimbraMail._childWinList : null;
	if (childWinList) {
		// close all child windows
		for (var i = 0; i < childWinList.size(); i++) {
			var childWin = childWinList.get(i);
			childWin.win.onbeforeunload = null;
			childWin.win.parentController = null;
			childWin.win.close();
		}
	}
	window._zimbraMail = window.onload = window.onunload = window.onresize = window.document.onkeypress = null;
};

/**
 * Returns sort order using a and b as keys into given hash.
 *
 * @param hash		[hash]		hash with sort values
 * @param a			[string]	key into hash
 * @param b			[string]	key into hash
 */
ZmZimbraMail.hashSortCompare =
function(hash, a, b) {
	var appA = a ? Number(hash[a]) : 0;
	var appB = b ? Number(hash[b]) : 0;
	if (appA > appB) { return 1; }
	if (appA < appB) { return -1; }
	return 0;
};

/**
 * Hides the splash screen.
 */
ZmZimbraMail.killSplash =
function() {
	// 	Splash screen is now a part of the skin, loaded in statically via the JSP
	//	as a well-known ID.  To hide the splash screen, just hide that div.
	var splashDiv = Dwt.byId("skin_container_splash_screen");
	if (splashDiv) {
		Dwt.hide(splashDiv);
	}
};

/**
 * Startup part 1:
 * 	- check for skin, show it
 * 	- create app view mgr
 * 	- create components (sash, banner, user info, toolbar above overview, status view)
 * 	- create apps
 * 	- load user settings (GetInfoRequest)
 *
 * @param params		[hash]			hash of params:
 *        app			[constant]*		starting app
 *        isRelogin		[boolean]*		user has re-authenticated after session timeout
 *        settings		[hash]*			settings overrides
 */
ZmZimbraMail.prototype.startup =
function(params) {
	if (appCtxt.isOffline) {
		this.sendClientEventNotify(true);
	}

	appCtxt.inStartup = true;
	if (typeof(skin) == "undefined") {
		DBG.println(AjxDebug.DBG1, "No skin!");
	}

	if (!this._appViewMgr) {
		this._appViewMgr = new ZmAppViewMgr(this._shell, this, false, true);
	}

	skin.show("skin", true);
	if (!this._components) {
		this._components = {};
		this._components[ZmAppViewMgr.C_SASH] = new DwtSash({parent:this._shell, style:DwtSash.HORIZONTAL_STYLE,
															 className:"console_inset_app_l", threshold:20, id:ZmId.MAIN_SASH});
		this._components[ZmAppViewMgr.C_BANNER] = this._createBanner();
		if (!appCtxt.multiAccounts) {
			this._components[ZmAppViewMgr.C_USER_INFO] = this._userNameField =
				this._createUserInfo("BannerTextUser", ZmAppViewMgr.C_USER_INFO, ZmId.USER_NAME);
			this._components[ZmAppViewMgr.C_QUOTA_INFO] = this._usedQuotaField =
				this._createUserInfo("BannerTextQuota", ZmAppViewMgr.C_QUOTA_INFO, ZmId.USER_QUOTA);
		}
		this._components[ZmAppViewMgr.C_STATUS] = this.statusView =
			new ZmStatusView(this._shell, "ZmStatus", Dwt.ABSOLUTE_STYLE, ZmId.STATUS_VIEW);
	}

	this._createEnabledApps();
	this._registerOrganizers();

	// set up map of search types to item types
	for (var i in ZmSearch.TYPE) {
		ZmSearch.TYPE_MAP[ZmSearch.TYPE[i]] = i;
	}
	// organizer types based on view
	for (var i in ZmOrganizer.VIEWS) {
		var list = ZmOrganizer.VIEWS[i];
		for (var j = 0; j < list.length; j++) {
			ZmOrganizer.TYPE[list[j]] = i;
		}
	}

	// We've received canned SOAP responses for GetInfoRequest and SearchRequest from the
	// launch JSP, wrapped in a BatchRequest. Jiggle them so that they look like real
	// responses, and pass them along.
	if (params.batchInfoResponse) {
		var br = params.batchInfoResponse.Body.BatchResponse;
		if (br.GetInfoResponse) {
			var girJSON = params.getInfoResponse = {};
			girJSON.Body = {};
			girJSON.Body.GetInfoResponse = br.GetInfoResponse[0];
			girJSON.Header = params.batchInfoResponse.Header;
			if (girJSON.Header && girJSON.Header.context && girJSON.Header.context.session) {
				ZmCsfeCommand.setSessionId(girJSON.Header.context.session);
			}
			DBG.println(AjxDebug.DBG1, ["<H4> RESPONSE (from JSP tag)</H4>"].join(""), "GetInfoResponse");
			DBG.dumpObj(AjxDebug.DBG1, girJSON, -1);
		}
		if (br.SearchResponse) {
			var srJSON = params.searchResponse = {};
			srJSON.Body = {};
			srJSON.Body.SearchResponse = br.SearchResponse[0];
			DBG.println(AjxDebug.DBG1, ["<H4> RESPONSE (from JSP tag)</H4>"].join(""), "SearchResponse");
			DBG.dumpObj(AjxDebug.DBG1, srJSON, -1);
		}
	}

	this._getStartApp(params);

	this._postRenderCallbacks = [];
	this._postRenderLast = 0;
	if (params.startApp == ZmApp.MAIL) {
		this._doingPostRenderStartup = true;
		var callback = new AjxCallback(this,
			function() {
				AjxDispatcher.require("Startup2");
				if (appCtxt.get(ZmSetting.CALENDAR_ENABLED)) {
					this.handleCalendarComponents();
				}
				appCtxt.getSearchController().getSearchToolbar().initAutocomplete();
			});
		this.addPostRenderCallback(callback, 0, 0, true);
	}

	var respCallback = new AjxCallback(this, this._handleResponseLoadUserSettings, params);
	this._errorCallback = new AjxCallback(this, this._handleErrorStartup, params);
	this._settings.loadUserSettings(respCallback, this._errorCallback, null, params.getInfoResponse);
};

ZmZimbraMail.prototype.showMiniCalendar =
function() {
	var calMgr = appCtxt.getCalManager();
	calMgr.getMiniCalendar();
	appCtxt.getAppViewMgr().showTreeFooter(true);
    calMgr.highlightMiniCal();
};

ZmZimbraMail.prototype.showReminder =
function() {
	var calMgr = appCtxt.getCalManager();
	var reminderController = calMgr.getReminderController();
	reminderController.refresh();
};

ZmZimbraMail.prototype.handleOfflineMailTo =
function(uri, callback) {
	if (!appCtxt.get(ZmSetting.OFFLINE_IS_MAILTO_HANDLER)) { return false; }

	var mailApp = this.getApp(ZmApp.MAIL);
	var idx = (uri.indexOf("mailto"));
	if (idx >= 0) {
		var query = "to=" + decodeURIComponent(uri.substring(idx+7));
		query = query.replace(/\?/g, "&");

		mailApp._showComposeView(callback, query);
		return true;
	}
	return false;
};

ZmZimbraMail.prototype._handleErrorStartup =
function(params, ex) {
	ZmZimbraMail.killSplash();
	appCtxt.inStartup = false;
	return false;
};

ZmZimbraMail.prototype._handleResponseLoadUserSettings =
function(params, result) {
	if (appCtxt.multiAccounts) {
		var callback = new AjxCallback(this, this._handleResponseStartup, [params, result]);
		appCtxt.accountList.loadAccounts(callback);
	} else {
		this._handleResponseStartup(params, result);
	}
};

/**
 * Startup: part 2
 * 	- create app toolbar component
 * 	- determine and launch starting app
 *
 * @param params			[hash]			hash of params:
 *        app				[constant]		starting app
 *        settingOverrides	[Object]		hash of overrides of user settings
 * @param result			[ZmCsfeResult]	result object from load of user settings
 */
ZmZimbraMail.prototype._handleResponseStartup =
function(params, result) {

	if (params && params.settingOverrides) {
		this._needOverviewLayout = true;
		for (var id in params.settingOverrides) {
			var setting = this._settings.getSetting(id);
			if (setting) {
				setting.setValue(params.settingOverrides[id]);
			}
		}
	}

	if (!appCtxt.isOffline) {
		this.setPollInterval(true);
	} else {
		// bug fix #34342 - always register mailto handler for mac
		try {
			if (AjxEnv.isMac && window.platform && window.platform.isRegisteredProtocolHandler("mailto")) {
				this.registerMailtoHandler();
			}
		} catch(ex) {
			// do nothing.
		}
	}

	window.onbeforeunload = ZmZimbraMail._confirmExitMethod;

	if (!this._components[ZmAppViewMgr.C_APP_CHOOSER]) {
		this._components[ZmAppViewMgr.C_APP_CHOOSER] = this._appChooser = this._createAppChooser();
	}

	ZmApp.initialize();

    if(appCtxt.get(ZmSetting.DEFAULT_TIMEZONE)) {
        AjxTimezone.DEFAULT_RULE = AjxTimezone._guessMachineTimezone(appCtxt.get(ZmSetting.DEFAULT_TIMEZONE));
        AjxTimezone.DEFAULT = AjxTimezone.getClientId(AjxTimezone.DEFAULT_RULE.serverId);
    }

	this._evtMgr.notifyListeners(ZmAppEvent.PRE_STARTUP, this._evt);

	params.result = result;
	var respCallback = new AjxCallback(this, this._handleResponseStartup1, params);

	// startup and packages have been optimized for quick mail display
	if (this._doingPostRenderStartup) {
		this.addAppListener(params.startApp, ZmAppEvent.POST_RENDER, new AjxListener(this, this._postRenderStartup));
		this._searchResponse = params.searchResponse;
	} else {
		AjxDispatcher.require("Startup2");
	}

	// Set up post-render callbacks

	// run app-related startup functions
	var callback = new AjxCallback(this,
		function() {
			this.runAppFunction("startup", false, params.result);
		});
	this.addPostRenderCallback(callback, 2, 100, true);

	callback = new AjxCallback(this,
		function() {
			this._setupTabGroups();
			this.focusContentPane();
		});
	this.addPostRenderCallback(callback, 3, 100);

	// miscellaneous post-startup housekeeping
	callback = new AjxCallback(this,
		function() {
			AjxDispatcher.enableLoadFunctions(true);
			appCtxt.inStartup = false;
			this._evtMgr.notifyListeners(ZmAppEvent.POST_STARTUP, this._evt);

			// bug fix #31996
			if (appCtxt.isOffline) {
				appCtxt.getSearchController().resetSearchToolbar();
			}

			var contactListPkg = appCtxt.multiAccounts ? "GetContactsForAllAccounts" : "GetContacts";
			AjxDispatcher.run(contactListPkg);
		});
	this.addPostRenderCallback(callback, 5, 100);

	this.activateApp(params.startApp, false, respCallback, this._errorCallback, params);

	if (appCtxt.get(ZmSetting.CALENDAR_ENABLED) && !this._doingPostRenderStartup && (params.startApp != ZmApp.CALENDAR)) {
		this.handleCalendarComponents();
	}
};

// creates mini calendar and shows reminders on delay
ZmZimbraMail.prototype.handleCalendarComponents =
function() {
	if (appCtxt.get(ZmSetting.CAL_ALWAYS_SHOW_MINI_CAL)) {
        var miniCalAction = new AjxTimedAction(this, this.showMiniCalendar);
        AjxTimedAction.scheduleAction(miniCalAction, ZmCalendarApp.MINICAL_DELAY);
	}

	// reminder controlled by calendar preferences setting
	if (appCtxt.get(ZmSetting.CAL_REMINDER_WARNING_TIME) != 0) {
		var reminderAction = new AjxTimedAction(this, this.showReminder);
		AjxTimedAction.scheduleAction(reminderAction, ZmCalendarApp.REMINDER_START_DELAY);
	}
};

/**
 * Startup: part 3
 * 	- populate user info
 * 	- create search bar
 * 	- set up keyboard handling (shortcuts and tab groups)
 * 	- kill splash, show UI
 * 	- check license
 *
 * @param params			[hash]			hash of params:
 *        app				[constant]		starting app
 *        settingOverrides	[Object]		hash of overrides of user settings
 */
ZmZimbraMail.prototype._handleResponseStartup1 =
function(params) {

	this._setExternalLinks();
	this.setUserInfo();

	if (appCtxt.get(ZmSetting.SEARCH_ENABLED)) {
		this._components[ZmAppViewMgr.C_SEARCH] = appCtxt.getSearchController().getSearchPanel();
	}

	this.getKeyMapMgr();	// make sure keyboard handling is initialized

	this.setSessionTimer(true);
	ZmZimbraMail.killSplash();

	// Give apps a chance to add their own ui components.
	this.runAppFunction("addComponents", false, this._components);

	// next line makes the UI appear
	var viewComponents = this._appViewMgr._components;
	this._appViewMgr.addComponents(this._components, true);
	if (viewComponents) {
		// While adding the basic components we need to make sure the already
		// set view components are again fitted to perfection.
		this._appViewMgr.addComponents(viewComponents, true);
	}

	if (appCtxt.get(ZmSetting.LICENSE_STATUS) != ZmSetting.LICENSE_GOOD) {
		AjxDispatcher.require("Startup2");
		var dlg = appCtxt.getMsgDialog();
		dlg.reset();
		dlg.setMessage(ZmMsg.licenseExpired, DwtMessageDialog.WARNING_STYLE);
		dlg.popup();
	}

	if (!this._doingPostRenderStartup) {
		this._postRenderStartup();
	}
};

/**
 * The work to render the start app has been done. Now perform all the startup
 * work that remains - each piece of work is contained in a callback with an
 * associated order and delay.
 */
ZmZimbraMail.prototype._postRenderStartup =
function(ev) {
	this._postRenderCallbacks.sort(function(a, b) {
		return a.order - b.order;
	});
	this._runNextPostRenderCallback();
};

ZmZimbraMail.prototype._runNextPostRenderCallback =
function() {
	DBG.println(AjxDebug.DBG2, "POST-RENDER CALLBACKS: " + this._postRenderCallbacks.length);
	if (this._postRenderCallbacks && this._postRenderCallbacks.length) {
		var prcb = this._postRenderCallbacks.shift();
		if (!prcb) { return; }
		DBG.println(AjxDebug.DBG2, "POST-RENDER CALLBACK: #" + prcb.order + ", delay " + prcb.delay + " in " + prcb.callback.obj.toString());
		AjxTimedAction.scheduleAction(new AjxTimedAction(this,
			function() {
				prcb.callback.run();
				this._runNextPostRenderCallback();
			}), prcb.delay);
	} else {
		if (appCtxt.isOffline) {
			this.sendClientEventNotify(false);
		}
		if (appCtxt.multiAccounts) {
			this._resetUserInfo();
		}
	}
};

/**
 * Sets up a callback to be run after the starting app has rendered, if we're doing
 * post-render callbacks. The callback is registered with an order that determines
 * when it will run relative to other callbacks. A delay can also be given, so that
 * the UI has a chance to do some work between callbacks (they are called via
 * setTimeout).
 *
 * @param callback		[AjxCallback]		callback
 * @param order			[int]				run order for the callback
 * @param delay			[int]				how long to pause before running the callback
 * @param runNow		[boolean]*			if true and we're not doing post-render callbacks,
 * 											run the callback now and don't add it to the list
 */
ZmZimbraMail.prototype.addPostRenderCallback =
function(callback, order, delay, runNow) {
	if (!this._doingPostRenderStartup && runNow) {
		callback.run();
	} else {
		order = order || this._postRenderLast++;
		this._postRenderCallbacks.push({callback:callback, order:order, delay:delay || 0});
	}
};

ZmZimbraMail.prototype._getStartApp =
function(params) {
	// determine starting app
	var startApp;
	if (params && params.app) {
		startApp = ZmApp.QS_ARG_R[params.app.toLowerCase()];
		// make sure app given in QS is actually enabled
		var setting = ZmApp.SETTING[startApp];
		if (setting && !appCtxt.get(setting)) {
			startApp = null;
		}
	}
	if (!startApp) {
		for (var app in ZmApp.DEFAULT_SORT) {
			ZmApp.DEFAULT_APPS.push(app);
		}
		ZmApp.DEFAULT_APPS.sort(function(a, b) {
			return ZmZimbraMail.hashSortCompare(ZmApp.DEFAULT_SORT, a, b);
		});
		var defaultStartApp = null;
		for (var i = 0; i < ZmApp.DEFAULT_APPS.length; i++) {
			var app = ZmApp.DEFAULT_APPS[i];
			var setting = ZmApp.SETTING[app];
			if (!setting || appCtxt.get(setting)) {
				defaultStartApp = app;
				break;
			}
		}
		startApp = (params && params.isRelogin && this._activeApp) ? this._activeApp : defaultStartApp;
	}

	// parse query string, in case we are coming in with a deep link	
	var qsParams = AjxStringUtil.parseQueryString();
	if (qsParams && qsParams.view && !qsParams.app) {
		startApp = ZmApp.QS_VIEWS[qsParams.view];
	}

	params.startApp = startApp;
	params.qsParams = qsParams;
};

/**
* Performs a 'running restart' of the app by clearing state and calling the startup method.
* This method is run after a logoff, or a change in what's supported.
*/
ZmZimbraMail.prototype.restart =
function(settings) {
	// need to decide what to clean up, what to have startup load lazily
	// could have each app do shutdown()
	DBG.println(AjxDebug.DBG1, "RESTARTING APP");
	this.reset();
	this.startup({settingOverrides:settings});
};

ZmZimbraMail.prototype.reset =
function() {
	ZmCsfeCommand.setSessionId(null);	// so we get a refresh block
	this._highestNotifySeen = 0; 		// we have a new session

	appCtxt.accountList.resetTrees();

	if (!appCtxt.rememberMe()) {
		appCtxt.getLoginDialog().clearAll();
	}
	for (var app in this._apps) {
		this._apps[app] = null;
	}
	this._activeApp = null;
	this._appViewMgr.reset();
};

ZmZimbraMail.prototype.cancelRequest =
function(reqId, errorCallback, noBusyOverlay) {
	this._requestMgr.cancelRequest(reqId, errorCallback, noBusyOverlay);
};

ZmZimbraMail.prototype.sendRequest =
function(params) {
	return this._requestMgr.sendRequest(params);
};

/**
 * Runs the given function for all enabled apps, passing args.
 *
 * @param funcName		[string]	function name
 * @param force			[boolean]*	if true, run func for disabled apps as well
 */
ZmZimbraMail.prototype.runAppFunction =
function(funcName, force) {
	var args = [];
	for (var i = 2; i < arguments.length; i++) {
		args.push(arguments[i]);
	}
	for (var i = 0; i < ZmApp.APPS.length; i++) {
		var appName = ZmApp.APPS[i];
		var setting = ZmApp.SETTING[appName];
		if (!setting || appCtxt.get(setting) || force) {
			var app = appCtxt.getApp(appName);
			var func = app && app[funcName];
			if (func && (typeof(func) == "function")) {
				func.apply(app, args);
			}
		}
	}
};

/**
 * Instantiates enabled apps. An optional argument may be given limiting the set
 * of apps that may be created.
 *
 * @param apps	[hash]*		the set of apps to create
 */
ZmZimbraMail.prototype._createEnabledApps =
function(apps) {
	for (var app in ZmApp.CLASS) {
		if (!apps || apps[app]) {
			ZmApp.APPS.push(app);
		}
	}
	ZmApp.APPS.sort(function(a, b) {
		return ZmZimbraMail.hashSortCompare(ZmApp.LOAD_SORT, a, b);
	});

	// Instantiate enabled apps, which will invoke app registration.
	// We also create "upsell" apps, which will only show the content of a URL in an iframe,
	// to encourage the user to upgrade.
	for (var i = 0; i < ZmApp.APPS.length; i++) {
		var app = ZmApp.APPS[i];
		var appEnabled = ZmApp.SETTING[app] && appCtxt.get(ZmApp.SETTING[app]);
		var upsellEnabled = ZmApp.UPSELL_SETTING[app] && appCtxt.get(ZmApp.UPSELL_SETTING[app]);
		if (appEnabled || upsellEnabled) {
			ZmApp.ENABLED_APPS[app] = true;
			this._createApp(app);
			this._apps[app].isUpsell = (!appEnabled && upsellEnabled);
		}
	}
};

/**
 * Static function to add a listener before this class has been instantiated.
 * During construction, listeners are copied to the event manager. This function
 * could be used by a skin, for example.
 *
 * @param type		[constant]		event type
 * @param listener	[AjxListener]	a listener
 */
ZmZimbraMail.addListener =
function(type, listener) {
	if (!ZmZimbraMail._listeners[type]) {
		ZmZimbraMail._listeners[type] = [];
	}
	ZmZimbraMail._listeners[type].push(listener);
};

/**
 * Static function to add an app listener before this class has been
 * instantiated. This is separate from {@link ZmZimbraMail#addListener}
 * so that the caller doesn't need to know the specifics of how we
 * twiddle the type name for app events.
 */
ZmZimbraMail.addAppListener =
function(appName, type, listener) {
	type = [appName, type].join("_");
	ZmZimbraMail.addListener(type, listener);
};

/**
 * Adds a listener for the given event type.
 *
 * @param type		[constant]		event type
 * @param listener	[AjxListener]	a listener
 */
ZmZimbraMail.prototype.addListener =
function(type, listener) {
	return this._evtMgr.addListener(type, listener);
};

/**
 * Removes a listener for the given event type.
 *
 * @param type		[constant]		event type
 * @param listener	[AjxListener]	a listener
 */
ZmZimbraMail.prototype.removeListener =
function(type, listener) {
	return this._evtMgr.removeListener(type, listener);
};

/**
 * Adds a listener for the given event type and app.
 *
 * @param app		[constant]		app name
 * @param type		[constant]		event type
 * @param listener	[AjxListener]	a listener
 */
ZmZimbraMail.prototype.addAppListener =
function(app, type, listener) {
	type = [app, type].join("_");
	return this.addListener(type, listener);
};

/**
 * Removes a listener for the given event type and app.
 *
 * @param app		[constant]		app name
 * @param type		[constant]		event type
 * @param listener	[AjxListener]	a listener
 */
ZmZimbraMail.prototype.removeAppListener =
function(app, type, listener) {
	type = [app, type].join("_");
	return this.removeListener(type, listener);
};

/**
 * Send a NoOpRequest to the server.  Used for '$set:noop'
 */
ZmZimbraMail.prototype.sendNoOp =
function() {
	var soapDoc = AjxSoapDoc.create("NoOpRequest", "urn:zimbraMail");
	var accountName = appCtxt.isOffline && appCtxt.accountList.mainAccount.name;
	this.sendRequest({soapDoc:soapDoc, asyncMode:true, noBusyOverlay:true, accountName:accountName});
};

ZmZimbraMail.prototype.sendClientEventNotify =
function(loadBegin) {
	var params = {
		jsonObj: {
			ClientEventNotifyRequest: {
				_jsns:"urn:zimbraOffline",
				e: loadBegin ? "ui_load_begin" : "ui_load_end"
			}
		},
		callback: (new AjxCallback(this, this.setInstantNotify, true)),
		asyncMode:true,
		noBusyOverlay:true
	};
	this.sendRequest(params);
};

/**
 * Put the client into "instant notifications" mode.
 * @param on				[Boolean]*		turn on instant notify
 */
ZmZimbraMail.prototype.setInstantNotify =
function(on) {
	if (on) {
		this._pollInstantNotifications = true;
		// set nonzero poll interval so cant ever get into a full-speed request loop
		this._pollInterval = appCtxt.get(ZmSetting.INSTANT_NOTIFY_INTERVAL);
		if (this._pollActionId) {
			AjxTimedAction.cancelAction(this._pollActionId);
			this._pollActionId = null;
		}
		this._kickPolling(true);
	} else {
		this._pollInstantNotifications = false;
		this._cancelInstantNotify();
		this.setPollInterval(true);
	}
};

ZmZimbraMail.prototype.getInstantNotify =
function() {
	return this._pollInstantNotifications;
};

ZmZimbraMail.prototype.registerMailtoHandler =
function() {
	if (appCtxt.get(ZmSetting.OFFLINE_SUPPORTS_MAILTO) &&
		appCtxt.get(ZmSetting.OFFLINE_IS_MAILTO_HANDLER))
	{
		try { // add try/catch - see bug #33870
			// register mailto: handler
			if (AjxEnv.isMac || !window.platform.isRegisteredProtocolHandler("mailto")) {
				var callback = AjxCallback.simpleClosure(this.handleOfflineMailTo, this);
				var url = appCtxt.get(ZmSetting.OFFLINE_WEBAPP_URI, null, appCtxt.accountList.mainAccount);
				window.platform.registerProtocolHandler("mailto", url+"&mailto=%s", callback);
			}
		} catch(ex) {
			// do nothing
		}
	}
};

/**
 * Resets the interval between poll requests, based on what's in the settings,
 * only if we are not in instant notify mode.
 *
 * @param kickMe	[boolean]*		if true, start the poll timer
 */
ZmZimbraMail.prototype.setPollInterval =
function(kickMe) {
	if (!this._pollInstantNotifications) {
		this._pollInterval = appCtxt.get(ZmSetting.POLLING_INTERVAL) * 1000;

		if (this._pollInterval) {
			DBG.println(AjxDebug.DBG1, "poll interval = " + this._pollInterval + "ms");
			if (kickMe)
				this._kickPolling(true);
		} else {
			// cancel timer if it is waiting...
			if (this._pollActionId) {
				AjxTimedAction.cancelAction(this._pollActionId);
				this._pollActionId = null;
			}
		}
		return true;
	} else {
		this._pollInterval = appCtxt.get(ZmSetting.INSTANT_NOTIFY_INTERVAL);
		DBG.println(AjxDebug.DBG1, "Ignoring Poll Interval (in instant-notify mode)");
		return false;
	}
};

ZmZimbraMail.prototype._cancelInstantNotify =
function() {
	if (this._pollRequest) {
		this._requestMgr.cancelRequest(this._pollRequest);
		this._pollRequest = null;
	}

	if (this._pollActionId) {
		AjxTimedAction.cancelAction(this._pollActionId);
		this._pollActionId = null;
	}
};

/*
 * Make sure the polling loop is running.  Basic flow:
 *
 *       1) kickPolling():
 *             - cancel any existing timers
 *             - set a timer for _pollInterval time
 *             - call execPoll() when the timer goes off
 *
 *       2) execPoll():
 *             - make the NoOp request, if we're in "instant notifications"
 *               mode, this request will hang on the server until there is more data,
 *               otherwise it will return immediately.  Call into a handle() func below
 *
 *       3) handleDoPollXXXX():
 *             - call back to kickPolling() above
 *
 * resetBackoff = TRUE e.g. if we've just received a successful
 * response from the server, or if the user just changed our
 * polling settings and we want to start in fast mode
 */
ZmZimbraMail.prototype._kickPolling =
function(resetBackoff) {
	DBG.println(AjxDebug.DBG2, [
		"ZmZimbraMail._kickPolling ",
		this._pollInterval, ", ",
		this._pollActionId, ", ",
		this._pollRequest ? "request_pending" : "no_request_pending"
	].join(""));

	// reset the polling timeout
	if (this._pollActionId) {
		AjxTimedAction.cancelAction(this._pollActionId);
		this._pollActionId = null;
	}

	if (resetBackoff && this._pollInstantNotifications) {
		// we *were* backed off -- reset the delay back to 1s fastness
		var interval = appCtxt.get(ZmSetting.INSTANT_NOTIFY_INTERVAL);
		if (this._pollInterval > interval)
			this._pollInterval = interval;
	}

	if (this._pollInterval && !this._pollRequest) {
		try {
			this._pollActionId = AjxTimedAction.scheduleAction(new AjxTimedAction(this, this._execPoll), this._pollInterval);
		} catch (ex) {
			this._pollActionId = null;
			DBG.println(AjxDebug.DBG1, "Caught exception in ZmZimbraMail._kickPolling.  Polling chain broken!");
		}
	}
};

/*
 * We've finished waiting, do the actual poll itself
 */
ZmZimbraMail.prototype._execPoll =
function() {
	this._cancelInstantNotify();

	// It'd be more efficient to make these instance variables, but for some
	// reason that breaks polling in IE.
	var soapDoc = AjxSoapDoc.create("NoOpRequest", "urn:zimbraMail");
	try {
		if (this._pollInstantNotifications) {
			var method = soapDoc.getMethod();
			method.setAttribute("wait", 1);
			method.setAttribute("limitToOneBlocked", 1);
		}
		var params = {
			soapDoc: soapDoc,
			asyncMode: true,
			callback: new AjxCallback(this, this._handleResponseDoPoll),
			errorCallback: new AjxCallback(this, this._handleErrorDoPoll),
			noBusyOverlay: true,
			timeout: appCtxt.get(ZmSetting.INSTANT_NOTIFY_TIMEOUT),
			accountName: appCtxt.isOffline && appCtxt.accountList.mainAccount.name
		};
		this._pollRequest = this.sendRequest(params);
	} catch (ex) {
		this._handleErrorDoPoll(ex); // oops!
	}
};

ZmZimbraMail.prototype._handleErrorDoPoll =
function(ex) {
	if (this._pollRequest) {
		// reset the polling timeout
		if (this._pollActionId) {
			AjxTimedAction.cancelAction(this._pollActionId);
			this._pollActionId = null;
		}
		this._requestMgr.cancelRequest(this._pollRequest);
		this._pollRequest = null;
	}

	if (this._pollInstantNotifications) {
		// very simple-minded exponential backoff
		this._pollInterval *= 2;
		if (this._pollInterval > (1000 * 60 * 2)) {
			this._pollInterval = 1000 * 60 * 2;
		}
	}

	var isAuthEx = (ex.code == ZmCsfeException.SVC_AUTH_EXPIRED ||
					ex.code == ZmCsfeException.SVC_AUTH_REQUIRED ||
					ex.code == ZmCsfeException.NO_AUTH_TOKEN);

	// restart poll timer if we didn't get an auth exception
	if (!isAuthEx) {
		this._kickPolling(false);
	}

	return !isAuthEx;
};

ZmZimbraMail.prototype._handleResponseDoPoll =
function(result) {
	this._pollRequest = null;
	var noopResult = result.getResponse().NoOpResponse;
	if (noopResult.waitDisallowed) {
		// revert to polling mode - server doesn't want us to use instant notify.
		this.setInstantNotify(false);
	}  else {
		// restart poll timer if we didn't get an exception
		this._kickPolling(true);
	}
};

ZmZimbraMail.prototype.getKeyMapMgr =
function() {
	var kbMgr = appCtxt.getKeyboardMgr();
	if (!kbMgr.__keyMapMgr) {
		this._initKeyboardHandling();
	}
	return kbMgr.__keyMapMgr;
};

ZmZimbraMail.prototype._initKeyboardHandling =
function() {
	var kbMgr = appCtxt.getKeyboardMgr();
	if (kbMgr.__keyMapMgr) { return; }
	if (appCtxt.get(ZmSetting.USE_KEYBOARD_SHORTCUTS)) {
		// Register our keymap and global key action handler with the shell's keyboard manager
		kbMgr.enable(true);
		kbMgr.registerKeyMap(new ZmKeyMap());
		kbMgr.pushDefaultHandler(this);
	} else {
		kbMgr.enable(false);
	}
};

ZmZimbraMail.prototype._setupTabGroups =
function() {
	DBG.println(AjxDebug.DBG2, "SETTING SEARCH CONTROLLER TAB GROUP");
	var rootTg = appCtxt.getRootTabGroup();
	if (appCtxt.get(ZmSetting.SEARCH_ENABLED)) {
		rootTg.addMember(appCtxt.getSearchController().getTabGroup());
	}
	this._components[ZmAppViewMgr.C_APP_CHOOSER].noFocus = true;

	var curApp = appCtxt.getCurrentApp();
	var ovId = curApp && curApp.getOverviewId();
	var overview = ovId && appCtxt.getOverviewController().getOverview(ovId);
	if (overview) {
		rootTg.addMember(overview);
		ZmController._currentOverview = overview;
	}
	
	appCtxt.getKeyboardMgr().setTabGroup(rootTg);
};

ZmZimbraMail.prototype._registerOrganizers =
function() {

	ZmOrganizer.registerOrg(ZmOrganizer.FOLDER,
							{app:				ZmApp.MAIL,
							 nameKey:			"folder",
							 defaultFolder:		ZmOrganizer.ID_INBOX,
							 soapCmd:			"FolderAction",
							 firstUserId:		256,
							 orgClass:			"ZmFolder",
							 orgPackage:		"MailCore",
							 treeController:	"ZmMailFolderTreeController",
							 labelKey:			"folders",
							 itemsKey:			"messages",
							 hasColor:			true,
							 defaultColor:		ZmOrganizer.C_NONE,
							 treeType:			ZmOrganizer.FOLDER,
							 dropTargets:		[ZmOrganizer.FOLDER],
							 views:				["message", "conversation"],
							 folderKey:			"mailFolder",
							 mountKey:			"mountFolder",
							 createFunc:		"ZmOrganizer.create",
							 compareFunc:		"ZmFolder.sortCompare",
							 newOp:				ZmOperation.NEW_FOLDER,
							 displayOrder:		100,
							 openSetting:		ZmSetting.FOLDER_TREE_OPEN
							});

	ZmOrganizer.registerOrg(ZmOrganizer.SEARCH,
							{app:				ZmApp.MAIN,
							 nameKey:			"savedSearch",
							 precondition:		ZmSetting.SAVED_SEARCHES_ENABLED,
							 soapCmd:			"FolderAction",
							 firstUserId:		256,
							 orgClass:			"ZmSearchFolder",
							 treeController:	"ZmSearchTreeController",
							 labelKey:			"searches",
							 treeType:			ZmOrganizer.FOLDER,
 							 dropTargets:		[ZmOrganizer.FOLDER, ZmOrganizer.SEARCH],
							 createFunc:		"ZmSearchFolder.create",
							 compareFunc:		"ZmFolder.sortCompare",
							 openSetting:		ZmSetting.SEARCH_TREE_OPEN,
							 displayOrder:		300
							});

	ZmOrganizer.registerOrg(ZmOrganizer.TAG,
							{app:				ZmApp.MAIN,
							 nameKey:			"tag",
							 precondition:		ZmSetting.TAGGING_ENABLED,
							 soapCmd:			"TagAction",
							 firstUserId:		64,
							 orgClass:			"ZmTag",
							 treeController:	"ZmTagTreeController",
							 hasColor:			true,
							 defaultColor:		ZmOrganizer.C_ORANGE,
							 labelKey:			"tags",
							 treeType:			ZmOrganizer.TAG,
							 createFunc:		"ZmTag.create",
							 compareFunc:		"ZmTag.sortCompare",
							 newOp:				ZmOperation.NEW_TAG,
							 openSetting:		ZmSetting.TAG_TREE_OPEN,
							 displayOrder:		400
							});

	ZmOrganizer.registerOrg(ZmOrganizer.ZIMLET,
							{orgClass:			"ZmZimlet",
							 treeController:	"ZmZimletTreeController",
							 labelKey:			"zimlets",
							 compareFunc:		"ZmZimlet.sortCompare",
							 openSetting:		ZmSetting.ZIMLET_TREE_OPEN,
							 hideEmpty:			true
							});
	
	// Technically, we don't need to do this because the drop listeners for dragged organizers typically do their
	// own checks on the class of the dragged object. But it's better to do it anyway, in case it ever gets
	// validated within the drop target against the valid types.
	this._name = ZmApp.MAIN;
	ZmApp.prototype._setupDropTargets.call(this);
};

/**
* Returns a handle to the given app.
*
* @param appName	an app name
*/
ZmZimbraMail.prototype.getApp =
function(appName) {
	if (!ZmApp.ENABLED_APPS[appName]) {
		return null;
	}
	if (!this._apps[appName]) {
		this._createApp(appName);
	}
	return this._apps[appName];
};

/**
* Returns a handle to the app view manager.
*/
ZmZimbraMail.prototype.getAppViewMgr =
function() {
	return this._appViewMgr;
};

ZmZimbraMail.prototype.getActiveApp =
function() {
	return this._activeApp;
};

ZmZimbraMail.prototype.getPreviousApp =
function() {
	return this._previousApp;
};

/**
 * Activates the given app.
 *
 * @param appName		[constant]		application
 * @param force			[boolean]*		if true, launch the app
 * @param callback		[AjxCallback]*	callback
 * @param errorCallback	[AjxCallback]*	error callback
 * @param params		[hash]*			hash of params:		(see startup functions for full list)
 *        checkQS		[boolean]*		if true, check query string for launch args
 *        result		[ZmCsfeResult]	result object from load of user settings
 */
ZmZimbraMail.prototype.activateApp =
function(appName, force, callback, errorCallback, params) {
	DBG.println(AjxDebug.DBG1, "activateApp: " + appName + ", current app = " + this._activeApp);

	var view = this._appViewMgr.getAppView(appName);
	if (view && !force) {
		// if the app has been launched, make its view the current one
		DBG.println(AjxDebug.DBG3, "activateApp, current " + appName + " view: " + view);
		if (this._appViewMgr.pushView(view)) {
			this._appViewMgr.setAppView(appName, view);
            if (!appCtxt.get(ZmApp.SETTING[appName]) && appCtxt.get(ZmApp.UPSELL_SETTING[appName])) {
                var title = [ZmMsg.zimbraTitle, appName].join(": ");
                Dwt.setTitle(title);
            }            
		}
		if (callback) {
			callback.run();
		}
	} else {
		// launch the app
		if (!this._apps[appName]) {
			this._createApp(appName);
		}

		if (!appCtxt.get(ZmApp.SETTING[appName]) &&
			appCtxt.get(ZmApp.UPSELL_SETTING[appName]))
		{
			this._createUpsellView(appName);
		}
		else
		{
			DBG.println(AjxDebug.DBG1, "Launching app " + appName);
			var respCallback = new AjxCallback(this, this._handleResponseActivateApp, [callback, appName]);
			var eventType = [appName, ZmAppEvent.PRE_LAUNCH].join("_");
			this._evt.item = this._apps[appName];
			this._evtMgr.notifyListeners(eventType, this._evt);
			params = params || {};
			params.searchResponse = this._searchResponse;
			this._apps[appName].launch(params, respCallback);
			delete this.searchResponse;
		}
	}
};

ZmZimbraMail.prototype._handleResponseActivateApp =
function(callback, appName) {
	if (callback) {
		callback.run();
	}

	if (ZmApp.DEFAULT_SEARCH[appName]) {
		appCtxt.getSearchController().setDefaultSearchType(ZmApp.DEFAULT_SEARCH[appName]);
	}

	var eventType = [appName, ZmAppEvent.POST_LAUNCH].join("_");
	this._evt.item = this._apps[appName];
	this._evtMgr.notifyListeners(eventType, this._evt);
};

/**
* Handles a change in which app is current. The change will be reflected in the
* current app toolbar and the overview. The previous and newly current apps are
* notified of the change. This method is called after a new view is pushed.
*
* @param appName	[constant]	the newly current app
* @param view		[constant]	the newly current view
*/
ZmZimbraMail.prototype.setActiveApp =
function(appName, view, isTabView) {

	// update app chooser
	if (!isTabView) {
		this._components[ZmAppViewMgr.C_APP_CHOOSER].setSelected(appName);
	}

	// app not actually enabled if this is result of upsell view push
	var appEnabled = !ZmApp.SETTING[appName] || appCtxt.get(ZmApp.SETTING[appName]);

	this._activeTabId = null;	// app is active; tab IDs are for non-apps

	if (this._activeApp != appName) {
		// deactivate previous app
	    if (this._activeApp) {
			// some views are not stored in _apps collection, so check if it exists.
			var app = this._apps[this._activeApp];
			if (app) {
				app.activate(false, view);
			}
			this._previousApp = this._activeApp;
		}

		// switch app
		this._activeApp = appName;
		if (appEnabled) {
			var app = this._apps[this._activeApp];

			if (appCtxt.get(ZmSetting.SEARCH_ENABLED)) {
				var searchType = app ? app.getInitialSearchType() : null;
				if (!searchType) {
					searchType = ZmApp.DEFAULT_SEARCH[appName];
				}
				if (searchType) {
					appCtxt.getSearchController().setDefaultSearchType(searchType);
				}

				// set search string value to match current app's last search, if applicable
				var stb = appCtxt.getSearchController().getSearchToolbar();
				if (appCtxt.get(ZmSetting.SHOW_SEARCH_STRING) && stb) {
					var value = app.currentSearch ? app.currentSearch.query : app.currentQuery;
					stb.setSearchFieldValue(value || "");
				}
			}

			// activate current app - results in rendering of overview
			if (app) {
				if (appCtxt.inStartup && this._doingPostRenderStartup) {
					var callback = new AjxCallback(this,
						function() {
							app.activate(true);
						});
					this.addPostRenderCallback(callback, 1, 100, true);
				} else {
					app.activate(true);
				}
			}
		}
		this._evt.item = this._apps[appName];
		this._evtMgr.notifyListeners(ZmAppEvent.ACTIVATE, this._evt);
	}
};

ZmZimbraMail.prototype.getAppChooserButton =
function(id) {
	return this._components[ZmAppViewMgr.C_APP_CHOOSER].getButton(id);
};

/**
 * An app calls this once it has fully rendered, so that we may notify
 * any listeners.
 */
ZmZimbraMail.prototype.appRendered =
function(appName) {
	var eventType = [appName, ZmAppEvent.POST_RENDER].join("_");
	this._evtMgr.notifyListeners(eventType, this._evt);

	if (window._facadeCleanup) {
		window._facadeCleanup();
		window._facadeCleanup = null;
	}
};

ZmZimbraMail.prototype.addApp = function(app) {
	var appName = app.getName();
	this._apps[appName] = app;
	ZmApp.ENABLED_APPS[appName] = true;
};

// Private methods

// Creates an app object, which doesn't necessarily do anything just yet.
ZmZimbraMail.prototype._createApp =
function(appName) {
	if (!appName || this._apps[appName]) return;
	DBG.println(AjxDebug.DBG1, "Creating app " + appName);
	var appClass = eval(ZmApp.CLASS[appName]);
	this.addApp(new appClass(this._shell));
};

ZmZimbraMail.prototype._setExternalLinks =
function() {
	var el = document.getElementById("skin_container_links");
	if (el) {
		var data = {
			showOfflineLink: (!appCtxt.isOffline && appCtxt.get(ZmSetting.SHOW_OFFLINE_LINK)),
			helpIcon: (appCtxt.getSkinHint("helpButton", "hideIcon") ? null : "Help"),
			logoutIcon: (appCtxt.getSkinHint("logoutButton", "hideIcon") ? null : "Logoff"),
			logoutText: (appCtxt.isOffline ? ZmMsg.setup : ZmMsg.logOff)
		};
		el.innerHTML = AjxTemplate.expand("share.App#UserInfo", data);
	}
};

ZmZimbraMail.prototype.setUserInfo =
function() {
	if (appCtxt.multiAccounts || appCtxt.isOffline) { return; }

	// username
	var login = appCtxt.get(ZmSetting.USERNAME);
	var username = (appCtxt.get(ZmSetting.DISPLAY_NAME)) || login;
	if (username) {
		this._userNameField.getHtmlElement().innerHTML = username;
		if (AjxEnv.isLinux) {	// bug fix #3355
			this._userNameField.getHtmlElement().style.lineHeight = "13px";
		}
	}

	// quota
	var usedQuota = (appCtxt.get(ZmSetting.QUOTA_USED)) || 0;

	var data = {
		id: this._usedQuotaField._htmlElId,
		login: login,
		username: username,
		quota: appCtxt.get(ZmSetting.QUOTA),
		usedQuota: usedQuota,
		size: (AjxUtil.formatSize(usedQuota, false, 1))
	};

	var quotaTemplateId;
	if (data.quota) {
		quotaTemplateId = 'UsedLimited';
		data.limit = AjxUtil.formatSize(data.quota, false, 1);
		data.percent = Math.min(Math.round((data.usedQuota / data.quota) * 100), 100);
		data.desc = AjxMessageFormat.format(ZmMsg.quotaDescLimited, [data.percent+'%', data.limit]);
	}
	else {
		data.desc = AjxMessageFormat.format(ZmMsg.quotaDescUnlimited, [data.size]);
		quotaTemplateId = 'UsedUnlimited';
	}
	this._usedQuotaField.getHtmlElement().innerHTML = AjxTemplate.expand('share.Quota#'+quotaTemplateId, data);

	// tooltip for username/quota fields
	var html = (username != login || data.quota > 0)
		? AjxTemplate.expand('share.Quota#Tooltip', data) : null;
	this._components[ZmAppViewMgr.C_USER_INFO].setToolTipContent(html);
	this._components[ZmAppViewMgr.C_QUOTA_INFO].setToolTipContent(html);
};

/**
 * A bit of a hack to remove user/quota info for zdesktop
 */
ZmZimbraMail.prototype._resetUserInfo =
function() {
	var usernameEl = document.getElementById("skin_container_username");
	if (usernameEl) {
		Dwt.setDisplay(usernameEl, Dwt.DISPLAY_NONE);
	}

	var quotaEl = document.getElementById("skin_container_quota");
	if (quotaEl) {
		Dwt.setDisplay(quotaEl, Dwt.DISPLAY_NONE);
	}

	var accountEl = document.getElementById("skin_container_account");
	if (accountEl) {
		accountEl.innerHTML = ZmMsg.accounts;
		Dwt.setDisplay(accountEl, Dwt.DISPLAY_BLOCK);
	}

	var topTreeEl = document.getElementById("skin_container_tree_top");
	if (topTreeEl) {
		topTreeEl.className = "OfflineTreeTop";
	}

	this._appViewMgr._fitToContainer([ZmAppViewMgr.C_TREE, ZmAppViewMgr.C_TREE_FOOTER]);
};


// Listeners

ZmZimbraMail.logOff =
function() {
	ZmZimbraMail._isLogOff = true;

	// bug fix #36791 - reset the systray icon when returning to Account Setup
	if (appCtxt.isOffline && AjxEnv.isWindows &&
		appCtxt.get(ZmSetting.OFFLINE_SUPPORTS_DOCK_UPDATE))
	{
		window.platform.icon().imageSpec = "resource://webapp/icons/default/launcher.ico";
		window.platform.icon().title = null;
	}

	var url = AjxUtil.formatUrl({path:appContextPath, qsArgs:{loginOp:'logout'}});
	ZmZimbraMail.sendRedirect(url);	// will trigger onbeforeunload
};

ZmZimbraMail._onClickLogOff =
function() {
	if (AjxEnv.isIE) {
		// Don't the the default <a> handler process the event. It can bring up
		// an unwanted "Are you sure you want to exit?" dialog.
		var ev = DwtUiEvent.getEvent();
		ev.returnValue = false;
	}
	ZmZimbraMail.logOff();
};

ZmZimbraMail.helpLinkCallback =
function() {
	ZmZimbraMail.unloadHackCallback();

	var ac = window.parentAppCtxt || window.appCtxt;
	var url;
	if (!ac.isOffline) {
		try { url = skin.hints.helpButton.url; } catch (e) { /* ignore */ }
		url = url || ac.get(ZmSetting.HELP_URI);
		var sep = url.match(/\?/) ? "&" : "?";
		url = [url, sep, "locid=", AjxEnv.DEFAULT_LOCALE].join("");
	} else {
		url = ac.get(ZmSetting.HELP_URI).replace(/\/$/,"");
		// bug fix #35098 - offline help is only available in en_US for now
		url = [url, "help", "en_US", "Zimbra_Mail_Help.htm"].join("/");
//		url = [url, "help", AjxEnv.DEFAULT_LOCALE, "Zimbra_Mail_Help.htm"].join("/");
	}
	window.open(url);
};

ZmZimbraMail.sendRedirect =
function(locationStr) {
	// not sure why IE doesn't allow this to process immediately, but since
	// it does not, we'll set up a timed action.
	if (AjxEnv.isIE) {
		var act = new AjxTimedAction(null, ZmZimbraMail.redir, [locationStr]);
		AjxTimedAction.scheduleAction(act, 1);
	} else {
		ZmZimbraMail.redir(locationStr);
	}
};

ZmZimbraMail.redir =
function(locationStr){
	window.location = locationStr;
};

ZmZimbraMail.prototype.setSessionTimer =
function(bStartTimer) {

	// if no timeout value, user's client never times out from inactivity
	var timeout = appCtxt.get(ZmSetting.IDLE_SESSION_TIMEOUT) * 1000;
	if (timeout <= 0)
		return;

	if (bStartTimer) {
		DBG.println(AjxDebug.DBG3, "INACTIVITY TIMER SET (" + (new Date()).toLocaleString() + ")");
		this._sessionTimerId = AjxTimedAction.scheduleAction(this._sessionTimer, timeout);

		DwtEventManager.addListener(DwtEvent.ONMOUSEUP, ZmZimbraMail._userEventHdlr);
		this._shell.setHandler(DwtEvent.ONMOUSEUP, ZmZimbraMail._userEventHdlr);
		if (AjxEnv.isIE)
			this._shell.setHandler(DwtEvent.ONMOUSEDOWN, ZmZimbraMail._userEventHdlr);
		else
			window.onkeydown = ZmZimbraMail._userEventHdlr;
	} else {
		DBG.println(AjxDebug.DBG3, "INACTIVITY TIMER CANCELED (" + (new Date()).toLocaleString() + ")");

		AjxTimedAction.cancelAction(this._sessionTimerId);
		this._sessionTimerId = -1;

		DwtEventManager.removeListener(DwtEvent.ONMOUSEUP, ZmZimbraMail._userEventHdlr);
		this._shell.clearHandler(DwtEvent.ONMOUSEUP);
		if (AjxEnv.isIE)
			this._shell.clearHandler(DwtEvent.ONMOUSEDOWN);
		else
			window.onkeydown = null;
	}
};

ZmZimbraMail.prototype.addChildWindow =
function(childWin) {
	if (this._childWinList == null) {
		this._childWinList = new AjxVector();
	}

	// NOTE: we now save childWin w/in Object so other params can be added to it.
	// Otherwise, Safari breaks (see http://bugs.webkit.org/show_bug.cgi?id=7162)
	var newWinObj = {win:childWin};
	this._childWinList.add(newWinObj);

	return newWinObj;
};

ZmZimbraMail.prototype.getChildWindow =
function(childWin) {
	if (this._childWinList) {
		for (var i = 0; i < this._childWinList.size(); i++) {
			if (childWin == this._childWinList.get(i).win) {
				return this._childWinList.get(i);
			}
		}
	}
	return null;
};

ZmZimbraMail.prototype.removeChildWindow =
function(childWin) {
	if (this._childWinList) {
		for (var i = 0; i < this._childWinList.size(); i++) {
			if (childWin == this._childWinList.get(i).win) {
				this._childWinList.removeAt(i);
				break;
			}
		}
	}
};

/**
 * Checks for a certain type of exception, then hands off to standard
 * exception handler.
 *
 * @param ex				[AjxException]		the exception
 * @param continuation		[object]*			original request params
 */
ZmZimbraMail.prototype._handleException =
function(ex, continuation) {
	var handled = false;
	if (ex.code == ZmCsfeException.MAIL_NO_SUCH_FOLDER) {
		// check for fault when getting folder perms
		var organizerTypes = [ZmOrganizer.CALENDAR, ZmOrganizer.NOTEBOOK, ZmOrganizer.ADDRBOOK];
		if (ex.data.itemId && ex.data.itemId.length) {
			var itemId = ex.data.itemId[0];
			var index = itemId.lastIndexOf(':');
			var zid = itemId.substring(0, index);
			var rid = itemId.substring(index + 1, itemId.length);
			var ft = appCtxt.getFolderTree();
			for (var type = 0; type < organizerTypes.length; type++) {
				handled |= ft.handleNoSuchFolderError(organizerTypes[type], zid, rid, true);
			}
		}
	}
	if (!handled) {
		ZmController.prototype._handleException.apply(this, arguments);
	}
};

// This method is called by the window.onbeforeunload handler
ZmZimbraMail._confirmExitMethod =
function() {

	appCtxt.accountList.saveImplicitPrefs();

	if (!ZmZimbraMail._isOkToExit()) {
		ZmZimbraMail._isLogOff = false;
		return ZmMsg.appExitWarning;
	}

	ZmZimbraMail._endSession();
	ZmZimbraMail._endSessionDone = true;
};

/**
 * Returns true if there is no unsaved work. If that's the case, it also
 * cancels any pending poll. Typically called by onbeforeunload handling.
 */
ZmZimbraMail._isOkToExit =
function() {
	var appCtlr = window._zimbraMail;
	if (!appCtlr) { return true; }
	var okToExit = appCtlr._appViewMgr.isOkToUnload();
	if (okToExit && appCtlr._pollRequest) {
		appCtlr._requestMgr.cancelRequest(appCtlr._pollRequest);
	}
	return okToExit;
};

ZmZimbraMail.unloadHackCallback =
function() {
	window.onbeforeunload = null;
	var f = function() { window.onbeforeunload = ZmZimbraMail._confirmExitMethod; };
	AjxTimedAction.scheduleAction((new AjxTimedAction(null, f)), 3000);
};

ZmZimbraMail._userEventHdlr =
function(ev) {
	var zm = window._zimbraMail;
	if (zm) {
		// cancel old timer and start a new one
		AjxTimedAction.cancelAction(zm._sessionTimerId);
		var timeout = appCtxt.get(ZmSetting.IDLE_SESSION_TIMEOUT) * 1000;
		zm._sessionTimerId = AjxTimedAction.scheduleAction(zm._sessionTimer, timeout);
	}
	DBG.println(AjxDebug.DBG3, "INACTIVITY TIMER RESET (" + (new Date()).toLocaleString() + ")");
};

ZmZimbraMail.prototype._createBanner =
function() {
	var banner = new DwtComposite({parent:this._shell, posStyle:Dwt.ABSOLUTE_STYLE, id:ZmId.BANNER});
	var logoUrl = appCtxt.getSkinHint("banner", "url") || appCtxt.get(ZmSetting.LOGO_URI);
	var data = {url:logoUrl};
	banner.getHtmlElement().innerHTML  = AjxTemplate.expand('share.App#Banner', data);
	return banner;
};

ZmZimbraMail.prototype._createUserInfo =
function(className, cid, id) {
	var position = appCtxt.getSkinHint(cid, "position");
	var posStyle = position || Dwt.ABSOLUTE_STYLE;
	var ui = new DwtComposite({parent:this._shell, className:className, posStyle:posStyle, id:id});
	if (AjxEnv.isIE) {
		var container = document.getElementById("skin_td_tree");
		var w = container ? Dwt.getSize(document.getElementById("skin_td_tree")).x : null;
		if (w) ui.setSize(w);
	}
	ui._setMouseEventHdlrs();
	return ui;
};

ZmZimbraMail.prototype._createAppChooser =
function() {

	var buttons = [];
	for (var id in ZmApp.CHOOSER_SORT) {
		if (id == ZmAppChooser.SPACER || id == ZmAppChooser.B_HELP || id == ZmAppChooser.B_LOGOUT) {
			continue;
		}

		var setting = ZmApp.SETTING[id];
		var upsellSetting = ZmApp.UPSELL_SETTING[id];
		if ((setting && appCtxt.get(setting)) || (upsellSetting && appCtxt.get(upsellSetting))) {
			buttons.push(id);
		}
	}
	buttons.sort(function(a, b) {
		return ZmZimbraMail.hashSortCompare(ZmApp.CHOOSER_SORT, a, b);
	});

	var appChooser = new ZmAppChooser({parent:this._shell, buttons:buttons, id:ZmId.APP_CHOOSER, refElementId:ZmId.SKIN_APP_CHOOSER});

	var buttonListener = new AjxListener(this, this._appButtonListener);
	appChooser.addSelectionListener(buttonListener);

	return appChooser;
};

ZmZimbraMail.prototype._appButtonListener =
function(ev) {
	try {
		var id = ev.item.getData(Dwt.KEY_ID);
		DBG.println(AjxDebug.DBG1, "ZmZimbraMail button press: " + id);
		if (id == ZmAppChooser.B_HELP) {
			window.open(appCtxt.get(ZmSetting.HELP_URI));
		} else if (id == ZmAppChooser.B_LOGOUT) {
			ZmZimbraMail.logOff();
		} else if (id && ZmApp.ENABLED_APPS[id] && (id != this._activeTabId)) {
			this.activateApp(id);
			if (appCtxt.zimletsPresent()) {
				appCtxt.getZimletMgr().notifyZimlets("onSelectApp", id);
			}
		} else {
			if (id != this._activeTabId) {
				this._appViewMgr.pushView(id, false, true);
			}
			if (ev.target && (ev.target.className == "ImgClose")) {
				this._appViewMgr.popView();
			}
		}
	} catch (ex) {
		this._handleException(ex);
	}
};

ZmZimbraMail.prototype.getAppChooser =
function() {
	return this._appChooser;
};

ZmZimbraMail.prototype.setActiveTabId =
function(id) {
	this._activeTabId = id;
	this._appChooser.setSelected(id);
};

/**
 * Displays a status message
 * @param msg the message
 * @param level ZmStatusView.LEVEL_INFO, ZmStatusView.LEVEL_WARNING, or ZmStatusView.LEVEL_CRITICAL (optional)
 * @param detail details (optional)
 * @param transitions transitions (optional)
 * @param toast the toast control (optional)
 */
ZmZimbraMail.prototype.setStatusMsg =
function(params) {
	params = Dwt.getParams(arguments, ZmStatusView.MSG_PARAMS);
	this.statusView.setStatusMsg(params);
};

ZmZimbraMail.prototype.getKeyMapName =
function() {
	var ctlr = appCtxt.getCurrentController();
	if (ctlr && ctlr.getKeyMapName) {
		return ctlr.getKeyMapName();
	}
	return "Global";
};

ZmZimbraMail.prototype.handleKeyAction =
function(actionCode, ev) {

	DwtMenu.closeActiveMenu();

	var app = ZmApp.GOTO_ACTION_CODE_R[actionCode];
	if (app) {
		if (app == this.getActiveApp()) { return false; }
		this.activateApp(app);
		return true;
	}

	// don't honor plain Enter in an input field as an app shortcut, since it often
	// equates to button press in that situation
	if (ev && (ev.keyCode == 13 || ev.keyCode == 3) &&
		!(ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) &&
		 ev.target && (ev.target.id != DwtKeyboardMgr.FOCUS_FIELD_ID)) { return false; }

	switch (actionCode) {
		case ZmKeyMap.DBG_NONE:
			appCtxt.setStatusMsg("Setting Debug Level To: " + AjxDebug.NONE);
			DBG.setDebugLevel(AjxDebug.NONE);
			break;

		case ZmKeyMap.DBG_1:
			appCtxt.setStatusMsg("Setting Debug Level To: " + AjxDebug.DBG1);
			DBG.setDebugLevel(AjxDebug.DBG1);
			break;

		case ZmKeyMap.DBG_2:
			appCtxt.setStatusMsg("Setting Debug Level To: " + AjxDebug.DBG2);
			DBG.setDebugLevel(AjxDebug.DBG2);
			break;

		case ZmKeyMap.DBG_3:
			appCtxt.setStatusMsg("Setting Debug Level To: " + AjxDebug.DBG3);
			DBG.setDebugLevel(AjxDebug.DBG3);
			break;

		case ZmKeyMap.DBG_TIMING: {
			var on = DBG._showTiming;
			var newState = on ? "off" : "on";
			appCtxt.setStatusMsg("Turning Timing Info " + newState);
			DBG.showTiming(!on);
			break;
		}

		case ZmKeyMap.ASSISTANT: {
			if (appCtxt.get(ZmSetting.ASSISTANT_ENABLED)) {
				if (!this._assistantDialog) {
					AjxDispatcher.require("Assistant");
					this._assistantDialog = new ZmAssistantDialog();
				}
				this._assistantDialog.popup();
			}
			break;
		}

		case ZmKeyMap.LOGOFF: {
			ZmZimbraMail.logOff();
			break;
		}

		case ZmKeyMap.FOCUS_SEARCH_BOX: {
			var stb = appCtxt.getSearchController().getSearchToolbar();
			if (stb) {
				var searchBox = stb.getSearchField();
				appCtxt.getKeyboardMgr().grabFocus(searchBox);
				if (ZmSearchAutocomplete) {
					ZmSearchAutocomplete._ignoreNextKey = true;
				}
			}
			break;
		}

		case ZmKeyMap.FOCUS_CONTENT_PANE: {
			this.focusContentPane();
			break;
		}

		case ZmKeyMap.FOCUS_TOOLBAR: {
			this.focusToolbar();
			break;
		}

		case ZmKeyMap.SHORTCUTS: {

			var panel = appCtxt.getShortcutsPanel();
			var curMap = this.getKeyMapName();
			var km = appCtxt.getAppController().getKeyMapMgr();
			var maps = km.getAncestors(curMap);
			var inherits = (maps && maps.length > 0);
			maps.unshift(curMap);
			var maps1 = [], maps2 = [];
			if (inherits) {
				if (maps.length > 1 && maps[maps.length - 1] == "Global") {
					maps.pop();
					maps2.push("global");
				}
			}
			for (var i = 0; i < maps.length; i++) {
				maps1.push(ZmKeyMap.MAP_NAME_R[maps[i]] || DwtKeyMap.MAP_NAME_R[maps[i]]);
			}

			var col1 = {}, col2 = {};
			col1.type = ZmShortcutList.TYPE_APP;
			col1.maps = maps1;
			var colList = [col1];
			if (maps2.length) {
				col2.type = ZmShortcutList.TYPE_APP;
				col2.maps = maps2;
				colList.push(col2);
			}
			var col3 = {};
			col3.type = ZmShortcutList.TYPE_SYS;
			col3.maps = [];
			var ctlr = appCtxt.getCurrentController();
			var testMaps = ["list", "editor", "tabView"];
			for (var i = 0; i < testMaps.length; i++) {
				if (ctlr.mapSupported(testMaps[i])) {
					col3.maps.push(testMaps[i]);
				}
			}
			col3.maps.push("button", "menu", "tree", "dialog", "toolbarHorizontal");
			colList.push(col3);
			panel.popup(colList);
			break;
		}

		// this action needs to be last
		case ZmKeyMap.CANCEL: {
			// see if there's a current drag operation we can cancel
			var handled = false;
			var captureObj = (DwtMouseEventCapture.getId() == "DwtControl") ? DwtMouseEventCapture.getCaptureObj() : null;
			var obj = captureObj && captureObj.targetObj;
			if (obj && (obj._dragging == DwtControl._DRAGGING)) {
				captureObj.release();
				obj.__lastDestDwtObj = null;
				obj._setDragProxyState(false);					// turn dnd icon red so user knows no drop is happening
				DwtControl.__badDrop(obj, DwtShell.mouseEvent);	// shell's mouse ev should have latest info
				handled = true;
			}
			if (handled) { break; }
		}

		default: {
			var ctlr = appCtxt.getCurrentController();
			return (ctlr && ctlr.handleKeyAction)
				? ctlr.handleKeyAction(actionCode, ev)
				: false;
		}
	}
	return true;
};

ZmZimbraMail.prototype.focusContentPane =
function() {
	// Set focus to the list view that's in the content pane. If there is no
	// list view in the content pane, nothing happens. The list view will be
	// found in the root tab group hierarchy.
	var ctlr = appCtxt.getCurrentController();
	var content = ctlr ? ctlr.getCurrentView() : null;
	if (content) {
		appCtxt.getKeyboardMgr().grabFocus(content);
	}
};

ZmZimbraMail.prototype.focusToolbar =
function() {
	// Set focus to the toolbar that's in the content pane.
	var ctlr = appCtxt.getCurrentController();
	var toolbar = ctlr ? ctlr.getCurrentToolbar() : null;
	if (toolbar) {
		appCtxt.getKeyboardMgr().grabFocus(toolbar);
	}
};

/**
 * Creates an "upsell view", which is a placeholder view for an app that's not
 * enabled but which has a button so that it can be promoted. The app will have
 * a URL for its upsell content, which we put into an IFRAME.
 *
 * @param appName	[constant]		name of app
 */
ZmZimbraMail.prototype._createUpsellView =
function(appName) {
	var upsellView = this._upsellView[appName] = new ZmUpsellView({parent:this._shell, posStyle:Dwt.ABSOLUTE_STYLE, className: 'ZmUpsellView'});
	var upsellUrl = appCtxt.get(ZmApp.UPSELL_URL[appName]);
	var el = upsellView.getHtmlElement();
	var htmlArr = [];
	var idx = 0;
    htmlArr[idx++] = "<iframe id='iframe_" + upsellView.getHTMLElId() + "' width='100%' height='100%' frameborder='0' src='";
	htmlArr[idx++] = upsellUrl;
	htmlArr[idx++] = "'>";
	el.innerHTML = htmlArr.join("");
	var elements = {};
	elements[ZmAppViewMgr.C_APP_CONTENT_FULL] = upsellView;
	var viewName = [appName, "upsell"].join("_");
	this._appViewMgr.createView({viewId:viewName, appName:appName, elements:elements, isTransient:true});
	this._appViewMgr.pushView(viewName);
    var title = [ZmMsg.zimbraTitle, appName].join(": ");
    Dwt.setTitle(title);    
};

ZmZimbraMail._createDummyDBG =
function() {
	window.AjxDebug = function() {};
	window.AjxDebug.prototype.toString		= function() { return "dummy DBG class";};
	window.AjxDebug.prototype.display		= function() {};
	window.AjxDebug.prototype.dumpObj		= function() {};
	window.AjxDebug.prototype.getDebugLevel	= function() {};
	window.AjxDebug.prototype.isDisabled	= function() {};
	window.AjxDebug.prototype.println		= function() {};
	window.AjxDebug.prototype.printRaw		= function() {};
	window.AjxDebug.prototype.printXML		= function() {};
	window.AjxDebug.prototype.setDebugLevel	= function() {};
	window.AjxDebug.prototype.setTitle		= function() {};
	window.AjxDebug.prototype.showTiming	= function() {};
	window.AjxDebug.prototype._getTimeStamp	= function() {};
	window.AjxDebug.prototype.timePt		= function() {};
	window.DBG = new window.AjxDebug();
};

/**
 * Sets up Zimlet organizer type. This is run if we get zimlets in the
 * GetInfoResponse. Note that this will run before apps are instantiated,
 * which is necessary because they depend on knowing whether there are zimlets.
 */
ZmZimbraMail.prototype._postLoadZimlet =
function() {
	appCtxt.setZimletsPresent(true);
};

ZmZimbraMail.globalButtonListener =
function(ev) {
	if (!appCtxt.areZimletsLoaded()) { return; }

	var item = ev.item;

	// normalize action
	var text = (item && item.getText) ? (item.getText() || item._toggleText) : null;
	if (!text) {
		text = item.getData(ZmOperation.KEY_ID) || item.getData(Dwt.KEY_ID);
	}
	if (text) {
		var type;
		if (item instanceof ZmAppButton) {
			type = "app";
		} else if (item instanceof DwtMenuItem) {
			type = "menuitem";
		} else if (item instanceof DwtButton) {
			type = "button";
		} else if (item instanceof DwtTreeItem) {
			if (!item.getSelected()) { return; }
			type = "treeitem";
		} else {
			type = item.toString();
		}

		var avm = appCtxt.getAppViewMgr();
		var currentViewId = avm.getCurrentViewId();
		var lastViewId = avm.getLastViewId();
		var action = (AjxStringUtil.split(text, " ")).join("");
		appCtxt.notifyZimlets("onAction", [type, action, currentViewId, lastViewId]);
	}
};

ZmZimbraMail._endSession =
function() {

	// Let the server know that the session is ending.
	var errorCallback = new AjxCallback(null, function() { return true; } ); // Ignores any error.
	var args = {
		jsonObj: { EndSessionRequest: { _jsns: "urn:zimbraAccount" } },
		asyncMode: true,
		errorCallback: errorCallback
	};
	appCtxt.getAppController().sendRequest(args);
};

// YUCK:
ZmOrganizer.ZIMLET = "ZIMLET";
