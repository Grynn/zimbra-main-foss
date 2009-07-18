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
 * Creates a new compose view. The view does not display itself on construction.
 * @constructor
 * @class
 * This class provides a form for composing a message.
 *
 * @author Conrad Damon
 * @param parent		[DwtControl]		the element that created this view
 * @param controller	[ZmController]		controller managing this view
 * @param composeMode 	[constant]			passed in so detached window knows which mode to be in on startup
 */
ZmComposeView = function(parent, controller, composeMode) {

	this.TEMPLATE = "mail.Message#Compose";
	this._view = ZmId.VIEW_COMPOSE + controller.sessionId;
	this._sessionId = controller.sessionId;

	DwtComposite.call(this, {parent:parent, className:"ZmComposeView", posStyle:Dwt.ABSOLUTE_STYLE,
							 id:ZmId.getViewId(this._view)});

	ZmComposeView.ADDR_SETTING[AjxEmailAddress.BCC]	= ZmSetting.SHOW_BCC;

	ZmComposeView.NOTIFY_ACTION_MAP = {};
	ZmComposeView.NOTIFY_ACTION_MAP[ZmOperation.REPLY_ACCEPT]		= ZmOperation.REPLY_ACCEPT_NOTIFY;
	ZmComposeView.NOTIFY_ACTION_MAP[ZmOperation.REPLY_DECLINE]		= ZmOperation.REPLY_DECLINE_NOTIFY;
	ZmComposeView.NOTIFY_ACTION_MAP[ZmOperation.REPLY_TENTATIVE]	= ZmOperation.REPLY_TENTATIVE_NOTIFY;

	this._onMsgDataChange = new AjxCallback(this, this._onMsgDataChange);

	this._controller = controller;
	this._contactPickerEnabled = appCtxt.get(ZmSetting.CONTACTS_ENABLED) ||
								 appCtxt.get(ZmSetting.GAL_ENABLED);
	this._initialize(composeMode);

	// make sure no unnecessary scrollbars show up
	this.getHtmlElement().style.overflow = "hidden";
};

ZmComposeView.prototype = new DwtComposite;
ZmComposeView.prototype.constructor = ZmComposeView;

ZmComposeView.prototype.toString =
function() {
	return "ZmComposeView";
};

//
// Constants
//

// Consts related to compose fields
ZmComposeView.QUOTED_HDRS = [
		ZmMailMsg.HDR_FROM,
		ZmMailMsg.HDR_TO,
		ZmMailMsg.HDR_CC,
		ZmMailMsg.HDR_DATE,
		ZmMailMsg.HDR_SUBJECT
];

ZmComposeView.BAD						= "_bad_addrs_";

// Message dialog placement
ZmComposeView.DIALOG_X 					= 50;
ZmComposeView.DIALOG_Y 					= 100;

// Attachment related
ZmComposeView.UPLOAD_FIELD_NAME			= "attUpload";
ZmComposeView.FORWARD_ATT_NAME			= "ZmComposeView_forAttName";
ZmComposeView.FORWARD_MSG_NAME			= "ZmComposeView_forMsgName";

// max # of attachments to show
ZmComposeView.SHOW_MAX_ATTACHMENTS		= AjxEnv.is800x600orLower ? 2 : 3;
ZmComposeView.MAX_ATTACHMENT_HEIGHT 	= (ZmComposeView.SHOW_MAX_ATTACHMENTS * 23) + "px";

// Reply/forward stuff
ZmComposeView.EMPTY_FORM_RE				= /^[\s\|]*$/;
ZmComposeView.SUBJ_PREFIX_RE			= new RegExp("^\\s*(Re|Fw|Fwd|" + ZmMsg.re + "|" + ZmMsg.fwd + "|" + ZmMsg.fw + "):" + "\\s*", "i");
ZmComposeView.QUOTED_CONTENT_RE			= new RegExp("^----- ", "m");
ZmComposeView.HTML_QUOTED_CONTENT_RE	= new RegExp("<br>----- ", "i");
ZmComposeView.ADDR_SETTING				= {}; // XXX: may not be necessary anymore?
ZmComposeView.WRAP_LENGTH				= 72;

ZmComposeView.OP = {};
ZmComposeView.OP[AjxEmailAddress.TO]	= ZmId.CMP_TO;
ZmComposeView.OP[AjxEmailAddress.CC]	= ZmId.CMP_CC;
ZmComposeView.OP[AjxEmailAddress.BCC]	= ZmId.CMP_BCC;


// Public methods

/**
* Sets the current view, based on the given action. The compose form is
* created and laid out and everything is set up for interaction with the user.
*
* @param action				[constant]		new message, reply, forward, or an invite action
* @param identity			[ZmIdentity]	the identity sending the message
* @param msg				[ZmMailMsg]*	the original message (reply/forward), or address (new message)
* @param toOverride			[string]*		initial value for To: field
* @param subjOverride		[string]*		initial value for Subject: field
* @param extraBodyText		[string]*		canned text to prepend to body (invites)
* @param msgIds				[Array]*		list of msg Id's to be added as attachments
* @param identity			[ZmIdentity]*	identity to use for this compose
* @param accountName		[string]*		on-behalf-of From address
*/
ZmComposeView.prototype.set =
function(params) {
	var action = this._action = params.action;
	if (this._msg) {
		this._msg.onChange = null;
	}
    this._acceptFolderId = params.acceptFolderId;
	var obo = params.accountName;
	var msg = this._msg = this._addressesMsg = params.msg;
	if (msg) {
		msg.onChange = this._onMsgDataChange;
		var folder = (!obo) ? appCtxt.getById(msg.folderId) : null;
		obo = (folder && folder.isRemote()) ? folder.getOwner() : null;

		// check if this is a draft that was originally composed obo
		if (!obo && msg.isDraft && !appCtxt.isFamilyMbox) {
			var ac = window.parentAppCtxt || window.appCtxt;
			var mainAcct = (ac.isOffline)
				? ac.getActiveAccount().name : ac.getMainAccount().getEmail();
			var from = msg.getAddresses(AjxEmailAddress.FROM).get(0);
			if (from && from.address != mainAcct) {
				obo = from.address;
			}
		}
	}

	// list of msg Id's to add as attachments
	this._msgIds = params.msgIds;

	this.reset(true);

	if (params.identity && this.identitySelect) {
		this.identitySelect.setSelectedValue(params.identity.id);
		if (appCtxt.get(ZmSetting.SIGNATURES_ENABLED)) {
			this._controller.setSelectedSignature(params.identity.signature || "");
		}
	}

	// reset To/Cc/Bcc fields
	this._showAddressField(AjxEmailAddress.TO, true, true, true);
	this._showAddressField(AjxEmailAddress.CC, true, true, true);
	//Set BCC Field to Default
	this._toggleBccField(null, appCtxt.get(ZmSetting.SHOW_BCC));

	// populate fields based on the action and user prefs
	this._setAddresses(action, AjxEmailAddress.TO, params.toOverride);
	if (params.ccOverride) this._setAddresses(action, AjxEmailAddress.CC, params.ccOverride);
	if (params.bccOverride) this._setAddresses(action, AjxEmailAddress.BCC, params.bccOverride);
	if (obo) {
		this._setObo(obo);
	}
	this._setSubject(action, msg, params.subjOverride);
	this._setBody(action, msg, params.extraBodyText);

	if (appCtxt.get(ZmSetting.MAIL_PRIORITY_ENABLED)) {
		var priority = "";
		if (msg && (action == ZmOperation.DRAFT)) {
			if (msg.isHighPriority) {
				priority = ZmItem.FLAG_HIGH_PRIORITY;
			} else if (msg.isLowPriority) {
				priority = ZmItem.FLAG_LOW_PRIORITY;
			}
		}
		this._setPriority(priority);
	}

	this.getHtmlEditor().moveCaretToTop();

	if (action != ZmOperation.FORWARD_ATT) {
		// save extra mime parts
		var bodyParts = msg ? msg.getBodyParts() : [];
		for (var i = 0; i < bodyParts.length; i++) {
			var bodyPart = bodyParts[i];
			var contentType = bodyPart.ct;

			if (contentType == ZmMimeTable.TEXT_PLAIN) continue;
			if (contentType == ZmMimeTable.TEXT_HTML) continue;
			if (ZmMimeTable.isRenderableImage(contentType) && bodyPart.cd == "inline") continue; // bug: 28741

			var mimePart = new ZmMimePart();
			mimePart.setContentType(contentType);
			mimePart.setContent(bodyPart.content);
			this.addMimePart(mimePart);
		}
	}

	// save form state (to check for change later)
	if (this._composeMode == DwtHtmlEditor.HTML) {
		var ta = new AjxTimedAction(this, this._setFormValue);
		AjxTimedAction.scheduleAction(ta, 10);
	} else {
		this._setFormValue();
	}
};

/**
* Called automatically by the attached ZmMailMsg object when data is
* changed, in order to support Zimlets modify subject or other values
* (bug: 10540)
*/
ZmComposeView.prototype._onMsgDataChange =
function(what, val) {
	if (what == "subject") {
		this._subjectField.value = val;
		this.updateTabTitle();
	}
};

ZmComposeView.prototype.getComposeMode =
function() {
	return this._composeMode;
};

ZmComposeView.prototype.getController =
function() {
	return this._controller;
};

ZmComposeView.prototype.getHtmlEditor =
function() {
	return this._htmlEditor;
};

ZmComposeView.prototype.getTitle =
function() {
	var text;
	if (this._action == ZmOperation.REPLY)
		text = ZmMsg.reply;
	else if (this._action == ZmOperation.FORWARD_INLINE || this._action == ZmOperation.FORWARD_ATT)
		text = ZmMsg.forward;
	else
		text = ZmMsg.compose;
	return [ZmMsg.zimbraTitle, text].join(": ");
};

// returns the field values for each of the addr fields
ZmComposeView.prototype.getRawAddrFields =
function() {
	var addrs = {};
	for (var i = 0; i < ZmMailMsg.COMPOSE_ADDRS.length; i++) {
		var type = ZmMailMsg.COMPOSE_ADDRS[i];
		if (this._using[type]) {
			addrs[type] = this._field[type].value;
		}
	}
	return addrs;
};

// returns address fields that are currently visible
ZmComposeView.prototype.getAddrFields =
function() {
	var addrs = [];
	for (var i = 0; i < ZmMailMsg.COMPOSE_ADDRS.length; i++) {
		var type = ZmMailMsg.COMPOSE_ADDRS[i];
		if (this._using[type]) {
			addrs.push(this._field[type]);
		}
	}
	return addrs;
};

// returns list of attachment field values (used by detachCompose)
ZmComposeView.prototype.getAttFieldValues =
function() {
	var attList = [];
	var atts = document.getElementsByName(ZmComposeView.UPLOAD_FIELD_NAME);

	for (var i = 0; i < atts.length; i++)
		attList.push(atts[i].value);

	return attList;
};

ZmComposeView.prototype.setBackupForm =
function() {
	this.backupForm = this._backupForm();
};

/**
* Saves *ALL* form value data to test against whether user made any changes
* since canceling SendMsgRequest. If user attempts to send again, we compare
* form data with this value and if not equal, send a new UID otherwise, re-use.
*/
ZmComposeView.prototype._backupForm =
function() {
	var val = this._formValue(true, true);

	// keep track of attachments as well
	var atts = document.getElementsByName(ZmComposeView.UPLOAD_FIELD_NAME);
	for (var i = 0; i < atts.length; i++) {
		if (atts[i].value.length) {
			val += atts[i].value;
		}
	}

	// keep track of "uploaded" attachments as well :/
	val += this._getForwardAttIds(ZmComposeView.FORWARD_ATT_NAME+this._sessionId).join("");
	val += this._getForwardAttIds(ZmComposeView.FORWARD_MSG_NAME+this._sessionId).join("");

	return val;
};

ZmComposeView.prototype._isInline =
function() {
	if (this._attachDialog) {
		return this._attachDialog.isInline();
	}

	if (this._msg && this._msgAttId && this._msg.id == this._msgAttId) {
		return false;
	}

	if (this._msg && this._msg.attachments) {
		var atts = this._msg.attachments;
		for (var i = 0; i < atts.length; i++) {
			if (atts[i].ci) {
				return true;
			}
		}
	}    

	return false;
};

ZmComposeView.prototype._handleInlineAtts =
function(msg, handleInlineDocs){

	var handled = false, ci, cid, dfsrc, inlineAtt;

	var idoc = this._htmlEditor._getIframeDoc();
	var images = idoc.getElementsByTagName("img");
	for (var i = 0; i < images.length; i++) {
		dfsrc = images[i].getAttribute("dfsrc") || images[i].src;
		if (dfsrc) {
            if (dfsrc.substring(0,4) == "cid:") {
                cid = dfsrc.substring(4);
                var docpath = images[i].getAttribute("doc");
                if(docpath){
                    msg.addInlineDocAttachment(cid, null, docpath);                    
                    handled = true;
                }else{
                    ci = "<" + cid + ">";
                    inlineAtt = msg.findInlineAtt(ci);
                    if (!inlineAtt && this._msg) {
                        inlineAtt = this._msg.findInlineAtt(ci);
                    }
                    if (inlineAtt) {
                        msg.addInlineAttachmentId(cid, null, inlineAtt.part);
                        handled = true;
                    }
                }
            }
		}
	}

	return handled;
};

