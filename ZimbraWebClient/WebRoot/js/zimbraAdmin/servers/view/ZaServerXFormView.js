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
* @class ZaServerXFormView creates an view of one Server object
* @contructor
* @param parent {DwtComposite}
* @param app {@link ZaApp}
* @author Greg Solovyev
**/
ZaServerXFormView = function(parent) {
	ZaTabView.call(this, parent, "ZaServerXFormView");	
	this.TAB_INDEX = 0;
	this.initForm(ZaServer.myXModel,this.getMyXForm());
	this._localXForm.setController(ZaApp.getInstance());
}

ZaServerXFormView.prototype = new ZaTabView();
ZaServerXFormView.prototype.constructor = ZaServerXFormView;
ZaTabView.XFormModifiers["ZaServerXFormView"] = new Array();
ZaServerXFormView.indexVolChoices = new XFormChoices([], XFormChoices.OBJECT_LIST, ZaServer.A_VolumeId, ZaServer.A_VolumeName);
ZaServerXFormView.messageVolChoices = new XFormChoices([], XFormChoices.OBJECT_LIST,ZaServer.A_VolumeId, ZaServer.A_VolumeName);
ZaServerXFormView.onFormFieldChanged = 
function (value, event, form) {
	DBG.println (AjxDebug.DBG1, "On Form Field Changed ...");
	
	form.parent.setDirty(true);
	this.setInstanceValue(value);
	return value;
}

ZaServerXFormView.onReverseLookupTargetFieldChanged = 
function (value, event, form) {
	DBG.println (AjxDebug.DBG1, "On Form Field Changed ...");
	
	form.parent.setDirty(true);
	this.setInstanceValue(value);
	if(value=="TRUE") {
		this.setInstanceValue("TRUE","/attrs/"+ZaServer.A_ImapCleartextLoginEnabled);
		this.setInstanceValue("TRUE","/attrs/"+ZaServer.A_Pop3CleartextLoginEnabled);
	}
	return value;
}


ZaServerXFormView.prototype.setObject = 
function (entry) {
    ZaItem.normalizeMultiValueAttr (entry, ZaServer.A_description) ;

    this.entry = entry;
	this._containedObject = {attrs:{}};
	this._containedObject[ZaServer.A_showVolumes] = entry[ZaServer.A_showVolumes];
    
    this._containedObject[ZaServer.A_ServiceHostname] = entry[ZaServer.A_ServiceHostname];
	this._containedObject.name = entry.name;
	this._containedObject.type = entry.type ;

	if(entry.rights)
		this._containedObject.rights = entry.rights;
	
	if(entry.setAttrs)
		this._containedObject.setAttrs = entry.setAttrs;
	
	if(entry.getAttrs)
		this._containedObject.getAttrs = entry.getAttrs;
		
	if(entry._defaultValues)
		this._containedObject._defaultValues = entry._defaultValues;
		
	if(entry.id) this._containedObject.id = entry.id;

	this._containedObject[ZaServer.A_Volumes] = [];
	if(entry.attrs) {
		for(var a in entry.attrs) {
			this._containedObject.attrs[a] = entry.attrs[a];
		}
	}

	if(entry[ZaServer.A_Volumes]) {
		for(var a in entry[ZaServer.A_Volumes]) {
			this._containedObject[ZaServer.A_Volumes][a] = {};
			if(entry[ZaServer.A_Volumes][a]) {
				for(var v in entry[ZaServer.A_Volumes][a]) {
					this._containedObject[ZaServer.A_Volumes][a][v] = entry[ZaServer.A_Volumes][a][v];
				}
			}
		}		
	}
	if(!entry[ZaModel.currentTab])
		this._containedObject[ZaModel.currentTab] = "1";
	else
		this._containedObject[ZaModel.currentTab] = entry[ZaModel.currentTab];

	if(entry[ZaServer.A_showVolumes] && this._containedObject[ZaServer.A_Volumes])	{
		this._containedObject[ZaServer.A_Volumes].sort(ZaServer.compareVolumesByName);		
		this._containedObject[ZaServer.A_Volumes]._version=entry[ZaServer.A_Volumes]._version ? entry[ZaServer.A_Volumes]._version : 1;
		var cnt = this._containedObject[ZaServer.A_Volumes].length;
		var indexArr = [];
		var msgArr = [];
		for(var i=0;i<cnt;i++) {
			if(this._containedObject[ZaServer.A_Volumes][i][ZaServer.A_VolumeType]==ZaServer.INDEX) {
				indexArr.push(this._containedObject[ZaServer.A_Volumes][i]);
			} else if(this._containedObject[ZaServer.A_Volumes][i][ZaServer.A_VolumeType] == ZaServer.MSG) {
				msgArr.push(this._containedObject[ZaServer.A_Volumes][i])
			}
		}
	}
	ZaServerXFormView.indexVolChoices.setChoices(indexArr);
	ZaServerXFormView.indexVolChoices.dirtyChoices();	
	
	ZaServerXFormView.messageVolChoices.setChoices(msgArr);
	ZaServerXFormView.messageVolChoices.dirtyChoices();	
	
	for(var key in ZaServer.currentkeys) {
		if(entry[ZaServer.currentkeys[key]]) {
			this._containedObject[ZaServer.currentkeys[key]] = entry[ZaServer.currentkeys[key]];
		}
	}
	this._containedObject.newVolID=-1;			
	this._localXForm.setInstance(this._containedObject);	
	this.updateTab();
}


ZaServerXFormView.getTLSEnabled = function () {
	var value = this.getModel().getInstanceValue(this.getInstance(),ZaServer.A_zimbraMtaAuthEnabled);
	return value == 'TRUE';
}

ZaServerXFormView.getIMAPEnabled = function () {
	var value = this.getModel().getInstanceValue(this.getInstance(),ZaServer.A_ImapServerEnabled);
	return value == 'TRUE';
}

ZaServerXFormView.getIMAPSSLEnabled = function () {
	var value = this.getModel().getInstanceValue(this.getInstance(),ZaServer.A_ImapSSLServerEnabled);	
	return (value == 'TRUE' && ZaServerXFormView.getIMAPEnabled.call(this));
}

ZaServerXFormView.getPOP3Enabled = function () {
	var value = this.getModel().getInstanceValue(this.getInstance(),ZaServer.A_Pop3ServerEnabled);
	return value == 'TRUE';
}

ZaServerXFormView.getPOP3SSLEnabled = function () {
	var value = this.getModel().getInstanceValue(this.getInstance(),ZaServer.A_Pop3SSLServerEnabled);
	return (value == 'TRUE' && ZaServerXFormView.getPOP3Enabled.call(this));
}

