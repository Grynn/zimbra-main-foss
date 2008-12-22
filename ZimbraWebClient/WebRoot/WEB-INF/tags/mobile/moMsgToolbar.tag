<%@ tag body-content="empty" dynamic-attributes="dynattrs" %>
<%@ attribute name="mailbox" rtexprvalue="true" required="true" type="com.zimbra.cs.taglib.bean.ZMailboxBean"%>
<%@ attribute name="urlTarget" rtexprvalue="true" required="true" %>
<%@ attribute name="context" rtexprvalue="true" required="true" type="com.zimbra.cs.taglib.tag.SearchContext" %>
<%@ attribute name="mid" rtexprvalue="true" required="true" %>
<%@ attribute name="isTop" rtexprvalue="true" required="false" %>
<%@ attribute name="msg" rtexprvalue="true" required="true" type="com.zimbra.cs.taglib.bean.ZMessageBean" %>
<%@ attribute name="keys" rtexprvalue="true" required="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="fmt" uri="com.zimbra.i18n" %>
<%@ taglib prefix="app" uri="com.zimbra.htmlclient" %>
<%@ taglib prefix="zm" uri="com.zimbra.zm" %>
<zm:currentResultUrl var="closeUrl" value="${urlTarget}" context="${context}"/>
<zm:computeNextPrevItem var="cursor" searchResult="${context.searchResult}" index="${context.currentItemIndex}"/>
<c:if test="${isTop}">
    <div class="SubToolbar table">
        <div class="table-row">
            <div class="table-cell">
                <a accesskey="${requestScope.navlink_accesskey}" href="${urlTarget}?st=folders"><fmt:message key="folders"/></a> &#171; <a
                    href="${fn:escapeXml(closeUrl)}#msg${mid}" class='zo_leftbutton'>
                    ${fn:escapeXml(zm:truncate(context.shortBackTo,15,true))}
            </a>
                &#171; ${fn:escapeXml(fn:substring(msg.subject,0,8))}...
            </div>
        </div>
    </div>
</c:if>
<div class="Toolbar table">
<div class="table-row">
<div class="table-cell">

<span class="zo_button_group">
<c:choose>
        <c:when test="${cursor.hasPrev}">
            <zm:prevItemUrl var="prevMsgUrl" value="${urlTarget}" action='view'
                            cursor="${cursor}" context="${context}"/>
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
<c:choose>
    <c:when test="${cursor.hasNext}">
        <zm:nextItemUrl var="nextMsgUrl" value="${urlTarget}" action='view'
                        cursor="${cursor}" context="${context}"/>
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
</span>

<span>
    <c:set var="myFolder" value="${zm:getFolder(pageContext, msg.folderId)}"/>
    <c:set var="inTrash" value="${myFolder.isInTrash}"/>
    <select class="zo_select_button" name="anAction" onchange="submitForm(document.getElementById('actions'));">
        <option value="" selected="selected"><fmt:message key="moreActions"/></option>
        <c:choose>
            <c:when test="${inTrash}">
                <option value="actionHardDelete"><fmt:message key="delete"/></option>
            </c:when>
            <c:otherwise>
                <option value="actionDelete"><fmt:message key="delete"/></option>
            </c:otherwise>
        </c:choose>
        <optgroup label="<fmt:message key="markAs"/>">
            <c:if test="${msg.isUnread}">
                <option value="actionMarkRead"><fmt:message key="MO_read"/></option>
            </c:if>
            <c:if test="${not msg.isUnread}">
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
            <c:if test="${not msg.isFlagged}">
                <option value="actionFlag"><fmt:message key="add"/></option>
            </c:if>
            <c:if test="${msg.isFlagged}">
                <option value="actionUnflag"><fmt:message key="remove"/></option>
            </c:if>
        </optgroup>
        <optgroup label="<fmt:message key="moveAction"/>">
            <zm:forEachFolder var="folder">
                <c:if test="${folder.id != context.folder.id and folder.isMessageMoveTarget and !folder.isTrash and !folder.isSpam}">
                    <option value="moveTo_${folder.id}">${fn:escapeXml(folder.rootRelativePath)}</option>
                </c:if>
            </zm:forEachFolder>
        </optgroup>
        <c:if test="${mailbox.features.tagging and mailbox.hasTags}">
            <c:set var="tagsToAdd" value="${zm:getAvailableTags(pageContext,msg.tagIds,true)}"/>
            <c:set var="tagsToRemove" value="${zm:getAvailableTags(pageContext,msg.tagIds,false)}"/>
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
    <noscript><input class="zo_button" name="moreActions" type="submit" value="<fmt:message key="actionGo"/>"/></noscript>
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
