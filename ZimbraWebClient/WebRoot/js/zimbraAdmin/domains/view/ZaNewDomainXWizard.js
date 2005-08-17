function ZaNewDomainXWizard (parent, app) {
	this._app=app;
	ZaXWizardDialog.call(this, parent, null, ZaMsg.NDD_Title, "550px", "300px");

	this.stepChoices = [
		{label:ZaMsg.TABT_GeneralPage, value:1},
		{label:ZaMsg.TABT_GALMode, value:2},
		{label:ZaMsg.TABT_GALonfiguration, value:3}, 
		{label:ZaMsg.TABT_GALonfiguration, value:4},		
		{label:ZaMsg.TABT_GALonfigSummary, value:5},
		{label:ZaMsg.TABT_TestGalConfig, value:6},
		{label:ZaMsg.TABT_GalTestResult, value:7},		
		{label:ZaMsg.TABT_AuthMode, value:8},				
		{label:ZaMsg.TABT_AuthSettings, value:9},						
		{label:ZaMsg.TABT_TestAuthSettings, value:10},				
		{label:ZaMsg.TABT_AuthTestResult, value:11},
		{label:ZaMsg.TABT_DomainConfigComplete, value:12}		
	];
		
	this.GALModes = [
		{label:ZaMsg.GALMode_internal, value:ZaDomain.GAL_Mode_internal},
		{label:ZaMsg.GALMode_external, value:ZaDomain.GAL_Mode_external}, 
		{label:ZaMsg.GALMode_both, value:ZaDomain.GAL_Mode_both}
  	];
  	this.GALServerTypes = [
		{label:ZaMsg.GALServerType_ldap, value:ZaDomain.GAL_ServerType_ldap},
		{label:ZaMsg.GALServerType_ad, value:ZaDomain.GAL_ServerType_ad} 
	];
	
	this.AuthMechs = [
		{label:ZaMsg.AuthMech_zimbra, value:ZaDomain.AuthMech_zimbra},
		{label:ZaMsg.AuthMech_ldap, value:ZaDomain.AuthMech_ldap},
		{label:ZaMsg.AuthMech_ad, value:ZaDomain.AuthMech_ad}		
	];

	this.TestResultChoices = [
		{label:ZaMsg.AuthTest_check_OK, value:ZaDomain.Check_OK},
		{label:ZaMsg.AuthTest_check_UNKNOWN_HOST, value:ZaDomain.Check_UNKNOWN_HOST},
		{label:ZaMsg.AuthTest_check_CONNECTION_REFUSED, value:ZaDomain.Check_CONNECTION_REFUSED},
		{label:ZaMsg.AuthTest_check_SSL_HANDSHAKE_FAILURE, value:ZaDomain.Check_SSL_HANDSHAKE_FAILURE},				
		{label:ZaMsg.AuthTest_check_COMMUNICATION_FAILURE, value:ZaDomain.Check_COMMUNICATION_FAILURE},
		{label:ZaMsg.AuthTest_check_AUTH_FAILED, value:ZaDomain.Check_AUTH_FAILED},
		{label:ZaMsg.AuthTest_check_AUTH_NOT_SUPPORTED, value:ZaDomain.Check_AUTH_NOT_SUPPORTED},
		{label:ZaMsg.AuthTest_check_NAME_NOT_FOUND, value:ZaDomain.Check_NAME_NOT_FOUND},
		{label:ZaMsg.AuthTest_check_INVALID_SEARCH_FILTER, value:ZaDomain.Check_INVALID_SEARCH_FILTER},
		{label:ZaMsg.AuthTest_check_FAILURE, value:ZaDomain.Check_FAILURE}												
	];
	

		
	this.initForm(ZaDomain.myXModel,this.getMyXForm());		
}

ZaNewDomainXWizard.prototype = new ZaXWizardDialog;
ZaNewDomainXWizard.prototype.constructor = ZaNewDomainXWizard;

/**
* @method setObject sets the object contained in the view
* @param entry - ZaDomain object to display
**/
ZaNewDomainXWizard.prototype.setObject =
function(entry) {
	this._containedObject = new Object();
	this._containedObject.attrs = new Object();

	for (var a in entry.attrs) {
		this._containedObject.attrs[a] = entry.attrs[a];
	}
	
	this._containedObject[ZaModel.currentStep] = 1;
	this._localXForm.setInstance(this._containedObject);	
}

/**
* GAL configuration
**/

ZaNewDomainXWizard.prototype.generateGALLDAPUrl = 
function () {
	var ldapURL = "";
	if(this._containedObject.attrs[ZaDomain.A_GALUseSSL] == "TRUE") {
		ldapURL +="ldaps://";
	} else {
		ldapURL +="ldap://";
	}
	ldapURL +=this._containedObject.attrs[ZaDomain.A_GALServerName];
	ldapURL +=":";
	ldapURL +=this._containedObject.attrs[ZaDomain.A_GALServerPort];
	ldapURL +="/";
	this._containedObject.attrs[ZaDomain.A_GalLdapURL] = ldapURL;
}

