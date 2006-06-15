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
* Create a new, empty contact list.
* @constructor
* @class
* This class represents a list of contacts. It may be a user contact list, or the
* global address list (aka GAL). A hash matching email addresses to contacts is
* maintained for convenience.
* <p>
* Full contact data (attributes and their values) is only loaded once, so there is
* only one instance of this class that is fully populated. Other instances (such as
* those created by a search) will have minimal data, and will get their attribute
* values from the canonical list.</p>
* <p>
* Also, loading has been optimized by delaying the creation of ZmContact objects until
* they are needed. That has a big impact on IE, and not much on Firefox. Loading a subset
* of attributes did not have much impact on load time, probably because a large majority
* of contacts contain only those minimal fields.</p>
*
* @author Conrad Damon
*
* @param appCtxt	[ZmAppCtxt]		the app context
* @param search		[ZmSearch]*		search that generated this list
* @param isGal		[boolean]*		if true, this is a list of GAL contacts
* @param type		[constant]*		item type
*/
function ZmContactList(appCtxt, search, isGal, type) {
	
	if (arguments.length == 0) return;
	type = type ? type : ZmItem.CONTACT;
	ZmList.call(this, type, appCtxt, search);

	this.isGal = (isGal === true);
	this.isCanonical = false;

	this._emailToContact = {};
	this._acAddrList = {};
	this._galResults = {};
	this._loadCount = 0;
	this._loaded = false;
	this._showStatus = true;

	this._acMatchFields = ZmContactList.AC_FIELDS;
	this._galAutocompleteEnabled = this._appCtxt.get(ZmSetting.GAL_AUTOCOMPLETE_ENABLED);
};

ZmContactList.prototype = new ZmList;
ZmContactList.prototype.constructor = ZmContactList;


// Constants

// fields used for autocomplete matching
ZmContactList.AC_FIELDS 		= [ZmContact.F_firstName, ZmContact.F_lastName, ZmContact.X_fullName, ZmContact.X_firstLast,
								   ZmContact.F_email, ZmContact.F_email2, ZmContact.F_email3];
ZmContactList.AC_NAME_FIELDS	= [ZmContact.F_firstName, ZmContact.F_lastName];
ZmContactList.AC_VALUE_FULL 	= "fullAddress";
ZmContactList.AC_VALUE_EMAIL	= "email";
ZmContactList.AC_VALUE_NAME		= "name";
ZmContactList.AC_MAX 			= 20;	// max # of autocomplete matches to return
ZmContactList.AC_PREMATCH		= 2;	// # of characters to do pre-matching for

// Load contacts in chunks so browser remains reasonably responsive.
// To increase browser responsiveness, lower the chunk size and increase the
// delay (of course, it will then take longer to load the contacts).
ZmContactList.MAX_LOAD_COUNT	= AjxEnv.isIE ? 100 : 500;	// chunk size for loading contacts
ZmContactList.LOAD_PAUSE		= AjxEnv.isIE ? 500 : 250;	// delay between chunks

ZmContactList.GAL_RESULTS_TTL	= 900000;	// time-to-live for cached GAL autocomplete results

ZmContactList.prototype.toString =
function() {
	return "ZmContactList";
};

/**
* Retrieves the contacts from the back end, and parses the response. The list is then sorted.
* This method is used only by the canonical list of contacts, in order to load their content.
* <p>
* Loading a minimal set of attributes did not result in a significant performance gain.</p>
*/
ZmContactList.prototype.load =
function(callback, errorCallback) {

	// only the canonical list gets loaded
	DBG.println(AjxDebug.DBG1, "loading contacts");
	this.isCanonical = true;
	var soapDoc = AjxSoapDoc.create("GetContactsRequest", "urn:zimbraMail");
	// set sorting pref (for now, always sort by name asc)
	var method = soapDoc.getMethod();
	method.setAttribute("sortBy", "nameAsc");

	var respCallback = new AjxCallback(this, this._handleResponseLoad, [callback]);
	DBG.timePt("requesting contact list", true);
	this._appCtxt.getAppController().sendRequest({soapDoc: soapDoc, asyncMode: true,
												  callback: respCallback, errorCallback: errorCallback});
};

