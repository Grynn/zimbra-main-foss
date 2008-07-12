/*
 * ***** BEGIN LICENSE BLOCK *****
 *
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2004, 2005, 2006, 2007 Zimbra, Inc.
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
 * Creates and initializes the mail application.
 * @constructor
 * @class
 * The mail app manages and displays mail messages. Messages may be grouped
 * into conversations. New messages are created through a composer.
 *
 * @author Conrad Damon
 */
ZmMailApp = function(container, parentController) {
	ZmApp.call(this, ZmApp.MAIL, container, parentController);

	this._dataSourceCollection = {};
	this._identityCollection = {};
	this._signatureCollection = {};
	this._groupBy = {};
	this._addSettingsChangeListeners();
};

// Organizer and item-related constants
ZmEvent.S_CONV				= ZmId.ITEM_CONV;
ZmEvent.S_MSG				= ZmId.ITEM_MSG;
ZmEvent.S_ATT				= ZmId.ITEM_ATT;
ZmEvent.S_FOLDER			= ZmId.ORG_FOLDER;
ZmEvent.S_DATA_SOURCE       = ZmId.ITEM_DATA_SOURCE;
ZmEvent.S_IDENTITY       	= "IDENTITY";
ZmEvent.S_SIGNATURE			= "SIGNATURE";
ZmItem.CONV					= ZmEvent.S_CONV;
ZmItem.MSG					= ZmEvent.S_MSG;
ZmItem.ATT					= ZmEvent.S_ATT;
ZmItem.DATA_SOURCE			= ZmEvent.S_DATA_SOURCE;
ZmOrganizer.FOLDER			= ZmEvent.S_FOLDER;

// App-related constants
ZmApp.MAIL							= ZmId.APP_MAIL;
ZmApp.CLASS[ZmApp.MAIL]				= "ZmMailApp";
ZmApp.SETTING[ZmApp.MAIL]			= ZmSetting.MAIL_ENABLED;
ZmApp.UPSELL_SETTING[ZmApp.MAIL]	= ZmSetting.MAIL_UPSELL_ENABLED;
ZmApp.LOAD_SORT[ZmApp.MAIL]			= 20;
ZmApp.QS_ARG[ZmApp.MAIL]			= "mail";

ZmMailApp.DEFAULT_AUTO_SAVE_DRAFT_INTERVAL = 30;

ZmMailApp.POP_DOWNLOAD_SINCE_ALL = 0;
ZmMailApp.POP_DOWNLOAD_SINCE_NO_CHANGE = 1;
ZmMailApp.POP_DOWNLOAD_SINCE_FROM_NOW = 2;

ZmMailApp.prototype = new ZmApp;
ZmMailApp.prototype.constructor = ZmMailApp;

ZmMailApp._setGroupByMaps =
function() {
	// convert between server values for "group mail by" and item types
	ZmMailApp.GROUP_MAIL_BY_ITEM	= {};
	ZmMailApp.GROUP_MAIL_BY_ITEM[ZmSetting.GROUP_BY_CONV]		= ZmItem.CONV;
	ZmMailApp.GROUP_MAIL_BY_ITEM[ZmSetting.GROUP_BY_MESSAGE]	= ZmItem.MSG;
};

ZmMailApp.prototype.toString =
function() {
	return "ZmMailApp";
};

// Construction

ZmMailApp.prototype._defineAPI =
function() {
	AjxDispatcher.setPackageLoadFunction("MailCore", new AjxCallback(this, this._postLoadCore));
	AjxDispatcher.setPackageLoadFunction("Mail", new AjxCallback(this, this._postLoad));
	AjxDispatcher.registerMethod("Compose", ["MailCore", "Mail"], new AjxCallback(this, this.compose));
	AjxDispatcher.registerMethod("GetComposeController", ["MailCore", "Mail"], new AjxCallback(this, this.getComposeController));
	AjxDispatcher.registerMethod("GetConvController", ["MailCore", "Mail"], new AjxCallback(this, this.getConvController));
	AjxDispatcher.registerMethod("GetConvListController", "MailCore", new AjxCallback(this, this.getConvListController));
	AjxDispatcher.registerMethod("GetMsgController", ["MailCore", "Mail"], new AjxCallback(this, this.getMsgController));
	AjxDispatcher.registerMethod("GetTradController", "MailCore", new AjxCallback(this, this.getTradController));
	AjxDispatcher.registerMethod("GetMailListController", "MailCore", new AjxCallback(this, this.getMailListController));
	AjxDispatcher.registerMethod("GetIdentityCollection", "MailCore", new AjxCallback(this, this.getIdentityCollection));
	AjxDispatcher.registerMethod("GetSignatureCollection", "MailCore", new AjxCallback(this, this.getSignatureCollection));
	AjxDispatcher.registerMethod("GetDataSourceCollection", "MailCore", new AjxCallback(this, this.getDataSourceCollection));
};

