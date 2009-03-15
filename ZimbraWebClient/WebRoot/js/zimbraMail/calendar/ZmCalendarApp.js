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

ZmCalendarApp = function(container) {

	ZmApp.call(this, ZmApp.CALENDAR, container);

	if (!appCtxt.isOffline) {
		this._addSettingsChangeListeners();
	}

	// resource cache
	this._resByName = {};
	this._resByEmail = {};
};

// Organizer and item-related constants
ZmEvent.S_APPT				= ZmId.ITEM_APPOINTMENT;
ZmEvent.S_RESOURCE			= ZmId.ITEM_RESOURCE;
ZmItem.APPT					= ZmEvent.S_APPT;
ZmItem.RESOURCE				= ZmEvent.S_RESOURCE;
ZmOrganizer.CALENDAR		= ZmId.ORG_CALENDAR;

// App-related constants
ZmApp.CALENDAR							= ZmId.APP_CALENDAR;
ZmApp.CLASS[ZmApp.CALENDAR]				= "ZmCalendarApp";
ZmApp.SETTING[ZmApp.CALENDAR]			= ZmSetting.CALENDAR_ENABLED;
ZmApp.UPSELL_SETTING[ZmApp.CALENDAR]	= ZmSetting.CALENDAR_UPSELL_ENABLED;
ZmApp.LOAD_SORT[ZmApp.CALENDAR]			= 40;
ZmApp.QS_ARG[ZmApp.CALENDAR]			= "calendar";

// ms to wait before fetching reminders
ZmCalendarApp.REMINDER_START_DELAY = 10000;
ZmCalendarApp.MINICAL_DELAY = 5000;

ZmCalendarApp.COLORS = [];
// these need to match CSS rules
ZmCalendarApp.COLORS[ZmOrganizer.C_ORANGE]	= "Orange";
ZmCalendarApp.COLORS[ZmOrganizer.C_BLUE]	= "Blue";
ZmCalendarApp.COLORS[ZmOrganizer.C_CYAN]	= "Cyan";
ZmCalendarApp.COLORS[ZmOrganizer.C_GREEN]	= "Green";
ZmCalendarApp.COLORS[ZmOrganizer.C_PURPLE]	= "Purple";
ZmCalendarApp.COLORS[ZmOrganizer.C_RED]		= "Red";
ZmCalendarApp.COLORS[ZmOrganizer.C_YELLOW]	= "Yellow";
ZmCalendarApp.COLORS[ZmOrganizer.C_PINK]	= "Pink";
ZmCalendarApp.COLORS[ZmOrganizer.C_GRAY]	= "Gray";

ZmCalendarApp.CUTYPE_INDIVIDUAL			= "IND";
ZmCalendarApp.CUTYPE_GROUP				= "GRO";
ZmCalendarApp.CUTYPE_RESOURCE			= "RES";
ZmCalendarApp.CUTYPE_ROOM				= "ROO";
ZmCalendarApp.CUTYPE_UNKNOWN			= "UNK";

ZmCalendarApp.STATUS_CANC				= "CANC";		// vevent, vtodo
ZmCalendarApp.STATUS_COMP				= "COMP";		// vtodo
ZmCalendarApp.STATUS_CONF				= "CONF";		// vevent
ZmCalendarApp.STATUS_DEFR				= "DEFERRED";	// vtodo					[outlook]
ZmCalendarApp.STATUS_INPR				= "INPR";		// vtodo
ZmCalendarApp.STATUS_NEED				= "NEED";		// vtodo
ZmCalendarApp.STATUS_TENT				= "TENT";		// vevent
ZmCalendarApp.STATUS_WAIT				= "WAITING";	// vtodo					[outlook]

ZmCalendarApp.prototype = new ZmApp;
ZmCalendarApp.prototype.constructor = ZmCalendarApp;

ZmCalendarApp.prototype.toString = 
function() {
	return "ZmCalendarApp";
};

// Construction

ZmCalendarApp.prototype._defineAPI =
function() {
	AjxDispatcher.setPackageLoadFunction("CalendarCore", new AjxCallback(this, this._postLoadCore));
	AjxDispatcher.setPackageLoadFunction("Calendar", new AjxCallback(this, this._postLoad, ZmOrganizer.CALENDAR));
	AjxDispatcher.registerMethod("GetCalController", "CalendarCore", new AjxCallback(this, this.getCalController));
	AjxDispatcher.registerMethod("GetReminderController", "CalendarCore", new AjxCallback(this, this.getReminderController));
	AjxDispatcher.registerMethod("ShowMiniCalendar", "CalendarCore", new AjxCallback(this, this.showMiniCalendar));
	AjxDispatcher.registerMethod("GetApptComposeController", ["CalendarCore", "Calendar", "CalendarAppt"], new AjxCallback(this, this.getApptComposeController));
};

