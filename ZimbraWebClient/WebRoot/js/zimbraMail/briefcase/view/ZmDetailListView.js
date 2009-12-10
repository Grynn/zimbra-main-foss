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

ZmDetailListView = 	function(parent, controller, dropTgt) {

	// save data
	//this._folderId = null;
	this._controller = controller;

	// call super constructor
	var headerList = this._getHeaderList(parent);
	ZmListView.call(this, {parent:parent, className:"ZmBriefcaseDetailListView", pageless:true,
					posStyle:DwtControl.ABSOLUTE_STYLE, view:ZmId.VIEW_BRIEFCASE_DETAIL, type:ZmItem.BRIEFCASE_ITEM,
					controller:controller, headerList:headerList, dropTgt:dropTgt, pageless:true});

	// create a action menu for the header list
	this._colHeaderActionMenu = new ZmPopupMenu(this);
	var actionListener = new AjxListener(this, this._colHeaderActionListener);
	for (var i = 0; i < headerList.length; i++) {
		var hCol = headerList[i];
		// lets not allow columns w/ relative width to be removed (for now) - it messes stuff up
		if (hCol._width) {
			var mi = this._colHeaderActionMenu.createMenuItem(hCol._id, {text:hCol._name, style:DwtMenuItem.CHECK_STYLE});
			mi.setData(ZmDetailListView.KEY_ID, hCol._id);
			mi.setChecked(true, true);
			this._colHeaderActionMenu.addSelectionListener(hCol._id, actionListener);
		}
	}
}

ZmDetailListView.prototype = new ZmListView;
ZmDetailListView.prototype.constructor = ZmDetailListView;

ZmDetailListView.prototype.toString =
function() {
	return "ZmDetailListView";
};

// Constants

ZmDetailListView.KEY_ID = "_keyId";

ZmDetailListView.COLWIDTH_ICON = 20;

// Protected methods

ZmDetailListView.prototype._getHeaderList =
function(parent) {
	// Columns: tag, name, type, size, date, owner, folder
	var headers = [];
	var view = this._view;
	if (appCtxt.get(ZmSetting.SHOW_SELECTION_CHECKBOX)) {
		headers.push(new DwtListHeaderItem({field:ZmItem.F_SELECTION, icon:"CheckboxUnchecked", width:ZmListView.COL_WIDTH_ICON,
											name:ZmMsg.selection}));
	}	
	if (appCtxt.get(ZmSetting.TAGGING_ENABLED)) {
		headers.push(new DwtListHeaderItem({field:ZmItem.F_TAG, icon:"Tag", width:ZmDetailListView.COLWIDTH_ICON,
											name:ZmMsg.tag}));
	}	
	headers.push(
		new DwtListHeaderItem({field:ZmItem.F_TYPE, icon:"Globe", width:ZmDetailListView.COLWIDTH_ICON}),
		new DwtListHeaderItem({field:ZmItem.F_SUBJECT, text:ZmMsg._name}),
		new DwtListHeaderItem({field:ZmItem.F_FILE_TYPE, text:ZmMsg.type, width:ZmMsg.COLUMN_WIDTH_TYPE_DLV}),
		new DwtListHeaderItem({field:ZmItem.F_SIZE, text:ZmMsg.size, width:ZmMsg.COLUMN_WIDTH_SIZE_DLV}),
		new DwtListHeaderItem({field:ZmItem.F_DATE, text:ZmMsg.date, width:ZmMsg.COLUMN_WIDTH_DATE_DLV}),
		new DwtListHeaderItem({field:ZmItem.F_FROM, text:ZmMsg.owner, width:ZmMsg.COLUMN_WIDTH_OWNER_DLV}),
		new DwtListHeaderItem({field:ZmItem.F_FOLDER, text:ZmMsg.folder, width:ZmMsg.COLUMN_WIDTH_FOLDER_DLV})
	);
	return headers;
};

