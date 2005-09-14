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
 * The Original Code is: Zimbra Collaboration Suite.
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
* @class ZaServer
* This class represents zimbraServer objects. ZaServer extends ZaItem
* @author Greg Solovyev
* @contructor ZaServer
* @param app reference to the application instance
**/
function ZaServer(app) {
	ZaItem.call(this, app);
	this.attrs = new Object();
	this.id = "";
	this.name="";
}

ZaServer.prototype = new ZaItem;
ZaServer.prototype.constructor = ZaServer;
ZaServer.prototype.toString = function() {
	return this.name;
}

//attribute name constants, this values are taken from zimbra.schema
ZaServer.A_name = "cn";
ZaServer.A_description = "description";
ZaServer.A_notes = "zimbraNotes";
ZaServer.A_Service = "zimbraService";
ZaServer.A_ServiceHostname = "zimbraServiceHostname";
ZaServer.A_zimbraMailPort = "zimbraMailPort";
ZaServer.A_zimbraMailSSLPort = "zimbraMailSSLPort";
// services
ZaServer.A_zimbraServiceInstalled = "zimbraServiceInstalled";
ZaServer.A_zimbraLdapServiceInstalled = "_"+ZaServer.A_zimbraServiceInstalled+"_ldap";
ZaServer.A_zimbraMailboxServiceInstalled = "_"+ZaServer.A_zimbraServiceInstalled+"_mailbox";
ZaServer.A_zimbraMtaServiceInstalled = "_"+ZaServer.A_zimbraServiceInstalled+"_mta";
ZaServer.A_zimbraSnmpServiceInstalled = "_"+ZaServer.A_zimbraServiceInstalled+"_snmp";
ZaServer.A_zimbraAntiVirusServiceInstalled = "_"+ZaServer.A_zimbraServiceInstalled+"_antivirus";
ZaServer.A_zimbraAntiSpamServiceInstalled = "_"+ZaServer.A_zimbraServiceInstalled+"_antispam";
ZaServer.A_zimbraServiceEnabled = "zimbraServiceEnabled";
ZaServer.A_zimbraLdapServiceEnabled = "_"+ZaServer.A_zimbraServiceEnabled+"_ldap";
ZaServer.A_zimbraMailboxServiceEnabled = "_"+ZaServer.A_zimbraServiceEnabled+"_mailbox";
ZaServer.A_zimbraMtaServiceEnabled = "_"+ZaServer.A_zimbraServiceEnabled+"_mta";
ZaServer.A_zimbraSnmpServiceEnabled = "_"+ZaServer.A_zimbraServiceEnabled+"_snmp";
ZaServer.A_zimbraAntiVirusServiceEnabled = "_"+ZaServer.A_zimbraServiceEnabled+"_antivirus";
ZaServer.A_zimbraAntiSpamServiceEnabled = "_"+ZaServer.A_zimbraServiceEnabled+"_antispam";
// MTA
ZaServer.A_zimbraMtaAuthEnabled = "zimbraMtaAuthEnabled";
ZaServer.A_zimbraMtaDnsLookupsEnabled = "zimbraMtaDnsLookupsEnabled";
ZaServer.A_zimbraMtaRelayHost = "zimbraMtaRelayHost";
ZaServer.A_zimbraMtaTlsAuthOnly = "zimbraMtaTlsAuthOnly";
//smtp
ZaServer.A_SmtpHostname  = "zimbraSmtpHostname";
ZaServer.A_SmtpPort = "zimbraSmtpPort";
ZaServer.A_SmtpTimeout = "zimbraSmtpTimeout";
//Lmtp
ZaServer.A_LmtpAdvertisedName = "zimbraLmtpAdvertisedName";
ZaServer.A_LmtpBindAddress = "zimbraLmtpBindAddress";
ZaServer.A_LmtpBindPort = "zimbraLmtpBindPort";
ZaServer.A_LmtpNumThreads = "zimbraLmtpNumThreads";
//pop3
ZaServer.A_Pop3NumThreads = "zimbraPop3NumThreads";
ZaServer.A_Pop3AdvertisedName ="zimbraPop3AdvertisedName";
ZaServer.A_Pop3BindAddress = "zimbraPop3BindAddress";
ZaServer.A_Pop3BindPort = "zimbraPop3BindPort";
ZaServer.A_Pop3SSLBindPort = "zimbraPop3SSLBindPort";
ZaServer.A_Pop3SSLServerEnabled = "zimbraPop3SSLServerEnabled";
ZaServer.A_Pop3ServerEnabled = "zimbraPop3ServerEnabled"
ZaServer.A_Pop3CleartextLoginEnabled = "zimbraPop3CleartextLoginEnabled";
//imap
ZaServer.A_ImapBindPort="zimbraImapBindPort";
ZaServer.A_ImapServerEnabled="zimbraImapServerEnabled";
ZaServer.A_ImapSSLBindPort="zimbraImapSSLBindPort";
ZaServer.A_ImapSSLServerEnabled="zimbraImapSSLServerEnabled";
ZaServer.A_ImapCleartextLoginEnabled="zimbraImapCleartextLoginEnabled";

