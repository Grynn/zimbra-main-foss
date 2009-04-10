/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2005, 2006, 2007, 2008, 2009 Zimbra, Inc.
 * 
 * The contents of this file are subject to the Yahoo! Public License
 * Version 1.0 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * ***** END LICENSE BLOCK *****
 */
package com.zimbra.cs.zimlet;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.URL;
import java.net.URLClassLoader;
import java.net.URLConnection;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.commons.cli.ParseException;
import org.apache.commons.httpclient.HttpClient;
import org.apache.commons.httpclient.HttpState;
import org.apache.commons.httpclient.cookie.CookiePolicy;
import org.apache.commons.httpclient.methods.PostMethod;
import org.apache.commons.httpclient.methods.multipart.MultipartRequestEntity;
import org.apache.commons.httpclient.methods.multipart.Part;
import org.apache.commons.httpclient.methods.multipart.PartBase;

import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.AccountServiceException;
import com.zimbra.cs.account.Cos;
import com.zimbra.cs.account.Domain;
import com.zimbra.cs.account.Provisioning;
import com.zimbra.cs.account.NamedEntry;
import com.zimbra.cs.account.Server;
import com.zimbra.cs.account.Zimlet;
import com.zimbra.cs.account.Provisioning.CacheEntryType;
import com.zimbra.cs.account.Provisioning.CosBy;
import com.zimbra.cs.account.ProvUtil;
import com.zimbra.cs.account.soap.SoapProvisioning;
import com.zimbra.cs.httpclient.URLUtil;
import com.zimbra.common.auth.ZAuthToken;
import com.zimbra.common.localconfig.LC;
import com.zimbra.cs.servlet.ZimbraServlet;
import com.zimbra.cs.util.BuildInfo;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.*;
import com.zimbra.common.soap.*;
import com.zimbra.common.soap.Element.XMLElement;

/**
 * 
 * @author jylee
 *
 */
public class ZimletUtil {
	
	public static final String ZIMLET_BASE = "/service/zimlet";
	public static final String ZIMLET_DEV_DIR = "_dev";
	public static final String ZIMLET_ALLOWED_DOMAINS = "allowedDomains";
	public static final String ZIMLET_DEFAULT_COS = "default";
	
	private static int P_MAX = Integer.MAX_VALUE;
	private static boolean sZimletsLoaded = false;
	private static Map<String,ZimletFile> sZimlets = new HashMap<String,ZimletFile>();
	private static Map<String,Class> sZimletHandlers = new HashMap<String,Class>();

	public static String[] getZimlets(Account acct) throws ServiceException {
		String[] zimlets = acct.getMultiAttr(Provisioning.A_zimbraZimletAvailableZimlets);
		Domain domain = Provisioning.getInstance().getDomain(acct);
		if (domain != null) {
			Set<String> domainZimlets = domain.getMultiAttrSet(Provisioning.A_zimbraZimletDomainAvailableZimlets);
			Set<String> availZimlets = new HashSet<String>(Arrays.asList(zimlets));
			return SetUtil.union(availZimlets, domainZimlets).toArray(new String[0]);
		} else
			return zimlets;
	}
	
	public static String[] getZimlets(Cos cos) {
	    String[] zimlets = cos.getMultiAttr(Provisioning.A_zimbraZimletAvailableZimlets);
	    return zimlets;
	}
	
	public static String[] listZimletNames() {
		String[] zimlets = sZimlets.keySet().toArray(new String[0]);
		Arrays.sort(zimlets);
		return zimlets;
	}
	
	public static String[] listDevZimletNames() {
		String[] zimlets = loadDevZimlets().keySet().toArray(new String[0]);
		Arrays.sort(zimlets); // TODO: Should sort by zimlet priority.
		return zimlets;
	}
	
	public static List<Zimlet> orderZimletsByPriority(List<Zimlet> zimlets) {
		// create a sortable collection, sort, then return List<Zimlet> in the
		// sorted order.  version is not comparable in String format.
		List<Pair<Version,Zimlet>> plist = new ArrayList<Pair<Version,Zimlet>>();
		for (Zimlet z : zimlets) {
			String pstring = z.getPriority();
			if (pstring == null) {
				// no priority.  put it at the end of priority list
				pstring = Integer.toString(Integer.MAX_VALUE);
			}
			Version v = new Version(pstring);
			plist.add(new Pair<Version,Zimlet>(v,z));
		}
		Collections.sort(plist, 
			new Comparator<Pair<Version,Zimlet>>() {
				public int compare(Pair<Version,Zimlet> first,
									Pair<Version,Zimlet> second) {
					return first.getFirst().compareTo(second.getFirst());
				}
			}
		);
		
		List<Zimlet> ret = new ArrayList<Zimlet>();
		for (Pair<Version,Zimlet> p : plist) {
			ret.add(p.getSecond());
		}
		return ret;
	}
	
	public static List<Zimlet> orderZimletsByPriority(String[] zimlets) {
		Provisioning prov = Provisioning.getInstance();
		List<Zimlet> zlist = new ArrayList<Zimlet>();
		for (int i = 0; i < zimlets.length; i++) {
			try {
				Zimlet z = prov.getZimlet(zimlets[i]);
				if (z != null)
					zlist.add(z);
			} catch (ServiceException se) {
				// ignore error and continue on
			}
		}
		return orderZimletsByPriority(zlist);
	}
	
	public static List<Zimlet> orderZimletsByPriority() throws ServiceException {
		Provisioning prov = Provisioning.getInstance();
		List<Zimlet> allzimlets = prov.listAllZimlets();
		return orderZimletsByPriority(allzimlets);
	}

    public static void updateZimletConfig(String zimlet, String config) throws ServiceException {
        Provisioning prov = Provisioning.getInstance();
        Zimlet zim = prov.getZimlet(zimlet);
		if (zim == null)
            throw AccountServiceException.NO_SUCH_ZIMLET(zimlet);
        Map<String, String> map = new HashMap<String, String>();
        map.put(Provisioning.A_zimbraZimletHandlerConfig, config);
        prov.modifyAttrs(zim, map);
    }

	public static ZimletConfig getZimletConfig(String zimlet) throws ServiceException {
		Provisioning prov = Provisioning.getInstance();
		Zimlet z = prov.getZimlet(zimlet);
		if (z == null)
			throw AccountServiceException.NO_SUCH_ZIMLET(zimlet);
		String cf = z.getAttr(Provisioning.A_zimbraZimletHandlerConfig);
		if (cf == null)
			return null;
		try {
			return new ZimletConfig(cf);
		} catch (ZimletException e) {
			ZimbraLog.zimlet.warn("Unable to load zimlet config for "+z.getName(), e);
		}
		return null;
	}
	
	/**
	 * Loads all the Zimlets, locates the server side ZimletHandler for each Zimlets,
	 * loads the class and instantiate the object, then returns the instance.
	 * 
	 * @param name of the Zimlet
	 * @return ZimletHandler object
	 */
	public static ZimletHandler getHandler(String name) {
		loadZimlets();
		Class zh = (Class) sZimletHandlers.get(name);
		if (zh == null) {
			ZimletFile zf = (ZimletFile) sZimlets.get(name);
			if (zf == null) {
				return null;
			}
			try {
				String clazz = zf.getZimletDescription().getServerExtensionClass();
				if (clazz != null) {
					URL[] urls = { zf.toURL() };
					URLClassLoader cl = new URLClassLoader(urls, ZimletUtil.class.getClassLoader());
					zh = cl.loadClass(clazz);
					ZimbraLog.zimlet.info("Loaded class "+zh.getName());
					sZimletHandlers.put(name, zh);
				}
			} catch (Exception e) {
				ZimbraLog.zimlet.warn("Unable to load zimlet handler for "+name, e);
				return null;
			}
		}
		try {
			if (zh != null)
				return (ZimletHandler) zh.newInstance();
		} catch (Exception e) {
			ZimbraLog.zimlet.warn("Unable to instantiate zimlet handler for "+name, e);
		}
		return null;
	}
	
