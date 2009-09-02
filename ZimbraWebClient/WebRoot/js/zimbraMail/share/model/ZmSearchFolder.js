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

ZmSearchFolder = function(params) {
	params.type = ZmOrganizer.SEARCH;
	ZmFolder.call(this, params);
	
	if (params.query) {
		var account = this.accountId && appCtxt.accountList.getAccount(this.accountId);
		var searchParams = {
			query:params.query,
			types:params.types,
			sortBy:params.sortBy,
			searchId:params.id,
			accountName:(account && account.name)
		};
		this.search = new ZmSearch(searchParams);
	}
};

ZmSearchFolder.ID_ROOT = ZmOrganizer.ID_ROOT;

ZmSearchFolder.create =
function(params) {
	var soapDoc = AjxSoapDoc.create("CreateSearchFolderRequest", "urn:zimbraMail");
	var searchNode = soapDoc.set("search");
	searchNode.setAttribute("name", params.name);
	searchNode.setAttribute("query", params.search.query);
	if (params.search.types) {
		var a = params.search.types.getArray();
		if (a.length) {
			var typeStr = [];
			for (var i = 0; i < a.length; i++) {
				typeStr.push(ZmSearch.TYPE[a[i]]);
			}
			searchNode.setAttribute("types", typeStr.join(","));
		}
	}
	if (params.search.sortBy) {
		searchNode.setAttribute("sortBy", params.search.sortBy);
	}
	searchNode.setAttribute("l", params.parent.id);
	appCtxt.getAppController().sendRequest({
		soapDoc: soapDoc,
		asyncMode: true,
		accountName: params.accountName,
		errorCallback: (new AjxCallback(null, ZmOrganizer._handleErrorCreate, params))
	});
};

ZmSearchFolder.prototype = new ZmFolder;
ZmSearchFolder.prototype.constructor = ZmSearchFolder;

ZmSearchFolder.prototype.toString =
function() {
	return "ZmSearchFolder";
};

ZmSearchFolder.prototype.getIcon = 
function() {
	return (this.nId == ZmOrganizer.ID_ROOT) ? null : "SearchFolder";
};

ZmSearchFolder.prototype.getToolTip = function() {};

/*
* Returns the organizer with the given ID. Looks in this organizer's tree first.
* Since a search folder may have either a regular folder or another search folder
* as its parent, we may need to get the parent folder from another type of tree.
*
* @param parentId	[int]		ID of the organizer to find
*/
ZmSearchFolder.prototype._getNewParent =
function(parentId) {
	var parent = appCtxt.getById(parentId);
	if (parent) {
		return parent;
	}
	
	return appCtxt.getById(parentId);
};

