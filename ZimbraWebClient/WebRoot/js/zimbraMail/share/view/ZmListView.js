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

ZmListView = function(params) {

	if (arguments.length == 0) { return; }
	
	params.id = params.id || ZmId.getViewId(params.view);
	DwtListView.call(this, params);

	this.view = params.view;
	this.type = params.type;
	this._controller = params.controller;
	this.setDropTarget(params.dropTgt);

	// create listeners for changes to the list model, folder tree, and tag list
	this._listChangeListener = new AjxListener(this, this._changeListener);
	this._tagListChangeListener = new AjxListener(this, this._tagChangeListener);
	var tagList = appCtxt.getTagTree();
	if (tagList) {
		tagList.addChangeListener(this._tagListChangeListener);
	}
	var folderTree = appCtxt.getFolderTree();
	if (folderTree) {
		folderTree.addChangeListener(new AjxListener(this, this._folderChangeListener));
	}

	this._handleEventType = {};
	this._handleEventType[this.type] = true;
	this._disallowSelection = {};
	this._disallowSelection[ZmItem.F_FLAG] = true;
}

ZmListView.prototype = new DwtListView;
ZmListView.prototype.constructor = ZmListView;

ZmListView.prototype.toString =
function() {
	return "ZmListView";
}

// column widths
ZmListView.COL_WIDTH_ICON 					= 19;
ZmListView.COL_WIDTH_NARROW_ICON			= 11;

// TD class for fields
ZmListView.FIELD_CLASS = {};
ZmListView.FIELD_CLASS[ZmItem.F_TYPE]		= "Icon";
ZmListView.FIELD_CLASS[ZmItem.F_FLAG]		= "Flag";
ZmListView.FIELD_CLASS[ZmItem.F_TAG]		= "Tag";
ZmListView.FIELD_CLASS[ZmItem.F_ATTACHMENT]	= "Attach";

ZmListView.ITEM_FLAG_CLICKED 				= DwtListView._LAST_REASON + 1;
ZmListView.DEFAULT_REPLENISH_THRESHOLD		= 0;

ZmListView.COL_JOIN = "|";

ZmListView.prototype._getHeaderList = function() {};

ZmListView.prototype.getController =
function() {
	return this._controller;
}

ZmListView.prototype.set =
function(list, sortField) {
	this.setSelectionHdrCbox(false);

	// bug fix #28595 - in multi-account, reset tag list change listeners
	if (appCtxt.multiAccounts) {
		var tagList = appCtxt.getTagTree();
		if (tagList) {
			tagList.addChangeListener(this._tagListChangeListener);
		}
	}

	var subList;
	if (list instanceof ZmList) {
		list.addChangeListener(this._listChangeListener);
		subList = list.getSubList(this.offset, this.getLimit());
	} else {
		subList = list;
	}
	DwtListView.prototype.set.call(this, subList, sortField);
};

ZmListView.prototype.setUI =
function(defaultColumnSort) {
	DwtListView.prototype.setUI.call(this, defaultColumnSort);
	this._resetColWidth();	// reset column width in case scrollbar is set
};

ZmListView.prototype.getLimit =
function() {
	return appCtxt.get(ZmSetting.PAGE_SIZE);
};

ZmListView.prototype.getReplenishThreshold =
function() {
	return ZmListView.DEFAULT_REPLENISH_THRESHOLD;
};

