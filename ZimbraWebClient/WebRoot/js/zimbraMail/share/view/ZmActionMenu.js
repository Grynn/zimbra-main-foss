/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2004, 2005, 2006, 2007, 2008, 2009, 2010 Zimbra, Inc.
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
  * Creates an action menu with the given menu items.
  * @constructor
  * @class ZmActionMenu
  * This class represents an action menu, which is a popup menu with a few added features.
  * It can be easily created using a set of standard operations, and/or custom menu items
  * can be provided. This class is designed for use with items (ZmItem), so it can for
  * example contain a tab submenu. See also ZmButtonToolBar.
  *
  * @author Conrad Damon
  *
  * @param params		[hash]				hash of params:
  *        parent		[DwtComposite]		the containing widget
  *        controller	[ZmController]*		owning controller
  *        menuItems	[array]*			a list of operation IDs
  *        overrides	[hash]*				hash of overrides by op ID
  *        context		[string]*			context (used to create ID)
  *        menuType		[const]*			menu type (used to generate menu item IDs)
  */
ZmActionMenu = function(params) {

    var id = params.context ? ZmId.getMenuId(params.context, params.menuType) : null;
	ZmPopupMenu.call(this, params.parent, null, id, params.controller);

	// standard menu items default to Tag/Print/Delete
	var menuItems = params.menuItems;
	if (!menuItems) {
		menuItems = [ZmOperation.TAG_MENU, ZmOperation.PRINT, ZmOperation.DELETE];
	} else if (menuItems == ZmOperation.NONE) {
		menuItems = null;
	}
	// weed out disabled ops, save list of ones that make it
	this.opList = ZmOperation.filterOperations(menuItems);
	this._context = params.context;
	this._menuType = params.menuType;

	this._menuItems = ZmOperation.createOperations(this, this.opList, params.overrides);
};

ZmActionMenu.prototype = new ZmPopupMenu;
ZmActionMenu.prototype.constructor = ZmActionMenu;

// Public methods

ZmActionMenu.prototype.toString = 
function() {
	return "ZmActionMenu";
};

/**
 * Creates a menu item and adds its operation ID as data.
 * 
 * @param id			[string]		name of the operation
 *        text			[string]*		menu item text
 *        image			[string]*		icon class for the menu item
 *        disImage		[string]*		disabled version of icon
 *        enabled		[boolean]*		if true, menu item is enabled
 *        style			[constant]*		menu item style
 *        radioGroupId	[string]*		ID of radio group for this menu item
 *        shortcut		[constant]*		shortcut ID (from ZmKeyMap) for showing hint
 */
ZmActionMenu.prototype.createOp =
function(id, params) {
	params.id = this._context ? ZmId.getMenuItemId(this._context, id, this._menuType) : null;
	var mi = this.createMenuItem(id, params);
	mi.setData(ZmOperation.KEY_ID, id);

	return mi;
};

ZmActionMenu.prototype.addOp =
function(id) {
	ZmOperation.addOperation(this, id, this._menuItems);
};

ZmActionMenu.prototype.removeOp =
function(id) {
	ZmOperation.removeOperation(this, id, this._menuItems);
};

/**
* Returns the menu item with the given ID.
*
* @param id		an operation ID
*/
ZmActionMenu.prototype.getOp =
function(id) {
	return this.getMenuItem(id);
};

/**
* Returns the menu's tag submenu, if any.
*/
ZmActionMenu.prototype.getTagMenu =
function() {
	var menuItem = this.getMenuItem(ZmOperation.TAG_MENU);
	if (menuItem) {
		return menuItem.getMenu();
	}
};

// Private methods

// Returns the ID for the given menu item.
ZmActionMenu.prototype._menuItemId =
function(menuItem) {
	return menuItem.getData(ZmOperation.KEY_ID);
};
