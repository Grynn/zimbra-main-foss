/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2004, 2005, 2006, 2007 Zimbra, Inc.
 * 
 * The contents of this file are subject to the Yahoo! Public License
 * Version 1.0 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * 
 * ***** END LICENSE BLOCK *****
 */

/**
* @class ZaDomain
* @ constructor ZaDomain
* @param app reference to the application instance
* Data model for zimbraDomain object
* @author Greg Solovyev
**/

ZaDomain = function() {
	ZaItem.call(this,  "ZaDomain");
	this.attrs = new Object();
	this.id = "";
	this.name="";
	this.type=ZaItem.DOMAIN;

	//default attributes
	this.attrs[ZaDomain.A_GalMode] = ZaDomain.GAL_Mode_internal;
    this.attrs[ZaDomain.A_AuthMech] = ZaDomain.AuthMech_zimbra;
	this.attrs[ZaDomain.A_GALSyncUseGALSearch]='TRUE';
	this.notebookAcls = {};
	this[ZaDomain.A_NotebookTemplateFolder] = "Template";
	this[ZaDomain.A_NotebookTemplateDir] = "/opt/zimbra/wiki/Template";
	this.notebookAcls[ZaDomain.A_NotebookAllACLs] = {r:0,w:0,i:0,d:0,a:0,x:0};
	this.notebookAcls[ZaDomain.A_NotebookPublicACLs] = {r:0,w:0,i:0,d:0,a:0,x:0};
	this.notebookAcls[ZaDomain.A_NotebookDomainACLs] = {r:1,w:1,i:1,d:1,a:0,x:0};
	this.notebookAcls[ZaDomain.A_NotebookUserACLs] = [/*{name:"", acl:{r:0,w:0,i:0,d:0,a:0,x:0}}*/];
	this.notebookAcls[ZaDomain.A_NotebookGroupACLs] = [/*{name:"", acl:{r:0,w:0,i:0,d:0,a:0,x:0}, 
			toString:function () {
				return [this.name,this.acl[r],this.acl[w],this.acl[i],this.acl[d],this.acl[a],this.acl[x]].join();
			}
		}*/];

    this.attrs[ZaDomain.A_zimbraDomainCOSMaxAccounts ] = [];
    this.attrs[ZaDomain.A_zimbraDomainFeatureMaxAccounts ] = [];
}
ZaDomain.DEF_WIKI_ACC = "wiki";
ZaDomain.WIKI_FOLDER_ID = "12";
ZaDomain.RESULTSPERPAGE = ZaSettings.RESULTSPERPAGE; 
ZaDomain.MAXSEARCHRESULTS = ZaSettings.MAXSEARCHRESULTS;
ZaDomain.prototype = new ZaItem;
ZaDomain.prototype.constructor = ZaDomain;
ZaDomain.ACLLabels = {r:ZaMsg.ACL_R, w:ZaMsg.ACL_W, i:ZaMsg.ACL_I, a:ZaMsg.ACL_A, d:ZaMsg.ACL_D, x:ZaMsg.ACL_X};
ZaItem.loadMethods["ZaDomain"] = new Array();
ZaItem.initMethods["ZaDomain"] = new Array();
ZaItem.modifyMethods["ZaDomain"] = new Array();

ZaDomain.DOMAIN_STATUS_ACTIVE = "active";
ZaDomain.DOMAIN_STATUS_MAINTENANCE = "maintenance";
ZaDomain.DOMAIN_STATUS_LOCKED = "locked";
ZaDomain.DOMAIN_STATUS_CLOSED = "closed";
ZaDomain.DOMAIN_STATUS_SUSPENDED = "suspended";
ZaDomain.DOMAIN_STATUS_SHUTDOWN = "shutdown";

ZaDomain._domainStatus = 
function(val) {
	var desc = ZaDomain._DOMAIN_STATUS[val];
	return (desc == null) ? val : desc;
}


/* Translation of Domain status values into screen names */
ZaDomain._DOMAIN_STATUS = new Object ();
ZaDomain._DOMAIN_STATUS[ZaDomain.DOMAIN_STATUS_ACTIVE] = ZaMsg.domainStatus_active;
ZaDomain._DOMAIN_STATUS[ZaDomain.DOMAIN_STATUS_CLOSED] = ZaMsg.domainStatus_closed;
ZaDomain._DOMAIN_STATUS[ZaDomain.DOMAIN_STATUS_LOCKED] = ZaMsg.domainStatus_locked;
ZaDomain._DOMAIN_STATUS[ZaDomain.DOMAIN_STATUS_SUSPENDED] = ZaMsg.domainStatus_suspended;
ZaDomain._DOMAIN_STATUS[ZaDomain.DOMAIN_STATUS_MAINTENANCE] = ZaMsg.domainStatus_maintenance;
ZaDomain._DOMAIN_STATUS[ZaDomain.DOMAIN_STATUS_SHUTDOWN] = ZaMsg.domainStatus_shutdown;

ZaDomain.domainStatusChoices = [
	{value:ZaDomain.DOMAIN_STATUS_ACTIVE, label:ZaDomain._DOMAIN_STATUS[ZaDomain.DOMAIN_STATUS_ACTIVE]}, 
	{value:ZaDomain.DOMAIN_STATUS_CLOSED, label:ZaDomain._DOMAIN_STATUS[ZaDomain.DOMAIN_STATUS_CLOSED]},
	{value:ZaDomain.DOMAIN_STATUS_LOCKED, label: ZaDomain._DOMAIN_STATUS[ZaDomain.DOMAIN_STATUS_LOCKED]},
	{value:ZaDomain.DOMAIN_STATUS_MAINTENANCE, label:ZaDomain._DOMAIN_STATUS[ZaDomain.DOMAIN_STATUS_MAINTENANCE]},
	{value:ZaDomain.DOMAIN_STATUS_SUSPENDED, label:ZaDomain._DOMAIN_STATUS[ZaDomain.DOMAIN_STATUS_SUSPENDED]}
];	


//attribute name constants, this values are taken from zimbra.schema
ZaDomain.A_description = "description";
ZaDomain.A_notes = "zimbraNotes";
ZaDomain.A_domainName = "zimbraDomainName";
ZaDomain.A_domainType = "zimbraDomainType" ;
ZaDomain.A_domainDefaultCOSId = "zimbraDomainDefaultCOSId";
ZaDomain.A_zimbraDomainStatus = "zimbraDomainStatus";
ZaDomain.A_zimbraPublicServiceHostname = "zimbraPublicServiceHostname";
ZaDomain.A_zimbraPublicServicePort = "zimbraPublicServicePort";
ZaDomain.A_zimbraPublicServiceProtocol = "zimbraPublicServiceProtocol";
ZaDomain.A_zimbraDNSCheckHostname = "zimbraDNSCheckHostname";

//GAL search
ZaDomain.A_GalMaxResults = "zimbraGalMaxResults";
ZaDomain.A_GalMode = "zimbraGalMode";
ZaDomain.A_GalLdapURL = "zimbraGalLdapURL";
ZaDomain.A_GalLdapSearchBase = "zimbraGalLdapSearchBase";
ZaDomain.A_GalLdapBindDn = "zimbraGalLdapBindDn";
ZaDomain.A_GalLdapBindPassword = "zimbraGalLdapBindPassword";
ZaDomain.A_GalLdapBindPasswordConfirm = "zimbraGalLdapBindPasswordConfirm";
ZaDomain.A_GalLdapFilter = "zimbraGalLdapFilter";
ZaDomain.A_zimbraGalAutoCompleteLdapFilter = "zimbraGalAutoCompleteLdapFilter";
//GAL Sync
ZaDomain.A_zimbraGalSyncLdapURL = "zimbraGalSyncLdapURL";
ZaDomain.A_zimbraGalSyncLdapSearchBase="zimbraGalSyncLdapSearchBase";
ZaDomain.A_zimbraGalSyncLdapFilter="zimbraGalSyncLdapFilter";
ZaDomain.A_zimbraGalSyncLdapAuthMech="zimbraGalSyncLdapAuthMech";
ZaDomain.A_zimbraGalSyncLdapBindDn="zimbraGalSyncLdapBindDn";
ZaDomain.A_zimbraGalSyncLdapBindPassword="zimbraGalSyncLdapBindPassword";

//Auth
ZaDomain.A_AuthMech = "zimbraAuthMech";
ZaDomain.A_AuthLdapURL = "zimbraAuthLdapURL";
ZaDomain.A_AuthLdapUserDn = "zimbraAuthLdapBindDn";
ZaDomain.A_AuthLdapSearchBase = "zimbraAuthLdapSearchBase";
ZaDomain.A_AuthLdapSearchFilter = "zimbraAuthLdapSearchFilter";
ZaDomain.A_AuthLdapSearchBindDn ="zimbraAuthLdapSearchBindDn";
ZaDomain.A_AuthLdapSearchBindPassword="zimbraAuthLdapSearchBindPassword";

ZaDomain.A_zimbraAdminConsoleDNSCheckEnabled = "zimbraAdminConsoleDNSCheckEnabled";
ZaDomain.A_zimbraAdminConsoleCatchAllAddressEnabled = "zimbraAdminConsoleCatchAllAddressEnabled";
ZaDomain.A_zimbraAdminConsoleSkinEnabled = "zimbraAdminConsoleSkinEnabled";
ZaDomain.A_zimbraAdminConsoleLDAPAuthEnabled = "zimbraAdminConsoleLDAPAuthEnabled" ;
ZaDomain.A_zimbraAuthLdapStartTlsEnabled = "zimbraAuthLdapStartTlsEnabled";

//internal attributes - not synched with the server code yet
//GAL               
ZaDomain.A_GALServerType = "galservertype";
ZaDomain.A_GALSyncServerType = "galsyncservertype";
ZaDomain.A_GALSyncUseGALSearch = "galsyncusegalsearch";
//ZaDomain.A_GALServerName = "galservername";
//ZaDomain.A_GALServerPort = "galserverport";
//ZaDomain.A_GALUseSSL = "galusessl";
ZaDomain.A_GALSearchTestMessage = "galsearchtestmessage";
ZaDomain.A_GALSyncTestMessage = "galsynctestmessage";
ZaDomain.A_GALSearchTestResultCode = "galsearchtestresutcode";
ZaDomain.A_GALSyncTestResultCode = "galsynctestresutcode";
ZaDomain.A_GALSampleQuery = "samplequery";
ZaDomain.A_UseBindPassword = "usebindpassword";
ZaDomain.A_SyncUseBindPassword = "syncusebindpassword";
ZaDomain.A_GALTestSearchResults = "galtestsearchresults";
ZaDomain.A_NotebookTemplateDir = "templatedir";
ZaDomain.A_NotebookTemplateFolder = "templatefolder";
ZaDomain.A_NotebookAccountName = "noteBookAccountName";
ZaDomain.A_NotebookAccountPassword = "noteBookAccountPassword";
ZaDomain.A_NotebookAccountPassword2 = "noteBookAccountPassword2";
ZaDomain.A_CreateNotebook = "createNotebook";
ZaDomain.A_OverwriteTemplates = "overwritetemplates";
ZaDomain.A_OverwriteNotebookACLs = "overwritenotebookacls";
ZaDomain.A_NotebookPublicACLs = "pub";
ZaDomain.A_NotebookAllACLs = "all";
ZaDomain.A_NotebookDomainACLs = "dom";
ZaDomain.A_NotebookUserACLs = "usr";
ZaDomain.A_NotebookGroupACLs = "grp";
ZaDomain.A_NotebookGuestACLs = "guest";
ZaDomain.A_allNotebookACLS = "allNotebookACLS";
//values
ZaDomain.GAL_Mode_internal = "zimbra";
ZaDomain.GAL_Mode_external = "ldap";
ZaDomain.GAL_Mode_both = "both";
ZaDomain.GAL_ServerType_ad = "ad";
ZaDomain.GAL_ServerType_ldap = "ldap";

