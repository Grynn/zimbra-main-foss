package com.zimbra.cs.account.ldap.upgrade;

import java.util.HashMap;
import java.util.Map;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.StringUtil;
import com.zimbra.cs.account.Config;
import com.zimbra.cs.account.Provisioning;

public class ZimbraGalLdapAttrMap_externalCalendarResource extends LdapUpgrade {

    ZimbraGalLdapAttrMap_externalCalendarResource() throws ServiceException {
    }

    @Override
    void doUpgrade() throws ServiceException {
        Config config = mProv.getConfig();
        
        String oldCalResType = "zimbraCalResType=zimbraCalResType";
        String newCalResType = "zimbraCalResType,msExchResourceSearchProperties=zimbraCalResType";
        
        String oldCalResLocationDisplayName = "zimbraCalResLocationDisplayName=zimbraCalResLocationDisplayName";
        String newCalResLocationDisplayName = "zimbraCalResLocationDisplayName,displayName=zimbraCalResLocationDisplayName";
        
        String zimbraCalResBuilding = "zimbraCalResBuilding=zimbraCalResBuilding";
        String zimbraCalResCapacity = "zimbraCalResCapacity,msExchResourceCapacity=zimbraCalResCapacity";
        String zimbraCalResFloor = "zimbraCalResFloor=zimbraCalResFloor";
        String zimbraCalResSite = "zimbraCalResSite=zimbraCalResSite";
        String zimbraCalResContactEmail = "zimbraCalResContactEmail=zimbraCalResContactEmail";
        String zimbraAccountCalendarUserType = "msExchResourceSearchProperties=zimbraAccountCalendarUserType";
        
        String[] curValues = config.getMultiAttr(Provisioning.A_zimbraGalLdapAttrMap);
        
        Map<String, Object> attrs = new HashMap<String, Object>(); 
        for (String value : curValues) {
            replaceIfNeeded(attrs, value, oldCalResType, newCalResType);
            replaceIfNeeded(attrs, value, oldCalResLocationDisplayName, newCalResLocationDisplayName);
        }

        addValue(attrs, zimbraCalResBuilding);
        addValue(attrs, zimbraCalResCapacity);
        addValue(attrs, zimbraCalResFloor);
        addValue(attrs, zimbraCalResSite);
        addValue(attrs, zimbraCalResContactEmail);
        addValue(attrs, zimbraAccountCalendarUserType);
        
        System.out.println("Modifying " + Provisioning.A_zimbraGalLdapAttrMap + " on global config");
        mProv.modifyAttrs(config, attrs);
    }
    
    private void replaceIfNeeded(Map<String, Object> attrs, String curValue, String oldValue, String newValue) {
        if (curValue.equalsIgnoreCase(oldValue)) {
            System.out.println("    removing value: " + oldValue);
            System.out.println("    adding value: " + newValue);
            
            StringUtil.addToMultiMap(attrs, "-" + Provisioning.A_zimbraGalLdapAttrMap, oldValue);
            StringUtil.addToMultiMap(attrs, "+" + Provisioning.A_zimbraGalLdapAttrMap, newValue);
        }
    }
    
    private void addValue(Map<String, Object> attrs, String value) {
        System.out.println("    adding value: " + value);
        StringUtil.addToMultiMap(attrs, "+" + Provisioning.A_zimbraGalLdapAttrMap, value);
    }
}
