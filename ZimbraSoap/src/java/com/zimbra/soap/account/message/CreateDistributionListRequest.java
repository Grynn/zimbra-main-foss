/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2011 Zimbra, Inc.
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

package com.zimbra.soap.account.message;

import java.util.Collection;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;
import javax.xml.bind.annotation.XmlRootElement;

import com.zimbra.common.soap.AccountConstants;
import com.zimbra.soap.account.type.AccountKeyValuePairs;
import com.zimbra.soap.type.KeyValuePair;

@XmlAccessorType(XmlAccessType.FIELD)
@XmlRootElement(name=AccountConstants.E_CREATE_DISTRIBUTION_LIST_REQUEST)
public class CreateDistributionListRequest extends AccountKeyValuePairs {

    @XmlAttribute(name=AccountConstants.E_NAME, required=true)
    private String name;
    @XmlAttribute(name=AccountConstants.A_DYNAMIC, required=false)
    private Boolean dynamic;

    public CreateDistributionListRequest() {
        this((String)null);
    }

    public CreateDistributionListRequest(String name) {
        this(name, (Collection<KeyValuePair>) null, false);
    }

    public CreateDistributionListRequest(String name, Collection<KeyValuePair> attrs, 
            boolean dynamic) {
        super(attrs);
        this.name = name;
        this.dynamic = dynamic;
    }

    public void setName(String name) { this.name = name; }
    public String getName() { return name; }
}