ZmMailApp.prototype._registerSettings =
function(settings) {
	var settings = settings || appCtxt.getSettings();
	settings.registerSetting("ALLOW_ANY_FROM_ADDRESS",			{name:"zimbraAllowAnyFromAddress", type:ZmSetting.T_COS, dataType:ZmSetting.D_BOOLEAN, defaultValue:false});
	settings.registerSetting("ALLOW_FROM_ADDRESSES",			{name:"zimbraAllowFromAddress", type:ZmSetting.T_COS, dataType:ZmSetting.D_LIST});
	settings.registerSetting("AUTO_SAVE_DRAFT_INTERVAL",		{name:"zimbraPrefAutoSaveDraftInterval", type:ZmSetting.T_PREF, dataType:ZmSetting.D_LDAP_TIME, defaultValue:ZmMailApp.DEFAULT_AUTO_SAVE_DRAFT_INTERVAL});
	settings.registerSetting("COMPOSE_SAME_FORMAT",				{name:"zimbraPrefForwardReplyInOriginalFormat", type:ZmSetting.T_PREF, dataType:ZmSetting.D_BOOLEAN, defaultValue:false});
	settings.registerSetting("CONVERSATIONS_ENABLED",			{name:"zimbraFeatureConversationsEnabled", type:ZmSetting.T_COS, dataType:ZmSetting.D_BOOLEAN, defaultValue:false});
	settings.registerSetting("DEDUPE_MSG_TO_SELF",				{name:"zimbraPrefDedupeMessagesSentToSelf", type:ZmSetting.T_PREF, defaultValue:ZmSetting.DEDUPE_NONE});
    settings.registerSetting("DETACH_COMPOSE_ENABLED",          {name:"zimbraFeatureComposeInNewWindowEnabled",type:ZmSetting.T_PREF,dataType:ZmSetting.D_BOOLEAN,defaultValue:true});
    settings.registerSetting("DETACH_MAILVIEW_ENABLED",         {name:"zimbraFeatureOpenMailInNewWindowEnabled",type:ZmSetting.T_PREF,dataType:ZmSetting.D_BOOLEAN,defaultValue:true});
    settings.registerSetting("DISPLAY_EXTERNAL_IMAGES",			{name:"zimbraPrefDisplayExternalImages", type:ZmSetting.T_PREF, dataType:ZmSetting.D_BOOLEAN, defaultValue:false});
	settings.registerSetting("END_DATE_ENABLED",				{type:ZmSetting.T_PREF, dataType:ZmSetting.D_BOOLEAN, defaultValue:false});
	settings.registerSetting("FILTERS_ENABLED",					{name:"zimbraFeatureFiltersEnabled", type:ZmSetting.T_COS, dataType:ZmSetting.D_BOOLEAN,	defaultValue:false});
	settings.registerSetting("FORWARD_INCLUDE_ORIG",			{name:"zimbraPrefForwardIncludeOriginalText", type:ZmSetting.T_PREF, defaultValue:ZmSetting.INCLUDE});
	settings.registerSetting("FORWARD_MENU_ENABLED",			{type:ZmSetting.T_COS, dataType:ZmSetting.D_BOOLEAN, defaultValue:true});
	settings.registerSetting("GROUP_MAIL_BY",					{name:"zimbraPrefGroupMailBy", type:ZmSetting.T_PREF, defaultValue:ZmSetting.GROUP_BY_MESSAGE, isImplicit:true});
    settings.registerSetting("HTML_SIGNATURE_ENABLED",          {type:ZmSetting.T_PREF,dataType:ZmSetting.D_BOOLEAN,defaultValue:true});
    settings.registerSetting("IDENTITIES_ENABLED",				{name:"zimbraFeatureIdentitiesEnabled", type:ZmSetting.T_COS, dataType:ZmSetting.D_BOOLEAN, defaultValue:true});
	settings.registerSetting("INITIAL_SEARCH",					{name:"zimbraPrefMailInitialSearch", type:ZmSetting.T_PREF, defaultValue:"in:inbox"});
	settings.registerSetting("INITIAL_SEARCH_ENABLED",			{name:"zimbraFeatureInitialSearchPreferenceEnabled", type:ZmSetting.T_COS, dataType:ZmSetting.D_BOOLEAN, defaultValue:false});
	settings.registerSetting("MAIL_ALIASES",					{name:"zimbraMailAlias", type:ZmSetting.T_COS, dataType:ZmSetting.D_LIST});
	settings.registerSetting("MAIL_FORWARDING_ADDRESS",			{name:"zimbraPrefMailForwardingAddress", type:ZmSetting.T_PREF});
	settings.registerSetting("MAIL_FORWARDING_ENABLED",			{name:"zimbraFeatureMailForwardingEnabled", type:ZmSetting.T_COS, dataType:ZmSetting.D_BOOLEAN, defaultValue:false});
	settings.registerSetting("MAIL_FROM_ADDRESS",				{name:"zimbraPrefFromAddress", type:ZmSetting.T_PREF, dataType:ZmSetting.D_LIST });
	settings.registerSetting("MAIL_LIFETIME_GLOBAL",			{name:"zimbraMailMessageLifetime", type:ZmSetting.T_COS, defaultValue:"0"}); // dataType: DURATION
	settings.registerSetting("MAIL_LIFETIME_INBOX_READ",		{name:"zimbraPrefInboxReadLifetime", type:ZmSetting.T_PREF, defaultValue:"0"}); // dataType: DURATION
	settings.registerSetting("MAIL_LIFETIME_INBOX_UNREAD",		{name:"zimbraPrefInboxUnreadLifetime", type:ZmSetting.T_PREF, defaultValue:"0"}); // dataType: DURATION
	settings.registerSetting("MAIL_LIFETIME_JUNK",				{name:"zimbraPrefJunkLifetime", type:ZmSetting.T_PREF, defaultValue:"0"}); // dataType: DURATION
	settings.registerSetting("MAIL_LIFETIME_JUNK_GLOBAL",		{name:"zimbraMailSpamLifetime", type:ZmSetting.T_COS, defaultValue:"0"}); // dataType: DURATION
	settings.registerSetting("MAIL_LIFETIME_SENT",				{name:"zimbraPrefSentLifetime", type:ZmSetting.T_PREF, defaultValue:"0"}); // dataType: DURATION
	settings.registerSetting("MAIL_LIFETIME_TRASH",				{name:"zimbraPrefTrashLifetime", type:ZmSetting.T_PREF, defaultValue:"0"}); // dataType: DURATION
	settings.registerSetting("MAIL_LIFETIME_TRASH_GLOBAL",		{name:"zimbraMailTrashLifetime", type:ZmSetting.T_COS, defaultValue:"0"}); // dataType: DURATION
	settings.registerSetting("MAIL_LOCAL_DELIVERY_DISABLED",	{name:"zimbraPrefMailLocalDeliveryDisabled", type:ZmSetting.T_PREF, dataType:ZmSetting.D_BOOLEAN, defaultValue:false});
	settings.registerSetting("MAIL_NOTIFY_SOUNDS",				{name:"zimbraPrefMailSoundsEnabled", type:ZmSetting.T_PREF, dataType:ZmSetting.D_BOOLEAN, defaultValue:false});
	settings.registerSetting("MAIL_NOTIFY_APP",					{name:"zimbraPrefMailFlashIcon", type:ZmSetting.T_PREF, dataType:ZmSetting.D_BOOLEAN, defaultValue:false});
	settings.registerSetting("MAIL_NOTIFY_BROWSER",				{name:"zimbraPrefMailFlashTitle", type:ZmSetting.T_PREF, dataType:ZmSetting.D_BOOLEAN, defaultValue:false});
	settings.registerSetting("MAIL_PRIORITY_ENABLED",	        {name:"zimbraFeatureMailPriorityEnabled", type:ZmSetting.T_COS, dataType:ZmSetting.D_BOOLEAN, defaultValue:false});
	settings.registerSetting("MARK_MSG_READ",	      			{name:"zimbraPrefMarkMsgRead", type:ZmSetting.T_PREF, dataType:ZmSetting.D_INT, defaultValue:0});
	settings.registerSetting("MAX_MESSAGE_SIZE",				{type:ZmSetting.T_PREF, defaultValue:"100000"});
	settings.registerSetting("NEW_WINDOW_COMPOSE",				{name:"zimbraPrefComposeInNewWindow", type:ZmSetting.T_PREF, dataType:ZmSetting.D_BOOLEAN, defaultValue:true});
	settings.registerSetting("NOTIF_ADDRESS",					{name:"zimbraPrefNewMailNotificationAddress", type:ZmSetting.T_PREF});
	settings.registerSetting("NOTIF_ENABLED",					{name:"zimbraPrefNewMailNotificationEnabled", type:ZmSetting.T_PREF, dataType:ZmSetting.D_BOOLEAN, defaultValue:false});
	settings.registerSetting("NOTIF_FEATURE_ENABLED",			{name:"zimbraFeatureNewMailNotificationEnabled", type:ZmSetting.T_COS, dataType:ZmSetting.D_BOOLEAN, defaultValue:false});
	settings.registerSetting("OPEN_MAIL_IN_NEW_WIN",			{name:"zimbraPrefOpenMailInNewWindow", type:ZmSetting.T_PREF, dataType:ZmSetting.D_BOOLEAN, defaultValue:false});
	settings.registerSetting("PAGE_SIZE",						{name:"zimbraPrefMailItemsPerPage", type:ZmSetting.T_PREF, dataType:ZmSetting.D_INT, defaultValue:25});
	settings.registerSetting("POP_ENABLED",						{name:"zimbraPop3Enabled", type:ZmSetting.T_COS, dataType:ZmSetting.D_BOOLEAN, defaultValue:true});
	settings.registerSetting("POP_DOWNLOAD_SINCE_VALUE",		{type:ZmSetting.T_PREF, dataType:ZmSetting.D_STRING, defaultValue:""});
	settings.registerSetting("POP_DOWNLOAD_SINCE",				{name:"zimbraPrefPop3DownloadSince", type:ZmSetting.T_PREF, dataType:ZmSetting.D_STRING, defaultValue:""});
	settings.registerSetting("READING_PANE_ENABLED",			{name:"zimbraPrefReadingPaneEnabled", type:ZmSetting.T_PREF, dataType:ZmSetting.D_BOOLEAN, defaultValue:true, isImplicit:true});
	settings.registerSetting("REPLY_INCLUDE_ORIG",				{name:"zimbraPrefReplyIncludeOriginalText", type:ZmSetting.T_PREF, defaultValue:ZmSetting.INCLUDE});
	settings.registerSetting("REPLY_MENU_ENABLED",				{type:ZmSetting.T_COS, dataType:ZmSetting.D_BOOLEAN, defaultValue:true});
	settings.registerSetting("REPLY_PREFIX",					{name:"zimbraPrefForwardReplyPrefixChar", type:ZmSetting.T_PREF, defaultValue:">"});
	settings.registerSetting("REPLY_TO_ADDRESS",				{name:"zimbraPrefReplyToAddress", type:ZmSetting.T_PREF, dataType:ZmSetting.D_LIST });
	settings.registerSetting("REPLY_TO_ENABLED",				{name:"zimbraPrefReplyToEnabled", type:ZmSetting.T_PREF /*, dataType:ZmSetting.D_LIST*/ }); // TODO:Is this a list or single?
	settings.registerSetting("SAVE_DRAFT_ENABLED",				{type:ZmSetting.T_COS, dataType:ZmSetting.D_BOOLEAN, defaultValue:true});
	settings.registerSetting("SAVE_TO_SENT",					{name:"zimbraPrefSaveToSent", type:ZmSetting.T_PREF, dataType:ZmSetting.D_BOOLEAN, defaultValue:true});
	settings.registerSetting("SENT_FOLDER_NAME",				{name:"zimbraPrefSentMailFolder", type:ZmSetting.T_PREF, defaultValue:"sent"});
	settings.registerSetting("SHOW_BCC",						{type:ZmSetting.T_PREF, dataType:ZmSetting.D_BOOLEAN, defaultValue:false});
	settings.registerSetting("SHOW_FRAGMENTS",					{name:"zimbraPrefShowFragments", type:ZmSetting.T_PREF, dataType:ZmSetting.D_BOOLEAN, defaultValue:false});
	settings.registerSetting("SIGNATURE",						{name:"zimbraPrefMailSignature", type:ZmSetting.T_PREF});
	settings.registerSetting("SIGNATURE_ENABLED",				{name:"zimbraPrefMailSignatureEnabled", type:ZmSetting.T_PREF, dataType:ZmSetting.D_BOOLEAN, defaultValue:false});
	settings.registerSetting("SIGNATURE_STYLE",					{name:"zimbraPrefMailSignatureStyle", type:ZmSetting.T_PREF, defaultValue:ZmSetting.SIG_OUTLOOK});
	settings.registerSetting("SPAM_ENABLED",					{type:ZmSetting.T_COS, dataType:ZmSetting.D_BOOLEAN, defaultValue:true});
	settings.registerSetting("START_DATE_ENABLED",				{type:ZmSetting.T_PREF, dataType:ZmSetting.D_BOOLEAN, defaultValue:false});
	settings.registerSetting("USER_FOLDERS_ENABLED",			{type:ZmSetting.T_COS, dataType:ZmSetting.D_BOOLEAN, defaultValue:true});
	settings.registerSetting("VACATION_FROM",       			{name:"zimbraPrefOutOfOfficeFromDate", type:ZmSetting.T_PREF, defaultValue:""});
	settings.registerSetting("VACATION_MSG",					{name:"zimbraPrefOutOfOfficeReply", type:ZmSetting.T_PREF, defaultValue:""});
	settings.registerSetting("VACATION_MSG_ENABLED",			{name:"zimbraPrefOutOfOfficeReplyEnabled", type:ZmSetting.T_PREF, dataType:ZmSetting.D_BOOLEAN, defaultValue:false});
	settings.registerSetting("VACATION_MSG_FEATURE_ENABLED",	{name:"zimbraFeatureOutOfOfficeReplyEnabled", type:ZmSetting.T_COS, dataType:ZmSetting.D_BOOLEAN, defaultValue:false});
	settings.registerSetting("VACATION_UNTIL",       			{name:"zimbraPrefOutOfOfficeUntilDate", type:ZmSetting.T_PREF, defaultValue:""});

    ZmMailApp._setGroupByMaps();
};