//Auth
ZaDomain.A_AuthADDomainName = "zimbraAuthADDomainName";
//ZaDomain.A_AuthLDAPServerName = "zimbraAuthLDAPServerName";
ZaDomain.A_AuthLDAPSearchBase = "zimbraAuthLDAPSearchBase";
//ZaDomain.A_AuthLDAPServerPort = "zimbraAuthLDAPServerPort";
ZaDomain.A_AuthTestUserName = "authtestusername";
ZaDomain.A_AuthTestPassword = "authtestpassword";
ZaDomain.A_AuthTestMessage = "authtestmessage";
ZaDomain.A_AuthTestResultCode = "authtestresutcode";
ZaDomain.A_AuthComputedBindDn = "authcomputedbinddn";
ZaDomain.A_AuthUseBindPassword = "authusebindpassword";
ZaDomain.A_AuthLdapSearchBindPasswordConfirm = "authldapsearchBindpasswordconfirm";
ZaDomain.A_GalSyncLdapBindPasswordConfirm = "syncldappasswordconfirm";
ZaDomain.A_zimbraVirtualHostname = "zimbraVirtualHostname";
//server value constants
ZaDomain.AuthMech_ad = "ad";
ZaDomain.AuthMech_ldap = "ldap";
ZaDomain.AuthMech_zimbra = "zimbra";
ZaDomain.A_zimbraNotebookAccount = "zimbraNotebookAccount";

//interop
ZaDomain.A_zimbraFreebusyExchangeAuthUsername = "zimbraFreebusyExchangeAuthUsername" ;
ZaDomain.A_zimbraFreebusyExchangeAuthPassword = "zimbraFreebusyExchangeAuthPassword" ;
ZaDomain.A_zimbraFreebusyExchangeAuthScheme  = "zimbraFreebusyExchangeAuthScheme" ;
ZaDomain.A_zimbraFreebusyExchangeURL ="zimbraFreebusyExchangeURL";
ZaDomain.A_zimbraFreebusyExchangeUserOrg = "zimbraFreebusyExchangeUserOrg" ;

ZaDomain.A_zimbraZimletDomainAvailableZimlets = "zimbraZimletDomainAvailableZimlets" ;
//hosted attributes
ZaDomain.A_zimbraDomainCOSMaxAccounts = "zimbraDomainCOSMaxAccounts" ;
ZaDomain.A_zimbraDomainFeatureMaxAccounts = "zimbraDomainFeatureMaxAccounts" ;
ZaDomain.A2_account_limit = "account_limit" ;

//skin properties
ZaDomain.A_zimbraSkinForegroundColor = "zimbraSkinForegroundColor" ;
ZaDomain.A_zimbraSkinBackgroundColor = "zimbraSkinBackgroundColor" ;
ZaDomain.A_zimbraSkinSecondaryColor = "zimbraSkinSecondaryColor" ;
ZaDomain.A_zimbraSkinSelectionColor  = "zimbraSkinSelectionColor" ;

ZaDomain.A_zimbraSkinLogoURL ="zimbraSkinLogoURL" ;
ZaDomain.A_zimbraSkinLogoLoginBanner = "zimbraSkinLogoLoginBanner" ;
ZaDomain.A_zimbraSkinLogoAppBanner = "zimbraSkinLogoAppBanner" ;

ZaDomain.A_zimbraPrefTimeZoneId = "zimbraPrefTimeZoneId" ;
ZaDomain.A_zimbraAdminConsoleLoginMessage = "zimbraAdminConsoleLoginMessage" ;
ZaDomain.A2_allowClearTextLDAPAuth = "allowClearTextLdapAuth" ;

ZaDomain.A2_acl_selection_cache = "acl_selection_cache";
//result codes returned from Check* requests
ZaDomain.Check_OK = "check.OK";
ZaDomain.Check_UNKNOWN_HOST="check.UNKNOWN_HOST";
ZaDomain.Check_CONNECTION_REFUSED = "check.CONNECTION_REFUSED";
ZaDomain.Check_SSL_HANDSHAKE_FAILURE = "check.SSL_HANDSHAKE_FAILURE";
ZaDomain.Check_COMMUNICATION_FAILURE = "check.COMMUNICATION_FAILURE";
ZaDomain.Check_AUTH_FAILED = "check.AUTH_FAILED";
ZaDomain.Check_AUTH_NOT_SUPPORTED = "check.AUTH_NOT_SUPPORTED";
ZaDomain.Check_NAME_NOT_FOUND = "check.NAME_NOT_FOUND";
ZaDomain.Check_INVALID_SEARCH_FILTER = "check.INVALID_SEARCH_FILTER";
ZaDomain.Check_FAILURE = "check.FAILURE"; 
ZaDomain.Check_FAULT = "Fault";
ZaDomain.Check_SKIPPED = "Skiped";

ZaDomain.AUTH_MECH_CHOICES = [ZaDomain.AuthMech_ad,ZaDomain.AuthMech_ldap,ZaDomain.AuthMech_zimbra];

ZaDomain.LOCAL_DOMAIN_QUERY = "(zimbraDomainType=local)";

//constants for rights
ZaDomain.RIGHT_CREATE_TOP_DOMAIN = "createTopDomain";
ZaDomain.RIGHT_DELETE_DOMAIN = "deleteDomain";
ZaDomain.RIGHT_RENAME_DOMAIN = "renameDomain";
ZaDomain.RIGHT_CREATE_SUB_DOMAIN = "createSubDomain";
ZaDomain.RIGHT_CONFIGURE_GAL = "configureExternalGAL";
ZaDomain.RIGHT_CONFIGURE_AUTH = "configureExternaAuth";
ZaDomain.RIGHT_INIT_NOTEBOOK = "initNotebook";

ZaDomain.cacheCounter = 0;
ZaDomain.staticDomainByNameCacheTable = {};
ZaDomain.staticDomainByIdCacheTable = {};
ZaDomain.putDomainToCache = function(domain) {
	if(ZaDomain.cacheCounter==100) {
		ZaDomain.staticDomainByNameCacheTable = {};
		ZaDomain.staticDomainByIdCacheTable = {};
		ZaDomain.cacheCounter = 0;
	}
		
	if(!ZaDomain.staticDomainByNameCacheTable[domain.name] || !ZaDomain.staticDomainByIdCacheTable[domain.id]) {
		ZaDomain.cacheCounter++;
		ZaDomain.staticDomainByNameCacheTable[domain.name] = domain;
		ZaDomain.staticDomainByIdCacheTable[domain.id] = domain;
	}
}

//Use ZaSearch.SearchDirectory
//In order to keep the domain list synchronized with server, we use synchronous call here.
ZaDomain.getAll =
function() {
	var params = {
		query: ZaDomain.LOCAL_DOMAIN_QUERY, 
		types:[ZaSearch.DOMAINS],
		sortBy:ZaDomain.A_domainName,
		offset:"0",
		sortAscending:"1",
		limit:ZaDomain.MAXSEARCHRESULTS,
		ignoreTooManyResultsException: true,
		exceptionFrom: "ZaDomain.getAll",
		controller: ZaApp.getInstance().getCurrentController()
	}
	var list = new ZaItemList(ZaDomain);
	var responce = ZaSearch.searchDirectory(params);
	if(responce) {
		var resp = responce.Body.SearchDirectoryResponse;
		if(resp != null) {
			ZaSearch.TOO_MANY_RESULTS_FLAG = false;
			list.loadFromJS(resp);		
		}
	}
	return list;
}

