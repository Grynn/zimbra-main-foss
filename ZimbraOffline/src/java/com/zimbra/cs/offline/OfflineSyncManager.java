/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Server
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
 */
package com.zimbra.cs.offline;

import java.io.IOException;
import java.net.ConnectException;
import java.net.NoRouteToHostException;
import java.net.PortUnreachableException;
import java.net.SocketTimeoutException;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import javax.mail.AuthenticationFailedException;
import javax.security.auth.login.LoginException;

import org.apache.commons.httpclient.ConnectTimeoutException;
import org.dom4j.QName;

import com.zimbra.common.auth.ZAuthToken;
import com.zimbra.common.localconfig.LC;
import com.zimbra.common.service.RemoteServiceException;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.AdminConstants;
import com.zimbra.common.soap.Element;
import com.zimbra.common.soap.SoapFaultException;
import com.zimbra.common.soap.SoapHttpTransport;
import com.zimbra.common.soap.SoapProtocol;
import com.zimbra.common.util.Constants;
import com.zimbra.common.util.ExceptionToString;
import com.zimbra.common.util.SystemUtil;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.AccountServiceException;
import com.zimbra.cs.account.DataSource;
import com.zimbra.cs.account.offline.DirectorySync;
import com.zimbra.cs.account.offline.OfflineAccount;
import com.zimbra.cs.account.offline.OfflineProvisioning;
import com.zimbra.cs.mailbox.MailServiceException;
import com.zimbra.cs.mailbox.Mailbox;
import com.zimbra.cs.mailbox.MailboxManager;
import com.zimbra.cs.mailbox.OfflineMailboxManager;
import com.zimbra.cs.mailbox.OfflineServiceException;
import com.zimbra.cs.offline.ab.gab.GDataServiceException;
import com.zimbra.cs.offline.common.OfflineConstants;
import com.zimbra.cs.offline.common.OfflineConstants.SyncStatus;
import com.zimbra.cs.servlet.ZimbraServlet;
import com.zimbra.cs.util.Zimbra;
import com.zimbra.cs.util.yauth.AuthenticationException;

public class OfflineSyncManager {
	
    private static final QName ZDSYNC_ZDSYNC = QName.get("zdsync", OfflineConstants.NAMESPACE);
    private static final QName ZDSYNC_ACCOUNT = QName.get("account", OfflineConstants.NAMESPACE);
    private static final QName ZDSYNC_ERROR = QName.get("error", OfflineConstants.NAMESPACE);
    private static final QName ZDSYNC_EXCEPTION = QName.get("exception", OfflineConstants.NAMESPACE);
    
    private static final String A_ZDSYNC_NAME = "name";
    private static final String A_ZDSYNC_ID = "id";
    private static final String A_ZDSYNC_STATUS = "status";
    private static final String A_ZDSYNC_LASTSYNC = "lastsync";
    private static final String A_ZDSYNC_ERRORCODE = "code";
    private static final String A_ZDSYNC_MESSAGE = "message";
    private static final String A_ZDSYNC_UNREAD = "unread";
    
    
    private static class SyncError {
    	String message;
    	Exception exception;
    	
    	SyncError(String message, Exception exception) {
    		this.message = message;
    		this.exception = exception;
    	}
    	
    	void encode(Element e) {
    		Element error = e.addElement(ZDSYNC_ERROR);
    		if (message != null && message.length() > 0) {
    			error.addAttribute(A_ZDSYNC_MESSAGE, message);
    		}
    		if (exception != null) {
    			error.addElement(ZDSYNC_EXCEPTION).setText(ExceptionToString.ToString(exception));
    		}
    	}
    }
    

    private static class OfflineSyncStatus {
        String mStage;
        SyncStatus mStatus = SyncStatus.unknown;
        boolean mSyncRunning = false;
        
        long mLastSyncTime = 0;
        long mLastFailTime = 0;
        int mRetryCount = 0;
        
        String mCode;
        SyncError mError;
        
		String authPassword;
	    long lastAuthFail;
	    ZAuthToken authToken; //null for data sources
	    long authExpires; //0 for data sources
	    
