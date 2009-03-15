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
* show history of the status window
* @param parent			the element that created this view
*/
ZmReminderDialog = function(parent, reminderController, calController) {
	var selectId = Dwt.getNextId();

	var html = [];
	var i = 0;

	// TODO: i18n
	html[i++] = "<td valign='middle' class='ZmReminderField'>";
	html[i++] = ZmMsg.snoozeAll;
	html[i++] = "</td><td valign='middle' id='";
	html[i++] = selectId;
	html[i++] = "'></td><td valign='middle' id=\"{0}\"></td>";
	
	var snoozeButton = new DwtDialog_ButtonDescriptor(ZmReminderDialog.SNOOZE_BUTTON, 
													  ZmMsg.snooze, DwtDialog.ALIGN_LEFT, 
													  null, html.join(""));

	var dismissAllButton = new DwtDialog_ButtonDescriptor(ZmReminderDialog.DISMISS_ALL_BUTTON, 
														   ZmMsg.dismissAll, DwtDialog.ALIGN_RIGHT);														   

	DwtDialog.call(this, {parent:parent, standardButtons:DwtDialog.NO_BUTTONS, extraButtons:[snoozeButton, dismissAllButton]});

	this.setContent(this._contentHtml(selectId));
	this.setTitle(ZmMsg.apptReminders);
	this._reminderController = reminderController;
	this._calController = calController;
	this.registerCallback(ZmReminderDialog.SNOOZE_BUTTON, this._handleSnoozeButton, this);
	this.registerCallback(ZmReminderDialog.DISMISS_ALL_BUTTON, this._handleDismissAllButton, this);
	this._snoozeTimedAction = new AjxTimedAction(this, this._snoozeAction);
	this._active = false;
};

ZmReminderDialog.prototype = new DwtDialog;
ZmReminderDialog.prototype.constructor = ZmReminderDialog;

ZmReminderDialog.SNOOZE_BUTTON = ++DwtDialog.LAST_BUTTON;
ZmReminderDialog.DISMISS_ALL_BUTTON = ++DwtDialog.LAST_BUTTON;

ZmReminderDialog.SOON = -AjxDateUtil.MSEC_PER_FIFTEEN_MINUTES;

// Public methods

ZmReminderDialog.prototype.toString = 
function() {
	return "ZmReminderDialog";
};

ZmReminderDialog.prototype._contentHtml = 
function(selectId) {
	this._listId = Dwt.getNextId();

	var snooze = [1, 5, 10, 15, 30, 45, 60];
	this._select = new DwtSelect({parent:this});
	var snoozeFormatter = new AjxMessageFormat(ZmMsg.reminderSnoozeMinutes);
	for (var i = 0; i < snooze.length; i++) {
		var label = snoozeFormatter.format(snooze[i]);
		this._select.addOption(label, i==0, snooze[i]);
	}
	this._select.reparentHtmlElement(selectId);

	return ["<div class='ZmReminderDialog' id='", this._listId, "'>"].join("");
};

ZmReminderDialog.prototype._addAttr = 
function(html, title, value, data) {
	if (value) {
		html.append("<tr width=100% id='", this._rowId(data), "'>");
		html.append("<td align=right style='Zwidth:60px;' class='ZmReminderField'>", title, ":&nbsp;</td>");
		html.append("<td>",AjxStringUtil.htmlEncode(value), "</td>");
		html.append("</tr>");	
	}
};

ZmReminderDialog.prototype._updateDelta = 
function(data) {
	var td = document.getElementById(data.deltaId);
	if (td) {
		var startDelta = this._computeDelta(data.appt);

		if (startDelta >= 0) 							td.className = 'ZmReminderOverdue';
		else if (startDelta > ZmReminderDialog.SOON)	td.className = 'ZmReminderSoon';
		else											td.className = 'ZmReminderFuture';

		td.innerHTML = this._formatDeltaString(startDelta);
	}
};

ZmReminderDialog.prototype._rowId = 
function(data) {
	var id = Dwt.getNextId();
	data.rowIds.push(id);
	return id;
};

