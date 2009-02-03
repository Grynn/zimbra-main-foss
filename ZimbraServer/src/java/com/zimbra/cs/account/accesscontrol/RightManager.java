package com.zimbra.cs.account.accesscontrol;

import java.io.File;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.TreeMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.dom4j.Document;
import org.dom4j.DocumentException;
import org.dom4j.Element;
import org.dom4j.io.SAXReader;

import com.zimbra.common.localconfig.LC;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.ZimbraLog;

import com.zimbra.cs.account.Provisioning;

public class RightManager {
    private static final String E_A            = "a";
    private static final String E_ATTRS        = "attrs";
    private static final String E_DEFAULT      = "default";
    private static final String E_DESC         = "desc";
    private static final String E_DOC          = "doc";
    private static final String E_INCLUDE      = "include";
    private static final String E_R            = "r";
    private static final String E_RIGHTS       = "rights";
    private static final String E_RIGHT        = "right";
    
    private static final String A_FILE         = "file";
    private static final String A_LIMIT        = "l";
    private static final String A_N            = "n";
    private static final String A_NAME         = "name";
    private static final String A_TARGET_TYPE  = "targetType";
    private static final String A_TYPE         = "type";
    private static final String A_USER_RIGHT   = "userRight";
    
    private static final String TARGET_TYPE_DELIMITER   = ",";
    
    private static RightManager mInstance;
    
    // keep the map sorted so "zmmailbox lp" can display in alphabetical order 
    private Map<String, UserRight> sUserRights = new TreeMap<String, UserRight>();  
    private Map<String, AdminRight> sAdminRights = new TreeMap<String, AdminRight>();  

    public static synchronized RightManager getInstance() throws ServiceException {
        if (mInstance != null) {
            return mInstance;
        }
        String dir = LC.zimbra_rights_directory.value();
        mInstance = new RightManager(dir);
        
        try {
            Right.initKnownRights(mInstance);
        } catch (ServiceException e) {
            ZimbraLog.acl.error("failed to initialize known right from: " + dir, e);
            throw e;
        }
        return mInstance;
    }
    
    private RightManager(String dir) throws ServiceException {
        File fdir = new File(dir);
        if (!fdir.exists()) {
            throw ServiceException.FAILURE("rights directory does not exists: " + dir, null);
        }
        if (!fdir.isDirectory()) {
            throw ServiceException.FAILURE("rights directory is not a directory: " + dir, null);
        }
                
        File[] files = fdir.listFiles();
        List<File> yetToProcess = new ArrayList<File>(Arrays.asList(files));
        List<File> processed = new ArrayList<File>();
        
        while (!yetToProcess.isEmpty()) { 
            File file = yetToProcess.get(0);
            
            if (!file.getPath().endsWith(".xml")) {
                ZimbraLog.acl.warn("while loading attrs, ignoring not .xml file: " + file);
                continue;
            }
            if (!file.isFile()) {
                ZimbraLog.acl.warn("while loading attrs, ignored non-file: " + file);
            }
            try {
                boolean done = loadSystemRights(file, processed);
                if (done) {
                    processed.add(file);
                    yetToProcess.remove(file);
                } else {
                    // move this file to the end
                    yetToProcess.remove(file);
                    yetToProcess.add(file);
                }
            } catch (DocumentException de) {
                throw ServiceException.PARSE_ERROR("error loading rights file: " + file, de);
            }
        }
    }
    
    private boolean getBoolean(String value) throws ServiceException {
        if ("1".equals(value))
            return true;
        else if ("0".equals(value))
            return false;
        else
            throw ServiceException.PARSE_ERROR("invalid value:" + value, null);
    }
    
    private boolean getBooleanAttr(Element elem, String attr) throws ServiceException {
        String value = elem.attributeValue(attr);
        if (value == null)
            throw ServiceException.PARSE_ERROR("missing required attribute: " + attr, null);
        return getBoolean(value);
    }
    
    private boolean getBooleanAttr(Element elem, String attr, boolean defaultValue) throws ServiceException {
        String value = elem.attributeValue(attr);
        if (value == null)
            return defaultValue;
        return getBoolean(value);
    }
    
    private void parseDesc(Element eDesc, Right right) throws ServiceException {
        if (right.getDesc() != null)
            throw ServiceException.PARSE_ERROR("multiple " + E_DESC, null);
        right.setDesc(eDesc.getText());
    }
    
    private void parseDoc(Element eDoc, Right right) throws ServiceException {
        if (right.getDoc() != null)
            throw ServiceException.PARSE_ERROR("multiple " + E_DOC, null);
        right.setDoc(eDoc.getText());
    }
    
