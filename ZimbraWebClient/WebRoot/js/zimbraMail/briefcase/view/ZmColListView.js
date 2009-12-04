/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2007, 2008 Zimbra, Inc.
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

ZmColListView =	function(parent, controller, dropTgt, index) {

	// save data
	//this._folderId = null;
	this._controller = controller;
	var view = ZmId.VIEW_BRIEFCASE_COLUMN;
	controller._currentView = view;//cdel
	this._colIdx = index;

	ZmListView.call(this, {parent:parent, className:"ZmColListView",
						   view:view, type:ZmItem.DOCUMENT, id:ZmId.getViewId(view, index),
						   controller:controller, headerList:this._getHeaderList(parent),
						   dropTgt:dropTgt, pageless:true});
	
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

// Protected methods

ZmColListView.prototype._getHeaderList =
function(parent) {
	return null;
};

ZmColListView.prototype._getCellContents =
function(htmlArr, idx, item, field, colIdx, params) {
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
	htmlArr[idx++] = "<td style='vertical-align:middle;' width='100%' id='"+this._getFieldId(item,ZmItem.F_SUBJECT)+"'>&nbsp;";
	htmlArr[idx++] =    AjxStringUtil.htmlEncode(item.name);
	htmlArr[idx++] = "</td>";

    htmlArr[idx++] = "<td style='vertical-align:middle;' width='16' align='right' id='"+this._getFieldId(item,ZmItem.F_SUBJECT)+"'>";
    if(item.tags.length > 0){
	    idx = this._getImageHtml(htmlArr, idx, item.getTagImageInfo(), this._getFieldId(item, ZmItem.F_TAG));
    }
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
	return [ZmMsg.zimbraTitle, this._controller.getApp().getDisplayName()].join(": ");
};

ZmColListView.prototype._itemClicked =
function(clickedEl, ev) {
	this._controller._listView[ZmId.VIEW_BRIEFCASE_COLUMN] = this;
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

ZmColListView.prototype._mouseOverAction =
function(ev, div) {
	DwtListView.prototype._mouseOverAction.call(this, ev, div);
	var id = ev.target.id || div.id;
	if (!id) return true;
	
	if (div) {
		var item = this.getItemFromElement(div);
		if(item && !item.isFolder){
		this.setToolTipContent(this._getToolTip({item:item, ev:ev, div:div}));
		}
	}
	return true;
};

ZmColListView.prototype._getToolTip =
function(params) {
	if (!params.item) { return; }
	return this._controller.getItemTooltip(params.item, this);
};

ZmColListView.prototype._getScrollDiv =
function() {
	return this.parent._colDivs[this._colIdx];
};