ZmContactList.prototype._handleResponseLoad =
function(callback, result) {
	DBG.timePt("got contact list");
	var list = result.getResponse().GetContactsResponse.cn;
	if (list) {
		if (list.length > ZmContactList.MAX_LOAD_COUNT) {
			this._loadAction = new AjxTimedAction(this, this._smartLoad, [list]);
		}
		this.set(list);
	} else {
		this._loaded = true; // user has no contacts
	}
	if (callback) callback.run();
};

ZmContactList.prototype.set =
function(list) {
	this.clear();
	this._smartLoad(list);
};

ZmContactList.prototype._smartLoad =
function(list) {
	DBG.timePt("loading contacts - " + this._loadCount);
	var diff = list.length - this._loadCount;
	var limit = diff < ZmContactList.MAX_LOAD_COUNT ? (diff + this._loadCount) :
													  (ZmContactList.MAX_LOAD_COUNT + this._loadCount);

	for (var i = this._loadCount; i < limit; i++) {
		var contact = list[i];
		if (!contact._attrs) contact._attrs = {}; // handle empty contacts
		// note that we don't create a ZmContact here (optimization)
		contact.list = this;
		this._updateEmailHash(contact, true);
		contact._attrs[ZmContact.X_fullName] = AjxStringUtil.trim(([contact._attrs[ZmContact.F_firstName],
		                                       contact._attrs[ZmContact.F_middleName],
		                                       contact._attrs[ZmContact.F_lastName]]).join(" "));
		contact._attrs[ZmContact.X_firstLast] = AjxStringUtil.trim(([contact._attrs[ZmContact.F_firstName],
		                                        contact._attrs[ZmContact.F_lastName]]).join(" "));
		if (!ZmContact.isInTrash(contact)) {
			this._preMatch(contact);
		}
		this.add(contact);
	}

	if (i < (list.length - 1) && this._loadAction) {
		this._loadCount = i;
		AjxTimedAction.scheduleAction(this._loadAction, ZmContactList.LOAD_PAUSE);
	} else {
		DBG.timePt("done loading contacts");
		this._loaded = true;
	}
};

ZmContactList.prototype.addFromDom =
function(node, args) {
	// first make sure this contact isnt already in the canonical list
	var canonicalList = this._appCtxt.getApp(ZmZimbraMail.CONTACTS_APP).getContactList();
	var contact = canonicalList.getById(node.id);
	if (contact) {
		// NOTE: we dont realize contact b/c getById already does that for us
		// Also, set sf property if not set (we get it on search results, not GetContactResponse)
		contact.sf = contact.sf || node.sf;
		this.add(contact);
	} else {
		ZmList.prototype.addFromDom.call(this, node, args);
	}
};

/**
* Returns true if contacts have finished loading.
*/
ZmContactList.prototype.isLoaded =
function() {
	return this._loaded;
};

/*
* Converts an anonymous contact object (contained by the JS returned by load request)
* into a ZmContact, and updates the containing list if it is the canonical one.
*
* @param contact	[object]	a contact
* @param idx		[int]*		index of contact in canonical list
*/
ZmContactList.prototype._realizeContact =
function(contact, idx) {
	if (contact instanceof ZmContact)
		return contact;

	var args = {appCtxt:this._appCtxt, addressHash:{}, list:this};
	var obj = eval(ZmList.ITEM_CLASS[this.type]);
	var realContact = obj ? obj.createFromDom(contact, args) : null;

	if (this.isCanonical) {
		var a = this.getArray();
		idx = idx || this._getIndexById(contact.id);
		a[idx] = realContact;
		this._updateEmailHash(realContact, true);
		this._idHash[contact.id] = realContact;
	}

	return realContact;
};

/*
* Finds the array index for the contact with the given ID.
*
* @param id		[int]		a contact ID
*/
ZmContactList.prototype._getIndexById =
function(id) {
	var a = this.getArray();
	for (var i = 0; i < a.length; i++) {
		if (a[i].id == id)
			return i;
	}
	return null;
};

