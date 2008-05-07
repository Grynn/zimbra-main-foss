/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2007 Zimbra, Inc.
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
package com.zimbra.cs.account.offline;

import com.zimbra.common.service.ServiceException;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.DataSource;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.offline.OfflineLC;
import com.zimbra.cs.offline.OfflineLog;
import com.zimbra.cs.offline.common.OfflineConstants;
import com.zimbra.cs.offline.util.OfflineUtil;

import java.util.*;

public class OfflineAccount extends Account {

	public static class Version {
		private String versionStr;
		private int major;
		private int minor;
		private int maintenance;

		public Version(String version) {
			versionStr = version;
			
			for (int i = 0; i < version.length(); ++i) {
				char c = version.charAt(i);
				if (!Character.isDigit(c) && c != '.') {
					version = version.substring(0, i);
					break;
				}
			}

            try {
				String[] digits = version.split("\\.");

				if (digits.length > 0)
					major = Integer.parseInt(digits[0]);
				if (digits.length > 1)
					minor = Integer.parseInt(digits[1]);
				if (digits.length > 2)
					maintenance = Integer.parseInt(digits[2]);
			} catch (Throwable t) {
				OfflineLog.offline.warn("unknown remote server version: " + version);
			}
		}

		public int getMajor()        { return major; }
		public int getMinor()        { return minor; }
		public int getMaintenance()  { return maintenance; }

		public boolean isAtLeast(Version required) {
			return major > required.major || major == required.major && minor > required.minor ||
			       major == required.major && minor == required.minor && maintenance >= required.maintenance;
		}
		
		public String toString() { return versionStr; }
	}

	private Version mRemoteServerVersion;

	public Version getRemoteServerVersion() {
		if (mRemoteServerVersion == null)
			mRemoteServerVersion = new Version(getAttr(OfflineProvisioning.A_offlineRemoteServerVersion));
		return mRemoteServerVersion;
	}

	public void resetRemoteServerVersion() {
		mRemoteServerVersion = null;
	}
	
	public String getProxyHost() {
		return getAttr(OfflineProvisioning.A_offlineProxyHost);
	}
	
	public int getProxyPort() {
		return getIntAttr(OfflineProvisioning.A_offlineProxyPort, 0);
	}
	
	public String getProxyUser() {
		return getAttr(OfflineProvisioning.A_offlineProxyUser);
	}
	
	public String getProxyPass() {
		return getAttr(OfflineProvisioning.A_offlineProxyPass);
	}

    public OfflineAccount(String name, String id, Map<String, Object> attrs, Map<String, Object> defaults) {
        super(name, id, attrs, defaults);
    }

    private static final String[] sDisabledFeatures = new String[] {
        Provisioning.A_zimbraFeatureTasksEnabled,
        Provisioning.A_zimbraFeatureNotebookEnabled,
        Provisioning.A_zimbraFeatureIMEnabled,
        Provisioning.A_zimbraFeatureGalEnabled,
        Provisioning.A_zimbraFeatureGalAutoCompleteEnabled,
        Provisioning.A_zimbraFeatureViewInHtmlEnabled
    };

    private static final Set<String> sDisabledFeaturesSet = new HashSet<String>();
        static {
            for (String feature : sDisabledFeatures)
                sDisabledFeaturesSet.add(feature.toLowerCase());
        }

    @Override
    public String getAttr(String name, boolean applyDefaults) {
        // disable certain features here rather than trying to make the cached values and the remote values differ
        if (sDisabledFeaturesSet.contains(name.toLowerCase()))
            return "FALSE";
        if (name.equals(Provisioning.A_zimbraPrefMailPollingInterval))
        	return OfflineLC.zdesktop_client_poll_interval.value();
        return super.getAttr(name, applyDefaults);
    }