ZmListView.prototype._changeListener =
function(ev) {

	var item = this._getItemFromEvent(ev);
	if (!item || ev.handled || !this._handleEventType[item.type] && (this.type != ZmItem.MIXED)) { return; }

	if (ev.event == ZmEvent.E_TAGS || ev.event == ZmEvent.E_REMOVE_ALL) {
		DBG.println(AjxDebug.DBG2, "ZmListView: TAG");
		this._setImage(item, ZmItem.F_TAG, item.getTagImageInfo());
	}

	if (ev.event == ZmEvent.E_FLAGS) { // handle "flagged" and "has attachment" flags
		DBG.println(AjxDebug.DBG2, "ZmListView: FLAGS");
		var flags = ev.getDetail("flags");
		for (var j = 0; j < flags.length; j++) {
			var flag = flags[j];
			var on = item[ZmItem.FLAG_PROP[flag]];
			if (flag == ZmItem.FLAG_FLAGGED) {
				this._setImage(item, ZmItem.F_FLAG, on ? "FlagRed" : null);
			} else if (flag == ZmItem.FLAG_ATTACH) {
				this._setImage(item, ZmItem.F_ATTACHMENT, on ? "Attachment" : null);
			}
		}
	}

	if (ev.event == ZmEvent.E_DELETE || ev.event == ZmEvent.E_MOVE) {
		DBG.println(AjxDebug.DBG2, "ZmListView: DELETE or MOVE");
        this.removeItem(item, true);
        // if we've removed it from the view, we should remove it from the reference
        // list as well so it doesn't get resurrected via replenishment *unless*
		// we're dealing with a canonical list (i.e. contacts)
		if (ev.event != ZmEvent.E_MOVE || !this._controller._list.isCanonical)
			this._controller._list.remove(item);
		this._controller._app._checkReplenishListView = this;
		this._controller._resetToolbarOperations();
		this._controller._restoreFocus(this);
	}
};

ZmListView.prototype._getItemFromEvent =
function(ev) {
	var item = ev.item;
	if (!item) {
		var items = ev.getDetail("items");
		item = (items && items.length) ? items[0] : null;
	}
	return item;
};

ZmListView.prototype._checkReplenish =
function() {
	var respCallback = new AjxCallback(this, this._handleResponseCheckReplenish);
	this._controller._checkReplenish(respCallback);
};

ZmListView.prototype._handleResponseCheckReplenish =
function() {
	if (this.size() == 0) {
		this._controller._handleEmptyList(this);
	} else {
		this._controller._resetNavToolBarButtons(this._controller._getViewType());
		this._setNextSelection();
	}
};

ZmListView.prototype._folderChangeListener =
function(ev) {
	// make sure this is current list view
	if (appCtxt.getCurrentController() != this._controller) { return; }
	// see if it will be handled by app's postNotify()
	if (this._controller._app._checkReplenishListView == this) { return; }

	var organizers = ev.getDetail("organizers");
	var organizer = (organizers && organizers.length) ? organizers[0] : ev.source;

	var id = organizer.id;
	var fields = ev.getDetail("fields");
	if (ev.event == ZmEvent.E_MODIFY) {
		if (!fields) { return; }
		if (fields[ZmOrganizer.F_TOTAL]) {
			this._controller._resetNavToolBarButtons(this._controller._getViewType());
		}
	}
};

ZmListView.prototype._tagChangeListener =
function(ev) {
	if (ev.type != ZmEvent.S_TAG) return;

	var fields = ev.getDetail("fields");
	if (ev.event == ZmEvent.E_MODIFY && (fields && fields[ZmOrganizer.F_COLOR])) {
		var divs = this._getChildren();
		var tag = ev.getDetail("organizers")[0];
		for (var i = 0; i < divs.length; i++) {
			var item = this.getItemFromElement(divs[i]);
			if (item && item.tags && (item.tags.length == 1) && (item.tags[0] == tag.id))
				this._setImage(item, ZmItem.F_TAG, item.getTagImageInfo());
		}
	} else if(ev.event == ZmEvent.E_DELETE) {
		var divs = this._getChildren();
		var tag = ev.getDetail("organizers")[0];
		for (var i=0; i < divs.length; i++) {
			var item = this.getItemFromElement(divs[i]);
			var nTagId = ZmOrganizer.normalizeId(tag.id);
			if (item && item.tags && item.hasTag(nTagId)) {
				 item.tagLocal(nTagId, false);
				 this._setImage(item, ZmItem.F_TAG, item.getTagImageInfo());
			}
		}
	}
}

// returns all child divs for this list view
ZmListView.prototype._getChildren =
function() {
	return this._parentEl.childNodes;
}

// Common routines for createItemHtml()

ZmListView.prototype._getRowId =
function(item) {
	return DwtId.getListViewItemId(DwtId.WIDGET_ITEM_FIELD, this._view, item ? item.id : Dwt.getNextId(), ZmItem.F_ITEM_ROW);
};