ZmCalendarApp.prototype._registerSettings =
function(settings) {
	var settings = settings || appCtxt.getSettings();
	settings.registerSetting("CAL_ALWAYS_SHOW_MINI_CAL",	{name: "zimbraPrefCalendarAlwaysShowMiniCal", type: ZmSetting.T_PREF, dataType: ZmSetting.D_BOOLEAN, defaultValue: false});
    settings.registerSetting("CAL_APPT_VISIBILITY",			{name: "zimbraPrefCalendarApptVisibility", type: ZmSetting.T_PREF, dataType: ZmSetting.D_STRING, defaultValue: "public"});    
	settings.registerSetting("CAL_EXPORT",					{type: ZmSetting.T_PREF, dataType: ZmSetting.D_NONE});
	settings.registerSetting("CAL_FIRST_DAY_OF_WEEK",		{name: "zimbraPrefCalendarFirstDayOfWeek", type: ZmSetting.T_PREF, dataType: ZmSetting.D_INT, defaultValue: 0});
	settings.registerSetting("CAL_FREE_BUSY_ACL",			{type: ZmSetting.T_PREF, defaultValue:ZmSetting.ACL_ALL});
	settings.registerSetting("CAL_FREE_BUSY_ACL_USERS",		{type: ZmSetting.T_PREF});
	settings.registerSetting("CAL_IMPORT",					{type: ZmSetting.T_PREF, dataType: ZmSetting.D_NONE});
	settings.registerSetting("CAL_INVITE_ACL",				{type: ZmSetting.T_PREF, defaultValue:ZmSetting.ACL_ALL});
	settings.registerSetting("CAL_INVITE_ACL_USERS",		{type: ZmSetting.T_PREF});
	settings.registerSetting("CAL_REMINDER_NOTIFY_SOUNDS",	{name: "zimbraPrefCalendarReminderSoundsEnabled", type:ZmSetting.T_PREF, dataType:ZmSetting.D_BOOLEAN, defaultValue:true});
	settings.registerSetting("CAL_REMINDER_NOTIFY_BROWSER",	{name: "zimbraPrefCalendarReminderFlashTitle", type:ZmSetting.T_PREF, dataType:ZmSetting.D_BOOLEAN, defaultValue:true});
	settings.registerSetting("CAL_REMINDER_NOTIFY_TOASTER",	{name:"zimbraPrefCalendarToasterEnabled", type:ZmSetting.T_PREF, dataType:ZmSetting.D_BOOLEAN, defaultValue:false});
	settings.registerSetting("CAL_REMINDER_WARNING_TIME",	{name: "zimbraPrefCalendarApptReminderWarningTime", type: ZmSetting.T_PREF, dataType: ZmSetting.D_INT, defaultValue: 0});
	settings.registerSetting("CAL_SHOW_TIMEZONE",			{name: "zimbraPrefUseTimeZoneListInCalendar", type: ZmSetting.T_PREF, dataType: ZmSetting.D_BOOLEAN, defaultValue: false});
	settings.registerSetting("CAL_USE_QUICK_ADD",			{name: "zimbraPrefCalendarUseQuickAdd", type: ZmSetting.T_PREF, dataType: ZmSetting.D_BOOLEAN, defaultValue: true});
	settings.registerSetting("CALENDAR_INITIAL_VIEW",		{name: "zimbraPrefCalendarInitialView", type: ZmSetting.T_PREF, defaultValue: ZmSetting.CAL_DAY});
	settings.registerSetting("DELETE_INVITE_ON_REPLY",		{name: "zimbraPrefDeleteInviteOnReply",type: ZmSetting.T_PREF, dataType: ZmSetting.D_BOOLEAN, defaultValue: true});
};

