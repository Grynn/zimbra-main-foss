<%@ tag body-content="empty" %>
<%@ attribute name="message" rtexprvalue="true" required="true" type="com.zimbra.cs.taglib.bean.ZMessageBean" %>
<%@ attribute name="mailbox" rtexprvalue="true" required="true" type="com.zimbra.cs.taglib.bean.ZMailboxBean" %>
<%@ attribute name="showconvlink" rtexprvalue="true" required="false" %>
<%@ attribute name="hideops" rtexprvalue="true" required="false" %>
<%@ attribute name="externalImageUrl" rtexprvalue="true" required="false" type="java.lang.String" %>
<%@ attribute name="composeUrl" rtexprvalue="true" required="true" type="java.lang.String" %>
<%@ attribute name="newWindowUrl" rtexprvalue="true" required="false" type="java.lang.String" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="zm" uri="com.zimbra.zm" %>
<%@ taglib prefix="mo" uri="com.zimbra.mobileclient" %>

<%--compute body up front, so attachments refereneced in multipart/related don't show up --%>
<c:set var="body" value="${message.body}"/>

<c:set var="theBody">
    <c:if test="${body.isTextHtml or body.isTextPlain}">
        <c:catch>
          ${zm:getPartHtmlContent(body, message)}
        </c:catch>
    </c:if>
</c:set>

<c:if test="${not empty message.invite and mailbox.features.calendar}">
    <c:set var="appt" value="${message.invite.component}"/>
    <c:set var="showInviteReply" value="${not zm:getFolder(pageContext, message.folderId).isInTrash and not empty message.invite.component}"/>
</c:if>
<c:set var="shareAccepted" value="${not empty message.share and zm:hasShareMountPoint(mailbox, message)}"/>
<c:set var="showShareInfo" value="${not empty message.share and not shareAccepted}"/>
<c:set var="needExtraCol" value="${showInviteReply or showShareInfo}"/>

<fmt:message var="unknownSender" key="unknownSender"/>
<c:set var="isPart" value="${!empty message.partName}"/>

<c:set var="from" value="${message.displayFrom}"/>
<c:set var="to" value="${message.displayTo}"/>
<c:set var="cc" value="${message.displayCc}"/>
<c:set var="sender" value="${message.displaySender}"/>