// Note that images typically get IDs in _getCellContents().
ZmListView.prototype._getCellId =
function(item, field) {
	return (field == ZmItem.F_DATE)
		? this._getFieldId(item, field)
		: DwtListView.prototype._getCellId.apply(this, arguments);
};

ZmListView.prototype._getCellClass =
function(item, field, params) {
	return ZmListView.FIELD_CLASS[field];
};

ZmListView.prototype._getCellContents =
function(htmlArr, idx, item, field, colIdx, params) {
	if (field == ZmItem.F_SELECTION) {
		idx = this._getImageHtml(htmlArr, idx, "TaskCheckbox", this._getFieldId(item, field));
	} else if (field == ZmItem.F_TYPE) {
		idx = this._getImageHtml(htmlArr, idx, ZmItem.ICON[item.type], this._getFieldId(item, field));
	} else if (field == ZmItem.F_FLAG) {
		idx = this._getImageHtml(htmlArr, idx, item.isFlagged ? "FlagRed" : null, this._getFieldId(item, field));
	} else if (field == ZmItem.F_TAG) {
		idx = this._getImageHtml(htmlArr, idx, item.getTagImageInfo(), this._getFieldId(item, field));
	} else if (field == ZmItem.F_ATTACHMENT) {
		idx = this._getImageHtml(htmlArr, idx, item.hasAttach ? "Attachment" : null, this._getFieldId(item, field));
	} else if (field == ZmItem.F_DATE) {
		htmlArr[idx++] = AjxDateUtil.computeDateStr(params.now || new Date(), item.date);
	} else if (field == ZmItem.F_PRIORITY) {
        var priorityImage = null;
        if (item.isHighPriority) {
            priorityImage = "PriorityHigh_list";
        } else if (item.isLowPriority) {
			priorityImage = "PriorityLow_list";
		} else {
			priorityImage = "PriorityNormal_list";
		}
        idx = this._getImageHtml(htmlArr, idx, priorityImage, this._getFieldId(item, field));
	} else {
		idx = DwtListView.prototype._getCellContents.apply(this, arguments);
	}

	return idx;
};

ZmListView.prototype._getImageHtml =
function(htmlArr, idx, imageInfo, id) {
	imageInfo = imageInfo || "Blank_16";
	var idText = id ? ["id='", id, "'"].join("") : null;
	htmlArr[idx++] = AjxImg.getImageHtml(imageInfo, null, idText);
	return idx;
};

ZmListView.prototype._setImage =
function(item, field, imageInfo) {
	var img = this._getElement(item, field);
	if (img && img.parentNode) {
		imageInfo = imageInfo || "Blank_16";
		AjxImg.setImage(img.parentNode, imageInfo);
	}
};

ZmListView.prototype._getFragmentSpan =
function(item) {
	return ["<span class='ZmConvListFragment' id='",
			this._getFieldId(item, ZmItem.F_FRAGMENT),
			"'>", this._getFragmentHtml(item), "</span>"].join("");
};

ZmListView.prototype._getFragmentHtml =
function(item) {
	return [" - ", AjxStringUtil.htmlEncode(item.fragment, true)].join("");
};

/**
 * Parse the DOM ID to figure out what got clicked. IDs consist of three to five parts
 * joined by the "|" character.
 *
 *		type		type of ID (zli, zlir, zlic, zlif) - see DwtId.WIDGET_ITEM*)
 * 		view		view identifier (eg "TV")
 * 		item ID		usually numeric
 * 		field		field identifier (eg "fg") - see ZmId.FLG_*
 * 		participant	index of participant
 */
ZmListView.prototype._parseId =
function(id) {
	var parts = id.split(DwtId.SEP);
	if (parts && parts.length) {
		return {view:parts[1], item:parts[2], field:parts[3], participant:parts[4]};
	} else {
		return null;
	}
};

