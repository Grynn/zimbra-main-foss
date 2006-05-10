/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: ZPL 1.1
 * 
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.1 ("License"); you may not use this file except in
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
 * Portions created by Zimbra are Copyright (C) 2005 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s):
 * 
 * ***** END LICENSE BLOCK *****
 */

/**
* This class describes a List view of an account's Member Of tab
* @class ZaAccountMemberOfListView
* @contructor ZaAccountMemberOfListView
* @author Charles Cao
**/
function ZaAccountMemberOfListView(parent, className, posStyle, headerList){
	ZaListView.call(this, parent, className, posStyle, headerList);
}

ZaAccountMemberOfListView.prototype = new ZaListView ;
ZaAccountMemberOfListView.prototype.constructor = ZaAccountMemberOfListView ;
ZaAccountMemberOfListView.prototype.toString = function (){
	return "ZaAccountMemberOfListView";
};

ZaAccountMemberOfListView.A_name = "name" ;
ZaAccountMemberOfListView.A_isgroup = "isgroup" ;
ZaAccountMemberOfListView.A_via = "via" ;
ZaAccountMemberOfListView._addList = [];
ZaAccountMemberOfListView._removeList = [];
ZaAccountMemberOfListView.SEARCH_LIMIT = 2 ;
/*
ZaAccountMemberOfListView.NONMEMBERPAGEBACK_OFFSET = 0; 
ZaAccountMemberOfListView.NONMEMBER_MORE = false;
ZaAccountMemberOfListView.DIRECTMEMBERPAGEBACK_OFFSET = 0;
ZaAccountMemberOfListView.DIRECTMEMBER_MORE = false;
*/
//ZaAccountMemberOfListView._toBeConfirmedList = [];

/**
 * @param app
 * @param val {account value corresponding to by}
 * @param by  {either by id or name} 
 * @return the memberOf object 
 * 				{ 	directMemberList: [ { name: dl1@test.com, id: 394394, isgroup: true } , {..}, ...] ,
 * 					indirectMemberList: [ { name: dl1@test.com, id: 394394, via: dl2@test.com, isgroup: true } , {..}, ...] ,
 * 					nonMemberList: [ { name: dl1@test.com, id: 394394, isgroup: false } , {..}, ...],
 * 					isgroup: true  
 * 				}
 * 					
 */
ZaAccountMemberOfListView.getAccountMemberShip = 
function (app, val, by){
	var directML = [];
	var indirectML = [];
	var nonML = [];
		 
	try {
		soapDoc = AjxSoapDoc.create("GetAccountMembershipRequest", "urn:zimbraAdmin", null);
		var elBy = soapDoc.set("account", val);
		elBy.setAttribute("by", by);

		var getAccMemberShipCommand = new ZmCsfeCommand();
		var params = new Object();
		params.soapDoc = soapDoc;	
		var resp = getAccMemberShipCommand.invoke(params).Body.GetAccountMembershipResponse;
		if (resp.dl && (resp.dl instanceof Array)){
			var dls = resp.dl ;
			var n = resp.dl.length ;
			for (var i=0, d=0, m=0; m < n; m++ ){
				//if (dls[m].isgroup) {
				if (dls[m].via && (dls[m].via.length >0)){ //indirect dl
					indirectML[i] = { name: dls[m].name, id: dls[m].id, via: dls[m].via, isgroup: dls[m].isgroup} ;
					i ++ ;
				}else{
					directML[d] = { name: dls[m].name, id: dls[m].id, isgroup: dls[m].isgroup } ;
					d ++ ;
				}
			}
		}

	}catch (ex){
		app.getCurrentController()._handleException(ex, "ZaAccount.prototype.load", null, false);
	}
	
	var memberOf = {	directMemberList: directML,
						indirectMemberList: indirectML,
						nonMemberList: nonML
					};
	return memberOf ;
}


/**
 * When the showGroupOnly is checked, only the group shows. Otherwise, all the DLs will be displayed.
 */
