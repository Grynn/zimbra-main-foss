<%--
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
--%>
<%@ tag body-content="empty" dynamic-attributes="dynattrs" %>
<%@ attribute name="urlTarget" rtexprvalue="true" required="true" %>
<%@ attribute name="mailbox" rtexprvalue="true" required="true" type="com.zimbra.cs.taglib.bean.ZMailboxBean"%>
<%@ attribute name="context" rtexprvalue="true" required="true" type="com.zimbra.cs.taglib.tag.SearchContext" %>
<%@ attribute name="isConv" rtexprvalue="true" required="false" %>
<%@ attribute name="cid" rtexprvalue="true" required="false" %>
<%@ attribute name="isTop" rtexprvalue="true" required="false" %>
<%@ attribute name="singleMessage" rtexprvalue="true" required="false" %>
<%@ attribute name="message" rtexprvalue="true" required="false" type="com.zimbra.cs.taglib.bean.ZMessageBean" %>
<%@ attribute name="keys" rtexprvalue="true" required="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="fmt" uri="com.zimbra.i18n" %>
<%@ taglib prefix="app" uri="com.zimbra.htmlclient" %>
<%@ taglib prefix="zm" uri="com.zimbra.zm" %>
<c:if test="${isConv != null && isConv}">
    <zm:searchConv var="convSearchResult" id="${not empty param.cid ? param.cid : context.currentItem.id}" limit="100"
                   context="${context}" fetch="none" markread="false" sort="${param.css}"/>
</c:if>
<c:if test="${isTop}">
    <div class="SubToolbar table top_conv_v_subtoolbar">
        <div class="table-row">
            <div class="table-cell">
                <c:if test="${isConv!=null && isConv}">
                    <zm:currentResultUrl var="closeurl" value="${urlTarget}"
                                         index="${context.currentItemIndex}"
                                         context="${context}"/>
                </c:if>
                <zm:currentResultUrl var="closeurl" value="${urlTarget}"
                                     index="${context.currentItemIndex}"
                                     context="${context}"/>


                <a accesskey="${requestScope.navlink_accesskey}" href="${urlTarget}?st=folders"><fmt:message key="folders"/></a> &raquo; <a
                    href="${fn:escapeXml(closeurl)}${empty param.ajax ? '#conv' : '&conv'}#${cid}" class='zo_leftbutton'>
                    ${fn:escapeXml(zm:truncateFixed(context.shortBackTo,15,true))}
            </a>
                <c:if test="${isConv!=null && isConv}">
                    &raquo; <fmt:message key="backToConv"/>
                </c:if>
                <c:if test="${isConv==null || !isConv }">
                    <zm:currentResultUrl var="closeUrl" value="${urlTarget}" action='view' context="${context}"
                                         cso="${param.cso}" csi="${param.csi}" css="${param.css}"/>
                    &raquo; <a href="${fn:escapeXml(closeUrl)}" class='zo_leftbutton'> <fmt:message
                        key="backToConv"/> </a> &raquo; ${fn:escapeXml(zm:truncateFixed(message.subject,12,true))}
                </c:if>

            </div>
        </div>
    </div>
</c:if>

