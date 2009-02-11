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

ZaNewAccountXWizard = function(parent) {
	ZaXWizardDialog.call(this, parent, null, ZaMsg.NCD_NewAccTitle, "700px", "300px","ZaNewAccountXWizard");
	this.accountStatusChoices = [
		{value:ZaAccount.ACCOUNT_STATUS_ACTIVE, label:ZaAccount.getAccountStatusMsg (ZaAccount.ACCOUNT_STATUS_ACTIVE)},
		{value:ZaAccount.ACCOUNT_STATUS_CLOSED, label:ZaAccount.getAccountStatusMsg (ZaAccount.ACCOUNT_STATUS_CLOSED)},
		{value:ZaAccount.ACCOUNT_STATUS_LOCKED, label: ZaAccount.getAccountStatusMsg (ZaAccount.ACCOUNT_STATUS_LOCKED)},
        {value:ZaAccount.ACCOUNT_STATUS_PENDING, label: ZaAccount.getAccountStatusMsg (ZaAccount.ACCOUNT_STATUS_PENDING)},
        {value:ZaAccount.ACCOUNT_STATUS_MAINTENANCE, label:ZaAccount.getAccountStatusMsg(ZaAccount.ACCOUNT_STATUS_MAINTENANCE)}
	];

	this.stepChoices = [];
	var stepCounter = 0;
	
//	if(ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.ACCOUNTS_GENERAL_TAB] || ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.CARTE_BLANCHE_UI]) {
		stepCounter++;
		ZaNewAccountXWizard.GENERAL_STEP = stepCounter;
		this.stepChoices.push({value:ZaNewAccountXWizard.GENERAL_STEP, label:ZaMsg.TABT_GeneralPage});
//	}
	
	if(ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.ACCOUNTS_CONTACT_TAB] || ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.CARTE_BLANCHE_UI]) {
		stepCounter++;
		ZaNewAccountXWizard.CONTACT_STEP = stepCounter;
		this.stepChoices.push({value:ZaNewAccountXWizard.CONTACT_STEP, label:ZaMsg.TABT_ContactInfo});
	}
		
	if(ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.ACCOUNTS_ALIASES_TAB] || ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.CARTE_BLANCHE_UI]) {
		stepCounter++;
		ZaNewAccountXWizard.ALIASES_STEP = stepCounter;
		this.stepChoices.push({value:ZaNewAccountXWizard.ALIASES_STEP, label:ZaMsg.TABT_Aliases});
	}
	if(ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.ACCOUNTS_FORWARDING_TAB] || ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.CARTE_BLANCHE_UI]) {
		stepCounter++;
		ZaNewAccountXWizard.FORWARDING_STEP = stepCounter;		
		this.stepChoices.push({value:ZaNewAccountXWizard.FORWARDING_STEP, label:ZaMsg.TABT_Forwarding});
	}
	if(ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.ACCOUNTS_FEATURES_TAB] || ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.CARTE_BLANCHE_UI]) {
		stepCounter++;
		ZaNewAccountXWizard.FEATURES_STEP = stepCounter;		
		this.stepChoices.push({value:ZaNewAccountXWizard.FEATURES_STEP, label:ZaMsg.TABT_Features});
	}				
	if(ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.ACCOUNTS_PREFS_TAB] || ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.CARTE_BLANCHE_UI]) {
		stepCounter++;
		ZaNewAccountXWizard.PREFS_STEP = stepCounter;	
		this.stepChoices.push({value:ZaNewAccountXWizard.PREFS_STEP, label:ZaMsg.TABT_Preferences});
	}
	if(ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.ACCOUNTS_SKIN_TAB] || ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.CARTE_BLANCHE_UI]) {
		stepCounter++;
		ZaNewAccountXWizard.SKINS_STEP = stepCounter;		
		this.stepChoices.push({value:ZaNewAccountXWizard.SKINS_STEP, label:ZaMsg.TABT_Themes});
	}
	
	if(ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.ACCOUNTS_ZIMLET_TAB] || ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.CARTE_BLANCHE_UI]) {
		stepCounter++;
		ZaNewAccountXWizard.ZIMLETS_STEP = stepCounter;			
		this.stepChoices.push({value:ZaNewAccountXWizard.ZIMLETS_STEP, label:ZaMsg.TABT_Zimlets});
	}
		
	if(ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.ACCOUNTS_ADVANCED_TAB] || ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.CARTE_BLANCHE_UI]) {
		stepCounter++;
		ZaNewAccountXWizard.ADVANCED_STEP = stepCounter;			
		this.stepChoices.push({value:ZaNewAccountXWizard.ADVANCED_STEP, label:ZaMsg.TABT_Advanced});
	}
	this._lastStep = this.stepChoices.length;
	this.cosChoices = new XFormChoices([], XFormChoices.OBJECT_LIST, "id", "name");

	this.initForm(ZaAccount.myXModel,this.getMyXForm());	
//    DBG.timePt(AjxDebug.PERF, "finished initForm");
   
	this._localXForm.setController();	
	this._localXForm.addListener(DwtEvent.XFORMS_FORM_DIRTY_CHANGE, new AjxListener(this, ZaNewAccountXWizard.prototype.handleXFormChange));
	this._localXForm.addListener(DwtEvent.XFORMS_VALUE_ERROR, new AjxListener(this, ZaNewAccountXWizard.prototype.handleXFormChange));	
	this._helpURL = ZaNewAccountXWizard.helpURL;
	
	this._domains = {} ;
}
ZaNewAccountXWizard.GENERAL_STEP = 1;
ZaNewAccountXWizard.CONTACT_STEP = 2;
ZaNewAccountXWizard.ALIASES_STEP = 3;
ZaNewAccountXWizard.FORWARDING_STEP = 4;
ZaNewAccountXWizard.FEATURES_STEP = 5;
ZaNewAccountXWizard.PREFS_STEP = 6;
ZaNewAccountXWizard.SKINS_STEP = 7;
ZaNewAccountXWizard.ZIMLETS_STEP = 8;
ZaNewAccountXWizard.ADVANCED_STEP = 9;

ZaNewAccountXWizard.zimletChoices = new XFormChoices([], XFormChoices.SIMPLE_LIST);
ZaNewAccountXWizard.themeChoices = new XFormChoices([], XFormChoices.SIMPLE_LIST);
ZaNewAccountXWizard.prototype = new ZaXWizardDialog;
ZaNewAccountXWizard.prototype.constructor = ZaNewAccountXWizard;
ZaXDialog.XFormModifiers["ZaNewAccountXWizard"] = new Array();
ZaNewAccountXWizard.helpURL = location.pathname + ZaUtil.HELP_URL + "managing_accounts/create_an_account.htm?locid="+AjxEnv.DEFAULT_LOCALE;
ZaNewAccountXWizard.prototype.handleXFormChange = 
function () {
	if(this._localXForm.hasErrors()) {
		this._button[DwtWizardDialog.FINISH_BUTTON].setEnabled(false);
		this._button[DwtWizardDialog.NEXT_BUTTON].setEnabled(false);
		this._button[DwtWizardDialog.PREV_BUTTON].setEnabled(false);
	} else {
		if(this._containedObject.attrs[ZaAccount.A_lastName]
                && this._containedObject[ZaAccount.A_name].indexOf("@") > 0
                && ZaAccount.isAccountTypeSet(this._containedObject) 
                ) {
			this._button[DwtWizardDialog.FINISH_BUTTON].setEnabled(true);
			if(this._containedObject[ZaModel.currentStep] != this._lastStep) {
				this._button[DwtWizardDialog.NEXT_BUTTON].setEnabled(true);
			}
			if(this._containedObject[ZaModel.currentStep] != ZaNewAccountXWizard.GENERAL_STEP) {
				this._button[DwtWizardDialog.PREV_BUTTON].setEnabled(true);
			}			
		}
	}
}

//update the account type output with the right available/used account counts
//and not default account type choices displayed
ZaNewAccountXWizard.accountTypeItemId = "account_type_output_" + Dwt.getNextId();
ZaNewAccountXWizard.prototype.updateAccountType =
function ()  {                                                      
    var item = this._localXForm.getItemsById (ZaNewAccountXWizard.accountTypeItemId) [0] ;
    item.updateElement(ZaAccount.getAccountTypeOutput.call(item, true)) ;
}

/*
ZaNewAccountXWizard.onNameFieldChanged = 
function (value, event, form) {
	if(value && value.length > 0) {
		form.parent._button[DwtWizardDialog.FINISH_BUTTON].setEnabled(true);
	} else {
		form.parent._button[DwtWizardDialog.FINISH_BUTTON].setEnabled(false);
	}
	this.setInstanceValue(value);
	return value;
}*/

/**
* Overwritten methods that control wizard's flow (open, go next,go previous, finish)
**/
ZaNewAccountXWizard.prototype.popup = 
function (loc) {
	ZaXWizardDialog.prototype.popup.call(this, loc);
	this._button[DwtWizardDialog.NEXT_BUTTON].setEnabled(false);
	this._button[DwtWizardDialog.FINISH_BUTTON].setEnabled(false);
	this._button[DwtWizardDialog.PREV_BUTTON].setEnabled(false);	
}

ZaNewAccountXWizard.prototype.finishWizard = 
function() {
	try {
		
		if(!ZaAccount.checkValues(this._containedObject)) {
			return false;
		}
		var account = ZaItem.create(this._containedObject,ZaAccount,"ZaAccount");
		if(account != null) {
			//if creation took place - fire an change event
			ZaApp.getInstance().getAccountListController().fireCreationEvent(account);
			this.popdown();		
		}
	} catch (ex) {
		switch(ex.code) {		
			case ZmCsfeException.ACCT_EXISTS:
				ZaApp.getInstance().getCurrentController().popupErrorDialog(ZaMsg.ERROR_ACCOUNT_EXISTS);
			break;
			case ZmCsfeException.ACCT_INVALID_PASSWORD:
				ZaApp.getInstance().getCurrentController().popupErrorDialog(ZaMsg.ERROR_PASSWORD_INVALID, ex);
				ZaApp.getInstance().getAppCtxt().getErrorDialog().showDetail(true);
			break;
			default:
				ZaApp.getInstance().getCurrentController()._handleException(ex, "ZaNewAccountXWizard.prototype.finishWizard", null, false);
			break;		
		}
	}
}

