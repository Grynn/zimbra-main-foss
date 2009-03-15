<!--
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2009 Zimbra, Inc.
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
<%@ attribute name="context" rtexprvalue="true" required="true" type="com.zimbra.cs.taglib.tag.SearchContext" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="fmt" uri="com.zimbra.i18n" %>
<%@ taglib prefix="mo" uri="com.zimbra.mobileclient" %>
<%@ taglib prefix="zm" uri="com.zimbra.zm" %>
<%@ taglib prefix="app" uri="com.zimbra.htmlclient" %>
<mo:handleError>
    <zm:getMailbox var="mailbox"/>
    <mo:searchTitle var="title" context="${context}"/>
</mo:handleError>
<c:set var="context_url" value="${requestScope.baseURL!=null?requestScope.baseURL:'zmain'}"/>
<zm:currentResultUrl var="actionUrl" value="${context_url}" context="${context}" refresh="${true}"/>
<c:set var="title" value="${zm:truncate(context.shortBackTo,20,true)}" scope="request"/>
<form id="zForm" action="${fn:escapeXml(actionUrl)}" method="post">
    <input type="hidden" name="crumb" value="${fn:escapeXml(mailbox.accountInfo.crumb)}"/>
    <input type="hidden" name="doTaskAction" value="1"/>
    <input name="moreActions" type="hidden" value="<fmt:message key="actionGo"/>"/>
   <mo:taskToolbar context="${context}" urlTarget="${context_url}" isTop="true" mailbox="${mailbox}"/>
   <c:forEach items="${context.searchResult.hits}" var="hit" varStatus="status">
        <c:set var="taskHit" value="${hit.taskHit}"/>
        <div class="list-row row" id="cn${taskHit.id}">
            <c:set value=",${hit.id}," var="stringToCheck"/>
            <span class="cell f">
                    <input class="chk" type="checkbox" ${requestScope.select ne 'none' && (fn:contains(requestScope._selectedIds,stringToCheck) || requestScope.select eq 'all') ? 'checked="checked"' : ''}
                           name="id" value="${taskHit.id}"/>
            <span class="SmlIcnHldr Task">&nbsp;</span>
            </span>
            <span class="cell m" onclick='return zClickLink("a${taskHit.id}")'>
                <a id="a${taskHit.id}" href="${briefUrl}">
                <div>
                    <strong><c:out escapeXml="true" value="${zm:truncate(taskHit.subject,100,true)}"/></strong>
                </div>
                </a>
               <div class="Email from-span">
                    <a href="${briefUrl}">
                    <fmt:message key="TASK_${taskHit.status}"/> (${taskHit.percentComplete} %) 
                    </a>
                </div>
                <a href="${briefUrl}">
                <div class="frag-span small-gray-text">
                    <fmt:message key="taskDueDate"/>: ${fn:escapeXml(zm:displayDate(pageContext, taskHit.dueDate))}&nbsp;
                </div>
                </a>
            </span>
            <span class="cell l" onclick='return zClickLink("a${taskHit.id}")'>
                <fmt:formatDate timeZone="${mailbox.prefs.timeZone}" var="on_dt" pattern="yyyyMMdd" value="${taskHit.dueDate}"/>
                <a <c:if test="${mailbox.features.calendar}">href='${context_url}?st=cal&amp;view=month&amp;date=${on_dt}'</c:if>>
                    <fmt:parseDate var="mdate" value="${on_dt}" pattern="yyyyMMdd" timeZone="${mailbox.prefs.timeZone}"/>
                    ${fn:escapeXml(zm:displayMsgDate(pageContext, taskHit.dueDate))}
                </a>
                <br/>
                <c:if test="${!empty taskHit.tagIds}">
                <div>
                <mo:miniTagImage
                                ids="${taskHit.tagIds}"/>
                </div>
                </c:if>
            </span>
        </div>
    </c:forEach>
   <c:if test="${empty context || empty context.searchResult or context.searchResult.size eq 0}">
        <div class='table'>
                <div class="table-row">
                    <div class="table-cell zo_noresults">
                        <fmt:message key="noResultsFound"/>
                     </div>
                </div>
            </div>
    </c:if>
    <mo:taskToolbar context="${context}" urlTarget="${context_url}" isTop="false" mailbox="${mailbox}"/>
</form>
