/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: ZPL 1.2
 * 
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.2 ("License"); you may not use this file except in
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
 * Portions created by Zimbra are Copyright (C) 2005, 2006 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s):
 * 
 * ***** END LICENSE BLOCK *****
 */

/**
* @class ZaCosController controls display of a single COS
* @contructor ZaCosController
* @param appCtxt
* @param container
* @param abApp
**/

function ZaCosController(appCtxt, container,app) {
	ZaXFormViewController.call(this, appCtxt, container,app, "ZaCosController");
	this._UICreated = false;	
	this._helpURL = "/zimbraAdmin/adminhelp/html/WebHelp/cos/class_of_service.htm";		
	this.deleteMsg = ZaMsg.Q_DELETE_COS;
	this.objType = ZaEvent.S_COS;
}

ZaCosController.prototype = new ZaXFormViewController();
ZaCosController.prototype.constructor = ZaCosController;

/**
*	@method show
*	@param entry - isntance of ZaCos class
*/

ZaCosController.prototype.show = 
function(entry) {
	this._setView(entry);
}



/**
* Adds listener to modifications in the contained ZaCos 
* @param listener
**/
ZaCosController.prototype.addCosChangeListener = 
function(listener) {
	this._evtMgr.addListener(ZaEvent.E_MODIFY, listener);
}

/**
* Removes listener to modifications in the controlled ZaCos 
* @param listener
**/
ZaCosController.prototype.removeCosChangeListener = 
function(listener) {
	this._evtMgr.removeListener(ZaEvent.E_MODIFY, listener);    	
}

/**
* Adds listener to creation of an ZaCos 
* @param listener
**/
ZaCosController.prototype.addCosCreationListener = 
function(listener) {
	this._evtMgr.addListener(ZaEvent.E_CREATE, listener);
}

/**
* Removes listener to creation of an ZaCos 
* @param listener
**/
ZaCosController.prototype.removeCosCreationListener = 
function(listener) {
	this._evtMgr.removeListener(ZaEvent.E_CREATE, listener);    	
}

/**
* Adds listener to removal of an ZaCos 
* @param listener
**/
ZaCosController.prototype.addCosRemovalListener = 
function(listener) {
	this._evtMgr.addListener(ZaEvent.E_REMOVE, listener);
}

/**
* Removes listener to removal of an ZaCos 
* @param listener
**/
ZaCosController.prototype.removeCosRemovalListener = 
function(listener) {
	this._evtMgr.removeListener(ZaEvent.E_REMOVE, listener);    	
}



/**
*	@method _setView 
*	@param entry - isntance of ZaCos class
*/
ZaCosController.prototype._setView =
function(entry) {
	try {
	   	//create toolbar
		if(!this._UICreated) {
		   	this._ops = new Array();
	   		this._ops.push(new ZaOperation(ZaOperation.SAVE, ZaMsg.TBB_Save, ZaMsg.COSTBB_Save_tt, "Save", "SaveDis", new AjxListener(this, this.saveButtonListener)));
	   		this._ops.push(new ZaOperation(ZaOperation.CLOSE, ZaMsg.TBB_Close, ZaMsg.COSTBB_Close_tt, "Close", "CloseDis", new AjxListener(this, this.closeButtonListener)));    	
   			this._ops.push(new ZaOperation(ZaOperation.SEP));
	   		this._ops.push(new ZaOperation(ZaOperation.NEW, ZaMsg.TBB_New, ZaMsg.COSTBB_New_tt, "NewCOS", "NewCOSDis", new AjxListener(this, ZaCosController.prototype._newButtonListener)));
	   		this._ops.push(new ZaOperation(ZaOperation.DELETE, ZaMsg.TBB_Delete, ZaMsg.COSTBB_Delete_tt, "Delete", "DeleteDis", new AjxListener(this, this.deleteButtonListener)));    	    	
			this._ops.push(new ZaOperation(ZaOperation.NONE));
			this._ops.push(new ZaOperation(ZaOperation.HELP, ZaMsg.TBB_Help, ZaMsg.TBB_Help_tt, "Help", "Help", new AjxListener(this, this._helpButtonListener)));							
			this._toolbar = new ZaToolBar(this._container, this._ops);
	
		  	this._view = new ZaCosXFormView(this._container, this._app, entry.id);
			var elements = new Object();
			elements[ZaAppViewMgr.C_APP_CONTENT] = this._view;
			elements[ZaAppViewMgr.C_TOOLBAR_TOP] = this._toolbar;			  	
		    this._app.createView(ZaZimbraAdmin._COS_VIEW, elements);  	
		    this._UICreated = true;
	  	}
	
		this._app.pushView(ZaZimbraAdmin._COS_VIEW);
		this._toolbar.getButton(ZaOperation.SAVE).setEnabled(false);
		if(!entry.id || (entry.name == "default")) {
			this._toolbar.getButton(ZaOperation.DELETE).setEnabled(false);  			
		} else {
			this._toolbar.getButton(ZaOperation.DELETE).setEnabled(true);  				
		}	
		this._view.setDirty(false);
		entry[ZaModel.currentTab] = "1"
	  	this._view.setObject(entry);

	} catch (ex) {
		this._handleException(ex, "ZaCosController.prototype._setView", null, false);	
	}
	this._currentObject = entry;
}