ZmComposeView.prototype._mergeInlineAndForwardAtts =
function(msg, forwardAttIds) {

	var newFwdAttIds = [];
	var atts = this._msg.attachments;

	function checkFwdAttExists(part) {
		for (var j = 0; j < forwardAttIds.length; j++) {
			if(forwardAttIds[j] == part){
				return true;
			}
		}
		return false;
	}

	for (var i = 0; i < atts.length; i++) {
		var att = atts[i];
		if (att.ci && !checkFwdAttExists(att.part)) {
			newFwdAttIds.push(att.part);
		}
	}

	return [].concat(forwardAttIds, newFwdAttIds);
};

/**
* Returns the message from the form, after some basic input validation.
*/
ZmComposeView.prototype.getMsg =
function(attId, isDraft) {
	// Check destination addresses.
	var addrs = this._collectAddrs();

	// Any addresses at all provided? If not, bail.
	if (!isDraft && !addrs.gotAddress) {
		this.enableInputs(false);
		var msgDialog = appCtxt.getMsgDialog();
		msgDialog.setMessage(ZmMsg.noAddresses, DwtMessageDialog.CRITICAL_STYLE);
		msgDialog.popup(this._getDialogXY());
		msgDialog.registerCallback(DwtDialog.OK_BUTTON, this._okCallback, this);
		this.enableInputs(true);
		return;
	}

	var cd = appCtxt.getOkCancelMsgDialog();
	cd.reset();

	// Is there a subject? If not, ask the user if they want to send anyway.
	var subject = AjxStringUtil.trim(this._subjectField.value);
	if (!isDraft && subject.length == 0 && !this._noSubjectOkay) {
		this.enableInputs(false);
		cd.setMessage(ZmMsg.compSubjectMissing, DwtMessageDialog.WARNING_STYLE);
		cd.registerCallback(DwtDialog.OK_BUTTON, this._noSubjectOkCallback, this, cd);
		cd.registerCallback(DwtDialog.CANCEL_BUTTON, this._noSubjectCancelCallback, this, cd);
		cd.popup(this._getDialogXY());
		return;
	}

	// Any bad addresses?  If there are bad ones, ask the user if they want to send anyway.
	if (!isDraft && addrs[ZmComposeView.BAD].size() && !this._badAddrsOkay) {
		this.enableInputs(false);
		var bad = AjxStringUtil.htmlEncode(addrs[ZmComposeView.BAD].toString(AjxEmailAddress.SEPARATOR));
		var msg = AjxMessageFormat.format(ZmMsg.compBadAddresses, bad);
		cd.setMessage(msg, DwtMessageDialog.WARNING_STYLE);
		cd.registerCallback(DwtDialog.OK_BUTTON, this._badAddrsOkCallback, this, cd);
		cd.registerCallback(DwtDialog.CANCEL_BUTTON, this._badAddrsCancelCallback, this, [addrs.badType, cd]);
		cd.setVisible(true); // per fix for bug 3209
		cd.popup(this._getDialogXY());
		return;
	} else {
		this._badAddrsOkay = false;
	}

	// Mandatory Spell Check
	if (!isDraft && appCtxt.get(ZmSetting.SPELL_CHECK_ENABLED) && 
	    appCtxt.get(ZmSetting.MAIL_MANDATORY_SPELLCHECK) && !this._spellCheckOkay) {
		if (this._htmlEditor.checkMisspelledWords(new AjxCallback(this, this._spellCheckShield))) {
			return;
		}
	} else {
		this._spellCheckOkay = false;
	}

	// Create Msg Object
	var msg = new ZmMailMsg();
	msg.setSubject(subject);

	var zeroSizedAttachments = false;
	// handle Inline Attachments
	if (this._attachDialog && this._attachDialog.isInline() && attId) {
		for (var i = 0; i < attId.length; i++) {
			var att = attId[i];
			if (att.s == 0) {
				zeroSizedAttachments = true;
				continue;
			}
			var contentType = att.ct;
			if (contentType && contentType.indexOf("image") != -1) {
				var cid = Dwt.getNextId();
				this._htmlEditor.insertImage("cid:" + cid, AjxEnv.isIE);
				msg.addInlineAttachmentId(cid, att.aid);
			} else {
				msg.addAttachmentId(att.aid);
			}
		}
	} else if (attId && typeof attId != "string") {
		for (var i = 0; i < attId.length; i++) {
			if (attId[i].s == 0) {
				zeroSizedAttachments = true;
				continue;
			}
			msg.addAttachmentId(attId[i].aid);
		}
	} else if (attId) {
		msg.addAttachmentId(attId);
	}

	if (zeroSizedAttachments){
		appCtxt.setStatusMsg(ZmMsg.zeroSizedAtts);
	}

	// check if this is a resend
	if (this.sendUID && this.backupForm) {
		// if so, check if user changed anything since canceling the send
		if (isDraft || this._backupForm() != this.backupForm) {
			this.sendUID = (new Date()).getTime();
		}
	} else {
		this.sendUID = (new Date()).getTime();
	}

	// get list of message part id's for any forwarded attachements
	var forwardAttIds = this._getForwardAttIds(ZmComposeView.FORWARD_ATT_NAME+this._sessionId);
	var forwardMsgIds = this._getForwardAttIds(ZmComposeView.FORWARD_MSG_NAME+this._sessionId);

	// --------------------------------------------
	// Passed validation checks, message ok to send
	// --------------------------------------------

	// set up message parts as necessary
	var top = new ZmMimePart();

	if (this._composeMode == DwtHtmlEditor.HTML) {
		top.setContentType(ZmMimeTable.MULTI_ALT);

		// create two more mp's for text and html content types
		var textPart = new ZmMimePart();
		textPart.setContentType(ZmMimeTable.TEXT_PLAIN);
		textPart.setContent(this._htmlEditor.getTextVersion());
		top.children.add(textPart);

		var htmlPart = new ZmMimePart();
		htmlPart.setContentType(ZmMimeTable.TEXT_HTML);        

		var idoc = this._htmlEditor._getIframeDoc();
		this._restoreMultipartRelatedImages(idoc);
		if (!isDraft) {
			this._cleanupSignatureIds(idoc);
		}
		var defangedContent = this._htmlEditor.getContent(true);

		// Bug 27422 - Firefox and Safari implementation of execCommand("bold")
		// etc use styles, and some email clients (Entourage) don't process the
		// styles and the text remains plain. So we post-process and convert
		// those to the tags (which are what the IE version of execCommand() does).
		if (AjxEnv.isFirefox) {
			defangedContent = defangedContent.replace(/<span style="font-weight: bold;">(.+?)<\/span>/, "<strong>$1</strong>");
			defangedContent = defangedContent.replace(/<span style="font-style: italic;">(.+?)<\/span>/, "<em>$1</em>");
			defangedContent = defangedContent.replace(/<span style="text-decoration: underline;">(.+?)<\/span>/, "<u>$1</u>");
			defangedContent = defangedContent.replace(/<span style="text-decoration: line-through;">(.+?)<\/span>/, "<strike>$1</strike>");
		} else if (AjxEnv.isSafari) {
			defangedContent = defangedContent.replace(/<span class="Apple-style-span" style="font-weight: bold;">(.+?)<\/span>/, "<strong>$1</strong>");
			defangedContent = defangedContent.replace(/<span class="Apple-style-span" style="font-style: italic;">(.+?)<\/span>/, "<em>$1</em>");
			defangedContent = defangedContent.replace(/<span class="Apple-style-span" style="text-decoration: underline;">(.+?)<\/span>/, "<u>$1</u>");
			defangedContent = defangedContent.replace(/<span class="Apple-style-span" style="text-decoration: line-through;">(.+?)<\/span>/, "<strike>$1</strike>");
		}

		htmlPart.setContent(defangedContent);

		this._handleInlineAtts(msg, true); // Better Code
		var inlineAtts = msg.getInlineAttachments();
		var inlineDocAtts = msg.getInlineDocAttachments();
		var iAtts = [].concat(inlineAtts, inlineDocAtts);
		if ( iAtts &&  iAtts.length > 0 ) {
			var relatedPart = new ZmMimePart();
			relatedPart.setContentType(ZmMimeTable.MULTI_RELATED);
			relatedPart.children.add(htmlPart);
			top.children.add(relatedPart);
		} else {
			top.children.add(htmlPart);
		}
	}
	else {
		var inline = this._isInline();

		var textPart = (this._extraParts || inline) ? new ZmMimePart() : top;
		textPart.setContentType(ZmMimeTable.TEXT_PLAIN);
		textPart.setContent(this._htmlEditor.getContent());

		if (inline) {
			top.setContentType(ZmMimeTable.MULTI_ALT);
			var relatedPart = new ZmMimePart();
			relatedPart.setContentType(ZmMimeTable.MULTI_RELATED);
			relatedPart.children.add(textPart);
			top.children.add(relatedPart);

			forwardAttIds = this._mergeInlineAndForwardAtts(msg, forwardAttIds);
		} else {
			if (this._extraParts) {
				top.setContentType(ZmMimeTable.MULTI_ALT);
				top.children.add(textPart);
			}
		}
	}

	// add extra message parts
	if (this._extraParts) {
		for (var i = 0; i < this._extraParts.length; i++) {
			var mimePart = this._extraParts[i];
			top.children.add(mimePart);
		}
	}

	//store text-content of the current email
	if(this._composeMode == DwtHtmlEditor.HTML){
		msg.textBodyContent = this._htmlEditor.getTextVersion();
	} else {
		msg.textBodyContent = this._htmlEditor.getContent();
	}

	msg.setTopPart(top);
	msg.setSubject(subject);
	msg.setForwardAttIds(forwardAttIds);
	for (var i = 0; i < ZmMailMsg.COMPOSE_ADDRS.length; i++) {
		var type = ZmMailMsg.COMPOSE_ADDRS[i];
		if (addrs[type] && addrs[type].all.size() > 0) {
			msg.setAddresses(type, addrs[type].all);
		}
	}
	msg.identity = this.getIdentity();
	msg.sendUID = this.sendUID;

	// save a reference to the original message
	msg._origMsg = this._msg;
	if (this._msg && this._msg._instanceDate) {
		msg._instanceDate = this._msg._instanceDate;
	}

	if (this._action != ZmOperation.NEW_MESSAGE && this._msg && !this._msgIds) {
		var isInviteReply = this._isInviteReply(this._action);
		if (this._action == ZmOperation.DRAFT) {
			msg.isReplied = (this._msg.rt == "r");
			msg.isForwarded = (this._msg.rt == "w");
			msg.isDraft = this._msg.isDraft;
			// check if we're resaving a draft that was originally a reply/forward
			if (msg.isDraft) {
				// if so, set both origId and the draft id
				msg.origId = msg.isReplied || msg.isForwarded ? this._msg.origId : null;
				msg.id = this._msg.id;
				msg.nId = this._msg.nId;
			}
		} else {
			msg.isReplied = (this._action == ZmOperation.REPLY || this._action == ZmOperation.REPLY_ALL || isInviteReply);
			msg.isForwarded = (this._action == ZmOperation.FORWARD_INLINE || this._action == ZmOperation.FORWARD_ATT);
			msg.origId = this._msg.id;
		}
		msg.isInviteReply = isInviteReply;
		msg.acceptFolderId = this._acceptFolderId;
        var inviteMode = ZmComposeView.NOTIFY_ACTION_MAP[this._action] ? ZmComposeView.NOTIFY_ACTION_MAP[this._action] : this._action;
		msg.inviteMode = isInviteReply ? inviteMode : null;
		msg.irtMessageId = this._msg.messageId;
		msg.folderId = this._msg.folderId;
	}

	// replied/forw msg or draft shouldn't have att ID (a repl/forw voicemail mail msg may)
	if (this._msg && this._msg.attId) {
		msg.addAttachmentId(this._msg.attId);
	}

	if (this._msgAttId) {
		if (forwardMsgIds.length > 0) {
			// Check if the MsgId is already present in the fwdMsgIds list.
			var i = 0;
			while (forwardMsgIds[i] && forwardMsgIds[i] != this._msgAttId) {
				i++;
			}
			if (i == forwardMsgIds.length) {
				forwardMsgIds.push(this._msgAttId);
			}
			delete i;
		} else {
			forwardMsgIds.push(this._msgAttId);
		}
	}

	msg.setMessageAttachmentId(forwardMsgIds);

	var priority = this._getPriority();
	if (priority) {
		msg.flagLocal(priority, true);
	}

	if (this._fromSelect) {
		msg.offlineFromValue = this._fromSelect.getValue();
	}

	/**
	* finally, check for any errors via zimlets..
	* A Zimlet can listen to emailErrorCheck action to perform further check and
	* alert user about the error just before sending email. We will be showing
	* yes/no dialog. This zimlet must return an object {hasError:<true or false>,
	* errorMsg:<Some Error msg>, zimletName:<zimletName>} e.g: {hasError:true,
	* errorMsg:"you might have forgotten attaching an attachment, do you want to
	* continue?", zimletName:"com_zimbra_attachmentAlert"}
	**/
	if (!isDraft && appCtxt.areZimletsLoaded()) {
		var boolAndErrorMsgArray = [];
		var showErrorDlg = false;
		var errorMsg = "";
		var zimletName = "";
		appCtxt.notifyZimlets("emailErrorCheck", [msg, boolAndErrorMsgArray]);
		var blen =  boolAndErrorMsgArray.length;
		for (var k = 0; k < blen; k++) {
			var obj = boolAndErrorMsgArray[k];
			if (obj == null || obj == undefined) { continue; }

			var hasError =obj.hasError;
			zimletName = obj.zimletName;
			if (Boolean(hasError)) {
				if (this._ignoredZimlets) {
					if (this._ignoredZimlets[zimletName]) { // if we should ignore this zimlet
						delete this._ignoredZimlets[zimletName];
						continue; // skip
					}
				}
				showErrorDlg = true;
				errorMsg = obj.errorMsg;
				break;
			}
		}
		if (showErrorDlg) {
			this.enableInputs(false);
			cd.setMessage(errorMsg, DwtMessageDialog.WARNING_STYLE);
			var params = {errDialog:cd, zimletName:zimletName};
			cd.registerCallback(DwtDialog.OK_BUTTON, this._errViaZimletOkCallback, this, params);
			cd.registerCallback(DwtDialog.CANCEL_BUTTON, this._errViaZimletCancelCallback, this, params);
			cd.popup(this._getDialogXY());
			return;
		}
	}

	return msg;
};

