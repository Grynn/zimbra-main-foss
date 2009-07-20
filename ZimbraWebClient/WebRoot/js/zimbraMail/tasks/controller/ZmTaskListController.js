/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2006, 2007, 2008, 2009 Zimbra, Inc.
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

ZmTaskListController = function(container, app) {

	ZmListController.call(this, container, app);

	this._dragSrc = new DwtDragSource(Dwt.DND_DROP_MOVE);
	this._dragSrc.addDragListener(new AjxListener(this, this._dragListener));

	this._listeners[ZmOperation.EDIT] = new AjxListener(this, this._editListener);
	this._listeners[ZmOperation.PRINT] = null; // override base class to do nothing
	this._listeners[ZmOperation.PRINT_TASK] = new AjxListener(this, this._printTaskListener);
	this._listeners[ZmOperation.PRINT_TASKFOLDER] = new AjxListener(this, this._printTaskFolderListener);

	this._currentTaskView = ZmId.VIEW_TASK_ALL;
};

ZmTaskListController.prototype = new ZmListController;
ZmTaskListController.prototype.constructor = ZmTaskListController;


// Consts
ZmTaskListController.VIEWS = [
	ZmId.VIEW_TASK_NOT_STARTED,
	ZmId.VIEW_TASK_COMPLETED,
	ZmId.VIEW_TASK_IN_PROGRESS,
	ZmId.VIEW_TASK_WAITING,
	ZmId.VIEW_TASK_DEFERRED,
	ZmId.VIEW_TASK_ALL
];

ZmTaskListController.ICON = {};
ZmTaskListController.ICON[ZmId.VIEW_TASK_NOT_STARTED]		= "TaskViewNotStarted";
ZmTaskListController.ICON[ZmId.VIEW_TASK_COMPLETED]			= "TaskViewCompleted";
ZmTaskListController.ICON[ZmId.VIEW_TASK_IN_PROGRESS]		= "TaskViewInProgress";
ZmTaskListController.ICON[ZmId.VIEW_TASK_WAITING]			= "TaskViewWaiting";
ZmTaskListController.ICON[ZmId.VIEW_TASK_DEFERRED]			= "TaskViewDeferred";
ZmTaskListController.ICON[ZmId.VIEW_TASK_ALL]				= "TaskList";

ZmTaskListController.MSG_KEY = {};
ZmTaskListController.MSG_KEY[ZmId.VIEW_TASK_NOT_STARTED]	= "notStarted";
ZmTaskListController.MSG_KEY[ZmId.VIEW_TASK_COMPLETED]		= "completed";
ZmTaskListController.MSG_KEY[ZmId.VIEW_TASK_IN_PROGRESS]	= "inProgress";
ZmTaskListController.MSG_KEY[ZmId.VIEW_TASK_WAITING]		= "waitingOn";
ZmTaskListController.MSG_KEY[ZmId.VIEW_TASK_DEFERRED]		= "deferred";
ZmTaskListController.MSG_KEY[ZmId.VIEW_TASK_ALL]			= "all";

ZmTaskListController.SOAP_STATUS = {};
ZmTaskListController.SOAP_STATUS[ZmId.VIEW_TASK_NOT_STARTED]= "NEED";
ZmTaskListController.SOAP_STATUS[ZmId.VIEW_TASK_COMPLETED]	= "COMP";
ZmTaskListController.SOAP_STATUS[ZmId.VIEW_TASK_IN_PROGRESS]= "INPR";
ZmTaskListController.SOAP_STATUS[ZmId.VIEW_TASK_WAITING]	= "WAITING";
ZmTaskListController.SOAP_STATUS[ZmId.VIEW_TASK_DEFERRED]	= "DEFERRED";


// Public methods

ZmTaskListController.prototype.toString =
function() {
	return "ZmTaskListController";
};

