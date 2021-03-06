/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2011, 2013 Zimbra Software, LLC.
 * 
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.4 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * ***** END LICENSE BLOCK *****
 */
package com.zimbra.cs.index.query;

import org.junit.Assert;
import org.junit.Test;

/**
 * Unit test for {@link SenderQuery}.
 *
 * @author ysasaki
 */
public final class SenderQueryTest {

    @Test
    public void comparison() throws Exception {
        Assert.assertEquals("<DB[FROM:(>\"test@zimbra.com\") ]>",
                SenderQuery.create(null, ">test@zimbra.com").compile(null, true).toString());
        Assert.assertEquals("<DB[FROM:(>=\"test@zimbra.com\") ]>",
                SenderQuery.create(null, ">=test@zimbra.com").compile(null, true).toString());
        Assert.assertEquals("<DB[FROM:(<\"test@zimbra.com\") ]>",
                SenderQuery.create(null, "<test@zimbra.com").compile(null, true).toString());
        Assert.assertEquals("<DB[FROM:(<=\"test@zimbra.com\") ]>",
                SenderQuery.create(null, "<=test@zimbra.com").compile(null, true).toString());
    }

}
