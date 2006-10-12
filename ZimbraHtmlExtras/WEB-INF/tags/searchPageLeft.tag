<%@ tag body-content="empty" dynamic-attributes="dynattrs" %>
<%@ attribute name="urlTarget" rtexprvalue="true" required="true" %>
<%@ attribute name="context" rtexprvalue="true" required="true" type="com.zimbra.cs.jsp.tag.SearchContext"%>
<%@ attribute name="keys" rtexprvalue="true" required="true" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="app" uri="com.zimbra.htmlextras" %>
<%@ taglib prefix="zm" uri="com.zimbra.zm" %>
<c:if test="${context.searchResult.hasPrevPage}">
	<zm:prevResultUrl var="url" value="${urlTarget}" index="0" context="${context}"/>
	<a <c:if test="${keys}">accesskey="b"</c:if> href="${url}"><c:if test="${urlTarget eq 'clv'}">&lsaquo; Newer</c:if><c:if test="${urlTarget eq 'contacts'}">&lsaquo; Prev</c:if></a>
</c:if>
