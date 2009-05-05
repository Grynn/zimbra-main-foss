/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2007, 2008, 2009 Zimbra, Inc.
 * 
 * The contents of this file are subject to the Yahoo! Public License
 * Version 1.0 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * ***** END LICENSE BLOCK *****
 */

ZmBriefcaseApp = function(container, parentController) {
	ZmApp.call(this, ZmApp.BRIEFCASE, container, parentController);

	this._notebookCache = null;
};

ZmBriefcaseApp.prototype = new ZmApp;
ZmBriefcaseApp.prototype.constructor = ZmBriefcaseApp;

// Constants

// Organizer and item-related constants
ZmEvent.S_PAGE						= ZmId.ITEM_PAGE;
ZmEvent.S_DOCUMENT					= ZmId.ITEM_DOCUMENT;
ZmEvent.S_BRIEFCASE					= ZmId.ITEM_BRIEFCASE;
ZmItem.PAGE							= ZmEvent.S_PAGE;
ZmItem.DOCUMENT						= ZmEvent.S_DOCUMENT;
ZmItem.BRIEFCASE					= ZmEvent.S_BRIEFCASE;
ZmOrganizer.BRIEFCASE				= ZmId.ORG_BRIEFCASE;

// App-related constants
ZmApp.BRIEFCASE						= ZmId.APP_BRIEFCASE;
ZmApp.CLASS[ZmApp.BRIEFCASE]		= "ZmBriefcaseApp";
ZmApp.SETTING[ZmApp.BRIEFCASE]		= ZmSetting.BRIEFCASE_ENABLED;
ZmApp.LOAD_SORT[ZmApp.BRIEFCASE]	= 65;
ZmApp.QS_ARG[ZmApp.BRIEFCASE]		= "briefcase";
ZmApp.BUTTON_ID[ZmApp.BRIEFCASE]	= ZmId.BRIEFCASE_APP;


ZmBriefcaseApp.prototype.toString =
function() {
	return "ZmBriefcaseApp";
};

ZmBriefcaseApp.prototype._defineAPI =
function() {
	AjxDispatcher.setPackageLoadFunction("BriefcaseCore", new AjxCallback(this, this._postLoadCore));
	AjxDispatcher.setPackageLoadFunction("Briefcase", new AjxCallback(this, this._postLoad, ZmOrganizer.BRIEFCASE));
	AjxDispatcher.registerMethod("GetBriefcaseController", ["BriefcaseCore", "Briefcase"], new AjxCallback(this, this.getBriefcaseController));
};

ZmBriefcaseApp.prototype._registerOperations =
function() {
	ZmOperation.registerOp(ZmId.OP_NEW_BRIEFCASEITEM, {textKey:"newBriefcase", image:"NewFolder", tooltipKey:"newBriefcaseTooltip", shortcut:ZmKeyMap.NEW_BRIEFCASEITEM});
	ZmOperation.registerOp(ZmId.OP_NEW_FILE, {textKey:"uploadNewFile", tooltipKey:"uploadNewFile", image:"NewPage"});
    ZmOperation.registerOp(ZmId.OP_NEW_PRESENTATION, {textKey:"newPresentation", tooltipKey:"newPresentation", image:"MSPowerpointDoc"});
    ZmOperation.registerOp(ZmId.OP_NEW_SPREADSHEET, {textKey:"newSpreadsheet", tooltipKey:"newSpreadsheet", image:"ZSpreadSheet"});
	ZmOperation.registerOp(ZmId.OP_SHARE_BRIEFCASE, {textKey:"shareFolder", image:"SharedMailFolder"}, ZmSetting.SHARING_ENABLED);
	ZmOperation.registerOp(ZmId.OP_MOUNT_BRIEFCASE, {textKey:"mountBriefcase", image:"Notebook"}, ZmSetting.SHARING_ENABLED);
	ZmOperation.registerOp(ZmId.OP_OPEN_FILE, {textKey:"openFile", tooltipKey:"openFileTooltip", image:"NewPage"});
	ZmOperation.registerOp(ZmId.OP_SAVE_FILE, {textKey:"saveFile", tooltipKey:"saveFileTooltip", image:"Save"});
	ZmOperation.registerOp(ZmId.OP_VIEW_FILE_AS_HTML, {textKey:"viewAsHtml", tooltipKey:"viewAsHtml", image:"HtmlDoc"});
	ZmOperation.registerOp(ZmId.OP_SEND_FILE, {textKey:"sendLink", tooltipKey:"sendLink", image:"Send"});
	ZmOperation.registerOp(ZmId.OP_SEND_FILE_AS_ATT, {textKey:"sendAsAttachment", tooltipKey:"sendAsAttachment", image:"Attachment"});
    ZmOperation.registerOp(ZmId.OP_SEND_FILE_MENU, {textKey:"send", image:"Send"});
};

