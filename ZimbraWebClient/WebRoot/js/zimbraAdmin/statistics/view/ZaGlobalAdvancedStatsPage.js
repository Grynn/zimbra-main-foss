/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2009 Zimbra, Inc.
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

/**
* @class ZaGlobalAdvancedStatsPage 
* @contructor ZaGlobalAdvancedStatsPage
* @param parent
* @param app
* @author Perry Nguyen
**/
ZaGlobalAdvancedStatsPage = function(parent) {
	DwtTabViewPage.call(this, parent);
	this._fieldIds = new Object(); //stores the ids of all the form elements
	this._app = ZaApp.getInstance();
	//this._createHTML();
	this.initialized=false;
	this.setScrollStyle(DwtControl.SCROLL);	
}
 
ZaGlobalAdvancedStatsPage.prototype = new DwtTabViewPage;
ZaGlobalAdvancedStatsPage.prototype.constructor = ZaGlobalAdvancedStatsPage;

ZaGlobalAdvancedStatsPage.prototype.toString = 
function() {
	return "ZaGlobalAdvancedStatsPage";
}

ZaGlobalAdvancedStatsPage.prototype.showMe =  function(refresh) {
	DwtTabViewPage.prototype.showMe.call(this);	
	if(refresh) {
		this.setObject();
	}
	if (!this._chartHtmlShown) {
        ZaGlobalAdvancedStatsPage.insertChartHTML(this.getHtmlElement());
        this._chartHtmlShown = true;
	}
}

ZaGlobalAdvancedStatsPage.getDataTipText = function (item, index, series) {
    var text = series.displayName + " at " + YAHOO.util.Date.format(item.timestamp, { format: "%I:%M" }) + "\n" + ZaGlobalAdvancedStatsPage.formatLabel(item[series.yField]);
    return text;
}
/* must be global for getDataTipText */
ZaGlobalAdvancedStatsPage.formatLabel = function (value) {
    return YAHOO.util.Number.format(value, { thousandsSeparator: ",", decimalPlaces: 0});
}
ZaGlobalAdvancedStatsPage.formatTimeLabel = function (value) {
    return YAHOO.util.Date.format(value, { format: "%I:%M %p" });
}

ZaGlobalAdvancedStatsPage.plotGlobalQuickChart = function (id, group, columns, start, end) {
    var soapRequest = AjxSoapDoc.create("GetLoggerStatsRequest", ZaZimbraAdmin.URN, null);
    soapRequest.set("startTime", { "!time": start });
    soapRequest.set("endTime", { "!time": end });
    var child = soapRequest.set("stats", { "!name" : group });
    var csfeParams = { soapDoc: soapRequest };
    var reqMgrParams = { controller: ZaApp.getInstance().getCurrentController(), busyMsg: ZaMsg.PQ_LOADING };
    var soapResponse = ZaRequestMgr.invoke(csfeParams, reqMgrParams).Body.GetLoggerStatsResponse;
    
    if (!soapResponse.hostname || !soapResponse.hostname[0].stats) {
        var e = document.getElementById("loggerchart" + id);
        e.textContent = "no data available";
        return;
    }
    var data = {};
    if (soapResponse.hostname) {
        for (var i = 0; i < soapResponse.hostname.length; i++) {
            if (!soapResponse.hostname[i].stats) continue;
            var stats = soapResponse.hostname[i].stats;
            if (!stats[0].values) continue;
            for (var j = 0; j < stats[0].values.length; j++) {
                var setOrIncrement = false;
                if (!data[stats[0].values[j].t]) {
                    data[stats[0].values[j].t] = {};
                    setOrIncrement = true;
                }
                for (var m = 0; m < stats[0].values[j].stat.length; m++) {
                    if (setOrIncrement)
                        data[stats[0].values[j].t][stats[0].values[j].stat[m].name] = stats[0].values[j].stat[m].value;
                    else
                        data[stats[0].values[j].t][stats[0].values[j].stat[m].name] += stats[0].values[j].stat[m].value;
                }
            }
        }
    }
    
    var newData = [];
    for (var i in data) {
        record = { timestamp: new Date(i * 1000) };
        for (var j in data[i]) {
            record[j] = data[i][j];
        }
        // skip missing values, we can't assume it's a zero or lost value
        var skipRec = false;
        for (var j = 0; j < columns.length; j++) {
            if (!record[columns[j]]) {
                //record[columns[j]] = 0;
                skipRec = true;
                break;
            }
        }
        if (!skipRec) {
            newData.push(record);
        }
    }
    if (newData.length < 1) {
        var e = document.getElementById("loggerchart" + id);
        e.textContent = "no data available";
        return;
    }

    var colDef = [];
    for (var i = 0; i < columns.length; i++) {
        colDef.push({ displayName: columns[i], yField: columns[i] });
    }
    var fields = [ "timestamp" ];
    for (var i = 0; i < columns.length; i++) {
        fields.push(columns[i]);
    }

    //document.getElementById("for-testing").textContent = newData.length + " :: " + AjxStringUtil.objToString(newData);
    ZaGlobalAdvancedStatsPage.plotChart(id, fields, colDef, newData);
}

