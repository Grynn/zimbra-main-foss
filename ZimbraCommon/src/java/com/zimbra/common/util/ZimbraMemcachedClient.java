/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2009 Zimbra, Inc.
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

package com.zimbra.common.util;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import com.zimbra.common.service.ServiceException;

import net.spy.memcached.BinaryConnectionFactory;
import net.spy.memcached.ConnectionFactory;
import net.spy.memcached.DefaultConnectionFactory;
import net.spy.memcached.HashAlgorithm;
import net.spy.memcached.MemcachedClient;

public class ZimbraMemcachedClient {

    public static class KeyPrefix {
        private String mValue;
        public KeyPrefix(String val) { mValue = val; }
        public String toString() { return mValue; }
        public int length() { return mValue.length(); }
    }

    private MemcachedClient mMCDClient;
    private int mDefaultExpiry;  // in seconds
    private long mDefaultTimeout;  // in millis

    /**
     * Constructs a memcached client.  Call connect() before using this.
     */
    public ZimbraMemcachedClient() {
        mMCDClient = null;
        mDefaultExpiry = 86400;
        mDefaultTimeout = 1000;
    }

    public boolean isConnected() {
        synchronized (this) {
            return mMCDClient != null;
        }
    }

    /**
     * Connects/reconnects the memcached client with server list, protocol and hashing algorithm.
     * @param servers memcached server list
     * @param useBinaryProtocol if true, use the binary protocol; if false, use the ascii protocol
     * @param hashAlgorithm net.spy.memcached.HashAlgorithm enum
     * @param defaultExpiry in seconds
     * @param defaultTimeout in milliseconds
     * @throws ServiceException
     */
    public void connect(List<InetSocketAddress> servers, boolean useBinaryProtocol, String hashAlgorithm,
                          int defaultExpiry, long defaultTimeout)
    throws ServiceException {
        HashAlgorithm hashAlgo = HashAlgorithm.KETAMA_HASH;
        if (hashAlgorithm != null && hashAlgorithm.length() > 0) {
            HashAlgorithm ha = HashAlgorithm.valueOf(hashAlgorithm);
            if (ha != null)
                hashAlgo = ha;
        }
        int qLen = DefaultConnectionFactory.DEFAULT_OP_QUEUE_LEN;
        int bufSize = DefaultConnectionFactory.DEFAULT_READ_BUFFER_SIZE;

        MemcachedClient client = null;
        if (servers != null && servers.size() > 0) {
            ConnectionFactory cf;
            if (useBinaryProtocol)
                cf = new BinaryConnectionFactory(qLen, bufSize, hashAlgo);
            else
                cf = new DefaultConnectionFactory(qLen, bufSize, hashAlgo);
            try {
                client = new MemcachedClient(cf, servers);
            } catch (IOException e) {
                throw ServiceException.FAILURE("Unable to initialize memcached client", e);
            }
        }
        MemcachedClient oldClient = null;
        synchronized (this) {
            oldClient = mMCDClient;
            mMCDClient = client;
            mDefaultExpiry = defaultExpiry;
            mDefaultTimeout = defaultTimeout;
        }
        // New client is ready for use by other threads at this point.
        if (oldClient != null)
            disconnect(oldClient, 30000);
    }

    /**
     * Shutdown the memcached client.  Drain the queue and do a normal shutdown if possible.
     * Both drain and normal shutdown are attempted with timeout.  When unsuccessful, shutdown
     * the client immediately.
     * @param timeout in millis
     */
    public void disconnect(long timeout) {
        MemcachedClient client;
        synchronized (this) {
            client = mMCDClient;
            mMCDClient = null;
            if (timeout == -1)
                timeout = mDefaultTimeout;
        }
        if (client != null) {
            disconnect(client, timeout);
        }
    }

    private void disconnect(MemcachedClient client, long timeout) {
        boolean drained = client.waitForQueues(timeout, TimeUnit.MILLISECONDS);
        if (!drained)
            ZimbraLog.misc.warn("Memcached client did not drain queue in " + timeout + "ms");
        boolean success = client.shutdown(timeout, TimeUnit.MILLISECONDS);
        if (!success) {
            ZimbraLog.misc.warn("Memcached client did not shutdown gracefully in " + timeout +
                                "ms; forcing immediate shutdowb");
            client.shutdown();
        }
    }