ZmReminderDialog.prototype._addAppt = 
function(html, appt, data, needSep) {

	data.buttonId = Dwt.getNextId();
	data.deltaId = Dwt.getNextId();
	data.rowIds = [];

	var calName = appt.folderId != ZmOrganizer.ID_CALENDAR && this._calController
		? this._calController.getCalendarName(appt.folderId) : null;
	
	if (needSep) html.append("<tr id='", this._rowId(data), "'><td colspan=4><div class=horizSep></div></td></tr>");
	html.append("<tr width=100% id='", this._rowId(data), "'>");
	html.append("<td colspan=2>");
	html.append("<table cellpadding=1 width='95%' cellspacing=0 border=0><tr>");
	html.append("<td width=25px>", AjxImg.getImageHtml(appt.otherAttendees ? "ApptMeeting" : "Appointment"), "</td>");
	html.append("<td><b>", AjxStringUtil.htmlEncode(appt.getReminderName()), "</b> (", this.getDurationText(appt), ") ",  "</td>");
    html.append("</tr><tr>");
    html.append("<td align='right' colspan='2' id='", data.deltaId, "'></td>");
	html.append("</tr></table>");
	html.append("</td>");
	html.append("<td align=right id='", data.buttonId, "'></td>");
	html.append("</tr>");
    //alarm data is common all instances of recurring appt
    //if (appt.otherAttendees) this._addAttr(html, ZmMsg.status, appt.getParticipantStatusStr(), data);
	if (calName) this._addAttr(html, ZmMsg.calendar, calName, data);	
	this._addAttr(html, ZmMsg.location, appt.getReminderLocation(), data);
	this._appendOpenApptLnk(html, appt);
};

ZmReminderDialog.prototype.getDurationText =
function(appt) {
	var isMultiDay = appt.isMultiDay();
	var start = appt._alarmInstStart ? new Date(appt._alarmInstStart) : appt.startDate;
	// bug: 28598 - alarm for recurring appt might still point to old alarm time
	// cannot take endTime directly
	var endTime = appt._alarmInstStart ? (start.getTime() + appt.getDuration()) : appt.getEndTime();
	var end = new Date(endTime);

	if (appt.isAllDayEvent()) {
		end = new Date(endTime - (isMultiDay ? 2 * AjxDateUtil.MSEC_PER_HOUR : 0));
		var pattern = isMultiDay ? ZmMsg.apptTimeAllDayMulti : ZmMsg.apptTimeAllDay;
		return AjxMessageFormat.format(pattern, [start, end]);
	}
	var pattern = isMultiDay ? ZmMsg.apptTimeInstanceMulti : ZmMsg.apptTimeInstance;
	return AjxMessageFormat.format(pattern, [start, end, ""]);
};

ZmReminderDialog.prototype.initialize = 
function(list) {
	this._list = list.clone();
	this._apptData = {};
	
	var html = new AjxBuffer();

	var formatter = AjxDateFormat.getDateTimeInstance(AjxDateFormat.SHORT, AjxDateFormat.MEDIUM);
	
	var size = list.size();

	html.append("<table cellpadding=0 cellspacing=0 border=0 width=100%>");
	for (var i=0; i < size; i++) {
		var appt = list.get(i);
		var uid = appt.getUniqueId(true);
		var data = this._apptData[uid] = { appt: appt};
		this._addAppt(html, appt, data, i > 0);
	}
	html.append("</table>");

	if (this._buttons) {
		for (var buttonId in this._buttons) {
			this._buttons[buttonId].dispose();
		}
	}
	this._buttons = {};

	var div = document.getElementById(this._listId);
	div.innerHTML = html.toString();
	for (var i=0; i < size; i++) {
		var appt = list.get(i);
		var uid = appt.getUniqueId(true);
		var data = this._apptData[uid];
		var button = new DwtButton({parent:this, style:DwtLabel.ALIGN_CENTER, className:"DwtToolbarButton"});
		button.setImage("Cancel");
		button.addSelectionListener(new AjxListener(this, this._closeButtonListener));
		button.__apptUniqueId = uid;
		this._buttons[data.buttonId] = button;
		//button.setToolTipContent(ZmMsg.dismissReminderToolTip);
		document.getElementById(data.buttonId).appendChild(button.getHtmlElement());
		this._updateDelta(data);
	}

	var lnks = div.getElementsByTagName("a");
	for (var i = 0; i < lnks.length; i++) {
		var lnk = lnks[i];
		if (lnk.className == "zmRemOpenApptLnkCls") {
			var uid = lnk.id.replace("zmRemDlgOpenApptId_", "");
			var appt = this._getApptFromUid(uid);
			if (appt != null) {
				lnk.onclick = AjxCallback.simpleClosure(this._addOpenApptListener, this, appt);
			}
		}
	}
};