ZmListView.prototype._mouseOverAction =
function(ev, div) {
	DwtListView.prototype._mouseOverAction.call(this, ev, div);
	var id = ev.target.id || div.id;
	if (!id) { return true; }

	// check if we're hovering over a column header
	var data = this._data[div.id];
	var type = data.type;
	if (type && type == DwtListView.TYPE_HEADER_ITEM) {
		var itemIdx = data.index;
		var field = this._headerList[itemIdx]._field;
		this.setToolTipContent(this._getHeaderToolTip(field, itemIdx));
	} else {
		var match = this._parseId(id);
		if (match && match.field) {
			var item = this.getItemFromElement(div);
			this.setToolTipContent(this._getToolTip(match.field, item, ev, div, match));
		}
	}
	return true;
};

ZmListView.prototype._mouseOutAction =
function(ev, div) {
	DwtListView.prototype._mouseOutAction.call(this, ev, div);

	var id = ev.target.id || div.id;
	if (!id) { return true; }

	var data = this._data[div.id];
	var type = data.type;
	if (type && type == DwtListView.TYPE_LIST_ITEM) {
		var m = this._parseId(id);
		if (m && m.field) {
			if (m.field == ZmItem.F_SELECTION) {
				var origClassName = this._getItemData(div, "origSelClassName");
				if (origClassName) {
					ev.target.className = origClassName;
				}
			} else if (m.field == ZmItem.F_FLAG) {
				var item = this.getItemFromElement(div);
				if (!item.isFlagged) {
					AjxImg.setImage(ev.target, "Blank_16", true);
				}
			}
		}
	}

	return true;
};

ZmListView.prototype._doubleClickAction =
function(ev, div) {
	var id = ev.target.id ? ev.target.id : div.id;
	if (!id) { return true; }

	var m = this._parseId(id);
	return (!(m && (m.field == ZmItem.F_FLAG)));
};

ZmListView.prototype._itemClicked =
function(clickedEl, ev) {
	if (appCtxt.get(ZmSetting.SHOW_SELECTION_CHECKBOX) && ev.button == DwtMouseEvent.LEFT) {
		if (!ev.shiftKey && !ev.ctrlKey) {
			// get the field being clicked
			var id = (ev.target.id && ev.target.id.indexOf("AjxImg") == -1)	? ev.target.id : clickedEl.id;
			var m = id ? this._parseId(id) : null;
			if (m && m.field == ZmItem.F_SELECTION) {
				if (this._selectedItems.size() == 1) {
					var sel = this._selectedItems.get(0);
					var item = this.getItemFromElement(sel);
					var selFieldId = item ? this._getFieldId(item, ZmItem.F_SELECTION) : null;
					var selField = selFieldId ? document.getElementById(selFieldId) : null;
					if (selField && sel == clickedEl) {
						var origClass = this._getItemData(sel, "origSelClassName");
						if (origClass == "ImgTaskCheckboxCompleted") {
							selField.className = "ImgTaskCheckbox";
							this._setItemData(sel, "origSelClassName", "ImgTaskCheckbox");
						} else if (origClass == "ImgTaskCheckbox") {
							selField.className = "ImgTaskCheckboxCompleted";
							this._setItemData(sel, "origSelClassName", "ImgTaskCheckboxCompleted");
							return;
						}
					} else {
						if (selField && selField.className == "ImgTaskCheckbox") {
							DwtListView.prototype.deselectAll.call(this);
						}
					}
				}
				var bContained = this._selectedItems.contains(clickedEl);
				this.setMultiSelection(clickedEl, bContained);
				return;	// do not call base class if "selection" field was clicked
			}
		} else if (ev.shiftKey) {
			// uncheck all selected items first
			this._checkSelectedItems(false);

			// run base class first so we get the finalized list of selected items
			DwtListView.prototype._itemClicked.call(this, clickedEl, ev);

			// recheck new list of selected items
			this._checkSelectedItems(true);

			return;
		}
	}

	DwtListView.prototype._itemClicked.call(this, clickedEl, ev);
};

