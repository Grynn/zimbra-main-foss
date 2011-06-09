/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2009, 2010 Zimbra, Inc.
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
package com.zimbra.qa.unittest;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import org.junit.*;
import static org.junit.Assert.*;

import com.zimbra.common.account.Key;
import com.zimbra.common.account.Key.CosBy;
import com.zimbra.common.util.StringUtil;
import com.zimbra.cs.account.Cos;
import com.zimbra.cs.account.Provisioning;

public class TestProvCallbackAvailableZimlets extends TestLdap {
    
    private static String COS_NAME = "cos1";
    private static Provisioning mProv = Provisioning.getInstance();
    
    @BeforeClass
    public static void init() throws Exception {
        Map<String, Object> attrs = new HashMap<String, Object>(); 
        
        StringUtil.addToMultiMap(attrs, Provisioning.A_zimbraZimletAvailableZimlets, "foo");
        StringUtil.addToMultiMap(attrs, Provisioning.A_zimbraZimletAvailableZimlets, "-foo");
        StringUtil.addToMultiMap(attrs, Provisioning.A_zimbraZimletAvailableZimlets, "+foo");
        StringUtil.addToMultiMap(attrs, Provisioning.A_zimbraZimletAvailableZimlets, "!foo");
        StringUtil.addToMultiMap(attrs, Provisioning.A_zimbraZimletAvailableZimlets, "bar");
        StringUtil.addToMultiMap(attrs, Provisioning.A_zimbraZimletAvailableZimlets, "-bar");
        StringUtil.addToMultiMap(attrs, Provisioning.A_zimbraZimletAvailableZimlets, "+bar");
        StringUtil.addToMultiMap(attrs, Provisioning.A_zimbraZimletAvailableZimlets, "!bar");
        
        Cos cos = mProv.createCos(COS_NAME, attrs);
        
        Set<String> getAttrs = cos.getMultiAttrSet(Provisioning.A_zimbraZimletAvailableZimlets);
        
        // only one of the values for each zimlet should exist
        assertEquals(2, getAttrs.size());
        
        assertTrue(getAttrs.contains("-foo") ||
                   getAttrs.contains("+foo") ||
                   getAttrs.contains("!foo"));
        
        assertTrue(getAttrs.contains("-bar") ||
                   getAttrs.contains("+bar") ||
                   getAttrs.contains("!bar"));
    } 
    
    @AfterClass
    public static void cleanup() throws Exception {
        Cos cos = mProv.get(Key.CosBy.name, COS_NAME);
        mProv.deleteCos(cos.getId());
    }
    
    @Test
    public void testReplace() throws Exception {
        Cos cos = mProv.get(Key.CosBy.name, COS_NAME);
        
        Map<String, Object> attrs = new HashMap<String, Object>(); 
        
        StringUtil.addToMultiMap(attrs, Provisioning.A_zimbraZimletAvailableZimlets, "foo");
        StringUtil.addToMultiMap(attrs, Provisioning.A_zimbraZimletAvailableZimlets, "+bar");
        StringUtil.addToMultiMap(attrs, Provisioning.A_zimbraZimletAvailableZimlets, "!bar");
        StringUtil.addToMultiMap(attrs, Provisioning.A_zimbraZimletAvailableZimlets, "foobar");
        
        mProv.modifyAttrs(cos, attrs);
        
        Set<String> getAttrs = cos.getMultiAttrSet(Provisioning.A_zimbraZimletAvailableZimlets);
        assertEquals(3, getAttrs.size());
        
        assertTrue(getAttrs.contains("+foo"));    // foo got turned into +foo in the callback
        
        assertTrue(getAttrs.contains("+bar") ||
                   getAttrs.contains("!bar"));
        
        assertTrue(getAttrs.contains("+foobar")); // foobar got turned into +foobar in the callback
    }
    
    @Test
    public void testDelete() throws Exception {
        Cos cos = mProv.get(Key.CosBy.name, COS_NAME);
        
        Map<String, Object> attrs = new HashMap<String, Object>(); 
        
        // setup current values
        StringUtil.addToMultiMap(attrs, Provisioning.A_zimbraZimletAvailableZimlets, "foo");
        StringUtil.addToMultiMap(attrs, Provisioning.A_zimbraZimletAvailableZimlets, "-bar");
        StringUtil.addToMultiMap(attrs, Provisioning.A_zimbraZimletAvailableZimlets, "!foobar");
        
        mProv.modifyAttrs(cos, attrs);
        Set<String> getAttrs = cos.getMultiAttrSet(Provisioning.A_zimbraZimletAvailableZimlets);
        
        assertEquals(3, getAttrs.size());
        assertTrue(getAttrs.contains("+foo") &&
                   getAttrs.contains("-bar") &&
                   getAttrs.contains("!foobar"));
        
        //
        // matching prefix: delete +foo
        //
        attrs.clear();
        StringUtil.addToMultiMap(attrs, "-" + Provisioning.A_zimbraZimletAvailableZimlets, "+foo");
        mProv.modifyAttrs(cos, attrs);
        getAttrs = cos.getMultiAttrSet(Provisioning.A_zimbraZimletAvailableZimlets);
        
        assertEquals(2, getAttrs.size());
        assertTrue(getAttrs.contains("-bar") &&
                   getAttrs.contains("!foobar"));
        
        //
        // no prefix: delete bar
        //
        attrs.clear();
        StringUtil.addToMultiMap(attrs, "-" + Provisioning.A_zimbraZimletAvailableZimlets, "bar");
        mProv.modifyAttrs(cos, attrs);
        getAttrs = cos.getMultiAttrSet(Provisioning.A_zimbraZimletAvailableZimlets);
        
        assertEquals(1, getAttrs.size());
        assertTrue(getAttrs.contains("!foobar"));
        
        //
        // not matching prefix: delete -foobar => should be a noop
        //
        attrs.clear();
        StringUtil.addToMultiMap(attrs, "-" + Provisioning.A_zimbraZimletAvailableZimlets, "-foobar");
        mProv.modifyAttrs(cos, attrs);
        getAttrs = cos.getMultiAttrSet(Provisioning.A_zimbraZimletAvailableZimlets);
        
        assertEquals(1, getAttrs.size());
        assertTrue(getAttrs.contains("!foobar"));
        
    }
    
