<%--
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2007, 2008, 2009 Zimbra, Inc.
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
--%>
<%@ tag body-content="empty" %>
<%@ attribute name="context" rtexprvalue="true" required="true" type="com.zimbra.cs.taglib.tag.SearchContext" %>
<%@ attribute name="email" rtexprvalue="true" required="false" %>
<%@ attribute name="id" rtexprvalue="true" required="false" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="fmt" uri="com.zimbra.i18n" %>
<%@ taglib prefix="mo" uri="com.zimbra.mobileclient" %>
<%@ taglib prefix="zm" uri="com.zimbra.zm" %>
<%@ taglib prefix="app" uri="com.zimbra.htmlclient" %>

<zm:searchGal var="result" query="${context.currentItem.contactHit.email}"/>      <%--!TODO optiomizartion needed--%>
<c:forEach items="${result.contacts}" var="acontact">
    <c:if test="${acontact.id eq context.currentItem.id}">
        <c:set var="contact" value="${acontact}"/>
    </c:if>
</c:forEach>

<mo:handleError>
    <zm:getMailbox var="mailbox"/>
    <c:set var="context_url" value="${requestScope.baseURL!=null?requestScope.baseURL:'zmain'}"/>
</mo:handleError>
<zm:currentResultUrl var="closeUrl" value="${context_url}" context="${context}"/>
<div class="SubToolbar table">
    <div class="table-row">
        <div class="table-cell">
            <a accesskey="${requestScope.navlink_accesskey}" href="${context_url}?st=ab"><fmt:message
                    key="addressBooks"/></a> &laquo;
            <a href="${fn:escapeXml(closeUrl)}<c:if test="${empty context.sfi}">&sfi=${contact.folderId}</c:if>${empty param.ajax ? '#cn' : '&cn'}#${contact.id}"
               class='zo_leftbutton'>
                ${fn:escapeXml(zm:truncate(context.shortBackTo,15,true))}
            </a> &laquo; ${fn:escapeXml(fn:substring(contact.fullName,0,8))}...
        </div>
    </div>
</div>
<zm:computeNextPrevItem var="cursor" searchResult="${context.searchResult}"
                        index="${context.currentItemIndex}"/>
<div class="Toolbar table">
    <div class="table-row">
        <div class="table-cell">

            <span class="zo_button_group">
                <c:choose>
                    <c:when test="${cursor.hasPrev}">
                        <zm:prevItemUrl var="prevMsgUrl" value="${context_url}" action='view'
                                        cursor="${cursor}" context="${context}"/>
                        <a accesskey="${requestScope.prev_accesskey}" href="${fn:escapeXml(prevMsgUrl)}" class='zo_button prev_button'>
                            <fmt:message key="MO_PREV"/>
                        </a>
                    </c:when>
                    <c:otherwise>
                        <a class='zo_button_disabled prev_button'>
                            <fmt:message key="MO_PREV"/>
                        </a>
                    </c:otherwise>
                </c:choose>
                <c:choose>
                    <c:when test="${cursor.hasNext}">
                        <zm:nextItemUrl var="nextMsgUrl" value="${context_url}" action='view'
                                        cursor="${cursor}" context="${context}"/>
                        <a accesskey="${requestScope.next_accesskey}" href="${fn:escapeXml(nextMsgUrl)}" class='zo_button next_button'>
                            <fmt:message key="MO_NEXT"/>
                        </a>
                    </c:when>
                    <c:otherwise>
                        <a class='zo_button_disabled next_button'>
                            <fmt:message key="MO_NEXT"/>
                        </a>
                    </c:otherwise>
                </c:choose>
            </span>
           
        </div>
    </div>
</div>
<c:set var="title" value="${zm:truncate(contact.fullName,20,true)}" scope="request"/>
<div class="Stripes cont_view">
    <div class="View">
        <div class="table cont_sum_table">
            <div class="table-row">
                <span class="table-cell Person48">&nbsp;
                     <%--<img id="cont-img" src="<app:imgurl value='large/ImgPerson_48.gif' />" border="0"
                                       class=""/>--%>
                 </span>
                <span class="table-cell">
                   <div>
                       <strong>${fn:escapeXml(contact.fullName)}</strong>
                   </div>
                   <c:if test="${not empty contact.jobTitle}">
                       <div>${fn:escapeXml(contact.jobTitle)}</div>
                   </c:if>
                   <c:if test="${not empty contact.company}">
                       <div>${fn:escapeXml(contact.company)}</div>
                   </c:if>
             </span>
            </div>
        </div>
        <c:if test="${contact.isFlagged || (contact.hasTags && mailbox.features.tagging)}">
            <div class="table">
                <div class="table-row">
                <span class="table-cell">
                <c:if test="${contact.isFlagged}">
                    <span class="SmlIcnHldr Flag">&nbsp;</span></c:if>
                <c:if test="${contact.hasTags and mailbox.features.tagging}">
                    <c:set var="tags" value="${zm:getTags(pageContext, contact.tagIds)}"/>
                    <c:forEach items="${tags}" var="tag">
                        <span class="SmlIcnHldr Tag${tag.color}">&nbsp;</span><span>${fn:escapeXml(tag.name)}</span>
                    </c:forEach>
                </c:if>
                </span>
                </div>
            </div>
        </c:if>
    </div>

    <div class="table">
        <div class="table-row">
            <div class="table-cell">
                <mo:displayContact contact="${contact}"/>
            </div>
        </div>
    </div>
</div>
<div class="Toolbar table">
    <div class="table-row">
        <div class="table-cell">

            <span class="zo_button_group">
                <c:choose>
                    <c:when test="${cursor.hasPrev}">
                        <zm:prevItemUrl var="prevMsgUrl" value="${context_url}" action='view'
                                        cursor="${cursor}" context="${context}"/>
                        <a accesskey="${requestScope.prev_accesskey}" href="${fn:escapeXml(prevMsgUrl)}" class='zo_button prev_button'>
                            <fmt:message key="MO_PREV"/>
                        </a>
                    </c:when>
                    <c:otherwise>
                        <a class='zo_button_disabled prev_button'>
                            <fmt:message key="MO_PREV"/>
                        </a>
                    </c:otherwise>
                </c:choose>
                <c:choose>
                    <c:when test="${cursor.hasNext}">
                        <zm:nextItemUrl var="nextMsgUrl" value="${context_url}" action='view'
                                        cursor="${cursor}" context="${context}"/>
                        <a accesskey="${requestScope.next_accesskey}" href="${fn:escapeXml(nextMsgUrl)}" class='zo_button next_button'>
                            <fmt:message key="MO_NEXT"/>
                        </a>
                    </c:when>
                    <c:otherwise>
                        <a class='zo_button_disabled next_button'>
                            <fmt:message key="MO_NEXT"/>
                        </a>
                    </c:otherwise>
                </c:choose>
            </span>

        </div>
    </div>
</div>
<div class="SubToolbar table">
    <div class="table-row">
        <div class="table-cell">
            <a accesskey="${requestScope.navlink_accesskey}" href="${context_url}?st=ab"><fmt:message
                    key="addressBooks"/></a> &laquo;
            <a href="${fn:escapeXml(closeUrl)}<c:if test="${empty context.sfi}">&sfi=${contact.folderId}</c:if>${empty param.ajax ? '#cn' : '&cn'}#${contact.id}"
               class='zo_leftbutton'>
                ${fn:escapeXml(zm:truncate(context.shortBackTo,15,true))}
            </a> &laquo; ${fn:escapeXml(fn:substring(contact.fullName,0,8))}...
        </div>
    </div>
</div>
     