ZmTaskListController.prototype.show =
function(list, folderId) {
	this._folderId = folderId;

	// XXX: will "list" ever be ZmTaskList?
	if (list instanceof ZmTaskList)
	{
		this._list = list;			// set as canonical list of contacts
		this._list._isShared = false;		// this list is not a search of shared items
	}
	else if (list instanceof ZmSearchResult)
	{
		this._list = list.getResults(ZmItem.TASK);

		// XXX: WHY?
		// find out if we just searched for a shared address book
		var folder = appCtxt.getById(folderId);
		this._list._isShared = folder ? folder.link : false;
		this._list.setHasMore(list.getAttribute("more"));
	}

	ZmListController.prototype.show.call(this, list);

	this._setup(this._currentView);

	// reset offset if list view has been created
	var lv = this._listView[this._currentView];
	if (lv) { lv.offset = 0; }

	var elements = {};
	elements[ZmAppViewMgr.C_TOOLBAR_TOP] = this._toolbar[this._currentView];
	elements[ZmAppViewMgr.C_APP_CONTENT] = lv;

	this._setView({view:this._currentView, elements:elements, isAppView:true});

	this._setTabGroup(this._tabGroups[this._currentView]);
	this._resetNavToolBarButtons(this._currentView);
};

ZmTaskListController.prototype.switchView =
function(view) {
	if (this._currentTaskView == view) { return; }

	this._currentTaskView = view;

	// always reset the view menu button icon to reflect the current view
	var btn = this._toolbar[this._currentView].getButton(ZmOperation.VIEW_MENU);
	btn.setImage(ZmTaskListController.ICON[view]);

	var sc = appCtxt.getSearchController();
	var soapStatus = ZmTaskListController.SOAP_STATUS[view];
	sc.redoSearch(appCtxt.getCurrentSearch(), false, {allowableTaskStatus:soapStatus});
};

ZmTaskListController.prototype.getAllowableTaskStatus =
function() {
	var tb = this._toolbar && this._toolbar[this._currentView];
	var menu = tb ? tb.getButton(ZmOperation.VIEW_MENU).getMenu() : null;
	var mi = menu ? menu.getSelectedItem(DwtMenuItem.RADIO_STYLE) : null;
	var id = mi ? mi.getData(ZmOperation.MENUITEM_ID) : ZmId.VIEW_TASK_ALL;

	return ZmTaskListController.SOAP_STATUS[id];
};

ZmTaskListController.prototype.getKeyMapName =
function() {
	return "ZmTaskListController";
};

ZmTaskListController.prototype.handleKeyAction =
function(actionCode) {
	DBG.println(AjxDebug.DBG3, "ZmTaskListController.handleKeyAction");

	if (actionCode == ZmKeyMap.MARK_COMPLETE ||
		actionCode == ZmKeyMap.MARK_UNCOMPLETE)
	{
		var task = this._listView[this._currentView].getSelection()[0];
		if ((task.isComplete() && actionCode == ZmKeyMap.MARK_UNCOMPLETE) ||
			(!task.isComplete() && actionCode == ZmKeyMap.MARK_COMPLETE))
		{
			this._doCheckCompleted(task);
		}
	}
	else
	{
		return ZmListController.prototype.handleKeyAction.call(this, actionCode);
	}
};

ZmTaskListController.prototype.mapSupported =
function(map) {
	return (map == "list");
};

ZmTaskListController.prototype.quickSave =
function(name, callback) {
	var folderId = (this._activeSearch && this._activeSearch.search) ? this._activeSearch.search.folderId : null;

	var folder = appCtxt.getById(folderId);
	if (folder && folder.link) {
		folderId = folder.getRemoteId();
	}

	var task = new ZmTask(this._list, null, folderId);

	if (folder && folder.link) {
		task.setOrganizer(folder.owner);
		task._orig = new ZmTask(this._list);
	}

	task.setName(name);
	task.setViewMode(ZmCalItem.MODE_NEW);
	task.location = "";
	task.setAllDayEvent(true);

	task.save(null, callback);
};

// default callback before a view is shown - enable/disable nav buttons
ZmTaskListController.prototype._preShowCallback =
function(view, viewPushed) {
	if (view == ZmId.VIEW_TASKLIST) {
		return ZmListController.prototype._preShowCallback.call(this, view, viewPushed);
	}
	return true;
};

ZmTaskListController.prototype._defaultView =
function() {
	return ZmId.VIEW_TASKLIST;
};

ZmTaskListController.prototype._getItemType =
function() {
	return ZmItem.TASK;
};

ZmTaskListController.prototype._getViewType =
function() {
	return this._currentView;
};

ZmTaskListController.prototype._getMoveParams =
function() {
	var params = ZmListController.prototype._getMoveParams.call(this);
	params.overviewId = "ZmTaskListController";
	return params;
};

