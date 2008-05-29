package com.zimbra.cs.mailbox;

import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import javax.mail.MessagingException;
import javax.mail.Session;
import javax.mail.Message.RecipientType;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMessage;
import javax.mail.internet.MimeMultipart;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.Constants;
import com.zimbra.common.util.Pair;
import com.zimbra.common.util.StringUtil;
import com.zimbra.cs.account.DataSource;
import com.zimbra.cs.account.Identity;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.Provisioning.DataSourceBy;
import com.zimbra.cs.account.Provisioning.IdentityBy;
import com.zimbra.cs.account.offline.OfflineProvisioning;
import com.zimbra.cs.account.offline.OfflineDataSource;
import com.zimbra.cs.datasource.DataSourceManager;
import com.zimbra.cs.mailbox.MailSender.SafeSendFailedException;
import com.zimbra.cs.mailbox.MailServiceException.NoSuchItemException;
import com.zimbra.cs.mime.Mime;
import com.zimbra.cs.mime.ParsedMessage;
import com.zimbra.cs.mime.Mime.FixedMimeMessage;
import com.zimbra.cs.offline.OfflineLog;
import com.zimbra.cs.offline.OfflineSyncManager;
import com.zimbra.cs.offline.common.OfflineConstants;
import com.zimbra.cs.service.util.ItemId;
import com.zimbra.cs.session.PendingModifications;
import com.zimbra.cs.session.PendingModifications.Change;
import com.zimbra.cs.util.JMSession;

public class LocalMailbox extends DesktopMailbox {
    
    LocalMailbox(MailboxData data) throws ServiceException {
        super(data);
    }
    
    @Override
    public MailSender getMailSender() {
        return new OfflineMailSender();
    }

    private int adjustFlags(int flags) throws ServiceException {
    	DataSource ds = OfflineProvisioning.getOfflineInstance().getDataSource(getAccount());
    	if (ds != null && ds.getType() == DataSource.Type.imap) {
    		flags |= Flag.BITMASK_SYNCFOLDER;
    	}
    	return flags;
    }
    
    @Override
    public synchronized Folder createFolder(OperationContext octxt, String name, int parentId, byte attrs, byte defaultView, int flags, byte color, String url) throws ServiceException {
    	flags = adjustFlags(flags);
    	return super.createFolder(octxt, name, parentId, attrs, defaultView, flags, color, url);
    }
    
    @Override
    public synchronized Folder createFolder(OperationContext octxt, String path, byte attrs, byte defaultView, int flags, byte color, String url) throws ServiceException {
    	flags = adjustFlags(flags);
    	return super.createFolder(octxt, path, attrs, defaultView, flags, color, url);
    }
    
    @Override
    void snapshotCounts() throws ServiceException {
        // do the normal persisting of folder/tag counts
        super.snapshotCounts();

        boolean outboxed = false;
        
        PendingModifications pms = getPendingModifications();
        if (pms == null || !pms.hasNotifications())
            return;

        if (pms.created != null) {
            for (MailItem item : pms.created.values()) {
                if (item.getFolderId() == ID_FOLDER_OUTBOX)
                	outboxed = true;
            }
        }

        if (pms.modified != null) {
            for (Change change : pms.modified.values()) {
                if (!(change.what instanceof MailItem))
                    continue;
                MailItem item = (MailItem) change.what;
                if (item.getFolderId() == ID_FOLDER_OUTBOX) {
                	outboxed = true;
                }
            }
        }
        
        if (outboxed) {
        	OutboxTracker.invalidate(this);
        	syncNow();
        }
    }
    
    /** Tracks messages that we've called SendMsg on but never got back a
     *  response.  This should help avoid duplicate sends when the connection
     *  goes away in the process of a SendMsg.<p>
     *  
     *  key: a String of the form <tt>account-id:message-id</tt><p>
     *  value: a Pair containing the content change ID and the "send UID"
     *         used when the message was previously sent. */
    private static final Map<Integer, Pair<Integer, String>> sSendUIDs = new HashMap<Integer, Pair<Integer, String>>();