/**
* Creates a new ZaDomain. This method makes SOAP request (CreateDomainRequest) to create a new domain record in LDAP. 
* @param attrs
* @param name 
* @return ZaDomain
**/
ZaDomain.create =
function(tmpObj) {

	if(tmpObj.attrs == null) {
		//show error msg
		ZaApp.getInstance().getCurrentController().popupErrorDialog(ZaMsg.ERROR_UNKNOWN, null);
		return null;	
	}
	
	//name
	if(tmpObj.attrs[ZaDomain.A_domainName] ==null || tmpObj.attrs[ZaDomain.A_domainName].length < 1) {
		//show error msg
		ZaApp.getInstance().getCurrentController().popupErrorDialog(ZaMsg.ERROR_DOMAIN_NAME_REQUIRED);
		return null;
	}
	tmpObj.name = tmpObj.attrs[ZaDomain.A_domainName];
	//check values
	if(!AjxUtil.isNonNegativeLong(tmpObj.attrs[ZaDomain.A_GalMaxResults])) {
		//show error msg
		ZaApp.getInstance().getCurrentController().popupErrorDialog(ZaMsg.ERROR_INVALID_VALUE + ": " + ZaMsg.NAD_GalMaxResults + " ! ");
		return null;
	}
	
	if(tmpObj.name.length > 256 || tmpObj.attrs[ZaDomain.A_domainName].length > 256) {
		//show error msg
		ZaApp.getInstance().getCurrentController().popupErrorDialog(ZaMsg.ERROR_DOMAIN_NAME_TOOLONG);
		return null;
	}
	
	if(tmpObj.attrs[ZaDomain.A_GalMode]!=ZaDomain.GAL_Mode_internal) {	
		//check that Filter is provided and at least one server
		if(!tmpObj.attrs[ZaDomain.A_GalLdapFilter]) {
			ZaApp.getInstance().getCurrentController().popupErrorDialog(ZaMsg.ERROR_SEARCH_FILTER_REQUIRED);			
			return null;
		}
		if(!tmpObj.attrs[ZaDomain.A_GalLdapURL] || tmpObj.attrs[ZaDomain.A_GalLdapURL].length < 1) {
			ZaApp.getInstance().getCurrentController().popupErrorDialog(ZaMsg.ERROR_LDAP_URL_REQUIRED);					
			return null;
		}
	} 	
	if(tmpObj.attrs[ZaDomain.A_AuthMech]!=ZaDomain.AuthMech_zimbra) {	
		if(!tmpObj.attrs[ZaDomain.A_AuthLdapURL]) {
			ZaApp.getInstance().getCurrentController().popupErrorDialog(ZaMsg.ERROR_LDAP_URL_REQUIRED);
			return null;
		}
	}
	/*var domainRegEx = AjxUtil.DOMAIN_NAME_FULL_RE;
	if( !domainRegEx.test(tmpObj.attrs[ZaDomain.A_domainName]) ) {
		//show error msg
		ZaApp.getInstance().getCurrentController().popupErrorDialog(ZaMsg.ERROR_DOMAIN_NAME_INVALID);
		return null;
	}
	var nonAlphaNumEx = /[^a-zA-Z0-9\-\.]+/;
	if(nonAlphaNumEx.test(tmpObj.attrs[ZaDomain.A_domainName]) ) {
		//show error msg
		ZaApp.getInstance().getCurrentController().popupErrorDialog(ZaMsg.ERROR_DOMAIN_NAME_INVALID);
		return null;
	}*/	

	var soapDoc = AjxSoapDoc.create("CreateDomainRequest", ZaZimbraAdmin.URN, null);
	soapDoc.set("name", tmpObj.attrs[ZaDomain.A_domainName]);
	var attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_GalMode]);
	attr.setAttribute("n", ZaDomain.A_GalMode);	

	attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_GalMaxResults]);
	attr.setAttribute("n", ZaDomain.A_GalMaxResults);

	attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_notes]);
	attr.setAttribute("n", ZaDomain.A_notes);	
	
	if(tmpObj.attrs[ZaDomain.A_zimbraAuthLdapStartTlsEnabled]) {
		attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_zimbraAuthLdapStartTlsEnabled]);
		attr.setAttribute("n", ZaDomain.A_zimbraAuthLdapStartTlsEnabled);	
	}
		
	if(tmpObj.attrs[ZaDomain.A_AuthLdapURL]) {
		var temp = tmpObj.attrs[ZaDomain.A_AuthLdapURL].join(" ");
		attr = soapDoc.set("a", temp);
		attr.setAttribute("n", ZaDomain.A_AuthLdapURL);	
				
		if(tmpObj.attrs[ZaDomain.A_zimbraAuthLdapStartTlsEnabled] == "TRUE" && tmpObj.attrs[ZaDomain.A_AuthMech] == ZaDomain.AuthMech_ldap) {
			//check that we don't have ldaps://
			if(temp.indexOf("ldaps://") > -1) {
				ZaApp.getInstance().getCurrentController().popupWarningDialog(ZaMsg.Domain_WarningStartTLSIgnored)
			}		
		}		
	}
	
	attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_description]);
	attr.setAttribute("n", ZaDomain.A_description);		

	if(tmpObj.attrs[ZaDomain.A_GalMode] != ZaDomain.GAL_Mode_internal) {
		temp = tmpObj.attrs[ZaDomain.A_GalLdapURL].join(" ");
		attr = soapDoc.set("a", temp);
		attr.setAttribute("n", ZaDomain.A_GalLdapURL);	

		attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_GalLdapSearchBase]);
		attr.setAttribute("n", ZaDomain.A_GalLdapSearchBase);	

		attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_GalLdapBindDn]);
		attr.setAttribute("n", ZaDomain.A_GalLdapBindDn);	

		attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_GalLdapBindPassword]);
		attr.setAttribute("n", ZaDomain.A_GalLdapBindPassword);	

		attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_GalLdapFilter]);
		attr.setAttribute("n", ZaDomain.A_GalLdapFilter);	
		
		attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_zimbraGalAutoCompleteLdapFilter]);
		attr.setAttribute("n", ZaDomain.A_zimbraGalAutoCompleteLdapFilter);			
	}

	if(tmpObj.attrs[ZaDomain.A_AuthMech] == ZaDomain.AuthMech_ad) {
		//set bind DN to default for AD
		attr = soapDoc.set("a", "%u@"+tmpObj.attrs[ZaDomain.A_AuthADDomainName]);
		attr.setAttribute("n", ZaDomain.A_AuthLdapUserDn);	
	} else if(tmpObj.attrs[ZaDomain.A_AuthMech] == ZaDomain.AuthMech_ldap) {
	
	/*	if(tmpObj.attrs[ZaDomain.A_AuthLdapSearchFilter] ==null || tmpObj.attrs[ZaDomain.A_AuthLdapSearchFilter].length < 1) {
			//show error msg
			ZaApp.getInstance().getCurrentController().popupErrorDialog(ZaMsg.ERROR_SEARCH_FILTER_REQUIRED);
			return null;
		}
	*/
		attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_AuthLdapSearchFilter]);
		attr.setAttribute("n", ZaDomain.A_AuthLdapSearchFilter);
			
		attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_AuthLdapSearchBase]);
		attr.setAttribute("n", ZaDomain.A_AuthLdapSearchBase);	
		
		if(tmpObj[ZaDomain.A_AuthUseBindPassword] && tmpObj[ZaDomain.A_AuthUseBindPassword] == "TRUE") {
			attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_AuthLdapSearchBindDn]);
			attr.setAttribute("n", ZaDomain.A_AuthLdapSearchBindDn);	
			
			attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_AuthLdapSearchBindPassword]);
			attr.setAttribute("n", ZaDomain.A_AuthLdapSearchBindPassword);			
		}
	}

	var attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_AuthMech]);
	attr.setAttribute("n", ZaDomain.A_AuthMech);	

	if(tmpObj.attrs[ZaDomain.A_domainDefaultCOSId]) {
		attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_domainDefaultCOSId]);
		attr.setAttribute("n", ZaDomain.A_domainDefaultCOSId);	
	}
	
	if(tmpObj.attrs[ZaDomain.A_zimbraPublicServiceHostname]) {
		attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_zimbraPublicServiceHostname]);
		attr.setAttribute("n", ZaDomain.A_zimbraPublicServiceHostname);	
	}
		
	
	if(tmpObj.attrs[ZaDomain.A_zimbraDNSCheckHostname]) {
		attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_zimbraDNSCheckHostname]);
		attr.setAttribute("n", ZaDomain.A_zimbraDNSCheckHostname);	
	}
	
	if(tmpObj.attrs[ZaDomain.A_zimbraAdminConsoleDNSCheckEnabled]) {
		attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_zimbraAdminConsoleDNSCheckEnabled]);
		attr.setAttribute("n", ZaDomain.A_zimbraAdminConsoleDNSCheckEnabled);	
	}

    if(tmpObj.attrs[ZaDomain.A_zimbraAdminConsoleCatchAllAddressEnabled]) {
		attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_zimbraAdminConsoleCatchAllAddressEnabled]);
		attr.setAttribute("n", ZaDomain.A_zimbraAdminConsoleCatchAllAddressEnabled);
	}

    if(tmpObj.attrs[ZaDomain.A_zimbraAdminConsoleLDAPAuthEnabled]) {
		attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_zimbraAdminConsoleLDAPAuthEnabled]);
		attr.setAttribute("n", ZaDomain.A_zimbraAdminConsoleLDAPAuthEnabled);
	}

    if(tmpObj.attrs[ZaDomain.A_zimbraDomainStatus]) {
		attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_zimbraDomainStatus]);
		attr.setAttribute("n", ZaDomain.A_zimbraDomainStatus);	
	}
		
	if(tmpObj.attrs[ZaDomain.A_domainMaxAccounts]) {
		attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_domainMaxAccounts]);
		attr.setAttribute("n", ZaDomain.A_domainMaxAccounts);	
	}
	
	var newDomain = new ZaDomain();
	if(tmpObj.attrs[ZaDomain.A_zimbraVirtualHostname]) {
		if(tmpObj.attrs[ZaDomain.A_zimbraVirtualHostname] instanceof Array) {
			var cnt = tmpObj.attrs[ZaDomain.A_zimbraVirtualHostname].length;
			for(var ix=0; ix<cnt; ix++) {
				attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_zimbraVirtualHostname][ix]);
				attr.setAttribute("n", ZaDomain.A_zimbraVirtualHostname);					
			}
		} else {
			attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_zimbraVirtualHostname]);
			attr.setAttribute("n", ZaDomain.A_zimbraVirtualHostname);					
		}
	}
	
	//var command = new ZmCsfeCommand();
	var params = new Object();
	params.soapDoc = soapDoc;	
	var reqMgrParams = {
		controller : ZaApp.getInstance().getCurrentController(),
		busyMsg : ZaMsg.BUSY_CREATE_DOMAIN
	}
	var resp = ZaRequestMgr.invoke(params, reqMgrParams).Body.CreateDomainResponse;	
	newDomain.initFromJS(resp.domain[0]);

	return newDomain;
}

ZaDomain.prototype.canConfigureWiki = function () {
	if(this.rights || !this.getAttrs)
		return false;
	if(this.rights[ZaDomain.RIGHT_INIT_NOTEBOOK] && (this.setAttrs.all || this.setAttrs[ZaDomain.A_zimbraNotebookAccount]))
		return true;
}

ZaDomain.testAuthSettings = 
function (obj, callback) {
	var soapDoc = AjxSoapDoc.create("CheckAuthConfigRequest", ZaZimbraAdmin.URN, null);
	var attr = soapDoc.set("a", obj.attrs[ZaDomain.A_AuthMech]);
	attr.setAttribute("n", ZaDomain.A_AuthMech);
	
	var temp = obj.attrs[ZaDomain.A_AuthLdapURL].join(" ");
	attr = soapDoc.set("a", temp);
	attr.setAttribute("n", ZaDomain.A_AuthLdapURL);	
	
	if(obj.attrs[ZaDomain.A_AuthMech] == ZaDomain.AuthMech_ad) {	
		attr = soapDoc.set("a", "%u@"+obj.attrs[ZaDomain.A_AuthADDomainName]);
		attr.setAttribute("n", ZaDomain.A_AuthLdapUserDn);	
	}
	if(obj.attrs[ZaDomain.A_AuthMech] == ZaDomain.AuthMech_ldap) {
		if(obj.attrs[ZaDomain.A_zimbraAuthLdapStartTlsEnabled]) {
			attr = soapDoc.set("a", obj.attrs[ZaDomain.A_zimbraAuthLdapStartTlsEnabled]);
			attr.setAttribute("n", ZaDomain.A_zimbraAuthLdapStartTlsEnabled);	
		}			
			
		if(obj.attrs[ZaDomain.A_zimbraAuthLdapStartTlsEnabled] == "TRUE") {
			//check that we don't have ldaps://
			if(temp.indexOf("ldaps://") > -1) {
				ZaApp.getInstance().getCurrentController().popupWarningDialog(ZaMsg.Domain_WarningStartTLSIgnored)
			}		
		}
					
		attr = soapDoc.set("a", obj.attrs[ZaDomain.A_AuthLdapSearchBase]);
		attr.setAttribute("n", ZaDomain.A_AuthLdapSearchBase);
	
		attr = soapDoc.set("a", obj.attrs[ZaDomain.A_AuthLdapSearchFilter]);
		attr.setAttribute("n", ZaDomain.A_AuthLdapSearchFilter);

		attr = soapDoc.set("a", obj.attrs[ZaDomain.A_AuthLdapSearchBindDn]);
		attr.setAttribute("n", ZaDomain.A_AuthLdapSearchBindDn);
	
		attr = soapDoc.set("a", obj.attrs[ZaDomain.A_AuthLdapSearchBindPassword]);
		attr.setAttribute("n", ZaDomain.A_AuthLdapSearchBindPassword);
	}

	
	attr = soapDoc.set("name", obj[ZaDomain.A_AuthTestUserName]);
	attr = soapDoc.set("password", obj[ZaDomain.A_AuthTestPassword]);	
	
	var command = new ZmCsfeCommand();
	var params = new Object();
	params.soapDoc = soapDoc;	
	params.asyncMode = true;
	params.callback = callback;
	command.invoke(params);	

}

ZaDomain.getRevokeACLsrequest = function (permsToRevoke, soapDoc) {
	var cnt = 	permsToRevoke.length;
	for(var i = 0; i < cnt; i++) {
		var folderActionRequest = soapDoc.set("FolderActionRequest", null, null, "urn:zimbraMail");
		//folderActionRequest.setAttribute("xmlns", "urn:zimbraMail");				
		var actionEl = soapDoc.set("action", "",folderActionRequest);
		actionEl.setAttribute("id", ZaDomain.WIKI_FOLDER_ID);	
		actionEl.setAttribute("op", "!grant");	
		actionEl.setAttribute("zid", permsToRevoke[i]);				
	}
}

ZaDomain.getNotebookACLsRequest = function (obj, soapDoc) {
	if(obj[ZaDomain.A_allNotebookACLS]) {
		var cnt = obj[ZaDomain.A_allNotebookACLS].length;
		for(var i = 0; i < cnt; i++) {
			var folderActionRequest = soapDoc.set("FolderActionRequest", null, null, "urn:zimbraMail");
			//folderActionRequest.setAttribute("xmlns", "urn:zimbraMail");				
			var actionEl = soapDoc.set("action", "",folderActionRequest);
			actionEl.setAttribute("id", ZaDomain.WIKI_FOLDER_ID);	
			actionEl.setAttribute("op", "grant");	
			var grantEl = soapDoc.set("grant", "",actionEl);	
			grantEl.setAttribute("gt", obj[ZaDomain.A_allNotebookACLS][i].gt);
			if(obj[ZaDomain.A_allNotebookACLS][i].name) {
				grantEl.setAttribute("d", obj[ZaDomain.A_allNotebookACLS][i].name);
			}
			var perms = "";
			for(var a in obj[ZaDomain.A_allNotebookACLS][i].acl) {
				if(obj[ZaDomain.A_allNotebookACLS][i].acl[a]==1)
					perms+=a;
			}
			grantEl.setAttribute("perm", perms);				
		}
	}
}