ZmMailApp.prototype._registerPrefs =
function() {
	var sections = {
		MAIL: {
			title: ZmMsg.mail,
			templateId: "prefs.Pages#Mail",
			priority: 10,
			precondition: appCtxt.get(ZmSetting.MAIL_ENABLED),
			prefs: [
				ZmSetting.DEDUPE_MSG_TO_SELF,
				ZmSetting.DISPLAY_EXTERNAL_IMAGES,
				ZmSetting.INITIAL_SEARCH,
				ZmSetting.MAIL_FORWARDING_ADDRESS,
				ZmSetting.MAIL_LIFETIME_INBOX_READ,
				ZmSetting.MAIL_LIFETIME_INBOX_UNREAD,
				ZmSetting.MAIL_LIFETIME_JUNK,
				ZmSetting.MAIL_LIFETIME_SENT,
				ZmSetting.MAIL_LIFETIME_TRASH,
				ZmSetting.MAIL_LOCAL_DELIVERY_DISABLED,
				ZmSetting.MARK_MSG_READ,
				ZmSetting.NOTIF_ADDRESS,
				ZmSetting.NOTIF_ENABLED,
				ZmSetting.MAIL_NOTIFY_SOUNDS,
				ZmSetting.MAIL_NOTIFY_APP,
				ZmSetting.MAIL_NOTIFY_BROWSER,
				ZmSetting.OPEN_MAIL_IN_NEW_WIN,
				ZmSetting.PAGE_SIZE,
				ZmSetting.POP_DOWNLOAD_SINCE_VALUE,
				ZmSetting.POP_DOWNLOAD_SINCE,
				ZmSetting.POLLING_INTERVAL,
				ZmSetting.SHOW_FRAGMENTS,
				ZmSetting.VACATION_MSG_ENABLED,
				ZmSetting.VACATION_MSG,
				ZmSetting.START_DATE_ENABLED,
				ZmSetting.END_DATE_ENABLED,
				ZmSetting.VACATION_FROM,
				ZmSetting.VACATION_UNTIL,
				ZmSetting.VIEW_AS_HTML
			],
			createView: function(parent, section, controller) {
				return new ZmMailPrefsPage(parent, section, controller);
			}
		},
		ACCOUNTS: {
			title: ZmMsg.accounts,
			templateId: "prefs.Pages#Accounts",
			priority: 60,
			precondition: appCtxt.get(ZmSetting.MAIL_ENABLED),
			prefs: [
				ZmSetting.ACCOUNTS
			],
			manageDirty: true,
			createView: function(parent, section, controller) {
				return new ZmAccountsPage(parent, section, controller);
			}
		},
		SIGNATURES: {
			title: ZmMsg.signatures,
			templateId: "prefs.Pages#Signatures",
			priority: 30,
			precondition: (appCtxt.get(ZmSetting.MAIL_ENABLED) && appCtxt.get(ZmSetting.SIGNATURES_ENABLED)),
			prefs: [
				ZmSetting.SIGNATURES,
				ZmSetting.SIGNATURE_STYLE,
				ZmSetting.SIGNATURE_ENABLED
			],
			manageDirty: true,
			createView: function(parent, section, controller) {
				return new ZmSignaturesPage(parent, section, controller);
			}
		},
		FILTERS: {
			title: ZmMsg.filterRules,
			templateId: "prefs.Pages#MailFilters",
			priority: 70,
			precondition: (appCtxt.get(ZmSetting.MAIL_ENABLED) && appCtxt.get(ZmSetting.FILTERS_ENABLED)),
			prefs: [
				ZmSetting.FILTERS
			],
			manageChanges: true,
			createView: function(parent, section, controller) {
				return controller.getFilterRulesController().getFilterRulesView();
			}
		}
	};

	if (appCtxt.isOffline) {
		sections["MAIL"].prefs.push(ZmSetting.OFFLINE_MAIL_TOASTER_ENABELD);
	}

	for (var id in sections) {
		ZmPref.registerPrefSection(id, sections[id]);
	}

	ZmPref.registerPref("ACCOUNTS", {
		displayContainer:	ZmPref.TYPE_CUSTOM
	});

	ZmPref.registerPref("AUTO_SAVE_DRAFT_INTERVAL", {
		displayName:		ZmMsg.autoSaveDrafts,
		displayContainer:	ZmPref.TYPE_CHECKBOX,
		options:			[0, ZmMailApp.DEFAULT_AUTO_SAVE_DRAFT_INTERVAL]
	});

	ZmPref.registerPref("DEDUPE_MSG_TO_SELF", {
		displayName:		ZmMsg.removeDupesToSelf,
		displayContainer:	ZmPref.TYPE_RADIO_GROUP,
		orientation:		ZmPref.ORIENT_HORIZONTAL,
		displayOptions:		[ZmMsg.dedupeNone, ZmMsg.dedupeSecondCopy, ZmMsg.dedupeAll],
		options:			[ZmSetting.DEDUPE_NONE, ZmSetting.DEDUPE_SECOND, ZmSetting.DEDUPE_ALL]
	});

	ZmPref.registerPref("DISPLAY_EXTERNAL_IMAGES", {
		displayName:		ZmMsg.showExternalImages,
		displayContainer:	ZmPref.TYPE_CHECKBOX
	});

	ZmPref.registerPref("END_DATE_ENABLED", {
		displayName:		ZmMsg.endDate,
		displayContainer:	ZmPref.TYPE_CHECKBOX,
		precondition:		ZmSetting.VACATION_MSG_FEATURE_ENABLED
	});

	ZmPref.registerPref("INITIAL_SEARCH", {
		displayName:		ZmMsg.initialMailSearch,
		displayContainer:	ZmPref.TYPE_INPUT,
		maxLength:			ZmPref.MAX_LENGTH[ZmSetting.INITIAL_SEARCH],
		errorMessage:       AjxMessageFormat.format(ZmMsg.invalidInitialSearch, ZmPref.MAX_LENGTH[ZmSetting.INITIAL_SEARCH]),
		precondition:		ZmSetting.INITIAL_SEARCH_ENABLED
	});

	ZmPref.registerPref("MAIL_FORWARDING_ADDRESS", {
		displayName:		ZmMsg.mailForwardingAddress,
		displayContainer:	ZmPref.TYPE_INPUT,
		validationFunction: ZmPref.validateEmail,
		errorMessage:       ZmMsg.invalidEmail,
		precondition:		ZmSetting.MAIL_FORWARDING_ENABLED
	});

	ZmPref.registerPref("MAIL_LIFETIME_INBOX_READ", {
		displayContainer:	ZmPref.TYPE_RADIO_GROUP,
		orientation:		ZmPref.ORIENT_HORIZONTAL,
		displayOptions:		[ ZmMsg.lifetimeDurationDays, ZmMsg.lifetimeDurationDays,
							  ZmMsg.lifetimeDurationDays, ZmMsg.lifetimeDurationDays,
							  ZmMsg.lifetimeDurationDays, ZmMsg.lifetimeDurationNever ],
		options:			[ 30, 45, 60, 90, 120, 0 ],
		approximateFunction: ZmPref.approximateLifetimeInboxRead,
		displayFunction:	ZmPref.durationDay2Int,
		valueFunction:		ZmPref.int2DurationDay,
		validationFunction:	ZmPref.validateLifetime
	});

	ZmPref.registerPref("MAIL_LIFETIME_INBOX_UNREAD", {
		displayContainer:	ZmPref.TYPE_RADIO_GROUP,
		orientation:		ZmPref.ORIENT_HORIZONTAL,
		displayOptions:		[ ZmMsg.lifetimeDurationDays, ZmMsg.lifetimeDurationDays,
							  ZmMsg.lifetimeDurationDays, ZmMsg.lifetimeDurationDays,
							  ZmMsg.lifetimeDurationDays, ZmMsg.lifetimeDurationNever ],
		options:			[ 30, 45, 60, 90, 120, 0 ],
		approximateFunction: ZmPref.approximateLifetimeInboxUnread,
		displayFunction:	ZmPref.durationDay2Int,
		valueFunction:		ZmPref.int2DurationDay,
		validationFunction:	ZmPref.validateLifetime
	});

	ZmPref.registerPref("MAIL_LIFETIME_JUNK", {
		displayContainer:	ZmPref.TYPE_RADIO_GROUP,
		orientation:		ZmPref.ORIENT_HORIZONTAL,
		displayOptions:		ZmMsg.lifetimeDurationDays,
		options:			[ 1, 3, 7, 30 ],
		approximateFunction: ZmPref.approximateLifetimeJunk,
		displayFunction:	ZmPref.durationDay2Int,
		valueFunction:		ZmPref.int2DurationDay,
		validationFunction:	ZmPref.validateLifetimeJunk
	});

	ZmPref.registerPref("MAIL_LIFETIME_SENT", {
		displayContainer:	ZmPref.TYPE_RADIO_GROUP,
		orientation:		ZmPref.ORIENT_HORIZONTAL,
		displayOptions:		[ ZmMsg.lifetimeDurationDays, ZmMsg.lifetimeDurationDays,
							  ZmMsg.lifetimeDurationDays, ZmMsg.lifetimeDurationDays,
							  ZmMsg.lifetimeDurationDays, ZmMsg.lifetimeDurationNever ],
		options:			[ 30, 45, 60, 90, 120, 0 ],
		approximateFunction: ZmPref.approximateLifetimeSent,
		displayFunction:	ZmPref.durationDay2Int,
		valueFunction:		ZmPref.int2DurationDay,
		validationFunction:	ZmPref.validateLifetime
	});

	ZmPref.registerPref("MAIL_LIFETIME_TRASH", {
		displayContainer:	ZmPref.TYPE_RADIO_GROUP,
		orientation:		ZmPref.ORIENT_HORIZONTAL,
		displayOptions:		ZmMsg.lifetimeDurationDays,
		options:			[ 1, 3, 7, 30 ],
		approximateFunction: ZmPref.approximateLifetimeTrash,
		displayFunction:	ZmPref.durationDay2Int,
		valueFunction:		ZmPref.int2DurationDay,
		validationFunction:	ZmPref.validateLifetimeTrash
	});

	ZmPref.registerPref("MAIL_LOCAL_DELIVERY_DISABLED", {
		displayName:		ZmMsg.mailDeliveryDisabled,
		displayContainer:	ZmPref.TYPE_CHECKBOX,
		precondition:		ZmSetting.MAIL_FORWARDING_ENABLED,
		validationFunction:	ZmMailApp.validateMailLocalDeliveryDisabled,
		errorMessage:		ZmMsg.errorMissingFwdAddr
	});

	ZmPref.registerPref("MAIL_NOTIFY_SOUNDS", {
		displayName:		ZmMsg.playSound,
		displayContainer:	ZmPref.TYPE_CHECKBOX
	});

	ZmPref.registerPref("MAIL_NOTIFY_APP", {
		displayName:		ZmMsg.flashMailAppTab,
		displayContainer:	ZmPref.TYPE_CHECKBOX
	});

	ZmPref.registerPref("MAIL_NOTIFY_BROWSER", {
		displayName:		ZmMsg.flashBrowser,
		displayContainer:	ZmPref.TYPE_CHECKBOX
	});

	ZmPref.registerPref("NOTIF_ADDRESS", {
		displayName:		ZmMsg.mailNotifAddress,
		displayContainer:	ZmPref.TYPE_INPUT,
		validationFunction: ZmPref.validateEmail,
		errorMessage:       ZmMsg.invalidEmail,
		precondition:		ZmSetting.NOTIF_FEATURE_ENABLED
	});

	ZmPref.registerPref("NOTIF_ENABLED", {
		displayName:		ZmMsg.mailNotifEnabled,
		displayContainer:	ZmPref.TYPE_CHECKBOX,
		precondition:		ZmSetting.NOTIF_FEATURE_ENABLED,
		validationFunction:	ZmMailApp.validateSendNotification,
		errorMessage:		ZmMsg.errorMissingNotifyAddr
	});

	ZmPref.registerPref("OPEN_MAIL_IN_NEW_WIN", {
		displayName:		ZmMsg.openMailNewWin,
		displayContainer:	ZmPref.TYPE_CHECKBOX,
        precondition:      ZmSetting.DETACH_MAILVIEW_ENABLED
    });

	ZmPref.registerPref("POP_DOWNLOAD_SINCE_VALUE", {
		displayContainer:	ZmPref.TYPE_STATIC,
		precondition:		ZmSetting.POP_ENABLED
	});
	ZmPref.registerPref("POP_DOWNLOAD_SINCE", {
		displayContainer:	ZmPref.TYPE_RADIO_GROUP,
		displayOptions:		[	ZmMsg.externalAccessPopDownloadAll,
								"*** NOT SHOWN ***",
								ZmMsg.externalAccessPopDownloadFromNow
							],
		options:			[	ZmMailApp.POP_DOWNLOAD_SINCE_ALL,
								ZmMailApp.POP_DOWNLOAD_SINCE_NO_CHANGE,
								ZmMailApp.POP_DOWNLOAD_SINCE_FROM_NOW
							],
		displayFunction:	ZmPref.downloadSinceDisplay,
		valueFunction:		ZmPref.downloadSinceValue,
		precondition:		ZmSetting.POP_ENABLED
	});

	ZmPref.registerPref("REPLY_TO_ADDRESS", {
		displayName:		ZmMsg.replyToAddress,
		displayContainer:	ZmPref.TYPE_INPUT,
		validationFunction: ZmPref.validateEmail,
		errorMessage:       ZmMsg.invalidEmail
	});

	ZmPref.registerPref("SIGNATURE", {
		displayName:		ZmMsg.signature,
		displayContainer:	ZmPref.TYPE_TEXTAREA,
		maxLength:			ZmPref.MAX_LENGTH[ZmSetting.SIGNATURE],
		errorMessage:       AjxMessageFormat.format(ZmMsg.invalidSignature, ZmPref.MAX_LENGTH[ZmSetting.SIGNATURE])
	});

	ZmPref.registerPref("SIGNATURE_ENABLED", {
		displayName:		ZmMsg.signatureEnabled,
		displayContainer:	ZmPref.TYPE_CHECKBOX
	});

	ZmPref.registerPref("SIGNATURE_STYLE", {
		displayName:		ZmMsg.signatureStyle,
		displayContainer:	ZmPref.TYPE_RADIO_GROUP,
		orientation:		ZmPref.ORIENT_HORIZONTAL,
		displayOptions:		[ZmMsg.aboveQuotedText, ZmMsg.atBottomOfMessage],
		options:			[ZmSetting.SIG_OUTLOOK, ZmSetting.SIG_INTERNET]
	});

	ZmPref.registerPref("SIGNATURES", {
		displayContainer:	ZmPref.TYPE_CUSTOM
	});

	ZmPref.registerPref("START_DATE_ENABLED", {
		displayContainer:	ZmPref.TYPE_CHECKBOX,
		displayName:		ZmMsg.startDate,
		precondition:		ZmSetting.VACATION_MSG_FEATURE_ENABLED
	});

	ZmPref.registerPref("VACATION_FROM", {
		displayName:		ZmMsg.startDate,
		displayContainer:	ZmPref.TYPE_INPUT,
		precondition:		ZmSetting.VACATION_MSG_FEATURE_ENABLED,
		displayFunction:	ZmPref.dateGMT2Local,
		valueFunction:		ZmPref.dateLocal2GMT
	});

        ZmPref.registerPref("VACATION_UNTIL", {
		displayName:		ZmMsg.endDate,
		displayContainer:	ZmPref.TYPE_INPUT,
		precondition:		ZmSetting.VACATION_MSG_FEATURE_ENABLED,
		displayFunction:	ZmPref.dateGMT2Local,
		valueFunction:		ZmPref.dateLocal2GMT
	});

    ZmPref.registerPref("VACATION_MSG", {
		displayName:		ZmMsg.awayMessage,
		displayContainer:	ZmPref.TYPE_TEXTAREA,
		maxLength:			ZmPref.MAX_LENGTH[ZmSetting.AWAY_MESSAGE],
		errorMessage:       AjxMessageFormat.format(ZmMsg.invalidAwayMessage, ZmPref.MAX_LENGTH[ZmSetting.AWAY_MESSAGE]),
		precondition:		ZmSetting.VACATION_MSG_FEATURE_ENABLED,
		validationFunction:	ZmMailApp.validateVacationMsg
	});

	ZmPref.registerPref("VACATION_MSG_ENABLED", {
		displayName:		ZmMsg.awayMessageEnabled,
		displayContainer:	ZmPref.TYPE_CHECKBOX,
		precondition:		ZmSetting.VACATION_MSG_FEATURE_ENABLED,
		validationFunction:	ZmMailApp.validateVacationMsgEnabled,
		errorMessage:		ZmMsg.missingAwayMessage
	});

	if (appCtxt.isOffline) {
		ZmPref.registerPref("OFFLINE_MAIL_TOASTER_ENABELD", {
			displayName:		(AjxEnv.isMac ? ZmMsg.showPopupMac : ZmMsg.showPopup),
			displayContainer:	ZmPref.TYPE_CHECKBOX
		});
	}
};