    private static final char KEY_DELIMITER = ':';

    private String addPrefix(KeyPrefix prefix, String keyval) {
        StringBuilder sb = new StringBuilder(prefix.length() + 1 + keyval.length());
        sb.append(prefix.toString()).append(KEY_DELIMITER).append(keyval);
        return sb.toString();
    }

    private String removePrefix(KeyPrefix prefix, String keyval) {
        String prefixStr = prefix.toString() + KEY_DELIMITER;
        if (keyval.startsWith(prefixStr))
            return keyval.substring(prefixStr.length());
        else
            return keyval;
    }

    private static final int DEFAULT_PORT = 11211;

    /**
     * Parse a server list.
     * Each server value is hostname:port or just hostname.  Default port is 11211.
     * @param serverList
     * @return
     */
    public static List<InetSocketAddress> parseServerList(String[] servers) {
        if (servers != null) {
            List<InetSocketAddress> addrs = new ArrayList<InetSocketAddress>(servers.length);
            for (String server : servers) {
                if (server.length() == 0)
                    continue;
                String[] parts = server.split(":");
                if (parts != null) {
                    String host;
                    int port = DEFAULT_PORT;
                    if (parts.length == 1) {
                        host = parts[0];
                    } else if (parts.length == 2) {
                        host = parts[0];
                        try {
                            port = Integer.parseInt(parts[1]);
                        } catch (NumberFormatException e) {
                            ZimbraLog.misc.warn("Invalid server " + server);
                            continue;
                        }
                    } else {
                        ZimbraLog.misc.warn("Invalid server " + server);
                        continue;
                    }
                    InetSocketAddress addr = new InetSocketAddress(host, port);
                    addrs.add(addr);
                } else {
                    ZimbraLog.misc.warn("Invalid server " + server);
                    continue;
                }
            }
            return addrs;
        } else {
            return new ArrayList<InetSocketAddress>(0);
        }
    }

    /**
     * Parse a server list string.  Values are delimited by a sequence of commas and/or whitespace chars.
     * Each server value is hostname:port or just hostname.  Default port is 11211.
     * @param serverList
     * @return
     */
    public static List<InetSocketAddress> parseServerList(String serverList) {
        if (serverList != null) {
            String[] servers = serverList.split("[\\s,]+");
            return parseServerList(servers);
        } else {
            return new ArrayList<InetSocketAddress>(0);
        }
    }

    // get

    /**
     * Retrieves the value corresponding to the given key prefix and key.
     * Default timeout is used.
     * @param prefix Rawkey = prefix + ":" + key
     * @param key
     * @return null if no value is found for the key
     */
    public Object get(KeyPrefix prefix, String key) {
        return getWithRawKey(addPrefix(prefix, key), -1);
    }

    /**
     * Retrieves the value corresponding to the given key.  The key is "raw", meaning
     * any prefix is already contained in the key.
     * Default timeout is used.
     * @param rawkey
     * @return null if no value is found for the key
     */
    public Object getWithRawKey(String rawkey) {
        return getWithRawKey(rawkey, -1);
    }

    /**
     * Retrieves the value corresponding to the given key prefix and key.
     * @param prefix Rawkey = prefix + ":" + key
     * @param key
     * @param timeout in millis
     * @return null if no value is found for the key
     */
    public Object get(KeyPrefix prefix, String key, long timeout) {
        return getWithRawKey(addPrefix(prefix, key), timeout);
    }