ZmTaskListController.prototype._createNewView =
function(view) {
	if (view == ZmId.VIEW_TASK) {
		this._listView[view] = new ZmTaskView(this._container, DwtControl.ABSOLUTE_STYLE, this);
	} else {
		this._listView[view] = new ZmTaskListView(this._container, this, this._dropTgt);
		this._listView[view].setDragSource(this._dragSrc);
	}
	return this._listView[view];
};

ZmTaskListController.prototype._getToolBarOps =
function() {
	return [
		ZmOperation.NEW_MENU,
		ZmOperation.SEP,
		ZmOperation.EDIT,
		ZmOperation.SEP,
		ZmOperation.DELETE, ZmOperation.MOVE, ZmOperation.PRINT,
		ZmOperation.SEP,
		ZmOperation.TAG_MENU,
		ZmOperation.SEP,
		ZmOperation.VIEW_MENU
	];
};

ZmTaskListController.prototype._initializeToolBar =
function(view) {
	if (this._toolbar[view]) { return; }

	ZmListController.prototype._initializeToolBar.call(this, view);

	this._setNewButtonProps(view, ZmMsg.createNewTask, "NewTask", "NewTaskDis", ZmOperation.NEW_TASK);
	this._setupPrintMenu(view);
	this._setupViewMenu(view);

	this._toolbar[view].getButton(ZmOperation.DELETE).setToolTipContent(ZmMsg.hardDeleteTooltip);

	this._toolbar[view].addFiller();
	var tb = new ZmNavToolBar({parent:this._toolbar[view], context:view});
	this._setNavToolBar(tb, view);
};

ZmTaskListController.prototype._setupPrintMenu =
function(view) {
	var printButton = this._toolbar[view].getButton(ZmOperation.PRINT);
	if (!printButton) { return; }

	printButton.setToolTipContent(ZmMsg.printMultiTooltip);
	printButton.noMenuBar = true;
	var menu = new ZmPopupMenu(printButton);
	printButton.setMenu(menu);

	var id = ZmOperation.PRINT_TASK;
	var mi = menu.createMenuItem(id, {image:ZmOperation.getProp(id, "image"), text:ZmMsg[ZmOperation.getProp(id, "textKey")]});
	mi.setData(ZmOperation.MENUITEM_ID, id);
	mi.addSelectionListener(this._listeners[ZmOperation.PRINT_TASK]);

	id = ZmOperation.PRINT_TASKFOLDER;
	mi = menu.createMenuItem(id, {image:ZmOperation.getProp(id, "image"), text:ZmMsg[ZmOperation.getProp(id, "textKey")]});
	mi.setData(ZmOperation.MENUITEM_ID, id);
	mi.addSelectionListener(this._listeners[ZmOperation.PRINT_TASKFOLDER]);
};

ZmTaskListController.prototype._setupViewMenu =
function(view) {
	var btn = this._toolbar[view].getButton(ZmOperation.VIEW_MENU);
	var menu = btn.getMenu();
	if (!menu) {
		menu = new ZmPopupMenu(btn);
		btn.setMenu(menu);
		for (var i = 0; i < ZmTaskListController.VIEWS.length; i++) {
			var id = ZmTaskListController.VIEWS[i];
			if (id == ZmId.VIEW_TASK_ALL) {
				new DwtMenuItem({parent:menu, style:DwtMenuItem.SEPARATOR_STYLE});
			}
			var params = {
				image:ZmTaskListController.ICON[id],
				text:ZmMsg[ZmTaskListController.MSG_KEY[id]],
				style:DwtMenuItem.RADIO_STYLE
			};
			var mi = menu.createMenuItem(id, params);
			mi.setData(ZmOperation.MENUITEM_ID, id);
			mi.addSelectionListener(this._listeners[ZmOperation.VIEW]);

			if (id == ZmId.VIEW_TASK_ALL) { // "all" is the default
				mi.setChecked(true, true);
			}
		}
		btn.setImage(ZmTaskListController.ICON[ZmId.VIEW_TASK_ALL]);
	}
};

ZmTaskListController.prototype._getActionMenuOps =
function() {
	return [
		ZmOperation.EDIT,
		ZmOperation.SEP,
		ZmOperation.TAG_MENU,
		ZmOperation.DELETE,
		ZmOperation.MOVE,
		ZmOperation.PRINT_TASK
	];
};

ZmTaskListController.prototype._getTagMenuMsg =
function(num) {
	return (num == 1) ? ZmMsg.tagTask : ZmMsg.tagTasks;
};

