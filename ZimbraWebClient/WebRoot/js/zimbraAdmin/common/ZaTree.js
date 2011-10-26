/**
 * Created by IntelliJ IDEA.
 * User: mingzhang
 * Date: 8/19/11
 * Time: 10:38 PM
 * To change this template use File | Settings | File Templates.
 */
ZaTree = function(params) {
	if (arguments.length == 0) { return; }
	params = Dwt.getParams(arguments, ZaTree.PARAMS);
    // Alwyas single style in Admin Console;
    params.style = DwtTree.SINGLE_STYLE;
	DwtTree.call(this, params);
    this._rootData = new ZaTreeItemData();
    this.currentShowItem = null;
};

ZaTree.PARAMS = ["parent", "style", "className", "posStyle"];

ZaTree.prototype = new DwtTree;
ZaTree.prototype.constructor = ZaTree;

ZaTree.prototype.toString =
function() {
	return "ZaTree";
};

ZaTree.prototype._expandUp =
function(item) {
	// Nothing doing here
    //
    return;
};

ZaTree.prototype.getContainer =
function() {
    return this._container;
};

ZaTree.prototype.setRootData =
function(rootData) {
    this._rootData  = rootData;
}

ZaTree.prototype.getRootData =
function(rootData) {
    return this._rootData;
}

ZaTree.prototype.addTreeItemData =
function(treeItemData) {
    var pathItems = this.getPathItems( treeItemData.parent);
    var result;
    var parentItem = this.getTreeItemData(this._rootData, pathItems, 0);
    if (parentItem) {
        parentItem.addChild(treeItemData);
        result =  true;
    } else {
        result = false;
    }

    return result;
}

ZaTree.prototype.getTreeItemData =
function(startNode, pathItems, startIndex) {
    if (pathItems.length == startIndex)
        return "";

    var currentPathItem = pathItems[startIndex];
    if (startNode.text != currentPathItem)
        return "";

    var nextStartIndex = startIndex + 1;
    if (pathItems.length == nextStartIndex)
        return startNode;

    if (startNode.childrenData.size() == 0) {
        return "";
    }

    var ret = "";
    var i;

    for (i = 0; i < startNode.childrenData.size(); i++) {
        ret = this.getTreeItemData(startNode.childrenData.get(i), pathItems, nextStartIndex);
        if (ret)
            break;
    }

    return ret;
}

ZaTree.prototype.getTreeItemDataByPath =
function(path) {
    var pathItems = this.getPathItems(path);
    var ret = this.getTreeItemData(this._rootData, pathItems, 0);
    return ret;
}

ZaTree.SEPERATOR = "%";
ZaTree.prototype.getPathItems =
function(path) {
    var temp = path.split(ZaTree.SEPERATOR);
    var ret = [];
    for (var i = 0; i < temp.length; i++) {
        if (temp[i]) {
            ret.push(temp[i]);
        }
    }
    return ret;
}

ZaTree.prototype.setSelection =
function(treeItem, skipNotify, kbNavEvent, noFocus) {
	if (!treeItem)
        return;

	// Remove currently selected items from the selection list. if <treeItem> is in that list, then note it and return
	// after we are done processing the selected list
	var a = this._selectedItems.getArray();
	var sz = this._selectedItems.size();
	var da;
	var j = 0;
	var alreadySelected = false;
	for (var i = 0; i < sz; i++) {
		if (a[i] == treeItem) {
			alreadySelected = true;
		} else {
			a[i]._setSelected(false);
			this._selectedItems.remove(a[i]);
			if (da == null) {
				da = new Array();
			}
			da[j++] = a[i];
		}
	}

	if (da && !skipNotify) {
		this._notifyListeners(DwtEvent.SELECTION, da, DwtTree.ITEM_DESELECTED, null, this._selEv, kbNavEvent);
	}

	if (alreadySelected) { return; }

    this._selectedItems.add(treeItem);

	//this._expandUp(treeItem);
	if (treeItem._setSelected(true, noFocus) && !skipNotify) {
    	this._notifyListeners(DwtEvent.SELECTION, [treeItem], DwtTree.ITEM_SELECTED, null, this._selEv, kbNavEvent);
	}
};

/*
 * Remove isAddHistory Now(By ming@zimbra.com).
 * Currenty, we won't add history in this function.
 * For it won't easy for us to decide when we should add history.
 * We only add history automatically when user click the tree item
 */
