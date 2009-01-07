/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2004, 2005, 2006, 2007 Zimbra, Inc.
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
 * Creates and initializes the contacts application.
 * @constructor
 * @class
 * The contacts app manages the creation and display of contacts, which are grouped
 * into address books.
 * 
 * @author Conrad Damon
 */
ZmContactsApp = function(container, parentController) {

	ZmApp.call(this, ZmApp.CONTACTS, container, parentController);

	var settings = appCtxt.getSettings();
	settings.addChangeListener(new AjxListener(this, this._settingsChangeListener));

	this.contactsLoaded = {};
	this._contactList = {};		// canonical list by acct ID
	this._initialized = false;

	// contact lookup caches
	this._byEmail	= {};
	this._byIM		= {};
	this._byPhone	= {};
};

// Organizer and item-related constants
ZmEvent.S_CONTACT				= ZmId.ITEM_CONTACT;
ZmEvent.S_GROUP					= ZmId.ITEM_GROUP;
ZmItem.CONTACT					= ZmEvent.S_CONTACT;
ZmItem.GROUP					= ZmEvent.S_GROUP;
ZmOrganizer.ADDRBOOK			= ZmId.ORG_ADDRBOOK;

// App-related constants
ZmApp.CONTACTS							= ZmId.APP_CONTACTS;
ZmApp.CLASS[ZmApp.CONTACTS]				= "ZmContactsApp";
ZmApp.SETTING[ZmApp.CONTACTS]			= ZmSetting.CONTACTS_ENABLED;
ZmApp.UPSELL_SETTING[ZmApp.CONTACTS]	= ZmSetting.CONTACTS_UPSELL_ENABLED;
ZmApp.LOAD_SORT[ZmApp.CONTACTS]			= 30;
ZmApp.QS_ARG[ZmApp.CONTACTS]			= "contacts";

// search menu
ZmContactsApp.SEARCHFOR_CONTACTS 	= 1;
ZmContactsApp.SEARCHFOR_GAL 		= 2;
ZmContactsApp.SEARCHFOR_PAS			= 3; // PAS = personal and shared
ZmContactsApp.SEARCHFOR_MAX 		= 50;

ZmContactsApp.prototype = new ZmApp;
ZmContactsApp.prototype.constructor = ZmContactsApp;

ZmContactsApp.prototype.toString = 
function() {
	return "ZmContactsApp";
};

// Construction

ZmContactsApp.prototype._defineAPI =
function() {
	AjxDispatcher.setPackageLoadFunction("ContactsCore", new AjxCallback(this, this._postLoadCore));
	AjxDispatcher.setPackageLoadFunction("Contacts", new AjxCallback(this, this._postLoad, ZmOrganizer.ADDRBOOK));
	AjxDispatcher.registerMethod("GetContacts", "ContactsCore", new AjxCallback(this, this.getContactList));
	AjxDispatcher.registerMethod("GetContactListController", ["ContactsCore", "Contacts"], new AjxCallback(this, this.getContactListController));
	AjxDispatcher.registerMethod("GetContactController", ["ContactsCore", "Contacts"], new AjxCallback(this, this.getContactController));
};

ZmContactsApp.prototype._registerSettings =
function(settings) {
	var settings = settings || appCtxt.getSettings();
	settings.registerSetting("AUTO_ADD_ADDRESS",			{name: "zimbraPrefAutoAddAddressEnabled", type: ZmSetting.T_PREF, dataType: ZmSetting.D_BOOLEAN, defaultValue: false});
	settings.registerSetting("CONTACTS_PER_PAGE",			{name: "zimbraPrefContactsPerPage", type: ZmSetting.T_PREF, dataType: ZmSetting.D_INT, defaultValue: 25});
	settings.registerSetting("CONTACTS_VIEW",				{name: "zimbraPrefContactsInitialView", type: ZmSetting.T_PREF, defaultValue: ZmSetting.CV_LIST});
	settings.registerSetting("EXPORT",						{type: ZmSetting.T_PREF, dataType: ZmSetting.D_NONE});
	settings.registerSetting("GAL_AUTOCOMPLETE",			{name: "zimbraPrefGalAutoCompleteEnabled", type: ZmSetting.T_PREF, dataType: ZmSetting.D_BOOLEAN, defaultValue: false});
	settings.registerSetting("IMPORT",						{type: ZmSetting.T_PREF, dataType: ZmSetting.D_NONE});
	settings.registerSetting("MAX_CONTACTS",				{name: "zimbraContactMaxNumEntries", type: ZmSetting.T_COS, dataType: ZmSetting.D_INT, defaultValue: 0});
	settings.registerSetting("NEW_ADDR_BOOK_ENABLED",		{name: "zimbraFeatureNewAddrBookEnabled", type:ZmSetting.T_COS, dataType:ZmSetting.D_BOOLEAN, defaultValue:true});
};

