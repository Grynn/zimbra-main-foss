/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2005, 2006, 2007 Zimbra, Inc.
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


ZaModel = function(init) {
 	if (arguments.length == 0) return;
	this._evtMgr = new AjxEventMgr();
}


ZaModel.BOOLEAN_CHOICES= [{value:"TRUE", label:ZaMsg.Yes}, {value:"FALSE", label:ZaMsg.No}, {value:null, label:ZaMsg.No}];
ZaModel.BOOLEAN_CHOICES1= [{value:true, label:ZaMsg.Yes}, {value:false, label:ZaMsg.No}, {value:null, label:ZaMsg.No}];
ZaModel.FONT_SIZE_CHOICES = [
	{value:"8pt", label: "8pt"},
	{value:"10pt", label: "10pt"},
	{value:"12pt", label: "12pt"},
	{value:"14pt", label: "14pt"},
	{value:"18pt", label: "18pt"},
	{value:"24pt", label: "24pt"},
	{value:"36pt", label: "36pt"}];
	
ZaModel.FONT_FAMILY_CHOICES = [
	{label:"Arial", 			value:"Arial, Helvetica, sans-serif" },
	{label:"Times New Roman",	value:"Times New Roman, Times, serif" },
	{label:"Courier", 			value:"Courier, Courier New, mono" },
	{label:"Verdana",			value:"Verdana, Arial, Helvetica, sans-serif" }
];

ZaModel.COMPOSE_FORMAT_CHOICES = [{value:"text", label:ZaMsg.Text}, {value:"html", label:ZaMsg.HTML}];
ZaModel.GROUP_MAIL_BY_CHOICES = [{value:"conversation", label:ZaMsg.Conversation}, {value:"message", label:ZaMsg.Message}];
ZaModel.SIGNATURE_STYLE_CHOICES = [{value:"outlook", label:ZaMsg.No}, {value:"internet", label:ZaMsg.Yes}];
ZaModel.REMINDER_CHOICES = [{value:"0",label:ZaMsg.never},{value:1,label:"1"},{value:5,label:"5"},{value:10,label:"10"},{value:15,label:"15"},{value:20,label:"20"},{value:25,label:"25"},{value:30,label:"30"},{value:45,label:"45"},{value:50,label:"50"},{value:55,label:"55"},{value:60,label:"60"}];
ZaModel.ErrorCode = "code";
ZaModel.ErrorMessage = "error_message";
ZaModel.currentStep = "currentStep";
ZaModel.currentTab = "currentTab";

ZaModel.prototype.toString = 
function() {
	return "ZaModel";
}

ZaModel.prototype.addChangeListener = 
function(listener) {
	return this._evtMgr.addListener(ZaEvent.L_MODIFY, listener);
}

ZaModel.prototype.removeChangeListener = 
function(listener) {
	return this._evtMgr.removeListener(ZaEvent.L_MODIFY, listener);    	
}


ZaModel.setUnrecoganizedTimezone = function (tz) {
	var new_tz = "Unrecognized";
	var tzChoices = ZaSettings.timeZoneChoices.getChoices () ;
	for (var i=0; i < tzChoices.values.length; i ++) {
		if (tz == tzChoices.values[i]) {
			new_tz = tz ;
			break ;
		}	
	}
	return new_tz ;
}