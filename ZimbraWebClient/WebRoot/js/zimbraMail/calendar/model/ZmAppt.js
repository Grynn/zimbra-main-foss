/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: ZPL 1.1
 * 
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.1 ("License"); you may not use this file except in
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
 * Portions created by Zimbra are Copyright (C) 2005 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s):
 * 
 * ***** END LICENSE BLOCK *****
 */
function ZmAppt(appCtxt, list, noinit) {
	ZmItem.call(this, appCtxt, ZmItem.APPT, list);

	if (noinit) return;

	this.id = this.uid = -1;
	this.type = null;
	this.name = this.fragment = "";
	this.startDate = new Date();
	this.endDate = new Date(this.startDate.getTime() + (30*60*1000));
	this.transparency = "FR";
	this.freeBusy = "B"; 														// Free/Busy status (F|B|T|O) (free/busy/tentative/outofoffice)
	this.allDayEvent = "0";
	this.exception = this.recurring = this.alarm = this.otherAttendees = false;
	this.notesTopPart = null; 													// ZmMimePart containing children w/ different message parts
	this.repeatType = "NON"; 													// maps to "freq" in the createAppt call.
	this.repeatCustom = "0";  													// 1|0
	this.repeatCustomCount = 1; 												// ival
	this.repeatCustomType = "S"; 												// (S)pecific, (O)rdinal
	this.repeatCustomOrdinal = "1";
	this.repeatCustomDayOfWeek = "SU"; 											// (DAY|WEEKDAY|WEEKEND) | (SUNDAY|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY)
	this.repeatCustomMonthDay = this.startDate.getDate();
	this.repeatWeekday = false; 												// set to true if freq = "DAI" and custom repeats every weekday
	this.repeatWeeklyDays = null; 												//SU|MO|TU|WE|TH|FR|SA
	this.repeatMonthlyDayList = null; 											// list of numbers representing days (usually, just one day)
	this.repeatYearlyMonthsList = "1"; 											// list of numbers representing months (usually, just one month)
	this.repeatEnd = null;
	this.repeatEndDate = null; 													// maps to "until"
	this.repeatEndCount = 1; 													// maps to "count" (when there is no end date specified)
	this.repeatEndType = "N";
	this.attachments = null;
	this.timezone = ZmTimezones.getDefault();
	this._viewMode = ZmAppt.MODE_NEW;
	this.folderId = ZmOrganizer.ID_CALENDAR;
	
	this._attendees = {};	// attendees by type
	this._attendees[ZmAppt.PERSON]		= [];
	this._attendees[ZmAppt.LOCATION]	= [];
	this._attendees[ZmAppt.RESOURCE]	= [];

	this._origAttendees = null;	// list of ZmContact
}

ZmAppt.prototype = new ZmItem;
ZmAppt.prototype.constructor = ZmAppt;

// Consts

ZmAppt.MODE_NEW						= 1;
ZmAppt.MODE_EDIT					= 2;
ZmAppt.MODE_EDIT_SINGLE_INSTANCE	= 3;
ZmAppt.MODE_EDIT_SERIES				= 4;
ZmAppt.MODE_DELETE					= 5;
ZmAppt.MODE_DELETE_INSTANCE			= 6;
ZmAppt.MODE_DELETE_SERIES			= 7;
ZmAppt.MODE_DRAG_OR_SASH			= 8;
ZmAppt.MODE_NEW_FROM_QUICKADD 		= 9;

ZmAppt.EDIT_NO_REPEAT				= 1;
ZmAppt.EDIT_TIME					= 2;
ZmAppt.EDIT_TIME_REPEAT				= 3;

ZmAppt.SOAP_METHOD_REQUEST			= 1;
ZmAppt.SOAP_METHOD_REPLY			= 2;
ZmAppt.SOAP_METHOD_CANCEL			= 3;

ZmAppt.PERSON	= 1;
ZmAppt.LOCATION	= 2;
ZmAppt.RESOURCE	= 3;

ZmAppt.ATTENDEES_SEPARATOR	= "; ";

ZmAppt.STATUS_TENTATIVE		= "TENT";
ZmAppt.STATUS_CONFIRMED		= "CONF";
ZmAppt.STATUS_CANCELLED		= "CANC";

ZmAppt.ROLE_CHAIR			= "CHA";
ZmAppt.ROLE_REQUIRED		= "REQ";
ZmAppt.ROLE_OPTIONAL		= "OPT";
ZmAppt.ROLE_NON_PARTICIPANT	= "NON";

ZmAppt.PSTATUS_NEEDS_ACTION	= "NE";
ZmAppt.PSTATUS_TENTATIVE	= "TE";
ZmAppt.PSTATUS_ACCEPT		= "AC";
ZmAppt.PSTATUS_DECLINED		= "DE";
ZmAppt.PSTATUS_DELEGATED	= "DG";

ZmAppt.CUTYPE_INDIVIDUAL	= "IND";
ZmAppt.CUTYPE_GROUP			= "GRO";
ZmAppt.CUTYPE_RESOURCE		= "RES";
ZmAppt.CUTYPE_ROOM			= "ROO";
ZmAppt.CUTYPE_UNKNOWN		= "UNK";

ZmAppt.SERVER_DAYS_TO_DISPLAY = {
	SU: I18nMsg.weekdaySunLong,
	MO: I18nMsg.weekdayMonLong,
	TU: I18nMsg.weekdayTueLong,
	WE: I18nMsg.weekdayWedLong,
	TH: I18nMsg.weekdayThuLong,
	FR: I18nMsg.weekdayFriLong,
	SA: I18nMsg.weekdaySatLong
};

ZmAppt.SERVER_WEEK_DAYS				= ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
ZmAppt.NOTES_SEPARATOR				= "\n\n*~*~*~*~*~*~*~*~*~*\n\n";
ZmAppt.NOTES_SEPARATOR_HTML			= "<div>*~*~*~*~*~*~*~*~*~*</div>";
ZmAppt.NOTES_SEPARATOR_REGEX		= /\s*\*~\*~\*~\*~\*~\*~\*~\*~\*~\*\s*/;
ZmAppt.NOTES_SEPARATOR_REGEX_HTML	= /\s*<div>\*~\*~\*~\*~\*~\*~\*~\*~\*~\*<\/div>\s*/;

ZmAppt.ATTACHMENT_CHECKBOX_NAME 	= Dwt.getNextId();

ZmAppt._statusString = {
	TE:   ZmMsg.tentative,
	CONF: ZmMsg.confirmed,
	CANC: ZmMsg.cancelled
};

ZmAppt._pstatusString = {
	NE: "NEW",	//	ZmMsg.needsAction,		// HACK: i18n
	TE: ZmMsg.tentative,
	AC: ZmMsg.accepted,
	DE: ZmMsg.declined,
	DG: ZmMsg.delegated
};


ZmAppt.prototype.toString = 
function() {
	// return "ZmAppt: (" + this.name + ") sd=" + this.getStartDate() + " ed=" + this.getEndDate() + " id=" + this.id;
	return "ZmAppt";
};


// Getters

ZmAppt.prototype.getAttendees					= function() { return this._attendees[ZmAppt.PERSON]; };
ZmAppt.prototype.getLocations					= function() { return this._attendees[ZmAppt.LOCATION]; };
ZmAppt.prototype.getResources					= function() { return this._attendees[ZmAppt.RESOURCE]; };

ZmAppt.prototype.getOrigAttendees 				= function() { return this._origAttendees; };
ZmAppt.prototype.getDuration 					= function() { return this.getEndTime() - this.getStartTime(); } // duration in ms
ZmAppt.prototype.getEndDate 					= function() { return this.endDate; };
ZmAppt.prototype.getEndTime 					= function() { return this.endDate.getTime(); }; 	// end time in ms
ZmAppt.prototype.getFolderId 					= function() { return this.folderId || ZmOrganizer.ID_CALENDAR; };
ZmAppt.prototype.getFragment 					= function() { return this.fragment; };
ZmAppt.prototype.getId 							= function() { return this.id; }; 					// mail item id on appt instance
ZmAppt.prototype.getInvId 						= function() { return this.invId; }; 				// default mail item invite id on appt instance
ZmAppt.prototype.getMessage 					= function() { return this._message; };
ZmAppt.prototype.getName 						= function() { return this.name; }; 				// name (aka Subject) of appt
ZmAppt.prototype.getOrganizer 					= function() { return this.organizer || ""; };
ZmAppt.prototype.getOrigStartDate 				= function() { return this._origStartDate || this.startDate; };
ZmAppt.prototype.getOrigStartTime 				= function() { return this.getOrigStartDate().getTime(); };
ZmAppt.prototype.getParticipationStatus 		= function() { return this.ptst; };
ZmAppt.prototype.getParticipationStatusString 	= function() { return ZmAppt._pstatusString[this.ptst]; };
ZmAppt.prototype.getStartDate 					= function() { return this.startDate; };
ZmAppt.prototype.getStartTime 					= function() { return this.startDate.getTime(); }; 	// start time in ms
ZmAppt.prototype.getStatus 						= function() { return this.status; };
ZmAppt.prototype.getStatusString 				= function() { return ZmAppt._statusString[this.status]; };
ZmAppt.prototype.getViewMode 					= function() { return this._viewMode; };
ZmAppt.prototype.getTimezone 					= function() { return this.timezone; };
ZmAppt.prototype.getTransparency 				= function() { return this.transparency; }; 		// transparency (free|busy|oof|tent)
ZmAppt.prototype.getType 						= function() { return this.type; };					// type of appt (event|todo)
ZmAppt.prototype.getUid 						= function() { return this.uid; }; 					// iCal uid of appt
ZmAppt.prototype.getUniqueStartTime 			= function() { return this._uniqStartTime; }; 		// returns unique start time for an instance of recurring appt
ZmAppt.prototype.getUniqueId =
function(useStartTime) {
	if (useStartTime) {
		if (!this._startTimeUniqId) this._startTimeUniqId = this.id + "_" + this.getStartTime();
		return this._startTimeUniqId;
	} else {
		if (this._uniqId == null)
			this._uniqId = Dwt.getNextId();
		return (this.id + "_" + this._uniqId);
	}
};