ZmContactsApp.prototype._registerPrefs =
function() {
	var sections = {
		CONTACTS: {
			title: ZmMsg.addressBook,
			templateId: "prefs.Pages#Contacts",
			priority: 50,
			precondition: ZmSetting.CONTACTS_ENABLED,
			prefs: [
				ZmSetting.AUTO_ADD_ADDRESS,
				ZmSetting.CONTACTS_PER_PAGE,
				ZmSetting.CONTACTS_VIEW,
				ZmSetting.EXPORT,
				ZmSetting.GAL_AUTOCOMPLETE,
				ZmSetting.INITIALLY_SEARCH_GAL,
				ZmSetting.IMPORT
			]
		}
	};
	for (var id in sections) {
		ZmPref.registerPrefSection(id, sections[id]);
	}

	ZmPref.registerPref("AUTO_ADD_ADDRESS", {
		displayName:		ZmMsg.autoAddContacts,
		displayContainer:	ZmPref.TYPE_CHECKBOX
	});

	ZmPref.registerPref("CONTACTS_PER_PAGE", {
		displayName:		ZmMsg.contactsPerPage,
	 	displayContainer:	ZmPref.TYPE_SELECT,
		displayOptions:		["10", "25", "50", "100"]
	});

	ZmPref.registerPref("CONTACTS_VIEW", {
		displayName:		ZmMsg.viewContacts,
	 	displayContainer:	ZmPref.TYPE_SELECT,
		displayOptions:		[ZmMsg.detailedCards, ZmMsg.contactList],
		options:			[ZmSetting.CV_CARDS, ZmSetting.CV_LIST]
	});

	ZmPref.registerPref("EXPORT", {
		loadFunction:		ZmPref.loadCsvFormats,
		displayContainer:	ZmPref.TYPE_EXPORT
	});

	ZmPref.registerPref("GAL_AUTOCOMPLETE", {
		displayName:		ZmMsg.galAutocomplete,
		displayContainer:	ZmPref.TYPE_CHECKBOX,
		precondition:
			function() {
				return appCtxt.get(ZmSetting.GAL_AUTOCOMPLETE_ENABLED) &&
					   appCtxt.get(ZmSetting.GAL_ENABLED);
			}
	});

	ZmPref.registerPref("IMPORT", {
		displayName:		ZmMsg.importFromCSV,
		displayContainer:	ZmPref.TYPE_IMPORT
	});

	ZmPref.registerPref("INITIALLY_SEARCH_GAL", {
		displayName:		ZmMsg.initiallySearchGal,
		displayContainer:	ZmPref.TYPE_CHECKBOX,
		precondition:		ZmSetting.GAL_ENABLED
	});
};

