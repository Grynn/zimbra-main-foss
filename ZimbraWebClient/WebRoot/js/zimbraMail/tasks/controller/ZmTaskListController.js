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
 * Portions created by Zimbra are Copyright (C) 2006 Zimbra, Inc.
 * All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK *****
 */

function ZmTaskListController(appCtxt, container, app) {
	if (arguments.length == 0) return;
	ZmListController.call(this, appCtxt, container, app);

	this._dragSrc = new DwtDragSource(Dwt.DND_DROP_MOVE);
	this._dragSrc.addDragListener(new AjxListener(this, this._dragListener));

	this._listeners[ZmOperation.EDIT] = new AjxListener(this, this._editListener);
};

ZmTaskListController.prototype = new ZmListController;
ZmTaskListController.prototype.constructor = ZmTaskListController;

ZmTaskListController.prototype.toString =
function() {
	return "ZmTaskListController";
};

ZmTaskListController.prototype.show =
function(list, view) {

	ZmListController.prototype.show.call(this, null, view);

	this.setList(list);
	this._setup(this._currentView);

	var elements = {};
	elements[ZmAppViewMgr.C_TOOLBAR_TOP] = this._toolbar[this._currentView];
	elements[ZmAppViewMgr.C_APP_CONTENT] = this._listView[this._currentView];

	this._setView(this._currentView, elements, true);

	this._setTabGroup(this._tabGroups[this._currentView]);
	this._restoreFocus();
};

ZmTaskListController.prototype.notifyCreate =
function(node) {
	if (this._currentView != this._appCtxt.getAppViewMgr().getCurrentViewId())
		return;

	if (this._list && node.l == this._list.folderId) {
		// for now, refetch this folder
		this._app.launch(null, null, node.l);
	}
};

ZmTaskListController.prototype._defaultView =
function() {
	return ZmController.TASKLIST_VIEW;
};

ZmTaskListController.prototype._createNewView =
function(view) {
	if (view == ZmController.TASK_VIEW) {
		this._listView[view] = new ZmTaskView(this._container, DwtControl.ABSOLUTE_STYLE, this);
	} else {
		this._listView[view] = new ZmTaskListView(this._container, this, this._dropTgt);
		this._listView[view].setDragSource(this._dragSrc);
	}
	return this._listView[view];
};

ZmTaskListController.prototype._getToolBarOps =
function() {
	var list = [ZmOperation.NEW_MENU];
	list.push(ZmOperation.SEP);
	list.push(ZmOperation.DELETE, ZmOperation.MOVE);
	if (this._appCtxt.get(ZmSetting.PRINT_ENABLED))
		list.push(ZmOperation.PRINT_MENU);
	list.push(ZmOperation.SEP);
	list.push(ZmOperation.EDIT);
	return list;
};

ZmTaskListController.prototype._initializeToolBar =
function(view) {
	ZmListController.prototype._initializeToolBar.call(this, view);
/*
TODO
	this._setupViewMenu(view);
*/
	this._setNewButtonProps(view, ZmMsg.createNewTask, "NewTask", "NewTaskDis", ZmOperation.NEW_TASK);
/*
TODO
	this._toolbar[view].addFiller();
	var tb = new ZmNavToolBar(this._toolbar[view], DwtControl.STATIC_STYLE, null, ZmNavToolBar.SINGLE_ARROWS, true);
	this._setNavToolBar(tb, view);
*/
};

ZmTaskListController.prototype._getActionMenuOps =
function() {
	var list = [];
	list.push(ZmOperation.EDIT);
	list.push(ZmOperation.SEP);
	list.push(ZmOperation.DELETE);
	list.push(ZmOperation.MOVE);
	if (this._appCtxt.get(ZmSetting.PRINT_ENABLED))
		list.push(ZmOperation.PRINT);
	return list;
};

