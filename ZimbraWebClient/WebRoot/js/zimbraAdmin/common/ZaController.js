function ZaController(appCtxt, container, app, isAdmin) {

	if (arguments.length == 0) return;

	this._appCtxt = appCtxt;
	this._container = container;
	this._app = app;
	
	this._shell = appCtxt.getShell();
	this._appViews = new Object();   
	this._currentView = null;                            
	
	this._authenticating = false;

	this._loginDialog = appCtxt.getLoginDialog(isAdmin);
	this._loginDialog.registerCallback(this._loginCallback, this);

	this._msgDialog = appCtxt.getMsgDialog();
    this._msgDialog.registerCallback(DwtDialog.OK_BUTTON, this._msgDialogCallback, this);
    if(app) {
    	this._msgDialog.setApp(app);
    }	
}

var i = 1;
ZaController.CONVLIST_VIEW 		= i++;
ZaController.CONV_VIEW 			= i++;
ZaController.TRAD_VIEW 			= i++;
ZaController.MSG_VIEW 			= i++;
ZaController.MSG_NEW_WIN_VIEW 	= i++; // needed for HACK (see ZmMailMsg)
ZaController.CONTACT_CARDS_VIEW = i++;
ZaController.CONTACT_LIST_VIEW 	= i++;
ZaController.CONTACT_VIEW		= i++;
ZaController.SINGLE_PANE_VIEW 	= i++;
ZaController.DOUBLE_PANE_VIEW 	= i++;
ZaController.ATT_LIST_VIEW 		= i++;
ZaController.ATT_ICON_VIEW 		= i++;
ZaController.CAL_VIEW			= i++;
ZaController.COMPOSE_VIEW		= i++;
ZaController.CONTACT_SRC_VIEW	= i++; // contact picker source list
ZaController.CONTACT_TGT_VIEW	= i++; // contact picker target list
ZaController.PREF_VIEW			= i++;
ZaController.CAL_DAY_VIEW		= i++;
ZaController.CAL_WEEK_VIEW		= i++;
ZaController.CAL_MONTH_VIEW		= i++;
ZaController.CAL_WORK_WEEK_VIEW	= i++;


// Public methods
ZaController.prototype.toString = 
function() {
	return "ZaController";
}

ZaController.prototype.setDirty = 
function (isD) {
	//overwrite this method to disable toolbar buttons, for example, Save button
}

ZaController.prototype.setCurrentView =
function(view) {
	this._currentView = view;
}

ZaController.prototype.setEnabled = 
function(enable) {
	//abstract
//	throw new AjxException("This method is abstract", AjxException.UNIMPLEMENTED_METHOD, "ZaController.prototype.setEnabled");	
}

ZaController.prototype.popupMsgDialog = 
function(msg, ex, noExecReset)  {
	if (!noExecReset)
		this._execFrame = {method: null, params: null, restartOnError: false};
	
	var detailStr = "";
	if(ex != null) {
		if(ex.msg) {
			detailStr += "Message:  ";
		    detailStr += ex.msg;
		    detailStr += "\n";			    
		}
		if(ex.code) {
			detailStr += "Code:  ";
		    detailStr += ex.code;
		    detailStr += "\n";			    
		}
		if(ex.method) {
			detailStr += "Method:  ";
		    detailStr += ex.method;
		    detailStr += "\n";			    
		}
		if(ex.detail) {
			detailStr += "Details:  ";
		    detailStr += ex.detail;
		    detailStr += "\n";			    
		}
	}
	// popup alert
	this._msgDialog.setMessage(msg, detailStr, DwtMessageDialog.CRITICAL_STYLE, ZaMsg.zimbraAdminTitle);
	this._msgDialog.popup();
}

