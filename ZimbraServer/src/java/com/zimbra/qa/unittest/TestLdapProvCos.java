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
package com.zimbra.qa.unittest;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.*;
import static org.junit.Assert.*;

import com.zimbra.cs.account.AccountServiceException;
import com.zimbra.cs.account.Cos;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.Provisioning.CacheEntryType;
import com.zimbra.cs.account.Provisioning.CosBy;

public class TestLdapProvCos {

    private static Provisioning prov;
    
    @BeforeClass
    public static void init() throws Exception {
        TestLdap.manualInit();
        
        prov = Provisioning.getInstance();
    }
    
    private Cos createCos(String cosName) throws Exception {
        Cos cos = prov.get(CosBy.name, cosName);
        assertNull(cos);
        cos = prov.createCos(cosName, new HashMap<String, Object>());
        assertNotNull(cos);
        return cos;
    }
    
    private void deleteCos(Cos cos) throws Exception {
        String codId = cos.getId();
        prov.deleteCos(codId);
        cos = prov.get(CosBy.id, codId);
        assertNull(cos);
    }
    
    @Test
    public void createCos() throws Exception {
        String COS_NAME = "createCos";
        Cos cos = createCos(COS_NAME);
        deleteCos(cos);
    }
    
    @Test
    public void createCosAlreadyExists() throws Exception {
        String COS_NAME = "createCosAlreadyExists";
        Cos cos = createCos(COS_NAME);
                
        boolean caughtException = false;
        try {
            prov.createCos(COS_NAME, new HashMap<String, Object>());
        } catch (AccountServiceException e) {
            if (AccountServiceException.COS_EXISTS.equals(e.getCode())) {
                caughtException = true;
            }
        }
        assertTrue(caughtException);
        
        deleteCos(cos);
    }
    
    @Test
    public void defaultCos() throws Exception {
        Cos cos = prov.get(Provisioning.CosBy.name, Provisioning.DEFAULT_COS_NAME);
        assertNotNull(cos);
    }
    
    @Test
    public void getCos() throws Exception {
        String COS_NAME = "getCos";
        Cos cos = createCos(COS_NAME);
        String cosId = cos.getId();
        
        prov.flushCache(CacheEntryType.cos, null);
        cos = prov.get(CosBy.id, cosId);
        assertEquals(cosId, cos.getId());
        
        prov.flushCache(CacheEntryType.cos, null);
        cos = prov.get(CosBy.name, COS_NAME);
        assertEquals(cosId, cos.getId());
        
        deleteCos(cos);
    }
    
    @Test
    public void getCosNotExist() throws Exception {
        String COS_NAME = "getCosNotExist";
        Cos cos = prov.get(CosBy.name, COS_NAME);
        assertNull(cos);
    }
    
    @Test
    public void copyCos() throws Exception {
        String COS_NAME = "copyCos";
        Cos defaultCos = prov.get(Provisioning.CosBy.name, Provisioning.DEFAULT_COS_NAME);
        Cos copiedCos = prov.copyCos(defaultCos.getId(), COS_NAME);
        
        Map<String, Object> defaultCosAttrs = defaultCos.getAttrs();
        Map<String, Object> copiedCosAttrs = copiedCos.getAttrs();
        
        assertEquals(defaultCosAttrs.size(), copiedCosAttrs.size());
        
        for (Map.Entry<String, Object> attr : defaultCosAttrs.entrySet()) {
            String attrName = attr.getKey();
            Object valueInDefaultCos = attr.getValue();
            
            Object valueInCopiedCos = copiedCosAttrs.get(attrName);
            
            // description is not copied over
            if (!Provisioning.A_description.equals(attrName)) {
                assertNotNull(valueInCopiedCos);
            } else {
                continue;
            }
            
            if (valueInDefaultCos instanceof String) {
                assertTrue(valueInCopiedCos instanceof String);
                if (!Provisioning.A_zimbraId.equals(attrName) &&
                        !Provisioning.A_zimbraCreateTimestamp.equals(attrName) &&
                        !Provisioning.A_zimbraACE.equals(attrName) &&
                        !Provisioning.A_cn.equals(attrName) &&
                        !Provisioning.A_description.equals(attrName)) {
                    assertEquals((String) valueInDefaultCos, (String) valueInCopiedCos);
                }
            } else if (valueInDefaultCos instanceof String[]) {
                assertTrue(valueInCopiedCos instanceof String[]);
                assertEquals(((String[]) valueInDefaultCos).length, 
                        ((String[]) valueInCopiedCos).length);
            }
        }
        
        deleteCos(copiedCos);
    }
    
    @Test
    public void getAllCos() throws Exception {
        Cos defaultCos = prov.get(Provisioning.CosBy.name, Provisioning.DEFAULT_COS_NAME);
        
        List<Cos> allCos = prov.getAllCos();
        assertEquals(1, allCos.size());
        assertEquals(defaultCos.getId(), allCos.get(0).getId());
    }
    
    @Test
    public void renameCos() throws Exception {
        String OLD_COS_NAME = "renameCos-old";
        String NEW_COS_NAME = "renameCos-NEW";
        
        Cos cos = createCos(OLD_COS_NAME);
        String cosId = cos.getId();
        
        prov.renameCos(cos.getId(), NEW_COS_NAME);
        Cos renamedCos = prov.get(CosBy.name, NEW_COS_NAME);
        assertEquals(cosId, renamedCos.getId());
        
        deleteCos(cos);
    }
    
    @Test
    public void renameCosToExisting() throws Exception {
        String OLD_COS_NAME = "renameCosToExisting-old";
        String NEW_COS_NAME = Provisioning.DEFAULT_COS_NAME;
        
        Cos cos = createCos(OLD_COS_NAME);
        String cosId = cos.getId();
        
        boolean caughtException = false;
        try {
            prov.renameCos(cos.getId(), NEW_COS_NAME);
        } catch (AccountServiceException e) {
            if (AccountServiceException.COS_EXISTS.equals(e.getCode())) {
                caughtException = true;
            }
        }
        assertTrue(caughtException);
        
        deleteCos(cos);
    }

}