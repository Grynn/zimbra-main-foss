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
* @class ZaDLController controls display of a single Distribution list
 * @author EMC
 * Distribution list controller 
 */
ZaDLController = function(appCtxt, container) {
	ZaXFormViewController.call(this, appCtxt, container,"ZaDLController");
	this._UICreated = false;
	this._toolbarOperations = new Array();
	this._helpURL = location.pathname + ZaUtil.HELP_URL + "managing_accounts/distribution_lists.htm?locid="+AjxEnv.DEFAULT_LOCALE;
	this.deleteMsg = ZaMsg.Q_DELETE_DL;
	this.objType = ZaEvent.S_ACCOUNT;
	this.tabConstructor = ZaDLXFormView;
	this._removeAliasArr = [];
	this._addAliasArr = [];		
}

ZaDLController.prototype = new ZaXFormViewController();
ZaDLController.prototype.constructor = ZaDLController;

ZaController.initToolbarMethods["ZaDLController"] = new Array();
ZaController.setViewMethods["ZaDLController"] = [];

ZaDLController.prototype.toString = function () {
	return "ZaDLController";
};


ZaDLController.prototype.show = 
function(entry, openInNewTab, skipRefresh) {
	this._setView(entry, openInNewTab, skipRefresh);
}

ZaDLController.setViewMethod =
function (entry)	{
    if (!this._UICreated) {
		this._createUI();
	} 	
	try {
		//ZaApp.getInstance().pushView(ZaZimbraAdmin._DL_VIEW);
		ZaApp.getInstance().pushView(this.getContentViewId());
		if(!entry.id) {
			this._toolbar.getButton(ZaOperation.DELETE).setEnabled(false);  			
		} else {
			this._toolbar.getButton(ZaOperation.DELETE).setEnabled(true);  				
//			entry.getMembers();
//          Allow stacks of functions to be loaded for the view, especially useful to load the permission tab
            entry.refresh () ;
        }
		this._view.setDirty(false);
		entry[ZaModel.currentTab] = "1";
		this._view.setObject(entry);
		this._currentObject = entry;
		
	} catch (ex) {
		this._handleException(ex, "ZaDLController.prototype.show", null, false);
	}	
};
ZaController.setViewMethods["ZaDLController"].push(ZaDLController.setViewMethod);

ZaDLController.initToolbarMethod =
function () {
   	this._toolbarOperations[ZaOperation.SAVE]=new ZaOperation(ZaOperation.SAVE,ZaMsg.TBB_Save, ZaMsg.ALTBB_Save_tt, "Save", "SaveDis", new AjxListener(this, this.saveButtonListener));
   	this._toolbarOperations[ZaOperation.CLOSE]=new ZaOperation(ZaOperation.CLOSE,ZaMsg.TBB_Close, ZaMsg.ALTBB_Close_tt, "Close", "CloseDis", new AjxListener(this, this.closeButtonListener));    	
   	this._toolbarOperations[ZaOperation.SEP] = new ZaOperation(ZaOperation.SEP);
	this._toolbarOperations[ZaOperation.NEW]=new ZaOperation(ZaOperation.NEW,ZaMsg.TBB_New, ZaMsg.DLTBB_New_tt, "Group", "GroupDis", new AjxListener(this, this.newButtonListener, [true]));   			    	
   	this._toolbarOperations[ZaOperation.DELETE]=new ZaOperation(ZaOperation.DELETE,ZaMsg.TBB_Delete, ZaMsg.DLTBB_Delete_tt,"Delete", "DeleteDis", new AjxListener(this, this.deleteButtonListener));
   	
	this._toolbarOrder.push(ZaOperation.SAVE);
	this._toolbarOrder.push(ZaOperation.CLOSE);
	this._toolbarOrder.push(ZaOperation.SEP);
	this._toolbarOrder.push(ZaOperation.NEW);
	this._toolbarOrder.push(ZaOperation.DELETE);   	    	    	
}
ZaController.initToolbarMethods["ZaDLController"].push(ZaDLController.initToolbarMethod);

ZaDLController.prototype.newDl = function () {
	var newDL = new ZaDistributionList();
	this.show(newDL);
}