ZmContactsApp.prototype._registerOperations =
function() {
	ZmOperation.registerOp(ZmId.OP_CONTACT);	// placeholder
	ZmOperation.registerOp(ZmId.OP_EDIT_CONTACT, {textKey:"AB_EDIT_CONTACT", image:"Edit", shortcut:ZmKeyMap.EDIT});
	ZmOperation.registerOp(ZmId.OP_MOUNT_ADDRBOOK, {textKey:"mountAddrBook", image:"ContactsFolder"});
	ZmOperation.registerOp(ZmId.OP_NEW_ADDRBOOK, {textKey:"newAddrBook", tooltipKey:"newAddrBookTooltip", image:"NewContactsFolder"}, ZmSetting.NEW_ADDR_BOOK_ENABLED);
	ZmOperation.registerOp(ZmId.OP_NEW_CONTACT, {textKey:"newContact", tooltipKey:"newContactTooltip", image:"NewContact", shortcut:ZmKeyMap.NEW_CONTACT}, ZmSetting.CONTACTS_ENABLED);
	ZmOperation.registerOp(ZmId.OP_NEW_GROUP, {textKey:"newGroup", tooltipKey:"newGroupTooltip", image:"NewGroup"}, ZmSetting.CONTACTS_ENABLED);
	ZmOperation.registerOp(ZmId.OP_PRINT_CONTACT, {textKey:"printContact", image:"Print", shortcut:ZmKeyMap.PRINT}, ZmSetting.PRINT_ENABLED);
	ZmOperation.registerOp(ZmId.OP_PRINT_ADDRBOOK, {textKey:"printAddrBook", image:"Print"}, ZmSetting.PRINT_ENABLED);
	ZmOperation.registerOp(ZmId.OP_SHARE_ADDRBOOK, {textKey:"shareAddrBook", image:"SharedContactsFolder"});
	ZmOperation.registerOp(ZmId.OP_SHOW_ONLY_CONTACTS, {textKey:"showOnlyContacts", image:"Contact"}, ZmSetting.MIXED_VIEW_ENABLED);
};

ZmContactsApp.prototype._registerItems =
function() {
	ZmItem.registerItem(ZmItem.CONTACT,
						{app:			ZmApp.CONTACTS,
						 nameKey:		"contact",
						 icon:			"Contact",
						 soapCmd:		"ContactAction",
						 itemClass:		"ZmContact",
						 node:			"cn",
						 organizer:		ZmOrganizer.ADDRBOOK,
						 dropTargets:	[ZmOrganizer.TAG, ZmOrganizer.ZIMLET, ZmOrganizer.ADDRBOOK],
						 searchType:	"contact",
						 resultsList:
		AjxCallback.simpleClosure(function(search) {
			AjxDispatcher.require("ContactsCore");
			return new ZmContactList(search, search ? search.isGalSearch || search.isGalAutocompleteSearch : null);
		}, this)
						});

	ZmItem.registerItem(ZmItem.GROUP,
						{nameKey:	"group",
						 icon:		"Group",
						 soapCmd:	"ContactAction"
						});
};

ZmContactsApp.prototype._registerOrganizers =
function() {
	var orgColor = {};
	orgColor[ZmFolder.ID_AUTO_ADDED] = ZmOrganizer.C_YELLOW;
	
	ZmOrganizer.registerOrg(ZmOrganizer.ADDRBOOK,
							{app:				ZmApp.CONTACTS,
							 nameKey:			"addressBook",
							 defaultFolder:		ZmOrganizer.ID_ADDRBOOK,
							 soapCmd:			"FolderAction",
							 firstUserId:		256,
							 orgClass:			"ZmAddrBook",
							 orgPackage:		"ContactsCore",
							 treeController:	"ZmAddrBookTreeController",
							 labelKey:			"addressBooks",
							 itemsKey:			"contacts",
							 hasColor:			true,
							 defaultColor:		ZmOrganizer.C_GRAY,
							 orgColor:			orgColor,
							 treeType:			ZmOrganizer.FOLDER,
							 dropTargets:		[ZmOrganizer.ADDRBOOK],
							 views:				["contact"],
							 folderKey:			"addressBookFolder",
							 mountKey:			"mountAddrBook",
							 createFunc:		"ZmOrganizer.create",
							 compareFunc:		"ZmAddrBook.sortCompare",
							 displayOrder:		100,
							 newOp:             ZmOperation.NEW_ADDRBOOK,
							 deferrable:		true
							});
};

