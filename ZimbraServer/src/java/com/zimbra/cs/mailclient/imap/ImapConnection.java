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
package com.zimbra.cs.mailclient.imap;

import com.zimbra.cs.mailclient.MailConnection;
import com.zimbra.cs.mailclient.MailException;
import com.zimbra.cs.mailclient.MailInputStream;
import com.zimbra.cs.mailclient.MailOutputStream;
import com.zimbra.cs.mailclient.CommandFailedException;
import com.zimbra.cs.mailclient.util.TraceOutputStream;
import com.zimbra.cs.mailclient.util.Ascii;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Formatter;
import java.util.List;
import java.util.ArrayList;
import java.util.Date;
import java.util.Map;
import java.util.HashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.net.SocketTimeoutException;

import static com.zimbra.cs.mailclient.imap.ImapData.asAString;
import org.apache.log4j.Logger;
import org.apache.commons.codec.binary.Base64;

public final class ImapConnection extends MailConnection {
    private ImapCapabilities capabilities;
    private Mailbox mailbox;
    private ImapRequest request;
    private ImapResponse response;
    private Runnable reader;
    private Throwable error;
    private DataHandler dataHandler;
    
    private final AtomicInteger tagCount = new AtomicInteger();

    private static final Logger LOGGER = Logger.getLogger(ImapConnection.class);

    private static final String TAG_FORMAT = "C%02d";

    public ImapConnection(ImapConfig config) {
        super(config);
    }

    public void setDataHandler(DataHandler handler) {
        dataHandler = handler;
    }

    public DataHandler getDataHandler() {
        return dataHandler;
    }
    
    @Override
    protected MailInputStream newMailInputStream(InputStream is) {
        return new ImapInputStream(is, this);
    }

    @Override
    protected MailOutputStream newMailOutputStream(OutputStream os) {
        return new ImapOutputStream(os);
    }

    @Override
    public Logger getLogger() {
        return LOGGER;
    }

    @Override
    protected boolean isTlsEnabled() {
        return super.isTlsEnabled() && hasCapability(ImapCapabilities.STARTTLS);
    }

    @Override
    protected void processGreeting() throws IOException {
        ImapResponse res = readResponse();
        if (res.isUntagged()) {
            greeting = res.getResponseText().getText();
            switch (res.getCCode()) {
            case BYE:
                throw new MailException(greeting);
            case PREAUTH:
            case OK:
                setState(res.isOK() ?
                    State.NOT_AUTHENTICATED : State.AUTHENTICATED);
                ResponseText rt = res.getResponseText();
                if (CAtom.CAPABILITY.atom().equals(rt.getCode())) {
                    capabilities = (ImapCapabilities) rt.getData();
                } else {
                    capability();
                }
                return;
            }
        }
        throw new MailException("Expected server greeting but got: " + res);
    }

    @Override
    protected void sendLogin(String user, String pass) throws IOException {
        newRequest(CAtom.LOGIN, asAString(user), asAString(pass)).sendCheckStatus();
    }

    @Override
    public synchronized void logout() throws IOException {
        if (isShutdown()) return;
        if (request != null) {
            throw new IllegalStateException("Request pending");
        }
        setState(State.LOGOUT);
        try {
            newRequest(CAtom.LOGOUT).sendCheckStatus();
        } catch (CommandFailedException e) {
            getLogger().warn("Logout failed, force closing connection", e);
            close();
        }
    }

    @Override
    protected void sendAuthenticate(boolean ir) throws IOException {
        ImapRequest req = newRequest(
            CAtom.AUTHENTICATE, authenticator.getMechanism());
        if (ir) {
            byte[] response = authenticator.getInitialResponse();
            req.addParam(Ascii.toString(Base64.encodeBase64(response)));
        }
        req.sendCheckStatus();
    }

    @Override
    protected void sendStartTls() throws IOException {
        newRequest(CAtom.STARTTLS).sendCheckStatus();
    }

    public ImapCapabilities capability() throws IOException {
        newRequest(CAtom.CAPABILITY).sendCheckStatus();
        return capabilities;
    }

    public void noop() throws IOException {
        newRequest(CAtom.NOOP).sendCheckStatus();
    }

    public void check() throws IOException {
        newRequest(CAtom.CHECK).sendCheckStatus();
    }

