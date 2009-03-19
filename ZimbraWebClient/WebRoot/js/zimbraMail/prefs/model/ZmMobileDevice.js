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
 * Creates an empty mobile device object.
 * @constructor
 * @class
 *
 * @author Parag Shah
 *
 */
ZmMobileDevice = function(params) {
	this.lastPolicyUpdate = params.lastPolicyUpdate;
	this.firstReqReceived = params.firstReqReceived;
	this.remoteWipeAckTime = params.remoteWipeAckTime;
	this.remoteWipeReqTime = params.remoteWipeReqTime;
	this.status = params.status;
	this.provisionable = params.provisionable;
	this.protocol = params.protocol;
	this.ua = params.ua;
	this.type = params.type;
	this.id = params.id;
};


// Consts

ZmMobileDevice.STATUS_NEED_PROVISION		= 0;
ZmMobileDevice.STATUS_OK					= 1;
ZmMobileDevice.STATUS_SUSPENDED				= 2;
ZmMobileDevice.STATUS_REMOTE_WIPE_REQUESTED	= 3;
ZmMobileDevice.STATUS_REMOTE_WIPE_COMPLETE	= 4;


// Public methods

ZmMobileDevice.prototype.toString =
function() {
	return "ZmMobileDevice";
};

ZmMobileDevice.prototype.getStatus =
function() {
	return (!this.provisionable && this.status == ZmMobileDevice.STATUS_NEED_PROVISION)
		? ZmMobileDevice.STATUS_OK : this.status;
};

ZmMobileDevice.prototype.getStatusString =
function() {
	var status = this.getStatus();

	switch (status) {
		case ZmMobileDevice.STATUS_NEED_PROVISION:			return ZmMsg.mobileStatusNeedProvision;
		case ZmMobileDevice.STATUS_OK:						return ZmMsg.mobileStatusOk;
		case ZmMobileDevice.STATUS_SUSPENDED:				return ZmMsg.mobileStatusSuspended;
		case ZmMobileDevice.STATUS_REMOTE_WIPE_REQUESTED:	return ZmMsg.mobileStatusWipe;
		case ZmMobileDevice.STATUS_REMOTE_WIPE_COMPLETE:	return ZmMsg.mobileStatusWipeComplete;
	}
	return "";
};

ZmMobileDevice.prototype.getLastPolicyUpdateString =
function() {
	return this.lastPolicyUpdate ? AjxDateUtil.simpleComputeDateStr(new Date(this.lastPolicyUpdate*1000)) : "";
};

ZmMobileDevice.prototype.getFirstReqReceivedString =
function() {
	return this.firstReqReceived ? AjxDateUtil.simpleComputeDateStr(new Date(this.firstReqReceived*1000)) : "";
};

ZmMobileDevice.prototype.getRemoteWipeAckTimeString =
function() {
	return this.remoteWipeAckTime ? AjxDateUtil.simpleComputeDateStr(new Date(this.remoteWipeAckTime*1000)) : "";
};

ZmMobileDevice.prototype.getRemoteWipeReqTimeString =
function() {
	return this.remoteWipeReqTime ? AjxDateUtil.simpleComputeDateStr(new Date(this.remoteWipeReqTime*1000)) : "";
};

ZmMobileDevice.prototype.doAction =
function(id, callback) {
	var request;
	switch (id) {
		case ZmOperation.DELETE: 				request = "RemoveDeviceRequest"; break;
		case ZmOperation.MOBILE_RESUME_SYNC:	request = "ResumeDeviceRequest"; break;
		case ZmOperation.MOBILE_SUSPEND_SYNC:	request = "SuspendDeviceRequest"; break;
		case ZmOperation.MOBILE_WIPE:			request = "RemoteWipeRequest"; break;
		case ZmOperation.MOBILE_CANCEL_WIPE:	request = "CancelPendingRemoteWipeRequest"; break;
	}

	if (request) {
		var soapDoc = AjxSoapDoc.create(request, "urn:zimbraSync");
		var node = soapDoc.set("device");
		node.setAttribute("id", this.id);

		var respCallback = new AjxCallback(this, this._handleDoAction, callback);
		appCtxt.getAppController().sendRequest({soapDoc:soapDoc, asyncMode:true, callback:respCallback});
	}
};

ZmMobileDevice.prototype._handleDoAction =
function(callback, results) {
	var resp = results.getResponse();
	for (var i in resp) {
		var device = resp[i].device && resp[i].device[0];
		if (device && device.id == this.id) {
			this.status = device.status;
			if (device.lastPolicyUpdate) {
				this.lastPolicyUpdate = device.lastPolicyUpdate;
			}
			if (device.firstReqReceived) {
				this.firstReqReceived = device.firstReqReceived;
			}
			if (device.remoteWipeAckTime) {
				this.remoteWipeAckTime = device.remoteWipeAckTime;
			}
			if (device.remoteWipeReqTime) {
				this.remoteWipeReqTime = device.remoteWipeReqTime;
			}
		}
	}

	if (callback) {
		callback.run();
	}
};