ZmContactsApp.prototype._setupSearchToolbar =
function() {
	ZmSearchToolBar.addMenuItem(ZmItem.CONTACT,
								{msgKey:		"searchContacts",
								 tooltipKey:	"searchPersonalContacts",
								 icon:			"ContactsFolder",
								 shareIcon:		"SharedContactsFolder",
								 id:			ZmId.getMenuItemId(ZmId.SEARCH, ZmId.ITEM_CONTACT)
								});

	ZmSearchToolBar.addMenuItem(ZmId.SEARCH_GAL,
								{msgKey:		"searchGALContacts",
								 tooltipKey:	"searchGALContacts",
								 icon:			"GAL",
								 setting:		ZmSetting.GAL_ENABLED,
								 id:			ZmId.getMenuItemId(ZmId.SEARCH, ZmId.SEARCH_GAL)
								});
};

ZmContactsApp.prototype._registerApp =
function() {
	var newItemOps = {};
	newItemOps[ZmOperation.NEW_CONTACT]	= "contact";
	newItemOps[ZmOperation.NEW_GROUP]	= "group";

	var newOrgOps = {};
	newOrgOps[ZmOperation.NEW_ADDRBOOK] = "addressBook";

	var actionCodes = {};
	actionCodes[ZmKeyMap.NEW_CONTACT] = ZmOperation.NEW_CONTACT;

	ZmApp.registerApp(ZmApp.CONTACTS,
							 {mainPkg:				"Contacts",
							  nameKey:				"addressBook",
							  icon:					"ContactsApp",
							  chooserTooltipKey:	"goToContacts",
							  viewTooltipKey:		"displayContacts",
							  defaultSearch:		ZmItem.CONTACT,
							  organizer:			ZmOrganizer.ADDRBOOK,
							  overviewTrees:		[ZmOrganizer.ADDRBOOK, ZmOrganizer.SEARCH, ZmOrganizer.TAG],
							  showZimlets:			true,
							  assistants:			{"ZmContactAssistant":["ContactsCore", "Contacts"]},
							  searchTypes:			[ZmItem.CONTACT],
							  newItemOps:			newItemOps,
							  newOrgOps:			newOrgOps,
							  actionCodes:			actionCodes,
							  gotoActionCode:		ZmKeyMap.GOTO_CONTACTS,
							  newActionCode:		ZmKeyMap.NEW_CONTACT,
							  trashViewOp:			ZmOperation.SHOW_ONLY_CONTACTS,
							  chooserSort:			20,
							  defaultSort:			40,
							  upsellUrl:			ZmSetting.CONTACTS_UPSELL_URL,
							  supportsMultiMbox:	true
							  });
};


// App API

/*
ZmContactsApp.prototype.startup =
function(result) {
	AjxDispatcher.run("GetContacts");
};
*/

/**
 * Checks for the creation of an address book or a mount point to one. Regular
 * contact creates are handed to the canonical list.
 * 
 * @param creates	[hash]		hash of create notifications
 */
ZmContactsApp.prototype.createNotify =
function(creates, force) {
	if (!creates["folder"] && !creates["cn"] && !creates["link"]) { return; }
	if (!force && !this._noDefer && this._deferNotifications("create", creates)) { return; }

	for (var name in creates) {
		var list = creates[name];
		for (var i = 0; i < list.length; i++) {
			var create = list[i];
			if (appCtxt.cacheGet(create.id)) { continue; }

			if (name == "folder") {
				this._handleCreateFolder(create, ZmOrganizer.ADDRBOOK);
			} else if (name == "link") {
				this._handleCreateLink(create, ZmOrganizer.ADDRBOOK);
			} else if (name == "cn") {
				AjxDispatcher.run("GetContactListController").getList().notifyCreate(create);
				create._handled = true;
			}
		}
	}
};

ZmContactsApp.prototype.postNotify =
function(notify) {
	if (this._checkReplenishListView) {
		this._checkReplenishListView._checkReplenish();
		this._checkReplenishListView = null;
	}
};

ZmContactsApp.prototype.refresh =
function(refresh) {
	this._handleRefresh();
};