        boolean syncStart() {
        	if (mStatus == SyncStatus.running)
        		return false;
        	mStatus = SyncStatus.running;
        	mCode = null;
        	mError = null;
        	return true;
        }
        
        boolean syncComplete() {
        	if (mStatus != SyncStatus.running)
        		return false;
        	mLastSyncTime = System.currentTimeMillis();
        	mLastFailTime = 0;
        	mStatus = SyncStatus.online;
        	mRetryCount = 0;
        	return true;
        }
        
        void resetLastSyncTime() {
            mLastSyncTime = System.currentTimeMillis();
        }
        
        void connectionDown(String code) {
        	if (++mRetryCount >= OfflineLC.zdesktop_retry_limit.intValue()) {
        		mLastFailTime = System.currentTimeMillis();
        	}
        	mCode = code;
        	mStatus = SyncStatus.offline;
        }
        
        void syncFailed(String code, String message, Exception exception) {
        	mLastFailTime = System.currentTimeMillis();
        	mCode = code;
        	mError = new SyncError(message, exception);
        	mStatus = SyncStatus.error;
        	++mRetryCount;
        }
        
        boolean retryOK() {
        	int clicks = mRetryCount - OfflineLC.zdesktop_retry_limit.intValue();
        	clicks = clicks < 0 ? 0 : clicks;
        	clicks = clicks > 15 ? 15 : clicks;
        	long delay = OfflineLC.zdesktop_retry_delay_min.longValue() * (1 << clicks);
        	delay = delay > OfflineLC.zdesktop_retry_delay_max.longValue() ? OfflineLC.zdesktop_retry_delay_max.longValue() : delay;
        	return System.currentTimeMillis() - mLastFailTime > delay;
        }
        
    	ZAuthToken lookupAuthToken(String password) {
    		if (authToken != null && System.currentTimeMillis() < authExpires && password.equals(authPassword))
    			return authToken;
    		authToken = null;
    		authExpires = 0;
    		return null;
    	}
    	
    	void clearAuthToken() {
    		authToken = null;
    		authExpires = 0;
    	}
    	
    	boolean reauthOK(String password) {
    		return !password.equals(authPassword) || System.currentTimeMillis() - lastAuthFail > OfflineLC.zdesktop_reauth_delay.longValue();
    	}
    	
    	void authSuccess(String password, ZAuthToken token, long expires) {
    		authPassword = password;
    		authToken = token;
    		authExpires = expires;
    		mStatus = mStatus == SyncStatus.authfail ? SyncStatus.online : mStatus;
    	}
    	
    	void authFailed(String code, String password) {
    		authPassword = password;
    		lastAuthFail = System.currentTimeMillis();
    		authToken = null;
    		authExpires = 0;
    		mStatus = SyncStatus.authfail;
    		mCode = code;
    	}
    	
    	void encode(Element e) {
    		e.addAttribute(A_ZDSYNC_STATUS, mStatus.toString());
        	e.addAttribute(A_ZDSYNC_LASTSYNC, Long.toString(mLastSyncTime));
        	if (mCode != null)
        		e.addAttribute(A_ZDSYNC_ERRORCODE, mCode);
        	if (mError != null) {
        		mError.encode(e);
        	}
    	}
    	
    	SyncStatus getSyncStatus() {
    		return mStatus;
    	}
    	
    	String getErrorCode() {
    		return mCode;
    	}
    	
    	void clearErrorCode() {
        	mCode = null;
        	mError = null;
        	if (mStatus == SyncStatus.authfail || mStatus == SyncStatus.error || mStatus == SyncStatus.offline)
        		mStatus = SyncStatus.unknown;
    	}
    	
    	String getErrorMsg() {
    		return mError == null ? null : mError.message;
    	}
    	
    	String getException() {
    		return mError == null || mError.exception == null ? null : ExceptionToString.ToString(mError.exception); 
    	}
    }
    
    private final Map<String, OfflineSyncStatus> syncStatusTable = Collections.synchronizedMap(new HashMap<String, OfflineSyncStatus>());

    private OfflineSyncStatus getStatus(String targetName) {
		synchronized (syncStatusTable) {
			OfflineSyncStatus status = syncStatusTable.get(targetName);
			if (status == null) {
				status = new OfflineSyncStatus();
				syncStatusTable.put(targetName, status);
			}
			return status;
		}
	}
	