<div class="Toolbar table">
<div class="table-row">
<div class="table-cell">
<span class="zo_button_group">
    <c:if test="${isConv !=null && isConv}">
        <zm:computeNextPrevItem var="convCursor" searchResult="${context.searchResult}"
                                index="${context.currentItemIndex}"/>
        <c:choose>
            <c:when test="${context.hasPrevItem}">
                <zm:prevItemUrl var="prevItemUrl" value="${urlTarget}" action="view"
                                cursor="${convCursor}" context="${context}"
                                css="${param.css}"/>
                <a accesskey="${requestScope.prev_accesskey}" class='zo_button prev_button' href="${fn:escapeXml(prevItemUrl)}">
                    <fmt:message key="MO_PREV"/>
                </a>
            </c:when>
            <c:otherwise>
                <a class='zo_button_disabled prev_button'>
                    <fmt:message key="MO_PREV"/>
                </a>
            </c:otherwise>
        </c:choose>
    </c:if>
    <c:if test="${isConv == null || !isConv}">
        <zm:computeNextPrevItem var="messCursor" searchResult="${convSearchResult}"
                                index="${param.csi}"/>
        <c:choose>
            <c:when test="${messCursor.hasPrev}">
                <zm:currentResultUrl var="prevMsgUrl" value="${urlTarget}" action='view'
                                     context="${context}" mview="1"
                                     cso="${messCursor.prevOffset}"
                                     csi="${messCursor.prevIndex}" css="${param.css}"/>
                <a accesskey="${requestScope.prev_accesskey}" class='zo_button prev_button' href="${fn:escapeXml(prevMsgUrl)}">
                    <fmt:message key="MO_PREV"/>
                </a>
            </c:when>
            <c:otherwise>
                <a class='zo_button_disabled prev_button'>
                    <fmt:message key="MO_PREV"/>
                </a>
            </c:otherwise>
        </c:choose>
    </c:if>
    <c:if test="${isConv !=null && isConv}">
        <zm:computeNextPrevItem var="convCursor" searchResult="${context.searchResult}"
                                index="${context.currentItemIndex}"/>
        <c:choose>
            <c:when test="${context.hasNextItem}">
                <zm:nextItemUrl var="nextItemUrl" value="${urlTarget}" action="view"
                                cursor="${convCursor}" context="${context}"
                                css="${param.css}"/>
                <a accesskey="${requestScope.next_accesskey}" class='zo_button next_button' href="${fn:escapeXml(nextItemUrl)}">
                    <fmt:message key="MO_NEXT"/>
                </a>
            </c:when>
            <c:otherwise>
                <a class='zo_button_disabled next_button'>
                    <fmt:message key="MO_NEXT"/>
                </a>
            </c:otherwise>
        </c:choose>

    </c:if>
    <c:if test="${isConv == null || !isConv}">
        <c:choose>
            <c:when test="${messCursor.hasNext}">
                <zm:currentResultUrl var="nextMsgUrl" value="${urlTarget}" action="view"
                                     context="${context}" mview="1"
                                     cso="${messCursor.nextOffset}"
                                     csi="${messCursor.nextIndex}" css="${param.css}"/>
                <a accesskey="${requestScope.next_accesskey}" class='zo_button next_button' href="${fn:escapeXml(nextMsgUrl)}">
                    <fmt:message key="MO_NEXT"/>
                </a>
            </c:when>
            <c:otherwise>
                <a class='zo_button_disabled next_button'>
                    <fmt:message key="MO_NEXT"/>
                </a>
            </c:otherwise>
        </c:choose>
    </c:if>
</span>
<span>
<c:if test="${singleMessage}">
    <select class="zo_select_button" name="anAction" onchange="submitForm(document.getElementById('zForm'));">
        <option value="" selected="selected"><fmt:message key="moreActions"/></option>
        <c:set var="myFolder" value="${zm:getFolder(pageContext, message.folderId)}"/>
        <c:set var="inTrash" value="${myFolder.isInTrash}"/>
        <!--<optgroup label="Delete">-->
        <c:choose>
            <c:when test="${inTrash}">
                <option value="actionHardDelete"><fmt:message key="delete"/></option>
            </c:when>
            <c:otherwise>
                <option value="actionDelete"><fmt:message key="delete"/></option>
            </c:otherwise>
        </c:choose>
            <%-- </optgroup>--%>
        <optgroup label="<fmt:message key="markAs"/>">
            <c:if test="${message.isUnread}">
                <option value="actionMarkRead"><fmt:message key="MO_read"/></option>
            </c:if>
            <c:if test="${not message.isUnread}">
                <option value="actionMarkUnread"><fmt:message key="MO_unread"/></option>
            </c:if>
            <c:choose>
                <c:when test="${myFolder.isSpam}">
                    <option value="actionMarkUnspam"><fmt:message key="actionNotSpam"/></option>
                </c:when>
                <c:otherwise>
                    <option value="actionMarkSpam"><fmt:message key="actionSpam"/></option>
                </c:otherwise>
            </c:choose>
        </optgroup>
        <optgroup label="<fmt:message key="MO_flag"/>">
            <c:if test="${not message.isFlagged}">
                <option value="actionFlag"><fmt:message key="add"/></option>
            </c:if>
            <c:if test="${message.isFlagged}">
                <option value="actionUnflag"><fmt:message key="remove"/></option>
            </c:if>
        </optgroup>
        <optgroup label="<fmt:message key="moveAction"/>">
            <zm:forEachFolder var="folder">
                <c:if test="${folder.id != context.folder.id and folder.isMessageMoveTarget and !folder.isTrash and !folder.isSpam}">
                    <option value="moveTo_${folder.id}">${zm:getFolderPath(pageContext, folder.id)}</option>
                </c:if>
            </zm:forEachFolder>
        </optgroup>
        <c:if test="${mailbox.features.tagging and mailbox.hasTags}">
            <c:set var="tagsToAdd" value="${zm:getAvailableTags(pageContext,message.tagIds,true)}"/>
            <c:set var="tagsToRemove" value="${zm:getAvailableTags(pageContext,message.tagIds,false)}"/>
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
            <%--<zm:forEachFolder var="folder">
                <input type="hidden" name="folderId" value="${folder.id}"/>
            </zm:forEachFolder>--%>
    </select>
    <noscript><input id="actGo${isTop}" class="zo_button" name="moreActions" type="submit" value="<fmt:message key="actionGo"/>"/></noscript>
    <script type="text/javascript">var actGo = document.getElementById('actGo${isTop}');if(actGo){actGo.style.display='none';}</script>