/**
* static change handlers for the form
**/
ZaNewDomainXWizard.onGALServerTypeChange =
function (value, event, form) {
	if(value == "ad") {
		form.getInstance().attrs[ZaDomain.A_GalLdapFilter] = "ad";
	} else {
		form.getInstance().attrs[ZaDomain.A_GalLdapFilter] = "";
	}
	this.setInstanceValue(value);	
}

ZaNewDomainXWizard.onGALUseSSLChange =
function (value, event, form) {
	if(value == "TRUE") {
		form.getInstance().attrs[ZaDomain.A_GALServerPort] = 636;
	} else {
		form.getInstance().attrs[ZaDomain.A_GALServerPort] = 389;
	}
	this.setInstanceValue(value);
	form.parent.generateGALLDAPUrl();
}

ZaNewDomainXWizard.onGALServerChange = 
function (value, event, form) {
	form.getInstance().attrs[ZaDomain.A_GALServerName] = value;
	this.setInstanceValue(value);
	form.parent.generateGALLDAPUrl();
}

ZaNewDomainXWizard.onGALServerPortChange = 
function (value, event, form) {
	form.getInstance().attrs[ZaDomain.A_GALServerPort] = value;
	this.setInstanceValue(value);
	form.parent.generateGALLDAPUrl();
}


ZaNewDomainXWizard.onGalModeChange = 
function (value, event, form) {
	this.setInstanceValue(value);
	if(value != "zimbra") {
		form.getInstance().attrs[ZaDomain.A_GalLdapFilter] = "";
		if(!form.getInstance().attrs[ZaDomain.A_GALServerType]) {
			form.getInstance().attrs[ZaDomain.A_GALServerType] = "ldap";
		}
		if(!form.getInstance().attrs[ZaDomain.A_GalLdapURL]) {
			form.getInstance().attrs[ZaDomain.A_GALServerPort] = 389;
			form.getInstance().attrs[ZaDomain.A_GalLdapURL] = "";			
			form.getInstance().attrs[ZaDomain.A_GALUseSSL] = "FALSE";
			form.getInstance().attrs[ZaDomain.A_GALServerName] = "";
			form.getInstance().attrs[ZaDomain.A_UseBindPassword] = "TRUE";
		}
		if(!form.getInstance().attrs[ZaDomain.A_GalLdapSearchBase]) {
			if(form.getInstance().attrs[ZaDomain.A_domainName]) {
				var parts = form.getInstance().attrs[ZaDomain.A_domainName].split(".");
				var szSearchBase = "";
				var coma = "";
				for(var ix in parts) {
					szSearchBase += coma;
				 	szSearchBase += "dc=";
				 	szSearchBase += parts[ix];
					var coma = ",";
				}
				form.getInstance().attrs[ZaDomain.A_GalLdapSearchBase] = szSearchBase;
			}
		}
	}
}

ZaNewDomainXWizard.prototype.testGALSettings =
function () {
	var callback = new AjxCallback(this, this.checkGALCallBack);
	ZaDomain.testGALSettings(this._containedObject, callback, this._containedObject[ZaDomain.A_GALSampleQuery]);	
}

/**
* Callback function invoked by Asynchronous CSFE command when "check" call returns
**/
ZaNewDomainXWizard.prototype.checkGALCallBack = 
function (arg) {
	if(arg instanceof AjxException || arg instanceof AjxCsfeException || arg instanceof AjxSoapException) {
		this._containedObject[ZaDomain.A_GALTestResultCode] = arg.code;
		this._containedObject[ZaDomain.A_GALTestMessage] = arg.detail;
	} else {
		this._containedObject[ZaDomain.A_GALTestResultCode] = arg.getBody().firstChild.firstChild.firstChild.nodeValue;
		if(this._containedObject[ZaDomain.A_GALTestResultCode] != ZaDomain.Check_OK) {
			this._containedObject[ZaDomain.A_GALTestMessage] = arg.getBody().firstChild.childNodes[1].firstChild.nodeValue;		
		}
	}
	this._button[DwtWizardDialog.NEXT_BUTTON].setEnabled(true);
	this._button[DwtWizardDialog.PREV_BUTTON].setEnabled(true);
	this._button[DwtWizardDialog.FINISH_BUTTON].setEnabled(false);
	this.goPage(7);
}

/**
* Auth config methods
**/
ZaNewDomainXWizard.prototype.generateAuthLDAPUrl = 
function () {
	var ldapURL = "";
	if(this._containedObject.attrs[ZaDomain.A_AuthLDAPUseSSL] == "TRUE") {
		ldapURL +="ldaps://";
	} else {
		ldapURL +="ldap://";
	}
	ldapURL +=this._containedObject.attrs[ZaDomain.A_AuthLDAPServerName];
	ldapURL +=":";
	ldapURL +=this._containedObject.attrs[ZaDomain.A_AuthLDAPServerPort];
	ldapURL +="/";
	this._containedObject.attrs[ZaDomain.A_AuthLdapURL] = ldapURL;
}