ZaServerXFormView.getMailboxEnabled = function () {
	var value = this.getModel().getInstanceValue(this.getInstance(),ZaServer.A_showVolumes);
	return value;
}

ZaServerXFormView.getMailProxyInstalled = function () {
	return this.getModel().getInstanceValue(this.getInstance(),ZaServer.A_zimbraMailProxyServiceInstalled);
}

ZaServerXFormView.getMailProxyEnabled = function () {
	return this.getModel().getInstanceValue(this.getInstance(),ZaServer.A_zimbraMailProxyServiceEnabled) && ZaServerXFormView.getMailProxyInstalled.call(this);	
}

ZaServerXFormView.getIMAPSSLProxyEnabled = function () {
	return (ZaServerXFormView.getMailProxyEnabled.call(this) && ZaServerXFormView.getIMAPSSLEnabled.call(this));
}

ZaServerXFormView.getPOP3ProxyEnabled = function () {
	return (ZaServerXFormView.getPOP3Enabled.call(this) && ZaServerXFormView.getMailProxyEnabled.call(this));
}

ZaServerXFormView.getPOP3SSLProxyEnabled = function () {
	return (ZaServerXFormView.getMailProxyEnabled.call(this) && ZaServerXFormView.getPOP3SSLEnabled.call(this));
}

ZaServerXFormView.getIsReverseProxyLookupTarget = function () {
	return (this.getModel().getInstanceValue(this.getInstance(),ZaServer.A_zimbraReverseProxyLookupTarget) == "TRUE");
}

ZaServerXFormView.volumeSelectionListener = 
function (ev) {
	//var instance = this.getInstance();

	var arr = this.widget.getSelection();	
	if(arr && arr.length) {
		arr.sort(ZaServer.compareVolumesByName);
		this.getModel().setInstanceValue(this.getInstance(), ZaServer.A2_volume_selection_cache, arr);
		//instance.volume_selection_cache = arr;
	} else {
		this.getModel().setInstanceValue(this.getInstance(), ZaServer.A2_volume_selection_cache, null);
		//instance.volume_selection_cache = null;
	}	

	if (ev.detail == DwtListView.ITEM_DBL_CLICKED) {
		ZaServerXFormView.editButtonListener.call(this);
	}	
}

ZaServerXFormView.isEditVolumeEnabled = function () {
	return (!AjxUtil.isEmpty(this.getInstanceValue(ZaServer.A2_volume_selection_cache)) && this.getInstanceValue(ZaServer.A2_volume_selection_cache).length==1);
}

ZaServerXFormView.isDeleteVolumeEnabled = function () {
	if(!AjxUtil.isEmpty(this.getInstanceValue(ZaServer.A2_volume_selection_cache))) {
		var arr = this.getInstanceValue(ZaServer.A2_volume_selection_cache);
		for(var i = 0; i < arr.length;i++) {
			for(a in ZaServer.currentkeys) {
				if(arr[i][ZaServer.A_VolumeId]==this.getInstanceValue(ZaServer.currentkeys[a]))
					return false;			
			}
		}
		return true;
	} else 
		return false;
}

ZaServerXFormView.updateVolume = function () {
	if(this.parent.editVolumeDlg) {
		this.parent.editVolumeDlg.popdown();
		var obj = this.parent.editVolumeDlg.getObject();
		var instance = this.getInstance();
		var volumes = [];
		var cnt = instance[ZaServer.A_Volumes].length;
		for (var i=0; i< cnt; i++) {
			volumes[i] = instance[ZaServer.A_Volumes][i];
		}
		var dirty = false;
		
		if(volumes[obj._index]) {
			if(volumes[obj._index][ZaServer.A_VolumeName] != obj[ZaServer.A_VolumeName]) {
				volumes[obj._index][ZaServer.A_VolumeName] = obj[ZaServer.A_VolumeName];
				dirty=true;
			}
			if(volumes[obj._index][ZaServer.A_VolumeRootPath] != obj[ZaServer.A_VolumeRootPath]) {
				volumes[obj._index][ZaServer.A_VolumeRootPath] = obj[ZaServer.A_VolumeRootPath];
				dirty=true;
				if(volumes[obj._index][ZaServer.A_isCurrent]) {
					ZaApp.getInstance().getCurrentController().popupWarningDialog(ZaMsg.VM_Warning_Changing_CurVolumePath);
				}
			}
			if(volumes[obj._index][ZaServer.A_VolumeCompressBlobs] != obj[ZaServer.A_VolumeCompressBlobs]) {
				volumes[obj._index][ZaServer.A_VolumeCompressBlobs] = obj[ZaServer.A_VolumeCompressBlobs];
				dirty=true;
			}
			if(volumes[obj._index][ZaServer.A_VolumeCompressionThreshold] != obj[ZaServer.A_VolumeCompressionThreshold]) {
				volumes[obj._index][ZaServer.A_VolumeCompressionThreshold] = obj[ZaServer.A_VolumeCompressionThreshold];
				dirty=true;
			}
			if(volumes[obj._index][ZaServer.A_VolumeType] != obj[ZaServer.A_VolumeType]) {
				volumes[obj._index][ZaServer.A_VolumeType] = obj[ZaServer.A_VolumeType];
				dirty=true;
			}					
		}

		if(dirty) {
			var indexArr = [];
			var msgArr = [];
			for(var i=0;i<cnt;i++) {
				if(volumes[i][ZaServer.A_VolumeType]==ZaServer.MSG) {
					msgArr.push(volumes[i])
				} else if(volumes[i][ZaServer.A_VolumeType]==ZaServer.INDEX) {
					indexArr.push(volumes[i]);
				}
			}			
			ZaServerXFormView.indexVolChoices.setChoices(indexArr);
			ZaServerXFormView.indexVolChoices.dirtyChoices();	
			ZaServerXFormView.messageVolChoices.setChoices(msgArr);
			ZaServerXFormView.messageVolChoices.dirtyChoices();	
			volumes._version = instance[ZaServer.A_Volumes]+1;
			this.getModel().setInstanceValue(this.getInstance(), ZaServer.A_Volumes, volumes);
			this.getModel().setInstanceValue(this.getInstance(), ZaServer.A2_volume_selection_cache, new Array());
			this.parent.setDirty(dirty);	
		}		
	}
}

