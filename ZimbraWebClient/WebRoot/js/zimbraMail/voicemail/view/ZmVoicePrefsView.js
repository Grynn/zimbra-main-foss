/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2007 Zimbra, Inc.
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

// TODOs
// Somewhere in here, I need to create proxies of the features. (Or maybe as an easy hack, just work directly on the model. It's not used anywhere else.)


ZmVoicePrefsView = function(parent, controller) {
	DwtTabViewPage.call(this, parent, "ZmPreferencesPage");

	this._controller = controller;
	this._hasRendered = false;
	this._item = null;
	
    this._section = ZmPref.getPrefSectionWithPref(ZmSetting.VOICE_ACCOUNTS);
	this._title = [ZmMsg.zimbraTitle, controller.getApp().getDisplayName(), this._section && this._section.title].join(": ");
	this._ui = [
		new ZmEmailNotificationUI(this),
		new ZmCallForwardingUI(this)
	];
	this._changes = null;
};

ZmVoicePrefsView.prototype = new DwtTabViewPage;
ZmVoicePrefsView.prototype.constructor = ZmVoicePrefsView;

ZmVoicePrefsView.prototype.toString =
function() {
	return "ZmVoicePrefsView";
};

ZmVoicePrefsView.prototype.hasRendered =
function () {
	return this._hasRendered;
};

ZmVoicePrefsView.prototype.getList =
function() {
	return this._list;
};

ZmVoicePrefsView.prototype.setItem =
function(item) {
	this._item = item;
//TODO: Retarded.
	this._getChanges();
	this.showItem(item);
};

ZmVoicePrefsView.prototype.validate =
function() {
	if (!this._item) {
		return true;
	}
	var errors = [];
	for(var i = 0, count = this._ui.length; i < count; i++) {
		var ui = this._ui[i];
		if (!ui._checkbox || ui._checkbox.isSelected()) {
			ui.validate(errors);
		}
	}
	this._errors = errors;
	return this._errors.length == 0;
};

ZmVoicePrefsView.prototype.getErrorMessage =
function() {
	if (!this._errors.length) {
		return null;
	} else {
		return this._errors.join("<br>");
	}
};

ZmVoicePrefsView.prototype.getTitle =
function() {
	return this._title;
};

ZmVoicePrefsView.prototype.showMe =
function() {
	var prefsController = AjxDispatcher.run("GetPrefController");
	prefsController._resetOperations(prefsController._toolbar, this._section && this._section.id);
	Dwt.setTitle(this._title);
	if (this._hasRendered) { return; }

	this._handleResponseGetFeaturesObj = new AjxCallback(this, this._handleResponseGetFeatures);
	this._handleErrorGetFeaturesObj = new AjxCallback(this, this._handleErrorGetFeatures);

	var contactsApp = appCtxt.getApp(ZmApp.CONTACTS);
	if (contactsApp) {
		var respCallback = new AjxCallback(this, this._handleResponseGetMyCard);
		contactsApp.getMyCard(respCallback);
	} else {
		appCtxt.getApp(ZmApp.VOICE).getVoiceInfo(new AjxCallback(this, this._handleResponseGetVoiceInfo));
	}
};

ZmVoicePrefsView.prototype._handleResponseGetMyCard =
function(contact) {
	this._myCard = contact;
	if (this._myCard) {
		contact.addChangeListener(new AjxListener(this, this._contactsChangeListener));
		if (this._hasRendered) {
			for (var i = 0, count = this._ui.length; i < count; i++) {
				this._ui[i].updateMyCard();
			}
		}
	}

	appCtxt.getApp(ZmApp.VOICE).getVoiceInfo(new AjxCallback(this, this._handleResponseGetVoiceInfo));
};