    private void parseDefault(Element eDefault, Right right) throws ServiceException {
        String defaultValue = eDefault.getText();
        if ("allow".equalsIgnoreCase(defaultValue))
            right.setDefault(Boolean.TRUE);
        else if ("deny".equalsIgnoreCase(defaultValue))
            right.setDefault(Boolean.FALSE);
        else
            throw ServiceException.PARSE_ERROR("invalid default value: " + defaultValue, null);
    }
    
    private void parseAttr(Element eAttr, AttrRight right) throws ServiceException {
        String attrName = eAttr.attributeValue(A_N);
        if (attrName == null)
            throw ServiceException.PARSE_ERROR("missing attr name", null);   
        
        right.validateAttr(attrName);
        right.addAttr(attrName);
    }
    
    private void parseAttrs(Element eAttrs, Right right) throws ServiceException {
        if (!(right instanceof AttrRight))
            throw ServiceException.PARSE_ERROR(E_ATTRS + " is only allowed for admin getAttrs or setAttrs right", null);
        
        AttrRight attrRight = (AttrRight)right;
        for (Iterator elemIter = eAttrs.elementIterator(); elemIter.hasNext();) {
            Element elem = (Element)elemIter.next();
            if (elem.getName().equals(E_A))
                parseAttr(elem, attrRight);
            else
                throw ServiceException.PARSE_ERROR("invalid element: " + elem.getName(), null);   
        }
    }
    
    private void parseRight(Element eAttr, ComboRight right) throws ServiceException {
        String rightName = eAttr.attributeValue(A_N);
        if (rightName == null)
            throw ServiceException.PARSE_ERROR("missing right name", null);   
            
        Right r = getRight(rightName); // getRight will throw if the right does not exist.
        right.addRight(r);
    }
    
    private void parseRights(Element eAttrs, Right right) throws ServiceException {
        if (!(right instanceof ComboRight))
            throw ServiceException.PARSE_ERROR(E_RIGHTS + " is only allowed for admin combo right", null);
        
        ComboRight comboRight = (ComboRight)right;
        
        for (Iterator elemIter = eAttrs.elementIterator(); elemIter.hasNext();) {
            Element elem = (Element)elemIter.next();
            if (elem.getName().equals(E_R))
                parseRight(elem, comboRight);
            else
                throw ServiceException.PARSE_ERROR("invalid element: " + elem.getName(), null);   
        }
    }
    
    private Right parseRight(Element eRight) throws ServiceException {
        String name = eRight.attributeValue(A_NAME);
        
        // system define rights cannot contain a ".".  "." is the separator for inline attr right
        if (name.contains("."))
            throw ServiceException.PARSE_ERROR("righ name cannot contain dot(.): " + name, null);
        
        boolean userRight = getBooleanAttr(eRight, A_USER_RIGHT, false);
        
        // System.out.println("Parsing right " + "(" +  (userRight?"user":"admin") + ") " + name);
        Right right;
        
        AdminRight.RightType rightType = null;
        String targetTypeStr = eRight.attributeValue(A_TARGET_TYPE, null);
        
        if (userRight) {
            if (targetTypeStr != null)
                throw ServiceException.PARSE_ERROR(A_TARGET_TYPE + " is not allowed for user right", null);

            right = new UserRight(name);
            right.setTargetType(TargetType.account);
        } else {
            String rt = eRight.attributeValue(A_TYPE);
            if (rt == null)
                throw ServiceException.PARSE_ERROR("missing attribute [" + A_TYPE + "]", null);
            rightType = AdminRight.RightType.fromString(rt);
            
            right = AdminRight.newAdminSystemRight(name, rightType);
            if (targetTypeStr != null) {
                String taregtTypes[] = targetTypeStr.split(TARGET_TYPE_DELIMITER);
                for (String tt : taregtTypes) {
                    TargetType targetType = TargetType.fromString(tt);
                    right.setTargetType(targetType);
                }
            }
        }

        for (Iterator elemIter = eRight.elementIterator(); elemIter.hasNext();) {
            Element elem = (Element)elemIter.next();
            if (elem.getName().equals(E_DESC))
                parseDesc(elem, right);
            else if (elem.getName().equals(E_DOC))
                parseDoc(elem, right);
            else if (elem.getName().equals(E_DEFAULT))
                parseDefault(elem, right);
            else if (elem.getName().equals(E_ATTRS))
                parseAttrs(elem, right);
            else if (elem.getName().equals(E_RIGHTS))
                parseRights(elem, right);
            else
                throw ServiceException.PARSE_ERROR("invalid element: " + elem.getName(), null);
        }
        
        // verify that all required fields are set and populate internal data
        right.completeRight();

        return right;
    }
    