	//
	// sync activity update
	//
    
    public String getErrorCode(String targetName) {
		synchronized (syncStatusTable) {
			return getStatus(targetName).mCode;
		}
    }
    
    public String getErrorMsg(String targetName) {
		synchronized (syncStatusTable) {
			return getStatus(targetName).getErrorMsg();
		}
    }
    
    public String getException(String targetName) {
		synchronized (syncStatusTable) {
			return getStatus(targetName).getException();
		}
    }
	
	public long getLastSyncTime(String targetName) {
		synchronized (syncStatusTable) {
			return getStatus(targetName).mLastSyncTime;
		}
	}
	
	public boolean isOnLine(String targetName) {
		synchronized (syncStatusTable) {
			return getStatus(targetName).mStatus == SyncStatus.online;
		}
	}
	
	public void setStage(String targetName, String stage) {
		synchronized (syncStatusTable) {
			getStatus(targetName).mStage = stage;
		}
	}
	
    public void syncStart(String targetName) {
    	boolean b;
    	synchronized (syncStatusTable) {
    		b = getStatus(targetName).syncStart();
    	}
    	if (b)
    		notifyStateChange();
    }
    
    public void syncComplete(String targetName) {
    	boolean b;
    	synchronized (syncStatusTable) {
    		b = getStatus(targetName).syncComplete();
    	}
    	if (b)
    		notifyStateChange();
    }
    
    public void resetLastSyncTime(String targetName) {
        synchronized (syncStatusTable) {
            getStatus(targetName).resetLastSyncTime();
        }        
    }
    
    private void connectionDown(String targetName, String code) {
    	synchronized (syncStatusTable) {
    		getStatus(targetName).connectionDown(code);
    	}
    	notifyStateChange();
    }
    
    private void authFailed(String targetName, String code, String password) {
    	synchronized (syncStatusTable) {
    		getStatus(targetName).authFailed(code, password);
    	}
    	notifyStateChange();
    }
    
    private void syncFailed(String targetName, String code, String message, Exception exception) {
    	synchronized (syncStatusTable) {
    		getStatus(targetName).syncFailed(code, message, exception);
    	}
    	notifyStateChange();
    }

    private void notifyStateChange() {
    	try {
    		OfflineMailboxManager.getOfflineInstance().notifyAllMailboxes();
    	} catch (Exception x) {
    		OfflineLog.offline.error("unexpected exception", x);
    	}
    }
    
    public void authSuccess(String targetName, String password, ZAuthToken token, long expires) {
    	synchronized (syncStatusTable) {
    		getStatus(targetName).authSuccess(password, token, expires);
    	}
    }
    
    //
    // account auth
    //
    
	public ZAuthToken lookupAuthToken(Account account) {
		synchronized (syncStatusTable) {
			return getStatus(account.getName()).lookupAuthToken(((OfflineAccount)account).getRemotePassword());
		}
	}
	
	public void clearAuthToken(Account account) {
		synchronized (syncStatusTable) {
			getStatus(account.getName()).clearAuthToken();
		}
	}
	
	public boolean reauthOK(Account account) {
		synchronized (syncStatusTable) {
			return getStatus(account.getName()).reauthOK(((OfflineAccount)account).getRemotePassword());
		}
	}
	
	public boolean retryOK(Account account) {
	    return retryOK(account.getName());
	}
	
	public boolean retryOK(String targetName) {
        synchronized (syncStatusTable) {
            return getStatus(targetName).retryOK();
        }	    
	}
	
	public void authSuccess(Account account, ZAuthToken token, long expires) {
		authSuccess(account.getName(), ((OfflineAccount)account).getRemotePassword(), token, expires);
	}
	
	//
	// data source auth
	//
	
	public boolean reauthOK(DataSource dataSource) throws ServiceException {
		synchronized (syncStatusTable) {
			return getStatus(dataSource.getName()).reauthOK(dataSource.getDecryptedPassword());
		}
	}
	
