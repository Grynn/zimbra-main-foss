/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2004, 2005, 2006, 2007 Zimbra, Inc.
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

/*
 * Created on 2004. 10. 13.
 */
package com.zimbra.cs.store;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

import com.zimbra.common.localconfig.LC;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.ByteUtil;
import com.zimbra.common.util.FileUtil;
import com.zimbra.common.util.Log;
import com.zimbra.common.util.LogFactory;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.localconfig.DebugConfig;
import com.zimbra.cs.mailbox.Mailbox;
import com.zimbra.cs.mailbox.MailboxBlob;
import com.zimbra.znative.IO;

/**
 * @author jhahm
 */
public class FileBlobStore extends StoreManager {

    private static final int BUFLEN = Math.max(LC.zimbra_store_copy_buffer_size_kb.intValue(), 1) * 1024;
    private static final int DEFAULT_DISK_STREAMING_THRESHOLD = 32 * 1024 * 1024;
    private static final int sDiskStreamingThreshold;

    static {
        int threshold = DEFAULT_DISK_STREAMING_THRESHOLD;
        try {
            threshold = Provisioning.getInstance().getLocalServer().getIntAttr(
                Provisioning.A_zimbraMailDiskStreamingThreshold, DEFAULT_DISK_STREAMING_THRESHOLD);
        } catch (ServiceException e) {
            ZimbraLog.store.warn("Unable to determine disk streaming threshold.  Using default of %d.",
                DEFAULT_DISK_STREAMING_THRESHOLD);
        }
        sDiskStreamingThreshold = threshold;
    }

    private UniqueFileNameGenerator mUniqueFilenameGenerator;

	FileBlobStore() throws Exception {
        mUniqueFilenameGenerator = new UniqueFileNameGenerator();
	}

	@Override public void startup() {
        long sweepMaxAgeMS =
            LC.zimbra_store_sweeper_max_age.intValue() * 60 * 1000;
        mSweeper = new IncomingDirectorySweeper(SWEEP_INTERVAL_MS,
                                                sweepMaxAgeMS);
        mSweeper.start();
	}

	@Override public void shutdown() {
	    if (mSweeper != null) {
        	mSweeper.signalShutdown();
        	try {
    			mSweeper.join();
    		} catch (InterruptedException e) {}
	    }
    }
    
    private static boolean onWindows() {
        String os = System.getProperty("os.name").toLowerCase();         
        return os.startsWith("win");     
    }     
    
    private static final boolean sOnWindows = onWindows();
    
    /**
     * Returns either the value of {@link Provisioning#A_zimbraMailDiskStreamingThreshold}
     * or <tt>32MB</tt>, if the attribute is not set.
     */
    public static int getDiskStreamingThreshold() {
        return sDiskStreamingThreshold;
    }

    @Override public String getUniqueIncomingPath(short volumeId) throws IOException, ServiceException {
        Volume volume = Volume.getById(volumeId);
        String incomingDir = volume.getIncomingMsgDir();
        String fname = mUniqueFilenameGenerator.getFilename();
        StringBuilder sb = new StringBuilder(incomingDir.length() + 1 + fname.length());
        sb.append(incomingDir).append(File.separator).append(fname);
        String path = sb.toString();
        File f = new File(path);
        ensureParentDirExists(f);
        return path;
    }
    
