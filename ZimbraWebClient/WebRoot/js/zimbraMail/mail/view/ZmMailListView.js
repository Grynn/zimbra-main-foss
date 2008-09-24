/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2004, 2005, 2006, 2007 Zimbra, Inc.
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

ZmMailListView = function(params) {

	if (arguments.length == 0) { return; }
	
	ZmListView.call(this, params);

	this._folderId = null;
};

ZmMailListView.prototype = new ZmListView;
ZmMailListView.prototype.constructor = ZmMailListView;


// Public methods

ZmMailListView.prototype.toString = 
function() {
	return "ZmMailListView";
};

// Reset row style
ZmMailListView.prototype.markUIAsRead = 
function(item) {
	var row = this._getElement(item, ZmItem.F_ITEM_ROW);
	if (row) {
		row.className = this._getRowClass(item);
	}
};

ZmMailListView.prototype.set =
function(list, sortField) {
	this._folderId = (list && list.search) ? list.search.folderId : null;
	ZmListView.prototype.set.call(this, list, sortField);
    this.markDefaultSelection(list);
};

ZmMailListView.prototype.markDefaultSelection =
function(list) {
	if(window.defaultSelection) {
		var sel = [];
		var a = list.getArray();
		for(var i in a) {
			if(window.defaultSelection[a[i].id]) {
				sel.push(a[i]);
			}
		}
		if(sel.length >0) {
			this.setSelectedItems(sel);
		}
		window.defaultSelection = null;
	}
};

ZmMailListView.prototype.getTitle =
function() {
	var search = this._controller._activeSearch ? this._controller._activeSearch.search : null;
	return search ? search.getTitle() : "";
};

ZmMailListView.prototype.replenish = 
function(list) {
	DwtListView.prototype.replenish.call(this, list);
	this._resetColWidth();
};

ZmMailListView.prototype.resetHeight =
function(newHeight) {
	this.setSize(Dwt.DEFAULT, newHeight);
	Dwt.setSize(this._parentEl, Dwt.DEFAULT, newHeight - DwtListView.HEADERITEM_HEIGHT);
};

// Private / protected methods

ZmMailListView.prototype._getHeaders =
function(viewId, headerList, headerHash) {
	var hList = [];

	this._defaultCols = headerList.join(ZmListView.COL_JOIN);
	var userHeaders = appCtxt.get(ZmSetting.LIST_VIEW_COLUMNS, viewId);
	var headers = userHeaders ? userHeaders.split(ZmListView.COL_JOIN) : headerList;
	for (var i = 0, len = headers.length; i < len; i++) {
		var header = headers[i];
		var field = header.substr(0, 2);
		var hdrParams = headerHash[field];
		if (!hdrParams) { continue; }
		var pre = hdrParams.precondition;
		if (!pre || appCtxt.get(pre)) {
			hdrParams.field = field;
			hdrParams.visible = (header.indexOf("*") == -1);
			hList.push(new DwtListHeaderItem(hdrParams));
		}
	}

	return hList;
};

ZmMailListView.prototype._resetFromColumnLabel =
function() {
	var isFolder = this._isSentOrDraftsFolder();

	// set the from column name based on query string
	var headerCol = this._headerHash[ZmItem.F_FROM];
	if (headerCol) {
		var colLabel = (isFolder.sent || isFolder.drafts) ? ZmMsg.to : ZmMsg.from;

		var fromColSpan = document.getElementById(DwtId.getListViewHdrId(DwtId.WIDGET_HDR_LABEL, this._view, headerCol._field));
		if (fromColSpan) {
			fromColSpan.innerHTML = "&nbsp;" + colLabel;
		}
		if (this._colHeaderActionMenu) {
			this._colHeaderActionMenu.getItem(headerCol._index).setText(colLabel);
		}
	}

	return isFolder;
};