ZmListView.prototype._columnClicked =
function(clickedCol, ev) {
	DwtListView.prototype._columnClicked.call(this, clickedCol, ev);

	if (appCtxt.get(ZmSetting.SHOW_SELECTION_CHECKBOX)) {
		var list = this.getList();
		var size = list ? list.size() : null;
		if (size > 0) {
			var idx = this._data[clickedCol.id].index;
			var item = this._headerList[idx];
			if (item && item._id.indexOf(ZmItem.F_SELECTION) != -1) {
				var hdrId = DwtId.getListViewHdrId(DwtId.WIDGET_HDR_ICON, this._view, item._field);
				var hdrDiv = document.getElementById(hdrId);
				if (hdrDiv) {
					if (hdrDiv.className == "ImgTaskCheckboxCompleted") {
						this.deselectAll();
						hdrDiv.className = "ImgTaskCheckbox";
					} else {
						hdrDiv.className = "ImgTaskCheckboxCompleted";
						this.setSelectedItems(this._list.getArray());
					}
				}
			}
			this._controller._resetToolbarOperations();
		}
	}
};

ZmListView.prototype.handleKeyAction =
function(actionCode, ev) {
	var rv = DwtListView.prototype.handleKeyAction.call(this, actionCode, ev);

	if (actionCode == DwtKeyMap.SELECT_ALL) {
		this._controller._resetToolbarOperations();
	}

	return rv;
};

ZmListView.prototype.setMultiSelection =
function(clickedEl, bContained, ev) {
	if (ev && ev.ctrlKey && this._selectedItems.size() == 1) {
		this._checkSelectedItems(true);
	}

	// call base class
	DwtListView.prototype.setMultiSelection.call(this, clickedEl, bContained);

	this.setSelectionCbox(clickedEl, bContained);
	this.setSelectionHdrCbox(this.getSelection().length == this.getList().size());

	// reset toolbar operations LAST
	this._controller._resetToolbarOperations();
};

ZmListView.prototype.setSelectionCbox =
function(obj, bContained) {
	if (!obj) { return; }

	var item = obj.tagName ? this.getItemFromElement(obj) : obj;
	var selFieldId = item ? this._getFieldId(item, ZmItem.F_SELECTION) : null;
	var selField = selFieldId ? document.getElementById(selFieldId) : null;
	if (selField) {
		selField.className = bContained ? "ImgTaskCheckbox" : "ImgTaskCheckboxCompleted";
		this._setItemData(obj, "origSelClassName", selField.className);
	}
};

ZmListView.prototype.setSelectionHdrCbox =
function(check) {
	var col = this._headerHash ? this._headerHash[ZmItem.F_SELECTION] : null;
	var hdrId = col ? DwtId.getListViewHdrId(DwtId.WIDGET_HDR_ICON, this._view, col._field) : null;
	var hdrDiv = hdrId ? document.getElementById(hdrId) : null;
	if (hdrDiv) {
		hdrDiv.className = check
			? "ImgTaskCheckboxCompleted"
			: "ImgTaskCheckbox";
	}
};

ZmListView.prototype.setSelectedItems =
function(selectedArray) {
	DwtListView.prototype.setSelectedItems.call(this, selectedArray);

	if (appCtxt.get(ZmSetting.SHOW_SELECTION_CHECKBOX)) {
		this._checkSelectedItems(true);
	}
};

ZmListView.prototype.deselectAll =
function() {
	if (appCtxt.get(ZmSetting.SHOW_SELECTION_CHECKBOX)) {
		this._checkSelectedItems(false);
	}

	DwtListView.prototype.deselectAll.call(this);
};

ZmListView.prototype._checkSelectedItems =
function(check) {
	var sel = this.getSelection();
	for (var i = 0; i < sel.length; i++) {
		this.setSelectionCbox(sel[i], !check);
	}

	this.setSelectionHdrCbox(sel.length == this.getList().size());
};

ZmListView.prototype._setNoResultsHtml =
function() {
	DwtListView.prototype._setNoResultsHtml.call(this);
	this.setSelectionHdrCbox(false);
};

