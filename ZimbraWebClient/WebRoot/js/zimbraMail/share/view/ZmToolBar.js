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

/**
 * Creates a toolbar.
 * @const
 * @class
 * This class represents a basic toolbar which can add buttons, manage listeners, and
 * enable/disabled its buttons.
 *
 * @author Conrad Damon
 *
 * @param params		[hash]				hash of params:
 *        parent		[DwtComposite]		the containing widget
 *        className		[string]*			CSS class
 *        posStyle		[constant]*			positioning style
 *        id			[string]*			an explicit ID to use for the control's HTML element
 *        controller	[ZmController]*		owning controller
 */
ZmToolBar = function(params) {
	if (arguments.length == 0) return;

	params.posStyle = params.posStyle || DwtControl.ABSOLUTE_STYLE;
	DwtToolBar.call(this, params);

	var controller = params.controller || appCtxt.getCurrentController();
	if (controller) {
		this._controller = controller;
		this._keyMap = ZmKeyMap.MAP_NAME_R[this._controller.getKeyMapName()];
	}
	this._buttons = {};
};

ZmToolBar.prototype = new DwtToolBar;
ZmToolBar.prototype.constructor = ZmToolBar;

ZmToolBar.prototype.toString = 
function() {
	return "ZmToolBar";
};

ZmToolBar.prototype.addSelectionListener =
function(buttonId, listener) {
	var button = this._buttons[buttonId];
	if (button) {
		button.addSelectionListener(listener);
	}
};

ZmToolBar.prototype.removeSelectionListener =
function(buttonId, listener) {
	var button = this._buttons[buttonId];
	if (button) {
		button.removeSelectionListener(listener);
	}
};

ZmToolBar.prototype.getButton =
function(buttonId) {
	return this._buttons[buttonId];
};

ZmToolBar.prototype.setData = 
function(buttonId, key, data) {
	this._buttons[buttonId].setData(key, data);
};

/**
* Enables/disables buttons.
*
* @param ids		a list of button IDs
* @param enabled	whether to enable the buttons
*/
ZmToolBar.prototype.enable =
function(ids, enabled) {
	ids = (ids instanceof Array) ? ids : [ids];
	for (var i = 0; i < ids.length; i++) {
		if (this._buttons[ids[i]]) {
			this._buttons[ids[i]].setEnabled(enabled);
		}
	}
};

ZmToolBar.prototype.enableAll =
function(enabled) {
	for (var i in this._buttons) {
		this._buttons[i].setEnabled(enabled);
	}
};

/**
 * Adds a button to this toolbar.
 *
 * @param params		[hash]			hash of params:
 *        id			[string]		button ID
 *        constructor	[function]*		Constructor for button object (default is DwtToolBarButton)
 *        template		[string]*		button template
 *        text			[string]*		button text
 *        tooltip		[string]*		button tooltip text
 *        image			[string]*		icon class for the button
 *        disImage		[string]*		disabled version of icon
 *        enabled		[boolean]*		if true, button is enabled
 *        className		[constant]*		CSS class name
 *        style			[constant]*		button style
 *        index			[int]*			position at which to add the button
 *        shortcut		[constant]*		shortcut ID (from ZmKeyMap) for showing hint
 *        menu			[AjxCallback or DwtMenu]*	Menu creation callback (recommended) or menu
 *        menuAbove		[boolean]*		true to popup menu above the button.
 */
ZmToolBar.prototype.createButton =
function(id, params) {
	var b = this._buttons[id] = this._createButton(params);
	if (params.image) {
		b.setImage(params.image);
	}
	if (params.text) {
		b.setText(params.text);
	}
	if (params.tooltip) {
		b.setToolTipContent(ZmOperation.getToolTip(id, this._keyMap) || params.tooltip);
	}
	b.setEnabled(params.enabled !== false);
	b.setData("_buttonId", id);
	if (params.menu) {
		b.setMenu(params.menu, false, null, params.menuAbove);
	}

	return b;
};

//
// Data
//

ZmToolBar.prototype.SEPARATOR_TEMPLATE = "share.Widgets#ZmToolBarSeparator";

//
// Protected methods
//

ZmToolBar.prototype._createButton =
function(params, className) {
	var ctor = params.ctor || DwtToolBarButton;
    return new ctor({
		parent:this,
		style:params.style,
		className:className,
		index:params.index,
		id:params.id,
		template: params.template
	});
};

ZmToolBar.prototype._buttonId =
function(button) {
	return button.getData("_buttonId");
};