    @Override
    protected Map<String, Object> getRawAttrs() {
        Map<String, Object> attrs = new HashMap<String, Object>(super.getRawAttrs());
        for (String feature : sDisabledFeatures)
            attrs.put(feature, "FALSE");
        attrs.put(Provisioning.A_zimbraPrefMailPollingInterval, OfflineLC.zdesktop_client_poll_interval.value());
        return attrs;
    }

    @Override
    public Map<String, Object> getAttrs(boolean applyDefaults) {
        Map<String, Object> attrs = new HashMap<String, Object>(super.getAttrs(applyDefaults));
        for (String feature : sDisabledFeatures)
            attrs.put(feature, "FALSE");
        attrs.put(Provisioning.A_zimbraPrefMailPollingInterval, OfflineLC.zdesktop_client_poll_interval.value());
        return attrs;
    }
    
    @Override
	public String[] getMultiAttr(String name) {
    	if (isLocalAccount() && (name.equals(Provisioning.A_zimbraChildAccount) || name.equals(Provisioning.A_zimbraPrefChildVisibleAccount))) {
    		try {
    			OfflineProvisioning prov = OfflineProvisioning.getOfflineInstance();
    			List<Account> accounts = prov.getAllAccounts();
                String[] accountIds = null;
    			if (accounts != null) {
    				accountIds = new String[accounts.size()];
    				for (int i = 0; i < accounts.size(); ++i)
    					accountIds[i] = accounts.get(i).getId();
    				String[] order = prov.getLocalAccount().getAttr(OfflineConstants.A_offlineAccountsOrder, "").split(",");
    				OfflineUtil.fixItemOrder(order, accountIds);
    			} else {
    				accountIds = new String[0];
    			}
    			return accountIds;
    		} catch (ServiceException x) {
    			OfflineLog.offline.error(x);
    		}
    	}
    	return super.getMultiAttr(name);
	}

    public String getRemotePassword() {
    	return getAttr(OfflineProvisioning.A_offlineRemotePassword);
    }

    public boolean isSyncAccount() {
        return OfflineProvisioning.getOfflineInstance().isSyncAccount(this);
    }

    public boolean isLocalAccount() {
		return OfflineProvisioning.getOfflineInstance().isLocalAccount(this);
    }

    public boolean isDataSourceAccount() {
        return OfflineProvisioning.getOfflineInstance().isDataSourceAccount(this);
    }
    
    public void setLastSyncTimestamp() throws ServiceException {
    	setLastSyncTimestampInternal(System.currentTimeMillis());
    }
    
    public void resetLastSyncTimestamp() throws ServiceException {
    	setLastSyncTimestampInternal(0);
    }
    
    private void setLastSyncTimestampInternal(long time) throws ServiceException {
    	if (isSyncAccount()) {
            OfflineProvisioning.getOfflineInstance().setAccountAttribute(this, OfflineConstants.A_offlineLastSync, Long.toString(time));
    	} else if (isDataSourceAccount()) {
    		DataSource ds = OfflineProvisioning.getOfflineInstance().getDataSource(this);
    		OfflineProvisioning.getOfflineInstance().setDataSourceAttribute(ds, OfflineConstants.A_zimbraDataSourceLastSync, Long.toString(time));
    	}
    }
    
    public static void main(String[] args) {
    	assert new Version("4.5.9").isAtLeast(new Version("4.5"));
    	assert !new Version("4.5.9").isAtLeast(new Version("4.5.11"));
    	assert new Version("5.0.5").isAtLeast(new Version("5"));
    	assert new Version("5.0.5").isAtLeast(new Version("5.0"));
    	assert new Version("5.0.5").isAtLeast(new Version("5.0.5"));
    	assert !new Version("5.0.5").isAtLeast(new Version("5.0.6"));
    	assert !new Version("5.0.5").isAtLeast(new Version("6"));
    	assert !new Version("5.0.5").isAtLeast(new Version("6.0"));
    	assert new Version("5.0.6").isAtLeast(new Version("4.5.9"));
    	assert new Version("6.0.5").isAtLeast(new Version("5.0.6"));
    }
}