	/**
	 * 
	 * Load all the installed Zimlets.
	 *
	 */
	public synchronized static Map<String,ZimletFile> loadZimlets() {
		if (!sZimletsLoaded) {
			loadZimletsFromDir(sZimlets, LC.zimlet_directory.value());
			sZimletsLoaded = true;
		}
		// NOTE: Was added for consistency with loadDevZimlets
		return sZimlets;
	}

	/**
	 * 
	 * Load all the Zimlets in the dev test directory.
	 *
	 */
	public static Map<String,ZimletFile> loadDevZimlets() {
		Map<String,ZimletFile> zimletMap = new HashMap<String,ZimletFile>();
		loadZimletsFromDir(zimletMap, LC.zimlet_directory.value() + File.separator + ZIMLET_DEV_DIR);
		return zimletMap;
	}

	/**
	 * 
	 * Throw away the cached Zimlet, and reloads from the file system.
	 * 
	 * @param zimlet
	 * @throws ZimletException
	 */
	public static void reloadZimlet(String zimlet) throws ZimletException {
		ZimletFile zf;
		try {
			zf = new ZimletFile(LC.zimlet_directory.value() + File.separator + zimlet);
		} catch (IOException ioe) {
    		ZimbraLog.zimlet.warn(ioe.getMessage());
    		return;
		}
		synchronized (sZimlets) {
			sZimlets.remove(zimlet);
			sZimlets.put(zimlet, zf);
		}
	}
	
	/**
	 * 
	 * Load all the Zimlets found in the directory.
	 * 
	 * @param zimlets - Zimlet cache
	 * @param dir - directory
	 */
	private static void loadZimletsFromDir(Map<String,ZimletFile> zimlets, String dir) {
        File zimletRootDir = new File(dir);
		if (zimletRootDir == null || !zimletRootDir.exists() || !zimletRootDir.isDirectory()) {
			return;
		}

        ZimbraLog.zimlet.debug("Loading zimlets from " + zimletRootDir.getPath());
        
        synchronized (zimlets) {
        	zimlets.clear();
        	String[] zimletNames = zimletRootDir.list();
        	assert(zimletNames != null);
        	for (int i = 0; i < zimletNames.length; i++) {
        		if (zimletNames[i].equals(ZIMLET_DEV_DIR)) {
        			continue;
        		}
        		try {
        			zimlets.put(zimletNames[i], new ZimletFile(zimletRootDir, zimletNames[i]));
        		} catch (Exception e) {
        			ZimbraLog.zimlet.warn("error loading zimlet "+zimletNames[i], e);
        		}
        	}
        }
	}
	
	/**
	 * 
	 * List the Zimlet description as XML or JSON Element.
	 * 
	 * @param elem - Parent Element node
	 * @param zimlet
	 */
	public static void listZimlet(Element elem, Zimlet zimlet, int priority) {
        loadZimlets();
        ZimletFile zf = (ZimletFile) sZimlets.get(zimlet.getName());
        if (zf == null) {
            ZimbraLog.zimlet.warn("cannot find zimlet "+zimlet.getName());
            return;
        }
        String zimletBase = ZIMLET_BASE + "/" + zimlet.getName() + "/";
        Element entry = elem.addElement(AccountConstants.E_ZIMLET);
        Element zimletContext = entry.addElement(AccountConstants.E_ZIMLET_CONTEXT);
        zimletContext.addAttribute(AccountConstants.A_ZIMLET_BASE_URL, zimletBase);
        if (priority >= 0) {
        	zimletContext.addAttribute(AccountConstants.A_ZIMLET_PRIORITY, priority);
        }
        try {
			zf.getZimletDescription().addToElement(entry);
			String config = zimlet.getHandlerConfig();
			if (config != null)
			    entry.addElement(Element.parseXML(config, elem.getFactory()));
		} catch (Exception e) {
		    ZimbraLog.zimlet.warn("error loading zimlet "+zimlet, e);
		}
	}
	
	/**
	 * 
	 * List the description of all the dev test Zimlets as Element.
	 * 
	 * @param elem - Parent element node
	 */
	public static void listDevZimlets(Element elem) {
		for (ZimletFile zim : loadDevZimlets().values()) {
			String zimletBase = ZIMLET_BASE + "/" + ZIMLET_DEV_DIR + "/" + zim.getZimletName() + "/";
			Element entry = elem.addElement(AccountConstants.E_ZIMLET);
			Element zimletContext = entry.addElement(AccountConstants.E_ZIMLET_CONTEXT);
			zimletContext.addAttribute(AccountConstants.A_ZIMLET_BASE_URL, zimletBase);
			try {
				zim.getZimletDescription().addToElement(entry);
				if (zim.hasZimletConfig()) {
					zim.getZimletConfig().addToElement(entry);
				}
			} catch (Exception e) {
				ZimbraLog.zimlet.warn("error loading dev zimlet: "+zim.getName(), e);
			}
		}
	}

	private static Map<String,Object> descToMap(ZimletDescription zd) throws ZimletException {
		Map<String,Object> attrs = new HashMap<String,Object>();
		attrs.put(Provisioning.A_zimbraZimletKeyword,         zd.getName());
		attrs.put(Provisioning.A_zimbraZimletVersion,         zd.getVersion().toString());
		attrs.put(Provisioning.A_zimbraZimletDescription,     zd.getDescription());
		attrs.put(Provisioning.A_zimbraZimletHandlerClass,    zd.getServerExtensionClass());
		attrs.put(Provisioning.A_zimbraZimletServerIndexRegex, zd.getRegexString());
		//attrs.put(Provisioning.A_zimbraZimletContentObject,   zd.getContentObjectAsXML());
		//attrs.put(Provisioning.A_zimbraZimletPanelItem,       zd.getPanelItemAsXML());
		//attrs.put(Provisioning.A_zimbraZimletScript,          zd.getScripts());
		return attrs;
	}
	
	private static String getZimletDir() {
		return LC.zimlet_directory.value();
	}

	public static void flushCache() throws ZimletException {
		try {
		    Provisioning.getInstance().flushCache(CacheEntryType.zimlet, null);
		} catch (ServiceException e) {
			throw ZimletException.CANNOT_FLUSH_CACHE(e);
		}
	}

	public static interface DeployListener {
		public void markFinished(Server s);
		public void markFailed(Server s);
	}
	
	/**
	 * Multinode deploy.
	 * 
	 * @param zf
	 * @param listener
	 * @param auth
	 * @throws IOException
	 * @throws ZimletException
	 * @throws ServiceException
	 */
	public static void deployZimlet(ZimletFile zf, DeployListener listener, ZAuthToken auth) throws IOException, ZimletException, ServiceException {
		Server localServer = Provisioning.getInstance().getLocalServer();
		try {
			deployZimlet(zf);
			if (listener != null)
				listener.markFinished(localServer);
		} catch (Exception e) {
			ZimbraLog.zimlet.info("deploy", e);
			if (listener != null)
				listener.markFailed(localServer);
		}

		if (auth == null)
			return;
		
		// deploy on the rest of the servers
		byte[] data = zf.toByteArray();
		ZimletSoapUtil soapUtil = new ZimletSoapUtil(auth);
		soapUtil.deployZimlet(zf.getName(), data, listener);
	}
	