    private boolean loadSystemRights(File file, List<File> processedFiles) throws DocumentException, ServiceException {
        SAXReader reader = new SAXReader();
        Document doc = reader.read(file);
        Element root = doc.getRootElement();
        if (!root.getName().equals(E_RIGHTS))
            throw ServiceException.PARSE_ERROR("root tag is not " + E_RIGHTS, null);

        boolean seenRight = false;
        for (Iterator iter = root.elementIterator(); iter.hasNext();) {
            Element elem = (Element) iter.next();
            
            // see if all include files are processed already
            if (elem.getName().equals(E_INCLUDE)) {
                // all <include>'s have to appear <right>'s
                if (seenRight)
                    throw ServiceException.PARSE_ERROR(E_INCLUDE + " cannot appear after any right definition: " + elem.getName(), null);
                
                String includeFile = elem.attributeValue(A_FILE);
                boolean processed = false;
                for (File f : processedFiles) {
                    if (f.getName().equals(includeFile)) {
                        processed = true;
                        break;
                    }
                }
                if (!processed)
                    return false;
                else
                    continue;
            }
            
            Element eRight = elem;
            if (!eRight.getName().equals(E_RIGHT))
                throw ServiceException.PARSE_ERROR("unknown element: " + eRight.getName(), null);

            if (!seenRight) {
                seenRight = true;
                ZimbraLog.acl.info("Loading " + file.getName());
            }
            
            String name = eRight.attributeValue(A_NAME);
            if (name == null)
                throw ServiceException.PARSE_ERROR("no name specified", null);
            
            if (sUserRights.get(name) != null || sAdminRights.get(name) != null) 
                throw ServiceException.PARSE_ERROR("right " + name + " is already defined", null);
            
            try {
                Right right = parseRight(eRight); 
                if (right instanceof UserRight)
                    sUserRights.put(name, (UserRight)right);
                else
                    sAdminRights.put(name, (AdminRight)right);
            } catch (ServiceException e) {
                throw ServiceException.PARSE_ERROR("unable to parse right: [" + name + "]", e);
            }
        }
        
        return true;
    }
    
    //
    // getters
    //
    
    public UserRight getUserRight(String right) throws ServiceException {
        UserRight r = sUserRights.get(right);
        if (r == null)
            throw ServiceException.FAILURE("invalid right " + right, null);
        return r;
    }
    
    public AdminRight getAdminRight(String right) throws ServiceException {
        AdminRight r = sAdminRights.get(right);
        if (r == null)
            throw ServiceException.FAILURE("invalid right " + right, null);
        return r;
    }
    
    public Right getRight(String right) throws ServiceException {
        if (InlineAttrRight.looksLikeOne(right))
            return InlineAttrRight.newInlineAttrRight(right);
        else
            return getRight(right, true);
    }
    
    private Right getRight(String right, boolean mustFind) throws ServiceException {
        Right r = sUserRights.get(right);
        if (r == null)
            r = sAdminRights.get(right);
        
        if (mustFind && r == null)
            throw ServiceException.FAILURE("invalid right " + right, null);
        
        return r;
    }
    
    public Map<String, UserRight> getAllUserRights() {
        return sUserRights;
    }
    
    public Map<String, AdminRight> getAllAdminRights() {
        return sAdminRights;
    }
    
    private String dump(StringBuilder sb) {
        if (sb == null)
            sb = new StringBuilder();
        
        sb.append("============\n");
        sb.append("user rights:\n");
        sb.append("============\n");
        for (Map.Entry<String, UserRight> ur : getAllUserRights().entrySet()) {
            sb.append("\n------------------------------\n");
            ur.getValue().dump(sb);
        }
        
        sb.append("\n");
        sb.append("\n");
        sb.append("=============\n");
        sb.append("admin rights:\n");
        sb.append("=============\n");
        for (Map.Entry<String, AdminRight> ar : getAllAdminRights().entrySet()) {
            sb.append("\n------------------------------\n");
            ar.getValue().dump(sb);
        }
        
        return sb.toString();
    }

    /**
     * @param args
     */
    public static void main(String[] args) throws ServiceException {
        ZimbraLog.toolSetupLog4j("DEBUG", "/Users/pshao/sandbox/conf/log4j.properties.phoebe");
        
        RightManager rm = new RightManager("/Users/pshao/p4/main/ZimbraServer/conf/rights");
        System.out.println(rm.dump(null));
        /*
        for (Right r : RightManager.getInstance().getAllRights().values()) {
            System.out.println(r.getName());
            System.out.println("    desc: " + r.getDesc());
            System.out.println("    doc: " + r.getDoc());
            System.out.println();
        }
        */
        
    }
    
}