ZmBriefcaseApp.prototype._registerItems =
function() {
	ZmItem.registerItem(ZmItem.BRIEFCASE,
					{app:			ZmApp.BRIEFCASE,
					 nameKey:		"document",
					 icon:			"GenericDoc",
					 soapCmd:		"ItemAction",
					 itemClass:		"ZmBriefcaseItem",
					 node:			"doc",
					 organizer:		ZmOrganizer.BRIEFCASE,
					 dropTargets:	[ZmOrganizer.TAG, ZmOrganizer.BRIEFCASE],
					 searchType:	"document",
					 resultsList:
					AjxCallback.simpleClosure(function(search) {
					AjxDispatcher.require("BriefcaseCore");
					return new ZmBriefcaseItemList(search, ZmItem.BRIEFCASE);
					}, this)
					});
};

ZmBriefcaseApp.prototype._registerOrganizers =
function() {
	ZmOrganizer.registerOrg(ZmOrganizer.BRIEFCASE,
							{ app            : ZmApp.BRIEFCASE,
							  nameKey        : "folders",
							  defaultFolder  : ZmOrganizer.ID_BRIEFCASE,
							  soapCmd        : "FolderAction",
							  firstUserId    : 256,
							  orgClass       : "ZmBriefcase",
							  orgPackage     : "BriefcaseCore",
							  treeController : "ZmBriefcaseTreeController",
							  labelKey       : "folders",
							  itemsKey       : "folders",
							  treeType       : ZmOrganizer.FOLDER,
							  views          : ["document"],
							  folderKey      : "briefcase",
							  mountKey       : "mountFolder",
							  createFunc     : "ZmOrganizer.create",
							  compareFunc    : "ZmBriefcase.sortCompare",
							  deferrable     : true,
							  newOp			 : ZmOperation.NEW_BRIEFCASEITEM,
							  displayOrder	 : 100,
							  hasColor       : true,
                              childWindow    : true  
							});
};

ZmBriefcaseApp.prototype._setupSearchToolbar =
function() {
	//TODO:search for page alone
	ZmSearchToolBar.addMenuItem(ZmItem.BRIEFCASE,
								{msgKey:		"searchBriefcase",
								 tooltipKey:	"searchForFiles",
								 icon:			"Folder",
                                 shareIcon:		"SharedBriefcase",
								 setting:		ZmSetting.BRIEFCASE_ENABLED,
								 id:			ZmId.getMenuItemId(ZmId.SEARCH, ZmId.ITEM_BRIEFCASE)
								});
};