    public void xatom(String cmd, Object... params) throws IOException {
        newRequest(cmd, params).sendCheckStatus();
    }
    
    public IDInfo id() throws IOException {
        return id(null);
    }
    
    public IDInfo id(IDInfo info) throws IOException {
        ImapRequest req = newRequest(CAtom.ID, info != null ? info : Atom.NIL);
        List<IDInfo> results = new ArrayList<IDInfo>(1);
        req.setResponseHandler(new BasicResponseHandler(CAtom.ID, results));
        req.sendCheckStatus();
        return results.isEmpty() ? null : results.get(0);
    }

    public synchronized boolean isSelected(String name) {
        return mailbox != null && mailbox.getName().equals(name);
    }
    
    public synchronized Mailbox select(String name) throws IOException {
        mailbox = doSelectOrExamine(CAtom.SELECT, name);
        setState(State.SELECTED);
        return getMailbox();
    }

    public Mailbox examine(String name) throws IOException {
        return doSelectOrExamine(CAtom.EXAMINE, name);
    }

    private Mailbox doSelectOrExamine(CAtom cmd, String name) throws IOException {
        Mailbox mbox = new Mailbox(name);
        ImapRequest req = newRequest(cmd, new MailboxName(name));
        req.setResponseHandler(mbox);
        mbox.handleResponse(req.sendCheckStatus());
        return mbox;
    }

    public void create(String name) throws IOException {
        newRequest(CAtom.CREATE, new MailboxName(name)).sendCheckStatus();
    }

    public void delete(String name) throws IOException {
        newRequest(CAtom.DELETE, new MailboxName(name)).sendCheckStatus();
    }

    public void rename(String from, String to) throws IOException {
        newRequest(CAtom.RENAME, new MailboxName(from),
                new MailboxName(to)).sendCheckStatus();
    }

    public void subscribe(String name) throws IOException {
        newRequest(CAtom.SUBSCRIBE, new MailboxName(name)).sendCheckStatus();
    }

    public void unsubscribe(String name) throws IOException {
        newRequest(CAtom.UNSUBSCRIBE, new MailboxName(name)).sendCheckStatus();
    }

    public AppendResult append(String mbox, Flags flags, Date date, Literal data)
        throws IOException {
        ImapRequest req = newRequest(CAtom.APPEND, new MailboxName(mbox));
        if (flags != null) req.addParam(flags);
        if (date != null) req.addParam(date);
        req.addParam(data);
        ImapResponse res = req.sendCheckStatus();
        ResponseText rt = res.getResponseText();
        return rt.getCCode() == CAtom.APPENDUID ?
            (AppendResult) rt.getData() : null;
    }

    public void expunge() throws IOException {
        newRequest(CAtom.EXPUNGE).sendCheckStatus();
    }

    public void uidExpunge(String seq) throws IOException {
        newUidRequest(CAtom.EXPUNGE, seq).sendCheckStatus();
    }

    public synchronized void mclose() throws IOException {
        newRequest(CAtom.CLOSE).sendCheckStatus();
        mailbox = null;
        setState(State.AUTHENTICATED);
    }

    public Mailbox status(String name, Object... params) throws IOException {
        ImapRequest req = newRequest(CAtom.STATUS, new MailboxName(name), params);
        List<Mailbox> results = new ArrayList<Mailbox>(1);
        req.setResponseHandler(new BasicResponseHandler(CAtom.STATUS, results));
        req.sendCheckStatus();
        if (results.isEmpty()) {
            throw new MailException("Missing STATUS response data");
        }
        results.get(0).setName(name);
        return results.get(0);
    }

    public List<ListData> list(String ref, String mbox) throws IOException {
        return doList(CAtom.LIST, ref, mbox);
    }

    public List<ListData> lsub(String ref, String mbox) throws IOException {
        return doList(CAtom.LSUB, ref, mbox);
    }

    public boolean exists(String mbox) throws IOException {
        return !list("", mbox).isEmpty();
    }

    private List<ListData> doList(CAtom cmd, String ref, String mbox)
        throws IOException {
        ImapRequest req = newRequest(cmd, new MailboxName(ref), new MailboxName(mbox));
        List<ListData> results = new ArrayList<ListData>();
        req.setResponseHandler(new BasicResponseHandler(CAtom.LIST.atom(), results));
        req.sendCheckStatus();
        return results;
    }