ZmMailApp.validateMailLocalDeliveryDisabled =
function(checked) {
	if (!checked) { return true; }
	var section = ZmPref.getPrefSectionWithPref(ZmSetting.MAIL_FORWARDING_ADDRESS);
	if (!section) { return false; }
	var view = appCtxt.getApp(ZmApp.PREFERENCES).getPrefController().getPrefsView();
	var input = view.getView(section.id).getFormObject(ZmSetting.MAIL_FORWARDING_ADDRESS);
	return (input != null && input.isValid());
};

ZmMailApp.validateSendNotification =
function(checked) {
	if (!checked) { return true; }
	var section = ZmPref.getPrefSectionWithPref(ZmSetting.NOTIF_ADDRESS);
	if (!section) { return false; }
	var view = appCtxt.getApp(ZmApp.PREFERENCES).getPrefController().getPrefsView();
	var input = view.getView(section.id).getFormObject(ZmSetting.NOTIF_ADDRESS);
	return (input != null && input.isValid());
};

/**
 * Make sure the server won't be sending out a blank away msg for the user. Check for a
 * combination of an empty away msg and a checked box for "send away message". Since a
 * pref is validated only if it changes, we have to have validation functions for both
 * prefs.
 */
ZmMailApp.validateVacationMsg =
function(awayMsg) {
	if (awayMsg && (awayMsg.length > 0)) { return true; }
	var section = ZmPref.getPrefSectionWithPref(ZmSetting.VACATION_MSG_ENABLED);
	if (!section) { return false; }
	var view = appCtxt.getApp(ZmApp.PREFERENCES).getPrefController().getPrefsView();
	var input = view.getView(section.id).getFormObject(ZmSetting.VACATION_MSG_ENABLED);
	return (input && !input.isSelected());
};

ZmMailApp.validateVacationMsgEnabled =
function(checked) {
	if (!checked) { return true; }
	var section = ZmPref.getPrefSectionWithPref(ZmSetting.VACATION_MSG);
	if (!section) { return false; }
	var view = appCtxt.getApp(ZmApp.PREFERENCES).getPrefController().getPrefsView();
	var input = view.getView(section.id).getFormObject(ZmSetting.VACATION_MSG);
	if (!input) { return false; }
	var awayMsg = input.getValue();
	return (awayMsg && (awayMsg.length > 0));
};

ZmMailApp.prototype._registerOrganizers =  function() {
	ZmOrganizer.registerOrg(ZmOrganizer.FOLDER,
							{app:				ZmApp.MAIL,
							 nameKey:			"folder",
							 defaultFolder:		ZmOrganizer.ID_INBOX,
							 soapCmd:			"FolderAction",
							 firstUserId:		256,
							 orgClass:			"ZmFolder",
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
							 shortcutKey:		"F",
							 openSetting:		ZmSetting.FOLDER_TREE_OPEN
							});

};