ZaNewDomainXWizard.onUseAuthSSLChange =
function (value, event, form) {
	if(value == "TRUE") {
		form.getInstance().attrs[ZaDomain.A_GALServerPort] = 636;
	} else {
		form.getInstance().attrs[ZaDomain.A_GALServerPort] = 389;
	}
	this.setInstanceValue(value);
	form.parent.generateAuthLDAPUrl();
}

/**
* Eevent handlers for form items
**/
ZaNewDomainXWizard.onAuthMechChange = 
function (value, event, form) {
	this.setInstanceValue(value);
	if(value == ZaDomain.AuthMech_ldap) {
		if(!form.getInstance().attrs[ZaDomain.A_AuthLdapUserDn]) {
			form.getInstance().attrs[ZaDomain.A_AuthLdapUserDn] = "%u,%D";
		}
	} 
	if(value == ZaDomain.AuthMech_ldap || value == ZaDomain.AuthMech_ad) {
		form.getInstance().attrs[ZaDomain.A_AuthLDAPServerPort] = 389;
		form.getInstance().attrs[ZaDomain.A_AuthLDAPUseSSL] = "FALSE";
	}
	if(value == ZaDomain.AuthMech_ad) {
		if(!form.getInstance().attrs[ZaDomain.A_AuthADDomainName]) {
			form.getInstance().attrs[ZaDomain.A_AuthADDomainName] = form.getInstance().attrs[ZaDomain.A_domainName];
		}
	}
}

ZaNewDomainXWizard.onAuthLDAPUseSSLChange = 
function (value, event, form) {
	//form.getInstance().attrs[ZaDomain.A_AuthLDAPUseSSL] = value;
	if(value == "TRUE") {
		form.getInstance().attrs[ZaDomain.A_AuthLDAPServerPort] = 636;
	} else {
		form.getInstance().attrs[ZaDomain.A_AuthLDAPServerPort] = 389;
	}	
	this.setInstanceValue(value);	
	form.parent.generateAuthLDAPUrl();
}

ZaNewDomainXWizard.onAuthLDAPPortChange = 
function (value, event, form) {
	//form.getInstance().attrs[ZaDomain.A_AuthLDAPServerPort] = val;
	this.setInstanceValue(value);
	form.parent.generateAuthLDAPUrl();
	
}

ZaNewDomainXWizard.onAuthLDAPServerChange = 
function (value, event, form) {
	this.setInstanceValue(value);	
//	form.getInstance().attrs[ZaDomain.A_AuthLDAPServerName] = value;
	form.parent.generateAuthLDAPUrl();
}

ZaNewDomainXWizard.prototype.testAuthSettings =
function () {
	if(this._containedObject.attrs[ZaDomain.A_AuthMech] == ZaDomain.AuthMech_ad) {
		this._containedObject.attrs[ZaDomain.A_AuthLdapUserDn] = "%u@"+this._containedObject.attrs[ZaDomain.A_AuthADDomainName];
	}

	var callback = new AjxCallback(this, this.checkAuthCallBack);
	ZaDomain.testAuthSettings(this._containedObject, callback);	
}

/**
* Callback function invoked by Asynchronous CSFE command when "check" call returns
**/
ZaNewDomainXWizard.prototype.checkAuthCallBack = 
function (arg) {
	if(arg instanceof AjxException || arg instanceof AjxCsfeException || arg instanceof AjxSoapException) {
		this._containedObject[ZaDomain.A_AuthTestResultCode] = arg.code;
		this._containedObject[ZaDomain.A_AuthTestMessage] = arg.detail;
	} else {
		this._containedObject[ZaDomain.A_AuthTestResultCode] = arg.getBody().firstChild.firstChild.firstChild.nodeValue;
		if(this._containedObject[ZaDomain.A_AuthTestResultCode] != ZaDomain.Check_OK) {
			this._containedObject[ZaDomain.A_AuthTestMessage] = arg.getBody().firstChild.childNodes[1].firstChild.nodeValue;		
			this._containedObject[ZaDomain.A_AuthComputedBindDn] = arg.getBody().firstChild.lastChild.firstChild.nodeValue;		
		}
	}
	this._button[DwtWizardDialog.NEXT_BUTTON].setEnabled(false);
	this._button[DwtWizardDialog.PREV_BUTTON].setEnabled(true);
	this._button[DwtWizardDialog.FINISH_BUTTON].setEnabled(true);
	this.goPage(11);
}