ZmMailListView.prototype._isSentOrDraftsFolder =
function() {
	var folder = appCtxt.getById(this._folderId);
	var isSentFolder = folder && (folder.isUnder(ZmFolder.ID_SENT) || folder.isUnder(ZmFolder.ID_OUTBOX));
	var isDraftsFolder = folder && folder.isUnder(ZmFolder.ID_DRAFTS);

	// XXX: is the code below necessary?
	// if not in Sent/Drafts, deep dive into query to be certain
	if (!isSentFolder && !isDraftsFolder) {
		// check for is:sent or is:draft w/in search query
		var idx = null, query = null;
		var curSearch = this._controller._app.currentSearch;
		if (curSearch) {
			query = curSearch.query;
			idx = query.indexOf(":");
		}
		if (idx) {
			var prefix = AjxStringUtil.trim(query.substring(0, idx));
			if (prefix == "is") {
				var folderStr = AjxStringUtil.trim(query.substring(idx + 1));
				isSentFolder = (folderStr == ZmFolder.QUERY_NAME[ZmFolder.ID_SENT]);
				isDraftsFolder = (folderStr == ZmFolder.QUERY_NAME[ZmFolder.ID_DRAFTS]);
			}
		}
	}
	return {sent:isSentFolder, drafts:isDraftsFolder};
};

ZmMailListView.prototype._getRowClass =
function(item) {
	return item.isUnread ? "Unread" : null;
};

ZmMailListView.prototype._getCellId =
function(item, field) {
	return (field == ZmItem.F_SIZE || field == ZmItem.F_SUBJECT)
		? this._getFieldId(item, field)
		: ZmListView.prototype._getCellId.apply(this, arguments);
};

ZmMailListView.prototype._getHeaderToolTip =
function(field, itemIdx) {
    var isFolder = this._isSentOrDraftsFolder();
    return (field == ZmItem.F_STATUS)
		? ZmMsg.messageStatus
		: ZmListView.prototype._getHeaderToolTip.call(this, field, itemIdx, isFolder);
};

ZmMailListView.prototype._getToolTip =
function(field, item, ev, div, match) {
	if (!item) { return; }
	var tooltip = null;
	if (field == ZmItem.F_STATUS) {
		if (item.isDraft)			{ tooltip = ZmMsg.draft; }
		else if (item.isUnread)		{ tooltip = ZmMsg.unread; }
		else if (item.isReplied)	{ tooltip = ZmMsg.replied; }
		else if (item.isForwarded)	{ tooltip = ZmMsg.forwarded; }
		else if (item.isSent)		{ tooltip = ZmMsg.sentAt; }
		else if (item.isInvite())		{ tooltip = ZmMsg.appointment; }
		else						{ tooltip = ZmMsg.read; }
	} else if (field == ZmItem.F_FROM || field == ZmItem.F_PARTICIPANT) {
		tooltip = this._getParticipantToolTip(item.getAddress(AjxEmailAddress.FROM));
	} else if (field == ZmItem.F_SUBJECT) {
		if ((item.type == ZmItem.MSG) && item.isInvite() && item.needsRsvp()) {
			tooltip = item.invite.getToolTip();
		} else if (appCtxt.get(ZmSetting.SHOW_FRAGMENTS)) {
		    tooltip = AjxStringUtil.htmlEncode(item.fragment || ZmMsg.fragmentIsEmpty);
            if (tooltip == "") {
				tooltip = null;
			}
        }
	} else if (field == ZmItem.F_FOLDER) {
		var folder = appCtxt.getById(item.folderId);
		if (folder && folder.parent) {
			var name = folder.getName();
			var path = folder.getPath();
			if (path != name) {
				tooltip = path;
			}
		}
	} else {
		tooltip = ZmListView.prototype._getToolTip.apply(this, arguments);
	}
	
	return tooltip;
};

ZmMailListView.prototype._getParticipantToolTip =
function(address) {
	if (!address) { return; }
	var toolTip;
	var addr = address.getAddress();
	if (appCtxt.get(ZmSetting.CONTACTS_ENABLED) && addr) {
		var contactApp = appCtxt.getApp(ZmApp.CONTACTS);
		var contacts = AjxDispatcher.run("GetContacts");
		var contact = contacts ? contacts.getContactByEmail(addr) : null;
		if (contact) {
			toolTip = contact.getToolTip(addr);
		}
	}
		
	if (!toolTip) {
		var addrstr = address.toString();
		if (addrstr) {
			toolTip = AjxTemplate.expand("abook.Contacts#TooltipNotInAddrBook", {addrstr:addrstr});
		}
    }

	return toolTip;
};