<table width=100% cellpadding="0" cellspacing="0">
    <c:if test="${not empty from}">
    <tr>
        <td valign='top' class='zo_mv_fname'><fmt:message key="from"/>:</td>
        <td class='zo_mv_fvalue'>${fn:escapeXml(from)}</td>
    </tr>
    </c:if>
    <c:if test="${not empty sender}">
        <tr>
            <td valign='top' class='zo_mv_fname'><fmt:message key="sender"/>:</td>
            <td class='zo_mv_fvalue'>${fn:escapeXml(sender)}</td>
        </tr>
    </c:if>
    <c:if test="${not empty to}">
        <tr><td colspan=2><hr></td></tr>
        <tr>
            <td valign='top' class='zo_mv_fname'><fmt:message key="to"/>:</td>
            <td class='zo_mv_fvalue'>${fn:escapeXml(to)}</td>
        </tr>
    </c:if>
    <c:if test="${not empty cc}">
        <tr><td colspan=2><hr></td></tr>
        <tr>
            <td valign='top' class='zo_mv_fname'><fmt:message key="cc"/>:</td>
            <td class='zo_mv_fvalue'>${fn:escapeXml(cc)}</td>
        </tr>
    </c:if>
    <tr><td colspan=2><hr></td></tr>
    <fmt:message var="noSubject" key="noSubject"/>
    <tr><td class='zo_mv_subject' colspan=2>${fn:escapeXml(empty message.subject ? noSubject : message.subject)}
                        <c:if test="${message.isFlagged}">&nbsp;<mo:img src="tag/FlagRed.gif"/></c:if>
    </td></tr>
    <tr>
        <td colspan=2 class='zo_mv_date'>
            <fmt:message var="dateFmt" key="formatDateSent"/>
            <fmt:formatDate timeZone="${mailbox.prefs.timeZone}" pattern="${dateFmt}" value="${message.sentDate}"/>
        </td>
    </tr>
    <c:if test="${message.hasTags and mailbox.features.tagging}">
        <tr>
            <td valign="middle" class="mo_taglist" colspan=2>
                <c:set var="tags" value="${zm:getTags(pageContext, message.tagIds)}"/>
                <c:forEach items="${tags}" var="tag">
                    <mo:img src="${tag.miniImage}" alt='${fn:escapeXml(tag.name)}'/>
                    <span>${fn:escapeXml(tag.name)}</span>
                </c:forEach>
            </td>
        </tr>
    </c:if>
    <c:if test="${not hideops}">
        <c:if test="${showInviteReply}">
            <tr><td colspan=2><hr/></td></tr>
            <tr>
                <td colspan=2>
                    <table cellspacing=0 cellpadding=0 class='zo_msgops'>
                        <tr>
                            <td style='padding: 0 2px 0 2px'>
                                <a <c:if test="${not isPart}">id="OPACCEPT"</c:if> href="${composeUrl}&op=accept">
                                    <mo:img src="common/Check.gif" alt=""/>
                                    &nbsp;
                                    <span><fmt:message key="replyAccept"/></span>
                                </a>
                            </td>
                            <td><div class='zo_vertsep'></div></td>
                            <td style='padding: 0 2px 0 2px'>
                                <a <c:if test="${not isPart}">id="OPTENT"</c:if> href="${composeUrl}&op=tentative">
                                    <mo:img src="common/QuestionMark.gif" alt=""/>
                                    &nbsp;
                                    <span><fmt:message key="replyTentative"/></span>
                                </a>
                            </td>
                            <td><div class='zo_vertsep'></div></td>
                            <td style='padding: 0 2px 0 2px'>
                                <a <c:if test="${not isPart}">id="OPDECLINE"</c:if> href="${composeUrl}&op=decline">
                                    <mo:img src="common/Cancel.gif" alt=""/>
                                    &nbsp;
                                    <span><fmt:message key="replyDecline"/></span>
                                </a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </c:if>
        <tr><td colspan=2><hr/></td></tr>
        <tr>
            <td colspan=2>
                <table cellspacing=0 cellpadding=0 class='zo_msgops'>
                    <tr>
                        <td style='padding: 0 2px 0 2px'>
                            <a <c:if test="${not isPart}">id="OPREPLY"</c:if> href="${composeUrl}&op=reply">
                                <mo:img src="mail/Reply.gif" alt=""/>
                                &nbsp;
                                <span><fmt:message key="reply"/></span>
                            </a>
                        </td>
                        <td><div class='zo_vertsep'></div></td>
                        <td style='padding: 0 2px 0 2px'>
                            <a <c:if test="${not isPart}">id="OPREPLYALL"</c:if> href="${composeUrl}&op=replyAll">
                                <mo:img src="mail/ReplyAll.gif" alt=""/>
                                &nbsp;
                                <span><fmt:message key="replyAll"/></span>
                            </a>
                        </td>
                        <td><div class='zo_vertsep'></div></td>
                        <td style='padding: 0 2px 0 2px'>
                            <a <c:if test="${not isPart}">id="OPFORW"</c:if> href="${composeUrl}&op=forward">
                                <mo:img src="mail/Forward.gif" alt=""/>
                                &nbsp;
                                <span><fmt:message key="forward"/></span>
                            </a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </c:if>
    <tr><td colspan=2><hr></td></tr>
    <c:if test="${not empty externalImageUrl and (message.externalImageCount gt 0)}">
        <tr>
            <td colspan=2>
                <div class='zo_dispimages'>
                    <fmt:message key="externalImages"/>
                    &nbsp;<a id="DISPEXTIMG" href="${externalImageUrl}"><fmt:message key="displayExternalImages"/></a>
                </div>
            </td>
        </tr>
    </c:if>
    <tr>
        <td width=100% id="iframeBody" class="zo_mv_body" valign='top' colspan="2">
            <mo:body message="${message}" body="${body}" theBody="${theBody}" mailbox="${mailbox}"/>
            <c:set var="bodies" value="${zm:getAdditionalBodies(body,message)}"/>
            <c:if test="${not empty bodies}">
                <c:forEach var="addbody" items="${bodies}" varStatus="bstatus">
                    <mo:body message="${message}" body="${addbody}" mailbox="${mailbox}"
                             theBody="${zm:getPartHtmlContent(addbody, message)}"/>
                </c:forEach>
            </c:if>
        </td>
    </tr>

    <c:if test="${not empty message.attachments}">
        <tr><td colspan=2><hr/><a name="attachments${message.partName}"></a></td></tr>
        <tr>
            <td colspan=2>
                <mo:attachments mailbox="${mailbox}" message="${message}" composeUrl="${composeUrl}"/>
            </td>
        </tr>
    </c:if>

    <c:if test="${not empty param.debug}">
        <tr><td colspan=2>
            <pre>${fn:escapeXml(message)}</pre>
        </td></tr>
    </c:if>
</table>