// new button was pressed
ZaDLController.prototype.newButtonListener =
function(openInNewTab, ev) {
	if (openInNewTab) {
		ZaAccountListController.prototype._newDistributionListListener.call (this) ;
	}else{
		if(this._view.isDirty()) {
			//parameters for the confirmation dialog's callback 
			var args = new Object();		
			args["params"] = null;
			args["obj"] = this;
			args["func"] = ZaDLController.prototype.newDl;
			//ask if the user wants to save changes		
			//ZaApp.getInstance().dialogs["confirmMessageDialog"] = ZaApp.getInstance().dialogs["confirmMessageDialog"] = new ZaMsgDialog(this._view.shell, null, [DwtDialog.YES_BUTTON, DwtDialog.NO_BUTTON, DwtDialog.CANCEL_BUTTON]);								
			ZaApp.getInstance().dialogs["confirmMessageDialog"].setMessage(ZaMsg.Q_SAVE_CHANGES, DwtMessageDialog.INFO_STYLE);
			ZaApp.getInstance().dialogs["confirmMessageDialog"].registerCallback(DwtDialog.YES_BUTTON, this.saveAndGoAway, this, args);		
			ZaApp.getInstance().dialogs["confirmMessageDialog"].registerCallback(DwtDialog.NO_BUTTON, this.discardAndGoAway, this, args);		
			ZaApp.getInstance().dialogs["confirmMessageDialog"].popup();
		} else {
			this.newDl();
		}	
	}
}

//private and protected methods
ZaDLController.prototype._createUI = 
function () {
	//create accounts list view
	// create the menu operations/listeners first	
	this._contentView = this._view = new this.tabConstructor(this._container);

    this._initToolbar();
	//always add Help button at the end of the toolbar    
	this._toolbarOperations[ZaOperation.NONE] = new ZaOperation(ZaOperation.NONE);
	this._toolbarOperations[ZaOperation.HELP]=new ZaOperation(ZaOperation.HELP,ZaMsg.TBB_Help, ZaMsg.TBB_Help_tt, "Help", "Help", new AjxListener(this, this._helpButtonListener));		
	this._toolbarOrder.push(ZaOperation.NONE);
	this._toolbarOrder.push(ZaOperation.HELP);	
	this._toolbar = new ZaToolBar(this._container, this._toolbarOperations,this._toolbarOrder);    
		
	var elements = new Object();
	elements[ZaAppViewMgr.C_APP_CONTENT] = this._view;
	elements[ZaAppViewMgr.C_TOOLBAR_TOP] = this._toolbar;		
	//ZaApp.getInstance().createView(ZaZimbraAdmin._DL_VIEW, elements);
	var tabParams = {
			openInNewTab: true,
			tabId: this.getContentViewId()
		}
	ZaApp.getInstance().createView(this.getContentViewId(), elements, tabParams) ;
	
	this._removeConfirmMessageDialog = new ZaMsgDialog(ZaApp.getInstance().getAppCtxt().getShell(), null, [DwtDialog.YES_BUTTON, DwtDialog.NO_BUTTON]);			
	this._UICreated = true;
	ZaApp.getInstance()._controllers[this.getContentViewId()] = this ;
}
/**
 * This method is called by an asynchronous command when
 * AddDistributionListMemberRequest or ModifyDistributionListRequest return
 */
