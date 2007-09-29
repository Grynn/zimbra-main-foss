<!--
***** BEGIN LICENSE BLOCK *****
Zimbra Collaboration Suite Web Client
Copyright (C) 2006, 2007 Zimbra, Inc.

The contents of this file are subject to the Yahoo! Public License
Version 1.0 ("License"); you may not use this file except in
compliance with the License.  You may obtain a copy of the License at
http://www.zimbra.com/license.

Software distributed under the License is distributed on an "AS IS"
basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
***** END LICENSE BLOCK *****
-->
<%
	String contextPath = request.getContextPath();
	if(contextPath.equals("/")) {
		contextPath = "";
	}


    final String SKIN_COOKIE_NAME = "ZM_SKIN";
    String skin = "sand";
    Cookie[] cookies = request.getCookies();
    String requestSkin = request.getParameter("skin");
    if (requestSkin != null) {
        skin = requestSkin;
    } else if (cookies != null) {
        for (Cookie cookie : cookies) {
            if (cookie.getName().equals(SKIN_COOKIE_NAME)) {
                skin = cookie.getValue();
            }
        }
    }
    String vers = (String)request.getAttribute("version");
    String ext = (String)request.getAttribute("fileExtension");
    String mode = (String) request.getAttribute("mode");
    if (vers == null){
       vers = "";
    }
    if (ext == null){
       ext = "";
    }
    Boolean inDevMode = (mode != null) && (mode.equalsIgnoreCase("mjsf"));
    Boolean inSkinDebugMode = (mode != null) && (mode.equalsIgnoreCase("skindebug"));
%>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<html>
  <head>
    <title>Zimbra Spreadsheet Prototype</title>
	<style type="text/css">
	<!--
    @import url(<%= contextPath %>/css/common,dwt,msgview,login,zm,spellcheck,wiki,spreadsheet,images,skin.css?v=<%= vers %><%= inSkinDebugMode || inDevMode ? "&debug=1" : "" %>&skin=<%= skin %>);
	-->
	</style>
	<% request.setAttribute("res", "I18nMsg,AjxMsg,ZMsg,ZmMsg,AjxKeys"); %>
	<jsp:include page="Resources.jsp"/>
    <jsp:include page="Boot.jsp"/>
    <%
      String packages = "Ajax,Spreadsheet";

      String extraPackages = request.getParameter("packages");
      if (extraPackages != null) packages += ","+extraPackages;

      String pprefix = inDevMode ? "public/jsp" : "js";
      String psuffix = inDevMode ? ".jsp" : "_all.js";

      String[] pnames = packages.split(",");
      for (String pname : pnames) {
          String pageurl = "/"+pprefix+"/"+pname+psuffix;
          if (inDevMode) { %>
              <jsp:include>
                  <jsp:attribute name='page'><%=pageurl%></jsp:attribute>
              </jsp:include>
          <% } else { %>
              <script type="text/javascript" src="<%=contextPath%><%=pageurl%><%=ext%>?v=<%=vers%>"></script>
          <% } %>
      <% }
    %>
  </head>
    <body>
    <noscript><p><b>Javascript must be enabled to use this.</b></p></noscript>
    <script type="text/javascript" language="JavaScript">
        function launch() {
//   	        create();
        }
        AjxCore.addOnloadListener(launch);
    </script>
    </body>
</html>

