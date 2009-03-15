<!--
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2008, 2009 Zimbra, Inc.
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
-->
<%@ page pageEncoding="UTF-8" contentType="text/html; charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="zm" uri="com.zimbra.zm" %>
<%@ taglib prefix="zd" tagdir="/WEB-INF/tags/desktop" %>
<%@ taglib prefix="zdf" uri="com.zimbra.cs.offline.jsp" %>

<jsp:useBean id="bean" class="com.zimbra.cs.offline.jsp.PageBean"/>
<jsp:setProperty name="bean" property="locale" value="${pageContext.request.locale}"/>
<jsp:useBean id="eventBean" class="com.zimbra.cs.offline.jsp.ClientEventBean"/>

${zdf:onLogin(eventBean)}

<zd:auth/>

<c:if test="${empty bean.loginUsername}">
    <c:redirect url="${zdf:addAuthToken('/desktop/console.jsp')}"/>
</c:if>

<c:set var="attrsToFetch" value="zimbraFeatureMailEnabled,zimbraFeatureCalendarEnabled,zimbraFeatureContactsEnabled,zimbraFeatureIMEnabled,zimbraFeatureNotebookEnabled,zimbraFeatureOptionsEnabled,zimbraFeaturePortalEnabled,zimbraFeatureTasksEnabled,zimbraFeatureVoiceEnabled,zimbraFeatureBriefcasesEnabled,zimbraFeatureMailUpsellEnabled,zimbraFeatureContactsUpsellEnabled,zimbraFeatureCalendarUpsellEnabled,zimbraFeatureVoiceUpsellEnabled"/>
<c:set var="prefsToFetch" value="zimbraPrefSkin,zimbraPrefClientType,zimbraPrefLocale"/>

<c:catch var="loginException">
    <zm:login username="${empty param.username ? bean.loginUsername : param.username}" password="${zdf:getLocalConfig('zdesktop_installation_key')}"
        varRedirectUrl="postLoginUrl" varAuthResult="authResult" rememberme="true"
        prefs="${prefsToFetch}" attrs="${attrsToFetch}" requestedSkin="${param.skin}"/>
</c:catch>

<c:if test="${not empty loginException}">
    <%-- try and use existing cookie if possible --%>
    <c:set var="authtoken" value="${not empty param.zauthtoken ? param.zauthtoken : cookie.ZM_AUTH_TOKEN.value}"/>
    <c:if test="${not empty authtoken}">
        <zm:login authtoken="${authtoken}" authtokenInUrl="${not empty param.zauthtoken}"
            varRedirectUrl="postLoginUrl" varAuthResult="authResult"
            rememberme="true"
            prefs="${prefsToFetch}" attrs="${attrsToFetch}"
            requestedSkin="${param.skin}"/>
        <%-- continue on at not empty authResult test --%>
    </c:if>
</c:if>

<c:choose>
<c:when test="${not empty authResult}">
    <jsp:forward page="/public/login.jsp"/>
</c:when>
<c:otherwise>
    <c:redirect url="${zdf:addAuthToken('/desktop/console.jsp')}"/>
</c:otherwise>
</c:choose>