	enum Action { INSTALL, UPGRADE, REPAIR };

	/**
	 * 
	 * Deploys the specified Zimlets.  The following actions are taken.
	 * 1.  Install the Zimlet files on the machine.
	 * 2.  Check the LDAP for the Zimlet entry.  If the entry already exists, stop.
	 * 3.  Install the LDAP entry for the Zimlet.
	 * 4.  Install Zimlet config.
	 * 5.  Activate the zimlet on default COS.
	 * 6.  Enable the Zimlet.
	 * 
	 * @param zimlet
	 * @throws IOException
	 * @throws ZimletException
	 */
	public static void deployZimlet(ZimletFile zf) throws IOException, ZimletException, ServiceException {
		Provisioning prov = Provisioning.getInstance();
		String zimletName = zf.getZimletName();
		ZimletDescription zd = zf.getZimletDescription();
		Zimlet z;
		Action action = Action.INSTALL;
		
		// check if the zimlet already exists in LDAP.
		z = prov.getZimlet(zimletName);
		
		if (z == null) {
			// zimlet was not found in LDAP.
			z = ldapDeploy(zf);
		} else {
			// see if this zimlet needs an upgrade.
			if (!z.isEnabled()) {
				// leave it alone.
				ZimbraLog.zimlet.info("Skipping upgrade of disabled Zimlet " + zimletName);
				return;
			}
			Version ver = new Version(z.getAttr(Provisioning.A_zimbraZimletVersion));
			if (zd.getVersion().compareTo(ver) < 0) {
				ZimbraLog.zimlet.info("Zimlet " + zimletName + " being installed is of an older version.");
				return;
			}
			if (zd.getVersion().compareTo(ver) == 0) {
				action = Action.REPAIR;
			} else {
				action = Action.UPGRADE;
			}
		}
		
		String priority = null;
		String configString = null;

		// upgrade
		if (action == Action.UPGRADE) {
			ZimbraLog.zimlet.info("Upgrading Zimlet " + zimletName + " to " +zd.getVersion().toString());
			// save priority and config
			priority = z.getPriority();
			configString = z.getAttr(Provisioning.A_zimbraZimletHandlerConfig);
			
			prov.deleteZimlet(z.getName());
			z = ldapDeploy(zf);
		}

		// install files
		installZimlet(zf);

		if (action == Action.REPAIR) {
			return;
		}
		
		// set the priority
		if (priority != null) {
			setPriority(z, priority);
		} else {
			setPriority(zimletName, P_MAX);
		}
		
		// install the config
		if (configString != null) {
			updateZimletConfig(zimletName, configString);
		} else if (zf.hasZimletConfig()) {
			installConfig(zf.getZimletConfig());
		}
		
		// activate
		if (!zd.isExtension()) {
			activateZimlet(zimletName, ZIMLET_DEFAULT_COS);
		}
		
		// enable
		enableZimlet(zimletName);
	}

	/**
	 * 
	 * Install the Zimlet file on this machine.
	 * 
	 * @param zimlet
	 * @return
	 * @throws IOException
	 * @throws ZimletException
	 */
	public static void installZimlet(ZimletFile zf) throws IOException, ZimletException {
		ZimletDescription zd = zf.getZimletDescription();
		String zimletName = zd.getName();
		ZimbraLog.zimlet.info("Installing Zimlet " + zimletName + " on this host.");
		String zimletRoot = getZimletDir();
		
		// install the files
		File zimletDir = new File(zimletRoot + File.separatorChar + zimletName);
		if (!zimletDir.exists()) {
			FileUtil.mkdirs(zimletDir);
		}
		
		File serviceLibDir = new File(LC.mailboxd_directory.value() + File.separator + 
									"webapps" + File.separator + 
									"service" + File.separator + 
									"WEB-INF" + File.separator + 
									"lib");

		Iterator files = zf.getAllEntries().entrySet().iterator();
		while (files.hasNext()) {
			Map.Entry f = (Map.Entry) files.next();
			ZimletFile.ZimletEntry entry = (ZimletFile.ZimletEntry) f.getValue();
			String fname = entry.getName();
			File rootDir = zimletDir;
			if (fname.endsWith("/") || fname.endsWith("\\")) {
				continue;
			} else if (fname.endsWith(".jar")) {
				rootDir = serviceLibDir;
			}
			File file = new File(rootDir, fname);
			file.getParentFile().mkdirs();
			writeFile(entry.getContents(), file);
		}

		flushCache();
	}
	
	/**
	 * 
	 * Deploy the Zimlet to LDAP.
	 * 
	 * @param zimlet
	 * @throws IOException
	 * @throws ZimletException
	 */
	public static void ldapDeploy(String zimlet) throws ServiceException, IOException, ZimletException {
		String zimletRoot = getZimletDir();
		ZimletFile zf = new ZimletFile(zimletRoot + File.separator + zimlet);
		ldapDeploy(zf);
	}
	
	public static Zimlet ldapDeploy(ZimletFile zf) throws ServiceException, IOException, ZimletException {
		ZimletDescription zd = zf.getZimletDescription();
		String zimletName = zd.getName();
		Map<String,Object> attrs = descToMap(zd);
		List <String> targets = zd.getTargets();
		if(targets != null && targets.size()>0)
			attrs.put(Provisioning.A_zimbraZimletTarget, targets);
		
		String disableZimletUndeploy = zd.getDisableUIUndeploy();
		if(disableZimletUndeploy != null && disableZimletUndeploy.equalsIgnoreCase("true"))
			attrs.put(Provisioning.A_zimbraAdminExtDisableUIUndeploy, Provisioning.TRUE);
		
		ZimbraLog.zimlet.info("Deploying Zimlet " + zimletName + " in LDAP.");

		// add zimlet entry to ldap
		Provisioning prov = Provisioning.getInstance();
		Zimlet zim = prov.createZimlet(zimletName, attrs);
		if (zd.isExtension()) {
			Map<String,String> attr = new HashMap<String,String>();
			attr.put(Provisioning.A_zimbraZimletIsExtension, Provisioning.TRUE);
			prov.modifyAttrs(zim, attr);
		}
		return zim;
	}
	
	private static void writeFile(byte[] src, File dest) throws IOException {
		dest.createNewFile();
		ByteArrayInputStream bais = new ByteArrayInputStream(src);
		FileOutputStream fos = new FileOutputStream(dest);
		ByteUtil.copy(bais, true, fos, true);
	}

	/**
	 * 
	 * Delete the Zimlet from LDAP.
	 * 
	 * @param zimlet
	 * @throws ZimletException
	 */
	public static void uninstallZimlet(String zimlet, ZAuthToken auth) throws ServiceException {
		ZimbraLog.zimlet.info("Uninstalling Zimlet " + zimlet + " from LDAP.");
		Provisioning prov = Provisioning.getInstance();

		@SuppressWarnings({"unchecked"})
		List<Cos> cos = prov.getAllCos();
		for (Cos c : cos) {
			try {
				deactivateZimlet(zimlet, c.getName());
			} catch (Exception e) {
				ZimbraLog.zimlet.warn("Error deactiving Zimlet " + zimlet + " in LDAP.", e);
			}
		}
		try {
			prov.deleteZimlet(zimlet);
		} catch (ServiceException se) {
			ZimbraLog.zimlet.warn("Error deleting Zimlet " + zimlet + " in LDAP.", se);
		}
		
		if (auth == null)
			return;
		
		// deploy on the rest of the servers
		ZimletSoapUtil soapUtil = new ZimletSoapUtil(auth);
		soapUtil.undeployZimlet(zimlet);
	}
	
