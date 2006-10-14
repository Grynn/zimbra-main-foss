/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 * 
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 ("License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.zimbra.com/license
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is: Zimbra Collaboration Suite Server.
 * 
 * The Initial Developer of the Original Code is Zimbra, Inc.
 * Portions created by Zimbra are Copyright (C) 2006 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s): 
 * 
 * ***** END LICENSE BLOCK *****
 */
package com.zimbra.cs.dav;

import org.dom4j.Namespace;
import org.dom4j.QName;

public class DavElements {
	public static final String WEBDAV_NS_STRING = "DAV:";
	public static final String CALDAV_NS_STRING = "urn:ietf:params:xml:ns:caldav";
	public static final String XML_NS_STRING = "xml:";
	
	public static final Namespace WEBDAV_NS = Namespace.get(WEBDAV_NS_STRING);
	public static final Namespace CALDAV_NS = Namespace.get(CALDAV_NS_STRING);
	public static final Namespace XML_NS = Namespace.get(XML_NS_STRING);

	// general
	public static final String P_LANG = "lang";
	public static final QName  E_LANG = QName.get(P_LANG, XML_NS);
	
	// properties
	public static final String P_CREATIONDATE = "creationdate";
	public static final String P_DISPLAYNAME = "displayname";
	public static final String P_GETCONTENTLANGUAGE = "getcontentlanguage";
	public static final String P_GETCONTENTLENGTH = "getcontentlength";
	public static final String P_GETCONTENTTYPE = "getcontenttype";
	public static final String P_GETETAG = "getetag";
	public static final String P_GETLASTMODIFIED = "getlastmodified";
	public static final String P_LOCKINFO = "lockinfo";
	public static final String P_LOCKDISCOVERY = "lockdiscovery";
	public static final String P_ACTIVELOCK = "activelock";
	public static final String P_LOCKSCOPE = "lockscope";
	public static final String P_EXCLUSIVE = "exclusive";
	public static final String P_SHARED = "shared";
	public static final String P_DEPTH = "depth";
	public static final String P_LOCKTYPE = "locktype";
	public static final String P_LOCKTOKEN = "locktoken";
	public static final String P_TIMEOUT = "timeout";
	public static final String P_RESOURCETYPE = "resourcetype";
	public static final String P_SOURCE = "source";
	public static final String P_SUPPORTEDLOCK = "supportedlock";
	public static final String P_COLLECTION = "collection";
	
	// response
	public static final String P_MULTISTATUS = "multistatus";
	public static final String P_RESPONSE = "response";
	public static final String P_HREF = "href";
	public static final String P_STATUS = "status";

	// propfind
	public static final String P_PROPFIND = "propfind";
	public static final String P_ALLPROP = "allprop";
	public static final String P_PROPNAME = "propname";
	public static final String P_PROP = "prop";
	public static final String P_PROPSTAT = "propstat";
	
	// rfc3744 - acl
	
	// privileges
	public static final String P_READ = "read";
	public static final String P_WRITE = "write";
	public static final String P_WRITE_PROPERTIES = "write-properties";
	public static final String P_WRITE_CONTENT = "write-content";
	public static final String P_UNLOCK = "unlock";
	public static final String P_READ_ACL = "read-acl";
	public static final String P_READ_CURRENT_USER_PRIVILEGE_SET = "read-current-user-privilege-set";
	public static final String P_WRITE_ACL = "write-acl";
	public static final String P_BIND = "bind";
	public static final String P_UNBIND = "unbind";
	public static final String P_ALL = "all";

	// principal properties
	public static final String P_PRINCIPAL = "principal";
	public static final String P_ALTERNATE_URI_SET = "alternate-URI-set";
	public static final String P_PRINCIPAL_URL = "principal-URL";
	public static final String P_GROUP_MEMBER_SET = "group-member-set";
	public static final String P_GROUP_MEMBERSHIP = "group-membership";
	
	// access control properties
	public static final String P_OWNER = "owner";
	public static final String P_GROUP = "group";
	public static final String P_SUPPORTED_PRIVILEGE_SET = "supported-privilege-set";
	public static final String P_CURRENT_USER_PRIVILEGE_SET = "current-user-privilege-set";
	public static final String P_ABSTRACT = "abstract";
	public static final String P_PRIVILEGE = "privilege";
	public static final String P_ACL = "acl";
	public static final String P_ACE = "ace";
	public static final String P_AUTHENTICATED = "authenticated";
	public static final String P_UNAUTHENTICATED = "unauthenticated";
	public static final String P_PROPERTY = "property";
	public static final String P_SELF = "self";
	public static final String P_INVERT = "invert";
	public static final String P_GRANT = "grant";
	public static final String P_DENY = "deny";
	public static final String P_PROTECTED = "protected";
	public static final String P_INHERITED = "inherited";
	public static final String P_ACL_RESTRICTIONS = "acl-restrictions";
	public static final String P_GRANT_ONLY = "grant-only";
	public static final String P_NO_INVERT = "no-invert";
	public static final String P_DENY_BEFORE_GRANT = "deny-before-grant";
	public static final String P_REQUIRED_PRINCIPAL = "required-principal";
	public static final String P_INHERITED_ACL_SET = "inherited-acl-set";
	public static final String P_PRINCIPAL_COLLECTION_SET = "principal-collection-set";

	// acl response elements
	public static final String P_ERROR = "error";
	public static final String P_NEED_PRIVILEGES = "need-privileges";
	public static final String P_RESOURCE = "resource";

	// caldav
	public static final String P_CALENDAR = "calendar";
	
