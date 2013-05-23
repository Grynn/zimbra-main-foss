/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2012 Zimbra, Inc.
 *
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.3 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * ***** END LICENSE BLOCK *****
 */
package com.zimbra.cs.iochannel;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Collection;

import org.apache.commons.codec.binary.Base64;

import sun.misc.BASE64Encoder;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.SoapProtocol;
import com.zimbra.cs.session.PendingModifications;
import com.zimbra.cs.session.Session;
import com.zimbra.cs.session.SessionCache;
import com.zimbra.cs.session.SoapSession;
import com.zimbra.cs.session.SoapSession.RemoteNotifications;

public class MailboxNotification extends Message {

    public static final String AppId = "mbn";

    public static MailboxNotification create(String accountId, byte[] data) throws MessageChannelException {
        return new MailboxNotification(accountId, data);
    }

    @Override
    protected int size() {
        // 4 byte int padding for length of each strings.
        return 2 * (accountId.length() + payload.length) + 8;
    }


    @Override
    protected void serialize(ByteBuffer buffer) throws IOException {
        writeString(buffer, accountId);
        //writeBytes(buffer, payload);
        String base64Str = Base64.encodeBase64String(payload);
        writeString(buffer, base64Str);
    }

    @Override
    protected Message construct(ByteBuffer buffer) throws IOException {
        return new MailboxNotification(buffer);
    }

    @Override
    public String getAppId() {
        return AppId;
    }

    @Override
    public String getRecipientAccountId() {
        return accountId;
    }

    public byte[] getPayload() {
        return payload;
    }

    MailboxNotification() {
    }

    public MailboxNotification(ByteBuffer buffer) throws IOException {
        super();
        accountId = readString(buffer);
        //payload = readBytes(buffer);
        String payloadStr = readString(buffer);
        payload = Base64.decodeBase64(payloadStr);
    }

    protected void writeBytes(ByteBuffer buffer, byte[] data) throws IOException {
        ByteBuffer byteBuffer = ByteBuffer.allocate(data.length);
        byteBuffer.put(data);
        buffer.putInt(byteBuffer.limit());
        buffer.put(byteBuffer);
    }

    protected byte[] readBytes(ByteBuffer buffer) throws IOException {
        int len = buffer.getInt();
        ByteBuffer sub = buffer.slice();
        sub.limit(len);
        buffer.position(buffer.position() + len);
        return sub.array();
    }
    
    private MailboxNotification(String aid, byte[] ntfn) {
        super();
        accountId = aid;
        payload = ntfn;
    }

    @Override
    public MessageHandler getHandler() {
        return new MessageHandler() {
            @Override
            public void handle(Message m, String clientId) {
                if (!(m instanceof MailboxNotification)) {
                    return;
                }
                MailboxNotification message = (MailboxNotification)m;
                log.debug("Message :" + message.getPayload());
                Collection<Session> sessions = SessionCache.getSoapSessions(m.getRecipientAccountId());
                if (sessions == null) {
                    log.warn("no active sessions for account %s", m.getRecipientAccountId());
                    return;
                }
                    
                PendingModifications pms = null;
                for (Session session : sessions) {
                    log.debug("notifying session %s", session.toString());
                    if (pms == null) {
                        try {
                            pms = PendingModifications.deserialize(session.getMailbox(), message.getPayload());
                        } catch (IOException e) {
                            log.warn("could not deserialize notification", e);
                            return;
                        } catch (ClassNotFoundException e) {
                            log.warn("could not deserialize notification", e);
                            return;
                        } catch (ServiceException e) {
                            log.warn("could not deserialize notification", e);
                            return;
                        }
                    }
                    // TODO fix the changeId
                    session.notifyPendingChanges(pms, session.getMailbox().getLastChangeID(), null);
                }
            }
        };
    }

    @Override
    public String toString() {
        StringBuilder buf = new StringBuilder();
        buf.append(AppId).append(":");
        buf.append(accountId).append(":");
        buf.append(payload);
        return buf.toString();
    }

    private String accountId;
    private byte[] payload;
}