ZaNewAccountXWizard.prototype.goNext = 
function() {
	if (this._containedObject[ZaModel.currentStep] == 1) {
		//check if passwords match
		if(this._containedObject.attrs[ZaAccount.A_password]) {
			if(this._containedObject.attrs[ZaAccount.A_password] != this._containedObject[ZaAccount.A2_confirmPassword]) {
				ZaApp.getInstance().getCurrentController().popupErrorDialog(ZaMsg.ERROR_PASSWORD_MISMATCH);
				return false;
			}
		}
		//check if account exists
		var params = { 	query: ["(|(uid=",this._containedObject[ZaAccount.A_name],")(cn=",this._containedObject[ZaAccount.A_name],")(sn=",this._containedObject[ZaAccount.A_name],")(gn=",this._containedObject[ZaAccount.A_name],")(mail=",this._containedObject[ZaAccount.A_name],")(zimbraMailDeliveryAddress=",this._containedObject[ZaAccount.A_name],"))"].join(""),
						limit : 2,
						applyCos: 0,
						types: [ZaSearch.DLS,ZaSearch.ALIASES,ZaSearch.ACCOUNTS,ZaSearch.RESOURCES],
						controller: ZaApp.getInstance().getCurrentController()
					 };
		try {			
			var resp = ZaSearch.searchDirectory(params).Body.SearchDirectoryResponse;		
		} catch (ex) {
			ZaApp.getInstance().getCurrentController()._handleException(ex, "ZaNewAccountXWizard.prototype.goNext", null, false);
		}
		var list = new ZaItemList(null);	
		list.loadFromJS(resp);	
		if(list.size() > 0) {
			var acc = list.getArray()[0];
			if(acc.type==ZaItem.ALIAS) {
				ZaApp.getInstance().getCurrentController().popupErrorDialog(ZaMsg.ERROR_aliasWithThisNameExists);
			} else if (acc.type==ZaItem.RESOURCE) {
				ZaApp.getInstance().getCurrentController().popupErrorDialog(ZaMsg.ERROR_resourceWithThisNameExists);
			} else if (acc.type==ZaItem.DL) {
				ZaApp.getInstance().getCurrentController().popupErrorDialog(ZaMsg.ERROR_dlWithThisNameExists);
			} else {
				ZaApp.getInstance().getCurrentController().popupErrorDialog(ZaMsg.ERROR_accountWithThisNameExists);
			}
			return false;
		} 
		this._button[DwtWizardDialog.PREV_BUTTON].setEnabled(true);
		
	} 
	this.goPage(this._containedObject[ZaModel.currentStep] + 1);
	if(this._containedObject[ZaModel.currentStep] == this._lastStep) {
		this._button[DwtWizardDialog.NEXT_BUTTON].setEnabled(false);
	}	
}

ZaNewAccountXWizard.prototype.goPrev = 
function() {
	if (this._containedObject[ZaModel.currentStep] == 2) {
		this._button[DwtWizardDialog.PREV_BUTTON].setEnabled(false);
	} else if(this._containedObject[ZaModel.currentStep] == this._lastStep) {
		this._button[DwtWizardDialog.NEXT_BUTTON].setEnabled(true);
	}
	this.goPage(this._containedObject[ZaModel.currentStep] - 1);
}

/**
* @method setObject sets the object contained in the view
* @param entry - ZaAccount object to display
**/
ZaNewAccountXWizard.prototype.setObject =
function(entry) {
	this._containedObject = new Object();
	this._containedObject.attrs = new Object();

	for (var a in entry.attrs) {
		this._containedObject.attrs[a] = entry.attrs[a];
	}
	this._containedObject.name = "";

	if(entry.rights)
		this._containedObject.rights = entry.rights;

	if(entry.setAttrs)
		this._containedObject.setAttrs = entry.setAttrs;
	
	if(entry.getAttrs)
		this._containedObject.getAttrs = entry.getAttrs;
		
	if(entry._defaultValues)
		this._containedObject._defaultValues = entry._defaultValues;

	this._containedObject.id = null;
	/*if(ZaSettings.COSES_ENABLED) {
		if(this._containedObject.attrs[ZaAccount.A_COSId]) {
			this._containedObject._defaultValues = ZaCos.getCosById(this._containedObject.attrs[ZaAccount.A_COSId]);
		}
		if(!this._containedObject.cos) {
			this._containedObject._defaultValues = ZaCos.getCosByName("default");
		}
		//this should never happen, because default cos should always be there. Last resort.
		if(!this._containedObject.cos) {
			var cosList = ZaApp.getInstance().getCosList().getArray();
			this._containedObject._defaultValues = cosList[0];
			this._containedObject.attrs[ZaAccount.A_COSId] = cosList[0].id;
		}
	} */
	this.cosChoices.setChoices([this._containedObject.cos]);
	this.cosChoices.dirtyChoices();
	this._containedObject.attrs[ZaAccount.A_accountStatus] = ZaAccount.ACCOUNT_STATUS_ACTIVE;
	this._containedObject[ZaAccount.A2_autodisplayname] = "TRUE";
	this._containedObject[ZaAccount.A2_autoMailServer] = "TRUE";
	this._containedObject[ZaAccount.A2_autoCos] = "TRUE";
	this._containedObject[ZaAccount.A2_confirmPassword] = null;
	this._containedObject[ZaModel.currentStep] = 1;
	this._containedObject.attrs[ZaAccount.A_zimbraMailAlias] = new Array();
//	var domainName = ZaApp.getInstance()._appCtxt.getAppController().getOverviewPanelController().getCurrentDomain();
	var domainName;
	if(!domainName) {
		//find out what is the default domain
		try {
			domainName = ZaApp.getInstance().getGlobalConfig().attrs[ZaGlobalConfig.A_zimbraDefaultDomainName];
		} catch (ex) {
			if(ex.code != ZmCsfeException.SVC_PERM_DENIED) {
				throw(ex);
			}
		} 

	}
	//this._containedObject.globalConfig = ZaApp.getInstance().getGlobalConfig();
	 
	if(!domainName) {
		domainName =  ZaSettings.myDomainName;
	}
	this._containedObject[ZaAccount.A_name] = "@" + domainName;
	if(ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.ACCOUNTS_SKIN_TAB] || ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.CARTE_BLANCHE_UI]) {
		if(entry.getAttrs[ZaAccount.A_zimbraAvailableSkin]) {
			var skins = entry.attrs[ZaAccount.A_zimbraAvailableSkin];
			if(skins != null && skins != "") {
				if (AjxUtil.isString(skins))	 {
					skins = [skins];
				}
				this._containedObject.attrs[ZaAccount.A_zimbraAvailableSkin] = skins;
			} else {
				this._containedObject.attrs[ZaAccount.A_zimbraAvailableSkin] = null;		
			}
	
			var skins = ZaApp.getInstance().getInstalledSkins();
			if(skins == null) {
				skins = [];
			} else if (AjxUtil.isString(skins))	 {
				skins = [skins];
			}
			
			ZaNewAccountXWizard.themeChoices.setChoices(skins);
			ZaNewAccountXWizard.themeChoices.dirtyChoices();
		}		
	}
	
	if(ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.ACCOUNTS_ZIMLET_TAB] || ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.CARTE_BLANCHE_UI])  {
		if(entry.getAttrs[ZaAccount.A_zimbraZimletAvailableZimlets]) {
			var zimlets = entry.attrs[ZaAccount.A_zimbraZimletAvailableZimlets];
			if(zimlets != null && zimlets != "") {
				var _tmpZimlets = [];
				if (AjxUtil.isString(zimlets))	 {
					zimlets = [zimlets];
				}
	
				this._containedObject.attrs[ZaAccount.A_zimbraZimletAvailableZimlets] = zimlets;
			} else
				this._containedObject.attrs[ZaAccount.A_zimbraZimletAvailableZimlets] = null;		
		}
		var allZimlets = ZaZimlet.getAll("extension");
		_tmpZimlets = [];
		if(allZimlets == null) {
			allZimlets = [];
		} 
			
		if(allZimlets instanceof ZaItemList || allZimlets instanceof AjxVector)
			allZimlets = allZimlets.getArray();
		
		var cnt = allZimlets.length;
		//convert objects to strings	
		for(var i=0; i<cnt; i++) {
			var zimlet = allZimlets[i];
			_tmpZimlets[i] = zimlet.name;
		}
		ZaNewAccountXWizard.zimletChoices.setChoices(_tmpZimlets);
		ZaNewAccountXWizard.zimletChoices.dirtyChoices();		
	}
    //check the account type here
    var domainName = ZaAccount.getDomain (this._containedObject.name) ;
    var domainObj = ZaDomain.getDomainByName (domainName) ;
    this._containedObject[ZaAccount.A2_accountTypes] = domainObj.getAccountTypes () ;
   
    this._localXForm.setInstance(this._containedObject);
}

ZaNewAccountXWizard.isDomainLeftAccountsAlertVisible = function () {
	var val1 = this.getInstanceValue(ZaAccount.A2_domainLeftAccounts);
	var val2 = this.getInstanceValue(ZaAccount.A2_accountTypes);
	return (!AjxUtil.isEmpty(val1) && AjxUtil.isEmpty(val2));
}

ZaNewAccountXWizard.isAccountTypeGrouperVisible = function () {
	return !AjxUtil.isEmpty(this.getInstanceValue(ZaAccount.A2_accountTypes));
}

ZaNewAccountXWizard.isAccountTypeSet = function () {
	return !ZaAccount.isAccountTypeSet(this.getInstance());
}

ZaNewAccountXWizard.isAutoDisplayname = function () {
	return (this.getInstanceValue(ZaAccount.A2_autodisplayname)=="FALSE");
}

ZaNewAccountXWizard.isAutoCos = function () {
	return (this.getInstanceValue(ZaAccount.A2_autoCos)=="FALSE");
}


ZaNewAccountXWizard.isIMFeatureEnabled = function () {
	return (this.getInstanceValue(ZaAccount.A_zimbraFeatureIMEnabled) == "TRUE");
}

ZaNewAccountXWizard.isCalendarFeatureEnabled = function () {
	return this.getInstanceValue(ZaAccount.A_zimbraFeatureCalendarEnabled)=="TRUE";
}

ZaNewAccountXWizard.isMailForwardingEnabled = function () {
	return (this.getInstanceValue(ZaAccount.A_zimbraFeatureMailForwardingEnabled) == "TRUE");
}

ZaNewAccountXWizard.onCOSChanged = 
function(value, event, form) {
	if(ZaItem.ID_PATTERN.test(value))  {
		form.getInstance()._defaultValues = ZaCos.getCosById(value, form.parent._app);
		this.setInstanceValue(value);
	} else {
		form.getInstance()._defaultValues = ZaCos.getCosByName(value, form.parent._app);
		if(form.getInstance().cos) {
			//value = form.getInstance()._defaultValues.id;
			value = form.getInstance()._defaultValues.id;
		} 
	}
	this.setInstanceValue(value);
    form.parent._isCosChanged = true ;

    //if cos is changed,  update the account type information
    form.parent.updateAccountType();
    
    return value;
}