ZaDomain.getNotebookACLsRequestOld = function (obj, soapDoc) {
	if(obj.notebookAcls) {
		for(var gt in obj.notebookAcls) {
			if(obj.notebookAcls[gt] instanceof Array) {
				var grants = obj.notebookAcls[gt];
				var cnt = grants.length;
				for (var i =0; i < cnt; i++) {
					var grantObj = grants[i];
					if(!grantObj.name || !grantObj.acl)
						continue;
						
					var folderActionRequest = soapDoc.set("FolderActionRequest", null, null, "urn:zimbraMail");
				//	folderActionRequest.setAttribute("xmlns", "urn:zimbraMail");
					var actionEl = soapDoc.set("action", "",folderActionRequest);	
					actionEl.setAttribute("id", ZaDomain.WIKI_FOLDER_ID);	
					actionEl.setAttribute("op", "grant");					
					var grantEl = soapDoc.set("grant", "",actionEl);
					grantEl.setAttribute("gt", gt);
					grantEl.setAttribute("d", grantObj.name);
					var perms = "";
					for(var a in grantObj.acl) {
						if(grantObj.acl[a]==1)
							perms+=a;
					}	
					grantEl.setAttribute("perm", perms);				
				}
			} else {
				var folderActionRequest = soapDoc.set("FolderActionRequest", null, null, "urn:zimbraMail");
				//folderActionRequest.setAttribute("xmlns", "urn:zimbraMail");				
				var actionEl = soapDoc.set("action", "",folderActionRequest);
				actionEl.setAttribute("id", ZaDomain.WIKI_FOLDER_ID);	
				actionEl.setAttribute("op", "grant");	
				var grantEl = soapDoc.set("grant", "",actionEl);	
				grantEl.setAttribute("gt", gt);
				if(gt==ZaDomain.A_NotebookDomainACLs) {
					grantEl.setAttribute("d", obj.attrs[ZaDomain.A_domainName]);
				}
				var perms = "";
				for(var a in obj.notebookAcls[gt]) {
					if(obj.notebookAcls[gt][a]==1)
						perms+=a;
				}
				grantEl.setAttribute("perm", perms);					
			}
		}
	}
}

ZaDomain.setNotebookACLs = function (obj, callback) {
	var soapDoc = AjxSoapDoc.create("BatchRequest", "urn:zimbra");
	soapDoc.setMethodAttribute("onerror", "stop");
	ZaDomain.getNotebookACLsRequestOld	(obj,soapDoc);			
	var command = new ZmCsfeCommand();
	var params = new Object();
	params.soapDoc = soapDoc;
	params.accountName = obj[ZaDomain.A_NotebookAccountName] ? obj[ZaDomain.A_NotebookAccountName] : obj.attrs[ZaDomain.A_zimbraNotebookAccount];
			
	if(callback) {
		params.asyncMode = true;
		params.callback = callback;
	}
	command.invoke(params);				
}

ZaDomain.initNotebook = function (obj, callback, controller) {
	var soapDoc = AjxSoapDoc.create("InitNotebookRequest", ZaZimbraAdmin.URN, null);
	if(obj[ZaDomain.A_NotebookTemplateDir]) {
		var attr = soapDoc.set("template", obj[ZaDomain.A_NotebookTemplateDir]);
		if(obj[ZaDomain.A_NotebookTemplateFolder]) {
			attr.setAttribute("dest", obj[ZaDomain.A_NotebookTemplateFolder]);			
		}
	}
	
	if(obj[ZaDomain.A_NotebookAccountName]) {
		var attr = soapDoc.set("name", obj[ZaDomain.A_NotebookAccountName]);
		if(obj[ZaDomain.A_NotebookAccountPassword]) {
			soapDoc.set("password", obj[ZaDomain.A_NotebookAccountPassword]);			
		}
	}
	var attr = soapDoc.set("domain", obj.attrs[ZaDomain.A_domainName]);
	attr.setAttribute("by", "name");
	
	//var command = new ZmCsfeCommand();
	var params = new Object();
	params.soapDoc = soapDoc;
	if(callback) {
		params.asyncMode = true;
		params.callback = callback;
	}
	var reqMgrParams = {
		controller : controller,
		busyMsg : ZaMsg.BUSY_INIT_NOTEBOOK
	}
	ZaRequestMgr.invoke(params, reqMgrParams);	
}

ZaDomain.testGALSettings =
function (obj, callback, sampleQuery) {
	var soapDoc = AjxSoapDoc.create("BatchRequest", "urn:zimbra");
	soapDoc.setMethodAttribute("onerror", "stop");	
	
	//search
	var searchTestReq = soapDoc.set("CheckGalConfigRequest", null, null, ZaZimbraAdmin.URN);
	var attr = soapDoc.set("a", ZaDomain.GAL_Mode_external,searchTestReq);
	attr.setAttribute("n", ZaDomain.A_GalMode);

	var temp = obj.attrs[ZaDomain.A_GalLdapURL].join(" ");
	attr = soapDoc.set("a", temp,searchTestReq);
	attr.setAttribute("n", ZaDomain.A_GalLdapURL);	
	
	attr = soapDoc.set("a", obj.attrs[ZaDomain.A_GalLdapSearchBase],searchTestReq);
	attr.setAttribute("n", ZaDomain.A_GalLdapSearchBase);	

	attr = soapDoc.set("a", obj.attrs[ZaDomain.A_GalLdapFilter],searchTestReq);
	attr.setAttribute("n", ZaDomain.A_GalLdapFilter);	

	if(obj.attrs[ZaDomain.A_GalLdapBindDn]) {
		attr = soapDoc.set("a", obj.attrs[ZaDomain.A_GalLdapBindDn],searchTestReq);
		attr.setAttribute("n", ZaDomain.A_GalLdapBindDn);
	}

	if(obj.attrs[ZaDomain.A_GalLdapBindPassword]) {
		attr = soapDoc.set("a", obj.attrs[ZaDomain.A_GalLdapBindPassword],searchTestReq);
		attr.setAttribute("n", ZaDomain.A_GalLdapBindPassword);
	}
	soapDoc.set("query", "*" + sampleQuery + "*",searchTestReq);
	soapDoc.set("action", "search",searchTestReq);
	
	//sync
	
	var synchTestReq = soapDoc.set("CheckGalConfigRequest", null, null, ZaZimbraAdmin.URN);
	var attr = soapDoc.set("a", ZaDomain.GAL_Mode_external,synchTestReq);
	attr.setAttribute("n", ZaDomain.A_GalMode);

	var temp = obj.attrs[ZaDomain.A_GalLdapURL].join(" ");
	attr = soapDoc.set("a", temp,synchTestReq);
	attr.setAttribute("n", ZaDomain.A_GalLdapURL);	
	
	attr = soapDoc.set("a", obj.attrs[ZaDomain.A_GalLdapSearchBase],synchTestReq);
	attr.setAttribute("n", ZaDomain.A_GalLdapSearchBase);	

	attr = soapDoc.set("a", obj.attrs[ZaDomain.A_GalLdapFilter],synchTestReq);
	attr.setAttribute("n", ZaDomain.A_GalLdapFilter);	

	if(obj.attrs[ZaDomain.A_GalLdapBindDn]) {
		attr = soapDoc.set("a", obj.attrs[ZaDomain.A_GalLdapBindDn],synchTestReq);
		attr.setAttribute("n", ZaDomain.A_GalLdapBindDn);
	}

	if(obj.attrs[ZaDomain.A_GalLdapBindPassword]) {
		attr = soapDoc.set("a", obj.attrs[ZaDomain.A_GalLdapBindPassword],synchTestReq);
		attr.setAttribute("n", ZaDomain.A_GalLdapBindPassword);
	}

//	
	if(obj.attrs[ZaDomain.A_GALSyncUseGALSearch]=="FALSE") {
		if(obj.attrs[ZaDomain.A_zimbraGalSyncLdapURL]) {
			var temp = obj.attrs[ZaDomain.A_zimbraGalSyncLdapURL].join(" ");
			attr = soapDoc.set("a", temp,synchTestReq);
			attr.setAttribute("n", ZaDomain.A_zimbraGalSyncLdapURL);	
		}
		
		if(obj.attrs[ZaDomain.A_zimbraGalSyncLdapSearchBase]) {
			attr = soapDoc.set("a", obj.attrs[ZaDomain.A_zimbraGalSyncLdapSearchBase],synchTestReq);
			attr.setAttribute("n", ZaDomain.A_zimbraGalSyncLdapSearchBase);	
		}
	
		if(obj.attrs[ZaDomain.A_zimbraGalSyncLdapFilter]) {
			attr = soapDoc.set("a", obj.attrs[ZaDomain.A_zimbraGalSyncLdapFilter],synchTestReq);
			attr.setAttribute("n", ZaDomain.A_zimbraGalSyncLdapFilter);	
		}
	
		if(obj.attrs[ZaDomain.A_zimbraGalSyncLdapBindDn]) {
			attr = soapDoc.set("a", obj.attrs[ZaDomain.A_zimbraGalSyncLdapBindDn],synchTestReq);
			attr.setAttribute("n", ZaDomain.A_zimbraGalSyncLdapBindDn);
		}
	
		if(obj.attrs[ZaDomain.A_GalLdapBindPassword]) {
			attr = soapDoc.set("a", obj.attrs[ZaDomain.A_GalLdapBindPassword],synchTestReq);
			attr.setAttribute("n", ZaDomain.A_GalLdapBindPassword);
		}
	}

	soapDoc.set("action", "sync",synchTestReq);	
	
	var command = new ZmCsfeCommand();
	var params = new Object();
	params.soapDoc = soapDoc;	
	params.asyncMode = true;
	params.callback = callback;
	command.invoke(params);
}

ZaDomain.modifyGalSettings = 
function(tmpObj) {
	var soapDoc = AjxSoapDoc.create("ModifyDomainRequest", ZaZimbraAdmin.URN, null);
	soapDoc.set("id", this.id);
	
	var attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_GalMode]);
	attr.setAttribute("n", ZaDomain.A_GalMode);	

	if(tmpObj.attrs[ZaDomain.A_GalMode] != ZaDomain.GAL_Mode_internal) {
		var temp = tmpObj.attrs[ZaDomain.A_GalLdapURL].join(" ");
		attr = soapDoc.set("a", temp);
		attr.setAttribute("n", ZaDomain.A_GalLdapURL);	

		attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_GalLdapSearchBase]);
		attr.setAttribute("n", ZaDomain.A_GalLdapSearchBase);	

		attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_GalLdapBindDn]);
		attr.setAttribute("n", ZaDomain.A_GalLdapBindDn);	

		attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_GalLdapBindPassword]);
		attr.setAttribute("n", ZaDomain.A_GalLdapBindPassword);	

		attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_GalLdapFilter]);
		attr.setAttribute("n", ZaDomain.A_GalLdapFilter);	
		
		attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_zimbraGalAutoCompleteLdapFilter]);
		attr.setAttribute("n", ZaDomain.A_zimbraGalAutoCompleteLdapFilter);		
	}
	if(this[ZaDomain.A_GalMaxResults] != tmpObj.attrs[ZaDomain.A_GalMaxResults]) {
		attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_GalMaxResults]);
		attr.setAttribute("n", ZaDomain.A_GalMaxResults);	
	}

	//var command = new ZmCsfeCommand();
	var params = new Object();
	params.soapDoc = soapDoc;	
	var reqMgrParams = {
		controller : ZaApp.getInstance().getCurrentController() ,
		busyMsg : ZaMsg.BUSY_MODIFY_DOMAIN
	}
	var resp = ZaRequestMgr.invoke(params, reqMgrParams).Body.ModifyDomainResponse;	
	this.initFromJS(resp.domain[0]);
}

