function ZmDomainPicker(parent) {

	ZmPicker.call(this, parent, ZmPicker.DOMAIN);

    this._checkedItems = new Object();
}

ZmDomainPicker.prototype = new ZmPicker;
ZmDomainPicker.prototype.constructor = ZmDomainPicker;

ZmPicker.CTOR[ZmPicker.DOMAIN] = ZmDomainPicker;

ZmDomainPicker.prototype.toString = 
function() {
	return "ZmDomainPicker";
}

ZmDomainPicker.onclick =
function(ev) {
	var el = DwtUiEvent.getTarget(ev);
	var picker = el._picker;
	if (el.checked) {
		picker._checkedItems[el.value] = 1;
	} else {
		delete picker._checkedItems[el.value];
 	}
	picker._updateQuery();
}

ZmDomainPicker.prototype._domainHtml =
function(domain, html, idx) {
	var divId = this._divIds[domain] = Dwt.getNextId();
	var inputId = this._inputIds[domain] = Dwt.getNextId();	
	html[idx++] = "<div id='";
	html[idx++] = divId;
	html[idx++] = "'><table cellpadding='0' cellspacing='0' border='0'><tr valign='middle'>";
	html[idx++] = "<td align='left'><input type='checkbox' id='";
	html[idx++] = inputId;
	html[idx++] = "'></input></td><td align='left' nowrap>";
	html[idx++] = domain;
	html[idx++] = "</td></tr></table></div>";
	return idx;
}

ZmDomainPicker.prototype._setupPicker =
function(parent) {
    this._elements = new Object();
	this._divIds = new Object();
	this._inputIds = new Object();
    var picker = new DwtComposite(parent);
	var fromId = Dwt.getNextId();
	var toId = Dwt.getNextId();
//    var selectId = Dwt.getNextId();
    var html = new Array(100);
    var idx = 0;

	// this probably doesn't belong here...
	if (ZmDomainPicker.root == null) {
		ZmDomainPicker.root = new ZmDomainTree(this.shell.getData(ZmAppCtxt.LABEL));
		ZmDomainPicker.root.load();
		var root = ZmDomainPicker.root.getRootDomain();
		ZmDomainPicker.domains = root.getSortedSubDomains();
	}
    
	html[idx++] = "<table cellpadding='3' cellspacing='0' border='0' style='width:100%;'>";
	html[idx++] = "<tr align='center' valign='middle'>";
	html[idx++] = "<td align='left'><input type='checkbox' checked id='" + fromId + "'/> " + ZmMsg.from + "</td>";
	html[idx++] = "<td align='left'><input type='checkbox' id='" + toId + "'/> " + ZmMsg.toCc + "</td>";
	html[idx++] = "</tr>";
	html[idx++] = "<tr>";
	html[idx++] = "<td nowrap align='left' colspan='2'><hr /></td>";
	html[idx++] = "</tr>";
	html[idx++] = "</table>";
	
	var domains = ZmDomainPicker.domains;
	for (var i in domains) {
		idx = this._domainHtml(domains[i].name, html, idx);
	}
	picker.getHtmlElement().innerHTML = html.join("");

	var doc = this.getDocument();
	for (var i in domains) {
		var domain = domains[i];
		var ip = Dwt.getDomObj(doc, this._inputIds[domain.name]);
		ip.onclick = ZmDomainPicker.onclick;
		ip.value = domain.name;
		ip._picker = this;
		ip._div = Dwt.getDomObj(doc, this._divIds[domain.name]);
		this._elements[domain.name] = ip;
	}	

	var from = this._from = Dwt.getDomObj(doc, fromId);
	from.onchange = ZmDomainPicker._onChange;
	from._picker = this;
	var to = this._to = Dwt.getDomObj(doc, toId);
	to.onchange = ZmDomainPicker._onChange;
	to._picker = this;

	this._updateDomains();
}

ZmDomainPicker._onChange =
function(ev) {
	var element = DwtUiEvent.getTarget(ev);
	var picker = element._picker;
	picker._updateDomains();
	picker._updateQuery();
}

ZmDomainPicker.prototype._updateDomains = 
function() {
	var domains = ZmDomainPicker.domains;
	for (var i in domains) {
		var domain = domains[i];
		var el = this._elements[domain.name];
		var newVisible = (this._from.checked && domain.hasFrom) ||
						 (this._to.checked && (domain.hasTo || domain.hasCc));
		if (Dwt.getVisible(el._div) != newVisible) {
			Dwt.setVisible(el._div, newVisible);
		}
		el.checked = false;
	}
    this._checkedItems = new Object();	
}

ZmDomainPicker.prototype._updateQuery = 
function() {
	var domains = new Array(10);
	var query = new Array(10);
	var idx = 0;
	var num = 0;

	var headers = new Array();
	if (this._from.checked)
		headers.push("from");
	if (this._to.checked)
		headers.push("to", "cc");
	var numHeaders = headers.length;

	if (numHeaders == 0) {
		this.setQuery("");
		this.execute();
		return;
 	}
 	
	domains[idx++] = "("
	for (var domain in this._checkedItems) {
		if (num++ > 0)
			domains[idx++] = " OR ";
		domains[idx++] = "@" + domain;
	}
	
	if (num > 0) {
		domains[idx++] = ")";	
		var domainExpr = domains.join("");// join with " OR " instead?
		idx = 0;
		if (numHeaders > 1) 
			query[idx++] = "(";
		for (var h in headers) {
			if (h > 0)
				query[idx++] = " OR ";
			query[idx++] = headers[h];
			query[idx++] = ":";
			query[idx++] = domainExpr;			
		}			
		if (numHeaders > 1) 
			query[idx++] = ")";		
		this.setQuery(query.join(""));
	} else {
		this.setQuery("");
	}
	this.execute();
}