ZaServerXFormView.addVolume  = function () {
	if(this.parent.addVolumeDlg) {
		this.parent.addVolumeDlg.popdown();
		var obj = this.parent.addVolumeDlg.getObject();
		var instance = this.getInstance();
		var volArr = [];
		var oldArr = this.getModel().getInstanceValue(this.getInstance(),ZaServer.A_Volumes);
		var cnt = oldArr.length;
		for (var i=0; i< cnt; i++) {
			volArr[i] = oldArr[i];
		}		
		this.getModel().setInstanceValue(this.getInstance(),ZaServer.A2_volume_selection_cache,[]);
		
		volArr.push(obj);
		volArr._version = oldArr._version+1;

		volArr.sort(ZaServer.compareVolumesByName);		
		var cnt = volArr.length;
		var indexArr = [];
		var msgArr = [];
		for(var i=0;i<cnt;i++) {
			if(volArr[i][ZaServer.A_VolumeType]==ZaServer.INDEX) {
				indexArr.push(instance[ZaServer.A_Volumes][i]);
			} else if(volArr[i][ZaServer.A_VolumeType] == ZaServer.MSG) {
				msgArr.push(instance[ZaServer.A_Volumes][i]);
			}
		}
				
		ZaServerXFormView.indexVolChoices.setChoices(indexArr);
		ZaServerXFormView.indexVolChoices.dirtyChoices();	
	
		ZaServerXFormView.messageVolChoices.setChoices(msgArr);
		ZaServerXFormView.messageVolChoices.dirtyChoices();
	
		this.getModel().setInstanceValue(this.getInstance(),ZaServer.A_Volumes,volArr);
		this.parent.setDirty(true);
	}
}

ZaServerXFormView.editButtonListener =
function () {
	var instance = this.getInstance();
	if(instance.volume_selection_cache && instance.volume_selection_cache[0]) {	
		var formPage = this.getForm().parent;
		if(!formPage.editVolumeDlg) {
			formPage.editVolumeDlg = new ZaEditVolumeXDialog(ZaApp.getInstance().getAppCtxt().getShell(), "550px", "150px",ZaMsg.VM_Edit_Volume_Title);
			formPage.editVolumeDlg.registerCallback(DwtDialog.OK_BUTTON, ZaServerXFormView.updateVolume, this.getForm(), null);						
		}
		var obj = {};
		obj[ZaServer.A_VolumeId] = instance.volume_selection_cache[0][ZaServer.A_VolumeId];
		obj[ZaServer.A_VolumeName] = instance.volume_selection_cache[0][ZaServer.A_VolumeName];
		obj[ZaServer.A_VolumeRootPath] = instance.volume_selection_cache[0][ZaServer.A_VolumeRootPath];
		obj[ZaServer.A_VolumeCompressBlobs] = instance.volume_selection_cache[0][ZaServer.A_VolumeCompressBlobs];
		obj[ZaServer.A_VolumeCompressionThreshold] = instance.volume_selection_cache[0][ZaServer.A_VolumeCompressionThreshold];
		obj[ZaServer.A_VolumeType] = instance.volume_selection_cache[0][ZaServer.A_VolumeType];		
		
		var volArr = this.getModel().getInstanceValue(this.getInstance(),ZaServer.A_Volumes);
		
		var cnt = volArr.length;
		for(var i=0; i < cnt; i++) {
			if(volArr[i][ZaServer.A_VolumeId]==obj[ZaServer.A_VolumeId] || 
				(!volArr[i][ZaServer.A_VolumeId] && (volArr[i][ZaServer.A_VolumeName] == obj[ZaServer.A_VolumeName])
					&& (volArr[i][ZaServer.A_VolumeRootPath] == obj[ZaServer.A_VolumeRootPath]))) {
				obj._index = i;
				break;
			}
		}
		


		formPage.editVolumeDlg.setObject(obj);
		formPage.editVolumeDlg.popup();		
	}
}

ZaServerXFormView.deleteButtonListener = function () {
	var instance = this.getInstance();
	var volArr = [];
	if(!instance.volume_selection_cache) {
		return;
	}
	var selArr = this.getInstanceValue(ZaServer.A2_volume_selection_cache);

	var oldArr = this.getInstanceValue(ZaServer.A_Volumes);
	var cnt2 = oldArr.length;
	for (var i=0; i< cnt2; i++) {
		volArr[i] = oldArr[i];
	}		
	
	var removedArr = this.getInstanceValue(ZaServer.A_RemovedVolumes);
	if(AjxUtil.isEmpty(removedArr))
		removedArr = new Array();
		
	var cnt = selArr.length;
	if(cnt && volArr) {
		for(var i=0;i<cnt;i++) {
			cnt2--;				
			for(var k=cnt2;k>=0;k--) {
				if(volArr[k][ZaServer.A_VolumeId]==selArr[i][ZaServer.A_VolumeId]) {
					removedArr.push(volArr[k]);
					volArr.splice(k,1);
					break;	
				}
			}
		}
			
	}
	
	volArr.sort(ZaServer.compareVolumesByName);	
	volArr._version = oldArr._version+1;	
	var cnt3 = volArr.length;
	var indexArr = [];
	var msgArr = [];
	for(var i=0;i<cnt3;i++) {
		if(volArr[i][ZaServer.A_VolumeType]==ZaServer.INDEX) {
			indexArr.push(volArr[i]);
		} else if(volArr[i][ZaServer.A_VolumeType] == ZaServer.MSG) {
			msgArr.push(volArr[i])
		}
	}

	
	ZaServerXFormView.indexVolChoices.setChoices(indexArr);
	ZaServerXFormView.indexVolChoices.dirtyChoices();	

	ZaServerXFormView.messageVolChoices.setChoices(msgArr);
	ZaServerXFormView.messageVolChoices.dirtyChoices();	
	
	this.setInstanceValue(volArr,ZaServer.A_Volumes);
	this.setInstanceValue([],ZaServer.A2_volume_selection_cache);
	this.setInstanceValue(removedArr,ZaServer.A_RemovedVolumes);
	this.getForm().parent.setDirty(true);
}

ZaServerXFormView.addButtonListener =
function () {
	var instance = this.getInstance();
	var formPage = this.getForm().parent;
	if(!formPage.addVolumeDlg) {
		formPage.addVolumeDlg = new ZaEditVolumeXDialog(ZaApp.getInstance().getAppCtxt().getShell(), "550px", "150px",ZaMsg.VM_Add_Volume_Title);
		formPage.addVolumeDlg.registerCallback(DwtDialog.OK_BUTTON, ZaServerXFormView.addVolume, this.getForm(), null);						
	}
	
	var obj = {};
	obj[ZaServer.A_VolumeId] = instance.newVolID--;
	obj[ZaServer.A_VolumeName] = "";
	obj[ZaServer.A_VolumeRootPath] = "/opt/zimbra";
	obj[ZaServer.A_VolumeCompressBlobs] = false;
	obj[ZaServer.A_VolumeCompressionThreshold] = 4096;
	obj[ZaServer.A_VolumeType] = ZaServer.MSG;		
	obj.current = false;		
	
	formPage.addVolumeDlg.setObject(obj);
	formPage.addVolumeDlg.popup();		
}