	// caldav properties
	public static final String P_CALENDAR_DESCRIPTION = "calendar-description";
	public static final String P_CALENDAR_TIMEZONE = "calendar-timezone";
	public static final String P_SUPPORTED_CALENDAR_COMPONENT_SET = "supported-calendar-component-set";
	public static final String P_COMP = "comp";
	public static final String P_NAME = "name";
	public static final String P_SUPPORTED_CALENDAR_DATA = "supported-calendar-data";
	public static final String P_CALENDAR_DATA = "calendar-data";
	public static final String P_CONTENT_TYPE= "content-type";
	public static final String P_VERSION= "version";
	public static final String P_MAX_RESOURCE_SIZE = "max-resource-size";
	public static final String P_MIN_DATE_TIME = "min-date-time";
	public static final String P_MAX_DATE_TIME = "max-date-time";
	public static final String P_MAX_INSTANCES = "max-instances";
	public static final String P_MAX_ATTENDEES_PER_INSTANCE = "max-attendees-per-instance";
	
	// caldav precondition
	public static final String P_VALID_CALENDAR_DATA = "valid-calendar-data";


	// QName
	public static final QName E_CREATIONDATE = QName.get(P_CREATIONDATE, WEBDAV_NS);
	public static final QName E_DISPLAYNAME = QName.get(P_DISPLAYNAME, WEBDAV_NS);
	public static final QName E_GETCONTENTLANGUAGE = QName.get(P_GETCONTENTLANGUAGE, WEBDAV_NS);
	public static final QName E_GETCONTENTLENGTH = QName.get(P_GETCONTENTLENGTH, WEBDAV_NS);
	public static final QName E_GETCONTENTTYPE = QName.get(P_GETCONTENTTYPE, WEBDAV_NS);
	public static final QName E_GETETAG = QName.get(P_GETETAG, WEBDAV_NS);
	public static final QName E_GETLASTMODIFIED = QName.get(P_GETLASTMODIFIED, WEBDAV_NS);
	public static final QName E_LOCKDISCOVERY = QName.get(P_LOCKDISCOVERY, WEBDAV_NS);
	public static final QName E_ACTIVELOCK = QName.get(P_ACTIVELOCK, WEBDAV_NS);
	public static final QName E_LOCKSCOPE = QName.get(P_LOCKSCOPE, WEBDAV_NS);
	public static final QName E_LOCKTYPE = QName.get(P_LOCKTYPE, WEBDAV_NS);
	public static final QName E_EXCLUSIVE = QName.get(P_EXCLUSIVE, WEBDAV_NS);
	public static final QName E_SHARED = QName.get(P_SHARED, WEBDAV_NS);
	public static final QName E_DEPTH = QName.get(P_DEPTH, WEBDAV_NS);
	public static final QName E_TIMEOUT = QName.get(P_TIMEOUT, WEBDAV_NS);
	public static final QName E_RESOURCETYPE = QName.get(P_RESOURCETYPE, WEBDAV_NS);
	public static final QName E_SOURCE = QName.get(P_SOURCE, WEBDAV_NS);
	public static final QName E_SUPPORTEDLOCK = QName.get(P_SUPPORTEDLOCK, WEBDAV_NS);
	public static final QName E_COLLECTION = QName.get(P_COLLECTION, WEBDAV_NS);
	
	// response
	public static final QName E_MULTISTATUS = QName.get(P_MULTISTATUS, WEBDAV_NS);
	public static final QName E_RESPONSE = QName.get(P_RESPONSE, WEBDAV_NS);
	public static final QName E_HREF = QName.get(P_HREF, WEBDAV_NS);
	public static final QName E_STATUS = QName.get(P_STATUS, WEBDAV_NS);
	
	// propfind
	public static final QName E_PROPSTAT = QName.get(P_PROPSTAT, WEBDAV_NS);
	public static final QName E_PROP = QName.get(P_PROP, WEBDAV_NS);
	
	// acl
	public static final QName E_ERROR = QName.get(P_ERROR, WEBDAV_NS);
	public static final QName E_NEED_PRIVILEGES = QName.get(P_NEED_PRIVILEGES, WEBDAV_NS);
	public static final QName E_RESOURCE = QName.get(P_RESOURCE, WEBDAV_NS);
	public static final QName E_PRIVILEGE = QName.get(P_PRIVILEGE, WEBDAV_NS);
	public static final QName E_WRITE = QName.get(P_WRITE, WEBDAV_NS);
	public static final QName E_OWNER = QName.get(P_OWNER, WEBDAV_NS);
	public static final QName E_PRINCIPAL = QName.get(P_PRINCIPAL, WEBDAV_NS);
	
	// caldav
	public static final QName E_CALENDAR = QName.get(P_CALENDAR, CALDAV_NS);
	public static final QName E_CALENDAR_DESCRIPTION = QName.get(P_CALENDAR_DESCRIPTION, CALDAV_NS);
	public static final QName E_CALENDAR_TIMEZONE = QName.get(P_CALENDAR_TIMEZONE, CALDAV_NS);
	public static final QName E_SUPPORTED_CALENDAR_COMPONENT_SET = QName.get(P_SUPPORTED_CALENDAR_COMPONENT_SET, CALDAV_NS);
	public static final QName E_COMP = QName.get(P_COMP, CALDAV_NS);
	public static final QName E_SUPPORTED_CALENDAR_DATA = QName.get(P_SUPPORTED_CALENDAR_DATA, CALDAV_NS);
	public static final QName E_CALENDAR_DATA = QName.get(P_CALENDAR_DATA, CALDAV_NS);

}
