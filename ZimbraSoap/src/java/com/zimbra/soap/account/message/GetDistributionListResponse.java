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

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlRootElement;

import com.zimbra.common.soap.AccountConstants;
import com.zimbra.soap.account.type.DistributionListInfo;

@XmlAccessorType(XmlAccessType.FIELD)
@XmlRootElement(name=AccountConstants.E_GET_DISTRIBUTION_LIST_RESPONSE)
public class GetDistributionListResponse {
    
    @XmlAttribute(name=AccountConstants.A_IS_MEMBER, required=true)
    private Boolean isMember;
    @XmlAttribute(name=AccountConstants.A_IS_OWNER, required=true)
    private Boolean isOwner;
    @XmlElement(name=AccountConstants.E_DL, required=false)
    DistributionListInfo dl;

    public GetDistributionListResponse() {
        this((DistributionListInfo)null);
    }

    public GetDistributionListResponse(DistributionListInfo dl) {
        setDl(dl);
    }

    public void setDl(DistributionListInfo dl) { this.dl = dl; }

    public DistributionListInfo getDl() { return dl; }
    
    
    public boolean isMember() {
        return isMember;
    }
    
    public boolean isOwner() {
        return isOwner;
    }
}