    public char getDelimiter() throws IOException {
        List<ListData> ld = list("", "");
        return ld.isEmpty() ? 0 : ld.get(0).getDelimiter();
    }

    public CopyResult copy(String seq, String mbox) throws IOException {
        ImapRequest req = newRequest(CAtom.COPY, seq, new MailboxName(mbox));
        ResponseText rt = req.sendCheckStatus().getResponseText();
        return rt.getCCode() == CAtom.COPYUID ? (CopyResult) rt.getData() : null;
    }

    public CopyResult uidCopy(String seq, String mbox) throws IOException {
        ImapRequest req = newUidRequest(CAtom.COPY, seq, new MailboxName(mbox));
        ResponseText rt = req.sendCheckStatus().getResponseText();
        return rt.getCCode() == CAtom.COPYUID ? (CopyResult) rt.getData() : null;
    }

    public void fetch(String seq, Object param, ResponseHandler handler)
        throws IOException {
        fetch(CAtom.FETCH.name(), seq, param, handler);
    }

    public void uidFetch(String seq, Object param, ResponseHandler handler)
        throws IOException {
        ImapRequest req = newUidRequest(CAtom.FETCH, seq, param);
        req.setResponseHandler(handler);
        req.sendCheckStatus();
    }

    private void fetch(String cmd, String seq, Object param,
                       ResponseHandler handler) throws IOException {
        ImapRequest req = newRequest(cmd, seq, param);
        req.setResponseHandler(handler);
        req.sendCheckStatus();
    }

    public List<Long> getUids(String seq) throws IOException {
        final List<Long> uids = new ArrayList<Long>();
        uidFetch(seq, "UID", new FetchResponseHandler() {
            public void handleFetchResponse(MessageData md) {
                uids.add(md.getUid());
            }
        });
        return uids;
    }

    public Map<Long, MessageData> fetch(String seq, Object param)
        throws IOException {
        final Map<Long, MessageData> results = new HashMap<Long, MessageData>();
        fetch(seq, param, new FetchResponseHandler(false) {
            public void handleFetchResponse(MessageData md) {
                long msgno = md.getMsgno();
                if (msgno > 0) {
                    MessageData omd = results.get(msgno);
                    if (omd != null) {
                        omd.addFields(md);
                    } else {
                        results.put(msgno, md);
                    }
                }
            }
        });
        return results;
    }

    public MessageData fetch(long msgno, Object param) throws IOException {
        return fetch(String.valueOf(msgno), param).get(msgno);
    }
    
    public Map<Long, MessageData> uidFetch(String seq, Object param)
        throws IOException {
        final Map<Long, MessageData> results = new HashMap<Long, MessageData>();
        uidFetch(seq, param, new FetchResponseHandler(false) {
            public void handleFetchResponse(MessageData md) {
                long uid = md.getUid();
                if (uid > 0) {
                    MessageData omd = results.get(uid);
                    if (omd != null) {
                        omd.addFields(md);
                    } else {
                        results.put(uid, md);
                    }
                }
            }
        });
        return results;
    }

    public MessageData uidFetch(long uid, Object param) throws IOException {
        return uidFetch(String.valueOf(uid), param).get(uid);
    }
    
    public List<Long> search(Object... params) throws IOException {
        return doSearch(CAtom.SEARCH.name(), params);
    }

    public List<Long> uidSearch(Object... params) throws IOException {
        return doSearch("UID SEARCH", params);
    }

    @SuppressWarnings("unchecked")
    private List<Long> doSearch(String cmd, Object... params) throws IOException {
        final List<Long> results = new ArrayList<Long>();
        ImapRequest req = newRequest(cmd, params);
        req.setResponseHandler(new ResponseHandler() {
            public boolean handleResponse(ImapResponse res) {
                if (res.getCCode() == CAtom.SEARCH) {
                    results.addAll((List<Long>) res.getData());
                    return true;
                }
                return false;
            }
        });
        req.sendCheckStatus();
        return results;
    }

    public void store(String seq, String item, Object flags) throws IOException {
        store(seq, item, flags, null);
    }

