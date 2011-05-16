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
package com.zimbra.soap.account;

import com.google.common.base.Charsets;
import com.google.common.collect.Maps;

import java.io.BufferedReader;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Reader;
import java.nio.charset.Charset;
import java.util.List;
import java.util.Map;

import javax.xml.bind.JAXBContext;
import javax.xml.bind.Unmarshaller;

import junit.framework.Assert;
import org.apache.log4j.BasicConfigurator;
import org.apache.log4j.Logger;
import org.apache.log4j.Level;
import org.dom4j.QName;

import org.junit.BeforeClass;
import org.junit.Test;
import com.zimbra.soap.JaxbUtil;
import com.zimbra.soap.account.message.AuthRequest;
import com.zimbra.soap.account.message.CreateIdentityRequest;
import com.zimbra.soap.account.message.GetInfoResponse;
import com.zimbra.soap.account.type.Pref;
import com.zimbra.soap.admin.message.CreateAccountRequest;
import com.zimbra.soap.admin.message.MailQueueActionRequest;
import com.zimbra.soap.admin.type.Attr;
import com.zimbra.soap.admin.type.MailQueueAction;
import com.zimbra.soap.admin.type.MailQueueWithAction;
import com.zimbra.soap.admin.type.QueueQuery;
import com.zimbra.soap.admin.type.QueueQueryField;
import com.zimbra.soap.admin.type.ServerWithQueueAction;
import com.zimbra.soap.admin.type.ValueAttrib;
import com.zimbra.soap.mail.message.ConvActionRequest;
import com.zimbra.soap.mail.message.GetContactsRequest;
import com.zimbra.soap.mail.message.ImportContactsRequest;
import com.zimbra.soap.mail.type.ActionSelector;
import com.zimbra.soap.mail.type.ContactActionSelector;
import com.zimbra.soap.mail.type.FolderActionSelector;
import com.zimbra.soap.mail.type.NoteActionSelector;
import com.zimbra.soap.type.AttributeName;
import com.zimbra.soap.type.Id;
import com.zimbra.common.soap.AccountConstants;
import com.zimbra.common.soap.AdminConstants;
import com.zimbra.common.soap.Element;
import com.zimbra.common.soap.Element.JSONElement;
import com.zimbra.common.soap.MailConstants;

/**
 * Unit test for {@link GetInfoResponse} which exercises
 * translation to and from Element
 *
 * @author Gren Elliot
 */
public class JaxbToElementTest {
    private static final Logger LOG = Logger.getLogger(JaxbToElementTest.class);
    private static Unmarshaller unmarshaller;
    // one run with iterationNum = 80000:
    //     elementToJaxbTest time="30.013" (using w3c dom document)
    //     elementToJaxbUsingDom4jTest time="41.165"
    //     elementToJaxbUsingByteArrayTest time="122.265"
    private static int iterationNum = 2;
    static GetInfoResponse getInfoResp;
    static String getInfoResponseXml;
    static String getInfoResponseJSON;
    static String getInfoResponseJSONwithEnv;
    static Element getInfoRespElem;

    static {
        BasicConfigurator.configure();
        Logger.getRootLogger().setLevel(Level.INFO);
        LOG.setLevel(Level.INFO);
    }

    public static String streamToString(InputStream stream, Charset cs)
    throws IOException {
        try {
            Reader reader = new BufferedReader(
                    new InputStreamReader(stream, cs));
            StringBuilder builder = new StringBuilder();
            char[] buffer = new char[8192];
            int read;
            while ((read = reader.read(buffer, 0, buffer.length)) > 0) {
                builder.append(buffer, 0, read);
            }
            return builder.toString();
        } finally {
            stream.close();
        }
    }

    @BeforeClass
    public static void init() throws Exception {
        JAXBContext jaxb = JAXBContext.newInstance(GetInfoResponse.class);
        unmarshaller = jaxb.createUnmarshaller();
        getInfoResp = (GetInfoResponse) unmarshaller.unmarshal(
            JaxbToElementTest.class.getResourceAsStream("GetInfoResponse.xml"));
        InputStream is = JaxbToElementTest.class.getResourceAsStream(
                "GetInfoResponse.xml");
        getInfoResponseXml = streamToString(is, Charsets.UTF_8);
        is = JaxbToElementTest.class.getResourceAsStream(
                "GetInfoResponse.json");
        getInfoResponseJSON = streamToString(is, Charsets.UTF_8);
        StringBuffer sb = new StringBuffer();
        sb.append("{\n\"GetInfoResponse\": ").append(getInfoResponseJSON).append("\n}");
        getInfoResponseJSONwithEnv = sb.toString();
        getInfoRespElem = JaxbUtil.jaxbToElement(getInfoResp);
    }