/**
* Overwritten methods that control wizard's flow (open, go next,go previous, finish)
**/
ZaNewDomainXWizard.prototype.popup = 
function (loc) {
	ZaXWizardDialog.prototype.popup.call(this, loc);
	this._button[DwtWizardDialog.NEXT_BUTTON].setText(DwtMsg._next);
	this._button[DwtWizardDialog.NEXT_BUTTON].setEnabled(true);
	this._button[DwtWizardDialog.FINISH_BUTTON].setEnabled(false);
	this._button[DwtWizardDialog.PREV_BUTTON].setEnabled(false);	
}

ZaNewDomainXWizard.prototype.goPrev =
function () {
	if(this._containedObject[ZaModel.currentStep] == 7) {
		//skip 6th step
		this._button[DwtWizardDialog.NEXT_BUTTON].setText(ZaMsg.Domain_GALTestSettings);
		this._button[DwtWizardDialog.NEXT_BUTTON].setEnabled(true);
		this._button[DwtWizardDialog.FINISH_BUTTON].setEnabled(false);
		this._button[DwtWizardDialog.PREV_BUTTON].setEnabled(true);		
		this.goPage(5);
	} else if (this._containedObject[ZaModel.currentStep] == 8 && this._containedObject.attrs[ZaDomain.A_GalMode]==ZaDomain.GAL_Mode_internal) {
		this.goPage(2);
		this._button[DwtWizardDialog.PREV_BUTTON].setEnabled(true);		
	} else if (this._containedObject[ZaModel.currentStep] == 11) {
		//skip 10th step
		this._button[DwtWizardDialog.NEXT_BUTTON].setText(ZaMsg.Domain_GALTestSettings);
		this._button[DwtWizardDialog.NEXT_BUTTON].setEnabled(true);
		this._button[DwtWizardDialog.FINISH_BUTTON].setEnabled(false);
		this._button[DwtWizardDialog.PREV_BUTTON].setEnabled(true);
		this.goPage(9);
	} else if(this._containedObject[ZaModel.currentStep] == 12) {
		if(this._containedObject.attrs[ZaDomain.A_AuthMech] == ZaDomain.AuthMech_zimbra) {
			this.goPage(8); //skip all auth configuration
		} else {
			this.goPage(11);
		}
	} else {
		this._button[DwtWizardDialog.NEXT_BUTTON].setText(DwtMsg._next);
		if(this._containedObject[ZaModel.currentStep] == 2) {
			//disable PREV button on the first step
			this._button[DwtWizardDialog.PREV_BUTTON].setEnabled(false);
		} else {
			this._button[DwtWizardDialog.PREV_BUTTON].setEnabled(true);
		}
		this.goPage(this._containedObject[ZaModel.currentStep]-1);
	}
	this._button[DwtWizardDialog.NEXT_BUTTON].setEnabled(true);	
}