ZmContactsApp.prototype.handleOp =
function(op) {
	switch (op) {
		case ZmOperation.NEW_CONTACT:
		case ZmOperation.NEW_GROUP: {
			var type = (op == ZmOperation.NEW_GROUP) ? ZmItem.GROUP : null;
			var contact = new ZmContact(null, null, type);
			var loadCallback = new AjxCallback(this, this._handleLoadNewItem, [contact]);
			AjxDispatcher.require(["ContactsCore", "Contacts"], false, loadCallback, null, true);
			break;
		}
		case ZmOperation.NEW_ADDRBOOK: {
			var loadCallback = new AjxCallback(this, this._handleLoadNewAddrBook);
			AjxDispatcher.require(["ContactsCore", "Contacts"], false, loadCallback, null, true);
			break;
		}
	}
};

ZmContactsApp.prototype._handleLoadNewItem =
function(contact) {
	AjxDispatcher.run("GetContactController").show(contact);
};

ZmContactsApp.prototype._handleLoadNewAddrBook =
function() {
	appCtxt.getAppViewMgr().popView(true, ZmId.VIEW_LOADING);	// pop "Loading..." page
	var dialog = appCtxt.getNewAddrBookDialog();
	if (!this._newAddrBookCb) {
		this._newAddrBookCb = new AjxCallback(this, this._newAddrBookCallback);
	}
	ZmController.showDialog(dialog, this._newAddrBookCb);
};

// Public methods

ZmContactsApp.prototype.activate =
function(active) {
	ZmApp.prototype.activate.apply(this, arguments);
	if (!this._myCardChecked) {
		var myCardSupport = appCtxt.getSkinHint("myCardSupport");
		if (myCardSupport) {
			var root = appCtxt.getById(ZmOrganizer.ID_ROOT);
			var params = {
				id: ZmOrganizer.ID_MY_CARD,
				name: ZmMsg.myCard,
				parent: root,
				tree: root.tree,
				type: ZmOrganizer.ADDRBOOK,
				numTotal: 1
			};
			var addrBook = new ZmAddrBook(params);
			root.children.add(addrBook);
			addrBook._notify(ZmEvent.E_CREATE);

			// enable selection (ZmFolderTreeController creates tree as CHECKED style by default :| )
			var ti = appCtxt.getOverviewController().getOverview(this.getOverviewId()).getTreeItemById(addrBook.id, ZmOrganizer.ADDRBOOK);
			ti.enableSelection(true);
		}
		this._myCardChecked = true;
	}
};

ZmContactsApp.prototype.launch =
function(params, callback) {
	this._contactsSearch("in:contacts", callback);
};

ZmContactsApp.prototype._contactsSearch =
function(query, callback) {
	var params = {
		searchFor: ZmId.ITEM_CONTACT,
		query: query,
		types: [ZmId.ITEM_CONTACT],
		callback: callback
	};
	appCtxt.getSearchController().search(params);
};

ZmContactsApp.prototype.showSearchResults =
function(results, callback, isInGal, folderId) {
	var loadCallback = new AjxCallback(this, this._handleLoadShowSearchResults, [results, callback, isInGal, folderId]);
	AjxDispatcher.require("Contacts", false, loadCallback, null, true);
};

ZmContactsApp.prototype._handleLoadShowSearchResults =
function(results, callback, isInGal, folderId) {
	this.getContactListController().show(results, isInGal, folderId);
	if (callback) {
		callback.run();
	}
};

ZmContactsApp.prototype._activateAccordionItem =
function(accordionItem) {
	ZmApp.prototype._activateAccordionItem.call(this, accordionItem);
	var callback = (this._appViewMgr.getCurrentViewId() != ZmId.VIEW_GROUP)
		? new AjxCallback(this, this._handleResponseActivateAccordion) : null;

	this._contactsSearch("in:contacts", callback);
};

ZmContactsApp.prototype._handleResponseActivateAccordion =
function(contactList) {
	var fid = ZmOrganizer.getSystemId(ZmFolder.ID_CONTACTS);
	var folder = appCtxt.getById(fid);

	if (appCtxt.getAppViewMgr().getCurrentViewId() == ZmId.VIEW_CONTACT) {
		return;
	}

	if (folder) {
		var clc = AjxDispatcher.run("GetContactListController");
		clc.getParentView().getAlphabetBar().reset();

		var oc = appCtxt.getOverviewController();
		var tv = oc.getTreeController(ZmOrganizer.ADDRBOOK).getTreeView(this.getOverviewId());
		tv.setSelected(folder, true);
	}
};