ZmComposeView.prototype.setDocAttachments =
function(msg, docIds) {
	if (!docIds) { return; }

	var zeroSizedAttachments = false;
	var inline = this._isInline();
	for (var i = 0; i < docIds.length; i++) {
		var docAtt = docIds[i];
		var contentType = docAtt.ct;
		if (docAtt.s == 0) {
			zeroSizedAttachments = true;
			continue;
		}
		if (this._attachDialog && inline) {
			if (contentType && contentType.indexOf("image") != -1) {
				var cid = Dwt.getNextId();
				this._htmlEditor.insertImage("cid:" + cid, AjxEnv.isIE);
				msg.addInlineDocAttachment(cid, docAtt.id);
			} else {
				msg.addDocumentAttachmentId(docAtt.id);
			}
		}else {
			msg.addDocumentAttachmentId(docAtt.id);
		}
	}
	if (zeroSizedAttachments){
		appCtxt.setStatusMsg(ZmMsg.zeroSizedAtts);
	}
};

/**
* Sets an address field.
*
* @param type	the address type
* @param addr	the address string
*
* XXX: if addr empty, check if should hide field
*/
ZmComposeView.prototype.setAddress =
function(type, addr) {
	addr = addr ? addr : "";
	if (addr.length && !this._using[type]) {
		this._using[type] = true;
		this._showAddressField(type, true);
	}
	this._field[type].value = addr;

	// Use a timed action so that first time through, addr textarea
	// has been sized by browser based on content before we try to
	// adjust it (bug 20926)
	AjxTimedAction.scheduleAction(new AjxTimedAction(this,
		function() {
			this._adjustAddrHeight(this._field[type]);
		}), 0);
};

// Sets the mode ZmHtmlEditor should be in.
ZmComposeView.prototype.setComposeMode =
function(composeMode) {
	if (composeMode == DwtHtmlEditor.TEXT ||
		(composeMode == DwtHtmlEditor.HTML && appCtxt.get(ZmSetting.HTML_COMPOSE_ENABLED))) {

		var curMember = (this._composeMode == DwtHtmlEditor.TEXT) ? this._bodyField : this._htmlEditor;

		this._composeMode = composeMode;

		this._htmlEditor.setMode(composeMode, true);
		// reset the body field Id and object ref
		this._bodyFieldId = this._htmlEditor.getBodyFieldId();
		this._bodyField = document.getElementById(this._bodyFieldId);
		if (this._bodyField.disabled) {
			this._bodyField.disabled = false;
		}

		// for now, always reset message body size
		this._resetBodySize();
		// recalculate form value since HTML mode inserts HTML tags
		this._origFormValue = this._formValue();

		// swap new body field into tab group
		var newMember = (composeMode == DwtHtmlEditor.TEXT) ? this._bodyField : this._htmlEditor;
		if (curMember && newMember && (curMember != newMember) && this._controller._tabGroup) {
			this._controller._tabGroup.replaceMember(curMember, newMember);
			// focus via replaceMember() doesn't take, try again
			if (composeMode == DwtHtmlEditor.HTML) {
				this._retryHtmlEditorFocus();
			}
		}
	}

	if (this._msg && this._isInline() && composeMode == DwtHtmlEditor.TEXT) {
		this._showForwardField(this._msg, this._action, null, true);
	}
};

ZmComposeView.prototype._retryHtmlEditorFocus =
function() {
	if (this._htmlEditor.hasFocus()) {
		var ta = new AjxTimedAction(this, this._focusHtmlEditor);
		AjxTimedAction.scheduleAction(ta, 10);
	}
};

ZmComposeView.prototype.setDetach =
function(params) {

	this._action = params.action;
	this._msg = params.msg;

	// set the addr fields as populated
	for (var i in params.addrs) {
		this.setAddress(i, params.addrs[i]);
	}

	this._subjectField.value = params.subj || "";
	this.updateTabTitle();

	var content = params.body || "";
	if((content == "") && (this._htmlEditor.getMode() == DwtHtmlEditor.HTML)) {
		content	= "<br>";
	}
	this._htmlEditor.setContent(content);


	if (params.forwardHtml) {
		this._attcDiv.innerHTML = params.forwardHtml;
	}
	if (params.identityId && this.identitySelect) {
		this.identitySelect.setSelectedValue(params.identityId);
	}

	this.backupForm = params.backupForm;
	this.sendUID = params.sendUID;

	// bug 14322 -- in Windows Firefox, DEL/BACKSPACE don't work
	// when composing in new window until we (1) enter some text
	// or (2) resize the window (!).  I chose the latter.
	if (AjxEnv.isGeckoBased && AjxEnv.isWindows) {
		window.resizeBy(1, 1);
	}
};

ZmComposeView.prototype.reEnableDesignMode =
function() {
	if (this._composeMode == DwtHtmlEditor.HTML) {
		this._htmlEditor.reEnableDesignMode();
	}
};

// user just saved draft, update compose view as necessary
ZmComposeView.prototype.processMsgDraft =
function(msgDraft) {
	if (this._isInline()) {
		this._handleInline(msgDraft);
	}
	this.reEnableDesignMode();
	this._action = ZmOperation.DRAFT;
	this._msg = msgDraft;
	this._msgAttId = null;
	// always redo att links since user couldve removed att before saving draft
	this.cleanupAttachments(true);
	this._showForwardField(msgDraft, ZmOperation.DRAFT);
	this._resetBodySize();
	// save form state (to check for change later)
	this._origFormValue = this._formValue();
};

ZmComposeView.prototype._handleInline =
function(msgObj) {
	var msg = (msgObj) ? msgObj : this._msg;
	var iDoc = this._htmlEditor._getIframeDoc();
	return (this._fixMultipartRelatedImages(msg,iDoc));
};

ZmComposeView.prototype._fixMultipartRelatedImages_onTimer =
function(msg) {
	// first time the editor is initialized, idoc.getElementsByTagName("img") is empty
	// Instead of waiting for 500ms, trying to add this callback. Risky but works.
	if (!this._firstTimeFixImages) {
		this._htmlEditor.addOnContentIntializedListener(new AjxCallback(this, this._fixMultipartRelatedImages, [msg, this._htmlEditor._getIframeDoc()]));
	} else {
		this._fixMultipartRelatedImages(msg, this._htmlEditor._getIframeDoc());
	}
};

/**
 * Twiddle the img tags so that the HTML editor can display the images. Instead of
 * a cid (which is relevant only within the MIME msg), point to the img with a URL.
 */
ZmComposeView.prototype._fixMultipartRelatedImages =
function(msg, idoc) {
	if (!this._firstTimeFixImages) {
		this._firstTimeFixImages = true;
		this._htmlEditor.removeOnContentIntializedListener();
	}

	if (!idoc) { return; }

	var images = idoc.getElementsByTagName("img");
	var num = 0;
	for (var i = 0; i < images.length; i++) {
		var dfsrc = images[i].getAttribute("dfsrc") || images[i].src;
		if (dfsrc) {
			if (dfsrc.substring(0,4) == "cid:") {
				num++;
				var cid = "<" + dfsrc.substring(4) + ">";
				var src = msg.getContentPartAttachUrl(ZmMailMsg.CONTENT_PART_ID, cid);
				//Cache cleared, becoz part id's may change.
				src = src + "&t=" + (new Date()).getTime();
				if (src) {
					images[i].src = src;
					images[i].setAttribute("dfsrc", dfsrc);
				}
            } else if (dfsrc.substring(0,4) == "doc:") {
                images[i].src = [appCtxt.get(ZmSetting.REST_URL), ZmFolder.SEP, dfsrc.substring(4)].join('');
			} else if (msg && dfsrc.indexOf("//") == -1) { // check for content-location verison
				var src = msg.getContentPartAttachUrl(ZmMailMsg.CONTENT_PART_LOCATION, dfsrc);
				//Cache cleared, becoz part id's may change.
				if (src) {
					src = src + "&t=" + (new Date()).getTime();
					num++;
					images[i].src = src;
					images[i].setAttribute("dfsrc", dfsrc);
				}
			}
		}
	}
	return (num == images.length);
};

/**
 * Change the src tags on inline img's to point to cid's, which is what we
 * want for an outbound MIME msg.
 */
ZmComposeView.prototype._restoreMultipartRelatedImages =
function(idoc) {
	if (idoc) {
		var images = idoc.getElementsByTagName("img");
		var num = 0;
		for (var i = 0; i < images.length; i++) {
			var img = images[i];
			var cid = "";
			var dfsrc = img.getAttribute("dfsrc");
			if (dfsrc && dfsrc.indexOf("cid:") == 0) {
				cid = dfsrc;
				img.removeAttribute("dfsrc");
			} else if (img.src && img.src.indexOf("cid:") == 0) {
				cid = img.src;
			} else if ( dfsrc && dfsrc.substring(0,4) == "doc:"){
                cid = "cid:"+Dwt.getNextId();
                img.removeAttribute("dfsrc");
                img.setAttribute("doc", dfsrc.substring(4, dfsrc.length));
            }else {
				// If "Display External Images" is false then handle Reply/Forward
				if (dfsrc) img.src = dfsrc;
			}
			if (cid) {
				img.src = cid;
			}
		}
	}
};

ZmComposeView.prototype._cleanupSignatureIds =
function(idoc){
    var signatureId = this._controller._currentSignatureId;
    var signatureEl = idoc.getElementById(signatureId);
    if(signatureEl){
        signatureEl.removeAttribute("id");   
    }
};

ZmComposeView.prototype.showAttachmentDialog =
function() {
	var attachDialog = this._attachDialog = appCtxt.getAttachDialog();
	var callback = new AjxCallback(this, this._attsDoneCallback, [true]);
	attachDialog.setUploadCallback(callback);
	attachDialog.popup();
	attachDialog.enableInlineOption(this._composeMode == DwtHtmlEditor.HTML);
};

/**
* Revert compose view to a clean state (usually called before popping compose view)
*/
ZmComposeView.prototype.reset =
function(bEnableInputs) {
	this.backupForm = null;
	this.sendUID = null;

	// reset autocomplete list
	if (this._acAddrSelectList) {
		this._acAddrSelectList.reset();
		this._acAddrSelectList.show(false);
	}

	// reset To/CC/BCC fields
	for (var i = 0; i < ZmMailMsg.COMPOSE_ADDRS.length; i++) {
		var textarea = this._field[ZmMailMsg.COMPOSE_ADDRS[i]];
		textarea.value = "";
		this._adjustAddrHeight(textarea, true);
	}

	// reset subject / body fields
	this._subjectField.value = "";
	this.updateTabTitle();
	this._htmlEditor.clear();

	// the div that holds the attc.table and null out innerHTML
	this.cleanupAttachments(true);

	this._resetBodySize();

	this._msgAttId = null;
	this._origFormValue = "";

	// reset dirty shields
	this._noSubjectOkay = this._badAddrsOkay = this._spellCheckOkay = false;

	Dwt.setVisible(this._oboRow, false);

	// remove extra mime parts
	this._extraParts = null;

	// enable/disable input fields
	this.enableInputs(bEnableInputs);

	// reset state of the spell check button
	this._controller.toggleSpellCheckButton(false);

	/*
	if (this._accountChanged) {
		this.identitySelect.clearOptions();
		var identityOptions = this._getIdentityOptions();
		for (var i = 0; i < identityOptions.length; i++) {
			this.identitySelect.addOption(identityOptions[i]);
		}

		this._setIdentityVisible();
		this._accountChanged = false;

		// account changed.. so reset the signatures
		this._controller._signatureChangeListener();
	}
	*/

	//reset state of previous Signature cache variable.
	this._previousSignature = null;
	this._previousSignatureMode = null;
};