ZaGlobalAdvancedStatsPage.plotQuickChart = function (id, hostname, group, columns, start, end) {
    var soapRequest = AjxSoapDoc.create("GetLoggerStatsRequest", ZaZimbraAdmin.URN, null);
    soapRequest.set("hostname", { "!hn": hostname });
    soapRequest.set("startTime", { "!time": start });
    soapRequest.set("endTime", { "!time": end });
    var child = soapRequest.set("stats", { "!name" : group });
    var csfeParams = { soapDoc: soapRequest };
    var reqMgrParams = { controller: ZaApp.getInstance().getCurrentController(), busyMsg: ZaMsg.PQ_LOADING };
    var soapResponse = ZaRequestMgr.invoke(csfeParams, reqMgrParams).Body.GetLoggerStatsResponse;
    
    if (!soapResponse.hostname || !soapResponse.hostname[0].stats) {
        var e = document.getElementById("loggerchart" + id);
        e.textContent = "no data available";
        return;
    }
    var values = soapResponse.hostname[0].stats[0].values;
    if (!values) {
        var e = document.getElementById("loggerchart" + id);
        e.textContent = "no data available";
        return;
    }
    
    var newData = [];
    
    for (var i = 0; i < values.length; i++) {
        var ts = new Date(values[i].t * 1000);
        var record = { timestamp: ts };
        for (var j = 0; j < values[i].stat.length; j++) {
            if (columns.indexOf(values[i].stat[j].name) != -1) {
                record[values[i].stat[j].name] = values[i].stat[j].value;
            }
        }
        // skip missing values, we can't assume it's a zero or last value
        var skipRec = false;
        for (var j = 0; j < columns.length; j++) {
            if (!record[columns[j]]) {
                //record[columns[j]] = 0;
                skipRec = true;
                break;
            }
        }
        if (!skipRec) {
            newData.push(record);
        }
    }
    if (newData.length < 1) {
        var e = document.getElementById("loggerchart" + id);
        e.textContent = "no data available";
        return;
    }
    var colDef = [];
    for (var i = 0; i < columns.length; i++) {
        colDef.push({ displayName: columns[i], yField: columns[i] });
    }
    var fields = [ "timestamp" ];
    for (var i = 0; i < columns.length; i++) {
        fields.push(columns[i]);
    }

    //document.getElementById("for-testing").textContent = newData.length + " :: " + AjxStringUtil.objToString(newData);
    ZaGlobalAdvancedStatsPage.plotChart(id, fields, colDef, newData);
}

