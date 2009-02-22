/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2005, 2006, 2007 Zimbra, Inc.
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
package com.zimbra.cs.account.accesscontrol;

public class GranteeFlag {
    
    // allowed for admin rights
    public static final short F_ADMIN = 0x0001;
    
    public static final short F_INDIVIDUAL = 0x0002;
    public static final short F_GROUP      = 0x0004;
    public static final short F_AUTHUSER   = 0x0008;
    public static final short F_PUBLIC     = 0x0010;
}
