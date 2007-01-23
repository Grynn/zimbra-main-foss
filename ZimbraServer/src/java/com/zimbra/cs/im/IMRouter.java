/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 * 
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 ("License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.zimbra.com/license
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is: Zimbra Collaboration Suite Server.
 * 
 * The Initial Developer of the Original Code is Zimbra, Inc.
 * Portions created by Zimbra are Copyright (C) 2005, 2006 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s): 
 * 
 * ***** END LICENSE BLOCK *****
 */
package com.zimbra.cs.im;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.LinkedBlockingQueue;

import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.Provisioning.AccountBy;
import com.zimbra.cs.mailbox.Mailbox;
import com.zimbra.cs.mailbox.MailboxManager;
import com.zimbra.cs.mailbox.Mailbox.OperationContext;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.ZimbraLog;

public class IMRouter implements Runnable {
    private static final IMRouter sRouter = new IMRouter();
    private Map<IMAddr, IMPersona> mBuddyListMap = new ConcurrentHashMap<IMAddr, IMPersona>();
    private LinkedBlockingQueue<IMEvent> mQueue = new LinkedBlockingQueue<IMEvent>();
    private boolean mShutdown = false;
    private IMRouter() { new Thread(this).start(); }
    
    public static IMRouter getInstance() { return sRouter; }
    
    /**
     * @param octxt
     * @param addr
     * @return
     * @throws ServiceException
     */
    public IMPersona findPersona(OperationContext octxt, IMAddr addr) throws ServiceException 
    {
        // first, just check the map
        IMPersona toRet = mBuddyListMap.get(addr);
        
        if (toRet == null) {
            // okay, maybe it's an alias -- get the account and resolve it to the cannonical name
            if (toRet == null) {
                Account acct = Provisioning.getInstance().get(AccountBy.name, addr.getAddr());            
                String canonName = acct.getName();
                addr = new IMAddr(canonName);
                toRet = mBuddyListMap.get(addr);
            }
            if (toRet == null) {
                Mailbox mbox = MailboxManager.getInstance().getMailboxByAccount(Provisioning.getInstance().get(AccountBy.name, addr.getAddr()));
                toRet = loadPersona(octxt, mbox, addr);
            }
        }
        return toRet;
    }
    
    /**
     * @param octxt
     * @param mbox
     * @return
     * @throws ServiceException
     */
    public IMPersona findPersona(OperationContext octxt, Mailbox mbox) throws ServiceException 
    {
        IMAddr addr = new IMAddr(mbox.getAccount().getName());
        
        // first, just check the map
        IMPersona toRet = mBuddyListMap.get(addr);
        
        if (toRet == null) {
            toRet = loadPersona(octxt, mbox, addr); 
        }
        return toRet;
    }
    
    
    private synchronized IMPersona loadPersona(OperationContext octxt, Mailbox mbox, IMAddr addr) throws ServiceException 
    {
        IMPersona toRet = mBuddyListMap.get(addr);
        if (toRet == null) {
            toRet = IMPersona.loadPersona(octxt, mbox, addr);
            mBuddyListMap.put(addr, toRet);
        }
        return toRet;
    }
    
    
    /**
     * Post an event to the router's asynchronous execution queue.  The event
     * will happen at a later time and will be run without any locks held, to
     * avoid deadlock issues.
     * 
     * @param event
     */
    public synchronized void postEvent(IMEvent event) {
        assert(!mShutdown);
        mQueue.add(event);
    }
    
    /**
     * Scrub the asynchronous execution queue.  
     * @see java.lang.Runnable#run()
     */
    public void run() {
        while (!mShutdown) {
            try {
                IMEvent event = mQueue.take();
//                ZimbraLog.im.debug("Executing IMEvent: "+ event);
                event.run();
            } catch (InterruptedException ex) {
                
            } catch (Throwable e) {
                e.printStackTrace();
            } 
        }
        
        for (IMEvent event = mQueue.poll(); event != null; event = mQueue.poll()) {
            try {
                event.run();
            } catch(ServiceException ex) {
                ex.printStackTrace();
            }
        }
    }
    
    /**
     * 
     */
    public synchronized void shutdown() {
        mShutdown = true;

        // force the queue to wakeup...
        mQueue.add(new IMNullEvent());
        
    }
}
