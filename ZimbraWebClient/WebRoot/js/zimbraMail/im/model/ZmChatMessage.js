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

ZmChatMessage = function(notifyJs, fromMe, isSystem) {
	if (notifyJs) {
		this.subject = notifyJs.subject;
		if (notifyJs.body != null && notifyJs.body.length > 0) {
			this.body = notifyJs.body[0]._content;
			this.isHtml = notifyJs.body[0].html;
		}
		this.from = notifyJs.from;
		this.to = notifyJs.to;
		this.thread = notifyJs.thread;
		this.ts = notifyJs.ts;
		this.error = notifyJs.error;
	}
	if (!this.ts) this.ts = new Date().getTime();
	this.fromMe = fromMe;
	this.isSystem = isSystem;
	this.htmlEncode = !this.isHtml;
	this.objectify = true;
};

ZmChatMessage.prototype.constructor = ZmChatMessage;

ZmChatMessage.prototype.toString =
function() {
	return "ZmChatMessage - from("+this.from+") body("+this.body+")";
};

ZmChatMessage.system =
function(body) {
    var zcm = new ZmChatMessage(null, false, true);
    zcm.body = body;
    return zcm;
};

ZmChatMessage.prototype.getShortTime =
function() {
	var formatter = AjxDateFormat.getTimeInstance(AjxDateFormat.SHORT);
	return formatter.format(new Date(this.ts));
};

ZmChatMessage.ALLOWED_HTML = /<(\x2f?)(span|font|a|b|strong|i|em|ding)(\s[^>]*)?>/ig;

ZmChatMessage.prototype.getHtmlBody = function(objectManager) {
    if (!this._htmlBody) {
        if (objectManager) {
            this._htmlBody = objectManager.findObjects(this.body, this.htmlEncode);
        } else {
            this._htmlBody = this.htmlEncode ? AjxStringUtil.htmlEncode(this.body) : this.body;
        }
    }
    return this._htmlBody;
};

ZmChatMessage.prototype.toText = function() {
	return AjxStringUtil.trim(AjxTemplate.expand("im.Chat#ChatMessagePlainText", this));
};

ZmChatMessage.prototype.toHtml = function() {
        return AjxStringUtil.trim(AjxTemplate.expand("im.Chat#ChatMessageHTML", this));
};

ZmChatMessage.prototype.displayHtml =
function(objectManager, chat, lastFrom) {
	var body;
	if (objectManager && this.objectify) {
		body = this.getHtmlBody(objectManager);
	} else {
		body = this.body.replace(/\r?\n/g, "<br/>");
		if (this.htmlEncode) {
			body = AjxStringUtil.htmlEncode(body);
		}
	}
	var params = { isSystem		 : this.isSystem,
		       fromMe		 : this.fromMe,
		       shortTime	 : AjxStringUtil.htmlEncode(this.getShortTime()),
		       body              : body
		     };
	if (!lastFrom || lastFrom != this.from)
		params.displayName = AjxStringUtil.htmlEncode(chat.getDisplayName(this.from, this.fromMe));
	var html = [];
	if (lastFrom && lastFrom != this.from)
		html.push("<div class='ZmChatWindowChatEntry-sep'>&nbsp;</div>");
	html.push(AjxTemplate.expand("im.Chat#ChatMessageLine", params));
	return html.join("");
};

ZmChatMessage.prototype.getErrorMessage = function() {
	return ZMsg["im." + this.error] || ZMsg["im.unknown_error"];
};