/**
* Override in order to make sure the contacts have been realized. We don't
* call realizeContact() since this is not the canonical list.
*
* @param offset		[int]		starting index
* @param limit		[int]		size of sublist
*/
ZmContactList.prototype.getSubList =
function(offset, limit, folderId) {
	if (this.isCanonical) {
		// only collect those contacts that belong to the given folderId if provided
		var newlist = new Array();
		var sublist = this.getArray();
		var offsetCount = 0;
		this.setHasMore(false);

		for (var i = 0; i < sublist.length; i++) {
			sublist[i] = this._realizeContact(sublist[i], i);
			if (sublist[i].folderId == folderId) {
				if (offsetCount >= offset) {
					if (newlist.length == limit) {
						this.setHasMore(true);
						break;
					}
					newlist.push(sublist[i]);
				}
				offsetCount++;
			}
		}

		return AjxVector.fromArray(newlist);
	} else {
		var vec = ZmList.prototype.getSubList.call(this, offset, limit);
		if (vec) {
			var a = vec.getArray();
			for (var i = 0; i < a.length; i++) {
				a[i] = this._realizeContact(a[i], offset + i);
			}
		}

		return vec;
	}
};

/**
* Override in order to make sure the contact has been realized. Canonical list only.
* Returns a ZmContact.
*
* @param id		[int]		a contact ID
*/
ZmContactList.prototype.getById =
function(id) {
	if (!id || !this.isCanonical) return null;

	var contact = this._idHash[id];
	return contact ? this._realizeContact(contact) : null;
};

/**
* Returns the contact with the given address, if any. Canonical list only.
*
* @param address	[string]	an email address
*/
ZmContactList.prototype.getContactByEmail =
function(address) {
	if (!address || !this.isCanonical) return null;

	var contact = this._emailToContact[address.toLowerCase()];
	return contact ? this._realizeContact(contact) : null;
};

/**
* Moves a list of items to the given folder.
* <p>
* This method calls the base class for normal "moves" UNLESS we're dealing w/
* shared items (or folder) in which case we must send a CREATE request for the
* given folder to the server followed by a hard delete of the shared contact
* (this is temporary, until we get better server support).
* </p>
*
* @param items		[Array]			a list of items to move
* @param folder		[ZmFolder]		destination folder
* @param attrs		[Object]		additional attrs for SOAP command
*/
ZmContactList.prototype.moveItems =
function(items, folder, attrs) {
	if (!(items instanceof Array)) items = [items];

	var moveBatchCmd = new ZmBatchCommand(this._appCtxt);
	var loadBatchCmd = new ZmBatchCommand(this._appCtxt);
	var softMove = [];
	var hardMove = [];

	// if the folder we're moving contacts to is a shared folder, then dont bother
	// checking whether each item is shared or not
	for (var i = 0; i < items.length; i++) {
		var contact = items[i];

		if (contact.isReadOnly())
			continue;

		if (contact.isShared() || folder.link) {
			hardMove.push(contact);
			if (contact.isLoaded()) {
				moveBatchCmd.add(this._getCopyCmd(contact, folder));
			} else {
				var loadCallback = new AjxCallback(this, this._handleResponseBatchLoad, [moveBatchCmd, folder]);
				var cmd = new AjxCallback(contact, contact.load, [loadCallback, null]);
				loadBatchCmd.add(cmd);
			}
		} else {
			softMove.push(contact);
		}
	}

	if (hardMove.length > 0) {
		if (loadBatchCmd.size()) {
			var respCallback = new AjxCallback(this, this._handleResponseLoadMove, [moveBatchCmd, hardMove]);
			loadBatchCmd.run(respCallback);
		} else {
			var deleteCmd = new AjxCallback(this, this._itemAction, [{items:hardMove, action:"delete"}]);
			moveBatchCmd.add(deleteCmd);

			var respCallback = new AjxCallback(this, this._handleResponseMoveBatchCmd);
			moveBatchCmd.run(respCallback);
		}
	}

	// just call the base class for "soft" moves
	if (softMove.length > 0) {
		ZmList.prototype.moveItems.call(this, softMove, folder, attrs);
	}
};

