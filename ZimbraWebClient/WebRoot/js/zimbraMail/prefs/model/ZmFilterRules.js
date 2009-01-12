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
 * Creates an empty ZmFilterRules.
 * @constructor
 * @class
 * ZmFilterRules represents a set of filter rules. The rules are maintained in a vector, and have
 * an order. Each rule is a ZmFilterRule. They can be added and edited via a ZmFilterRuleDialog.
 *
 * @author Conrad Damon
 */
ZmFilterRules = function() {

	ZmModel.call(this, ZmEvent.S_FILTER);

	this._vector = new AjxVector();
	this._ruleIdHash = {};
	this._ruleNameHash = {};
	this._initialized = false;
};

ZmFilterRules.prototype = new ZmModel;
ZmFilterRules.prototype.constructor = ZmFilterRules;

ZmFilterRules.prototype.toString =
function() {
	return "ZmFilterRules";
};

/**
* Adds a rule to the list.
*
* @param rule			[ZmFilterRule]		rule to be added
* @param referenceRule	[ZmFilterRule]*		rule after which to add the new rule
* @param callback		[AjxCallback]*		callback
*/
ZmFilterRules.prototype.addRule = 
function(rule, referenceRule, callback) {
	DBG.println(AjxDebug.DBG3, "FILTER RULES: add rule '" + rule.name + "'");
	var index = referenceRule ? this._vector.indexOf(referenceRule) : null;
	this._insertRule(rule, index);
	this._saveRules(index, true, callback);
};

/**
* Removes a rule from the list.
*
* @param rule			[ZmFilterRule]		rule to be removed
*/
ZmFilterRules.prototype.removeRule = 
function(rule) {
	if (!rule) { return; }
	DBG.println(AjxDebug.DBG3, "FILTER RULES: remove rule '" + rule.name + "'");
	var index = this.getIndexOfRule(rule);
	this._vector.removeAt(index);
	delete this._ruleIdHash[rule.id];
	delete this._ruleNameHash[rule.name];
	this._saveRules(index, true);
};

/**
* Moves a rule up in the list. If the rule is the first in the list, it isn't moved.
*
* @param rule			[ZmFilterRule]		rule to be moved
*/
ZmFilterRules.prototype.moveUp = 
function(rule) {
	if (!rule) { return; }
	DBG.println(AjxDebug.DBG3, "FILTER RULES: move up rule '" + rule.name + "'");
	var index = this.getIndexOfRule(rule);
	if (index == 0) { return; }

	var prevRule = this._vector.removeAt(index - 1);
	this._insertRule(prevRule, index);
	this._saveRules(index - 1, true);
};

/**
* Moves a rule down in the list. If the rule is the last in the list, it isn't moved.
*
* @param rule			[ZmFilterRule]		rule to be moved
*/
ZmFilterRules.prototype.moveDown = 
function(rule) {
	if (!rule) { return; }
	DBG.println(AjxDebug.DBG3, "FILTER RULES: move down rule '" + rule.name + "'");
	var index = this.getIndexOfRule(rule);
	if (index >= (this._vector.size() - 1)) { return; }
	
	var nextRule = this._vector.removeAt(index + 1);
	this._insertRule(nextRule, index);
	this._saveRules(index + 1, true);
};

/**
* Marks a rule as active/inactive.
*
* @param rule			[ZmFilterRule]		rule to mark active/inactive
* @param active			[boolean]			if true, rule is marked active
*/
ZmFilterRules.prototype.setActive =
function(rule, active) {
	if (!rule) { return; }
	DBG.println(AjxDebug.DBG3, "FILTER RULES: set active rule '" + rule.name + "', " + active);
	rule.active = active;
	this._saveRules(null, false);
};

// utility methods

/**
* Returns the number of rules in the list.
*/
ZmFilterRules.prototype.getNumberOfRules = 
function() {
	return this._vector.size();
};

/**
* Returns the numeric index of the rule in the list.
*
* @param rule	[ZmFilterRule]		a rule
*/
ZmFilterRules.prototype.getIndexOfRule = 
function(rule) {
	return this._vector.indexOf(rule);
};

/**
* Fetches a rule based on its index.
*
* @param index	[int]	an index
*/
ZmFilterRules.prototype.getRuleByIndex = 
function(index) {
    return this._vector.get(index);
};

/**
* Fetches a rule based on its ID.
*
* @param id		[string]	rule ID
*/
ZmFilterRules.prototype.getRuleById = 
function(id) {
	return this._ruleIdHash[id];
};

/**
* Fetches a rule based on its name.
*
* @param name	[string]	rule name
*/
ZmFilterRules.prototype.getRuleByName = 
function(name) {
	return this._ruleNameHash[name];
};