ZaGlobalAdvancedStatsPage.plotChart = function (id, fields, colDef, newData) {
    var yAxis = new YAHOO.widget.NumericAxis();
    var max = 0;
    for (var i = 0; i < colDef.length; i++) {
        colDef[i].style = { size: 3, lineSize: 1 };
    }
    for (var i = 0; i < newData.length; i++) {
        for (var j = 0; j < colDef.length; j++) {
            max = Math.max(max, newData[i][colDef[j].yField]);
        }
    }
    // doesn't work right in 2.7.0
    //yAxis.scale = "logarithmic";
    yAxis.maximum = max + 10;
    yAxis.labelFunction = ZaGlobalAdvancedStatsPage.formatLabel;
    var timeAxis = new YAHOO.widget.TimeAxis();
    timeAxis.labelFunction = ZaGlobalAdvancedStatsPage.formatTimeLabel;
    var seriesDef = colDef;
    
    var data_source = new YAHOO.util.DataSource(newData);
    ZaGlobalAdvancedStatsPage.CHART_DATA_SOURCE = data_source;
    data_source.responseType = YAHOO.util.DataSource.TYPE_JSARRAY;
    data_source.responseSchema = { fields: fields };
    var div = document.getElementById("loggerchart" + id);
    div.style.height = "200px";
    new YAHOO.widget.LineChart("loggerchart" + id, data_source,
            { xField: "timestamp",
              wmode: "transparent",
              series: seriesDef,
              yAxis: yAxis,
              xAxis: timeAxis,
              dataTipFunction: ZaGlobalAdvancedStatsPage.getDataTipText,
              style: { legend: { display: "bottom" } }
            }
    );
    
}

ZaGlobalAdvancedStatsPage.prototype.setObject =
function (data) {
    // no-op
}

ZaGlobalAdvancedStatsPage.serverSelected = function(evt, id) {
    var select = evt.target;
    
    var hostname = select[select.selectedIndex].value;
    
    var soapRequest = AjxSoapDoc.create("GetLoggerStatsRequest", ZaZimbraAdmin.URN, null);
    soapRequest.set("hostname", { "!hn": hostname });
    var csfeParams = { soapDoc: soapRequest };
    var reqMgrParams = { controller: ZaApp.getInstance().getCurrentController(), busyMsg: ZaMsg.PQ_LOADING };
    var soapResponse = ZaRequestMgr.invoke(csfeParams, reqMgrParams).Body.GetLoggerStatsResponse;
    
    var groupSelect = document.getElementById("select-group" + id);
    var statGroups = soapResponse.hostname[0].stats;
    ZaGlobalAdvancedStatsPage.clearSelect(groupSelect);
    for (var i = 0, j = statGroups.length; i < j; i++) {
        var option = document.createElement("option");
        if (i == 0) option.selected = "selected";
        option.value = statGroups[i].name;
        option.textContent = statGroups[i].name;
        groupSelect.appendChild(option);
    }
    ZaGlobalAdvancedStatsPage.groupSelected({ target: groupSelect }, id);
    
}

ZaGlobalAdvancedStatsPage.clearSelect = function (node) {
    var options = node.getElementsByTagName("option");
    for (var i = node.childNodes.length; i > 0; i--)
        node.removeChild(node.childNodes.item(i - 1));
}
ZaGlobalAdvancedStatsPage.groupSelected = function(evt, id) {
    var select = evt.target;
    
    var serverSelect = document.getElementById("select-servers" + id);
    var hostname = serverSelect[serverSelect.selectedIndex].value;
    var group = select[select.selectedIndex].value;
    
    var counterSelect = document.getElementById("select-counter" + id);
    ZaGlobalAdvancedStatsPage.clearSelect(counterSelect);
    var statCounters = ZaGlobalAdvancedStatsPage.getCounters(hostname, group);
    for (var i = 0, j = statCounters.length; i < j; i++) {
        var option = document.createElement("option");
        option.value = statCounters[i];
        option.textContent = statCounters[i];
        counterSelect.appendChild(option);
    }
}