	/**
	 * 
	 * Add the Zimlet to specified COS.
	 * 
	 * @param zimlet
	 * @param cos
	 * @throws ZimletException
	 */
	public static void activateZimlet(String zimlet, String cos) throws ServiceException, ZimletException {
		ZimbraLog.zimlet.info("Adding Zimlet " + zimlet + " to COS " + cos);
		Provisioning prov = Provisioning.getInstance();
		Cos c = prov.get(CosBy.name, cos);
		if (c == null)
			throw ZimletException.CANNOT_ACTIVATE("no such cos " + cos, null);
		Map<String,Object> attrs = new HashMap<String, Object>();
		attrs.put("+"+Provisioning.A_zimbraZimletAvailableZimlets, zimlet);
		prov.modifyAttrs(c, attrs);            
		ZimletConfig zc = getZimletConfig(zimlet);
		if (zc == null)
			return;
		String allowedDomains = zc.getConfigValue(ZIMLET_ALLOWED_DOMAINS);
		if (allowedDomains != null)
			addAllowedDomains(allowedDomains, cos);
	}
	
	/**
	 * 
	 * Remove the Zimlet from COS.
	 * 
	 * @param zimlet
	 * @param cos
	 * @throws ZimletException
	 */
	public static void deactivateZimlet(String zimlet, String cos) throws ServiceException, ZimletException {
		ZimbraLog.zimlet.info("Removing Zimlet " + zimlet + " from COS " + cos);
		Provisioning prov = Provisioning.getInstance();
		Cos c = prov.get(CosBy.name, cos);
		if (c == null)
			throw ZimletException.CANNOT_DEACTIVATE("no such cos " + cos, null);
		Map<String,Object> attrs = new HashMap<String, Object>();
		attrs.put("-"+Provisioning.A_zimbraZimletAvailableZimlets, zimlet);
		prov.modifyAttrs(c, attrs);
		ZimletConfig zc = getZimletConfig(zimlet);
		if (zc == null)
			return;
		String domains = zc.getConfigValue(ZIMLET_ALLOWED_DOMAINS);
		if (domains == null)
			return;
		String[] domainArray = domains.toLowerCase().split(",");
		Set<String> domainsToRemove = new HashSet<String>();
		for (String d : domainArray)
			domainsToRemove.add(d);
		String[] zimlets = c.getMultiAttr(Provisioning.A_zimbraZimletAvailableZimlets);
		for (String z : zimlets) {
			if (z.equals(zimlet))
				continue;
			zc = getZimletConfig(z);
			if (zc == null)
				continue;
			domains = zc.getConfigValue(ZIMLET_ALLOWED_DOMAINS);
			if (domains == null)
				continue;
			domainArray = domains.toLowerCase().split(",");
			for (String d : domainArray)
				domainsToRemove.remove(d);
		}
		if (!domainsToRemove.isEmpty())
			removeAllowedDomains(domainsToRemove, cos);
	}
	
	/**
	 * 
	 * Change the enabled status of the Zimlet.
	 * 
	 * @param zimlet
	 * @param enabled
	 * @throws ZimletException
	 */
	public static void setZimletEnable(String zimlet, boolean enabled) throws ZimletException {
		Provisioning prov = Provisioning.getInstance();
		try {
			Zimlet z = prov.getZimlet(zimlet);
			if (z == null)
	            throw AccountServiceException.NO_SUCH_ZIMLET(zimlet);
            Map<String,String> attr = new HashMap<String,String>();
            attr.put(Provisioning.A_zimbraZimletEnabled, enabled ? Provisioning.TRUE : Provisioning.FALSE);
            prov.modifyAttrs(z, attr);
		} catch (Exception e) {
			if (enabled)
				throw ZimletException.CANNOT_ENABLE(zimlet, e);
			else
				throw ZimletException.CANNOT_DISABLE(zimlet, e);
		}
	}
	
	/**
	 * 
	 * Enable the Zimlet.  Only the enabled Zimlets are available to the users.
	 * 
	 * @param zimlet
	 * @throws ZimletException
	 */
	public static void enableZimlet(String zimlet) throws ZimletException {
		ZimbraLog.zimlet.info("Enabling Zimlet " + zimlet);
		setZimletEnable(zimlet, true);
	}
	
	/**
	 * 
	 * Disable the Zimlet.  Disabled Zimlets are not available to the users.
	 * 
	 * @param zimlet
	 * @throws ZimletException
	 */
	public static void disableZimlet(String zimlet) throws ZimletException {
		ZimbraLog.zimlet.info("Disabling Zimlet " + zimlet);
		setZimletEnable(zimlet, false);
	}
	
	/**
	 * 
	 * Change the Zimlet COS ACL.
	 * 
	 * @param zimlet
	 * @param args
	 * @throws ZimletException
	 */
	public static void aclZimlet(String zimlet, String[] args) throws ServiceException, ZimletException {
		for (int i = 2; i < args.length; i+=2) {
			String cos = args[i];
			String action = args[i+1].toLowerCase();
			if (action.equals("grant")) {
				activateZimlet(zimlet, cos);
			} else if (action.equals("deny")) {
				deactivateZimlet(zimlet, cos);
			} else {
				throw ZimletException.ZIMLET_HANDLER_ERROR("invalid acl command "+args[i+1]);
			}
		}
	}
	
	/**
	 * 
	 * List all the COS the Zimlet is available to.
	 * 
	 * @param zimlet
	 * @throws ZimletException
	 */
	public static void listAcls(String zimlet) throws ServiceException, ZimletException {
		System.out.println("Listing COS entries for Zimlet "+zimlet+"...");
		Provisioning prov = Provisioning.getInstance();
		for (Cos cos : prov.getAllCos()) {
			String[] zimlets = cos.getMultiAttr(Provisioning.A_zimbraZimletAvailableZimlets);
			for (int i = 0; i < zimlets.length; i++) {
				if (zimlets[i].equals(zimlet)) {
					System.out.println("\t"+cos.getName());
					break;
				}
			}
		}
	}
	
	/**
	 * 
	 * Print all the Zimlets installed on this host.
	 * 
	 * @throws ZimletException
	 */
	public static void listInstalledZimletsOnHost(boolean everything) {
		loadZimlets();
		ZimletFile[] zimlets = (ZimletFile[]) sZimlets.values().toArray(new ZimletFile[0]);
		Arrays.sort(zimlets);
		for (int i = 0; i < zimlets.length; i++) {
			ZimletDescription zd;
			System.out.print("\t"+zimlets[i].getZimletName());
			try {
				zd = zimlets[i].getZimletDescription();
				boolean isExtension = (zd != null && zd.isExtension());
				if (!everything && isExtension) {
					continue;
				}
				if (isExtension) {
					System.out.print(" (ext)");
				}
			} catch (Exception e) {
				ZimbraLog.zimlet.warn("error reading zimlet : "+zimlets[i].getName(), e);
			}
			System.out.println();
		}
	}
	
