/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2006, 2007 Zimbra, Inc.
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
* XFormItem class: _ADDR_ACL_
* this item is used in the Admin UI to display ACls for addresses (groups, accounts, etc)
* @class AddrACL_XFormItem
* @constructor AddrACL_XFormItem
* @author Greg Solovyev
**/
AddrACL_XFormItem = function() {}
XFormItemFactory.createItemType("_ADDR_ACL_", "addracl", AddrACL_XFormItem, Composite_XFormItem);
AddrACL_XFormItem.prototype.numCols = 5;
AddrACL_XFormItem.prototype.nowrap = true;
AddrACL_XFormItem.prototype.initializeItems = function() {
	var changeMethod = this.getInheritedProperty("onChange");
	
	if(changeMethod) {
		this.items[0].onChange = changeMethod;
		this.items[1].onChange = changeMethod;		
	} else {
		this.items[0].onChange = null;
		this.items[1].onChange = null;		
	}	
	
	var visibleBoxes = this.getInheritedProperty("visibleBoxes");
	if(visibleBoxes)
		this.items[1].visibleBoxes = visibleBoxes;
		
	var dataFetcherMethod = this.getInheritedProperty("dataFetcherMethod");
	if(dataFetcherMethod)
		this.items[0].dataFetcherMethod = dataFetcherMethod;
	Composite_XFormItem.prototype.initializeItems.call(this);
}
AddrACL_XFormItem.prototype.items = [
	{type:_DYNSELECT_, width:"200px", inputSize:30, ref:"name", editable:true, forceUpdate:true,
		dataFetcherClass:ZaSearch,
		elementChanged:function(val,instanceValue, event) {
			this.getForm().itemChanged(this, val, event);			
		}
	},
	{type:_ACL_, forceUpdate:true, ref:"acl", labelLocation:_NONE_, label:null}
];