ZaDomain.modifyAuthSettings = 
function(tmpObj) {

	var soapDoc = AjxSoapDoc.create("ModifyDomainRequest", ZaZimbraAdmin.URN, null);
	soapDoc.set("id", this.id);
	
	var attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_AuthMech]);
	attr.setAttribute("n", ZaDomain.A_AuthMech);	
	
	if(tmpObj.attrs[ZaDomain.A_AuthMech] == ZaDomain.AuthMech_ad) {
		var temp = tmpObj.attrs[ZaDomain.A_AuthLdapURL].join(" ");
		attr = soapDoc.set("a", temp);
		attr.setAttribute("n", ZaDomain.A_AuthLdapURL);	

		attr = soapDoc.set("a", "%u@"+tmpObj.attrs[ZaDomain.A_AuthADDomainName]);
		attr.setAttribute("n", ZaDomain.A_AuthLdapUserDn);	
	} else if (tmpObj.attrs[ZaDomain.A_AuthMech] == ZaDomain.AuthMech_ldap) {

		if(tmpObj.attrs[ZaDomain.A_zimbraAuthLdapStartTlsEnabled]) {
			attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_zimbraAuthLdapStartTlsEnabled]);
			attr.setAttribute("n", ZaDomain.A_zimbraAuthLdapStartTlsEnabled);	
		}		
		
		var temp = tmpObj.attrs[ZaDomain.A_AuthLdapURL].join(" ");
		
		if(tmpObj.attrs[ZaDomain.A_zimbraAuthLdapStartTlsEnabled] == "TRUE") {
			//check that we don't have ldaps://
			if(temp.indexOf("ldaps://") > -1) {
				ZaApp.getInstance().getCurrentController().popupWarningDialog(ZaMsg.Domain_WarningStartTLSIgnored)
			}		
		}		
		attr = soapDoc.set("a", temp);
		attr.setAttribute("n", ZaDomain.A_AuthLdapURL);	

		attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_AuthLdapSearchFilter]);
		attr.setAttribute("n", ZaDomain.A_AuthLdapSearchFilter);
			
		attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_AuthLdapSearchBase]);
		attr.setAttribute("n", ZaDomain.A_AuthLdapSearchBase);	
		
		if(tmpObj[ZaDomain.A_AuthUseBindPassword] && tmpObj[ZaDomain.A_AuthUseBindPassword] == "TRUE") {
			attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_AuthLdapSearchBindDn]);
			attr.setAttribute("n", ZaDomain.A_AuthLdapSearchBindDn);	
			
			attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_AuthLdapSearchBindPassword]);
			attr.setAttribute("n", ZaDomain.A_AuthLdapSearchBindPassword);			
		}
		
		/*attr = soapDoc.set("a", tmpObj.attrs[ZaDomain.A_AuthLdapUserDn]);
		attr.setAttribute("n", ZaDomain.A_AuthLdapUserDn);	
		*/
	
	}
	//var command = new ZmCsfeCommand();
	var params = new Object();
	params.soapDoc = soapDoc;	
	var reqMgrParams = {
		controller : ZaApp.getInstance().getCurrentController(),
		busyMsg : ZaMsg.BUSY_MODIFY_DOMAIN
	}
	var resp = ZaRequestMgr.invoke(params, reqMgrParams).Body.ModifyDomainResponse;	
	this.initFromJS(resp.domain[0]);	
}

ZaDomain.prototype.setStatus = function (newStatus) {
	var soapDoc = AjxSoapDoc.create("ModifyDomainStatusRequest", ZaZimbraAdmin.URN, null);
	soapDoc.set("id", this.id);

	var params = new Object();
	params.soapDoc = soapDoc;
	var reqMgrParams = {
		controller : ZaApp.getInstance().getCurrentController(),
		busyMsg : ZaMsg.BUSY_MODIFY_DOMAIN_STATUS
	}	
	var resp = ZaRequestMgr.invoke(params, reqMgrParams).Body.ModifyDomainStatusResponse;	
	this.attrs[ZaDomain.A_zimbraDomainStatus] = resp.domain.status;
}

/**
* @param mods - map of modified attributes that will be sent to the server
* modifies object's information in the database
**/
/*
ZaDomain.prototype.modify =
function(mods,overWriteACLs) {
	var soapDoc = AjxSoapDoc.create("ModifyDomainRequest", ZaZimbraAdmin.URN, null);
	soapDoc.set("id", this.id);
	for (var aname in mods) {
		//multy value attribute
		if(mods[aname] instanceof Array) {
			var cnt = mods[aname].length;
			if(cnt) {
				for(var ix=0; ix <cnt; ix++) {
					if(mods[aname][ix]) { //if there is an empty element in the array - don't send it
						var attr = soapDoc.set("a", mods[aname][ix],modifyDomainRequest);
						attr.setAttribute("n", aname);
					}
				}
			} else {
				var attr = soapDoc.set("a", "",modifyDomainRequest);
				attr.setAttribute("n", aname);
			}
		} else {		
			var attr = soapDoc.set("a", mods[aname],modifyDomainRequest);
			attr.setAttribute("n", aname);
		}
	}
	var params = new Object();
	params.soapDoc = soapDoc;
	var reqMgrParams = {
		controller : ZaApp.getInstance().getCurrentController(),
		busyMsg : ZaMsg.BUSY_MODIFY_DOMAIN
	}	
	var resp = ZaRequestMgr.invoke(params, reqMgrParams).Body.ModifyDomainResponse;	
	this.initFromJS(resp.domain[0]);	
}*/

ZaDomain.modifyMethod =
function(mods) {
	var soapDoc = AjxSoapDoc.create("ModifyDomainRequest", ZaZimbraAdmin.URN, null);
	soapDoc.set("id", this.id);
	for (var aname in mods) {
		//multy value attribute
		if(mods[aname] instanceof Array) {
			var cnt = mods[aname].length;
			if(cnt) {
				for(var ix=0; ix <cnt; ix++) {
					if(mods[aname][ix]) { //if there is an empty element in the array - don't send it
						var attr = soapDoc.set("a", mods[aname][ix],modifyDomainRequest);
						attr.setAttribute("n", aname);
					}
				}
			} else {
				var attr = soapDoc.set("a", "",modifyDomainRequest);
				attr.setAttribute("n", aname);
			}
		} else {		
			var attr = soapDoc.set("a", mods[aname],modifyDomainRequest);
			attr.setAttribute("n", aname);
		}
	}
	var params = new Object();
	params.soapDoc = soapDoc;
	var reqMgrParams = {
		controller : ZaApp.getInstance().getCurrentController(),
		busyMsg : ZaMsg.BUSY_MODIFY_DOMAIN
	}	
	var resp = ZaRequestMgr.invoke(params, reqMgrParams).Body.ModifyDomainResponse;	
	this.refresh(false,true);
	//this.initFromJS(resp.domain[0]);
	ZaDomain.putDomainToCache(this);	
}
ZaItem.modifyMethods["ZaDomain"].push(ZaDomain.modifyMethod);

ZaDomain.prototype.initFromJS = 
function (obj) {
    ZaItem.prototype.initFromJS.call(this, obj);

    if (!(this.attrs[ZaDomain.A_zimbraDomainCOSMaxAccounts] instanceof Array)) {
        if (this.attrs[ZaDomain.A_zimbraDomainCOSMaxAccounts]) {
            this.attrs[ZaDomain.A_zimbraDomainCOSMaxAccounts] = [this.attrs[ZaDomain.A_zimbraDomainCOSMaxAccounts]];
        } else {
            this.attrs[ZaDomain.A_zimbraDomainCOSMaxAccounts] = [];
        }
    }

    if (!(this.attrs[ZaDomain.A_zimbraDomainFeatureMaxAccounts] instanceof Array)) {
        if (this.attrs[ZaDomain.A_zimbraDomainFeatureMaxAccounts]) {
            this.attrs[ZaDomain.A_zimbraDomainFeatureMaxAccounts] = [this.attrs[ZaDomain.A_zimbraDomainFeatureMaxAccounts]];
        } else {
            this.attrs[ZaDomain.A_zimbraDomainFeatureMaxAccounts] = [];
        }
    }


    if(!(this.attrs[ZaDomain.A_zimbraVirtualHostname] instanceof Array)) {
		if(this.attrs[ZaDomain.A_zimbraVirtualHostname])
			this.attrs[ZaDomain.A_zimbraVirtualHostname] = [this.attrs[ZaDomain.A_zimbraVirtualHostname]];	
		else
			this.attrs[ZaDomain.A_zimbraVirtualHostname] = new Array();
	}
	if(!this.attrs[ZaDomain.A_AuthMech]) {
		this.attrs[ZaDomain.A_AuthMech] = ZaDomain.AuthMech_zimbra; //default value
	}
	if(!this.attrs[ZaDomain.A_GalMode]) {
		this.attrs[ZaDomain.A_GalMode] = ZaDomain.GAL_Mode_internal; //default value
	}

	if(this.attrs[ZaDomain.A_AuthLdapURL]) {
		// Split Auth URL into an array 
		var temp = this.attrs[ZaDomain.A_AuthLdapURL];
		this.attrs[ZaDomain.A_AuthLdapURL] = temp.split(" ");

	} else this.attrs[ZaDomain.A_AuthLdapURL] = new Array();
	if(this.attrs[ZaDomain.A_GalLdapURL])	{	
		var temp = this.attrs[ZaDomain.A_GalLdapURL];
		this.attrs[ZaDomain.A_GalLdapURL] = temp.split(" ");		
	} else this.attrs[ZaDomain.A_GalLdapURL] = new Array();
	
	if(this.attrs[ZaDomain.A_GalMode]) {
		if(this.attrs[ZaDomain.A_GalMode] == "ldap" || this.attrs[ZaDomain.A_GalMode] == "both") {
			if(this.attrs[ZaDomain.A_GalLdapFilter] == "ad") {
				this.attrs[ZaDomain.A_GALServerType] = "ad";
			} else {
				this.attrs[ZaDomain.A_GALServerType] = "ldap";
			}
			if(!this.attrs[ZaDomain.A_zimbraGalSyncLdapURL]) {
				this.attrs[ZaDomain.A_GALSyncUseGALSearch]="TRUE";
			} else {
				this.attrs[ZaDomain.A_GALSyncUseGALSearch]="FALSE";
				if(this.attrs[ZaDomain.A_zimbraGalSyncLdapBindDn] || this.attrs[ZaDomain.A_zimbraGalSyncLdapBindPassword]) {
					this.attrs[ZaDomain.A_SyncUseBindPassword] = "TRUE";
				} else {
					this.attrs[ZaDomain.A_SyncUseBindPassword] = "FALSE";
				}
				if(this.attrs[ZaDomain.A_zimbraGalSyncLdapFilter] == "ad") {
					this.attrs[ZaDomain.A_GALSyncServerType] = "ad";
				} else {
					this.attrs[ZaDomain.A_GALSyncServerType] = "ldap";
				}
			}
		} else {
			this.attrs[ZaDomain.A_GALSyncUseGALSearch]="TRUE";
		}
	} else {
		this.attrs[ZaDomain.A_GalMode] = "zimbra";
		this.attrs[ZaDomain.A_GALSyncUseGALSearch]="TRUE";
	}
	
	if(this.attrs[ZaDomain.A_GalLdapBindDn] || this.attrs[ZaDomain.A_GalLdapBindPassword]) {
		this.attrs[ZaDomain.A_UseBindPassword] = "TRUE";
	} else {
		this.attrs[ZaDomain.A_UseBindPassword] = "FALSE";
	}
	
	
	
		
	if(this.attrs[ZaDomain.A_AuthLdapSearchBindDn] || this.attrs[ZaDomain.A_AuthLdapSearchBindPassword]) {
		this[ZaDomain.A_AuthUseBindPassword] = "TRUE";
	} else {
		this[ZaDomain.A_AuthUseBindPassword] = "FALSE";
	}
		
	this[ZaDomain.A_GALSampleQuery] = "john";
	if(!this.attrs[ZaDomain.A_zimbraGalAutoCompleteLdapFilter])
		this.attrs[ZaDomain.A_zimbraGalAutoCompleteLdapFilter] = "(|(cn=%s*)(sn=%s*)(gn=%s*)(mail=%s*))";
}

