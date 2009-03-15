<!--
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2007, 2008 Zimbra, Inc.
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
<%@ tag body-content="empty" %>
<%@ attribute name="accountindex" rtexprvalue="true" required="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="fmt" uri="com.zimbra.i18n" %>
<%@ taglib prefix="zm" uri="com.zimbra.zm" %>
<%@ taglib prefix="app" uri="com.zimbra.htmlclient" %>

<app:handleError>
</app:handleError>

<c:if test="${zm:actionSet(param, 'actionSave')}">
    <c:choose>
        <c:when test="${param.emailNotificationActive and empty param.emailNotificationAddress}">
            <app:status style="Critical"><fmt:message key="missingEmailAddress"/></app:status>
			<c:set var="emailNotificationAddress" scope="request" value=""></c:set>
            <c:set var="emailNotificationActive" scope="request" value="TRUE"></c:set>
        </c:when>
        <c:when test="${param.emailNotificationActive and not empty param.emailNotificationAddress and not zm:isValidEmailAddress(param.emailNotificationAddress)}">
            <app:status style="Critical"><fmt:message key="invalidEmailAddress"/></app:status>
			<c:set var="emailNotificationAddress" scope="request" value="${param.emailNotificationAddress}"></c:set>
            <c:set var="emailNotificationActive" scope="request" value="TRUE"></c:set>
        </c:when>
        <c:when test="${not param.emailNotificationActive and not empty param.emailNotificationAddress and not zm:isValidEmailAddress(param.emailNotificationAddress)}">
            <app:status style="Critical"><fmt:message key="invalidEmailAddress"/></app:status>
			<c:set var="emailNotificationAddress" scope="request" value="${param.emailNotificationAddress}"></c:set>
            <c:set var="emailNotificationActive" scope="request" value="FALSE"></c:set>
        </c:when>
        <c:when test="${param.callForwardingAllActive and not zm:isValidPhoneNumber(param.callForwardingAllNumber)}">
            <app:status style="Critical"><fmt:message key="invalidForwardNumber"/></app:status>
            <c:set var="emailNotificationAddress" scope="request" value="${param.emailNotificationAddress}"></c:set>
            <c:set var="badCallForwardingAll" scope="request" value="${param.callForwardingAllNumber}"></c:set>
		</c:when>
        <c:otherwise>
            <zm:modifyCallFeatures var="result" phone="${param.phone}"
                emailnotificationactive="${param.emailNotificationActive}" emailnotificationaddress="${param.emailNotificationAddress}"
                callforwardingactive="${param.callForwardingAllActive}" callforwardingforwardto="${param.callForwardingAllNumber}"
                numberPerPage="${param.numberPerPage}"
            />
            <c:choose>
                <c:when  test="${not param.emailNotificationActive and zm:isValidEmailAddress(param.emailNotificationAddress)}">
                    <app:status><fmt:message key="lostEmailNotification"/></app:status>
                </c:when>
                <c:when test="${result}">
                    <app:status><fmt:message key="optionsSaved"/></app:status>
                </c:when>

                <c:otherwise>
                    <app:status><fmt:message key="noOptionsChanged"/></app:status>
                </c:otherwise>
            </c:choose>
        </c:otherwise>
    </c:choose>
</c:if>