ZmComposeView.prototype.enableInputs =
function(bEnable) {
	// disable input elements so they dont bleed into top zindex'd view
	for (var i = 0; i < ZmMailMsg.COMPOSE_ADDRS.length; i++) {
		this._field[ZmMailMsg.COMPOSE_ADDRS[i]].disabled = !bEnable;
	}
	this._subjectField.disabled = this._bodyField.disabled = !bEnable;
};

/**
 * Adds an extra MIME part to the message. The extra parts will be
 * added, in order, to the end of the parts after the primary message
 * part.
 */
ZmComposeView.prototype.addMimePart =
function(mimePart) {
	if (!this._extraParts) {
		this._extraParts = [];
	}
	this._extraParts.push(mimePart);
};

ZmComposeView.prototype.getSignatureContentSpan = function(signature, sigContent){
    signature = signature || this.getSignatureById( this._controller.getSelectedSignature() );
    if(!signature){
        return "";
    }
    var signatureId = signature.id;
    sigContent = sigContent || this.getSignatureContent(signatureId);
    if (this.getHtmlEditor().getMode() == DwtHtmlEditor.HTML) {
         sigContent = [
                "<span id='"+signatureId+"'>",
                    sigContent,
                "</span>"
         ].join('');
	}
    
    return sigContent;
};

/**
 * Called when the user selects something from the Signature menu.
 */
ZmComposeView.prototype.applySignature =
function(content, replaceSignatureId){

    content = content || "";
    var signature = this.getSignatureById( this._controller.getSelectedSignature());
    var isHtml = this.getHtmlEditor().getMode() == DwtHtmlEditor.HTML;
    var newLine = this._getSignatureNewLine();
	var isAbove = appCtxt.get(ZmSetting.SIGNATURE_STYLE) == ZmSetting.SIG_OUTLOOK;
    var done = false;
    var donotsetcontent = false;
    var noSignature = !signature;
    

    var sigContent, replaceSignature;


    if(replaceSignatureId){
        //replaceSignature = this.getSignatureById(replaceSignatureId);
        if(isHtml){
            var idoc = this.getHtmlEditor()._getIframeDoc();
            var sigEl = idoc.getElementById(replaceSignatureId);
                             
            if(sigEl){

                if(!noSignature){
                    replaceSignature = sigEl.innerHTML;                    
                    sigContent = this.getSignatureContent(replaceSignatureId);

                    //Replace img tags to handle inline images
                    replaceSignature = replaceSignature.replace(/<img[^>]*>/ig,'<img/>');
                    sigContent = sigContent.replace(/<img[^>]*>/ig, "<img/>");

                    //Remove spaces to make sure IE doesnt screw
                    replaceSignature = replaceSignature.replace(/\s/g,'');
                    sigContent = sigContent.replace(/\s/g,'');

                    //IE style semicolons are messed up
                    if (AjxEnv.isIE) {
                                                
                        replaceSignature = replaceSignature.replace(/;/g,'');
                        sigContent = sigContent.replace(/;/g,'');

                        //innerHTML in IE gives back capital tag names
                        replaceSignature = replaceSignature.toLowerCase();
                        sigContent = sigContent.toLowerCase();
                    }
                    
                    if( sigContent == replaceSignature){
                        sigEl.id = signature.id;
                        sigEl.innerHTML = this.getSignatureContent(signature.id);
                        done = true;
                        donotsetcontent = true;
                    }else{
                        var sigId = "id=\""+replaceSignatureId+"\"";
                        var regexid = new RegExp(sigId, "i");
                        content = content.replace(regexid, '');
                    }

                }else{
                    sigEl.id = "";
                    sigEl.innerHTML = "";
                    done = true;
                    donotsetcontent = true;
                }

            }
        }else{
            //Construct Regex
            replaceSignature = this.getSignatureContent(replaceSignatureId);            
            var replaceRe = "(" + AjxStringUtil.regExEscape(newLine) + ")*" + AjxStringUtil.regExEscape(replaceSignature);
            replaceRe = replaceRe.replace(/(\\n|\\r)/g, "\\s*");
            if (!isAbove) {
                replaceRe += "\\s*(" + AjxStringUtil.regExEscape(newLine) + ")*";
                replaceRe += "$";
            }
            
            replaceRe = new RegExp(replaceRe, "i");

            //Replace Signature
            sigContent = noSignature ? "" : this.getSignatureContent(signature.id);
            content = content.replace(replaceRe, sigContent);
            done = true;

        }
    }
    if(!done) {
       sigContent = this.getSignatureContentSpan(signature);
       content = this._insertSignature(content, appCtxt.get(ZmSetting.SIGNATURE_STYLE), sigContent, newLine);
    }    

    if(!donotsetcontent){
	    this._htmlEditor.setContent(content);
    }
    this._fixMultipartRelatedImages_onTimer(this._msg, this.getHtmlEditor()._getIframeDoc());

	//Caching previous Signature state.
	this._previousSignature = signature;
	this._previousSignatureMode = this._htmlEditor.getMode();
};

ZmComposeView.prototype.getSignatureContent =
function(signatureId) {
	var sig = this._getSignature(signatureId);
	if (!sig) { return ""; }

	var sep = this._getSignatureSeparator();
	var newLine = this._getSignatureNewLine();
	var isAbove = appCtxt.get(ZmSetting.SIGNATURE_STYLE) == ZmSetting.SIG_OUTLOOK;
	var isText = this.getHtmlEditor().getMode() == DwtHtmlEditor.TEXT;
	return isAbove ? [sep, sig/*,  isText ? newLine : ""*/ ].join("") : sep + sig;
};

/**
 * Adds the user's signature to the message body. An "internet" style signature
 * is prefixed by a special line and added to the bottom. An "outlook" style
 * signature is added before quoted content.
 *
 * This method is only used to add an
 *
 * @content 			optional content to use
 */
ZmComposeView.prototype.addSignature =
function(content) {
	// bug fix #6821 - we need to pass in "content" param
	// since HTML composing in new window doesnt guarantee the html editor
	// widget will be initialized when this code is running.
	content = content || "";
    var sigContent = this.getSignatureContentSpan();
	content = this._insertSignature(content, appCtxt.get(ZmSetting.SIGNATURE_STYLE),
									sigContent,
									this._getSignatureNewLine());

	this._htmlEditor.setContent(content);

    this._previousSignature = sigContent;
	this._previousSignatureMode = this._htmlEditor.getMode();
};

ZmComposeView.prototype._insertSignature =
function(content, sigStyle, sig, newLine) {
	var re_newlines = "(" + AjxStringUtil.regExEscape(newLine) + ")+";
	// get rid of all trailing newlines
	var re = re_newlines;
	if (this.getHtmlEditor().getMode() == DwtHtmlEditor.HTML) {
		re += "</body></html>";
	}
	re += "$";
	re = new RegExp(re, "i");
	content = content.replace(re, '');

	if (sigStyle == ZmSetting.SIG_OUTLOOK) {
		var repl = "----- ";
		var regexp = new RegExp(re_newlines + repl, "i");

		if (content.match(regexp)) {
			content = content.replace(regexp, [sig, newLine, repl].join(""));
		} else {
			content = [content, sig].join("");
		}
	} else {
		content = [content, sig].join("");
	}

	return content;
};

ZmComposeView.prototype._dispose =
function() {
	if (this._identityChangeListenerObj) {
		var collection = appCtxt.getIdentityCollection();
		collection.removeChangeListener(this._identityChangeListenerObj);
	}
};

ZmComposeView.prototype.getSignatureById =
function(signatureId){
    signatureId = signatureId || this._controller.getSelectedSignature();
    return appCtxt.getSignatureCollection().getById(signatureId)
};

ZmComposeView.prototype._getSignature =
function(signatureId) {
	var extraSignature = this._getExtraSignature();
	signatureId = signatureId || this._controller.getSelectedSignature();
	if (!signatureId && extraSignature == "") {
		return;
	}

	var signature = appCtxt.getSignatureCollection().getById(signatureId);
	if (!signature && extraSignature == "") {
		return;
	}
	var sigString = "";
	if (signature) {
		var newLine = this._getSignatureNewLine();
		sigString = signature.getValue((this._composeMode == DwtHtmlEditor.HTML) ? ZmMimeTable.TEXT_HTML : ZmMimeTable.TEXT_PLAIN);
		sigString = sigString + newLine;
	}
	return sigString + extraSignature;

};

/**
 * Returns "" or extra signature(like a quote or legal disclaimer) via zimlet
 */
ZmComposeView.prototype._getExtraSignature =
function() {
	var extraSignature = "";
	if (appCtxt.zimletsPresent()) {
		var buffer = [];
		appCtxt.notifyZimlets("appendExtraSignature", [buffer]);
		extraSignature = buffer.join(this._getSignatureNewLine());
		if (extraSignature != "") {
			extraSignature = this._getSignatureNewLine() + extraSignature;
		}
	}
	return extraSignature;
};

ZmComposeView.prototype._getSignatureSeparator =
function() {
	var newLine = this._getSignatureNewLine();
	var sep = newLine + newLine;
	if (appCtxt.get(ZmSetting.SIGNATURE_STYLE) == ZmSetting.SIG_INTERNET) {
		sep += "-- " + newLine;
	}
	return sep;
};

ZmComposeView.prototype._getSignatureNewLine =
function() {
	return ((this._composeMode == DwtHtmlEditor.HTML) ? "<br>" : "\n");
};

/**
* Returns true if form contents have changed, or if they are empty.
*
* @param incAddrs		takes addresses into consideration
* @param incSubject		takes subject into consideration
*/
ZmComposeView.prototype.isDirty =
function(incAddrs, incSubject) {
	// reply/forward and empty body => not dirty
	if ((this._action != ZmOperation.NEW_MESSAGE) &&
		(this._htmlEditor.getContent().match(ZmComposeView.EMPTY_FORM_RE)))
	{
		return false;
	}

	var curFormValue = this._formValue(incAddrs, incSubject);

	// empty subject and body => not dirty
	if (curFormValue.match(ZmComposeView.EMPTY_FORM_RE) ||
		(this._composeMode == DwtHtmlEditor.HTML &&
		 (curFormValue == "<html><body></body></html>" ||
		  curFormValue == "<html><body><br></body></html>")))
	{
		return false;
	}

	// subject or body has changed => dirty
	return (curFormValue != this._origFormValue);
};

ZmComposeView.prototype.cleanupAttachments =
function(all) {
	var attachDialog = this._attachDialog;
	if (attachDialog && attachDialog.isPoppedUp()) {
		attachDialog.popdown();
	}

	if (all) {
		this._attcDiv.innerHTML = "";
		this._attcDiv.style.height = "";
		this._attachCount = 0;
	}

	// make sure att IDs don't get reused
	if (this._msg) {
		this._msg.attId = null;
	}
};

ZmComposeView.prototype.sendMsgOboIsOK =
function() {
	return (Dwt.getVisible(this._oboRow)) ? this._oboCheckbox.checked : false;
};

ZmComposeView.prototype.updateTabTitle =
function() {
	var button = this._controller._tabButton;
	if (!button) { return; }
	var buttonText = this._subjectField.value ? this._subjectField.value.substr(0, ZmAppViewMgr.TAB_BUTTON_MAX_TEXT) :
												ZmComposeController.DEFAULT_TAB_TEXT;
	if (buttonText != button.getText()) {
		button.setText(buttonText);
	}
};

// Private / protected methods

ZmComposeView.prototype._isInviteReply =
function(action) {
	return (action == ZmOperation.REPLY_ACCEPT ||
			action == ZmOperation.REPLY_CANCEL ||
			action == ZmOperation.REPLY_DECLINE ||
			action == ZmOperation.REPLY_TENTATIVE ||
			action == ZmOperation.REPLY_MODIFY ||
			action == ZmOperation.REPLY_NEW_TIME);
};

/*
* Creates an address string from the given vector, excluding any that have
* already been used.
*
* @param addrVec	[AjxVector]		vector of AjxEmailAddress
* @param used		[Object]		hash of addresses that have been used
*/
ZmComposeView.prototype._getAddrString =
function(addrVec, used) {
	used = used || {};
	var a = addrVec.getArray();
	var addrs = [];
	for (var i = 0; i < a.length; i++) {
		var addr = a[i];
		var email = addr ? addr.getAddress() : null;
		if (!email) { continue; }
		email = email.toLowerCase();
		if (!used[email]) {
			addrs.push(addr);
		}
		used[email] = true;
	}
	return addrs.join(AjxEmailAddress.SEPARATOR); // calls implicit toString() on each addr object
};