    /**
     * Retrieves the value corresponding to the given key.  The key is "raw", meaning
     * any prefix is already contained in the key.
     * @param rawkey
     * @param timeout in millis
     * @return null if no value is found for the key
     */
    public Object getWithRawKey(String rawkey, long timeout) {
        Object value = null;
        MemcachedClient client;
        synchronized (this) {
            client = mMCDClient;
            if (timeout == -1)
                timeout = mDefaultTimeout;
        }
        if (client == null) return null;
        Future<Object> future = client.asyncGet(rawkey);
        try {
            value = future.get(timeout, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            ZimbraLog.misc.warn("memcached asyncGet timed out after " + timeout + "ms", e);
            future.cancel(false);
        } catch (InterruptedException e) {
            ZimbraLog.misc.warn("InterruptedException during memcached asyncGet operation", e);
        } catch (ExecutionException e) {
            ZimbraLog.misc.warn("ExecutionException during memcached asyncGet operation", e);
        }
        return value;
    }

    // getMulti

    /**
     * Retrieves the values corresponding to the given keys, using a common prefix.
     * Default timeout is used.
     * @param prefix Rawkey = prefix + ":" + key
     * @param keys
     * @return map of (key, value); key is without prefix; missing keys have null value
     */
    public Map<String, Object> getMulti(KeyPrefix prefix, List<String> keys) {
        return getMulti(prefix, keys, -1);
    }

    /**
     * Retrieves the values corresponding to the given keys.  The keys are "raw", meaning
     * any prefix is already contained in the keys.
     * Default timeout is used.
     * @param rawkeys
     * @return map of (key, value); missing keys have null value
     */
    public Map<String, Object> getMultiWithRawKeys(List<String> rawkeys) {
        return getMultiWithRawKeys(rawkeys, -1);
    }

    /**
     * Retrieves the values corresponding to the given keys, using a common prefix.
     * @param prefix Rawkey = prefix + ":" + key
     * @param keys
     * @param timeout in millis
     * @return map of (key, value); key is without prefix; missing keys have null value
     */
    public Map<String, Object> getMulti(KeyPrefix prefix, List<String> keys, long timeout) {
        List<String> rawkeys = new ArrayList<String>(keys.size());
        for (String key : keys) {
            rawkeys.add(addPrefix(prefix, key));
        }
        Map<String, Object> rawValues = getMultiWithRawKeys(rawkeys, timeout);
        Map<String, Object> result = new HashMap<String, Object>(rawValues.size());
        for (Map.Entry<String, Object> entry : rawValues.entrySet()) {
            String rawkey = entry.getKey();
            String key = removePrefix(prefix, rawkey);
            result.put(key, entry.getValue());
        }
        return result;
    }

    /**
     * Retrieves the values corresponding to the given keys.  The keys are "raw", meaning
     * any prefix is already contained in the keys.
     * @param rawkeys
     * @param timeout in millis
     * @return map of (key, value); missing keys have null value
     */
    public Map<String, Object> getMultiWithRawKeys(List<String> rawkeys, long timeout) {
        Map<String, Object> value = null;
        MemcachedClient client;
        synchronized (this) {
            client = mMCDClient;
            if (timeout == -1)
                timeout = mDefaultTimeout;
        }
        if (client != null) {
            Future<Map<String, Object>> future = client.asyncGetBulk(rawkeys);
            try {
                value = future.get(timeout, TimeUnit.MILLISECONDS);
            } catch (TimeoutException e) {
                ZimbraLog.misc.warn("memcached asyncGetBulk timed out after " + timeout + "ms", e);
                future.cancel(false);
            } catch (InterruptedException e) {
                ZimbraLog.misc.warn("InterruptedException during memcached asyncGetBulk operation", e);
            } catch (ExecutionException e) {
                ZimbraLog.misc.warn("ExecutionException during memcached asyncGetBulk operation", e);
            }
        }
        if (value == null) {  // Never return null.
            value = new HashMap<String, Object>(rawkeys.size());
            for (String k : rawkeys) {
                value.put(k, null);
            }
        }
        return value;
    }

    // contains

    /**
     * Tests if the cache has an entry for the given prefix and key.
     * Default timeout is used.
     * @param prefix Rawkey = prefix + ":" + key
     * @param key
     * @return true if cache contains an entry for the key
     */
    public boolean contains(KeyPrefix prefix, String key) {
        return containsWithRawKey(addPrefix(prefix, key), -1);
    }

    /**
     * Tests if the cache has an entry for the given key.
     * The key is "raw", meaning any prefix is already contained in the key.
     * Default timeout is used.
     * @param rawkey
     * @return true if cache contains an entry for the key
     */
    public boolean containsWithRawKey(String rawkey) {
        return containsWithRawKey(rawkey, -1);
    }

    /**
     * Tests if the cache has an entry for the given prefix and key.
     * @param prefix Rawkey = prefix + ":" + key
     * @param key
     * @param timeout in millis
     * @return true if cache contains an entry for the key
     */
    public boolean contains(KeyPrefix prefix, String key, long timeout) {
        return containsWithRawKey(addPrefix(prefix, key), timeout);
    }

    /**
     * Tests if the cache has an entry for the given key.
     * The key is "raw", meaning any prefix is already contained in the key.
     * @param rawkey
     * @param timeout in millis
     * @return true if cache contains an entry for the key
     */
    public boolean containsWithRawKey(String rawkey, long timeout) {
        Object value = getWithRawKey(rawkey, timeout);
        return value != null;
    }

    // put

    /**
     * Puts the prefix+key/value pair.  Default expiry and timeout are used.
     * @param prefix Rawkey = prefix + ":" + key
     * @param key
     * @param value
     * @return
     */
    public boolean put(KeyPrefix prefix, String key, Object value) {
        return putWithRawKey(addPrefix(prefix, key), value, -1, -1);
    }

    /**
     * Puts the key/value pair.  The key is "raw", meaning any prefix is already contained in the key.
     * Default expiry and timeout are used.
     * @param rawkey
     * @param value
     * @return
     */
    public boolean putWithRawKey(String rawkey, Object value) {
        return putWithRawKey(rawkey, value, -1, -1);
    }

    /**
     * Puts the prefix+key/value pair.
     * @param prefix Rawkey = prefix + ":" + key
     * @param key
     * @param value
     * @param expirySec expiry in seconds
     * @param timeout in millis
     * @return
     */
    public boolean put(KeyPrefix prefix, String key, Object value, int expirySec, long timeout) {
        return putWithRawKey(addPrefix(prefix, key), value, expirySec, timeout);
    }

    /**
     * Puts the key/value pair.  The key is "raw", meaning any prefix is already contained in the key.
     * @param rawkey
     * @param value
     * @param expirySec expiry in seconds
     * @param timeout in millis
     * @return
     */
    public boolean putWithRawKey(String rawkey, Object value, int expirySec, long timeout) {
        MemcachedClient client;
        synchronized (this) {
            client = mMCDClient;
            if (expirySec == -1)
                expirySec = mDefaultExpiry;
            if (timeout == -1)
                timeout = mDefaultTimeout;
        }
        if (client == null) return true;
        Future<Boolean> future = client.set(rawkey, expirySec, value);
        Boolean success = null;
        try {
            success = future.get(timeout, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            ZimbraLog.misc.warn("memcached set timed out after " + timeout + "ms", e);
            future.cancel(false);
        } catch (InterruptedException e) {
            ZimbraLog.misc.warn("InterruptedException during memcached set operation", e);
        } catch (ExecutionException e) {
            ZimbraLog.misc.warn("ExecutionException during memcached set operation", e);
        }
        return success != null && success.booleanValue();
    }

    // remove

    /**
     * Removes the value for given prefix and key.
     * Default timeout is used.
     * @param prefix Rawkey = prefix + ":" + key
     * @param key
     * @param timeout in millis
     * @return
     */
    public boolean remove(KeyPrefix prefix, String key) {
        return removeWithRawKey(addPrefix(prefix, key), -1);
    }

    /**
     * Removes the value for given key.  The key is "raw", meaning any prefix is already contained in the key.
     * Default timeout is used.
     * @param rawkey
     * @return
     */
    public boolean removeWithRawKey(String rawkey) {
        return removeWithRawKey(rawkey, -1);
    }

    /**
     * Removes the value for given prefix and key.
     * @param prefix Rawkey = prefix + ":" + key
     * @param key
     * @param timeout in millis
     * @return
     */
    public boolean remove(KeyPrefix prefix, String key, long timeout) {
        return removeWithRawKey(addPrefix(prefix, key), timeout);
    }

    /**
     * Removes the value for given key.  The key is "raw", meaning any prefix is already contained in the key.
     * @param rawkey
     * @param timeout in millis
     * @return
     */
    public boolean removeWithRawKey(String rawkey, long timeout) {
        Boolean success = null;
        MemcachedClient client;
        synchronized (this) {
            client = mMCDClient;
            if (timeout == -1)
                timeout = mDefaultTimeout;
        }
        if (client == null) return true;
        Future<Boolean> future = client.delete(rawkey);
        try {
            success = future.get(timeout, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            ZimbraLog.misc.warn("memcached delete timed out after " + timeout + "ms", e);
            future.cancel(false);
        } catch (InterruptedException e) {
            ZimbraLog.misc.warn("InterruptedException during memcached delete operation", e);
        } catch (ExecutionException e) {
            ZimbraLog.misc.warn("ExecutionException during memcached delete operation", e);
        }
        return success != null && success.booleanValue();
    }
}