ZaAccountMemberOfListView.onShowGroupOnlyChanged =
function(value, event, form){
	//change the memberOf instance
	var instance = form.getInstance();
	var isOnlyShowGroup = (value == "TRUE") ? true : false ;
	var memberOf = null ;
	/*
	instance.memberOf = {	directMemberList: [],
						indirectMemberList: [],
						nonMemberList: []						
						}; */
						
	//the list value must be changed to update the lists
	/*
	if (isOnlyShowGroup){
		instance [ZaAccount.A2_memberOf] = ZaAccountMemberOfListView.getGroupOnly(instance [ZaAccount.A2_memberOf]) ;
	} else { //need to retrieve the value from server again
		
	}*/
	//instance[ZaAccount.A2_memberOf][ZaAccountMemberOfListView.A_isgroup] =  isOnlyShowGroup;
	instance[ZaAccount.A2_memberOf]["showGroupOnlyAction"] = true ; //turn on the flag
	this.setInstanceValue(value);
	form.setInstance(instance);
	instance[ZaAccount.A2_memberOf]["showGroupOnlyAction"] = false ; //turn off the flag
	return value;
}

ZaAccountMemberOfListView.removeAllGroups =
function(event, listId){
	var form = this.getForm();
	var allSelections = ZaAccountMemberOfListView._getAllInList(form, listId);
	ZaAccountMemberOfListView._removeSelectedLists(form, allSelections);
};

ZaAccountMemberOfListView.removeGroups =
function (event, listId){
	var form = this.getForm();
	var selections = ZaAccountMemberOfListView._getSelections(form, listId);
	ZaAccountMemberOfListView._removeSelectedLists(form, selections);	
};

ZaAccountMemberOfListView._removeSelectedLists =
function (form, listArr){
	var instance = form.getInstance();
	//var directMemberList = form.getItemsById(ZaAccount.A2_directMemberList)[0].getList();
	var directMemberList = instance[ZaAccount.A2_memberOf][ZaAccount.A2_directMemberList];
	var indirectMemberList = instance[ZaAccount.A2_memberOf][ZaAccount.A2_indirectMemberList];	
		
	//add the removed lists to the _removedList
	var j = -1;	
	var dlName = null ;
	var indirectArrFound = null;
	
	for(var i=0; i<listArr.length; i++) {
		dlName = listArr[i][ZaAccountMemberOfListView.A_name] ;
		j = ZaAccountMemberOfListView._find(directMemberList, dlName);
		if (j >= 0 ) {
			//check whether there is derived indirect list, and display warning is yes
			indirectArrFound = ZaAccountMemberOfListView._findIndirect(indirectMemberList, dlName);
			if (indirectArrFound.length > 0){
				
				//ZaAccountMemberOfListView._toBeConfirmedList.push([directDlName, indirectArrFound]);
				var indirectDls = indirectArrFound.join("<br />");			
				msg = AjxMessageFormat.format (ZaMsg.Q_REMOVE_INDIRECT_GROUP, [dlName, indirectDls]);
				
				var confirmMessageDialog =  new ZaMsgDialog(form.shell, null, [DwtDialog.YES_BUTTON, DwtDialog.NO_BUTTON], form.parent._app);					
				
				confirmMessageDialog.setMessage(msg,  DwtMessageDialog.WARNING_STYLE);
				confirmMessageDialog.registerCallback(DwtDialog.YES_BUTTON, ZaAccountMemberOfListView._removeConfirmedList, null ,
														[form, confirmMessageDialog, dlName, indirectArrFound]) ;		
				confirmMessageDialog.registerCallback(DwtDialog.NO_BUTTON, ZaAccountMemberOfListView._closeConfirmDialog, null, [form, confirmMessageDialog]);				
				confirmMessageDialog.popup();
				/*
				confirmMessageDialog =  new ZaMsgDialog(form.shell, null, [DwtDialog.YES_BUTTON, DwtDialog.NO_BUTTON], form.parent._app);		
				confirmMessageDialog.setMessage("abc",  DwtMessageDialog.WARNING_STYLE);
				confirmMessageDialog.registerCallback(DwtDialog.YES_BUTTON, null) ;		
				confirmMessageDialog.registerCallback(DwtDialog.NO_BUTTON, ZaAccountMemberOfListView._closeConfirmDialog, null, [form, confirmMessageDialog]);				
				confirmMessageDialog.popup();	*/		
				//splice the entry in the callback method.
				continue;
			}			
			directMemberList.splice(j, 1);			
		}
				
		j = ZaAccountMemberOfListView._find(ZaAccountMemberOfListView._addList, dlName);
		if (j >= 0){ //found in _addedList
			ZaAccountMemberOfListView._addList.splice(j, 1);
		}else{
			ZaAccountMemberOfListView._removeList = ZaAccountMemberOfListView._removeList.concat(listArr[i]);
			form.parent.setDirty(true);
		}
	}
	
	form.refresh();	
};