ZmVoicePrefsView.prototype._handleResponseGetVoiceInfo =
function() {
	var id = this._htmlElId;
	var data = { id: id };
	this.getHtmlElement().innerHTML = AjxTemplate.expand("voicemail.Voicemail#ZmVoicePrefsView", data);

	// Create the list view and the contents of the detail pane.
	this._list = new ZmPhoneList(this);
	this._list.replaceElement(id + "_list");
	this._list.sortingEnabled = false;

	// Initialize the page size selector.
	var current = appCtxt.get(ZmSetting.VOICE_PAGE_SIZE);
	var choices = ["10", "25", "50", "100"];
	var options = [];
	for (var i = 0, count = choices.length; i < count; i++) {
		var choice = choices[i];
		var selected = current == choice;
		options[i] = new DwtSelectOptionData(choice, choice, selected);
	}
	this._pageSizeSelect = new DwtSelect({parent:this, options:options});
	this._pageSizeSelect.replaceElement(id + "_itemsPerPageSelect");

	for(var i = 0, count = this._ui.length; i < count; i++) {
		this._ui[i]._initialize(id);
		this._ui[i].updateMyCard();
	}

	this._controller._setup();

	this._hasRendered = true;
};


ZmVoicePrefsView.prototype.isPageSizeDirty =
function() {
	return this._pageSizeSelect.getValue() != appCtxt.get(ZmSetting.VOICE_PAGE_SIZE);
};

ZmVoicePrefsView.prototype.isDirty =
function() {
	this._getChanges();
	return this._changes != null || this.isPageSizeDirty();
};

ZmVoicePrefsView.prototype._getChanges =
function() {
	if (!this._phone) {
		return;
	}
	for(var i = 0, count = this._ui.length; i < count; i++) {
		if (this._ui[i].isDirty()) {
			this._addChange(this._ui[i]);
		}
	}
};

ZmVoicePrefsView.prototype._addChange =
function(ui) {
	if (!this._changes) {
		this._changes = {};
	}
	if (!this._changes[this._phone.name]) {
		this._changes[this._phone.name] = { phone: this._phone, features: {} };
	}
	var feature = ui.getFeature();
	this._changes[this._phone.name].features[feature.name] = feature;
};

ZmVoicePrefsView.prototype.reset =
function() {
	this._pageSizeSelect.setSelectedValue(appCtxt.get(ZmSetting.VOICE_PAGE_SIZE));
	this._changes = null;
	this.showItem(this._item);
};

ZmVoicePrefsView.prototype.showItem =
function(phone) {
	this._phone = phone;
	phone.getCallFeatures(this._handleResponseGetFeaturesObj, this._handleErrorGetFeaturesObj);
};

ZmVoicePrefsView.prototype._handleResponseGetFeatures =
function(features, phone) {
	var changedFeatures = (this._changes && this._changes[phone.name]) ? this._changes[phone.name].features : null;
	for(var i = 0, count = this._ui.length; i < count; i++) {
		var featureName = this._ui[i].getName();
		var feature;
		if (changedFeatures && changedFeatures[featureName]) {
			feature = changedFeatures[featureName];
		} else {
			feature = features[featureName];
		}
		this._ui[i].setFeature(feature);
	}
};

ZmVoicePrefsView.prototype._handleErrorGetFeatures =
function(csfeException) {
	for(var i = 0, count = this._ui.length; i < count; i++) {
		var ui = this._ui[i];
		ui.setEnabled(false);
		if (ui._checkbox) {
			ui._checkbox.setEnabled(false);
		}
	}
};

ZmVoicePrefsView.prototype.addCommand =
function(batchCommand) {
	var first = true;
	for (var i in this._changes) {
		var change = this._changes[i];
		var phone = change.phone;
		var callback = null;
		if (first) {
			if (!this._handleResponseObj) {
				this._handleResponseObj = new AjxCallback(this, this._handleResponseCallFeatures);
			}
			callback = this._handleResponseObj;
			first = false;
		}
		var list = [];
		var features = change.features;
		for (var name in features) {
			list.push(features[name]);
		}
		phone.modifyCallFeatures(batchCommand, list, callback);
	 }
	if (this.isPageSizeDirty()) {
		var settings = appCtxt.getSettings();
		var pageSizeSetting = settings.getSetting(ZmSetting.VOICE_PAGE_SIZE);
		pageSizeSetting.setValue(this._pageSizeSelect.getValue());
		settings.save([pageSizeSetting], new AjxCallback(this, this._handleResponsePageSize), batchCommand);
	}
};