ZmTaskListController.prototype._resetOperations =
function(parent, num) {
	ZmListController.prototype._resetOperations.call(this, parent, num);

	// a valid folderId means user clicked on a task list
	var folderId = (this._activeSearch && this._activeSearch.search) ? this._activeSearch.search.folderId : null;
	if (folderId) {
		var folder = appCtxt.getById(folderId);
		var isShare = folder && folder.link;
		var canEdit = (folder == null || !folder.isReadOnly());

		parent.enable([ZmOperation.MOVE, ZmOperation.DELETE], canEdit && num > 0);
		parent.enable(ZmOperation.EDIT, canEdit && num == 1);
		parent.enable(ZmOperation.TAG_MENU, (!isShare && num > 0));
	}
	var printButton = (parent instanceof ZmButtonToolBar) ? parent.getButton(ZmOperation.PRINT) : null;
	var printMenu = printMenu && printButton.getMenu();
	var printMenuItem = printMenu && printMenu.getItem(1);
	if (printMenuItem) {
		var text = (folderId != null) ? ZmMsg.printTaskFolder : ZmMsg.printResults;
		printMenuItem.setText(text);
	}

	var printOp = (parent instanceof ZmActionMenu) ? ZmOperation.PRINT_TASK : ZmOperation.PRINT;
	parent.enable(printOp, num > 0);

	parent.enable(ZmOperation.VIEW_MENU, true);
};

ZmTaskListController.prototype._doDelete =
function(tasks, mode) {
	/*
	 * XXX: Recurrence is not yet supported by tasks
	 *
	if (task.isRecurring() && !task.isException) {
		// prompt user to edit instance vs. series if recurring but not exception
		this._showTypeDialog(task, ZmCalItem.MODE_DELETE);
	}
	*/
	var callback = new AjxCallback(this, this._handleDelete, [tasks]);
	appCtxt.getConfirmationDialog().popup(ZmMsg.confirmCancelTask, callback);
};

ZmTaskListController.prototype._handleDelete =
function(tasks) {
	var batchCmd = new ZmBatchCommand();
	for (var i = 0; i < tasks.length; i++) {
		var t = tasks[i];
		var cmd = new AjxCallback(t, t.cancel, [ZmCalItem.MODE_DELETE]);
		batchCmd.add(cmd);
	}
	batchCmd.run();
};

ZmTaskListController.prototype._editTask =
function(task) {
	var mode = ZmCalItem.MODE_EDIT;

	if (task.isReadOnly()) {
		if (task.isException) mode = ZmCalItem.MODE_EDIT_SINGLE_INSTANCE;
		task.getDetails(mode, new AjxCallback(this, this._showTaskReadOnlyView, task));
	} else {
		if (task.isRecurring()) {
			// prompt user to edit instance vs. series if recurring but not exception
			if (task.isException) {
				mode = ZmCalItem.MODE_EDIT_SINGLE_INSTANCE;
			} else {
				this._showTypeDialog(task, ZmCalItem.MODE_EDIT);
				return;
			}
		}
		task.getDetails(mode, new AjxCallback(this, this._showTaskEditView, [task, mode]));
	}
};

// All items in the list view are gone - show "No Results"
ZmTaskListController.prototype._handleEmptyList =
function(listView) {
	listView._resetListView();
	listView._setNoResultsHtml();
};

ZmTaskListController.prototype._showTaskReadOnlyView =
function(task) {
	var viewId = ZmId.VIEW_TASK;
	var calItemView = this._listView[viewId];

	if (!calItemView) {
		this._setup(viewId);
		calItemView = this._listView[viewId];
	}

	calItemView.set(task, ZmId.VIEW_TASKLIST);
	this._resetOperations(this._toolbar[viewId], 1); // enable all buttons
	this._navToolBar[viewId].enable([ZmOperation.PAGE_BACK, ZmOperation.PAGE_FORWARD], false);

	var elements = {};
	elements[ZmAppViewMgr.C_TOOLBAR_TOP] = this._toolbar[viewId];
	elements[ZmAppViewMgr.C_APP_CONTENT] = this._listView[viewId];
	this._setView({view:viewId, elements:elements, pushOnly:true});
};

ZmTaskListController.prototype._showTaskEditView =
function(task, mode) {
	this._app.getTaskController().show(task, mode);
};

