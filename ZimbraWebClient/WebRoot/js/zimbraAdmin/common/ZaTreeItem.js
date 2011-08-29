/**
 * Created by IntelliJ IDEA.
 * User: mingzhang
 * Date: 8/19/11
 * Time: 2:59 AM
 * To change this template use File | Settings | File Templates.
 */

ZaTreeItem = function(params) {
    if (arguments.length == 0) { return; }

    params.expandNodeImage = params.expandNodeImage || "Blank_16";
    params.collapseNodeImage= params.collapseNodeImage || "Help";
    params = Dwt.getParams(arguments, ZaTreeItem.PARAMS);
    this._parentInTree = params.parent;
    this._countParam = params.count;
    DwtTreeItem.call(this, params);
}

ZaTreeItem.PARAMS = ["parent", "index", "text", "imageInfo", "deferred", "className", "posStyle",
					  "forceNotifySelection", "forceNotifyAction", "count"];

ZaTreeItem.prototype = new DwtTreeItem;
ZaTreeItem.prototype.constructor = ZaTreeItem;

ZaTreeItem.prototype.TEMPLATE = "admin.Widgets#ZaTreeItem";

ZaTreeItem.prototype.dispose =
function() {
	this._countCell = null;
	DwtTreeItem.prototype.dispose.call(this);
};

ZaTreeItem.prototype.toString =
function() {
	return "ZaTreeItem";
};

ZaTreeItem.prototype._initialize =
function(index, realizeDeferred, forceNode) {
    DwtTreeItem.prototype._initialize.call(this, index, realizeDeferred, forceNode);

	this._countCell = document.getElementById(this._htmlElId + "_countCell");
	// initialize count
	if (this._countCell && this._countInfoParam) {
	    this._countCell.innerHTML = this._countInfoParam;
		this._countInfo = this._countInfoParam;
	}

    if (this._nodeCell) {
        var imgEl = AjxImg.getImageElement(this._nodeCell);
        if (imgEl) {
            Dwt.clearHandler(imgEl, DwtEvent.ONMOUSEDOWN);
            Dwt.clearHandler(imgEl, DwtEvent.ONMOUSEUP);
        }
    }
}

ZaTreeItem.prototype.getCount =
function() {
	return this._countInfo;
};

/**
 * Sets the image.
 *
 * @param	{string}	imageInfo		the image
 */
ZaTreeItem.prototype.setCount =
function(countInfo) {
	if (this._initialized) {
		if (this._countCell) {
			this._countCell.innerHTML = countInfo;
		}
		this._countInfo = countInfo;
	} else {
		this._countInfoParam = countInfo;
	}
};

ZaTreeItem.prototype.setExpanded =
function(expanded, recurse, skipNotify) {
	// Go up the chain, ensuring that parents are expanded/initialized
	if (expanded) {
		// Realize any deferred children
		this._realizeDeferredChildren();
	}

	// If we have children, then allow for expanding/collapsing
	if (this.getNumChildren()) {
        if (this._expanded != expanded) {
			this._expand(expanded, null, true);
		}
	}
};

ZaTreeItem.prototype.isClickOnItem =
function(ev) {
    var x = ev.docX;
    var y = ev.docY;
    var selfBound =  Dwt.getBounds(this._itemDiv);
    var ret = (selfBound.x <= ev.docX) &&
              (ev.docX <= selfBound.x + selfBound.width) &&
              (location.y <= ev.docY) &&
              (ev.docY <= selfBound.y + selfBound.height);
    return ret;


}

ZaTreeItemData = function(params) {
    if (arguments.length == 0) { return; }

    params = Dwt.getParams(arguments, ZaTreeItemData.PARAMS);
    this.parent = params.parent;
    this.parentObject = params.parentObject || "";
    this.id = params.id;
    this.text = params.text;
    this.image = params.image;
    this.index = params.index;
    this.count = params.count;
    this.mappingId = params.mappingId;
    this.callback = params.callback;
    this.childrenData = new AjxVector();
}

ZaTreeItemData.PARAMS = ["parent", "id", "text", "image", "index", "count", "mappingId", "callback"];

ZaTreeItemData.prototype.addChild =
function(child, index) {
	this.childrenData.add(child, index);
    child.parentObject = this;
};

ZaTreeItemData.prototype.removeChild =
function(child, index) {
	this.childrenData.remove(child);
};

ZaTreeItemData.prototype.isLeaf =
function() {
   return this.childrenData.size() == 0;
}