ZmMailApp.prototype._registerOperations =
function() {
	ZmOperation.registerOp(ZmId.OP_ADD_FILTER_RULE, {textKey:"newFilter", image:"Plus"}, ZmSetting.FILTERS_ENABLED);
	ZmOperation.registerOp(ZmId.OP_ADD_SIGNATURE, {textKey:"signature", image:"AddSignature", tooltipKey:"chooseSignature"}, ZmSetting.SIGNATURES_ENABLED);
	ZmOperation.registerOp(ZmId.OP_CHECK_MAIL, {textKey:"checkMail", tooltipKey:"checkMailTooltip", image:"Refresh", precedence:90});
	ZmOperation.registerOp(ZmId.OP_COMPOSE_OPTIONS, {textKey:"options", image:"Preferences"});
	ZmOperation.registerOp(ZmId.OP_DELETE_CONV, {textKey:"delConv", image:"DeleteConversation"}, ZmSetting.CONVERSATIONS_ENABLED);
	ZmOperation.registerOp(ZmId.OP_DELETE_MSG, {textKey:"delMsg", image:"DeleteMessage"});
	ZmOperation.registerOp(ZmId.OP_DELETE_MENU, {tooltipKey:"deleteTooltip", image:"Delete"});
	ZmOperation.registerOp(ZmId.OP_DETACH_COMPOSE, {tooltipKey:"detachTooltip", image:"OpenInNewWindow"});
	ZmOperation.registerOp(ZmId.OP_DRAFT, null, ZmSetting.SAVE_DRAFT_ENABLED);
	ZmOperation.registerOp(ZmId.OP_EDIT_FILTER_RULE, {textKey:"filterEdit", image:"Edit"}, ZmSetting.FILTERS_ENABLED);
	ZmOperation.registerOp(ZmId.OP_FORWARD, {textKey:"forward", tooltipKey:"forwardTooltip", image:"Forward", precedence:46});
	ZmOperation.registerOp(ZmId.OP_FORWARD_ATT, {textKey:"forwardAtt", tooltipKey:"forwardAtt", image:"Forward"});
	ZmOperation.registerOp(ZmId.OP_FORWARD_INLINE, {textKey:"forwardInline", tooltipKey:"forwardTooltip", image:"Forward"});
	//fixed bug:15460 removed reply and forward menu.
	/*ZmOperation.registerOp(ZmId.OP_FORWARD_MENU, {textKey:"forward", tooltipKey:"forwardTooltip", image:"Forward"}, null,
		AjxCallback.simpleClosure(function(parent) {
			ZmOperation.addDeferredMenu(ZmMailApp.addForwardMenu, parent);
	}));*/
	ZmOperation.registerOp(ZmId.OP_IM, {textKey:"newIM", image:"ImStartChat"}, ZmSetting.IM_ENABLED);
	ZmOperation.registerOp(ZmId.OP_INC_ATTACHMENT, {textKey:"includeMenuAttachment"});
	ZmOperation.registerOp(ZmId.OP_INC_NONE, {textKey:"includeMenuNone"});
	ZmOperation.registerOp(ZmId.OP_INC_NO_PREFIX, {textKey:"includeMenuNoPrefix"});
	ZmOperation.registerOp(ZmId.OP_INC_PREFIX, {textKey:"includeMenuPrefix"});
	ZmOperation.registerOp(ZmId.OP_INC_PREFIX_FULL, {textKey:"includeMenuPrefixFull"});
	ZmOperation.registerOp(ZmId.OP_INC_SMART, {textKey:"includeMenuSmart"});
	ZmOperation.registerOp(ZmId.OP_MARK_READ, {textKey:"markAsRead", image:"ReadMessage"});
	ZmOperation.registerOp(ZmId.OP_MARK_UNREAD, {textKey:"markAsUnread", image:"UnreadMessage"});
	ZmOperation.registerOp(ZmId.OP_MOVE_DOWN_FILTER_RULE, {textKey:"filterMoveDown", image:"DownArrow"}, ZmSetting.FILTERS_ENABLED);
	ZmOperation.registerOp(ZmId.OP_MOVE_UP_FILTER_RULE, {textKey:"filterMoveUp", image:"UpArrow"}, ZmSetting.FILTERS_ENABLED);
	ZmOperation.registerOp(ZmId.OP_NEW_MESSAGE, {textKey:"newEmail", tooltipKey:"newMessageTooltip", image:"NewMessage"});
	ZmOperation.registerOp(ZmId.OP_NEW_MESSAGE_WIN, {textKey:"newEmail", tooltipKey:"newMessageTooltip", image:"NewMessage"});
	ZmOperation.registerOp(ZmId.OP_REMOVE_FILTER_RULE, {textKey:"filterRemove", image:"Delete"}, ZmSetting.FILTERS_ENABLED);
	ZmOperation.registerOp(ZmId.OP_REPLY, {textKey:"reply", tooltipKey:"replyTooltip", image:"Reply", precedence:50});
	ZmOperation.registerOp(ZmId.OP_REPLY_ACCEPT, {textKey:"replyAccept", image:"Check"});
	ZmOperation.registerOp(ZmId.OP_REPLY_ALL, {textKey:"replyAll", tooltipKey:"replyAllTooltip", image:"ReplyAll", precedence:48});
	ZmOperation.registerOp(ZmId.OP_REPLY_CANCEL);
	ZmOperation.registerOp(ZmId.OP_REPLY_DECLINE, {textKey:"replyDecline", image:"Cancel"});
	//fixed bug:15460 removed reply and forward menu.
	/*ZmOperation.registerOp(ZmId.OP_REPLY_MENU, {textKey:"reply", tooltipKey:"replyTooltip", image:"Reply"}, ZmSetting.REPLY_MENU_ENABLED,
		AjxCallback.simpleClosure(function(parent) {
			ZmOperation.addDeferredMenu(ZmMailApp.addReplyMenu, parent);
	}));*/
	ZmOperation.registerOp(ZmId.OP_REPLY_MODIFY);
	ZmOperation.registerOp(ZmId.OP_REPLY_NEW_TIME, {textKey:"replyNewTime", image:"NewTime"});
	ZmOperation.registerOp(ZmId.OP_REPLY_TENTATIVE, {textKey:"replyTentative", image:"QuestionMark"});
	ZmOperation.registerOp(ZmId.OP_SAVE_DRAFT, {textKey:"saveDraft", tooltipKey:"saveDraftTooltip", image:"DraftFolder"}, ZmSetting.SAVE_DRAFT_ENABLED);
	ZmOperation.registerOp(ZmId.OP_SHOW_BCC, {textKey:"showBcc"});
	ZmOperation.registerOp(ZmId.OP_SHOW_ONLY_MAIL, {textKey:"showOnlyMail", image:"Conversation"}, ZmSetting.MIXED_VIEW_ENABLED);
	ZmOperation.registerOp(ZmId.OP_SHOW_ORIG, {textKey:"showOrig", image:"Message"});
	ZmOperation.registerOp(ZmId.OP_SPAM, {textKey:"junk", tooltipKey:"junkTooltip", image:"JunkMail", precedence:70}, ZmSetting.SPAM_ENABLED);
};