ZmTaskListController.prototype._doCheckCompleted =
function(task) {
	var callback = new AjxCallback(this, this._doCheckCompletedResponse, [task]);
	task.getDetails(ZmCalItem.MODE_EDIT, callback);
};

ZmTaskListController.prototype._doCheckCompletedResponse =
function(task) {
	var clone = ZmTask.quickClone(task);
	clone.pComplete = task.isComplete() ? 0 : 100;
	clone.status = task.isComplete() ? ZmCalendarApp.STATUS_NEED : ZmCalendarApp.STATUS_COMP;
	clone.setViewMode(ZmCalItem.MODE_EDIT);
	clone.save();
};

ZmTaskListController.prototype._showTypeDialog =
function(task, mode) {
	if (!this._typeDialog) {
		this._typeDialog = new ZmCalItemTypeDialog(this._shell);
		this._typeDialog.addSelectionListener(DwtDialog.OK_BUTTON, new AjxListener(this, this._typeOkListener, [task, mode]));
	}
	this._typeDialog.initialize(task, mode, ZmItem.TASK);
	this._typeDialog.popup();
};

ZmTaskListController.prototype._typeOkListener =
function(task, mode, ev) {
	var isInstance = this._typeDialog.isInstance();

	if (mode == ZmCalItem.MODE_DELETE) {
		var delMode = isInstance
			? ZmCalItem.MODE_DELETE_INSTANCE
			: ZmCalItem.MODE_DELETE_SERIES;
		// TODO
	} else {
		var editMode = isInstance
			? ZmCalItem.MODE_EDIT_SINGLE_INSTANCE
			: ZmCalItem.MODE_EDIT_SERIES;

		task.getDetails(mode, new AjxCallback(this, this._showTaskEditView, [task, editMode]));
	}
};

ZmTaskListController.prototype._newListener =
function(ev, op, params) {
	params = params || {};
	params.folderId = /*this._list.folderId ||*/ this._list.search.folderId;
	ZmListController.prototype._newListener.call(this, ev, op, params);
};

ZmTaskListController.prototype._listSelectionListener =
function(ev) {
	ZmListController.prototype._listSelectionListener.call(this, ev);

	if (ev.detail == DwtListView.ITEM_DBL_CLICKED) {
		this._editTask(ev.item);
	}
};

ZmTaskListController.prototype._listActionListener =
function(ev) {
	ZmListController.prototype._listActionListener.call(this, ev);
	var actionMenu = this.getActionMenu();
	actionMenu.popup(0, ev.docX, ev.docY);
};

ZmTaskListController.prototype._editListener =
function(ev) {
	var task = this._listView[this._currentView].getSelection()[0];
	this._editTask(task);
};

ZmTaskListController.prototype._printTaskListener =
function(ev) {
	var listView = this._listView[this._currentView];
	var items = listView.getSelection();
	var taskIds = [];
	for (var i = 0; i < items.length; i++) {
		taskIds.push(items[i].invId);
	}

	var url = ("/h/printtasks?id=" + taskIds.join(","));
	window.open(appContextPath+url, "_blank");
};

ZmTaskListController.prototype._printListener =
function(ev) {
    this._printTaskListener(ev);
};

ZmTaskListController.prototype._printTaskFolderListener =
function(ev) {
	var url;
	if (this._folderId) {
		url = "/h/printtasks?st=task&sfi=" + this._folderId;
	} else {
		var taskIds = [];
		var list = this._list.getArray();
		for (var i = 0; i < list.length; i++) {
			taskIds.push(list[i].invId);
		}
		url = ("/h/printtasks?id=" + taskIds.join(","));
	}
	window.open(appContextPath+url, "_blank");
};

ZmTaskListController.prototype._setViewContents =
function(view) {
	// load tasks into the given view and perform layout.
	this._listView[view].set(this._list, ZmItem.F_DATE);

	var list = this._list.getVector();
	if (list.size()) this._listView[view].setSelection(list.get(0));
};

ZmTaskListController.prototype._getMoveDialogTitle =
function(num) {
	return (num == 1) ? ZmMsg.moveTask : ZmMsg.moveTasks;
};

// Move stuff to a new folder.
ZmTaskListController.prototype._moveCallback =
function(folder) {
	this._doMove(this._pendingActionData, folder);
	this._clearDialog(appCtxt.getChooseFolderDialog());
	this._pendingActionData = null;
};
