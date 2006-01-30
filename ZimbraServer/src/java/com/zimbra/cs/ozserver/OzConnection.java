/*
 * ***** Begin LICENSE BLOCK *****
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
 * Portions created by Zimbra are Copyright (C) 2005 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s): 
 * 
 * ***** END LICENSE BLOCK *****
 */
package com.zimbra.cs.ozserver;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.SelectionKey;
import java.nio.channels.SocketChannel;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.apache.commons.logging.Log;

import com.zimbra.cs.util.ZimbraLog;

public class OzConnection {

    private OzConnectionHandler mConnectionHandler;

    private Log mLog;

    private OzServer mServer;
    
    private SocketChannel mChannel;
    
    private OzMatcher mMatcher;

    private SelectionKey mSelectionKey; 

    private static AtomicInteger mIdCounter = new AtomicInteger(0);
    
    private static AtomicInteger mTaskCounter = new AtomicInteger(0);
    
    private final int mId;

    private final String mIdString;
    
    private final String mRemoteAddress;

    private final Object mLock = new Object();
    
    private boolean mClosed;
    
    private final boolean mDebug;
    
    private final boolean mTrace;

    private boolean mReadPending;
    
    private boolean mWritePending;
    
    private ConnectTask mConnectTask;
    
    private DisconnectTask mDisconnectTask;
    
    private ReadTask mReadTask;
    
    private WriteTask mWriteTask;

    private ByteBuffer mReadBuffer;
    
    OzConnection(OzServer server, SocketChannel channel) throws IOException {
        mId = mIdCounter.incrementAndGet();
        mIdString = Integer.toString(mId);

        mRemoteAddress = channel.socket().getInetAddress().getHostAddress();
        mChannel = channel;
        mServer = server;
        mClosed = false;
        mLog = mServer.getLog();
        mDebug = mLog.isDebugEnabled();
        mTrace = mLog.isTraceEnabled();
        mSelectionKey = channel.register(server.getSelector(), 0, this); 

        addFilter(new OzPlainFilter(), true);

        mConnectTask = new ConnectTask();
        mReadTask = new ReadTask();
        mWriteTask = new WriteTask();
        mDisconnectTask = new DisconnectTask();
        
        mConnectTask.schedule();
    }

    private List<OzFilter> mFilters = new ArrayList<OzFilter>();
    
    private AtomicInteger mFilterChangeId = new AtomicInteger();
    
    /**
     * Adds an IO filter at the top of the filter stack. IO model is a stack of
     * filters, with the top most filter in the stack handling all inbound
     * network packets and outbound application packets, while the bottom most
     * filter (the plain filter) handles all inbound application packets and
     * outbound network packets. The bottom most filter is builtin to the
     * framework and can not be removed.
     */
    public void addFilter(OzFilter filter) {
        addFilter(filter, false);
    }
    
    private void addFilter(OzFilter filter, boolean plainFilter) {
        synchronized (mLock) {
            OzFilter nextFilter = null;
            
            if (!plainFilter) {
                nextFilter = mFilters.get(0);
            }
            
            int prefSize = filter.getPreferredReadBufferSize();
            if (mReadBuffer == null || mReadBuffer.capacity() < filter.getPreferredReadBufferSize()) { 
                mReadBuffer = ByteBuffer.allocate(prefSize);
            }
            mFilters.add(0, filter);
            filter.setNextFilter(nextFilter);
            mFilterChangeId.incrementAndGet();
        }
    }

    /**
     * Removes the top most filter.
     */
    public OzFilter removeFilter() {
        synchronized (mLock) {
            assert mFilters.size() != 0; // must always have atleast plain filter present.
            if (mFilters.size() == 1) {
                throw new IllegalStateException("attempt to remove plain filter");
            }
            mFilterChangeId.incrementAndGet();
            OzFilter removedFilter = mFilters.remove(0);
            removedFilter.setNextFilter(null);
            return removedFilter;
        }
    }
    
    public void close() {
        synchronized (mLock) {
            try {
                mFilters.get(0).close();
            } catch (Throwable t) {
                cleanupChannel(CleanupReason.ABRUPT);
            }
        }
    }