// returns the text part given a body part (if body part is HTML, converts it to text)
ZmComposeView.prototype._getTextPart =
function(bodyPart, encodeSpace) {
	var text = "";
	// if the only content type returned is html, convert to text
	if (bodyPart.ct == ZmMimeTable.TEXT_HTML) {
		// create a temp iframe to create a proper DOM tree
		var params = {parent: this, hidden: true, html: bodyPart.content};
		var dwtIframe = new DwtIframe(params);
		if (dwtIframe) {
			text = AjxStringUtil.convertHtml2Text(dwtIframe.getDocument().body);
			delete dwtIframe;
		}
	} else {
		text = encodeSpace
			? AjxStringUtil.convertToHtml(bodyPart.content)
			: bodyPart.content;
	}

	return text;
};

// Consistent spot to locate various dialogs
ZmComposeView.prototype._getDialogXY =
function() {
	var loc = Dwt.toWindow(this.getHtmlElement(), 0, 0);
	return new DwtPoint(loc.x + ZmComposeView.DIALOG_X, loc.y + ZmComposeView.DIALOG_Y);
};

ZmComposeView.prototype._getForwardAttIds =
function(name) {
	var forAttIds = [];
	var forAttList = document.getElementsByName(name);

	// walk collection of input elements
	for (var i = 0; i < forAttList.length; i++) {
		if (forAttList[i].checked)
			forAttIds.push(forAttList[i].value);
	}

	return forAttIds;
};

ZmComposeView.prototype._acCompHandler =
function(text, el, match) {
	this._adjustAddrHeight(el);
};

ZmComposeView.prototype._acKeyupHandler =
function(ev, acListView, result) {
	var key = DwtKeyEvent.getCharCode(ev);
	// process any printable character or enter/backspace/delete keys
	if (result && AjxStringUtil.isPrintKey(key) ||
		key == 3 || key == 13 || key == 8 || key == 46 ||
		(AjxEnv.isMac && key == 224)) // bug fix #24670
	{
		this._adjustAddrHeight(DwtUiEvent.getTargetWithProp(ev, "id"));
	}
};

ZmComposeView.prototype._adjustAddrHeight =
function(textarea, skipResetBodySize) {
	if (textarea.value.length == 0) {
		textarea.style.height = "21px";

		if (AjxEnv.isIE) // for IE use overflow-y
			textarea.style.overflowY = "hidden";
		else
			textarea.style.overflow = "hidden";

		if (!skipResetBodySize)
			this._resetBodySize();

		return;
	}

	if (textarea.scrollHeight > textarea.clientHeight) {
		var taHeight = parseInt(textarea.style.height) || 0;
		if (taHeight <= 65) {
			var sh = textarea.scrollHeight;
			if (textarea.scrollHeight >= 65) {
				sh = 65;
				if (AjxEnv.isIE)
					textarea.style.overflowY = "scroll";
				else
					textarea.style.overflow = "auto";
			}
			textarea.style.height = sh + 13;
			this._resetBodySize();
		} else {
			if (AjxEnv.isIE) // for IE use overflow-y
				textarea.style.overflowY = "scroll";
			else
				textarea.style.overflow = "auto";

			textarea.scrollTop = textarea.scrollHeight;
		}
	}
};

/*
* Set various address headers based on the original message and the mode we're in.
* Make sure not to duplicate any addresses, even across fields.
*/
ZmComposeView.prototype._setAddresses =
function(action, type, override) {
	this._action = action;

	if (action == ZmOperation.NEW_MESSAGE &&
		override)
	{
		this.setAddress(type, override);
	}
	else if (action == ZmOperation.REPLY ||
			 action == ZmOperation.REPLY_ALL ||
			 this._isInviteReply(action))
	{
		// Prevent user's login name and aliases from going into To: or Cc:
		var used = {};
		var uname = appCtxt.get(ZmSetting.USERNAME);
		if (uname) {
			used[uname.toLowerCase()] = true;
		}
		var aliases = appCtxt.get(ZmSetting.MAIL_ALIASES);
		for (var i = 0, count = aliases.length; i < count; i++) {
			used[aliases[i].toLowerCase()] = true;
		}

		// Check for Canonical Address's
		var defaultIdentity = appCtxt.getIdentityCollection().defaultIdentity;
		if (defaultIdentity && defaultIdentity.sendFromAddress) {
			// Note: sendFromAddress is same as appCtxt.get(ZmSetting.USERNAME)
			// if the account does not have any Canonical Address assigned.
			used[defaultIdentity.sendFromAddress.toLowerCase()] = true;
		}

		// When updating address lists, use this._addressesMsg instead of this._msg, because
		// this._msg changes after a draft is saved.
		if (!this._addressesMsg.isSent) {
			var addrVec = this._addressesMsg.getReplyAddresses(action, used);
			var addr = this._getAddrString(addrVec);
			if (action == ZmOperation.REPLY_ALL) {
				for (var i = 0, len = addrVec.size(); i < len; i++) {
					var a = addrVec.get(i).address;
					used[a] = true;
				}
			}
			this.setAddress(AjxEmailAddress.TO, addr);
		} else if (action == ZmOperation.REPLY) {
			var toAddrs = this._addressesMsg.getAddresses(AjxEmailAddress.TO);
			this.setAddress(AjxEmailAddress.TO, this._getAddrString(toAddrs));
		}

		// reply to all senders if reply all (includes To: and Cc:)
		if (action == ZmOperation.REPLY) {
			this.setAddress(AjxEmailAddress.CC, "");
		} else if (action == ZmOperation.REPLY_ALL) {
			var addrs = new AjxVector();
			addrs.addList(this._addressesMsg.getAddresses(AjxEmailAddress.CC));
			var toAddrs = this._addressesMsg.getAddresses(AjxEmailAddress.TO);
			if (this._addressesMsg.isSent) {
				// sent msg replicates To: and Cc: (minus duplicates)
				this.setAddress(AjxEmailAddress.TO, this._getAddrString(toAddrs, used));
			} else {
				addrs.addList(toAddrs);
			}
			this.setAddress(AjxEmailAddress.CC, this._getAddrString(addrs, used));
		}
	} else if (action == ZmOperation.DRAFT || action == ZmOperation.SHARE) {
		for (var i = 0; i < ZmMailMsg.COMPOSE_ADDRS.length; i++) {
			var addrs = this._msg.getAddresses(ZmMailMsg.COMPOSE_ADDRS[i]);
			this.setAddress(ZmMailMsg.COMPOSE_ADDRS[i], addrs.getArray().join(AjxEmailAddress.SEPARATOR));
		}
	}
};

ZmComposeView.prototype._setObo =
function(obo) {
	Dwt.setVisible(this._oboRow, true);
	this._oboCheckbox.checked = true;
	this._oboLabel.innerHTML = AjxMessageFormat.format(ZmMsg.sendObo, obo);
};

ZmComposeView.prototype._setSubject =
function(action, msg, subjOverride) {
	if ((action == ZmOperation.NEW_MESSAGE && subjOverride == null)) {
		return;
	}

	var subj = subjOverride || ( (msg) ? msg.subject : "" );

    if (action == ZmOperation.REPLY_CANCEL && !subj) {
        var inv = (msg) ? msg.invite : null;
        if (inv) {
            subj = inv.getName();
        }
    }

	if (action != ZmOperation.DRAFT && subj) {
		var regex = ZmComposeView.SUBJ_PREFIX_RE;
		while (regex.test(subj))
			subj = subj.replace(regex, "");
	}

	var prefix = "";
	switch (action) {
		case ZmOperation.REPLY:
		case ZmOperation.REPLY_ALL: 		prefix = "Re: "; break;
		case ZmOperation.REPLY_CANCEL: 		prefix = ZmMsg.cancelled + ": "; break;
		case ZmOperation.FORWARD_INLINE:
		case ZmOperation.FORWARD_ATT: 		prefix = "Fwd: "; break;
		case ZmOperation.REPLY_ACCEPT:		prefix = ZmMsg.subjectAccept + ": "; break;
		case ZmOperation.REPLY_DECLINE:		prefix = ZmMsg.subjectDecline + ": "; break;
		case ZmOperation.REPLY_TENTATIVE:	prefix = ZmMsg.subjectTentative + ": "; break;
		case ZmOperation.REPLY_NEW_TIME:	prefix = ZmMsg.subjectNewTime + ": "; break;
	}
	this._subjectField.value = prefix + (subj || "");
	this.updateTabTitle();
};