// next 3 getters convert array to string
ZmAppt.prototype.getAttendeesText				= function() { return this._getAttendeesString(this._attendees[ZmAppt.PERSON]); };
ZmAppt.prototype.getResourcesText				= function() { return this._getAttendeesString(this._attendees[ZmAppt.RESOURCE]); };
ZmAppt.prototype.getLocation =
function(includeDisplayName) {
	var locs = this._attendees[ZmAppt.LOCATION];
	if (locs && locs.length) {
		var text = this._getAttendeesString(locs);
		if (includeDisplayName && locs.length == 1) {
			var displayName = locs[0].getAttr(ZmResource.F_locationName);
			if (displayName) {
				text = [text, " (", displayName, ")"].join("");
			}
		}
		return text;
	} else {
		return this.location ? this.location : "";
	}
return (this._attendees[ZmAppt.LOCATION] && this._attendees[ZmAppt.LOCATION].length) ? 
																this._getAttendeesString(this._attendees[ZmAppt.LOCATION]) : this.location ? this.location : ""; };

ZmAppt.prototype.isAllDayEvent 					= function() { return this.allDayEvent == "1"; };
ZmAppt.prototype.isCustomRecurrence 			= function() { return this.repeatCustom == "1" || this.repeatEndType != "N"; };
ZmAppt.prototype.isException 					= function() { return this.exception || false; };
ZmAppt.prototype.isOrganizer 					= function() { return (typeof(this.isOrg) === 'undefined') || (this.isOrg == true); };
ZmAppt.prototype.isRecurring 					= function() { return (this.recurring || (this._rawRecurrences != null)); };
ZmAppt.prototype.hasAlarm 						= function() { return this.alarm; };
ZmAppt.prototype.hasAttachments 				= function() { return this.getAttachments() != null; };
ZmAppt.prototype.hasDetails 					= function() { return this.getMessage() != null; };
ZmAppt.prototype.hasOtherAttendees 				= function() { return this.otherAttendees; };

// Setters

ZmAppt.prototype.setAllDayEvent 				= function(isAllDay) 	{ this.allDayEvent = isAllDay ? "1" : "0"; };
ZmAppt.prototype.setEndDate = 
function(endDate) { 
	this.endDate = new Date(endDate instanceof Date ? endDate.getTime(): endDate);
	this._resetCached(); 
};
ZmAppt.prototype.setFolderId 					= function(folderId) 	{ this.folderId = folderId || ZmOrganizer.ID_CALENDAR; };
ZmAppt.prototype.setFreeBusy 					= function(fb) 			{ this.freeBusy = fb || "B"; };
ZmAppt.prototype.setOrganizer 					= function(organizer) 	{ this.organizer = organizer != "" ? organizer : null; };
ZmAppt.prototype.setMessage 					= function(message) 	{ this._message = message; };
ZmAppt.prototype.setName 						= function(newName) 	{ this.name = newName; };
ZmAppt.prototype.setStartDate =
function(startDate) {
	if (this._origStartDate == null && this.startDate != null) {
		this._origStartDate = new Date(this.startDate.getTime());
	}
	this.startDate = new Date(startDate instanceof Date ? startDate.getTime() : startDate);
	this._resetCached();
};
ZmAppt.prototype.setType 						= function(newType) 	{ this.type = newType; };
ZmAppt.prototype.setTimezone 					= function(timezone) 	{ this.timezone = timezone; };

/**
* Sets the attendees (person, location, or resource) for this appt.
*
* @param list	[array]		list of email string, ZmEmailAddress, ZmContact, or ZmResource
*/
ZmAppt.prototype.setAttendees =
function(list, type) {
	this._attendees[type] = [];
	list = (list instanceof Array) ? list : [list];
	for (var i = 0; i < list.length; i++) {
		var attendee = ZmApptViewHelper.getAttendeeFromItem(this._appCtxt, list[i], type);
		if (attendee) {
			this._attendees[type].push(attendee);
		}
	}
};

// Public methods

/**
 * This method sets the view mode, and resets any other fields that should not 
 * be set for that view mode.
 */
ZmAppt.prototype.setViewMode = 
function(mode) {
	this._viewMode = mode || ZmAppt.MODE_NEW;
	
	switch (this._viewMode) {
		case ZmAppt.MODE_NEW:
		case ZmAppt.MODE_EDIT:
		case ZmAppt.MODE_EDIT_SERIES:
		case ZmAppt.MODE_DELETE:
		case ZmAppt.MODE_DELETE_INSTANCE:
		case ZmAppt.MODE_DELETE_SERIES:
			break;
		case ZmAppt.MODE_EDIT_SINGLE_INSTANCE:
			this.repeatType = "NON";
			break;
	}
};

/**
* Used to make our own copy because the form will modify the date object by 
* calling its setters instead of replacing it with a new date object.
*/
ZmApptClone = function() { }
ZmAppt.quickClone = 
function(appt) {
	ZmApptClone.prototype = appt;

	var newAppt = new ZmApptClone();
	newAppt.startDate = new Date(appt.startDate.getTime());
	newAppt.endDate = new Date(appt.endDate.getTime());
	newAppt._uniqId = Dwt.getNextId();

	newAppt._origAttendees = AjxUtil.createProxy(appt.getOrigAttendees());
	newAppt._validAttachments = AjxUtil.createProxy(appt._validAttachments);
	
	if (newAppt._orig == null) 
		newAppt._orig = appt;

	return newAppt;
}

/**
 * Walks the notesParts array looking for the first part that matches given 
 * content type - for now, returns the content (but we could just return the whole part?)
*/
ZmAppt.prototype.getNotesPart = 
function(contentType) {
	if (this.notesTopPart) {
		var ct = contentType || ZmMimeTable.TEXT_PLAIN;
		var content = this.notesTopPart.getContentForType(ct);

		// if requested content type not found, try the other
		if (content == null) {
			if (ct == ZmMimeTable.TEXT_PLAIN) {
				var div = document.createElement("div");
				div.innerHTML = this.notesTopPart.getContentForType(ZmMimeTable.TEXT_HTML);
				return AjxStringUtil.convertHtml2Text(div);
			} else if (ct == ZmMimeTable.TEXT_HTML) {
				content = AjxStringUtil.convertToHtml(this.notesTopPart.getContentForType(ZmMimeTable.TEXT_PLAIN));
			}
		}
		return AjxUtil.isString(content) ? content : content.content;
	} else {
		return this.getFragment();
	}
};

ZmAppt.prototype.getCalendar =
function(folderId) {
	var ct = this._appCtxt.getTree(ZmOrganizer.CALENDAR);	
	return ct ? ct.getById(folderId) : null;
};

ZmAppt.prototype.isReadOnly = 
function() { 
	var isLinkAndReadOnly = false;
	var cal = this.getCalendar(this.getFolderId());
	// if we're dealing w/ a shared cal, find out if we have any write access
	if (cal.link) {
		var share = cal.getShares()[0];
		isLinkAndReadOnly = share && share.link && (share.link.perm.indexOf("w") == -1);
	}

	return !this.isOrganizer() || isLinkAndReadOnly;
};


ZmAppt.prototype.resetRepeatWeeklyDays = 
function() {
	this.repeatWeeklyDays = [ZmAppt.SERVER_WEEK_DAYS[this.startDate.getDay()]];
};

ZmAppt.prototype.resetRepeatMonthlyDayList = 
function() {
	this.repeatMonthlyDayList = [this.startDate.getDate()];
};

ZmAppt.prototype.isOverlapping =
function(other, checkFolder) {
	if (checkFolder && this.getFolderId() != other.getFolderId()) return false;

	var tst = this.getStartTime();
	var tet = this.getEndTime();
	var ost = other.getStartTime();
	var oet = other.getEndTime();
	
	return (tst < oet) && (tet > ost);
};

ZmAppt.prototype.isInRange =
function(startTime, endTime) {
	var tst = this.getStartTime();
	var tet = this.getEndTime();	
	return (tst < endTime && tet > startTime);
};

/**
 * return true if the start time of this appt is within range
 */
ZmAppt.prototype.isStartInRange =
function(startTime, endTime) {
	var tst = this.getStartTime();
	return (tst < endTime && tst >= startTime);
};

/**
 * return true if the end time of this appt is within range
 */
