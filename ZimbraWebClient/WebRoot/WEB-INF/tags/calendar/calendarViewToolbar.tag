<%@ tag body-content="empty" %>
<%@ attribute name="context" rtexprvalue="true" required="true" type="com.zimbra.cs.taglib.tag.SearchContext"%>
<%@ attribute name="keys" rtexprvalue="true" required="true" %>
<%@ attribute name="title" rtexprvalue="true" required="true" %>
<%@ attribute name="today" rtexprvalue="true" required="true" type="java.util.Calendar"%>
<%@ attribute name="date" rtexprvalue="true" required="true" type="java.util.Calendar"%>
<%@ attribute name="nextDate" rtexprvalue="true" required="true" type="java.util.Calendar"%>
<%@ attribute name="prevDate" rtexprvalue="true" required="true" type="java.util.Calendar"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="app" uri="com.zimbra.htmlclient" %>
<%@ taglib prefix="zm" uri="com.zimbra.zm" %>


<c:if test="${empty requestScope.calViewToolbarCache}">
    <zm:getMailbox var="mailbox"/>
    <c:set var="calViewToolbarCache" scope="request">
        <fmt:formatDate var="dateDf" value="${date.time}" pattern="yyyyMMdd"/>
        <c:url var="viewUrl" value="/h/calendar">
            <c:param name="date" value="${dateDf}"/>
        </c:url>
         <td>
            <a accesskey="1" href="${viewUrl}&view=day"><app:img altkey="ALT_CAL_DAY_VIEW" src="calendar/DayView.gif"/><fmt:message key="day"/></a>
        </td>
        <td>
            <a accesskey="2" href="${viewUrl}&view=workWeek"><app:img altkey="ALT_CAL_WORKWEEK_VIEW" src="calendar/WorkWeekView.gif"/><fmt:message key="workWeek"/></a>
        </td>
        <td>
            <a accesskey="3" href="${viewUrl}&view=week"><app:img altkey="ALT_CAL_WEEK_VIEW" src="calendar/WeekView.gif"/><fmt:message key="week"/></a>
        </td>
        <td>
            <a accesskey="4" href="${viewUrl}&view=month"><app:img altkey="ALT_CAL_MONTH_VIEW" src="calendar/MonthView.gif"/><fmt:message key="month"/></a>
        </td>
        <td>
            <a accesskey="5" href="${viewUrl}&view=schedule"><app:img altkey="ALT_CAL_SCHEDULE_VIEW" src="calendar/GroupSchedule.gif"/><fmt:message key="schedule"/></a>
        </td>
        <fmt:formatDate var="todayDf" value="${today.time}" pattern="yyyyMMdd"/>
        <td>
            <div class='vertSep'/>
        </td>
        <c:url var="todayUrl" value="/h/calendar">
            <c:param name="date" value="${todayDf}"/>
            <c:if test="${not empty param.view}"><c:param name="view" value="${param.view}"/></c:if>
        </c:url>
        <td>
            <a accesskey="6" href="${todayUrl}"><app:img altkey="ALT_CAL_TODAY" src="calendar/Date.gif"/></a>
        </td>
    </c:set>
</c:if>

<table width=100% cellspacing=0 class='Tb'>
    <tr>
        <td align=left class=TbBt id="caltb">
            <table cellpadding="0" cellspacing="0">
                <tr valign="middle">
            <c:url var="refreshUrl" value="/h/calendar">
                <c:param name="date" value="${dateDf}"/>
                <c:if test="${not empty param.view}"><c:param name="view" value="${param.view}"/></c:if>
                <c:param name="refresh" value="1"/>
            </c:url>
            <td>
            <a href="${refreshUrl}" <c:if test="${keys}">accesskey="r"</c:if>><app:img altkey="ALT_CAL_REFRESH" src="arrows/Refresh.gif"/><fmt:message key="refresh"/></a>
            </td>
            <td>
                <div class='vertSep'/>
            </td>
            ${requestScope.calViewToolbarCache}
                </tr>
            </table>
        </td>
        <td align=right>

            <fmt:formatDate var="prevDf" value="${prevDate.time}" pattern="yyyyMMdd"/>
            <fmt:formatDate var="nextDf" value="${nextDate.time}" pattern="yyyyMMdd"/>
            <c:url var="prevUrl" value="/h/calendar">
                <c:param name="date" value="${prevDf}"/>
                <c:if test="${not empty param.view}"><c:param name="view" value="${param.view}"/></c:if>
            </c:url>
            <c:url var="nextUrl" value="/h/calendar">
                <c:param name="date" value="${nextDf}"/>
                <c:if test="${not empty param.view}"><c:param name="view" value="${param.view}"/></c:if>
            </c:url>
            <table cellspacing=5 cellpadding=0>
                <tr>
                    <td>
            <a <c:if test="${keys}">accesskey="p"</c:if> href="${prevUrl}"><img alt='<fmt:message key="ALT_PAGE_PREVIOUS"/>' src="<c:url value='/images/arrows/LeftArrow.gif'/>" border="0"/></a>
                    </td>
                    <td>
            ${fn:escapeXml(title)}
                    </td>
                    <td>
            <a <c:if test="${keys}">accesskey="n"</c:if> href="${nextUrl}"><img alt='<fmt:message key="ALT_PAGE_NEXT"/>' src="<c:url value='/images/arrows/RightArrow.gif'/>" border="0"/></a>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
