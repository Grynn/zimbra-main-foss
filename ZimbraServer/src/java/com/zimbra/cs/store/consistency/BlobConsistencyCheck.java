/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2008 Zimbra, Inc.
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
package com.zimbra.cs.store.consistency;

import java.io.File;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;

import org.apache.commons.cli.CommandLine;
import org.apache.commons.cli.HelpFormatter;
import org.apache.commons.cli.MissingArgumentException;
import org.apache.commons.cli.Option;
import org.apache.commons.cli.Options;
import org.apache.commons.cli.PosixParser;

import com.zimbra.common.localconfig.LC;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.store.consistency.StatementExecutor.ObjectMapper;

public class BlobConsistencyCheck {
    private final static String REPAIR_WARNING =
            "You have requested to repair the inconsistent BLOBs in your\n" +
            "zimbra installation.  This repair process will delete the\n" +
            "associated metadata for missing BLOBs, and update the volume\n" +
            "ID for incorrectly referenced BLOBs.  Zimbra mailboxd must\n" +
            "be shutdown.  If you are certain you wish to do this, and\n" +
            "have shutdown mailboxd then re-run this command with the -c\n" +
            "option.";
    final static String LOCAL_CONFIG = "/opt/zimbra/conf/localconfig.xml";
    final static String ZIMBRA_USER  = "zimbra";
    final static String JDBC_DRIVER  = "com.mysql.jdbc.Driver";

    /**
     * "short option", "long option", "description", "has-arg", "required".
     */
    final static Object[][] OPTION_LIST = {
        { "z", "gzip",     "test compressed blobs",         false, false },
        { "h", "help",     "this help message",             false, false },
        { "f", "file",     "save report to file",           true,  false },
        { "k", "skip-fs",  "skip blob store reverse check", false, false },
        { "l", "load",     "load/display report from file", true,  false },
        { "u", "user",     "check only the user/mbox-id",   true,  false },
        //{ "r", "repair",   "repair/delete missing blobs",   false, false },
        //{ "c", "force",    "required when repairing",       false, false },
    };

    public static void main(String[] args) throws Exception {
        Class.forName(JDBC_DRIVER);
        File reportFile = null;
        String mysqlPasswd = null;

        Options options = new Options();
        loadOptions(options);
        PosixParser parser = new PosixParser();
        CommandLine cmdLine;
        try {
            cmdLine = parser.parse(options, args);
        }
        catch (MissingArgumentException e) {
            System.err.println(e.getMessage());
            usage(options);
            return;
        }

        if (cmdLine.hasOption("h")) {
            usage(options);
            return;
        }

        mysqlPasswd = LC.zimbra_mysql_password.value();

        if (cmdLine.hasOption("r") && !cmdLine.hasOption("f")) {
            System.err.println("--repair requires --file to be specified");
            return;
        }
        if (!cmdLine.hasOption("f") && !cmdLine.hasOption("l")) {
            File tmpDir = new File(System.getProperty("java.io.tmpdir"));
            reportFile = File.createTempFile("zmblobc", ".rpt", tmpDir);
        } else if (cmdLine.hasOption("f")) {
            reportFile = new File(cmdLine.getOptionValue("f"));
        }
        if (reportFile != null) {
            File parent = reportFile.getParentFile();
            if (!parent.exists() || !parent.isDirectory()) {
                System.out.println("ERROR: " + parent + " directory does not exist");
                System.exit(1);
            }
        }

        if (cmdLine.hasOption("r") && !cmdLine.hasOption("c")) {
            // repair
            System.out.println(REPAIR_WARNING);
        } else if (cmdLine.hasOption("r") && cmdLine.hasOption("c")) {
            new BlobRepair(mysqlPasswd, reportFile).run();
        } else if (cmdLine.hasOption("l")) {
            // display report
            reportFile = new File(cmdLine.getOptionValue("l"));
            if (!reportFile.exists() || !reportFile.isFile()) {
                System.out.println("ERROR: " + reportFile + " does not exist");
                System.exit(1);
            }
            new ReportDisplay(reportFile).run();
        } else {
            // lazy, need pointers...
            final int[] mailboxId = { -1 };
            final int[] mboxGroupId = { -1 };
            if (cmdLine.hasOption("u")) {
                String userName = cmdLine.getOptionValue("u");
                try {
                    mailboxId[0] = Integer.parseInt(userName);
                }
                catch (NumberFormatException e) { } // ignore
                Connection c = null;
                try {
                    c = DriverManager.getConnection(
                            ReportGenerator.JDBC_URL + "zimbra",
                            ZIMBRA_USER, mysqlPasswd);
                    StatementExecutor e = new StatementExecutor(c);
                    if (mailboxId[0] == -1) {
                        System.out.println("Looking up user: " + userName);
                        Provisioning p = Provisioning.getInstance();
                        Account acct = p.getAccount(userName);
                        if (acct == null) {
                            System.out.println("ERROR: " + userName + " not found!");
                            System.exit(1);
                        }
                        String uuid = acct.getId();
                        if (!userName.equals(uuid)) {
                            System.out.println(userName + ": resolves to " + uuid);
                        }
                        e.query("SELECT id, group_id FROM mailbox where account_id = ?",
                                new Object[] { uuid }, new ObjectMapper() {
                            public void mapRow(ResultSet rs) throws SQLException {
                                mailboxId[0] = rs.getInt(1);
                                mboxGroupId[0] = rs.getInt(2);
                            }
                        });
                    } else {
                        System.out.println(
                                "Validating mailbox id: " + mailboxId[0]);
                        Object r = e.query("SELECT group_id FROM mailbox where id = ?",
                                new Object[] { mailboxId[0] });
                        if (r == null) {
                            System.out.println("ERROR: mbox " + mailboxId[0] + " not found");
                            System.exit(1);
                        }
                        mboxGroupId[0] = ((Number) r).intValue();
                    }
                }
                finally {
                    if (c != null) c.close();
                }
            }
            // generate report
            new ReportGenerator(mysqlPasswd, reportFile,
                    cmdLine.hasOption("z"), cmdLine.hasOption("k"),
                    mailboxId[0], mboxGroupId[0]).run();
        }
    }

    private static void loadOptions(Options options) {
        for (Object[] o : OPTION_LIST) {
            Option opt = new Option((String) o[0], (String) o[1],
                                    (Boolean) o[3], (String) o[2]);
            opt.setRequired((Boolean) o[4]);
            options.addOption(opt);
        }
    }
    private static void usage(Options options) {
        HelpFormatter fmt = new HelpFormatter();
        fmt.printHelp("zmblobchk", options);
    }
}