ZmComposeView.prototype._setBody =
function(action, msg, extraBodyText, incOption, nosig) {
	var composingHtml = this._composeMode == DwtHtmlEditor.HTML;

	// XXX: consolidate this code later.
	var isDraft = action == ZmOperation.DRAFT;
	var isShare = action == ZmOperation.SHARE;
	var isInviteReply = action == ZmOperation.REPLY_ACCEPT ||
						action == ZmOperation.REPLY_DECLINE ||
						action == ZmOperation.REPLY_TENTATIVE ||
						action == ZmOperation.REPLY_NEW_TIME;
	if (isDraft || isShare || isInviteReply) {
		var body = "";
		if (composingHtml) {
			body = msg.getBodyPart(ZmMimeTable.TEXT_HTML);
			// if no html part exists, just grab the text
			// (but make sure to preserve whitespace and newlines!)
			if (!AjxUtil.isString(body)) {
				if (body) {
					body = body.content;
				} else {
					var bodyPart = msg.getBodyPart();
					body = bodyPart ? (AjxStringUtil.convertToHtml(bodyPart.content)) : null;
				}
			}
		} else {
			var bodyPart = msg.getBodyPart();
			body = bodyPart ? bodyPart.content : null;
		}
		this._htmlEditor.setContent(body);

		if (!isInviteReply) {
			var showInlineAtts = !appCtxt.get(ZmSetting.VIEW_AS_HTML);
			this._showForwardField(msg, action, null, showInlineAtts);
			this._fixMultipartRelatedImages_onTimer(msg);
			return;
		}
	}

	var sigStyle;
	var sig;
	if (!nosig && appCtxt.get(ZmSetting.SIGNATURES_ENABLED)) {
		//sig = this._getSignature();
        sig = this.getSignatureContentSpan();
		sigStyle = sig ? appCtxt.get(ZmSetting.SIGNATURE_STYLE) : null;
	}
	var value = (sigStyle == ZmSetting.SIG_OUTLOOK) ? (this._getSignatureSeparator() + sig) : "";

	// get reply/forward prefs as necessary
	if (!incOption) {
		var isReply = (action == ZmOperation.REPLY || action == ZmOperation.REPLY_ALL);
		if (isReply || isInviteReply) {
			incOption = appCtxt.get(ZmSetting.REPLY_INCLUDE_ORIG);
		} else if (action == ZmOperation.FORWARD_INLINE) {
			incOption = appCtxt.get(ZmSetting.FORWARD_INCLUDE_ORIG);
			if (incOption == ZmSetting.INCLUDE_ATTACH) {
				incOption = ZmSetting.INCLUDE;
			}
		} else if (action == ZmOperation.FORWARD_ATT) {
			incOption = ZmSetting.INCLUDE_ATTACH;
		}
	}

	var hasInlineImages = false;
	var hasInlineAtts   = false;
	this._msgAttId = null;
	if (incOption == ZmSetting.INCLUDE_NONE || action == ZmOperation.NEW_MESSAGE) {
		value = extraBodyText ? extraBodyText + value : value;
	} else if (incOption == ZmSetting.INCLUDE_ATTACH && this._msg) {
		value = extraBodyText ? extraBodyText + value : value;
		this._msgAttId = this._msg.id;
	} else if (!this._msgIds) {
		var crlf = composingHtml ? "<br>" : ZmMsg.CRLF;
		var crlf2 = composingHtml ? "<br><br>" : ZmMsg.CRLF2;
		var leadingText = extraBodyText ? extraBodyText + crlf : crlf;
		var body;
		var bodyPart;

		// bug fix #7271 - if we have multiple body parts, append them all first
		var parts = msg.getBodyParts();
		if (parts && parts.length > 1) {
			var bodyArr = [];
			for (var k = 0; k < parts.length; k++) {
				var part = parts[k];
				// bug: 28741
				if (ZmMimeTable.isRenderableImage(part.ct)) {
					bodyArr.push([crlf,"[",part.ct,":",(part.filename||"..."),"]",crlf].join(""));
					hasInlineImages = true;
				} else if(part.filename && part.cd == "inline") {   //Inline attachments
					var attInfo = ZmMimeTable.getInfo(part.ct);
					attInfo = attInfo ? attInfo.desc : part.ct;
					bodyArr.push([crlf,"[",attInfo,":",(part.filename||"..."),"]",crlf].join(""));
					hasInlineAtts = true;
				} else if(part.ct == ZmMimeTable.TEXT_PLAIN) {
					bodyArr.push( composingHtml ? AjxStringUtil.convertToHtml(part.content) : part.content );
				} else if(part.ct == ZmMimeTable.TEXT_HTML) {
					if(composingHtml){
						bodyArr.push(part.content);
					} else {
						var div = document.createElement("div");
						div.innerHTML = part.content;
						bodyArr.push(AjxStringUtil.convertHtml2Text(div));
					}
				}
			}
			body = bodyArr.join(crlf);
		} else {
			if (composingHtml) {
				body = msg.getBodyPart(ZmMimeTable.TEXT_HTML);
				if (body) {
					body = AjxUtil.isString(body) ? body : body.content;
				} else {
					// if no html part exists, just grab the text
					bodyPart = msg.getBodyPart();
					body = bodyPart ? this._getTextPart(bodyPart, true) : null;
				}
			} else {
				// grab text part out of the body part
				bodyPart = msg.getBodyPart(ZmMimeTable.TEXT_PLAIN) || msg.getBodyPart(ZmMimeTable.TEXT_HTML, true);
				body = bodyPart ? this._getTextPart(bodyPart) : null;
			}
		}

		body = body || ""; // prevent from printing "null" if no body found

		if ((action == ZmOperation.FORWARD_INLINE ||
			 action == ZmOperation.REPLY ||
			 action == ZmOperation.REPLY_ALL) &&
			bodyPart && AjxUtil.isObject(bodyPart) && bodyPart.truncated)
		{
			body += composingHtml
				? ("<br><br>" + ZmMsg.messageTruncated + "<br><br>")
				: ("\n\n" + ZmMsg.messageTruncated + "\n\n");
		}

		// Bug 7160: Strip off the ~*~*~*~ from invite replies.
		if (isInviteReply) {
			body = body.replace(ZmItem.NOTES_SEPARATOR, "");
		}

		if (incOption == ZmSetting.INCLUDE) {
			var msgText = (action == ZmOperation.FORWARD_INLINE) ? ZmMsg.forwardedMessage : ZmMsg.origMsg;
			var preface = this._includedPreface = [ZmMsg.DASHES, " ", msgText, " ", ZmMsg.DASHES].join("");
			var text = [preface, crlf].join("");
			for (var i = 0; i < ZmComposeView.QUOTED_HDRS.length; i++) {
				var hdr = msg.getHeaderStr(ZmComposeView.QUOTED_HDRS[i]);
				if (hdr) {
					if (composingHtml){
						hdr = AjxStringUtil.convertToHtml(hdr);
					}
					text += (hdr + crlf);
				}
			}
			body = text + crlf + body;
			value += leadingText + body;
		} else if (body.length > 0) {
			var from = msg.getAddress(AjxEmailAddress.FROM);
			if (!from && msg.isSent) {
				from = appCtxt.get(ZmSetting.USERNAME);
			}
			var preface = "";
			if (from) {
				if (!ZmComposeView._replyPrefixFormatter) {
					ZmComposeView._replyPrefixFormatter = new AjxMessageFormat(ZmMsg.replyPrefix);
				}
				var fromText = from.toString();
				if (composingHtml) {
					fromText = AjxStringUtil.htmlEncode(fromText);
				}
				preface = ZmComposeView._replyPrefixFormatter.format(fromText);
			}
			this._includedPreface = preface;
			preface = preface + (composingHtml ? '<br>' : '\n');
			var prefix = appCtxt.get(ZmSetting.REPLY_PREFIX);
			if (composingHtml) {
				prefix = AjxStringUtil.htmlEncode(prefix);
			}
			var sep = composingHtml ? '<br>' : '\n';
			var wrapParams = {text:body, len:ZmComposeView.WRAP_LENGTH, pre:prefix + " ", eol:sep, htmlMode:composingHtml};

			if (incOption == ZmSetting.INCLUDE_PREFIX) {
				value += leadingText + preface + AjxStringUtil.wordWrap(wrapParams);
			}
			else if (incOption == ZmSetting.INCLUDE_PREFIX_FULL) {
				var headers = [];
				for (var i = 0; i < ZmComposeView.QUOTED_HDRS.length; i++) {
					var h = msg.getHeaderStr(ZmComposeView.QUOTED_HDRS[i]);
					if (h) {
						h = h.replace(/\n+$/, "");
						if (composingHtml){
							h = AjxStringUtil.convertToHtml(h);
						}
						headers.push(h);
					}
				}
				wrapParams.text = headers.join(crlf);
				wrapParams.len = 120; // headers tend to be longer
				headers = AjxStringUtil.wordWrap(wrapParams);
				wrapParams.text = body;
				wrapParams.len = ZmComposeView.WRAP_LENGTH;
				value += leadingText + preface + headers + (composingHtml ? sep : '') + prefix + sep + AjxStringUtil.wordWrap(wrapParams);
			}
			else if (incOption == ZmSetting.INCLUDE_SMART) {
				var chunks = AjxStringUtil.getTopLevel(body);
				for (var i = 0; i < chunks.length; i++) {
					wrapParams.text = chunks[i];
					chunks[i] = AjxStringUtil.wordWrap(wrapParams);
				}
				var text = chunks.length ? chunks.join(sep + sep) : body;
				value += leadingText + preface + text;
			}
			else if (action == ZmOperation.REPLY_ACCEPT ||
					 action == ZmOperation.REPLY_DECLINE ||
					 action == ZmOperation.REPLY_TENTATIVE)
			{
				// bug 5122: always show original meeting details
				var bp = msg.getBodyPart(ZmMimeTable.TEXT_PLAIN);
				wrapParams.text = bp ? (bp.content.replace(/\r\n/g, "\n")) : "";
				value = preface + AjxStringUtil.wordWrap(wrapParams);
			}
			else if (action == ZmOperation.REPLY_CANCEL) {
				cancelledParts = [ leadingText ];
				cancelledParts.push(crlf);
				var inv = (msg) ? msg.invite : null;
				if (inv) {
					cancelledParts.push(ZmMsg.subjectLabel+" "+ (msg.subject || inv.getName()) +crlf);
					cancelledParts.push(ZmMsg.organizer + ": " + inv.getOrganizerName() + crlf);
					var sd = inv.getServerStartDate();
					if(msg._instanceDate) {
						sd = msg._instanceDate;
					}
					cancelledParts.push(ZmMsg.time + ": " + sd + crlf);
				}
				cancelledParts.push(ZmItem.NOTES_SEPARATOR);
				value = cancelledParts.join("");
			}
		}
	}

	if (!nosig && sigStyle == ZmSetting.SIG_INTERNET) {
		this.addSignature(value);
	} else {
		value = value || (composingHtml ? "<br>" : "");
		this._htmlEditor.setContent(value);
	}

	hasInlineImages = hasInlineImages || !appCtxt.get(ZmSetting.VIEW_AS_HTML);
	this._showForwardField(msg, action, incOption, hasInlineImages, hasInlineAtts);
	this._fixMultipartRelatedImages_onTimer(msg);
};

ZmComposeView.prototype.resetBody =
function(action, msg, extraBodyText, incOption, nosig) {
	this.cleanupAttachments(true);
	this._setBody(action, msg, extraBodyText, incOption, nosig);
	this._origFormValue = this._formValue();
	this._resetBodySize();
};

// Generic routine for attaching an event handler to a field. Since "this" for the handlers is
// the incoming event, we need a way to get at ZmComposeView, so it's added to the event target.
ZmComposeView.prototype._setEventHandler =
function(id, event, addrType) {
	var field = document.getElementById(id);
	field._composeView = this._internalId;
	if (addrType) {
		field._addrType = addrType;
	}
	var lcEvent = event.toLowerCase();
	field[lcEvent] = ZmComposeView["_" + event];
};

ZmComposeView.prototype._setBodyFieldCursor =
function(extraBodyText) {
	if (this._composeMode == DwtHtmlEditor.HTML) { return; }

	// this code moves the cursor to the beginning of the body
	if (AjxEnv.isIE) {
		var tr = this._bodyField.createTextRange();
		if (extraBodyText) {
			tr.move('character', extraBodyText.length + 1);
		} else {
			tr.collapse(true);
		}
		tr.select();
	} else {
		var index = extraBodyText ? (extraBodyText.length + 1) : 0;
		Dwt.setSelectionRange(this._bodyField, index, index);
	}
};

/**
* This should be called only once for when compose view loads first time around
*/
ZmComposeView.prototype._initialize =
function(composeMode) {
	// init address field objects
	this._divId = {};
	this._buttonTdId = {};
	this._fieldId = {};
	this._using = {};
	this._button = {};
	this._field = {};
	this._divEl = {};
	this._internalId = AjxCore.assignId(this);

	// init html
	this._createHtml();

	// init compose view w/ based on user prefs
	var bComposeEnabled = appCtxt.get(ZmSetting.HTML_COMPOSE_ENABLED);
	var composeFormat = appCtxt.get(ZmSetting.COMPOSE_AS_FORMAT);
	var defaultCompMode = bComposeEnabled && composeFormat == ZmSetting.COMPOSE_HTML
		? DwtHtmlEditor.HTML : DwtHtmlEditor.TEXT;
	this._composeMode = composeMode || defaultCompMode;

	// init html editor
	this._htmlEditor = new ZmHtmlEditor(this, DwtControl.RELATIVE_STYLE, null, this._composeMode);
	this._bodyFieldId = this._htmlEditor.getBodyFieldId();
	this._bodyField = document.getElementById(this._bodyFieldId);
	this._includedPreface = "";

	// misc. inits
	this.setScrollStyle(DwtControl.SCROLL);
	this._attachCount = 0;

	// init listeners
	this.addControlListener(new AjxListener(this, this._controlListener));

//	if (!appCtxt.isChildWindow && appCtxt.multiAccounts) {
//		var opc = this._controller._app.getOverviewPanelContent();
//		opc.addSelectionListener(new AjxListener(this, this._accountChangeListener));
//	}
};

ZmComposeView.prototype._createHtml =
function(templateId) {
	var data = {
		id:					this._htmlElId,
		headerId:			ZmId.getViewId(this._view, ZmId.CMP_HEADER),
		fromSelectId:		ZmId.getViewId(this._view, ZmId.CMP_FROM_SELECT),
		toRowId:			ZmId.getViewId(this._view, ZmId.CMP_TO_ROW),
		toPickerId:			ZmId.getViewId(this._view, ZmId.CMP_TO_PICKER),
		toInputId:			ZmId.getViewId(this._view, ZmId.CMP_TO_INPUT),
		ccRowId:			ZmId.getViewId(this._view, ZmId.CMP_CC_ROW),
		ccPickerId:			ZmId.getViewId(this._view, ZmId.CMP_CC_PICKER),
		ccInputId:			ZmId.getViewId(this._view, ZmId.CMP_CC_INPUT),
		bccRowId:			ZmId.getViewId(this._view, ZmId.CMP_BCC_ROW),
		bccPickerId:		ZmId.getViewId(this._view, ZmId.CMP_BCC_PICKER),
		bccInputId:			ZmId.getViewId(this._view, ZmId.CMP_BCC_INPUT),
		bccToggleId:		ZmId.getViewId(this._view, ZmId.CMP_BCC_TOGGLE),
		subjectRowId:		ZmId.getViewId(this._view, ZmId.CMP_SUBJECT_ROW),
		subjectInputId:		ZmId.getViewId(this._view, ZmId.CMP_SUBJECT_INPUT),
		oboRowId:			ZmId.getViewId(this._view, ZmId.CMP_OBO_ROW),
		oboCheckboxId:		ZmId.getViewId(this._view, ZmId.CMP_OBO_CHECKBOX),
		oboLabelId:			ZmId.getViewId(this._view, ZmId.CMP_OBO_LABEL),
		identityRowId:		ZmId.getViewId(this._view, ZmId.CMP_IDENTITY_ROW),
		identitySelectId:	ZmId.getViewId(this._view, ZmId.CMP_IDENTITY_SELECT),
		priorityId:			ZmId.getViewId(this._view, ZmId.CMP_PRIORITY),
		attRowId:			ZmId.getViewId(this._view, ZmId.CMP_ATT_ROW),
		attDivId:			ZmId.getViewId(this._view, ZmId.CMP_ATT_DIV)
	};

	this._createHtmlFromTemplate(templateId || this.TEMPLATE, data);
};

