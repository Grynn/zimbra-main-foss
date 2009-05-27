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
 * Creates a new (empty) mail message.
 * @constructor
 * @class
 * This class represents a mail message.
 *
 * @param id		[int]			unique ID
 * @param list		[ZmMailList]	list that contains this message
 * @param noCache	[boolean]*		if true, do not cache this msg
 */
ZmMailMsg = function(id, list, noCache) {

	ZmMailItem.call(this, ZmItem.MSG, id, list, noCache);

	this.inHitList = false;
	this._attHitList = [];
	this.attachments = [];
	this._bodyParts = [];
	this._addrs = {};

	for (var i = 0; i < ZmMailMsg.ADDRS.length; i++) {
		var type = ZmMailMsg.ADDRS[i];
		this._addrs[type] = new AjxVector();
	}
	this.identity = null;
};

ZmMailMsg.prototype = new ZmMailItem;
ZmMailMsg.prototype.constructor = ZmMailMsg;

ZmMailMsg.ADDRS = [AjxEmailAddress.FROM, AjxEmailAddress.TO, AjxEmailAddress.CC,
				   AjxEmailAddress.BCC, AjxEmailAddress.REPLY_TO, AjxEmailAddress.SENDER];

ZmMailMsg.COMPOSE_ADDRS = [AjxEmailAddress.TO, AjxEmailAddress.CC, AjxEmailAddress.BCC];

ZmMailMsg.HDR_FROM		= AjxEmailAddress.FROM;
ZmMailMsg.HDR_TO		= AjxEmailAddress.TO;
ZmMailMsg.HDR_CC		= AjxEmailAddress.CC;
ZmMailMsg.HDR_BCC		= AjxEmailAddress.BCC;
ZmMailMsg.HDR_REPLY_TO	= AjxEmailAddress.REPLY_TO;
ZmMailMsg.HDR_SENDER	= AjxEmailAddress.SENDER;
ZmMailMsg.HDR_DATE		= "DATE";
ZmMailMsg.HDR_SUBJECT	= "SUBJECT";

ZmMailMsg.HDR_KEY = new Object();
ZmMailMsg.HDR_KEY[ZmMailMsg.HDR_FROM]		= ZmMsg.from;
ZmMailMsg.HDR_KEY[ZmMailMsg.HDR_TO]			= ZmMsg.to;
ZmMailMsg.HDR_KEY[ZmMailMsg.HDR_CC]			= ZmMsg.cc;
ZmMailMsg.HDR_KEY[ZmMailMsg.HDR_BCC]		= ZmMsg.bcc;
ZmMailMsg.HDR_KEY[ZmMailMsg.HDR_REPLY_TO]	= ZmMsg.replyTo;
ZmMailMsg.HDR_KEY[ZmMailMsg.HDR_SENDER]		= ZmMsg.sender;
ZmMailMsg.HDR_KEY[ZmMailMsg.HDR_DATE]		= ZmMsg.sentAt;
ZmMailMsg.HDR_KEY[ZmMailMsg.HDR_SUBJECT]	= ZmMsg.subject;