/**
* Gets the rules from the server and parses them into ZmFilterRule objects.
*
* @param force			[boolean]*			if true, get rules from server
* @param callback		[AjxCallback]*		callback
*/
ZmFilterRules.prototype.loadRules = 
function(force, callback) {
	// return cache?
	if (this._initialized && !force) {
		if (callback) {
			callback.run(new ZmCsfeResult(this._vector));
			return;
		}
		return this._vector;
	}

	// fetch from server:
	DBG.println(AjxDebug.DBG3, "FILTER RULES: load rules");
	var soapDoc = AjxSoapDoc.create("GetFilterRulesRequest", "urn:zimbraMail");
	var respCallback = new AjxCallback(this, this._handleResponseLoadRules, [callback]);
	appCtxt.getAppController().sendRequest({soapDoc: soapDoc, asyncMode: true, callback: respCallback});
};

ZmFilterRules.prototype._handleResponseLoadRules =
function(callback, result) {
	this._vector.removeAll();
	this._ruleIdHash = {};
	this._ruleNameHash = {};

	var resp = result.getResponse().GetFilterRulesResponse;
	var children = resp.filterRules[0].filterRule;
	if (children) {
		for (var i = 0; i < children.length; i++) {
			var ruleNode = children[i];
			var rule = new ZmFilterRule(ruleNode.name, ruleNode.active, ruleNode.filterActions[0], ruleNode.filterTests[0]);
			this._insertRule(rule);
		}
	}

	this._initialized = true;

	if (callback) {
		result.set(this._vector);
		callback.run(result);
	} else {
		return this._vector;
	}
};

/**
* Saves the rules to the server.
*
* @param index			[int]*				index of rule to select in list after save
* @param notify			[boolean]*			if true, notify listeners of change event
* @param callback		[AjxCallback]*		callback
*/
ZmFilterRules.prototype._saveRules = 
function(index, notify, callback) {
	var jsonObj = {ModifyFilterRulesRequest:{_jsns:"urn:zimbraMail"}};
	var request = request = jsonObj.ModifyFilterRulesRequest;

	request.filterRules = [{filterRule:[]}];
	var filterRuleObj = request.filterRules[0].filterRule;

	var rules = this._vector.getArray();
	for (var i = 0; i < rules.length; i++) {
		var r = rules[i];
		var ruleObj = {
			active: r.active,
			name: r.name,
			filterActions: [],
			filterTests: []
		};
		ruleObj.filterActions.push(r.actions);
		ruleObj.filterTests.push(r.conditions);
		filterRuleObj.push(ruleObj);
	}

	var params = {
		jsonObj:jsonObj,
		asyncMode: true,
		callback: (new AjxCallback(this, this._handleResponseSaveRules, [index, notify, callback])),
		errorCallback: (new AjxCallback(this, this._handleErrorSaveRules))
	};
	appCtxt.getAppController().sendRequest(params);
};

ZmFilterRules.prototype._handleResponseSaveRules =
function(index, notify, callback, result) {
	if (notify) {
		this._notify(ZmEvent.E_MODIFY, {index: index});
	}

	appCtxt.setStatusMsg(ZmMsg.filtersSaved);

	if (callback) {
		callback.run(result);
	}
};

/**
* The save failed. Show an error dialog, then reload the rules and display them afresh.
* We do that because our internal version of the rules changed, but we couldn't save 
* them, and we don't want the list view to be out of sync with the list.
*
* @param ex		[AjxException]		exception
*/
ZmFilterRules.prototype._handleErrorSaveRules =
function(ex) {
	if (ex.code == ZmCsfeException.SVC_PARSE_ERROR ||
		ex.code == ZmCsfeException.SVC_INVALID_REQUEST)
	{
		var msgDialog = appCtxt.getMsgDialog();
		msgDialog.setMessage([ZmMsg.filterError, " ", ex.msg].join(""), DwtMessageDialog.CRITICAL_STYLE);
		msgDialog.popup();
		var respCallback = new AjxCallback(this, this._handleResponseHandleErrorSaveRules);
		this.loadRules(true, respCallback);
		return true;
	}
	return false;
};

// XXX: the caller should probably be the one doing this
ZmFilterRules.prototype._handleResponseHandleErrorSaveRules =
function() {
	var prefController = AjxDispatcher.run("GetPrefController");
	var prefsView = prefController.getPrefsView();
	var section = ZmPref.getPrefSectionWithPref(ZmSetting.FILTERS);
	if (section && prefsView && prefsView.getView(section.id)) {
		prefController.getFilterRulesController().resetListView();
	}
};

/**
* Inserts a rule into the internal vector. Adds to the end if no index is given.
*
* @param rule		[ZmFilterRule]		rule to insert
* @param index		[Integer]*			index at which to insert
*/
ZmFilterRules.prototype._insertRule = 
function(rule, index) {
	this._vector.add(rule, index);
	this._ruleIdHash[rule.id] = rule;
	this._ruleNameHash[rule.name] = rule;
};
