/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2005, 2006, 2007, 2008, 2009, 2010 Zimbra, Inc.
 *
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.3 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * ***** END LICENSE BLOCK *****
 */

/**
 * Creates a list view for time suggestions
 * @constructor
 * @class
 *
 *  @author Sathishkumar Sugumaran
 *
 * @param parent			[ZmScheduleAssistantView]	the smart scheduler view
 * @param controller		[ZmApptComposeController]	the appt compose controller
 * @param apptEditView		[ZmApptEditView]	        the appt edit view
 */
ZmTimeSuggestionView = function(parent, controller, apptEditView) {

    var headerList = this._getHeaderList();
	ZmListView.call(this, {parent: parent, posStyle: DwtControl.RELATIVE_STYLE, view: ZmId.VIEW_SCHEDULE_PANE, headerList: headerList});

	this._controller = controller;
	this._editView = apptEditView;

	this._rendered = false;
	this._kbMgr = appCtxt.getKeyboardMgr();
    this._normalClass = DwtListView.ROW_CLASS;
    this._selectedClass = [DwtListView.ROW_CLASS, DwtCssStyle.SELECTED].join("-");
    this.setMultiSelect(false);
};

ZmTimeSuggestionView.prototype = new ZmListView;
ZmTimeSuggestionView.prototype.constructor = ZmTimeSuggestionView;

ZmTimeSuggestionView.SHOW_MORE_VALUE = '-1';
ZmTimeSuggestionView.F_LABEL = 'ts';
ZmTimeSuggestionView.COL_NAME	= "t";

ZmTimeSuggestionView.prototype.set =
function(params) {

    this._itemsById = params.itemsById;
    this._itemsByIdx = params.itemsByIdx;
    this._totalUsers = params.totalUsers;
    this._totalLocations = params.totalLocations;
    this._duration = params.duration;
    this._startDate = params.timeFrame.start;

    ZmListView.prototype.set.call(this, params.list);

    var hdrLabelId = DwtId.getListViewHdrId(DwtId.WIDGET_HDR_LABEL, this._view, ZmTimeSuggestionView.COL_NAME);
    var labelCell = document.getElementById(hdrLabelId);
    labelCell.innerHTML = AjxMessageFormat.format(ZmMsg.suggestedTimeLabel, [this._startDate]);    
};

ZmTimeSuggestionView.prototype._createItemHtml =
function (item) {
    var id = this.associateItemWithElement(item, null, null, null);

    var attendeeImage = "AttendeeOrange";
    var locationImage = "LocationOrange";

    if(item.availableUsers == this._totalUsers) attendeeImage = "AttendeeGreen";
    if(item.availableLocations == this._totalLocations) locationImage = "LocationGreen";

    if(item.availableUsers < Math.ceil(this._totalUsers/2)) attendeeImage = "AttendeeRed";
    if(item.availableLocations < Math.ceil(this._totalLocations/2)) locationImage = "LocationRed";

    var params = {
        id: id,
        item: item,
        timeLabel: AjxDateFormat.getTimeInstance(AjxDateFormat.SHORT).format(new Date(item.startTime)),
        locationCountStr: AjxMessageFormat.format(ZmMsg.availableRoomsCount, [item.availableLocations]),
        attendeeImage: attendeeImage,
        locationImage: locationImage,
        totalUsers: this._totalUsers, 
        totalLocations: this._totalLocations
    };
    return AjxTemplate.expand("calendar.Appointment#TimeSuggestion", params);
};

ZmTimeSuggestionView.prototype._getHeaderList =
function() {
    this._headerItem = (new DwtListHeaderItem({field:ZmTimeSuggestionView.COL_NAME, text:'&nbsp;'}));
	return [
	    this._headerItem	
	];
};

ZmTimeSuggestionView.prototype._itemSelected =
function(itemDiv, ev) {
    ZmListView.prototype._itemSelected.call(this, itemDiv, ev);

    var item = this.getItemFromElement(itemDiv);
    if(item) {
        this.switchLocationSelect(item, itemDiv.id, ev);
        this._editView.setDate(new Date(item.startTime), new Date(item.endTime));
    }
};