</c:if>
<c:if test="${!singleMessage && convSearchResult.size gt 0}">
    <select class="zo_select_button" name="anAction" onchange="submitForm(document.getElementById('zForm'));">
        <option value="" selected="selected"><fmt:message key="moreActions"/></option>
        <optgroup label="Delete">
            <c:choose>
                <c:when test="${not context.folder.isInTrash}">
                    <option value="actionHardDelete"><fmt:message key="delete"/></option>
                </c:when>
                <c:otherwise>
                    <option value="actionDelete"><fmt:message key="delete"/></option>
                </c:otherwise>
            </c:choose>
        </optgroup>

        <optgroup label="<fmt:message key="markAs"/>">
            <option value="actionMarkRead"><fmt:message key="MO_read"/></option>
            <option value="actionMarkUnread"><fmt:message key="MO_unread"/></option>
            <c:choose>
                <c:when test="${context.folder.isSpam}">
                    <option value="actionMarkUnspam"><fmt:message key="actionNotSpam"/></option>
                </c:when>
                <c:otherwise>
                    <option value="actionMarkSpam"><fmt:message key="actionSpam"/></option>
                </c:otherwise>
            </c:choose>
        </optgroup>
        <optgroup label="<fmt:message key="MO_flag"/>">
                        <option value="actionFlag"><fmt:message key="add"/></option>
                        <option value="actionUnflag"><fmt:message key="remove"/></option>
                    </optgroup>
        
        <optgroup label="<fmt:message key="moveAction"/>">
            <zm:forEachFolder var="folder">
                <c:if test="${folder.id != context.folder.id and folder.isMessageMoveTarget and !folder.isTrash and !folder.isSpam}">
                    <option value="moveTo_${folder.id}">${fn:escapeXml(folder.rootRelativePath)}</option>
                </c:if>
            </zm:forEachFolder>
        </optgroup>
            <%--<zm:forEachFolder var="folder">
                <input type="hidden" name="folderId" value="${folder.id}"/>
            </zm:forEachFolder>--%>
        <c:if test="${mailbox.features.tagging and mailbox.hasTags}">
            <c:set var="allTags" value="${mailbox.mailbox.allTags}"/>
            <optgroup label="<fmt:message key="MO_actionAddTag"/>">
                <c:forEach var="atag" items="${allTags}">
                    <option value="addTag_${atag.id}">${fn:escapeXml(atag.name)}</option>
                </c:forEach>
            </optgroup>
            <optgroup label="<fmt:message key="MO_actionRemoveTag"/>">
                <c:forEach var="atag" items="${allTags}">
                    <option value="remTag_${atag.id}">${fn:escapeXml(atag.name)}</option>
                </c:forEach>
            </optgroup>
        </c:if>
    </select>
    <noscript><input id="actGo${isTop}" class="zo_button" name="moreActions" type="submit" value="<fmt:message key="actionGo"/>"/></noscript>
    <script type="text/javascript">var actGo = document.getElementById('actGo${isTop}');if(actGo){actGo.style.display='none';}</script>
</c:if>
</span>
<span class="">
    <c:url var="composeUrl" value="${urlTarget}?st=newmail"/>
    <a accesskey="${requestScope.mainaction_accesskey}" href="${composeUrl}" class="zo_button">
        <fmt:message key="compose"/>
    </a>
</span>
</div>
</div>
</div>
