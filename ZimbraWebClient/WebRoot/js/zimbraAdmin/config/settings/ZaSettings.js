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

function ZaSettings() {
}

ZaSettings.initialized = false;
ZaSettings.initMethods = new Array();
/**
* Look for admin name cookies and admin type cookies
**/
ZaSettings.init = function () {
	if(ZaSettings.initialized)
		return;
		
	DBG.println(AjxDebug.DBG1,"Initializing ZaSettings");		
	
	var soapDoc = AjxSoapDoc.create("GetInfoRequest", "urn:zimbraAccount", null);	
	var resp = ZmCsfeCommand.invoke(soapDoc, null, null, null, false);
	var info = resp.Body.GetInfoResponse;
	if (info.attrs && info.attrs.attr) {
		var attr = info.attrs.attr;
		for (var i = 0; i < attr.length; i++) {
			if (attr[i].name == 'zimbraIsDomainAdminAccount') {
				ZaSettings.isDomainAdmin = attr[i]._content == 'TRUE';
				break;
			}
		}
	}
	
	var adminName = AjxCookie.getCookie(document, ZaSettings.ADMIN_NAME_COOKIE);
	if(adminName) {
		var emailChunks = adminName .split("@");
		var tmpDomain = new ZaDomain();
		if(emailChunks.length > 1 ) {
			tmpDomain.name = emailChunks[1];
			ZaSettings.myDomainName = emailChunks[1];
			EmailAddr_XFormItem.domainChoices.setChoices([tmpDomain]);
			EmailAddr_XFormItem.domainChoices.dirtyChoices();							    
		} else {
			//throw new AjxException("Failed to parse login name", AjxException.UNKNOWN, "ZaAuthenticate.prototype._processResponse");
		}				
	}
	/**
	* Load the extensions
	Body: {
  GetZimletsResponse: {
    _jsns: "urn:zimbraAdmin",
    zimlets: {
      zimlet: [
        0: {
          zimlet: [
            0: {
              description: "HSM Extension",
              extension: "true",
              include: [
                0: {
                  _content: "/service/zimlet/hsm/hsm.js"
                 }
               ],
              name: "hsm",
              version: "1.0"
             }
           ]
         }
       ]
     }
   }
 },
Header: {
  context: {
    _jsns: "urn:zimbra",
    sessionId: [
      0: {
        _content: "1",
        id: "1",
        type: "admin"
       }
     ]
   }
 },
_jsns: "urn:zimbraSoap




Body: {
  GetZimletsResponse: {
    _jsns: "urn:zimbraAdmin",
    zimlets: {
      zimlet: [
        0: {
          zimlet: [
            0: {
              description: "HSM Extension",
              extension: "true",
              include: [
                0: {
                  _content: "hsm.js"
                 }
               ],
              name: "hsm",
              version: "1.0"
             }
           ],
          zimletContext: [
            0: {
              baseUrl: "/service/zimlet/hsm/"
             }
           ]
         }
       ]
     }
   }
 },
	**/
	var soapDoc = AjxSoapDoc.create("GetZimletsRequest", "urn:zimbraAdmin", null);	
	var resp = ZmCsfeCommand.invoke(soapDoc, null, null, null, false);
	var zimlets = null;
	if(resp && resp.Body && resp.Body.GetZimletsResponse && resp.Body.GetZimletsResponse.zimlets && resp.Body.GetZimletsResponse.zimlets.zimlet) {
		zimlets = resp.Body.GetZimletsResponse.zimlets.zimlet;
	}
	if(zimlets && zimlets.length > 0) {
		var cnt = zimlets.length;
		for(var ix = 0; ix < cnt; ix++) {
			if(zimlets[ix] && zimlets[ix].zimlet && zimlets[ix].zimlet[0] && zimlets[ix].zimletContext && zimlets[ix].zimletContext[0]) {
				var zimlet = zimlets[ix].zimlet[0];
				var zimletContext = zimlets[ix].zimletContext[0];
				if(zimlet.include && zimlet.include.length>0) {
					var includes = new Array();
					var cnt2 = zimlet.include.length;
					for (var j=0;j<cnt2;j++) {
						includes.push(zimletContext.baseUrl + zimlet.include[j]._content);
					}
					if(includes.length > 0)
						AjxInclude(includes);
				}
			} else {
				continue;
			}
		}
	}
	
	// post-processing code
	DBG.println("+++ document.location.pathname: "+document.location.pathname);
	var files = [ document.location.pathname + "public/adminPost.js" ];
	AjxInclude(files);
	
	ZaSettings.initialized = true;
};
ZaSettings.postInit = function() {
	//Instrumentation code start	
	if(ZaSettings.initMethods) {
		var cnt = ZaSettings.initMethods.length;
		for(var i = 0; i < cnt; i++) {
			if(typeof(ZaSettings.initMethods[i]) == "function") {
				ZaSettings.initMethods[i].call(this);
			}
		}
	}	
	//Instrumentation code end	
};
/**
* Static method so that static code can get the default value of a setting if it needs to.
*
* @param id		the numeric ID of the setting
*/
ZaSettings.get =
function(id) {
	var args = ZaSettings.INIT[id];
	return args ? args[3] : null;
}