//redo log
ZaServer.A_RedologEnabled = "zimbraRedologEnabled";
ZaServer.A_RedologLogPath = "zimbraRedologLogPath";
ZaServer.A_RedologArchiveDir = "zimbraRedologArchiveDir";
ZaServer.A_RedologBacklogDir = "zimbraRedologBacklogDir";
ZaServer.A_RedologRolloverFileSizeKB = "zimbraRedologRolloverFileSizeKB";
ZaServer.A_RedologFsyncIntervalMS = "zimbraRedologFsyncIntervalMS";
//master role settings
ZaServer.A_MasterRedologClientConnections = "zimbraMasterRedologClientConnections";
ZaServer.A_MasterRedologClientTimeoutSec = "zimbraMasterRedologClientTimeoutSec";
ZaServer.A_MasterRedologClientTcpNoDelay = "zimbraMasterRedologClientTcpNoDelay";
//slave role settings
ZaServer.A_zimbraUserServicesEnabled = "zimbraUserServicesEnabled";

// other
ZaServer.A_zimbraIsMonitorHost = "zimbraIsMonitorHost";

ZaServer.STANDALONE = "standalone";
ZaServer.MASTER = "master";
ZaServer.SLAVE = "slave";
		
ZaServer.myXModel = {
	items: [
		{id:ZaItem.A_zimbraId, type:_STRING_, ref:"attrs/" + ZaItem.A_zimbraId},
		{id:ZaServer.A_name, ref:"attrs/" + ZaServer.A_name, type:_STRING_},
		{id:ZaServer.A_description, ref:"attrs/" +  ZaServer.A_description, type:_STRING_},
		{id:ZaServer.A_notes, ref:"attrs/" +  ZaServer.A_notes, type:_STRING_},		
		{id:ZaServer.A_Service, ref:"attrs/" +  ZaServer.A_Service, type:_STRING_, maxLength: 256 },
		{id:ZaServer.A_ServiceHostname, ref:"attrs/" +  ZaServer.A_ServiceHostname, type:_HOSTNAME_OR_IP_, maxLength: 256 },
		// Services
		{id:ZaServer.A_zimbraLdapServiceEnabled, ref:"attrs/"+ZaServer.A_zimbraLdapServiceEnabled, type: _ENUM_, choices: [false,true] },
		{id:ZaServer.A_zimbraMailboxServiceEnabled, ref:"attrs/"+ZaServer.A_zimbraMailboxServiceEnabled, type: _ENUM_, choices: [false,true] },
		{id:ZaServer.A_zimbraMtaServiceEnabled, ref:"attrs/"+ZaServer.A_zimbraMtaServiceEnabled, type: _ENUM_, choices: [false,true] },
		{id:ZaServer.A_zimbraSnmpServiceEnabled, ref:"attrs/"+ZaServer.A_zimbraSnmpServiceEnabled, type: _ENUM_, choices: [false,true] },
		{id:ZaServer.A_zimbraAntiVirusServiceEnabled, ref:"attrs/"+ZaServer.A_zimbraAntiVirusServiceEnabled, type: _ENUM_, choices: [false,true] },
		{id:ZaServer.A_zimbraAntiSpamServiceEnabled, ref:"attrs/"+ZaServer.A_zimbraAntiSpamServiceEnabled, type: _ENUM_, choices: [false,true] },
		// MTA
		{id:ZaServer.A_zimbraMtaAuthEnabled, ref:"attrs/" +  ZaServer.A_zimbraMtaAuthEnabled, type: _ENUM_, choices: ZaModel.BOOLEAN_CHOICES },
		{id:ZaServer.A_zimbraMtaTlsAuthOnly, ref:"attrs/" +  ZaServer.A_zimbraMtaTlsAuthOnly, type: _ENUM_, choices: ZaModel.BOOLEAN_CHOICES },
		{id:ZaServer.A_zimbraMtaRelayHost, ref:"attrs/" +  ZaServer.A_zimbraMtaRelayHost, type: _HOSTNAME_OR_IP_, maxLength: 256 },
		{id:ZaServer.A_zimbraMtaDnsLookupsEnabled, ref:"attrs/" +  ZaServer.A_zimbraMtaDnsLookupsEnabled, type: _ENUM_, choices: ZaModel.BOOLEAN_CHOICES },
		// ...other...
		{id:ZaServer.A_SmtpHostname, ref:"attrs/" +  ZaServer.A_SmtpHostname, type:_HOSTNAME_OR_IP_, maxLength: 256 },
		{id:ZaServer.A_SmtpPort, ref:"attrs/" +  ZaServer.A_SmtpPort, type:_PORT_},
		{id:ZaServer.A_SmtpTimeout, ref:"attrs/" + ZaServer.A_SmtpTimeout, type:_NUMBER_, minInclusive: 0 },
		{id:ZaServer.A_LmtpAdvertisedName, ref:"attrs/" +  ZaServer.A_LmtpAdvertisedName, type:_STRING_, maxLength: 128 },
		{id:ZaServer.A_LmtpBindAddress, ref:"attrs/" +  ZaServer.A_LmtpBindAddress, type:_HOSTNAME_OR_IP_, maxLength: 256 },
		{id:ZaServer.A_LmtpBindPort, ref:"attrs/" +  ZaServer.A_LmtpBindPort, type:_PORT_},		
		{id:ZaServer.A_LmtpNumThreads, ref:"attrs/" +  ZaServer.A_LmtpNumThreads, type:_NUMBER_, minInclusive: 0 },
		{id:ZaServer.A_Pop3NumThreads, ref:"attrs/" +  ZaServer.A_Pop3NumThreads, type:_NUMBER_, minInclusive: 0 },		
		{id:ZaServer.A_Pop3AdvertisedName, ref:"attrs/" +  ZaServer.A_Pop3AdvertisedName, type:_STRING_, maxLength: 128 },
		{id:ZaServer.A_Pop3BindAddress, ref:"attrs/" +  ZaServer.A_Pop3BindAddress, type:_HOSTNAME_OR_IP_, maxLength: 128 },
		{id:ZaServer.A_Pop3NumThreads, ref:"attrs/" +  ZaServer.A_Pop3NumThreads, type:_NUMBER_, minInclusive: 0 },		
		{id:ZaServer.A_Pop3AdvertisedName, ref:"attrs/" +  ZaServer.A_Pop3AdvertisedName, type:_STRING_, maxLength: 128 },
		{id:ZaServer.A_Pop3BindAddress, ref:"attrs/" +  ZaServer.A_Pop3BindAddress, type:_HOSTNAME_OR_IP_, maxLength: 128 },
		{id:ZaServer.A_Pop3BindPort, ref:"attrs/" +  ZaServer.A_Pop3BindPort, type:_PORT_ },
		{id:ZaServer.A_Pop3SSLBindPort, ref:"attrs/" +  ZaServer.A_Pop3SSLBindPort, type:_PORT_ },
		{id:ZaServer.A_Pop3SSLServerEnabled, ref:"attrs/" + ZaServer.A_Pop3SSLServerEnabled, type:_ENUM_, choices:ZaModel.BOOLEAN_CHOICES},		
		{id:ZaServer.A_Pop3ServerEnabled, ref:"attrs/" + ZaServer.A_Pop3ServerEnabled, type:_ENUM_, choices:ZaModel.BOOLEAN_CHOICES},		
		{id:ZaServer.A_Pop3CleartextLoginEnabled, ref:"attrs/" + ZaServer.A_Pop3CleartextLoginEnabled, type:_ENUM_, choices:ZaModel.BOOLEAN_CHOICES},		
		{id:ZaServer.A_ImapBindPort, ref:"attrs/" + ZaServer.A_ImapBindPort, type:_PORT_ },
		{id:ZaServer.A_ImapServerEnabled, ref:"attrs/" + ZaServer.A_ImapServerEnabled, type:_ENUM_, choices:ZaModel.BOOLEAN_CHOICES},		
		{id:ZaServer.A_ImapSSLBindPort, ref:"attrs/" + ZaServer.A_ImapSSLBindPort, type:_PORT_ },
		{id:ZaServer.A_ImapSSLServerEnabled, ref:"attrs/" + ZaServer.A_ImapSSLServerEnabled, type:_ENUM_, choices:ZaModel.BOOLEAN_CHOICES},		
		{id:ZaServer.A_ImapCleartextLoginEnabled, ref:"attrs/" + ZaServer.A_ImapCleartextLoginEnabled, type:_ENUM_, choices:ZaModel.BOOLEAN_CHOICES},		
		{id:ZaServer.A_RedologEnabled, ref:"attrs/" + ZaServer.A_RedologEnabled, type:_ENUM_, choices:ZaModel.BOOLEAN_CHOICES},		
		{id:ZaServer.A_RedologLogPath, ref:"attrs/" + ZaServer.A_RedologLogPath, type:_STRING_},		
		{id:ZaServer.A_RedologArchiveDir, ref:"attrs/" + ZaServer.A_RedologArchiveDir, type:_STRING_},		
		{id:ZaServer.A_RedologBacklogDir, ref:"attrs/" + ZaServer.A_RedologBacklogDir, type:_STRING_},		
		{id:ZaServer.A_RedologRolloverFileSizeKB, ref:"attrs/" + ZaServer.A_RedologRolloverFileSizeKB, type:_NUMBER_, minInclusive: 0 },
		{id:ZaServer.A_RedologFsyncIntervalMS, ref:"attrs/" + ZaServer.A_RedologFsyncIntervalMS, type:_NUMBER_, minInclusive: 0 },
		{id:ZaServer.A_MasterRedologClientConnections, ref:"attrs/" + ZaServer.A_MasterRedologClientConnections, type:_STRING_},		
		{id:ZaServer.A_MasterRedologClientTimeoutSec, ref:"attrs/" + ZaServer.A_MasterRedologClientTimeoutSec, type:_STRING_},		
		{id:ZaServer.A_MasterRedologClientTcpNoDelay, ref:"attrs/" + ZaServer.A_MasterRedologClientTcpNoDelay, type:_STRING_},		
		{id:ZaServer.A_zimbraUserServicesEnabled, ref:"attrs/" + ZaServer.A_zimbraUserServicesEnabled, type:_ENUM_, choices:ZaModel.BOOLEAN_CHOICES}		
	]
};
		
