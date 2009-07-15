/*
 * ***** BEGIN LICENSE BLOCK *****
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
 * ***** END LICENSE BLOCK *****
 */
package com.zimbra.cs.store;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;

import javax.mail.internet.SharedInputStream;

import com.zimbra.common.util.Log;
import com.zimbra.common.util.LogFactory;

public class BlobInputStream extends InputStream
implements SharedInputStream {
    
    private static final Log sLog = LogFactory.getLog(BlobInputStream.class);

    /**
     * The file that stores the content of this stream.  Only the parent
     * stream stores the file.  All child objects get the path from the top-level
     * parent.
     */
    private File mFile;
    
    // All indexes are relative to the file, not relative to mStart/mEnd.
    
    /**
     * Position of the last call to {@link #mark}.
     */
    private Long mMarkPos;
    
    /**
     * Position of the next byte to read.
     */
    private long mPos;
    
    /**
     * Maximum bytes that can be read before reset() stops working. 
     */
    private int mMarkReadLimit;
    
    /**
     * Start index of this stream (inclusive).
     */
    private long mStart;
    
    /**
     * End index of this stream (exclusive).
     */
    private long mEnd;

    private BlobInputStream mRoot;

    /**
     * Constructs a <tt>BlobInputStream</tt> that reads an entire blob.
     */
    public BlobInputStream(Blob blob)
    throws IOException {
        this(blob.getFile(), null, null, null);
    }

    /**
     * Constructs a <tt>BlobInputStream</tt> that reads an entire file.
     */
    public BlobInputStream(File file)
    throws IOException {
        this(file, null, null, null);
    }

    /**
     * Constructs a <tt>BlobInputStream</tt> that reads a section of a file.
     * @param file the file
     * @param start starting index, or <tt>null</tt> for beginning of file
     * @param end ending index (exclusive), or <tt>null</tt> for end of file
     */
    public BlobInputStream(File file, Long start, Long end)
    throws IOException {
        this(file, start, end, null);
    }
    
    /**
     * Constructs a <tt>BlobInputStream</tt> that reads a section of a file.
     * @param file the file.  Only used if <tt>parent</tt> is <tt>null</tt>.
     * @param start starting index, or <tt>null</tt> for beginning of file
     * @param end ending index (exclusive), or <tt>null</tt> for end of file
     * @param parent the parent stream, or <tt>null</tt> if this is the first stream.
     * If non-null, the file from the parent is used.
     */
    private BlobInputStream(File file, Long start, Long end, BlobInputStream parent)
    throws IOException {
        if (parent == null) {
            // Top-level stream.
            mFile = file;
            mRoot = this;
        } else {
            // New stream.  Get settings from the parent and add this stream to the group.
            mRoot = parent.mRoot;
            file = mRoot.mFile;
        }
        
        if (!file.exists()) {
            throw new IOException(file.getPath() + " does not exist.");
        }
        if (start != null && end != null && start > end) {
            String msg = String.format("Start index %d for file %s is larger than end index %d", start, file.getPath(), end);
            throw new IOException(msg);
        }
        if (start == null) {
            mStart = 0;
            mPos = 0;
        } else {
            mStart = start;
            mPos = start;
        }
        long dataLength = getFileDescriptorCache().getLength(file.getPath());
        if (end == null) {
            mEnd = dataLength;
        } else {
            if (end > dataLength) {
                String msg = String.format("End index %d for %s exceeded file size %d", end, file.getPath(), dataLength);
                throw new IOException(msg);
            }
            mEnd = end;
        }

        sLog.debug("Created %s: file=%s, length=%d, uncompressed length=%d, start=%d, end=%d, parent=%s, mStart=%d, mEnd=%d.",
            this, file.getPath(), file.length(), dataLength, start, end, parent, mStart, mEnd);
    }

    private static FileDescriptorCache mFileDescriptorCache;

    public static void setFileDescriptorCache(FileDescriptorCache fdcache) {
        mFileDescriptorCache = fdcache;
    }

    public static FileDescriptorCache getFileDescriptorCache() {
        return mFileDescriptorCache;
    }
    
    /**
     * Closes the file descriptor referenced by this stream.
     */
    public void closeFile() {
        getFileDescriptorCache().close(mRoot.mFile.getPath());
    }

    /**
     * Updates this stream group with a new file location.
     */
    public void fileMoved(File newFile) {
        closeFile();
        mRoot.mFile = newFile;
    }
    
    ////////////// InputStream methods //////////////
    
    @Override
    public int available() {
        return (int) (mEnd - mPos);
    }

    @Override
    public void close() {
        mPos = mEnd;
    }

    @Override
    public synchronized void mark(int readlimit) {
        mMarkPos = mPos;
        mMarkReadLimit = readlimit;
    }

    @Override
    public boolean markSupported() {
        return true;
    }

    @Override
    public int read() throws IOException {
        if (mPos >= mEnd) {
            return -1;
        }
        int retVal = getFileDescriptorCache().read(mRoot.mFile.getPath(), mPos);
        if (retVal >= 0) {
            mPos++;
        } else {
            close();
        }
        return retVal;
    }
    
    @Override
    public int read(byte[] b, int off, int len) throws IOException {
        if (mPos >= mEnd) {
            return -1;
        }
        if (len <= 0) {
            return 0;
        }
        
        // Make sure we don't read past the endpoint passed to the constructor
        len = (int) Math.min(len, mEnd - mPos);
        int numRead = getFileDescriptorCache().read(mRoot.mFile.getPath(), mPos, b, off, len);
        if (numRead > 0) {
            mPos += numRead;
        } else {
            close();
        }
        return numRead;
    }

    @Override
    public synchronized void reset() throws IOException {
        if (mMarkPos == null) {
            throw new IOException("reset() called before mark()");
        }
        if (mPos - mMarkPos > mMarkReadLimit) {
            throw new IOException("Mark position was invalidated because more than " + mMarkReadLimit + " bytes were read.");
        }
        mPos = mMarkPos;
    }

    @Override
    public long skip(long n) {
        if (n <= 0) {
            return 0;
        }
        long newPos = Math.min(mPos + n, mEnd);
        long numSkipped = newPos - mPos;
        mPos = newPos;
        return numSkipped;
    }

    @Override
    /**
     * Ensures that the file descriptor gets closed when this object is garbage
     * collected.  We generally don't like finalizers, but we make an exception
     * in this case because we have no control over how JavaMail uses BlobInputStream. 
     */
    protected void finalize() throws Throwable {
        super.finalize();
        close();
    }

    ////////////// SharedInputStream methods //////////////

    public long getPosition() {
        // If this is a substream, return the position relative to the
        // starting point.  If this is the main stream, mStart = 0.
        return mPos - mStart;
    }

    public InputStream newStream(long start, long end) {
        if (start < 0) {
            throw new IllegalArgumentException("start cannot be less than 0");
        }
        // The start and end markers are relative to this
        // stream's view of the file, not necessarily the entire file.
        // Calculate the actual start/end offsets in the file.
        start += mStart;
        if (end < 0) {
            end = mEnd;
        } else {
            end += mStart;
        }
        
        BlobInputStream newStream = null;
        try {
            newStream = new BlobInputStream(null, start, end, this);
        } catch (IOException e) {
            sLog.warn("Unable to create substream for %s", mRoot.mFile.getPath(), e);
        }
        
        return newStream;
    }
}