	/**
	 * 
	 * Print all the Zimlets on LDAP.
	 * 
	 * @throws ZimletException
	 */
	public static void listInstalledZimletsInLdap(boolean everything) throws ServiceException, ZimletException {
		Provisioning prov = Provisioning.getInstance();
		for (Zimlet z : prov.listAllZimlets()) {
			boolean isExtension = z.isExtension();
			if (!everything && isExtension) {
				continue;
			}
			System.out.print("\t"+z.getName());
			if (!z.isEnabled()) {
				System.out.print(" (disabled)");
			}
			if (isExtension) {
				System.out.print(" (ext)");
			}
			System.out.println();
		}
	}
	
	/**
	 * 
	 * Print the Zimlet COS ACL for all the Zimlets.
	 * 
	 * @throws ZimletException
	 */
	public static void listZimletsInCos() throws ServiceException, ZimletException {
		Provisioning prov = Provisioning.getInstance();
		for (Cos cos : prov.getAllCos()) {
			System.out.println("  "+cos.getName()+":");
			String[] zimlets = cos.getMultiAttr(Provisioning.A_zimbraZimletAvailableZimlets);
			Arrays.sort(zimlets);
			for (int i = 0; i < zimlets.length; i++) {
				System.out.println("\t"+zimlets[i]);
			}
		}
	}
	
	/**
	 * 
	 * Print all the Zimlets installed on the host, on LDAP, and COS ACL.
	 * 
	 * @throws ZimletException
	 */
	public static void listAllZimlets(boolean everything) throws ServiceException, ZimletException {
		System.out.println("Installed Zimlet files on this host:");
		listInstalledZimletsOnHost(everything);
		System.out.println("Installed Zimlets in LDAP:");
		listInstalledZimletsInLdap(everything);
		System.out.println("Available Zimlets in COS:");
		listZimletsInCos();
	}
	
	/**
	 * 
	 * Dump the config template for the Zimlet.
	 * 
	 * @param zimlet
	 * @throws IOException
	 * @throws ZimletException
	 */
	public static void dumpConfig(String zimlet) throws IOException, ZimletException {
		ZimletFile zf = new ZimletFile(zimlet);
		String config = zf.getZimletConfigString();
		System.out.println(config);
	}
	
	/**
	 * 
	 * Install the Zimlet configuration.
	 * 
	 * @param config
	 * @throws IOException
	 * @throws ZimletException
	 */
	public static void installConfig(ZimletConfig zc) throws ServiceException, IOException, ZimletException {
		String zimletName = zc.getName();
		ZimbraLog.zimlet.info("Installing Zimlet config for " + zimletName);
		String configString = zc.toXMLString();
		updateZimletConfig(zimletName, configString);
		String allowedDomains = zc.getConfigValue(ZIMLET_ALLOWED_DOMAINS);
		if (allowedDomains != null) {
			addAllowedDomains(allowedDomains, "default");  // XXX to default cos for now
		}
	}
    
	public static void addAllowedDomains(String domains, String cosName) throws ServiceException {
	    Provisioning prov = Provisioning.getInstance();          
	    Cos cos = prov.get(CosBy.name, cosName);
	    Set<String> domainSet = cos.getMultiAttrSet(Provisioning.A_zimbraProxyAllowedDomains);
	    String[] domainArray = domains.toLowerCase().split(",");
	    for (int i = 0; i < domainArray.length; i++) {
	        domainSet.add(domainArray[i]);
	    }
	    Map<String, String[]> newlist = new HashMap<String, String[]>();
	    newlist.put(Provisioning.A_zimbraProxyAllowedDomains, domainSet.toArray(new String[0]));
	    prov.modifyAttrs(cos, newlist);
	}

	public static void removeAllowedDomains(Set<String> domains, String cosName) throws ServiceException {
	    Provisioning prov = Provisioning.getInstance();            
	    Cos cos = prov.get(CosBy.name, cosName);
	    Set<String> domainSet = cos.getMultiAttrSet(Provisioning.A_zimbraProxyAllowedDomains);
	    String[] domainArray = domains.toArray(new String[0]);
	    for (int i = 0; i < domainArray.length; i++) {
	        domainSet.remove(domainArray[i]);
	    }
	    Map<String, String[]> newlist = new HashMap<String, String[]>();
	    newlist.put(Provisioning.A_zimbraProxyAllowedDomains, domainSet.toArray(new String[0]));
	    prov.modifyAttrs(cos, newlist);
	}
	
	public static void installConfig(String config) throws ServiceException, IOException, ZimletException {
		installConfig(new ZimletConfig(config));
	}
	
	public static void listPriority() throws ServiceException {
		List<Zimlet> plist = orderZimletsByPriority();
		System.out.println("Pri\tZimlet");
		for (int i = 0; i < plist.size(); i++) {
			System.out.println(i + "\t" + plist.get(i).getName());
		}
	}
	
	
	public static void setPriority(String zimlet, int priority) throws ServiceException {
		List<Zimlet> plist = orderZimletsByPriority();
		Provisioning prov = Provisioning.getInstance();
		Zimlet z = prov.getZimlet(zimlet);
		if (z == null)
            throw AccountServiceException.NO_SUCH_ZIMLET(zimlet);
		setPriority(z, priority, plist);
	}

    
    private static void setPriority(Zimlet zimlet, String priority) throws ServiceException {
        Provisioning prov = Provisioning.getInstance();
        Map<String,String> attr = new HashMap<String,String>();
        attr.put(Provisioning.A_zimbraZimletPriority, priority);
        prov.modifyAttrs(zimlet, attr);
    }
    
	public static void setPriority(Zimlet z, int priority, List<Zimlet> plist) throws ServiceException {
		// remove self first
		// XXX LdapEntry.equals() is not implemented
		for (Zimlet zim : plist) {
			if (zim.compareTo(z) == 0) {
				plist.remove(zim);
				break;
			}
		}
		
		if (priority == P_MAX) {
			priority = plist.size();
		}
		Version newPriority;
		if (priority == 0) {
			newPriority = new Version("0");
			setPriority(z, newPriority.toString());
			plist.add(0, z);
			if (plist.size() > 1) {
				// make sure the previous p0 zimlet is now p1.
				Zimlet p0zimlet = plist.get(1);
				setPriority(p0zimlet, 1, plist);
			}
		} else {
			// take the priority of previous zimlet
			Zimlet oneAbove = plist.get(priority-1);
			String pString = oneAbove.getPriority();
			if (pString == null) {
				// priority is mandatory now, but it could be from old version
				// when we didn't have priorities.
				pString = Integer.toString(priority);
			}
			newPriority = new Version(pString);
			if (priority < plist.size()) {
				// increment, while staying before the next zimlet
				Zimlet oneBelow = plist.get(priority);
				pString = oneBelow.getPriority();
				if (pString == null) {
					pString = Integer.toString(priority+2);
				}
				Version nextPriority = new Version(pString);
				if (newPriority.compareTo(nextPriority) < 0)
					newPriority.increment(nextPriority);
				else {
					// it really is an error because priorities of two zimlets
					// shouldn't be the same.  bump the next one down
					newPriority.increment();
					setPriority(z, newPriority.toString());
					plist.add(priority, z);
					setPriority(oneBelow, priority + 1, plist);
					return;
				}
			} else {
				// simply increment from the previous priority
				newPriority.increment();
			}
			setPriority(z, newPriority.toString());
		}

		try {
			flushCache();
		}
		catch (Exception e) {
			Throwable t = e.getCause();
			if (t instanceof ServiceException) {
				throw (ServiceException)t;
			}
			if (e instanceof IOException) {
				t = e;
			}
			throw ServiceException.FAILURE("unable to set priority", t);
		}
	}
	
