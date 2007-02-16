<%@ tag body-content="empty" %>
<%@ attribute name="appt" rtexprvalue="true" required="true" type="com.zimbra.cs.zclient.ZApptSummary" %>
<%@ attribute name="start" rtexprvalue="true" required="true"%>
<%@ attribute name="end" rtexprvalue="true" required="true"%>
<%@ attribute name="timezone" rtexprvalue="true" required="true" type="java.util.TimeZone"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="app" uri="com.zimbra.htmlclient" %>
<%@ taglib prefix="zm" uri="com.zimbra.zm" %>

<fmt:setTimeZone value="${timezone}"/>
<c:set var="color" value="${zm:getFolder(pageContext,appt.folderId).styleColor}"/>
<c:set var="needsAction" value="${appt.partStatusNeedsAction}"/>
<c:choose>
    <c:when test="${appt.allDay}">
        <c:if test="${appt.startTime lt start}"><c:set var="bleft" value='border-left:none;'/></c:if>
        <c:if test="${appt.endTime gt end}"><c:set var="bright" value='border-right:none;'/></c:if>
        <div <c:if test="${not empty bleft or not empty bright}">style="${bleft}${bright}"</c:if> 
                class='ZhCalDayAllDayAppt${needsAction ? 'New ' : ' '} ${color}${needsAction ? 'Dark' : 'Light'}'>
                ${fn:escapeXml(appt.name)}
        </div>
    </c:when>
    <c:when test="${appt.duration gt 1000*60*15}">
        <table class='ZhCalDayAppt${needsAction ? 'New' : ''}' width=100% height=100% border=0 cellspacing=0 cellpadding="2">
            <tr>
                <td class='${color}${appt.partStatusNeedsAction ? 'Dark' : 'Light'}' valign=top>
                    <c:choose>
                        <c:when test="${appt.startTime lt start}">
                            <fmt:formatDate value="${appt.startDate}" type="both" timeStyle="short" dateStyle="short"/>
                        </c:when>
                        <c:otherwise>
                            <fmt:formatDate value="${appt.startDate}" type="time" timeStyle="short"/>
                        </c:otherwise>
                    </c:choose>
                </td>
            </tr>
            <tr>
                <td height=100% class='${color}${needsAction ? '' : 'Bg'}' valign=top>
                    ${fn:escapeXml(appt.name)}
                </td
            </tr>
            <c:if test="${appt.duration gt zm:MSECS_PER_HOUR()}">
            <tr>
                <td align=left valign=bottom height=1% class='ZhCalDayApptEnd ${color}${needsAction ? '' : 'Bg'}'>
                    <c:choose>
                        <c:when test="${appt.endTime gt end}">
                            <fmt:formatDate value="${appt.endDate}" type="both" timeStyle="short" dateStyle="short"/>
                        </c:when>
                        <c:otherwise>
                            <fmt:formatDate value="${appt.endDate}" type="time" timeStyle="short"/>
                        </c:otherwise>
                    </c:choose>                    
                </td>
            </tr>
            </c:if>
        </table>
    </c:when>
    <c:otherwise>
        <table class='ZhCalDayAppt' width=100% height=100% border=0 cellspacing=0 cellpadding="2">
            <tr>
                <td class='${color}${needsAction ? 'Dark' : 'Light'}' valign=top>
                    <fmt:formatDate value="${appt.startDate}" type="time" timeStyle="short"/>
                     &nbsp; ${fn:escapeXml(appt.name)}
                </td>
            </tr>
        </table>
    </c:otherwise>
</c:choose>