ZaAccountMemberOfListView._closeConfirmDialog =
function (form, dialog){
	if (dialog)
		dialog.popdown();
	
	if (form) 
		form.refresh();	
};

ZaAccountMemberOfListView._removeConfirmedList = 
function (form, dialog, directDlName, indirectDlsNameArr){
	if (dialog) {
		var instance = form.getInstance();
		//var directMemberList = form.getItemsById(ZaAccount.A2_directMemberList)[0].getList();
		var directMemberList = instance[ZaAccount.A2_memberOf][ZaAccount.A2_directMemberList];
		var indirectMemberList = instance[ZaAccount.A2_memberOf][ZaAccount.A2_indirectMemberList];	
		var j = -1;
		var m = -1;
		//remove from directMemberList
		j = ZaAccountMemberOfListView._find(directMemberList, directDlName);
		if (j >= 0){		
			m = ZaAccountMemberOfListView._find(ZaAccountMemberOfListView._addList, directDlName);
			if (m >= 0){ //found in _addedList
				ZaAccountMemberOfListView._addList.splice(m, 1);
			}else{
				ZaAccountMemberOfListView._removeList = ZaAccountMemberOfListView._removeList.concat(directMemberList[j]);
			}
			directMemberList.splice(j, 1);
		}
		
		for(var i=0; i<indirectDlsNameArr.length; i++) {
			j = ZaAccountMemberOfListView._find(indirectMemberList, indirectDlsNameArr[i]);
			if (j>=0) 
				indirectMemberList.splice(j, 1);			
		}		
		form.parent.setDirty(true);		
		ZaAccountMemberOfListView._closeConfirmDialog(form, dialog);
	}
}

/**
 * find first property value match of an array element  
 */
ZaAccountMemberOfListView._find =
function (arr, value, property){
	if (!property) property = ZaAccountMemberOfListView.A_name ;
	   
	for(var i=0; i<arr.length; i++) {
		if (arr[i][property] == value){
			return i ;
		}
	}	
	return -1;
}

ZaAccountMemberOfListView._findIndirect  =
function(arr, value, foundArr){
	var j = -1 ;
	if (!foundArr) {
		foundArr = new Array();
	}
	for(var i=0; i<arr.length; i++) {
		if (arr[i][ZaAccountMemberOfListView.A_via] == value) {		
			//j = ZaAccountMemberOfListView._find(arr, value, ZaAccountMemberOfListView.A_via) ;
			foundArr.push (arr[i][ZaAccountMemberOfListView.A_name]) ;
			foundArr = ZaAccountMemberOfListView._findIndirect(arr, arr[i][ZaAccountMemberOfListView.A_name], foundArr);
		}
	}
	return foundArr;			
}

/**
 * find all the value matching indexes in an array.
 */
ZaAccountMemberOfListView._foundIndexArr =
function(arr, value){
	
}