ZmCalendarApp.prototype._registerPrefs =
function() {
	var sections = {
		CALENDAR: {
			title: ZmMsg.calendar,
			icon: "CalendarApp",
			templateId: "prefs.Pages#Calendar",
			priority: 80,
			precondition: ZmSetting.CALENDAR_ENABLED,
			prefs: [
				ZmSetting.CAL_ALWAYS_SHOW_MINI_CAL,
                ZmSetting.CAL_APPT_VISIBILITY,
				ZmSetting.CAL_EXPORT,
				ZmSetting.CAL_FIRST_DAY_OF_WEEK,
				ZmSetting.CAL_IMPORT,
				ZmSetting.CAL_REMINDER_WARNING_TIME,
				ZmSetting.CAL_REMINDER_NOTIFY_SOUNDS,
				ZmSetting.CAL_REMINDER_NOTIFY_BROWSER,
				ZmSetting.CAL_SHOW_TIMEZONE,
				ZmSetting.CAL_USE_QUICK_ADD,
				ZmSetting.CALENDAR_INITIAL_VIEW,
				ZmSetting.DELETE_INVITE_ON_REPLY,
				ZmSetting.CAL_FREE_BUSY_ACL,
				ZmSetting.CAL_FREE_BUSY_ACL_USERS,
				ZmSetting.CAL_INVITE_ACL,
				ZmSetting.CAL_INVITE_ACL_USERS,
				ZmSetting.CAL_REMINDER_NOTIFY_TOASTER
			],
			manageDirty: true,
			createView: function(parent, section, controller) {
				AjxDispatcher.require("Alert");
				return new ZmCalendarPrefsPage(parent, section, controller);
			}
		}
	};

	for (var id in sections) {
		ZmPref.registerPrefSection(id, sections[id]);
	}

	ZmPref.registerPref("CAL_ALWAYS_SHOW_MINI_CAL", {
		displayName:		ZmMsg.alwaysShowMiniCal,
		displayContainer:	ZmPref.TYPE_CHECKBOX
	});
	
	ZmPref.registerPref("CAL_EXPORT", {
		displayName:		ZmMsg.exportToICS,
		displayContainer:	ZmPref.TYPE_EXPORT
	});

	ZmPref.registerPref("CAL_FIRST_DAY_OF_WEEK", {
		displayName:		ZmMsg.calendarFirstDayOfWeek,
		displayContainer:	ZmPref.TYPE_SELECT,
		displayOptions:		AjxDateUtil.WEEKDAY_LONG,
		options:			[0,1,2,3,4,5,6]
	});

	ZmPref.registerPref("CAL_FREE_BUSY_ACL", {
		displayContainer:	ZmPref.TYPE_RADIO_GROUP,
		displayOptions:		[ZmMsg.freeBusyAllowAll, ZmMsg.freeBusyAllowLocal, ZmMsg.freeBusyAllowNone, ZmMsg.freeBusyAllowSome],
		options:			[ZmSetting.ACL_PUBLIC, ZmSetting.ACL_AUTH, ZmSetting.ACL_NONE, ZmSetting.ACL_USER]
	});

	ZmPref.registerPref("CAL_FREE_BUSY_ACL_USERS", {
		displayContainer:	ZmPref.TYPE_TEXTAREA
	});

	ZmPref.registerPref("CAL_IMPORT", {
		displayName:		ZmMsg.importFromICS,
		displayContainer:	ZmPref.TYPE_IMPORT
	});

	ZmPref.registerPref("CAL_INVITE_ACL", {
		displayContainer:	ZmPref.TYPE_RADIO_GROUP,
		displayOptions:		[ZmMsg.invitesAllowAll, ZmMsg.invitesAllowLocal, ZmMsg.invitesAllowNone, ZmMsg.invitesAllowSome],
		options:			[ZmSetting.ACL_PUBLIC, ZmSetting.ACL_AUTH, ZmSetting.ACL_NONE, ZmSetting.ACL_USER]
	});

	ZmPref.registerPref("CAL_INVITE_ACL_USERS", {
		displayContainer:	ZmPref.TYPE_TEXTAREA
	});

	ZmPref.registerPref("CAL_REMINDER_WARNING_TIME", {
		displayName:		ZmMsg.numberOfMinutes,
		displayContainer:	ZmPref.TYPE_SELECT,
		displayOptions:		[ZmMsg.apptRemindNever, ZmMsg.apptRemindNMinutesBefore, ZmMsg.apptRemindNMinutesBefore, ZmMsg.apptRemindNMinutesBefore, ZmMsg.apptRemindNMinutesBefore, ZmMsg.apptRemindNMinutesBefore, ZmMsg.apptRemindNMinutesBefore, ZmMsg.apptRemindNMinutesBefore],
		options:			[0, 1, 5, 10, 15, 30, 45, 60]
	});

	ZmPref.registerPref("CAL_SHOW_TIMEZONE", {
		displayName:		ZmMsg.shouldShowTimezone,
		displayContainer:	ZmPref.TYPE_CHECKBOX
	});

	ZmPref.registerPref("CAL_USE_QUICK_ADD", {
	 	displayName:		ZmMsg.useQuickAdd,
	 	displayContainer:	ZmPref.TYPE_CHECKBOX
	 });
	
	ZmPref.registerPref("CALENDAR_INITIAL_VIEW", {
	 	displayName:		ZmMsg.calendarInitialView,
	 	displayContainer:	ZmPref.TYPE_SELECT,
		displayOptions:		[ZmMsg.calViewDay, ZmMsg.calViewWorkWeek, ZmMsg.calViewWeek, ZmMsg.calViewMonth, ZmMsg.calViewList, ZmMsg.calViewSchedule],
		options:			[ZmSetting.CAL_DAY, ZmSetting.CAL_WORK_WEEK, ZmSetting.CAL_WEEK, ZmSetting.CAL_MONTH, ZmSetting.CAL_LIST, ZmSetting.CAL_SCHEDULE]
	});
	
	ZmPref.registerPref("CAL_REMINDER_NOTIFY_SOUNDS", {
		displayName:		ZmMsg.playSound,
		displayContainer:	ZmPref.TYPE_CHECKBOX
	});

	ZmPref.registerPref("CAL_REMINDER_NOTIFY_BROWSER", {
		displayName:		ZmMsg.flashBrowser,
		displayContainer:	ZmPref.TYPE_CHECKBOX
	});

	ZmPref.registerPref("DELETE_INVITE_ON_REPLY", {
		displayName: ZmMsg.deleteInviteOnReply,
		displayContainer:	ZmPref.TYPE_CHECKBOX
	});

	ZmPref.registerPref("CAL_REMINDER_NOTIFY_TOASTER", {
		displayFunc:		function() { AjxDispatcher.require("Alert"); return ZmDesktopAlert.getInstance().getDisplayText(); },
		displayContainer:	ZmPref.TYPE_CHECKBOX
	});

    ZmPref.registerPref("CAL_APPT_VISIBILITY", {
        displayName:		ZmMsg.calendarInitialApptVisibility,
        displayContainer:	ZmPref.TYPE_SELECT,
        displayOptions:		[ZmMsg._public, ZmMsg._private],
        options:			[ZmSetting.CAL_VISIBILITY_PUB, ZmSetting.CAL_VISIBILITY_PRIV]
    });

};

