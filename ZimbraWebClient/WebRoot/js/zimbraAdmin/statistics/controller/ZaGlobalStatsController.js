/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2004, 2005, 2006, 2007, 2008 Zimbra, Inc.
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

/**
* @class ZaGlobalStatsController 
* @contructor ZaGlobalStatsController
* @param appCtxt
* @param container
* @param app
* @author Greg Solovyev
**/
ZaGlobalStatsController = function(appCtxt, container) {
   	this._toolbarOperations = new Array();
   	this._toolbarOrder = new Array();
	ZaController.call(this, appCtxt, container, "ZaGlobalStatsController");
	this._helpURL = location.pathname + ZaUtil.HELP_URL + "monitoring/checking_usage_statistics.htm?locid="+AjxEnv.DEFAULT_LOCALE;
	this.tabConstructor = ZaGlobalStatsView;		
}

ZaGlobalStatsController.prototype = new ZaController();
ZaGlobalStatsController.prototype.constructor = ZaGlobalStatsController;
ZaController.setViewMethods["ZaGlobalStatsController"] = [];
//ZaGlobalStatsController.STATUS_VIEW = "ZaGlobalStatsController.STATUS_VIEW";

ZaGlobalStatsController.prototype.show = 
function() {
	this._setView();
	ZaApp.getInstance().pushView(this.getContentViewId());
	var item=new Object();
	try {		
		item[ZaModel.currentTab] = "1"
		this._contentView.setObject(item);
	} catch (ex) {
		this._handleException(ex, "ZaGlobalConfigViewController.prototype.show", null, false);
	}
	this._currentObject = item;	
}


ZaGlobalStatsController.setViewMethod =
function() {	
    if (!this._contentView) {
		this._contentView  = new this.tabConstructor(this._container);
		var elements = new Object();

		this._toolbarOperations[ZaOperation.REFRESH] = new ZaOperation(ZaOperation.REFRESH, ZaMsg.TBB_Refresh, ZaMsg.TBB_Refresh_tt, "Refresh", "Refresh", new AjxListener(this, this.refreshListener));
		this._toolbarOperations[ZaOperation.NONE] = new ZaOperation(ZaOperation.NONE);
		this._toolbarOperations[ZaOperation.HELP] = new ZaOperation(ZaOperation.HELP, ZaMsg.TBB_Help, ZaMsg.TBB_Help_tt, "Help", "Help", new AjxListener(this, this._helpButtonListener));				
		
		
		this._toolbarOrder.push(ZaOperation.REFRESH);
		this._toolbarOrder.push(ZaOperation.NONE);
		this._toolbarOrder.push(ZaOperation.HELP);
			
		this._toolbar = new ZaToolBar(this._container, this._toolbarOperations,this._toolbarOrder);    		
		
		elements[ZaAppViewMgr.C_APP_CONTENT] = this._contentView;
		elements[ZaAppViewMgr.C_TOOLBAR_TOP] = this._toolbar;		
		var tabParams = {
			openInNewTab: false,
			tabId: this.getContentViewId(),
			tab: this.getMainTab()
		}
		ZaApp.getInstance().createView(this.getContentViewId(), elements, tabParams) ;
		this._UICreated = true;
		ZaApp.getInstance()._controllers[this.getContentViewId ()] = this ;		
	}
}
ZaController.setViewMethods["ZaGlobalStatsController"].push(ZaGlobalStatsController.setViewMethod);


ZaGlobalStatsController.prototype.refreshListener =
function (ev) {
	var currentTabView = this._contentView._tabs[this._contentView._currentTabKey]["view"];
	if (currentTabView && currentTabView.showMe) {
		currentTabView.showMe(2) ; //force server side cache to be refreshed.
	}
}