ZmVoicePrefsView.prototype._handleResponseCallFeatures =
function() {
	this._changes = null;
};

ZmVoicePrefsView.prototype._handleResponsePageSize =
function() {
	appCtxt.getApp(ZmApp.VOICE).redoSearch();
};

ZmVoicePrefsView.prototype._containsMyCard =
function(contacts) {
    for(var i = 0, count = contacts.length; i < count; i++) {
		if (contacts[i] == this._myCard) {
			return true;
		}
    }
    return false;
};

ZmVoicePrefsView.prototype._contactsChangeListener =
function(ev) {
	var redraw = false;
	if (ev.event == ZmEvent.E_MODIFY) {
        var contacts = ev.getDetails().items;
		if (contacts && this._containsMyCard(contacts)) {
            for(var i = 0, count = this._ui.length; i < count; i++) {
                this._ui[i].updateMyCard();
            }
        }
	}
};

ZmVoicePrefsView._validatePhoneNumber =
function(value) {
	if (AjxStringUtil.trim(value) == "") {
		throw AjxMsg.valueIsRequired;
	}
	if (!ZmPhone.isValid(value)) {
		throw ZmMsg.errorInvalidPhone;
	}
	return value;
};
ZmVoicePrefsView._validateEmailAddress =
function(value) {
	if (value == "") {
		throw AjxMsg.valueIsRequired;
	} else if (!AjxEmailAddress.isValid(value)) {
		throw ZmMsg.errorInvalidEmail;
	}
	return value;
};

ZmCallFeatureUI = function(view) {
	this._view = view;
}

ZmCallFeatureUI.prototype.setFeature =
function(feature) {
	this._feature = feature;
	this.show(feature);
	if (this._checkbox) {
		this._checkbox.setSelected(feature.isActive);
		this._checkbox.setEnabled(feature.isSubscribed);
	}
	this.setEnabled(feature.isActive);
};

ZmCallFeatureUI.prototype.getFeature =
function() {
	var result = this._feature.createProxy();
	result.isActive = this._checkbox ? this._checkbox.isSelected() : true;
	return result;
};

ZmCallFeatureUI.prototype.isDirty =
function() {
	if (!this._feature || !this._feature.isSubscribed) {
		return false;
	}
	if (this._checkbox && (this._feature.isActive != this._checkbox.isSelected())) {
		return true;
	}
	return this._isValueDirty();
};

ZmCallFeatureUI.prototype._createCheckbox =
function(text, id) {
	this._checkbox = new DwtCheckbox({parent:this._view});
	this._checkbox.setText(text);
	this._checkbox.replaceElement(id);
	this._checkbox.addSelectionListener(new AjxListener(this, this._checkboxListener));
};

ZmCallFeatureUI.prototype._checkboxListener =
function(ev) {
	if(this.toString() == "ZmEmailNotificationUI" && !this._checkbox.isSelected() && this._getSelectedValue() != ""){
        var value  =  this._getSelectedValue();
        if (!AjxEmailAddress.isValid(value))
           appCtxt.setStatusMsg(ZmMsg.invalidEmailAddress);
        else
            appCtxt.setStatusMsg(ZmMsg.lostEmailNotification);
    }
	this.setEnabled(this._checkbox.isSelected());
};

ZmCallFeatureUI.prototype._populatePhoneComboBox =
function(comboBox) {
    comboBox.removeAll();
	var myCard = this._view._myCard;
	if (myCard) {
		for (var fieldIndex = 0, fieldCount = ZmContact.F_PHONE_FIELDS.length; fieldIndex < fieldCount; fieldIndex++) {
			var fieldId = ZmContact.F_PHONE_FIELDS[fieldIndex];
			var phone = myCard.getAttr(fieldId);
			if (phone) {
				var name = ZmPhone.calculateName(phone);
				comboBox.add(ZmPhone.calculateDisplay(name), name, false);
			}
		}
	}
};