    /**
     * Notify the connection handler object to terminate this connection. 
     */
    void cleanup() { 
    	try {
    		mConnectionHandler.handleDisconnect();
    	} catch (Throwable t) {
    		cleanupChannel(CleanupReason.ABRUPT);
    	}
    }
    
    /**
	 * Close the underlying IO channel. Under normal circumstances this method
	 * is called by the plain filter. However, when things go wrong, this method
	 * can be called to shut down atleast the descriptor. Try as much as
	 * possible to call cleanup first.
	 */
    enum CleanupReason { NORMAL, ABRUPT; }
    
    private void cleanupChannel(CleanupReason reason) {
        try {
        	mLog.info("channel cleanup - " + reason);

    		synchronized (mLock) {
    			if (mClosed) {
    				if (mDebug) mLog.debug("duplicate close detected");
    				return;
    			}
    		}

        	cancelIdleNotifications();
        } finally {
        	try {
        		mChannel.close();
            	if (mDebug) mLog.debug("closed channel");
        	} catch (IOException ioe) {
                mLog.warn("exception closing channel, ignoring and continuing", ioe);
        	}
        	mClosed = true;
        	mServer.wakeupSelector(); // to make the close immediate
        	if (mDebug) mLog.debug("wokeup selector");
        }
    }

    void addToNDC() {
        //ZimbraLog.addToContext("t", Thread.currentThread().getName());
        ZimbraLog.addIpToContext(getRemoteAddress());
        ZimbraLog.addConnectionIdToContext(getIdString());
    }

    void clearFromNDC() {
        ZimbraLog.clearContext();
    }
    
    public void enableReadInterest() {
        synchronized (mLock) {
            if (mReadPending) {
                if (mTrace) mLog.trace("noop enable read interest - read already pending");
                return;
            }
            if (mClosed) {
                if (mTrace) mLog.trace("noop enable read interest - channel already closed"); 
                return;
            }

            synchronized (mSelectionKey) {
                int iops = mSelectionKey.interestOps();
                mSelectionKey.interestOps(iops | SelectionKey.OP_READ);
                OzUtil.logKey(mLog, mSelectionKey, "enabled read interest");
            }

            mServer.wakeupSelector();
            mReadPending = true;
        }
    }

    private void disableReadInterest() {
    	synchronized (mSelectionKey) {
    		int iops = mSelectionKey.interestOps();
    		mSelectionKey.interestOps(iops & (~SelectionKey.OP_READ));
    		OzUtil.logKey(mLog, mSelectionKey, "disabled read interest");
    	}
    }   
    
    private void enableWriteInterest() {
        synchronized (mLock) {
            if (mWritePending) {
                if (mTrace) mLog.trace("skipping enable write interest - write already pending");
                return;
            }
            if (!mChannel.isOpen()) {
                if (mTrace) mLog.trace("skipping enable write interest - channel already closed");
                return;
            }
            synchronized (mSelectionKey) {
                int iops = mSelectionKey.interestOps();
                mSelectionKey.interestOps(iops | SelectionKey.OP_WRITE);
                OzUtil.logKey(mLog, mSelectionKey, "enabled write interest"); 
            }
            mServer.wakeupSelector();
            mWritePending = true;
        }
    }
    
    private void disableWriteInterest() {
    	synchronized (mSelectionKey) {
    		int iops = mSelectionKey.interestOps();
    		mSelectionKey.interestOps(iops & (~SelectionKey.OP_WRITE));
    		OzUtil.logKey(mLog, mSelectionKey, "disabled write interest"); 
    	}
    }
    
    OzConnectionHandler getConnectionHandler() {
        return mConnectionHandler;
    }
    
    public void setMatcher(OzMatcher matcher) {
        mMatcher = matcher;
    }

    public OzMatcher getMatcher() {
        return mMatcher;
    }

    private abstract class Task implements Runnable {
        private String mName;
     
        Task(String name) {
            mName = name;
        }

        void schedule() {
            if (mDebug) mLog.debug("scheduling " + mName + " task");
            mServer.execute(this);
        }
        