// Figure out how many of the participants will fit into a given pixel width.
// We always include the originator, and then as many of the most recent participants
// as possible. If any have been elided (either by the server or because they don't
// fit), there will be an ellipsis after the originator.
//
// The length of a participants string is determined mathematically. Since each letter
// is assumed to be an em in width, the calculated length is significantly longer than
// the actual length. The only way I've found to get the actual length is to create
// invisible divs and measure them, but that's expensive. The calculated length seems to
// run about 50% greater than the actual length, so we use a 30% fudge factor. The text 
// that's tested is bolded, since that's bigger and the conv may be unread.
//
// Returns a list of objects with name and original index.
ZmMailListView.prototype._fitParticipants = 
function(participants, participantsElided, width) {
	// fudge factor since we're basing calc on em width; the actual ratio is around 1.5
	width = width * 1.3;
	// only one participant, no need to test width
	if (participants.length == 1) {
		var p = participants[0];
		var name = p.name ? p.name : p.dispName;
		var tmp = {name: AjxStringUtil.htmlEncode(name), index: 0};
		return [tmp];
	}
	// create a list of "others" (not the originator)
	var list = new Array();
	for (var i = 0; i < participants.length; i++) {
		var tmp = {name: AjxStringUtil.htmlEncode(participants[i].dispName), index: i};
		list.push(tmp);
	}
	var origLen = list.length;
	var originator = list.shift();
	// test originator + others
	// if it's too big, remove the oldest from others
	while (list.length) {
		var test = [originator];
		test = test.concat(list);
		var text;
		var tmp = new Array();
		var w = 0;
		for (var i = 0; i < test.length; i++)
			w = w + (test[i].name.length * DwtUnits.WIDTH_EM); // total width of names
		if ((test.length == origLen) && !participantsElided) {
			w = w + (test.length - 1) * DwtUnits.WIDTH_SEP; // none left out, comma join
			for (var i = 0; i < test.length; i++)
				tmp.push(test[i].name);
			text = tmp.join(", ");
		} else {
			w = w + DwtUnits.WIDTH_ELLIPSIS;				// some left out, add in ellipsis
			w = w + (test.length - 2) * DwtUnits.WIDTH_SEP; // and remaining commas
			for (var i = 0; i < list.length; i++)
				tmp.push(list[i].name);
			text = originator.name + AjxStringUtil.ELLIPSIS + tmp.join(", ");
		}
		//DBG.println(AjxDebug.DBG3, "calc width of [" + text + "] = " + w);
		if (w <= width) {
			return test;
		} else {
			list.shift();
		}
	}
	return [originator];
};

ZmMailListView.prototype._getActionMenuForColHeader =
function(force) {
	var doReset = (!this._colHeaderActionMenu || force);

	var menu = ZmListView.prototype._getActionMenuForColHeader.call(this, force);

	if (doReset) {
		this._resetFromColumnLabel();
	}

	return menu;
};

ZmMailListView.prototype._getNoResultsMessage =
function() {
	if (appCtxt.isOffline) {
		// offline folders which are "syncable" but currently not syncing should
		// display a different message
		var fid = ZmOrganizer.getSystemId(this._controller._getSearchFolderId());
		var folder = (fid != null) ? appCtxt.getById(fid) : null;
		if (folder) {
			if (folder.nId == ZmFolder.ID_ARCHIVE) {
				var link = "ZmMailListView.createLocalFolder('" + folder.nId + "', '" + this._htmlElId + "');";
				return AjxMessageFormat.format(ZmMsg.archiveHint, link);
			}
			else if (folder.isOfflineSyncable && !folder.isOfflineSyncing) {
				var link = "ZmMailListView.toggleSync('" + folder.id + "', '" + this._htmlElId + "');";
				return AjxMessageFormat.format(ZmMsg.notSyncing, link);
			}
		}
	}

	return DwtListView.prototype._getNoResultsMessage.call(this);
};