ZmTimeSuggestionView.prototype.switchLocationSelect =
function(item, id, ev) {
    var locId = id + "_loc";

    var locationC = document.getElementById(locId);
    if(!locationC) return;

    var roomsAvailable = (item.locations.length > 0);

    if(!this._locSelect && !roomsAvailable) {
        return;
    }

    if(roomsAvailable) locationC.innerHTML = "";

    if(!this._locSelect) {
        this._locSelect = new DwtSelect({parent:this, parentElement: locId});
        this._locSelect.addChangeListener(new AjxListener(this, this._locationListener));
        this._locSelect.dynamicButtonWidth();
    }else {
        if(roomsAvailable) this._locSelect.reparentHtmlElement(locId);
        this._locSelect.clearOptions();
        if(this._locSelect.itemId != id) this._restorePrevLocationInfo();
    }

    this._locSelect.itemId = id;
    this._locSelect.itemInfo = item;

    var location, name, locationObj;
    for (var i = item.locations.length; --i >=0;) {
        location = this._itemsByIdx[item.locations[i]];
        locationObj = this._itemsById[location];
        name = location;
        if(locationObj) {
            name = locationObj.getAttr(ZmResource.F_locationName) || locationObj.getAttr(ZmResource.F_name);
        }
        this._locSelect.addOption(name, false, location);

        if(item.locations.length - i > 20) {
            this._locSelect.addOption(ZmMsg.showMore, false, ZmTimeSuggestionView.SHOW_MORE_VALUE);
            break;
        }
    }

    //user clicked the link directly
    if (ev.target && (ev.target.className == "fakeAnchor")) {
        this._locSelect.popup();        
    }

    this.handleLocationOverflow();
};

ZmTimeSuggestionView.prototype.handleLocationOverflow =
function() {
    var locTxt = this._locSelect.getText();
    if(locTxt && locTxt.length > 15) {
        locTxt = locTxt.substring(0, 15) + '...';
        this._locSelect.setText(locTxt);
    }
};

ZmTimeSuggestionView.prototype._restorePrevLocationInfo =
function() {
    var prevId = this._locSelect.itemId;
    var prevItemDiv = document.getElementById(prevId);
    var prevItem = prevItemDiv ? this.getItemFromElement(prevItemDiv) : null;
    if(prevItem) {
        var prevLoc = document.getElementById(prevId + '_loc');
        prevLoc.innerHTML = '<span class="fakeAnchor">' + AjxMessageFormat.format(ZmMsg.availableRoomsCount, [prevItem.availableLocations]) + '</span>';
    }
};

ZmTimeSuggestionView.prototype._locationListener =
function() {
    var id = this._locSelect.getValue();

    if(id == ZmTimeSuggestionView.SHOW_MORE_VALUE) {
        this.showMore(this._locSelect.itemInfo);
        return;
    }

    var location = this._itemsById[id];
    if(location) {
        this._editView.updateLocation(location, this._locSelect.getSelectedOption() ? this._locSelect.getSelectedOption().getDisplayValue() : id);
    }
    this.handleLocationOverflow();
};

ZmTimeSuggestionView.prototype.setNoAttendeesHtml =
function() {
    this.removeAll();
    var	div = document.createElement("div");
    div.innerHTML = AjxTemplate.expand("calendar.Appointment#TimeSuggestion-NoAttendees");
    this._addRow(div);
};

ZmTimeSuggestionView.prototype._setNoResultsHtml =
function() {
	var	div = document.createElement("div");
	var subs = {
		message: this._getNoResultsMessage(),
		type: this.type
	};
	div.innerHTML = AjxTemplate.expand("calendar.Appointment#TimeSuggestion-NoSuggestions", subs);
	this._addRow(div);
};

ZmTimeSuggestionView.prototype._getNoResultsMessage =
function() {
    var durationStr = AjxDateUtil.computeDuration(this._duration);
    return AjxMessageFormat.format(ZmMsg.noSuggestionsFound, [this._startDate, durationStr]);
};

ZmTimeSuggestionView.prototype.setLoadingHtml =
function() {
    this.removeAll();
    var	div = document.createElement("div");
    div.innerHTML = AjxTemplate.expand("calendar.Appointment#TimeSuggestion-Loading");
    this._addRow(div);
};

ZmTimeSuggestionView.prototype.showMore =
function(locationInfo) {

    var location, name, locationObj, items = new AjxVector();
    for (var i = locationInfo.locations.length; --i >=0;) {
        location = this._itemsByIdx[locationInfo.locations[i]];
        locationObj = this._itemsById[location];
        if(locationObj) items.add(locationObj)
    }

    var attendeePicker = this._editView.getAttendeePicker(ZmCalBaseItem.LOCATION);
    attendeePicker.showSuggestedItems(items);    
};

