package com.zimbra.cs.offline.jsp;

import com.zimbra.cs.account.DataSource;

public class GmailBean extends XmailBean {

	public GmailBean() {}
	
	private void fixup() {
		if (verb == null)
			return;
		
		if (isEmpty(accountName))
			addInvalid("accountName");
		if (isEmpty(email))
			addInvalid("email");
		if (isEmpty(password))
	    	addInvalid("password");
		
		domain = "gmail.com"; //this is solely for datasource.properties mapping
		if (email.indexOf('@') < 0)
			email += '@' + domain;
		username = email;
		
		protocol = DataSource.Type.imap.toString();
		host = "imap.gmail.com";
		port = "993";
		isSsl = true;
		
		smtpHost = "smtp.gmail.com";
		smtpPort = "465";
		isSmtpSsl = true;
		isSmtpAuth = true;
		smtpUsername = email;
		smtpPassword = password;
	}
	
	@Override
	protected void doRequest() {
		fixup();
		super.doRequest();
	}

	@Override
	protected void reload() {
		super.reload();
	}
}