ZaController.prototype.getControllerForView =
function(view) {
	switch (view) {
		case ZaController.CONVLIST_VIEW:
			return this._appCtxt.getApp(ZmZimbraMail.MAIL_APP).getConvListController();
		case ZaController.CONV_VIEW:
			return this._appCtxt.getApp(ZmZimbraMail.MAIL_APP).getConvController();
		case ZaController.TRAD_VIEW:
			return this._appCtxt.getApp(ZmZimbraMail.MAIL_APP).getTradController();
		case ZaController.MSG_VIEW:
			return this._appCtxt.getApp(ZmZimbraMail.MAIL_APP).getMsgController();
		case ZaController.CONTACT_CARDS_VIEW:
		case ZaController.CONTACT_LIST_VIEW:
			return this._appCtxt.getApp(ZmZimbraMail.CONTACTS_APP).getContactListController();
		case ZaController.CONTACT_VIEW:
			return this._appCtxt.getApp(ZmZimbraMail.CONTACTS_APP).getContactController();
		case ZaController.CAL_VIEW:
			return this._appCtxt.getApp(ZmZimbraMail.CALENDAR_APP).getCalController();
		case ZaController.ATT_LIST_VIEW:
		case ZaController.ATT_ICON_VIEW:
			return this._appCtxt.getApp(ZmZimbraMail.MAIL_APP).getAttachmentListController();
		case ZaController.COMPOSE_VIEW:
			return this._appCtxt.getApp(ZmZimbraMail.MAIL_APP).getComposeController();
		case ZaController.PREF_VIEW:
			return this._appCtxt.getApp(ZmZimbraMail.PREFERENCES_APP).getPrefController();
		default: {
			DBG.println(AjxDebug.DBG1, "*** controller not found for view " + view);
			return this._appCtxt.getAppController();}
	}
}

//Private/protected methods

ZaController.prototype._setView =
function() {

}
/*
* We do the whole schedule/execute thing to give the shell the opportunity to popup its "busy" 
* overlay so that user input is blocked. For example, if a search takes a while to complete, 
* we don't want the user's clicking on the search button to cause it to re-execute repeatedly 
* when the events arrive from the UI. Since the action is executed via win.setTimeout(), it
* must be a leaf action (scheduled actions are executed after the calling code returns to the
* UI loop). You can't schedule something, and then have subsequent code that depends on the 
* scheduled action. 
*/
ZaController.prototype._schedule =
function(method, params, delay) {
	if (!delay) {
		delay = 0;
		this._shell.setBusy(true);
	}
	this._action = new AjxTimedAction();
	this._action.obj = this;
	this._action.method = ZaController._exec;
	this._action.params.removeAll();
	this._action.params.add(method);
	this._action.params.add(params);
	this._action.params.add(delay);
	return AjxTimedAction.scheduleAction(this._action, delay);
}

ZaController._exec =
function(method, params, delay) {
	method.call(this, params);
	if (!delay)
		this._shell.setBusy(false);
}



ZaController.prototype._showLoginDialog =
function(bReloginMode) {
	this._authenticating = true;
	this._loginDialog.setVisible(true, false);
	this._loginDialog.setUpKeyHandlers();
	try {
		this._loginDialog.setFocus(this._appCtxt.getUsername(), bReloginMode);
	} catch (ex) {
		// something is out of whack... just make the user relogin
		ZaZimbraAdmin.logOff();
	}
}