ZmMailApp.prototype._registerItems =
function() {
	ZmItem.registerItem(ZmItem.CONV,
						{app:			ZmApp.MAIL,
						 nameKey:		"conversation",
						 icon:			"Conversation",
						 soapCmd:		"ConvAction",
						 itemClass:		"ZmConv",
						 node:			"c",
						 organizer:		ZmOrganizer.FOLDER,
						 dropTargets:	[ZmOrganizer.FOLDER, ZmOrganizer.TAG, ZmOrganizer.ZIMLET],
						 searchType:	"conversation",
						 resultsList:
		AjxCallback.simpleClosure(function(search) {
			AjxDispatcher.require("MailCore");
			return new ZmMailList(ZmItem.CONV, search);
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
						 dropTargets:	[ZmOrganizer.FOLDER, ZmOrganizer.TAG, ZmOrganizer.ZIMLET],
						 searchType:	"message",
						 resultsList:
		AjxCallback.simpleClosure(function(search) {
			AjxDispatcher.require("MailCore");
			return new ZmMailList(ZmItem.MSG, search);
		}, this)
						});

	ZmItem.registerItem(ZmItem.ATT,
						{app:			ZmApp.MAIL,
						 nameKey:		"attachment",
						 icon:			"Attachment",
						 itemClass:		"ZmMimePart",
						 node:			"mp",
						 resultsList:
		AjxCallback.simpleClosure(function(search) {
			return new ZmMailList(ZmItem.ATT, search);
		}, this)
						});
};

ZmMailApp.prototype._setupSearchToolbar =
function() {
	if (appCtxt.get(ZmSetting.MAIL_ENABLED)) {
		ZmSearchToolBar.addMenuItem(ZmId.SEARCH_MAIL,
									{msgKey:		"searchMail",
									 tooltipKey:	"searchMail",
									 icon:			"Message",
									 shareIcon:		"SharedMailFolder",
									 id:			ZmId.getMenuItemId(ZmId.SEARCH, ZmId.SEARCH_MAIL)
									});
	}
};

ZmMailApp.prototype._setupCurrentAppToolbar =
function() {
	ZmCurrentAppToolBar.registerApp(this.getName(), ZmOperation.NEW_FOLDER, ZmOrganizer.FOLDER);
};

ZmMailApp.prototype._registerApp =
function() {
	var newItemOps = {};
	newItemOps[ZmOperation.NEW_MESSAGE] = "message";

	var actionCodes = {};
	actionCodes[ZmKeyMap.NEW_MESSAGE]		= ZmOperation.NEW_MESSAGE;
	actionCodes[ZmKeyMap.NEW_MESSAGE_WIN]	= ZmOperation.NEW_MESSAGE_WIN;

	ZmApp.registerApp(ZmApp.MAIL,
							 {mainPkg:				"MailCore",
							  nameKey:				"mail",
							  icon:					"MailApp",
							  chooserTooltipKey:	"goToMail",
							  viewTooltipKey:		"displayMailToolTip",
							  defaultSearch:		appCtxt.isChildWindow ? null : ZmId.SEARCH_MAIL,
							  organizer:			ZmOrganizer.FOLDER,
							  overviewTrees:		[ZmOrganizer.FOLDER, ZmOrganizer.ROSTER_TREE_ITEM, ZmOrganizer.SEARCH, ZmOrganizer.TAG],
							  showZimlets:			true,
							  assistants:			{"ZmMailAssistant":"Mail"},
							  searchTypes:			[ZmItem.MSG, ZmItem.CONV],
							  newItemOps:			newItemOps,
							  actionCodes:			actionCodes,
							  gotoActionCode:		ZmKeyMap.GOTO_MAIL,
							  newActionCode:		ZmKeyMap.NEW_MESSAGE,
							  qsViews:				["compose", "msg"],
							  trashViewOp:			ZmOperation.SHOW_ONLY_MAIL,
							  chooserSort:			10,
							  defaultSort:			10,
							  upsellUrl:			ZmSetting.MAIL_UPSELL_URL,
							  supportsMultiMbox:	true
							  });
};

// App API

ZmMailApp.prototype.startup =
function(result) {
};

/**
 * Normalize the notifications that occur when a virtual conv gets promoted to a real conv.
 * For example, a virtual conv with ID -676 and one msg (ID 676) receives a second msg (ID 677)
 * and becomes a real conv with an ID of 678. The following notifications will arrive:
 *
 *		deleted:	-676
 *		created:	c {id:678, n:2}
 *					m {id:677, cid:678}
 *		modified:	m {id:676, cid:678}
 *
 * Essentially, we want to handle this as:
 *
 *		modified:	c {id:-676, newId: 678}
 * 					m {id:676, cid:678}
 *
 */
ZmMailApp.prototype.preNotify =
function(notify) {
	if (!(notify.deleted && notify.created && notify.modified))	{ return notify; }

	// first, see if we are deleting any virtual convs (which have negative IDs)
	var virtConvDeleted = false;
	var deletedIds = notify.deleted.id.split(",");
	var virtConv = {};
	var newDeletedIds = [];
	for (var i = 0; i < deletedIds.length; i++) {
		var id = deletedIds[i];
		var nId = ZmOrganizer.normalizeId(id);
		if (nId < 0) {
			virtConv[nId] = true;
			virtConvDeleted = true;
		} else {
			newDeletedIds.push(id);
		}
	}
	if (!virtConvDeleted) { return notify; }

	// look for creates of convs that mean a virtual conv got promoted
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
			// this is *probably* a create for a real conv from a virtual conv
			createdConvs[id] = create;
			gotNewConv = true;
		}
	}
	if (!gotNewConv) { return notify; }

	// last thing to confirm virt conv promotion is msg changing cid
	var msgMoved = false;
	var newToOldCid = {};
	var modList = ZmRequestMgr._getObjList(notify.modified);
	var movedMsgs = {};
	for (var i = 0; i < modList.length; i++) {
		var mod = modList[i];
		var id = mod.id;
		var nId = ZmOrganizer.normalizeId(id);
		var name = mod._name;
		if (name == "m") {
			var virtCid = nId * -1;
			if (virtConv[virtCid] && createdConvs[mod.cid]) {
				msgMoved = true;
				movedMsgs[id] = mod;
				newToOldCid[mod.cid] = appCtxt.multiAccounts ? ZmOrganizer.getSystemId(virtCid) : virtCid;
				createdConvs[mod.cid]._wasVirtConv = true;
				createdConvs[mod.cid].m = [{id:id}];
				// go ahead and update the msg cid, since it's used in
				// notification processing for creates
				var msg = appCtxt.getById(id);
				if (msg) {
					msg.cid = mod.cid;
				}
			}
		}
	}
	if (!msgMoved) { return notify; }

	// We're promoting a virtual conv. Normalize the notifications object, and
	// process a preliminary notif that will update the virtual conv's ID to its
	// new value.

	// First, remove the virt conv from the list of deleted IDs
	if (newDeletedIds.length) {
		notify.deleted.id = newDeletedIds.join(",");
	} else {
		delete notify.deleted;
	}

	// if the first msg matched the current search, we'll want to use the conv
	// create node to create the conv later, so save it
	for (var id in createdMsgs) {
		var msgCreate = createdMsgs[id];
		var convCreate = createdConvs[msgCreate.cid];
		if (convCreate && convCreate._wasVirtConv) {
			msgCreate._convCreateNode = convCreate;
		}
	}

	// create modified notifs for the virtual convs that have been promoted, using
	// the create notif for the conv as a base
	var newMods = [];
	for (var cid in newToOldCid) {
		var node = createdConvs[cid];
		node.id = newToOldCid[cid];
		node._newId = cid;
		newMods.push(node);
	}

	// Go ahead and process these changes, which will change the ID of each promoted conv
	// from its virtual (negative) ID to its real (positive) one. That will replace the DOM
	// IDs of that conv's elements with ones that reflect the new conv ID.
	if (newMods.length) {
		var mods = {};
		mods["c"] = newMods;
		appCtxt.getRequestMgr()._handleModifies(mods);
	}

	// process the normalized notifications
	return notify;
};

/**
 * For mail creates, there is no authoritative list (mail lists are always the result
 * of a search), so we notify each ZmMailList that we know about. To make life easier,
 * we figure out which folder(s) a conv spans before we hand it off.
 * <p>
 * Since the offline client may receive hundreds of create notifications at a time, we
 * make sure a create notification is relevant before creating a mail item.</p>
 *
 * @param creates	[hash]		hash of create notifications
 */
ZmMailApp.prototype.createNotify =
function(creates, force) {
	var mailCreates = creates["m"];
	if (!mailCreates && !creates["c"] && !creates["link"]) { return; }
	if (!force && !this._noDefer && this._deferNotifications("create", creates)) { return; }

	if (creates["link"]) {
		var list = creates["link"];
		for (var i = 0; i < list.length; i++) {
			var create = list[i];
			if (appCtxt.cacheGet(create.id)) { continue; }
			this._handleCreateLink(create, ZmOrganizer.FOLDER);
		}
	}

	this._handleAlerts(creates, mailCreates);
};

ZmMailApp.prototype._handleAlerts =
function(creates, mailCreates) {
	var alertNewMail = false;
	if (this._tradController && (appCtxt.getCurrentController() == this._tradController)) {
		// can't get to another controller without running a search
		alertNewMail = this._checkList(creates, this._tradController.getList(), this._tradController);
	} else {
		// these two controllers can be active together without an intervening search
		if (this._convListController) {
			alertNewMail = this._checkList(creates, this._convListController.getList(), this._convListController);
		}
		if (this._convController) {
			alertNewMail = this._checkList(creates, this._convController.getList(), this._convController) || alertNewMail;
		}
	}

	// get alert prefs for all accounts
	var soundAlertsOn, appAlertsOn, browserAlertsOn = false;
	var accounts = appCtxt.getZimbraAccounts();
	for (var i in accounts) {
		var acct = accounts[i];
		if (acct.visible) {
			if (appCtxt.get(ZmSetting.MAIL_NOTIFY_SOUNDS, null, acct))	soundAlertsOn = true;
			if (appCtxt.get(ZmSetting.MAIL_NOTIFY_APP, null, acct))		appAlertsOn = true;
			if (appCtxt.get(ZmSetting.MAIL_NOTIFY_BROWSER, null, acct))	browserAlertsOn = true;
		}
	}

	// if not a single account has alert prefs turned on, bail - and for offline,
	// we additionally popup a toaster so always follow thru   
	if (!soundAlertsOn && !appAlertsOn && !browserAlertsOn && !appCtxt.isOffline) { return; }

	// If we didn't display an alert-worthy new message, loop thru all creates
	// for all accounts looking for one.
	var accountAlerts = [];
	if (mailCreates && (!alertNewMail || appCtxt.multiAccounts)) {
		var parsedId;
		for (var i = 0, count = mailCreates.length; i < count; i++) {
			var mc = mailCreates[i];
			var parsedId = (mc && mc.f && (mc.f.indexOf(ZmItem.FLAG_UNREAD) != -1))
				? ZmOrganizer.parseId(mc.l) : null;

			if (parsedId && parsedId.id == ZmOrganizer.ID_INBOX &&
				parsedId.account && !parsedId.account.isOfflineInitialSync())
			{
				accountAlerts.push(parsedId.account);
			}
		}
	}

	// If any alert-worthy mail, beep and flash browser.
	if (alertNewMail || (accountAlerts.length > 0)) {
		AjxDispatcher.require("Alert");
		if (soundAlertsOn) {
			ZmSoundAlert.getInstance().start();
		}
		if (browserAlertsOn) {
			ZmBrowserAlert.getInstance().start(ZmMsg.newMessage);
		}
	}

	// Do any alert on the mail app tab.
	if (appAlertsOn && (alertNewMail || (accountAlerts.length > 0)) &&
		(appCtxt.getActiveAccount() == appCtxt.getMainAccount()))
	{
		this.startAlert();
	}

	// Do any account-specifc alerts (i.e. flash accordion item)
	if (accountAlerts.length > 0) {
		AjxDispatcher.require("Alert");
		for (var i = 0; i < accountAlerts.length; i++) {
			ZmAccountAlert.get(accountAlerts[i]).start(this, creates);
		}

		if (appCtxt.isOffline && window.platform &&
			(AjxEnv.isWindows || AjxEnv.isMac) &&
			appCtxt.get(ZmSetting.OFFLINE_MAIL_TOASTER_ENABELD))
		{
			var winText = {};
			var msgs = creates["m"] || [];
			for (var i = 0; i < msgs.length && i < 5; i++) {
				var id = msgs[i].id;
				var msg = appCtxt.getById(id);
				
				if (msg) {
					var pid = ZmOrganizer.parseId(id);
					var text = (msg.subject)
						? ([msg.subject, " - ", (msg.fragment || "")].join(""))
						: (msg.fragment || "");

					if (AjxEnv.isMac) {
						var title = (appCtxt.numVisibleAccounts > 1)
							? ([ZmMsg.newMail, " (", pid.account.getDisplayName(), ")"].join(""))
							: ZmMsg.newMail;
						window.platform.showNotification(title, text, "resource://webapp/icons/default/launcher.icns");
					} else if (AjxEnv.isWindows) {
						var disp = pid.account.getDisplayName();
						if (!winText[disp]) {
							winText[disp] = [];
						}
						winText[disp].push(text);
					}
				}
			}

			if (AjxEnv.isWindows) {
				window.platform.icon().showBalloonTip("test", "test2", 5);
				var balloonText = [];
				for (var j in winText) {
					balloonText.push(j + "\n  " + winText[j].join("\n  "));
				}
				if (balloonText.length > 0) {
					if (msgs.length > 5) {
						balloonText.push(ZmMsg.andMore);
					}
					window.platform.icon().showBalloonTip(ZmMsg.newMail, balloonText.join("\n"), 5);
				}
			}
		}
	}
};

