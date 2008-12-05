/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2006, 2007 Zimbra, Inc.
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
package com.zimbra.cs.im;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import org.jivesoftware.wildfire.forms.FormField;
import org.jivesoftware.wildfire.forms.spi.XDataFormImpl;
import org.xmpp.packet.IQ;

import com.zimbra.common.soap.Element;

/**
 * 
 */
public class IMConferenceRoom {
    private enum ConfigType {
        bool,
        string;
    }
    
    private enum Cardinality {
        single,
        multi;
    }
    
    public enum RoomConfig {
        name("name", ConfigType.string), // READ-ONLY 
        hidden("muc_hidden", ConfigType.bool),
        nothidden("muc_public", ConfigType.bool), // hidden from SOAP
        membersonly("muc_membersonly", ConfigType.bool),
        noanonymous("muc_noanonymous", ConfigType.bool),
        semianonymous("muc_semianonymous", ConfigType.bool),
        passwordprotect("muc_passwordprotected", ConfigType.bool),
        persistent("muc_persistent", ConfigType.bool),
        temporary("muc_temporary", ConfigType.bool), // hidden from SOAP
        moderated("muc_moderated", ConfigType.bool),
        unmoderated("muc_unmoderated", ConfigType.bool), // hidden from SOAP
        numoccupants("muc#roominfo_occupants", ConfigType.string), // extended
        password("muc#roomconfig_roomsecret", ConfigType.string), // extended
        maxusers("muc#roomconfig_maxusers", ConfigType.string), // extended
        longname("muc#roomconfig_roomname", ConfigType.string), // extended
        owners("muc#roomconfig_roomowners", ConfigType.string, Cardinality.multi), //extended
        ;
        
        
        RoomConfig(String xmppName, ConfigType configType) {
            this(xmppName, configType, Cardinality.single);
        }
        RoomConfig(String xmppName, ConfigType configType, Cardinality cardinality) {
            this.xmppName = xmppName;
            this.configType = configType;
            this.cardinality = cardinality; 
        }
        
        private static Map<String, RoomConfig> xmppToConfigMap;
        static {
            xmppToConfigMap = new HashMap<String, RoomConfig>();
            for (RoomConfig config : RoomConfig.values()) {
                xmppToConfigMap.put(config.getXMPPName(), config);
            }
        }
        public static RoomConfig lookupFromXMPPName(String xmppName) {
            return xmppToConfigMap.get(xmppName);
        }
        
        public String getXMPPName() { return xmppName;}
        public boolean isMulti() { return cardinality == Cardinality.multi; }
        public ConfigType getConfigType() { return configType; }
        
        private String xmppName;
        private ConfigType configType;
        private Cardinality cardinality;
    }
    
    private String threadId;
    private IMChat chat;
    private Map<RoomConfig, Object> data = new HashMap<RoomConfig, Object>();
    
    /**
     * Express this room configuration as XML suitable for sending as SOAP/JSON to the client
     * @param parent
     * @return
     */
    public Element toXML(Element parent) {
        Element toRet = parent.addElement("room");
        
        toRet.addAttribute("threadId", chat.getThreadId());
        toRet.addAttribute("addr", chat.getDestAddr());

        for (Map.Entry<RoomConfig, Object> entry : data.entrySet()) {
            Element var = parent.addElement("var");
            RoomConfig config = entry.getKey();
            
            // hackery to turn the opposing-flags data from XMPP (e.g. temporary/persistent) into
            // a single true/value value (persistent=1/persistent=0) in the SOAP
            boolean forceFalse= true;
            if (true) {
            switch (config) {
                case nothidden:
                    config = RoomConfig.hidden;
                    break;
                case temporary:
                    config = RoomConfig.persistent;
                    break;
                case unmoderated:
                    config = RoomConfig.moderated;
                    break;
                default:
                    forceFalse= false;
            }
            } else
                forceFalse= false;
            
            var.addAttribute("name", config.name());
            if (!config.isMulti()) {
                String value = (String)entry.getValue();
                if (forceFalse)
                    var.setText("0");
                else
                    var.setText(value);
            } else {
                var.addAttribute("multi", true);
                List<String> values = (List<String>)entry.getValue();
                for (String value : values) {
                    Element valueElt = var.addElement("value");
                    valueElt.setText(value);
                }
            }
        }
        
        return parent;
    }
    
    public String toString() {
        return "Room("+threadId+" "+chat.getDestAddr()+")";
    }
    
    IMConferenceRoom(IMChat chat) {
        this.chat = chat;
    }
    
    private void parseNonExtended(org.dom4j.Element item) {
        String var = item.attributeValue("var");
        RoomConfig config = RoomConfig.lookupFromXMPPName(var);
        if (config != null) {
            data.put(config, "1");
        }
    }
    