/**
* Copies a list of items to the given folder.
* <p>
* Search results are treated as though they're in a temporary folder, so that they behave as
* they would if they were in any other folder such as Inbox.
* </p>
*
* @param items		[Array]			a list of items to move
* @param folder		[ZmFolder]		destination folder
* @param attrs		[Object]		additional attrs for SOAP command
*/
ZmContactList.prototype.copyItems =
function(items, folder, attrs) {
	// Since we may be sharing with multiple users, use a batch command
	var copyBatchCmd = new ZmBatchCommand(this._appCtxt);
	var loadBatchCmd = new ZmBatchCommand(this._appCtxt);

	for (var i = 0; i  < items.length; i++) {
		var contact = items[i];
		if (contact.isLoaded()) {
			copyBatchCmd.add(this._getCopyCmd(contact, folder));
		} else {
			// if not loaded, lets try to batch-load contacts before trying to copy them
			var loadCallback = new AjxCallback(this, this._handleResponseBatchLoad, [copyBatchCmd, folder]);
			var cmd = new AjxCallback(contact, contact.load, [loadCallback, null]);
			loadBatchCmd.add(cmd);
		}
	}

	if (loadBatchCmd.size()) {
		var respCallback = new AjxCallback(this, this._handleResponseLoadCopy, [copyBatchCmd]);
		loadBatchCmd.run(respCallback);
	} else {
		var respCallback = new AjxCallback(this, this._handleResponseCopyBatchCmd);
		copyBatchCmd.run(respCallback);
	}
};

ZmContactList.prototype._handleResponseCopyBatchCmd =
function(result) {
	var resp = result.getResponse().BatchResponse.CreateContactResponse;
	var msg = AjxMessageFormat.format(ZmMsg.contactCopied, resp.length)
	this._appCtxt.getAppController().setStatusMsg(msg);
};

ZmContactList.prototype._handleResponseLoadCopy =
function(copyBatchCmd, result) {
	var respCallback = new AjxCallback(this, this._handleResponseCopyBatchCmd);
	copyBatchCmd.run(respCallback);
};

ZmContactList.prototype._handleResponseMoveBatchCmd =
function(result) {
	var resp = result.getResponse().BatchResponse.ContactActionResponse;
	// XXX: b/c the server does not return notifications for actions done on
	//      shares, we manually notify - TEMP UNTIL WE GET BETTER SERVER SUPPORT
	var ids = resp[0].action.id.split(",");
	for (var i = 0; i < ids.length; i++) {
		var contact = this._appCtxt.cacheGet(ids[i]);
		if (contact && contact.isShared()) {
			contact.notifyDelete();
			this._appCtxt.getItemCache().clear(ids[i]);
		}
	}
};

ZmContactList.prototype._handleResponseLoadMove =
function(moveBatchCmd, hardMove) {
	var deleteCmd = new AjxCallback(this, this._itemAction, [{items:hardMove, action:"delete"}]);
	moveBatchCmd.add(deleteCmd);

	var respCallback = new AjxCallback(this, this._handleResponseMoveBatchCmd);
	moveBatchCmd.run(respCallback);
};

ZmContactList.prototype._handleResponseBatchLoad =
function(batchCmd, folder, result, contact) {
	batchCmd.add(this._getCopyCmd(contact, folder));
};

ZmContactList.prototype._getCopyCmd =
function(contact, folder) {
	var temp = new ZmContact(this._appCtxt, null, this);
	for (var j in contact.attr)
		temp.attr[j] = contact.attr[j];
	temp.attr[ZmContact.F_folderId] = folder.id;

	return new AjxCallback(temp, temp.create, [temp.attr]);
};

/**
* Deletes contacts after checking that this is not a GAL list.
*
* @param items		[Array]			list of contacts to delete
* @param hardDelete	[boolean]		whether to force physical removal of items
* @param attrs		[Object]		hash of additional attrs for SOAP command
*/
ZmContactList.prototype.deleteItems =
function(items, hardDelete, attrs) {
	if (this.isGal) {
		DBG.println(AjxDebug.DBG1, "Cannot delete GAL contacts");
		return;
	}
	ZmList.prototype.deleteItems.call(this, items, hardDelete, attrs);
};

/**
* Returns true if the given string maps to a single contact. Used by autocomplete.
*
* @param str		string to test for uniqueness
*/
ZmContactList.prototype.isUniqueValue =
function(str) {
	return (this.getContactByEmail(str) != null);
};

ZmContactList.prototype.setIsGal =
function(isGal) {
	this.isGal = isGal;
};