ZaGlobalAdvancedStatsPage.getCounters = function(hostname, group) {
    var soapRequest = AjxSoapDoc.create("GetLoggerStatsRequest", ZaZimbraAdmin.URN, null);
    soapRequest.set("hostname", { "!hn": hostname });
    var child = soapRequest.set("stats", { "!name" : group });
    soapRequest.set(null, "get-counters", child);
    var csfeParams = { soapDoc: soapRequest };
    var reqMgrParams = { controller: ZaApp.getInstance().getCurrentController(), busyMsg: ZaMsg.PQ_LOADING };
    var soapResponse = ZaRequestMgr.invoke(csfeParams, reqMgrParams).Body.GetLoggerStatsResponse;
    
    var statCounters = soapResponse.hostname[0].stats[0].values[0].stat;
    var counters = [];
    for (var i = 0, j = statCounters.length; i < j; i++) {
        counters.push(statCounters[i].name);
    }
    return counters;
}

ZaGlobalAdvancedStatsPage.counterSelected = function(event, id) {
    var select = event.target;
    
    var serverSelect = document.getElementById("select-servers" + id);
    var hostname = serverSelect[serverSelect.selectedIndex].value;
    var groupSelect = document.getElementById("select-group" + id);
    var group = groupSelect[groupSelect.selectedIndex].value;
    
    var selected = [];
    var index = 0;
    for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].selected)
            selected[index++] = select.options[i].value;
    }
    if (selected.length == 0)
        return;
    
    var startTime = document.getElementById("input-start-time" + id).value;
    var endTime = document.getElementById("input-end-time" + id).value;
    ZaGlobalAdvancedStatsPage.plotQuickChart(id, hostname, group, selected, startTime, endTime);
}

ZaGlobalAdvancedStatsPage.showhide = function(id) {
    var e = document.getElementById(id);
    e.style.display = e.style.display == "none" ? "block" : "none";
}

ZaGlobalAdvancedStatsPage.removeChild = function(id) {
    var e = document.getElementById(id);
    e.parentNode.removeChild(e);
}