ZmAppt.prototype.isEndInRange =
function(startTime, endTime) {
	var tet = this.getEndTime();
	return (tet <= endTime && tet > startTime);
};

ZmAppt.prototype.setDateRange = 
function (rangeObject, instance, parentValue, refPath) {
	var s = rangeObject.startDate;
	var e = rangeObject.endDate;
	this.endDate.setTime(rangeObject.endDate.getTime());
	this.startDate.setTime(rangeObject.startDate.getTime());
};

ZmAppt.prototype.getDateRange = 
function(instance, current, refPath) {
	return { startDate:this.startDate, endDate: this.endDate };
};

/*
 * true if startDate and endDate are on different days
 */
ZmAppt.prototype.isMultiDay =
function() {
	var sd = this.getStartDate();
	var ed = this.getEndDate();
	return (sd.getDate() != ed.getDate()) || (sd.getMonth() != ed.getMonth()) || (sd.getFullYear() != ed.getFullYear());
};

/**
 * accepts a comma delimeted string of ids
 */
ZmAppt.prototype.setAttachments = 
function(ids) {
	if (ids != null && ids.length > 0) {
		var ids = ids.split(',');
		this.attachments = [];
		for (var i = 0 ; i < ids.length; ++i){
			this.attachments[i] = {id: ids[i]};
		}
	}
};

ZmAppt.prototype.getAttachments = 
function() {
	var m = this.getMessage();	
	if (this.hasDetails() && m._attachments != null) {
		var attachs = m._attachments;
		if (this._validAttachments == null) {
			this._validAttachments = [];
			for (var i = 0; i < attachs.length; ++i) {
				if (m.isRealAttachment(attachs[i]))
					this._validAttachments.push(attachs[i]);
			}
		}
		return this._validAttachments.length > 0 ? this._validAttachments : null;
	}
	return null;
};

ZmAppt.prototype.removeAttachment = 
function(part) {
	if (this._validAttachments && this._validAttachments.length > 0) {
		for (var i = 0; i < this._validAttachments.length; i++) {
			if (this._validAttachments[i].part == part) {
				this._validAttachments.splice(i,1);
				break;
			}
		}
	}
};

ZmAppt.prototype.getDurationText =
function(emptyAllDay,startOnly) {
	if (this.isAllDayEvent()) {
		if (emptyAllDay)
			return "";
		if (this.isMultiDay()) {
			var endDate = new Date(this.getEndDate().getTime());
			endDate.setDate(endDate.getDate()-1);

			var startDay = this._getTTDay(this.getStartDate());
			var endDay = this._getTTDay(endDate);

			if (!ZmAppt._daysFormatter) {
				ZmAppt._daysFormatter = new AjxMessageFormat(ZmMsg.durationDays);
			}
			return ZmAppt._daysFormatter.format( [ startDay, endDay ] );
		} else {
			return this._getTTDay(this.getStartDate());
		}

	} else {
		if (startOnly) {
			return ZmAppt._getTTHour(this.getStartDate());
		} else {
			var startHour = ZmAppt._getTTHour(this.getStartDate());
			var endHour = ZmAppt._getTTHour(this.getEndDate());
		
			if (!ZmAppt._hoursFormatter) {
				ZmAppt._hoursFormatter = new AjxMessageFormat(ZmMsg.durationHours);
			}
			return ZmAppt._hoursFormatter.format( [ startHour, endHour ] );
		}			
	}
};

ZmAppt.prototype.getShortStartHour =
function() {
	var d = this.getStartDate();
	var formatter = AjxDateFormat.getTimeInstance(AjxDateFormat.SHORT);
	return formatter.format(d);
};

ZmAppt.prototype.clearDetailsCache = 
function() {
	this._message = null; // the series message should never change
};

ZmAppt.prototype.getUniqueStartDate = 
function() {
	if (this._uniqueStartDate == null) {
		this._uniqueStartDate = new Date(this.getUniqueStartTime());
	}
	return this._uniqueStartDate;
};

ZmAppt.prototype.getUniqueEndDate = 
function() {
	if (this._uniqueEndDate == null) {
		var st = this.getUniqueStartTime();
		var dur = this.getDuration();
		this._uniqueEndDate = new Date(st + dur);
	}
	return this._uniqueEndDate;
};

ZmAppt.prototype.getDetails =
function(viewMode, callback, errorCallback) {
	var mode = viewMode || this._viewMode;
	
	var seriesMode = mode == ZmAppt.MODE_EDIT_SERIES;
	if (this._message == null) {
		var id = seriesMode ? (this._seriesInvId || this.invId) : this.invId;
		this._message = new ZmMailMsg(this._appCtxt, id);
		var respCallback = new AjxCallback(this, this._handleResponseGetDetails, [mode, this._message, callback]);
		this._message.load(this._appCtxt.get(ZmSetting.VIEW_AS_HTML), false, respCallback, errorCallback);
	} else {
		this.setFromMessage(this._message, mode);
		if (callback)
			callback.run();
	}
};

ZmAppt.prototype.setFromMessage = 
function(message, viewMode) {
	if (message !== this._currentlyLoaded) {
		this.isOrg = message.invite.isOrganizer(0);
		this.organizer = message.getInviteOrganizer();
		this.name = message.invite.getName(0);
		this.location = message.invite.getLocation(0);
		this.exception = message.invite.isException(0);
		this.freeBusy = message.invite.getFreeBusy(0);
		// if instance of recurring appointment, start date is generated from 
		// unique start time sent in appointment summaries. Associated message 
		// will contain only the original start time.
		if (viewMode == ZmAppt.MODE_EDIT_SINGLE_INSTANCE) {
			this.setStartDate(this.getUniqueStartDate());
			this.setEndDate(this.getUniqueEndDate());
		} else {
			this.setStartDate(AjxDateUtil.parseServerDateTime(message.invite.getServerStartTime(0)));
			this.setEndDate(AjxDateUtil.parseServerDateTime(message.invite.getServerEndTime(0)));
		}
		var timezone = message.invite.getServerStartTimeTz(0);
		if (timezone) {
			this.timezone = timezone;
		} else {
			var start = message.invite.getServerStartTime(0);
			if (start.charAt(start.length-1) == "Z")
				this.timezone = null;
		}
		
		this.repeatCustomMonthDay = this.startDate.getDate();

		// parse out attendees for this invite
		this._attendees[ZmAppt.PERSON] = [];
		this._origAttendees = [];
		var attendees = message.invite.getAttendees();
		if (attendees) {
			for (var i = 0; i < attendees.length; i++) {
				var addr = attendees[i].url;
				var name = attendees[i].d;
				var email = new ZmEmailAddress(addr, null, name);
				var attendee = ZmApptViewHelper.getAttendeeFromItem(this._appCtxt, email, ZmAppt.PERSON);
				if (attendee) {
					this._attendees[ZmAppt.PERSON].push(attendee);
					this._origAttendees.push(attendee);
				}
			}
		}
		this._attendees[ZmAppt.LOCATION] = [];
		this._attendees[ZmAppt.RESOURCE] = [];
		var resources = message.invite.getResources();
		if (resources) {
			for (var i = 0; i < resources.length; i++) {
				var resource = ZmApptViewHelper.getAttendeeFromItem(this._appCtxt, resources[i].url);
				if (resource) {
					if (resource.isLocation()) {
						this._attendees[ZmAppt.LOCATION].push(resource);
					} else {
						this._attendees[ZmAppt.RESOURCE].push(resource);
					}
				}
			}
		}
		if (this.location && !this._attendees[ZmAppt.LOCATION].length) {
			var attendee = ZmApptViewHelper.getAttendeeFromItem(this._appCtxt, this.location, ZmAppt.LOCATION);
			this._attendees[ZmAppt.LOCATION].push(attendee);
		}

		this.getAttachments();

		// parse recurrence rules
		var recurrences = message.invite.getRecurrenceRules(0);
		this.repeatType = "NON";
		// For now, parse what the UI supports. If this rule is generated by 
		// another program, we're most likely going to be showing a string 
		// representing the rule, instead of allowing the user to edit the rule.
		if (recurrences != null)
			this._rawRecurrences = recurrences;

		// if we're going to allow user to edit recur rules, then get info UI 
		// will need. Otherwise, get string that describes recurrence rules.
		if (this.editTimeRepeat()) {
			this._populateRecurrenceFields();
		} else {
			this._getRecurrenceDisplayString();
		}

		this._currentlyLoaded = message;
		this._setNotes(message);
	}
};

ZmAppt.prototype.setFromMailMessage = 
function(message) {
	this.name = (message.subject) ? message.subject : "";
	
	// Only unique names in the attendee list, plus omit our own name
	var used = {};
	used[this._appCtxt.get(ZmSetting.USERNAME)] = true;
	var addrs = message.getAddresses(ZmEmailAddress.FROM, used);
	addrs.addList(message.getAddresses(ZmEmailAddress.CC, used));
	addrs.addList(message.getAddresses(ZmEmailAddress.TO, used));
	this._attendees[ZmAppt.PERSON] = addrs;
	
	this._setNotes(message);
}