ZmBriefcaseApp.prototype._registerApp =
function() {
	var newItemOps = {};
	newItemOps[ZmOperation.NEW_FILE]         = "uploadNewFile";
	newItemOps[ZmOperation.NEW_PRESENTATION] = "newPresentation";
    newItemOps[ZmOperation.NEW_SPREADSHEET]  = "newSpreadSheet"

	var newOrgOps = {};
	newOrgOps[ZmOperation.NEW_BRIEFCASEITEM] = "briefcase";

	var actionCodes = {};
	actionCodes[ZmKeyMap.NEW_FILE]			= ZmOperation.NEW_FILE;
	actionCodes[ZmKeyMap.NEW_BRIEFCASEITEM]	= ZmOperation.NEW_BRIEFCASEITEM;
	actionCodes[ZmKeyMap.NEW_PRESENTATION]	= ZmOperation.NEW_PRESENTATION;
    actionCodes[ZmKeyMap.NEW_SPREADSHEET]   = ZmOperation.NEW_SPREADSHEET;

	ZmApp.registerApp(ZmApp.BRIEFCASE,
					 {mainPkg:				"Briefcase",
					  nameKey:				"briefcase",
					  icon:					"Folder",
					  textPrecedence:		30,
					  chooserTooltipKey:	"gotoBriefcase",
					  defaultSearch:		ZmItem.BRIEFCASE,
					  organizer:			ZmOrganizer.BRIEFCASE,
					  overviewTrees:		[ZmOrganizer.BRIEFCASE, ZmOrganizer.TAG],
					  showZimlets:			true,
					  searchTypes:			[ZmItem.BRIEFCASE/*, ZmItem.DOCUMENT*/],
					  newItemOps:			newItemOps,
					  newOrgOps:			newOrgOps,
					  actionCodes:			actionCodes,
					  gotoActionCode:		ZmKeyMap.GOTO_BRIEFCASE,
					  newActionCode:		ZmKeyMap.NEW_FILE,
					  chooserSort:			70,
					  defaultSort:			60,
					  supportsMultiMbox:	true
					  });
};

// App API

ZmBriefcaseApp.prototype.deleteNotify =
function(ids, force) {

	if (!force && this._deferNotifications("delete", ids)) { return; }

	var bc = AjxDispatcher.run("GetBriefcaseController");
	for (var i = 0; i < ids.length; i++) {
		// FIXME: sometimes ids[i] is null, which suggests a bug somewhere in
		//        ZmApp.js(?) should investigate
		var item = bc.getItemById(ids[i]);
		if (item) {
			item.notifyDelete();
			bc.removeItem(item);
		}
	}
};

/**
 * Checks for the creation of a notebook or a mount point to one, or of a page
 * or document.
 *
 * @param creates	[hash]		hash of create notifications
 */
ZmBriefcaseApp.prototype.createNotify =
function(creates, force) {
	if (!creates["folder"] && !creates["doc"] && !creates["link"]) { return; }
	if (!force && !this._noDefer && this._deferNotifications("create", creates)) { return; }

	var bc = AjxDispatcher.run("GetBriefcaseController");
    var needsRefresh = false;

    for (var name in creates) {
		var list = creates[name];
		for (var i = 0; i < list.length; i++) {
			var create = list[i];
			if (appCtxt.cacheGet(create.id)) { continue; }
			if (name == "folder") {
				this._handleCreateFolder(create, ZmOrganizer.BRIEFCASE);
			} else if (name == "link") {
				this._handleCreateLink(create, ZmOrganizer.BRIEFCASE);
			} else if (name == "doc") {
                if(create.l == bc._currentFolder) {
					needsRefresh = true;
				}
			}
		}
	}
    if(needsRefresh) {
        bc.reloadFolder();
    }
};

ZmBriefcaseApp.prototype.modifyNotify =
function(modifies, force) {
	if (!modifies["doc"]) { return; }

	//TODO: implement modified notification
	if (!force && !this._noDefer && this._deferNotifications("modify", modifies)) { return; }

	var briefcaseController = this.getBriefcaseController();
    var needsRefresh = false;

	for (var name in modifies) {
		var list = modifies[name];
		for (var i = 0; i < list.length; i++) {
			var mod = list[i];
			var id = mod.id;
			if (!id) { continue; }

			 if (name == "doc") {
				DBG.println(AjxDebug.DBG2, "ZmBriefcaseApp: handling modified notif for ID " + id + ", node type = " + name);
				// REVISIT: Use app context item cache
				var doc = briefcaseController.getItemById(id);
				if (doc) {
					doc.notifyModify(mod);
					doc.set(mod);
				}
				mod._handled = true;
			}else if (name == "folder") {
				var currentFolderId = briefcaseController.getCurrentFolderId();
                if(appCtxt.getById(id) &&  (appCtxt.getById(id).nId == currentFolderId || id == currentFolderId)) {
                    needsRefresh = true;
					mod._handled = true;
                }
             }
		}
	}

	if(needsRefresh) {
		briefcaseController.reloadFolder();
	}
};

