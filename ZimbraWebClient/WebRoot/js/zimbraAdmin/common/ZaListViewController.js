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
* @class ZaListViewController base class for all Za***ListControllers (for list views)
* @extends ZaController
* @contructor 
* @param appCtxt
* @param container
* @param app
* @param iKeyName
* @author Greg Solovyev
* @see ZaAccountListController
* @see ZDomainListController
**/
ZaListViewController = function(appCtxt, container,iKeyName) {
	if (arguments.length == 0) return;
	this._currentPageNum = 1;	
   	this._toolbarOperations = new Array();
   	this._toolbarOrder = new Array();
   	this._popupOperations = new Array();	
	//this.pages = new Object();
	this._currentSortOrder = "1";
	ZaController.call(this, appCtxt, container,iKeyName);
	this.RESULTSPERPAGE = ZaSettings.RESULTSPERPAGE; 
	this.MAXSEARCHRESULTS = ZaSettings.MAXSEARCHRESULTS;
}

ZaListViewController.prototype = new ZaController();
ZaListViewController.prototype.constructor = ZaListViewController;
ZaListViewController.changeActionsStateMethods = new Object();

ZaListViewController.prototype._nextPageListener = 
function (ev) {
	if(this._currentPageNum < this.numPages) {
		this._currentPageNum++;
		this.show();	
	} 
}

ZaListViewController.prototype._prevPageListener = 
function (ev) {
	if(this._currentPageNum > 1) {
		this._currentPageNum--;
		/*if(this.pages[this._currentPageNum]) {
			this.show(this.pages[this._currentPageNum])
		} else {*/
			this.show();
		//}
	} 
}

/**
* @return ZaItemList - the list currently displaid in the list view
**/
ZaListViewController.prototype.getList = 
function() {
	return this._list;
}

ZaListViewController.prototype._updateUI = 
function(list, openInNewTab, openInSearchTab) {
    if (!this._UICreated) {
		this._createUI(openInNewTab, openInSearchTab);
	} 
	if (list) {
		var tmpArr = new Array();
		var cnt = list.getArray().length;
		for(var ix = 0; ix < cnt; ix++) {
			tmpArr.push(list.getArray()[ix]);
		}
		if(cnt < 1) {
			//if the list is empty - go to the previous page
		}
		//add the default column sortable
		this._contentView._bSortAsc = (this._currentSortOrder=="1");
		this._contentView.set(AjxVector.fromArray(tmpArr), this._contentView._defaultColumnSortable);	
	}
	this._removeList = new Array();
	this.changeActionsState();
	
	var s_result_start_n = (this._currentPageNum - 1) * this.RESULTSPERPAGE + 1;
	var s_result_end_n = this._currentPageNum  * this.RESULTSPERPAGE;
	if(this.numPages <= this._currentPageNum) {
		s_result_end_n = this._searchTotal ;
		this._toolbar.enable([ZaOperation.PAGE_FORWARD], false);
	} else {
		this._toolbar.enable([ZaOperation.PAGE_FORWARD], true);
	}
	if(this._currentPageNum == 1) {
		this._toolbar.enable([ZaOperation.PAGE_BACK], false);
	} else {
		this._toolbar.enable([ZaOperation.PAGE_BACK], true);
	}
	
	//update the search result number count now
	var srCountBt = this._toolbar.getButton (ZaOperation.SEARCH_RESULT_COUNT) ;
	if (srCountBt ) {
		if  (this._searchTotal == 0) {
			s_result_end_n = 0;
			s_result_start_n = 0;
		}
		srCountBt.setText ( AjxMessageFormat.format (ZaMsg.searchResultCount, 
				[s_result_start_n + " - " + s_result_end_n, this._searchTotal]));
	}
}

ZaListViewController.prototype.closeButtonListener =
function(ev, noPopView, func, obj, params) {
	if (noPopView) {
		func.call(obj, params) ;
	}else{
		ZaApp.getInstance().popView () ;
	}
}