    @Test
    public void testAdd() throws Exception {
        Cos cos = mProv.get(Key.CosBy.name, COS_NAME);
        
        Map<String, Object> attrs = new HashMap<String, Object>(); 
        
        // setup current values
        StringUtil.addToMultiMap(attrs, Provisioning.A_zimbraZimletAvailableZimlets, "foo");
        StringUtil.addToMultiMap(attrs, Provisioning.A_zimbraZimletAvailableZimlets, "-bar");
        StringUtil.addToMultiMap(attrs, Provisioning.A_zimbraZimletAvailableZimlets, "!foobar");
        
        mProv.modifyAttrs(cos, attrs);
        Set<String> getAttrs = cos.getMultiAttrSet(Provisioning.A_zimbraZimletAvailableZimlets);
        
        assertEquals(3, getAttrs.size());
        assertTrue(getAttrs.contains("+foo") &&
                   getAttrs.contains("-bar") &&
                   getAttrs.contains("!foobar"));
        
        //
        // add a value not in current values
        //
        attrs.clear();
        StringUtil.addToMultiMap(attrs, "+" + Provisioning.A_zimbraZimletAvailableZimlets, "white");
        mProv.modifyAttrs(cos, attrs);
        getAttrs = cos.getMultiAttrSet(Provisioning.A_zimbraZimletAvailableZimlets);
        
        assertEquals(4, getAttrs.size());
        assertTrue(getAttrs.contains("+foo") &&
                   getAttrs.contains("-bar") &&
                   getAttrs.contains("!foobar") &&
                   getAttrs.contains("+white"));
        
        //
        // add a value in current values, with different prefix
        // should override the current prefix
        //
        attrs.clear();
        StringUtil.addToMultiMap(attrs, "+" + Provisioning.A_zimbraZimletAvailableZimlets, "-foo");
        mProv.modifyAttrs(cos, attrs);
        getAttrs = cos.getMultiAttrSet(Provisioning.A_zimbraZimletAvailableZimlets);
        
        assertEquals(4, getAttrs.size());
        assertTrue(getAttrs.contains("-foo") &&
                   getAttrs.contains("-bar") &&
                   getAttrs.contains("!foobar") &&
                   getAttrs.contains("+white"));
        
        //
        // do something goofy
        //
        attrs.clear();
        StringUtil.addToMultiMap(attrs, "+" + Provisioning.A_zimbraZimletAvailableZimlets, "!foo");
        StringUtil.addToMultiMap(attrs, "+" + Provisioning.A_zimbraZimletAvailableZimlets, "+foo");
        mProv.modifyAttrs(cos, attrs);
        getAttrs = cos.getMultiAttrSet(Provisioning.A_zimbraZimletAvailableZimlets);
        
        assertEquals(4, getAttrs.size());
        assertTrue((getAttrs.contains("!foo") || getAttrs.contains("+foo"))&&
                   getAttrs.contains("-bar") &&
                   getAttrs.contains("!foobar") &&
                   getAttrs.contains("+white"));

    }
    
    @Test
    public void testDeleteAdd() throws Exception {
        Cos cos = mProv.get(Key.CosBy.name, COS_NAME);
        
        Map<String, Object> attrs = new HashMap<String, Object>(); 
        
        // setup current values
        StringUtil.addToMultiMap(attrs, Provisioning.A_zimbraZimletAvailableZimlets, "foo");
        StringUtil.addToMultiMap(attrs, Provisioning.A_zimbraZimletAvailableZimlets, "-bar");
        StringUtil.addToMultiMap(attrs, Provisioning.A_zimbraZimletAvailableZimlets, "!foobar");
        
        mProv.modifyAttrs(cos, attrs);
        Set<String> getAttrs = cos.getMultiAttrSet(Provisioning.A_zimbraZimletAvailableZimlets);
        
        assertEquals(3, getAttrs.size());
        assertTrue(getAttrs.contains("+foo") &&
                   getAttrs.contains("-bar") &&
                   getAttrs.contains("!foobar"));
        
        //
        // delete should be applied before add
        //
        attrs.clear();
        StringUtil.addToMultiMap(attrs, "+" + Provisioning.A_zimbraZimletAvailableZimlets, "!foo");
        StringUtil.addToMultiMap(attrs, "+" + Provisioning.A_zimbraZimletAvailableZimlets, "+bar");
        StringUtil.addToMultiMap(attrs, "-" + Provisioning.A_zimbraZimletAvailableZimlets, "bar");
        
        mProv.modifyAttrs(cos, attrs);
        getAttrs = cos.getMultiAttrSet(Provisioning.A_zimbraZimletAvailableZimlets);
        
        assertEquals(3, getAttrs.size());
        assertTrue(getAttrs.contains("!foo") &&
                   getAttrs.contains("+bar") &&
                   getAttrs.contains("!foobar"));
        
    }

}