ZmBriefcaseApp.prototype.handleOp =
function(op) {
	switch (op) {
		case ZmOperation.NEW_FILE: {
			var loadCallback = new AjxCallback(this, this._handleNewItem);
			AjxDispatcher.require(["BriefcaseCore", "Briefcase"], false, loadCallback, null, true);
			break;
		}
		case ZmOperation.NEW_BRIEFCASEITEM: {
			var loadCallback = new AjxCallback(this, this._handleLoadNewBriefcaseItem);
			AjxDispatcher.require(["BriefcaseCore", "Briefcase"], false, loadCallback, null, true);
			break;
		}
        case ZmOperation.NEW_PRESENTATION:         {
			var loadCallback = new AjxCallback(this, this._handleNewDoc, [op]);
			AjxDispatcher.require(["BriefcaseCore", "Briefcase"], true, loadCallback, null);
			break;
		}

         case ZmOperation.NEW_SPREADSHEET: {
             var newDocCallback = new AjxCallback(this, this.newDoc, [ZmMimeTable.APP_ZIMBRA_SPREADSHEET]);
             AjxDispatcher.require(["BriefcaseCore", "Briefcase"], true, newDocCallback, null);
             break;
         }
	}
};

ZmBriefcaseApp.prototype._handleNewDoc =
function(op) {
    AjxDispatcher.require("IM");
    var promptDialog =  ZmPromptDialog.getInstance()
    var newDocOkCallbackObj =  new AjxCallback(this, this._newDocOkCallback, [op, promptDialog]);

    var title = ZmMsg.briefcaseCreateNewDocument;
    var label = ZmMsg.documentName;

    if(op == ZmOperation.NEW_PRESENTATION) {
        title =  ZmMsg.briefcaseCreateNewPresentation;
        label = ZmMsg.presentationName;
    }

    var dialogArgs = {
        title: title,
        label: label,
        callback: newDocOkCallbackObj
    };
    promptDialog.popup(dialogArgs);
};

ZmBriefcaseApp.prototype._newDocOkCallback =
function(op, promptDialog, data) {
    var message;
    if (!data.value) {
        message = ZmMsg.nameEmpty;
    }

    promptDialog.popdown();

    if (message) {
        var dialog = appCtxt.getMsgDialog();
        dialog.reset();
        dialog.setMessage(message, DwtMessageDialog.CRITICAL_STYLE);
        dialog.popup();
    }else {
        AjxDispatcher.require("Startup1_1");
        var contentType = ZmMimeTable.APP_ZIMBRA_DOC;
        switch(op) {
            case ZmOperation.NEW_PRESENTATION: contentType = ZmMimeTable.APP_ZIMBRA_SLIDES; break;
        }

        var overviewController = appCtxt.getOverviewController();
        var treeController = overviewController.getTreeController(ZmOrganizer.NOTEBOOK);
        var folderId = ZmOrganizer.ID_BRIEFCASE;
        if(treeController) {
            var treeView = treeController.getTreeView(this.getOverviewId());
            var briefcase = treeView ? treeView.getSelected() : null;
            folderId = briefcase ? briefcase.id : ZmOrganizer.ID_BRIEFCASE;
        }

        var slideURL = this.getEditURLForContentType(contentType) + "?name=" + data.value + "&l=" + folderId;
        var winname = "_newslide" +  data.value;
        var winfeatures = [
            "width=",(screen.width || 640),",",
            "height=",(screen.height || 480),",",
            "resizable,toolbar=no,menubar=no,fullscreen=yes,location=no,status=no",
            "fullscreen=yes"
        ].join("");
        var win = open(slideURL, winname, winfeatures);
    }
};