	public static void deployZimletBySoap(String zimletFile, String adminURL, String uploadURL) throws ServiceException, IOException {
	    deployZimletBySoap(zimletFile, adminURL, uploadURL, null, null);
	}
	
	public static void deployZimletBySoap(String zimletFile, String adminURL, String uploadURL, String username, String password) throws ServiceException, IOException {
        File zf = new File(zimletFile);
        if (adminURL != null && uploadURL != null) {
            ZimletSoapUtil soapUtil = new ZimletSoapUtil(adminURL, uploadURL, username, password);
            soapUtil.deployZimletOnServer(zf.getName(), ByteUtil.getContent(zf));
        } else {
            ZimletSoapUtil soapUtil = new ZimletSoapUtil();
            soapUtil.deployZimlet(zf.getName(), ByteUtil.getContent(zf), null);
        }
	}
	
	private static void test() {
		String ZIMLET_URL = "^/service/zimlet/([^/\\?]+)[/\\?]?.*$";
		String t1 = "/service/zimlet/po";
		String t2 = "/service/zimlet/foo?123";
		Pattern mPattern = Pattern.compile(ZIMLET_URL);
		Matcher matcher = mPattern.matcher(t1);
		if (matcher.matches()) {
			System.out.println( matcher.group(1) );
		}
		matcher = mPattern.matcher(t2);
		if (matcher.matches()) {
			System.out.println( matcher.group(1) );
		}
	}
	
	private static class ZimletSoapUtil {
		private String mUsername;
		private String mPassword;
		private String mAttachmentId;
		private String mAdminURL;
		private String mUploadURL;
		private ZAuthToken mAuth;
		private SoapHttpTransport mTransport;
		private boolean mRunningInServer;
		private Provisioning mProv;

        public ZimletSoapUtil() throws ServiceException {
            initZimletSoapUtil(null, null);
        }
        
        public ZimletSoapUtil(String adminURL, String uploadURL) throws ServiceException {
            this(adminURL, uploadURL, null, null);
        }
        
        public ZimletSoapUtil(String adminURL, String uploadURL, String username, String password) throws ServiceException {
            mAdminURL = adminURL;
            mUploadURL = uploadURL;
            initZimletSoapUtil(username, password);
        }
        
        private void initZimletSoapUtil(String username, String password) throws ServiceException {
            mUsername = username != null ? username : LC.zimbra_ldap_user.value();
            mPassword = password != null ? password : LC.zimbra_ldap_password.value();
            mAuth = null;
            mRunningInServer = false;
            
            String adminURL = mAdminURL;
            if (adminURL == null) {
                String server = LC.zimbra_zmprov_default_soap_server.value();
                adminURL = URLUtil.getAdminURL(server);
            }
            SoapProvisioning sp = new SoapProvisioning();
            sp.soapSetURI(adminURL);
            sp.soapAdminAuthenticate(mUsername, mPassword);
            mProv = sp;             
        }
		
		public ZimletSoapUtil(ZAuthToken auth) {
			mAuth = auth;
			mRunningInServer = true;
			mProv = Provisioning.getInstance();
		}
				
		public void deployZimlet(String zimlet, byte[] data, DeployListener listener) throws ServiceException {
			List<Server> allServers = mProv.getAllServers();
			for (Server server : allServers) {
				// localhost is already taken care of.
		        boolean hasMailboxService = server.getMultiAttrSet(Provisioning.A_zimbraServiceEnabled).contains("mailbox");
				if (mRunningInServer && (mProv.getLocalServer().compareTo(server) == 0) ||
					!hasMailboxService) {
					ZimbraLog.zimlet.info("Skipping on " + server.getName());
					continue;
				}
				ZimbraLog.zimlet.info("Deploying on " + server.getName());
				deployZimletOnServer(zimlet, data, server, listener);
			}
		}
		
		public void undeployZimlet(String zimlet) throws ServiceException {
			List<Server> allServers = mProv.getAllServers();
			for (Server server : allServers) {
		        boolean hasMailboxService = server.getMultiAttrSet(Provisioning.A_zimbraServiceEnabled).contains("mailbox");
				if (mRunningInServer && (mProv.getLocalServer().compareTo(server) == 0) ||
					!hasMailboxService)
					continue;
				ZimbraLog.zimlet.info("Undeploying on " + server.getName());
				undeployZimletOnServer(zimlet, server);
			}
		}
		
        public void configureZimlet(byte[] config, boolean localInstall) throws ServiceException {
			if (localInstall) {
				ZimbraLog.zimlet.info("Configure zimlet on " + mProv.getLocalServer().getName());
                configureZimletOnServer(config, mProv.getLocalServer());
			} else {
				List<Server> allServers = mProv.getAllServers();
				for (Server server : allServers) {
					boolean hasMailboxService = server.getMultiAttrSet(Provisioning.A_zimbraServiceEnabled).contains("mailbox");
					if (mRunningInServer && (mProv.getLocalServer().compareTo(server) == 0) ||
						!hasMailboxService)
						continue;
					ZimbraLog.zimlet.info("Configure zimlet on " + server.getName());
					configureZimletOnServer(config, server);
				}
			}
        }
        
        public void deployZimletOnServer(String zimlet, byte[] data) throws ServiceException {
            mTransport = null;
            try {
                mTransport = new SoapHttpTransport(mAdminURL);
                auth();
                mTransport.setAuthToken(mAuth);                
                URL url = new URL(mUploadURL);
                mAttachmentId = postAttachment(mUploadURL, zimlet, data, url.getHost());
                
                soapDeployZimlet();
                ZimbraLog.zimlet.info("Deploy initiated.  Check the server's mailbox.log for the status.");
            } catch (Exception e) {
                ZimbraLog.zimlet.info("deploy failed on " + mAdminURL, e);
                if (e instanceof ServiceException)
                    throw (ServiceException)e;
                else 
                    throw ServiceException.FAILURE("Unable to deploy Zimlet " + zimlet + " on " + mAdminURL, e);
            } finally {
                if (mTransport != null)
                    mTransport.shutdown();
            }                        
        }
        
		public void deployZimletOnServer(String zimlet, byte[] data, Server server, DeployListener listener) throws ServiceException {
			mTransport = null;
			try {
				String adminUrl = URLUtil.getAdminURL(server, ZimbraServlet.ADMIN_SERVICE_URI);
				mTransport = new SoapHttpTransport(adminUrl);
				
				// auth if necessary
				if (mAuth == null)
					auth();
				mTransport.setAuthToken(mAuth);
				
				// upload
				String uploadUrl = URLUtil.getAdminURL(server, "/service/upload?fmt=raw");
				mAttachmentId = postAttachment(uploadUrl, zimlet, data, server.getName());
				
				// deploy
				soapDeployZimlet();
				ZimbraLog.zimlet.info("Deploy initiated.  (check the servers mailbox.log for the status)");
				if (listener != null)
					listener.markFinished(server);
			} catch (Exception e) {
				ZimbraLog.zimlet.info("deploy failed on "+server.getName(), e);
				if (listener != null)
					listener.markFailed(server);
				else if (e instanceof ServiceException)
					throw (ServiceException)e;
				else 
					throw ServiceException.FAILURE("Unable to deploy Zimlet " + zimlet + " on " + server.getName(), e);
			} finally {
				if (mTransport != null)
					mTransport.shutdown();
			}
		}
		