    public void store(String seq, String item, Object flags,
                      ResponseHandler handler) throws IOException {
        ImapRequest req = newRequest(CAtom.STORE, seq, item, flags);
        req.setResponseHandler(handler);
        req.sendCheckStatus();
    }

    public void uidStore(String seq, String item, Object flags)
            throws IOException {
        uidStore(seq, item, flags, null);
    }

    public void uidStore(String seq, String item, Object flags,
                         ResponseHandler handler) throws IOException {
        ImapRequest req = newUidRequest(CAtom.STORE, seq, item, flags);
        req.setResponseHandler(handler);
        req.sendCheckStatus();
    }

    public ImapRequest newRequest(CAtom cmd, Object... params) {
        return new ImapRequest(this, cmd.atom(), params);
    }

    public ImapRequest newRequest(Atom cmd, Object... params) {
        return new ImapRequest(this, cmd, params);
    }

    public ImapRequest newRequest(String cmd, Object... params) {
        return new ImapRequest(this, new Atom(cmd), params);
    }

    public ImapRequest newUidRequest(CAtom cmd, Object... params) {
        return newRequest("UID " + cmd.toString(), params); 
    }
    

    public ImapCapabilities getCapabilities() {
        return capabilities;
    }

    public Mailbox getMailbox() {
        // Make sure we return a copy of the actual mailbox since it can
        // be modified in-place in response to unsolicited messages from
        // the server.
        return mailbox != null ? new Mailbox(mailbox) : null;
    }

    public TraceOutputStream getTraceOutputStream() {
        return traceOut;
    }

    public boolean hasCapability(String cap) {
        return capabilities != null && capabilities.hasCapability(cap);
    }

    public boolean hasMechanism(String method) {
        return hasCapability("AUTH=" + method);
    }
    
    public boolean hasUidPlus() {
        return hasCapability(ImapCapabilities.UIDPLUS);
    }

    // Called from ImapRequest
    synchronized ImapResponse sendRequest(ImapRequest req)
        throws IOException {
        if (isClosed()) {
            throw new IOException("Connection is closed");
        }
        if (request != null) {
            throw new IllegalStateException("Request already pending");
        }
        request = req;
        try {
            req.write((ImapOutputStream) mailOut);
        } catch (LiteralException e) {
            request = null;
            return e.res; 
        }
        // Wait for final response, handle continuation response
        while (true) {
            ImapResponse res;
            try {
                res = waitForResponse();
            } catch (SocketTimeoutException e) {
                throw req.failed("Timeout waiting for response", e);
            } catch (MailException e) {
                throw req.failed("Error in response", e);
            } finally {
                // Make sure that any partial trace data is logged
                flushTraceStreams();
            }
            if (res.isTagged()) {
                request = null;
                return res;
            }
            assert res.isContinuation();
            if (!req.isAuthenticate()) {
                throw req.failed("Unexpected continuation response");
            }
            processContinuation(res.getResponseText().getText());
        }
    }

    private void flushTraceStreams() throws IOException {
        if (traceOut != null) {
            traceOut.flush();
        }
        if (traceIn != null) {
            traceIn.flush();
        }
    }
    
    // Called from ImapRequest
    void writeLiteral(Literal lit) throws IOException {
        boolean lp = getImapConfig().isUseLiteralPlus() &&
                     hasCapability(ImapCapabilities.LITERAL_PLUS);
        ImapOutputStream out = (ImapOutputStream) mailOut;
        lit.writePrefix(out, lp);
        if (!lp) {
            out.flush();
            ImapResponse res = waitForResponse();
            if (!res.isContinuation()) {
                assert res.isTagged();
                throw new LiteralException(res);
            }
        }
        if (traceOut != null && traceOut.isEnabled()) {
            int size = lit.getSize();
            int maxSize = getImapConfig().getMaxLiteralTraceSize();
            if (maxSize >= 0 && size > maxSize) {
                String msg = String.format("<literal %d bytes>", size);
                traceOut.suspendTrace(msg);
                try {
                    lit.writeData(out);
                } finally {
                    traceOut.resumeTrace();
                }
                return;
            }
        }
        lit.writeData(out);
    }

    public ImapConfig getImapConfig() {
        return (ImapConfig) config;
    }

