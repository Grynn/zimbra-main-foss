<%--
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2011 Zimbra, Inc.
 *
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.3 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * ***** END LICENSE BLOCK *****
--%>
<%@ page pageEncoding="UTF-8" contentType="text/html; charset=UTF-8" %>
<%@ page session="false" %>
<%@ taglib prefix="zm" uri="com.zimbra.zm" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="fmt" uri="com.zimbra.i18n" %>
<%@ taglib prefix="app" uri="com.zimbra.htmlclient" %>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<fmt:setLocale value='${pageContext.request.locale}' scope='request' />
<fmt:setBundle basename="/messages/ZoMsg" scope="request"/>
<fmt:setBundle basename="/messages/ZhMsg" var="zhmsg" scope="request"/>
<fmt:setBundle basename="/messages/ZMsg" var="zmsg" scope="request"/>
<html>

<c:set var="client" value="${param.client}"/>
<c:set var="version" value="${initParam.zimbraCacheBusterVersion}"/>

<head><title><fmt:message key="externalUserRegistration"/></title>
<link  rel="stylesheet" type="text/css" href="<c:url value='/css/common,login,zhtml.css'>
    <c:param name="skin"	value="${skin}" />
    <c:param name="v"		value="${version}" />
    <c:if test="${not empty param.customerDomain}">
        <c:param name="customerDomain"	value="${param.customerDomain}" />
    </c:if>
</c:url>">
<link  rel="stylesheet" type="text/css" href="<c:url value='/css/skin.css'>
    <c:param name="skin"	value="${skin}" />
    <c:param name="v"		value="${version}" />
    <c:if test="${not empty param.customerDomain}">
        <c:param name="customerDomain"	value="${param.customerDomain}" />
    </c:if>
</c:url>">
<zm:getFavIcon request="${pageContext.request}" var="favIconUrl" />
<c:if test="${empty favIconUrl}">
    <fmt:message key="favIconUrl" var="favIconUrl"/>
</c:if>
<link rel="SHORTCUT ICON" href="<c:url value='${favIconUrl}'/>">

</head>
<body>

<div class="LoginScreen">
		<div class="center">
			<div class="ImgAltBanner"></div>
			<h1><a href="http://www.zimbra.com/" id="bannerLink" target="_new">
				<span class="ImgLoginBanner"></span>
			</a></h1>

            <form action="/service/extuserprov/" method="post">

            <c:if test="${errorCode != null}">
				    <!-- ${fn:escapeXml(error.stackStrace)} -->
				    <div id="ZLoginErrorPanel">
				        <table><tr>
				            <td><app:img id="ZLoginErrorIcon" altkey='ALT_ERROR' src="dwt/ImgCritical_32.png" /></td>
				            <td><c:out value="${errorMessage}"/></td>
				        </tr></table>
				    </div>
				</c:if>

            <table class="form">
                <c:choose>
                <c:when test="${not empty domainLoginRedirectUrl && param.sso eq 1 && empty param.ignoreLoginURL && (isAllowedUA eq true)}">
                    <tr>
                        <td colspan="2">
                            <div class="LaunchButton">
                                <input type="submit" value="<fmt:message key="launch"/>" >
                            </div>
                        </td>
                    </tr>
				</c:when>
                <c:otherwise>
                    <tr>
                        <td><label for="displayname"><fmt:message key="displayName"/>:</label></td>
                        <td><input id="displayname" class="zLoginField" name="displayname" type="text" value="${fn:escapeXml(param.displayname)}" size="40"/></td>
                    </tr>
                    <tr>
                        <td><label for="password"><fmt:message key="password"/>:</label></td>
                        <td><input id="password" class="zLoginField" name="password" type="password" value="${fn:escapeXml(param.password)}" size="40"/></td>
                    </tr>
                    <tr>
                        <td><label for="password2"><fmt:message key="confirm"/>:</label></td>
                        <td><input id="password2" class="zLoginField" name="password2" type="password" size="40"/></td>
                    </tr>
                    <tr>
                        <td>&nbsp;</td>
                        <td style="text-align:right">
                            <input type="submit" class="zLoginButton" value="<fmt:message key="register"/>" style="float:left;"/>
                    </tr>
				</c:otherwise>
				</c:choose>
			</table>

			</form>

			<div class="decor1"></div>
		</div>

		<div class="Footer">
		<div id="ZLoginNotice" class="legalNotice-small"><fmt:message key="clientLoginNotice"/></div>

        <div class="copyright">
            <c:choose>
                <c:when test="${useMobile}">
                    <fmt:message bundle="${zhmsg}" key="splashScreenCopyright"/>
                </c:when>
                <c:otherwise>
                    <fmt:message key="splashScreenCopyright"/>
                </c:otherwise>
            </c:choose>
            </div>
        </div>
	</div>

</body>
</html>