    @Override public Blob storeIncoming(InputStream in, int sizeHint, String path, short volumeId,
                                        StorageCallback callback, boolean storeAsIs)
    throws IOException, ServiceException {
        Volume volume = Volume.getById(volumeId);

        if (path == null)
            path = getUniqueIncomingPath(volumeId);
        else
            ensureParentDirExists(new File(path));
        File file = new File(path);
        Blob blob = new Blob(file, volumeId);
        MessageDigest digest;

        // Initialize streams and digest calculator.
        try {
            digest = MessageDigest.getInstance("SHA1");
        } catch (NoSuchAlgorithmException e) {
            throw ServiceException.FAILURE("", e);
        }
        DigestInputStream digestStream = new DigestInputStream(in, digest);
        FileOutputStream fos = new FileOutputStream(file);
        OutputStream out = fos;

        boolean compress =
            !storeAsIs && volume.getCompressBlobs() &&
            (sizeHint > volume.getCompressionThreshold() || sizeHint <= 0);
        
        if (compress) {
            out = new GZIPOutputStream(fos);
            blob.setCompressed(true);
        }

        // Write to the file.
        byte[] buffer = new byte[BUFLEN];
        int numRead = -1;
        int totalRead = 0;
        while ((numRead = digestStream.read(buffer)) >= 0) {
            out.write(buffer, 0, numRead);
            if (callback != null) {
                callback.wrote(blob, buffer, numRead);
            }
            totalRead += numRead;
        }
        if (!DebugConfig.disableMessageStoreFsync) {
            out.flush();
            fos.getChannel().force(true);
        }
        out.close();
        if (fos != out) {
            fos.close();
        }
        
        // Set the blob's digest and size.
        blob.setDigest(ByteUtil.encodeFSSafeBase64(digest.digest()));
        blob.setRawSize(totalRead);

        // If sizeHint wasn't given we may have compressed a blob that was under the compression
        // threshold.  Let's uncompress it.  This isn't really necessary, but uncompressing results
        // in behavior consistent with earlier ZCS releases.
        if (compress && totalRead <= volume.getCompressionThreshold()) {
            File temp = File.createTempFile(file.getName(), ".unzip.tmp", file.getParentFile());
            InputStream fin = null;
            OutputStream fout = null;
            try {
                fin = new GZIPInputStream(new FileInputStream(file));
                fout = new FileOutputStream(temp);
                ByteUtil.copy(fin, false, fout, false);
            } finally {
                ByteUtil.closeStream(fin);
                ByteUtil.closeStream(fout);
            }
            boolean deleted = file.delete();
            if (!deleted)
                throw new IOException("Unable to delete temp file " + file.getAbsolutePath());
            String srcPath = temp.getAbsolutePath();
            boolean renamed = temp.renameTo(file);
            if (!renamed)
                throw new IOException("Unable to rename " + srcPath + " to " + file.getAbsolutePath());
            blob.setCompressed(false);
        }

        if (ZimbraLog.store.isDebugEnabled()) {
            ZimbraLog.store.debug("Stored %s: data size=%d bytes, file size=%d bytes, volumeId=%d, isCompressed=%b",
                path, totalRead, blob.getFile().length(), file.length(), volumeId, blob.isCompressed());
        }
        return blob;
    }

    public MailboxBlob copy(Blob src, Mailbox destMbox,
                            int destMsgId, int destRevision,
                            short destVolumeId)
    throws IOException, ServiceException {
        String srcPath = src.getPath();
        File dest = getBlobFile(destMbox, destMsgId, destRevision,
                                destVolumeId, false);
        String destPath = dest.getAbsolutePath();
        ensureParentDirExists(dest);

        Volume volume = Volume.getById(destVolumeId);
        
        InputStream srcStream = getContent(src);
        if (srcStream == null)
            throw new IOException("MailboxBlob.copy(" + srcPath + "," + destPath + "): unable to read content from " + srcPath);

        boolean srcCompressed = srcStream instanceof GZIPInputStream;
        ByteUtil.closeStream(srcStream);
        
        boolean destCompressed = false;
        if (volume.getCompressBlobs()) {
            if (srcCompressed || src.getFile().length() <= volume.getCompressionThreshold()) {
                FileUtil.copy(src.getFile(), dest, !DebugConfig.disableMessageStoreFsync);
                destCompressed = srcCompressed;
            } else {
                FileUtil.compress(src.getFile(), dest, !DebugConfig.disableMessageStoreFsync);
                destCompressed = true;
            }
        } else {
            if (srcCompressed)
                FileUtil.uncompress(src.getFile(), dest, !DebugConfig.disableMessageStoreFsync);
            else
                FileUtil.copy(src.getFile(), dest, !DebugConfig.disableMessageStoreFsync);
        }

        if (ZimbraLog.store.isDebugEnabled()) {
            ZimbraLog.store.debug("Copied id=" + destMsgId +
                      " mbox=" + destMbox.getId() +
                      " oldpath=" + srcPath + 
                      " newpath=" + destPath);
        }

        Blob newBlob = new Blob(dest, destVolumeId);
        newBlob.setCompressed(destCompressed);
        MailboxBlob destMboxBlob =
            new MailboxBlob(destMbox, destMsgId, destRevision, newBlob);
        return destMboxBlob;
    }