ZaAccountMemberOfListView.addGroups=
function (event, listId){
	var form = this.getForm();
	var selections = ZaAccountMemberOfListView._getSelections(form, listId);
	ZaAccountMemberOfListView._addSelectedLists(form, selections);
};


ZaAccountMemberOfListView.addAllGroups =
function(event, listId){
	var form = this.getForm ();
	var allSelections = ZaAccountMemberOfListView._getAllInList(form, listId);
	ZaAccountMemberOfListView._addSelectedLists(form, allSelections);
};

ZaAccountMemberOfListView._addSelectedLists=
function (form, listArr){	
	//var directMemberListItem = form.getItemsById(ZaAccount.A2_directMemberList)[0];
	var instance = form.getInstance();
	var memberOf = instance[ZaAccount.A2_memberOf];
	memberOf[ZaAccount.A2_directMemberList] = memberOf[ZaAccount.A2_directMemberList].concat(listArr);
	
	//add the added lists to the _addList	
	ZaAccountMemberOfListView._addList = ZaAccountMemberOfListView._addList.concat(listArr);
	form.parent.setDirty(true);
	
	//form.setInstance(instance);
	form.refresh();		
};


ZaAccountMemberOfListView._getSelections =
function (form, listId){
	var selections = form.getItemsById(listId)[0].getSelection();
	return (selections) ? selections : [] ;
};

ZaAccountMemberOfListView._getAllInList =
function (form, listId){
	//set selections
	var dwtListItem = form.getItemsById(listId)[0].widget ;
	var allListArr =  dwtListItem.getList().getArray() ;
	dwtListItem.setSelectedItems(allListArr); //get all the lists	
	return allListArr ;	
}

/**
 * Enable/Disable Add Button or remove button based on the itemId
 */
ZaAccountMemberOfListView.shouldEnableAddRemoveButton =
function (listId){
	return  (ZaAccountMemberOfListView._getSelections(this, listId).length > 0);
};

/**
 * Enable/Diable "Add All" or "Remove All" buttons based on the itemId
 */
ZaAccountMemberOfListView.shouldEnableAllButton =
function (listItemId){
	var list = this.getItemsById(listItemId)[0].widget.getList();
	if (list != null) return ( list.size() > 0);
	return false;
};

ZaAccountMemberOfListView.shouldEnableBackButton =
function(listItemId){
	var offset = this.getInstance()[listItemId + "_offset"] ;
	return ((offset && offset > 0) ? true : false) ;	
};

ZaAccountMemberOfListView.shouldEnableForwardButton =
function (listItemId){
	var more = this.getInstance()[listItemId + "_more"] ;
	return ((more && more > 0) ? true : false) ;		
};

/*
 * Add the current account/dl to the new groups/dls 
 * @param addArray new groups/dls
 */
ZaAccountMemberOfListView.addNewGroupsBySoap = 
function (account, addArray) {	
	var len = addArray.length;
	var addMemberSoapDoc, r, addMemberSoapDoc;
	var command = new ZmCsfeCommand();
	for (var i = 0; i < len; ++i) {
		addMemberSoapDoc = AjxSoapDoc.create("AddDistributionListMemberRequest", "urn:zimbraAdmin", null);
		addMemberSoapDoc.set("id", addArray[i].id); //group id 
		addMemberSoapDoc.set("dlm", account.name); //account name
		var params = new Object();
		params.soapDoc = addMemberSoapDoc;	
		r=command.invoke(params).Body.AddDistributionListMemberResponse;
	}
};

/**
 * remove the current account from groups
 * @params removeArray
 */
ZaAccountMemberOfListView.removeGroupsBySoap = 
function (account, removeArray){
	var len = removeArray.length;
	var addMemberSoapDoc, r, removeMemberSoapDoc;
	var command = new ZmCsfeCommand();	
	for (var i = 0; i < len; ++i) {
		removeMemberSoapDoc = AjxSoapDoc.create("RemoveDistributionListMemberRequest", "urn:zimbraAdmin", null);
		removeMemberSoapDoc.set("id", removeArray[i].id);
		removeMemberSoapDoc.set("dlm", account.name);
		var params = new Object();
		params.soapDoc = removeMemberSoapDoc;	
		r=command.invoke(params).Body.RemoveDistributionListMemberResponse;		
	}
}