ZmCalendarApp.prototype._registerOperations =
function() {
	ZmOperation.registerOp(ZmId.OP_CAL_LIST_VIEW, {textKey:"list", tooltipKey:"viewCalListTooltip", image:"CalListView", shortcut:ZmKeyMap.CAL_LIST_VIEW});
	ZmOperation.registerOp(ZmId.OP_CAL_REFRESH, {textKey:"refresh", tooltipKey:"calRefreshTooltip", image:"Refresh", shortcut:ZmKeyMap.REFRESH});
	ZmOperation.registerOp(ZmId.OP_CAL_VIEW_MENU, {textKey:"view", image:"Appointment"}, null,
		AjxCallback.simpleClosure(function(parent) {
			ZmOperation.addDeferredMenu(ZmCalendarApp.addCalViewMenu, parent);
	}));
	ZmOperation.registerOp(ZmId.OP_DAY_VIEW, {textKey:"viewDay", tooltipKey:"viewDayTooltip", image:"DayView", shortcut:ZmKeyMap.CAL_DAY_VIEW});
	ZmOperation.registerOp(ZmId.OP_EDIT_REPLY_ACCEPT, {textKey:"replyAccept", image:"Check"});
	ZmOperation.registerOp(ZmId.OP_EDIT_REPLY_CANCEL);
	ZmOperation.registerOp(ZmId.OP_EDIT_REPLY_TENTATIVE, {textKey:"replyTentative", image:"QuestionMark"});
	ZmOperation.registerOp(ZmId.OP_EDIT_REPLY_DECLINE, {textKey:"replyDecline", image:"Cancel"});
	ZmOperation.registerOp(ZmId.OP_INVITE_REPLY_ACCEPT, {textKey:"editReply", image:"Check"});
	ZmOperation.registerOp(ZmId.OP_INVITE_REPLY_DECLINE, {textKey:"editReply", image:"Cancel"});
	ZmOperation.registerOp(ZmId.OP_INVITE_REPLY_MENU, {textKey:"editReply", image:"Reply"}, ZmSetting.MAIL_ENABLED,
		AjxCallback.simpleClosure(function(parent) {
			ZmOperation.addDeferredMenu(ZmCalendarApp.addInviteReplyMenu, parent);
	}));
	ZmOperation.registerOp(ZmId.OP_INVITE_REPLY_TENTATIVE, {textKey:"editReply", image:"QuestionMark"});
	ZmOperation.registerOp(ZmId.OP_MONTH_VIEW, {textKey:"viewMonth", tooltipKey:"viewMonthTooltip", image:"MonthView", shortcut:ZmKeyMap.MONTH_VIEW});
	ZmOperation.registerOp(ZmId.OP_MOUNT_CALENDAR, {textKey:"mountCalendar", image:"GroupSchedule"});
	ZmOperation.registerOp(ZmId.OP_NEW_ALLDAY_APPT, {textKey:"newAllDayAppt", tooltipKey:"newAllDayApptTooltip", image:"NewAppointment"});
	ZmOperation.registerOp(ZmId.OP_NEW_APPT, {textKey:"newAppt", tooltipKey:"newApptTooltip", image:"NewAppointment", shortcut:ZmKeyMap.NEW_APPT});
	ZmOperation.registerOp(ZmId.OP_NEW_CALENDAR, {textKey:"newCalendar", image:"NewAppointment", tooltipKey: "newCalendarTooltip", shortcut:ZmKeyMap.NEW_CALENDAR});
	ZmOperation.registerOp(ZmId.OP_REPLY_ACCEPT, {textKey:"replyAccept", image:"Check"});
	ZmOperation.registerOp(ZmId.OP_REPLY_CANCEL);
	ZmOperation.registerOp(ZmId.OP_REPLY_DECLINE, {textKey:"replyDecline", image:"Cancel"});
	ZmOperation.registerOp(ZmId.OP_REPLY_MODIFY);
	ZmOperation.registerOp(ZmId.OP_REPLY_NEW_TIME, {textKey:"replyNewTime", image:"NewTime"});
	ZmOperation.registerOp(ZmId.OP_REPLY_TENTATIVE, {textKey:"replyTentative", image:"QuestionMark"});
	ZmOperation.registerOp(ZmId.OP_SCHEDULE_VIEW, {textKey:"viewSchedule", tooltipKey:"viewScheduleTooltip", image:"GroupSchedule", shortcut:ZmKeyMap.CAL_SCHEDULE_VIEW});
	ZmOperation.registerOp(ZmId.OP_SEARCH_MAIL, {textKey:"searchMail", image:"SearchMail"}, ZmSetting.MAIL_ENABLED);
	ZmOperation.registerOp(ZmId.OP_SHARE_CALENDAR, {textKey:"shareCalendar", image:"CalendarFolder"});
	ZmOperation.registerOp(ZmId.OP_TODAY, {textKey:"today", tooltipKey:"todayTooltip", image:"Date", shortcut:ZmKeyMap.TODAY});
	ZmOperation.registerOp(ZmId.OP_VIEW_APPOINTMENT, {textKey:"viewAppointment", image:"Appointment"});
	ZmOperation.registerOp(ZmId.OP_OPEN_APPT_INSTANCE, {textKey:"openApptInstance", image:"Appointment"});
	ZmOperation.registerOp(ZmId.OP_OPEN_APPT_SERIES, {textKey:"openApptSeries", image:"Appointment"});
	ZmOperation.registerOp(ZmId.OP_DELETE_APPT_INSTANCE, {textKey:"deleteApptInstance", image:"Delete"});
	ZmOperation.registerOp(ZmId.OP_DELETE_APPT_SERIES, {textKey:"deleteApptSeries", image:"Delete"});
	ZmOperation.registerOp(ZmId.OP_VIEW_APPT_INSTANCE, {textKey:"apptInstance", image:"Appointment"});
	ZmOperation.registerOp(ZmId.OP_VIEW_APPT_SERIES, {textKey:"apptSeries", image:"Appointment"});
	ZmOperation.registerOp(ZmId.OP_WEEK_VIEW, {textKey:"viewWeek", tooltipKey:"viewWeekTooltip", image:"WeekView", shortcut:ZmKeyMap.CAL_WEEK_VIEW});
	ZmOperation.registerOp(ZmId.OP_WORK_WEEK_VIEW, {textKey:"viewWorkWeek", tooltipKey:"viewWorkWeekTooltip", image:"WorkWeekView", shortcut:ZmKeyMap.CAL_WORK_WEEK_VIEW});
};