    public MailboxBlob link(Blob src, Mailbox destMbox,
                            int destMsgId, int destRevision,
                            short destVolumeId)
    throws IOException, ServiceException {
        String srcPath = src.getPath();
		File dest = getBlobFile(destMbox, destMsgId, destRevision,
                                destVolumeId, false);
        String destPath = dest.getAbsolutePath();
		ensureParentDirExists(dest);

        if (destVolumeId == src.getVolumeId()) {
            try {
                IO.link(srcPath, destPath);
            } catch (IOException e) {
                // Did it fail because the destination file already exists?
                // This can happen if we stored a file (or link), and we failed to
                // commit (say because of a server crash), and a subsequent new
                // message gets the ID of uncommited message
                if (dest.exists()) {
                    File destBak = new File(destPath + ".bak");
                	ZimbraLog.store.warn("Destination file exists.  Backing up to " + destBak.getAbsolutePath());
                    if (destBak.exists()) {
                        String bak = destBak.getAbsolutePath();
                    	ZimbraLog.store.warn(bak + " already exists.  Deleting to make room for new backup file");
                        if (!destBak.delete()) {
                        	ZimbraLog.store.warn("Unable to delete " + bak);
                            throw e;
                        }
                    }
                    File destTmp = new File(destPath);
                    if (!destTmp.renameTo(destBak)) {
                        ZimbraLog.store.warn("Can't rename " + destTmp.getAbsolutePath() + " to .bak");
                        throw e;
                    }
                    // Existing file is now renamed to <file>.bak.
                    // Retry link creation.
                    IO.link(srcPath, destPath);
                } else
                    throw e;
            }
        } else {
        	// src and dest are on different volumes and can't be hard linked.
            // Do a copy instead.
            FileUtil.copy(src.getFile(), dest, !DebugConfig.disableMessageStoreFsync);
        }

        if (ZimbraLog.store.isDebugEnabled()) {
            ZimbraLog.store.debug("Linked id=" + destMsgId +
                      " mbox=" + destMbox.getId() +
                      " oldpath=" + srcPath + 
                      " newpath=" + destPath);
        }

		MailboxBlob destMboxBlob =
            new MailboxBlob(destMbox, destMsgId, destRevision,
                            new Blob(dest, destVolumeId));
		return destMboxBlob;
	}

    public MailboxBlob renameTo(Blob src, Mailbox destMbox,
                                int destMsgId, int destRevision,
                                short destVolumeId)
    throws IOException, ServiceException {
        File srcFile = src.getFile();
        File destFile = getBlobFile(destMbox, destMsgId, destRevision,
                                    destVolumeId, false);
        String srcPath = srcFile.getAbsolutePath();
        String destPath = destFile.getAbsolutePath();
        ensureParentDirExists(destFile);

        if (destVolumeId == src.getVolumeId()) {
            boolean renamed = srcFile.renameTo(destFile);
            if (sOnWindows) {
                // On Windows renameTo fails if the dest already exists.  So delete 
                // the destination and try the rename again
                if (!renamed && destFile.exists()) {
                    destFile.delete();
                    renamed = srcFile.renameTo(destFile);                    
                }
            }
            if (!renamed) 
                throw new IOException("Unable to rename " + srcPath + " to " + destPath);
        } else {
            // Can't rename across volumes.  Copy then delete instead.
            FileUtil.copy(srcFile, destFile, !DebugConfig.disableMessageStoreFsync);
            srcFile.delete();
        }

        if (ZimbraLog.store.isDebugEnabled()) {
            ZimbraLog.store.debug("Renamed id=" + destMsgId +
                      " mbox=" + destMbox.getId() +
                      " oldpath=" + srcPath + 
                      " newpath=" + destPath);
        }

        MailboxBlob destMboxBlob =
            new MailboxBlob(destMbox, destMsgId, destRevision,
                            new Blob(destFile, destVolumeId));
        return destMboxBlob;
    }