/**
 * search the directory for all the distribution lists when the search button is clicked.
 */
ZaAccountMemberOfListView.prototype.srchButtonHndlr =
function (){
	var item = this ;
	ZaAccountMemberOfListView.doSearch(item, 0) ;
}

ZaAccountMemberOfListView.backButtonHndlr = 
function (event, listItemId){
	var currentOffset = this.getInstanceValue("/" + listItemId + "_offset") ;
	if (currentOffset == null) currentOffset = 0;
	var nextOffset = 0;
	if (listItemId == ZaAccount.A2_nonMemberList) {		
		nextOffset = currentOffset - ZaAccountMemberOfListView.SEARCH_LIMIT ;  
		ZaAccountMemberOfListView.doSearch(this, nextOffset) ;
	}else{ //directMemmberList // if (listItemId == ZaAccount.A2_directMemberList)
		nextOffset = currentOffset - ZaAccountMemberOfListView.SEARCH_LIMIT ;
		this.setInstanceValue(nextOffset, "/" + listItemId + "_offset" );
		this.setInstanceValue(1, "/" + listItemId + "_more");	
		this.getForm().refresh() ;
	}
};

ZaAccountMemberOfListView.fwdButtonHndlr =
function(event, listItemId){
	var instance = this.getInstance();
	var currentOffset = this.getInstanceValue("/" + listItemId + "_offset") ;	
	if (currentOffset == null) currentOffset = 0;
	var nextOffset = 0;
		
	if (listItemId == ZaAccount.A2_nonMemberList) {		
		nextOffset = currentOffset + ZaAccountMemberOfListView.SEARCH_LIMIT ;  
		ZaAccountMemberOfListView.doSearch(this, nextOffset) ;
	}else{ // if (listItemId == ZaAccount.A2_directMemberList){ //directMemmberList
		nextOffset = currentOffset + ZaAccountMemberOfListView.SEARCH_LIMIT ;
				
		if ((nextOffset + ZaAccountMemberOfListView.SEARCH_LIMIT) 
				< instance[ZaAccount.A2_memberOf][listItemId].length){
			
			this.setInstanceValue(1, "/" + listItemId + "_more");
		}else{
			this.setInstanceValue(0, "/" + listItemId + "_more");
		}
		this.setInstanceValue(nextOffset, "/" + listItemId + "_offset");
		this.getForm().refresh();
	}
};

/**
 * search for the dls or groups
 * 
 */