ZmCalendarApp.prototype._registerItems =
function() {
	ZmItem.registerItem(ZmItem.APPT,
						{app:			ZmApp.CALENDAR,
						 nameKey:		"appointment",
						 icon:			"Appointment",
						 soapCmd:		"ItemAction",
						 itemClass:		"ZmAppt",
						 node:			"appt",
						 organizer:		ZmOrganizer.CALENDAR,
						 dropTargets:	[ZmOrganizer.TAG, ZmOrganizer.CALENDAR],
						 searchType:	"appointment",
						 resultsList:
	   AjxCallback.simpleClosure(function(search) {
		   AjxDispatcher.require("CalendarCore");
		   return new ZmApptList(ZmItem.APPT, search);
	   }, this)
						});

	ZmItem.registerItem(ZmItem.RESOURCE,
						{app:			ZmApp.CALENDAR,
						 itemClass:		"ZmResource",
						 node:			"calResource",
						 resultsList:
		AjxCallback.simpleClosure(function(search) {
			AjxDispatcher.require("CalendarCore");
			return new ZmResourceList(null, search);
		}, this)
						});
};

ZmCalendarApp.prototype._registerOrganizers =
function() {
	ZmOrganizer.registerOrg(ZmOrganizer.CALENDAR,
							{app:				ZmApp.CALENDAR,
							 nameKey:			"calendar",
							 defaultFolder:		ZmOrganizer.ID_CALENDAR,
							 soapCmd:			"FolderAction",
							 firstUserId:		256,
							 orgClass:			"ZmCalendar",
							 orgPackage:		"CalendarCore",
							 treeController:	"ZmCalendarTreeController",
							 labelKey:			"calendars",
							 itemsKey:			"appointments",
							 hasColor:			true,
							 treeType:			ZmOrganizer.FOLDER,
							 views:				["appointment"],
							 folderKey:			"calendar",
							 mountKey:			"mountCalendar",
							 createFunc:		"ZmCalendar.create",
							 compareFunc:		"ZmCalendar.sortCompare",
							 newOp:				ZmOperation.NEW_CALENDAR,
							 displayOrder:		100,
							 deferrable:		true
							});
};

ZmCalendarApp.prototype._setupSearchToolbar =
function() {
	ZmSearchToolBar.addMenuItem(ZmItem.APPT,
								{msgKey:		"appointments",
								 tooltipKey:	"searchAppts",
								 icon:			"Appointment",
								 shareIcon:		"SharedCalendarFolder",
								 setting:		ZmSetting.CALENDAR_ENABLED,
								 id:			ZmId.getMenuItemId(ZmId.SEARCH, ZmId.ITEM_APPOINTMENT)
								});
};