ZmAppt.prototype._setNotes = 
function(message) {
		this.notesTopPart = new ZmMimePart();
		// get text part and remove any previous canned text
		var text = message.getBodyPart(ZmMimeTable.TEXT_PLAIN);
		var isObject = AjxUtil.isObject(text);
		var notes = isObject ? (text.content ? text.content : "") : text;
		notes = this._trimNotesSummary(notes);
		// check if notes has html part
		var html = message.getBodyPart(ZmMimeTable.TEXT_HTML);

		if (html) {
			this.notesTopPart.setContentType(ZmMimeTable.MULTI_ALT);
	
			// create two more mp's for text and html content types
			var textPart = new ZmMimePart();
			textPart.setContentType(ZmMimeTable.TEXT_PLAIN);
			textPart.setContent(notes);
			this.notesTopPart.children.add(textPart);
	
			var htmlPart = new ZmMimePart();
			htmlPart.setContentType(ZmMimeTable.TEXT_HTML);
			htmlPart.setContent(this._trimNotesSummary(html.content, true));
			this.notesTopPart.children.add(htmlPart);
		} else {
			this.notesTopPart.setContentType(ZmMimeTable.TEXT_PLAIN);
			this.notesTopPart.setContent(notes);
		}
}

/**
* Returns HTML for a tool tip for this appt.
*/
ZmAppt.prototype.getToolTip =
function(calController) {
	// update/null if modified
	if (this._orig) return this._orig.getToolTip(calController);

	if (!this._toolTip) {
		var html = new Array(20);
		var idx = 0;
		
		html[idx++] = "<table cellpadding=0 cellspacing=0 border=0 >";
		html[idx++] = "<tr valign='center'><td colspan=2 align='left'>";
		html[idx++] = "<div style='border-bottom: 1px solid black;'>";
		html[idx++] = "<table cellpadding=0 cellspacing=0 border=0 width=100%>";
		html[idx++] = "<tr valign='center'>";
		html[idx++] = "<td><b>";
		
		// IMGHACK - added outer table for new image changes...
		html[idx++] = "<div style='white-space:nowrap'><table border=0 cellpadding=0 cellspacing=0 style='display:inline'><tr>";
		if (this.hasOtherAttendees()) 
			html[idx++] = "<td>" + AjxImg.getImageHtml("ApptMeeting") + "</td>";
			
		if (this.isException()) 
			html[idx++] = "<td>" + AjxImg.getImageHtml("ApptException") + "</td>";
		else if (this.isRecurring()) 
			html[idx++] = "<td>" + AjxImg.getImageHtml("ApptRecur") + "</td>";
			
//		if (this.hasAlarm()) 
//			html[idx++] = "<td>" + AjxImg.getImageHtml("ApptReminder") + "</td>";

		html[idx++] = "</tr></table>";
		
		html[idx++] = "&nbsp;";
		html[idx++] = AjxStringUtil.htmlEncode(this.getName());
		html[idx++] = "&nbsp;</div></b></td>";	
		html[idx++] = "<td align='right'>";

		var cal = this.getFolderId() != ZmOrganizer.ID_CALENDAR && calController
			? calController.getCalendar(this.getFolderId()) : null;

		html[idx++] = cal && cal.link
			? AjxImg.getImageHtml("GroupSchedule")
			: AjxImg.getImageHtml("Appointment");
					
		html[idx++] = "</td>";
		html[idx++] = "</table></div></td></tr>";
		//idx = this._addEntryRow(ZmMsg.meetingStatus, this.getStatusString(), html, idx, false);

		if (cal)
			idx = this._addEntryRow(ZmMsg.calendar, cal.getName(), html, idx, false);

		if (this.hasOtherAttendees())
			idx = this._addEntryRow(ZmMsg.status, this.getParticipationStatusString(), html, idx, false);		

		var when = this.getDurationText(false, false);
				
		idx = this._addEntryRow(ZmMsg.when, when, html, idx, false);		
		idx = this._addEntryRow(ZmMsg.location, this.getLocation(), html, idx, false);
		idx = this._addEntryRow(ZmMsg.notes, this.getFragment(), html, idx, true, "250");

		html[idx++] = "</table>";
		this._toolTip = html.join("");
	}
	return this._toolTip;
};

ZmAppt.prototype.editTimeRepeat = 
function() {
	if (this._editingUser == null )
		this._editingUser = this._appCtxt.get(ZmSetting.USERNAME);

	var u = this._editingUser;
	var m = this._viewMode;
	var isOrg = this.isOrganizer();
	if ((m == ZmAppt.MODE_EDIT_SERIES && !isOrg)) {
		return ZmAppt.EDIT_NO_REPEAT;
	}

	if (((m == ZmAppt.MODE_EDIT_SERIES || m == ZmAppt.MODE_EDIT) && isOrg) || m == ZmAppt.MODE_NEW) {
		return ZmAppt.EDIT_TIME_REPEAT;
	}

	return ZmAppt.EDIT_TIME;
};

/**
 * @param attachmentId 		ID of the already uploaded attachment
 * @param callback 			callback triggered once request for appointment save is complete
 * @param errorCallback 	callback triggered if error during appointment save request
 * @param notifyList 		optional sublist of attendees to be notified (if different than original list of attendees)
*/
ZmAppt.prototype.save = 
function(attachmentId, callback, errorCallback, notifyList) {
	var soapDoc = null;
	var needsExceptionId = false;

	if (this._viewMode == ZmAppt.MODE_NEW) {
		soapDoc = AjxSoapDoc.create("CreateAppointmentRequest", "urn:zimbraMail");
	} else if (this._viewMode == ZmAppt.MODE_EDIT_SINGLE_INSTANCE && !this.isException()) {
		soapDoc = AjxSoapDoc.create("CreateAppointmentExceptionRequest", "urn:zimbraMail");
		this._addInviteAndCompNum(soapDoc);
		soapDoc.setMethodAttribute("s", this.getOrigStartTime());
		needsExceptionId = true;
	} else {
		soapDoc = AjxSoapDoc.create("ModifyAppointmentRequest", "urn:zimbraMail");
		this._addInviteAndCompNum(soapDoc);
		//if (this._viewMode == ZmAppt.MODE_EDIT_SERIES)
		//	soapDoc.setMethodAttribute("thisAndFuture",true);
	}

	var invAndMsg = this._setSimpleSoapAttributes(soapDoc, ZmAppt.SOAP_METHOD_REQUEST, attachmentId, notifyList);

	if (needsExceptionId) {
		var exceptId = soapDoc.set("exceptId", null, invAndMsg.inv);
		if (this.allDayEvent != "1") {
			var sd = AjxDateUtil.getServerDateTime(this.getOrigStartDate());
			// bug fix #4697 (part 2)
			if (this.timezone) {
				exceptId.setAttribute("tz", this.timezone);
			} else {
				if (sd.charAt(sd.length-1) != "Z") sd += "Z";
			}
			exceptId.setAttribute("d", sd);
		} else {
			exceptId.setAttribute("d", AjxDateUtil.getServerDateTime(this.getOrigStartDate()));
		}
	} else {
		// set recurrence rules for appointment (but not for exceptions!)
		this._addRecurrenceRulesToSoap(soapDoc, invAndMsg.inv);
	}

	// TODO - alarm
	// var alarm = soapDoc.set("alarm", null, inv);
	// alarm.setAttribute("rel-start", /* some alarm start time */);

	this._sendRequest(soapDoc, callback, errorCallback);
};

ZmAppt.prototype.move = 
function(folderId, callback, errorCallback) {
	var soapDoc = AjxSoapDoc.create("ItemActionRequest", "urn:zimbraMail");

	var actionNode = soapDoc.set("action");
	actionNode.setAttribute("id", this.id);
	actionNode.setAttribute("op", "move");
	actionNode.setAttribute("l", folderId);
	
	this._sendRequest(soapDoc, callback, errorCallback);
};

ZmAppt.prototype.cancel = 
function(mode, msg, errorCallback) {
	this.setViewMode(mode);
	if (msg) {
		// REVISIT: I have to explicitly set the bodyParts of the message
		//          because ZmComposeView#getMsg only sets the topPart on
		//          the new message that's returned. And ZmAppt#_setNotes
		//          calls ZmMailMsg#getBodyPart.
		var bodyParts = [];
		var childParts = msg._topPart.node.ct == ZmMimeTable.MULTI_ALT
						? msg._topPart.children.getArray() : [ msg._topPart ];
		for (var i = 0; i < childParts.length; i++) {
			bodyParts.push(childParts[i].node);
		}
		msg.setBodyParts(bodyParts);
		this._setNotes(msg);
		this._handleResponseCancel(mode);
		return;
	}
	// To get the attendees for this appointment, we have to get the message.
	var respCallback = new AjxCallback(this, this._handleResponseCancel, [mode]);
	this.getDetails(null, respCallback, errorCallback);
};

// Returns canned text for meeting invites.
// - Instances of recurring meetings should send out information that looks very
//   much like a simple appointment.
ZmAppt.prototype.getTextSummary = function() {
	return this.getSummary(false);
};

ZmAppt.prototype.getHtmlSummary = function() {
	return this.getSummary(true);
};