ZaTree.prototype.setSelectionByPath =
function (path, isAddHistory, skipNotify, kbNavEvent, noFocus, refresh) {

    var dataItem = this.getTreeItemDataByPath(path);
    if (dataItem.isAlias()) {
        path = dataItem.getRealPath();
        isAddHistory = false;
    }
    var rootDataItem;
    if (dataItem.isLeaf() && dataItem.parentObject) {
        rootDataItem = dataItem.parentObject;
    } else {
        rootDataItem = dataItem;
    }
    this.buildTree(rootDataItem);
    this._selectedItems.removeAll();

    var treeItem;
    if (dataItem == rootDataItem) {
        treeItem = this.currentRoot;
    }  else {
        treeItem = this.getTreeItemByPath(path);
    }
    this._selectedItems.add(treeItem);

    if (treeItem._setSelected(true, noFocus) && !skipNotify) {
    	this._notifyListeners(DwtEvent.SELECTION, [treeItem], DwtTree.ITEM_SELECTED, null, this._selEv, kbNavEvent, refresh);
	}

    this._updateHistory(treeItem, true);
}

//TODO make it recursive
ZaTree.prototype.getTreeItemByPath =
function(path) {
    if (!path)
        return null;

    if (!this.currentRoot)
        return null;

    var firstLevelChildren = this.getChildren();
    for (var j = 0; j < firstLevelChildren.length; j++) {
        var currentTreeItem = firstLevelChildren[j];
        var rootDataPath = currentTreeItem.getData("dataItem");
        var rootPath = this.getABPath(rootDataPath);
        if (rootPath == path)
            return currentTreeItem;

        var children = currentTreeItem.getChildren();
        for (var i = 0; i < children.length; i++) {
            var childTreeItem = children[i];
            var text = childTreeItem.getText();
            var childPath =  rootPath + ZaTree.SEPERATOR + text;
            if (path == childPath)
                return  childTreeItem;
        }
    }
    return null;
}

ZaTree.prototype.buildTree =
function (showRootNode) {

    this.clearItems();
    this.curentRoot = null;
    this.currentRelated = null;
    this.currentRoot = this._buildNodeItem(showRootNode, true);
    this.currentRoot.setExpanded(true);
    if (showRootNode.relatedObject.length != 0) {
        this.currentRelated = this._buildNodeItem(this._getDefaultRelated(showRootNode));
        this.currentRelated.setExpanded(true);
    }

    if (showRootNode.recentObject.length != 0) {
        this.currentRelated = this._buildNodeItem(this._getDefaultRecentObjects(showRootNode));
        this.currentRelated.setExpanded(true);
    }

    for (var i = 0; i < showRootNode.siblings.size(); i++) {
        var currentAddNode =  showRootNode.siblings.get(i);
        var currentShowNode = this._buildNodeItem(currentAddNode);
        currentShowNode.setExpanded(true);
    }
    return this.currentRoot;
}

ZaTree.prototype.renameTreeItem =
function (path, newName) {
    var dataTreeItem  =  this.getTreeItemDataByPath(path);
    if (!dataTreeItem)
        return;

    // If this is shown now, then update the Tree Item.
    var treeItem = this.getTreeItemByPath(path);
    if (treeItem) {
        treeItem.setText (newName);
    }

    dataTreeItem.text = newName;
    var parentPath = this.getPathItems (dataTreeItem.parent);
    parentPath.push(newName);
    var newPath =  this.getPathByArray (parentPath);
    // TODO we should make it recursive in futher
    // TODO Currenty it works well for we has only need to rename object name and saved search;
    for (var i = 0; i < dataTreeItem.childrenData.size(); i++) {
        var currentNode = dataTreeItem.childrenData.get(i);
        currentNode.parent = newPath;
    }

    return newPath;
}

ZaTree.prototype.removeTreeItem = function (path) {
    var treeItemData = this.getTreeItemDataByPath(path);
    if (!treeItemData)
        return;

    var treeItem = this.getTreeItemByPath (path);
    if (treeItem)
        treeItem.parent.removeChildren(treeItem);

    treeItemData.parentObject.removeChildren (treeItemData);
}

ZaTree.prototype.removeAllChild = function (path) {
    var treeItemData = this.getTreeItemDataByPath(path);
    if (!treeItemData)
        return;

    var treeItem = this.getTreeItemByPath (path);
    if (treeItem) {
        treeItem.removeChildren();
    }

    treeItemData.childrenData.removeAll();
}