ZmListView.prototype._getHeaderToolTip =
function(field, itemIdx, isFolder) {
    var tooltip = null;
    if (field == ZmItem.F_FLAG) {
        tooltip = ZmMsg.flag;
    } else if (field == ZmItem.F_PRIORITY){
        tooltip = ZmMsg.priority;
    } else if (field == ZmItem.F_TAG) {
        tooltip = ZmMsg.tag;
    } else if (field == ZmItem.F_ATTACHMENT) {
        tooltip = ZmMsg.attachment;
    } else if (field == ZmItem.F_SUBJECT) {
        tooltip = (this._headerList[itemIdx]._sortable)
                ? ZmMsg.sortBySubject : ZmMsg.subject;
    } else if (field == ZmItem.F_DATE) {
        tooltip = (this._headerList[itemIdx]._sortable)
                ? (isFolder && isFolder.sent) ? ZmMsg.sortBySent : (isFolder && isFolder.drafts) ? ZmMsg.sortByLastSaved : ZmMsg.sortByReceived : ZmMsg.date;
    } else if (field == ZmItem.F_FROM) {
        tooltip = (this._headerList[itemIdx]._sortable)
                ? (isFolder && (isFolder.sent || isFolder.drafts)) ? ZmMsg.sortByTo : ZmMsg.sortByFrom : (isFolder && (isFolder.sent || isFolder.drafts)) ? ZmMsg.to : ZmMsg.from ;
    } else if ( field == ZmItem.F_SIZE){
        tooltip = (this._headerList[itemIdx]._sortable)
                ? ZmMsg.sortBySize : ZmMsg.sizeToolTip;
    }
    return tooltip;
};

ZmListView.prototype._getToolTip =
function(field, item, ev, div, match) {
    var tooltip;
    if (field == ZmItem.F_SELECTION) {
		this._setItemData(div, "origSelClassName", ev.target.className);
        if (ev.target.className != "ImgTaskCheckboxCompleted") {
            ev.target.className = "ImgTaskCheckboxCompleted";
        }
    } else if (field == ZmItem.F_FLAG) {
        if (!item.isFlagged) {
            AjxImg.setDisabledImage(ev.target, "FlagRed", true);
        }
    } else if (field == ZmItem.F_PRIORITY) {
        if (item.isHighPriority) {
            tooltip = ZmMsg.highPriorityTooltip;
        } else if (item.isLowPriority) {
            tooltip = ZmMsg.lowPriorityTooltip;
        }
    } else if (field == ZmItem.F_TAG) {
        tooltip = this._getTagToolTip(item);
    } else if (field == ZmItem.F_ATTACHMENT) {
        // disable att tooltip for now, we only get att info once msg is loaded
        // tooltip = this._getAttachmentToolTip(item);
    } else if (field == ZmItem.F_DATE) {
        tooltip = this._getDateToolTip(item, div);
    }
    return tooltip;
};

ZmListView.prototype._getTagToolTip =
function(item) {
	if (!item) { return };
	var numTags = item.tags.length;
	if (!numTags) { return };
	var tagList = appCtxt.getTagTree();
	var tags = item.tags;
	var html = [];
	var idx = 0;
    for (var i = 0; i < numTags; i++) {
		var tag = tagList.getById(tags[i]);
        if (!tag) { continue; }        
        html[idx++] = "<table><tr><td>";
		html[idx++] = AjxImg.getImageHtml(ZmTag.COLOR_ICON[tag.color]);
		html[idx++] = "</td><td valign='middle'>";
		html[idx++] = AjxStringUtil.htmlEncode(tag.name);
		html[idx++] = "</td></tr></table>";
	}
	return html.join("");
}

ZmListView.prototype._getAttachmentToolTip =
function(item) {
	var tooltip = null;
	var atts = item && item.attachments ? item.attachments : [];
	if (atts.length == 1) {
		var info = ZmMimeTable.getInfo(atts[0].ct);
		tooltip = info ? info.desc : null;
	} else if (atts.length > 1) {
		tooltip = AjxMessageFormat.format(ZmMsg.multipleAttachmentsTooltip, [atts.length]);
	}
	return tooltip;
};

ZmListView.prototype._getDateToolTip =
function(item, div) {
	div._dateStr = div._dateStr || this._getDateToolTipText(item.date);
	return div._dateStr;
};