ZmBriefcaseApp.prototype.newDoc = function(contentType, name, winName){

    var overviewController = appCtxt.getOverviewController();
    var treeController = overviewController.getTreeController(ZmOrganizer.NOTEBOOK);
    var folderId = ZmOrganizer.ID_BRIEFCASE;
    if(treeController) {
        var treeView = treeController.getTreeView(this.getOverviewId());
        var briefcase = treeView ? treeView.getSelected() : null;
        folderId = briefcase ? briefcase.id : ZmOrganizer.ID_BRIEFCASE;
    }

    var url = this.getEditURLForContentType(contentType) + "?" + (name ?"name=" + name + "&" : "") + "l="+folderId;
    var winname = winName || name;
    window.open(url, winname); 
};

ZmBriefcaseApp.prototype.getEditURLForContentType =
function(contentType) {
    AjxDispatcher.require("Startup1_1");
    var editPage = "Slides.jsp";
    switch(contentType) {
        case ZmMimeTable.APP_ZIMBRA_SLIDES:         editPage = "Slides.jsp"; break;
        case ZmMimeTable.APP_ZIMBRA_SPREADSHEET:    editPage = "SpreadsheetDoc.jsp"; break;
        default: return null;
    };
    var editURL = appContextPath + "/public/" +  editPage;
    return editURL;
};

ZmBriefcaseApp.prototype.isDoclet =
function(item) {
    var contentType = item.getContentType();
    switch(contentType) {
        case ZmMimeTable.APP_ZIMBRA_SLIDES:
                                            return true;
        default: return false;
    };
    return false;
};


ZmBriefcaseApp.prototype._handleNewItem =
function() {
	appCtxt.getAppViewMgr().popView(true, ZmId.VIEW_LOADING);	// pop "Loading..." page
	var callback = new AjxCallback(this, this._handleUploadNewItem);
	this.getBriefcaseController().__popupUploadDialog(callback, ZmMsg.uploadFileToBriefcase);
};

ZmBriefcaseApp.prototype._handleUploadNewItem =
function(folder,filenames) {
	var bc = this.getBriefcaseController();
	bc.refreshFolder();
};

ZmBriefcaseApp.prototype._handleLoadNewBriefcaseItem =
function() {
	appCtxt.getAppViewMgr().popView(true, ZmId.VIEW_LOADING); // pop "Loading..." page

	if (!this._newNotebookCb) {
		this._newNotebookCb = new AjxCallback(this, this._newBriefcaseCallback);
	}
	ZmController.showDialog(appCtxt.getNewBriefcaseDialog(), this._newNotebookCb);
};


// Public methods

ZmBriefcaseApp.prototype.launch =
function(params, callback) {
	var loadCallback = new AjxCallback(this, this._handleLoadLaunch, [callback]);
	AjxDispatcher.require(["BriefcaseCore","Briefcase"], true, loadCallback, null, true);
};

ZmBriefcaseApp.prototype._handleLoadLaunch =
function(callback) {
	this.getBriefcaseController().show(null,true);
	if (callback) { callback.run(); }
};

ZmBriefcaseApp.prototype.showSearchResults =
function(results, callback) {
	var loadCallback = new AjxCallback(this, this._handleLoadShowSearchResults, [results, callback]);
	AjxDispatcher.require(["BriefcaseCore", "Briefcase"], false, loadCallback, null, true);
};

ZmBriefcaseApp.prototype._handleLoadShowSearchResults =
function(results, callback) {
    this.getBriefcaseController().showFolderContents(results.getResults(ZmItem.MIXED));
    if (callback) { callback.run(); }
};

ZmBriefcaseApp.prototype.setActive =
function(active) {
};