ZmAppt.prototype.getSummary = function(isHtml) {
	var orig = this._orig ? this._orig : this;

	var isEdit = this._viewMode == ZmAppt.MODE_EDIT || 
				 this._viewMode == ZmAppt.MODE_EDIT_SINGLE_INSTANCE ||
				 this._viewMode == ZmAppt.MODE_EDIT_SERIES;

	var buf = [];
	var i = 0;

	if (!this._summaryHtmlLineFormatter) {
		this._summaryHtmlLineFormatter = new AjxMessageFormat("<tr><th align='left'>{0}</th><td>{1} {2}</td></tr>");
		this._summaryTextLineFormatter = new AjxMessageFormat("{0} {1} {2}");
	}
	var formatter = isHtml ? this._summaryHtmlLineFormatter : this._summaryTextLineFormatter;

	if (isHtml) {
		buf[i++] = "<p>\n<table border='0'>\n";
	}
	var modified = isEdit && orig.getName() != this.getName();
	var params = [ ZmMsg.subject + ":", this.name, modified ? ZmMsg.apptModifiedStamp : "" ];
	buf[i++] = formatter.format(params);
	buf[i++] = "\n";
	
	buf[i++] = ZmMsg.organizer;
	buf[i++] = " ";
	var organizer = this.organizer ? this.organizer : this._appCtxt.get(ZmSetting.USERNAME);
	var params = [ ZmMsg.organizer, organizer, "" ];
	buf[i++] = formatter.format(params);
	buf[i++] = "\n";
	if (isHtml) {
		buf[i++] = "</table>";
	}
	buf[i++] = "\n";
	if (isHtml) {
		buf[i++] = "<p>\n<table border='0'>\n";
	}
	
	var location = this.getLocation(true);
	if (location) {
		var modified = isEdit && (orig.getLocation(true) != location);
		var params = [ ZmMsg.location + ":", location, modified ? ZmMsg.apptModifiedStamp : "" ];
		buf[i++] = formatter.format(params);
		buf[i++] = "\n";
	}

	var s = this.startDate;
	var e = this.endDate;
	if (this._viewMode == ZmAppt.MODE_DELETE_INSTANCE) {
		s = this.getUniqueStartDate();
		e = this.getUniqueEndDate();
	}

	var recurrence = this.repeatType != "NON" && 
						this._viewMode != ZmAppt.MODE_EDIT_SINGLE_INSTANCE &&
						this._viewMode != ZmAppt.MODE_DELETE_INSTANCE;
	if (recurrence)
	{
		var hasTime = isEdit 
			? ((orig.startDate.getTime() != s.getTime()) || (orig.endDate.getTime() != e.getTime()))
			: false;
		var params = [ ZmMsg.time + ":", this._getTextSummaryTime(isEdit, ZmMsg.time, null, s, e, hasTime), "" ];
		buf[i++] = formatter.format(params);
	}
	else if (s.getFullYear() == e.getFullYear() && 
			 s.getMonth() == e.getMonth() && 
			 s.getDate() == e.getDate()) 
	{
		var hasTime = isEdit 
			? ((orig.startDate.getTime() != this.startDate.getTime()) || (orig.endDate.getTime() != this.endDate.getTime()))
			: false;
		var params = [ ZmMsg.time + ":", this._getTextSummaryTime(isEdit, ZmMsg.time, s, s, e, hasTime), "" ];
		buf[i++] = formatter.format(params);
	}
	else 
	{
		var hasTime = isEdit ? (orig.startDate.getTime() != this.startDate.getTime()) : false;
		var params = [ ZmMsg.start + ":", this._getTextSummaryTime(isEdit, ZmMsg.start, s, s, null, hasTime), "" ];
		buf[i++] = formatter.format(params);

		var hasTime = isEdit ? (orig.endDate.getTime() != this.endDate.getTime()) : false;
		var params = [ ZmMsg.end + ":", this._getTextSummaryTime(isEdit, ZmMsg.end, e, null, e, hasTime), "" ];
		buf[i++] = formatter.format(params);
	}

	if (recurrence) {
		var modified = false;
		if (isEdit) {
			modified = orig.repeatType != this.repeatType ||
						   orig.repeatCustom != this.repeatCustom ||
						   orig.repeatCustomType != this.repeatCustomType ||
						   orig.repeatCustomCount != this.repeatCustomCount ||
						   orig.repeatCustomOrdinal != this.repeatCustomOrdinal ||
						   orig.repeatCustomDayOfWeek != this.repeatCustomDayOfWeek ||
						   orig.repeatCustomMonthday != this.repeatCustomMonthday ||
						   orig.repeatEnd != this.repeatEnd ||
						   orig.repeatEndType != this.repeatEndType ||
						   orig.repeatEndCount != this.repeatEndCount ||
						   orig.repeatEndDate != this.repeatEndDate ||
						   orig.repeatWeeklyDays != this.repeatWeeklyDays ||
						   orig.repeatMonthlyDayList != this.repeatMonthlyDayList ||
						   orig.repeatYearlyMonthsList != this.repeatYearlyMonthsList;
		}
		var params = [ ZmMsg.recurrence + ":", this._getRecurrenceBlurbForSave(), modified ? ZmMsg.apptModifiedStamp: "" ];
		buf[i++] = formatter.format(params);
		buf[i++] = "\n";
	}

	if (this._attendees[ZmAppt.PERSON] && this._attendees[ZmAppt.PERSON].length) {
		if (isHtml) {
			buf[i++] = "</table>\n<p>\n<table border='0'>";
		}
		buf[i++] = "\n";
		buf[i++] = ZmMsg.invitees;
		buf[i++] = ": ";
		var attString = this._getAttendeesString(this._attendees[ZmAppt.PERSON].slice(0, 10));
		if (this._attendees[ZmAppt.PERSON].length > 10) {
			attString += ", ...";
		}
		var params = [ ZmMsg.invitees + ":", attString, "" ];
		buf[i++] = formatter.format(params);
	}
	if (isHtml) {
		buf[i++] = "</table>\n";
	}
	buf[i++] = isHtml ? ZmAppt.NOTES_SEPARATOR_HTML : ZmAppt.NOTES_SEPARATOR;

	return buf.join("");
};

/**
 * @param attach		generic Object contain meta info about the attachment
 * @param hasCheckbox	whether to insert a checkbox prior to the attachment
*/
ZmAppt.prototype.getAttachListHtml = 
function(attach, hasCheckbox) {
	var csfeMsgFetchSvc = location.protocol + "//" + document.domain + this._appCtxt.get(ZmSetting.CSFE_MSG_FETCHER_URI);
	var hrefRoot = "href='" + csfeMsgFetchSvc + "id=" + this.getInvId() + "&amp;part=";

	// gather meta data for this attachment
	var mimeInfo = ZmMimeTable.getInfo(attach.ct);
	var icon = mimeInfo ? mimeInfo.image : "GenericDoc";
	var size = attach.s;
	var sizeText = null;
	if (size != null) {
	    if (size < 1024)		sizeText = size + " B";
        else if (size < 1024^2)	sizeText = Math.round((size/1024) * 10) / 10 + " KB"; 
        else 					sizeText = Math.round((size / (1024*1024)) * 10) / 10 + " MB"; 
	}

	var html = [];
	var i = 0;

	// start building html for this attachment
	html[i++] = "<table border=0 cellpadding=0 cellspacing=0><tr>";
	if (hasCheckbox) {
		html[i++] = "<td width=1%><input type='checkbox' checked value='";
		html[i++] = attach.part;
		html[i++] = "' name='";
		html[i++] = ZmAppt.ATTACHMENT_CHECKBOX_NAME;
		html[i++] = "'></td>";
	}
	html[i++] = "<td width=20><a target='_blank' class='AttLink' ";
	html[i++] = hrefRoot;
	html[i++] = attach.part;
	html[i++] = "'>";
	html[i++] = AjxImg.getImageHtml(icon);
	html[i++] = "</a></td>";
	html[i++] = "<td><a target='_blank' class='AttLink' ";
	html[i++] = hrefRoot;
	html[i++] = attach.part;
	html[i++] = "'>";
	html[i++] = attach.filename;
	html[i++] = "</a>";

	var addHtmlLink = (this._appCtxt.get(ZmSetting.VIEW_ATTACHMENT_AS_HTML) && 
					  attach.body == null && ZmMimeTable.hasHtmlVersion(attach.ct));

	if (sizeText || addHtmlLink) {
		html[i++] = "&nbsp;(";
		if (sizeText) {
			html[i++] = sizeText;
			if (addHtmlLink)
				html[i++] = ", ";
		}
		if (addHtmlLink) {
			html[i++] = "<a style='text-decoration:underline' target='_blank' class='AttLink' ";
			html[i++] = hrefRoot;
			html[i++] = attach.part;
			html[i++] = "&view=html";
			html[i++] = "'>";
			html[i++] = ZmMsg.viewAsHtml;
			html[i++] = "</a>";
		}
		html[i++] = ")";
	}
	html[i++] = "</td></tr>";
	html[i++] = "</table>";

	return html.join("");
};


// Private / Protected methods

/*
* Creates a string from a list of attendees/locations/resources. If an item
* doesn't have a name, its address is used.
*
* @param list	[array]		list of attendees (ZmContact or ZmResource)
*/
ZmAppt.prototype._getAttendeesString = 
function(list) {
	if (!(list && list.length)) return "";

	var a = [];
	for (var i = 0; i < list.length; i++) {
		var item = list[i];
		var name = item.getFullName();
		var text = name ? name : item.getEmail();
		if (text) {
			a.push(text);
		}
	}
	return a.join(ZmAppt.ATTENDEES_SEPARATOR);
};