ZaDomain.prototype.parseNotebookFolderAcls = function (resp) {
	try {
		if(resp.isException && resp.isException()) {
			throw(resp.getException());
		}
		
		var response;
		if(resp.getResponse)
			response = resp.getResponse().Body.GetFolderResponse;
		else
			response = resp.Body.GetFolderResponse;
			
		if(response && response.folder && response.folder[0] && response.folder[0].acl
			&& response.folder[0].acl.grant) {
			var grants = response.folder[0].acl.grant;
			var cnt = grants.length;
			this[ZaDomain.A_allNotebookACLS] = [];
			for (var gi = 0; gi < cnt; gi++) {
				var grant = grants[gi];
				var grantObj = {
					r:grant.perm.indexOf("r")>=0 ? 1 : 0,
					w:grant.perm.indexOf("w")>=0 ? 1 : 0,
					i:grant.perm.indexOf("i")>=0 ? 1 : 0,
					d:grant.perm.indexOf("d")>=0 ? 1 : 0,
					a:grant.perm.indexOf("a")>=0 ? 1 : 0,
					x:grant.perm.indexOf("x")>=0 ? 1 : 0,
					toString:function () {
						return this.r+this.w+this.i+this.d+this.a+this.x;
					}
				};
				this[ZaDomain.A_allNotebookACLS].push({acl:grantObj, name:grant.d, zid:grant.zid, gt:grant.gt, 
						toString:function() {
							return (this.gt+":"+this.name+":"+this.grantObj.toString());
						}
					});
				/*if(this.notebookAcls[grant.gt] && (this.notebookAcls[grant.gt] instanceof Array)) {
					this.notebookAcls[grant.gt].push({acl:grantObj, name:grant.d, gt:grant.gt});
				} else {
					this.notebookAcls[grant.gt] = grantObj;
				}*/
				
			}
			this[ZaDomain.A_allNotebookACLS]._version = 0;
			
		}
	} catch (ex) {
		ZaApp.getInstance().getCurrentController()._handleException(ex, "ZaDomain.prototype.parseNotebookFolderAcls", null, false);	
	}
}
/**
* Returns HTML for a tool tip for this domain.
*/
ZaDomain.prototype.getToolTip =
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
		html[idx++] = AjxImg.getImageHtml("Domain");			
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

ZaDomain.prototype.remove = 
function(callback) {
	var soapDoc = AjxSoapDoc.create("DeleteDomainRequest", ZaZimbraAdmin.URN, null);
	soapDoc.set("id", this.id);
	//var command = new ZmCsfeCommand();
	var params = new Object();
	params.soapDoc = soapDoc;
	if(callback) {
		params.asyncMode = true;
		params.callback = callback;
	}
	var reqMgrParams = {
		controller : ZaApp.getInstance().getCurrentController(),
		busyMsg : ZaMsg.BUSY_DELETE_DOMAIN
	}
	ZaRequestMgr.invoke(params, reqMgrParams);	
}

ZaDomain.getLoginMessage = function () {
    var domain = ZaDomain.getDomainByName (ZaSettings.myDomainName, true) ;
    return domain.attrs[ZaDomain.A_zimbraAdminConsoleLoginMessage]  ;
}

ZaDomain.getDomainByName = 
function(domName) {
	if(!domName)
		return null;
	var domain = ZaDomain.staticDomainByNameCacheTable[domName];
	if(!domain) {
		domain = new ZaDomain();
		try {
			domain.load("name", domName, false, true);
		} catch (ex) {
			/*if(ex.code == ZmCsfeException.NO_SUCH_DOMAIN) {
				return null;
			} else {
				throw (ex);
			}*/
            if (ZaApp.getInstance() && ZaApp.getInstance().getCurrentController()) {
                ZaApp.getInstance().getCurrentController()._handleException(ex, "ZaDomain.getDomainByName", null, false);
            }
        }

		ZaDomain.putDomainToCache(domain);
	} 
	return domain;	
} 

ZaDomain.getDomainById = 
function (domId) {
	if(!domId)
		return null;
		
	var domain = ZaDomain.staticDomainByIdCacheTable[domId];
	if(!domain) {
		domain = new ZaDomain();
		try {
			domain.load("id", domId, false, true);
		} catch (ex) {
			if(ex.code == ZmCsfeException.NO_SUCH_DOMAIN) {
				return null;
			} else {
				throw (ex);
			}
		}
		ZaDomain.putDomainToCache(domain);
	}
	return domId;
}

ZaDomain.loadMethod = 
function(by, val) {
	by = by ? by : "name";
	val = val ? val : this.attrs[ZaDomain.A_domainName];
	this.notebookAcls[ZaDomain.A_NotebookAllACLs] = {r:0,w:0,i:0,d:0,a:0,x:0};
	this.notebookAcls[ZaDomain.A_NotebookPublicACLs] = {r:0,w:0,i:0,d:0,a:0,x:0};
	this.notebookAcls[ZaDomain.A_NotebookDomainACLs] = {r:1,w:1,i:1,d:1,a:0,x:0};
	this.notebookAcls[ZaDomain.A_NotebookUserACLs] = [/*{name:"", acl:{r:0,w:0,i:0,d:0,a:0,x:0}, 
			toString:function () {
				return [this.name,this.acl[r],this.acl[w],this.acl[i],this.acl[d],this.acl[a],this.acl[x]].join();
			}}*/];
	this.notebookAcls[ZaDomain.A_NotebookGroupACLs] = [/*{name:"", acl:{r:0,w:0,i:0,d:0,a:0,x:0}, 
			toString:function () {
				return [this.name,this.acl[r],this.acl[w],this.acl[i],this.acl[d],this.acl[a],this.acl[x]].join();
			}
		}*/];

	var soapDoc = AjxSoapDoc.create("GetDomainRequest", ZaZimbraAdmin.URN, null);
	var elBy = soapDoc.set("domain", val);
	elBy.setAttribute("by", by);
	//var getDomainCommand = new ZmCsfeCommand();
	var params = new Object();
	params.soapDoc = soapDoc;	
	
	var reqMgrParams = {
		controller : (ZaApp.getInstance() ? ZaApp.getInstance().getCurrentController() : null),
		busyMsg : ZaMsg.BUSY_GET_DOMAIN
	}
	var resp = ZaRequestMgr.invoke(params, reqMgrParams).Body.GetDomainResponse;
	this.initFromJS(resp.domain[0]);

    if(this.attrs[ZaDomain.A_zimbraDomainStatus] != ZaDomain.DOMAIN_STATUS_MAINTENANCE && this.attrs[ZaDomain.A_zimbraDomainStatus] != ZaDomain.DOMAIN_STATUS_SUSPENDED) {                                                                                    
	    if(this.attrs[ZaDomain.A_zimbraNotebookAccount]) {
			var soapDoc = AjxSoapDoc.create("GetFolderRequest", "urn:zimbraMail", null);
			var getFolderCommand = new ZmCsfeCommand();
			var params = new Object();
			params.soapDoc = soapDoc;
			params.accountName = this.attrs[ZaDomain.A_zimbraNotebookAccount];
		
			var folderEl = soapDoc.set("folder", "");
			folderEl.setAttribute("l", ZaDomain.WIKI_FOLDER_ID);	
			try {
				this.parseNotebookFolderAcls(getFolderCommand.invoke(params));
			} catch (ex) {
				ZaApp.getInstance().getCurrentController()._handleException(ex, "ZaDomain.loadMethod", null, false);
			}
		}
    }
	//this._defaultValues = ZaApp.getInstance().getGlobalConfig();	
}
ZaItem.loadMethods["ZaDomain"].push(ZaDomain.loadMethod);

ZaDomain.loadCatchAll = function () {
	if((this.attrs[ZaDomain.A_zimbraAdminConsoleCatchAllAddressEnabled] && this.attrs[ZaDomain.A_zimbraAdminConsoleCatchAllAddressEnabled] == "TRUE")
		|| (AjxUtil.isEmpty(this.attrs[ZaDomain.A_zimbraAdminConsoleCatchAllAddressEnabled]) && 
			(!AjxUtil.isEmpty(this._defaultValues.attrs[ZaDomain.A_zimbraAdminConsoleCatchAllAddressEnabled]) &&
				this._defaultValues.attrs[ZaDomain.A_zimbraAdminConsoleCatchAllAddressEnabled] == "TRUE") )) {
		
		var acc = ZaAccount.getCatchAllAccount (this.name);
		if(!AjxUtil.isEmpty(acc) && !AjxUtil.isEmpty(acc.id) && !AjxUtil.isEmpty(acc.name)) {
			this [ZaAccount.A_zimbraMailCatchAllAddress] = acc;
		} else {
			this [ZaAccount.A_zimbraMailCatchAllAddress] = null;
		}
	} else {
		this [ZaAccount.A_zimbraMailCatchAllAddress] = null;
	}
}
ZaItem.loadMethods["ZaDomain"].push(ZaDomain.loadCatchAll);

ZaDomain.checkDomainMXRecord = 
function(obj, callback) {
	var soapDoc = AjxSoapDoc.create("CheckDomainMXRecordRequest", ZaZimbraAdmin.URN, null);
	var elBy = soapDoc.set("domain", obj.id);
	elBy.setAttribute("by", "id");
	var params = new Object();
	params.soapDoc = soapDoc;	
	if(callback) {
		params.asyncMode = true;
		params.callback = callback;
	}
	var reqMgrParams = {
		controller : (ZaApp.getInstance() ? ZaApp.getInstance().getCurrentController() : null),
		busyMsg : ZaMsg.BUSY_CHECKING_MX
	}
	ZaRequestMgr.invoke(params, reqMgrParams);
}


ZaDomain.aclXModel = {
	items: [
		{id:"acl",
			type:_OBJECT_,
			items: [
				{id:"r", type:_NUMBER_},
				{id:"w", type:_NUMBER_},
				{id:"d", type:_NUMBER_},
				{id:"i", type:_NUMBER_},
				{id:"a", type:_NUMBER_},				
				{id:"x", type:_NUMBER_}
		]},
		{id:"name", type:_STRING_},
		{id:"gt",  type:_STRING_}	
	]
}