    @Test
    public void jaxBToElementTest() throws Exception {
        for (int cnt = 1; cnt <= iterationNum;cnt++) {
            Element el = JaxbUtil.jaxbToElement(getInfoResp);
            String actual = el.prettyPrint();
            // TODO: At present some stuff is wrong/missing 
            // so just check the first part.
            Assert.assertEquals(getInfoResponseXml.substring(0, 1000),
                    actual.substring(0, 1000));
            // validateLongString("XML response differs from expected\n",
            //     getInfoResponseXml, actual,
            //             "GetInfoResponse.xml", "/tmp/GetInfoResponse.xml");
        }
    }

    private void validateLongString(String message,
                String expected, String actual,
                String expectedFile, String actualFile) {
        if (!actual.equals(expected)) {
            try{
                OutputStreamWriter out = new OutputStreamWriter(
                        new FileOutputStream(actualFile),"UTF-8");
                out.write(actual);
                out.close();
            }catch (Exception e){//Catch exception if any
              System.err.println("validateLongString:Error writing to " +
                      actualFile + " : " + e.getMessage());
            }
            Assert.fail(message + "\nexpected=" + expectedFile +
                    "\nactual=" + actualFile);
        }
    }

    @Test
    public void jaxBToJSONElementTest() throws Exception {
            Element el = JaxbUtil.jaxbToElement(
                    getInfoResp, JSONElement.mFactory);
            // el.toString() and el.prettyPrint() don't provide the
            // name of the element - that only happens when it is a
            // child of other elements (the "soap" envelop)
            String actual = el.prettyPrint();
            Assert.assertEquals("Top level Element name",
                    "GetInfoResponse", el.getName());
            validateLongString("JSON response differs from expected\n",
                getInfoResponseJSON, actual,
                        "GetInfoResponse.json", "/tmp/GetInfoResponse.json");
    }

    @Test
    public void elementToJaxbTest() throws Exception {
        Element el = JaxbUtil.jaxbToElement(getInfoResp);
        org.w3c.dom.Document doc = el.toW3cDom();
        if (LOG.isDebugEnabled())
            LOG.debug("(XML)elementToJaxbTest toW3cDom() Xml:\n" +
                    JaxbUtil.domToString(doc));
        for (int cnt = 1; cnt <= iterationNum;cnt++) {
            getInfoResp = JaxbUtil.elementToJaxb(getInfoRespElem);
        }
    }

    @SuppressWarnings("deprecation")
    @Test
    public void elementToJaxbUsingDom4jTest() throws Exception {
        for (int cnt = 1; cnt <= iterationNum;cnt++) {
            getInfoResp = JaxbUtil.elementToJaxbUsingDom4j(getInfoRespElem);
        }
    }

    @SuppressWarnings("deprecation")
    @Test
    public void elementToJaxbUsingByteArrayTest() throws Exception {
        for (int cnt = 1; cnt <= iterationNum;cnt++) {
            getInfoResp = JaxbUtil.elementToJaxbUsingByteArray(getInfoRespElem);
        }
    }

    @Test
    public void JSONelementToJaxbTest() throws Exception {
        Element env = Element.parseJSON(getInfoResponseJSONwithEnv);
        Element el = env.listElements().get(0);
        org.w3c.dom.Document doc = el.toW3cDom();
        if (LOG.isDebugEnabled())
            LOG.debug("JSONelementToJaxbTest toW3cDom Xml:\n" +
                    JaxbUtil.domToString(doc));
        getInfoResp = JaxbUtil.elementToJaxb(el);
        Assert.assertEquals("Account name", "user1@ysasaki.local",
             getInfoResp.getAccountName());
    }

    // This seems to work fine, although similar code in JAXB enabled
    // ExportContacts server-side does not - get:
    // javax.xml.bind.UnmarshalException: Namespace URIs and local names
    //      to the unmarshaller needs to be interned.
    @SuppressWarnings("deprecation")
    @Test
    public void JSONelementToJaxbUsingDom4jTest() throws Exception {
        for (int cnt = 1; cnt <= 4;cnt++) {
            Element env = Element.parseJSON(getInfoResponseJSONwithEnv);
            Element el = env.listElements().get(0);
            getInfoResp = JaxbUtil.elementToJaxbUsingDom4j(el);
            Assert.assertEquals("Account name", "user1@ysasaki.local",
                 getInfoResp.getAccountName());
        }
    }