ZmAppt.prototype._getTextSummaryTime = 
function(isEdit, fieldstr, extDate, start, end, hasTime) {
	var showingTimezone = this._appCtxt.get(ZmSetting.CAL_SHOW_TIMEZONE);

	var buf = [];
	var i = 0;

	if (extDate) {
		buf[i++] = AjxDateUtil.longComputeDateStr(extDate);
		buf[i++] = ", ";
	}
	if (this.isAllDayEvent()) {
		buf[i++] = ZmMsg.allDay;
	} else {
		var formatter = AjxDateFormat.getTimeInstance();
		if (start)
			buf[i++] = formatter.format(start);
		if (start && end)
			buf[i++] = " - ";
		if (end)
			buf[i++] = formatter.format(end);

		if (showingTimezone) {
			buf[i++] = " ";
			buf[i++] = ZmTimezones.valueToDisplay[this.timezone];
		}
	}
	// NOTE: This relies on the fact that setModel creates a clone of the
	//		 appointment object and that the original object is saved in 
	//		 the clone as the _orig property.
	if (isEdit && ((this._orig && this._orig.isAllDayEvent() != this.isAllDayEvent()) || hasTime)) {
		buf[i++] = " ";
		buf[i++] = ZmMsg.apptModifiedStamp;
	}
	buf[i++] = "\n";

	return buf.join("");
};

ZmAppt.prototype._trimNotesSummary = 
function(notes, isHtml) {
	if (notes) {
		var notesArr = notes.split(isHtml ? ZmAppt.NOTES_SEPARATOR_REGEX_HTML : ZmAppt.NOTES_SEPARATOR_REGEX);
		if (notesArr.length > 1) {
			notes = notesArr.slice(1, notesArr.length).join("");
		}
	}
	return notes;
};

ZmAppt.prototype._resetCached =
function() {
	delete this._startTimeUniqId;
	delete this._validAttachments;
	delete this.tooltip;
};

ZmAppt.prototype._createRangeIfNecessary = 
function() {
 	if (this._rangeObj == null) {
		this._rangeObj = {};
		this._rangeObj.startDate = new Date();
		this._rangeObj.endDate = new Date();
	}
};

ZmAppt.prototype._getTTDay =
function(d) {
	var formatter = DwtCalendar.getDayFormatter();
	return formatter.format(d);
};

// Adds a row to the tool tip.
ZmAppt.prototype._addEntryRow =
function(field, data, html, idx, wrap, width) {
	if (data != null && data != "") {
		html[idx++] = "<tr valign='top'><td align='right' style='padding-right: 5px;'><b><div style='white-space:nowrap'>";
		html[idx++] = AjxStringUtil.htmlEncode(field) + ":";
		html[idx++] = "</div></b></td><td align='left'><div style='white-space:";
		html[idx++] = wrap ? "wrap;" : "nowrap;";
		if (width) html[idx++] = "width:" + width + "px;";
		html[idx++] = "'>";
		html[idx++] = AjxStringUtil.htmlEncode(data);
		html[idx++] = "</div></td></tr>";
	}
	return idx;
};

ZmAppt.prototype._populateRecurrenceFields = 
function () {
	if (this._rawRecurrences == null) return;
	var recurrences = this._rawRecurrences;
	var recur = null;
	var i, j, k, x;
	var adds, excludes, excepts, rules, rule;
	for (k = 0; k < recurrences.length ; ++k) {
		adds = recurrences[k].add;
		excludes = recurrences[k].excludes;
		excepts = recurrences[k].except;
		if (adds != null) {
			for (i = 0; i < adds.length; ++i) {
				rules = adds[i].rule;
				if (rules) {
					for (j =0; j < rules.length; ++j) {
						rule = rules[j];
						if (rule.freq) {
							this.repeatType = rule.freq.substring(0,3);
							if (rule.interval && rule.interval[0].ival) 
								this.repeatCustomCount = parseInt(rule.interval[0].ival);
						}
						// hmm ... what to do about negative numbers....
						if (rule.bymonth) {
							this.repeatYearlyMonthsList = rule.bymonth[0].molist;
							this.repeatCustom = "1";
						}
						if (rule.bymonthday) {
							if (this.repeatType == "YEA") {
								this.repeatCustomMonthDay = rule.bymonthday[0].modaylist;
								this.repeatCustomType = "S";
							} else if (this.repeatType == "MON"){
								this.repeatMonthlyDayList = rule.bymonthday[0].modaylist.split(",");
							}
							this.repeatCustom = "1";
						}
						if (rule.byday && rule.byday[0] && rule.byday[0].wkday) {
							this.repeatCustom = "1";
							var wkdayLen = rule.byday[0].wkday.length;
							if (this.repeatType == "WEE" || (this.repeatType == "DAI" && wkdayLen == 5)) {
								this.repeatWeekday = this.repeatType == "DAI";
								for (x = 0; x < wkdayLen; ++x) {
									if (this.repeatWeeklyDays == null) 
										this.repeatWeeklyDays = [];
									this.repeatWeeklyDays.push(rule.byday[0].wkday[x].day);
								}
							} else {
								this.repeatCustomDayOfWeek = rule.byday[0].wkday[0].day;
								this.repeatCustomOrdinal = rule.byday[0].wkday[0].ordwk;
								this.repeatCustomType = "O";
							}
						}
						if (rule.until) {
							this.repeatEndType = "D";
							this.repeatEndDate = AjxDateUtil.parseServerDateTime(rule.until[0].d);
						} else if (rule.count) {
							this.repeatEndType = "A";
							this.repeatEndCount = rule.count[0].num;
						}
					}
				}
				if (this.repeatWeeklyDays == null) {
					this.resetRepeatWeeklyDays();
				}
			}
		}
		if (excepts != null) {
			for (i = 0; i < excepts.length; ++i){
				// hmmm ....
			}
		}
	}
};

ZmAppt.prototype._frequencyToDisplayString = 
function(freq, count) {
	var plural = count > 1 ? 1 : 0;
	return freq == "DAI" && this.repeatWeekday 
		? ZmMsg.weekday
		: AjxDateUtil.FREQ_TO_DISPLAY[freq][plural];
};

//TODO : i18n
ZmAppt.prototype._getRecurrenceDisplayString = 
function() {
	if (this._recDispStr == null) {
		var recurrences = this._rawRecurrences;
		var startDate = this.startDate;
		this._recDispStr = ZmApptViewHelper.getRecurrenceDisplayString(recurrences, startDate);
	}
	return this._recDispStr;
};

ZmAppt.prototype._addInviteAndCompNum = 
function(soapDoc) {
	if (this._viewMode == ZmAppt.MODE_EDIT_SERIES || this._viewMode == ZmAppt.MODE_DELETE_SERIES) {
		if (this.recurring && this._seriesInvId !== void 0 && this._seriesInvId != null) {
			soapDoc.setMethodAttribute("id", this._seriesInvId);
			soapDoc.setMethodAttribute("comp", this.compNum);
		}
	} else {
		if (this.invId !== void 0 && this.invId != null && this.invId != -1) {
			soapDoc.setMethodAttribute("id", this.invId);
			soapDoc.setMethodAttribute("comp", this.compNum);
		}
	}
};

ZmAppt.prototype._getDefaultBlurb = 
function(cancel, isHtml) {
	var buf = [];
	var i = 0;
	var singleInstance = this._viewMode == ZmAppt.MODE_EDIT_SINGLE_INSTANCE	|| 
						 this._viewMode == ZmAppt.MODE_DELETE_INSTANCE;
	if (isHtml) {
		buf[i++] = "<h3>";
	}
	if (cancel) {
		buf[i++] = singleInstance ? ZmMsg.apptInstanceCanceled : ZmMsg.apptCanceled;
	} else {
		if (this._viewMode == ZmAppt.MODE_EDIT || 
			this._viewMode == ZmAppt.MODE_EDIT_SINGLE_INSTANCE ||
			this._viewMode == ZmAppt.MODE_EDIT_SERIES)
		{
			buf[i++] = singleInstance ? ZmMsg.apptInstanceModified : ZmMsg.apptModified;
		} else {
			buf[i++] = ZmMsg.apptNew;
		}
	}
	if (isHtml) {
		buf[i++] = "</h3>";
	}
	buf[i++] = "\n\n";
	buf[i++] = this.getSummary(isHtml);

	return buf.join("");
};