/**
* saves the changes in the fields, calls modify or create on the current ZaCos
* @return Boolean - indicates if the changes were succesfully saved
**/
ZaCosController.prototype._saveChanges =
function () {

	//check if the XForm has any errors
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
			if(!label && errItems[key].getParentItem()) { //this might be a part of a composite
				label = errItems[key].getParentItem().getInheritedProperty("msgName");
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
		this.popupMsgDialog(dlgMsg,  true);
		return false;
	}
	
	//check if the data is copmlete 
	var tmpObj = this._view.getObject();
	var isNew = false;
	//Check the data
	if(tmpObj.attrs == null) {
		//show error msg
		this._errorDialog.setMessage(ZaMsg.ERROR_UNKNOWN, null, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);
		this._errorDialog.popup();		
		return false;	
	}

	//name
	if(tmpObj.attrs[ZaCos.A_name] == null || tmpObj.attrs[ZaCos.A_name].length < 1 ) {
		//show error msg
		this._errorDialog.setMessage(ZaMsg.ERROR_NAME_REQUIRED, null, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);
		this._errorDialog.popup();		
		return false;
	} else {
		tmpObj.name = tmpObj.attrs[ZaCos.A_name];
	}

	if(tmpObj.name.length > 256 || tmpObj.attrs[ZaCos.A_name].length > 256) {
		//show error msg
		this._errorDialog.setMessage(ZaMsg.ERROR_COS_NAME_TOOLONG, null, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);
		this._errorDialog.popup();		
		return false;
	}
	
	/**
	* check values
	**/
	
	if(!AjxUtil.isNonNegativeLong(tmpObj.attrs[ZaCos.A_zimbraMailQuota])) {
		//show error msg
		this._errorDialog.setMessage(ZaMsg.ERROR_INVALID_VALUE + ": " + ZaMsg.NAD_MailQuota + " ! ", null, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);
		this._errorDialog.popup();		
		return false;
	}

	if(!AjxUtil.isNonNegativeLong(tmpObj.attrs[ZaCos.A_zimbraContactMaxNumEntries])) {
		//show error msg
		this._errorDialog.setMessage(ZaMsg.ERROR_INVALID_VALUE + ": " + ZaMsg.NAD_ContactMaxNumEntries + " ! ", null, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);
		this._errorDialog.popup();		
		return false;
	}
	
	if(!AjxUtil.isNonNegativeLong(tmpObj.attrs[ZaCos.A_zimbraMinPwdLength])) {
		//show error msg
		this._errorDialog.setMessage(ZaMsg.ERROR_INVALID_VALUE + ": " + ZaMsg.NAD_passMinLength + " ! ", null, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);
		this._errorDialog.popup();		
		return false;
	}
	
	if(!AjxUtil.isNonNegativeLong(tmpObj.attrs[ZaCos.A_zimbraMaxPwdLength])) {
		//show error msg
		this._errorDialog.setMessage(ZaMsg.ERROR_INVALID_VALUE + ": " + ZaMsg.NAD_passMaxLength + " ! ", null, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);
		this._errorDialog.popup();		
		return false;
	}	
	
	if(parseInt(tmpObj.attrs[ZaCos.A_zimbraMaxPwdLength]) < parseInt(tmpObj.attrs[ZaCos.A_zimbraMinPwdLength]) && parseInt(tmpObj.attrs[ZaCos.A_zimbraMaxPwdLength]) > 0) {
		//show error msg
		this._errorDialog.setMessage(ZaMsg.ERROR_MAX_MIN_PWDLENGTH, null, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);
		this._errorDialog.popup();		
		return false;
	}	

	if(!AjxUtil.isNonNegativeLong(tmpObj.attrs[ZaCos.A_zimbraMinPwdAge])) {
		//show error msg
		this._errorDialog.setMessage(ZaMsg.ERROR_INVALID_VALUE + ": " + ZaMsg.NAD_passMinAge + " ! ", null, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);
		this._errorDialog.popup();		
		return false;
	}		
	
	if(!AjxUtil.isNonNegativeLong(tmpObj.attrs[ZaCos.A_zimbraMaxPwdAge])) {
		//show error msg
		this._errorDialog.setMessage(ZaMsg.ERROR_INVALID_VALUE + ": " + ZaMsg.NAD_passMaxAge + " ! ", null, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);
		this._errorDialog.popup();		
		return false;
	}		
	
	if(parseInt(tmpObj.attrs[ZaCos.A_zimbraMaxPwdAge]) < parseInt(tmpObj.attrs[ZaCos.A_zimbraMinPwdAge]) && parseInt(tmpObj.attrs[ZaCos.A_zimbraMaxPwdAge]) > 0) {
		//show error msg
		this._errorDialog.setMessage(ZaMsg.ERROR_MAX_MIN_PWDAGE, null, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);
		this._errorDialog.popup();		
		return false;
	}
		
	if(!AjxUtil.isLifeTime(tmpObj.attrs[ZaCos.A_zimbraAuthTokenLifetime])) {
		//show error msg
		this._errorDialog.setMessage(ZaMsg.ERROR_INVALID_VALUE + ": " + ZaMsg.NAD_AuthTokenLifetime + " ! ", null, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);
		this._errorDialog.popup();		
		return false;
	}

/*	if(!AjxUtil.isLifeTime(tmpObj.attrs[ZaCos.A_zimbraAdminAuthTokenLifetime])) {
		//show error msg
		this._errorDialog.setMessage(ZaMsg.ERROR_INVALID_VALUE + ": " + ZaMsg.NAD_AdminAuthTokenLifetime + " ! ", null, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);
		this._errorDialog.popup();		
		return false;
	}		*/
	if(!AjxUtil.isLifeTime(tmpObj.attrs[ZaCos.A_zimbraMailIdleSessionTimeout])) {
		//show error msg
		this._errorDialog.setMessage(ZaMsg.ERROR_INVALID_VALUE + ": " + ZaMsg.NAD_MailIdleSessionTimeout + " ! ", null, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);
		this._errorDialog.popup();		
		return false;
	}			
	
	if(!AjxUtil.isLifeTime(tmpObj.attrs[ZaCos.A_zimbraPrefMailPollingInterval])) {
		//show error msg
		this._errorDialog.setMessage(ZaMsg.ERROR_INVALID_VALUE + ": " + ZaMsg.NAD_zimbraPrefMailPollingInterval + " ! ", null, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);
		this._errorDialog.popup();		
		return false;
	}		
	
	if(!AjxUtil.isLifeTime(tmpObj.attrs[ZaCos.A_zimbraMailMessageLifetime])) {
		//show error msg
		this._errorDialog.setMessage(ZaMsg.ERROR_INVALID_VALUE + ": " + ZaMsg.NAD_MailMessageLifetime + " ! ", null, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);
		this._errorDialog.popup();		
		return false;
	}			

	if(!AjxUtil.isLifeTime(tmpObj.attrs[ZaCos.A_zimbraMailTrashLifetime])) {
		//show error msg
		this._errorDialog.setMessage(ZaMsg.ERROR_INVALID_VALUE + ": " + ZaMsg.NAD_MailTrashLifetime + " ! ", null, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);
		this._errorDialog.popup();		
		return false;
	}	
	
	if(!AjxUtil.isLifeTime(tmpObj.attrs[ZaCos.A_zimbraMailSpamLifetime])) {
		//show error msg
		this._errorDialog.setMessage(ZaMsg.ERROR_INVALID_VALUE + ": " + ZaMsg.NAD_MailSpamLifetime + " ! ", null, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);
		this._errorDialog.popup();		
		return false;
	}		

	if(!AjxUtil.isLifeTime(tmpObj.attrs[ZaCos.A_zimbraPasswordLockoutDuration])) {
		//show error msg
		this._errorDialog.setMessage(ZaMsg.ERROR_INVALID_VALUE + ": " + ZaMsg.NAD_zimbraPasswordLockoutDuration + " ! ", null, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);
		this._errorDialog.popup();		
		return false;
	}	

	if(!AjxUtil.isLifeTime(tmpObj.attrs[ZaCos.A_zimbraPasswordLockoutFailureLifetime])) {
		//show error msg
		this._errorDialog.setMessage(ZaMsg.ERROR_INVALID_VALUE + ": " + ZaMsg.NAD_zimbraPasswordLockoutFailureLifetime + " ! ", null, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);
		this._errorDialog.popup();		
		return false;
	}	
			
	if(!AjxUtil.isNonNegativeLong(tmpObj.attrs[ZaCos.A_zimbraPrefContactsPerPage])) {
		//show error msg
		this._errorDialog.setMessage(ZaMsg.ERROR_INVALID_VALUE + ": " + ZaMsg.NAD_PrefContactsPerPage + " ! ", null, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);
		this._errorDialog.popup();		
		return false;
	}	
	if(!AjxUtil.isNonNegativeLong(tmpObj.attrs[ZaCos.A_zimbraEnforcePwdHistory])) {
		//show error msg
		this._errorDialog.setMessage(ZaMsg.ERROR_INVALID_VALUE + ": " + ZaMsg.NAD_passEnforceHistory + " ! ", null, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);
		this._errorDialog.popup();		
		return false;
	}	
		
	var mods = new Object();
	//var changeDetails = new Object();
	if(!tmpObj.id)
		isNew = true;
		
	//transfer the fields from the tmpObj to the _currentObject
	for (var a in tmpObj.attrs) {
		if( (a == ZaItem.A_objectClass) || (a == ZaItem.A_zimbraId) || (a == ZaCos.A_zimbraMailHostPool))
			continue;
		//check if the value has been modified or the object is new
		if (isNew || (this._currentObject.attrs[a] != tmpObj.attrs[a]) ) {
			mods[a] = tmpObj.attrs[a];
		}
	}
	//check if host pool has been changed
	var poolServerIds = new Array();
	if(tmpObj[ZaCos.A_zimbraMailHostPoolInternal]) {
		var cnt = tmpObj[ZaCos.A_zimbraMailHostPoolInternal].size();
		
		for(var i = 0; i < cnt; i ++) {
			poolServerIds.push(tmpObj[ZaCos.A_zimbraMailHostPoolInternal].get(i).id);
		}
		if(poolServerIds.join(",") != this._currentObject[ZaCos.A_zimbraMailHostPoolInternal].getArray().join(",")) {
			mods[ZaCos.A_zimbraMailHostPool] = poolServerIds;
		}
	}
	
	//check if zimbraAvailableSkin has been changed
	var skinIds = new Array();
	if(tmpObj.attrs[ZaCos.A_zimbraAvailableSkin] && (tmpObj.attrs[ZaCos.A_zimbraAvailableSkin] instanceof AjxVector)) {
		var cnt = tmpObj.attrs[ZaCos.A_zimbraAvailableSkin].size();
		for(var i = 0; i < cnt; i ++) {
			skinIds.push(tmpObj.attrs[ZaCos.A_zimbraAvailableSkin].get(i));
		}
		if(!(this._currentObject.attrs[ZaCos.A_zimbraAvailableSkin] instanceof Array)) {
			this._currentObject.attrs[ZaCos.A_zimbraAvailableSkin] = [this._currentObject.attrs[ZaCos.A_zimbraAvailableSkin]];
		}
		if((cnt > 0 && (!this._currentObject.attrs[ZaCos.A_zimbraAvailableSkin] || !this._currentObject.attrs[ZaCos.A_zimbraAvailableSkin].length))
		|| (skinIds.join("") != this._currentObject.attrs[ZaCos.A_zimbraAvailableSkin].join(""))) {
			mods[ZaCos.A_zimbraAvailableSkin] = skinIds;
		} 
		if(cnt==0)
			mods[ZaCos.A_zimbraAvailableSkin] = "";
	}	
	
	//check if zimbraZimletAvailableZimlets has been changed
	var zimIds = new Array();
	if(tmpObj.attrs[ZaCos.A_zimbraZimletAvailableZimlets] && (tmpObj.attrs[ZaCos.A_zimbraZimletAvailableZimlets] instanceof AjxVector)) {
		var cnt = tmpObj.attrs[ZaCos.A_zimbraZimletAvailableZimlets].size();
		for(var i = 0; i < cnt; i ++) {
			zimIds.push(tmpObj.attrs[ZaCos.A_zimbraZimletAvailableZimlets].get(i));
		}
		if(!(this._currentObject.attrs[ZaCos.A_zimbraZimletAvailableZimlets] instanceof Array)) {
			this._currentObject.attrs[ZaCos.A_zimbraZimletAvailableZimlets] = [this._currentObject.attrs[ZaCos.A_zimbraZimletAvailableZimlets]];
		}
		if((cnt > 0 && (!this._currentObject.attrs[ZaCos.A_zimbraZimletAvailableZimlets] || !this._currentObject.attrs[ZaCos.A_zimbraZimletAvailableZimlets].length))
		|| (zimIds.join("") != this._currentObject.attrs[ZaCos.A_zimbraZimletAvailableZimlets].join(""))) {
			mods[ZaCos.A_zimbraZimletAvailableZimlets] = zimIds;
		} 
		if(cnt==0)
			mods[ZaCos.A_zimbraZimletAvailableZimlets] = "";
	}		
	//check if need to rename
	if(!isNew) {
		if(tmpObj.name != this._currentObject.name) {
			newName=tmpObj.name;
			//changeDetails["newName"] = newName;
			try {
				this._currentObject.rename(newName);
			} catch (ex) {
				var detailStr = "";
				for (var prop in ex) {
					detailStr = detailStr + prop + " - " + ex[prop] + "\n";				
				}
				if(ex.code == ZmCsfeException.COS_EXISTS) {
					this._errorDialog.setMessage(ZaMsg.FAILED_RENAME_COS_1, detailStr, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);
					this._errorDialog.popup();
				} else {
					this._handleException(ex, "ZaCosController.prototype._saveChanges", null, false);	
				}
				return false;
			}
		}
	}
	//save changed fields
	try {	
		if(isNew) {
			this._currentObject.create(tmpObj.name, mods);
			//if creation took place - fire a CreationEvent
			this.fireCreationEvent(this._currentObject);
			this._toolbar.getButton(ZaOperation.DELETE).setEnabled(true);	
		} else {
			this._currentObject.modify(mods);
			//if modification took place - fire a ChangeEvent
			//changeDetails["obj"] = this._currentObject;
			//changeDetails["mods"] = mods;
			this.fireChangeEvent(this._currentObject);
		}
	} catch (ex) {
		var detailStr = "";
		for (var prop in ex) {
			if(ex[prop] instanceof Function) 
				continue;
				
			detailStr = detailStr + prop + " - " + ex[prop] + "\n";				
		}
		if(ex.code == ZmCsfeException.COS_EXISTS) {
			this._errorDialog.setMessage(ZaMsg.FAILED_CREATE_COS_1, detailStr, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);				
			this._errorDialog.popup();
		} else {
			this._handleException(ex, "ZaCosController.prototype._saveChanges", null, false);	
		}
		return false;
	}
	return true;
	
}

