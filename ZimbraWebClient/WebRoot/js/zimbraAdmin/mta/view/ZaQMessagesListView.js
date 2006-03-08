/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: ZPL 1.1
 * 
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.1 ("License"); you may not use this file except in
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
 * Portions created by Zimbra are Copyright (C) 2005 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s):
 * 
 * ***** END LICENSE BLOCK *****
 */
 
 /**
 * @author Greg Solovyev
 **/
function ZaQMessagesListView(parent, className, posStyle, headerList) {
	//var headerList = this._getHeaderList();
	ZaListView.call(this, parent, className, posStyle, headerList);
}

ZaQMessagesListView.prototype = new ZaListView;
ZaQMessagesListView.prototype.constructor = ZaQMessagesListView;

ZaQMessagesListView.prototype.toString = function() {
	return "ZaQMessagesListView";
};

ZaQMessagesListView.prototype._createItemHtml =
function(item) {
	var html = new Array(50);
	var	div = document.createElement("div");
	div._styleClass = "Row";
	div._selectedStyleClass = div._styleClass + "-" + DwtCssStyle.SELECTED;
	div.className = div._styleClass;
	this.associateItemWithElement(item, div, DwtListView.TYPE_LIST_ITEM);
	
	var idx = 0;
	html[idx++] = "<table width='100%' cellspacing='2' cellpadding='0'>";

	html[idx++] = "<tr>";
	if(this._headerList) {
		var cnt = this._headerList.length;
		for(var i = 0; i < cnt; i++) {
			var id = this._headerList[i]._id;
			if(id.indexOf(ZaMTA.A_name)==0) {
				// type
				html[idx++] = "<td width=" + this._headerList[i]._width + ">";
				html[idx++] = AjxStringUtil.htmlEncode(item[ZaMTA.A_name]);
				html[idx++] = "</td>";
			} else if(id.indexOf(ZaMTA.A_count)==0) {
				// name
				html[idx++] = "<td width=" + this._headerList[i]._width + ">";
				html[idx++] = item[ZaMTA.A_count];
				html[idx++] = "</td>";
			} else if(id.indexOf(ZaMTA.A_Qid)==0) {
				// name
				html[idx++] = "<td width=" + this._headerList[i]._width + ">";
				html[idx++] = item[ZaMTA.A_Qid];
				html[idx++] = "</td>";
			} else if(id.indexOf(ZaMTA.A_destination)==0) {
				// name
				html[idx++] = "<td width=" + this._headerList[i]._width + ">";
				html[idx++] = AjxStringUtil.htmlEncode(item[ZaMTA.A_destination]);
				html[idx++] = "</td>";
			} else if(id.indexOf(ZaMTA.A_origin)==0) {
				// name
				html[idx++] = "<td width=" + this._headerList[i]._width + ">";
				html[idx++] = AjxStringUtil.htmlEncode(item[ZaMTA.A_origin]);
				html[idx++] = "</td>";
			}else if(id.indexOf(ZaMTA.A_error)==0) {
				// name
				html[idx++] = "<td width=" + this._headerList[i]._width + ">";
				html[idx++] =item[ZaMTA.A_error];
				html[idx++] = "</td>";
			}				
		}
	} else {
		html[idx++] = "<td width=100%>";
		html[idx++] = AjxStringUtil.htmlEncode(item);
		html[idx++] = "</td>";
	}
	
	html[idx++] = "</tr></table>";
	div.innerHTML = html.join("");
	return div;
}


ZaQMessagesListView.prototype._setNoResultsHtml = function() {
	var buffer = new AjxBuffer();
	var	div = document.createElement("div");
	
	buffer.append("<table width='100%' cellspacing='0' cellpadding='1'>",
				  "<tr><td class='NoResults'><br>&nbsp",
				  "</td></tr></table>");
	
	div.innerHTML = buffer.toString();
	this._addRow(div);
};

ZaQMessagesListView.prototype._sortColumn = function (columnItem, bSortAsc){
	if (bSortAsc) {
		var comparator = function (a, b) {
			return (a < b)? 1 :((a > b)? -1 : 0);
		};
		this.getList().sort(comparator);
	} else {
		this.getList().sort();
	}
};
