<!--
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Web Client
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
<%@ tag body-content="empty" dynamic-attributes="dynattrs" %>
<%@ attribute name="urlTarget" rtexprvalue="true" required="true" %>
<%@ attribute name="mailbox" rtexprvalue="true" required="true" type="com.zimbra.cs.taglib.bean.ZMailboxBean"%>
<%@ attribute name="context" rtexprvalue="true" required="true" type="com.zimbra.cs.taglib.tag.SearchContext" %>
<%@ attribute name="contact" rtexprvalue="true" required="true" type="com.zimbra.cs.taglib.bean.ZContactBean" %>
<%@ attribute name="isTop" rtexprvalue="true" required="false" %>
<%@ attribute name="keys" rtexprvalue="true" required="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="fmt" uri="com.zimbra.i18n" %>
<%@ taglib prefix="app" uri="com.zimbra.htmlclient" %>
<%@ taglib prefix="zm" uri="com.zimbra.zm" %>
<zm:currentResultUrl var="closeUrl" value="${urlTarget}" context="${context}"/>
<c:if test="${isTop}">
    <div class="SubToolbar table">
        <div class="table-row">
            <div class="table-cell">
                <a accesskey="${requestScope.navlink_accesskey}" href="${urlTarget}?st=ab"><fmt:message key="addressBooks"/></a> &laquo;
                <a href="${fn:escapeXml(closeUrl)}<c:if test="${empty context.sfi}">&sfi=${contact.folderId}</c:if>#cn${contact.id}" class='zo_leftbutton'>
                        ${fn:escapeXml(zm:truncate(context.shortBackTo,15,true))}
                </a> &laquo; ${fn:escapeXml(fn:substring(contact.firstName,0,8))}...
            </div>
        </div>
    </div>
</c:if>
<div class="Toolbar table">
<div class="table-row">
<div class="table-cell">
<c:url var="editUrl" value="${closeUrl}">
    <c:param name="action" value="edit"/>
    <c:param name="id" value="${contact.id}"/>
    <c:param name="pid" value="${contact.id}"/>
</c:url>
<zm:computeNextPrevItem var="cursor" searchResult="${context.searchResult}"
                        index="${context.currentItemIndex}"/>
            <span class="zo_button_group">
                <c:choose>
                    <c:when test="${cursor.hasPrev}">
                        <zm:prevItemUrl var="prevMsgUrl" value="${urlTarget}" action='view'
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
                        <zm:nextItemUrl var="nextMsgUrl" value="${urlTarget}" action='view'
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
    <span>
    <select class="zo_select_button" name="anAction" onchange="submitForm(document.getElementById('zForm'));">
        <option value="" selected="selected"><fmt:message key="moreActions"/></option>
        <c:choose>
            <c:when test="${not context.folder.isInTrash}">
                <option value="actionDelete"><fmt:message key="delete"/></option>
            </c:when>
            <c:otherwise>
                <option value="actionHardDelete"><fmt:message key="delete"/></option>
            </c:otherwise>
        </c:choose>
        <optgroup label="<fmt:message key="MO_flag"/>">
            <c:if test="${not contact.isFlagged}">
                <option value="actionFlag"><fmt:message key="add"/></option>
            </c:if>
            <c:if test="${contact.isFlagged}">
                <option value="actionUnflag"><fmt:message key="remove"/></option>
            </c:if>
        </optgroup>
        <optgroup label="<fmt:message key="moveAction"/>">
            <zm:forEachFolder var="folder">
                <c:if test="${folder.id != context.folder.id and folder.isContactMoveTarget and !folder.isTrash and !folder.isSpam}">
                    <option value="moveTo_${folder.id}">${fn:escapeXml(folder.rootRelativePath)}</option>
                </c:if>
            </zm:forEachFolder>
        </optgroup>
        <%-- <zm:forEachFolder var="folder">
            <input type="hidden" name="folderId" value="${folder.id}"/>
        </zm:forEachFolder>--%>
        <c:if test="${mailbox.features.tagging and mailbox.hasTags}">
            <c:set var="tagsToAdd"
                   value="${zm:getAvailableTags(pageContext,contact.tagIds,true)}"/>
            <c:set var="tagsToRemove"
                   value="${zm:getAvailableTags(pageContext,contact.tagIds,false)}"/>

            <optgroup label="<fmt:message key="MO_actionAddTag"/>">
                <c:forEach var="atag" items="${tagsToAdd}">
                    <option value="addTag_${atag.id}">${fn:escapeXml(atag.name)}</option>
                </c:forEach>
            </optgroup>
            <optgroup label="<fmt:message key="MO_actionRemoveTag"/>">
                <c:forEach var="atag" items="${tagsToRemove}">
                    <option value="remTag_${atag.id}">${fn:escapeXml(atag.name)}</option>
                </c:forEach>
            </optgroup>
        </c:if>
    </select>
    <noscript><input id="actGo${isTop}" class="zo_button" name="moreActions" type="submit" value="<fmt:message key="actionGo"/>"/></noscript>
    <script type="text/javascript">var actGo = document.getElementById('actGo${isTop}');if(actGo){actGo.style.display='none';}</script>    
</span>
<span>
       <c:url var="addUrl" value="${closeUrl}">
           <c:param name="action" value="edit"/>
           <c:param name="pid" value="${contact.id}"/>
           <c:param name="folderid" value="${context.folder.id}"/>
       </c:url>
      <c:if test="${contact != null}">
          <a accesskey="${requestScope.mainaction_accesskey}" class="zo_button" href="${editUrl}"><fmt:message key="edit"/></a>
      </c:if>
      <c:if test="${contact == null}">
        <a accesskey="${requestScope.mainaction_accesskey}" href="${addUrl}" class='zo_button'>
            <fmt:message key="add"/>
        </a>
      </c:if>    
</span>
</div>
</div>
</div>