    public boolean delete(MailboxBlob mboxBlob) throws IOException {
        if (mboxBlob == null)
            return false;
        return deleteFile(mboxBlob.getBlob().getFile());
    }

    public boolean delete(Blob blob) throws IOException {
        if (blob == null)
            return false;
        return deleteFile(blob.getFile());
    }

    private boolean deleteFile(File file) throws IOException {
        if (file == null)
            return false;
        ZimbraLog.store.debug("Deleting %s.", file.getPath());
        boolean deleted = file.delete();
        if (deleted)
            return true;
        if (!file.exists()) {
            // File wasn't there to begin with.
            return false;
        }
        throw new IOException("Unable to delete blob file " + file.getAbsolutePath());
    }

    public MailboxBlob getMailboxBlob(Mailbox mbox,
                                      int msgId, int revision,
                                      short volumeId)
    throws ServiceException {
        File file = getBlobFile(mbox, msgId, revision, volumeId, true);
        if (file == null)
            return null;
        return new MailboxBlob(mbox, msgId, revision, new Blob(file, volumeId));
    }

    public InputStream getContent(MailboxBlob mboxBlob) throws IOException {
        if (mboxBlob == null)
            return null;
        return getContent(mboxBlob.getBlob());
    }
    
    public InputStream getContent(Blob blob) throws IOException {
        if (blob == null)
            return null;
        InputStream is = new BufferedInputStream(new FileInputStream(blob.getFile()));
        
        if (ByteUtil.isGzipped(is)){
        	is = new GZIPInputStream(is);
        } else {
            if (blob.getFile().length() > getDiskStreamingThreshold()) {
                is.close();
                is = new BlobInputStream(blob.getFile());
            }
        }
        return is;
    }

	public boolean deleteStore(Mailbox mbox)
    throws IOException {
        for (Volume vol : Volume.getAll()) {
            FileUtil.deleteDir(new File(vol.getMessageRootDir(mbox.getId())));
        }
        return true;
	}

    private File getBlobFile(Mailbox mbox, int msgId, int revision,
                             short volumeId, boolean check)
    throws ServiceException {
        File file = new File(getBlobPath(mbox, msgId, revision, volumeId));
        if (check && !file.exists())
            file = new File(getBlobPath(mbox, msgId, -1, volumeId));
        return (!check || file.exists() ? file : null);
    }

	private static String getBlobPath(Mailbox mbox,
                                      int msgId, int revision,
                                      short volumeId)
    throws ServiceException {
        Volume vol = Volume.getById(volumeId);
        String path = vol.getBlobDir(mbox.getId(), msgId);
        int buflen = path.length() + 15;
        if (revision >= 0)
            buflen += 11;
        StringBuffer sb = new StringBuffer(buflen);
        sb.append(path).append(File.separator).append(msgId);
        if (revision >= 0)
        	sb.append('-').append(revision);
        sb.append(".msg");
		return sb.toString();
	}

    private static void ensureDirExists(File dir) throws IOException {
        if (!FileUtil.mkdirs(dir))
            throw new IOException("Unable to create blob store directory " +
                                  dir.getAbsolutePath());
    }

    private static void ensureParentDirExists(File file) throws IOException {
        File dir = file.getParentFile();
        ensureDirExists(dir);
    }

    private static class UniqueFileNameGenerator {
    	private long mTime;
        private long mSeq;

