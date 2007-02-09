/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Portions created by Zimbra are Copyright (C) 2006 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * The Original Code is: Zimbra Network
 * 
 * ***** END LICENSE BLOCK *****
 */
package com.zimbra.cs.mailbox;

import java.util.TimerTask;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.Constants;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.AccountServiceException;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.Provisioning.AccountBy;
import com.zimbra.cs.account.offline.OfflineProvisioning;
import com.zimbra.cs.mailbox.Mailbox.MailboxData;
import com.zimbra.cs.mailbox.OfflineMailbox.SyncState;
import com.zimbra.cs.offline.Offline;
import com.zimbra.cs.offline.OfflineLog;

public class OfflineMailboxManager extends MailboxManager {

    private static final long MINIMUM_SYNC_INTERVAL = 5 * Constants.MILLIS_PER_SECOND;
    // private static final long SYNC_INTERVAL = 5 * Constants.MILLIS_PER_MINUTE;
    private static final long SYNC_INTERVAL = 15 * Constants.MILLIS_PER_SECOND;

    private static SyncTask sSyncTask = null;


    public OfflineMailboxManager() throws ServiceException  {
        super();

        // wait 5 seconds, then start to sync
        if (sSyncTask != null)
            sSyncTask.cancel();
        sSyncTask = new SyncTask();
        Offline.sTimer.schedule(sSyncTask, 5 * Constants.MILLIS_PER_SECOND, SYNC_INTERVAL);
    }

    @Override
    Mailbox instantiateMailbox(MailboxData data) throws ServiceException {
        return new OfflineMailbox(data);
    }

    public void sync() {
        sSyncTask.run();
    }


    private class SyncTask extends TimerTask {
        private boolean inProgress;
        private long lastSync = System.currentTimeMillis();

        @Override
        public void run() {
            if (inProgress || System.currentTimeMillis() - lastSync < MINIMUM_SYNC_INTERVAL)
                return;

            inProgress = true;
            try {
                for (String acctId : getAccountIds()) {
                    try {
                        Mailbox mbox = getMailboxByAccountId(acctId);
                        if (!(mbox instanceof OfflineMailbox))
                            continue;
                        OfflineMailbox ombx = (OfflineMailbox) mbox;

                        SyncState state = ombx.getSyncState();
                        if (state == SyncState.INITIAL) {
                            // FIXME: wiping the mailbox when detecting interrupted initial sync is bad
                            ombx.deleteMailbox();
                            mbox = getMailboxByAccountId(acctId);
                            if (!(mbox instanceof OfflineMailbox))
                                continue;
                            ombx = (OfflineMailbox) mbox;
                            state = ombx.getSyncState();
                        }
                        if (state == SyncState.BLANK) {
                            InitialSync.sync(ombx);
                        } else if (state == SyncState.INITIAL) {
//                          InitialSync.resume(ombx);
                            OfflineLog.offline.warn("detected interrupted initial sync; cannot recover at present: " + acctId);
                            continue;
                        }
                        DeltaSync.sync(ombx);
                        if (PushChanges.sync(ombx))
                            DeltaSync.sync(ombx);
                    } catch (ServiceException e) {
                        if (e.getCode().equals(ServiceException.PROXY_ERROR)) {
                            Throwable cause = e.getCause();
                            if (cause instanceof java.net.NoRouteToHostException)
                                OfflineLog.offline.debug("java.net.NoRouteToHostException: offline and unreachable account " + acctId, e);
                            else if (cause instanceof org.apache.commons.httpclient.ConnectTimeoutException)
                                OfflineLog.offline.debug("org.apache.commons.httpclient.ConnectTimeoutException: no connect after " + OfflineMailbox.SERVER_REQUEST_TIMEOUT_SECS + " seconds for account " + acctId, e);
                            else if (cause instanceof java.net.SocketTimeoutException)
                                OfflineLog.offline.info("java.net.SocketTimeoutException: read timed out after " + OfflineMailbox.SERVER_REQUEST_TIMEOUT_SECS + " seconds for account " + acctId, e);
                            else
                                OfflineLog.offline.warn("error communicating with account " + acctId, e);
                        } else {
                            OfflineLog.offline.warn("failed to sync account " + acctId, e);
                        }
                    }
                }
                lastSync = System.currentTimeMillis();
            } finally {
                inProgress = false;
            }
        }
    }
}
