/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2009 Zimbra, Inc.
 * 
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.2 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * ***** END LICENSE BLOCK *****
 */

package com.zimbra.cs.store;

import java.io.File;
import java.io.IOException;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.stats.Counter;
import com.zimbra.common.util.FileUtil;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.Server;
import com.zimbra.cs.localconfig.DebugConfig;

/**
 * Caches file descriptors to blobs in the mail store.  If the blob is compressed,
 * uses {@link UncompressedFileCache} to access the uncompressed data.  Cache entries
 * that reference uncompressed blobs keep the file descriptor open until {@link #close}
 * is called or the cache entry is aged out.
 */
public class FileDescriptorCache
{
    // Create the file cache with default LinkedHashMap values, but sorted by last access time.
    private LinkedHashMap<String, SharedFile> mCache = new LinkedHashMap<String, SharedFile>(16, 0.75f, true);
    private int mMaxSize = 1000;
    private UncompressedFileCache<String> mUncompressedFileCache;
    private Counter mHitRate = new Counter();

    public FileDescriptorCache(UncompressedFileCache<String> uncompressedCache) {
        mUncompressedFileCache = uncompressedCache;
    }
    
    UncompressedFileCache<String> getUncompressedFileCache() {
        return mUncompressedFileCache;
    }
    
    public synchronized FileDescriptorCache setMaxSize(int maxSize) {
        if (maxSize < 0)
            throw new IllegalArgumentException("maxSize value of " + maxSize + " is invalid (must be at least 0)");

        mMaxSize = maxSize;
        mHitRate.reset(); // Recalculate hit rate based on the new size.
        pruneIfNecessary();
        return this;
    }

    public FileDescriptorCache loadSettings() throws ServiceException {
        Server server = Provisioning.getInstance().getLocalServer(); 
        int uncompressedMaxFiles = server.getMailUncompressedCacheMaxFiles();
        long uncompressedMaxBytes = server.getMailUncompressedCacheMaxBytes();
        int fileDescriptorCacheSize = server.getMailFileDescriptorCacheSize();
    
        ZimbraLog.store.info("Loading FileDescriptorCache settings: %s=%d, %s=%d, %s=%d.",
                Provisioning.A_zimbraMailUncompressedCacheMaxFiles, uncompressedMaxFiles,
                Provisioning.A_zimbraMailUncompressedCacheMaxBytes, uncompressedMaxBytes,
                Provisioning.A_zimbraMailFileDescriptorCacheSize, fileDescriptorCacheSize);

        setMaxSize(fileDescriptorCacheSize);
        mUncompressedFileCache.setMaxBytes(uncompressedMaxBytes);
        mUncompressedFileCache.setMaxFiles(uncompressedMaxFiles);

        return this;
    }


    /**
     * Reads one byte from the specified file.
     */
    public int read(String path, long rawSize, long fileOffset)
    throws IOException {
        SharedFile file = getSharedFile(path, rawSize);
        int retVal = file.read(fileOffset);
        closeIfPruned(path, file);
        return retVal;
    }
    
    /**
     * Reads from the specified file.
     */
    public int read(String path, long rawSize, long fileOffset, byte[] buf, int bufferOffset, int len)
    throws IOException {
        SharedFile file = getSharedFile(path, rawSize);
        int numRead = file.read(fileOffset, buf, bufferOffset, len);
        closeIfPruned(path, file);
        return numRead;
    }
    
    private synchronized void closeIfPruned(String path, SharedFile file)
    throws IOException {
        if (!mCache.containsKey(path)) {
            // Another thread pruned this file from the cache.
            file.close();
        }
    }
    
    /**
     * Returns the existing cache entry or creates a new one.
     */
    private SharedFile getSharedFile(String path, long rawSize)
    throws IOException {
        SharedFile sharedFile = null;
        synchronized (this) {
            sharedFile = mCache.get(path);
        }
        
        if (sharedFile == null) {
            mHitRate.increment(0);
            File file = new File(path);
            if (file.length() != rawSize && FileUtil.isGzipped(file)) {
                ZimbraLog.store.debug("Adding file descriptor cache entry for %s from the uncompressed file cache.", path);
                sharedFile = mUncompressedFileCache.get(path, new File(path), !DebugConfig.disableMessageStoreFsync);
            } else {
                ZimbraLog.store.debug("opening new file descriptor for " + path);
                sharedFile = new SharedFile(file);
            }
            synchronized (this) {
                mCache.put(path, sharedFile);
            }
            pruneIfNecessary();
        } else {
            mHitRate.increment(100);
        }
        
        return sharedFile;
    }
    
    /**
     * Closes the file descriptor to the given file.  Does nothing if the file
     * descriptor is not in the cache.
     */
    public synchronized void close(String path) {
        SharedFile file = mCache.remove(path); 
        
        if (file != null) {
            ZimbraLog.store.debug("closing file descriptor for " + path);
            try {
                file.close();
            } catch (IOException e) {
                ZimbraLog.store.warn("unable to close file descriptor for " + path, e);
            }
        }
    }
    
    public int getSize() {
        return mCache.size();
    }
    
    public double getHitRate() {
        return mHitRate.getAverage();
    }
    
    private synchronized void pruneIfNecessary() {
        if (mCache.size() <= mMaxSize)
            return;

        Iterator<Map.Entry<String, SharedFile>> iEntries = mCache.entrySet().iterator();
        while (iEntries.hasNext() && mCache.size() > mMaxSize) {
            Map.Entry<String, SharedFile> mapEntry = iEntries.next();
            String path = mapEntry.getKey();
            SharedFile file = mapEntry.getValue();
            iEntries.remove();
            
            try {
                ZimbraLog.store.debug("closing file descriptor for " + path);
                file.close();
            } catch (IOException e) {
                ZimbraLog.store.warn("unable to close file descriptor for " + path, e);
            }
        }
    }
}
