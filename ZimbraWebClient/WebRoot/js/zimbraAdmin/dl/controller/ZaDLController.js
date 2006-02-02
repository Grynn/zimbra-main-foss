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
* @class ZaDLController controls display of a single Distribution list
 * @author EMC
 * Distribution list controller 
 */
function ZaDLController (appCtxt, container, app) {
	ZaXFormViewController.call(this, appCtxt, container, app, "ZaDLController");
	this._UICreated = false;
	this._toolbarOperations = new Array();
	this._helpURL = "/zimbraAdmin/adminhelp/html/WebHelp/managing_accounts/provisioning_accounts.htm";	
	this.deleteMsg = ZaMsg.Q_DELETE_DL;
	this.objType = ZaEvent.S_DL;	
}

ZaDLController.prototype = new ZaXFormViewController();
ZaDLController.prototype.constructor = ZaDLController;

ZaController.initToolbarMethods["ZaDLController"] = new Array();

ZaDLController.prototype.toString = function () {
	return "ZaDLController";
};

ZaDLController.prototype.handleXFormChange = function (ev) {
	if(ev && ev.form.hasErrors()) { 
		this._toolbar.getButton(ZaOperation.SAVE).setEnabled(false);
	}
}
ZaDLController.prototype.show = function(entry) {
    if (!this._UICreated) {
		this._createUI();
	} 	
	try {
		this._app.pushView(ZaZimbraAdmin._DL_VIEW);
		if(!entry.id) {
			this._toolbar.getButton(ZaOperation.DELETE).setEnabled(false);  			
		} else {
			this._toolbar.getButton(ZaOperation.DELETE).setEnabled(true);  				
			entry.getMembers();
		}	
		this._view.setDirty(false);
		entry[ZaModel.currentTab] = "1"
		this._view.setObject(entry);
		this._currentObject = entry;
	} catch (ex) {
		this._handleException(ex, "ZaDLController.prototype.show", null, false);
	}	
};

ZaDLController.initToolbarMethod =
function () {
   	this._toolbarOperations.push(new ZaOperation(ZaOperation.SAVE, ZaMsg.TBB_Save, ZaMsg.ALTBB_Save_tt, "Save", "SaveDis", new AjxListener(this, this.saveButtonListener)));
   	this._toolbarOperations.push(new ZaOperation(ZaOperation.CLOSE, ZaMsg.TBB_Close, ZaMsg.ALTBB_Close_tt, "Close", "CloseDis", new AjxListener(this, this.closeButtonListener)));    	
   	this._toolbarOperations.push(new ZaOperation(ZaOperation.SEP));
	this._toolbarOperations.push(new ZaOperation(ZaOperation.NEW, ZaMsg.TBB_New, ZaMsg.DLTBB_New_tt, "Group", "GroupDis", new AjxListener(this, this.newButtonListener)));   			    	
   	this._toolbarOperations.push(new ZaOperation(ZaOperation.DELETE, ZaMsg.TBB_Delete, ZaMsg.DLTBB_Delete_tt,"Delete", "DeleteDis", new AjxListener(this, this.deleteButtonListener)));    	    	
}
ZaController.initToolbarMethods["ZaDLController"].push(ZaDLController.initToolbarMethod);

ZaDLController.prototype.newDl = function () {
	var newDL = new ZaDistributionList(this._app);
	this.show(newDL);
}

// new button was pressed
ZaDLController.prototype.newButtonListener =
function(ev) {
	if(this._view.isDirty()) {
		//parameters for the confirmation dialog's callback 
		var args = new Object();		
		args["params"] = null;
		args["obj"] = this;
		args["func"] = ZaDLController.prototype.newDl;
		//ask if the user wants to save changes		
		this._confirmMessageDialog = new ZaMsgDialog(this._view.shell, null, [DwtDialog.YES_BUTTON, DwtDialog.NO_BUTTON, DwtDialog.CANCEL_BUTTON], this._app);								
		this._confirmMessageDialog.setMessage(ZaMsg.Q_SAVE_CHANGES, DwtMessageDialog.INFO_STYLE);
		this._confirmMessageDialog.registerCallback(DwtDialog.YES_BUTTON, this.saveAndGoAway, this, args);		
		this._confirmMessageDialog.registerCallback(DwtDialog.NO_BUTTON, this.discardAndGoAway, this, args);		
		this._confirmMessageDialog.popup();
	} else {
		this.newDl();
	}	
}