ZmContactsApp.prototype.setActive =
function(active) {
	if (active) {
		var clc = AjxDispatcher.run("GetContactListController");
		clc.show();
	}
};

ZmContactsApp.prototype.isContactListLoaded =
function(acctId) {
	var aid = (acctId || appCtxt.getActiveAccount().id);
	return (this._contactList[aid] && this._contactList[aid].isLoaded);
};

/**
 * Returns the contact with the given address, if any. If it's not in our cache
 * and we are given a callback, we do a search.
 *
 * @param address	[string]		an email address
 * @param callback	[AjxCallback]*	callback to run
 */
ZmContactsApp.prototype.getContactByEmail =
function(address, callback) {
	if (!address) { return null; }
	var contact = this._byEmail[address.toLowerCase()];

	// handle case where we searched for a contact and didn't find one (don't repeat search)
	if (contact === null) {
		if (callback) { callback.run(null); }
		return null;
	}

	if (contact) {
		contact = this._realizeContact(contact);
		contact._lookupEmail = address;	// so caller knows which address matched
		if (callback) { callback.run(contact); }
		return contact;
	}

	if (callback) {
		var params = {query:address, limit:1, types:AjxVector.fromArray([ZmItem.CONTACT])};
		var search = new ZmSearch(params);
		var respCallback = new AjxCallback(this, this._handleResponseSearch, [address, callback]);
		var errorCallback = new AjxCallback(this, this._showDefaultParticipantToolTip, [address, callback]);
		search.execute({callback:respCallback, noBusyOverlay:true});
	}
};

ZmContactsApp.prototype._handleResponseSearch =
function(address, callback, result) {
	var resp = result.getResponse();
	var contactList = resp && resp.getResults(ZmItem.CONTACT);
	var contact = contactList ? contactList.get(0) : null;
	this._byEmail[address] = contact;
	callback.run(contact);
};

ZmContactsApp.prototype.getContactByIMAddress =
function(addr) {
	if (!addr) { return null; }
	var contact = this._byIM[addr.toLowerCase()];
	return this._realizeContact(contact);
};

/**
* Returns information about the contact with the given phone number, if any.
* Canonical list only.
*
* @param phone	[string]	a phone number
* @return		[Object]	an object with contact = the contact & field = the field with the matching phone number
*/
ZmContactsApp.prototype.getContactByPhone =
function(phone) {
	if (!phone) { return null; }
	var digits = phone.replace(/[^\d]/g, '');
	var data = this._phoneToContact[digits];
	if (data) {
		data.contact = this._realizeContact(data.contact);
	}
	return data;
};

ZmContactsApp.prototype._realizeContact =
function(contact) {
	var acctId = appCtxt.getActiveAccount().id;
	var cl = this._contactList[acctId];
	return cl ? cl._realizeContact(contact) : contact;
}

ZmContactsApp.prototype.updateCache =
function(contact, doAdd) {

	this._updateHash(contact, doAdd, ZmContact.F_EMAIL_FIELDS, this._byEmail);
	if (appCtxt.get(ZmSetting.VOICE_ENABLED)) {
		this._updateHash(contact, doAdd, ZmContact.F_PHONE_FIELDS, this._byPhone, true, true);
	}
	if (appCtxt.get(ZmSetting.IM_ENABLED)) {
		this._updateHash(contact, doAdd, ZmContact.F_IM_FIELDS, this._byIM);
	}
};

ZmContactsApp.prototype._updateHash =
function(contact, doAdd, fields, hash, includeField, isNumeric) {

	for (var i = 0; i < fields.length; i++) {
		var field = fields[i];
		var value = ZmContact.getAttr(contact, fields[i]);
		if (value) {
			value = isNumeric ? value.replace(/[^\d]/g, '') : value.toLowerCase();
			if (doAdd) {
				hash[value] = includeField ? contact : {contact:contact, field:field};
			} else {
				delete hash[value];
			}
		}
	}
};

/**
 * Returns a ZmContactList with all of the user's local contacts. If that's a large
 * number, performance may be slow.
 * 
 * @param callback
 * @param errorCallback
 */