ZaListViewController.prototype.searchCallback =
function(params, resp) {
	try {
		if(!resp) {
			throw(new AjxException(ZaMsg.ERROR_EMPTY_RESPONSE_ARG, AjxException.UNKNOWN, "ZaListViewController.prototype.searchCallback"));
		}
		if(resp.isException()) {
			ZaSearch.handleTooManyResultsException(resp.getException(), "ZaListViewController.prototype.searchCallback");
			this._list = new ZaItemList(params.CONS);	
			this._searchTotal = 0;
			this.numPages = 0;
			if(params.show)
				this._show(this._list);			
			else
				this._updateUI(this._list);
		}else{
			ZaSearch.TOO_MANY_RESULTS_FLAG = false;
			var response = resp.getResponse().Body.SearchDirectoryResponse;
			this._list = new ZaItemList(params.CONS);	
			this._list.loadFromJS(response);	
			this._searchTotal = response.searchTotal;
			var limit = params.limit ? params.limit : this.RESULTSPERPAGE; 
			this.numPages = Math.ceil(this._searchTotal/params.limit);
			if(params.show)
				this._show(this._list, params.openInNewTab, params.openInSearchTab);			
			else
				this._updateUI(this._list, params.openInNewTab, params.openInSearchTab);
		}
	} catch (ex) {
		if (ex.code != ZmCsfeException.MAIL_QUERY_PARSE_ERROR) {
			this._handleException(ex, "ZaListViewController.prototype.searchCallback");	
		} else {
			this.popupErrorDialog(ZaMsg.queryParseError, ex);
			if(this._searchField)
				this._searchField.setEnabled(true);	
		}		
	}
}

ZaListViewController.prototype.changeActionsState =
function () {
	for(var i in  this._toolbarOperations) {
		if(this._toolbarOperations[i] instanceof ZaOperation) {
			this._toolbarOperations[i].enabled = true;
		}
	}
	
	for(var i in  this._popupOperations) {
		if(this._popupOperations[i] instanceof ZaOperation) {
			this._popupOperations[i].enabled = true;
		}
	}
	if(ZaListViewController.changeActionsStateMethods[this._iKeyName]) {
		var methods = ZaListViewController.changeActionsStateMethods[this._iKeyName];
		var cnt = methods.length;
		for(var i = 0; i < cnt; i++) {
			if(typeof(methods[i]) == "function") {
				try {
					methods[i].call(this);
				} catch (ex) {
					this._handleException(ex, "ZaListViewController.prototype.changeActionsState");
				}
			}
		}
	}	

	for(var i in  this._toolbarOperations) {
		if(this._toolbarOperations[i] instanceof ZaOperation &&  !AjxUtil.isEmpty(this._toolbar.getButton(this._toolbarOperations[i].id))) {
			this._toolbar.getButton(this._toolbarOperations[i].id).setEnabled(this._toolbarOperations[i].enabled);
		}
	}
	
	for(var i in  this._popupOperations) {
		if(this._popupOperations[i] instanceof ZaOperation && !AjxUtil.isEmpty(this._actionMenu.getMenuItem(this._popupOperations[i].id))) {
			this._actionMenu.getMenuItem(this._popupOperations[i].id).setEnabled(this._popupOperations[i].enabled);
		}
	}
}
/**
* @param ev
* This listener is invoked by any other controller that can change an object in this controller
**/
ZaListViewController.prototype.handleChange = 
function (ev) {
	if(ev && this.objType && ev.type==this.objType) {
		if(ev.getDetails() && this._UICreated) {
			this.show(false);			
		}
	}
}

/**
* @param ev
* This listener is invoked by any other controller that can create an object in the view controlled by this controller
**/
ZaListViewController.prototype.handleCreation = 
function (ev) {
	if(ev && this.objType && ev.type==this.objType) {
		if(ev.getDetails() && this._UICreated) {
			this.show(false);			
		}
	}
}

/**
* @param ev
* This listener is invoked by any other controller that can remove an object form the view controlled by this controller
**/
ZaListViewController.prototype.handleRemoval = 
function (ev) {
	if(ev &&  this.objType && ev.type==this.objType) {
		if(ev.getDetails() && this._UICreated) {
			this._currentPageNum = 1 ; //due to bug 12091, always go back to the first page after the deleting of items.
			this.show(false);			
		}
	}
}

ZaListViewController.prototype.setPageNum = 
function (pgnum) {
	this._currentPageNum = Number(pgnum);
}

ZaListViewController.prototype.getPageNum = 
function () {
	return this._currentPageNum;
}