ZmMailListView.createLocalFolder =
function(folderId, htmlElementId) {
	var folder = appCtxt.getById(folderId);
	var htmlEl = folder ? document.getElementById(htmlElementId) : null;
	var listview = htmlEl ? DwtControl.fromElement(htmlEl) : null;
	if (listview) {
		var dlg = appCtxt.getNewFolderDialog();
		var cb = listview._controller.getNewFolderCallback();
		ZmController.showDialog(dlg, cb, folder);
	}
};

ZmMailListView.toggleSync =
function(folderId, htmlElementId) {
	var folder = appCtxt.getById(folderId);
	var htmlEl = folder ? document.getElementById(htmlElementId) : null;
	var listview = htmlEl ? DwtControl.fromElement(htmlEl) : null;
	if (listview) {
		var callback = new AjxCallback(listview, listview._handleToggleSync);
		folder.toggleSyncOffline(callback);
	}
};

ZmMailListView.prototype._handleToggleSync =
function() {
	appCtxt.getAppController().sendSync();
	// bug fix #27846 - just clear the list view and let instant notify populate
	this.removeAll(true);
};


// Listeners

ZmMailListView.prototype._changeListener =
function(ev) {

	var item = this._getItemFromEvent(ev);
	if (!item || ev.handled || !this._handleEventType[item.type]) { return; }

	if (ev.event == ZmEvent.E_FLAGS) { // handle "unread" flag
		DBG.println(AjxDebug.DBG2, "ZmMailListView: FLAGS");
		var flags = ev.getDetail("flags");
		for (var j = 0; j < flags.length; j++) {
			var flag = flags[j];
			if (flag == ZmItem.FLAG_UNREAD) {
				var on = item[ZmItem.FLAG_PROP[flag]];
				this.markUIAsRead(item, !on);
			}
		}
	}
	
	if (ev.event == ZmEvent.E_CREATE) {
		DBG.println(AjxDebug.DBG2, "ZmMailListView: CREATE");
		var sortIndex = ev.getDetail("sortIndex");
		if (this._list && this._list.contains(item)) { return; } // skip if we already have it
		if (!this._handleEventType[item.type]) { return; }

		// Check to see if ZmMailList::notifyCreate gave us an index for the item.
		// If not, we assume that the new conv/msg is the most recent one. The only case
		// we handle is where the user is on the first page.
		//
		// TODO: handle other sort orders, arbitrary insertion points
		var index = sortIndex || 0;
		if ((this.offset == 0) && (!this._sortByString || this._sortByString == ZmSearch.DATE_DESC)) {
			this.addItem(item, index);
		}
		ev.handled = true;
	}

	if (!ev.handled) {
		ZmListView.prototype._changeListener.call(this, ev);
	}
};

/**
 * If we're showing content in the reading pane and there is exactly one item selected,
 * make sure the content is for that selected item. Otherwise, clear the content.
 */
ZmMailListView.prototype._itemClicked =
function(clickedEl, ev) {

	ZmListView.prototype._itemClicked.apply(this, arguments);
	
	var ctlr = this._controller;
	if (ctlr.isReadingPaneOn && ctlr.isReadingPaneOn()) {
		if (appCtxt.get(ZmSetting.SHOW_SELECTION_CHECKBOX) && ev.button == DwtMouseEvent.LEFT) {
			if (!ev.shiftKey && !ev.ctrlKey) {
				// get the field being clicked
				var id = (ev.target.id && ev.target.id.indexOf("AjxImg") == -1) ? ev.target.id : clickedEl.id;
				var m = id ? this._parseId(id) : null;
				if (m && m.field == ZmItem.F_SELECTION) {
					if (this.getSelectionCount() == 1) {
						var item = this.getSelection()[0];
						var msg = (item instanceof ZmConv) ? item.getFirstHotMsg() : item;
						if (msg && ctlr._curMsg && (msg.id != ctlr._curMsg.id)) {
							ctlr.reset();
						}
					}
				}
			}
		}
	}
};