ZmCalendarApp.prototype._registerApp =
function() {
	var newItemOps = {};
	newItemOps[ZmOperation.NEW_APPT] = "appointment";

	var newOrgOps = {};
	newOrgOps[ZmOperation.NEW_CALENDAR] = "calendar";

	var actionCodes = {};
	actionCodes[ZmKeyMap.NEW_APPT]		= ZmOperation.NEW_APPT;
	actionCodes[ZmKeyMap.NEW_CALENDAR]	= ZmOperation.NEW_CALENDAR;

	ZmApp.registerApp(ZmApp.CALENDAR,
							 {mainPkg:				"Calendar",
							  nameKey:				"calendar",
							  icon:					"CalendarApp",
							  textPrecedence:		60,
							  chooserTooltipKey:	"goToCalendar",
							  viewTooltipKey:		"displayCalendar",
							  defaultSearch:		ZmItem.APPT,
							  organizer:			ZmOrganizer.CALENDAR,
							  overviewTrees:		[ZmOrganizer.CALENDAR, ZmOrganizer.SEARCH, ZmOrganizer.TAG],
							  showZimlets:			true,
							  assistants:			{"ZmAppointmentAssistant":	["CalendarCore", "Calendar", "CalendarAppt"],
							  						 "ZmCalendarAssistant":		["CalendarCore", "Calendar", "CalendarAppt"]},
							  newItemOps:			newItemOps,
							  newOrgOps:			newOrgOps,
							  actionCodes:			actionCodes,
							  searchTypes:			[ZmItem.APPT],
							  gotoActionCode:		ZmKeyMap.GOTO_CALENDAR,
							  newActionCode:		ZmKeyMap.NEW_APPT,
							  chooserSort:			30,
							  defaultSort:			20,
							  upsellUrl:			ZmSetting.CALENDAR_UPSELL_URL,
							  supportsMultiMbox:	true
							  });
};

// App API

ZmCalendarApp.prototype.startup =
function(result) {
};

ZmCalendarApp.prototype.refresh =
function(refresh) {
	if (!appCtxt.inStartup) {
		AjxDispatcher.run("GetCalController").refreshHandler(refresh);
	}
	this._handleRefresh();
};

ZmCalendarApp.prototype.deleteNotify =
function(ids, force) {
	if (!force && this._deferNotifications("delete", ids)) { return; }
	AjxDispatcher.run("GetCalController").notifyDelete(ids);
};

/**
 * Checks for the creation of a calendar or a mount point to one, or an
 * appointment.
 * 
 * @param creates	[hash]		hash of create notifications
 */
ZmCalendarApp.prototype.createNotify =
function(creates, force) {
	if (!creates["folder"] && !creates["appt"] && !creates["link"]) { return; }
	if (!force && !this._noDefer && this._deferNotifications("create", creates)) { return; }
	
	for (var name in creates) {
		var list = creates[name];
		for (var i = 0; i < list.length; i++) {
			var create = list[i];
			if (appCtxt.cacheGet(create.id)) { continue; }
	
			if (name == "folder") {
				this._handleCreateFolder(create, ZmOrganizer.CALENDAR);
			} else if (name == "link") {
				this._handleCreateLink(create, ZmOrganizer.CALENDAR);
			} else if (name == "appt") {
				AjxDispatcher.run("GetCalController").notifyCreate(create);
			}
             
			if((name == "folder" || name == "link") && this._calController) {
				this._calController._updateCheckedCalendars();
			}			
		}
	}
};

ZmCalendarApp.prototype.modifyNotify =
function(modifies, force) {
	if (!force && !this._noDefer && this._deferNotifications("modify", modifies)) { return; }
	AjxDispatcher.run("GetCalController").notifyModify(modifies);
};

ZmCalendarApp.prototype.postNotify =
function(notify) {
	if(this._calController != null) {
		this._calController.notifyComplete();
	}
};

ZmCalendarApp.prototype.handleOp =
function(op) {
	switch (op) {
		case ZmOperation.NEW_APPT: {
			var loadCallback = new AjxCallback(this, this._handleLoadNewAppt);
			AjxDispatcher.require(["CalendarCore", "Calendar"], false, loadCallback, null, true);
			break;
		}
		case ZmOperation.NEW_CALENDAR: {
			var loadCallback = new AjxCallback(this, this._handleLoadNewCalendar);
			AjxDispatcher.require(["CalendarCore", "Calendar"], false, loadCallback, null, true);
			break;
		}
	}
};

ZmCalendarApp.prototype._handleLoadNewAppt =
function() {
	AjxDispatcher.run("GetCalController").newAppointment(null, null, null, null);
};

ZmCalendarApp.prototype._handleLoadNewCalendar =
function() {
	appCtxt.getAppViewMgr().popView(true, ZmId.VIEW_LOADING);	// pop "Loading..." page
	var dialog = appCtxt.getNewCalendarDialog();
	if (!this._newCalendarCb) {
		this._newCalendarCb = new AjxCallback(this, this._newCalendarCallback);
	}
	ZmController.showDialog(dialog, this._newCalendarCb);
};

// Public methods

ZmCalendarApp.prototype.launch =
function(params, callback) {
	var loadCallback = new AjxCallback(this, this._handleLoadLaunch, [params, callback]);
	AjxDispatcher.require(["CalendarCore", "Calendar"], true, loadCallback, null, true);
};