/**
* Overridden to prevent the adding of the same contact more than once by a single
* notification. Of course, once the user reloads, they'll see duplicates if the
* server in fact created them.
*/
ZmContactList.prototype.notifyCreate =
function(node) {
	// we comment this out to allow duplicate copies now that we have shared contacts
//	if (this.getContactByEmail(node._attrs.email)) return;
	ZmList.prototype.notifyCreate.call(this, node);
};

ZmContactList.prototype.moveLocal =
function(items, folderId) {
	// don't remove any contacts from the canonical list
	if (!this.isCanonical)
		ZmList.prototype.moveLocal.call(this, items, folderId);
	if (folderId == ZmFolder.ID_TRASH) {
		for (var i = 0; i < items.length; i++) {
			this._updateEmailHash(items[i], false);
			this._updateAcList(items[i], false);
		}
	}
};

ZmContactList.prototype.deleteLocal =
function(items) {
	ZmList.prototype.deleteLocal.call(this, items);
	for (var i = 0; i < items.length; i++) {
		this._updateEmailHash(items[i], false);
		this._updateAcList(items[i], false);
	}
}

// Handle modified contact.
ZmContactList.prototype.modifyLocal =
function(item, details) {
	if (details) {
		// notify item's list
		details.items = [item];
		this._notify(ZmEvent.E_MODIFY, details);
	}

	var contact = details.contact;
	if (this.isCanonical) {
		// Remove traces of old contact - NOTE: we pass in null for the ID on
		// PURPOSE to avoid overwriting the existing cached contact
		var oldContact = new ZmContact(this._appCtxt, null, this);
		oldContact.id = details.contact.id;
		oldContact.attr = details.oldAttr;
		this._updateEmailHash(oldContact, false);
		this._updateAcList(oldContact, false);

		// add new contact to hashes
		this._updateEmailHash(contact, true);
		this._updateAcList(contact, true);
	}

	// place in correct position in list
	if (details.fileAsChanged) {
		this.remove(contact);
		this.add(contact, this._sortIndex(contact));
	}

	// reset addrbook property
	if (contact.addrbook.id != contact.folderId)
		contact.addrbook = this._appCtxt.getTree(ZmOrganizer.ADDRBOOK).getById(contact.folderId);
};

ZmContactList.prototype.createLocal =
function(item) {
	this._updateEmailHash(item, true);
	this._updateAcList(item, true);
};

ZmContactList.prototype._updateEmailHash =
function(contact, doAdd) {
	for (var i = 0; i < ZmContact.F_EMAIL_FIELDS.length; i++) {
		var email = ZmContact.getAttr(contact, ZmContact.F_EMAIL_FIELDS[i]);
		if (email) {
			if (doAdd)
				this._emailToContact[email.toLowerCase()] = contact;
			else
				delete this._emailToContact[email.toLowerCase()];
		}
	}
};

// Returns the position at which the given contact should be inserted in this list.
ZmContactList.prototype._sortIndex =
function(contact) {
	var a = this._vector.getArray();
	for (var i = 0; i < a.length; i++)
		if (ZmContact.compareByFileAs(a[i], contact) > 0)
			return i;
	return a.length;
};

ZmContactList.prototype._handleResponseModifyItem =
function(item, result) {
	// NOTE: we overload and do nothing b/c base class does more than we want
	//       (since everything is handled by notifications)
};