ZaController.prototype._handleException =
function(ex, method, params, restartOnError, obj) {
	DBG.dumpObj(ex);
	if (ex.code == AjxCsfeException.SVC_AUTH_EXPIRED || 
		ex.code == AjxCsfeException.SVC_AUTH_REQUIRED || 
		ex.code == AjxCsfeException.NO_AUTH_TOKEN) 
	{
		var bReloginMode = true;
		if (ex.code == AjxCsfeException.SVC_AUTH_EXPIRED) 
		{
			// remember the last search attempted ONLY for expired auto token exception
			this._execFrame = {obj: obj, method: method, params: params, restartOnError: restartOnError};
			this._loginDialog.registerCallback(this._loginCallback, this);
			this._loginDialog.setError(ZaMsg.ERROR_SESSION_EXPIRED);
		} else {
			this._loginDialog.setError(null);
			bReloginMode = false;
		}
		this._loginDialog.setReloginMode(bReloginMode, this._appCtxt.getAppController(), this);
		this._showLoginDialog(bReloginMode);
	} 
	else 
	{
		this._execFrame = {obj: obj, method: method, params: params, restartOnError: restartOnError};
		this._msgDialog.registerCallback(DwtDialog.OK_BUTTON, this._msgDialogCallback, this);
		if (ex.code == AjxCsfeException.SOAP_ERROR) {
			this.popupMsgDialog(ZaMsg.SOAP_ERROR, ex, true);
		} else if (ex.code == AjxCsfeException.NETWORK_ERROR) {
			this.popupMsgDialog(ZaMsg.NETWORK_ERROR, ex, true);
		} else if (ex.code ==  AjxCsfeException.SVC_PARSE_ERROR) {
			this.popupMsgDialog(ZaMsg.PARSE_ERROR, ex, true);
		} else if (ex.code ==  AjxCsfeException.SVC_PERM_DENIED) {
			this.popupMsgDialog(ZaMsg.PERMISSION_DENIED, ex, true);
		} else if (ex.code == AjxCsfeException.ACCT_NO_SUCH_ACCOUNT) {
			this.popupMsgDialog(ZaMsg.ERROR_NO_SUCH_ACCOUNT, ex, true);
		} else if (ex.code == AjxCsfeException.CSFE_SVC_ERROR || ex.code == AjxCsfeException.SVC_FAILURE || (ex.code && ex.code.match(/^(service|account|mail)\./))) {
			this.popupMsgDialog(ZaMsg.SERVER_ERROR, ex, true);
		} else {
			//search for error code
			var gotit = false;
			for(var ix in AjxCsfeException) {
				if(AjxCsfeException[ix] == ex.code) {
					this.popupMsgDialog(ZaMsg.SERVER_ERROR, ex, true);
					gotit = true;
					break;
				}
			}
			if(!gotit)
				this.popupMsgDialog(ZaMsg.JAVASCRIPT_ERROR + " in method " + method, ex, true);
		}
	}
}

ZaController.prototype._doAuth = 
function(params) {
	AjxCsfeCommand.clearAuthToken();
	var auth = new ZaAuthenticate(this._appCtxt);
	try {
		auth.execute(params.username, params.password);
    	this._authenticating = false;
		this._appCtxt.getAppController().startup({bIsRelogin: (this._execFrame != null)}); // restart application after login
		// Schedule this since we want to make sure the app is built up before we actually hide the login dialog
		this._schedule(this._hideLoginDialog);
	} catch (ex) {
		if (ex.code == AjxCsfeException.ACCT_AUTH_FAILED || 
			ex.code == AjxCsfeException.INVALID_REQUEST) 
		{
			this._loginDialog.setError(ZaMsg.ERROR_AUTH_FAILED);
			return;
		} else if(ex.code == AjxCsfeException.SVC_PERM_DENIED) {
			this._loginDialog.setError(ZaMsg.ERROR_AUTH_NO_ADMIN_RIGHTS);
			return;
		} else {
			this.popupMsgDialog(ZaMsg.SERVER_ERROR, ex); 
		}
	}
}

ZaController.prototype._hideLoginDialog =
function() {
	this._appCtxt.getAppController().createBannerBarHtml();
	this._loginDialog.setVisible(false);
	this._loginDialog.setError(null);
	this._loginDialog.clearPassword();
	this._loginDialog.clearKeyHandlers();
}

/*********** Login dialog Callbacks */

ZaController.prototype._loginCallback =
function(args) {
	this._schedule(this._doAuth, {username: args[0], password: args[1]});
}


/*********** Msg dialog Callbacks */

ZaController.prototype._msgDialogCallback =
function() {
	this._msgDialog.popdown();
	if (this._execFrame) {
		if (this._execFrame.restartOnError && !this._authenticating)
			this._execFrame.method.call(this, this._execFrame.params);
		this._execFrame = null;
	}
}


// Pop up a dialog. Since it's a shared resource, we need to reset first.
ZaController.prototype._showDialog = 
function(dialog, callback, organizer, loc, args) {
	dialog.reset();
	dialog.registerCallback(DwtDialog.OK_BUTTON, callback, this, args);
	dialog.popup(organizer, loc);
}