ZmBriefcaseApp.prototype._newBriefcaseCallback =
function(parent, name, color) {
	appCtxt.getNewBriefcaseDialog().popdown();
	var oc = appCtxt.getOverviewController();
	oc.getTreeController(ZmOrganizer.BRIEFCASE)._doCreate(parent, name, color);
};

ZmBriefcaseApp.prototype.getBriefcaseController =
function() {
	if (!this._briefcaseController) {
		this._briefcaseController = new ZmBriefcaseController(this._container, this);
	}
	return this._briefcaseController;
};

ZmBriefcaseApp.prototype.createFromAttachment =
function(msgId, partId,name) {
	var loadCallback = new AjxCallback(this,this._handleCreateFromAttachment,[msgId,partId,name]);
	AjxDispatcher.require(["BriefcaseCore","Briefcase"], false, loadCallback);
};

ZmBriefcaseApp.prototype._handleCreateFromAttachment =
function(msgId, partId, name) {
	if (this._deferredFolders.length != 0) {
		this._createDeferredFolders(ZmApp.BRIEFCASE);
	}
	var copyToDialog = this._copyToDialog = appCtxt.getChooseFolderDialog();
	var chooseCb = new AjxCallback(this, this._chooserCallback,[msgId,partId,name]);
	ZmController.showDialog(copyToDialog, chooseCb, this._getCopyParams(msgId, partId));
};


ZmBriefcaseApp.prototype._getCopyParams =
function(msgId, partId) {
	return {
		data: {msgId:msgId,partId:partId},
		treeIds: [ZmOrganizer.BRIEFCASE],
		overviewId: "ZmBriefcaseApp",
		title: ZmMsg.addToBriefcaseTitle,
		description: ZmMsg.targetFolder
	};
};

ZmBriefcaseApp.prototype._chooserCallback =
function(msgId, partId, name, folder) {
	var callback = new AjxCallback(this, this.handleDuplicateCheck, [msgId, partId, name, folder.id]);
	this.getBriefcaseController().getItemsInFolder(folder.id, callback);
};

ZmBriefcaseApp.prototype.handleDuplicateCheck =
function(msgId, partId, name, folderId,items) {

	var bController = this.getBriefcaseController();
	if (bController.isReadOnly(folderId)) {
		ZmOrganizer._showErrorMsg(ZmMsg.errorPermission);
		return;
	}

	if (bController.isShared(folderId)) {
		if(msgId.indexOf(":") < 0){ //for shared folder, use fully qualified msg id if it is not already
           msgId = appCtxt.getActiveAccount().id + ":" + msgId; 
        }
	}

	var itemFound = false;
	
	if(items instanceof ZmList) {
        items = items.getArray();
    }

    for (var i in items) {
		var item = items[i];
		if (item.name == name) {
			itemFound = true;
			break;
		}
	}

	if (!itemFound) {
		var srcData = new ZmBriefcaseItem();
		srcData.createFromAttachment(msgId, partId, name, folderId);
	} else {
		var	msg = AjxMessageFormat.format(ZmMsg.errorFileAlreadyExists, name);
		ZmOrganizer._showErrorMsg(msg);
	}
};

ZmBriefcaseApp.prototype.fixCrossDomainReference =
function(url, restUrlAuthority) {
	var urlParts = AjxStringUtil.parseURL(url);
	if (urlParts.authority != window.location.host) {
		if ((restUrlAuthority && url.indexOf(restUrlAuthority) >=0) || !restUrlAuthority) {
			var oldRef = urlParts.protocol + "://" + urlParts.authority;
			var newRef = window.location.protocol + "//" + window.location.host;
			url = url.replace(oldRef, newRef);
		}
	}
	return url;
};

ZmBriefcaseApp.prototype._activateAccordionItem =
function(accordionItem) {
	ZmApp.prototype._activateAccordionItem.call(this, accordionItem);

	var bc = AjxDispatcher.run("GetBriefcaseController");
	bc.handleMailboxChange();
};