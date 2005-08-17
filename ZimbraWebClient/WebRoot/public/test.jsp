<%@ page language="java" 
         import="java.lang.*, java.util.*" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jstl/core" %>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<html>
  <head>
    <title>Liquid Mail</title>
    <style type="text/css">
      <!--
        @import url(/liquid/js/dwt/config/style/dwt.css);
        @import url(/liquid/js/liquidMail/config/style/lm.css);
      -->
    </style>
	<script language="JavaScript">
    	DwtConfigPath = "js/dwt/config";
    </script>
    <jsp:include page="Messages.jsp"/>
    <jsp:include page="Liquid.jsp"/>
    <jsp:include page="Dwt.jsp"/>
    <jsp:include page="LiquidMail.jsp"/>
    <script language="JavaScript">   	
   		function launch() {
   			/*var x = new DwtShell();
   			// var y = new DwtControl(x);
	   			var y = new DwtTree(x);
   			for (var i = 0; i < 100; i++) {
   				var z = new DwtTreeItem(y, null, null, null, false);
   			}*/
 	    	DBG = new LsDebug(LsDebug.NONE, null, false);
 	    	LmLiquidMail.run(document.domain);
 	    }
   		function shutdown() {
   			delete DwtComposite._pendingElements;
	    }
    </script>
  </head>
  <body onload="javascript:void launch()" onunload="javascript:void shutdown()">
   </body>
</html>