		private void soapDeployZimlet() throws ServiceException, IOException {
			XMLElement req = new XMLElement(AdminConstants.DEPLOY_ZIMLET_REQUEST);
			req.addAttribute(AdminConstants.A_ACTION, AdminConstants.A_DEPLOYLOCAL);
			req.addElement(MailConstants.E_CONTENT).addAttribute(MailConstants.A_ATTACHMENT_ID, mAttachmentId);
			mTransport.invoke(req);
		}
		
		public void undeployZimletOnServer(String zimlet, Server server) throws ServiceException {
			mTransport = null;
			try {
				String adminUrl = URLUtil.getAdminURL(server, ZimbraServlet.ADMIN_SERVICE_URI);
				mTransport = new SoapHttpTransport(adminUrl);
				
				// auth if necessary
				if (mAuth == null)
					auth();
				mTransport.setAuthToken(mAuth);
				
				// undeploy
				soapUndeployZimlet(zimlet);
				ZimbraLog.zimlet.info("Undeploy initiated.  (check the servers mailbox.log for the status)");
			} catch (Exception e) {
				if (e instanceof ServiceException)
					throw (ServiceException)e;
				else 
					throw ServiceException.FAILURE("Unable to undeploy Zimlet " + zimlet + " on " + server.getName(), e);
			} finally {
				if (mTransport != null)
					mTransport.shutdown();
			}
		}
		
        private void soapUndeployZimlet(String name) throws ServiceException, IOException {
            XMLElement req = new XMLElement(AdminConstants.UNDEPLOY_ZIMLET_REQUEST);
            req.addAttribute(AdminConstants.A_ACTION, AdminConstants.A_DEPLOYLOCAL);
            req.addAttribute(AdminConstants.A_NAME, name);
            mTransport.invoke(req);
        }
        
        public void configureZimletOnServer(byte[] config, Server server) throws ServiceException {
            mTransport = null;
            try {
                String adminUrl = URLUtil.getAdminURL(server, ZimbraServlet.ADMIN_SERVICE_URI);
                mTransport = new SoapHttpTransport(adminUrl);
                
                // auth if necessary
                if (mAuth == null)
                    auth();
                mTransport.setAuthToken(mAuth);
                
                // upload
                String uploadUrl = URLUtil.getAdminURL(server, "/service/upload?fmt=raw");
                mAttachmentId = postAttachment(uploadUrl, "config.xml", config, server.getName());
                
                // configure
                soapConfigureZimlet();
                ZimbraLog.zimlet.info("Configure initiated.  (check the servers mailbox.log for the status)");
            } catch (Exception e) {
                if (e instanceof ServiceException)
                    throw (ServiceException)e;
                else 
                    throw ServiceException.FAILURE("Unable to configure Zimlet on " + server.getName(), e);
            } finally {
                if (mTransport != null)
                    mTransport.shutdown();
            }
        }
        
        private void soapConfigureZimlet() throws ServiceException, IOException {
            XMLElement req = new XMLElement(AdminConstants.CONFIGURE_ZIMLET_REQUEST);
            req.addElement(MailConstants.E_CONTENT).addAttribute(MailConstants.A_ATTACHMENT_ID, mAttachmentId);
            mTransport.invoke(req);
        }
        
	    private String postAttachment(String uploadURL, String name, byte[] data, String domain) throws IOException, ZimletException {
	    	String aid = null;

	    	HttpClient client = new HttpClient();
	        Map<String, String> cookieMap = mAuth.cookieMap(true);
	        if (cookieMap != null) {
	            HttpState state = new HttpState();
	            for (Map.Entry<String, String> ck : cookieMap.entrySet()) {
	                state.addCookie(new org.apache.commons.httpclient.Cookie(domain, ck.getKey(), ck.getValue(), "/", -1, false));
	            }
	            client.setState(state);
	            client.getParams().setCookiePolicy(CookiePolicy.BROWSER_COMPATIBILITY);
	        }

	    	PostMethod post = new PostMethod(uploadURL);
	    	client.getHttpConnectionManager().getParams().setConnectionTimeout(10000);
	    	int statusCode = -1;
	    	try {
	    		String contentType = URLConnection.getFileNameMap().getContentTypeFor(name);
	    		Part[] parts = { new ByteArrayPart(data, name, contentType) };
	    		post.setRequestEntity( new MultipartRequestEntity(parts, post.getParams()) );
	    		statusCode = client.executeMethod(post);

	    		if (statusCode == 200) {
                    String response = post.getResponseBodyAsString();
                    // "raw" response should be of the format
                    //   200,'null','aac04dac-b3c8-4c26-b9c2-c2534f1d6ba1:79d2722f-d4c7-4304-9961-e7bcb146fc32'
                    String[] responseParts = response.split(",", 3);
                    if (responseParts.length == 3) {
                        aid = responseParts[2].trim();
                        if (aid.startsWith("'") || aid.startsWith("\""))
                            aid = aid.substring(1);
                        if (aid.endsWith("'") || aid.endsWith("\""))
                            aid = aid.substring(0, aid.length() - 1);
                    }
                    if (aid == null)
                        throw ZimletException.CANNOT_DEPLOY("Attachment post failed, unexpected response: " + response, null);
	    		} else {
    				throw ZimletException.CANNOT_DEPLOY("Attachment post failed, status=" + statusCode, null);
	    		}
	    	} finally {
	    		post.releaseConnection();
	    	}

	    	return aid;
	    }
	    
		private void auth() throws ServiceException, IOException {
			XMLElement req = new XMLElement(AdminConstants.AUTH_REQUEST);
			req.addElement(AdminConstants.E_NAME).setText(mUsername);
			req.addElement(AdminConstants.E_PASSWORD).setText(mPassword);
			Element resp = mTransport.invoke(req);
			// mAuth = resp.getElement(AccountConstants.E_AUTH_TOKEN).getText();
			mAuth = new ZAuthToken(resp.getElement(AccountConstants.E_AUTH_TOKEN), true);
		}
		private static class ByteArrayPart extends PartBase {
			private byte[] mData;
			private String mName;
			public ByteArrayPart(byte[] data, String name, String type) throws IOException {
				super(name, type, "UTF-8", "binary");
				mName = name;
				mData = data;
			}
			protected void sendData(OutputStream out) throws IOException {
				out.write(mData);
			}
			protected long lengthOfData() throws IOException {
				return mData.length;
			}
		    protected void sendDispositionHeader(OutputStream out) throws IOException {
		    	super.sendDispositionHeader(out);
		    	StringBuilder buf = new StringBuilder();
		    	buf.append("; filename=\"").append(mName).append("\"");
		    	out.write(buf.toString().getBytes());
		    }
		}
	}
	
	private static final int INSTALL_ZIMLET = 10;
	private static final int UNINSTALL_ZIMLET = 11;
	private static final int LIST_ZIMLETS = 12;
	private static final int ACL_ZIMLET = 13;
	private static final int LIST_ACLS = 14;
	private static final int DUMP_CONFIG = 15;
	private static final int INSTALL_CONFIG = 16;
	private static final int LDAP_DEPLOY = 17;
	private static final int DEPLOY_ZIMLET = 18;
	private static final int ENABLE_ZIMLET = 19;
	private static final int DISABLE_ZIMLET = 20;
	private static final int LIST_PRIORITY = 21;
	private static final int SET_PRIORITY = 22;
	private static final int TEST = 99;
	
