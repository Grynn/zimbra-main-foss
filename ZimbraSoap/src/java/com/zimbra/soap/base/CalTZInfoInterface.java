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

package com.zimbra.soap.base;

import java.util.List;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;

import com.zimbra.soap.type.TzOnsetInfo;

@XmlAccessorType(XmlAccessType.NONE)
public interface CalTZInfoInterface {
    public CalTZInfoInterface createFromIdStdOffsetDayOffset(String id,
            Integer tzStdOffset, Integer tzDayOffset);
    public void setStandardTzOnset(TzOnsetInfo standardTzOnset);
    public void setDaylightTzOnset(TzOnsetInfo daylightTzOnset);
    public void setStandardTZName(String standardTZName);
    public void setDaylightTZName(String daylightTZName);
    public String getId();
    public Integer getTzStdOffset();
    public Integer getTzDayOffset();
    public TzOnsetInfo getStandardTzOnset();
    public TzOnsetInfo getDaylightTzOnset();
    public String getStandardTZName();
    public String getDaylightTZName();
}
