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

package com.zimbra.cs.util;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.net.URL;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import java.util.Set;

import com.zimbra.common.localconfig.LC;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.ClassLoaderUtil;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.Cos;

public class SkinUtil {

    private static String[] sSkins = null;

    // returns all installed skins 
    private synchronized static String[] getAllInstalledSkinsSorted() throws ServiceException {
        if (sSkins == null) {
            sSkins = loadSkins();
        }
        return sSkins;
    }
    
    public synchronized static void flushSkinCache() throws ServiceException {
        sSkins = null;
    }
    
    private static String findSkin(ClassLoader classLoader, File dir) throws ServiceException {
        String skinName = null;
        
        String relResName = "./" + dir.getName() + "/" + "skin.properties";
        
        URL url = classLoader.getResource(relResName);
        
        if (url != null) {
            Properties props = new Properties();
            try {
                props.load(new FileInputStream(new File(url.getFile())));
                skinName = props.getProperty("SkinName");
            } catch (IOException e) {
                // no such property
            }
        }
        
        return skinName;
    }
    
    private static String[] loadSkins() throws ServiceException {
        String skinsDir = LC.skins_directory.value();
        ClassLoader classLoader = ClassLoaderUtil.getClassLoaderByDirectory(skinsDir);
        if (classLoader == null)
            throw ServiceException.FAILURE("unable to get class loader for directory " + 
                                           skinsDir + " configured in localconfig key " + LC.skins_directory.key(), 
                                           null);
        
        List<String> skins = new ArrayList<String>();
        
        File dir = new File(skinsDir);
        File[] files = dir.listFiles();
        
        if (files != null)  {
            for (File f : files) {
                if (f.isDirectory()) {
                    String skin = findSkin(classLoader, f);
                    if (skin != null)
                        skins.add(skin);
                }
            }
        }
        
        String[] sortedSkins = skins.toArray(new String[skins.size()]);
        Arrays.sort(sortedSkins);
        
        return sortedSkins;
    }
    
    public static String[] getSkins(Account acct) throws ServiceException {
        String[] installedSkins = getAllInstalledSkinsSorted();
        Set<String> allowedSkins = acct.getMultiAttrSet(Provisioning.A_zimbraAvailableSkin);
    
        String[] availSkins = null;
        if (allowedSkins.size() == 0)
            availSkins = installedSkins;
        else {
            List<String> skins = new ArrayList<String>();
            // take intersection of the two, loop thru installedSkins because it is sorted
            for (String skin : installedSkins) {
                if (allowedSkins.contains(skin))
                    skins.add(skin);
            }
            availSkins = skins.toArray(new String[skins.size()]);
        }
        return availSkins;
    }

	public static String chooseSkin(Account acct, String requestedSkin) throws ServiceException {
		String[] installedSkins = getAllInstalledSkinsSorted();

		// If the requested skin is intalled and allowed, return it.
		Set<String> allowedSkins = acct.getMultiAttrSet(Provisioning.A_zimbraAvailableSkin);
		if (checkSkin(requestedSkin, installedSkins, allowedSkins)) {
			return requestedSkin;
		}

		// If the account's skin is intalled and allowed, return it.
		String accountSkin = acct.getAttr(Provisioning.A_zimbraPrefSkin);
		if (checkSkin(accountSkin, installedSkins, allowedSkins)) {
			return accountSkin;
		}

		// If the cos default skin is intalled and allowed, return it.
		String cosSkin = Provisioning.getInstance().getCOS(acct).getAttr(Provisioning.A_zimbraPrefSkin);
		if (checkSkin(cosSkin, installedSkins, allowedSkins)) {
			return cosSkin;
		}

		throw ServiceException.FAILURE("No valid skins", null);
	}
        
	private static boolean checkSkin(String requestedSkin, String[] installedSkins, Set<String> allowedSkins) {
		if (requestedSkin != null) {
			for (String skin : installedSkins) {
				if (requestedSkin.equals(skin)) {
					if (allowedSkins.size() == 0 || allowedSkins.contains(skin)) {
						return true;
					}
				}
			}
		}
		return false;
	}
    
}
