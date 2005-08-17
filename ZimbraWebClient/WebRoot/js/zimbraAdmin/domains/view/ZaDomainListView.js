/**
* @constructor
* @class ZaDomainListView
* @param parent
* @author Roland Schemers
* @author Greg Solovyev
**/

function ZaDomainListView(parent) {

//	var className = "ZaDomainListView";
	var className = null;
	var posStyle = DwtControl.ABSOLUTE_STYLE;
	
	var headerList = this._getHeaderList();
	
	ZaListView.call(this, parent, className, posStyle, headerList);

	this._appCtxt = this.shell.getData(ZaAppCtxt.LABEL);
	
	//this.setScrollStyle(DwtControl.SCROLL);
	//this.addControlListener(new AjxListener(this, ZaDomainListView.prototype._controlListener));
}

ZaDomainListView.prototype = new ZaListView;
ZaDomainListView.prototype.constructor = ZaDomainListView;

ZaDomainListView.prototype.toString = 
function() {
	return "ZaDomainListView";
}

/**
* Renders a single item as a DIV element.
*/
ZaDomainListView.prototype._createItemHtml =
function(domain, now, isDndIcon) {
	var html = new Array(50);
	var	div = this.getDocument().createElement("div");
	div._styleClass = "Row";
	div._selectedStyleClass = div._styleClass + "-" + DwtCssStyle.SELECTED;
	div.className = div._styleClass;
	this.associateItemWithElement(domain, div, DwtListView.TYPE_LIST_ITEM);
	
	var idx = 0;
	html[idx++] = "<table width='100%' cellspacing='2' cellpadding='0'>";
	html[idx++] = "<tr>";
	var cnt = this._headerList.length;
	for(var i = 0; i < cnt; i++) {
		var id = this._headerList[i]._id;
		if(id.indexOf(ZaDomain.A_domainName)==0) {
			// name
			html[idx++] = "<td width=" + this._headerList[i]._width + ">";
			html[idx++] = AjxStringUtil.htmlEncode(domain.attrs[ZaDomain.A_domainName]);
			html[idx++] = "</td>";
		} else if(id.indexOf(ZaDomain.A_description)==0) {
			// description		
			html[idx++] = "<td width=" + this._headerList[i]._width + ">";
			html[idx++] = AjxStringUtil.htmlEncode(domain.attrs[ZaDomain.A_description]);
			html[idx++] = "</td>";
		}
	}
	html[idx++] = "</tr></table>";
	div.innerHTML = html.join("");
	return div;
}

ZaDomainListView.prototype._getHeaderList =
function() {

	var headerList = new Array();
	//idPrefix, label, iconInfo, width, sortable, sortField, resizeable, visible
	headerList[0] = new ZaListHeaderItem(ZaDomain.A_domainName , ZaMsg.CLV_Name_col, null, 250, true, ZaDomain.A_domainName, true, true);
	//headerList[0].initialize(ZaMsg.CLV_Name_col, null, "245", true, ZaDomain.A_domainName);

	headerList[1] = new ZaListHeaderItem(ZaDomain.A_description, ZaMsg.CLV_Description_col, null, null, false, null, true, true);
	//headerList[1].initialize(ZaMsg.CLV_Description_col, null, "245", false, ZaDomain.A_description);
	
	return headerList;
}