ZmListView.prototype._getDateToolTipText =
function(date, prefix) {
	if (!date) { return ""; }
	var dateStr = [];
	var i = 0;
	dateStr[i++] = prefix;
	var dateFormatter = AjxDateFormat.getDateTimeInstance(AjxDateFormat.FULL, AjxDateFormat.MEDIUM);
	dateStr[i++] = dateFormatter.format(new Date(date));
	var delta = AjxDateUtil.computeDateDelta(date);
	if (delta) {
		dateStr[i++] = "<br><center><span style='white-space:nowrap'>(";
		dateStr[i++] = delta;
		dateStr[i++] = ")</span></center>";
	}
	return dateStr.join("");
};

/*
* Add a few properties to the list event for the listener to pick up.
*/
ZmListView.prototype._setListEvent =
function (ev, listEv, clickedEl) {

	DwtListView.prototype._setListEvent.call(this, ev, listEv, clickedEl);

	var id = (ev.target.id && ev.target.id.indexOf("AjxImg") == -1) ? ev.target.id : clickedEl.id;
	if (!id) return false; // don't notify listeners

	var m = this._parseId(id);
	if (ev.button == DwtMouseEvent.LEFT) {
		this._selEv.field = m ? m.field : null;
	} else if (ev.button == DwtMouseEvent.RIGHT) {
		this._actionEv.field = m ? m.field : null;
		if (m && m.field) {
			if (m.field == ZmItem.F_PARTICIPANT) {
				var item = this.getItemFromElement(clickedEl);
				this._actionEv.detail = item.participants ? item.participants.get(m.participant) : null;
			}
		}
	}
	return true;
};

ZmListView.prototype._allowLeftSelection =
function(clickedEl, ev, button) {
	// We only care about mouse events
	if (!(ev instanceof DwtMouseEvent)) { return true; }

	var id = (ev.target.id && ev.target.id.indexOf("AjxImg") == -1) ? ev.target.id : clickedEl.id;
	var data = this._data[clickedEl.id];
	var type = data.type;
	if (id && type && type == DwtListView.TYPE_LIST_ITEM) {
		var m = this._parseId(id);
		if (m && m.field) {
			return this._allowFieldSelection(m.item, m.field);
		}
	}
	return true;
}

ZmListView.prototype._allowFieldSelection =
function(id, field) {
	return (!this._disallowSelection[field]);
};

ZmListView.prototype._sortColumn =
function(columnItem, bSortAsc) {
	// change the sort preference for this view in the settings
	var sortBy;
	switch (columnItem._sortable) {
		case ZmItem.F_FROM:		sortBy = bSortAsc ? ZmSearch.NAME_ASC : ZmSearch.NAME_DESC; break;
		case ZmItem.F_SUBJECT:	sortBy = bSortAsc ? ZmSearch.SUBJ_ASC : ZmSearch.SUBJ_DESC;	break;
		case ZmItem.F_DATE:		sortBy = bSortAsc ? ZmSearch.DATE_ASC : ZmSearch.DATE_DESC;	break;
	}

	if (sortBy) {
		this._sortByString = sortBy;
		appCtxt.set(ZmSetting.SORTING_PREF, sortBy, this.view);
	}
};

ZmListView.prototype._setNextSelection =
function() {
	// set the next appropriate selected item
	if (this.firstSelIndex < 0) {
		this.firstSelIndex = 0;
	}
	var item = this._list.get(this.firstSelIndex) || this._list.getLast();
	if (item) {
		this.setSelection(item, false);
	}
};

ZmListView.prototype._relayout =
function() {
	DwtListView.prototype._relayout.call(this);
	this._checkColumns();
	
};

ZmListView.prototype._checkColumns =
function() {
	var numCols = this._headerList.length;
	var fields = [];
	for (var i = 0; i < numCols; i++) {
		var headerCol = this._headerList[i];
		fields.push(headerCol._field + (headerCol._visible ? "" : "*"));
	}
	var value = fields.join(ZmListView.COL_JOIN);
	value = (value == this._defaultCols) ? "" : value;
	appCtxt.set(ZmSetting.LIST_VIEW_COLUMNS, value, this.view);
	
	this._getActionMenuForColHeader(true); // re-create action menu so order is correct
};
