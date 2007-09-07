/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: ZPL 1.2
 * 
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.2 ("License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.zimbra.com/license
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is: Zimbra Collaboration Suite J2ME Client
 * 
 * The Initial Developer of the Original Code is Zimbra, Inc.
 * Portions created by Zimbra are Copyright (C) 2004, 2005, 2006, 2007 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s):
 * 
 * ***** END LICENSE BLOCK *****
 */

package com.zimbra.zme.ui;

import java.util.Calendar;
import java.util.Date;
import java.util.Enumeration;

import javax.microedition.lcdui.ChoiceGroup;
import javax.microedition.lcdui.Command;
import javax.microedition.lcdui.DateField;
import javax.microedition.lcdui.Displayable;
import javax.microedition.lcdui.Graphics;
import javax.microedition.lcdui.Item;
import javax.microedition.lcdui.ItemStateListener;
import javax.microedition.lcdui.StringItem;
import javax.microedition.lcdui.TextField;

import com.zimbra.zme.ResponseHdlr;
import com.zimbra.zme.ZimbraME;
import com.zimbra.zme.client.Appointment;
import com.zimbra.zme.client.Mailbox;

import de.enough.polish.ui.Choice;
import de.enough.polish.ui.FramedForm;
import de.enough.polish.ui.Style;
import de.enough.polish.util.Locale;

public class ApptView extends View implements ResponseHdlr, ItemStateListener {
    
    private StringItem mHeader;
    private StringItem mOrganizerLabel;
    private StringItem mAttendeesLabel;
    private StringItem mTitleLabel;
    private StringItem mLocationLabel;
    private StringItem mStartLabel;
    private StringItem mEndLabel;
    private StringItem mFragmentLabel;
    private StringItem mRepeatLabel;
    
    private TextField mOrganizer;
    private TextField mAttendees;
    private TextField mTitle;
    private TextField mLocation;
    private DateField mStart;
    private DateField mEnd;
    private TextField mFragment;
    private ChoiceGroup mRepeat;

    private Appointment mAppt;
    private Appointment mOrigAppt;
    
    private boolean mModified;
    
    private static final int MAX_INPUT_LEN = 256;
    
    //#ifdef polish.usePolishGui
    public ApptView(ZimbraME midlet, Appointment appt, Style style) {
        super(midlet);
        //#if true
            //# mView = new FramedForm(null, style);
        //#endif
        init(midlet, appt);
    }
    //#else
    public ApptView(ZimbraME midlet, Appointment appt) {
        super(midlet);
        //#if true
            //# mView = new FramedForm(null);
        //#endif
        init(midlet, appt);
    }
    //#endif
    
    private void init(ZimbraME midlet, Appointment appt) {
        mMidlet = midlet;
        mModified = false;
        
        FramedForm form = null;
        
        //#if true
            //# form = (FramedForm)mView;
        //#endif
        
        form.setItemStateListener(this);
        
        String header = (appt == null) ? Locale.get("appt.CreateAppt") : Locale.get("appt.ModifyAppt");
        //#style ApptViewHeader
        mHeader = new StringItem(null, header);
        form.append(Graphics.TOP, mHeader);
        
        mOrganizerLabel = new StringItem(null, Locale.get("appt.Organizer"));
        mAttendeesLabel = new StringItem(null, Locale.get("appt.Attendees"));
        mTitleLabel = new StringItem(null, Locale.get("appt.Title"));
        mLocationLabel = new StringItem(null, Locale.get("appt.Location"));
        mStartLabel = new StringItem(null, Locale.get("appt.Start"));
        mEndLabel = new StringItem(null, Locale.get("appt.End"));
        mFragmentLabel = new StringItem(null, Locale.get("appt.Notes"));
        mRepeatLabel = new StringItem(null, Locale.get("appt.Repeat"));
        
        //#style InputField
        mOrganizer = new TextField("", null, MAX_INPUT_LEN, TextField.ANY);
        //#style ApptDescriptionField
        mAttendees = new TextField("", null, MAX_INPUT_LEN, TextField.ANY);
        //#style InputField
        mTitle = new TextField("", null, MAX_INPUT_LEN, TextField.ANY);
        //#style InputField
        mLocation = new TextField("", null, MAX_INPUT_LEN, TextField.ANY);
        
        Calendar date = Calendar.getInstance();
        date.setTime(mMidlet.getCalendarView().getCurrentDate());
        Calendar time = Calendar.getInstance();
        time.setTime(new Date(System.currentTimeMillis()));
        date.set(Calendar.HOUR_OF_DAY, time.get(Calendar.HOUR_OF_DAY) + 1);
        
        //#style InputField
        mStart = new DateField("", DateField.DATE_TIME);
        mStart.setDate(date.getTime());
        
        date.set(Calendar.HOUR_OF_DAY, time.get(Calendar.HOUR_OF_DAY) + 2);
        //#style InputField
        mEnd = new DateField("", DateField.DATE_TIME);
        mEnd.setDate(date.getTime());

        //#style ApptDescriptionField
        mFragment = new TextField("", null, MAX_INPUT_LEN, TextField.ANY);
        
        //#style ChoiceGroupPopup
        mRepeat = new ChoiceGroup(null, Choice.POPUP);
        mRepeat.append(Locale.get("appt.RepeatNone"), null);
        mRepeat.append(Locale.get("appt.RepeatDaily"), null);
        mRepeat.append(Locale.get("appt.RepeatWeekly"), null);
        mRepeat.append(Locale.get("appt.RepeatEveryTwoWeek"), null);
        mRepeat.append(Locale.get("appt.RepeatMonthly"), null);
        mRepeat.append(Locale.get("appt.RepeatYearly"), null);

        addFields();

        mView.addCommand(ZimbraME.OK);
        mView.addCommand(CANCEL);
        mView.setCommandListener(this);
        
        mOrigAppt = appt;
        addFields();
        
        if (appt != null && !appt.mLoaded) {
            midlet.mMbox.getAppt(appt, this);
            Dialogs.popupWipDialog(mMidlet, this, Locale.get("appt.GettingAppt"));
        } else {
            mMidlet.mDisplay.setCurrent(mView);
        }
    }