ZmDetailListView.prototype._getCellContents =
function(htmlArr, idx, item, field, colIdx, params) {

	if (field == ZmItem.F_SELECTION) {
		var icon = params.bContained ? "CheckboxChecked" : "CheckboxUnchecked";
		idx = this._getImageHtml(htmlArr, idx, icon, this._getFieldId(item, field));
	} else if (field == ZmItem.F_TYPE) {
		var contentType = item.contentType;
		if (contentType && contentType.match(/;/)) {
			contentType = contentType.split(";")[0];
		}
		var mimeInfo = contentType ? ZmMimeTable.getInfo(contentType) : null;
		var icon = mimeInfo ? mimeInfo.image : "UnknownDoc" ;
		if (item.isFolder) {
			icon = "Folder";
		}
		htmlArr[idx++] = AjxImg.getImageHtml(icon);
	} else if (field == ZmItem.F_SUBJECT) {
		htmlArr[idx++] = "<div id='"+this._getFieldId(item,ZmItem.F_SUBJECT)+"'>"+AjxStringUtil.htmlEncode(item.name)+"</div>";
	} else if (field == ZmItem.F_FILE_TYPE) {
		var mimeInfo = item.contentType ? ZmMimeTable.getInfo(item.contentType) : null;
		htmlArr[idx++] = mimeInfo ? mimeInfo.desc : "&nbsp;";
	} else if (field == ZmItem.F_SIZE) {
		if (!item.isFolder) {
			htmlArr[idx++] = AjxUtil.formatSize(item.size);
		}
	} else if (field == ZmItem.F_DATE) {
		if (item.modifyDate) {
			htmlArr[idx++] = AjxDateUtil.simpleComputeDateStr(item.modifyDate);
		}
	} else if (field == ZmItem.F_FROM) {
		var creator = item.creator? item.creator.split("@") : [""];
		var cname = creator[0];
		var uname = appCtxt.get(ZmSetting.USERNAME);
		if (uname) {
			var user = uname.split("@");
			if (creator[1] != user[1]) {
				cname = creator.join("@");
			}
		}
		htmlArr[idx++] = "<span style='white-space: nowrap'>";
		htmlArr[idx++] = cname;
		htmlArr[idx++] = "</span>";
	} else if (field == ZmItem.F_FOLDER) {
		var briefcase = appCtxt.getById(item.folderId);
		htmlArr[idx++] = briefcase ? briefcase.getPath() : item.folderId;
	} else {
		idx = ZmListView.prototype._getCellContents.apply(this, arguments);
	}

	return idx;
};

// listeners

ZmDetailListView.prototype._colHeaderActionListener =
function(event) {
  	// TODO
};

//
// Private functions
//

ZmDetailListView.__typify =
function(array, type) {
	for (var i = 0; i < array.length; i++) {
		array[i]._type = type;
	}
};

ZmDetailListView.prototype.getTitle =
function() {
	//TODO: title is the name of the current folder
	return [ZmMsg.zimbraTitle, this._controller.getApp().getDisplayName()].join(": ");
};

//for ZimbraDnD to do make even more generic
ZmDetailListView.prototype.processUploadFiles =
function() {
	var files = [];
	var ulEle = document.getElementById('zdnd_ul');
    if (ulEle) {
        for (var i = 0; i < ulEle.childNodes.length; i++) {
            var liEle = ulEle.childNodes[i];
            var inputEl = liEle.childNodes[0];
            if (inputEl.name != "_attFile_") continue;
            if (!inputEl.value) continue;
            var file = {
                fullname: inputEl.value,
                name: inputEl.value.replace(/^.*[\\\/:]/, "")
            };
            files.push(file);
         }
   }
   return files;
}

ZmDetailListView.prototype.uploadFiles =
function() {
    var attachDialog = appCtxt.getUploadDialog();
    var app = this._controller.getApp();
    attachDialog._uploadCallback = new AjxCallback(app, app._handleUploadNewItem);
    var files = this.processUploadFiles();
    attachDialog.uploadFiles(files, document.getElementById("zdnd_form"), {id:this._controller._currentFolder});
};

ZmDetailListView.prototype._getToolTip =
function(params) {
	if (!params.item) { return; }
	return this._controller.getItemTooltip(params.item, this);
};

//end zimbradnd

ZmDetailListView.prototype._getItemCountType =
function() {
	return null;
};