ZmReminderDialog.prototype._appendOpenApptLnk =
function(html, appt) {
	var str = new Array();
	var i =0;
	str[i++] ="<tr width=100% >";
	str[i++] ="<td>";
	str[i++] = "<a href=\"#\" class='zmRemOpenApptLnkCls' id='zmRemDlgOpenApptId_";
	str[i++] = appt.uid;
	str[i++] = "'>";
	str[i++] = ZmMsg.openAppointment;
	str[i++] = "</a>";
	str[i++] ="</td>";
	str[i++] ="</tr>";

	html.append(str.join(""));
};

ZmReminderDialog.prototype._addOpenApptListener =
function(base_appt) {
	appCtxt.getAppController().setStatusMsg(ZmMsg.allRemindersAreSnoozed, ZmStatusView.LEVEL_INFO);
	this._handleSnoozeButton();
	var calController = AjxDispatcher.run("GetCalController");
	var miniCalendar = calController.getMiniCalendar();
	calController.setDate(base_appt.startDate, 0, miniCalendar.getForceRollOver());
	calController.setApptToOpenOnCalLoad(base_appt);//set appt to open after load
	calController.show(ZmId.VIEW_CAL_DAY);	
};

ZmReminderDialog.prototype._getApptFromUid =
function(uid) {
	for (var el in this._apptData) {
		var _appt = this._apptData[el].appt;
		if (_appt.uid == uid)
			return _appt;
	}
	return null;
};

// Button listener that checks for callbacks
ZmReminderDialog.prototype._closeButtonListener =
function(ev, args) {
	var obj = DwtControl.getTargetControl(ev);
	var buttonId = obj.buttonId;
	
	var size = this._list ? this._list.size() : 0;
	for (var i=0; i < size; i++) {
		var appt = this._list.get(i);
		var uid = appt.getUniqueId(true);
		if (uid == obj.__apptUniqueId) {
			var data = this._apptData[uid];
			this._reminderController.dismissAppt(data.appt);
			if (!data) break;
			var button = this._buttons[data.buttonId];
			if (button) {
				button.dispose();
				delete this._buttons[data.buttonId];
			}
			var rowIds = data.rowIds;
			for (var j=0; j < rowIds.length; j++) {
				var row = document.getElementById(rowIds[j]);
				if (row) {
					row.parentNode.removeChild(row);
				}
			}
			delete this._apptData[uid];
			// if size was 1, then we need to popdown
			if (size == 1) this.popdown();
			else if (size > 1 && i == 0) {
				// remove separator, since this is now the first item in list
				appt = this._list.get(1);
				var data = this._apptData[appt.getUniqueId(true)];
				var seprow = document.getElementById(data.rowIds.shift());
				if (seprow) seprow.parentNode.removeChild(seprow);
			}
			this._list.removeAt(i);
			break;
		}
	}
};

ZmReminderDialog.prototype._snoozeAction =
function(list) {
	if(list) {
		this._reminderController.activateSnoozedAppts(list);
	}
};

ZmReminderDialog.prototype.popup =
function() {
	if (appCtxt.get(ZmSetting.CAL_REMINDER_NOTIFY_BROWSER)) {
		AjxPackage.require("Alert");
		ZmBrowserAlert.getInstance().start(ZmMsg.appointmentReminder);
	}

	if (appCtxt.get(ZmSetting.CAL_REMINDER_NOTIFY_SOUNDS)) {
		AjxPackage.require("Alert");
		ZmSoundAlert.getInstance().start();
	}

	if (appCtxt.get(ZmSetting.CAL_REMINDER_NOTIFY_TOASTER))
	{
		AjxPackage.require("Alert");
		var winText = [];
		var appts = this._list.getArray();
		// only show, at most, five appointment reminders
		for (var i = 0; i < appts.length && i < 5; i++) {
			var appt = appts[i];
			var delta = this._formatDeltaString(this._computeDelta(appt));
			var text = [appt.getName(), ", ", this.getDurationText(appt), "\n(", delta, ")"].join("");
			if (AjxEnv.isMac) {
				ZmDesktopAlert.getInstance().start(ZmMsg.appointmentReminder, text);
			} else if (AjxEnv.isWindows) {
				winText.push(text);
			}
		}

		if (AjxEnv.isWindows && winText.length > 0) {
			if (appts.length > 5) {
				winText.push(ZmMsg.andMore);
			}
			ZmDesktopAlert.getInstance().start(ZmMsg.appointmentReminder, winText.join("\n"), 5);
		}
	}

	DwtDialog.prototype.popup.call(this);
	this._cancelSnooze();
};