ZmCalendarApp.prototype._handleLoadLaunch =
function(params, callback) {
	var cc = AjxDispatcher.run("GetCalController");
	var view = cc._defaultView();
	var sd = null;

	params = params || {};
	if (params.checkQS && location) {
		var search = location.search;
		var found = false;
		if (search.match(/\bview=day\b/)) {
			found = true;
			view = ZmId.VIEW_CAL_DAY;
		} else if (search.match(/\bview=workWeek\b/)) {
			found = true;
			view = ZmId.VIEW_CAL_WORK_WEEK;
		} else if (search.match(/\bview=week\b/)) {
			found = true;
			view = ZmId.VIEW_CAL_WEEK;
		} else if (search.match(/\bview=month\b/)) {
			found = true;
			view = ZmId.VIEW_CAL_MONTH;
		} else if (search.match(/\bview=list\b/)) {
			found = true;
			view = ZmId.VIEW_CAL_LIST;
		}

		if (found) {
			var match = search.match(/\bdate=([^&]+)/);
			var pDate = (match && match.length > 1) ? match[1] : null;
			var parsed = pDate ? AjxDateUtil.parseServerDateTime(pDate) : null;
			if (parsed && !isNaN(parsed))
				sd = new Date((parsed).setHours(0,0,0,0));
		}
	}

	this.initResources();

	cc.show(view, sd);
	if (callback) {
		callback.run();
	}
};

ZmCalendarApp.prototype.showSearchResults =
function(results, callback, isGal, folderId) {
	// calls ZmSearchController's _handleLoadShowResults
	if (callback) {
		callback.run();
	}
};

ZmCalendarApp.prototype.activate =
function(active) {
	ZmApp.prototype.activate.apply(this, arguments);

	var show = active || appCtxt.get(ZmSetting.CAL_ALWAYS_SHOW_MINI_CAL);
	AjxDispatcher.run("ShowMiniCalendar", show);
};

ZmCalendarApp.prototype.showMiniCalendar =
function(show, delay) {
	var mc = AjxDispatcher.run("GetCalController").getMiniCalendar(delay);
	mc.setSkipNotifyOnPage(show && !this._active);
	if (!this._active) {
		mc.setSelectionMode(DwtCalendar.DAY);
	}
	appCtxt.getAppViewMgr().showTreeFooter(show);
};

// common API shared by tasks app
ZmCalendarApp.prototype.getListController =
function() {
	return this.getCalController();
};

ZmCalendarApp.prototype.getCalController =
function() {
	if (!this._calController) {
		AjxDispatcher.require("CalendarCore");
		this._calController = new ZmCalViewController(this._container, this);
	}
	return this._calController;
};

ZmCalendarApp.prototype.getReminderController =
function() {
    if (!this._reminderController) {
		AjxDispatcher.require("CalendarCore");
        var calMgr = appCtxt.getCalManager();
        this._reminderController = calMgr.getReminderController();
        this._reminderController._calController = this.getCalController();
	}
	return this._reminderController;
};

ZmCalendarApp.prototype.getApptComposeController = 
function() {
	if (!this._apptController) {
		AjxDispatcher.require(["CalendarCore", "Calendar", "CalendarAppt"]);
		this._apptController = new ZmApptComposeController(this._container, this);
	}
	return this._apptController;
};

ZmCalendarApp.prototype.initResources =
function() {
	if (!this._locations) {
		this._locations = new ZmResourceList(ZmCalBaseItem.LOCATION);
		this._locations.isCanonical = true;
	}

	if (!this._equipment) {
		this._equipment = new ZmResourceList(ZmCalBaseItem.EQUIPMENT);
		this._equipment.isCanonical = true;
	}
}

ZmCalendarApp.prototype.loadResources =
function() {
	this.initResources();

	if (appCtxt.get(ZmSetting.GAL_ENABLED)) {
		var batchCmd = new ZmBatchCommand();
		if (!this._locations.isLoaded) {
			batchCmd.add(new AjxCallback(this._locations, this._locations.load));
		}
		if (!this._equipment.isLoaded) {
			batchCmd.add(new AjxCallback(this._equipment, this._equipment.load));
		}
		if (batchCmd._cmds.length) {
			batchCmd.run();
		}
	}
};

/**
* Returns a ZmResourceList of known locations.
*/
ZmCalendarApp.prototype.getLocations = 
function() {
    this.initResources();
    return this._locations;
};

/**
* Returns a ZmResourceList of known equipment.
*/
ZmCalendarApp.prototype.getEquipment = 
function() {
	this.initResources();
	return this._equipment;
};

ZmCalendarApp.prototype._setMiniCalForActiveAccount =
function() {
	// do nothing since calendar handles mini cal on its own
};

ZmCalendarApp.prototype._activateAccordionItem =
function(accordionItem) {
	ZmApp.prototype._activateAccordionItem.call(this, accordionItem);

	this.getCalController().handleMailboxChange();
};

/**
 * returns the list of checked calendar Ids, gets the list from deferred folders
 * to keep things lite when calendar packages are not loaded
 *
 * @localOnly       decides whether shared folders needs to be excluded
*/
ZmCalendarApp.prototype.getCheckedCalendarFolderIds =
function(localOnly) {
	var folderIds = [];
	if (AjxDispatcher.loaded("CalendarCore")) {
		folderIds = this.getCalController().getCheckedCalendarFolderIds(localOnly);
	} else {
		//will be used in reminder dialog
		this._folderNames = {};
		for (var i = 0; i < this._deferredFolders.length; i++) {
			var params = this._deferredFolders[i];
			var str = (params && params.obj && params.obj.f) ? params.obj.f : "";
			if (str && (str.indexOf(ZmOrganizer.FLAG_CHECKED) != -1)) {
				if (localOnly && (params.obj.zid != null)) {
					continue;
				}
				folderIds.push(params.obj.id);
				// _folderNames are used when deferred folders are not created
				// and calendar name is required. example: calendar name
				// requirement in reminder module
				this._folderNames[params.obj.id] = params.obj.name;
			}
		}
	}
	return folderIds;
};