/**
 * We can only handle new mail notifications if:
 *  	- we are currently in a mail view
 *		- the view is the result of a simple folder search (except for CV)
 *
 * @param creates		[hash]					JSON create objects
 * @param list			[ZmMailList]			mail list to notify
 * @param controller	[ZmMailListController]	controller that owns list
 * @return 				[boolean]	true if there's an alert-worthy new message
 */
ZmMailApp.prototype._checkList =
function(creates, list, controller) {

	if (!(list && list instanceof ZmMailList)) { return; }

	var convs = {};
	var msgs = {};
	var folders = {};

	// XXX: should handle simple tag search as well
	var folderId = list.search ? list.search.folderId : null;
	if (!folderId && (controller != this._convController)) { return; }

	var sortBy = list.search.sortBy;
	var a = list.getArray();
	var listView = controller.getCurrentView();
	var limit = listView ? listView.getLimit() : appCtxt.get(ZmSetting.PAGE_SIZE);

	var last = (a && a.length >= limit) ? a[a.length - 1] : null;
	var cutoff = last ? last.date : null;
	DBG.println(AjxDebug.DBG2, "cutoff = " + cutoff + ", list size = " + a.length);

	var gotConvs = this._checkType(creates, ZmItem.CONV, convs, list, sortBy, cutoff);
	var gotMsgs = this._checkType(creates, ZmItem.MSG, msgs, list, sortBy, cutoff, convs);

	if (gotConvs.gotItem || gotMsgs.gotItem) {
		list.notifyCreate(convs, msgs);
	}
	return gotMsgs.gotAlertMessage;
};

/**
 * Handles the creates for the given type of mail item.
 *
 * @param creates	[array]			list of JSON create nodes
 * @param type		[constant]		mail item type
 * @param items		[hash]			hash of created mail items
 * @param currList	[ZmMailList]	list currently being displayed to user
 * @param sortBy	[constant]		sort order
 * @param cutoff	[int]			timestamp of last item in list
 * @param convs		[hash]			convs, so we can update folders from msgs
 *
 * @return	a hash with booleans gotItem and gotAlertMessage
 */
ZmMailApp.prototype._checkType =
function(creates, type, items, currList, sortBy, cutoff, convs) {
	var result = { gotItem: false, gotAlertMessage: false};
	var nodeName = ZmList.NODE[type];
	var list = creates[nodeName];
	if (!(list && list.length)) { return result; }
	for (var i = 0; i < list.length; i++) {
		var create = list[i];
		if (create._handled) { continue; }
		create._handled = true;

		// ignore stuff we already have
		if (currList.getById(create.id) || create._wasVirtConv) { continue; }

		// new conv does not affect a list of msgs
		if (currList.type == ZmItem.MSG && type == ZmItem.CONV) { continue; }

		// perform stricter checking if we're in offline mode
		if (appCtxt.isOffline && !this._checkCreate(create, type, currList, sortBy, cutoff)) { continue; }

		DBG.println(AjxDebug.DBG1, "ZmMailApp: handling CREATE for node: " + nodeName);
		var itemClass = eval(ZmList.ITEM_CLASS[type]);
		var item = itemClass.createFromDom(create, {}, true);
		items[item.id] = item;
		result.gotItem = true;
		if ((item.folderId == ZmOrganizer.ID_INBOX) && item.isUnread && !appCtxt.getActiveAccount().isOfflineInitialSync()) {
			result.gotAlertMessage = true;
		}
	}
	return result;
};

/**
 * Checks a mail create to make sure it will result in a UI change, so that we don't
 * process it unnecessarily. The major motivation for doing this is handling a large
 * sync for the offline client, where we get a flood of mail creates.
 *
 * @param create	[object]		the JSON node for the create
 * @param type		[constant]		mail item type
 * @param currList	[ZmMailList]	list currently being displayed to user
 * @param sortBy	[constant]		sort order
 * @param cutoff	[int]			timestamp of last item in list
 */
ZmMailApp.prototype._checkCreate =
function(create, type, currList, sortBy, cutoff) {

	var nodeName = ZmList.NODE[type];

	// ignore items that are not of the current type (except CLV, since a new
	// msg may affect fields in its conv)
	if ((ZmList.ITEM_TYPE[nodeName] != currList.type) && (currList.type != ZmItem.CONV)) {
		DBG.println(AjxDebug.DBG2, "new " + type + " not of current type");
		return false;
	}

	// ignore mail that falls outside our range
	if (sortBy == ZmSearch.DATE_DESC && (create.d < cutoff)) {
		DBG.println(AjxDebug.DBG2, "new " + type + " is too old: " + create.d);
		return false;
	}
	if (sortBy == ZmSearch.DATE_ASC && (create.d > cutoff)) {
		DBG.println(AjxDebug.DBG2, "new " + type + " is too new: " + create.d);
		return false;
	}

	return true;
};

ZmMailApp.prototype.postNotify =
function(notify) {
	if (this._checkReplenishListView) {
		this._checkReplenishListView._checkReplenish();
		this._checkReplenishListView = null;
	}
};

ZmMailApp.prototype.refresh =
function(refresh) {

	var inbox = appCtxt.getById(ZmFolder.ID_INBOX);
	if (inbox) {
		this.setNewMailNotice(inbox);
	}

	if (!appCtxt.inStartup) {
		var account = (appCtxt.multiAccounts && !appCtxt.isOffline)
			? appCtxt.getMainAccount(true) : null;
		this.resetOverview(this.getOverviewId(account));
		var req = appCtxt.currentRequestParams;
		if (appCtxt.getCurrentAppName() == this._name && req.resend && req.methodName == "NoOpRequest") {
			var curView = appCtxt.getCurrentViewId();
			if (curView == ZmId.VIEW_CONVLIST || curView == ZmId.VIEW_TRAD) {
				appCtxt.getSearchController().redoSearch(this.currentSearch);
			}
		}
	}
};

ZmMailApp.prototype.handleOp =
function(op, params) {
	var inNewWindow = false;
	var showLoadingPage = true;
	switch (op) {
		case ZmOperation.NEW_MESSAGE_WIN:
			inNewWindow = true;
			showLoadingPage = false;	// don't show "Loading ..." page since main window view doesn't change
		case ZmOperation.NEW_MESSAGE:
			if (!inNewWindow && params && params.ev) {
				inNewWindow = this._inNewWindow(params.ev);
				showLoadingPage = false;
			}
			var loadCallback = new AjxCallback(this, this._handleLoadNewMessage, [inNewWindow]);
			AjxDispatcher.require(["ContactsCore", "Contacts"], false, loadCallback, null, showLoadingPage);
			break;
	}
};

ZmMailApp.prototype._handleLoadNewMessage =
function(inNewWindow) {
	AjxDispatcher.run("Compose", {action: ZmOperation.NEW_MESSAGE, inNewWindow:inNewWindow});
};

// Public methods

ZmMailApp.prototype.launch =
function(params, callback) {
	var query;
	params = params || {};

	if (location && location.search) {
		if (params.checkQS) {
			if (location.search.match(/\bview=compose\b/)) {
				this._showComposeView(callback);
				return;
			}
			else if (location.search.match(/\bview=msg\b/)) {
				var match = location.search.match(/\bid=(\d+)/);
				var id = match ? match[1] : null;
				if (id) {
					query = ["item:", id].join("");
					params.searchResponse = null;
					this._forceMsgView = true;
				}
			}
		}
		else if (appCtxt.get(ZmSetting.OFFLINE_SUPPORTS_MAILTO) && !appCtxt.multiAccounts) {
			if (appCtxt.getAppController().handleOfflineMailTo(location.search, callback))
				return;
		}
	}

	// set type for initial search
	this._groupBy[appCtxt.getActiveAccount().name] = appCtxt.get(ZmSetting.GROUP_MAIL_BY);
	this._mailSearch(query, callback, params.searchResponse);
};

ZmMailApp.prototype._handleErrorLaunch =
function(params, ex) {
	if (ex.code == ZmCsfeException.MAIL_NO_SUCH_FOLDER ||
		ex.code == ZmCsfeException.MAIL_NO_SUCH_TAG ||
		ex.code == ZmCsfeException.MAIL_QUERY_PARSE_ERROR)
	{
		// reset the params so we default to searching the inbox which *will* work
		var newParams = {query:"in:inbox", callback:params.callback, errorCallback:null, types:params.types};
		appCtxt.getSearchController().search(newParams);
	}
};

ZmMailApp.prototype._activateAccordionItem =
function(accordionItem, callback) {
	ZmApp.prototype._activateAccordionItem.call(this, accordionItem);

	if (appCtxt.isOffline || !appCtxt.inStartup) {
		this._addSettingsChangeListeners();

		// *reset* type for initial search
		this._groupBy[appCtxt.getActiveAccount().name] = appCtxt.get(ZmSetting.GROUP_MAIL_BY);

		var respCallback = (appCtxt.inStartup && appCtxt.multiAccounts)
			? (new AjxCallback(this, this._handleOfflineMailSearch)) : callback;
		this._mailSearch(null, respCallback);
	}
};

ZmMailApp.prototype._mailSearch =
function(query, callback, response) {
	query = query || appCtxt.get(ZmSetting.INITIAL_SEARCH);
	var types = new AjxVector();
	types.add(this.getGroupMailBy());

	var params = {
		searchFor: ZmId.SEARCH_MAIL,
		query: query,
		types: types,
		getHtml: appCtxt.get(ZmSetting.VIEW_AS_HTML),
		callback: callback,
		response: response
	};
	params.errorCallback = new AjxCallback(this, this._handleErrorLaunch, params);
	appCtxt.getSearchController().search(params);
};

ZmMailApp.prototype._handleOfflineMailSearch =
function() {
	if (appCtxt.get(ZmSetting.OFFLINE_SUPPORTS_MAILTO)) {
		appCtxt.getAppController().handleOfflineMailTo(location.search);
	}
};