ZaTree.prototype._getDefaultRelated =
function (treeDataItem) {
    var related = new ZaTreeItemData({
            parent: treeDataItem.parent,
            id: treeDataItem.id + "_related",
            text:ZaMsg.OVP_related
    });
    treeDataItem.addChild(related);
    for (var i = 0; i < treeDataItem.relatedObject.length; i++) {
        var currentObject =treeDataItem.relatedObject[i];
        currentObject.parent = treeDataItem.parent + ZaTree.SEPERATOR + ZaMsg.OVP_related;
        related.addChild(currentObject);
    }
    return related;
}

ZaTree.prototype._getDefaultRecentObjects =
function (treeDataItem) {
    var recent = new ZaTreeItemData({
            parent: treeDataItem.parent,
            id: treeDataItem.id + "_recent",
            text:ZaMsg.OVP_recent
    });
    treeDataItem.addChild(recent);
    for (var i = 0; i < treeDataItem.recentObject.length; i++) {
        var currentObject =treeDataItem.recentObject[i];
        currentObject.parent = treeDataItem.parent + ZaTree.SEPERATOR + ZaMsg.OVP_recent;
        recent.addChild(currentObject);
    }
    return recent;
}

ZaTree.prototype._buildNodeItem =
function(showRootNode, isRoot) {
    var ti, nextTi, key, currentRoot;
    var clsName;
    if (isRoot) {
        clsName = "rootOverviewHeader";
    } else {
        clsName = "overviewHeader";
    }

    currentRoot =  new ZaTreeItem({parent:this,className:clsName,id:showRootNode.id, forceNotifySelection:true});
	currentRoot.enableSelection(false);
	currentRoot.setText(showRootNode.text);
    currentRoot.setImage(showRootNode.image);
	currentRoot.setData(ZaOverviewPanelController._TID, showRootNode.mappingId);
    currentRoot.setData("dataItem", showRootNode);
    for (key in showRootNode._data) {
        currentRoot.setData(key, showRootNode._data[key]);
    }

    var i, j, forceNode;
    for (i = 0; i < showRootNode.childrenData.size(); i++) {
        var currentAddNode =  showRootNode.childrenData.get(i);
        // TODO improved latter
        if (isRoot) {
            if (currentAddNode.text == ZaMsg.OVP_related)
                continue;
            if (currentAddNode.text == ZaMsg.OVP_recent)
                continue;
        }
        if( currentAddNode.forceNode !== undefined)
            forceNode = currentAddNode.forceNode;
        else
            forceNode = currentAddNode.childrenData.size() > 0 ? true: false;
        ti = new ZaTreeItem({parent: currentRoot,className:"AdminTreeItem",id:currentAddNode.id, forceNode: forceNode});
        ti.setCount(currentAddNode.count);
        ti.setText(currentAddNode.text);
        ti.setImage(currentAddNode.image);
        ti.setData(ZaOverviewPanelController._TID, currentAddNode.mappingId);
        ti.setData("dataItem", currentAddNode);
        for (key in currentAddNode._data) {
            ti.setData(key, currentAddNode._data[key]);
        }
    }
    return currentRoot;
}

ZaTree.prototype._itemClicked =
function(item, ev) {
	var i;
	var a = this._selectedItems.getArray();
	var numSelectedItems = this._selectedItems.size();
    var currentDataItem =  item.getData("dataItem");
    var isAlias = currentDataItem.isAlias();
    if (isAlias) {
        var aliasImage = currentDataItem.image;
        currentDataItem = this.getTreeItemDataByPath(currentDataItem.getRealPath());
        if(!currentDataItem.image)
            currentDataItem.image = aliasImage;
        this._updateHistoryObj(currentDataItem);
    }
    var isShowInHistory = currentDataItem.isShowHistory;
	if (currentDataItem.isLeaf() && !isAlias) {
		if (numSelectedItems > 0) {
			for (i = 0; i < numSelectedItems; i++) {
				a[i]._setSelected(false);
			}
			// Notify listeners of deselection
			this._notifyListeners(DwtEvent.SELECTION, this._selectedItems.getArray(), DwtTree.ITEM_DESELECTED, ev, this._selEv);
			this._selectedItems.removeAll();
		}
		this._selectedItems.add(item);
		if (item._setSelected(true)) {
            this._updateHistory(item, true, isShowInHistory);
			this._notifyListeners(DwtEvent.SELECTION, [item], DwtTree.ITEM_SELECTED, ev, this._selEv);
		}
	} else {
        var buildDataItem;
        if (!currentDataItem.isLeaf())
            buildDataItem = currentDataItem;
        else
            buildDataItem = currentDataItem.parentObject;
        this.buildTree(buildDataItem);
        this._selectedItems.removeAll();


        var selectedItem;
        if (currentDataItem.isLeaf())
            selectedItem = this.getTreeItemByPath(this.getABPath(currentDataItem));
        else
            selectedItem = this.getCurrentRootItem();

        this._selectedItems.add(selectedItem);
		if (selectedItem._setSelected(true)) {
            if (!isAlias)
                this._updateHistory(selectedItem, true, isShowInHistory);
            else
                this._updateHistory(item, true, isShowInHistory);
			this._notifyListeners(DwtEvent.SELECTION, [selectedItem], DwtTree.ITEM_SELECTED, ev, this._selEv);
		}
    }
};