ZaServer.getAll =
function() {
	var soapDoc = AjxSoapDoc.create("GetAllServersRequest", "urn:zimbraAdmin", null);	
	var resp = ZmCsfeCommand.invoke(soapDoc, null, null, null, true).firstChild;
	var list = new ZaItemList(ZaServer);
	list.loadFromDom(resp);
//	list.sortByName();		
	return list;
}

/**
* @param mods - map of modified attributes
* modifies object's information in the database
**/
ZaServer.prototype.modify =
function(mods) {
	var soapDoc = AjxSoapDoc.create("ModifyServerRequest", "urn:zimbraAdmin", null);
	soapDoc.set("id", this.id);
	for (var aname in mods) {
		if (mods[aname] instanceof Array) {
			var array = mods[aname];
			if (array.length > 0) {
				for (var i = 0; i < array.length; i++) {
					var attr = soapDoc.set("a", array[i]);
					attr.setAttribute("n", aname);
				}
			}
			else {
				var attr = soapDoc.set("a");
				attr.setAttribute("n", aname);
			}
		}
		else {
			var attr = soapDoc.set("a", mods[aname]);
			attr.setAttribute("n", aname);
		}
	}
	var resp = ZmCsfeCommand.invoke(soapDoc, false, null, this.id, true).firstChild;
	//update itseld
	this.initFromDom(resp.firstChild);
}

