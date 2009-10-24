/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2005, 2006, 2007, 2008, 2009 Zimbra, Inc.
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
 * Creates a setting.
 * @constructor
 * @class
 * This class represents a single setting. A setting's default value never changes; it
 * is available in case the user wishes to restore the current value to the default.
 * Most but not all settings have a corollary on the server side. Settings that don't
 * will depend on the environment or user activity to get their value.
 *
 * @author Conrad Damon
 * 
 * @param id				a unique ID
 * @param params			hash:
 *        name				the name of the pref or attr on the server
 *        type				config, pref, or COS
 *        dataType			string, int, or boolean
 *        defaultValue		default value
 *        isGlobal			true if this setting is global across accounts
 *        isImplicit		true if this setting is not represented in Preferences
 */
ZmSetting = function(id, params) {

	if (arguments.length == 0) return;
	ZmModel.call(this, ZmEvent.S_SETTING);
	
	this.id = id;
	this.name = params.name;
	this.type = params.type;
	this.dataType = params.dataType || ZmSetting.D_STRING;
	this.defaultValue = params.defaultValue;
	if (params.isGlobal) {
		ZmSetting.IS_GLOBAL[id] = true;
	}
	if (params.isImplicit) {
		ZmSetting.IS_IMPLICIT[id] = true;
	}
	
	if (this.dataType == ZmSetting.D_HASH) {
		this.value = {};
		this.defaultValue = {};
	} else if (this.dataType == ZmSetting.D_LIST) {
		this.value = [];
		this.defaultValue = [];
	} else {
		this.value = null;
	}
};

ZmSetting.prototype = new ZmModel;
ZmSetting.prototype.constructor = ZmSetting;

// setting types
ZmSetting.T_CONFIG		= "config";
ZmSetting.T_COS			= "cos";
ZmSetting.T_METADATA	= "meta";
ZmSetting.T_PREF		= "pref";
ZmSetting.T_PSEUDO		= "pseudo";

// setting data types
ZmSetting.D_STRING		= "string"; // default type
ZmSetting.D_INT			= "int";
ZmSetting.D_BOOLEAN		= "boolean";
ZmSetting.D_LDAP_TIME 	= "ldap_time";
ZmSetting.D_HASH 		= "hash";
ZmSetting.D_LIST		= "list";
ZmSetting.D_NONE		= "NONE";	// placeholder setting

// constants used as setting values
// TODO: these should be defined in their respective apps
ZmSetting.ACL_AUTH				= "all";
ZmSetting.ACL_GROUP				= "grp";
ZmSetting.ACL_NONE				= "none";
ZmSetting.ACL_PUBLIC			= "pub";
ZmSetting.ACL_USER				= "usr";
ZmSetting.CAL_DAY				= "day";
ZmSetting.CAL_LIST				= "list";
ZmSetting.CAL_MONTH				= "month";
ZmSetting.CAL_WEEK				= "week";
ZmSetting.CAL_WORK_WEEK			= "workWeek";
ZmSetting.CAL_SCHEDULE			= "schedule";
ZmSetting.CAL_VISIBILITY_PRIV	= "private";
ZmSetting.CAL_VISIBILITY_PUB	= "public";
ZmSetting.CLIENT_ADVANCED		= "advanced";				// zimbraPrefClientType
ZmSetting.CLIENT_STANDARD		= "standard";
ZmSetting.COMPOSE_FONT_COLOR	= "#000000";	 			// zimbraPrefHtmlEditorDefaultFontColor
ZmSetting.COMPOSE_FONT_FAM 		= "Times New Roman";		// zimbraPrefHtmlEditorDefaultFontFamily
ZmSetting.COMPOSE_FONT_SIZE 	= AjxMessageFormat.format(ZmMsg.pt,"12"); 			// zimbraPrefHtmlEditorDefaultFontSize
ZmSetting.COMPOSE_TEXT 			= "text";					// zimbraPrefComposeFormat
ZmSetting.COMPOSE_HTML 			= "html";
ZmSetting.CV_CARDS				= "cards"; 					// zimbraPrefContactsInitialView
ZmSetting.CV_LIST				= "list";
ZmSetting.DEDUPE_NONE			= "dedupeNone";				// zimbraPrefDedupeMessagesSentToSelf
ZmSetting.DEDUPE_SECOND			= "secondCopyifOnToOrCC";
ZmSetting.DEDUPE_INBOX			= "moveSentMessageToInbox";
ZmSetting.DEDUPE_ALL			= "dedupeAll";
ZmSetting.DELETE_SELECT_NEXT	= "next";					// zimbraPrefMailSelectAfterDelete
ZmSetting.DELETE_SELECT_PREV	= "previous";
ZmSetting.DELETE_SELECT_ADAPT	= "adaptive";
ZmSetting.GETMAIL_ACTION_DEFAULT= "default";				// zimbraPrefGetMailAction
ZmSetting.GETMAIL_ACTION_UPDATE = "update";
ZmSetting.GROUP_BY_CONV			= "conversation";			// zimbraPrefGroupMailBy
ZmSetting.GROUP_BY_MESSAGE		= "message";
ZmSetting.HTTP_DEFAULT_PORT		= 80;
ZmSetting.HTTPS_DEFAULT_PORT	= 443;
ZmSetting.INCLUDE_NONE			= "includeNone";			// zimbraPrefForwardIncludeOriginalText
ZmSetting.INCLUDE				= "includeBody";
ZmSetting.INCLUDE_PREFIX		= "includeBodyWithPrefix";
ZmSetting.INCLUDE_PREFIX_FULL   = "includeBodyAndHeadersWithPrefix";
ZmSetting.INCLUDE_ATTACH		= "includeAsAttachment";
ZmSetting.INCLUDE_SMART			= "includeSmart";
ZmSetting.LICENSE_BAD			= "bad";					// license status (network only)
ZmSetting.LICENSE_GOOD			= "good";
ZmSetting.LICENSE_GRACE			= "inGracePeriod";
ZmSetting.MARK_READ_NONE		= -1;						// zimbraPrefMarkMsgRead
ZmSetting.MARK_READ_NOW			= 0;						// zimbraPrefMarkMsgRead
ZmSetting.MARK_READ_TIME		= 1;						// zimbraPrefMarkMsgRead
ZmSetting.PROTO_HTTP			= "http:";
ZmSetting.PROTO_HTTPS			= "https:";
ZmSetting.PROTO_MIXED			= "mixed:";
ZmSetting.RIGHT_VIEW_FREE_BUSY	= "viewFreeBusy";
ZmSetting.RIGHT_INVITE			= "invite";
ZmSetting.RP_BOTTOM				= "bottom";					// zimbraPrefReadingPaneLocation / zimbraPrefConvReadingPaneLocation
ZmSetting.RP_OFF				= "off";
ZmSetting.RP_RIGHT				= "right";
ZmSetting.SIG_INTERNET			= "internet";				// zimbraPrefMailSignatureStyle
ZmSetting.SIG_OUTLOOK			= "outlook";

