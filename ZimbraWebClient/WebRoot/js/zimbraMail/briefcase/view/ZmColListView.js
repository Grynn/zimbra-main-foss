/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: ZPL 1.2
 *
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.2 ("License"); you may not use this file except in
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
 * Portions created by Zimbra are Copyright (C) 2006 Zimbra, Inc.
 * All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK *****
 */

ZmColListView = 	function(parent, controller, dropTgt, index) {

	// save data
	//this._folderId = null;
	this._controller = controller;

	// call super constructor
	var headerList = this._getHeaderList(parent);
	var view = ZmController.BRIEFCASE_COLUMN_VIEW;
	controller._currentView = view;//cdel
	ZmListView.call(this, parent, "ZmColListView", null, view, ZmItem.DOCUMENT, controller, headerList, dropTgt);
	
	this._colIdx = index;
	// create a action menu for the header list
	
	//adding the listeners in constructors so that we get listener events
	//for all new columns created on fly
	this._controller._addListListeners(this);	
	
}

ZmColListView.prototype = new ZmListView;
ZmColListView.prototype.constructor = ZmColListView;

ZmColListView.prototype.toString = function() {
	return "ZmColListView";
};

// Constants

ZmColListView.KEY_ID = "_keyId";

ZmColListView.COLWIDTH_ICON 			= 20;
ZmColListView.COLWIDTH_NAME			= 160;
ZmColListView.COLWIDTH_TYPE			= 80;
ZmColListView.COLWIDTH_SIZE 			= 45;
ZmColListView.COLWIDTH_DATE 			= 80;
ZmColListView.COLWIDTH_OWNER			= 80;
ZmColListView.COLWIDTH_FOLDER			= 100;

// Protected methods

ZmColListView.prototype._getHeaderList = function(parent) {
	return null;
/*	var headers = [];
	headers.push(
		new DwtListHeaderItem(ZmItem.F_TYPE, null, "Globe", ZmDetailListView.COLWIDTH_ICON, null, null, false, null),
		new DwtListHeaderItem(ZmItem.F_SUBJECT, ZmMsg._name, null, ZmDetailListView.COLWIDTH_NAME, null, false, false, null)	
	);
	return headers;*/
};

ZmColListView.prototype._getCellAttrText =
function(item, field, params) {
	if (field == ZmItem.F_SIZE) {
		return "align='right'";
	} else if (field == ZmItem.F_TYPE) {
		return "align='middle'";
	}
};

ZmColListView.prototype._getCellContents =
function(htmlArr, idx, item, field, colIdx, params) {
	DBG.println("item.name:"+item.name+","+field);//cdel
	
	var contentType = item.contentType;
	if(contentType && contentType.match(/;/)) {
			contentType = contentType.split(";")[0];
	}
	var mimeInfo = contentType ? ZmMimeTable.getInfo(contentType) : null;
	var icon = mimeInfo ? mimeInfo.image : "UnknownDoc" ;
	if(item.isFolder){
		icon = "Folder";
	}

	idx = this._getTable(htmlArr, idx, params);
	idx = this._getRow(htmlArr, idx, item, params);
	
	htmlArr[idx++] = "<td style='vertical-align:middle;' width=20><center>";
	htmlArr[idx++] = AjxImg.getImageHtml(icon);
	htmlArr[idx++] = "</center></td>";
	htmlArr[idx++] = "<td style='vertical-align:middle;'>&nbsp;";
	htmlArr[idx++] = AjxStringUtil.htmlEncode(item.name);
	htmlArr[idx++] = "</td>";

	htmlArr[idx++] = "</tr></table>";

	return idx;
};

// listeners

ZmColListView.prototype._colHeaderActionListener = function(event) {
  	// TODO
};

//
// Private functions
//

ZmColListView.__typify = function(array, type) {
	for (var i = 0; i < array.length; i++) {
		array[i]._type = type;
	}
};

ZmColListView.prototype.getTitle =
function() {
	//TODO: title is the name of the current folder
	return [ZmMsg.zimbraTitle].join(": ");
};

ZmColListView.prototype.set =
function(folderId) {
	this._folderId = folderId;
	var element = this.getHtmlElement();
	
	var items = this._controller.getItemsInFolderFromCache(folderId);

	var list = new AjxVector();
	for(var i in items){
		list.add(items[i]);
	}

	DwtListView.prototype.set.call(this,list);	

	//cdel
	if(!this._controller.isRefreshing()){
		this._controller._currentFolder = folderId;
		this._controller._object = folderId;
	}
	//this.parent.updateColumn(this,folderId);
};

ZmColListView.prototype._itemClicked =
function(clickedEl, ev) {
	this._controller._listView[ZmController.BRIEFCASE_COLUMN_VIEW] = this;
	ZmListView.prototype._itemClicked.call(this,clickedEl,ev);
	var items = this.getSelection();
	this.parent.removeChildColumns(this._colIdx);
	this.parent.setCurrentListView(this);				
	if(items && items.length ==1){
		if(items[0].isFolder){
			this.parent.expandFolder(items[0].id);
		}else{
			this.parent.showFileProps(items[0]);
		}
	}
};

ZmColListView.prototype._resetColWidth =
function() {
	return;
};

ZmColListView.prototype.getColumnIndex =
function() {
	return this._colIdx;
};

ZmColListView.prototype.setNextColumn =
function(listView) {
	this._nextColumn = listView;	
};

ZmColListView.prototype.getNextColumn =
function( ) {
	return this._nextColumn;
};

ZmColListView.prototype.setPreviousColumn =
function(listView){
	this._previousColumn = listView;
};

ZmColListView.prototype.getPreviousColumn =
function( ) {
	return this._previousColumn;
};