	public boolean retryOK(DataSource dataSource) {
		synchronized (syncStatusTable) {
			return getStatus(dataSource.getName()).retryOK();
		}
	}
	
	public void authSuccess(DataSource dataSource) throws ServiceException {
		authSuccess(dataSource.getName(), dataSource.getDecryptedPassword(), null, 0);
	}
    
	//
	// process failure
	//
	
	public static boolean isReceiversFault(Exception exception) {
		SoapFaultException fault = null;
		if (exception instanceof SoapFaultException) {
			fault = (SoapFaultException)exception;
		} else if (exception.getCause() instanceof SoapFaultException) {
			fault = (SoapFaultException)(exception.getCause());
		}
		return fault != null && fault.isReceiversFault();
	}
	
	public static boolean isAuthError(Exception exception) {
        if (exception instanceof SoapFaultException) {
		    return ((SoapFaultException)exception).getCode().equals(AccountServiceException.AUTH_FAILED);
        }
        Throwable cause = SystemUtil.getInnermostException(exception);
        return cause instanceof AuthenticationFailedException ||
               cause instanceof AuthenticationException ||
               cause instanceof com.google.gdata.util.AuthenticationException ||
               cause instanceof LoginException;
    }
	
    public static boolean isConnectionDown(Exception exception) {
        if (exception instanceof SoapFaultException && ((SoapFaultException)exception).getCode().equals(MailServiceException.MAINTENANCE))
        	return true;
    	
        if (exception instanceof ServiceException && ((ServiceException)exception).getCode().equals(ServiceException.RESOURCE_UNREACHABLE))
        	return true;
        
        Throwable cause = SystemUtil.getInnermostException(exception);
        return cause instanceof java.net.UnknownHostException ||
	           cause instanceof java.net.NoRouteToHostException ||
	           cause instanceof java.net.SocketException ||
	           cause instanceof java.net.SocketTimeoutException ||
	           cause instanceof java.net.ConnectException ||
	           cause instanceof org.apache.commons.httpclient.ConnectTimeoutException ||
	           cause instanceof org.apache.commons.httpclient.NoHttpResponseException;
	}
	
	public static boolean isIOException(Exception exception) {
		Throwable cause = SystemUtil.getInnermostException(exception);
		return cause instanceof IOException;
	}
	
	public static boolean isMailboxInMaintenance(Exception exception) {
		return exception instanceof ServiceException && ((ServiceException)exception).getCode().equals(MailServiceException.MAINTENANCE);
	}
	
	public static boolean isDbShutdown(Exception exception) {
		Throwable e = SystemUtil.getInnermostException(exception);
		if (e instanceof RuntimeException) {
            String msg = e.getMessage();
            return msg != null && msg.equals("DbPool permanently shutdown");
        }
		return false;
	}
	
    public void processSyncException(Account account, Exception exception) {
    	processSyncException(account.getName(), ((OfflineAccount)account).getRemotePassword(), exception, ((OfflineAccount)account).isDebugTraceEnabled());
    }
    
    public void processSyncException(DataSource dataSource, Exception exception) throws ServiceException {
    	processSyncException(dataSource.getName(), dataSource.getDecryptedPassword(), exception, dataSource.isDebugTraceEnabled());
    }
    
	public void processSyncException(String targetName, String password, Exception exception, boolean isDebugTraceOn) {
		Throwable cause = SystemUtil.getInnermostException(exception);
		String code = null;
		if (cause instanceof ServiceException)
			code = ((ServiceException)cause).getCode();
		else if (cause instanceof com.google.gdata.util.ServiceException)
        	GDataServiceException.getErrorCode((com.google.gdata.util.ServiceException)cause);
		else if (cause instanceof LoginException)
        	code = RemoteServiceException.AUTH_FAILURE;
		else
			code = RemoteServiceException.getErrorCode(cause);

		if (isConnectionDown(exception)) {
        	connectionDown(targetName, null); //offline don't need code
        	OfflineLog.offline.info("sync connection down: " + targetName);
        	if (isDebugTraceOn)
        		OfflineLog.offline.debug("sync conneciton down: " + targetName, exception);
        } else if (isAuthError(exception)) {
        	authFailed(targetName, code, password);
    		OfflineLog.offline.warn("sync remote auth failure: " + targetName);
        	if (isDebugTraceOn)
        		OfflineLog.offline.debug("sync remote auth failure: " + targetName, exception);
        } else {
        	code = code == null ? OfflineServiceException.UNEXPECTED : code;
        	syncFailed(targetName, code, cause.getMessage(), exception);
        	OfflineLog.offline.error("sync failure: " + targetName, exception);
        	if (exception instanceof SoapFaultException) {
        		SoapFaultException x = (SoapFaultException)exception;
        	    OfflineLog.offline.warn("SoapFaultException: " + x.getReason() + "\nFaultRequest:\n" + x.getFaultRequest() + "\nFaultResponse:\n" + x.getFaultResponse());
        	}
        }
	}
	