ZaNewAccountXWizard.myXFormModifier = function(xFormObject) {	
	var domainName = ZaSettings.myDomainName;

	var emptyAlias = "@" + domainName;
	var cases = new Array();

		var case1 = {type:_CASE_, tabGroupKey:ZaNewAccountXWizard.GENERAL_STEP, caseKey:ZaNewAccountXWizard.GENERAL_STEP, numCols:1,  align:_LEFT_, valign:_TOP_};
		var case1Items = [ 
			 {type: _DWT_ALERT_, ref: ZaAccount.A2_domainLeftAccounts,
	                visibilityChecks:[ZaNewAccountXWizard.isDomainLeftAccountsAlertVisible],
	                visibilityChangeEventSources:[ZaAccount.A2_domainLeftAccounts,ZaAccount.A2_accountTypes],
					containerCssStyle: "width:400px;",
					style: DwtAlert.WARNING, iconVisible: false
			 },
	
	        //account types group
	        {type:_ZAWIZ_TOP_GROUPER_, label:ZaMsg.NAD_AccountTypeGrouper, id:"account_wiz_type_group",
	                colSpan: "*", numCols: 1, colSizes: ["100%"],
	                visibilityChecks:[ZaNewAccountXWizard.isAccountTypeGrouperVisible],
	                visibilityChangeEventSources:[ZaAccount.A2_accountTypes,ZaAccount.A_COSId],
	                items: [
	                    {type: _DWT_ALERT_, 
	                    	visibilityChecks:[ZaNewAccountXWizard.isAccountTypeSet],
	                        visibilityChangeEventSources:[ZaAccount.A2_accountTypes,ZaAccount.A_COSId],
	                        containerCssStyle: "width:400px;",
	                        style: DwtAlert.CRITICAL, iconVisible: false ,
	                        content: ZaMsg.ERROR_ACCOUNT_TYPE_NOT_SET
	                    },
	                    { type: _OUTPUT_, id: ZaNewAccountXWizard.accountTypeItemId,
	                        getDisplayValue: ZaAccount.getAccountTypeOutput,
	                        //center the elements
	                        cssStyle: "width: 600px; margin-left: auto; margin-right: auto;"
	                    }
	               ]
	        },
	        {type:_ZAWIZ_TOP_GROUPER_, label:ZaMsg.NAD_AccountNameGrouper, id:"account_wiz_name_group",numCols:2,
				items:[
				{ref:ZaAccount.A_name, type:_EMAILADDR_, msgName:ZaMsg.NAD_AccountName,label:ZaMsg.NAD_AccountName,
								 labelLocation:_LEFT_,forceUpdate:true,
								 onChange: ZaAccount.setDomainChanged
				},
				{ref:ZaAccount.A_firstName, type:_TEXTFIELD_, msgName:ZaMsg.NAD_FirstName,label:ZaMsg.NAD_FirstName, 
					labelLocation:_LEFT_, cssClass:"admin_xform_name_input", width:150,
					elementChanged: function(elementValue,instanceValue, event) {
						if(this.getInstance()[ZaAccount.A2_autodisplayname]=="TRUE") {
							ZaAccount.generateDisplayName.call(this, this.getInstance(), elementValue, this.getInstance().attrs[ZaAccount.A_lastName],this.getInstance().attrs[ZaAccount.A_initials] );
						}
						this.getForm().itemChanged(this, elementValue, event);
					}
				},
				{ref:ZaAccount.A_initials, type:_TEXTFIELD_, msgName:ZaMsg.NAD_Initials,label:ZaMsg.NAD_Initials, labelLocation:_LEFT_, cssClass:"admin_xform_name_input", width:50,
					elementChanged: function(elementValue,instanceValue, event) {
						if(this.getInstance()[ZaAccount.A2_autodisplayname]=="TRUE") {
							ZaAccount.generateDisplayName.call(this, this.getInstance(), this.getInstance().attrs[ZaAccount.A_firstName], this.getInstance().attrs[ZaAccount.A_lastName],elementValue);
						}
						this.getForm().itemChanged(this, elementValue, event);
					}
				},
				{ref:ZaAccount.A_lastName, type:_TEXTFIELD_, msgName:ZaMsg.NAD_LastName,label:ZaMsg.NAD_LastName, labelLocation:_LEFT_, cssClass:"admin_xform_name_input", width:150,
					elementChanged: function(elementValue,instanceValue, event) {
						if(this.getInstance()[ZaAccount.A2_autodisplayname]=="TRUE") {
							ZaAccount.generateDisplayName.call(this, this.getInstance(), this.getInstance().attrs[ZaAccount.A_firstName], elementValue ,this.getInstance().attrs[ZaAccount.A_initials]);
						}
						this.getForm().itemChanged(this, elementValue, event);
					}
				},
				{type:_GROUP_, numCols:3, nowrap:true, width:200, msgName:ZaMsg.NAD_DisplayName,label:ZaMsg.NAD_DisplayName+":", 
					labelLocation:_LEFT_, visibilityChecks:[[XFormItem.prototype.hasReadPermission,ZaAccount.A_displayname]],
					items: [
						{ref:ZaAccount.A_displayname, type:_TEXTFIELD_, label:null,	cssClass:"admin_xform_name_input", width:150, 
							enableDisableChecks:[ZaNewAccountXWizard.isAutoDisplayname,ZaItem.hasWritePermission],
							enableDisableChangeEventSources:[ZaAccount.A2_autodisplayname],bmolsnr:true,
							visibilityChecks:[]
						},
						{ref:ZaAccount.A2_autodisplayname, type:_CHECKBOX_, msgName:ZaMsg.NAD_Auto,label:ZaMsg.NAD_Auto,labelLocation:_RIGHT_,trueValue:"TRUE", falseValue:"FALSE",
							elementChanged: function(elementValue,instanceValue, event) {
								if(elementValue=="TRUE") {
									ZaAccount.generateDisplayName.call(this, this.getInstance(), this.getInstance().attrs[ZaAccount.A_firstName], this.getInstance().attrs[ZaAccount.A_lastName],this.getInstance().attrs[ZaAccount.A_initials]);	
								}
								this.getForm().itemChanged(this, elementValue, event);
							},
							visibilityChecks:[],
							enableDisableChecks:[[ZaItem.hasWritePermission,ZaAccount.A_displayname]]
						}
					]
				},
				{ref:ZaAccount.A_zimbraMailCanonicalAddress, type:_TEXTFIELD_,width:250,
					msgName:ZaMsg.NAD_CanonicalFrom,label:ZaMsg.NAD_CanonicalFrom, labelLocation:_LEFT_, align:_LEFT_
				},
				{ref:ZaAccount.A_zimbraHideInGal, type:_CHECKBOX_,
				  msgName:ZaMsg.NAD_zimbraHideInGal,label:ZaMsg.NAD_zimbraHideInGal, trueValue:"TRUE", falseValue:"FALSE"
				}
			]}
		];
	
		var setupGroup = {type:_ZAWIZ_TOP_GROUPER_, label:ZaMsg.NAD_AccountSetupGrouper, id:"account_wiz_setup_group", 
			numCols:2,
			items: [
				{ref:ZaAccount.A_accountStatus, type:_OSELECT1_, msgName:ZaMsg.NAD_AccountStatus,
					label:ZaMsg.NAD_AccountStatus, 
					labelLocation:_LEFT_, choices:this.accountStatusChoices
				}
			]
		}
			

		setupGroup.items.push(
			{type:_GROUP_, numCols:3, nowrap:true, label:ZaMsg.NAD_ClassOfService, labelLocation:_LEFT_,
				visibilityChecks:[[ZaItem.hasWritePermission,ZaAccount.A_COSId]],
				items: [
					{ref:ZaAccount.A_COSId, type:_DYNSELECT_,label: null, 
						inputPreProcessor:ZaAccountXFormView.preProcessCOS,
						onChange:ZaAccount.setCosChanged,
						emptyText:ZaMsg.enterSearchTerm,						
						enableDisableChecks:[ZaNewAccountXWizard.isAutoCos],
						enableDisableChangeEventSources:[ZaAccount.A2_autoCos],
						visibilityChecks:[],
						dataFetcherMethod:ZaSearch.prototype.dynSelectSearchCoses,choices:this.cosChoices,
						dataFetcherClass:ZaSearch,editable:true,getDisplayValue:function(newValue) {
								// dereference through the choices array, if provided
								//newValue = this.getChoiceLabel(newValue);
								if(ZaItem.ID_PATTERN.test(newValue)) {
									var cos = ZaCos.getCosById(newValue, this.getForm().parent._app);
									if(cos)
										newValue = cos.name;
								} 
								if (newValue == null) {
									newValue = "";
								} else {
									newValue = "" + newValue;
								}
								return newValue;
							}
					},
					{ref:ZaAccount.A2_autoCos, type:_CHECKBOX_, 
						msgName:ZaMsg.NAD_Auto,label:ZaMsg.NAD_Auto,labelLocation:_RIGHT_,
						trueValue:"TRUE", falseValue:"FALSE" ,
						elementChanged: function(elementValue,instanceValue, event) {
							if(elementValue=="TRUE") {
								ZaAccount.setDefaultCos(this.getInstance(), this.getForm().parent._app);	
							}
							this.getForm().itemChanged(this, elementValue, event);
						},
						visibilityChecks:[]
					}
				]
			});
		
		setupGroup.items.push({ref:ZaAccount.A_isAdminAccount, type:_CHECKBOX_, 
								msgName:ZaMsg.NAD_IsAdmin,label:ZaMsg.NAD_IsAdmin,
								trueValue:"TRUE", falseValue:"FALSE"
							});
							
		setupGroup.items.push({type:_GROUP_, numCols:3, nowrap:true, label:ZaMsg.NAD_MailServer, labelLocation:_LEFT_,
							visibilityChecks:[[ZaItem.hasWritePermission,ZaAccount.A_mailHost]],
							items: [
								{ ref: ZaAccount.A_mailHost, type: _OSELECT1_, label: null, editable:false, choices: ZaApp.getInstance().getServerListChoices(), 
									enableDisableChecks:[ZaAccount.isAutoMailServer],
									enableDisableChangeEventSources:[ZaAccount.A2_autoMailServer],
									visibilityChecks:[],
									tableCssStyle: "height: 15px"
							  	},
								{ref:ZaAccount.A2_autoMailServer, type:_CHECKBOX_, msgName:ZaMsg.NAD_Auto,label:ZaMsg.NAD_Auto,labelLocation:_RIGHT_,trueValue:"TRUE", falseValue:"FALSE",
									visibilityChecks:[],
									enableDisableChecks:[]
								}
							]
						});
						
		case1Items.push(setupGroup);
		
		var passwordGroup = {type:_ZAWIZ_TOP_GROUPER_, label:ZaMsg.NAD_PasswordGrouper,id:"account_wiz_password_group", 
			numCols:2,
			items:[
			{ref:ZaAccount.A_password, type:_SECRET_, msgName:ZaMsg.NAD_Password,
				label:ZaMsg.NAD_Password, labelLocation:_LEFT_, 
				cssClass:"admin_xform_name_input"
			},
			{ref:ZaAccount.A2_confirmPassword, type:_SECRET_, msgName:ZaMsg.NAD_ConfirmPassword,
				label:ZaMsg.NAD_ConfirmPassword, labelLocation:_LEFT_, 
				cssClass:"admin_xform_name_input"
			},
			{ref:ZaAccount.A_zimbraPasswordMustChange,  type:_CHECKBOX_,  
				msgName:ZaMsg.NAD_MustChangePwd,label:ZaMsg.NAD_MustChangePwd,trueValue:"TRUE", falseValue:"FALSE"}
			]
		};
		case1Items.push(passwordGroup);														
	
	    var new_acct_timezone_group = {
	         type:_ZAWIZ_TOP_GROUPER_, label:ZaMsg.NAD_TimezoneGrouper, id: "account_wiz_timezone_group",
	         visibilityChecks:[[ZaItem.hasWritePermission,ZaAccount.A_zimbraPrefTimeZoneId]],
	         numCols: 2,
	         items: [
	                   /*
	                {ref:"default_timezone", type:_CHECKBOX_, msgName:"default",
	                    label:ZaMsg.NAD_Auto,labelLocation:_RIGHT_,trueValue:"TRUE", falseValue:"FALSE",
	                    elementChanged: function(elementValue,instanceValue, event) {
	                        if(elementValue=="TRUE") {
	                            ZaAccount.generateDisplayName(this.getInstance(), this.getInstance().attrs[ZaAccount.A_firstName], this.getInstance().attrs[ZaAccount.A_lastName],this.getInstance().attrs[ZaAccount.A_initials]);
	                        }
	                        this.getForm().itemChanged(this, elementValue, event);
	                    }
	              }     */
	            {ref:ZaAccount.A_zimbraPrefTimeZoneId, type:_SELECT1_, msgName:ZaMsg.NAD_zimbraPrefTimeZoneId,
	                 label:ZaMsg.NAD_zimbraPrefTimeZoneId+":", labelLocation:_LEFT_ }
	         ]
	    }
	
	    case1Items.push (new_acct_timezone_group) ;
	    
	
	
	    var notesGroup = {type:_ZAWIZ_TOP_GROUPER_, label:ZaMsg.NAD_NotesGrouper, id:"account_wiz_notes_group",
			numCols:2,
		 	items:[
	
			{ref:ZaAccount.A_description, type:_INPUT_, msgName:ZaMsg.NAD_Description,
				label:ZaMsg.NAD_Description, labelLocation:_LEFT_, cssClass:"admin_xform_name_input"
			},
			{ref:ZaAccount.A_notes, type:_TEXTAREA_, msgName:ZaMsg.NAD_Notes,
				label:ZaMsg.NAD_Notes, labelLocation:_LEFT_, labelCssStyle:"vertical-align:top", width:"30em"
			}
			]
		};
	
		case1Items.push(notesGroup);
		case1.items = case1Items;
		cases.push(case1);
	//}
	if(ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.ACCOUNTS_CONTACT_TAB] || ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.CARTE_BLANCHE_UI]) {	
		var case2={type:_CASE_, caseKey:ZaNewAccountXWizard.CONTACT_STEP, tabGroupKey:ZaNewAccountXWizard.CONTACT_STEP, numCols:1, 
						items: [
							{type:_ZAWIZGROUP_, 
								items:[
									{ref:ZaAccount.A_telephoneNumber, type:_TEXTFIELD_, msgName:ZaMsg.NAD_telephoneNumber,label:ZaMsg.NAD_telephoneNumber, labelLocation:_LEFT_, width:250}
								]
							},
							{type:_ZAWIZGROUP_, 
								items:[					
									{ref:ZaAccount.A_company, type:_TEXTFIELD_, msgName:ZaMsg.NAD_company,label:ZaMsg.NAD_company, labelLocation:_LEFT_, width:250},
									{ref:ZaAccount.A_orgUnit, type:_TEXTFIELD_, msgName:ZaMsg.NAD_orgUnit,label:ZaMsg.NAD_orgUnit, labelLocation:_LEFT_, width:250},														
									{ref:ZaAccount.A_office, type:_TEXTFIELD_, msgName:ZaMsg.NAD_office,label:ZaMsg.NAD_office, labelLocation:_LEFT_, width:250}
								]
							},
							{type:_ZAWIZGROUP_, 
								items:[						
									{ref:ZaAccount.A_street, type:_TEXTAREA_, msgName:ZaMsg.NAD_street,label:ZaMsg.NAD_street, labelLocation:_LEFT_, width:250},
									{ref:ZaAccount.A_city, type:_TEXTFIELD_, msgName:ZaMsg.NAD_city,label:ZaMsg.NAD_city, labelLocation:_LEFT_, width:250},
									{ref:ZaAccount.A_state, type:_TEXTFIELD_, msgName:ZaMsg.NAD_state,label:ZaMsg.NAD_state, labelLocation:_LEFT_, width:250},
									{ref:ZaAccount.A_zip, type:_TEXTFIELD_, msgName:ZaMsg.NAD_zip,label:ZaMsg.NAD_zip, labelLocation:_LEFT_, width:100},
									{ref:ZaAccount.A_country, type:_TEXTFIELD_, msgName:ZaMsg.NAD_country,label:ZaMsg.NAD_country, labelLocation:_LEFT_, width:250}
								]
							}							
						]
					};
		cases.push(case2);
	}
	
	if(ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.ACCOUNTS_ALIASES_TAB] || ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.CARTE_BLANCHE_UI]) {
		cases.push({type:_CASE_, tabGroupKey:ZaNewAccountXWizard.ALIASES_STEP, caseKey:ZaNewAccountXWizard.ALIASES_STEP, numCols:1, 
					items: [
						{type:_OUTPUT_, value:ZaMsg.NAD_AccountAliases},
						{ref:ZaAccount.A_zimbraMailAlias, type:_REPEAT_, label:null, repeatInstance:emptyAlias, showAddButton:true, 
							showRemoveButton:true, 
							addButtonLabel:ZaMsg.NAD_AddAlias, 
							showAddOnNextRow:true,
							removeButtonLabel:ZaMsg.NAD_RemoveAlias,
							removeButtonCSSStyle: "margin-left: 50px",
							items: [
								{ref:".", type:_EMAILADDR_, label:null}
							]
						}
					]
				});								
	}
							
	var zimbraFeatureMailForwardingEnabledItem = 
				{ref:ZaAccount.A_zimbraFeatureMailForwardingEnabled, 
					msgName:ZaMsg.NAD_zimbraFeatureMailForwardingEnabled,
					trueValue:"TRUE", falseValue:"FALSE"
				}


	if(ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.ACCOUNTS_FORWARDING_TAB] || ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.CARTE_BLANCHE_UI]) {
		cases.push({type:_CASE_, caseKey:ZaNewAccountXWizard.FORWARDING_STEP, tabGroupKey:ZaNewAccountXWizard.FORWARDING_STEP, numCols:2,colSizes:["200px","auto"], 
					id:"account_form_forwarding_step",
					items: [
						{
							ref:ZaAccount.A_zimbraFeatureMailForwardingEnabled,
							resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
							type:_SUPER_WIZ_CHECKBOX_, colSpan:2,
							checkBoxLabel:ZaMsg.NAD_zimbraFeatureMailForwardingEnabled,  
							trueValue:"TRUE", falseValue:"FALSE"
						},
						{ref:ZaAccount.A_zimbraPrefMailLocalDeliveryDisabled, 
							type:_CHECKBOX_, 
							msgName:ZaMsg.NAD_zimbraPrefMailLocalDeliveryDisabled,
							label:ZaMsg.NAD_zimbraPrefMailLocalDeliveryDisabled, 
							trueValue:"TRUE", falseValue:"FALSE"
						},
						{ref:ZaAccount.A_zimbraPrefMailForwardingAddress,width:250,
							labelCssClass:"xform_label",
							type:_TEXTFIELD_, msgName:ZaMsg.NAD_zimbraPrefMailForwardingAddress,
							label:ZaMsg.NAD_zimbraPrefMailForwardingAddress+":", labelLocation:_LEFT_, 
							cssClass:"admin_xform_name_input",
							nowrap:false,labelWrap:true, 
							enableDisableChecks:[ZaAccountXFormView.isMailForwardingEnabled],
							enableDisableChangeEventSources:[ZaAccount.A_zimbraFeatureMailForwardingEnabled, ZaAccount.A_COSId]
						},		
						{type:_SEPARATOR_,colSpan:2},
                        {type: _DWT_ALERT_, colSpan: 2,
                                            containerCssStyle: "padding:10px;padding-top: 0px; width:100%;",
                                            style: DwtAlert.WARNING,
                                            iconVisible: true,
                                            content: ZaMsg.Alert_Bouncing_Reveal_Hidden_Adds
                                        },    
                        {ref:ZaAccount.A_zimbraMailForwardingAddress, type:_REPEAT_,
							label:ZaMsg.NAD_EditFwdGroup, labelLocation:_LEFT_,labelCssClass:"xform_label",
							repeatInstance:emptyAlias, 
							showAddButton:true, showRemoveButton:true, 
							addButtonLabel:ZaMsg.NAD_AddAddress, 
							showAddOnNextRow:true,
							removeButtonLabel:ZaMsg.NAD_RemoveAddress,
							nowrap:false,labelWrap:true,
							items: [
								{ref:".", type:_TEXTFIELD_, label:null, width:250}
							]
						}
					]
				});				
	}	
	if(ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.ACCOUNTS_FEATURES_TAB] || ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.CARTE_BLANCHE_UI]) {
		cases.push({type:_CASE_,caseKey:ZaNewAccountXWizard.FEATURES_STEP, tabGroupKey:ZaNewAccountXWizard.FEATURES_STEP,id:"account_form_features_step",
				numCols:1, width:"100%",
				items: [
					{ type: _DWT_ALERT_,
					  containerCssStyle: "padding-top:20px;width:400px;",
					  style: DwtAlert.WARNING,
					  iconVisible: false, 
					  content: ZaMsg.NAD_CheckFeaturesInfo
					},				
					{type:_ZAWIZ_TOP_GROUPER_, label:ZaMsg.NAD_zimbraMajorFeature, id:"account_wiz_features_major", colSizes:["auto"],numCols:1,
						items:[	
							{ref:ZaAccount.A_zimbraFeatureMailEnabled,
								type:_SUPER_WIZ_CHECKBOX_, 
								resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
								msgName:ZaMsg.NAD_zimbraFeatureMailEnabled,
								checkBoxLabel:ZaMsg.NAD_zimbraFeatureMailEnabled,  
								trueValue:"TRUE", falseValue:"FALSE"},	
							{ref:ZaAccount.A_zimbraFeatureContactsEnabled,type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_FeatureContactsEnabled,checkBoxLabel:ZaMsg.NAD_FeatureContactsEnabled, labelLocation:_LEFT_, trueValue:"TRUE", falseValue:"FALSE"},							
							{ref:ZaAccount.A_zimbraFeatureCalendarEnabled,
								type:_SUPER_WIZ_CHECKBOX_, 
								resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
								msgName:ZaMsg.NAD_FeatureCalendarEnabled,
								checkBoxLabel:ZaMsg.NAD_FeatureCalendarEnabled,  
								trueValue:"TRUE", falseValue:"FALSE"},														
							{ref:ZaAccount.A_zimbraFeatureTasksEnabled,
								type:_SUPER_WIZ_CHECKBOX_, 
								resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
								msgName:ZaMsg.NAD_FeatureTaskEnabled,
								checkBoxLabel:ZaMsg.NAD_FeatureTaskEnabled,  
								trueValue:"TRUE", falseValue:"FALSE"},														
							{ref:ZaAccount.A_zimbraFeatureNotebookEnabled, type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_zimbraFeatureNotebookEnabled,checkBoxLabel:ZaMsg.NAD_zimbraFeatureNotebookEnabled,  trueValue:"TRUE", falseValue:"FALSE"},
							{ref:ZaAccount.A_zimbraFeatureBriefcasesEnabled, type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_zimbraFeatureBriefcasesEnabled,checkBoxLabel:ZaMsg.NAD_zimbraFeatureBriefcasesEnabled,  trueValue:"TRUE", falseValue:"FALSE"},							
							{ref:ZaAccount.A_zimbraFeatureIMEnabled,
								type:_SUPER_WIZ_CHECKBOX_, 
								resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
								msgName:ZaMsg.NAD_zimbraFeatureIMEnabled,
								checkBoxLabel:ZaMsg.NAD_zimbraFeatureIMEnabled,  
								trueValue:"TRUE", falseValue:"FALSE"},
							{ref:ZaAccount.A_zimbraFeatureOptionsEnabled,
								type:_SUPER_WIZ_CHECKBOX_, 
								resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
								msgName:ZaMsg.NAD_zimbraFeatureOptionsEnabled,
								checkBoxLabel:ZaMsg.NAD_zimbraFeatureOptionsEnabled,  
								trueValue:"TRUE", falseValue:"FALSE"}	
						]
					},	
					{type:_ZAWIZ_TOP_GROUPER_, label:ZaMsg.NAD_zimbraGeneralFeature, id:"account_wiz_features_general",
						 colSizes:["auto"],numCols:1,
						items:[							
							{ref:ZaAccount.A_zimbraFeatureTaggingEnabled, type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_FeatureTaggingEnabled,checkBoxLabel:ZaMsg.NAD_FeatureTaggingEnabled, trueValue:"TRUE", falseValue:"FALSE"},
							{ref:ZaAccount.A_zimbraFeatureSharingEnabled, type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_zimbraFeatureSharingEnabled,checkBoxLabel:ZaMsg.NAD_zimbraFeatureSharingEnabled,trueValue:"TRUE", falseValue:"FALSE"},
							{ref:ZaAccount.A_zimbraFeatureChangePasswordEnabled, type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_FeatureChangePasswordEnabled,checkBoxLabel:ZaMsg.NAD_FeatureChangePasswordEnabled,trueValue:"TRUE", falseValue:"FALSE"},
							{ref:ZaAccount.A_zimbraFeatureSkinChangeEnabled, type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_zimbraFeatureSkinChangeEnabled,checkBoxLabel:ZaMsg.NAD_zimbraFeatureSkinChangeEnabled, trueValue:"TRUE", falseValue:"FALSE"},
							{ref:ZaAccount.A_zimbraFeatureHtmlComposeEnabled, type:_SUPER_WIZ_CHECKBOX_, 
								resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
								msgName:ZaMsg.NAD_zimbraFeatureHtmlComposeEnabled,checkBoxLabel:ZaMsg.NAD_zimbraFeatureHtmlComposeEnabled, 
								trueValue:"TRUE", falseValue:"FALSE"},							
							{ref:ZaAccount.A_zimbraFeatureShortcutAliasesEnabled, 
								type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
								msgName:ZaMsg.NAD_zimbraFeatureShortcutAliasesEnabled,
								checkBoxLabel:ZaMsg.NAD_zimbraFeatureShortcutAliasesEnabled, 
								trueValue:"TRUE", falseValue:"FALSE"},
							{ref:ZaAccount.A_zimbraFeatureGalEnabled, type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_FeatureGalEnabled,checkBoxLabel:ZaMsg.NAD_FeatureGalEnabled, trueValue:"TRUE", falseValue:"FALSE"},
							{ref:ZaAccount.A_zimbraFeatureGalAutoCompleteEnabled, type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_zimbraFeatureGalAutoCompleteEnabled,checkBoxLabel:ZaMsg.NAD_zimbraFeatureGalAutoCompleteEnabled,  trueValue:"TRUE", falseValue:"FALSE"}
						]
					},	
					{type:_ZAWIZ_TOP_GROUPER_, label:ZaMsg.NAD_zimbraMailFeature, id:"account_wiz_features_mail",
						colSizes:["auto"],numCols:1,
					 	enableDisableChecks:[ZaAccountXFormView.isMailFeatureEnabled],
						enableDisableChangeEventSources:[ZaAccount.A_zimbraFeatureMailEnabled, ZaAccount.A_COSId],
						items:[													
							{ref:ZaAccount.A_zimbraFeatureMailPriorityEnabled, type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_zimbraFeatureMailPriorityEnabled,checkBoxLabel:ZaMsg.NAD_zimbraFeatureMailPriorityEnabled, trueValue:"TRUE", falseValue:"FALSE"},
							{ref:ZaAccount.A_zimbraFeatureFlaggingEnabled, type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_zimbraFeatureFlaggingEnabled,checkBoxLabel:ZaMsg.NAD_zimbraFeatureFlaggingEnabled, trueValue:"TRUE", falseValue:"FALSE"},
							{ref:ZaAccount.A_zimbraImapEnabled, type:_SUPER_WIZ_CHECKBOX_, 
								resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_zimbraImapEnabled,
								checkBoxLabel:ZaMsg.NAD_zimbraImapEnabled,  trueValue:"TRUE", falseValue:"FALSE"},
							{ref:ZaAccount.A_zimbraPop3Enabled, type:_SUPER_WIZ_CHECKBOX_, 
								resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_zimbraPop3Enabled,
								checkBoxLabel:ZaMsg.NAD_zimbraPop3Enabled,  trueValue:"TRUE", falseValue:"FALSE"},		
							{ref:ZaAccount.A_zimbraFeatureImapDataSourceEnabled, type:_SUPER_WIZ_CHECKBOX_, 
								resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_zimbraExternalImapEnabled,
								checkBoxLabel:ZaMsg.NAD_zimbraExternalImapEnabled,  trueValue:"TRUE", falseValue:"FALSE"},		
							{ref:ZaAccount.A_zimbraFeaturePop3DataSourceEnabled, type:_SUPER_WIZ_CHECKBOX_, 
								resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_zimbraExternalPop3Enabled,
								checkBoxLabel:ZaMsg.NAD_zimbraExternalPop3Enabled,  trueValue:"TRUE", falseValue:"FALSE"},		
							{ref:ZaAccount.A_zimbraFeatureConversationsEnabled, type:_SUPER_WIZ_CHECKBOX_, 
								resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_FeatureConversationsEnabled,
								checkBoxLabel:ZaMsg.NAD_FeatureConversationsEnabled, trueValue:"TRUE", falseValue:"FALSE"},
							{ref:ZaAccount.A_zimbraFeatureFiltersEnabled, type:_SUPER_WIZ_CHECKBOX_, 
								resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_FeatureFiltersEnabled,
								checkBoxLabel:ZaMsg.NAD_FeatureFiltersEnabled,trueValue:"TRUE", falseValue:"FALSE"},
							{ref:ZaAccount.A_zimbraFeatureOutOfOfficeReplyEnabled, type:_SUPER_WIZ_CHECKBOX_, 
								resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_zimbraFeatureOutOfOfficeReplyEnabled,
								checkBoxLabel:ZaMsg.NAD_zimbraFeatureOutOfOfficeReplyEnabled, 
								trueValue:"TRUE", falseValue:"FALSE"},
							{ref:ZaAccount.A_zimbraFeatureNewMailNotificationEnabled, 
								type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
								msgName:ZaMsg.NAD_zimbraFeatureNewMailNotificationEnabled,
								checkBoxLabel:ZaMsg.NAD_zimbraFeatureNewMailNotificationEnabled, 
								trueValue:"TRUE", falseValue:"FALSE"},
							{ref:ZaAccount.A_zimbraFeatureMailPollingIntervalPreferenceEnabled, 
								type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
								msgName:ZaMsg.NAD_zimbraFeatureMailPollingIntervalPreferenceEnabled,
								checkBoxLabel:ZaMsg.NAD_zimbraFeatureMailPollingIntervalPreferenceEnabled, 
								trueValue:"TRUE", falseValue:"FALSE"},
							{ref:ZaAccount.A_zimbraFeatureIdentitiesEnabled,
								type:_SUPER_WIZ_CHECKBOX_, 
								resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
								msgName:ZaMsg.NAD_FeatureIdentitiesEnabled,
								checkBoxLabel:ZaMsg.NAD_FeatureIdentitiesEnabled,  
								trueValue:"TRUE", falseValue:"FALSE"
							}
						]
					},
					{type:_ZAWIZ_TOP_GROUPER_, label:ZaMsg.NAD_zimbraCalendarFeature, id:"account_wiz_features_calendar",
					 	colSizes:["auto"],numCols:1,
					 	enableDisableChecks:[ZaAccountXFormView.isCalendarFeatureEnabled],
						enableDisableChangeEventSources:[ZaAccount.A_zimbraFeatureCalendarEnabled,ZaAccount.A_COSId],
						items:[		
							{ref:ZaAccount.A_zimbraFeatureGroupCalendarEnabled, type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_zimbraFeatureGroupCalendarEnabled,checkBoxLabel:ZaMsg.NAD_zimbraFeatureGroupCalendarEnabled, trueValue:"TRUE", falseValue:"FALSE"}		
						]
					},
					{type:_ZAWIZ_TOP_GROUPER_, label:ZaMsg.NAD_zimbraIMFeature, id:"account_wiz_features_im",
					 	colSizes:["auto"],numCols:1,
						visibilityChecks:[ZaAccountXFormView.isIMFeatureEnabled],
						visibilityChangeEventSources:[ZaAccount.A_zimbraFeatureIMEnabled,ZaAccount.A_COSId],
						items:[			
							{ref:ZaAccount.A_zimbraFeatureInstantNotify, type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_zimbraFeatureInstantNotify,checkBoxLabel:ZaMsg.NAD_zimbraFeatureInstantNotify, trueValue:"TRUE", falseValue:"FALSE"}											
						]
					},
					{type:_ZAWIZ_TOP_GROUPER_, label:ZaMsg.NAD_zimbraSearchFeature, id:"account_wiz_features_search",
					 colSizes:["auto"],numCols:1,
						items:[						
							{ref:ZaAccount.A_zimbraFeatureAdvancedSearchEnabled, type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_FeatureAdvancedSearchEnabled,checkBoxLabel:ZaMsg.NAD_FeatureAdvancedSearchEnabled, trueValue:"TRUE", falseValue:"FALSE"},
							{ref:ZaAccount.A_zimbraFeatureSavedSearchesEnabled, type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_FeatureSavedSearchesEnabled,checkBoxLabel:ZaMsg.NAD_FeatureSavedSearchesEnabled,  trueValue:"TRUE", falseValue:"FALSE"},
							{ref:ZaAccount.A_zimbraFeatureInitialSearchPreferenceEnabled, type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_FeatureInitialSearchPreferenceEnabled,checkBoxLabel:ZaMsg.NAD_FeatureInitialSearchPreferenceEnabled, trueValue:"TRUE", falseValue:"FALSE"}
						]
					}
				]
				});
	}	
	if(ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.ACCOUNTS_PREFS_TAB] || ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.CARTE_BLANCHE_UI]) {
		var prefItems = [
				{type:_GROUP_, cssClass:"ZaHeader2", colSpan: "*", id:"account_form_prefs_general_header",
							items: [
								{type:_OUTPUT_,value:ZaMsg.NAD_GeneralOptions}
							],
							cssStyle:"padding-top:5px; padding-bottom:5px"
						},
						{type:_ZA_PLAIN_GROUPER_, id:"account_prefs_general",colSizes:["auto"],numCols:1,
							items :[
								{ref:ZaAccount.A_zimbraPrefImapSearchFoldersEnabled, type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_zimbraPrefImapSearchFoldersEnabled,checkBoxLabel:ZaMsg.NAD_zimbraPrefImapSearchFoldersEnabled,  trueValue:"TRUE", falseValue:"FALSE"},
								{ref:ZaAccount.A_zimbraPrefShowSearchString, type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_zimbraPrefShowSearchString,checkBoxLabel:ZaMsg.NAD_zimbraPrefShowSearchString,trueValue:"TRUE", falseValue:"FALSE"},
								{ref:ZaAccount.A_zimbraPrefUseKeyboardShortcuts, type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS,checkBoxLabel:ZaMsg.NAD_prefKeyboardShort, trueValue:"TRUE", falseValue:"FALSE"},
								{ref:ZaAccount.A_zimbraPrefMailInitialSearch, type:_SUPERWIZ_TEXTFIELD_, 
									msgName:ZaMsg.NAD_zimbraPrefMailInitialSearch,
									txtBoxLabel:ZaMsg.NAD_zimbraPrefMailInitialSearch, 
									labelLocation:_LEFT_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS
								},
								{ref:ZaAccount.A_zimbraPrefWarnOnExit, type:_SUPER_WIZ_CHECKBOX_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS,checkBoxLabel:ZaMsg.NAD_zimbraPrefWarnOnExit,
									trueValue:"TRUE", falseValue:"FALSE"},
								{ref:ZaAccount.A_zimbraPrefShowSelectionCheckbox, type:_SUPER_WIZ_CHECKBOX_, 
									labelWrap: true,
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS,checkBoxLabel:ZaMsg.NAD_zimbraPrefShowSelectionCheckbox,
									trueValue:"TRUE", falseValue:"FALSE"},
								{ref:ZaAccount.A_zimbraJunkMessagesIndexingEnabled, type:_SUPER_WIZ_CHECKBOX_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS,checkBoxLabel:ZaMsg.NAD_zimbraJunkMessagesIndexingEnabled,
									trueValue:"TRUE", falseValue:"FALSE"}	,
                                {ref:ZaAccount.A_zimbraPrefLocale, type:_SUPERWIZ_SELECT1_, msgName:ZaMsg.NAD_zimbraPrefMailLocale,
                                    choices: ZaSettings.getLocaleChoices(),
                                    label:ZaMsg.NAD_zimbraPrefLocale, labelLocation:_LEFT_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS}

                            ]
						},	
						{type:_GROUP_, cssClass:"ZaHeader2", colSpan: "*", id:"account_form_prefs_mail_header",
							items: [
								{type:_OUTPUT_,value:ZaMsg.NAD_MailOptions}
							],
							cssStyle:"padding-top:5px; padding-bottom:5px"
						},
						{type:_ZA_PLAIN_GROUPER_, id:"account_prefs_mail_general",colSizes:["200px","400px"],numCols:2,

							items :[
								{ref:ZaAccount.A_zimbraPrefMessageViewHtmlPreferred, 
									type:_SUPER_WIZ_CHECKBOX_, colSpan:2,
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									msgName:ZaMsg.NAD_zimbraPrefMessageViewHtmlPreferred,
									checkBoxLabel:ZaMsg.NAD_zimbraPrefMessageViewHtmlPreferred, 
									trueValue:"TRUE", falseValue:"FALSE"},
								{ref:ZaAccount.A_zimbraPrefDisplayExternalImages, 
									type:_SUPER_WIZ_CHECKBOX_, colSpan:2,
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									msgName:ZaMsg.NAD_zimbraPrefDisplayExternalImages,
									checkBoxLabel:ZaMsg.NAD_zimbraPrefDisplayExternalImages, 
									trueValue:"TRUE", falseValue:"FALSE"},
								{ref:ZaAccount.A_zimbraPrefGroupMailBy, type:_SUPERWIZ_SELECT1_,
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_zimbraPrefGroupMailBy,
									label:ZaMsg.NAD_zimbraPrefGroupMailBy, labelLocation:_LEFT_
								},
								{ref:ZaAccount.A_zimbraPrefMailItemsPerPage, type:_SUPERWIZ_SELECT1_,
									msgName:ZaMsg.NAD_zimbraPrefMailItemsPerPage,label:ZaMsg.NAD_zimbraPrefMailItemsPerPage,
									labelLocation:_LEFT_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, valueLabel:null
								},
								{ref:ZaAccount.A_zimbraPrefMailDefaultCharset, type:_SUPERWIZ_SELECT1_, msgName:ZaMsg.NAD_zimbraPrefMailDefaultCharset,
									label:ZaMsg.NAD_zimbraPrefMailDefaultCharset, labelLocation:_LEFT_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS}
							]
						},
						{type:_ZAWIZ_TOP_GROUPER_, id:"account_prefs_mail_receiving",
							label:ZaMsg.NAD_MailOptionsReceiving,
							items :[
								{ref:ZaAccount.A_zimbraPrefMailPollingInterval, type:_SUPER_LIFETIME_, 
									colSizes:["200px","130px","120px","150px"],
									msgName:ZaMsg.NAD_zimbraPrefMailPollingInterval,
									txtBoxLabel:ZaMsg.NAD_zimbraPrefMailPollingInterval+":", 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS,colSpan:2,
									nowrap:false,labelWrap:true									
								},							
								{ref:ZaAccount.A_zimbraMailMinPollingInterval, 
									type:_SUPER_LIFETIME_, colSizes:["200px","130px","120px","150px"],
									msgName:ZaMsg.NAD_zimbraMailMinPollingInterval,
									txtBoxLabel:ZaMsg.NAD_zimbraMailMinPollingInterval+":", 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS,
									colSpan:2,nowrap:false,labelWrap:true	
								},
								{ref:ZaAccount.A_zimbraPrefNewMailNotificationEnabled, 
									type:_ZA_CHECKBOX_, 
									msgName:ZaMsg.NAD_zimbraPrefNewMailNotificationEnabled,
									label:ZaMsg.NAD_zimbraPrefNewMailNotificationEnabled,
									trueValue:"TRUE", falseValue:"FALSE"
								},
								{ref:ZaAccount.A_zimbraPrefNewMailNotificationAddress, type:_TEXTFIELD_, 
									msgName:ZaMsg.NAD_zimbraPrefNewMailNotificationAddress,
									label:ZaMsg.NAD_zimbraPrefNewMailNotificationAddress, 
									labelLocation:_LEFT_,
									enableDisableChecks:[ZaAccountXFormView.isMailNotificationAddressEnabled],
									enableDisableChangeEventSources:[ZaAccount.A_zimbraPrefNewMailNotificationEnabled]
								},
								{ref:ZaAccount.A_zimbraPrefOutOfOfficeReplyEnabled, 
									type:_ZA_CHECKBOX_, msgName:ZaMsg.NAD_zimbraPrefOutOfOfficeReplyEnabled,label:ZaMsg.NAD_zimbraPrefOutOfOfficeReplyEnabled, trueValue:"TRUE", falseValue:"FALSE"},
								{ref:ZaAccount.A_zimbraPrefOutOfOfficeCacheDuration, 
									type:_SUPER_LIFETIME_, colSizes:["200px","130px","120px","150px"],
									msgName:ZaMsg.NAD_zimbraPrefOutOfOfficeCacheDuration,
									txtBoxLabel:ZaMsg.NAD_zimbraPrefOutOfOfficeCacheDuration+":", 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS,
									colSpan:2,nowrap:false,labelWrap:true	
								},
								{ref:ZaAccount.A_zimbraPrefOutOfOfficeReply, type:_TEXTAREA_, 
									msgName:ZaMsg.NAD_zimbraPrefOutOfOfficeReply,
									label:ZaMsg.NAD_zimbraPrefOutOfOfficeReply, 
									labelLocation:_LEFT_, labelCssStyle:"vertical-align:top", width:"30em",
									enableDisableChecks:[ZaAccountXFormView.isOutOfOfficeReplyEnabled],
									enableDisableChangeEvantSources:[ZaAccount.A_zimbraPrefOutOfOfficeReplyEnabled]
								}
							]
						},						
						{type:_ZAWIZ_TOP_GROUPER_, id:"account_prefs_mail_sending",borderCssClass:"LowPadedTopGrouperBorder",
							label:ZaMsg.NAD_MailOptionsSending,
							items :[
								{ref:ZaAccount.A_prefSaveToSent,  
									colSpan:2,								
									type:_SUPER_WIZ_CHECKBOX_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									msgName:ZaMsg.NAD_prefSaveToSent,
									checkBoxLabel:ZaMsg.NAD_prefSaveToSent,
									trueValue:"TRUE", falseValue:"FALSE"},
									
								{ref:ZaAccount.A_zimbraAllowAnyFromAddress,  
									colSpan:2,								
									type:_SUPER_WIZ_CHECKBOX_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									msgName:ZaMsg.NAD_zimbraAllowAnyFromAddress,
									checkBoxLabel:ZaMsg.NAD_zimbraAllowAnyFromAddress,
									trueValue:"TRUE", falseValue:"FALSE"},
								{ref:ZaAccount.A_zimbraAllowFromAddress,
									type:_REPEAT_,
									label:ZaMsg.NAD_zimbraAllowFromAddress,
									labelLocation:_LEFT_, 
									addButtonLabel:ZaMsg.NAD_AddAddress, 
									align:_LEFT_,
									repeatInstance:emptyAlias, 
									showAddButton:true, 
									showRemoveButton:true, 
									showAddOnNextRow:true, 
									removeButtonLabel:ZaMsg.NAD_RemoveAddress,								
									items: [
										{ref:".", type:_TEXTFIELD_, label:null, width:"200px"}
									],
									nowrap:false,labelWrap:true,
									visibilityChecks:[ZaAccountXFormView.isSendingFromAnyAddressDisAllowed],
									visibilityChangeEventSources:[ZaAccount.A_zimbraAllowAnyFromAddress, ZaAccount.A_COSId]										
								}
							]
						},
						{type:_ZAWIZ_TOP_GROUPER_, id:"account_prefs_mail_composing",borderCssClass:"LowPadedTopGrouperBorder",
							label:ZaMsg.NAD_MailOptionsComposing,
							items :[																										
								{ref:ZaAccount.A_zimbraPrefComposeInNewWindow, 
									//colSpan:2,
									type:_SUPER_WIZ_CHECKBOX_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									msgName:ZaMsg.NAD_zimbraPrefComposeInNewWindow,
									checkBoxLabel:ZaMsg.NAD_zimbraPrefComposeInNewWindow,
									trueValue:"TRUE", falseValue:"FALSE"},
								{ref:ZaAccount.A_zimbraPrefComposeFormat, 
									type:_SUPERWIZ_SELECT1_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									msgName:ZaMsg.NAD_zimbraPrefComposeFormat,
									label:ZaMsg.NAD_zimbraPrefComposeFormat},
								{ref:ZaAccount.A_zimbraPrefHtmlEditorDefaultFontFamily, type:_SUPERWIZ_SELECT1_,
									msgName:ZaMsg.NAD_zimbraPrefHtmlEditorDefaultFontFamily,label:ZaMsg.NAD_zimbraPrefHtmlEditorDefaultFontFamily,
									labelLocation:_LEFT_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, valueLabel:null
								},
								{ref:ZaAccount.A_zimbraPrefHtmlEditorDefaultFontSize, type:_SUPERWIZ_SELECT1_,
									msgName:ZaMsg.NAD_zimbraPrefHtmlEditorDefaultFontSize, label:ZaMsg.NAD_zimbraPrefHtmlEditorDefaultFontSize,
									labelLocation:_LEFT_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, valueLabel:null
								},
								{ref:ZaAccount.A_zimbraPrefHtmlEditorDefaultFontColor, type:_SUPERWIZ_DWT_COLORPICKER_,
									msgName:ZaMsg.NAD_zimbraPrefHtmlEditorDefaultFontColor, label:ZaMsg.NAD_zimbraPrefHtmlEditorDefaultFontColor,
									height: "25px", labelLocation:_LEFT_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS
								},
								{ref:ZaAccount.A_zimbraPrefForwardReplyInOriginalFormat, 
									//colSpan:2,								
									type:_SUPER_WIZ_CHECKBOX_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									msgName:ZaMsg.NAD_zimbraPrefForwardReplyInOriginalFormat,
									checkBoxLabel:ZaMsg.NAD_zimbraPrefForwardReplyInOriginalFormat, 
									trueValue:"TRUE", falseValue:"FALSE"},
								{ref:ZaAccount.A_prefMailSignatureEnabled, 
									type:_ZA_CHECKBOX_, msgName:ZaMsg.NAD_prefMailSignatureEnabled,
									label:ZaMsg.NAD_prefMailSignatureEnabled,  
									trueValue:"TRUE", falseValue:"FALSE"},
								{ref:ZaAccount.A_zimbraPrefMailSignatureStyle, 
									//colSpan:2,								
									type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									msgName:ZaMsg.NAD_zimbraPrefMailSignatureStyle,
									checkBoxLabel:ZaMsg.NAD_zimbraPrefMailSignatureStyle,
									trueValue:"internet", falseValue:"outlook"
								},
								{ref:ZaAccount.A_zimbraMailSignatureMaxLength, type:_SUPERWIZ_TEXTFIELD_, 
									txtBoxLabel:ZaMsg.NAD_zimbraMailSignatureMaxLength, msgName:ZaMsg.NAD_zimbraMailSignatureMaxLength,
									labelLocation:_LEFT_, 
									textFieldCssClass:"admin_xform_number_input", 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS
								},
								{ref:ZaAccount.A_prefMailSignature, type:_TEXTAREA_, msgName:ZaMsg.NAD_prefMailSignature,
									label:ZaMsg.NAD_prefMailSignature, labelLocation:_LEFT_, 
									labelCssStyle:"vertical-align:top", width:"30em",
									enableDisableChangeEventSources:[ZaAccount.A_prefMailSignatureEnabled],
									enableDisableChecks:[ZaAccountXFormView.isMailSignatureEnabled]									
								}
							]
						},
						{type:_GROUP_, cssClass:"ZaHeader2", colSpan: "*", id:"account_form_prefs_contacts_header",
							items: [
								{type:_OUTPUT_,value:ZaMsg.NAD_ContactsOptions}
							],
							cssStyle:"padding-top:5px; padding-bottom:5px"
						},				
						{type:_ZA_PLAIN_GROUPER_, id:"account_prefs_contacts_general",colSizes:["auto"],numCols:1,
							items :[
								{ref:ZaAccount.A_zimbraPrefAutoAddAddressEnabled, type:_SUPER_WIZ_CHECKBOX_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									msgName:ZaMsg.NAD_zimbraPrefAutoAddAddressEnabled,checkBoxLabel:ZaMsg.NAD_zimbraPrefAutoAddAddressEnabled, 
									trueValue:"TRUE", falseValue:"FALSE"
								},							
								{ref:ZaAccount.A_zimbraPrefGalAutoCompleteEnabled, type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_zimbraPrefGalAutoCompleteEnabled,checkBoxLabel:ZaMsg.NAD_zimbraPrefGalAutoCompleteEnabled, trueValue:"TRUE", falseValue:"FALSE"},	
								{ref:ZaAccount.A_zimbraPrefContactsPerPage, type:_SUPERWIZ_SELECT1_, msgName:ZaMsg.NAD_PrefContactsPerPage,label:ZaMsg.NAD_PrefContactsPerPage+":", labelLocation:_LEFT_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, valueLabel:null}		
							]
						},

						{type:_GROUP_, cssClass:"ZaHeader2", colSpan: "*", id:"account_form_prefs_calendar_header",
							items: [
								{type:_OUTPUT_,value:ZaMsg.NAD_CalendarOptions}
							],
							cssStyle:"padding-top:5px; padding-bottom:5px"
						},					
						{type:_ZA_PLAIN_GROUPER_, id:"account_prefs_calendar_general",colSizes:["auto"],numCols:1,
							items :[
								{ref:ZaAccount.A_zimbraPrefTimeZoneId, type:_SUPERWIZ_SELECT1_, msgName:ZaMsg.NAD_zimbraPrefTimeZoneId,label:ZaMsg.NAD_zimbraPrefTimeZoneId+":", labelLocation:_LEFT_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS},							
								{ref:ZaAccount.A_zimbraPrefCalendarApptReminderWarningTime, type:_SUPERWIZ_SELECT1_, msgName:ZaMsg.NAD_zimbraPrefCalendarApptReminderWarningTime,label:ZaMsg.NAD_zimbraPrefCalendarApptReminderWarningTime+":", labelLocation:_LEFT_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS},
								{ref:ZaAccount.A_zimbraPrefCalendarAlwaysShowMiniCal, type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_alwaysShowMiniCal,checkBoxLabel:ZaMsg.NAD_alwaysShowMiniCal, trueValue:"TRUE", falseValue:"FALSE"},
								{ref:ZaAccount.A_zimbraPrefCalendarUseQuickAdd, type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_useQuickAdd,checkBoxLabel:ZaMsg.NAD_useQuickAdd, trueValue:"TRUE", falseValue:"FALSE"},
								{ref:ZaAccount.A_zimbraPrefUseTimeZoneListInCalendar, type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_zimbraPrefUseTimeZoneListInCalendar,checkBoxLabel:ZaMsg.NAD_zimbraPrefUseTimeZoneListInCalendar,trueValue:"TRUE", falseValue:"FALSE"}
							]
						}							
					];
		cases.push({type:_CASE_, caseKey:ZaNewAccountXWizard.PREFS_STEP, tabGroupKey:ZaNewAccountXWizard.PREFS_STEP, 
					numCols:1, width:"100%", items :prefItems});
	}	

	if(ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.ACCOUNTS_SKIN_TAB] || ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.CARTE_BLANCHE_UI]) {
		cases.push({type:_CASE_, caseKey:ZaNewAccountXWizard.SKINS_STEP, tabGroupKey:ZaNewAccountXWizard.SKINS_STEP, id:"account_form_themes_step", numCols:1, width:"100%",  
						items: [	
							{type:_GROUP_, 
								items:[
								{ref:ZaAccount.A_zimbraPrefSkin, type:_SUPERWIZ_SELECT1_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									msgName:ZaMsg.NAD_zimbraPrefSkin,label:ZaMsg.NAD_zimbraPrefSkin, labelLocation:_LEFT_, 
									choices:ZaApp.getInstance().getInstalledSkins(),
									visibilityChecks:[ZaAccountXFormView.gotSkins]}
								] 
							},
							{type:_SPACER_},
							{type:_SUPER_ZIMLETWIZ_SELECT_CHECK_,
								selectRef:ZaAccount.A_zimbraAvailableSkin, 
								ref:ZaAccount.A_zimbraAvailableSkin, 
								choices:ZaNewAccountXWizard.themeChoices,
								visibilityChecks:[Case_XFormItem.prototype.isCurrentTab],
								visibilityChangeEventSources:[ZaModel.currentStep],
								caseKey:ZaNewAccountXWizard.SKINS_STEP, caseVarRef:ZaModel.currentStep,
								limitLabel:ZaMsg.NAD_LimitThemesTo
							}
						]
		});			
	}
	
	if(ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.ACCOUNTS_ZIMLET_TAB] || ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.CARTE_BLANCHE_UI])  {
		cases.push({type:_CASE_, caseKey:ZaNewAccountXWizard.ZIMLETS_STEP, tabGroupKey:ZaNewAccountXWizard.ZIMLETS_STEP, id:"account_form_zimlets_step", numCols:1, width:"100%", 
						items: [	
							{type:_ZAWIZGROUP_, numCols:1,colSizes:["auto"], 
								items: [
									{type:_SUPER_ZIMLETWIZ_SELECT_CHECK_,
										selectRef:ZaAccount.A_zimbraZimletAvailableZimlets, 
										ref:ZaAccount.A_zimbraZimletAvailableZimlets, 
										choices:ZaNewAccountXWizard.zimletChoices,
										limitLabel:ZaMsg.NAD_LimitZimletsTo
									}
								]
							}							
						]
		});			
	}
		
	if(ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.ACCOUNTS_ADVANCED_TAB] || ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.CARTE_BLANCHE_UI]) {
		cases.push({type:_CASE_, caseKey:ZaNewAccountXWizard.ADVANCED_STEP, tabGroupKey:ZaNewAccountXWizard.ADVANCED_STEP, id:"account_form_advanced_step", numCols:1, width:"100%", 
						items: [
						{type:_ZAWIZ_TOP_GROUPER_, id:"account_attachment_settings",colSizes:["auto"],numCols:1,
							label:ZaMsg.NAD_AttachmentsGrouper,						
							items :[
								{ref:ZaAccount.A_zimbraAttachmentsBlocked, type:_SUPER_WIZ_CHECKBOX_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									msgName:ZaMsg.NAD_RemoveAllAttachments,
									checkBoxLabel:ZaMsg.NAD_RemoveAllAttachments, 
									trueValue:"TRUE", falseValue:"FALSE"
								}
							]
						},
						{type:_ZAWIZ_TOP_GROUPER_, id:"account_quota_settings",colSizes:["250px","200px","150px"],numCols:3,
							label:ZaMsg.NAD_QuotaGrouper,						
							items: [
								{ref:ZaAccount.A_zimbraMailQuota, type:_SUPERWIZ_TEXTFIELD_, 
									txtBoxLabel:ZaMsg.NAD_MailQuota+":", msgName:ZaMsg.NAD_MailQuota,labelLocation:_LEFT_, 
									textFieldCssClass:"admin_xform_number_input", 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS
								},
								{ref:ZaAccount.A_zimbraContactMaxNumEntries, type:_SUPERWIZ_TEXTFIELD_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_ContactMaxNumEntries,txtBoxLabel:ZaMsg.NAD_ContactMaxNumEntries+":", labelLocation:_LEFT_, textFieldCssClass:"admin_xform_number_input"},
								{ref:ZaAccount.A_zimbraQuotaWarnPercent, type:_SUPERWIZ_TEXTFIELD_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									txtBoxLabel:ZaMsg.NAD_QuotaWarnPercent, msgName:ZaMsg.NAD_QuotaWarnPercent,labelLocation:_LEFT_, 
									textFieldCssClass:"admin_xform_number_input", 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS
								},
								{ref:ZaAccount.A_zimbraQuotaWarnInterval, type:_SUPERWIZ_LIFETIME_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									textFieldCssClass:"admin_xform_number_input", 
									txtBoxLabel:ZaMsg.NAD_QuotaWarnInterval, msgName:ZaMsg.NAD_QuotaWarnInterval,labelLocation:_LEFT_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS
								},
								{ref:ZaAccount.A_zimbraQuotaWarnMessage, type:_SUPERWIZ_TEXTAREA_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									txtBoxLabel:ZaMsg.NAD_QuotaWarnMessage, msgName:ZaMsg.NAD_QuotaWarnMessage,
									//labelCssStyle:"vertical-align:top", //textAreaWidth:"30em",
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS
								}
							]
						},
						{type:_ZAWIZ_TOP_GROUPER_,id:"account_password_settings",colSizes:["auto"],numCols:1,
							label:ZaMsg.NAD_PasswordGrouper,				
							items: [
								{ref:ZaAccount.A_zimbraPasswordLocked, type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_PwdLocked,checkBoxLabel:ZaMsg.NAD_PwdLocked, 
								 trueValue:"TRUE", falseValue:"FALSE"},								
								{ref:ZaAccount.A_zimbraMinPwdLength, 
									type:_SUPERWIZ_TEXTFIELD_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									msgName:ZaMsg.NAD_passMinLength,
									txtBoxLabel:ZaMsg.NAD_passMinLength+":", 
									labelLocation:_LEFT_, 
									textFieldCssClass:"admin_xform_number_input"
								},
								{ref:ZaAccount.A_zimbraMaxPwdLength, type:_SUPERWIZ_TEXTFIELD_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_passMaxLength,
									txtBoxLabel:ZaMsg.NAD_passMaxLength+":", labelLocation:_LEFT_, 
									textFieldCssClass:"admin_xform_number_input"},
								{ref:ZaAccount.A_zimbraPasswordMinUpperCaseChars, 
									type:_SUPERWIZ_TEXTFIELD_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									msgName:ZaMsg.NAD_zimbraPasswordMinUpperCaseChars,
									txtBoxLabel:ZaMsg.NAD_zimbraPasswordMinUpperCaseChars+":", labelLocation:_LEFT_, 
									textFieldCssClass:"admin_xform_number_input"
								},
								{ref:ZaAccount.A_zimbraPasswordMinLowerCaseChars,
									type:_SUPERWIZ_TEXTFIELD_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									msgName:ZaMsg.NAD_zimbraPasswordMinLowerCaseChars,
									txtBoxLabel:ZaMsg.NAD_zimbraPasswordMinLowerCaseChars+":", labelLocation:_LEFT_, 
									textFieldCssClass:"admin_xform_number_input"
								},
								{ref:ZaAccount.A_zimbraPasswordMinPunctuationChars,  
									type:_SUPERWIZ_TEXTFIELD_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									msgName:ZaMsg.NAD_zimbraPasswordMinPunctuationChars,
									txtBoxLabel:ZaMsg.NAD_zimbraPasswordMinPunctuationChars+":", labelLocation:_LEFT_, 
									textFieldCssClass:"admin_xform_number_input"
								},
								{ref:ZaAccount.A_zimbraPasswordMinNumericChars, 
									type:_SUPERWIZ_TEXTFIELD_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									msgName:ZaMsg.NAD_zimbraPasswordMinNumericChars,
									txtBoxLabel:ZaMsg.NAD_zimbraPasswordMinNumericChars+":", labelLocation:_LEFT_, 
									textFieldCssClass:"admin_xform_number_input"
								},
																
								{ref:ZaAccount.A_zimbraMinPwdAge, type:_SUPERWIZ_TEXTFIELD_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_passMinAge,txtBoxLabel:ZaMsg.NAD_passMinAge+":", labelLocation:_LEFT_, textFieldCssClass:"admin_xform_number_input"},
								{ref:ZaAccount.A_zimbraMaxPwdAge, type:_SUPERWIZ_TEXTFIELD_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_passMaxAge,txtBoxLabel:ZaMsg.NAD_passMaxAge+":", labelLocation:_LEFT_, textFieldCssClass:"admin_xform_number_input"},
								{ref:ZaAccount.A_zimbraEnforcePwdHistory, type:_SUPERWIZ_TEXTFIELD_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_passEnforceHistory,txtBoxLabel:ZaMsg.NAD_passEnforceHistory+":", labelLocation:_LEFT_, textFieldCssClass:"admin_xform_number_input"}
							]
						},
						{type:_ZAWIZ_TOP_GROUPER_, id:"password_lockout_settings",colSizes:["250px","200px","150px"],numCols:3,
							label:ZaMsg.NAD_FailedLoginGrouper,							
							items :[

								{ref:ZaAccount.A_zimbraPasswordLockoutEnabled, type:_SUPER_WIZ_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									msgName:ZaMsg.NAD_zimbraPasswordLockoutEnabled,checkBoxLabel:ZaMsg.NAD_zimbraPasswordLockoutEnabled, 
									labelCssStyle:"width:250px;", trueValue:"TRUE", falseValue:"FALSE"
								},
								{ref:ZaAccount.A_zimbraPasswordLockoutMaxFailures, type:_SUPERWIZ_TEXTFIELD_, 
									enableDisableChecks: [ZaAccountXFormView.isPasswordLockoutEnabled],
								 	enableDisableChangeEventSources:[ZaAccount.A_zimbraPasswordLockoutEnabled,ZaAccount.A_COSId],
									txtBoxLabel:ZaMsg.NAD_zimbraPasswordLockoutMaxFailures+":",
									toolTipContent:ZaMsg.NAD_zimbraPasswordLockoutMaxFailuresSub,
									msgName:ZaMsg.NAD_zimbraPasswordLockoutMaxFailures,
									labelLocation:_LEFT_, 
									textFieldCssClass:"admin_xform_number_input", 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS,
									labelCssStyle:"width:250px;"
								},
								{ref:ZaAccount.A_zimbraPasswordLockoutDuration, type:_SUPERWIZ_LIFETIME_, 
									enableDisableChecks: [ZaAccountXFormView.isPasswordLockoutEnabled],
								 	enableDisableChangeEventSources:[ZaAccount.A_zimbraPasswordLockoutEnabled,ZaAccount.A_COSId],
									txtBoxLabel:ZaMsg.NAD_zimbraPasswordLockoutDuration+":",
									toolTipContent:ZaMsg.NAD_zimbraPasswordLockoutDurationSub,
									msgName:ZaMsg.NAD_zimbraPasswordLockoutDuration,
									textFieldCssClass:"admin_xform_number_input", 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS
								},
								{ref:ZaAccount.A_zimbraPasswordLockoutFailureLifetime, type:_SUPERWIZ_LIFETIME_, 
									enableDisableChecks: [ZaAccountXFormView.isPasswordLockoutEnabled],
								 	enableDisableChangeEventSources:[ZaAccount.A_zimbraPasswordLockoutEnabled,ZaAccount.A_COSId],								
									txtBoxLabel:ZaMsg.NAD_zimbraPasswordLockoutFailureLifetime+":",
									toolTipContent:ZaMsg.NAD_zimbraPasswordLockoutFailureLifetimeSub,
									msgName:ZaMsg.NAD_zimbraPasswordLockoutFailureLifetime,
									textFieldCssClass:"admin_xform_number_input", 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS,
									labelCssStyle:"white-space:normal;",
									nowrap:false,labelWrap:true
								}								
							]
						},
						{type:_ZAWIZ_TOP_GROUPER_, colSizes:["auto"],numCols:1,
							label:ZaMsg.NAD_TimeoutGrouper,	id:"timeout_settings",
							items: [
								{ref:ZaAccount.A_zimbraAdminAuthTokenLifetime,
									type:_SUPERWIZ_LIFETIME_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									msgName:ZaMsg.NAD_AdminAuthTokenLifetime,
									txtBoxLabel:ZaMsg.NAD_AdminAuthTokenLifetime+":",
									enableDisableChecks:[ZaAccountXFormView.isAdminAccount],
									enableDisableChangeEventSources:[ZaAccount.A_isAdminAccount]
								},							
								{ref:ZaAccount.A_zimbraAuthTokenLifetime,
									type:_SUPERWIZ_LIFETIME_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									msgName:ZaMsg.NAD_AuthTokenLifetime,
									txtBoxLabel:ZaMsg.NAD_AuthTokenLifetime+":"},								
								{ref:ZaAccount.A_zimbraMailIdleSessionTimeout, 
									type:_SUPERWIZ_LIFETIME_, resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									msgName:ZaMsg.NAD_MailIdleSessionTimeout,
									txtBoxLabel:ZaMsg.NAD_MailIdleSessionTimeout+":"},																
								{ref:ZaAccount.A_zimbraMailMessageLifetime, type:_SUPERWIZ_LIFETIME2_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									msgName:ZaMsg.NAD_MailMessageLifetime,
									txtBoxLabel:ZaMsg.NAD_MailMessageLifetime+":"},
								{ref:ZaAccount.A_zimbraMailTrashLifetime, type:_SUPERWIZ_LIFETIME1_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, msgName:ZaMsg.NAD_MailTrashLifetime,
									txtBoxLabel:ZaMsg.NAD_MailTrashLifetime+":"},
								{ref:ZaAccount.A_zimbraMailSpamLifetime, type:_SUPERWIZ_LIFETIME1_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToCOS, 
									msgName:ZaMsg.NAD_MailSpamLifetime,
									txtBoxLabel:ZaMsg.NAD_MailSpamLifetime}
							]
						}					
			
					]
					});									
	}
	xFormObject.items = [
			{type:_OUTPUT_, colSpan:2, align:_CENTER_, valign:_TOP_, ref:ZaModel.currentStep, choices:this.stepChoices, valueChangeEventSources:[ZaModel.currentStep]},
			{type:_SEPARATOR_, align:_CENTER_, valign:_TOP_},
			{type:_SPACER_,  align:_CENTER_, valign:_TOP_},
			{type:_SWITCH_, width:650, align:_LEFT_, valign:_TOP_, items:cases}
		];
};
ZaXDialog.XFormModifiers["ZaNewAccountXWizard"].push(ZaNewAccountXWizard.myXFormModifier);
