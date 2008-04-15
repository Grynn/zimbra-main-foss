/*
 * ***** BEGIN LICENSE BLOCK *****
 *
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2007, 2008 Zimbra, Inc.
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
package com.zimbra.cs.mailclient.imap;

import com.zimbra.cs.mailclient.MailConnection;
import com.zimbra.cs.mailclient.MailException;
import com.zimbra.cs.mailclient.MailInputStream;
import com.zimbra.cs.mailclient.MailOutputStream;
import com.zimbra.cs.mailclient.CommandFailedException;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Formatter;

import static com.zimbra.cs.mailclient.imap.ImapData.asAString;

public class ImapConnection extends MailConnection {
    private ImapCapabilities capabilities;
    private Mailbox mailbox;
    private ImapResponse response;
    private int tagCount;

    private static final String TAG_FORMAT = "C%02d";
    
    public ImapConnection(ImapConfig config) {
        super(config);
    }

    protected MailInputStream getMailInputStream(InputStream is) {
        return new ImapInputStream(is, (ImapConfig) config);
    }

    protected MailOutputStream getMailInputStream(OutputStream os) {
        return new ImapOutputStream(os);
    }
    
    protected void processGreeting() throws IOException {
        response = ImapResponse.read((ImapInputStream) mailIn);
        if (!response.isOK()) {
            String err = response.getResponseText().getText();
            throw new MailException("Expected greeting, but got: " + err);
        }
        capability();
    }

    protected void sendLogin(String user, String pass) throws IOException {
        sendCommandCheckStatus("LOGIN", asAString(user), ' ', asAString(pass));
    }

    public void logout() throws IOException {
        sendCommandCheckStatus("LOGOUT");
    }

    protected void sendAuthenticate(boolean ir) throws IOException {
        StringBuilder sb = new StringBuilder(config.getMechanism());
        if (ir) {
            byte[] response = authenticator.getInitialResponse();
            sb.append(' ').append(encodeBase64(response));
        }
        sendCommandCheckStatus("AUTHENTICATE", sb.toString());
    }

    protected void sendStartTls() throws IOException {
        sendCommand("STARTTLS");
    }

    public ImapCapabilities capability() throws IOException {
        sendCommandCheckStatus("CAPABILITY");
        return capabilities;
    }

    public void noop() throws IOException {
        sendCommandCheckStatus("NOOP");
    }
    
    public Mailbox select(String name) throws IOException {
        return doSelectOrExamine("SELECT", name);
    }

    public Mailbox examine(String name) throws IOException {
        return doSelectOrExamine("EXAMINE", name);
    }

    private Mailbox doSelectOrExamine(String cmd, String name) throws IOException {
        mailbox = new Mailbox(name);
        try {
            sendCommandCheckStatus(cmd, asAString(mailbox.getName()));
        } catch (CommandFailedException e) {
            mailbox = null;
            throw e;
        }
        return mailbox;
    }

    public void create(String name) throws IOException {
        sendCommandCheckStatus("CREATE", asAString(name));
    }

    public void delete(String name) throws IOException {
        sendCommandCheckStatus("DELETE", asAString(name));
    }

    public void rename(String from, String to) throws IOException {
        sendCommandCheckStatus("RENAME", asAString(from), asAString(to));
    }

    public void subscribe(String name) throws IOException {
        sendCommandCheckStatus("SUBSCRIBE", asAString(name));
    }

    public void unsubscribe(String name) throws IOException {
        sendCommandCheckStatus("UNSUBSCRIBE", asAString(name));
    }

    public ImapCapabilities getCapabilities() {
        return capabilities;
    }

    public boolean hasCapability(String cap) {
        return capabilities != null && capabilities.hasCapability(cap);
    }
    
    public ImapResponse sendCommandCheckStatus(String cmd, Object... args)
            throws IOException {
        ImapResponse res = sendCommand(cmd, args);
        if (!res.isOK()) {
            throw new CommandFailedException(cmd, res.getResponseText().getText());
        }
        return res;
    }

    public ImapResponse sendCommand(String cmd, Object... args)
            throws IOException {
        String tag = createTag();
        mailOut.write(tag);
        mailOut.write(' ');
        mailOut.write(cmd);
        if (args != null && args.length > 0) {
            mailOut.write(' ');
            writeParts(args);
        }
        mailOut.newLine();
        mailOut.flush();
        // TODO Handle case were we receive BYE just before connection is closed,
        // which may cause EOFException while reading the message.
        do {
            response = readResponse();
            processResponse(response);
        } while (!response.isTagged());
        if (!tag.equals(response.getTag())) {
            throw new MailException("Mismatched tag in response");
        }
        return response;
    }

    private void writeParts(Object[] parts) throws IOException {
        for (Object part : parts) {
            if (part instanceof Quoted) {
                ((Quoted) part).write(mailOut);
            } else if (part instanceof Literal) {
                writeLiteral((Literal) part);
            } else if (part instanceof byte[]) {
                writeLiteral(new Literal((byte []) part));
            } else {
                mailOut.write(part.toString());
            }
        }
    }

    private void writeLiteral(Literal lit) throws IOException {
        boolean lp = hasCapability(ImapCapabilities.LITERAL_PLUS);
        lit.writePrefix(mailOut, lp);
        if (!lp) {
            // Wait for continuation response before proceeding
            ImapResponse res = readResponse();
            if (!res.isContinuation()) {
                throw new MailException("Expected literal continuation response");
            }
        }
        lit.writeData(mailOut);
    }

    private ImapResponse readResponse() throws IOException {
        return ImapResponse.read((ImapInputStream) mailIn);
    }

    private void processResponse(ImapResponse res) throws IOException {
        if (res.isContinuation()) {
            processContinuation(res.getContinuation());
        } else if (res.isStatus()) {
            ResponseText rt = res.getResponseText();
            Atom code = rt.getCode();
            if (code != null) {
                switch (code.getCAtom()) {
                case CAPABILITY:
                    capabilities = (ImapCapabilities) rt.getData();
                }
            }
        } else if (res.isUntagged()) {
            // TODO handle flags, etc
            switch (response.getCode()) {
            case CAPABILITY:
                capabilities = (ImapCapabilities) res.getData();
            }
        }
        if (mailbox != null) {
            mailbox.processResponse(res);
        }
    }

    private String createTag() {
        Formatter fmt = new Formatter();
        fmt.format(TAG_FORMAT, tagCount++);
        return fmt.toString();
    }
}