ZaDLController.prototype.saveChangesCallback = function (obj, resp) {
	try {
		if(!resp) {
			throw(new AjxException(ZaMsg.ERROR_EMPTY_RESPONSE_ARG, AjxException.UNKNOWN, "ZaListViewController.prototype.searchCallback"));
		}
		if(resp.isException()) {
			throw(resp.getException());
		} else {
			if (resp.getResponse() && resp.getResponse().Body) {
				if(resp.getResponse().Body.ModifyDistributionListResponse) {
					this.getProgressDialog().setProgress({numTotal:100,numDone:100,progressMsg:ZaMsg.MSG_SAVING_DL})
					this.getProgressDialog().popup();	
					var response = resp.getResponse().Body.ModifyDistributionListResponse;
					this._currentObject.initFromJS(response.dl[0]);	
				} else if (resp.getResponse().Body.RemoveDistributionListMemberResponse && obj._removeList) {
					this.getProgressDialog().setProgress({numTotal:this._totalToRemove,numDone:(this._totalToRemove-obj._removeList.size()),progressMsg:ZaMsg.MSG_REMOVING_DL_MEMBERS});					
					this.getProgressDialog().enableOk(false);
				} else if (resp.getResponse().Body.AddDistributionListMemberResponse && obj._addList) {
					this.getProgressDialog().setProgress({numTotal:this._totalToAdd,numDone:(this._totalToAdd-obj._addList.size()),progressMsg:ZaMsg.MSG_ADDING_DL_MEMBERS});				
					this.getProgressDialog().enableOk(false);
				} else if (resp.getResponse().Body.CreateDistributionListResponse) {
					var dl = new ZaDistributionList();
					dl.initFromJS(resp.getResponse().Body.CreateDistributionListResponse.dl[0]);
					this._currentObject = dl;
				}
			}
			
			// add/remove aliases
			try {
				for(var ix=0; ix < this._removeAliasArr.length; ix++) {
					this._currentObject.removeAlias(this._removeAliasArr [ix]);
				}
			} catch (ex) {
				this._handleException(ex, "ZaDLController.prototype._saveChanges", null, false);
					
				return false;
			}
			
			var failedAliases = "";
			var failedAliasesCnt = 0;
			try {
				for(var ix=0; ix < this._addAliasArr.length; ix++) {
					var curAlias = this._addAliasArr[ix] ;
					try {
						if(curAlias) {
//							if(!AjxUtil.EMAIL_SHORT_RE.test(curAlias)) {
							if(curAlias.lastIndexOf ("@")!=curAlias.indexOf ("@")) {
								//show error msg
								this._errorDialog.setMessage(AjxMessageFormat.format(ZaMsg.ERROR_ALIAS_INVALID,[curAlias]), null, DwtMessageDialog.CRITICAL_STYLE, null);
								this._errorDialog.popup();		
								break;						
							}
							this._currentObject.addAlias(curAlias);
						}
					} catch (ex) {
						if(ex.code == ZmCsfeException.ACCT_EXISTS || ex.code == ZmCsfeException.DISTRIBUTION_LIST_EXISTS) {
							//if failed because account exists just show a warning
							var account = this._findAlias(curAlias);
							switch(account.type) {
								case ZaItem.DL:
									if(account.name == curAlias) {
										failedAliases += "<br>" +AjxMessageFormat.format(ZaMsg.WARNING_EACH_ALIAS3,[account.name]);								
									} else {
										failedAliases += "<br>" +AjxMessageFormat.format(ZaMsg.WARNING_EACH_ALIAS4,[account.name, curAlias]);								
									}
								break;
								case ZaItem.ACCOUNT:
									if(account.name == curAlias) {
										failedAliases += "<br>" +AjxMessageFormat.format(ZaMsg.WARNING_EACH_ALIAS2,[account.name]);								
									} else {
										failedAliases += "<br>" +AjxMessageFormat.format(ZaMsg.WARNING_EACH_ALIAS1,[account.name, curAlias]);								
									}							
								break;	
								case ZaItem.RESOURCE:
									if(account.name == curAlias) {
										failedAliases += "<br>" +AjxMessageFormat.format(ZaMsg.WARNING_EACH_ALIAS5,[account.name]);								
									} else {
										failedAliases += "<br>" +AjxMessageFormat.format(ZaMsg.WARNING_EACH_ALIAS6,[account.name, obj.attrs[ZaAccount.A_zimbraMailAlias][ix]]);								
									}							
								break;							
								default:
									failedAliases += "<br>" +AjxMessageFormat.format(ZaMsg.WARNING_EACH_ALIAS0,[curAlias]);							
								break;
							}
							failedAliasesCnt++;
						} else {
							//if failed for another reason - jump out
							throw (ex);
						}
					}
				}
		
				if(failedAliasesCnt == 1) {
					this._errorDialog.setMessage(ZaMsg.WARNING_ALIAS_EXISTS + failedAliases, "", DwtMessageDialog.WARNING_STYLE, ZaMsg.zimbraAdminTitle);
					this._errorDialog.popup();			
				} else if(failedAliasesCnt > 1) {
					this._errorDialog.setMessage(ZaMsg.WARNING_ALIASES_EXIST + failedAliases, "", DwtMessageDialog.WARNING_STYLE, ZaMsg.zimbraAdminTitle);
					this._errorDialog.popup();			
				}
			} catch (ex) {
				this.popupErrorDialog(ZaMsg.FAILED_ADD_ALIASES, ex, true);	
				return false;
			}
						
			//add/remove memberOf lists
			if(obj._addList && obj._addList.size()) {
				var finishedCallback = new AjxCallback(this,this.saveChangesCallback, obj);
				this._currentObject.addNewMembersAsync(obj,finishedCallback);
			} else if(obj._removeList && obj._removeList.size()) {
				//the list of members to be removed is reduced by each call to removeDeletedMembersAsync
			//	this.getProgressDialog().setProgress({numTotal:this._totalToRemove,numDone:(this._totalToRemove-obj._removeList.size()),progressMsg:ZaMsg.MSG_REMOVING_DL_MEMBERS})
				//this.getProgressDialog().popup();				
//				this.getProgressDialog().enableOk(false);
				var finishedCallback = new AjxCallback(this,this.saveChangesCallback, obj);
				this._currentObject.removeDeletedMembersAsync(obj._removeList,finishedCallback);
			} else {	
				this.getProgressDialog().enableOk(true);	
				//add the membership information
				//update the member of first
				try {
					if (ZaAccountMemberOfListView._addList.length >0) { //you have new membership to be added.
						ZaAccountMemberOfListView.addNewGroupsBySoap(this._currentObject, ZaAccountMemberOfListView._addList);
					}	
					ZaAccountMemberOfListView._addList = []; //reset
				} catch (ex){
					ZaAccountMemberOfListView._addList = []; //reset
					this._handleException(ex, "ZaDistributionList.prototype.modify: add distribution list failed", null, false);	//try not to halt the account modification	
				}
				//remove may not needed during the creation time.
				try {
					if (ZaAccountMemberOfListView._removeList.length >0){//you have membership to be removed
						ZaAccountMemberOfListView.removeGroupsBySoap(this._currentObject, ZaAccountMemberOfListView._removeList);
					}
					ZaAccountMemberOfListView._removeList = []; //reset
				} catch (ex){
					ZaAccountMemberOfListView._removeList = []; //reset
					this._handleException(ex, "ZaDistributionList.prototype.modify: remove distribution list failed", null, false);		
				}
				this._currentObject.refresh(false,true);
				this._currentObject.markClean();	
			
				this._toolbar.getButton(ZaOperation.DELETE).setEnabled(true); 
				this._view.setDirty(false);
				if(this._toolbar)
					this._toolbar.getButton(ZaOperation.SAVE).setEnabled(false);		
				
				this._view.setObject(this._currentObject);			
				this.fireChangeEvent(this._currentObject);	
				this.getProgressDialog().popdown();				
			}	
		}
	} catch (ex) {
		this.getProgressDialog().popdown();	
		this._handleException(ex, "ZaDLController.prototype.saveChangesCallback", null, false);	
	}
	return;
}

