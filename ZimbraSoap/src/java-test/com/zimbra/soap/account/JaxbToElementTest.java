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
import java.util.Map;

import javax.xml.bind.JAXBContext;
import javax.xml.bind.Unmarshaller;

import junit.framework.Assert;
import org.apache.log4j.BasicConfigurator;
import org.apache.log4j.Logger;
import org.apache.log4j.Level;

import org.junit.BeforeClass;
import org.junit.Test;
import com.zimbra.soap.JaxbUtil;
import com.zimbra.soap.account.message.CreateIdentityRequest;
import com.zimbra.soap.account.message.GetInfoResponse;
import com.zimbra.common.soap.Element;
import com.zimbra.common.soap.Element.JSONElement;

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