ZaDomain.myXModel = {
	items: [
    	{id:"getAttrs",type:_LIST_},
    	{id:"setAttrs",type:_LIST_},
    	{id:"rights",type:_LIST_},	
		{id:"name", type:_STRING_, ref:"name"},
		{id:ZaItem.A_zimbraId, type:_STRING_, ref:"attrs/" + ZaItem.A_zimbraId},
		{id:ZaDomain.A_domainName, type:_STRING_, ref:"attrs/" + ZaDomain.A_domainName, maxLength:255},
		{id:ZaDomain.A_zimbraPublicServiceHostname, type:_STRING_, ref:"attrs/" + ZaDomain.A_zimbraPublicServiceHostname, maxLength:255},
		{id:ZaDomain.A_zimbraDNSCheckHostname, type:_COS_STRING_, ref:"attrs/" + ZaDomain.A_zimbraDNSCheckHostname, maxLength:255},		
		{id:ZaDomain.A_zimbraAdminConsoleDNSCheckEnabled, type:_COS_ENUM_, choices:ZaModel.BOOLEAN_CHOICES, ref:"attrs/" + ZaDomain.A_zimbraAdminConsoleDNSCheckEnabled},
        {id:ZaDomain.A_zimbraAdminConsoleCatchAllAddressEnabled, type:_COS_ENUM_, choices:ZaModel.BOOLEAN_CHOICES, ref:"attrs/" + ZaDomain.A_zimbraAdminConsoleCatchAllAddressEnabled},
        {id:ZaDomain.A_zimbraAdminConsoleLDAPAuthEnabled, type:_COS_ENUM_, choices:ZaModel.BOOLEAN_CHOICES, ref:"attrs/" + ZaDomain.A_zimbraAdminConsoleLDAPAuthEnabled},    
        {id:ZaDomain.A_zimbraAdminConsoleSkinEnabled, type:_COS_ENUM_, choices:ZaModel.BOOLEAN_CHOICES, ref:"attrs/" + ZaDomain.A_zimbraAdminSkinAddressEnabled},
        {id:ZaDomain.A_zimbraVirtualHostname, type:_LIST_, listItem:{type:_STRING_, maxLength:255}, ref:"attrs/" + ZaDomain.A_zimbraVirtualHostname},
//		{id:ZaDomain.A_description, type:_STRING_, ref:"attrs/" + ZaDomain.A_description},
         ZaItem.descriptionModelItem,   
        {id:ZaDomain.A_notes, type:_STRING_, ref:"attrs/" + ZaDomain.A_notes},
		{id:ZaDomain.A_domainDefaultCOSId, type:_STRING_, ref:"attrs/" + ZaDomain.A_domainDefaultCOSId},		
		{id:ZaDomain.A_GalMode, type:_STRING_, ref:"attrs/" + ZaDomain.A_GalMode},
		{id:ZaDomain.A_GalMaxResults, type:_NUMBER_, ref:"attrs/" + ZaDomain.A_GalMaxResults, maxInclusive:2147483647, minInclusive:1},					
		{id:ZaDomain.A_GALServerType, type:_STRING_, ref:"attrs/" + ZaDomain.A_GALServerType},
		{id:ZaDomain.A_GALSyncServerType, type:_STRING_, ref:"attrs/" + ZaDomain.A_GALSyncServerType},
		{id:ZaDomain.A_GALSyncUseGALSearch, type:_ENUM_, choices:ZaModel.BOOLEAN_CHOICES, ref:"attrs/" + ZaDomain.A_GALSyncUseGALSearch},
		{id:ZaDomain.A_GalLdapFilter, type:_STRING_, ref:"attrs/" + ZaDomain.A_GalLdapFilter,required:true},
		{id:ZaDomain.A_zimbraGalAutoCompleteLdapFilter, type:_STRING_, ref:"attrs/" + ZaDomain.A_zimbraGalAutoCompleteLdapFilter},		
		{id:ZaDomain.A_GalLdapSearchBase, type:_STRING_, ref:"attrs/" + ZaDomain.A_GalLdapSearchBase},
		{id:ZaDomain.A_UseBindPassword, type:_ENUM_, choices:ZaModel.BOOLEAN_CHOICES, ref:"attrs/" + ZaDomain.A_UseBindPassword},
		{id:ZaDomain.A_SyncUseBindPassword, type:_ENUM_, choices:ZaModel.BOOLEAN_CHOICES, ref:"attrs/" + ZaDomain.A_SyncUseBindPassword},
		{id:ZaDomain.A_GalLdapURL, type:_LIST_,  listItem:{type:_SHORT_URL_}, ref:"attrs/" + ZaDomain.A_GalLdapURL},
		{id:ZaDomain.A_zimbraGalSyncLdapURL, type:_LIST_,  listItem:{type:_SHORT_URL_}, ref:"attrs/" + ZaDomain.A_zimbraGalSyncLdapURL},
		{id:ZaDomain.A_GalLdapBindDn, type:_STRING_, ref:"attrs/" + ZaDomain.A_GalLdapBindDn},
		{id:ZaDomain.A_GalLdapBindPassword, type:_STRING_, ref:"attrs/" + ZaDomain.A_GalLdapBindPassword},
		{id:ZaDomain.A_GalLdapBindPasswordConfirm, type:_STRING_, ref:"attrs/" + ZaDomain.A_GalLdapBindPasswordConfirm},		
		{id:ZaDomain.A_AuthLdapUserDn, type:_STRING_,ref:"attrs/" + ZaDomain.A_AuthLdapUserDn},
		{id:ZaDomain.A_zimbraAuthLdapStartTlsEnabled, type:_ENUM_, choices:ZaModel.BOOLEAN_CHOICES, ref:"attrs/" + ZaDomain.A_zimbraAuthLdapStartTlsEnabled},
		{id:ZaDomain.A_AuthLDAPServerName, type:_STRING_, ref:"attrs/" + ZaDomain.A_AuthLDAPServerName},
		{id:ZaDomain.A_AuthLDAPSearchBase, type:_STRING_, ref:"attrs/" + ZaDomain.A_AuthLDAPSearchBase},
		{id:ZaDomain.A_AuthLDAPServerPort, type:_NUMBER_, ref:"attrs/" + ZaDomain.A_AuthLDAPServerPort, maxInclusive:2147483647},
		{id:ZaDomain.A_AuthMech, type:_STRING_, ref:"attrs/" + ZaDomain.A_AuthMech},
		{id:ZaDomain.A_AuthLdapURL, type:_LIST_,  listItem:{type:_SHORT_URL_}, ref:"attrs/" + ZaDomain.A_AuthLdapURL},
		{id:ZaDomain.A_AuthADDomainName, type:_STRING_, ref:"attrs/" + ZaDomain.A_AuthADDomainName},
		{id:ZaDomain.A_AuthLdapSearchBase, type:_STRING_, ref:"attrs/" + ZaDomain.A_AuthLdapSearchBase},		
		{id:ZaDomain.A_AuthLdapSearchFilter, type:_STRING_, ref:"attrs/" + ZaDomain.A_AuthLdapSearchFilter},		
		{id:ZaDomain.A_AuthLdapSearchBindDn, type:_STRING_, ref:"attrs/" + ZaDomain.A_AuthLdapSearchBindDn},		
		{id:ZaDomain.A_AuthLdapSearchBindPassword, type:_STRING_, ref:"attrs/" + ZaDomain.A_AuthLdapSearchBindPassword},		
		{id:ZaDomain.A_zimbraDomainStatus, type:_STRING_, ref:"attrs/"+ZaDomain.A_zimbraDomainStatus},
		{id:ZaDomain.A_AuthTestUserName, type:_STRING_},
		{id:ZaDomain.A_AuthTestPassword, type:_STRING_},
		{id:ZaDomain.A_AuthTestMessage, type:_STRING_},
		{id:ZaDomain.A_AuthTestResultCode, type:_STRING_},
		{id:ZaDomain.A_AuthTestMessage, type:_STRING_},
		{id:ZaDomain.A_AuthComputedBindDn, type:_STRING_},
		{id:ZaDomain.A_GALSearchTestMessage, type:_STRING_},
		{id:ZaDomain.A_GALSyncTestMessage, type:_STRING_},
		{id:ZaDomain.A_GALSearchTestResultCode, type:_STRING_},
		{id:ZaDomain.A_GALSyncTestResultCode, type:_STRING_},		
		{id:ZaDomain.A_GALSampleQuery, type:_STRING_,required:true},
		{id:ZaDomain.A_AuthUseBindPassword, type:_STRING_,type:_ENUM_, choices:ZaModel.BOOLEAN_CHOICES},		
		{id:ZaDomain.A_AuthLdapSearchBindPasswordConfirm, type:_STRING_},				
		
		{id:ZaDomain.A_zimbraPrefTimeZoneId,type:_STRING_, ref:"attrs/"+ZaDomain.A_zimbraPrefTimeZoneId, choices:ZaSettings.timeZoneChoices},
        {id:ZaModel.currentStep, type:_NUMBER_, ref:ZaModel.currentStep, maxInclusive:2147483647},
		{id:ZaDomain.A2_acl_selection_cache, type:_LIST_},
		{id:ZaDomain.A_GALTestSearchResults, ref:ZaDomain.A_GALTestSearchResults, type:_LIST_, 
			listItem: {type:_OBJECT_, 
				items:[
					{id:"email", type:_STRING_},
					{id:"fullName", type:_STRING_},					
					{id:"firstName", type:_STRING_},										
					{id:"lastName", type:_STRING_}														
				]
			}
		},		
		{id:ZaDomain.A_NotebookTemplateDir, type:_STRING_, ref:ZaDomain.A_NotebookTemplateDir},
		{id:ZaDomain.A_NotebookTemplateFolder, type:_STRING_, ref:ZaDomain.A_NotebookTemplateFolder},
		{id:ZaDomain.A_NotebookAccountName, type:_STRING_},
		{id:ZaDomain.A_NotebookAccountPassword, type:_STRING_},
		{id:ZaDomain.A_NotebookAccountPassword2, type:_STRING_},		
		{id:ZaDomain.A_CreateNotebook, type:_ENUM_, choices:ZaModel.BOOLEAN_CHOICES},
		{id:ZaDomain.A_OverwriteTemplates, type:_ENUM_, choices:ZaModel.BOOLEAN_CHOICES},
		{id:ZaDomain.A_zimbraNotebookAccount, type:_STRING_, ref:"attrs/" +ZaDomain.A_zimbraNotebookAccount},
		{id:ZaDomain.A_NotebookAllACLs, ref:"notebookAcls/"+ZaDomain.A_NotebookAllACLs, type:_OBJECT_,
			items: [
				{id:"r", type:_NUMBER_},
				{id:"w", type:_NUMBER_},
				{id:"d", type:_NUMBER_},
				{id:"i", type:_NUMBER_},
				{id:"a", type:_NUMBER_},				
				{id:"x", type:_NUMBER_}
			]
		},
		{id:ZaDomain.A_NotebookDomainACLs, ref:"notebookAcls/"+ZaDomain.A_NotebookDomainACLs, type:_OBJECT_,
			items: [
				{id:"r", type:_NUMBER_},
				{id:"w", type:_NUMBER_},
				{id:"d", type:_NUMBER_},
				{id:"i", type:_NUMBER_},
				{id:"a", type:_NUMBER_},				
				{id:"x", type:_NUMBER_}
			]
		},
		{id:ZaDomain.A_NotebookPublicACLs, ref:"notebookAcls/"+ZaDomain.A_NotebookPublicACLs, type:_OBJECT_,
			items: [
				{id:"r", type:_NUMBER_},
				{id:"w", type:_NUMBER_},
				{id:"d", type:_NUMBER_},
				{id:"i", type:_NUMBER_},
				{id:"a", type:_NUMBER_},				
				{id:"x", type:_NUMBER_}
			]
		}, 
		{id:ZaDomain.A_NotebookGroupACLs, ref:"notebookAcls/"+ZaDomain.A_NotebookGroupACLs, type:_LIST_,
			listItem:{type:_OBJECT_,
				items: [
					{id:"acl", /*type:_LIST_, 
						listItem:{*/
							type:_OBJECT_,
							items: [
								{id:"r", type:_NUMBER_},
								{id:"w", type:_NUMBER_},
								{id:"d", type:_NUMBER_},
								{id:"i", type:_NUMBER_},
								{id:"a", type:_NUMBER_},				
								{id:"x", type:_NUMBER_}
							]
//						}
					},
					{id:"name", type:_STRING_},
					{id:"gt",  type:_STRING_}
				]
			}
		}, 
		{id:ZaDomain.A_NotebookUserACLs, ref:"notebookAcls/"+ZaDomain.A_NotebookUserACLs, type:_LIST_,
			listItem:{type:_OBJECT_,
				items: [
					{id:"acl",/* type:_LIST_, 
						listItem:{*/
							type:_OBJECT_,
							items: [
								{id:"r", type:_NUMBER_},
								{id:"w", type:_NUMBER_},
								{id:"d", type:_NUMBER_},
								{id:"i", type:_NUMBER_},
								{id:"a", type:_NUMBER_},				
								{id:"x", type:_NUMBER_}
							]
						//}
					},
					{id:"name", type:_STRING_},
					{id:"gt",  type:_STRING_}
				]
			}
		},
		{id:ZaDomain.A_allNotebookACLS, ref:ZaDomain.A_allNotebookACLS, type:_LIST_,
			listItem:{type:_OBJECT_,
				items: [
					{id:"acl", type:_OBJECT_,
						items: [
							{id:"r", type:_NUMBER_},
							{id:"w", type:_NUMBER_},
							{id:"d", type:_NUMBER_},
							{id:"i", type:_NUMBER_},
							{id:"a", type:_NUMBER_},				
							{id:"x", type:_NUMBER_}
						]
					},
					{id:"name", type:_STRING_}, //null, domain name, group name, user name
					{id:"gt",  type:_STRING_} //grp, usr, dom, pub, all, guest
				]
			}
		},
      {id:ZaDomain.A_zimbraZimletDomainAvailableZimlets, type:_LIST_,
          ref:"attrs/" + ZaDomain.A_zimbraZimletDomainAvailableZimlets,
          dataType: _STRING_ ,outputType:_LIST_},
      { id:ZaAccount.A_zimbraMailCatchAllAddress, ref:ZaAccount.A_zimbraMailCatchAllAddress , type:_OBJECT_,items:[ {id:"id", type:_STRING_},{id:"name", type:_STRING_}] },
      { id:ZaDomain.A_zimbraDomainCOSMaxAccounts, ref:"attrs/" + ZaDomain.A_zimbraDomainCOSMaxAccounts ,
                 type:_LIST_ , dataType: _STRING_ ,outputType:_LIST_ },
      { id:ZaDomain.A_zimbraDomainFeatureMaxAccounts, ref:"attrs/" + ZaDomain.A_zimbraDomainFeatureMaxAccounts ,
                        type:_LIST_ , dataType: _STRING_ ,outputType:_LIST_ },

       //skin properties
      { id:ZaDomain.A_zimbraSkinForegroundColor, ref:"attrs/" + ZaDomain.A_zimbraSkinForegroundColor, type: _COS_STRING_ },
      { id:ZaDomain.A_zimbraSkinBackgroundColor, ref:"attrs/" + ZaDomain.A_zimbraSkinBackgroundColor, type: _COS_STRING_ },
      { id:ZaDomain.A_zimbraSkinSecondaryColor, ref:"attrs/" + ZaDomain.A_zimbraSkinSecondaryColor, type: _COS_STRING_ },
      { id:ZaDomain.A_zimbraSkinSelectionColor, ref:"attrs/" + ZaDomain.A_zimbraSkinSelectionColor, type: _COS_STRING_ },

      { id:ZaDomain.A_zimbraSkinLogoURL, ref:"attrs/" + ZaDomain.A_zimbraSkinLogoURL, type:_COS_STRING_ },
      { id:ZaDomain.A_zimbraSkinLogoLoginBanner, ref:"attrs/" + ZaDomain.A_zimbraSkinLogoLoginBanner, type:_COS_STRING_ },
      { id:ZaDomain.A_zimbraSkinLogoAppBanner, ref:"attrs/" + ZaDomain.A_zimbraSkinLogoAppBanner, type:_COS_STRING_ },

        //interop
       { id:ZaDomain.A_zimbraFreebusyExchangeAuthUsername, ref:"attrs/" + ZaDomain.A_zimbraFreebusyExchangeAuthUsername, type: _STRING_ },
       { id:ZaDomain.A_zimbraFreebusyExchangeAuthPassword, ref:"attrs/" + ZaDomain.A_zimbraFreebusyExchangeAuthPassword, type: _STRING_ },
       { id:ZaDomain.A_zimbraFreebusyExchangeAuthScheme, ref:"attrs/" + ZaDomain.A_zimbraFreebusyExchangeAuthScheme,
             type: _COS_ENUM_ , choices: ["basic", "form"]},
       { id:ZaDomain.A_zimbraFreebusyExchangeURL, ref:"attrs/" + ZaDomain.A_zimbraFreebusyExchangeURL, type: _STRING_ } ,
       { id:ZaDomain.A_zimbraFreebusyExchangeUserOrg, ref:"attrs/" + ZaDomain.A_zimbraFreebusyExchangeUserOrg, type: _STRING_ }     
    ]
};