    private void parseExtended(String name, List<String> values) {
        RoomConfig config = RoomConfig.lookupFromXMPPName(name);
        if (config != null && values.size() > 0) {
            switch (config) {
                case numoccupants:
                case password:
                case maxusers:
                case longname:
                    data.put(config, values.get(0));
                    break;
                case owners:
                    data.put(config, values);
                    break;
            }
        }
    }

    @SuppressWarnings("unchecked")
    public static IMConferenceRoom parseRoomInfo(IMChat chat, IQ iq) {
        org.dom4j.Element child = iq.getChildElement();
        if (!"http://jabber.org/protocol/disco#info".equals(child.getNamespaceURI()))
            throw new IllegalArgumentException("Expecting a disco#info, got: "+iq.toXML());
        
        IMConferenceRoom room = new IMConferenceRoom(chat);
        org.dom4j.Element identity = child.element("identity");
        
        for (Iterator<org.dom4j.Element> iter = (Iterator<org.dom4j.Element>)child.elementIterator("feature");iter.hasNext();) {
            org.dom4j.Element item = iter.next();
            room.parseNonExtended(item);
        }
            
        for (Iterator<org.dom4j.Element> iter = (Iterator<org.dom4j.Element>)child.elementIterator("x");iter.hasNext();) {
            org.dom4j.Element x = iter.next();
            if ("jabber:x:data".equals(x.getNamespaceURI())) {
                XDataFormImpl form = new XDataFormImpl();
                form.parse(x);
                for (Iterator fieldIter = form.getFields(); fieldIter.hasNext();) {
                    FormField field = (FormField)fieldIter.next();
                    List<String> values = new ArrayList<String>();
                    for (Iterator<String> valueIter = field.getValues(); valueIter.hasNext();) 
                        values.add(valueIter.next());
//                    Pair p = new Pair<String,List<String>>(field.getVariable(), values);
//                    room.extendedInfo.add(p);
//                    if ("muc#roominfo_occupants".equals(field.getVariable())) {
//                        Iterator<String> valueIter = field.getValues();
//                        if (valueIter.hasNext()) {
//                            room.numOccupants = Integer.parseInt(valueIter.next());
//                  }
                    room.parseExtended(field.getVariable(), values);
                }
            }
        }
        
        return room;
    }
    
    @SuppressWarnings("unchecked")
    static IQ generateConfigIQ(IQ iq, Map<String, Object> data) {
        org.dom4j.Element query = iq.setChildElement("query", "http://jabber.org/protocol/muc#owner");
        org.dom4j.Element x = query.addElement("x", "jabber:x:data");
        x.addAttribute("type", "submit");
        for (Map.Entry<String, Object> entry : data.entrySet()) {
            String var = entry.getKey();
            RoomConfig config = RoomConfig.valueOf(var);
            org.dom4j.Element fieldElt = x.addElement("field");
            boolean invertValue = false;
            // MUC spec quirk -- some values are read in one place, but written in a different one
            switch (config) {
                case temporary:
                    invertValue = true;
                    // FALL-THROUGH!
                case persistent:
                    fieldElt.addAttribute("var", "muc#roomconfig_persistentroom");
                    break;
                case hidden:
                    invertValue = true;
                    // FALL-THROUGH
                case nothidden:
                    fieldElt.addAttribute("var", "muc#roomconfig_publicroom");
                    break;
                case unmoderated:
                    invertValue = true;
                    // FALL-THROUGH
                case moderated:
                    fieldElt.addAttribute("var", "muc#roomconfig_moderated");
                    break;
                case passwordprotect:
                    fieldElt.addAttribute("var", "muc#roomconfig_passwordprotectedroom");
                    break;
                default:
                    fieldElt.addAttribute("var", config.getXMPPName());
                break;
            }
            if (entry.getValue() instanceof String) {
                org.dom4j.Element valueElt = fieldElt.addElement("value");
                String value = (String)entry.getValue();
                if (config.getConfigType() == ConfigType.bool) {
                    if ("true".equalsIgnoreCase(value))
                        value = "1";
                    else if ("false".equalsIgnoreCase(value)) 
                        value = "0";
                    
                    if (invertValue) { 
                        if ("1".equals(value))
                            value = "0";
                        else 
                            value = "1";
                    }
                }
                valueElt.setText(value);
            } else {
                List<String> values = (List<String>)(entry.getValue());
                for (String value : values) {
                    org.dom4j.Element valueElt = fieldElt.addElement("value");
                    valueElt.setText(value);
                }
            }
        }
        
        return iq;
    }
}