ZmComposeView.prototype._createHtmlFromTemplate =
function(templateId, data) {
	DwtComposite.prototype._createHtmlFromTemplate.call(this, templateId, data);

	// global identifiers
	this._identityDivId = data.identityRowId;

	// init autocomplete list
	if (appCtxt.get(ZmSetting.CONTACTS_ENABLED) || appCtxt.get(ZmSetting.GAL_ENABLED)) {
		var params = {
			parent: appCtxt.getShell(),
			dataClass: appCtxt.getAutocompleter(),
			matchValue: ZmAutocomplete.AC_VALUE_FULL,
			compCallback: (new AjxCallback(this, this._acCompHandler)),
			keyUpCallback: (new AjxCallback(this, this._acKeyupHandler))
		};
		this._acAddrSelectList = new ZmAutocompleteListView(params);
	}

	// process compose fields
	for (var i = 0; i < ZmMailMsg.COMPOSE_ADDRS.length; i++) {
		var type = ZmMailMsg.COMPOSE_ADDRS[i];
		var typeStr = AjxEmailAddress.TYPE_STRING[type];

		// save identifiers
		this._divId[type] = [data.id, typeStr, "row"].join("_");
		this._buttonTdId[type] = [data.id, typeStr, "picker"].join("_");
		this._fieldId[type] = [data.id, typeStr, "control"].join("_");
		// save field elements
		this._divEl[type] = document.getElementById(this._divId[type]);

		// save field control
		this._field[type] = document.getElementById(this._fieldId[type]);
		if (this._field[type]) {
			this._field[type].addrType = type;
		}

		// create picker
		if (this._contactPickerEnabled) {
			var pickerId = this._buttonTdId[type];
			var pickerEl = document.getElementById(pickerId);
			if (pickerEl) {
				var buttonId = ZmId.getButtonId(this._view, ZmComposeView.OP[type]);
				var button = new DwtButton({parent:this, id:buttonId});
				button.setText(pickerEl.innerHTML);
				button.replaceElement(pickerEl);

				button.addSelectionListener(new AjxListener(this, this._addressButtonListener));
				button.addrType = type;

				// autocomplete-related handlers
				if (appCtxt.get(ZmSetting.CONTACTS_ENABLED)) {
					this._acAddrSelectList.handle(this._field[type]);
				} else {
					this._setEventHandler(this._fieldId[type], "onKeyUp");
				}

				this._button[type] = button;
			}
		}
	}

	// save reference to DOM objects per ID's
	this._headerEl = document.getElementById(data.headerId);
	this._subjectField = document.getElementById(data.subjectInputId);
	this._oboRow = document.getElementById(data.oboRowId);
	this._oboCheckbox = document.getElementById(data.oboCheckboxId);
	this._oboLabel = document.getElementById(data.oboLabelId);
	this._attcDiv = document.getElementById(data.attDivId);

	this._setEventHandler(data.subjectInputId, "onKeyUp");
	this._setEventHandler(data.subjectInputId, "onBlur");

	if (appCtxt.isOffline) {
		if (!this._fromSelect) {
			this._fromSelect = new DwtSelect({parent:this, parentElement:data.fromSelectId});
			this._fromSelect.addChangeListener(new AjxListener(this, this._handleFromListener));
			var active = appCtxt.getActiveAccount();
			if (active.isMain) {
				active = appCtxt.getMainAccount(true);
			}
			var accounts = appCtxt.getZimbraAccounts();
			for (var i in accounts) {
				var acct = accounts[i];
				if (!acct.visible || acct.isMain) { continue; }

				var isSelected = acct == active;
				if (isSelected) {
					this._controller._accountName = acct.name;
				}
				var identities = appCtxt.getIdentityCollection(acct).getIdentities();
				for (var j = 0; j < identities.length; j++) {
					var identity = identities[j];
					var addr = new AjxEmailAddress(identity.sendFromAddress, AjxEmailAddress.FROM, identity.sendFromDisplay);
					addr.accountId = acct.id;
					this._fromSelect.addOption(addr.toString(), isSelected, addr);
				}
			}
		}
	} else {
		// initialize identity select
		var identityOptions = this._getIdentityOptions();
		this.identitySelect = new DwtSelect({parent:this, options:identityOptions});
		this.identitySelect.setToolTipContent(ZmMsg.chooseIdentity);

		if (!this._identityChangeListenerObj) {
			this._identityChangeListenerObj = new AjxListener(this, this._identityChangeListener);
		}
		var ac = window.parentAppCtxt || window.appCtxt;
		var accounts = ac.getZimbraAccounts();
		for (var id in accounts) {
			var identityCollection = ac.getIdentityCollection(accounts[id]);
			identityCollection.addChangeListener(this._identityChangeListenerObj);
		}

		this.identitySelect.replaceElement(data.identitySelectId);
		this._setIdentityVisible();
	}

	if (ac.get(ZmSetting.MAIL_PRIORITY_ENABLED)) {
		var buttonId = ZmId.getButtonId(this._view, ZmId.CMP_PRIORITY);
		this._priorityButton = new DwtButton({parent:this, id:buttonId});
		this._priorityButton.setMenu(new AjxCallback(this, this._priorityButtonMenuCallback));
		this._priorityButton.reparentHtmlElement(data.priorityId);
		this._priorityButton.setToolTipContent(ZmMsg.setPriority);
	}

	// Toggle BCC
	this._toggleBccEl = document.getElementById(data.bccToggleId);
	if (this._toggleBccEl) {
		Dwt.setHandler(this._toggleBccEl, DwtEvent.ONCLICK, AjxCallback.simpleClosure(this._toggleBccField, this));
	}
};

ZmComposeView.prototype._handleFromListener =
function(ev) {
	if (ev._args.oldValue == ev._args.newValue) { return; }

	var val = ev._args.newValue;
	this._controller._accountName = appCtxt.getAccount(val.accountId).name;

	// todo:
	// 1. reset signature based on newly selected value
	// 2. if draft is saved, check whether it needs to be moved based on
	//    newly selected value
};

ZmComposeView.prototype._toggleBccField =
function(ev, force){
	var isBccFieldVisible = Dwt.getVisible(this._divEl[AjxEmailAddress.BCC]);
	if (typeof force != "undefined") isBccFieldVisible = !force;
	this._showAddressField(AjxEmailAddress.BCC, !isBccFieldVisible);
};

ZmComposeView.prototype._createPrioityMenuItem =
function(menu, text, flag) {
	var item = DwtMenuItem.create({parent:menu, imageInfo:this._getPriorityImage(flag), text:text});
	item._priorityFlag = flag;
	item.addSelectionListener(this._priorityMenuListnerObj);
};

ZmComposeView.prototype._priorityButtonMenuCallback =
function() {
	var menu = new DwtMenu({parent:this._priorityButton});
	this._priorityMenuListnerObj = new AjxListener(this, this._priorityMenuListner);
	this._createPrioityMenuItem(menu, ZmMsg.high, ZmItem.FLAG_HIGH_PRIORITY);
	this._createPrioityMenuItem(menu, ZmMsg.normal, "");
	this._createPrioityMenuItem(menu, ZmMsg.low, ZmItem.FLAG_LOW_PRIORITY);
	return menu;
};

ZmComposeView.prototype._getPriorityImage =
function(flag) {
	if (flag == ZmItem.FLAG_HIGH_PRIORITY)	{ return "PriorityHigh"; }
	if (flag == ZmItem.FLAG_LOW_PRIORITY)	{ return "PriorityLow"; }
	return "PriorityNormal";
};

ZmComposeView.prototype._priorityMenuListner =
function(ev) {
	this._setPriority(ev.dwtObj._priorityFlag);
};

ZmComposeView.prototype._getPriority =
function() {
	return (this._priorityButton)
		? (this._priorityButton._priorityFlag || "") : "";
};

ZmComposeView.prototype._setPriority =
function(flag) {
	if (this._priorityButton) {
		flag = flag || "";
		this._priorityButton.setImage(this._getPriorityImage(flag));
		this._priorityButton._priorityFlag = flag;
	}
};

ZmComposeView.prototype._getIdentityOptions =
function() {
	var options = [];
	var identityCollection = appCtxt.getIdentityCollection();
	var identities = identityCollection.getIdentities();
	for (var i = 0, count = identities.length; i < count; i++) {
		var identity = identities[i];

		// bug fix #21497 - skip the *fake* local account if offline and is main
		var acct = appCtxt.isOffline && appCtxt.getAccount(identity.id);
		if (acct && acct.isMain) { continue; }

		var text = this._getIdentityText(identity);
		options.push(new DwtSelectOptionData(identity.id, text,null,this._getIdentityText(identity,true)));
	}
	return options;
};

ZmComposeView.prototype._getIdentityText =
function(identity, justName) {
	var name = identity.name;
	if (identity.isDefault && name == ZmIdentity.DEFAULT_NAME) {
		name = ZmMsg.accountDefault;
	}
	if (justName) {
		return name;
	}

	// default replacement parameters
	var defaultIdentity = appCtxt.getIdentityCollection().defaultIdentity;
	var params = [
		name, identity.sendFromDisplay, identity.sendFromAddress,
		ZmMsg.accountDefault, appCtxt.get(ZmSetting.DISPLAY_NAME), defaultIdentity.sendFromAddress
	];

	// get appropriate pattern
	var pattern;
	if (identity.isDefault) {
		pattern = ZmMsg.identityTextPrimary;
	}
	else if (identity.isFromDataSource) {
		var ds = appCtxt.getDataSourceCollection().getById(identity.id);
		params[1] = ds.userName;
		params[2] = ds.getEmail();
		var provider = ZmDataSource.getProviderForAccount(ds);
		pattern = (provider && ZmMsg["identityText-"+provider.id]) || ZmMsg.identityTextExternal;
	}
	else {
		pattern = ZmMsg.identityTextPersona;
	}

	// format text
	return AjxMessageFormat.format(pattern, params);
};

ZmComposeView.prototype._identityChangeListener =
function(ev) {
	if (ev.event == ZmEvent.E_CREATE) {
		this._setIdentityVisible();
		var identity = ev.getDetail("item");
		var text = this._getIdentityText(identity);
		var option = new DwtSelectOptionData(identity.id, text);
		if (this.identitySelect) {
			this.identitySelect.addOption(option);
		}
	} else if (ev.event == ZmEvent.E_DELETE) {
		// DwtSelect doesn't support removing an option, so recreate the whole thing.
		if (this.identitySelect) {
			this.identitySelect.clearOptions();
			var options = this._getIdentityOptions();
			for (var i = 0, count = options.length; i < count; i++)	 {
				this.identitySelect.addOption(options[i]);
			}
			this._setIdentityVisible();
		}
	} else if (ev.event == ZmEvent.E_MODIFY) {
		if (this.identitySelect) {
			var identity = ev.getDetail("item");
			var text = this._getIdentityText(identity);
			this.identitySelect.rename(identity.id, text);
		}
	}
};

ZmComposeView.prototype._setIdentityVisible =
function() {
	if (!appCtxt.get(ZmSetting.IDENTITIES_ENABLED)) return;

	var div = document.getElementById(this._identityDivId);
	if (!div) return;

	var visible = appCtxt.getIdentityCollection().getSize() > 1;
	Dwt.setVisible(div, visible);
};

ZmComposeView.prototype.getIdentity =
function() {
	if (this.identitySelect) {
		var identityCollection = appCtxt.getIdentityCollection();
		var id = this.identitySelect.getValue();
		var result = identityCollection.getById(id);
		return result ? result : identityCollection.defaultIdentity;
	}
};

ZmComposeView.prototype._showForwardField =
function(msg, action, replyPref, includeInlineImages, includeInlineAtts) {

	var html = "";
	if (!(this._msgIds && this._msgIds.length) &&
		(replyPref == ZmSetting.INCLUDE_ATTACH || action == ZmOperation.FORWARD_ATT))
	{
		html = AjxTemplate.expand("mail.Message#ForwardOneMessage", {message:msg});
		this._attachCount = 1;
	}
	else if (msg && (msg.hasAttach || includeInlineImages || includeInlineAtts))
	{
		var attLinks = msg.getAttachmentLinks(false, includeInlineImages, includeInlineAtts);
		if (attLinks.length > 0) {
			var data = {
				attachments: attLinks,
				isNew: action == ZmOperation.NEW_MESSAGE,
				isForward: action == ZmOperation.FORWARD,
				isForwardInline: action == ZmOperation.FORWARD_INLINE,
				isDraft: action == ZmOperation.DRAFT,
				fwdFieldName:(ZmComposeView.FORWARD_ATT_NAME+this._sessionId)
			};
			html = AjxTemplate.expand("mail.Message#ForwardAttachments", data);

			if (attLinks.length >= ZmComposeView.SHOW_MAX_ATTACHMENTS) {
				this._attcDiv.style.height = ZmComposeView.MAX_ATTACHMENT_HEIGHT;
				this._attcDiv.style.overflow = "auto";
			}
			this._attachCount = attLinks.length;
		}
	} else if (this._msgIds && this._msgIds.length) {
		// use main window's appCtxt
		var appCtxt = window.parentAppCtxt || window.appCtxt;
		var messages = [];
		for (var i = 0; i < this._msgIds.length; i++) {
			var message = appCtxt.cacheGet(this._msgIds[i]);
			if (!message) continue;
			messages.push(message);
		}
		var data = {
			messages: messages,
			fwdFieldName: (ZmComposeView.FORWARD_MSG_NAME+this._sessionId)
		};
		html = AjxTemplate.expand("mail.Message#ForwardMessages", data);
		if (messages.length >= ZmComposeView.SHOW_MAX_ATTACHMENTS) {
			this._attcDiv.style.height = ZmComposeView.MAX_ATTACHMENT_HEIGHT;
			this._attcDiv.style.overflow = "auto";
		}
		this._attachCount = messages.length;
	}

	this._attcDiv.innerHTML = html;
};

// Miscellaneous methods
ZmComposeView.prototype._resetBodySize =
function() {
	var size = this.getSize();
	if (size.x <= 0 || size.y <= 0)
		return;

	var height = size.y - Dwt.getSize(this._headerEl).y;
	if (height != size.y) {
		this._htmlEditor.setSize(size.x, height);
	}
};

// Show address field
ZmComposeView.prototype._showAddressField =
function(type, show, skipNotify, skipFocus) {
	this._using[type] = show;
	Dwt.setVisible(this._divEl[type], show);
	this._field[type].value = ""; // bug fix #750 and #3680
	this._field[type].noTab = !show;
	var setting = ZmComposeView.ADDR_SETTING[type];
	if (setting) {
		appCtxt.set(setting, show, null, false, skipNotify);
	}
	if (type == AjxEmailAddress.BCC) {
		Dwt.setInnerHtml(this._toggleBccEl, show ? ZmMsg.hideBCC : ZmMsg.showBCC );
	}
	this._resetBodySize();
};