// we need these IDs available when the app classes are parsed
ZmSetting.LOCALE_NAME			= "LOCALE_NAME";
ZmSetting.SKIN_NAME				= "SKIN_NAME";

ZmSetting.BRIEFCASE_ENABLED		= "BRIEFCASE_ENABLED";
ZmSetting.CALENDAR_ENABLED		= "CALENDAR_ENABLED";
ZmSetting.CONTACTS_ENABLED		= "CONTACTS_ENABLED";
ZmSetting.IM_ENABLED			= "IM_ENABLED";
ZmSetting.MAIL_ENABLED			= "MAIL_ENABLED";
ZmSetting.MIXED_VIEW_ENABLED	= "MIXED_VIEW_ENABLED";
ZmSetting.NOTEBOOK_ENABLED		= "NOTEBOOK_ENABLED";
ZmSetting.OPTIONS_ENABLED		= "OPTIONS_ENABLED";
ZmSetting.PORTAL_ENABLED		= "PORTAL_ENABLED";
ZmSetting.TASKS_ENABLED			= "TASKS_ENABLED";
ZmSetting.VOICE_ENABLED			= "VOICE_ENABLED";

ZmSetting.CALENDAR_UPSELL_ENABLED	= "CALENDAR_UPSELL_ENABLED";
ZmSetting.CONTACTS_UPSELL_ENABLED	= "CONTACTS_UPSELL_ENABLED";
ZmSetting.MAIL_UPSELL_ENABLED		= "MAIL_UPSELL_ENABLED";
ZmSetting.VOICE_UPSELL_ENABLED		= "VOICE_UPSELL_ENABLED";

// remove this block when offline.jsp upgrades
ZmSetting.APPS_COOKIE			= "ZM_APPS";
ZmSetting.APP_LETTER = {};
ZmSetting.APP_LETTER[ZmSetting.PORTAL_ENABLED]		= "p";
ZmSetting.APP_LETTER[ZmSetting.MAIL_ENABLED]		= "m";
ZmSetting.APP_LETTER[ZmSetting.CALENDAR_ENABLED]	= "c";
ZmSetting.APP_LETTER[ZmSetting.CONTACTS_ENABLED]	= "a";
ZmSetting.APP_LETTER[ZmSetting.OPTIONS_ENABLED]	    = "o";
ZmSetting.APP_LETTER[ZmSetting.IM_ENABLED]			= "i";
ZmSetting.APP_LETTER[ZmSetting.NOTEBOOK_ENABLED]	= "n";
ZmSetting.APP_LETTER[ZmSetting.BRIEFCASE_ENABLED]	= "b";
ZmSetting.APP_LETTER[ZmSetting.TASKS_ENABLED]		= "t";
ZmSetting.APP_LETTER[ZmSetting.MIXED_VIEW_ENABLED]	= "x";
ZmSetting.APP_LETTER[ZmSetting.VOICE_ENABLED]		= "v";