/**
 * Domain Level Account Limits Object, it is a client side only domain property and used
 * by both domain view and account view.  The value is based on the zimbraDomainCOSMaxAccounts
 *  zimbraDomainCOSMaxAccounts is a multi value attribute, its value is in format of "cosName:account_limits",
 * eg.
 *  zimbraDomainCOSMaxAccounts = professional:10
 *
 *  //this value is built on demand
 *
 *  domain.account_limits =
 *   {
 *      cosName : { max: 10,
 *                  used: 2 , //used value is got by the searchDirectory on this domain
 *                  available: 8
 *                  }
 *   }
 *
 **/

ZaDomain.prototype.getUsedDomainAccounts = function () {
    var total = 0 ;    
    var accountCountsByCoses = this.getAccountCountsByCoses();
    if (accountCountsByCoses && accountCountsByCoses.length > 0) {
      for (var i = 0 ; i < accountCountsByCoses.length; i ++) {
        var count = accountCountsByCoses[i]._content ;
        total += parseInt(count) ;
      }
    }
    return total ;
}

ZaDomain.prototype.getAccountCountsByCoses = function () {
    try {
        var soapDoc = AjxSoapDoc.create("CountAccountRequest", ZaZimbraAdmin.URN, null);
        var elBy = soapDoc.set("domain", this.name);
        elBy.setAttribute("by", "name");
        //var command = new ZmCsfeCommand();
        var params = new Object();
        params.soapDoc = soapDoc;

        var reqMgrParams = {
            controller : ZaApp.getInstance().getCurrentController(),
            busyMsg : ZaMsg.BUSY_COUNT_ACCOUNTS
        }
        var resp = ZaRequestMgr.invoke(params, reqMgrParams);
        var accountCountsByCoses = resp.Body.CountAccountResponse.cos ;
        return accountCountsByCoses ;
    }catch (ex) {
        ZaApp.getInstance().getCurrentController().popupErrorDialog(
                AjxMessageFormat.format(ZaMsg.ERROR_GET_USED_ACCOUNTS, [this.name]), ex);
    }
}

ZaDomain.prototype.updateUsedAccounts = function () {
    this.getUsedAccounts("default", true) ;
}

ZaDomain.prototype.getUsedAccounts =
function (cosName, refresh) {
    if (!this[ZaDomain.A2_account_limit]) this[ZaDomain.A2_account_limit] = {};
    if (!this[ZaDomain.A2_account_limit][cosName])  this[ZaDomain.A2_account_limit][cosName] = {} ;

    if (refresh || (this[ZaDomain.A2_account_limit][cosName].used == null)) {
        //need to call the CountAccountRequest
        var accountCountsByCoses = this.getAccountCountsByCoses();
        if (accountCountsByCoses && accountCountsByCoses.length > 0) {
            for (var i = 0 ; i < accountCountsByCoses.length; i ++) {
                var aCosName =  accountCountsByCoses[i].name ;
                if (!this[ZaDomain.A2_account_limit][aCosName]) this[ZaDomain.A2_account_limit][aCosName] = {} ;
                this[ZaDomain.A2_account_limit][aCosName].used =
                                                parseInt (accountCountsByCoses[i]._content) ;
            }
        }else{
            //no account has been created, so the used accounts are 0  
        }
    }

    if (this[ZaDomain.A2_account_limit][cosName].used == null) this[ZaDomain.A2_account_limit][cosName].used = 0;
    
    return this[ZaDomain.A2_account_limit][cosName].used ;
}

ZaDomain.prototype.getMaxAccounts = function (cosName) {
    if (! this [ZaDomain.A2_account_limit] )  this[ZaDomain.A2_account_limit] = {} ;

    //var cosName = ZaCos.getCosById (cosId).name ;
    if (!this[ZaDomain.A2_account_limit][cosName]) this[ZaDomain.A2_account_limit][cosName] = {} ;

    if (! this [ZaDomain.A2_account_limit][cosName].max ) {
        //retrieve the total allowed accounts
        var cosMaxAccounts = this.attrs[ZaDomain.A_zimbraDomainCOSMaxAccounts];
        for (var i=0; i < cosMaxAccounts.length; i ++) {
            var val = cosMaxAccounts[i].split(":") ;
            var cos = ZaCos.getCosById (val[0]) ;
            if (cos == null) {
                    ZaApp.getInstance().getCurrentController.popupErrorDialog(
                        AjxMessageFormat.format(ZaMsg.ERROR_INVALID_ACCOUNT_TYPE, [val[0]]));
                return ;
            }
            var n = cos.name ;
            //TODO: report error on the invalid value 
            if (!this[ZaDomain.A2_account_limit][n]) this[ZaDomain.A2_account_limit][n] = {} ;
            this[ZaDomain.A2_account_limit][n].max = val [1] ;
        }
    }

    return  this[ZaDomain.A2_account_limit][cosName].max ;
}

ZaDomain.prototype.getAvailableAccounts = function (cosName, refresh) {
    //var cosName = ZaCos.getCosById (cosId).name ;
    if (!this[ZaDomain.A2_account_limit][cosName]) this[ZaDomain.A2_account_limit][cosName] = {} ;
    if (! this [ZaDomain.A2_account_limit][cosName].available
            || refresh ) {
        //retrieve the used accounts
        var used = this.getUsedAccounts (cosName, refresh);
        var max = this.getMaxAccounts (cosName) ;
        this [ZaDomain.A2_account_limit][cosName].available = max - used ;
    }

    return this[ZaDomain.A2_account_limit][cosName].available;
}

//Account types is only available when ZimbraDomainCOSMaxAccounts are set
ZaDomain.prototype.getAccountTypes = function () {
    var types = [] ;
    var cosMaxAccounts = this.attrs[ZaDomain.A_zimbraDomainCOSMaxAccounts];
    if (cosMaxAccounts && cosMaxAccounts.length > 0 ) {
        for (var i=0; i < cosMaxAccounts.length; i ++) {
            var val = cosMaxAccounts[i].split(":") ;
            types.push (val[0]) ;
        }
    }

    return types ;
}

ZaDomain.getTotalLimitsPerAccountTypes = function (cosMaxAccounts) {
    var total = 0 ;
    //var cosMaxAccounts = this.attrs[ZaDomain.A_zimbraDomainCOSMaxAccounts];
    if (cosMaxAccounts && cosMaxAccounts.length > 0 ) {
        for (var i=0; i < cosMaxAccounts.length; i ++) {
            var val = cosMaxAccounts[i].split(":") ;
            total += new Number (val [1]);
        }
    }

    return total ;
}

ZaDomain.searchAccountsInDomain =
function (domainName) {
    if (domainName) {
        var controller = ZaApp.getInstance().getSearchListController() ;
        var callback =  new AjxCallback(controller, controller.searchCallback, {limit:controller.RESULTSPERPAGE,show:true});
//        controller._currentQuery = "(|(zimbraMailDeliveryAddress=*@" + domainName +")(zimbraMailAlias=*@"+ domainName+"))" ;
        controller._currentQuery = "" ;
        var searchTypes = [ZaSearch.ACCOUNTS, ZaSearch.DLS, ZaSearch.ALIASES, ZaSearch.RESOURCES] ;

        if(controller.setSearchTypes)
            controller.setSearchTypes(searchTypes);
        var searchParams = {
                query:controller._currentQuery,
                domain: domainName,
                types:searchTypes,
                attrs:ZaSearch.standardAttributes,
                callback:callback,
                controller: controller
        }
        ZaSearch.searchDirectory(searchParams);
    }else {
        var currentController = ZaApp.getInstance().getCurrentController () ;
        currentController.popupErrorDialog(ZaMsg.ERROR_NO_DOMAIN_NAME) ;
    }
}

