/**
* @class ZaGlobalMsgsStatsPage 
* @contructor ZaGlobalMsgsStatsPage
* @param parent
* @param app
* @author Greg Solovyev
**/
function ZaGlobalMsgsStatsPage (parent, app) {
	DwtTabViewPage.call(this, parent);
	this._fieldIds = new Object(); //stores the ids of all the form elements
	this._app = app;
	this._createHTML();
	this.initialized=false;
	this.setScrollStyle(DwtControl.SCROLL);		
}
 
ZaGlobalMsgsStatsPage.prototype = new DwtTabViewPage;
ZaGlobalMsgsStatsPage.prototype.constructor = ZaGlobalMsgsStatsPage;

ZaGlobalMsgsStatsPage.prototype.toString = 
function() {
	return "ZaGlobalMsgsStatsPage";
}

ZaGlobalMsgsStatsPage.prototype._createHTML = 
function () {
	var idx = 0;
	var html = new Array(50);
	html[idx++] = "<div style='width:70ex;'>";		
	html[idx++] = "<table cellpadding='5' cellspacing='4' border='0' align='left'>";	
	html[idx++] = "<tr valign='top'><td align='left' class='StatsImageTitle'>" + AjxStringUtil.htmlEncode(ZaMsg.NAD_StatsMsgsZastDay) + "</td></tr>";	
	html[idx++] = "<tr valign='top'><td align='left'>";
	html[idx++] = "<img src='/service/statsimg/$y$temw1de/rcvdmsgs/d/1'>";
	html[idx++] = "</td></tr>";
	html[idx++] = "<tr valign='top'><td align='left'>&nbsp;&nbsp;</td></tr>";	
	html[idx++] = "<tr valign='top'><td align='left' class='StatsImageTitle'>" + AjxStringUtil.htmlEncode(ZaMsg.NAD_StatsMsgsZast3Months) + "</td></tr>";	
	html[idx++] = "<tr valign='top'><td align='left'>";
	html[idx++] = "<img src='/service/statsimg/$y$temw1de/rcvdmsgs/m/3'>";
	html[idx++] = "</td></tr>";
	html[idx++] = "<tr valign='top'><td align='left'>&nbsp;&nbsp;</td></tr>";		
	html[idx++] = "<tr valign='top'><td align='left' class='StatsImageTitle'>" + AjxStringUtil.htmlEncode(ZaMsg.NAD_StatsMsgsZast12Months) + "</td></tr>";	
	html[idx++] = "<tr valign='top'><td align='left'>";
	html[idx++] = "<img src='/service/statsimg/$y$temw1de/rcvdmsgs/m/12'>";
	html[idx++] = "</td></tr>";
	html[idx++] = "</table>";
	html[idx++] = "</div>";	
	this.getHtmlElement().innerHTML = html.join("");
}