ZaCosController.prototype.newCos = 
function () {
	var newCos = new ZaCos(this._app);
	var defCos = new ZaCos(this._app);
	defCos.load("name", "default");
	//copy values from default cos to the new cos
	for(var aname in defCos.attrs) {
		if( (aname == ZaItem.A_objectClass) || (aname == ZaItem.A_zimbraId) || (aname == ZaCos.A_name) || (aname == ZaCos.A_description) || (aname == ZaCos.A_notes) )
			continue;			
		newCos.attrs[aname] = defCos.attrs[aname];
	}	
	this._setView(newCos);
}

// new button was pressed
ZaCosController.prototype._newButtonListener =
function(ev) {
	if(this._view.isDirty()) {
		//parameters for the confirmation dialog's callback 
		var args = new Object();		
		args["params"] = null;
		args["obj"] = this;
		args["func"] = ZaCosController.prototype.newCos;
		//ask if the user wants to save changes		
		this._app.dialogs["confirmMessageDialog"] = new ZaMsgDialog(this._view.shell, null, [DwtDialog.YES_BUTTON, DwtDialog.NO_BUTTON, DwtDialog.CANCEL_BUTTON], this._app);								
		this._app.dialogs["confirmMessageDialog"].setMessage(ZaMsg.Q_SAVE_CHANGES, DwtMessageDialog.INFO_STYLE);
		this._app.dialogs["confirmMessageDialog"].registerCallback(DwtDialog.YES_BUTTON, this.saveAndGoAway, this, args);		
		this._app.dialogs["confirmMessageDialog"].registerCallback(DwtDialog.NO_BUTTON, this.discardAndGoAway, this, args);		
		this._app.dialogs["confirmMessageDialog"].popup();
	} else {
		this.newCos();
	}	
}