    // Exception thrown if we get an unexpected response to literal data
    private static class LiteralException extends IOException {
        ImapResponse res;
        LiteralException(ImapResponse res) {
            this.res = res;
        }
    }
    
    // Wait for tagged response
    private ImapResponse waitForResponse() throws IOException {
        try {
            if (reader == null) {
                // Reader thread not active, so read response inline
                return nextResponse();
            }
            response = null;
            while (response == null && !isClosed()) {
                try {
                    wait();
                } catch (InterruptedException e) {
                    throw new IOException("Thread interrupted");
                }
            }
            if (response != null) {
                return response;
            }
            if (error instanceof IOException) {
                throw (IOException) error; 
            } else {
                throw (IOException)
                    new IOException("Error in response handler").initCause(error);
            }
        } catch (SocketTimeoutException e) {
            close();
            throw e;
        } finally {
            traceOut.flush();
            response = null;
        }
    }

    private synchronized void setResponse(ImapResponse res) {
        if (request == null) {
            getLogger().warn("Ignoring tagged or continuation response since" +
                             " no request pending: " + res);
        } else if (response != null) {
            getLogger().warn("Ignoring unexpected tagged or continuation" +
                             " response: " + res);
        }
        response = res;
        notifyAll();
    }

    //
    // NOTE: Currently unused until read timeout implementation can be resolved.
    //
    private void startReader() {
        if (reader != null) return;
        reader = new Runnable() {
            public void run() {
                try {
                    while (!isClosed()) {
                        setResponse(nextResponse());
                    }
                } catch (Throwable e) {
                    readerError(e);
                }
            }
        };
        Thread t = new Thread(reader);
        t.setDaemon(true);
        t.start();
    }

    private synchronized void readerError(Throwable e) {
        if (!(e instanceof IOException && isShutdown())) {
            // Only record an error if not shutting down
            this.error = e;
        }
        super.close();
        notifyAll();
    }

    private boolean isShutdown() {
        return isClosed() || isLogout();
    }

    /*
    * Read and process responses until next tagged or continuation response
    * has been received. Throws EOFException if end of stream has been
    * reached.
    */
    private ImapResponse nextResponse() throws IOException {
        ImapResponse res;
        do {
            res = readResponse();
        } while (processResponse(res));
        return res;
    }

    private ImapResponse readResponse() throws IOException {
        return ImapResponse.read((ImapInputStream) mailIn);
    }

    /*
    * Process IMAP response. Returns true if this is not a tagged or
    * continuation response and reading should continue. Returns false
    * if tagged, untagged BAD, or continuation response.
    */
    private synchronized boolean processResponse(ImapResponse res)
        throws IOException {
        if (res.isUntagged() && res.isBAD()) {
            getLogger().error("Untagged BAD response: " + res);
            return true;
        }
        if (res.isContinuation() || res.isUntagged() && res.isBAD()) {
            return false;
        }
        if (res.isUntagged()) {
            if (processUntagged(res)) {
                return true;
            }
            res.dispose(); // Clean up any associated literal data
        } else if (request == null) {
            throw new MailException(
                "Received tagged response with no request pending: " + res);
        }
        if (res.isOK()) {
            ResponseText rt = res.getResponseText();
            Atom code = rt.getCode();
            if (code != null && code.getCAtom() == CAtom.CAPABILITY) {
                capabilities = (ImapCapabilities) rt.getData();
            }
        } else if (res.getCCode() == CAtom.CAPABILITY) {
            capabilities = (ImapCapabilities) res.getData();
        } else if (mailbox != null) {
            mailbox.handleResponse(res);
        }
        return res.isUntagged();
    }

    private boolean processUntagged(ImapResponse res) throws IOException {
        if (request != null) {
            // Request pending, check for response handler
            ResponseHandler handler = request.getResponseHandler();
            if (handler != null) {
                try {
                    if (handler.handleResponse(res)) {
                        return true; // Handler processed response
                    }
                } catch (Throwable e) {
                    throw new MailException("Exception in response handler", e);
                }
            }
        }
        return false;
    }

    public String newTag() {
        Formatter fmt = new Formatter();
        fmt.format(TAG_FORMAT, tagCount.incrementAndGet());
        return fmt.toString();
    }
}