ZaAccountMemberOfListView.doSearch=
function (item, offset){
	var arr = [] ;
	//the preassumption is that both memberOf is the name of the attr of the instance 
	var xform = item.getForm() ; //item refers to a xform item
	if (xform){
		var curInstance = xform.getInstance();
		
		if (! offset) offset = 0 ;
		
		var memberOfObj = curInstance[ZaAccount.A2_memberOf] ;
		try {
			var sortby = ZaAccount.A_name ; 
			var searchByDomain = (memberOfObj [ZaAccount.A2_showSameDomain] && (memberOfObj [ZaAccount.A2_showSameDomain] == "TRUE")) ? true : false ;
			var domainName = null;			
			
			if (ZaSettings.DOMAINS_ENABLED){
				if (searchByDomain){
					var curEmail = xform.parent._containedObject.name ;
					domainName = curEmail.substring (curEmail.indexOf("@")+1);
				}
			}else{
				domainName = ZaSettings.myDomainName;
			}
			
			var attrs = [ZaAccount.A_name, ZaItem.A_zimbraId];
			//var attrs = [""];
			var valStr = curInstance[ZaSearch.A_query];
			var query = ZaSearch.getSearchByNameQuery(valStr);
			var params = { 	query: query ,
							sortBy: sortby,
							limit : ZaAccountMemberOfListView.SEARCH_LIMIT,
							offset: offset,
							domain: domainName,
							applyCos: 0,
							attrs: attrs,
							types: [ZaSearch.DLS]
						 } ;
					
			var result = ZaSearch.searchDirectory(params).Body.SearchDirectoryResponse;
			curInstance [ZaAccount.A2_nonMemberList + "_more"] = (result.more ? 1 : 0) ;
			
			var list = new ZaItemList(ZaDistributionList, null);
			list.loadFromJS(result);
			arr = list.getArray();		
			var nonMemberList = new Array();
			for(var i=0; i<arr.length; i++) {				
				nonMemberList.push({
									name: arr[i].name,
									id: arr[i].id,
									isgroup: arr[i].isgroup					
									});
			}
				
			memberOfObj[ZaAccount.A2_nonMemberList] = nonMemberList ;	
			
			//set the instance variable listItemId_offset & listItemId_more 
			curInstance [ZaAccount.A2_nonMemberList + "_offset"] = offset;			
					
			//xform.setInstance(curInstance) ;
			xform.refresh();
		}catch (ex){
			xform.parent._app.getCurrentController()._handleException(
				ex, "ZaAccountMemberOfListView.prototype.srchButtonHndlr");
		}	
	}
		
	return true;	
}

ZaAccountMemberOfListView.join =
function (memberListArr){
	var result = [];
	for(var i=0; i<memberListArr.length; i++) {
		if (memberListArr[i].name) {
			result.push(memberListArr[i].name);
		}
	}
	return result.join();
}
ZaAccountMemberOfListView.prototype._createItemHtml = function (group, now, isDndIcon){
	var html = new Array(50);
	var	div = document.createElement("div");
	div._styleClass = "Row";
	div._selectedStyleClass = div._styleClass + "-" + DwtCssStyle.SELECTED;
	div.className = div._styleClass;
	this.associateItemWithElement(group, div, DwtListView.TYPE_LIST_ITEM);
	
	var idx = 0;
	html[idx++] = "<table width='100%' cellspacing='2' cellpadding='0'>";

	html[idx++] = "<tr>";
	if(this._headerList) {
		var cnt = this._headerList.length;
		for(var i = 0; i < cnt; i++) {
			//if ()
			var id = this._headerList[i]._id;
			if(id.indexOf(ZaAccountMemberOfListView.A_name) == 0) {
				html[idx++] = "<td width=" + this._headerList[i]._width + ">";
				html[idx++] = AjxStringUtil.htmlEncode(group[ZaAccountMemberOfListView.A_name]);				
				html[idx++] = "</td>";			
			}  
			else if(id.indexOf(ZaAccountMemberOfListView.A_isgroup) == 0) {
				html[idx++] = "<td width=" + this._headerList[i]._width + ">";
				html[idx++] = AjxStringUtil.htmlEncode(group[ZaAccountMemberOfListView.A_isgroup] ? ZaMsg.Yes : ZaMsg.No);
				html[idx++] = "</td>";
			}
			else if(id.indexOf(ZaAccountMemberOfListView.A_via) == 0) {
				html[idx++] = "<td width=" + this._headerList[i]._width + ">";
				html[idx++] = AjxStringUtil.htmlEncode(group[ZaAccountMemberOfListView.A_via]);
				html[idx++] = "</td>";
			} 
			 
		}
	} else {
		html[idx++] = "<td width=100%>";
		html[idx++] = AjxStringUtil.htmlEncode(group[ZaAccountMemberOfListView.A_name]);
		html[idx++] = "</td>";
	}
	
	html[idx++] = "</tr></table>";
	div.innerHTML = html.join("");
	return div;
};

