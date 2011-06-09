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

package com.zimbra.soap.mail.type;

import com.google.common.base.Objects;
import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;

import com.zimbra.common.soap.MailConstants;

@XmlAccessorType(XmlAccessType.FIELD)
public class CommonInstanceDataAttrs {

    @XmlAttribute(name=MailConstants.A_CAL_PARTSTAT /* ptst */, required=false)
    private String partStat;

    @XmlAttribute(name=MailConstants.A_CAL_RECURRENCE_ID_Z /* ridZ */, required=false)
    private String recurIdZ;

    @XmlAttribute(name=MailConstants.A_CAL_TZ_OFFSET /* tzo */, required=false)
    private Long tzOffset;

    @XmlAttribute(name=MailConstants.A_APPT_FREEBUSY_ACTUAL /* fba */, required=false)
    private String freeBusyActual;

    @XmlAttribute(name=MailConstants.A_TASK_PERCENT_COMPLETE /* percentComplete */, required=false)
    private String taskPercentComplete;

    @XmlAttribute(name=MailConstants.A_CAL_RECUR /* recur */, required=false)
    private Boolean isRecurring;

    @XmlAttribute(name=MailConstants.A_CAL_PRIORITY /* priority */, required=false)
    private String priority;

    @XmlAttribute(name=MailConstants.A_APPT_FREEBUSY /* fb */, required=false)
    private String freeBusyIntended;

    @XmlAttribute(name=MailConstants.A_APPT_TRANSPARENCY /* transp */, required=false)
    private String transparency;

    @XmlAttribute(name=MailConstants.A_NAME /* name */, required=false)
    private String name;

    @XmlAttribute(name=MailConstants.A_CAL_LOCATION /* loc */, required=false)
    private String location;

    @XmlAttribute(name=MailConstants.A_CAL_OTHER_ATTENDEES /* otherAtt */, required=false)
    private Boolean hasOtherAttendees;

    @XmlAttribute(name=MailConstants.A_CAL_ALARM /* alarm */, required=false)
    private Boolean hasAlarm;

    @XmlAttribute(name=MailConstants.A_CAL_ISORG /* isOrg */, required=false)
    private Boolean isOrganizer;

    @XmlAttribute(name=MailConstants.A_CAL_INV_ID /* invId */, required=false)
    private String invId;

    @XmlAttribute(name=MailConstants.A_CAL_COMPONENT_NUM /* compNum */, required=false)
    private Integer componentNum;

    @XmlAttribute(name=MailConstants.A_CAL_STATUS /* status */, required=false)
    private String status;

    @XmlAttribute(name=MailConstants.A_CAL_CLASS /* class */, required=false)
    private String calClass;

    @XmlAttribute(name=MailConstants.A_CAL_ALLDAY /* allDay */, required=false)
    private Boolean allDay;

    @XmlAttribute(name=MailConstants.A_CAL_DRAFT /* draft */, required=false)
    private Boolean draft;

    @XmlAttribute(name=MailConstants.A_CAL_NEVER_SENT /* neverSent */, required=false)
    private Boolean neverSent;

    @XmlAttribute(name=MailConstants.A_TASK_DUE_DATE /* dueDate */, required=false)
    private Long taskDueDate;

    @XmlAttribute(name=MailConstants.A_CAL_TZ_OFFSET_DUE /* tzoDue */, required=false)
    private Integer taskTzOffsetDue;

    public CommonInstanceDataAttrs() {
    }