    /**
     * Check that @{link JaxbUtil.elementToJaxb} will accept XML where
     * JAXB expects content type as an attribute but it is specified as
     * an element.
     * @throws Exception
     */
    @Test
    public void importContactsWithContentTypeAsElementTest () throws Exception {
        Element icrElem = Element.XMLElement.mFactory.createElement(
                MailConstants.IMPORT_CONTACTS_REQUEST);
        icrElem.addAttribute(MailConstants.A_CSVLOCALE, "fr");
        icrElem.addElement(MailConstants.A_CONTENT_TYPE).setText("csv");
        icrElem.addElement(MailConstants.E_CONTENT).setText("CONTENT");
        ImportContactsRequest icr = JaxbUtil.elementToJaxb(icrElem);
        Assert.assertEquals("ImportContactsRequest content type:",
                "csv", icr.getContentType());
        Assert.assertEquals("ImportContactsRequest csvlocale:",
                "fr", icr.getCsvLocale());
        Assert.assertEquals("ImportContactsRequest contents:",
                "CONTENT", icr.getContent().getValue());
    }

    /**
     * Check that @{link JaxbUtil.elementToJaxb} will accept XML where
     * JAXB expects various attributes that have been specified as elements
     * in a fairly deep structure.  Ensure that @XmlElementRef is handled
     * @throws Exception
     */
    @Test
    public void jaxbElementRefsFixupTest () throws Exception {
        Element rootElem = Element.XMLElement.mFactory.createElement(
                AdminConstants.MAIL_QUEUE_ACTION_REQUEST);
        // JAXB Element E_SERVER --> ServerWithQueueAction
        Element svrE = rootElem.addElement(AdminConstants.E_SERVER);
        // JAXB attribute A_NAME
        svrE.addElement(AdminConstants.A_NAME).setText("SERVER-NAME");
        // JAXB Element E_QUEUE --> MailQueueWithAction
        Element qE = svrE.addElement(AdminConstants.E_QUEUE);
        // JAXB attribute A_NAME
        qE.addElement(AdminConstants.A_NAME).setText("queueName");
        // JAXB Element E_ACTION --> MailQueueAction
        Element actE = qE.addElement(AdminConstants.E_ACTION);
        // JAXB attribute A_OP
        actE.addElement(AdminConstants.A_OP).setText("requeue");
        // JAXB attribute A_BY
        actE.addElement(AdminConstants.A_BY).setText("query");
        // MailQueueAction XmlElementRef E_QUERY --> QueueQuery
        // actually, part of XmlMixed, so JAXB class deals in
        // an array of Object
        Element queryE = actE.addElement(AdminConstants.E_QUERY);
        // JAXB attribute A_OFFSET
        queryE.addAttribute(AdminConstants.A_OFFSET, "20");
        // JAXB attribute A_LIMIT
        queryE.addElement(AdminConstants.A_LIMIT).setText("99");
        for (int sfx = 1; sfx <= 3; sfx++) {
            // List<QueueQueryField> fields 
            Element fE = queryE.addElement(AdminConstants.E_FIELD);
            fE.addAttribute(AdminConstants.A_NAME, "name" + sfx);
            // List<ValueAttrib> matches
            Element mE = fE.addElement(AdminConstants.E_MATCH);
            // JAXB attribute A_VALUE
            mE.addElement(AdminConstants.A_VALUE).setText("value " + sfx);
            mE = fE.addElement(AdminConstants.E_MATCH);
            // JAXB attribute A_VALUE
            mE.addElement(AdminConstants.A_VALUE).setText("2nd value " + sfx);
        }
        MailQueueActionRequest req = JaxbUtil.elementToJaxb(rootElem);
        ServerWithQueueAction svrWithQ = req.getServer();
        Assert.assertEquals("Server name", "SERVER-NAME", svrWithQ.getName());
        MailQueueWithAction q = svrWithQ.getQueue();
        Assert.assertEquals("Queue name", "queueName", q.getName());
        MailQueueAction a = q.getAction();
        Assert.assertEquals("Action BY",
                MailQueueAction.QueueActionBy.query, a.getBy());
        Assert.assertEquals("Action OP",
                MailQueueAction.QueueAction.requeue, a.getOp());
        QueueQuery query = a.getQuery();
        Assert.assertEquals("Query offset", 20, query.getOffset().intValue());
        Assert.assertEquals("Query limit", 99, query.getLimit().intValue());
        List<QueueQueryField> qFields = query.getFields();
        Assert.assertEquals("Number of query fields", 3, qFields.size());
        Assert.assertEquals("Query field 2 name", "name2",
                qFields.get(1).getName());
        List<ValueAttrib> matches = qFields.get(1).getMatches();
        Assert.assertEquals("Number of matches", 2, matches.size());
        Assert.assertEquals("Match 2 value", "2nd value 2",
                matches.get(1).getValue());
    }