ZmMailApp.prototype.getSearchParams =
function(params) {
	params = params || {};
	if (!appCtxt.inStartup && appCtxt.get(ZmSetting.READING_PANE_ENABLED)) {
		params.fetch = true;
	}
	return params;
};

ZmMailApp.prototype.showSearchResults =
function(results, callback) {
	var loadCallback = new AjxCallback(this, this._handleLoadShowSearchResults, [results, callback]);
	AjxDispatcher.require("MailCore", false, loadCallback, null, true);
};

ZmMailApp.prototype._handleLoadShowSearchResults =
function(results, callback) {
	var controller = (results.type == ZmItem.MSG) ? this.getTradController() : this.getConvListController();
	controller.show(results);
	if (this._forceMsgView) {
		controller.selectFirstItem();
		this._forceMsgView = false;
	}

	if (callback) {
		callback.run();
	}
	if (!this._hasRendered) {
		appCtxt.getAppController().appRendered(this._name);
		this._hasRendered = true;
	}
};

ZmMailApp.prototype._showComposeView =
function(callback, queryStr) {
	var qs = queryStr || location.search;

	AjxDispatcher.require("Startup2");
	var cc = AjxDispatcher.run("GetComposeController");
	var match = qs.match(/\bsubject=([^&]+)/);
	var subject = match ? (decodeURIComponent(match[1]).replace(/\+/g, " ")) : null;
	match = qs.match(/\bto=([^&]+)/);
	var to = match ? decodeURIComponent(match[1]) : null;
	match = qs.match(/\bbody=([^&]+)/);
	var body = match ? (decodeURIComponent(match[1]).replace(/\+/g, " ")) : null;
	var params = {
		action: ZmOperation.NEW_MESSAGE,
		toOverride: to,
		subjOverride: subject,
		extraBodyText: body,
		callback: callback
	};

	// this can happen in offlie where user clicks on mailto link and we're
	// already in compose view
	if (appCtxt.isOffline &&
		appCtxt.get(ZmSetting.OFFLINE_SUPPORTS_MAILTO) &&
		appCtxt.getCurrentViewId() == ZmId.VIEW_COMPOSE)
	{
		cc.resetComposeForMailto(params);
	} else {
		cc.doAction(params);W
	}

	if (!this._hasRendered) {
		appCtxt.getAppController().appRendered(this._name);
		this._hasRendered = true;
	}
};

ZmMailApp.prototype.getConvListController =
function() {
	if (!this._convListController) {
		this._convListController = new ZmConvListController(this._container, this);
	}
	return this._convListController;
};

ZmMailApp.prototype.getConvController =
function() {
	if (!this._convController) {
		this._convController = new ZmConvController(this._container, this);
	}
	return this._convController;
};

ZmMailApp.prototype.getTradController =
function() {
	if (!this._tradController) {
		this._tradController = new ZmTradController(this._container, this);
	}
	return this._tradController;
};

ZmMailApp.prototype.getMsgController =
function() {
	if (!this._msgController) {
		this._msgController = new ZmMsgController(this._container, this);
	}
	return this._msgController;
};

ZmMailApp.prototype.getComposeController =
function() {
	if (!this._composeController) {
		this._composeController = new ZmComposeController(this._container, this);
	}
	return this._composeController;
};

ZmMailApp.prototype.getMailListController =
function() {
	var groupMailBy = appCtxt.get(ZmSetting.GROUP_MAIL_BY);
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

ZmMailApp.prototype.setNewMailNotice =
function(organizer) {
	var appChooser = appCtxt.getAppController().getAppChooser();
	if (appChooser) {
		var mb = appChooser.getButton(ZmApp.MAIL);
		var icon = (organizer.numUnread > 0) ? "EnvelopeOpen" : "MailApp";
		mb.setImage(icon);
	}

	// if offline, always update *inbox* unread count for all accounts
	if (appCtxt.isOffline && appCtxt.get(ZmSetting.OFFLINE_SUPPORTS_DOCK_UPDATE)) {
		var accounts = appCtxt.getZimbraAccounts();
		var unreadCount = 0;
		for (var i in accounts) {
			var acct = accounts[i];
			if (acct.visible) {
				unreadCount += (acct.unread || 0);
			}
		}
		if (AjxEnv.isMac && window.platform) {
			window.platform.icon().badgeText = (unreadCount > 0)
				? unreadCount : null;
		}
		else if (AjxEnv.isWindows) {
			window.platform.icon().imageSpec = (unreadCount > 0)
				? "resource://webapp/icons/default/newmail.png"
				: "resource://webapp/icons/default/launcher.ico";
			window.platform.icon().title = (unreadCount > 0)
				? AjxMessageFormat.format(ZmMsg.unreadCount, unreadCount) : null;
		}
	}
};

/**
* Convenience method to convert "group mail by" between server (string)
* and client (int constant) versions.
*/
ZmMailApp.prototype.getGroupMailBy =
function() {
	var groupBy = this._groupBy[appCtxt.getActiveAccount().name];
	var setting = groupBy || appCtxt.get(ZmSetting.GROUP_MAIL_BY);
	return setting ? ZmMailApp.GROUP_MAIL_BY_ITEM[setting] : ZmItem.MSG;
};

ZmMailApp.prototype.setGroupMailBy =
function(groupBy) {
	this._groupBy[appCtxt.getActiveAccount().name] = groupBy;
	appCtxt.set(ZmSetting.GROUP_MAIL_BY, groupBy);
};

/**
* Adds a "Reply" submenu for replying to sender or all.
*
* @param parent		parent widget (a toolbar or action menu)
*/
ZmMailApp.addReplyMenu =
function(parent) {
	var list = [ZmOperation.REPLY, ZmOperation.REPLY_ALL];
	var menu = new ZmActionMenu({parent:parent, menuItems:list});
	parent.setMenu(menu);
	return menu;
};

/**
* Adds a "Forward" submenu for forwarding inline or as attachment
*
* @param parent		parent widget (a toolbar or action menu)
*/
ZmMailApp.addForwardMenu =
function(parent) {
	var list = [ZmOperation.FORWARD_INLINE, ZmOperation.FORWARD_ATT];
	var menu = new ZmActionMenu({parent:parent, menuItems:list});
	parent.setMenu(menu);
	return menu;
};

ZmMailApp.prototype.getDataSourceCollection =
function() {
	var appCtxt = window.parentAppCtxt || window.appCtxt;
	var activeAcct = appCtxt.getActiveAccount().name;

	if (!this._dataSourceCollection[activeAcct]) {
		this._dataSourceCollection[activeAcct] = new ZmDataSourceCollection();
		if (appCtxt.getActiveAccount().isMain) {
			this._dataSourceCollection[activeAcct].initialize(appCtxt.getSettings().getInfoResponse.dataSources);
		}
	}
	return this._dataSourceCollection[activeAcct];
};

ZmMailApp.prototype.getIdentityCollection =
function() {
	// child window always gets its own identitiy collection
	if (appCtxt.isChildWindow) {
		if (!this._identityCollection) {
			this._identityCollection = new ZmIdentityCollection();
		}
		return this._identityCollection;
	}

	var activeAcct = appCtxt.getActiveAccount().name;

	if (!this._identityCollection[activeAcct]) {
		this._identityCollection[activeAcct] = new ZmIdentityCollection();
		if (appCtxt.getActiveAccount().isMain) {
			this._identityCollection[activeAcct].initialize(appCtxt.getSettings().getInfoResponse.identities);
		}
	}
	return this._identityCollection[activeAcct];
};

ZmMailApp.prototype.getSignatureCollection =
function() {
	var appCtxt = window.parentAppCtxt || window.appCtxt;
	var activeAcct = appCtxt.getActiveAccount().name;

	if (!this._signatureCollection[activeAcct]) {
		this._signatureCollection[activeAcct] = new ZmSignatureCollection();
		if (appCtxt.getActiveAccount().isMain) {
			this._signatureCollection[activeAcct].initialize(appCtxt.getSettings().getInfoResponse.signatures);
		}
	}
	return this._signatureCollection[activeAcct];
};

ZmMailApp.prototype._addSettingsChangeListeners =
function() {
	if (!this._settingListener) {
		this._settingListener = new AjxListener(this, this._settingChangeListener);
	}
	if (!this._settingsListener) {
		this._settingsListener = new AjxListener(this, this._settingsChangeListener);
	}

	var settings = appCtxt.getSettings();
	settings.getSetting(ZmSetting.VIEW_AS_HTML).addChangeListener(this._settingListener);
	settings.addChangeListener(this._settingsListener);
};

/**
 * Individual setting listener.
 */
ZmMailApp.prototype._settingChangeListener =
function(ev) {
	if (ev.type != ZmEvent.S_SETTING) { return; }

	var setting = ev.source;
	var mlc = this.getMailListController();
	if (!mlc) { return; }

	if (setting.id == ZmSetting.VIEW_AS_HTML) {
		var dpv = mlc._doublePaneView;
		if (dpv) {
			var msg = dpv.getMsg();
			if (msg) {
				dpv.reset();
				dpv.setMsg(msg);
			}
		}
	}
};

/**
 * Settings listener. Process changed settings as a group, so that we
 * don't redo the search more than once if more than one relevant mail
 * setting has changed.
 */
ZmMailApp.prototype._settingsChangeListener =
function(ev) {
	if (ev.type != ZmEvent.S_SETTINGS) { return; }

	var list = ev.getDetail("settings");
	if (!(list && list.length)) { return; }

	var mlc = this.getMailListController();
	if (!mlc) { return; }

	var curView = mlc._currentView;
	var newView, groupByView;

	for (var i = 0; i < list.length; i++) {
		var setting = list[i];
		if (setting.id == ZmSetting.PAGE_SIZE) {
			if (curView != ZmId.VIEW_MSG) {
				newView = groupByView || curView;
			}
		} else if (setting.id == ZmSetting.SHOW_FRAGMENTS) {
			if (curView != ZmId.VIEW_MSG) {
				newView = groupByView || curView;
			}
		}
	}
	newView = groupByView || newView;

	if (newView) {
		mlc.switchView(newView, true);
	}
};