/**
* Returns HTML for a tool tip for this domain.
*/
ZaServer.prototype.getToolTip =
function() {
	// update/null if modified
	if (!this._toolTip) {
		var html = new Array(20);
		var idx = 0;
		html[idx++] = "<table cellpadding='0' cellspacing='0' border='0'>";
		html[idx++] = "<tr valign='center'><td colspan='2' align='left'>";
		html[idx++] = "<div style='border-bottom: 1px solid black; white-space:nowrap; overflow:hidden;width:350'>";
		html[idx++] = "<table cellpadding='0' cellspacing='0' border='0' style='width:100%;'>";
		html[idx++] = "<tr valign='center'>";
		html[idx++] = "<td><b>" + AjxStringUtil.htmlEncode(this.name) + "</b></td>";
		html[idx++] = "<td align='right'>";
		html[idx++] = AjxImg.getImageHtml("Server");		
		html[idx++] = "</td>";
		html[idx++] = "</table></div></td></tr>";
		html[idx++] = "<tr></tr>";
		idx = this._addAttrRow(ZaItem.A_description, html, idx);		
		idx = this._addAttrRow(ZaItem.A_zimbraId, html, idx);
		html[idx++] = "</table>";
		this._toolTip = html.join("");
	}
	return this._toolTip;
}