    /**
     * Check that @{link JaxbUtil.elementToJaxb} will accept XML where
     * JAXB expects various attributes that have been specified as elements.
     * Ensure that @XmlElements is handled
     * @throws Exception
     */
    @Test
    public void jaxbElementsFixupTest() throws Exception {
        Element rootElem = Element.XMLElement.mFactory.createElement(
                MailConstants.GET_CONTACTS_REQUEST);
        // JAXB Attribute A_SYNC
        rootElem.addElement(MailConstants.A_SYNC).addText("true");
        // JAXB Attribute A_FOLDER
        rootElem.addAttribute(MailConstants.A_FOLDER, "folderId");
        // JAXB Attribute A_SORTBY
        rootElem.addElement(MailConstants.A_SORTBY).addText("sortBy");
        // JAXB Elements:
        //    Element E_ATTRIBUTE --> AttributeName
        //    Element E_CONTACT --> Id
        Element attrName1 = rootElem.addElement(MailConstants.E_ATTRIBUTE);
        attrName1.addAttribute(MailConstants.A_ATTRIBUTE_NAME, "aName1");
        Element contact1 = rootElem.addElement(MailConstants.E_CONTACT);
        contact1.addElement(MailConstants.A_ID).addText("ctctId1");
        Element contact2 = rootElem.addElement(MailConstants.E_CONTACT);
        contact2.addAttribute(MailConstants.A_ID, "ctctId2");
        Element attrName2 = rootElem.addElement(MailConstants.E_ATTRIBUTE);
        attrName2.addElement(MailConstants.A_ATTRIBUTE_NAME).addText("aName2");

        GetContactsRequest req = JaxbUtil.elementToJaxb(rootElem);

        Assert.assertEquals("Sync", true, req.getSync().booleanValue());
        Assert.assertEquals("FolderID", "folderId", req.getFolderId());
        Assert.assertEquals("SortBy", "sortBy", req.getSortBy());
        List<Object> objs = req.getElements();
        Assert.assertEquals("Number of elements", 4, objs.size());
        boolean haveC1 = false;
        boolean haveC2 = false;
        boolean haveA1 = false;
        boolean haveA2 = false;
        for (Object obj : objs) {
            if (obj instanceof AttributeName) {
                AttributeName an = (AttributeName) obj;
                String aNam = an.getName();
                if (aNam.equals("aName1")) {
                    haveA1 = true;
                } else if (aNam.equals("aName2")) {
                    haveA2 = true;
                } else {
                    Assert.fail("Unexpected attribute with name " + aNam);
                }
            } else if (obj instanceof Id) {
                Id an = (Id) obj;
                String aNam = an.getId();
                if (aNam.equals("ctctId1")) {
                    haveC1 = true;
                } else if (aNam.equals("ctctId2")) {
                    haveC2 = true;
                } else {
                    Assert.fail("Unexpected contact id " + aNam);
                }
            } else {
                Assert.fail("Unexpected class for element");
            }
        }
        Assert.assertTrue("All elements should be present", 
                haveC1 && haveC2 && haveA1 && haveA2);
    }

    /**
     * Check that @{link JaxbUtil.elementToJaxb} will accept XML where
     * JAXB expects various attributes that have been specified as elements.
     * Ensure that attributes in elements of superclasses are handled
     * @throws Exception
     */
    @Test
    public void jaxbSubclassFixupTest() throws Exception {
        Element rootElem = Element.XMLElement.mFactory.createElement(
                AdminConstants.CREATE_ACCOUNT_REQUEST);
        // JAXB Attribute E_NAME
        rootElem.addElement(AdminConstants.E_NAME).addText("acctName");
        // JAXB Attribute E_PASSWORD
        rootElem.addElement(AdminConstants.E_PASSWORD).addText("AcctPassword");
        // JAXB Element E_A ---> Attr (actually a List)
        Element a1 = rootElem.addElement(AdminConstants.E_A);
        // JAXB Attribute A_N
        a1.addElement(AdminConstants.A_N).addText("attrName1");
        // value can't be set when we've specified an attribute as an element

        CreateAccountRequest req = JaxbUtil.elementToJaxb(rootElem);
        Assert.assertEquals("Account name", "acctName", req.getName());
        Assert.assertEquals("Account Password",
                "AcctPassword", req.getPassword());
        List<Attr> attrs = req.getAttrs();
        Assert.assertEquals("Number of attrs", 1, attrs.size());
        Assert.assertEquals("attr 1 name", "attrName1",
                attrs.get(0).getN());
        Assert.assertEquals("attr 1 value", "",
                attrs.get(0).getValue());
    }