    private void sendPendingMessages(boolean isOnRequest) throws ServiceException {
    	OperationContext context = new OperationContext(this);

    	for (Iterator<Integer> iterator = OutboxTracker.iterator(this, isOnRequest ? 0 : 5 * Constants.MILLIS_PER_MINUTE); iterator.hasNext(); ) {
        	int id = iterator.next();
        	
            Message msg = null;
            try {
            	msg = getMessageById(context, id);
            } catch (NoSuchItemException x) { //message deleted
                OutboxTracker.remove(this, id);
            	continue;
            }
            if (msg == null || msg.getFolderId() != ID_FOLDER_OUTBOX) {
            	OutboxTracker.remove(this, id);
            	continue;
            }
            
            Session session = null;
            //the client could send datasourceId as identityId
            DataSource ds = Provisioning.getInstance().get(getAccount(), DataSourceBy.id, msg.getDraftIdentityId());
            if (ds == null)
            	ds = OfflineProvisioning.getOfflineInstance().getDataSource(getAccount());
            if (ds != null) {
            	session = LocalJMSession.getSession(ds);
            } else {
            	session = LocalJMSession.getSession(getAccount());
            }
            if (session == null) { 
        		OfflineLog.offline.info("SMTP configuration not valid: " + msg.getSubject());
    			bounceToInbox(context, id, msg, "SMTP configuration not valid");
    			OutboxTracker.remove(this, id);
        		continue;
            }
            Identity identity = Provisioning.getInstance().get(getAccount(), IdentityBy.id, msg.getDraftIdentityId());

            try {
                // try to avoid repeated sends of the same message by tracking "send UIDs" on SendMsg requests
                Pair<Integer, String> sendRecord = sSendUIDs.get(id);
                String sendUID = sendRecord == null || sendRecord.getFirst() != msg.getSavedSequence() ? UUID.randomUUID().toString() : sendRecord.getSecond();
                sSendUIDs.put(id, new Pair<Integer, String>(msg.getSavedSequence(), sendUID));

                MimeMessage mm = ((FixedMimeMessage) msg.getMimeMessage()).setSession(session);
                String  origId = msg.getDraftOrigId();
                new MailSender().sendMimeMessage(context, this, true, mm, null, null,
                								 !StringUtil.isNullOrEmpty(origId) ? new ItemId(msg.getDraftOrigId(), getAccountId()) : null,
                                                 msg.getDraftReplyType(), identity, false, false);
              	OfflineLog.offline.debug("smtp: sent pending mail (" + id + "): " + msg.getSubject());
                
                // remove the draft from the outbox
                delete(context, id, MailItem.TYPE_MESSAGE);
                OutboxTracker.remove(this, id);
                OfflineLog.offline.debug("smtp: deleted pending draft (" + id + ')');

                // the draft is now gone, so remove it from the "send UID" hash and the list of items to push
                sSendUIDs.remove(id);
            } catch (ServiceException x) {
            	if (x.getCause() instanceof MessagingException) {
            		OfflineLog.offline.debug("smtp: failed to send mail (" + id + "): " + msg.getSubject(), x);
	        		OfflineLog.offline.info("SMTP send failure: " + msg.getSubject());
            		if (x.getCause() instanceof SafeSendFailedException) {
            			bounceToInbox(context, id, msg, x.getCause().getMessage());
            			OutboxTracker.remove(this, id);
            		} else {
            			OutboxTracker.recordFailure(this, id);
            		}
            		continue;
            	} else {
            		throw x;
            	}
            }
        }
    }
    