ZaServer.prototype.remove = 
function() {
	var soapDoc = AjxSoapDoc.create("DeleteServerRequest", "urn:zimbraAdmin", null);
	soapDoc.set("id", this.id);
	ZmCsfeCommand.invoke(soapDoc, null, null, null, true);	
}

ZaServer.prototype.load = 
function(by, val, withConfig) {
	var soapDoc = AjxSoapDoc.create("GetServerRequest", "urn:zimbraAdmin", null);
	if(withConfig) {
		soapDoc.getMethod().setAttribute("applyConfig", "1");	
	} else {
		soapDoc.getMethod().setAttribute("applyConfig", "0");		
	}
	var elBy = soapDoc.set("server", val);
	elBy.setAttribute("by", by);
	var resp = ZmCsfeCommand.invoke(soapDoc, null, null, null, true).firstChild;
	this.initFromDom(resp.firstChild);
}

ZaServer.prototype.initFromDom = function(node) {
	ZaItem.prototype.initFromDom.call(this, node);
	
	// convert installed/enabled services to hidden fields for xform binding
	var installed = this.attrs[ZaServer.A_zimbraServiceInstalled];
	if (installed) {
		if (AjxUtil.isString(installed)) {
			installed = [ installed ];
		}
		for (var i = 0; i < installed.length; i++) {
			var service = installed[i];
			this.attrs["_"+ZaServer.A_zimbraServiceInstalled+"_"+service] = true;
			this.attrs["_"+ZaServer.A_zimbraServiceEnabled+"_"+service] = false;
		}
	}
	
	var enabled = this.attrs[ZaServer.A_zimbraServiceEnabled];
	if (enabled) {
		if (AjxUtil.isString(enabled)) {
			enabled = [ enabled ];
		}
		for (var i = 0; i < enabled.length; i++) {
			var service = enabled[i];
			this.attrs["_"+ZaServer.A_zimbraServiceEnabled+"_"+service] = true;
		}
	}
	this[ZaServer.A_ServiceHostname] = this.attrs[ZaServer.A_ServiceHostname]; // a hack for New Account Wizard	
}