        public void run() {
    		if (mDebug) {
    			ZimbraLog.addToContext("op", mName);
    			ZimbraLog.addToContext("opid", new Integer(mTaskCounter.incrementAndGet()).toString());
    		}
    		addToNDC();
    		if (mDebug) mLog.debug("starting " + mName);
            synchronized (mLock) {
            	try {
            		if (mClosed) {
            			if (mDebug) mLog.debug("connection already closed, aborting " + mName);
            			return;
            		}
            		doTask();
            	} catch (Throwable t) {
            		mLog.warn("exception occurred during " + mName + " task", t);
            		cleanup();
            	} finally {
            		if (mDebug) mLog.debug("finished " + mName);
            		clearFromNDC();
            	}
            }
        }
        
        protected abstract void doTask() throws IOException;
    }
    
    private class ConnectTask extends Task {
        ConnectTask() { super("connect"); }
        
        protected void doTask() throws IOException {
        	mLog.info("connected");
        	mConnectionHandler = mServer.newConnectionHandler(OzConnection.this);
        	mConnectionHandler.handleConnect();
        }
    }
    
    private class DisconnectTask extends Task {
        DisconnectTask() { super("disconnect"); }
    	
        protected void doTask() {
        	mConnectionHandler.handleDisconnect();
        }
    }
    
    private class ReadTask extends Task {
        ReadTask() { super("read"); }

        public void doTask() throws IOException {
                int bytesRead = -1;
                ByteBuffer rbb = mReadBuffer;
                if (mDebug) mLog.debug("obtained buffer " + OzUtil.intToHexString(rbb.hashCode(), 0, ' '));

                if (mTrace) mLog.trace(OzUtil.byteBufferDebugDump("read buffer before channel read", rbb, true));
                bytesRead = mChannel.read(rbb);
                mReadPending = false;
                if (mTrace) mLog.trace(OzUtil.byteBufferDebugDump("read buffer after channel read", rbb, true));
                
                assert(bytesRead == rbb.position());
                
                if (bytesRead == -1) {
                    if (mDebug) mLog.debug("channel read detected that client closed connection");
                    mDisconnectTask.schedule();
                    return;
                }
                
                if (bytesRead == 0) {
                    mLog.warn("got no bytes on supposedly read ready channel");
                    return;
                }
                
                mFilters.get(0).read(rbb);
        }
    }

    void doReadReady() throws IOException {
        synchronized (mIdleGuard) {
            // Only a client producing input that this server can read is
            // considered a busy connection.
            mIdle = false;
        }
        // This method runs in the server thread.  Note that we disable
        // read interest here, and not in the worker thread, so that
        // we don't get another ready notification before the worker
        // will get a chance to run and disable read interest.
        disableReadInterest();
        mReadTask.schedule();
    }

    void doWriteReady() throws IOException {
        disableWriteInterest();
        mWriteTask.schedule();
    }

    private class WriteTask extends Task {
        WriteTask() { super("write"); }
        
        protected void doTask() throws IOException {
        	boolean allWritten;
        	allWritten = channelWrite();
        	if (allWritten) {
        		for (OzFilter filter : mFilters) {
        			filter.writeCompleted();
        		}
        	}
        }
    }

    private class OzPlainFilter extends OzFilter {

        public int getPreferredReadBufferSize() {
            return mServer.getReadBufferSizeHint();
        }