ZaNewDomainXWizard.prototype.goNext = 
function() {
	if (this._containedObject[ZaModel.currentStep] == 1) {
		this._containedObject.attrs[ZaDomain.A_AuthADDomainName] = this._containedObject.attrs[ZaDomain.A_domainName];
		this._button[DwtWizardDialog.PREV_BUTTON].setEnabled(true);
		this.goPage(2);		
	} else if(this._containedObject[ZaModel.currentStep] == 2 && this._containedObject.attrs[ZaDomain.A_GalMode]==ZaDomain.GAL_Mode_internal) {
		this.goPage(8);
	} else if(this._containedObject[ZaModel.currentStep] == 4) {
		//clear the password if the checkbox is unchecked
		if(this._containedObject.attrs[ZaDomain.A_UseBindPassword]=="FALSE") {
			this._containedObject.attrs[ZaDomain.A_GalLdapBindPassword] = null;
			this._containedObject.attrs[ZaDomain.A_GalLdapBindPasswordConfirm] = null;
			this._containedObject.attrs[ZaDomain.A_GalLdapBindDn] = null;
		}
		//check that passwords match
		if(this._containedObject.attrs[ZaDomain.A_GalLdapBindPassword]!=this._containedObject.attrs[ZaDomain.A_GalLdapBindPasswordConfirm]) {
			this._app.getCurrentController().popupMsgDialog(ZaMsg.ERROR_PASSWORD_MISMATCH);
			return false;
		}
		//change next button to "test"
		this._button[DwtWizardDialog.NEXT_BUTTON].setText(ZaMsg.Domain_GALTestSettings);
		this._button[DwtWizardDialog.PREV_BUTTON].setEnabled(true);
		this._button[DwtWizardDialog.NEXT_BUTTON].setEnabled(true);
		this._button[DwtWizardDialog.FINISH_BUTTON].setEnabled(false);
		this.goPage(this._containedObject[ZaModel.currentStep]+1);
	} else if(this._containedObject[ZaModel.currentStep] == 5) {
		this.goPage(6);
 		this.testGALSettings();
		this._button[DwtWizardDialog.NEXT_BUTTON].setText(DwtMsg._next);
		this._button[DwtWizardDialog.NEXT_BUTTON].setEnabled(false);
		this._button[DwtWizardDialog.PREV_BUTTON].setEnabled(false);
		this._button[DwtWizardDialog.FINISH_BUTTON].setEnabled(false);
	} else if (this._containedObject[ZaModel.currentStep] == 8) {
		this._button[DwtWizardDialog.PREV_BUTTON].setEnabled(true);
		if(this._containedObject.attrs[ZaDomain.A_AuthMech]==ZaDomain.AuthMech_zimbra) {
			this._button[DwtWizardDialog.NEXT_BUTTON].setText(DwtMsg._next);
			this._button[DwtWizardDialog.NEXT_BUTTON].setEnabled(false);
			this._button[DwtWizardDialog.FINISH_BUTTON].setEnabled(true);
			this.goPage(12);		
		} else {
			this._button[DwtWizardDialog.NEXT_BUTTON].setText(ZaMsg.Domain_GALTestSettings);
			this._button[DwtWizardDialog.NEXT_BUTTON].setEnabled(true);
			this._button[DwtWizardDialog.FINISH_BUTTON].setEnabled(false);
			this.goPage(9);
		}
	} else if(this._containedObject[ZaModel.currentStep] == 9) {
		this.goPage(10);
 		this.testAuthSettings();
		this._button[DwtWizardDialog.NEXT_BUTTON].setText(DwtMsg._next);
		this._button[DwtWizardDialog.NEXT_BUTTON].setEnabled(false);
		this._button[DwtWizardDialog.PREV_BUTTON].setEnabled(false);
		this._button[DwtWizardDialog.FINISH_BUTTON].setEnabled(false);
	} else {
		this.goPage(this._containedObject[ZaModel.currentStep] + 1);
		this._button[DwtWizardDialog.PREV_BUTTON].setEnabled(true);
	}
}
ZaNewDomainXWizard.prototype.getMyXForm = 
function () {
	var xFormObject = {
		items: [
			{type:_OUTPUT_, colSpan:2, align:_CENTER_, valign:_TOP_, ref:ZaModel.currentStep, choices:this.stepChoices},
			{type:_SEPARATOR_, align:_CENTER_, valign:_TOP_},
			{type:_SPACER_,  align:_CENTER_, valign:_TOP_},		
			{type: _SWITCH_,
				items: [
					{type:_CASE_, relevant:"instance[ZaModel.currentStep] == 1", relevantBehavior:_HIDE_,
						items: [
							{ref:ZaDomain.A_domainName, type:_TEXTFIELD_, label:ZaMsg.Domain_DomainName,labelLocation:_LEFT_},
							{ref:ZaDomain.A_description, type:_TEXTFIELD_, label:ZaMsg.NAD_Description, labelLocation:_LEFT_},
							{ref:ZaDomain.A_notes, type:_TEXTAREA_, label:ZaMsg.NAD_Notes, labelLocation:_LEFT_, labelCssStyle:"vertical-align:top"}
						]
					},
					{type:_CASE_, relevant:"instance[ZaModel.currentStep] == 2", relevantBehavior:_HIDE_,
						items: [
							{ref:ZaDomain.A_GalMode, type:_OSELECT1_, label:ZaMsg.Domain_GalMode, labelLocation:_LEFT_, choices:this.GALModes, onChange:ZaNewDomainXWizard.onGalModeChange},
							{ref:ZaDomain.A_GalMaxResults, type:_TEXTFIELD_, label:ZaMsg.NAD_GalMaxResults, labelLocation:_LEFT_}					
						]
					},
					{type:_CASE_, numCols:2, relevant:"instance[ZaModel.currentStep] == 3 && instance.attrs[ZaDomain.A_GalMode]!=ZaDomain.GAL_Mode_internal", relevantBehavior:_HIDE_,
						items: [
							{ref:ZaDomain.A_GALServerType, type:_OSELECT1_, label:ZaMsg.Domain_GALServerType, labelLocation:_LEFT_, choices:this.GALServerTypes, onChange:ZaNewDomainXWizard.onGALServerTypeChange},
							{ref:ZaDomain.A_GALServerName, type:_TEXTFIELD_, label:ZaMsg.Domain_GALServerName, labelLocation:_LEFT_, onChange:ZaNewDomainXWizard.onGALServerChange},					
							{ref:ZaDomain.A_GALServerPort, type:_TEXTFIELD_, label:ZaMsg.Domain_GALServerPort, labelLocation:_LEFT_,onChange:ZaNewDomainXWizard.onGALServerPortChange},
							{ref:ZaDomain.A_GALUseSSL, type:_CHECKBOX_, label:ZaMsg.Domain_GALUseSSL, labelLocation:_LEFT_,trueValue:"TRUE", falseValue:"FALSE", onChange:ZaNewDomainXWizard.onGALUseSSLChange,labelCssClass:"xform_label", align:_LEFT_},
							{ref:ZaDomain.A_GalLdapFilter, type:_TEXTFIELD_, label:ZaMsg.Domain_GalLdapFilter, labelLocation:_LEFT_, relevant:"instance.attrs[ZaDomain.A_GALServerType] == 'ldap'", relevantBehavior:_DISABLE_, width:"200px"},
							{ref:ZaDomain.A_GalLdapSearchBase, type:_TEXTFIELD_, label:ZaMsg.Domain_GalLdapSearchBase, labelLocation:_LEFT_, width:"200px"}
						]
					},
					{type:_CASE_, relevant:"instance[ZaModel.currentStep] == 4 && instance.attrs[ZaDomain.A_GalMode]!=ZaDomain.GAL_Mode_internal", relevantBehavior:_HIDE_,
						items: [
							{ref:ZaDomain.A_UseBindPassword, type:_CHECKBOX_, label:ZaMsg.Domain_UseBindPassword, labelLocation:_LEFT_,trueValue:"TRUE", falseValue:"FALSE",labelCssClass:"xform_label", align:_LEFT_},
							{ref:ZaDomain.A_GalLdapBindDn, type:_TEXTFIELD_, label:ZaMsg.Domain_GalLdapBindDn, labelLocation:_LEFT_, relevant:"instance.attrs[ZaDomain.A_UseBindPassword] == 'TRUE'", relevantBehavior:_DISABLE_},
							{ref:ZaDomain.A_GalLdapBindPassword, type:_SECRET_, label:ZaMsg.Domain_GalLdapBindPassword, labelLocation:_LEFT_, relevant:"instance.attrs[ZaDomain.A_UseBindPassword] == 'TRUE'", relevantBehavior:_DISABLE_},
							{ref:ZaDomain.A_GalLdapBindPasswordConfirm, type:_SECRET_, label:ZaMsg.Domain_GalLdapBindPasswordConfirm, labelLocation:_LEFT_, relevant:"instance.attrs[ZaDomain.A_UseBindPassword] == 'TRUE'", relevantBehavior:_DISABLE_}														
						]			
					}, 
					{type:_CASE_, relevant:"instance[ZaModel.currentStep] == 5", relevantBehavior:_HIDE_,
						items: [
							{type:_OUTPUT_, value:ZaMsg.Domain_GAL_ConfigSummary}, 
							{ref:ZaDomain.A_GalMode, type:_OUTPUT_, label:ZaMsg.Domain_GalMode, choices:this.GALModes},
							{ref:ZaDomain.A_GalMaxResults, type:_OUTPUT_, label:ZaMsg.NAD_GalMaxResults},
							{type:_SWITCH_, 
								items: [
									{type:_CASE_, relevant:"instance.attrs[ZaDomain.A_GalMode]!=ZaDomain.GAL_Mode_internal", relevantBehavior:_HIDE_,
										items: [
											{ref:ZaDomain.A_GALServerType, type:_OUTPUT_, label:ZaMsg.Domain_GALServerType, choices:this.GALServerTypes, labelLocation:_LEFT_},
											{ref:ZaDomain.A_GALServerName, type:_OUTPUT_, label:ZaMsg.Domain_GALServerName, labelLocation:_LEFT_},					
											{ref:ZaDomain.A_GALServerPort, type:_OUTPUT_, label:ZaMsg.Domain_GALServerPort, labelLocation:_LEFT_},
											{ref:ZaDomain.A_GALUseSSL, type:_OUTPUT_, label:ZaMsg.Domain_GALUseSSL, labelLocation:_LEFT_},
											{ref:ZaDomain.A_GalLdapFilter, type:_OUTPUT_, label:ZaMsg.Domain_GalLdapFilter, labelLocation:_LEFT_, relevant:"instance.attrs[ZaDomain.A_GALServerType] == 'ldap'", relevantBehavior:_HIDE_},
											{ref:ZaDomain.A_GalLdapSearchBase, type:_OUTPUT_, label:ZaMsg.Domain_GalLdapSearchBase, labelLocation:_LEFT_},
											{ref:ZaDomain.A_GalLdapURL, type:_OUTPUT_, label:ZaMsg.Domain_GalLdapURL, labelLocation:_LEFT_},
											{ref:ZaDomain.A_UseBindPassword, type:_OUTPUT_, label:ZaMsg.Domain_UseBindPassword, labelLocation:_LEFT_,trueValue:"TRUE", falseValue:"FALSE"},
											{ref:ZaDomain.A_GalLdapBindDn, type:_OUTPUT_, label:ZaMsg.Domain_GalLdapBindDn, labelLocation:_LEFT_, relevant:"instance.attrs[ZaDomain.A_UseBindPassword] == 'TRUE'", relevantBehavior:_HIDE_},
										//	{ref:ZaDomain.A_GalLdapBindPassword, type:_OUTPUT_, label:ZaMsg.Domain_GalLdapBindPassword, labelLocation:_LEFT_, relevant:"instance.attrs[ZaDomain.A_UseBindPassword] == 'TRUE'", relevantBehavior:_DISABLE_},
											{ref:ZaDomain.A_GALSampleQuery, type:_TEXTFIELD_, label:ZaMsg.Domain_GALSampleSearchName, labelLocation:_LEFT_, labelWrap:true, cssStyle:"width:100px;"}
										]
									}
								]
							}					
						]
					},
					{type:_CASE_, relevant:"instance[ZaModel.currentStep] == 6", relevantBehavior:_HIDE_,
						items: [
							{type:_OUTPUT_, value:ZaMsg.Domain_GALTestingInProgress}
						]	
					}, 
					{type:_CASE_, relevant:"instance[ZaModel.currentStep] == 7", relevantBehavior:_HIDE_,
						items: [
							{type:_OUTPUT_,value:ZaMsg.Domain_GALTestResults},
							{type:_SWITCH_,
								items: [
									{type:_CASE_, relevant:"instance[ZaDomain.A_GALTestResultCode] == ZaDomain.Check_OK",
										items: [
											{type:_OUTPUT_, value:ZaMsg.Domain_GALTestSuccessful}
										]
									},
									{type:_CASE_, relevant:	"instance[ZaDomain.A_GALTestResultCode] != ZaDomain.Check_OK",
										items: [
											{type:_OUTPUT_, value:ZaMsg.Domain_GALTestFailed},
											{type:_OUTPUT_, ref:ZaDomain.A_GALTestResultCode, label:ZaMsg.Domain_GALTestResult, choices:this.TestResultChoices},
											{type:_TEXTAREA_, ref:ZaDomain.A_GALTestMessage, label:ZaMsg.Domain_GALTestMessage, height:100}
										]
									}
								]
							}
						]
					},
					{type:_CASE_, relevant:"instance[ZaModel.currentStep] == 8", relevantBehavior:_HIDE_,
						items:[
							{type:_OSELECT1_, label:ZaMsg.Domain_AuthMech, choices:this.AuthMechs, ref:ZaDomain.A_AuthMech, onChange:ZaNewDomainXWizard.onAuthMechChange},
							{type:_SWITCH_,
								items: [
									{type:_CASE_, relevant:"instance.attrs[ZaDomain.A_AuthMech]==ZaDomain.AuthMech_ad",
										items:[
											{ref:ZaDomain.A_AuthLDAPServerName, type:_INPUT_, label:ZaMsg.Domain_AuthADServerName, labelLocation:_LEFT_, onChange:ZaNewDomainXWizard.onAuthLDAPServerChange},
											{ref:ZaDomain.A_AuthADDomainName, type:_INPUT_, label:ZaMsg.Domain_AuthADDomainName, labelLocation:_LEFT_},
											{ref:ZaDomain.A_AuthLDAPServerPort, type:_INPUT_, label:ZaMsg.Domain_AuthADServerPort, labelLocation:_LEFT_, onChange:ZaNewDomainXWizard.onAuthLDAPPortChange},
											{ref:ZaDomain.A_AuthLDAPUseSSL, type:_CHECKBOX_, label:ZaMsg.Domain_AuthADUseSSL, labelLocation:_LEFT_,trueValue:"TRUE", falseValue:"FALSE", onChange:ZaNewDomainXWizard.onAuthLDAPUseSSLChange,labelCssClass:"xform_label", align:_LEFT_}
										]
									},
									{type:_CASE_, relevant:"instance.attrs[ZaDomain.A_AuthMech]==ZaDomain.AuthMech_ldap",
										items:[
											{ref:ZaDomain.A_AuthLDAPServerName, type:_INPUT_, label:ZaMsg.Domain_AuthLDAPServerName, labelLocation:_LEFT_, onChange:ZaNewDomainXWizard.onAuthLDAPServerChange},
											{ref:ZaDomain.A_AuthLDAPServerPort, type:_INPUT_, label:ZaMsg.Domain_AuthLDAPServerPort, labelLocation:_LEFT_, onChange:ZaNewDomainXWizard.onAuthLDAPPortChange},							
											{ref:ZaDomain.A_AuthLDAPUseSSL, type:_CHECKBOX_, label:ZaMsg.Domain_AuthLDAPUseSSL, labelLocation:_LEFT_,trueValue:"TRUE", falseValue:"FALSE", onChange:ZaNewDomainXWizard.onAuthLDAPUseSSLChange,labelCssClass:"xform_label", align:_LEFT_},
											{ref:ZaDomain.A_AuthLdapUserDn, type:_INPUT_, label:ZaMsg.Domain_AuthLdapUserDn, labelLocation:_LEFT_},
//											{ref:ZaDomain.A_AuthLdapURL, type:_OUTPUT_, label:ZaMsg.Domain_AuthLdapURL, labelLocation:_LEFT_},
											{type:_OUTPUT_, value:ZaMsg.NAD_DomainsAuthStr, colSpan:2},												
											
										]
									}
								]
							}
						]
					},
					{type:_CASE_, relevant:"instance[ZaModel.currentStep] == 9", relevantBehavior:_HIDE_,
						items: [
							{ref:ZaDomain.A_AuthMech, type:_OUTPUT_, label:ZaMsg.Domain_AuthMech, choices:this.AuthMechs},
							{type:_SWITCH_,
								items: [
									{type:_CASE_, relevant:"instance.attrs[ZaDomain.A_AuthMech]==ZaDomain.AuthMech_ad",
										items:[
											{ref:ZaDomain.A_AuthLDAPServerName, type:_OUTPUT_, label:ZaMsg.Domain_AuthADServerName, labelLocation:_LEFT_},
											{ref:ZaDomain.A_AuthADDomainName, type:_OUTPUT_, label:ZaMsg.Domain_AuthADDomainName, labelLocation:_LEFT_},
											{ref:ZaDomain.A_AuthLDAPServerPort, type:_OUTPUT_, label:ZaMsg.Domain_AuthADServerPort, labelLocation:_LEFT_},
											{ref:ZaDomain.A_AuthLDAPUseSSL, type:_OUTPUT_, label:ZaMsg.Domain_AuthADUseSSL, labelLocation:_LEFT_,choices:ZaModel.BOOLEAN_CHOICES}
										]
									},
									{type:_CASE_, relevant:"instance.attrs[ZaDomain.A_AuthMech]==ZaDomain.AuthMech_ldap",
										items:[
											{ref:ZaDomain.A_AuthLDAPServerName, type:_OUTPUT_, label:ZaMsg.Domain_AuthLDAPServerName, labelLocation:_LEFT_},
											{ref:ZaDomain.A_AuthLDAPServerPort, type:_OUTPUT_, label:ZaMsg.Domain_AuthLDAPServerPort, labelLocation:_LEFT_},							
											{ref:ZaDomain.A_AuthLDAPUseSSL, type:_OUTPUT_, label:ZaMsg.Domain_AuthLDAPUseSSL, labelLocation:_LEFT_,choices:ZaModel.BOOLEAN_CHOICES},
											{ref:ZaDomain.A_AuthLdapUserDn, type:_OUTPUT_, label:ZaMsg.Domain_AuthLdapUserDn, labelLocation:_LEFT_},
										]
									}
								]
							},
							{type:_OUTPUT_,value:ZaMsg.Domain_AuthProvideLoginPwd, colSpan:2},
							{type:_INPUT_, label:ZaMsg.Domain_AuthTestUserName, ref:ZaDomain.A_AuthTestUserName},
							{type:_SECRET_, label:ZaMsg.Domain_AuthTestPassword, ref:ZaDomain.A_AuthTestPassword}
						]
					},
					{type:_CASE_, relevant:"instance[ZaModel.currentStep] == 10", relevantBehavior:_HIDE_,
						items: [
							{type:_OUTPUT_,value:ZaMsg.Domain_AuthTestingInProgress}
						]
					},
					{type:_CASE_, relevant:"instance[ZaModel.currentStep] == 11", relevantBehavior:_HIDE_,
						items: [
							{type:_OUTPUT_,value:ZaMsg.Domain_AuthTestResults, alignment:_CENTER_},
							{type:_SWITCH_,
								items: [
									{type:_CASE_, relevant:"instance[ZaDomain.A_AuthTestResultCode] == ZaDomain.Check_OK",
										items: [
											{type:_OUTPUT_, value:ZaMsg.Domain_AuthTestSuccessful, alignment:_CENTER_}
										]
									},
									{type:_CASE_, relevant:	"instance[ZaDomain.A_AuthTestResultCode] != ZaDomain.Check_OK",
										items: [
											{type:_OUTPUT_, value:ZaMsg.Domain_AuthTestFailed, alignment:_CENTER_},
											{type:_OUTPUT_, ref:ZaDomain.A_AuthTestResultCode, label:ZaMsg.Domain_AuthTestResultCode, choices:this.TestResultChoices, alignment:_LEFT_},
											{type:_OUTPUT_, ref:ZaDomain.A_AuthComputedBindDn, label:ZaMsg.Domain_AuthComputedBindDn, alignment:_LEFT_},
											{type:_TEXTAREA_, ref:ZaDomain.A_AuthTestMessage, label:ZaMsg.Domain_AuthTestMessage, height:150, width:200, alignment:_LEFT_}
										]
									}
								]
							}
						]
					},
					{type:_CASE_, relevant:"instance[ZaModel.currentStep] == 12", relevantBehavior:_HIDE_,
						items: [
							{type:_OUTPUT_, value:ZaMsg.Domain_Config_Complete}
						]
					}										
				]	
			}
	
		]
	};
	return xFormObject;
};