ZmAppt.prototype._getRecurrenceBlurbForSave = 
function() {
	if (this.repeatType == "NON") return "";

	var blurb = [];
	var idx = 0;

	blurb[idx++] = "Every ";
	if (this.repeatCustomCount > 1) {
		blurb[idx++] = this.repeatCustomCount;
		blurb[idx++] = " ";
	}
	blurb[idx++] = this._frequencyToDisplayString(this.repeatType, this.repeatCustomCount);

	var customRepeat = (this.repeatCustom == '1');
	if (this.repeatType == "WEE") {
		blurb[idx++] = " on ";
		if (customRepeat) {
			if (this.repeatWeeklyDays.length > 0) {
				for (var i = 0; i < this.repeatWeeklyDays.length; ++i) {
					blurb[idx++] = ZmAppt.SERVER_DAYS_TO_DISPLAY[this.repeatWeeklyDays[i]];
					if (i == (this.repeatWeeklyDays.length - 2 )) {
						blurb[idx++] = " and ";
					} else if (i < (this.repeatWeeklyDays.length - 1)) {
						blurb[idx++] = ", ";
					}
				}
			}
		} else {
			blurb[idx++] = AjxDateUtil.WEEKDAY_LONG[this.startDate.getDay()];
		}
	} else if (this.repeatType == "MON"){
		if (this.repeatCustomType == "S") {
			blurb[idx++] = " on the ";
			if (customRepeat) {
				var nums = this.repeatMonthlyDayList;
				nums = nums.sort(ZmAppt._SORTBY_VALUE);
				for (var i = 0 ; i < nums.length; ++i ) {
					blurb[idx++] = nums[i];
					if (i < nums.length - 1) {
						blurb[idx++] = ", ";
					} else if (i == nums.length - 2) {
						blurb[idx++] = " and ";
					}
				}
			} else {
				blurb[idx++] =  this.repeatCustomOrdinal;
				blurb[idx++] = this.repeatCustomDayOfWeek;
				blurb[idx++] = " of the month ";
			}
		} else {
			blurb[idx++] = this.startDate.getDate();
		}
	} else if (this.repeatType == "YEA") {
		if (customRepeat) {
			blurb[idx++] = " on ";
			blurb[idx++] = AjxDateUtil.MONTH_MEDIUM[Number(this.repeatYearlyMonthsList)-1]; // 0-based
			if (this.repeatCustomType == "O") {
				blurb[idx++] = " on the ";
				blurb[idx++] = ZmAppt.MONTHLY_DAY_OPTIONS[Number(this.repeatCustomOrdinal)-1].label;
				var dayOfWeek = null;
				blurb[idx++] = " ";
				for (var i = 0; i < ZmAppt.SERVER_WEEK_DAYS.length; i++) {
					if (ZmAppt.SERVER_WEEK_DAYS[i] == this.repeatCustomDayOfWeek) {
						dayOfWeek = AjxDateUtil.WEEKDAY_LONG[i];
						break;
					}
				}
				blurb[idx++] = dayOfWeek;
				blurb[idx++] = " of the month ";
			} else {
				blurb[idx++] = " ";
				blurb[idx++] = this.repeatCustomMonthDay;
			}
		} else {
			blurb[idx++] = " on ";
			blurb[idx++] = AjxDateUtil.MONTH_MEDIUM[this.startDate.getMonth()];
			blurb[idx++] = " ";
			blurb[idx++] = this.startDate.getDate();
		}
	}

	var dateFormatter = AjxDateFormat.getDateInstance(AjxDateFormat.SHORT);
	if (this.repeatEndDate != null && this.repeatEndType == "D") {
		blurb[idx++] = " until ";
		blurb[idx++] = dateFormatter.format(this.repeatEndDate);
		if (this._appCtxt.get(ZmSetting.CAL_SHOW_TIMEZONE)) {
			blurb[idx++] = " ";
			blurb[idx++] = ZmTimezones.valueToDisplay[this.timezone];
		}

	} else if (this.repeatEndType == "A") {
		blurb[idx++] = " for ";
		blurb[idx++] = this.repeatEndCount;
		blurb[idx++] = " ";
		blurb[idx++] = this._frequencyToDisplayString(this.repeatType, this.repeatEndCount);
	}
	blurb[idx++] = " effective ";
	blurb[idx++] = dateFormatter.format(this.startDate);
	return blurb.join("");
};


// Server request calls

ZmAppt.prototype._setSimpleSoapAttributes = 
function(soapDoc, method,  attachmentId, notifyList) {

	var m = this._messageNode = soapDoc.set('m');

	m.setAttribute("d", new Date().getTime());

	// do not set folderId if default folder or editing single instance
	if (this.getFolderId() != ZmOrganizer.ID_CALENDAR && 
		this._viewMode != ZmAppt.MODE_EDIT_SINGLE_INSTANCE)
	{
		m.setAttribute("l", this.folderId);
	}

	var inv = soapDoc.set("inv", null, m);
	switch (method) {
		case ZmAppt.SOAP_METHOD_REQUEST: inv.setAttribute('method', "REQUEST"); break;
		case ZmAppt.SOAP_METHOD_CANCEL:  inv.setAttribute('method', "CANCEL"); break;
	}
	
	inv.setAttribute("type", "event");

	if (this.isOrganizer()) {
		this._addAttendeesToSoap(soapDoc, inv, m, notifyList);
	}

	this._addNotesToSoap(soapDoc, m);

	if (this.uid !== void 0 && this.uid != null && this.uid != -1)
		inv.setAttribute("uid", this.uid);

	inv.setAttribute("type", "event");
	inv.setAttribute("fb", this.freeBusy);
	inv.setAttribute("transp", "O");
	inv.setAttribute("status","CONF");
	inv.setAttribute("allDay", this.allDayEvent);

	var s = soapDoc.set("s", null, inv);
	var e = soapDoc.set("e", null, inv);
	if (this.allDayEvent != "1") {
		var sd = AjxDateUtil.getServerDateTime(this.startDate);
		var ed = AjxDateUtil.getServerDateTime(this.endDate);

		// bug fix #4697 (part 1) - append "Z" @ end of start/end dates if no timezone found
		if (this.timezone) {
			s.setAttribute("tz", this.timezone);
			e.setAttribute("tz", this.timezone);
		} else {
			// sanity check
			if (sd.charAt(sd.length-1) != "Z") sd += "Z";
			if (ed.charAt(ed.length-1) != "Z") ed += "Z";
		}
		s.setAttribute("d", sd);
		e.setAttribute("d", ed);
		
	} else {
		s.setAttribute("d", AjxDateUtil.getServerDate(this.startDate));
		e.setAttribute("d", AjxDateUtil.getServerDate(this.endDate));
	}
	
	soapDoc.set("su", this.name, m);
	inv.setAttribute("name", this.name);

	if (this._attendees[ZmAppt.LOCATION] && this._attendees[ZmAppt.LOCATION].length) {
		inv.setAttribute("loc", this.getLocation());
	} else if (this.location) {
		inv.setAttribute("loc", this.location);
	}

	var organizer = this.organizer ? this.organizer : this._appCtxt.get(ZmSetting.USERNAME);
	var org = soapDoc.set("or", null, inv);
	org.setAttribute("a", organizer);
	if (organizer == this._appCtxt.get(ZmSetting.USERNAME)) {
		var name = this._appCtxt.get(ZmSetting.DISPLAY_NAME);
		if (name) {
			org.setAttribute("d", name);
		}
	}

	// handle attachments
	if (attachmentId != null || (this._validAttachments != null && this._validAttachments.length)) {
		var attachNode = soapDoc.set("attach", null, m);
		if (attachmentId)
			attachNode.setAttribute("aid", attachmentId);

		if (this._validAttachments) {
			for (var i = 0; i < this._validAttachments.length; i++) {
				var msgPartNode = soapDoc.set("mp", null, attachNode);
				msgPartNode.setAttribute("mid", this._message.id); 				// shouldnt this be this.getInvId() ??
				msgPartNode.setAttribute("part", this._validAttachments[i].part);
			}
		}
	}

	return {'inv': inv, 'm': m};
};

ZmAppt.prototype._addRecurrenceRulesToSoap = 
function(soapDoc, inv) {
	if (this.repeatType == "NON") return;

	var recur = soapDoc.set("recur", null, inv);
	var add = soapDoc.set("add", null, recur);
	var rule = soapDoc.set("rule", null, add);
	rule.setAttribute("freq", this.repeatType);

	var interval = soapDoc.set("interval", null, rule);
	interval.setAttribute("ival", this.repeatCustomCount);

	if (this.repeatEndDate != null && this.repeatEndType == "D") {
		var until = soapDoc.set("until", null, rule);
		until.setAttribute("d", AjxDateUtil.getServerDate(this.repeatEndDate));
		until.setAttribute("tz", this.timezone);
	} else if (this.repeatEndType == "A"){
		var c = soapDoc.set("count",null, rule);
		c.setAttribute("num", this.repeatEndCount);
	}

	if (this.repeatCustom != "1")
		return;

	if (this.repeatType == "DAI") {
		if (this.repeatWeekday) {
			// TODO: for now, handle "every weekday" as M-F
			//       eventually, needs to be localized work week days
			var bwd = soapDoc.set("byday", null, rule);
			for (var i in ZmAppt.SERVER_WEEK_DAYS) {
				var day = ZmAppt.SERVER_WEEK_DAYS[i];
				if (day == "SA" || day == "SU")
					continue;
				var wkDay = soapDoc.set("wkday", null, bwd);
				wkDay.setAttribute("day", day);
			}
		}
	} else if (this.repeatType == "WEE") {
		var bwd = soapDoc.set("byday", null, rule);
		for (var i = 0; i < this.repeatWeeklyDays.length; ++i) {
			var wkDay = soapDoc.set("wkday", null, bwd);
			wkDay.setAttribute("day", this.repeatWeeklyDays[i]);
		}
	} 
	else if (this.repeatType == "MON") 
	{
		if (this.repeatCustomType == "S") {
			var bmd = soapDoc.set("bymonthday", null, rule);
			bmd.setAttribute("modaylist", this.repeatMonthlyDayList);
		} else {
			var bwd = soapDoc.set("byday", null, rule);
			wkDay = soapDoc.set("wkday", null, bwd);
			wkDay.setAttribute("ordwk", this.repeatCustomOrdinal);
			wkDay.setAttribute("day", this.repeatCustomDayOfWeek);
		}
		var co = soapDoc.set('x-name', null, rule);
		co.setAttribute('name', "repeatCustomType");
		co.setAttribute('value', this.repeatCustomType);
	}
	else if (this.repeatType == "YEA") 
	{
		var bm = soapDoc.set("bymonth", null, rule);
		bm.setAttribute("molist", this.repeatYearlyMonthsList + 1);
		var co = soapDoc.set('x-name', null, rule);
		co.setAttribute('name', "repeatCustomType");
		co.setAttribute('value', this.repeatCustomType);
		if (this.repeatCustomType == "O") {
			var bwd = soapDoc.set("byday", null, rule);
			wkDay = soapDoc.set("wkday", null, bwd);
			wkDay.setAttribute("ordwk", this.repeatCustomOrdinal);
			wkDay.setAttribute("day", this.repeatCustomDayOfWeek);
		} else {
			var bmd = soapDoc.set("bymonthday", null, rule);
			bmd.setAttribute("modaylist", this.repeatCustomMonthDay);						
		}
	}
};