// hash of global settings
ZmSetting.IS_GLOBAL = {};

// hash of implicit settings
ZmSetting.IS_IMPLICIT = {};

// hash of implicit settings that have been changed during the current session
ZmSetting.CHANGED_IMPLICIT = {};

ZmSetting.prototype.toString =
function() {
	return this.name + ": " + this.value;
};

/**
 * Returns the current value of this setting.
 *
 * @param key			[string]*		optional key for use by hash table data type
 * @param serialize		[boolean]*		if true, serialize non-string value into string
 */
ZmSetting.prototype.getValue =
function(key, serialize) {
	var value = null;
	if (this.value != null) {
		value = key ? this.value[key] : this.value;
	} else if (this.defaultValue != null) {
		value = key ? this.defaultValue[key] : this.defaultValue;
	} else {
		return null;
	}

	if (serialize) {
		if (this.dataType == ZmSetting.D_BOOLEAN) {
			value = value ? "TRUE" : "FALSE";
		} else if (this.dataType == ZmSetting.D_HASH) {
			var keys = [];
			for (var key in value) {
				keys.push(key);
			}
			keys.sort();
			var pairs = [];
			for (var j = 0; j < keys.length; j++) {
				var key = keys[j];
				pairs.push([key, value[key]].join(":"));
			}
			value = pairs.join(",");
		} else if (this.dataType == ZmSetting.D_LIST) {
			value = value.join(",");
		}
	}
	
	return value;
};

/**
* Retrns the default value of this setting.
*
* @param key 			optional key for use by hash table data type
*/
ZmSetting.prototype.getDefaultValue =
function(key) {
	return key ? this.defaultValue[key] : this.defaultValue;
};

/**
 * Sets the current value of this setting, performing any necessary data type conversion.
 *
 * @param value			the new value for the setting
 * @param key 			optional key for use by hash table data type
 * @param setDefault		if true, also set the default value
 * @param skipNotify		if true, don't notify listeners
 * @param skipImplicit		if true, don't check for change to implicit pref
 */
ZmSetting.prototype.setValue =
function(value, key, setDefault, skipNotify, skipImplicit) {

	var newValue = value;
	var changed = Boolean(newValue != this.value);
	if (this.dataType == ZmSetting.D_STRING) {
		this.value = newValue;
	} else if (this.dataType == ZmSetting.D_INT) {
		newValue = parseInt(value);
		if (isNaN(newValue)) { // revert to string if NaN
			newValue = value;
		}
		changed = Boolean(newValue != this.value);
		this.value = newValue;
	} else if (this.dataType == ZmSetting.D_BOOLEAN) {
		if (typeof(newValue) == "string") {
			newValue = (newValue.toLowerCase() === "true");
		}
		changed = Boolean(newValue != this.value);
		this.value = newValue;
	} else if (this.dataType == ZmSetting.D_LDAP_TIME) {
		var lastChar = (newValue.toLowerCase) ? lastChar = (newValue.toLowerCase()).charAt(newValue.length-1) : null;
		var num = parseInt(newValue);
		// convert to seconds
		if (lastChar == 'd') {
			newValue = num * 24 * 60 * 60;
		} else if (lastChar == 'h') {
			newValue = num * 60 * 60;
		} else if (lastChar == 'm') {
			newValue = num * 60;
		} else {
			newValue = num;	// default
		}
		changed = Boolean(newValue != this.value);
		this.value = newValue;
	} else if (this.dataType == ZmSetting.D_HASH) {
		if (key) {
			if (newValue) {
				this.value[key] = newValue;
			} else {
				delete this.value[key];
			}
		} else {
			this.value = newValue;
		}
		changed = true;
	} else if (this.dataType == ZmSetting.D_LIST) {
		if (newValue instanceof Array) {
			this.value = newValue;
		} else {
			this.value.push(newValue);
		}
		changed = true;
	}

	if (setDefault) {
		if (key) {
			this.defaultValue[key] = this.value[key];
		} else {
			this.defaultValue = this.value;
		}
	}
	
	if (ZmSetting.IS_IMPLICIT[this.id] && changed && !skipImplicit) {
		ZmSetting.CHANGED_IMPLICIT[this.id] = true;
	}

	// Setting an internal pref is equivalent to saving it, so we should notify
	if (!this.name && !skipNotify) {
		this._notify(ZmEvent.E_MODIFY, key);
	}
};

ZmSetting.prototype.notifyModify = 
function(obj) {
	if (this.id == ZmSetting.QUOTA_USED && obj._name == "mbx" && obj.s != null) {
		this.setValue(obj.s);
		this._notify(ZmEvent.E_MODIFY);
	}
};