    public void setPartStat(String partStat) { this.partStat = partStat; }
    public void setRecurIdZ(String recurIdZ) { this.recurIdZ = recurIdZ; }
    public void setTzOffset(Long tzOffset) { this.tzOffset = tzOffset; }
    public void setFreeBusyActual(String freeBusyActual) {
        this.freeBusyActual = freeBusyActual;
    }
    public void setTaskPercentComplete(String taskPercentComplete) {
        this.taskPercentComplete = taskPercentComplete;
    }
    public void setIsRecurring(Boolean isRecurring) {
        this.isRecurring = isRecurring;
    }
    public void setPriority(String priority) { this.priority = priority; }
    public void setFreeBusyIntended(String freeBusyIntended) {
        this.freeBusyIntended = freeBusyIntended;
    }
    public void setTransparency(String transparency) {
        this.transparency = transparency;
    }
    public void setName(String name) { this.name = name; }
    public void setLocation(String location) { this.location = location; }
    public void setHasOtherAttendees(Boolean hasOtherAttendees) {
        this.hasOtherAttendees = hasOtherAttendees;
    }
    public void setHasAlarm(Boolean hasAlarm) { this.hasAlarm = hasAlarm; }
    public void setIsOrganizer(Boolean isOrganizer) {
        this.isOrganizer = isOrganizer;
    }
    public void setInvId(String invId) { this.invId = invId; }
    public void setComponentNum(Integer componentNum) {
        this.componentNum = componentNum;
    }
    public void setStatus(String status) { this.status = status; }
    public void setCalClass(String calClass) { this.calClass = calClass; }
    public void setAllDay(Boolean allDay) { this.allDay = allDay; }
    public void setDraft(Boolean draft) { this.draft = draft; }
    public void setNeverSent(Boolean neverSent) { this.neverSent = neverSent; }
    public void setTaskDueDate(Long taskDueDate) {
        this.taskDueDate = taskDueDate;
    }
    public void setTaskTzOffsetDue(Integer taskTzOffsetDue) {
        this.taskTzOffsetDue = taskTzOffsetDue;
    }
    public String getPartStat() { return partStat; }
    public String getRecurIdZ() { return recurIdZ; }
    public Long getTzOffset() { return tzOffset; }
    public String getFreeBusyActual() { return freeBusyActual; }
    public String getTaskPercentComplete() { return taskPercentComplete; }
    public Boolean getIsRecurring() { return isRecurring; }
    public String getPriority() { return priority; }
    public String getFreeBusyIntended() { return freeBusyIntended; }
    public String getTransparency() { return transparency; }
    public String getName() { return name; }
    public String getLocation() { return location; }
    public Boolean getHasOtherAttendees() { return hasOtherAttendees; }
    public Boolean getHasAlarm() { return hasAlarm; }
    public Boolean getIsOrganizer() { return isOrganizer; }
    public String getInvId() { return invId; }
    public Integer getComponentNum() { return componentNum; }
    public String getStatus() { return status; }
    public String getCalClass() { return calClass; }
    public Boolean getAllDay() { return allDay; }
    public Boolean getDraft() { return draft; }
    public Boolean getNeverSent() { return neverSent; }
    public Long getTaskDueDate() { return taskDueDate; }
    public Integer getTaskTzOffsetDue() { return taskTzOffsetDue; }

    public Objects.ToStringHelper addToStringInfo(
                Objects.ToStringHelper helper) {
        return helper
            .add("partStat", partStat)
            .add("recurIdZ", recurIdZ)
            .add("tzOffset", tzOffset)
            .add("freeBusyActual", freeBusyActual)
            .add("taskPercentComplete", taskPercentComplete)
            .add("isRecurring", isRecurring)
            .add("priority", priority)
            .add("freeBusyIntended", freeBusyIntended)
            .add("transparency", transparency)
            .add("name", name)
            .add("location", location)
            .add("hasOtherAttendees", hasOtherAttendees)
            .add("hasAlarm", hasAlarm)
            .add("isOrganizer", isOrganizer)
            .add("invId", invId)
            .add("componentNum", componentNum)
            .add("status", status)
            .add("calClass", calClass)
            .add("allDay", allDay)
            .add("draft", draft)
            .add("neverSent", neverSent)
            .add("taskDueDate", taskDueDate)
            .add("taskTzOffsetDue", taskTzOffsetDue);
    }

    @Override
    public String toString() {
        return addToStringInfo(Objects.toStringHelper(this))
                .toString();
    }
}