// Grab the addresses out of the form. Optionally, they can be returned broken
// out into good and bad addresses, with an aggregate list of the bad ones also
// returned. If the field is hidden, its contents are ignored.
ZmComposeView.prototype._collectAddrs =
function() {
	var addrs = {};
	addrs[ZmComposeView.BAD] = new AjxVector();
	for (var i = 0; i < ZmMailMsg.COMPOSE_ADDRS.length; i++) {
		var type = ZmMailMsg.COMPOSE_ADDRS[i];
		if (!this._using[type]) continue;
		var val = AjxStringUtil.trim(this._field[type].value);
		if (val.length == 0) continue;
		var result = AjxEmailAddress.parseEmailString(val, type, false);
		if (result.all.size() == 0) continue;
		addrs.gotAddress = true;
		addrs[type] = result;
		if (result.bad.size()) {
			addrs[ZmComposeView.BAD].addList(result.bad);
			if (!addrs.badType)
				addrs.badType = type;
		}
	}
	return addrs;
};

// Returns a string representing the form content
ZmComposeView.prototype._formValue =
function(incAddrs, incSubject) {
	var vals = [];
	if (incAddrs) {
		for (var i = 0; i < ZmMailMsg.COMPOSE_ADDRS.length; i++) {
			var type = ZmMailMsg.COMPOSE_ADDRS[i];
			if (this._using[type])
				vals.push(this._field[type].value);
		}
	}
	if (incSubject) {
		vals.push(this._subjectField.value);
	}
	vals.push(this._htmlEditor.getContent());
	var str = vals.join("|");
	str = str.replace(/\|+/, "|");
	return str;
};

// Listeners

// Address buttons invoke contact picker
ZmComposeView.prototype._addressButtonListener =
function(ev, addrType) {
	var obj = ev ? DwtControl.getTargetControl(ev) : null;
	this.enableInputs(false);

	if (!this._contactPicker) {
		AjxDispatcher.require("ContactsCore");
		var buttonInfo = [
			{ id: AjxEmailAddress.TO,	label: ZmMsg[AjxEmailAddress.TYPE_STRING[AjxEmailAddress.TO]] },
			{ id: AjxEmailAddress.CC,	label: ZmMsg[AjxEmailAddress.TYPE_STRING[AjxEmailAddress.CC]] },
			{ id: AjxEmailAddress.BCC,	label: ZmMsg[AjxEmailAddress.TYPE_STRING[AjxEmailAddress.BCC]] }];
		this._contactPicker = new ZmContactPicker(buttonInfo);
		this._contactPicker.registerCallback(DwtDialog.OK_BUTTON, this._contactPickerOkCallback, this);
		this._contactPicker.registerCallback(DwtDialog.CANCEL_BUTTON, this._contactPickerCancelCallback, this);
	}

	var curType = obj ? obj.addrType : addrType;
	var a = {};
	var addrs = this._collectAddrs();
	for (var i = 0; i < ZmMailMsg.COMPOSE_ADDRS.length; i++) {
		var type = ZmMailMsg.COMPOSE_ADDRS[i];
		if (addrs[type]) {
			a[type] = addrs[type].good.getArray();
		}
	}
	this._contactPicker.addPopdownListener(this._controller._dialogPopdownListener);
	var str = (this._field[curType].value && !(a[curType] && a[curType].length)) ? this._field[curType].value : "";
	this._contactPicker.popup(curType, a, str);
};

ZmComposeView.prototype._controlListener =
function() {
	this._resetBodySize();
};

//ZmComposeView.prototype._accountChangeListener =
//function(ev) {
//	this._accountChanged = true;
//};


// Callbacks

// Transfers addresses from the contact picker to the compose view.
ZmComposeView.prototype._contactPickerOkCallback =
function(addrs) {
	this.enableInputs(true);
	for (var i = 0; i < ZmMailMsg.COMPOSE_ADDRS.length; i++) {
		var type = ZmMailMsg.COMPOSE_ADDRS[i];
		var vec = addrs[type];
		var addr = (vec.size() > 0) ? vec.toString(AjxEmailAddress.SEPARATOR) + AjxEmailAddress.SEPARATOR : "";
		this.setAddress(ZmMailMsg.COMPOSE_ADDRS[i], addr);
	}
	this._contactPicker.removePopdownListener(this._controller._dialogPopdownListener);
	this._contactPicker.popdown();
	this.reEnableDesignMode();
};

ZmComposeView.prototype._contactPickerCancelCallback =
function() {
	this.enableInputs(true);
	this.reEnableDesignMode();
};

// this callback is triggered when an event occurs inside the html editor (when in HTML mode)
// it is used to set focus to the To: field when user hits the TAB key
ZmComposeView.prototype._htmlEditorEventCallback =
function(args) {
	var rv = true;
	if (args.type == "keydown") {
		var key = DwtKeyEvent.getCharCode(args);
		if (key == DwtKeyEvent.KEY_TAB) {
			var toField = document.getElementById(this._fieldId[AjxEmailAddress.TO]);
			if (toField) {
				appCtxt.getKeyboardMgr().grabFocus(toField);
			}
			rv = false;
		}
	}
	return rv;
};

// needed to reset design mode when in html compose format for gecko
ZmComposeView.prototype._okCallback =
function() {
	appCtxt.getMsgDialog().popdown();
	this._controller.resetToolbarOperations();
	this.reEnableDesignMode();
};

// User has agreed to send message without a subject
ZmComposeView.prototype._noSubjectOkCallback =
function(dialog) {
	this._noSubjectOkay = true;
	this._popDownAlertAndSendMsg(dialog);
};

//this is used by several kinds of alert dialogs
ZmComposeView.prototype._popDownAlertAndSendMsg =
function(dialog) {
	// not sure why: popdown (in FF) seems to create a race condition,
	// we can't get the attachments from the document anymore.
	// W/in debugger, it looks fine, but remove the debugger and any
	// alerts, and gotAttachments will return false after the popdown call.

	if (AjxEnv.isIE) {
		dialog.popdown();
	}
	// bug fix# 3209
	// - hide the dialog instead of popdown (since window will go away anyway)
	if (AjxEnv.isNav && appCtxt.isChildWindow) {
		dialog.setVisible(false);
	}

	// dont make any calls after sendMsg if child window since window gets destroyed
	if (appCtxt.isChildWindow && !AjxEnv.isNav) {
		this._controller.sendMsg();
	} else {
		// bug fix #3251 - call popdown BEFORE sendMsg
		dialog.popdown();
		this._controller.sendMsg();
	}
};

// User has canceled sending message without a subject
ZmComposeView.prototype._noSubjectCancelCallback =
function(dialog) {
	this.enableInputs(true);
	dialog.popdown();
	appCtxt.getKeyboardMgr().grabFocus(this._subjectField);
	this._controller.resetToolbarOperations();
	this.reEnableDesignMode();
};

ZmComposeView.prototype._errViaZimletOkCallback =
function(params) {
	var dialog = params.errDialog; 
	var zimletName = params.zimletName;
	//add this zimlet to ignoreZimlet string
	this._ignoredZimlets = this._ignoredZimlets || {};
	this._ignoredZimlets[zimletName] = true;
	this._popDownAlertAndSendMsg(dialog);
};

ZmComposeView.prototype._errViaZimletCancelCallback =
function(params) {
	var dialog = params.errDialog; 
	var zimletName = params.zimletName;
	this.enableInputs(true);
	dialog.popdown();
	this._controller.resetToolbarOperations();
	this.reEnableDesignMode();
};

// User has agreed to send message with bad addresses
ZmComposeView.prototype._badAddrsOkCallback =
function(dialog) {
	this.enableInputs(true);
	this._badAddrsOkay = true;
	dialog.popdown();
	this._controller.sendMsg();
};

// User has declined to send message with bad addresses - set focus to bad field
ZmComposeView.prototype._badAddrsCancelCallback =
function(type, dialog) {
	this.enableInputs(true);
	this._badAddrsOkay = false;
	dialog.popdown();
	if (this._using[type]) {
		appCtxt.getKeyboardMgr().grabFocus(this._field[type]);
	}
	this._controller.resetToolbarOperations();
	this.reEnableDesignMode();
};

// Files have been uploaded, re-initiate the send with an attachment ID.
ZmComposeView.prototype._attsDoneCallback =
function(isDraft, status, attId, docIds) {
	DBG.println(AjxDebug.DBG1, "Attachments: isDraft = " + isDraft + ", status = " + status + ", attId = " + attId);
	if (status == AjxPost.SC_OK) {
		this._controller._saveDraft(ZmComposeController.DRAFT_TYPE_AUTO, attId, docIds);
	} else if (status == AjxPost.SC_UNAUTHORIZED) {
		// auth failed during att upload - let user relogin, continue with compose action
		var ex = new AjxException("401 response during attachment upload", ZmCsfeException.SVC_AUTH_EXPIRED);
		var callback = new AjxCallback(this._controller, isDraft ? this._controller._saveDraft : this._controller._send);
		this._controller._handleException(ex, {continueCallback:callback});
	} else {
		// bug fix #2131 - handle errors during attachment upload.
		var msg = AjxMessageFormat.format(ZmMsg.errorAttachment, (status || AjxPost.SC_NO_CONTENT));
		switch (status) {
			// add other error codes/message here as necessary
			case AjxPost.SC_REQUEST_ENTITY_TOO_LARGE: 	msg += " " + ZmMsg.errorAttachmentTooBig + "<br><br>"; break;
			default: 									msg += " "; break;
		}

		this._controller.popupErrorDialog(msg + ZmMsg.errorTryAgain, null, null, true);
		this._controller.resetToolbarOperations();
	}
};


//Mandatory Spellcheck Callback
ZmComposeView.prototype._spellCheckShield =
function(words){
	if (words && words.available && words.misspelled != null && words.misspelled.length != 0) {
		var msgDialog = appCtxt.getYesNoMsgDialog();
		msgDialog.setMessage(AjxMessageFormat.format(ZmMsg.misspellingsMessage, [words.misspelled.length]));
		msgDialog.registerCallback(DwtDialog.YES_BUTTON, this._spellCheckShieldOkListener, this, [ msgDialog, words ] );
		msgDialog.registerCallback(DwtDialog.NO_BUTTON, this._spellCheckShieldCancelListener, this, msgDialog);
		msgDialog.associateEnterWithButton(DwtDialog.NO_BUTTON);
		msgDialog.popup(null, DwtDialog.NO_BUTTON);
	} else {
		this._spellCheckOkay = true;
		this._controller.sendMsg();
	}
};

ZmComposeView.prototype._spellCheckShieldOkListener =
function(msgDialog, words, ev){

	this._controller._toolbar.enableAll(true);

	this._controller.toggleSpellCheckButton(true);
	this._htmlEditor.discardMisspelledWords();

	this._spellCheckOkay = false;
	msgDialog.popdown();

	this._htmlEditor.onExitSpellChecker = new AjxCallback(this._controller, this._controller.toggleSpellCheckButton, true)
	this._htmlEditor._spellCheckCallback(words);
};

ZmComposeView.prototype._spellCheckShieldCancelListener =
function(msgDialog, ev){
	this._spellCheckOkay = true;
	msgDialog.popdown();
	this._controller.sendMsg();
};

ZmComposeView.prototype._setFormValue =
function() {
	this._origFormValue = this._formValue();
};

ZmComposeView.prototype._focusHtmlEditor =
function() {
	this._htmlEditor.focus();
};


// Static methods

// NOTE: this handler should only get triggered if/when contacts are DISABLED!
ZmComposeView._onKeyUp =
function(ev) {

	ev = DwtUiEvent.getEvent(ev);
	var element = DwtUiEvent.getTargetWithProp(ev, "id");
	if (!element) { return true; }
	var cv = AjxCore.objectWithId(element._composeView);

	if (element == cv._subjectField) {
		var key = DwtKeyEvent.getCharCode(ev);
		if (key == 3 || key == 13) {
			cv._focusHtmlEditor();
		}
	} else {
		cv._adjustAddrHeight(element);
	}
	return true;
};

ZmComposeView._onBlur =
function(ev) {

	var element = DwtUiEvent.getTargetWithProp(ev, "id");
	if (!element) { return true; }
	var cv = AjxCore.objectWithId(element._composeView);

	cv.updateTabTitle();

	return true;
};

// for com.zimbra.dnd zimlet
ZmComposeView.prototype.uploadFiles =
function() {
	var attachDialog = appCtxt.getAttachDialog();
	this._controller = AjxDispatcher.run("GetComposeController");
	var callback = new AjxCallback(this, this._attsDoneCallback, [true]);
	attachDialog.setUploadCallback(callback);
	attachDialog.upload(callback, document.getElementById("zdnd_form"));
};

ZmComposeView.prototype.deactivate =
function() {
	this._controller.inactive = true;
};