ZmMailMsg.URL_RE = /((telnet:)|((https?|ftp|gopher|news|file):\/\/)|(www\.[\w\.\_\-]+))[^\s\xA0\(\)\<\>\[\]\{\}\'\"]*/i;

ZmMailMsg.CONTENT_PART_ID = "ci";
ZmMailMsg.CONTENT_PART_LOCATION = "cl";

// Additional headers to request.  Also used by ZmConv and ZmSearch
ZmMailMsg.requestHeaders = {};

/**
 * Fetches a message from the server.
 *
 * @param params		[hash]				hash of params:
 *        sender		[ZmZimbraMail]		provides access to sendRequest()
 *        msgId			[int]				ID of the msg to be fetched.
 *        partId 		[int]* 				msg part ID (if retrieving attachment part, i.e. rfc/822)
 *        ridZ   		[int]* 				RECURRENCE-ID in Z (UTC) timezone
 *        getHtml		[boolean]*			if true, try to fetch html from the server
 *        markRead		[boolean]*			if true, mark msg read
 *        callback		[AjxCallback]*		async callback
 *        errorCallback	[AjxCallback]*		async error callback
 *        noBusyOverlay	[boolean]*			don't put up busy overlay during request
 *        noTruncate	[boolean]*			don't truncate message body
 *        batchCmd		[ZmBatchCommand]*	if set, request gets added to this batch command
 */
ZmMailMsg.fetchMsg =
function(params) {
	var jsonObj = {GetMsgRequest:{_jsns:"urn:zimbraMail"}};
	var request = jsonObj.GetMsgRequest;
	var m = request.m = {};
	m.id = params.msgId;
	if (params.partId) {
		m.part = params.partId;
	}
	if (params.markRead) {
		m.read = 1;
	}
	if (params.getHtml) {
		m.html = 1;
	}

	if (params.ridZ) {
		m.ridZ = params.ridZ;
	}

	for (var hdr in ZmMailMsg.requestHeaders) {
		if (!m.header) { m.header = []; }
		m.header.push({n:hdr});
	}

	if (!params.noTruncate) {
		m.max = appCtxt.get(ZmSetting.MAX_MESSAGE_SIZE) || ZmMailApp.DEFAULT_MAX_MESSAGE_SIZE;
	}

	if (params.batchCmd) {
		params.batchCmd.addRequestParams(jsonObj, params.callback);
	} else {
		var newParams = {
			jsonObj: jsonObj,
			asyncMode: true,
			callback: (new AjxCallback(null, ZmMailMsg._handleResponseFetchMsg, [params.callback])),
			errorCallback: params.errorCallback,
			noBusyOverlay: params.noBusyOverlay
		};
		params.sender.sendRequest(newParams);
	}
};

ZmMailMsg._handleResponseFetchMsg =
function(callback, result) {
	if (callback) {
		callback.run(result);
	}
};

// Public methods

ZmMailMsg.prototype.toString =
function() {
	return "ZmMailMsg";
};

// Getters

/**
* Returns a vector of addresses of the given type
*
* @param type			[constant]	an email address type
* @param used			[hash]		array of addresses that have been used. If not null,
*									then this method will omit those addresses from the
* 									returned vector and will populate used with the additional new addresses
* @param addAsContact	[boolean]	true if emails should be converted to ZmContacts
*/
ZmMailMsg.prototype.getAddresses =
function(type, used, addAsContact) {
	if (!used) {
		return this._addrs[type];
	} else {
		var a = this._addrs[type].getArray();
		var addrs = [];
		for (var i = 0; i < a.length; i++) {
			var addr = a[i];
			var email = addr.getAddress();
			if (!used[email]) {
				var contact = addr;
				if (addAsContact) {
					var cl = AjxDispatcher.run("GetContacts");
					contact = cl.getContactByEmail(email);
					if (contact == null) {
						contact = new ZmContact(null);
						contact.initFromEmail(addr);
					}
				}
				addrs.push(contact);
			}
			used[email] = true;
		}
		return AjxVector.fromArray(addrs);
	}
};

/**
* Returns a Reply-To address if there is one, otherwise the From address
* unless this message was sent by the user, in which case, it is the To
* field (but only in the case of Reply All). A list is returned, since
* theoretically From and Reply To can have multiple addresses.
*/
ZmMailMsg.prototype.getReplyAddresses =
function(mode, aliases) {

	// reply-to has precedence over everything else
	var addrVec = this._addrs[AjxEmailAddress.REPLY_TO];
	if (!addrVec && this.isInvite() && this.needsRsvp()) {
		var invEmail = this.invite.getOrganizerEmail(0);
		if (invEmail) {
			return AjxVector.fromArray([new AjxEmailAddress(invEmail)]);
		}
	}

	if (!(addrVec && addrVec.size())) {
		if (mode == ZmOperation.REPLY_CANCEL || (this.isSent && mode == ZmOperation.REPLY_ALL)) {
			addrVec = this.isInvite() ? this._getAttendees() : this._addrs[AjxEmailAddress.TO];
		} else {
			addrVec = this._addrs[AjxEmailAddress.FROM];
			if (aliases) {
				var from = addrVec.get(0);
				// make sure we're not replying to ourself
				if (from && aliases[from.address]) {
					addrVec = this._addrs[AjxEmailAddress.TO];
				}
			}
		}
	}
	return addrVec;
};

ZmMailMsg.prototype._getAttendees =
function() {
	var attendees = this.invite.components[0].at;
	var emails = new AjxVector();
	for (var i = 0; i < attendees.length; i++) {
		var at = attendees[i];
		emails.add(new AjxEmailAddress(at.a, null, null, at.d));
	}

	return emails;
};

/**
* Returns the first address in the vector of addresses of the given type
*/
ZmMailMsg.prototype.getAddress =
function(type) {
	return this._addrs[type].get(0);
};

/**
* Returns the fragment. If maxLen is given, will truncate fragment to maxLen and add ellipsis
*/
ZmMailMsg.prototype.getFragment =
function(maxLen) {
	var frag = this.fragment;

	if (maxLen && frag && frag.length) {
		frag = frag.substring(0, maxLen);
		if (this.fragment.length > maxLen)
			frag += "...";
	}
	return frag;
};

ZmMailMsg.prototype.isReadOnly =
function() {
	if (!this._isReadOnly) {
		var folder = appCtxt.getById(this.folderId);
		this._isReadOnly = (folder ? folder.isReadOnly() : false);
	}
	return this._isReadOnly;
};

ZmMailMsg.prototype.getHeaderStr =
function(hdr) {
	if (hdr == ZmMailMsg.HDR_DATE) {
		if (this.sentDate) {
			var formatter = AjxDateFormat.getDateTimeInstance(AjxDateFormat.FULL, AjxDateFormat.MEDIUM);
			return (ZmMailMsg.HDR_KEY[hdr] + ": " + formatter.format(new Date(this.sentDate)));
		}
		return "";
	} else if (hdr == ZmMailMsg.HDR_SUBJECT) {
		return this.subject ? (ZmMailMsg.HDR_KEY[hdr] + ": " + this.subject) : "";
	} else {
		var addrs = this.getAddresses(hdr);
		var addrStr = addrs.toString(", ", true);
		if (addrStr) {
			return (ZmMailMsg.HDR_KEY[hdr] + ": " + addrStr);
		}
	}
};

/**
* Returns true if this message has html parts
*/
ZmMailMsg.prototype.isHtmlMail =
function() {
	return this.getBodyPart(ZmMimeTable.TEXT_HTML) != null;
};

// Setters

/**
* Sets the vector of addresses of the given type to the given vector of addresses
*
* @param type	the address type
* @param addrs	a vector of addresses
*/
ZmMailMsg.prototype.setAddresses =
function(type, addrs) {
	this._onChange("address", type, addrs);
	this._addrs[type] = addrs;
};

/**
* Sets the vector of addresses of the given type to the address given
*
* @param type	the address type
* @param addr	an address
*/
ZmMailMsg.prototype.setAddress =
function(type, addr) {
	this._onChange("address", type, addr);
	this._addrs[type].removeAll();
	this._addrs[type] = new AjxVector();
	this._addrs[type].add(addr);
};

/**
 * Clears out all the address vectors.
 */
ZmMailMsg.prototype.clearAddresses =
function() {
	for (var i = 0; i < ZmMailMsg.ADDRS.length; i++) {
		var type = ZmMailMsg.ADDRS[i];
		this._addrs[type].removeAll();
	}
};

/**
* Adds the given vector of addresses to the vector of addresses of the given type
*
* @param type	the address type
* @param addrs	a vector of addresses
*/
ZmMailMsg.prototype.addAddresses =
function(type, addrs) {
	var size = addrs.size();
	for (var i = 0; i < size; i++) {
		this._addrs[type].add(addrs.get(i));
	}
};

/**
* Adds the given address to the vector of addresses of the given type
*
* @param addr	an address
*/
ZmMailMsg.prototype.addAddress =
function(addr) {
	var type = addr.type || AjxEmailAddress.TO;
	this._addrs[type].add(addr);
};

/**
* Sets the subject
*
* @param	subject
*/
ZmMailMsg.prototype.setSubject =
function(subject) {
	this._onChange("subject", subject);
	this.subject = subject;
};

/**
* Sets the message's top part to the given MIME part
*
* @param part	a MIME part
*/
ZmMailMsg.prototype.setTopPart =
function(part) {
	this._onChange("topPart", part);
	this._topPart = part;
};

/**
 * Note: It's assumed by other parts of the code that this._bodyParts
 * is an array of the node properties of ZmMimePart, <em>not</em> the
 * ZmMimePart objects themselves. Therefore, the caller must pass in
 * an array like [ part.node, ... ].
 */
ZmMailMsg.prototype.setBodyParts =
function(parts) {
	this._onChange("bodyParts", parts);
	this._bodyParts = parts;
};

/**
* Sets the ID of any attachments which have already been uploaded.
*
* @param id		an attachment ID
*/
ZmMailMsg.prototype.addAttachmentId =
function(id) {
	if (this.attId) {
		id = this.attId + "," + id;
	}
	this._onChange("attachmentId", id);
	this.attId = id;
};

ZmMailMsg.prototype.addInlineAttachmentId =
function (cid,aid,part) {
	if (!this._inlineAtts) {
		this._inlineAtts = [];
	}
	this._onChange("inlineAttachments",aid);
	if (aid) {
		this._inlineAtts.push({"cid":cid,"aid":aid});
	} else if (part) {
		this._inlineAtts.push({"cid":cid,"part":part});
	}
};

ZmMailMsg.prototype.addInlineDocAttachmentId =
function (cid,docId,part) {
	if (!this._inlineDocAtts) {
		this._inlineDocAtts = [];
	}
	this._onChange("inlineAttachments",docId);
	if (docId) {
		this._inlineDocAtts.push({"cid":cid,"docid":docId});
	} else if (part) {
		this._inlineDocAtts.push({"cid":cid,"part":part});
	}
};

ZmMailMsg.prototype.setInlineAttachments =
function(inlineAtts){
	if (inlineAtts) {
		this._inlineAtts = inlineAtts;
	}
};

ZmMailMsg.prototype.getInlineAttachments =
function() {
	return this._inlineAtts;
};

ZmMailMsg.prototype.getInlineDocAttachments =
function() {
	return this._inlineDocAtts;
};

/**
 * Looks through this msg's attachments for one with the given CID.
 */
ZmMailMsg.prototype.findInlineAtt =
function(cid) {
	if (!(this.attachments && this.attachments.length)) { return null; }

	for (var i = 0; i < this.attachments.length; i++) {
		if (this.attachments[i].ci == cid) {
			return this.attachments[i];
		}
	}
	return null;
};

/**
* Sets the IDs of messages to attach (as a forward)
*
* @param ids	[Array]		list of mail message IDs
*/
ZmMailMsg.prototype.setMessageAttachmentId =
function(ids) {
	this._onChange("messageAttachmentId", ids);
	this._msgAttIds = ids;
};

/**
* Sets the IDs of docs to attach 
*
* @param ids	[Array]		list of document IDs
*/

ZmMailMsg.prototype.setDocumentAttachmentId =
function(ids) {
	this._onChange("documentAttachmentId", ids);
	this._docAttIds = ids;
};

ZmMailMsg.prototype.addDocumentAttachmentId =
function(id) {
	if(!this._docAttIds) {
		this._docAttIds = [];
	}
	this._docAttIds.push(id);
};

/**
* Sets the list of attachment (message part) IDs to be forwarded
*
* @param ids	[Array]		list of attachment IDs
*/
ZmMailMsg.prototype.setForwardAttIds =
function(ids) {
	this._onChange("forwardAttIds", ids);
	this._forAttIds = ids;
};

// Actions

/**
 * Fills in the message from the given message node. Whatever attributes and child nodes
 * are available will be used. The message node is not always fully populated, since it
 * may have been created as part of getting a conversation.
 *
 * @param node		a message node
 * @param args		hash of input args
 */
ZmMailMsg.createFromDom =
function(node, args) {
	var msg = new ZmMailMsg(node.id, args.list);
	msg._loadFromDom(node);
	return msg;
};

/**
 * Gets the full message object from the back end based on the current message ID, and
 * fills in the message.
 *
 * @param params		[hash]				hash of params:
 *        getHtml		[boolean]*			if true, try to fetch html from the server
 *        markRead		[boolean]*			if true, mark msg read
 *        forceLoad		[boolean]*			if true, get msg from server
 *        callback		[AjxCallback]*		async callback
 *        errorCallback	[AjxCallback]*		async error callback
 *        noBusyOverlay	[boolean]*			don't put up busy overlay during request
 *        noTruncate	[boolean]*			don't set max limit on size of msg body
 *        batchCmd		[ZmBatchCommand]*	if set, request gets added to this batch command
 */
ZmMailMsg.prototype.load =
function(params) {
	// If we are already loaded, then don't bother loading
	if (!this._loaded || params.forceLoad) {
		var respCallback = new AjxCallback(this, this._handleResponseLoad, [params, params.callback]);
		params.getHtml = (params.getHtml == undefined) ? appCtxt.get(ZmSetting.VIEW_AS_HTML) : params.getHtml;
		params.sender = appCtxt.getAppController();
		params.msgId = this.id;
		params.callback = respCallback;
		ZmMailMsg.fetchMsg(params);
	} else {
		this._markReadLocal(true);
		if (params.callback) {
			params.callback.run(new ZmCsfeResult()); // return exceptionless result
		}
	}
};

ZmMailMsg.prototype._handleResponseLoad =
function(params, callback, result) {
	var response = result.getResponse().GetMsgResponse;

	this.clearAddresses();

	// clear all participants (since it'll get re-parsed w/ diff. ID's)
	if (this.participants) {
		this.participants.removeAll();
	}

	// clear all attachments
	this.attachments.length = 0;

	this._loadFromDom(response.m[0]);
	if (!this.isReadOnly() && params.markRead) {
		this._markReadLocal(true);
	}

	// return result so callers can check for exceptions if they want
	if (this._loadCallback) {
		// overriding callback (see ZmMsgController::show)
		this._loadCallback.run(result);
		this._loadCallback = null;
	} else if (callback) {
		callback.run(result);
	}
};

ZmMailMsg.prototype.getBodyParts =
function() {
	return this._bodyParts;
};

/**
* @param contentType	[String]	either "text/plain" or "text/html"
* @param useOriginal	[Boolean]*	dont grab the copy w/ the images defanged
*									(only applies when contentType is "text/html")
*/
ZmMailMsg.prototype.getBodyPart =
function(contentType, useOriginal) {

	if (contentType == ZmMimeTable.TEXT_HTML && !useOriginal &&
		this._htmlBody && this._htmlBody.length > 0)
	{
		return this._htmlBody;
	}
	else
	{
		// return the first body part if content type was not specified,
		// otherwise, search for the first body part that matches the given ct.
		for (var i = 0; i < this._bodyParts.length; i++) {
			if (contentType) {
				if (this._bodyParts[i].ct == contentType)
					return this._bodyParts[i];
			} else {
				return this._bodyParts[i];
			}
		}
	}
};

ZmMailMsg.prototype.getBodyContent =
function() {
	if (this._loaded) {
		var bodyPart = this.getBodyPart();
		return bodyPart ? bodyPart.content : null;
	}

	return null;
};

ZmMailMsg.prototype.getTextPart =
function(callback) {
	var bodyPart = this.getBodyPart();

	if (bodyPart && bodyPart.ct == ZmMimeTable.TEXT_PLAIN) {
		return bodyPart.content;
	} else if (bodyPart && bodyPart.ct != ZmMimeTable.TEXT_PLAIN && bodyPart.ct != ZmMimeTable.TEXT_HTML) {
		// looks like the body of this message is the attachment itself
		return "";
	} else {
		// bug fix #19275 - if loaded and not viewing as HTML then assume no text part exists
		if (this._loaded && !appCtxt.get(ZmSetting.VIEW_AS_HTML)) {
			if (callback) callback.run();
		} else {
			var respCallback = new AjxCallback(this, this._handleResponseGetTextPart, [callback]);
			ZmMailMsg.fetchMsg({sender:appCtxt.getAppController(), msgId:this.id, getHtml:false, callback:respCallback});
		}
	}
};

ZmMailMsg.prototype._handleResponseGetTextPart =
function(callback, result) {
	var response = result.getResponse().GetMsgResponse;
	this._loadFromDom(response.m[0]);
	var bodyPart = this.getBodyPart(ZmMimeTable.TEXT_PLAIN);
	result.set(bodyPart ? bodyPart.content : null);
	if (callback) callback.run(result, bodyPart.truncated);
};

ZmMailMsg.prototype.setHtmlContent =
function(content) {
	this._onChange("htmlContent", content);
	this._htmlBody = content;
};

ZmMailMsg.prototype.sendInviteReply =
function(edited, componentId, callback, errorCallback, instanceDate, accountName, ignoreNotifyDlg) {
	this._origMsg = this._origMsg || this;

	return this._sendInviteReply(edited, componentId || 0, callback, errorCallback, instanceDate, accountName, ignoreNotifyDlg);
};

ZmMailMsg.prototype._sendInviteReply =
function(edited, componentId, callback, errorCallback, instanceDate, accountName, ignoreNotifyDlg) {
	var jsonObj = {SendInviteReplyRequest:{_jsns:"urn:zimbraMail"}};
	var request = jsonObj.SendInviteReplyRequest;

	request.id = this._origMsg.id;
	request.compNum = componentId;

	var verb = "ACCEPT";
    var needsRsvp = true;
    
    switch (this.inviteMode) {
        case ZmOperation.REPLY_ACCEPT_IGNORE:    needsRsvp = false;
        case ZmOperation.REPLY_ACCEPT_NOTIFY:
        case ZmOperation.REPLY_ACCEPT:           verb = "ACCEPT"; break;

        case ZmOperation.REPLY_DECLINE_IGNORE:   needsRsvp = false;
        case ZmOperation.REPLY_DECLINE_NOTIFY:
        case ZmOperation.REPLY_DECLINE:          verb = "DECLINE"; break;

        case ZmOperation.REPLY_TENTATIVE_IGNORE: needsRsvp = false;
        case ZmOperation.REPLY_TENTATIVE_NOTIFY:
        case ZmOperation.REPLY_TENTATIVE:        verb = "TENTATIVE"; break;

        case ZmOperation.REPLY_NEW_TIME: 	     verb = "DELEGATED"; break; // XXX: WRONG MAPPING!
    }
    request.verb = verb;

	var inv = this._origMsg.invite;
	if (this.getAddress(AjxEmailAddress.TO) == null && !inv.isOrganizer()) {
		var to = inv.getSentBy() || inv.getOrganizerEmail();
        if(to == null) {
            var ac = window.parentAppCtxt || window.appCtxt;
            var mainAcct = ac.getMainAccount().getEmail();
            var from = this._origMsg.getAddresses(AjxEmailAddress.FROM).get(0);
            //bug: 33639 when organizer component is missing from invitation
            if (from && from.address != mainAcct) {
                to = from.address;
            }
        }
		this.setAddress(AjxEmailAddress.TO, (new AjxEmailAddress(to)));
	}

    if(!ZmMailListController.REPLY_ACTION_MAP[this.inviteMode]) {
        needsRsvp = this._origMsg.needsRsvp();        
    }
    return this._sendInviteReplyContinue(jsonObj, needsRsvp ? "TRUE" : "FALSE", edited, callback, errorCallback, instanceDate, accountName);
};

ZmMailMsg.prototype._sendInviteReplyContinue =
function(jsonObj, updateOrganizer, edited, callback, errorCallback, instanceDate, accountName) {

	var request = jsonObj.SendInviteReplyRequest;
	request.updateOrganizer = updateOrganizer;

	if (instanceDate) {
		var serverDateTime = AjxDateUtil.getServerDateTime(instanceDate);
		var timeZone = AjxTimezone.getServerId(AjxTimezone.DEFAULT);
		var clientId = AjxTimezone.getClientId(timeZone);
		ZmTimezone.set(request, clientId, null, true);
		request.exceptId = {d:serverDateTime, tz:timeZone};
	}

	if (edited) {
		this._createMessageNode(request, null, accountName);
	}

	var respCallback = new AjxCallback(this, this._handleResponseSendInviteReply, [callback]);
	var resp = this._sendMessage({ jsonObj:jsonObj,
								isInvite:true,
								isDraft:false,
								callback:respCallback,
								errorCallback:errorCallback,
								accountName:accountName });
	if (window.parentController) {
		window.close();
	}
	return resp;
};

ZmMailMsg.prototype._handleResponseSendInviteReply =
function(callback, result) {
	var resp = result.getResponse();

	var id = resp.id ? resp.id.split("-")[0] : null;
	var statusOK = (id || resp.status == "OK");

	if (statusOK) {
		this._notifySendListeners();
		this._origMsg.folderId = ZmFolder.ID_TRASH;
	}

	if (callback) {
		callback.run(result);
	}
};

/**
 * Sends the message out into the world.
 *
 * @param isDraft				[Boolean]*		is this a draft we're saving?
 * @param callback				[AjxCallback]*	callback to trigger after send
 * @param errorCallback			[AjxCallback]*	error callback to trigger
 * @param accountName			[String]*		account to send on behalf of
 * @param noSave				[Boolean]*		if set, a copy will *not* be saved to sent regardless of account/identity settings
 * @param requestReadReceipt	[Boolean]*		if set, a read receipt is sent to *all* recipients
 */
ZmMailMsg.prototype.send =
function(isDraft, callback, errorCallback, accountName, noSave, requestReadReceipt) {
	var aName = accountName;
	if (!aName) {
		// only set the account name if this *isnt* the main/parent account
		var acct = appCtxt.getActiveAccount();
		if (acct && !acct.isMain) {
			aName = acct.name;
		}
	}

	// if we have an invite reply, we have to send a different message
	if (this.isInviteReply && !isDraft) {
		return this.sendInviteReply(true, 0, callback, errorCallback, this._instanceDate, aName, true);
	} else {
		var jsonObj, request;
		if (isDraft) {
			jsonObj = {SaveDraftRequest:{_jsns:"urn:zimbraMail"}};
			request = jsonObj.SaveDraftRequest;
		} else {
			jsonObj = {SendMsgRequest:{_jsns:"urn:zimbraMail"}};
			request = jsonObj.SendMsgRequest;
			if (this.sendUID) {
				request.suid = this.sendUID;
			}
		}
		if (noSave) {
			request.noSave = 1;
		}
		this._createMessageNode(request, isDraft, aName, requestReadReceipt);

		var params = {
			jsonObj: jsonObj,
			isInvite: false,
			isDraft: isDraft,
			accountName: aName,
			callback: (new AjxCallback(this, this._handleResponseSend, [isDraft, callback])),
			errorCallback: errorCallback
		};
		return this._sendMessage(params);
	}
};

ZmMailMsg.prototype._handleResponseSend =
function(isDraft, callback, result) {
	var resp = result.getResponse().m[0];

	// notify listeners of successful send message
	if (!isDraft) {
		if (resp.id || !appCtxt.get(ZmSetting.SAVE_TO_SENT)) {
			this._notifySendListeners();
		}
	} else {
		this._loadFromDom(resp);
	}

	if (callback) {
		callback.run(result);
	}
};

ZmMailMsg.prototype._createMessageNode =
function(request, isDraft, accountName, requestReadReceipt) {

	var msgNode = request.m = {};

	// if origId is given, means we're saving a draft or sending a msg that was
	// originally a reply/forward
	if (this.origId) {
		msgNode.origid = this.origId;
	}

	// if id is given, means we are re-saving a draft
	var oboDraftMsgId = null;   //On Behalf of Draft MsgId
	if ((isDraft || this.isDraft) && this.id) {
		var ac = window.parentAppCtxt || window.appCtxt;
		// bug fix #26508 - check whether previously saved draft was moved to Trash
		var msg = ac.getById(this.id);
		var folder = msg ? ac.getById(msg.folderId) : null;
		if (!folder || (folder && !folder.isInTrash())) {
			if (!ac.isOffline && !isDraft && this._origMsg && this._origMsg.isDraft) {
				var mainAcct = ac.getMainAccount(true);
				var from = this._origMsg.getAddresses(AjxEmailAddress.FROM).get(0);
				// this means we're sending a draft msg obo
				if (from && from.address != mainAcct.getEmail()) {
					oboDraftMsgId = [mainAcct.id, ":", this.id].join("");
					msgNode.id = oboDraftMsgId;
				} else {
					msgNode.id = this.nId;
				}
			} else {
				msgNode.id = this.nId;
			}
		}
	}

	if (this.isForwarded) {
		msgNode.rt = "w";
	} else if (this.isReplied) {
		msgNode.rt = "r";
	}
	if (this.identity) {
		msgNode.idnt = this.identity.id;
	}

	if (this.isHighPriority) {
		msgNode.f = ZmItem.FLAG_HIGH_PRIORITY;
	} else if (this.isLowPriority) {
		msgNode.f = ZmItem.FLAG_LOW_PRIORITY;
	}

	var addrNodes = msgNode.e = [];
	for (var i = 0; i < ZmMailMsg.COMPOSE_ADDRS.length; i++) {
		var type = ZmMailMsg.COMPOSE_ADDRS[i];
		this._addAddressNodes(addrNodes, type, isDraft);
	}
	this._addFrom(addrNodes, msgNode, isDraft, accountName);
	this._addReplyTo(addrNodes);
	if (requestReadReceipt) {
		this._addReadReceipt(addrNodes, accountName);
	}

	msgNode.su = {_content:this.subject};

	var topNode = {ct:this._topPart.getContentType()};
	msgNode.mp = [topNode];

	// if the top part has sub parts, add them as children
	var numSubParts = this._topPart.children ? this._topPart.children.size() : 0;
	if (numSubParts > 0) {
		var partNodes = topNode.mp = [];
		for (var i = 0; i < numSubParts; i++) {
			var part = this._topPart.children.get(i);
			var content = part.getContent();
			var numSubSubParts = part.children ? part.children.size() : 0;
			if (content == null && numSubSubParts == 0) { continue; }

			var partNode = {ct:part.getContentType()};

			if (numSubSubParts > 0) {
				// If each part again has subparts, add them as children
				var subPartNodes = partNode.mp = [];
				for (var j = 0; j < numSubSubParts; j++) {
					var subPart = part.children.get(j);
					subPartNodes.push({ct:subPart.getContentType(), content:{_content:subPart.getContent()}});
				}
				// Handle Related SubPart , a specific condition
				if (part.getContentType() == ZmMimeTable.MULTI_RELATED) {
					// Handle Inline Attachments
					var inlineAtts = this.getInlineAttachments() || [];
					if (inlineAtts.length) {
						for (j = 0; j < inlineAtts.length; j++) {
							var inlineAttNode = {ci:inlineAtts[j].cid};
							var attachNode = inlineAttNode.attach = {};
							if (inlineAtts[j].aid) {
								attachNode.aid = inlineAtts[j].aid;
							} else {
								var id = (isDraft || this.isDraft)
									? (oboDraftMsgId || this.id || this.origId)
									: (this.origId || this.id);
								attachNode.mp = [{mid:id, part:inlineAtts[j].part}];
							}
							subPartNodes.push(inlineAttNode);
						}
					}
					// Handle Inline Attachments
					var inlineDocAtts = this.getInlineDocAttachments() || [];
					if (inlineDocAtts.length) {
						for (j = 0; j < inlineDocAtts.length; j++) {
							var inlineDocAttNode = {ci:inlineDocAtts[j].cid};
							var attachNode = inlineDocAttNode.attach = {};
							if (inlineDocAtts[j].docid) {
								attachNode.doc = [{id: inlineDocAtts[j].docid}];
							} 
							subPartNodes.push(inlineDocAttNode);
						}
					}
				}
			} else {
				partNode.content = {_content:content};
			}
			partNodes.push(partNode);
		}
	} else {
		topNode.content = {_content:this._topPart.getContent()};
	}

	if (this.irtMessageId) {
		msgNode.irt = {_content:this.irtMessageId};
	}

	if (this.attId ||
		(this._msgAttIds && this._msgAttIds.length) ||
		(this._docAttIds && this._docAttIds.length) ||
		(this._forAttIds && this._forAttIds.length))
	{
		var attachNode = msgNode.attach = {};
		if (this.attId) {
			attachNode.aid = this.attId;
		}

		// attach mail msgs
		if (this._msgAttIds && this._msgAttIds.length) {
			var msgs = attachNode.m = [];
			for (var i = 0; i < this._msgAttIds.length; i++) {
				msgs.push({id:this._msgAttIds[i]});
			}
		}


		// attach docs
		if (this._docAttIds) {
			var docs = attachNode.doc = [];
			for (var i = 0; i < this._docAttIds.length; i++) {
				docs.push({id:this._docAttIds[i]});
			}
		}

		// attach msg attachments
		if (this._forAttIds && this._forAttIds.length) {
			var attIds = this._forAttIds;
			if (attIds && attIds.length) {
				var parts = attachNode.mp = [];
	            for (var i = 0; i < attIds.length; i++) {
					// XXX: this looks hacky but we cant send a null ID to the server!
					var id = (isDraft || this.isDraft) ? (oboDraftMsgId || this.id || this.origId) : (this.origId || this.id);
					if (!id && this._origMsg) {
						id = this._origMsg.id;
					}

					// bug fix #33312 - should be reverted(?) once bug #33691 is fixed. 
					if (appCtxt.multiAccounts && !appCtxt.getActiveAccount().isMain &&
						(isDraft || this.isDraft))
					{
						id = ZmOrganizer.getSystemId(id, appCtxt.getMainAccount(), true);
					}

					parts.push({mid:id, part:attIds[i]});
				}
			}
		}
    }
};

/**
 * Sends this message to its recipients.
 *
 * @param params				[hash]			hash of params:
 *        jsonObj				[object]		JSON object
 *        isInvite				[boolean]		true if this message is an invite
 *        isDraft				[boolean]		true if this message is a draft
 *        callback				[AjxCallback]	async callback
 *        errorCallback			[AjxCallback]	async error callback
 */
ZmMailMsg.prototype._sendMessage =
function(params) {
	var respCallback = new AjxCallback(this, this._handleResponseSendMessage, [params]);

	// bug fix #4325 - its safer to make sync request when dealing w/ new window
	if (window.parentController) {
		var newParams = {
			jsonObj: params.jsonObj,
			accountName: params.accountName,
			errorCallback: params.errorCallback
		};
		var resp = appCtxt.getAppController().sendRequest(newParams);
		if (!resp) { return; } // bug fix #9154

		if (resp.SendInviteReplyResponse) {
			return resp.SendInviteReplyResponse;
		} else if (resp.SaveDraftResponse) {
			resp = resp.SaveDraftResponse;
			this._loadFromDom(resp.m[0]);
			return resp;
		} else if (resp.SendMsgResponse) {
			return resp.SendMsgResponse;
		}
	} else {
		appCtxt.getAppController().sendRequest({jsonObj:params.jsonObj,
												asyncMode:true,
												callback:respCallback,
												errorCallback:params.errorCallback,
												accountName:params.accountName });
	}
};

ZmMailMsg.prototype._handleResponseSendMessage =
function(params, result) {
	var response = result.getResponse();
	if (params.isInvite) {
		result.set(response.SendInviteReplyResponse);
	} else if (params.isDraft) {
		result.set(response.SaveDraftResponse);
	} else {
		result.set(response.SendMsgResponse);
	}
	if (params.callback) {
		params.callback.run(result);
	}
};

ZmMailMsg.prototype._notifySendListeners =
function() {
	var flag;
	if (this.isForwarded) {
		flag = ZmItem.FLAG_FORWARDED;
	} else if (this.isReplied) {
		flag = ZmItem.FLAG_REPLIED;
	}

	if (flag && this._origMsg) {
		this._origMsg[ZmItem.FLAG_PROP[flag]] = true;
		if (this._origMsg.list) {
			this._origMsg.list._notify(ZmEvent.E_FLAGS, {items: [this._origMsg], flags: [flag]});
		}
	}
};

ZmMailMsg.prototype.isRealAttachment =
function(attachment) {
	var type = attachment.ct;

	// bug fix #6374 - ignore if attachment is body unless content type is message/rfc822
	if (ZmMimeTable.isIgnored(type))
		return false;

	// bug fix #8751 - dont ignore text/calendar type if msg is not an invite
	if (type == ZmMimeTable.TEXT_CAL && appCtxt.get(ZmSetting.CALENDAR_ENABLED) && this.isInvite())
		return false;

	return true;
};

// this is a helper method to get an attachment url for multipart/related content
ZmMailMsg.prototype.getContentPartAttachUrl =
function(contentPartType, contentPart) {
	if (this.attachments && this.attachments.length > 0 &&
		(contentPartType == ZmMailMsg.CONTENT_PART_ID ||
		 contentPartType == ZmMailMsg.CONTENT_PART_LOCATION))
	{
		for (var i = 0; i < this.attachments.length; i++) {
			var attach = this.attachments[i];
			if (attach[contentPartType] == contentPart) {
				return [appCtxt.get(ZmSetting.CSFE_MSG_FETCHER_URI), "&id=", this.id, "&part=", attach.part].join("");
			}
		}
	}
	return null;
};

/**
 * Returns an array of objects containing meta info about attachments to be used
 * to build href's by the caller
*/
ZmMailMsg.prototype.getAttachmentLinks =
function(findHits, includeInlineImages, includeInlineAtts) {
	this._attLinks = [];

	var attachments = this.attachments;

	if (includeInlineAtts) {
		var parts = this.getBodyParts();
		if (parts && parts.length > 1) {
			var iAtts = [], part;
			for (var k = 0; k < parts.length; k++) {
				part = parts[k];
				if (part.filename && part.cd == "inline") {
					iAtts.push(part);
				}
			}
			attachments = [].concat(attachments, iAtts);
		}
	}

	if (attachments && attachments.length > 0) {

		var hrefRoot = appCtxt.get(ZmSetting.CSFE_MSG_FETCHER_URI) + "&loc=" + AjxEnv.DEFAULT_LOCALE + "&id=" + this.id + "&part=";

		for (var i = 0; i < attachments.length; i++) {
			var attach = attachments[i];

			if (!this.isRealAttachment(attach) || (attach.ct.match(/^image/) && attach.ci && !includeInlineImages) || (attach.cd == "inline" && attach.filename && ZmMimeTable.isRenderable(attach.ct) && !includeInlineAtts)) {
				continue;
			}

			var props = {};

			// set a viable label for this attachment
			props.label = attach.name || attach.filename || (ZmMsg.unknown + " <" + attach.ct + ">");

			// use content location instead of built href flag
			var useCL = false;
			// set size info in any
			if (attach.s != null && attach.s >= 0) {
				if (attach.s < 1024)		props.size = attach.s + " "+ZmMsg.b;//" B";
				else if (attach.s < (1024*1024) )	props.size = Math.round((attach.s / 1024) * 10) / 10 + " "+ZmMsg.kb;//" KB";
				else						props.size = Math.round((attach.s / (1024*1024)) * 10) / 10 + " "+ZmMsg.mb;//" MB";
			} else {
				useCL = attach.cl && (attach.relativeCl || ZmMailMsg.URL_RE.test(attach.cl));
			}

			// handle rfc/822 attachments differently
			if (attach.ct == ZmMimeTable.MSG_RFC822) {
				var html = [];
				var j = 0;
				html[j++] = "<a href='javascript:;' onclick='ZmMailMsgView.rfc822Callback(";
				html[j++] = '"';
				html[j++] = this.id;
				html[j++] = '"';
				html[j++] = ",\"";
				html[j++] = attach.part;
				html[j++] = "\"); return false;' class='AttLink'>";
				props.link = html.join("");
			} else {
				// set the anchor html for the link to this attachment on the server
				var url = useCL ? attach.cl : (hrefRoot + attach.part);

				// bug fix #6500 - append filename w/in so "Save As" wont append .html at the end
				if (!useCL) {
					var insertIdx = url.indexOf("?auth=co&");
					var fn = AjxStringUtil.urlComponentEncode(attach.filename);
					fn = fn.replace(/\x27/g, "%27");
					url = url.substring(0,insertIdx) + fn + url.substring(insertIdx);
				}

				props.link = "<a target='_blank' class='AttLink' href='" + url + "'>";
				if (!useCL) {
					props.download = [
							"<a style='text-decoration:underline' class='AttLink' href='",
							url,
							appCtxt.get(ZmSetting.ATTACHMENTS_BLOCKED)
							? "' target='_blank'>"
							: "&disp=a' onclick='ZmZimbraMail.unloadHackCallback();'>"
					].join("");
				}

				var folder = appCtxt.getById(this.folderId);
				if ((attach.name || attach.filename) &&
					appCtxt.get(ZmSetting.BRIEFCASE_ENABLED) &&
					(folder && !folder.isRemote()))
				{
					var partLabel = props.label;
					partLabel = partLabel.replace(/\x27/g,"\\'");
					var onclickStr1 = "ZmMailMsgView.briefcaseCallback(\"" + this.id + "\",\"" + attach.part + "\",\""+partLabel+"\");";
					props.briefcaseLink = "<a style='text-decoration:underline' class='AttLink' href='javascript:;' onclick='" + onclickStr1 + "'>";
				}

				if (!useCL) {
					// check for vcard *first* since we dont care to view it in HTML
					if (attach.ct == ZmMimeTable.TEXT_VCARD ||
						attach.ct == ZmMimeTable.TEXT_DIRECTORY)
					{
						var onclickStr = "ZmMailMsgView.vcardCallback(" + "\"" + this.id + "\"" +  ",\"" + attach.part + "\");";
						props.vcardLink = "<a style='text-decoration:underline' class='AttLink' href='javascript:;' onclick='" + onclickStr + "'>";
					}
					else if (ZmMimeTable.hasHtmlVersion(attach.ct) &&
							 appCtxt.get(ZmSetting.VIEW_ATTACHMENT_AS_HTML))
					{
						// set the anchor html for the HTML version of this attachment on the server
						props.htmlLink = "<a style='text-decoration:underline' target='_blank' class='AttLink' href='" + url + "&view=html" + "'>";
					}
					else
					{
						// set the objectify flag
						props.objectify = attach.ct && attach.ct.match(/^image/);
					}
				} else {
					props.url = url;
				}
			}

			// set the link icon
			var mimeInfo = ZmMimeTable.getInfo(attach.ct);
			props.linkIcon = mimeInfo ? mimeInfo.image : "GenericDoc";
			props.ct = attach.ct;

			// set other meta info
			props.isHit = findHits && this._isAttInHitList(attach);
			props.part = attach.part;
			if (!useCL)
				props.url = appCtxt.get(ZmSetting.CSFE_MSG_FETCHER_URI) + "&loc=" + AjxEnv.DEFAULT_LOCALE + "&id=" + this.id + "&part=" + attach.part;

			if(attach.ci || (includeInlineImages && attach.cd == "inline")){ // bug: 28741
				props.ci = true;
			}

			props.foundInMsgBody = attach.foundInMsgBody;

			// and finally, add to attLink array
			this._attLinks.push(props);
		}
	}

	return this._attLinks;
};


// Private methods

// Processes a message node, getting attributes and child nodes to fill in the message.
ZmMailMsg.prototype._loadFromDom =
function(msgNode) {
	// this method could potentially be called twice (SearchConvResponse and
	// GetMsgResponse) so always check param before setting!
	if (msgNode.id)		{ this.id = msgNode.id; }
	if (msgNode.cid) 	{ this.cid = msgNode.cid; }
	if (msgNode.s) 		{ this.size = msgNode.s; }
	if (msgNode.d) 		{ this.date = msgNode.d; }
	if (msgNode.sd) 	{ this.sentDate = msgNode.sd; }
	if (msgNode.l) 		{ this.folderId = msgNode.l; }
	if (msgNode.t) 		{ this._parseTags(msgNode.t); }
	if (msgNode.cm) 	{ this.inHitList = msgNode.cm; }
	if (msgNode.su) 	{ this.subject = msgNode.su; }
	if (msgNode.fr) 	{ this.fragment = msgNode.fr; }
	if (msgNode.rt) 	{ this.rt = msgNode.rt; }
	if (msgNode.idnt)	{ this.identity = appCtxt.getIdentityCollection().getById(msgNode.idnt); }
	if (msgNode.origid) { this.origId = msgNode.origid; }
	if (msgNode.hp) 	{ this._attHitList = msgNode.hp; }
	if (msgNode.mid)	{ this.messageId = msgNode.mid; }
	if (msgNode._attrs) { this.attrs = msgNode._attrs; }
	if (msgNode.sf) 	{ this.sf = msgNode.sf; }
    if (msgNode.cif) 	{ this.cif = msgNode.cif; }

	//Copying msg. header's
	if (msgNode.header) {
		this.headers = {};
		for (var i = 0; i < msgNode.header.length; i++) {
			this.headers[msgNode.header[i].n] = msgNode.header[i]._content;
		}
	}

	// set the "normalized" Id if this message belongs to a shared folder
	var idx = this.id.indexOf(":");
	this.nId = (idx != -1) ? (this.id.substr(idx + 1)) : this.id;

	if (msgNode._convCreateNode) {
		this._convCreateNode = msgNode._convCreateNode;
	}

	if (msgNode.cid && msgNode.l) {
		var conv = appCtxt.getById(msgNode.cid);
		if (conv) {
			// update conv's folder list
			conv.folders[msgNode.l] = true;
			// update msg list if none exists since we know this conv has at least one msg
			if (!conv.msgIds) {
				conv.msgIds = [this.id];
			}
		}
	}

	// always call parseFlags even if server didnt return any
	this._parseFlags(msgNode.f);

	if (msgNode.mp) {
		var params = {attachments: this.attachments, bodyParts: this._bodyParts};
		this._topPart = ZmMimePart.createFromDom(msgNode.mp, params);
		this._loaded = this._bodyParts.length > 0 || this.attachments.length > 0;
	}

	if (msgNode.shr) {
		// TODO: Make server output better msgNode.shr property...
		var shareXmlDoc = AjxXmlDoc.createFromXml(msgNode.shr[0].content);
		try {
			AjxDispatcher.require("Share");
			this.share = ZmShare.createFromDom(shareXmlDoc.getDoc());
			this.share._msgId = msgNode.id;
		} catch (ex) {
			// not a version we support, ignore
		}
	}

	if (msgNode.e && this.participants && this.participants.size() == 0) {
		for (var i = 0; i < msgNode.e.length; i++) {
			this._parseParticipantNode(msgNode.e[i]);
		}
		this.clearAddresses();
		var parts = this.participants.getArray();
		for (var j = 0; j < parts.length; j++ ) {
			this.addAddress(parts[j]);
		}
	}

	if (msgNode.inv) {
		try {
			this.invite = ZmInvite.createFromDom(msgNode.inv);
			this.invite.setMessageId(this.id);
			// bug fix #18613
			var desc = this.invite.getComponentDescription();
			var descHtml = this.invite.getComponentDescriptionHtml();
            if(descHtml) {
                this.setHtmlContent(descHtml);
            }
            if (desc && this._bodyParts.length == 0) {
                var textPart = { ct:ZmMimeTable.TEXT_PLAIN, s:desc.length, content:desc };
                this._bodyParts.push(textPart);
            }
			if (!appCtxt.get(ZmSetting.CALENDAR_ENABLED) &&
				this.invite.type == "appt")
			{
				this.flagLocal(ZmItem.FLAG_ATTACH, true);
			}
		} catch (ex) {
			// do nothing - this means we're trying to load an ZmInvite in new
			// window, which we dont currently load (re: support).
		}
	}
};

ZmMailMsg.prototype.isInvite =
function () {
	return (this.invite != null);
};

ZmMailMsg.prototype.needsRsvp =
function () {
	if (!this.isInvite() || this.invite.isOrganizer()) { return false; }

	var needsRsvp = false;
	var accEmail = appCtxt.getActiveAccount().getEmail();
	if (this.isInvite()) {
		var at = this.invite.getAttendees();
		for (var i in at) {
			if (at[i].url == accEmail) {
				return at[i].rsvp;
			}
			if (at[i].rsvp) {
				needsRsvp = true;
			}
		}
		at = this.invite.getResources();
		for (var i in at) {
			if (at[i].url == accEmail) {
				return at[i].rsvp;
			}
			if (at[i].rsvp) {
				needsRsvp = true;
			}
		}
	}

	return needsRsvp;
};

// Adds child address nodes for the given address type.
ZmMailMsg.prototype._addAddressNodes =
function(addrNodes, type, isDraft) {
	var addrs = this._addrs[type];
	var num = addrs.size();
	if (num) {
		var contactsApp = appCtxt.getApp(ZmApp.CONTACTS);
		for (var i = 0; i < num; i++) {
			var addr = addrs.get(i);
			var email = addr.getAddress();
			var name = addr.getName();
			var addrNode = {t:AjxEmailAddress.toSoapType[type], a:email};
			if (name) {
				addrNode.p = name;
			}
			addrNodes.push(addrNode);
		}
	}
};

ZmMailMsg.prototype._addFrom =
function(addrNodes, parentNode, isDraft, accountName) {
	var ac = window.parentAppCtxt || window.appCtxt;

	// only use account name if we either dont have any identities to choose
	// from or the one we have is the default anyway
	if (accountName && (!this.identity || (this.identity && this.identity.isDefault))) {
		// when saving a draft, even if obo, we do it on the main account so reset the from
		if (isDraft) {
			var folder = appCtxt.getById(this.folderId);
			if (folder && folder.isRemote()) {
				accountName = folder.getOwner();
			}
		}

		var mainAcct = ac.getMainAccount().getEmail();
		if (this._origMsg && this._origMsg.isDraft) {
			var from = this._origMsg.getAddresses(AjxEmailAddress.FROM).get(0);
			// this means we're sending a draft msg obo so reset account name
			if (from && from.address != mainAcct) {
				accountName = from.address;
			}
		}

		var addr = this.identity ? this.identity.sendFromAddress : accountName;
		var node = {t:"f", a:addr};
		var displayName = this.identity ? this.identity.sendFromDisplay : null;
		if (displayName) {
			node.p = displayName;
		}
		addrNodes.push(node);

		if (!ac.isOffline && !isDraft) {
			// the main account is *always* the sender
			addrNodes.push({t:"s", a:mainAcct});
		}
	} else if (this.identity) {
		var addrNode = {t:"f"};

		// bug fix #20630 - handling sending drafts obo
		if (this._origMsg && this._origMsg.isDraft && !this._origMsg.sendAsMe) {
			var mainAcct = ac.getMainAccount().getEmail();
			var from = this._origMsg.getAddresses(AjxEmailAddress.FROM).get(0);
			// this means we're sending a draft msg obo
			if (from && from.address != mainAcct) {
				addrNode.a = from.address;
				addrNodes.push(addrNode);
				// if sending obo, always set sender as main account
				if (!isDraft) {
					addrNodes.push({t:"s", a:mainAcct});
				}
				parentNode.e = addrNodes;
				return;
			}
		}

		addrNode.a = this.identity.sendFromAddress;
		var name = this.identity.sendFromDisplay;
		if (name) {
			addrNode.p = name;
		}
		addrNodes.push(addrNode);
	}
};

ZmMailMsg.prototype._addReplyTo =
function(addrNodes) {
	if (this.identity) {
		if (this.identity.setReplyTo && this.identity.setReplyToAddress) {
			var addrNode = {t:"r", a:this.identity.setReplyToAddress};
			if (this.identity.setReplyToDisplay) {
				addrNode.p = this.identity.setReplyToDisplay;
			}
			addrNodes.push(addrNode);
		}
	}
};

ZmMailMsg.prototype._addReadReceipt =
function(addrNodes, accountName) {
	var addrNode = {t:"n"};
	if (this.identity) {
		addrNode.a = this.identity.readReceiptAddr || this.identity.sendFromAddress;
		addrNode.p = this.identity.sendFromDisplay;
	} else {
		addrNode.a = accountName || appCtxt.getActiveAccount().getEmail();
	}
	addrNodes.push(addrNode);
};

ZmMailMsg.prototype._isAttInHitList =
function(attach) {
	for (var i = 0; i < this._attHitList.length; i++) {
		if (attach.part == this._attHitList[i].part) { return true; }
	}

	return false;
};

ZmMailMsg.prototype._onChange =
function(what, a, b, c) {
	if (this.onChange && this.onChange instanceof AjxCallback) {
		this.onChange.run(what, a, b, c);
	}
};

ZmMailMsg.prototype.getStatusIcon =
function() {
	var imageInfo;
	if (this.isInvite() && appCtxt.get(ZmSetting.CALENDAR_ENABLED))		{ imageInfo = "Appointment"; }
	else if (this.isDraft)		{ imageInfo = "MsgStatusDraft"; }
	else if (this.isReplied)	{ imageInfo = "MsgStatusReply"; }
	else if (this.isForwarded)	{ imageInfo = "MsgStatusForward"; }
	else if (this.isSent)		{ imageInfo = "MsgStatusSent"; }
	else						{ imageInfo = this.isUnread ? "MsgStatusUnread" : "MsgStatusRead"; }

	return imageInfo;
};

ZmMailMsg.prototype.notifyModify =
function(obj) {
	if (obj.cid != null) {
		this.cid = obj.cid;
	}

	ZmMailItem.prototype.notifyModify.apply(this, arguments);
};

ZmMailMsg.prototype.isResourceInvite =
function() {
  if(!this.cif || !this.invite) return false;
  var resources = this.invite.getResources();
  for(var i in resources) {
      if(resources[i] && resources[i].url == this.cif) {
          return true;
      }
  }
    return false;
};