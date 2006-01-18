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

/**
* Creates a new search with the given properties.
* @constructor
* @class
* This class represents a search to be performed on the server. It has properties for
* the different search parameters that may be used. It can be used for a regular search,
* or to search within a conv. The results are returned via a callback.
*
* @param appCtxt		[ZmAppCtxt]		the app context
* @param query			[string]		query string
* @param types			[AjxVector]		item types to search for
* @param sortBy			[constant]*		sort order
* @param offset			[int]*			starting point within result set
* @param limit			[int]*			number of results to return
* @param contactSource	[constant]*		where to search for contacts (GAL or personal)
* @param lastId			[int]*			ID of last item displayed (for pagination)
* @param lastSortVal	[string]*		value of sort field for above item
*/
function ZmSearch(appCtxt, params) {

	this._appCtxt = appCtxt;

	if (params) {
		this.query			= params.query;
		this.types			= params.types;
		this.sortBy			= params.sortBy;
		this.offset			= params.offset;
		this.limit			= params.limit;
		this.contactSource	= params.contactSource;
		this.lastId			= params.lastId;
		this.lastSortVal	= params.lastSortVal;
		this.fetch 			= params.fetch;
		
		this._parseQuery();
	}
};

// Search types
ZmSearch.TYPE = new Object();
ZmSearch.TYPE[ZmItem.CONV]		= "conversation";
ZmSearch.TYPE[ZmItem.MSG]		= "message";
ZmSearch.TYPE[ZmItem.CONTACT]	= "contact";
ZmSearch.TYPE[ZmItem.APPT]		= "appointment";
ZmSearch.TYPE[ZmItem.NOTE]		= "note";
ZmSearch.TYPE_ANY				= "any";

// Sort By
ZmSearch.DATE_DESC 	= "dateDesc";
ZmSearch.DATE_ASC 	= "dateAsc";
ZmSearch.SUBJ_DESC 	= "subjDesc";
ZmSearch.SUBJ_ASC 	= "subjAsc";
ZmSearch.NAME_DESC 	= "nameDesc";
ZmSearch.NAME_ASC 	= "nameAsc";
ZmSearch.SCORE_DESC = "scoreDesc";

ZmSearch.FOLDER_QUERY_RE = new RegExp('^in:\\s*"?(' + ZmOrganizer.VALID_PATH_CHARS + '+)"?\\s*$', "i");
ZmSearch.TAG_QUERY_RE = new RegExp('^tag:\\s*"?(' + ZmOrganizer.VALID_NAME_CHARS + '+)"?\\s*$', "i");
ZmSearch.UNREAD_QUERY_RE = new RegExp('\\bis:\\s*(un)?read\\b', "i");

ZmSearch.prototype.toString = 
function() {
	return "ZmSearch";
};

/**
* Creates a SOAP request that represents this search and sends it to the server.
*
* @param callback		[AjxCallback]*		(async) callback to run when response is received
* @param errorCallback	[AjxCallback]*		(async) callback to run if there is an exception
*/
ZmSearch.prototype.execute =
function(params) {

	if (!this.query) return;
	
	var isGalSearch = (this.contactSource == ZmSearchToolBar.FOR_GAL_MI);
	var soapDoc;
	if (isGalSearch) {
		soapDoc = AjxSoapDoc.create("SearchGalRequest", "urn:zimbraAccount");
		soapDoc.set("name", this.query);
	} else {
		soapDoc = AjxSoapDoc.create("SearchRequest", "urn:zimbraMail");
		var method = this._getStandardMethod(soapDoc);
		if (this.types) {
			var a = this.types.getArray();
			if (a.length) {
				var typeStr = new Array();
				for (var i = 0; i < a.length; i++)
					typeStr.push(ZmSearch.TYPE[a[i]]);
				method.setAttribute("types", typeStr.join(","));
				// special handling for showing participants ("To" instead of "From")
				if (this.folderId == ZmFolder.ID_SENT || this.folderId == ZmFolder.ID_DRAFTS)
					method.setAttribute("recip", "1");
				// if we're prefetching the first hit message, also mark it as read
				if (this.fetch) {
					method.setAttribute("fetch", "1");
					method.setAttribute("read", "1");
				}
			}
		}
	}
	
	var respCallback = new AjxCallback(this, this._handleResponseExecute, [isGalSearch, params.callback]);
	var execFrame = new AjxCallback(this, this.execute, params);
	this._appCtxt.getAppController().sendRequest({soapDoc: soapDoc, asyncMode: true, callback: respCallback,
												  errorCallback: params.errorCallback, execFrame: execFrame});
};

/*
* Convert the SOAP response into a ZmSearchResult and pass it along.
*/
ZmSearch.prototype._handleResponseExecute = 
function(isGalSearch, callback, result) {
	var response = result.getResponse();
	response = isGalSearch ? response.SearchGalResponse : response.SearchResponse;
	var searchResult = new ZmSearchResult(this._appCtxt, this);
	searchResult.set(response, this.contactSource);
	result.set(searchResult);
	
	callback.run(result);
};