    private void addFields() {
        FramedForm form = null;
        
        //#if true
            //# form = (FramedForm)mView;
        //#endif
    
        form.deleteAll();

        if (mOrigAppt != null) {
            if (mOrigAppt.mOrganizerEmail != null) {
                mOrganizer.setString(mOrigAppt.mOrganizerEmail);
                //form.append(mOrganizerLabel);
                //form.append(mOrganizer);
            }
            if (mOrigAppt.mAttendees.size() > 0) {
                StringBuffer attn = new StringBuffer();
                Enumeration en = mOrigAppt.mAttendees.elements();
                while (en.hasMoreElements()) {
                    if (attn.length() > 0)
                        attn.append(",");
                    attn.append(en.nextElement());
                }
                mAttendees.setString(attn.toString());
                form.append(mAttendeesLabel);
                form.append(mAttendees);
            }
            mTitle.setString(mOrigAppt.mSubj);
            mLocation.setString(mOrigAppt.mLocation);
            mStart.setDate(new Date(mOrigAppt.mStart));
            mEnd.setDate(new Date(mOrigAppt.mStart + mOrigAppt.mDuration));
            mFragment.setString(mOrigAppt.mFragment);
            
            if (mOrigAppt.mRecurrence == Appointment.CUSTOM)
                mRepeat.append(Locale.get("appt.RepeatCustom"), null);
            mRepeat.setSelectedIndex(mOrigAppt.mRecurrence, true);
        }
        
        form.append(mTitleLabel);
        form.append(mTitle);
        form.append(mLocationLabel);
        form.append(mLocation);
        
        form.append(mStartLabel);
        form.append(mStart);
        form.append(mEndLabel);
        form.append(mEnd);

        form.append(mRepeatLabel);
        form.append(mRepeat);
        
        form.append(mFragmentLabel);
        form.append(mFragment);
        
        //Gets around J2ME-Polish bug that stops focus in the last element if it has a colspan > 1
        form.append("");
    }

    private Appointment populate() {
        Appointment appt = new Appointment(mOrigAppt);
        appt.mSubj = (mTitle.getString() == null) ? "" : mTitle.getString();
        appt.mLocation = (mLocation.getString() == null) ? "" : mLocation.getString();
        appt.mStart = mStart.getDate().getTime();
        appt.mDuration = getDurationInMilli();
        appt.mAmIOrganizer = true;
        appt.mApptStatus = Appointment.EVT_CONFIRMED;
        appt.mMyStatus = Appointment.ACCEPTED;
        appt.mFragment = (mFragment.getString() == null) ? "" : mFragment.getString();
        // XXX attendees
        
        mAppt = appt;
        return appt;
    }
    
    private long getDurationInMilli() {
        long s = mStart.getDate().getTime();
        long e = mEnd.getDate().getTime();
        return (e - s);
    }
    public void commandAction(Command cmd, 
                              Displayable d) {
        if (d == mView) {
            FramedForm form = null;
            //#if true
                //# form = (FramedForm)mView;
            //#endif
        
            if (form == null)
                return;
            else if (cmd == ZimbraME.OK) {
                if (mOrigAppt == null) {
                    Dialogs.popupWipDialog(mMidlet, this, Locale.get("appt.CreatingAppt"));
                    mMidlet.mMbox.createAppt(populate(), this);
                } else {
                    Dialogs.popupWipDialog(mMidlet, this, Locale.get("appt.UpdatingAppt"));
                    mMidlet.mMbox.modifyAppt(populate(), this);
                }
            } else if (cmd == CANCEL && mModified)
                Dialogs.popupConfirmDialog(mMidlet, this, Locale.get("appt.CancelContinue"));
            else
                setNextCurrent();
        } else if (d == Dialogs.mConfirmD){
            if (cmd == Dialogs.YES)
                setNextCurrent();
            else
                mMidlet.mDisplay.setCurrent(mView);
        } else if (d == Dialogs.mErrorD) {
            mMidlet.mDisplay.setCurrent(mView);
        } else if (d == Dialogs.mWipD) {
            mMidlet.mMbox.cancelOp();
            mMidlet.mDisplay.setCurrent(mView);
        }
    }

    public void handleResponse(Object op, 
                               Object resp) {   
        //#debug
        System.out.println("ApptView.handleResponse");
        if (resp instanceof Mailbox) {
            if (op == Mailbox.CREATEAPPT) {
                //#debug 
                System.out.println("ApptView.handleResponse: CreateAppt successful");
                mMidlet.getCalendarView().addAppt(mAppt);
                setNextCurrent();
            } else if (op == Mailbox.MODIFYAPPT) {
                //#debug 
                System.out.println("ApptView.handleResponse: ModifyAppt successful");
                if (mOrigAppt != null)
                    mOrigAppt.copyFrom(mAppt);
                setNextCurrent();
            } else if (op == Mailbox.GETAPPT) {
                //#debug 
                System.out.println("ApptView.handleResponse: GetAppt successful");
                addFields();
                mMidlet.mDisplay.setCurrent(mView);
            }
        } else {
            mMidlet.handleResponseError(resp, this);
        }
    }

    public void itemStateChanged(Item item) {
        mModified = true;
    }
}