	public SyncStatus getSyncStatus(String targetName) {
    	synchronized (syncStatusTable) {
    		return getStatus(targetName).getSyncStatus();
    	}
	}
	
	public void resetStatus(String targetName) {
		synchronized (syncStatusTable) {
			syncStatusTable.remove(targetName);
		}
	}
	
	public void clearErrorCode(String targetName) {
		synchronized (syncStatusTable) {
			getStatus(targetName).clearErrorCode();
		}
	}
	
	private static OfflineSyncManager instance = new OfflineSyncManager();
	public static OfflineSyncManager getInstance() {
		return instance;
	}
	
	private Set<Integer> toSkipList = new HashSet<Integer>();
	public boolean isInSkipList(int itemId) {
		return toSkipList.contains(itemId);
	}
	
	public void init() throws ServiceException {
		String[] toSkip = OfflineLC.zdesktop_sync_skip_idlist.value().split("\\s*,\\s*");
		for (String s : toSkip) {
			try {
				toSkipList.add(Integer.parseInt(s));
			} catch (NumberFormatException x) {
				if (s.length() > 0)
					OfflineLog.offline.warn("Invaid item id %s in zdesktop_sync_skip_idlist", s);
			}
		}
		
		//load all mailboxes so that timers are kicked off
    	OfflineProvisioning prov = OfflineProvisioning.getOfflineInstance();
    	List<Account> dsAccounts = prov.getAllDataSourceAccounts();
		for (Account dsAccount : dsAccounts) {
		    MailboxManager.getInstance().getMailboxByAccount(dsAccount);
		}
		List<Account> syncAccounts = prov.getAllSyncAccounts();
		for (Account syncAccount : syncAccounts) {
			MailboxManager.getInstance().getMailboxByAccount(syncAccount);
		}
		DirectorySync.getInstance();
		
		//deal with left over mailboxes from interrupted delete/reset
		int[] mids = MailboxManager.getInstance().getMailboxIds();
		for (int mid : mids)
			try {
				MailboxManager.getInstance().getMailboxById(mid, true);
			} catch (ServiceException x) {
				OfflineLog.offline.warn("failed to load mailbox id=%d", mid, x);
			}
			
		new Thread(new Runnable() {
			public void run() {
				confirmServiceOpen();
			}
		}, "service-port-ping").start();
	}
	
	
	private boolean isServiceOpen;
	
	public synchronized boolean isServiceOpen() {
		return isServiceOpen;
	}
	
	private synchronized void confirmServiceOpen() {
        String uri = LC.zimbra_admin_service_scheme.value() + "localhost"+ ":" + LC.zimbra_admin_service_port.value() +
        		     ZimbraServlet.ADMIN_SERVICE_URI;
        for (int i = 0; i < 24; ++i) {
		    try {
		    	SoapHttpTransport transport = new SoapHttpTransport(uri);
		        transport.setUserAgent(OfflineLC.zdesktop_name.value(), OfflineLC.getFullVersion());
		        transport.setTimeout(5000);
		        transport.setRetryCount(1);
		        transport.setRequestProtocol(SoapProtocol.Soap12);
		        transport.setResponseProtocol(SoapProtocol.Soap12);
		
		        Element request = new Element.XMLElement(AdminConstants.PING_REQUEST);
		        transport.invokeWithoutSession(request.detach());
		        OfflineLog.offline.info("service port is ready.");
		        isServiceOpen = true;
		        return;
		    } catch (Exception x) {
		    	if (x instanceof ConnectException || x instanceof SocketTimeoutException || x instanceof ConnectTimeoutException)
		    		OfflineLog.offline.info("awaiting service port.");
		    	else if (x instanceof NoRouteToHostException || x instanceof PortUnreachableException)
		    		OfflineLog.offline.warn("service host or port unreachable; will retry in 5 seconds.", x);
		    	else
		    		OfflineLog.offline.warn("service port check failed; will retry in 5 seconds", x);
		    }
	    	try {
	    		Thread.sleep(5000); //avoid potential tight loop
	    	} catch (InterruptedException e) {}
        }
		Zimbra.halt("Zimbra Desktop Service failed to initialize.  Shutting down...");
	}
	