/**
* Returns a list of matching contacts for a given string. The first name, last
* name, full name, first/last name, and email addresses are matched against.
*
* @param str		[string]		string to match against
* @param callback	[AjxCallback]	callback to run with results
*/
ZmContactList.prototype.autocompleteMatch =
function(str, callback) {
	DBG.println(AjxDebug.DBG3, "begin contact matching");
	this._acAddrList[str] = this._acAddrList[str] ? this._acAddrList[str] : [];

	// if personal contacts haven't finished loading, don't return any results (even
	// though we could still search the GAL)
	if (!this.isLoaded()) {
		if (this._showStatus) {
			this._appCtxt.setStatusMsg(ZmMsg.autocompleteNotReady, ZmStatusView.LEVEL_WARNING);
			this._showStatus = false; // only show status message once
		}
		callback.run(null);
		return;
	}

	str = str.toLowerCase();
	var strLen = str.length;
	var gotData = false;

	DBG.println(AjxDebug.DBG3, "str = " + str);

	// see if we have GAL results we can use
	if (this._galAutocompleteEnabled) {
		var old = (new Date()).getTime() - ZmContactList.GAL_RESULTS_TTL;
		if (this._galResults[str] && (this._galResults[str].ts > old)) {
			DBG.println(AjxDebug.DBG3, "Found GAL results for " + str);
			gotData = true;
		} else {
			// do we have recent and complete GAL results for part of this string?
			var tmp = str;
			var list = null;
			while (tmp && !list) {
				tmp = tmp.slice(0, -1); // remove last character
				if (tmp && this._galResults[tmp] && (this._galResults[tmp].ts > old) && !this._galResults[tmp].more) {
					DBG.println(AjxDebug.DBG3, "Found GAL results for substring " + tmp);
					gotData = true;
					break;
				}
			}
		}
	} else {
		gotData = true;
	}

	if (!gotData) {
		var respCallback = new AjxCallback(this, this._handleResponseAutocompleteMatch, [str, callback]);
		this._getGalMatches(str, respCallback);
	} else {
		this._handleResponseAutocompleteMatch(str, callback);
	}
};

ZmContactList.prototype._handleResponseAutocompleteMatch =
function(str, callback) {

	// by this point, we have GAL results

	// have we already done this string?
	if (this._matchingDone(str)) {
		DBG.println(AjxDebug.DBG3, "found previous match for " + str);
		DBG.timePt("end autocomplete match - found previous match");
		var matchList = this._matchList(str);
		callback.run(matchList);
		return;
	}

	var newList = [];

	// have we done part of this string?
	var tmp = str;
	var list = null;
	while (tmp && !list) {
		tmp = tmp.slice(0, -1); // remove last character
		list = (tmp && this._matchingDone(tmp)) ? this._acAddrList[tmp] : null;
		if (list && list.length == 0) {
			// substring had no matches, so this string has none
			DBG.println(AjxDebug.DBG3, "Found empty results for substring " + tmp);
			DBG.timePt("end autocomplete match - no matches");
			callback.run(null);
			return;
		}
	}

	if (list) {
		// found a substring that we've already done matching for
		DBG.println(AjxDebug.DBG3, "working forward from '" + tmp + "'");
		var len = list.length;
		// test each of the substring's matches to see if it also matches this string
		for (var i = 0; i < len; i++) {
			var contact = list[i];
			if ((!contact.isGal && this._acAddrList[str].matchingDone) ||
				(contact.isGal && this._acAddrList[str].galMatchingDone)) {
				continue;
			}
			if (this._testAcMatch(contact, str)) {
				this._acAddrList[str].push(contact);
			}
		}
	} else {
		// initial matching against all contacts
		DBG.println(AjxDebug.DBG2, "creating new match list for '" + str + "'");
		list = this.getArray();
		for (var i = 0; i < list.length; i++) {
			var contact = list[i];
			if ((!contact.isGal && this._acAddrList[str].matchingDone) ||
				(contact.isGal && this._acAddrList[str].galMatchingDone)) {
				continue;
			}
			if (this._testAcMatch(contact, str)) {
				this._acAddrList[str].push(contact.id);
			}
		}
	}
	this._acAddrList[str].matchingDone = true;
	this._acAddrList[str].galMatchingDone = true;

	// by this point all matching has been done and we should have
	// a list of zero or more matches for this string
	DBG.timePt("end autocomplete match");
	var matchList = this._matchList(str);
	DBG.println(AjxDebug.DBG3, "Returning list of matches");
	callback.run(matchList);
};

/*
 * Returns true if both local and GAL matching have been done for the given string.
 *
 * @param str		[string]		string to match against
 */
ZmContactList.prototype._matchingDone =
function(str) {
	var localDone = (this._acAddrList[str] && this._acAddrList[str].matchingDone);
	var galDone = (!this._galAutocompleteEnabled ||
				   ((this._acAddrList[str] && this._acAddrList[str].galMatchingDone)));
	return (localDone && galDone);
};