/*ZaServerXFormView.currentVolumeChanged = function (value, event, form) {
	this.getInstance()[ZaServer.A_Volumes]._version++;
	this.setInstanceValue(value);
	return value;
}*/
/**
* This method is added to the map {@link ZaTabView#XFormModifiers}
* @param xFormObject {Object} a definition of the form. This method adds/removes/modifies xFormObject to construct
* a Server view. 
**/
ZaServerXFormView.myXFormModifier = function(xFormObject) {	
	var headerList = new Array();
	headerList[0] = new ZaListHeaderItem(ZaServer.A_VolumeName, ZaMsg.VM_VolumeName, null, "100px", false, null, false, true);
	headerList[1] = new ZaListHeaderItem(ZaServer.A_VolumeRootPath, ZaMsg.VM_VolumeRootPath, null,"200px", false, null, false, true);
	headerList[2] = new ZaListHeaderItem(ZaServer.A_VolumeType, ZaMsg.VM_VolumeType, null, "120px", null, null, false, true);							
	headerList[3] = new ZaListHeaderItem(ZaServer.A_VolumeCompressBlobs, ZaMsg.VM_VolumeCompressBlobs, null, "120px", null, null, false, true);								
	headerList[4] = new ZaListHeaderItem(ZaServer.A_VolumeCompressionThreshold, ZaMsg.VM_VolumeCompressThreshold, null, "120px", null, null, false, true);									
	headerList[5] = new ZaListHeaderItem(ZaServer.A_isCurrentVolume, ZaMsg.VM_CurrentVolume, null, "50px", null, null, false, true);										

	var _tab1 = ++this.TAB_INDEX;
	var _tab2 = ++this.TAB_INDEX;	
	var _tab3 = ++this.TAB_INDEX;	
	var _tab4 = ++this.TAB_INDEX;	
	var _tab5 = ++this.TAB_INDEX;		
	var _tab6 = ++this.TAB_INDEX;			
	
	xFormObject.tableCssStyle="width:100%;position:static;overflow:auto;";
	
	xFormObject.items = [
		{type:_GROUP_, cssClass:"ZmSelectedHeaderBg", colSpan: "*", id:"xform_header", 
			items: [
				{type:_GROUP_,	numCols:4,colSizes:["32px","350px","100px","250px"],
					items: [
						{type:_AJX_IMAGE_, src:"Server_32", label:null, rowSpan:2},
						{type:_OUTPUT_, ref:ZaServer.A_name, label:null,cssClass:"AdminTitle", rowSpan:2},				
						{type:_OUTPUT_, ref:ZaServer.A_ServiceHostname, label:ZaMsg.NAD_ServiceHostname+":"},
						{type:_OUTPUT_, ref:ZaItem.A_zimbraId, label:ZaMsg.NAD_ZimbraID}
					]
				}
			],
			cssStyle:"padding-top:5px; padding-bottom:5px"
		},
		{type:_TAB_BAR_, ref:ZaModel.currentTab,
			containerCssStyle: "padding-top:0px",
			choices:[
				{value:_tab1, label:ZaMsg.TABT_GeneralPage},
				{value:_tab2, label:ZaMsg.NAD_Tab_Services},
				{value:_tab3, label:ZaMsg.NAD_Tab_MTA},
				{value:_tab4, label:ZaMsg.NAD_Tab_IMAP},					
				{value:_tab5, label:ZaMsg.NAD_Tab_POP},
				{value:_tab6, label:ZaMsg.NAD_Tab_VolumeMgt}
            ],
			cssClass:"ZaTabBar", id:"xform_tabbar"
		},
		{type:_SWITCH_, items:[
				{type:_ZATABCASE_, colSizes:["auto"],numCols:1, caseKey:_tab1, 
					id:"server_general_tab",
					items:[
						{type:_ZA_PLAIN_GROUPER_/*_ZAGROUP_*/, items:[
							{ref:ZaServer.A_name, type:_OUTPUT_, label:ZaMsg.NAD_DisplayName+":", labelLocation:_LEFT_},
                            ZaItem.descriptionXFormItem,
                                /*
                            { ref: ZaServer.A_description, type:_INPUT_,
							  label:ZaMsg.NAD_Description,cssClass:"admin_xform_name_input",
							  onChange:ZaServerXFormView.onFormFieldChanged
							},    */
							{ ref: ZaServer.A_ServiceHostname, type:_OUTPUT_, 
							  label:ZaMsg.NAD_ServiceHostname+":", cssClass:"admin_xform_name_input"/*,
							  onChange:ZaServerXFormView.onFormFieldChanged*/
							},
							{ ref: ZaServer.A_LmtpAdvertisedName, type:_INPUT_, 
							  label: ZaMsg.NAD_LmtpAdvertisedName, cssClass:"admin_xform_name_input",
							  onChange: ZaServerXFormView.onFormFieldChanged
							},
							{ ref: ZaServer.A_LmtpBindAddress, type:_INPUT_, 
							  label:ZaMsg.NAD_LmtpBindAddress, cssClass:"admin_xform_name_input",
							  onChange:ZaServerXFormView.onFormFieldChanged
							},
							{ ref: ZaServer.A_zimbraScheduledTaskNumThreads,
								labelWrap: true,
								type:_INPUT_, 
							  	label:ZaMsg.NAD_zimbraScheduledTaskNumThreads, 
							  	cssClass:"admin_xform_name_input",
							  onChange:ZaServerXFormView.onFormFieldChanged
							},
							{ref:ZaServer.A_zimbraMailPurgeSleepInterval, type:_SUPER_LIFETIME_, 
									resetToSuperLabel:ZaMsg.NAD_ResetToGlobal, 
									msgName:ZaMsg.NAD_zimbraMailPurgeSleepInterval,
									txtBoxLabel:ZaMsg.NAD_zimbraMailPurgeSleepInterval,
									onChange:ZaServerXFormView.onFormFieldChanged
							},
							{ref:ZaServer.A_zimbraReverseProxyLookupTarget,
								type:_SUPER_CHECKBOX_, resetToSuperLabel:ZaMsg.NAD_ResetToGlobal, 
								msgName:ZaMsg.NAD_zimbraReverseProxyLookupTarget,
								checkBoxLabel:ZaMsg.NAD_zimbraReverseProxyLookupTarget, 
								trueValue:"TRUE", falseValue:"FALSE", onChange:ZaServerXFormView.onReverseLookupTargetFieldChanged},
							{ ref: ZaServer.A_notes, type:_TEXTAREA_, 
							  label: ZaMsg.NAD_Notes, labelCssStyle: "vertical-align:top", width: "30em",
							  onChange:ZaServerXFormView.onFormFieldChanged
						    }
						]}
					]
				},
				{type:_ZATABCASE_, colSizes:["auto"],numCols:1, id:"server_services_tab", caseKey:_tab2, 
					items:[
						{ type: _ZA_TOP_GROUPER_, label: ZaMsg.NAD_Service_EnabledServices, 
						  items: [
						  	{ ref: ZaServer.A_zimbraLdapServiceEnabled, type: _CHECKBOX_,
						  	  enableDisableChangeEventSources:[ZaServer.A_zimbraLdapServiceInstalled],
						  	  enableDisableChecks:[[XForm.checkInstanceValue,ZaServer.A_zimbraLdapServiceInstalled,true]],
						  	  label: ZaMsg.NAD_Service_LDAP,
					  	      onChange: ZaServerXFormView.onFormFieldChanged
						  	},
						  	{ ref: ZaServer.A_zimbraMailboxServiceEnabled, type: _CHECKBOX_,
						  	  enableDisableChangeEventSources:[ZaServer.A_zimbraMailboxServiceInstalled],
						  	  enableDisableChecks:[[XForm.checkInstanceValue,ZaServer.A_zimbraMailboxServiceInstalled,true]],
						  	  label: ZaMsg.NAD_Service_Mailbox,
					  	      onChange: ZaServerXFormView.onFormFieldChanged
						  	},
						  	{ ref: ZaServer.A_zimbraMailProxyServiceEnabled, type: _CHECKBOX_,
						  	  enableDisableChangeEventSources:[ZaServer.A_zimbraMailProxyServiceInstalled],
						  	  enableDisableChecks:[[XForm.checkInstanceValue,ZaServer.A_zimbraMailProxyServiceInstalled,true]],						  	  
						  	  label: ZaMsg.NAD_Service_Imapproxy,
					  	      onChange: ZaServerXFormView.onFormFieldChanged
						  	},						  	
						  	{ ref: ZaServer.A_zimbraMtaServiceEnabled, type: _CHECKBOX_,
						  	  enableDisableChangeEventSources:[ZaServer.A_zimbraMtaServiceInstalled],
						  	  enableDisableChecks:[[XForm.checkInstanceValue,ZaServer.A_zimbraMtaServiceInstalled,true]],						  	  
						  	  label: ZaMsg.NAD_Service_MTA,
					  	      onChange: ZaServerXFormView.onFormFieldChanged
						  	},
						  	{ ref: ZaServer.A_zimbraSnmpServiceEnabled, type: _CHECKBOX_,
						  	  enableDisableChangeEventSources:[ZaServer.A_zimbraSnmpServiceInstalled],
						  	  enableDisableChecks:[[XForm.checkInstanceValue,ZaServer.A_zimbraSnmpServiceInstalled,true]],						  	  
						  	  label: ZaMsg.NAD_Service_SNMP,
					  	      onChange: ZaServerXFormView.onFormFieldChanged
						  	},
						  	{ ref: ZaServer.A_zimbraAntiSpamServiceEnabled, type: _CHECKBOX_,
						  	  enableDisableChangeEventSources:[ZaServer.A_zimbraAntiSpamServiceInstalled],
						  	  enableDisableChecks:[[XForm.checkInstanceValue,ZaServer.A_zimbraAntiSpamServiceInstalled,true]],						  	  
						  	  label: ZaMsg.NAD_Service_AntiSpam,
					  	      onChange: ZaServerXFormView.onFormFieldChanged
						  	},
						  	{ ref: ZaServer.A_zimbraAntiVirusServiceEnabled, type: _CHECKBOX_,
						  	  enableDisableChangeEventSources:[ZaServer.A_zimbraAntiVirusServiceInstalled],
						  	  enableDisableChecks:[[XForm.checkInstanceValue,ZaServer.A_zimbraAntiVirusServiceInstalled,true]],
						  	  label: ZaMsg.NAD_Service_AntiVirus,
					  	      onChange: ZaServerXFormView.onFormFieldChanged
						  	},
						  	{ ref: ZaServer.A_zimbraSpellServiceEnabled, type: _CHECKBOX_,
						  	  enableDisableChangeEventSources:[ZaServer.A_zimbraSpellServiceInstalled],
						  	  enableDisableChecks:[[XForm.checkInstanceValue,ZaServer.A_zimbraSpellServiceInstalled,true]],						  	  
						  	  label: ZaMsg.NAD_Service_Spell,
					  	      onChange: ZaServerXFormView.onFormFieldChanged
						  	},
						  	{ ref: ZaServer.A_zimbraLoggerServiceEnabled, type: _CHECKBOX_,
						  	  enableDisableChangeEventSources:[ZaServer.A_zimbraLoggerServiceInstalled],
						  	  enableDisableChecks:[[XForm.checkInstanceValue,ZaServer.A_zimbraLoggerServiceInstalled,true]],						  	  
						  	  label: ZaMsg.NAD_Service_Logger,
					  	      onChange: ZaServerXFormView.onFormFieldChanged
						  	}							  	
						]}
					]
				}, 
				{ type: _ZATABCASE_, id:"server_mta_tab", caseKey:_tab3,
					colSizes:["auto"],numCols:1,
					items: [
						{type:_ZA_TOP_GROUPER_, colSizes:["auto"],numCols:1,label:ZaMsg.Global_MTA_AuthenticationGrp,
					      items: [
						      	{ ref:ZaServer.A_zimbraMtaAuthEnabled, type: _SUPER_CHECKBOX_,
						      	  trueValue: "TRUE", falseValue: "FALSE",
						      	  onChange: ZaServerXFormView.onFormFieldChanged,
						      	  resetToSuperLabel:ZaMsg.NAD_ResetToGlobal,
						      	  checkBoxLabel:ZaMsg.NAD_MTA_Authentication
					      	    },
						      	{ ref:ZaServer.A_zimbraMtaTlsAuthOnly, type: _SUPER_CHECKBOX_,
						      	  enableDisableChangeEventSources:[ZaServer.A_zimbraMtaAuthEnabled],
						      	  enableDisableChecks:[ZaServerXFormView.getTLSEnabled],
						      	  trueValue: "TRUE", falseValue: "FALSE",
						      	  onChange: ZaServerXFormView.onFormFieldChanged,
						      	  resetToSuperLabel:ZaMsg.NAD_ResetToGlobal,
						      	  checkBoxLabel:ZaMsg.NAD_MTA_TlsAuthenticationOnly
					      	    }
				      	    ]
						},
				      {type:_ZA_TOP_GROUPER_, colSizes:["auto"],numCols:1,label:ZaMsg.Global_MTA_NetworkGrp,
					      items: [			      
							{ref:ZaServer.A_SmtpHostname, type:_SUPER_TEXTFIELD_, 
							  txtBoxLabel:ZaMsg.NAD_MTA_WebMailHostname,
							  resetToSuperLabel:ZaMsg.NAD_ResetToGlobal,
							  onChange: ZaServerXFormView.onFormFieldChanged,
							  toolTipContent: ZaMsg.tt_MTA_WebMailHostname,
							  textFieldCssClass:"admin_xform_name_input"
							},
							{type:_GROUP_,numCols:3,colSpan:3,colSizes:["275px","275px","150px"], 
						  		items:[					  	
									{ref:ZaServer.A_SmtpPort, type:_OUTPUT_, label:ZaMsg.NAD_MTA_WebMailPort, width:"4em"},
								  	{type:_SPACER_}								
								]
						  	},
							{ ref:ZaServer.A_zimbraMtaRelayHost, type:_SUPER_HOSTPORT_,
							    textBoxLabel: ZaMsg.NAD_MTA_RelayMTA, 
							    onChange: ZaServerXFormView.onFormFieldChanged,
							    onClick: "ZaController.showTooltip",
								toolTipContent: ZaMsg.tt_MTA_RelayMTA,
								onMouseout: "ZaController.hideTooltip",
							    resetToSuperLabel:ZaMsg.NAD_ResetToGlobal
							},
							{type:_GROUP_,numCols:3,colSpan:3,colSizes:["275px","275px","150px"], 
						  		items:[					  	
									{ref:ZaServer.A_SmtpTimeout, type:_TEXTFIELD_, 
									  label:ZaMsg.NAD_MTA_WebMailTimeout, width: "4em",
									  onChange: ZaServerXFormView.onFormFieldChanged
									},
								  	{type:_SPACER_},
									{ref:ZaServer.A_zimbraMtaMyNetworks,label:ZaMsg.NAD_MTA_MyNetworks,
										type:_TEXTFIELD_, 
										onChange: ZaServerXFormView.onFormFieldChanged,
										toolTipContent: ZaMsg.tt_MTA_MyNetworks,
										textFieldCssClass:"admin_xform_name_input"
									},						
							  		{type:_SPACER_}		  									
								]
						  	},
					        { ref: ZaServer.A_zimbraMtaDnsLookupsEnabled, type:_SUPER_CHECKBOX_,
					      	  checkBoxLabel:ZaMsg.NAD_MTA_DnsLookups,
					      	  trueValue: "TRUE", falseValue: "FALSE",
					      	  onChange: ZaServerXFormView.onFormFieldChanged,
					      	  resetToSuperLabel:ZaMsg.NAD_ResetToGlobal
				      	    }
						]
				      }		
				    ]
				},
				{type:_ZATABCASE_, colSizes:["auto"],numCols:1, caseKey:_tab4,
					id:"server_imap_tab", 
					items:[
						{ type: _DWT_ALERT_,
						  containerCssStyle: "padding-bottom:0px",
						  style: DwtAlert.WARNING,
						  iconVisible: false, 
						  content: ZaMsg.Alert_ServerRestart
						},	
						{type:_ZA_TOP_GROUPER_, colSizes:["auto"],numCols:1,label:ZaMsg.Global_IMAP_ServiceGrp,
					      items: [						
						      	{ ref: ZaServer.A_ImapServerEnabled, type: _SUPER_CHECKBOX_,
						      	  checkBoxLabel:ZaMsg.IMAP_Service,
						      	  trueValue: "TRUE", falseValue: "FALSE",
						      	  onChange: ZaServerXFormView.onFormFieldChanged,
						      	  resetToSuperLabel:ZaMsg.NAD_ResetToGlobal
						  	    },	
						  	    {ref: ZaServer.A_ImapSSLServerEnabled, type: _SUPER_CHECKBOX_,
								  checkBoxLabel:ZaMsg.IMAP_SSLService,
							      enableDisableChangeEventSources:[ZaServer.A_ImapServerEnabled],
							      enableDisableChecks:[ZaServerXFormView.getIMAPEnabled],
							      trueValue: "TRUE", falseValue: "FALSE",
							      onChange: ZaServerXFormView.onFormFieldChanged,
							      resetToSuperLabel:ZaMsg.NAD_ResetToGlobal
							      
						      	},
						  	    { ref: ZaServer.A_ImapCleartextLoginEnabled, type: _SUPER_CHECKBOX_,
						      	  checkBoxLabel:ZaMsg.IMAP_CleartextLoginEnabled,
						      	  enableDisableChangeEventSources:[ZaServer.A_zimbraReverseProxyLookupTarget,ZaServer.A_ImapServerEnabled],
						      	  enableDisableChecks:[ZaServerXFormView.getIMAPEnabled,[XForm.checkInstanceValue,ZaServer.A_zimbraReverseProxyLookupTarget,"FALSE"]],
						      	  trueValue: "TRUE", falseValue: "FALSE",
						      	  onChange: ZaServerXFormView.onFormFieldChanged,
						      	  resetToSuperLabel:ZaMsg.NAD_ResetToGlobal
						      	  
					      	    },
					      	    { ref: ZaServer.A_zimbraImapNumThreads, type:_SUPER_TEXTFIELD_, 
								  visibilityChecks:[ZaServerXFormView.getIMAPEnabled],
								  visibilityChangeEventSources:[ZaServer.A_ImapServerEnabled],
								  txtBoxLabel: ZaMsg.IMAP_NumThreads, width: "5em",
								  onChange: ZaServerXFormView.onFormFieldChanged,
						      	  resetToSuperLabel:ZaMsg.NAD_ResetToGlobal
								}
						   ]
						},
						{type:_ZA_TOP_GROUPER_, label:ZaMsg.Global_IMAP_NetworkGrp,
					      items: [
							{ ref: ZaServer.A_zimbraImapBindPort, type:_TEXTFIELD_, 
							  visibilityChecks:[ZaServerXFormView.getIMAPEnabled],
							  visibilityChangeEventSources:[ZaServer.A_ImapServerEnabled],
							  label: ZaMsg.IMAP_Port+":", width: "5em",
							  onChange: ZaServerXFormView.onFormFieldChanged/*,
					      	  resetToSuperLabel:ZaMsg.NAD_ResetToGlobal*/
							},
							{ ref: ZaServer.A_ImapSSLBindPort, type:_TEXTFIELD_, 
							  visibilityChecks:[ZaServerXFormView.getIMAPSSLEnabled],
							  visibilityChangeEventSources:[ZaServer.A_ImapServerEnabled, ZaServer.A_ImapSSLServerEnabled],							  

							  label: ZaMsg.IMAP_SSLPort+":", width: "5em",
							  onChange: ZaServerXFormView.onFormFieldChanged/*,
						      resetToSuperLabel:ZaMsg.NAD_ResetToGlobal*/
							},		
							{ ref: ZaServer.A_zimbraImapProxyBindPort, type:_TEXTFIELD_, 
							  visibilityChecks:[ZaServerXFormView.getMailProxyEnabled],
							  visibilityChangeEventSources:[ZaServer.A_zimbraMailProxyServiceEnabled, ZaServer.A_zimbraMailProxyServiceInstalled],							  
							  label: ZaMsg.IMAP_Proxy_Port+":", width: "5em",
							  onChange: ZaServerXFormView.onFormFieldChanged/*,
					      	  resetToSuperLabel:ZaMsg.NAD_ResetToGlobal*/
							},							
							{ ref: ZaServer.A_zimbraImapSSLProxyBindPort, type:_TEXTFIELD_, 
							  visibilityChecks:[ZaServerXFormView.getIMAPSSLProxyEnabled],
							  visibilityChangeEventSources:[ZaServer.A_zimbraMailProxyServiceEnabled, ZaServer.A_zimbraMailProxyServiceInstalled,ZaServer.A_ImapServerEnabled,ZaServer.A_ImapSSLServerEnabled],							  
							  label: ZaMsg.IMAP_SSL_Proxy_Port+":", width: "5em",
							  onChange: ZaServerXFormView.onFormFieldChanged/*,
					      	  resetToSuperLabel:ZaMsg.NAD_ResetToGlobal*/
							}
							]
						}										      	
					]
				},
				{type:_ZATABCASE_, caseKey:_tab5,
					id:"server_pop_tab", colSizes:["auto"],numCols:1,
					items:[
						{ type: _DWT_ALERT_,
						  containerCssStyle: "padding-bottom:0px",
						  style: DwtAlert.WARNING,
						  iconVisible: false, 
						  content: ZaMsg.Alert_ServerRestart
						},
						{type: _ZA_TOP_GROUPER_, label:ZaMsg.Global_POP_ServiceGrp, 
						  items: [
					      	{ ref: ZaServer.A_Pop3ServerEnabled, type: _SUPER_CHECKBOX_,
					      	  trueValue: "TRUE", falseValue: "FALSE",
					      	  onChange: ZaServerXFormView.onFormFieldChanged,
					      	  resetToSuperLabel:ZaMsg.NAD_ResetToGlobal,
					      	  checkBoxLabel:ZaMsg.NAD_POP_Service
				      	    },
				      	    { ref: ZaServer.A_Pop3SSLServerEnabled, type: _SUPER_CHECKBOX_,
					      	  checkBoxLabel:ZaMsg.NAD_POP_SSL,
					      	  enableDisableChangeEventSources:[ZaServer.A_Pop3ServerEnabled],
					      	  enableDisableChecks:[ZaServerXFormView.getPOP3Enabled],
					      	  trueValue: "TRUE", falseValue: "FALSE",
					      	  onChange: ZaServerXFormView.onFormFieldChanged,
					      	  resetToSuperLabel:ZaMsg.NAD_ResetToGlobal
				      	    },
				      	    { ref: ZaServer.A_Pop3CleartextLoginEnabled, type: _SUPER_CHECKBOX_,
					      	  checkBoxLabel:ZaMsg.NAD_POP_CleartextLoginEnabled,
					      	  enableDisableChangeEventSources:[ZaServer.A_Pop3ServerEnabled,ZaServer.A_zimbraReverseProxyLookupTarget],
					      	  enableDisableChecks:[ZaServerXFormView.getPOP3Enabled,[XForm.checkInstanceValue,ZaServer.A_zimbraReverseProxyLookupTarget,"FALSE"]],
					      	  trueValue: "TRUE", falseValue: "FALSE",
					      	  onChange: ZaServerXFormView.onFormFieldChanged,
					      	  resetToSuperLabel:ZaMsg.NAD_ResetToGlobal
				      	    },
				      	    { ref: ZaServer.A_zimbraPop3NumThreads, type:_SUPER_TEXTFIELD_, 
					      	  enableDisableChangeEventSources:[ZaServer.A_Pop3ServerEnabled,ZaServer.A_zimbraReverseProxyLookupTarget],
					      	  enableDisableChecks:[ZaServerXFormView.getPOP3Enabled,[XForm.checkInstanceValue,ZaServer.A_zimbraReverseProxyLookupTarget,"FALSE"]],							  
							  labelLocation:_LEFT_, 
							  textFieldCssClass:"admin_xform_number_input", 
							  txtBoxLabel: ZaMsg.NAD_POP_NumThreads,
							  onChange: ZaServerXFormView.onFormFieldChanged,
					      	  resetToSuperLabel:ZaMsg.NAD_ResetToGlobal
							}	
						]
						},	
						{type:_ZA_TOP_GROUPER_, label:ZaMsg.Global_POP_NetworkGrp, 
						  items: [	
						  	{type:_GROUP_,numCols:3,colSpan:3,colSizes:["275px","275px","150px"], 
						      	enableDisableChangeEventSources:[ZaServer.A_Pop3ServerEnabled],
						      	enableDisableChecks:[ZaServerXFormView.getPOP3Enabled],							  	
						  		items:[					  	
									{ ref: ZaServer.A_Pop3AdvertisedName, type:_TEXTFIELD_, 
									  labelLocation:_LEFT_, label: ZaMsg.NAD_POP_AdvertisedName, 
									  onChange: ZaServerXFormView.onFormFieldChanged
									},
								  	{type:_SPACER_}								
								]
						  	},		
							{type:_GROUP_,numCols:3,colSpan:3,colSizes:["275px","275px","150px"],
						      	enableDisableChangeEventSources:[ZaServer.A_Pop3ServerEnabled],
						      	enableDisableChecks:[ZaServerXFormView.getPOP3Enabled],								
						  		items:[
									{ ref: ZaServer.A_Pop3BindAddress, type:_TEXTFIELD_, 
																	
									 	label:ZaMsg.NAD_POP_Address,
									  	onChange:ZaServerXFormView.onFormFieldChanged
								  	},
								  	{type:_SPACER_}
							  ]
						  	},						  	
							{ ref: ZaServer.A_zimbraPop3BindPort, type:_TEXTFIELD_, 
						      enableDisableChangeEventSources:[ZaServer.A_Pop3ServerEnabled],
						      enableDisableChecks:[ZaServerXFormView.getPOP3Enabled],							

							  label: ZaMsg.NAD_POP_Port+":",
							  labelLocation:_LEFT_, 
							  textFieldCssClass:"admin_xform_number_input", 
							  onChange:ZaServerXFormView.onFormFieldChanged/*,
					      	  resetToSuperLabel:ZaMsg.NAD_ResetToGlobal*/
						  	},	
						  	
							{ ref: ZaServer.A_zimbraPop3SSLBindPort, type:_TEXTFIELD_,
							  visibilityChecks:[ZaServerXFormView.getPOP3SSLEnabled],
							  visibilityChangeEventSources:[ZaServer.A_Pop3SSLServerEnabled, ZaServer.A_Pop3ServerEnabled],							  

							  labelLocation:_LEFT_, 
							  label: ZaMsg.NAD_POP_SSL_Port+":",
							  onChange:ZaServerXFormView.onFormFieldChanged/*,
					      	  resetToSuperLabel:ZaMsg.NAD_ResetToGlobal*/
						  	},	
							{ ref: ZaServer.A_zimbraPop3ProxyBindPort, type:_TEXTFIELD_,
							  visibilityChecks:[ZaServerXFormView.getPOP3ProxyEnabled],
							  visibilityChangeEventSources:[ZaServer.A_zimbraMailProxyServiceEnabled, ZaServer.A_zimbraMailProxyServiceInstalled,ZaServer.A_Pop3ServerEnabled],							  

							  labelLocation:_LEFT_, 
							  textFieldCssClass:"admin_xform_number_input", 
							  label: ZaMsg.NAD_POP_proxy_Port+":",
							  onChange:ZaServerXFormView.onFormFieldChanged/*,
					      	  resetToSuperLabel:ZaMsg.NAD_ResetToGlobal*/
						  	},
							{ ref: ZaServer.A_zimbraPop3SSLProxyBindPort, type:_TEXTFIELD_, 
							  visibilityChecks:[ZaServerXFormView.getPOP3SSLProxyEnabled],
							  visibilityChangeEventSources:[ZaServer.A_zimbraMailProxyServiceEnabled,ZaServer.A_Pop3SSLServerEnabled, ZaServer.A_zimbraMailProxyServiceInstalled,ZaServer.A_Pop3ServerEnabled],							  

							  labelLocation:_LEFT_, 
							  label: ZaMsg.NAD_POP_SSL_proxy_Port+":",
							  textFieldCssClass:"admin_xform_number_input", 
							  onChange:ZaServerXFormView.onFormFieldChanged/*,
					      	  resetToSuperLabel:ZaMsg.NAD_ResetToGlobal*/
							}
				      	]
						}					  
					]
				},
				{type:_ZATABCASE_,width:"100%", id:"server_form_volumes_tab", caseKey:_tab6, 
					visibilityChangeEventSources:[ZaModel.currentTab],
					visibilityChecks:[Case_XFormItem.prototype.isCurrentTab,ZaServerXFormView.getMailboxEnabled],
 
					numCols:1,
					items:[
						
						{type:_ZA_TOP_GROUPER_, id:"server_form_volumes_group",width:"98%", 
							numCols:1,colSizes:["auto"],label:ZaMsg.VM_VolumesGrpTitle,
							cssStyle:"margin-top:10px;margin-bottom:10px;padding-bottom:0px;margin-left:10px;margin-right:10px;",
							items: [
								{ref:ZaServer.A_Volumes, type:_DWT_LIST_, height:"200", width:"100%", 
									 	preserveSelection:false, multiselect:true,cssClass: "DLSource", 
									 	headerList:headerList, widgetClass:ZaServerVolumesListView,
									 	onSelection:ZaServerXFormView.volumeSelectionListener,
									 	valueChangeEventSources:[ZaServer.A_Volumes, ZaServer.A_CurrentMsgVolumeId, ZaServer.A_CurrentIndexVolumeId,ZaServer.A_RemovedVolumes]
								},
								{type:_GROUP_, numCols:5, colSizes:["100px","auto","100px","auto","100px"], width:"350px",
									cssStyle:"margin-bottom:10px;padding-bottom:0px;margin-top:10px;pxmargin-left:10px;margin-right:10px;",
									items: [
										{type:_DWT_BUTTON_, label:ZaMsg.TBB_Delete,width:"100px",
											onActivate:"ZaServerXFormView.deleteButtonListener.call(this);",
						      				enableDisableChangeEventSources:[ZaServer.A2_volume_selection_cache],
						      				enableDisableChecks:[ZaServerXFormView.isDeleteVolumeEnabled]											

										},
										{type:_CELLSPACER_},
										{type:_DWT_BUTTON_, label:ZaMsg.TBB_Edit,width:"100px",
											onActivate:"ZaServerXFormView.editButtonListener.call(this);",
						      				enableDisableChangeEventSources:[ZaServer.A2_volume_selection_cache],
						      				enableDisableChecks:[ZaServerXFormView.isEditVolumeEnabled]											

										},
										{type:_CELLSPACER_},
										{type:_DWT_BUTTON_, label:ZaMsg.NAD_Add,width:"100px",
											onActivate:"ZaServerXFormView.addButtonListener.call(this);"
										}
									]
								}								
							]
						},							
						{type:_ZA_TOP_GROUPER_,label:ZaMsg.VM_CurrentVolumesGrpTitle,id:"server_form_current_vol_group", items:[
							{type:_OSELECT1_, editable:false,
								valueChangeEventSources:[ZaServer.A_Volumes, ZaServer.A_RemovedVolumes],
								ref:ZaServer.A_CurrentMsgVolumeId,
								choices:ZaServerXFormView.messageVolChoices,
								//onChange:ZaServerXFormView.currentVolumeChanged,
								label:ZaMsg.VM_CurrentMessageVolume+":"
							},
							{type:_OSELECT1_, editable:false,
								valueChangeEventSources:[ZaServer.A_Volumes, ZaServer.A_RemovedVolumes],
								ref:ZaServer.A_CurrentIndexVolumeId,
								choices:ZaServerXFormView.indexVolChoices,
								//onChange:ZaServerXFormView.currentVolumeChanged,
								label:ZaMsg.VM_CurrentIndexVolume+":"
							}
						]}						
						
					]
				},
				{type:_ZATABCASE_, caseKey:_tab6, 
					visibilityChangeEventSources:[ZaModel.currentTab],
					visibilityChecks:[Case_XFormItem.prototype.isCurrentTab,[XForm.checkInstanceValue,ZaServer.A_showVolumes,false]],
				
					items: [
						{ type: _DWT_ALERT_,
						  cssClass: "DwtTabTable",
						  containerCssStyle: "padding-bottom:0px",
						  style: DwtAlert.WARNING,
						  iconVisible: true, 
						  content:ZaMsg.Alert_MbxSvcNotInstalled,
						  colSpan:"*"
						}						
					]
				
				}
            ]
		}

    ];
};
ZaTabView.XFormModifiers["ZaServerXFormView"].push(ZaServerXFormView.myXFormModifier);