// setting types
ZaSettings.T_CONFIG		= 1;

// setting data types
ZaSettings.D_STRING		= 1; // default type
ZaSettings.D_INT			= 2;
ZaSettings.D_BOOLEAN		= 3;
ZaSettings.D_LDAP_TIME 	= 4;
ZaSettings.D_HASH_TABLE 	= 5;
ZaSettings.LOGO_URI = "http://www.zimbra.com";
ZaSettings.CSFE_SERVER_URI = (location.port == "80") ? "/service/admin/soap/" : ":" + location.port + "/service/admin/soap/";
ZaSettings.CSFE_MSG_FETCHER_URI = (location.port == "80") ? "/service/content/get?" : ":" + location.port + "/service/content/get?";
ZaSettings.CONFIG_PATH = "/zimbraAdmin/js/zimbraAdmin/config";
ZaSettings.ADMIN_NAME_COOKIE = "ZA_ADMIN_NAME_COOKIE";
ZaSettings.myDomainName = "zimbra.com";

var i = 1;
// IDs FOR HTML COMPONENTS IN THE SKIN
ZaSettings.SKIN_APP_BOTTOM_TOOLBAR_ID	= i++;
ZaSettings.SKIN_APP_CHOOSER_ID			= i++;
ZaSettings.SKIN_APP_MAIN_ID				= i++;
ZaSettings.SKIN_APP_TOP_TOOLBAR_ID		= i++;
ZaSettings.SKIN_CURRENT_APP_ID			= i++;
ZaSettings.SKIN_LOGO_ID					= i++;
ZaSettings.SKIN_SASH_ID					= i++;
ZaSettings.SKIN_SEARCH_BUILDER_ID		= i++;
ZaSettings.SKIN_SEARCH_BUILDER_TOOLBAR_ID= i++;
ZaSettings.SKIN_SEARCH_BUILDER_TR_ID		= i++;
ZaSettings.SKIN_SEARCH_ID				= i++;
ZaSettings.SKIN_SHELL_ID					= i++;
ZaSettings.SKIN_STATUS_ID				= i++;
ZaSettings.SKIN_TREE_ID					= i++;
ZaSettings.SKIN_TREE_FOOTER_ID			= i++;
ZaSettings.SKIN_USER_INFO_ID				= i++;

//CONSTANTS FOR ROLE-BASED ACCESS
ZaSettings.STATUS_ENABLED= true;
ZaSettings.STATS_ENABLED= true;
ZaSettings.ACCOUNTS_CHPWD_ENABLED = true;
ZaSettings.ACCOUNTS_ENABLED = true;
ZaSettings.ACCOUNTS_FEATURES_ENABLED = true;
ZaSettings.ACCOUNTS_ADVANCED_ENABLED = true;
ZaSettings.ACCOUNTS_ALIASES_ENABLED=true;
ZaSettings.ACCOUNTS_FORWARDING_ENABLED=true;
ZaSettings.ACCOUNTS_MOVE_ALIAS_ENABLED=true;
ZaSettings.ACCOUNTS_REINDEX_ENABLED=true;
ZaSettings.ACCOUNTS_PREFS_ENABLED = true;
ZaSettings.ACCOUNTS_VIEW_MAIL_ENABLED = true;
ZaSettings.ACCOUNTS_RESTORE_ENABLED = true;
ZaSettings.COSES_ENABLED=true;
ZaSettings.DOMAINS_ENABLED=true;
ZaSettings.SERVERS_ENABLED=true;
ZaSettings.SERVER_STATS_ENABLED=true;
ZaSettings.GLOBAL_CONFIG_ENABLED= true;
ZaSettings.DISTRIBUTION_LISTS_ENABLED = true;