ZaDLController.prototype._saveChanges = function () {
	var retval = false;
	var newName = null;
	var obj;
	try { 
		if(this._view.getMyForm().hasErrors()) {
			var errItems = this._view.getMyForm().getItemsInErrorState();
			var dlgMsg = ZaMsg.CORRECT_ERRORS;
			dlgMsg +=  "<br><ul>";
			var i = 0;
			for(var key in errItems) {
				if(i > 19) {
					dlgMsg += "<li>...</li>";
					break;
				}
				if(key == "size") continue;
				var label = errItems[key].getInheritedProperty("msgName");
				if (!label && errItems[key].getLabel()) {
					label = errItems[key].getLabel();
				} else if(!label && errItems[key].getParentItem()) { //this might be a part of a composite
					if(errItems[key].getParentItem().getInheritedProperty("msgName")) {
						label = errItems[key].getParentItem().getInheritedProperty("msgName");
					} else {
						label = errItems[key].getParentItem().getLabel();
					}
				} 
				if(label) {
					if(label.substring(label.length-1,1)==":") {
						label = label.substring(0, label.length-1);
					}
				}			
				if(label) {
					dlgMsg += "<li>";
					dlgMsg +=label;			
					dlgMsg += "</li>";
				}
				i++;
			}
			dlgMsg += "</ul>";
			this.popupMsgDialog(dlgMsg, true);
			return false;
		}
		obj = this._view.getObject();
			
		if(!ZaDistributionList.checkValues(obj))
			return retval;
		
		if (this._currentObject.id){

			this._currentObject.modify(obj);
			//check if need to rename
			if(this._currentObject && obj.name != this._currentObject.name && this._currentObject.id) {
				newName = obj.name;
			}		
					
			//check if need to rename
			if(newName) {
				try {
					this._currentObject.rename(newName);
				} catch (ex) {
					if(ex.code == ZmCsfeException.DISTRIBUTION_LIST_EXISTS) {
						this.popupErrorDialog(ZaMsg.FAILED_RENAME_DL_1, ex, true);
					} else {
						this.popupErrorDialog(ZaMsg.FAILED_RENAME_DL, ex, true);	
					}
					return retval;
				}
			}				
		} else {
			this._currentObject = ZaItem.create(obj,ZaDistributionList,"ZaDistributionList");
			//this._currentObject.id = dl.id;
		}
				
		//save changed fields
	} catch (ex) {
		if(ex.code == ZmCsfeException.ACCT_EXISTS || ex.code == ZmCsfeException.DISTRIBUTION_LIST_EXISTS) {
			this.popupErrorDialog(ZaMsg.ERROR_dlWithThisNameExists, ex, true);
		} else {
			this._handleException(ex, "ZaDLController.prototype._saveChanges", null, false);	
		}
		return false;
	}		
	return true;
};