        public UniqueFileNameGenerator() {
            reset();
        }

        private void reset() {
            mTime = System.currentTimeMillis();
            mSeq = 0;
        }

        public String getFilename() {
            long time, seq;
        	synchronized (this) {
        		if (mSeq >= 1000) {
                    reset();
                }
                time = mTime;
                seq = mSeq++;
            }
            StringBuffer sb = new StringBuffer();
            sb.append(time).append("-").append(seq).append(".msg");
            return sb.toString();
        }
    }


    private static final long SWEEP_INTERVAL_MS = 60 * 1000;  // 1 minute

    private IncomingDirectorySweeper mSweeper;

    private static class IncomingDirectorySweeper extends Thread {
        private Log sLog = LogFactory.getLog(IncomingDirectorySweeper.class);
        
        private boolean mShutdown = false;
    	private long mSweepIntervalMS;
    	private long mMaxAgeMS;

    	public IncomingDirectorySweeper(long sweepIntervalMS,
    									long maxAgeMS) {
    		super("IncomingDirectorySweeper");
            setDaemon(true);
    		mSweepIntervalMS = sweepIntervalMS;
    		mMaxAgeMS = maxAgeMS;
    	}

        public synchronized void signalShutdown() {
        	mShutdown = true;
            wakeup();
        }

        public synchronized void wakeup() {
        	notify();
        }

        public void run() {
            sLog.info(getName() + " thread starting");

            boolean shutdown = false;
            long startTime = System.currentTimeMillis();

            while (!shutdown) {
                // Sleep until next scheduled wake-up time, or until notified.
                synchronized (this) {
                    if (!mShutdown) {
                    	long now = System.currentTimeMillis();
                        long until = startTime + mSweepIntervalMS;
                        if (until > now) {
                        	try {
    							wait(until - now);
    						} catch (InterruptedException e) {}
                        }
                    }
                    shutdown = mShutdown;
                    if (shutdown) break;
                }

                int numDeleted = 0;
                startTime = System.currentTimeMillis();

                // Delete old files in incoming directory of each volume.
                List<Volume> allVolumes = Volume.getAll();
                for (Volume volume : allVolumes) {
                	short volType = volume.getType();
                	if (volType != Volume.TYPE_MESSAGE &&
                		volType != Volume.TYPE_MESSAGE_SECONDARY)
                		continue;
                	File directory = new File(volume.getIncomingMsgDir());
                	if (!directory.exists()) continue;
                	File[] files = directory.listFiles();
                	if (files == null) continue;
                	for (int i = 0; i < files.length; i++) {
        				// Check for shutdown after every 100 files.
                		if (i % 100 == 0) {
        					synchronized (this) {
        						shutdown = mShutdown;
        					}
        					if (shutdown) break;
        				}

        				File file = files[i];
                		if (file.isDirectory()) continue;
                		long lastMod = file.lastModified();
                		// lastModified() returns 0L if file doesn't exist (i.e. deleted by another thread
                		// after this thread did directory.listFiles())
                		if (lastMod > 0L) {
                    		long age = startTime - lastMod;
                    		if (age >= mMaxAgeMS) {
                    			boolean deleted = file.delete();
                    			if (!deleted) {
                    			    // Let's warn only if delete failure wasn't caused by file having been
                    			    // deleted by someone else already.
                    			    if (file.exists())
                                        sLog.warn("Sweeper unable to delete " + file.getAbsolutePath());
                                } else if (sLog.isDebugEnabled()) {
                                    sLog.debug("Sweeper deleted " +
                    						   file.getAbsolutePath());
                    				numDeleted++;
                    			}
                    		}
                		}
                	}
                	synchronized (this) {
                		shutdown = mShutdown;
                	}
                	if (shutdown) break;
                }

                long elapsed = System.currentTimeMillis() - startTime;

                sLog.debug("Incoming directory sweep deleted " + numDeleted +
                		   " files in " + elapsed + "ms");
            }

            sLog.info(getName() + " thread exiting");
        }
    }
}