ZmCallFeatureUI.prototype._populateEmailComboBox =
function(comboBox) {
    comboBox.removeAll();
    var accountAddress = appCtxt.get(ZmSetting.USERNAME);
    this._comboBox.add(accountAddress, false);
	var myCard = this._view._myCard;
	if (myCard) {
		for (var fieldIndex = 0, fieldCount = ZmContact.F_EMAIL_FIELDS.length; fieldIndex < fieldCount; fieldIndex++) {
			var fieldId = ZmContact.F_EMAIL_FIELDS[fieldIndex];
			var email = myCard.getAttr(fieldId);
			if (email) {
				var accountAddressLower = null;
				if (!accountAddressLower) {
					accountAddressLower = accountAddress.toLowerCase();
				}
				if (email.toLowerCase != accountAddressLower) {
					comboBox.add(email, email, false);
				}
			}
		}
	}
};

ZmCallFeatureUI.prototype._isComboBoxValid =
function(comboBox) {
	return comboBox.input.isValid() !== null;
};

ZmCallFeatureUI.prototype._validateComboBox =
function(comboBox, errorList, message) {
	if (!this._isComboBoxValid(comboBox)) {
		errorList.push(message);
	}
};

// "Abstract" methods:
ZmCallFeatureUI.prototype.getName =
function() {
	alert('ZmCallFeatureUI.prototype.getName');
};
ZmCallFeatureUI.prototype._initialize =
function(id) {
	alert('ZmCallFeatureUI.prototype._initialize');
};
ZmCallFeatureUI.prototype.setEnabled =
function(enabled) {
	alert('ZmCallFeatureUI.prototype.setEnabled ' + enabled);
};
ZmCallFeatureUI.prototype.validate =
function(errors) {
	// No-op.
};
ZmCallFeatureUI.prototype.updateMyCard =
function() {
	// No-op.
};



/////////////////////////////////////////////////////////////////////////

ZmCallForwardingUI = function(view) {
	ZmCallFeatureUI.call(this, view);
	this._checkbox = null;
}
ZmCallForwardingUI.prototype = new ZmCallFeatureUI;
ZmCallForwardingUI.prototype.constructor = ZmCallForwardingUI;
ZmCallForwardingUI.prototype.toString = 
function() {
	return "ZmCallForwardingUI";
}

ZmCallForwardingUI.prototype.getName =
function() {
	return ZmCallFeature.CALL_FORWARDING;
};

ZmCallForwardingUI.prototype.show =
function(feature) {
	var display = ZmPhone.calculateDisplay(feature.data.ft);
	this._comboBox.setText(display);
};

ZmCallForwardingUI.prototype._isValueDirty =
function() {
	return !this._isComboBoxValid(this._comboBox) || (this._getSelectedValue() != this._feature.data.ft);
};

ZmCallForwardingUI.prototype.getFeature =
function() {
	var result = ZmCallFeatureUI.prototype.getFeature.call(this);
	result.data.ft = ZmPhone.calculateName(this._comboBox.getText());
	return result;
};

ZmCallForwardingUI.prototype.setEnabled =
function(enabled) {
	this._comboBox.setEnabled(enabled);
};

ZmCallForwardingUI.prototype.updateMyCard =
function() {
    this._populatePhoneComboBox(this._comboBox);
};

ZmCallForwardingUI.prototype.validate =
function(errors) {
	this._validateComboBox(this._comboBox, errors, ZmMsg.callForwardingError);
	if (this._getSelectedValue() == this._view._phone.name) {
		errors.push(ZmMsg.callForwardingSameNumberError);
	}
};

ZmCallForwardingUI.prototype._getSelectedValue =
function() {
	var value = this._comboBox.getValue();
	if (value) {
		return value;
	} else {
		return ZmPhone.calculateName(this._comboBox.getText());
	}
};