ZmReminderDialog.prototype._handleSnoozeButton =
function() {	
	//this._snoozeActionId = AjxTimedAction.scheduleAction(this._snoozeTimedAction, this._select.getValue()*60*1000);
	this.popdown();
	var snoozedIds = this._reminderController.snoozeAppt(this._list);
	var list = this._list.clone();
	var snoozeTimedAction = new AjxTimedAction(this, this._snoozeAction, [list]);
	AjxTimedAction.scheduleAction(snoozeTimedAction, this._select.getValue()*60*1000);		
};

ZmReminderDialog.prototype._cancelSnooze =
function() {
	if (this._snoozeActionId) {
		AjxTimedAction.cancelAction(this._snoozeActionId);
		delete this._snoozeActionId;
	}
};

ZmReminderDialog.prototype._handleDismissAllButton =
function() {
	this._cancelSnooze();
	this.popdown();
	this._reminderController.dismissAppt(this._list);
};

ZmReminderDialog.prototype._computeDelta =
function(appt) {
	return (appt.alarmData && appt.alarmData.length > 0)
		? ((new Date()).getTime() - appt.alarmData[0].alarmInstStart)
		: ((new Date()).getTime() - appt.getStartTime());
};
	
ZmReminderDialog.prototype._formatDeltaString =
function(deltaMSec) {
	var prefix = deltaMSec < 0 ? "In" : "OverdueBy";
	deltaMSec = Math.abs(deltaMSec);

	// calculate parts
	var years =  Math.floor(deltaMSec / (AjxDateUtil.MSEC_PER_DAY * 365));
	if (years != 0)
		deltaMSec -= years * AjxDateUtil.MSEC_PER_DAY * 365;
	var months = Math.floor(deltaMSec / (AjxDateUtil.MSEC_PER_DAY * 30.42));
	if (months > 0)
		deltaMSec -= Math.floor(months * AjxDateUtil.MSEC_PER_DAY * 30.42);
	var days = Math.floor(deltaMSec / AjxDateUtil.MSEC_PER_DAY);
	if (days > 0)
		deltaMSec -= days * AjxDateUtil.MSEC_PER_DAY;
	var hours = Math.floor(deltaMSec / AjxDateUtil.MSEC_PER_HOUR);
	if (hours > 0)
		deltaMSec -= hours * AjxDateUtil.MSEC_PER_HOUR;
	var mins = Math.floor(deltaMSec / 60000);
	if (mins > 0)
		deltaMSec -= mins * 60000;
	var secs = Math.floor(deltaMSec / 1000);
	if (secs > 30 && mins < 59) mins++;

	var secs = 0;

	// determine message
	var amount;
	if (years > 0) {
		amount = "Years";
		if (years <= 3 && months > 0) {
			amount = "YearsMonths";
		}
	} else if (months > 0) {
		amount = "Months";
		if (months <= 3 && days > 0) {
			amount = "MonthsDays";
		}
	} else if (days > 0) {
		amount = "Days";
		if (days <= 2 && hours > 0) {
			amount = "DaysHours";
		}
	} else if (hours > 0) {
		amount = "Hours";
		if (hours < 5 && mins > 0) {
			amount = "HoursMinutes";
		}
	} else {
		amount = "Minutes";
	}

	// format message
	var key = ["reminder",prefix,amount].join("");
	var args = [deltaMSec, years, months, days, hours, mins, secs];
	return AjxMessageFormat.format(ZmMsg[key], args);
};