ZaSettings.MONITORING_ENABLED = true;
ZaSettings.SYSTEM_CONFIG_ENABLED = true;
ZaSettings.ADDRESSES_ENABLED = true;

// initialization for settings: [name, type, data type, default value]
ZaSettings.INIT = new Object();
// IDs FOR HTML COMPONENTS IN THE SKIN
ZaSettings.INIT[ZaSettings.SKIN_APP_BOTTOM_TOOLBAR_ID]	= [null, ZaSettings.T_CONFIG, ZaSettings.D_STRING, "skin_container_app_bottom_toolbar"];
ZaSettings.INIT[ZaSettings.SKIN_APP_CHOOSER_ID]			= [null, ZaSettings.T_CONFIG, ZaSettings.D_STRING, "skin_container_app_chooser"];
ZaSettings.INIT[ZaSettings.SKIN_APP_MAIN_ID]				= [null, ZaSettings.T_CONFIG, ZaSettings.D_STRING, "skin_container_app_main"];
ZaSettings.INIT[ZaSettings.SKIN_APP_TOP_TOOLBAR_ID]		= [null, ZaSettings.T_CONFIG, ZaSettings.D_STRING, "skin_container_app_top_toolbar"];
ZaSettings.INIT[ZaSettings.SKIN_CURRENT_APP_ID]			= [null, ZaSettings.T_CONFIG, ZaSettings.D_STRING, "skin_container_current_app"];
ZaSettings.INIT[ZaSettings.SKIN_LOGO_ID]					= [null, ZaSettings.T_CONFIG, ZaSettings.D_STRING, "skin_container_logo"];
ZaSettings.INIT[ZaSettings.SKIN_SASH_ID]					= [null, ZaSettings.T_CONFIG, ZaSettings.D_STRING, "skin_container_tree_app_sash"];
ZaSettings.INIT[ZaSettings.SKIN_SEARCH_BUILDER_ID]		= [null, ZaSettings.T_CONFIG, ZaSettings.D_STRING, "skin_container_search_builder"];
ZaSettings.INIT[ZaSettings.SKIN_SEARCH_BUILDER_TOOLBAR_ID]= [null, ZaSettings.T_CONFIG, ZaSettings.D_STRING, "skin_container_search_builder_toolbar"];
ZaSettings.INIT[ZaSettings.SKIN_SEARCH_BUILDER_TR_ID]		= [null, ZaSettings.T_CONFIG, ZaSettings.D_STRING, "skin_tr_search_builder"];
ZaSettings.INIT[ZaSettings.SKIN_SEARCH_ID]				= [null, ZaSettings.T_CONFIG, ZaSettings.D_STRING, "skin_container_search"];
ZaSettings.INIT[ZaSettings.SKIN_SHELL_ID]					= [null, ZaSettings.T_CONFIG, ZaSettings.D_STRING, "skin_outer"];
ZaSettings.INIT[ZaSettings.SKIN_STATUS_ID]				= [null, ZaSettings.T_CONFIG, ZaSettings.D_STRING, "skin_container_status"];
ZaSettings.INIT[ZaSettings.SKIN_TREE_ID]					= [null, ZaSettings.T_CONFIG, ZaSettings.D_STRING, "skin_container_tree"];
ZaSettings.INIT[ZaSettings.SKIN_TREE_FOOTER_ID]			= [null, ZaSettings.T_CONFIG, ZaSettings.D_STRING, "skin_container_tree_footer"];

ZaSettings.INIT[ZaSettings.SKIN_USER_INFO_ID]				= [null, ZaSettings.T_CONFIG, ZaSettings.D_STRING, "skin_container_quota"];
