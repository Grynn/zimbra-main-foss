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

package com.zimbra.soap.admin.message;

import com.google.common.collect.Lists;

import java.util.Collection;
import java.util.Collections;
import java.util.List;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlRootElement;

import com.zimbra.common.soap.AdminConstants;
import com.zimbra.soap.admin.type.VolumeInfo;

@XmlAccessorType(XmlAccessType.FIELD)
@XmlRootElement(name=AdminConstants.E_GET_ALL_VOLUMES_RESPONSE)
public class GetAllVolumesResponse {

    @XmlElement(name=AdminConstants.E_VOLUME, required=true)
    private List <VolumeInfo> volumes = Lists.newArrayList();

    public GetAllVolumesResponse() {
        this(null);
    }

    public GetAllVolumesResponse(Collection<VolumeInfo> volumes) {
        setVolumes(volumes);
    }

    public GetAllVolumesResponse setVolumes(Collection<VolumeInfo> volumes) {
        this.volumes.clear();
        if (volumes != null) {
            this.volumes.addAll(volumes);
        }
        return this;
    }

    public GetAllVolumesResponse addVolume(VolumeInfo volume) {
        volumes.add(volume);
        return this;
    }

    public List<VolumeInfo> getVolumes() {
        return Collections.unmodifiableList(volumes);
    }
}