	private static final String INSTALL_CMD = "install";
	private static final String UNINSTALL_CMD = "uninstall";
	private static final String UNDEPLOY_CMD = "undeploy";
	private static final String LIST_CMD = "listzimlets";
	private static final String ACL_CMD = "acl";
	private static final String LIST_ACLS_CMD = "listacls";
	private static final String DUMP_CONFIG_CMD = "getconfigtemplate";
	private static final String INSTALL_CONFIG_CMD = "configure";
	private static final String LDAP_DEPLOY_CMD = "ldapdeploy";
	private static final String DEPLOY_CMD = "deploy";
	private static final String ENABLE_CMD = "enable";
	private static final String DISABLE_CMD = "disable";
	private static final String LIST_PRIORITY_CMD = "listpriority";
	private static final String SET_PRIORITY_CMD = "setpriority";
	private static final String TEST_CMD = "test";
	
	private static Map<String,Integer> mCommands;
	
	private static void addCommand(String cmd, int cmdId) {
		mCommands.put(cmd, new Integer(cmdId));
	}
	
	private static void setup() {
		mCommands = new HashMap<String,Integer>();
		addCommand(DEPLOY_CMD, DEPLOY_ZIMLET);
		addCommand(UNDEPLOY_CMD, UNINSTALL_ZIMLET);
		addCommand(INSTALL_CMD, INSTALL_ZIMLET);
		addCommand(UNINSTALL_CMD, UNINSTALL_ZIMLET);
		addCommand(LIST_CMD, LIST_ZIMLETS);
		addCommand(ACL_CMD, ACL_ZIMLET);
		addCommand(LIST_ACLS_CMD, LIST_ACLS);
		addCommand(DUMP_CONFIG_CMD, DUMP_CONFIG);
		addCommand(INSTALL_CONFIG_CMD, INSTALL_CONFIG);
		addCommand(LDAP_DEPLOY_CMD, LDAP_DEPLOY);
		addCommand(ENABLE_CMD, ENABLE_ZIMLET);
		addCommand(DISABLE_CMD, DISABLE_ZIMLET);
		addCommand(LIST_PRIORITY_CMD, LIST_PRIORITY);
		addCommand(SET_PRIORITY_CMD, SET_PRIORITY);
		addCommand(TEST_CMD, TEST);
	}
	
	private static void usage() {
		System.out.println("zmzimletctl: [-l] [-a <admin url> -u <upload url>] [command] [ zimlet.zip | config.xml | zimlet ]");
		System.out.println("\tdeploy {zimlet.zip} - install, ldapDeploy, grant ACL on default COS, then enable Zimlet");
		System.out.println("\tundeploy {zimlet} - remove the Zimlet from the system");
		System.out.println("\tinstall {zimlet.zip} - installs the Zimlet files on this host");
		System.out.println("\tldapDeploy {zimlet} - add the Zimlet entry to the system");
		System.out.println("\tenable {zimlet} - enables the Zimlet");
		System.out.println("\tdisable {zimlet} - disables the Zimlet");
		System.out.println("\tacl {zimlet} {cos1} grant|deny [{cos2} grant|deny...] - change the ACL for the Zimlet on a COS");
		System.out.println("\tlistAcls {zimlet} - list ACLs for the Zimlet");
		System.out.println("\tlistZimlets - show status of all the Zimlets in the system.");
		System.out.println("\tgetConfigTemplate {zimlet.zip} - dumps the configuration");
		System.out.println("\tconfigure {config.xml} - installs the configuration");
		System.out.println("\tlistPriority - show the current Zimlet priorities (0 high, 9 low)");
		System.out.println("\tsetPriority {zimlet} {priority} - set Zimlet priority");
		System.exit(1);
	}
	
	private static int lookupCmd(String cmd) {
		Integer i = (Integer) mCommands.get(cmd.toLowerCase());
		if (i == null) {
			usage();
		}
		return i.intValue();
	}
	
	private static void dispatch(String[] args) {
		boolean localInstall = false;
		if (args[argPos].equals("-l")) {
			localInstall = true;
			argPos++;
		}
		String adminURL = null;
		String uploadURL = null;
		if (args[argPos].equals("-a")) {
			adminURL = args[++argPos];
			argPos++;
		}
        if (args[argPos].equals("-u")) {
            uploadURL = args[++argPos];
            argPos++;
        }		
        if (argPos >= args.length)
            usage();

		int cmd = lookupCmd(args[argPos++]);
		try {
			switch (cmd) {
			case LIST_ZIMLETS:
				boolean everything = false;
				if (args.length > argPos && args[argPos].equals("all")) {
					everything = true;
				}
				listAllZimlets(everything);
				System.exit(0);
			case LIST_PRIORITY:
				listPriority();
				System.exit(0);
			case TEST:
				test();
				System.exit(0);
			}

			if (args.length < argPos+1) {
				usage();
			}
			String zimlet = args[argPos++];
			switch (cmd) {
			case DEPLOY_ZIMLET:
				if (localInstall) {
					deployZimlet(new ZimletFile(zimlet));
				} else {
				    deployZimletBySoap(zimlet, adminURL, uploadURL);				    
				}
				break;
			case INSTALL_ZIMLET:
				installZimlet(new ZimletFile(zimlet));
				break;
			case UNINSTALL_ZIMLET:
				ZimletSoapUtil su = new ZimletSoapUtil();
				if (localInstall) {
					Server localServer = Provisioning.getInstance().getLocalServer();
					su.undeployZimletOnServer(zimlet, localServer);
				} else {
					su.undeployZimlet(zimlet);
				}
				break;
			case LDAP_DEPLOY:
				ldapDeploy(zimlet);
				break;
			case ACL_ZIMLET:
				if (args.length < (argPos+2) || args.length % 2 != 0) {
					usage();
				}
				aclZimlet(zimlet, args);
				break;
			case SET_PRIORITY:
				if (args.length < (argPos+1)) {
					usage();
				}
				setPriority(zimlet, Integer.parseInt(args[argPos]));
				listPriority();
				break;
			case LIST_ACLS:
				listAcls(zimlet);
				break;
			case ENABLE_ZIMLET:
				enableZimlet(zimlet);
				break;
			case DISABLE_ZIMLET:
				disableZimlet(zimlet);
				break;
			case DUMP_CONFIG:
				dumpConfig(zimlet);
				break;
			case INSTALL_CONFIG:
			    ZimletSoapUtil soapUtil = new ZimletSoapUtil();
			    soapUtil.configureZimlet(ByteUtil.getContent(new File(zimlet)),localInstall);
				break;
			default:
				usage();
				break;
			}
		} catch (Exception e) {
		    e.printStackTrace();
			if (sQuietMode)
				ZimbraLog.zimlet.error("Error " + e.getMessage());
			else
				ZimbraLog.zimlet.error("Error", e);
			System.exit(1);
		}
	}
	
	private static boolean sQuietMode = false;
	private static int argPos = 0;
	
	private static void getOpt(String[] args) {
		if (args.length < 1) {
			usage();
		}
		
		int index = 0;
		while (index < args.length) {
			if (args[index].equals("-q")) {
				sQuietMode = true;
			} else {
				break;
			}
			index++;
		}
		argPos = index;
	}
	
    public static void main(String[] args) throws IOException {
        
    	getOpt(args);
    	if (sQuietMode) {
    		CliUtil.toolSetup("WARN");
    	} else {
    		CliUtil.toolSetup();
    	}
    	SoapTransport.setDefaultUserAgent("zmzimletctl", BuildInfo.VERSION);
        setup();
        dispatch(args);
    }
}