ZmTaskListController.prototype._resetOperations =
function(parent, num) {
	ZmListController.prototype._resetOperations.call(this, parent, num);

	// a valid folderId means user clicked on an addrbook
	if (this._list.folderId) {
		var folder = this._appCtxt.getTree(ZmOrganizer.TASKS).getById(this._list.folderId);
		var isShare = folder && folder.link;
		var canEdit = (folder == null || !folder.isReadOnly());

		parent.enable([ZmOperation.MOVE], canEdit && num > 0);
		// XXX: for now, only allow one task to be deleted at a time
		parent.enable([ZmOperation.DELETE, ZmOperation.EDIT], canEdit && num == 1);
	}
};

// Delete one or more items.
ZmTaskListController.prototype._deleteListener =
function(ev) {
	// XXX: how to handle multiple tasks where some may be recurring and others not?
	//      For now, we're only allow one task to be deleted at a time.

	//	var tasks = this._listView[this._currentView].getSelection();
	var task = this._listView[this._currentView].getSelection()[0];

	if (task.isRecurring() && !task.isException) {
		// prompt user to edit instance vs. series if recurring but not exception
		this._showTypeDialog(task, ZmCalItem.MODE_DELETE);
	} else {
		this._promptDelete(task, ZmCalItem.MODE_DELETE);
	}
};

ZmTaskListController.prototype._promptDelete =
function(task, mode) {
	var callback = new AjxCallback(this, this._doDelete, [task, mode]);
	this._appCtxt.getConfirmationDialog().popup(ZmMsg.confirmCancelTask, callback);
};

ZmTaskListController.prototype._doDelete =
function(task, mode) {
	try {
		var respCallback = new AjxCallback(this, this._handleResponseDelete, [task]);
		task.cancel(mode, null, respCallback, this._errorCallback);
	} catch (ex) {
		var params = [task, mode];
		this._handleException(ex, this._doDelete, params, false);
	}
};

ZmTaskListController.prototype._handleResponseDelete =
function(task, ev) {
	// TODO - remove task(s) from listview
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

ZmTaskListController.prototype._showTaskReadOnlyView =
function(task) {
	var viewId = ZmController.TASK_VIEW;
	var calItemView = this._listView[viewId];

	if (!calItemView) {
		this._setup(viewId);
		calItemView = this._listView[viewId];
	}

	calItemView.set(task, ZmController.TASKLIST_VIEW);
	this._resetOperations(this._toolbar[viewId], 1); // enable all buttons

	var elements = {};
	elements[ZmAppViewMgr.C_TOOLBAR_TOP] = this._toolbar[viewId];
	elements[ZmAppViewMgr.C_APP_CONTENT] = this._listView[viewId];
	this._setView(viewId, elements, null, null, true);
};

ZmTaskListController.prototype._showTaskEditView =
function(task, mode) {
	this._app.getTaskController().show(task, mode);
};

ZmTaskListController.prototype._showTypeDialog =
function(task, mode) {
	if (!this._typeDialog) {
		this._typeDialog = new ZmCalItemTypeDialog(this._shell);
		this._typeDialog.addSelectionListener(DwtDialog.OK_BUTTON, new AjxListener(this, this._typeOkListener, [task, mode]));
	}
	this._typeDialog.initialize(task, mode);
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

ZmTaskListController.prototype._listSelectionListener =
function(ev) {
	ZmListController.prototype._listSelectionListener.call(this, ev);

	if (ev.detail == DwtListView.ITEM_DBL_CLICKED)
		this._editTask(ev.item);
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

ZmTaskListController.prototype._setViewContents =
function(view) {
	// load tasks into the given view and perform layout.
	this._listView[view].set(this._list, null, this.folderId);

	var list = this._list.getVector();
	if (list.size()) this._listView[view].setSelection(list.get(0));
};

ZmTaskListController.prototype._getMoveDialogTitle =
function(num) {
	return (num == 1) ? ZmMsg.moveTask : ZmMsg.moveTasks;
};