/**
 * returns the name of the calendar with specified id
 *
 * @id      id of the calendar
*/
ZmCalendarApp.prototype.getCalendarName =
function(id) {
	// _folderNames are used when deferred folders are not created and calendar
	// name is required. example: calendar name requirement in reminder module
	return appCtxt.getById(id) ? appCtxt.getById(id).name : this._folderNames[id];
};

/**
 * creates a new button with a DwtCalendar as its menu
 * @document 					the DOM document
 * @parent						parent this DwtButton gets appended to
 * @buttonId 					buttonId to fetch inside DOM and append DwtButton to
 * @dateButtonListener			AjxListener to call when date button is pressed
 * @dateCalSelectionListener	AjxListener to call when date is selected in DwtCalendar
*/
ZmCalendarApp.createMiniCalButton =
function(parent, buttonId, dateButtonListener, dateCalSelectionListener) {
	// create button
	var dateButton = new DwtButton({parent:parent});
	dateButton.addDropDownSelectionListener(dateButtonListener);
	dateButton.setData(Dwt.KEY_ID, buttonId);
	if (AjxEnv.isIE) {
		dateButton.setSize("20");
	}

	// create menu for button
	var calMenu = new DwtMenu({parent:dateButton, style:DwtMenu.CALENDAR_PICKER_STYLE});
	calMenu.setSize("150");
	calMenu._table.width = "100%";
	dateButton.setMenu(calMenu, true);

	// create mini cal for menu for button
	var cal = new DwtCalendar({parent:calMenu});
	cal.setData(Dwt.KEY_ID, buttonId);
	cal.setSkipNotifyOnPage(true);
	var fdow = appCtxt.get(ZmSetting.CAL_FIRST_DAY_OF_WEEK) || 0;
	cal.setFirstDayOfWeek(fdow);
	cal.addSelectionListener(dateCalSelectionListener);
	// add settings change listener on mini cal in case first day of week setting changes
	// safety check since this is static code (may not have loaded calendar)
	var fdowSetting = appCtxt.getSettings().getSetting(ZmSetting.CAL_FIRST_DAY_OF_WEEK);
	if (fdowSetting) {
		var listener = new AjxListener(null, ZmCalendarApp._settingChangeListener, cal);
		fdowSetting.addChangeListener(listener);
	}

	// reparent and cleanup
	dateButton.reparentHtmlElement(buttonId);
	delete buttonId;

	return dateButton;
};

ZmCalendarApp._settingChangeListener =
function(cal, ev) {
	if (ev.type != ZmEvent.S_SETTING) return;

	var setting = ev.source;
	if (setting.id == ZmSetting.CAL_FIRST_DAY_OF_WEEK)
		cal.setFirstDayOfWeek(setting.getValue());
};

ZmCalendarApp.prototype._newCalendarCallback =
function(parent, name, color, url, excludeFb) {
	// REVISIT: Do we really want to close the dialog before we
	//          know if the create succeeds or fails?
	var dialog = appCtxt.getNewCalendarDialog();
	dialog.popdown();

	var oc = appCtxt.getOverviewController();
	oc.getTreeController(ZmOrganizer.CALENDAR)._doCreate(parent, name, color, url, excludeFb);
};

/**
 * Adds an invite actions submenu for accept/decline/tentative.
 *
 * @param parent		parent widget (a toolbar or action menu)
 */
ZmCalendarApp.addInviteReplyMenu =
function(parent) {
	var list = [ZmOperation.EDIT_REPLY_ACCEPT, ZmOperation.EDIT_REPLY_TENTATIVE, ZmOperation.EDIT_REPLY_DECLINE];
	var menu = new ZmActionMenu({parent:parent, menuItems:list});
	parent.setMenu(menu);
	return menu;
};


/**
 * Adds an invite actions submenu for accept/decline/tentative.
 *
 * @param parent		parent widget (a toolbar or action menu)
 */
ZmCalendarApp.addCalViewMenu =
function(parent) {
	var list = [
		ZmOperation.DAY_VIEW, ZmOperation.WORK_WEEK_VIEW, ZmOperation.WEEK_VIEW,
		ZmOperation.MONTH_VIEW, ZmOperation.CAL_LIST_VIEW, ZmOperation.SCHEDULE_VIEW
	];
	var menu = new ZmActionMenu({parent:parent, menuItems:list});
	parent.setMenu(menu);
	return menu;
};

ZmCalendarApp.__formatLabel =
function(prefLabel, prefValue) {
	prefLabel = prefLabel || "";
	return prefLabel.match(/\{/) ? AjxMessageFormat.format(prefLabel, prefValue) : prefLabel;
};

ZmCalendarApp.prototype.updateResourceCache =
function(resource) {
	var name = resource.getFullName();
	if (name) {
		this._resByName[name.toLowerCase()] = resource;
	}
	var email = resource.getEmail();
	if (email) {
		this._resByEmail[email.toLowerCase()] = resource;
	}
};