	private boolean isUiLoadingInProgress;
	private long uiLoadingStartTime;
	
	public synchronized boolean isUiLoadingInProgress() {
		if (!isUiLoadingInProgress)
			return false;
		if (System.currentTimeMillis() - uiLoadingStartTime >= 60000) { //hard limit of halting sync to 60 seconds
			OfflineLog.offline.warn("ui loading has been in progress for more than 60 seconds; force resuming any blocked sync.");
			setUiLoadingInProgress(false);
			return false;
		}
		return isUiLoadingInProgress;
	}
	
	public synchronized void setUiLoadingInProgress(boolean b) {
		isUiLoadingInProgress = b;
		if (b)
			uiLoadingStartTime = System.currentTimeMillis();
		else
			uiLoadingStartTime = 0;
	}
	
	public void continueOK() {
		while (true) {
			if (!isUiLoadingInProgress())
				return;
			OfflineLog.offline.info("ui loading in progress; sync on hold.");
			try {
				Thread.sleep(5000);
			} catch (InterruptedException x) {}
		}
	}
	
	
	/*
		<zdsync xmlns="urn:zimbraOffline">
		  <account name="foo@domain1.com" id="1234-5678" status="online" [code="{CODE}"] lastsync="1234567" unread="32">
			  [<error [message="{MESSAGE}"]>
			    [<exception>{EXCEPTION}</exception>]
			  </error>]
		  </account>
		  [(<account>...</account>)*]
		</zdsync>
	 */
    public void encode(Element context, String requestedAccountId) throws ServiceException {
    	OfflineProvisioning prov = OfflineProvisioning.getOfflineInstance();
    	
    	Element zdsync = context.addUniqueElement(ZDSYNC_ZDSYNC);
    	List<Account> accounts = prov.getAllAccounts();
    	for (Account account : accounts) {
        	if (!(account instanceof OfflineAccount) || prov.isLocalAccount(account))
        		continue;
        	
        	String user = account.getName();
    		Element e = zdsync.addElement(ZDSYNC_ACCOUNT).addAttribute(A_ZDSYNC_NAME, user).addAttribute(A_ZDSYNC_ID, account.getId());
    		if (prov.isSyncAccount(account))
    			getStatus(user).encode(e);
    		else if (OfflineProvisioning.isDataSourceAccount(account))
    			getStatus(OfflineProvisioning.getDataSourceName(account)).encode(e);
    		else {
        		e.detach();
        		OfflineLog.offline.warn("Invalid account: " + user);
        		continue;
    		}
    		e.addAttribute(A_ZDSYNC_UNREAD, MailboxManager.getInstance().getMailboxByAccount(account).getFolderById(null, Mailbox.ID_FOLDER_INBOX).getUnreadCount());
    	}
    }
    
    private long lastClientPing;
    
    public synchronized void clientPing() {
    	lastClientPing = System.currentTimeMillis();
    }
    
    public synchronized long getSyncFrequencyLimit() {
		long quietTime = System.currentTimeMillis() - lastClientPing;
		
		long freqLimit = 0;
		if (quietTime > Constants.MILLIS_PER_HOUR)
			freqLimit = Constants.MILLIS_PER_HOUR;
		else if (quietTime > 5 * Constants.MILLIS_PER_MINUTE)
			freqLimit = 15 * Constants.MILLIS_PER_MINUTE;
		
		return freqLimit;
    }
}