ZmAppt.prototype._addAttendeesToSoap = 
function(soapDoc, inv, m, notifyList) {
	if (this._attendees[ZmAppt.PERSON] && this._attendees[ZmAppt.PERSON].length) {
		for (var i = 0; i < this._attendees[ZmAppt.PERSON].length; i++) {
			this._addAttendeeToSoap(soapDoc, inv, m, notifyList, this._attendees[ZmAppt.PERSON][i], ZmAppt.PERSON);
		}
	}
	if (this._attendees[ZmAppt.RESOURCE] && this._attendees[ZmAppt.RESOURCE].length) {
		for (var i = 0; i < this._attendees[ZmAppt.RESOURCE].length; i++) {
			this._addAttendeeToSoap(soapDoc, inv, m, notifyList, this._attendees[ZmAppt.RESOURCE][i], ZmAppt.RESOURCE);
		}
	}
	if (this._attendees[ZmAppt.LOCATION] && this._attendees[ZmAppt.LOCATION].length) {
		for (var i = 0; i < this._attendees[ZmAppt.LOCATION].length; i++) {
			this._addAttendeeToSoap(soapDoc, inv, m, notifyList, this._attendees[ZmAppt.LOCATION][i], ZmAppt.LOCATION);
		}
	}

	// if we have a separate list of email addresses to notify, do it here
	if (m && notifyList) {
		for (var i = 0; i < notifyList.length; i++) {
			e = soapDoc.set("e", null, m);
			e.setAttribute("a", notifyList[i]);
			e.setAttribute("t", ZmEmailAddress.toSoapType[ZmEmailAddress.TO]);
		}
	}
};

ZmAppt.prototype._addAttendeeToSoap = 
function(soapDoc, inv, m, notifyList, attendee, type) {
	var address = attendee.getEmail();
	if (!address) return;

	var dispName = attendee.getFullName();
	if (inv) {
		at = soapDoc.set("at", null, inv);
		// for now make attendees optional, until UI has a way of setting this
		at.setAttribute("role", (type == ZmAppt.PERSON) ? ZmAppt.ROLE_OPTIONAL : ZmAppt.ROLE_NON_PARTICIPANT);
		at.setAttribute("ptst", ZmAppt.PSTATUS_NEEDS_ACTION);
		var cutype = (type == ZmAppt.PERSON) ? null : ZmAppt.CUTYPE_RESOURCE;
		if (cutype) {
			at.setAttribute("cutype", cutype);
		}
		at.setAttribute("rsvp", "1");
		at.setAttribute("a", address);
		if (dispName) {
			at.setAttribute("d", dispName);
		}
	}

	// set email to notify if notifyList not provided
	if (m && !notifyList) {
		e = soapDoc.set("e", null, m);
		e.setAttribute("a", address);
		if (dispName)
			e.setAttribute("p", dispName);
		e.setAttribute("t", ZmEmailAddress.toSoapType[ZmEmailAddress.TO]);
	}
};

ZmAppt.prototype._addNotesToSoap = 
function(soapDoc, m, cancel) {	

	var hasAttendees = (this._attendees[ZmAppt.PERSON] && this._attendees[ZmAppt.PERSON].length);
	var tprefix = hasAttendees ? this._getDefaultBlurb(cancel) : "";
	var hprefix = hasAttendees ? this._getDefaultBlurb(cancel, true) : "";
	
	var mp = soapDoc.set("mp", null, m);
	mp.setAttribute("ct", ZmMimeTable.MULTI_ALT);
	var numSubParts = this.notesTopPart ? this.notesTopPart.children.size() : 0;
	if (numSubParts > 0) {
		for (var i = 0; i < numSubParts; i++) {
			var part = this.notesTopPart.children.get(i);
			var partNode = soapDoc.set("mp", null, mp);
			var pct = part.getContentType();
			partNode.setAttribute("ct", pct);

			var isHtml = pct == ZmMimeTable.TEXT_HTML;
			var pprefix = isHtml ? hprefix  : tprefix;
			var content = AjxBuffer.concat(pprefix, part.getContent());
			soapDoc.set("content", content, partNode);
		}
	}
	else {
		var tcontent = this.notesTopPart ? this.notesTopPart.getContent() : "";
		var textPart = soapDoc.set("mp", null, mp);
		textPart.setAttribute("ct", ZmMimeTable.TEXT_PLAIN);
		soapDoc.set("content", AjxBuffer.concat(tprefix, tcontent), textPart);

		var hcontent = AjxStringUtil.nl2br(tcontent);
		var htmlPart = soapDoc.set("mp", null, mp);
		htmlPart.setAttribute("ct", ZmMimeTable.TEXT_HTML);
		soapDoc.set("content", AjxBuffer.concat(hprefix, hcontent), htmlPart);
	}
};

ZmAppt.prototype._sendRequest = 
function(soapDoc, callback, errorCallback) {
	var responseName = soapDoc.getMethod().nodeName.replace("Request", "Response");
	var respCallback = new AjxCallback(this, this._handleResponseSend, [responseName, callback]);
	this._appCtxt.getAppController().sendRequest({soapDoc: soapDoc, asyncMode: true, callback: respCallback, errorCallback: errorCallback});
};


// Callbacks

ZmAppt.prototype._handleResponseSend = 
function(respName, callback, result) {
	var resp = result.getResponse();

	// branch for different responses
	var response = resp[respName];
	if (response.uid != null)
		this.uid = response.uid;

	if (response.m != null) {
		var oldInvId = this.invId;
		this.invId = response.m.id;
		if (oldInvId != this.invId)
			this.clearDetailsCache();
	}

	this._messageNode = null;

	if (callback)
		callback.run();
};

ZmAppt.prototype._handleResponseCancel =
function(mode) {
	if (mode == ZmAppt.MODE_DELETE || mode == ZmAppt.MODE_DELETE_SERIES || mode == ZmAppt.MODE_DELETE_INSTANCE) {
		var soapDoc = AjxSoapDoc.create("CancelAppointmentRequest", "urn:zimbraMail");
		this._addInviteAndCompNum(soapDoc);

		if (mode == ZmAppt.MODE_DELETE_INSTANCE) {
			soapDoc.setMethodAttribute("s", this.getOrigStartTime());
			var inst = soapDoc.set("inst");
			inst.setAttribute("d", AjxDateUtil.getServerDateTime(this.getOrigStartDate()));
			inst.setAttribute("tz", this.timezone);
		}

		var m = soapDoc.set("m");
		if (this.isOrganizer()) {
			this._addAttendeesToSoap(soapDoc, null, m);
		}
		soapDoc.set("su", "Cancelled: " + this.name, m);
		this._addNotesToSoap(soapDoc, m, true);
		this._sendRequest(soapDoc);
	}
};

ZmAppt.prototype._handleResponseGetDetails =
function(mode, message, callback, result) {
	// msg content should be text, so no need to pass callback to setFromMessage()
	this.setFromMessage(message, mode);
	if (callback) callback.run(result);
};

// Static methods

/**
* Compares two appts. sort by (starting date, duration)
* sort methods.
*
* @param a		an appt
* @param b		an appt
*/
ZmAppt.compareByTimeAndDuration =
function(a, b) {
	if (a.getStartTime() > b.getStartTime()) 	return 1;
	if (a.getStartTime() < b.getStartTime()) 	return -1;
	if (a.getDuration() < b.getDuration()) 		return 1;
	if (a.getDuration() > b.getDuration()) 		return -1;
	return 0;
};

ZmAppt._getTTHour =
function(d) {
	var formatter = AjxDateFormat.getTimeInstance(AjxDateFormat.SHORT);
	return formatter.format(d);
};

ZmAppt._SORTBY_VALUE = 
function(a, b) {
	a = Number(a);
	b = Number(b);
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
};