//private and protected methods
ZaDLController.prototype._createUI = 
function () {
	//create accounts list view
	// create the menu operations/listeners first	
	this._view = new ZaDLXFormView(this._container, this._app);

    this._initToolbar();
	//always add Help button at the end of the toolbar    
	this._toolbarOperations.push(new ZaOperation(ZaOperation.NONE));
	this._toolbarOperations.push(new ZaOperation(ZaOperation.HELP, ZaMsg.TBB_Help, ZaMsg.TBB_Help_tt, "Help", "Help", new AjxListener(this, this._helpButtonListener)));		

	this._toolbar = new ZaToolBar(this._container, this._toolbarOperations);    
		
	var elements = new Object();
	elements[ZaAppViewMgr.C_APP_CONTENT] = this._view;
	elements[ZaAppViewMgr.C_TOOLBAR_TOP] = this._toolbar;		
	this._app.createView(ZaZimbraAdmin._DL_VIEW, elements);

	this._removeConfirmMessageDialog = new ZaMsgDialog(this._app.getAppCtxt().getShell(), null, [DwtDialog.YES_BUTTON, DwtDialog.NO_BUTTON], this._app);			
	this._UICreated = true;
}

ZaDLController.prototype._saveChanges = function () {
	var retval = false;
	var newName = null;
	try { 
		var obj = this._view.getObject();
		//check if need to rename
		if(this._currentObject && obj.name != this._currentObject.name && this._currentObject.id) {
		//	var emailRegEx = /^([a-zA-Z0-9_\-])+((\.)?([a-zA-Z0-9_\-])+)*@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
			if(!AjxUtil.EMAIL_RE.test(obj.name) ) {
				//show error msg
				this._errorDialog.setMessage(ZaMsg.ERROR_ACCOUNT_NAME_INVALID, null, DwtMessageDialog.CRITICAL_STYLE, null);
				this._errorDialog.popup();		
				return retval;
			}
			newName = obj.name;
		}		
		
		//check if need to rename
		if(newName) {
			try {
				this._currentObject.rename(newName);
			} catch (ex) {
				if (ex.code == ZmCsfeException.SVC_AUTH_EXPIRED || ex.code == ZmCsfeException.SVC_AUTH_REQUIRED || ex.code == ZmCsfeException.NO_AUTH_TOKEN) {
						this._showLoginDialog();
				} else {
					if(ex.code == ZmCsfeException.DISTRIBUTION_LIST_EXISTS) {
						this.popupErrorDialog(ZaMsg.FAILED_RENAME_ACCOUNT_1, ex, true);
					} else {
						this.popupErrorDialog(ZaMsg.FAILED_RENAME_ACCOUNT, ex, true);
					}
				}
				return retval;
			}
		}		
		
		if (this._currentObject.id){
			retval = this._currentObject.modify(obj);
			return retval;
		} else {
			var _tmpObj = ZaDistributionList.create(obj, this._app);
			if(_tmpObj != null) {
				this.fireCreationEvent(_tmpObj);
				this._currentObject = _tmpObj;
				return true;
			}
		}
	} catch (ex) {
		var handled = false;
		if (ex.code == ZmCsfeException.SVC_FAILURE) {
			// TODO -- make this a ZaMsg, and grab the member name out of the exception message.
			//
			if (ex.msg.indexOf("add failed") != -1){
				var m = ex.msg.replace(/system failure: /, "");
				this.popupErrorDialog(m, ex, true);		
				handled = true;
			}
		} else if (ex.code == ZmCsfeException.DISTRIBUTION_LIST_EXISTS) {
			this.popupErrorDialog(AjxMessageFormat.format(ZaMsg.DLXV_ErrorDistributionListExists,[dl.name]), ex, true);		
			handled = true;
		}
		if (!handled) {
			this._handleException(ex, "ZaDLController.prototype._saveChanges", null, false);
		}
		return false;
	}
};