ZaAccountMemberOfListView.prototype._setNoResultsHtml = function() {
	var buffer = new AjxBuffer();
	var	div = document.createElement("div");
	
	buffer.append("<table width='100%' cellspacing='0' cellpadding='1'>",
				  "<tr><td class='NoResults'>",
				  AjxStringUtil.htmlEncode(ZaMsg.Account_Group_NoMember),
				  "</td></tr></table>");
	
	div.innerHTML = buffer.toString();
	this._addRow(div);
};

ZaAccountMemberOfListView.prototype._sortColumn = function (columnItem, bSortAsc) {
	
};



/**
 * Customized Dwt_list for MemberShip list view. It is specialized, so the show group only check box can filter
 * the non group dls. 
 * 
 */
function S_Dwt_List_XFormItem(){}
XFormItemFactory.createItemType("_S_DWT_LIST_", "s_dwt_list", S_Dwt_List_XFormItem, Dwt_List_XFormItem);

/*
S_Dwt_List_XFormItem.prototype.updateWidget =
function (newValue) {
	// Dwt_List_XFormItem.prototype.updateWidget call mess up the selection if the client side checkboxes
	// such as "show only distribution list" are check. The client side filtering
	if (typeof (newValue) != 'undefined') {
		this.setItems(newValue);
	}
} */

/**
 * This function overrides the Dwt_List_XFormItem.prototype.setItems
 * @param itemArray - the list array to be displayed
 */
S_Dwt_List_XFormItem.prototype.setItems = function (itemArray){
	var list = this.widget.getList();
	var existingArr = []; //the list in the current view
	var tmpArr = new Array();
	if (list) {
		existingArr = list.getArray();
	}
	tmpArr = new Array();
	var instance = this.getForm().getInstance();
	var isGroupOnlyCkbAction = instance[ZaAccount.A2_memberOf]["showGroupOnlyAction"];
	var isGroupOnly = instance[ZaAccount.A2_memberOf][ZaAccountMemberOfListView.A_isgroup];
	
	if (itemArray && itemArray.length > 0) {	
		var offset = 0 ;
		var more = 0;
		var len = itemArray.length ;
		if (this.id.indexOf(ZaAccount.A2_indirectMemberList) >= 0){
			offset = instance [ZaAccount.A2_indirectMemberList + "_offset"] ;
			if (offset == null) offset = 0;
			more = instance [ ZaAccount.A2_indirectMemberList + "_more"] ;
			if (more == null) more = 0;
			if (more > 0) {
				len = offset + ZaAccountMemberOfListView.SEARCH_LIMIT ;
			}
		}else if (this.id.indexOf(ZaAccount.A2_directMemberList) >= 0){
			offset = instance [ZaAccount.A2_directMemberList + "_offset"] ;
			if (offset == null) offset = 0;
			more = instance [ ZaAccount.A2_directMemberList + "_more"] ;
			if (more == null) more = 0;
			if (more > 0) {
				len = offset + ZaAccountMemberOfListView.SEARCH_LIMIT ;
			}
		}
		
		
		//filter out the itemArray first based on the checkboxes
		var filteredItemArray = new Array();
		var j = -1;
		//if (isGroupOnlyCkbAction || (this.id.indexOf(ZaAccount.A2_nonMemberList) >= 0)){
				for(var i=offset; i<len; i++) {					
					if (isGroupOnly == "TRUE" ){
						if (! itemArray[i][ZaAccountMemberOfListView.A_isgroup]) {
							continue;
						}
					}
					
					if (this.id.indexOf(ZaAccount.A2_nonMemberList) >= 0){ //filter out the directMember in nonMemberList
						j = ZaAccountMemberOfListView._find(
								instance[ZaAccount.A2_memberOf][ZaAccount.A2_directMemberList], 
								itemArray[i][ZaAccountMemberOfListView.A_name]);
						if (j >= 0) {
							continue ;
						}
					}
					
					filteredItemArray.push(itemArray[i]);					
				}
			/*
		}else{
			filteredItemArray = itemArray ;
		}*/
				
		//we have to compare the objects, because XForm calls this method every time an item in the list is selected
		if(ZaAccountMemberOfListView.join(filteredItemArray) != ZaAccountMemberOfListView.join (existingArr) ) {
			var preserveSelection = this.getInheritedProperty("preserveSelection");
			var selection = null;
			if(preserveSelection) {
				selection = this.widget.getSelection();
			}		
			var cnt=filteredItemArray.length;
			for(var i = 0; i< cnt; i++) {
				tmpArr.push(filteredItemArray[i]);		
			}
			//add the default sort column
			this.widget.set(AjxVector.fromArray(tmpArr), this.getInheritedProperty("defaultColumnSortable"));
			if(preserveSelection && selection) {
				this.widget.setSelectedItems(selection);
			}
		}
		/*
		if((itemArray.join() != existingArr.join()) || (isGroupOnlyCkbAction)) {
			var preserveSelection = this.getInheritedProperty("preserveSelection");
			var selection = null;
			if(preserveSelection) {
				selection = this.widget.getSelection();
			}		
			var cnt=itemArray.length;			
			for(var i = 0; i< cnt; i++) {
				//check wether it is the nonMemberList
				//we will not display the lists inside the directMemberList
				var j = -1;
				//TODO: this if statement cause the nonMemberList can't be selected
				if (this.id.indexOf(ZaAccount.A2_nonMemberList) >= 0){
					j = ZaAccountMemberOfListView._find(
							instance[ZaAccount.A2_memberOf][ZaAccount.A2_directMemberList], 
							itemArray[i][ZaAccountMemberOfListView.A_name]);
					if (j >= 0) 
						continue ;					
				}
				
				//check whether the group only is applied
				if (isGroupOnly == "TRUE" ){
					if (itemArray[i][ZaAccountMemberOfListView.A_isgroup]) {
						tmpArr.push(itemArray[i]);
					}
				}else {
					tmpArr.push(itemArray[i]);		
				}
			}
			//add the default sort column
			this.widget.set(AjxVector.fromArray(tmpArr), this.getInheritedProperty("defaultColumnSortable"));
			if(preserveSelection && selection) {
				this.widget.setSelectedItems(selection);
			}
		}*/
	}else{
		//display the empty list (no result html)
		this.widget.set(AjxVector.fromArray([])); 
	}
};
   
