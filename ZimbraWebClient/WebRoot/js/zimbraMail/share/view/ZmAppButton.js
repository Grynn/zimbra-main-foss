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

/**
 * Button that behaves like a tab button, designed specifically for the row of
 * app buttons below the search bar.
 * 
 * - cannot have a menu
 * - does not support enabled/disabled
 *
 * @author Conrad Damon
 */
ZmAppButton = function(parent, className, icon, text, id) {
	if (arguments.length == 0) return;

    var style = DwtLabel.IMAGE_LEFT;
    DwtButton.call(this, {parent:parent, style:style, className:className,
    					  posStyle:DwtControl.RELATIVE_STYLE, id:id});

    this.setImage(icon);
    this.setText(text);
};

ZmAppButton.prototype = new DwtButton;
ZmAppButton.prototype.constructor = ZmAppButton;

ZmAppButton.prototype.toString =
function() {
	return "ZmAppButton";
};

//
// Data
//

ZmAppButton.prototype.TEMPLATE = "share.Widgets#ZmAppChooserButton";

//
// Public methods
//

ZmAppButton.prototype.setSelected = function(selected) {
    this.isSelected = selected;
    this.setDisplayState(selected ? DwtControl.SELECTED : DwtControl.NORMAL);
};

ZmAppButton.prototype.setDisplayState = function(state) {
    if (this.isSelected && state != DwtControl.SELECTED) {
        state = [DwtControl.SELECTED, state].join(" ");
    }
    DwtButton.prototype.setDisplayState.call(this, state);
};

ZmAppButton.prototype.getKeyMapName =
function() {
	return "ZmAppButton";
};

ZmAppButton.prototype.handleKeyAction =
function(actionCode, ev) {
    DBG.println("ZmAppButton.prototype.handleKeyAction");
	switch (actionCode) {

		case DwtKeyMap.SELECT:
			if (this.isListenerRegistered(DwtEvent.SELECTION)) {
				var selEv = DwtShell.selectionEvent;
				selEv.item = this;
				this.notifyListeners(DwtEvent.SELECTION, selEv);
			}
			break;

		default:
			return false;
	}
	return true;
};

/**
 * App toolbar buttons user ZHover instead of ZFocused
 */
ZmAppButton.prototype._focus =
function() {
    this.setDisplayState(DwtControl.HOVER);
};