/*
* Fills in matches for strings up to two characters.
*
* @param contact	[object]	a contact
*/
ZmContactList.prototype._preMatch =
function(contact) {
	if (!ZmContactList.AC_PREMATCH) {return;}
	var strings = {};
	for (var i = 0; i < this._acMatchFields.length; i++) {
		// placeholder objects (ZmContactList) will have _attrs
		// realized objects (ZmResourceList) will have attr
		var value = contact._attrs ? contact._attrs[this._acMatchFields[i]] :
									 contact.attr ? contact.attr[this._acMatchFields[i]] : null;
		if (value) {
			for (var j = 1; j <= ZmContactList.AC_PREMATCH; j++) {
				var str = value.substring(0, j).toLowerCase();
				if (!strings[str]) {
					this._acAddrList[str] = this._acAddrList[str] ? this._acAddrList[str] : [];
					this._acAddrList[str].push(contact.id);
					strings[str] = true;
					this._acAddrList[str].matchingDone = true;
				}
			}
		}
	}
};

/*
* Tests a string against various fields of a contact to see if the contact matches.
* Contacts that are in the Trash will always fail to match.
*
* @param contact	[ZmContact|object|string]	contact or ID
* @param str		[string]					test string
* @param doMarkup	[boolean]					if true, return highlighted value and matched field
*/
ZmContactList.prototype._testAcMatch =
function(contact, str, doMarkup) {
	contact = (contact instanceof ZmContact) ? contact : (contact && contact.id) ? this.getById(contact.id) : this.getById(contact);
	if (!contact || ZmContact.isInTrash(contact)) return false;

	for (var i = 0; i < this._acMatchFields.length;i++) {
		var field = this._acMatchFields[i];
		var value = ZmContact.getAttr(contact, field);
		if (value && (value.toLowerCase().indexOf(str) == 0)) {
			if (doMarkup) {
				try {
					var regex = new RegExp("^(" + str + ")", "i");
					savedMatch = value.replace(regex, "<b>$1</b>");
				} catch (ex) {}	// illegal regex attempt - do nothing...
				return {savedMatch: savedMatch, matchedField: field};
			} else {
				return contact.id;
			}
		}
	}
	if (contact.isGal && doMarkup) {
		// if GAL match doesn't also match manually, assume full name matched
		return {savedMatch: ZmContact.getAttr(ZmContact.X_fullName, contact), matchField: ZmContact.X_fullName};
	} else {
		return null;
	}
};

/*
* Returns a list of no more than the maximum number of matches. Each item in the list
* is a matching object from which the caller selects the data it needs.
*
* @param str		[string]	string to match against
*/
ZmContactList.prototype._matchList =
function(str) {
	var list = this._acAddrList[str];
	if (!(list && list.length)) return null;

	// truncate list
	list = list.slice(0, ZmContactList.AC_MAX);

	// cull duplicates based on email
	var emails = {};

	// expand contacts with multiple email addresses
	var results = [];
	for (var i = 0; i < list.length; i++) {
		var matches = this._getMatches(list[i], str);
		if (matches && matches.length) {
			for (var j = 0; j < matches.length; j++) {
				var email = matches[j][ZmContactList.AC_VALUE_EMAIL];
				if (!emails[email]) {
					results.push(matches[j]);
					emails[email] = true;
				}
			}
		}
	}

	results = results.slice(0, ZmContactList.AC_MAX);	// truncate in case we added more contacts
	results.sort(ZmContactList.acSortCompare);			// sort list by displayed text
	return results;
};

/*
 * Sort autocomplete list by the displayed text (minus HTML)
 */
ZmContactList.acSortCompare =
function(a, b) {
	if (a.plain.toLowerCase() > b.plain.toLowerCase()) return 1;
	if (a.plain.toLowerCase() < b.plain.toLowerCase()) return -1;
	return 0;
};