    private void bounceToInbox(OperationContext context, int id, Message msg, String error) {
    	MimeMessage mm = new Mime.FixedMimeMessage(JMSession.getSession());
		try {
			mm.setFrom(new InternetAddress(getAccount().getName()));
    		mm.setRecipient(RecipientType.TO, new InternetAddress(getAccount().getName()));
    		mm.setSubject("Delivery failed: " + error);
    		
    		mm.saveChanges(); //must call this to update the headers
    		
    		MimeMultipart mmp = new MimeMultipart();
    		MimeBodyPart mbp = new MimeBodyPart();
    		mbp.setText(error == null ? "SEND FAILED. PLEASE CHECK RECIPIENT ADDRESSES AND SMTP SETTINGS." : error);
   			mmp.addBodyPart(mbp);
    		
    		mbp = new MimeBodyPart();
    		mbp.setContent(msg.getMimeMessage(), "message/rfc822");
    		mbp.setHeader("Content-Disposition", "attachment");
    		mmp.addBodyPart(mbp, mmp.getCount());
    		
    		mm.setContent(mmp);
    		mm.saveChanges();
		
    		//directly bounce to local inbox
    		ParsedMessage pm = new ParsedMessage(mm, true);
    		addMessage(context, pm, OfflineMailbox.ID_FOLDER_INBOX, true, Flag.BITMASK_UNREAD, null);
    		delete(context, id, MailItem.TYPE_MESSAGE);
		} catch (Exception e) {
			OfflineLog.offline.warn("smtp: can't bounce failed send (" + id + ")" + msg.getSubject(), e);
		}
    }
    
    private boolean isAutoSyncDisabled(DataSource ds) {
    	return ds.getTimeInterval(OfflineProvisioning.A_zimbraDataSourceSyncFreq, OfflineConstants.DEFAULT_SYNC_FREQ) <= 0;
    }
    
    @Override
    public boolean isAutoSyncDisabled() {
    	try {
			List<DataSource> dataSources = OfflineProvisioning.getOfflineInstance().getAllDataSources(getAccount());
			for (DataSource ds : dataSources) {
				if (!isAutoSyncDisabled(ds))
					return false;
			}
    	} catch (ServiceException x) {
    		OfflineLog.offline.error(x);
    	}
    	return true;
    }
    
    @Override
	protected void syncOnTimer() {
    	sync(false);
	}

	private void syncAllLocalDataSources(boolean isOnRequest) throws ServiceException {
    	OfflineProvisioning prov = OfflineProvisioning.getOfflineInstance();
		List<DataSource> dataSources = prov.getAllDataSources(getAccount());
		OfflineSyncManager syncMan = OfflineSyncManager.getInstance();
		for (DataSource ds : dataSources) {
	    	if (!isOnRequest) {
		    	if (isAutoSyncDisabled(ds) || !syncMan.reauthOK(ds) || !syncMan.retryOK(ds))
		    		continue;
		    	
		    	long now = System.currentTimeMillis();
		    	long syncFreq = ds.getTimeInterval(OfflineProvisioning.A_zimbraDataSourceSyncFreq, OfflineConstants.DEFAULT_SYNC_FREQ);
		    	if (now - syncMan.getLastSyncTime(ds.getName()) < syncFreq)
		    		continue;
		    }
			
			try {
				syncMan.syncStart(ds.getName());
				DataSourceManager.importData(ds, isOnRequest);
				syncMan.syncComplete(ds.getName());
                OfflineProvisioning.getOfflineInstance().setDataSourceAttribute(ds, OfflineConstants.A_zimbraDataSourceLastSync, Long.toString(System.currentTimeMillis()));
			} catch (Exception x) {
            	if (isDeleting())
            		OfflineLog.offline.info("Mailbox \"%s\" is being deleted", getAccountName());
            	else
            		syncMan.processSyncException(ds, x);
			}
		}
    }
	
	private boolean mSyncRunning;
	
    private boolean lockMailboxToSync() {
    	if (isDeleting())
    		return false;
    	
    	if (!mSyncRunning) {
	    	synchronized (this) {
	    		if (!mSyncRunning) {
	    			mSyncRunning = true;
	    			return true;
	    		}
	    	}
    	}
    	return false;
    }
    
    private void unlockMailbox() {
    	assert mSyncRunning == true;
    	mSyncRunning = false;
    }
    
    public void sync(boolean isOnRequest) {
		if (lockMailboxToSync()) {
			try {
				sendPendingMessages(isOnRequest);
				syncAllLocalDataSources(isOnRequest);
			} catch (Exception x) {
				OfflineLog.offline.error("exception encountered during sync", x);
			} finally {
				unlockMailbox();
			}
        } else if (isOnRequest) {
        	OfflineLog.offline.debug("sync already in progress");
        }
    }
}