        public ByteBuffer read(ByteBuffer rbb) throws IOException {
            if (mTrace) mLog.trace("plain filter: rbb before flip: " + rbb);
            rbb.flip();
            if (mTrace) mLog.trace("plain filter: rbb after flip: " + rbb);
            
            int filterChangeId = mFilterChangeId.get();
            
            // We may have read more than one PDU 
            while (rbb.hasRemaining()) {
                ByteBuffer pdu = rbb.duplicate();
                int initialPosition = rbb.position();
                
                if (mTrace) mLog.trace(OzUtil.byteBufferDebugDump("plain filter: invoking matcher", rbb, false));
                boolean matched = mMatcher.match(rbb);
                if (mTrace) mLog.trace(OzUtil.byteBufferDebugDump("plain filter: after matcher", rbb, false));
                
                if (mDebug) mLog.debug("plain filter: match returned " + matched);
                
                if (!matched) {
                    rbb.position(initialPosition);
                    break;
                }
                    
                pdu.position(initialPosition);
                pdu.limit(rbb.position());
                if (mTrace) mLog.trace(OzUtil.byteBufferDebugDump("plain filter: input matched", pdu, false));
                mConnectionHandler.handleInput(pdu, true);

                // The earlier call might have resulted in a filter being added
                // to the stack. Check for that condition and bubble back up and
                // refilter whatever else remains in the buffer throug the new
                // filter.
                if (mFilterChangeId.get() != filterChangeId) {
                    mLog.info("plain filter: filter stack has changed, refiltering");
                    rbb.compact();
                    mFilters.get(0).read(rbb);
                    return rbb;
                }
            }
            
            // Just spill all the unmatched stuff to the handler
            if (rbb.hasRemaining()) {
                if (mTrace) mLog.trace(OzUtil.byteBufferDebugDump("plain filter: input unmatched", rbb, false));
                mConnectionHandler.handleInput(rbb, false);
                enableReadInterest();
            }
            
            rbb.clear();
            return null;
        }

        public void write(ByteBuffer wbb, boolean flush) throws IOException {
            synchronized (mLock) {
                if (mTrace) mLog.trace(OzUtil.byteBufferDebugDump("plain filter: write: flush=" + flush, wbb, false));
                mWriteBuffers.add(wbb);
                if (flush) {
                    enableWriteInterest();
                }
            }
        }

        public void writeCompleted() throws IOException {
        }

        public void close() throws IOException {
            synchronized (mLock) {
                if (mClosed) {
                    return;
                }
                
                disableReadInterest();
                
                mCloseAfterWrite = true;
                
                if (mWriteBuffers.isEmpty()) {
                    cleanupChannel(CleanupReason.NORMAL);
                }
            }
        }

        public void flush() throws IOException {
            synchronized (mLock) {
                if (mTrace) mLog.trace("plain filter: flush called");
                if (!mWriteBuffers.isEmpty()) {
                    enableWriteInterest();
                }
            }
        }
    }

    private int mIdleMillis;
    
    private Object mIdleGuard = new Object();
    
    private boolean mIdle = true;
    
    private ScheduledFuture<?> mIdleTaskHandle;
    
    private IdleTask mIdleTask = new IdleTask();
    
    /**
     * This task does NOT get scheduled in the server thread pool - it runs in
     * the periodically scheduled thread pool thread.
     */
    private class IdleTask extends Task {
        public IdleTask() { super("idle"); }
        
        public void schedule() {
            // idle task is run from the timer thread (also this
            // method is never called - Idle task is a sub-class of
            // Task just so we can get log context when it runs.
        }
        
        protected void doTask() throws IOException {
            synchronized (mIdleGuard) {
                if (mIdle) {
                	mLog.info("connection has been idle");
                	mConnectionHandler.handleIdle();
                } else {
                    if (mDebug) mLog.debug("idle task - connection has been busy");
                    mIdle = true; // prove me wrong by setting this to false before I run again.
                }
            }
        }
    }

    private static final ScheduledThreadPoolExecutor mIdleExecutor = new ScheduledThreadPoolExecutor(1, new IdleReaperThreadFactory());

    private static class IdleReaperThreadFactory implements ThreadFactory {
        public Thread newThread(Runnable runnable) {
            Thread t = new Thread(runnable, "OzIdleConnectionTimer");
            t.setDaemon(true);
            t.setPriority(Thread.NORM_PRIORITY);
            return t;
        }
    }

    /**
     * If there has been no input from the client in this many milliseconds,
     * invoke the handleIdle method.
     */
    public void setIdleNotifyTime(int millis) {
        synchronized (mIdleGuard) {
            if (mIdleTaskHandle != null && mIdleMillis == millis) {
                return;
            }
            cancelIdleNotifications(); // Get rid of current notifications
            if (mDebug) mLog.debug("creating idle notifier at rate of " + millis + "ms");
            mIdleTaskHandle = mIdleExecutor.scheduleAtFixedRate(mIdleTask, millis, millis, TimeUnit.MILLISECONDS);
        }
    }
    