/*
* Creates the matching object(s) for a particular matched contact. If a contact has multiple
* email addresses and didn't match on one of them (it matched on a name), then a matching
* object will be created for each email address.
*
* @param contact	[ZmContact|object|string]	contact or ID
* @param str		[string]					string that was matched
*/
ZmContactList.prototype._getMatches =
function(contact, str) {
	contact = (contact instanceof ZmContact) ? contact : (contact && contact.id) ? this.getById(contact.id) : this.getById(contact);
	var match = this._testAcMatch(contact, str, true);
	if (!match) {
		DBG.println(AjxDebug.DBG1, "Matched contact with ID " + contact.id + " no longer matches '" + str + "' (possibly deleted)");
		return null;
	}

	var name;
	if (match.matchedField == ZmContact.X_fullName || match.matchedField == ZmContact.X_firstLast) {
		// if one of these matched, it will already be highlighted
		name = match.savedMatch;
	} else {
		// construct name - first or last may have matched and been highlighted
		var names = [];
		for (var i = 0; i < ZmContactList.AC_NAME_FIELDS.length; i++) {
			var field = ZmContactList.AC_NAME_FIELDS[i];
			var val = ZmContact.getAttr(contact, field);
			if (val) {
				names.push((match.matchedField == field) ? match.savedMatch : val);
			}
		}
		name = names.join(" ");
	}
	var results = [];
	var fullName = ZmContact.getAttr(contact, ZmContact.X_fullName);
	if (match.matchedField == ZmContact.F_email || match.matchedField == ZmContact.F_email2 || match.matchedField == ZmContact.F_email3) {
		results.push(this._createMatch(name, match.savedMatch, fullName, ZmContact.getAttr(contact, match.matchedField), contact));
	} else {
		for (var i = 0; i < ZmContact.F_EMAIL_FIELDS.length; i++) {
			var val = ZmContact.getAttr(contact, ZmContact.F_EMAIL_FIELDS[i]);
			if (val) {
				results.push(this._createMatch(name, val, fullName, val, contact));
			}
		}
	}

	return results;
};

/*
* Creates a match object from the given fields.
*
* @param nameHL		[string]		full name (may have highlighting)
* @param emailHL	[string]		email address (may have highlighting)
* @param name		[string]		full name
* @param email		[string]		email address (for sending message)
* @param contact	[ZmContact]		the matched contact
*/
ZmContactList.prototype._createMatch =
function(nameHL, emailHL, name, email, contact) {
	var result = {};
	result.text = [nameHL, " &lt;", emailHL, "&gt;"].join("");
	result.plain = result.text.replace(/<\/?b>/g, "");	// for sorting results
	result.item = contact;
	result[ZmContactList.AC_VALUE_FULL] = ['"', name, '" <', email, ">"].join("");
	result[ZmContactList.AC_VALUE_EMAIL] = email;
	result[ZmContactList.AC_VALUE_NAME] = name;

	return result;
};

/*
* Adds or removes a contact from its matching strings.
*
* @param contact	[object]		contact to add or remove
* @param doAdd		[boolean]		if true, contact was added
*/
ZmContactList.prototype._updateAcList =
function(contact, doAdd) {
	for (var str in this._acAddrList) {
		var list = this._acAddrList[str];
		if (doAdd) {
			if (this._testAcMatch(contact, str)) {
				list.push(contact.id);
			}
		} else {
			var newMatches = [];
			for (var i = 0; i < list.length; i++) {
				if (list[i] != contact.id) {
					newMatches.push(list[i]);
				}
			}
			this._acAddrList[str] = newMatches;
		}
	}
};

/*
 * Fetches GAL matches for the given string from the server.
 *
 * @param str		[string]	string to match against
 */
ZmContactList.prototype._getGalMatches =
function(str, callback) {
	var sortBy = ZmSearch.NAME_DESC;
	var types = AjxVector.fromArray([ZmItem.CONTACT]);
	var params = {query: str, types: types, sortBy: sortBy, offset: 0, limit: ZmContactList.AC_MAX, isGalAutocompleteSearch: true};
	var search = new ZmSearch(this._appCtxt, params);
	var respCallback = new AjxCallback(this, this._handleResponseGetGalMatches, [str, callback]);
	search.execute({callback: respCallback});
};

ZmContactList.prototype._handleResponseGetGalMatches =
function(str, callback, result) {
	var resp = result.getResponse();
	var list = resp.getResults(ZmItem.CONTACT);
	var a = list ? list.getArray() : [];

	this._acAddrList[str] = this._acAddrList[str] ? this._acAddrList[str] : [];
	for (var i = 0; i < a.length; i++) {
		this._acAddrList[str].push(a[i]);
	}
	this._acAddrList[str].galMatchingDone = true;

	this._galResults[str] = {};
	this._galResults[str].ts = (new Date()).getTime();
	this._galResults[str].more = resp._respEl.more;

	callback.run();
};
