<!-- 
/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: ZPL 1.2
 *
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.2 ("License"); you may not use this file except in
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
 * Portions created by Zimbra are Copyright (C) 2005, 2006 Zimbra, Inc.
 * All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK *****
 */
-->
<%@ taglib prefix="c" uri="http://java.sun.com/jstl/core" %>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<HTML>
<HEAD>
<jsp:include page="./Messages.jsp"/>
<jsp:include page="./Ajax.jsp"/>

<SCRIPT language=JavaScript>
function onLoad() {
	var skin;
	if (location.search && (location.search.indexOf("skin=") != -1)) {
		var m = location.search.match(/skin=(\w+)/);
		if (m && m.length)
			skin = m[1];
	}
	document.title = ZmMsg.skinDeletedErrorTitle;
	document.body.innerHTML = AjxMessageFormat.format(ZmMsg.skinDeletedError, [skin]);
};
</SCRIPT>


<BODY ONLOAD='onLoad();'>
</BODY>