ZaTree.prototype._notifyListeners =
function(listener, items, detail, srcEv, destEv, kbNavEvent, refresh) {
	if (this.isListenerRegistered(listener)) {
		if (srcEv) {
			DwtUiEvent.copy(destEv, srcEv);
		}
		destEv.items = items;
		if (items.length == 1) {
			destEv.item = items[0];
		}
		destEv.detail = detail;
		destEv.kbNavEvent = kbNavEvent;
        destEv.refresh = refresh;
		this.notifyListeners(listener, destEv);
		if (listener == DwtEvent.SELECTION) {
			this.shell.notifyGlobalSelection(destEv);
		}
	}
};

ZaTree.prototype._updateHistory =
function (treeItem, isAddHistory, isShowInHistory) {
    var text = treeItem.getText();
    var dataItem = treeItem.getData("dataItem");
    var path = this.getABPath(dataItem);
    var historyObject = new ZaHistory(path, text, undefined, isShowInHistory);
    ZaZimbraAdmin.getInstance().updateHistory(historyObject, isAddHistory);
}

ZaTree.prototype._updateHistoryObj =
function (dataItem) {
    var text = dataItem.text;
    var type = ZaItem.ACCOUNT;
    var path = this.getABPath(dataItem);

    switch (dataItem.image) {
		case "Account":
			type = ZaItem.ACCOUNT; break ;
		case "COS" :
			type = ZaItem.COS ; break ;
        case "Domain":
            type = ZaItem.DOMAIN; break;
		case "Resource":
			type = ZaItem.RESOURCE; break ;
        case "DistributionList":
            type = ZaItem.DL; break;
        case "AccountAlias":
            type = ZaItem.ALIAS; break;
        case "Server":
            type = ZaItem.SERVER; break;
		default :
			type = null;
	}


    var historyObject = new ZaHistory(path, text, type);
    var historyMgr = ZaZimbraAdmin.getInstance().getHisotryMgr();
    historyMgr.addHistoryObj(historyObject);
    var objList = historyMgr.getAllHistoryObj().getArray();
    var ti = null;
    var image = null;
    var Tis = [];
    for(var i = objList.length - 1; i > -1; i --) {
        if(objList[i].type == ZaItem.ACCOUNT)
            image = "Account";
        else if(objList[i].type == ZaItem.COS)
            image = "COS";
        else if(objList[i].type == ZaItem.DOMAIN)
            image = "Domain";
        else if(objList[i].type == ZaItem.RESOURCE)
            image = "Resource";
        else if(objList[i].type == ZaItem.DL)
            image = "DistributionList";
        else if(objList[i].type == ZaItem.ALIAS)
            image = "AccountAlias";
        else if(objList[i].type == ZaItem.SERVER)
            image = "Server";

        ti = new ZaTreeItemData({
                text: objList[i].displayName,
                type:1,
                image:image,
                forceNode: (i+1 != objList.length),
                path: objList[i].path
                }
            );
        Tis.push(ti);
    }
    dataItem.recentObject = Tis;
}

ZaTree.prototype.getABPath =
function (dataItem) {
    var abPath = [];
    var currentObject = dataItem;
    while (currentObject) {
        abPath.unshift(currentObject.text);
        currentObject = currentObject.parentObject;
    }
    var ret = this.getPathByArray(abPath);
    return ret;
}

ZaTree.prototype.getPathByArray =
function (arr) {
    if (arr.length == 0)
        return "";
    return arr.join(ZaTree.SEPERATOR);
}

ZaTree.prototype.getCurrentRootItem = function() {
    return this.currentRoot;
}
ZaTree.getPathByArray = ZaTree.prototype.getPathByArray;