    public void cancelIdleNotifications() {
        synchronized (mIdleGuard) {
            if (mIdleTaskHandle != null) {
                if (mDebug) mLog.debug("cancelling idle timer");
                mIdleTaskHandle.cancel(false);
                boolean removed = mIdleExecutor.remove((Runnable)mIdleTaskHandle);
                if (removed) {
                	if (mDebug) mLog.debug("idle timer removed");
                } else {
                	mLog.warn("idle timer not removed");
                }
                mIdleTaskHandle = null;
            }
        }
    }

    public int getId() {
        return mId;
    }

    public String getIdString() {
        return mIdString;
    }
    
    public String getRemoteAddress() {
        return mRemoteAddress;
    }
    
    /**
     * Buffers that need to written out, when write side of the connection is ready.
     */
    List<ByteBuffer> mWriteBuffers = new LinkedList<ByteBuffer>();

    /**
     * Always looked at with mWriteBuffers locked.
     */
    private boolean mCloseAfterWrite = false;

    public void writeAsciiWithCRLF(String data) throws IOException {
        writeAsciiWithCRLF(data, true);
    }
    
    public void writeAsciiWithCRLF(String data, boolean flush) throws IOException {
        byte[] bdata = new byte[data.length() + 2];
        int n = data.length();
        for (int i = 0; i < n; i++) {
            int ch = data.charAt(i);
            if (ch > 127) {
                throw new IllegalArgumentException("expecting ASCII got " + ch + " at " + i + " in '" + data + "'");
            }
            bdata[i] = (byte)ch;
        }
        bdata[n] = OzByteArrayMatcher.CR;
        bdata[n+1] = OzByteArrayMatcher.LF;
        write(ByteBuffer.wrap(bdata), flush);
    }

    public void write(ByteBuffer wbb) throws IOException {
        write(wbb, true);
    }

    private boolean channelWrite() throws IOException {
        int totalWritten = 0;
        boolean allWritten = true;
        for (Iterator<ByteBuffer> iter = mWriteBuffers.iterator(); iter.hasNext(); iter.remove()) {
            ByteBuffer data = iter.next();
            assert(data != null);
            assert(data.hasRemaining());

            if (mTrace) mLog.trace(OzUtil.byteBufferDebugDump("channel write", data, false));
            int wrote = mChannel.write(data);
            totalWritten += wrote;
            if (mDebug) mLog.trace("channel wrote=" + wrote + " totalWritten=" + totalWritten);
            
            if (data.hasRemaining()) {
                mWritePending = false;
                // If not all data was written, stop - we will write again
                // when we get called at a later time when available for
                // write. Put the buffer back in the list so whatever is
                // remaining can be written later.  Note that we do not
                // clear write interest here.
                if (mDebug) mLog.debug("incomplete write, adding buffer back");
                allWritten = false;
                enableWriteInterest();
                break;
            }
        }

        if (totalWritten == 0) mLog.warn("wrote no bytes to a write ready channel");
        
        if (allWritten) {
            mWritePending = false;

            if (mCloseAfterWrite) {
                cleanupChannel(CleanupReason.NORMAL);
            }
        }            
        
        return allWritten;
    }

    public void write(ByteBuffer wbb, boolean flush) throws IOException {
        // TODO even if flush has not been requested, we should flush if we
        // have too much data!
        synchronized (mLock) {
            mFilters.get(0).write(wbb, flush);
        }
    }

    public void flush() throws IOException {
        synchronized (mLock) {
            mFilters.get(0).flush();
        }
    }
    
    public boolean isWritePending() {
        synchronized (mLock) {
            return mWritePending;
        }
    }
    
    private Map<String, String> mProperties = new HashMap<String, String>();
    
    public String getProperty(String key, String defaultValue) {
        synchronized (mProperties) {
            String result = mProperties.get(key);
            if (result == null) {
                result = mServer.getProperty(key, defaultValue);
            }
            return result;
        }
    }
    
    public void setProperty(String key, String value) {
        synchronized (mProperties) {
            mProperties.put(key, value);
        }
    }
}