    /**
     * Check that @{link JaxbUtil.elementToJaxb} will accept XML where
     * JAXB expects various attributes that have been specified as elements.
     * Ensure that attributes in wrapped elements are handled
     * @throws Exception
     */
    @Test
    public void jaxbWrapperFixupTest() throws Exception {
        Element rootElem = Element.XMLElement.mFactory.createElement(
                AccountConstants.AUTH_REQUEST);
        // JAXB wrapper element name E_PREFS
        Element prefsE = rootElem.addElement(AccountConstants.E_PREFS);
        // JAXB element E_PREF with attribute "name"
        Element prefE = prefsE.addElement(AccountConstants.E_PREF);
        prefE.addElement("name").addText("pref name");

        AuthRequest req = JaxbUtil.elementToJaxb(rootElem);
        List<Pref> prefs = req.getPrefs();
        Assert.assertEquals("Number of prefs", 1, prefs.size());
        Assert.assertEquals("Pref name",
                "pref name", prefs.get(0).getName());
    }

    /**
     * Explore handling of Jaxb classes which specify an @XmlElement with
     * a super class.  How do subclasses get treated with this?
     * WSDLJaxbTest.ConvActionRequestJaxbSubclassHandlingTest passes,
     * i.e. it successfully unmarshalls to a ConvActionRequest with
     * a FolderActionSelector member.
     * However, even if I use those class files (with package name changed)
     * in place of the committed ones, this test only seems to unmarshall
     * with an ActionSelector member - i.e. the "recursive" and "url"
     * attribute information gets lost.
     */
    // @Test
    public void ConvActionRequestJaxbSubclassHandlingTestDisabled() throws Exception {
        FolderActionSelector fas = new FolderActionSelector("ids", "op");
        fas.setFolder("folder");
        fas.setRecursive(true);
        fas.setUrl("http://url");
        ConvActionRequest car = new ConvActionRequest(fas);
        Element carE = JaxbUtil.jaxbToElement(car);
        String eXml = carE.toString();
        LOG.info("ConvActionRequestJaxbSubclassHandling: marshalled XML=" +
                eXml);
        Assert.assertTrue("Xml should contain recursive attribute",
                eXml.contains("recursive=\"true\""));

        carE = Element.XMLElement.mFactory.createElement(
                MailConstants.CONV_ACTION_REQUEST);
        Element actionE = carE.addElement(MailConstants.E_ACTION);
        actionE.addAttribute(MailConstants.A_OPERATION, "op");
        actionE.addAttribute(MailConstants.A_ID, "ids");
        actionE.addAttribute(MailConstants.A_FOLDER, "folder");
        actionE.addAttribute(MailConstants.A_RECURSIVE, true);
        actionE.addAttribute(MailConstants.A_URL, "http://url");
        LOG.info("ConvActionRequestJaxbSubclassHandling: half baked XML=" +
                carE.toString());
        car = JaxbUtil.elementToJaxb(carE);
        carE = JaxbUtil.jaxbToElement(car);
        eXml = carE.toString();
        LOG.info("ConvActionRequestJaxbSubclassHandling: round tripped XML=" +
                eXml);
        ActionSelector as = car.getAction();
        Assert.assertEquals("Folder attribute value",
                    "folder", as.getFolder());
        if (as instanceof FolderActionSelector) {
            fas = (FolderActionSelector)as;
            Assert.assertEquals("url attribute value",
                    "http://url", fas.getUrl());
        } else if (as instanceof NoteActionSelector) {
            Assert.fail("got a NoteActionSelector");
        } else if (as instanceof ContactActionSelector) {
            Assert.fail("got a ContactActionSelector");
        } else {
            Assert.fail("Failed to get back a FolderActionSelector");
        }
    }

    @Test
    public void IdentityToStringTest () throws Exception {
        com.zimbra.soap.account.type.Identity id =
                new com.zimbra.soap.account.type.Identity("hello", null);
        Map<String, String> attrs = Maps.newHashMap();
        attrs.put("key1", "value1");
        attrs.put("key2", "value2 wonderful");
        id.setAttrs(attrs);
        CreateIdentityRequest request = new CreateIdentityRequest(id);
        Assert.assertEquals("toString output", 
            "CreateIdentityRequest{identity=Identity{a=[Attr{name=key2, value=value2 wonderful}, Attr{name=key1, value=value1}], name=hello, id=null}}",
            request.toString());
    }

}