ZmContactsApp.prototype.getContactList =
function(callback, errorCallback) {
	var acctId = appCtxt.getActiveAccount().id;
	if (!this._contactList[acctId]) {
		try {
			// check if a parent controller exists and ask it for the contact list
			if (this._parentController) {
				this._contactList[acctId] = this._parentController.getApp(ZmApp.CONTACTS).getContactList();
			} else {
				this._contactList[acctId] = new ZmContactList(null);
				var respCallback = new AjxCallback(this, this._handleResponseGetContactList, [callback]);
				this._contactList[acctId].load(respCallback, errorCallback);
			}
			return this._contactList[acctId];
		} catch (ex) {
			this._contactList[acctId] = null;
			throw ex;
		}
	} else {
		if (callback && callback.run) {
			callback.run(this._contactList[acctId]);
		}
		return this._contactList[acctId];
	}
};

ZmContactsApp.prototype._handleResponseGetContactList =
function(callback) {
	var acctId = appCtxt.getActiveAccount().id;
	this.contactsLoaded[acctId] = true;

	if (callback && callback.run) {
		callback.run(this._contactList[acctId]);
	}
};

// NOTE: calling method should handle exceptions!
ZmContactsApp.prototype.getGalContactList =
function() {
	if (!this._galContactList) {
		try {
			this._galContactList = new ZmContactList(null, true);
			this._galContactList.load();
		} catch (ex) {
			this._galContactList = null;
			throw ex;
		}
	}
	return this._galContactList;
};

ZmContactsApp.prototype.createFromVCard =
function(msgId, vcardPartId) {
	var contact = new ZmContact(null);
	contact.createFromVCard(msgId, vcardPartId);
};

ZmContactsApp.prototype.getMyCard =
function(callback) {
    if (this._myCard) {
		this._myCard = this._realizeContact(this._myCard);
		callback.run(this._myCard);
    } else {
		var sc = appCtxt.getSearchController();
		var respCallback = new AjxCallback(this, this._handleResponseGetMyCard, [callback]);
		sc.search({query:"#cardOwner:isMyCard", types:[ZmItem.CONTACT], noRender:true, callback:respCallback});
	}
};

ZmContactsApp.prototype._handleResponseGetMyCard =
function(callback, result) {
	var resp = result.getResponse();
	var cl = resp && resp.getResults(ZmItem.CONTACT);
	this._myCard = cl ? cl.get(0) : null;
	callback.run(this._myCard);
};

ZmContactsApp.prototype.getContactListController =
function() {
	if (!this._contactListController) {
		this._contactListController = new ZmContactListController(this._container, this);
	}
	return this._contactListController;
};

ZmContactsApp.prototype.getContactController =
function() {
	if (this._contactController == null) {
		this._contactController = new ZmContactController(this._container, this);
	}
	return this._contactController;
};

ZmContactsApp.prototype._newAddrBookCallback =
function(parent, name, color) {
	// REVISIT: Do we really want to close the dialog before we
	//          know if the create succeeds or fails?
	var dialog = appCtxt.getNewAddrBookDialog();
	dialog.popdown();

	var oc = appCtxt.getOverviewController();
	oc.getTreeController(ZmOrganizer.ADDRBOOK)._doCreate(parent, name, color);
};

/**
 * Settings listener.
 */
ZmContactsApp.prototype._settingsChangeListener =
function(ev) {
	if (ev.type != ZmEvent.S_SETTINGS) { return; }
	if (!this._initialized) { return; }
	var clc = this.getContactListController();
	if (!clc) { return; }

	var list = ev.getDetail("settings");
	if (!(list && list.length)) { return; }

	var force = ((list.length == 1) && (list[0].id == ZmSetting.CONTACTS_PER_PAGE));
	var view = clc._getViewType();
	if (!force) {
		for (var i = 0; i < list.length; i++) {
			var setting = list[i];
			if (setting.id == ZmSetting.CONTACTS_VIEW) {
				view = clc._defaultView();
			}
		}
	}

	clc.switchView(view, force, this._initialized, true);
};