ZaGlobalAdvancedStatsPage.insertChartHTML = function(element) {
	var id = Math.random();
	var form = document.createElement("form");
	form.style.margin = "5px 20px";
	form.id = "loggerform" + id;
	form.onsubmit = "return false;";
	form.action = "#";
	
	var table = document.createElement("table");
	table.id = "loggertable" + id;
	
	var label;
	var tr;
	var td;
	var select;
	tr = document.createElement("tr");
	td = document.createElement("td");
	label = document.createElement("label");
	label.htmlFor = "select-servers" + id;
	label.textContent = "Server:";
	select = document.createElement("select");
	select.id = "select-servers" + id;
	select.name = "servers";
	select.onchange = function(evt) { ZaGlobalAdvancedStatsPage.serverSelected(evt, id); }
	td.vAlign = "top";
	td.appendChild(label);
	td.appendChild(select);
	tr.appendChild(td);
	td = document.createElement("td");
	label = document.createElement("label");
	label.htmlFor = "select-group" + id;
	label.textContent = "Group:";
	select = document.createElement("select");
	select.id = "select-group" + id;
	select.name = "groups";
	select.onchange = function(evt) { ZaGlobalAdvancedStatsPage.groupSelected(evt, id); }
	td.vAlign = "top";
	td.appendChild(label);
	td.appendChild(select);
	tr.appendChild(td);
	td = document.createElement("td");
	label = document.createElement("label");
	label.htmlFor = "select-counter" + id;
	label.textContent = "Counters:";
	select = document.createElement("select");
	select.id = "select-counter" + id;
	select.name = "counters";
	select.multiple = true;
	select.size = 5;
	select.onchange = function(evt) { ZaGlobalAdvancedStatsPage.counterSelected(evt, id); }
	td.vAlign = "top";
	td.appendChild(label);
	td.appendChild(select);
	tr.appendChild(td);
	table.appendChild(tr);
	
	var input;
	tr = document.createElement("tr");
	td = document.createElement("td");
	label = document.createElement("label");
	label.htmlFor = "input-start-time" + id;
	label.textContent = "Start:";
	input = document.createElement("input");
	input.id = "input-start-time" + id;
	input.type = "text";
	input.name = "startTime";
	input.value = "now-1d";
	td.appendChild(label);
	td.appendChild(input);
	td.valign = "top";
	tr.appendChild(td);
	td = document.createElement("td");
	label = document.createElement("label");
	label.htmlFor = "input-end-time" + id;
	label.textContent = "end:";
	input = document.createElement("input");
	input.id = "input-end-time" + id;
	input.type = "text";
	input.name = "endTime";
	input.value = "now";
	td.appendChild(label);
	td.appendChild(input);
	td.valign = "top";
	tr.appendChild(td);
	table.appendChild(tr);
	
	form.appendChild(table);
	
	var a;
	var span;
	a = document.createElement("a");
	a.href = "#";
	a.onclick = function () { ZaGlobalAdvancedStatsPage.showhide("loggertable" + id); }
	a.textContent = "Toggle Form";
	form.appendChild(a);
	
	span = document.createElement("span");
	span.textContent = " | ";
	form.appendChild(span);
	a = document.createElement("a");
	a.href = "#";
	a.onclick = function () {
	    var s = document.getElementById("select-counter" + id);
	    ZaGlobalAdvancedStatsPage.counterSelected({ target: s }, id);
    }
	a.textContent = "Update Chart";
	form.appendChild(a);
	span = document.createElement("span");
	span.textContent = " | ";
	form.appendChild(span);
	a = document.createElement("a");
	a.href = "#";
	a.onclick = function () {
	    ZaGlobalAdvancedStatsPage.removeChild("loggerform" + id);
	    ZaGlobalAdvancedStatsPage.removeChild("loggerchart" + id);
    }
	a.textContent = "Remove Chart";
	form.appendChild(a);
	
	var div = document.createElement("div");
	div.style.padding = "20px";
	div.id = "loggerchart" + id;
	element.appendChild(form);
	element.appendChild(div);
	
    var serversSelect = document.getElementById("select-servers" + id);
    var soapRequest = AjxSoapDoc.create("GetLoggerStatsRequest", ZaZimbraAdmin.URN, null);
    var csfeParams = { soapDoc: soapRequest };
    var reqMgrParams = { controller: ZaApp.getInstance().getCurrentController(), busyMsg: ZaMsg.PQ_LOADING };
    var soapResponse = ZaRequestMgr.invoke(csfeParams, reqMgrParams).Body.GetLoggerStatsResponse;
    ZaGlobalAdvancedStatsPage.clearSelect(serversSelect);
    for (var i = 0, j = soapResponse.hostname.length; i < j; i++) {
        var option = document.createElement("option");
        if (i == 0) option.selected = "selected";
        option.value = soapResponse.hostname[i].hn;
        option.textContent = soapResponse.hostname[i].hn;
        serversSelect.appendChild(option);
    }
    ZaGlobalAdvancedStatsPage.serverSelected({ target: serversSelect }, id);
}

ZaGlobalAdvancedStatsPage.prototype._createHtml = 
function () {
	DwtTabViewPage.prototype._createHtml.call(this);
	var element = this.getHtmlElement();
	var div = document.createElement("div");
	div.style.padding = "20px";
	var a = document.createElement("a");
	a.textContent = "Add chart";
	a.onclick = function () { ZaGlobalAdvancedStatsPage.insertChartHTML(element); };
	div.appendChild(a);
	element.appendChild(div);
	//ZaGlobalAdvancedStatsPage.insertChartHTML(element);
}