package com.zimbra.cs.ldap.unboundid;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import com.unboundid.ldap.sdk.Attribute;
import com.unboundid.ldap.sdk.SearchResultEntry;

import com.zimbra.common.util.ByteUtil;
import com.zimbra.cs.account.AttributeManager;
import com.zimbra.cs.ldap.LdapException;
import com.zimbra.cs.ldap.LdapUtilCommon;
import com.zimbra.cs.ldap.ZAttributes;

public class UBIDAttributes extends ZAttributes {

    //
    // The wrapped object here is actually the SearchResultEntry object.
    // Unlike JNDI, unboundid handles attributes on the SearchResultEntry object.
    // For consistency with our existing coding pattern, the UBIDAttributes 
    // implementation just delegate all operations on the wrapped SearchResultEntry 
    // object.
    //
    private SearchResultEntry entry;
    
    UBIDAttributes(SearchResultEntry entry) {
        this.entry = entry;
    }
    
    @Override
    public void debug() {
        for (Attribute attr : entry.getAttributes()) {
            println(attr.toString());
        }
    }
    
    
    private String getAttrStringInternal(Attribute attr, boolean containsBinaryData) {
        if (containsBinaryData) {
            // Retrieves the value for this attribute as a byte array. 
            // If this attribute has multiple values, then the first value will be returned.
            byte[] bytes = attr.getValueByteArray();
            return ByteUtil.encodeLDAPBase64(bytes);
        } else {
            // Retrieves the value for this attribute as a string. 
            // If this attribute has multiple values, then the first value will be returned.
            return attr.getValue();
        }
    }
    
    private String[] getMultiAttrStringInternal(Attribute attr, boolean containsBinaryData) {
        String result[] = new String[attr.size()];
        
        if (containsBinaryData) {
            byte[][] bytesArrays = attr.getValueByteArrays();
            for (int i = 0; i < bytesArrays.length; i++) {
                result[i] = ByteUtil.encodeLDAPBase64(bytesArrays[i]);
            }
        } else {
            String[] values = attr.getValues();
            for (int i = 0; i < values.length; i++) {
                result[i] = values[i];
            }
        }
        return result;
    }

    @Override
    protected String getAttrString(String transferAttrName, 
            boolean containsBinaryData) throws LdapException {
        Attribute attr = entry.getAttribute(transferAttrName);
        
        if (attr != null) {
            return getAttrStringInternal(attr, containsBinaryData);
        } else {
            return null;
        }
    }
    
    @Override
    protected String[] getMultiAttrString(String transferAttrName,
            boolean containsBinaryData) throws LdapException {
        Attribute attr = entry.getAttribute(transferAttrName);
        
        if (attr != null) {
            return getMultiAttrStringInternal(attr, containsBinaryData);
        } else {
            return null;
        }
    }

    @Override
    public Map<String, Object> getAttrs(Set<String> extraBinaryAttrs)
            throws LdapException {
        Map<String,Object> map = new HashMap<String,Object>();  
        
        AttributeManager attrMgr = AttributeManager.getInst();
        
        for (Attribute attr : entry.getAttributes()) {
            String transferAttrName = attr.getName();
            
            String attrName = LdapUtilCommon.binaryTransferAttrNameToAttrName(transferAttrName);
            
            boolean containsBinaryData = 
                (attrMgr != null && attrMgr.containsBinaryData(attrName)) ||
                (extraBinaryAttrs != null && extraBinaryAttrs.contains(attrName));
            
            if (attr.size() == 1) {
                map.put(attrName, getAttrStringInternal(attr, containsBinaryData));
            } else {
                String result[] = getMultiAttrStringInternal(attr, containsBinaryData);
                map.put(attrName, result);
            }
        }
        return map;
    }



}
