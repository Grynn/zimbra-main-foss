package com.zimbra.cs.ldap.unboundid;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import com.unboundid.asn1.ASN1OctetString;
import com.unboundid.ldap.sdk.Modification;
import com.unboundid.ldap.sdk.ModificationType;

import com.zimbra.common.util.ByteUtil;
import com.zimbra.common.util.StringUtil;
import com.zimbra.cs.account.Entry;
import com.zimbra.cs.ldap.LdapUtilCommon;
import com.zimbra.cs.ldap.ZModificationList;

public class UBIDModificationList extends ZModificationList {

    private List<Modification> modList = new ArrayList<Modification>();
    
    @Override
    public void debug() {
        // TODO Auto-generated method stub
        
    }
    
    List<Modification> getModList() {
        return modList;
    }
    
    void replaceAll(Map<String, Object> attrs) {
        
        for (Map.Entry<String, Object> attr : attrs.entrySet()) {
            String attrName = attr.getKey();
            Object attrValue = attr.getValue();
            
            Modification mod = null;
            if (attrValue instanceof String) {
                mod = new Modification(ModificationType.REPLACE, attrName, (String) attrValue);
            } else if (attrValue instanceof String[]) {
                mod = new Modification(ModificationType.REPLACE, attrName, (String[]) attrValue);
            }
            
            modList.add(mod);
        }
    }
    
    @Override
    public void addAttr(String name, String[] value, Entry entry,
            boolean containsBinaryData, boolean isBinaryTransfer) {
        String[] currentValues = entry.getMultiAttr(name, false);
        
        List<ASN1OctetString> valuesToAdd = null;
        for (int i=0; i < value.length; i++) {
            if (LdapUtilCommon.contains(currentValues, value[i])) {
                continue;
            }
            if (valuesToAdd == null) {
                valuesToAdd = new ArrayList<ASN1OctetString>();
            }
            valuesToAdd.add(UBIDUtil.newASN1OctetString(containsBinaryData, value[i]));
        }
        if (valuesToAdd != null) {
            String transferAttrName = LdapUtilCommon.attrNameToBinaryTransferAttrName(isBinaryTransfer, name);
            Modification mod = new Modification(ModificationType.ADD, transferAttrName, 
                    valuesToAdd.toArray(new ASN1OctetString[valuesToAdd.size()]));
            
            modList.add(mod);
        }
    }
    
    @Override
    public void modifyAttr(String name, String value, Entry entry,
            boolean containsBinaryData, boolean isBinaryTransfer) {
        ModificationType modOp = (StringUtil.isNullOrEmpty(value)) ? ModificationType.DELETE : ModificationType.REPLACE;
        if (modOp == ModificationType.DELETE) {
            // make sure it exists
            if (entry.getAttr(name, false) == null) {
                return;
            }
        }
        
        if (modOp == ModificationType.DELETE) {
            removeAttr(name);
        } else {
            String[] val = new String[]{value};
            modifyAttr(name, val, containsBinaryData, isBinaryTransfer);
        }
    }
    
    @Override
    public void modifyAttr(String name, String[] value,
            boolean containsBinaryData, boolean isBinaryTransfer) {
        
        List<ASN1OctetString> valuesToMod = new ArrayList<ASN1OctetString>();
        for (int i=0; i < value.length; i++) {
            valuesToMod.add(UBIDUtil.newASN1OctetString(containsBinaryData, value[i]));
        }
        
        String transferAttrName = LdapUtilCommon.attrNameToBinaryTransferAttrName(isBinaryTransfer, name);
        Modification mod = new Modification(ModificationType.REPLACE, transferAttrName, 
                valuesToMod.toArray(new ASN1OctetString[valuesToMod.size()]));
        
        modList.add(mod);
        
    }

    @Override
    public void removeAttr(String attrName) {
        Modification mod = new Modification(ModificationType.DELETE, attrName);
        modList.add(mod);
    }

    @Override
    public void removeAttr(String name, String[] value, Entry entry,
            boolean containsBinaryData, boolean isBinaryTransfer) {
        String[] currentValues = entry.getMultiAttr(name, false);
        if (currentValues == null || currentValues.length == 0) {
            return;
        }
        
        List<ASN1OctetString> valuesToRemove = null;
        for (int i=0; i < value.length; i++) {
            if (!LdapUtilCommon.contains(currentValues, value[i])) {
                continue;
            }
            if (valuesToRemove == null) {
                valuesToRemove = new ArrayList<ASN1OctetString>();
            }
            valuesToRemove.add(UBIDUtil.newASN1OctetString(containsBinaryData, value[i]));
        }
        if (valuesToRemove != null) {
            String transferAttrName = LdapUtilCommon.attrNameToBinaryTransferAttrName(isBinaryTransfer, name);
            Modification mod = new Modification(ModificationType.DELETE, transferAttrName, 
                    valuesToRemove.toArray(new ASN1OctetString[valuesToRemove.size()]));
        }
        
    }

    

}