ZmCallForwardingUI.prototype._initialize =
function(id) {
	this._createCheckbox(ZmMsg.callForwardingDescription, id + "_callForwardingCheckbox");
	
	var inputParams = {
		size: 25,
		validator: ZmVoicePrefsView._validatePhoneNumber,
		validationStyle: DwtInputField.CONTINUAL_VALIDATION
	};
	this._comboBox = new DwtComboBox({parent:this._view, inputParams:inputParams});
	this._comboBox.replaceElement(id + "_callForwardingComboBox");
};

/////////////////////////////////////////////////////////////////////////

ZmEmailNotificationUI = function(view) {
	ZmCallFeatureUI.call(this, view);
	this._checkbox = null;
}
ZmEmailNotificationUI.prototype = new ZmCallFeatureUI;
ZmEmailNotificationUI.prototype.constructor = ZmEmailNotificationUI;
ZmEmailNotificationUI.prototype.toString =
function() {
	return "ZmEmailNotificationUI";
}

ZmEmailNotificationUI.prototype.getName =
function() {
	return ZmCallFeature.EMAIL_NOTIFICATION;
};

ZmEmailNotificationUI.prototype.show =
function(feature) {
	this._comboBox.setText(feature.data.value);
};

ZmEmailNotificationUI.prototype._isValueDirty =
function() {
	if (this._getSelectedValue() != this._feature.data.value) {
		return true;
	}
	return false;
};

ZmEmailNotificationUI.prototype.getFeature =
function() {
	var result = ZmCallFeatureUI.prototype.getFeature.call(this);
	result.data.value = this._getSelectedValue();
	return result;
};

ZmEmailNotificationUI.prototype.setEnabled =
function(enabled) {
	this._comboBox.setEnabled(enabled);
};

ZmEmailNotificationUI.prototype.updateMyCard =
function() {
    this._populateEmailComboBox(this._comboBox);
};

ZmEmailNotificationUI.prototype.validate =
function(errors) {
   this._validateEmailAddress(this._comboBox,errors);
};

ZmEmailNotificationUI.prototype._validateEmailAddress =
function(comboBox,errors){
    var value  =  comboBox.input.getValue();
    if (value == "") {
       errors.push(ZmMsg.missingEmailAddress);
	} else if (!AjxEmailAddress.isValid(value)) {
        errors.push(ZmMsg.invalidEmailAddress);
	}
}

ZmEmailNotificationUI.prototype._getSelectedValue =
function() {
	return AjxStringUtil.trim(this._comboBox.getText());
};

ZmEmailNotificationUI.prototype._initialize =
function(id) {
	this._createCheckbox(ZmMsg.emailNotificationDescription, id + "_emailNotificationCheckbox");

	var inputParams = {
		size: 25,
		validator: ZmVoicePrefsView._validateEmailAddress,
		validationStyle: DwtInputField.CONTINUAL_VALIDATION
	};
	this._comboBox = new DwtComboBox({parent:this._view, inputParams:inputParams});
	this._comboBox.replaceElement(id + "_emailNotificationComboBox");
};

/*
* ZmPhoneList
* The list of phone accounts.
*/
ZmPhoneList = function(parent) {
	var headerList = [new DwtListHeaderItem({field:1, text:ZmMsg.number})];
	DwtListView.call(this, {parent:parent, className:"ZmPhoneList", headerList:headerList});

	this.multiSelectEnabled = false;
};

ZmPhoneList.prototype = new DwtListView;
ZmPhoneList.prototype.constructor = ZmPhoneList;

ZmPhoneList.prototype.toString =
function() {
	return "ZmPhoneList";
};

ZmPhoneList.prototype._getCellContents =
function(htmlArr, idx, phone, field, colIdx, params) {
	htmlArr[idx++] = AjxStringUtil.htmlEncode(phone.getDisplay(), true);
	return idx;
};