// searching w/in a conv (to get its messages) has its own special command
ZmSearch.prototype.getConv = 
function(cid, callback) {
	if (!this.query || !cid) return;

	var soapDoc = AjxSoapDoc.create("SearchConvRequest", "urn:zimbraMail");
	var method = this._getStandardMethod(soapDoc);
	method.setAttribute("cid", cid);
	method.setAttribute("fetch", "1");	// fetch content of first msg
	method.setAttribute("read", "1");	// mark that msg read
	if (this._appCtxt.get(ZmSetting.VIEW_AS_HTML))
		method.setAttribute("html", "1");
	var respCallback = new AjxCallback(this, this._handleResponseGetConv, callback);
	this._appCtxt.getAppController().sendRequest({soapDoc: soapDoc, asyncMode: true, callback: respCallback});
};

ZmSearch.prototype._handleResponseGetConv = 
function(callback, result) {
	response = result.getResponse().SearchConvResponse;
	var searchResult = new ZmSearchResult(this._appCtxt, this);
	searchResult.set(response, null, true);
	result.set(searchResult);
	
	callback.run(result);
};

/**
* Returns a title that summarizes this search.
*/
ZmSearch.prototype.getTitle =
function() {
	var where = null;
	if (this.folderId) {
		var folderTree = this._appCtxt.getTree(ZmOrganizer.FOLDER);
		if (folderTree) {
			var folder = folderTree.getById(this.folderId);
			if (folder)
				where = folder.getName(true, ZmOrganizer.MAX_DISPLAY_NAME_LENGTH, true);
		}
	} else if (this.tagId) {
		var tagList = this._appCtxt.getTree(ZmOrganizer.TAG);
		if (tagList)
			where = tagList.getById(this.tagId).getName(true, ZmOrganizer.MAX_DISPLAY_NAME_LENGTH, true);
	}
	var title = where ? [ZmMsg.zimbraTitle, where].join(": ") : 
						[ZmMsg.zimbraTitle, ZmMsg.searchResults].join(": ");
	return title;
};

ZmSearch.prototype._getStandardMethod = 
function(soapDoc) {

	var method = soapDoc.getMethod();
	
	if (this.sortBy)
		method.setAttribute("sortBy", this.sortBy);

	if (this.lastId && this.lastSortVal) {
		// cursor is used for paginated searches
		var cursor = soapDoc.set("cursor");
		cursor.setAttribute("id", this.lastId);
		cursor.setAttribute("sortVal", this.lastSortVal);
	}

	this.offset = this.offset ? this.offset : 0;
	method.setAttribute("offset", this.offset);

	// always set limit (init to user pref for page size if not provided)
	this.limit = this.limit ? this.limit : this._appCtxt.get(ZmSetting.PAGE_SIZE);
	method.setAttribute("limit", this.limit);
	
	// and of course, always set the query
	soapDoc.set("query", this.query);

	return method;
};

/**
* Parse simple queries so we can do basic matching on new items (determine whether
* they match this search query). The following types of queries are handled:
*
*    in:foo
*    tag:foo
*
* which may result in this.folderId or this.tagId getting set.
*/
ZmSearch.prototype._parseQuery =
function() {
	var results = this.query.match(ZmSearch.FOLDER_QUERY_RE);
	if (results) {
		var path = results[1].toLowerCase();
		// first check if it's a system folder (name in query string may not match actual name)
		for (var id in ZmFolder.QUERY_NAME)
			if (ZmFolder.QUERY_NAME[id] == path)
				this.folderId = id;
		// now check all folders by name
		if (!this.folderId) {
			var folder = this._appCtxt.getTree(ZmOrganizer.FOLDER).getByPath(path);
			if (folder)
				this.folderId = folder.id;
		}
	}
	results = this.query.match(ZmSearch.TAG_QUERY_RE);
	if (results) {
		var name = results[1].toLowerCase();
		var tag = this._appCtxt.getTree(ZmOrganizer.TAG).getByName(name);
		if (tag)
			this.tagId = tag.id;
	}
	this.hasUnreadTerm = ZmSearch.UNREAD_QUERY_RE.test(this.query);
};

ZmSearch.prototype.hasFolderTerm =
function(path) {
	if (!path) return false;
	var regEx = new RegExp('\\s*in:\\s*"?(' + AjxStringUtil.regExEscape(path) + ')"?\\s*', "i");
	var regExNot = new RegExp('(-|not)\\s*in:\\s*"?(' + AjxStringUtil.regExEscape(path) + ')"?\\s*', "i");
	return (regEx.test(this.query) && !regExNot.test(this.query));
};

ZmSearch.prototype.replaceFolderTerm =
function(oldPath, newPath) {
	if (!(oldPath && newPath)) return;
	var regEx = new RegExp('(\\s*in:\\s*"?)(' + AjxStringUtil.regExEscape(oldPath) + ')("?\\s*)', "gi");
	this.query = this.query.replace(regEx, "$1" + newPath + "$3");
};

ZmSearch.prototype.hasTagTerm =
function(name) {
	if (!name) return false;
	var regEx = new RegExp('\\s*tag:\\s*"?(' + AjxStringUtil.regExEscape(name) + ')"?\\s*', "i");
	var regExNot = new RegExp('(-|not)\\s*tag:\\s*"?(' + AjxStringUtil.regExEscape(name) + ')"?\\s*', "i");
	return (regEx.test(this.query) && !regExNot.test(this.query));
};

ZmSearch.prototype.replaceTagTerm =
function(oldName, newName) {
	if (!(oldName && newName)) return;
	var regEx = new RegExp('(\\s*tag:\\s*"?)(' + AjxStringUtil.regExEscape(oldName) + ')("?\\s*)', "gi");
	this.query = this.query.replace(regEx, "$1" + newName + "$3");
};