/**
* This class describes a header for the ZaAccountMemberOfList
* @class ZaAccountMemberOfListView
* @contructor ZaAccountMemberOfListView
* @author Charles Cao
**/
function ZaAccountMemberOfsourceHeaderList (type) {
	var sourceHeaderList = new Array();
	var sortable = 0;
	
//	defaultColumnSortable = sortable ;
	sourceHeaderList[0] = new ZaListHeaderItem(ZaAccountMemberOfListView.A_name, 	ZaMsg.CLV_Name_col, 	
												null, 200, sortable++, ZaAccountMemberOfListView.A_name, true, true);
	
	var isgroupWidth = (type == ZaAccountMemberOfsourceHeaderList.INDIRECT) ? 80 : null ;
	sourceHeaderList[1] = new ZaListHeaderItem(ZaAccountMemberOfListView.A_isgroup,   	ZaMsg.Account_Group,   	
	 											null, isgroupWidth,  null,  ZaAccountMemberOfListView.A_isgroup, true, true);
	
	if (type == ZaAccountMemberOfsourceHeaderList.INDIRECT) { 																							
		sourceHeaderList[2] = new ZaListHeaderItem(ZaAccountMemberOfListView.A_via,   	ZaMsg.Group_via,   	
	 											null, null,  null,  ZaAccountMemberOfListView.A_via, true, true);
	}
	
	return sourceHeaderList ;
}

ZaAccountMemberOfsourceHeaderList.DIRECT = 1 ; //direct membership group
ZaAccountMemberOfsourceHeaderList.INDIRECT = 2; //indirect/derived membership group
ZaAccountMemberOfsourceHeaderList.NON = 3; //non membership groups.

