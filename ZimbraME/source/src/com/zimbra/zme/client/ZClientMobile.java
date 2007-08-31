/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: ZPL 1.2
 * 
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.2 ("License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.zimbra.com/license
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is: Zimbra Collaboration Suite J2ME Client
 * 
 * The Initial Developer of the Original Code is Zimbra, Inc.
 * Portions created by Zimbra are Copyright (C) 2004, 2005, 2006, 2007 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s):
 * 
 * ***** END LICENSE BLOCK *****
 */

/**
 * This package visible class is provides access to the ZCS SOAP APIs. It is tightly coupled with the Mailbox class which
 * provides the API to this class.
 * 
 * ZClientMobile is responsible for setting up the request PDUs and handling the response PDUs from the ZCS server.
 * For certain API functions (e.g. login) it will populate the corresponding members of the Mailbox class (e.g. mAuthToken)
 * It is the responsibility of the client using Mailbox (and hence ZClient) to ensure concurrency control against Mailbox
 * members e.g. don't concurrently invoke methods that modify member of the Mailbox class (e.g. getContacts, etc)
 * 
 * @author Ross Dargahi
 */
package com.zimbra.zme.client;

import org.xmlpull.v1.XmlPullParser;
import org.xmlpull.v1.XmlPullParserException;
import org.xmlpull.v1.XmlSerializer;
import org.kxml2.io.KXmlSerializer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Date;
import java.util.Enumeration;
import java.util.Hashtable;
import java.util.TimeZone;
import java.util.Vector;

import javax.microedition.io.Connector;
import javax.microedition.io.HttpConnection;

import com.tinyline.util.GZIPInputStream;

import com.zimbra.zme.ZmeException;
import com.zimbra.zme.ui.ConvItem;
import com.zimbra.zme.ui.MailItem;
import com.zimbra.zme.ui.MsgItem;

import de.enough.polish.util.Locale;
import de.enough.polish.util.StringTokenizer;

 class ZClientMobile {

	// System Folder IDs
	public static final String ID_FOLDER_USER_ROOT = "1";
	public static final String ID_FOLDER_INBOX = "2";
	public static final String ID_FOLDER_TRASH = "3";
	public static final String ID_FOLDER_SPAM = "4";
	public static final String ID_FOLDER_SENT = "5";
	public static final String ID_FOLDER_DRAFTS = "6";
	public static final String ID_FOLDER_CONTACTS = "7";
	public static final String ID_FOLDER_TAGS = "8";
	public static final String ID_FOLDER_CONVERSATIONS = "9";
	public static final String ID_FOLDER_CALENDAR = "10";
	public static final String ID_FOLDER_ROOT = "11";
	public static final String ID_FOLDER_NOTEBOOK = "12";
	public static final String ID_FOLDER_AUTO_CONTACTS = "13";
	public static final String ID_FOLDER_IM_LOGS = "14";
	public static final String ID_FOLDER_TASKS = "15";
	
	// Object types
	public static final String CONV_TYPE = "conversation";
	public static final String MSG_TYPE = "message";
	public static final String CONTACT_TYPE = "contact";
	public static final String APPT_TYPE = "appointment";
	public static final String TASK_TYPE = "task";
	
	// Folder Attributes
	public static final String FOLDER_ID = "id";
	
	private static final String PR_SOAP = "soap";
	private static final String NS_SOAP = "http://www.w3.org/2003/05/soap-envelope";
	private static final String NS_ZIMBRA = "urn:zimbra";

	// Namespaces
	private static final String NS_ZIMBRA_MAIL = "urn:zimbraMail";
	private static final String NS_ZIMBRA_ACCT = "urn:zimbraAccount";

	// ========== Elements
	private static final String EL_AUTH_REQ = "AuthRequest";
	private static final String EL_AUTH_RESP = "AuthResponse";
	private static final String EL_BATCH_REQ = "BatchRequest";
	private static final String EL_BATCH_RESP = "BatchResponse";
    private static final String EL_CREATEAPPT_REQ = "CreateAppointmentRequest";
    private static final String EL_CREATEAPPT_RESP = "CreateAppointmentResponse";
	private static final String EL_CREATESEARCHFOLDER_REQ = "CreateSearchFolderRequest";
	private static final String EL_CREATESEARCHFOLDER_RESP = "CreateSearchFolderResponse";
	private static final String EL_GETAPPTSUMMARIES_REQ = "GetApptSummariesRequest";
	private static final String EL_GETAPPTSUMMARIES_RESP = "GetApptSummariesResponse";
	private static final String EL_GETCONTACTS_REQ = "GetContactsRequest";
	private static final String EL_GETCONTACTS_RESP = "GetContactsResponse";
	private static final String EL_GETFOLDER_REQ = "GetFolderRequest";
	private static final String EL_GETFOLDER_RESP = "GetFolderResponse";
	private static final String EL_GETMSG_REQ = "GetMsgRequest";
	private static final String EL_GETMSG_RESP = "GetMsgResponse";
	private static final String EL_GETSEARCHFOLDER_REQ = "GetSearchFolderRequest";
	private static final String EL_GETSEARCHFOLDER_RESP = "GetSearchFolderResponse";
	private static final String EL_GETTAG_REQ = "GetTagRequest";
	private static final String EL_GETTAG_RESP = "GetTagResponse";
	private static final String EL_ITEMACTION_REQ = "ItemActionRequest";
	private static final String EL_ITEMACTION_RESP = "ItemActionResponse";
	private static final String EL_GETCONV_REQ = "GetConvRequest";
	private static final String EL_GETCONV_RESP = "GetConvResponse";
    private static final String EL_MODIFYAPPT_REQ = "ModifyAppointmentRequest";
    private static final String EL_MODIFYAPPT_RESP = "ModifyAppointmentResponse";
	private static final String EL_SEARCH_REQ = "SearchRequest";
	private static final String EL_SEARCH_RESP = "SearchResponse";
	private static final String EL_SENDMSG_REQ = "SendMsgRequest";
	private static final String EL_SENDMSG_RESP = "SendMsgResponse";
    private static final String EL_SENDINVITEREPLY_REQ = "SendInviteReplyRequest";
    private static final String EL_SENDINVITEREPLY_RESP = "SendInviteReplyResponse";
	private static final String EL_A = "a";
	private static final String EL_ACCT = "account";
	private static final String EL_ACTION = "action";
	private static final String EL_APPT = "appt";
	private static final String EL_ATTACH = "attach";
	private static final String EL_AUTH_TOKEN = "authToken";
	private static final String EL_BODY = "Body";
	private static final String EL_CN = "cn";
    private static final String EL_COMP = "comp";
	private static final String EL_CODE = "Code";
	private static final String EL_CONTENT = "content";
	private static final String EL_CONTEXT = "context";
	private static final String EL_CONV = "c";
	private static final String EL_CURSOR = "cursor";
    private static final String EL_DESC = "desc";
    private static final String EL_DUR = "dur";
    private static final String EL_E = "e";
	private static final String EL_EMAILADDR = "e";
	private static final String EL_ENV = "Envelope";
	private static final String EL_ERROR = "Error";
	private static final String EL_EXCEPTID = "exceptId";
	private static final String EL_FAULT = "Fault";
	private static final String EL_FOLDER = "folder";
	private static final String EL_FRAGMENT = "fr";
	private static final String EL_HEADER = "Header";
	private static final String EL_INST = "inst";
	private static final String EL_INVITE = "inv";
    private static final String EL_ITEMS = "items";
	private static final String EL_MIMEPART = "mp";
	private static final String EL_MSG = "m";
	private static final String EL_NOSESSION = "nosession";
    private static final String EL_OR = "or";
	private static final String EL_PASSWD = "password";
	private static final String EL_QUERY = "query";
    private static final String EL_S = "s";
	private static final String EL_SEARCH = "search";
	private static final String EL_SUBJECT = "su";
	private static final String EL_TAG = "tag";
	private static final String EL_TIMEZONE = "tz";
	private static final String EL_USER_AGENT = "userAgent";
	
	// ========== Attributes
	private static final String AT_ADD = "add";
	private static final String AT_ADDRTYPE = "t";
	private static final String AT_ALARM = "alarm";
	private static final String AT_ALLDAY = "allDay";
    private static final String AT_APPTID = "apptId";
	private static final String AT_BODY = "body";
	private static final String AT_BY = "by";
	private static final String AT_CID = "cid";
	private static final String AT_COLOR = "color";
    private static final String AT_COMPNUM = "compNum";
	private static final String AT_CONTENT_TYPE = "ct";
	private static final String AT_DATE = "d";
	private static final String AT_DISPLAYNAME = AT_DATE;
	private static final String AT_DURATION = AT_DISPLAYNAME;
	private static final String AT_EMAILADR = "a";
	private static final String AT_END = "e";
	//private static final String AT_EXCEPTION = "ex";
	private static final String AT_FETCH = "fetch";
	private static final String AT_FILENAME = "filename";
	private static final String AT_FLAGS = "f";
	private static final String AT_FOLDERID = "l";
	private static final String AT_ID = "id";
    private static final String AT_INVID = "invId";
	private static final String AT_ISORG = "isOrg";
	private static final String AT_LIMIT = "limit";
	private static final String AT_LOC = "loc";
	private static final String AT_MID = "mid";
	private static final String AT_MORE = "more";
	private static final String AT_N = "n";
	private static final String AT_NAME = "name";
	private static final String AT_NUMMSGS = "n";
	private static final String AT_OP = "op";
	private static final String AT_ORIGID = "origid";
	private static final String AT_OTHERATTENDEES = "otherAtt";
	private static final String AT_PART = "part";
	private static final String AT_PARTICIPATIONSTATUS = "ptst";
	private static final String AT_QUERY = "query";
	private static final String AT_READ = "read";
	private static final String AT_RECUR = "recur";
	private static final String AT_REPLYTYPE = "rt";
	private static final String AT_SENTDATE = "sd";
	private static final String AT_SORTBY = "sortBy";
	private static final String AT_SORTFIELD = "sf";
	private static final String AT_SORTVAL = "sortVal";
    private static final String AT_SEC = "s";
	private static final String AT_START = "s";
	private static final String AT_STATUS = "status";
	private static final String AT_STDOFFSET = "stdoff";
	private static final String AT_TAGS = "t";
	private static final String AT_TYPE = "type";
	private static final String AT_TYPES = "types";
	private static final String AT_VERSION = "version";
    private static final String AT_VERB = "verb";
    private static final String AT_VIEW = "view";


	// ========== Email reply status constants
	private static final String FORWARD = "w";
	private static final String REPLY = "r";
	
	// ========== Email address type constants
	private static final char FROM = 'f';
	private static final char TO = 't';
	private static final String TO_STR = "t";
	private static final char SENDER = 's';
	private static final char REPLYTO = 'r';
	private static final char CC = 'c';
	private static final String CC_STR = "c";
	// private static final char BCC = 'b';
	private static final String BCC_STR = "b";
	
	// ========== Message and message part constants
	private static final String MESSAGE = "message";
	private static final String MP_ALT = "multipart/alternative";
	private static final String MP_MIX = "multipart/mixed";
	private static final String MP_REL = "multipart/related";
	private static final String TEXT_PLAIN = "text/plain";

	// ========== Appointment contants
	// Participant status
	private static final String NEEDS_ACTION = "NE";
	private static final String TENTATIVE = "TE";
	private static final String ACCEPTED = "AC";
	private static final String DECLINED = "DE";

	// private static final String DELEGATED = "DG";

	// Event status
	private static final String EVT_CANCELLED = "CANC";

	// private static final String EVT_CONFIRMED = "CONF";
	private static final String EVT_TENTATIVE = "TENT";

	// ========== Contacts constants
	private static final String FIRST_NAME = "firstName";
	private static final String LAST_NAME = "lastName";
	private static final String EMAIL = "email";
	private static final String EMAIL2 = "email2";
	private static final String EMAIL3 = "email3";

	// ========== Misc Constants
	private static final String NAME = "name";
	private static final String NAME_ASC = "nameAsc";
	private static final String VERSION = "0.5";
	private static final String USER_AGENT = "Zimbra Mobile Edition (ZME)";
	private static final int MAXBODY_LEN = 2048;

	private static Object NULL = new Object();
	private static boolean mInited = false;
	private static String mTZId;
	private static int mTZOffset;
	
	private XmlSerializer mSerializer;
	private XmlParser mParser;
	private OutputStream mOs;
	private InputStream mIs;
	private HttpConnection mConn;
	private boolean mBatchRequest;
	private Vector mClientData;
	private Mailbox mMbox;

	public ZClientMobile(Mailbox mbox) 
			throws ZmeException {
		if (!mInited) {
			TimeZone tz = TimeZone.getDefault();
			mTZId = tz.getID();
			mTZOffset = tz.getRawOffset();
			//#debug
			System.out.println("MailCmds.MailCmds: time zone id == " + mTZId
					+ ", offset == " + mTZOffset);
			mInited = true;
		}

		try {
			mSerializer = new KXmlSerializer();
			mParser = new XmlParser();
			mParser.setFeature(XmlPullParser.FEATURE_PROCESS_NAMESPACES, true);
			mMbox = mbox;
			mClientData = new Vector();
		} catch (XmlPullParserException ex) {
			throw new ZmeException(ZmeException.PARSER_ERROR, ex.getMessage());
		}
	}

	public void cancel() {
		if (mIs != null) {
			try {
				mIs.close();
			} catch (IOException e) {
			}
			mIs = null;
		}

		if (mOs != null) {
			try {
				mOs.close();
			} catch (IOException e) {
			}
			mOs = null;
		}
		
		if (mConn != null) {
			try {
				mConn.close();
			} catch (IOException e) {
			}
			mConn = null;
		}
	}

	public void beginRequest(String authToken,
							 boolean batchRequest) 
			throws IOException {
		mBatchRequest = batchRequest;
		mClientData.removeAllElements();
		beginReq();
		setReqHeader(authToken);
		beginReqBody();
	}

	public void endRequest() 
			throws ZmeSvcException, 
				   ZmeException {
		try {
			endReqBody();
			endReq();
			handleResp();
		} catch (IOException ex1) {
			//#debug
			System.out.println("AccountCmds.login: IOException " + ex1);
			throw new ZmeException(ZmeException.IO_ERROR, ex1.getMessage());
		} catch (XmlPullParserException ex2) {
			//#debug
			System.out.println("AccountCmds.login: XmlPullParserException "
					+ ex2);
			throw new ZmeException(ZmeException.PARSER_ERROR, ex2.getMessage());
		}
	}

	/**
	 * Logs into mailbox
	 * 
	 * @param uname
	 * @param passwd
	 * @param conn
	 * @throws ZmeException
	 * @throws ZmeSvcException
	 */
	public void login(String uname, 
					  String passwd) 
			throws ZmeException {
		try {
			putClientData(null);
			mSerializer.setPrefix("", NS_ZIMBRA_ACCT);
			mSerializer.startTag(NS_ZIMBRA_ACCT, EL_AUTH_REQ);

			mSerializer.startTag(null, EL_ACCT);
			mSerializer.attribute(null, AT_BY, NAME);
			mSerializer.text(uname);
			mSerializer.endTag(null, EL_ACCT);

			mSerializer.startTag(null, EL_PASSWD);
			mSerializer.text(passwd);
			mSerializer.endTag(null, EL_PASSWD);

			mSerializer.endTag(NS_ZIMBRA_ACCT, EL_AUTH_REQ);
		} catch (IOException ex1) {
			//#debug
			System.out.println("AccountCmds.login: IOException " + ex1);
			throw new ZmeException(ZmeException.IO_ERROR, ex1.getMessage());
		}
	}

	public void createSearchFolder(String name,
								   String query) 
			throws ZmeException {
		try {
			putClientData(null);
			mSerializer.setPrefix("", NS_ZIMBRA_MAIL);
			mSerializer.startTag(NS_ZIMBRA_MAIL, EL_CREATESEARCHFOLDER_REQ);
			mSerializer.startTag(null, EL_SEARCH);
			mSerializer.attribute(null, AT_NAME, name);
			mSerializer.attribute(null, AT_QUERY, query);
			mSerializer.attribute(null, AT_FOLDERID, ID_FOLDER_USER_ROOT);
			mSerializer.endTag(null, EL_SEARCH);
			mSerializer.endTag(NS_ZIMBRA_MAIL, EL_CREATESEARCHFOLDER_REQ);
		} catch (IOException ex1) {
			//#debug
			System.out.println("MailCmds.createSearchFolder: IOException " + ex1);
			throw new ZmeException(ZmeException.IO_ERROR, ex1.getMessage());
		}
	}
	
	/**
	 * Performs an action of the provided item. Basically makes a call into
	 * ItemActionRequest
	 * 
	 * @param itemId Item ID
	 * @param op Operation to perform (e.g. delete, read, flag etc)
	 * @param params Any operation parameters (e.g. folder name for move op etc
	 * @param authToken
	 * @param conn
	 */
	public void doItemAction(String itemId, 
							 String op, 
							 String paramName,
							 String paramValue) 
			throws ZmeException {
		try {
			putClientData(null);
			mSerializer.setPrefix("", NS_ZIMBRA_MAIL);
			mSerializer.startTag(NS_ZIMBRA_MAIL, EL_ITEMACTION_REQ);
			mSerializer.startTag(null, EL_ACTION);
			mSerializer.attribute(null, AT_ID, itemId);
			mSerializer.attribute(null, AT_OP, op);
			if (paramName != null)
				mSerializer.attribute(null, paramName, paramValue);
			mSerializer.endTag(null, EL_ACTION);
			mSerializer.endTag(NS_ZIMBRA_MAIL, EL_ITEMACTION_REQ);
		} catch (IOException ex1) {
			//#debug
			System.out.println("MailCmds.doItemAction: IOException " + ex1);
			throw new ZmeException(ZmeException.IO_ERROR, ex1.getMessage());
		}

	}

	public void getApptSummaries(Date startTime, 
								 Date endTime, 
								 ResultSet results)
			throws ZmeException {
		try {
			putClientData(results);
			mSerializer.setPrefix("", NS_ZIMBRA_MAIL);
			mSerializer.startTag(NS_ZIMBRA_MAIL, EL_GETAPPTSUMMARIES_REQ);
			mSerializer.attribute(null, AT_START, Long.toString(startTime
					.getTime()));
			mSerializer.attribute(null, AT_END, Long
					.toString(endTime.getTime()));
			mSerializer.attribute(null, AT_FOLDERID, ID_FOLDER_CALENDAR);
			mSerializer.endTag(NS_ZIMBRA_MAIL, EL_GETAPPTSUMMARIES_REQ);
		} catch (IOException ex1) {
			//#debug
			System.out.println("MailCmds.getApptSummaries: IOException " + ex1);
			throw new ZmeException(ZmeException.IO_ERROR, ex1.getMessage());
		}
	}

	public void getContacts() 
			throws ZmeException {
		try {
			putClientData(null);
			mSerializer.setPrefix("", NS_ZIMBRA_MAIL);
			mSerializer.startTag(NS_ZIMBRA_MAIL, EL_GETCONTACTS_REQ);
			mSerializer.attribute(null, AT_SORTBY, NAME_ASC);
			mSerializer.startTag(null, EL_A).attribute(null, AT_N, EMAIL).endTag(null, EL_A);
			mSerializer.startTag(null, EL_A).attribute(null, AT_N, EMAIL2).endTag(null, EL_A);
			mSerializer.startTag(null, EL_A).attribute(null, AT_N, EMAIL3).endTag(null, EL_A);
			//#if (${bytes(polish.HeapSize)} >= ${bytes(1MB)}) or (polish.HeapSize == dynamic)
				mSerializer.startTag(null, EL_A).attribute(null, AT_N, FIRST_NAME).endTag(null, EL_A);
				mSerializer.startTag(null, EL_A).attribute(null, AT_N, LAST_NAME).endTag(null, EL_A);
			//#endif
			mSerializer.endTag(NS_ZIMBRA_MAIL, EL_GETCONTACTS_REQ);
		} catch (IOException ex1) {
			//#debug
			System.out.println("MailCmds.getContacts: IOException " + ex1);
			throw new ZmeException(ZmeException.IO_ERROR, ex1.getMessage());
		}
	}

	public void getSearchFolders() 
			throws ZmeException {
		try {
			putClientData(null);
			mSerializer.setPrefix("", NS_ZIMBRA_MAIL);
			mSerializer.startTag(NS_ZIMBRA_MAIL, EL_GETSEARCHFOLDER_REQ);
			mSerializer.endTag(NS_ZIMBRA_MAIL, EL_GETSEARCHFOLDER_REQ);
		} catch (IOException ex1) {
			//#debug
			System.out.println("MailCmds.getSearchFolders: IOException " + ex1);
			throw new ZmeException(ZmeException.IO_ERROR, ex1.getMessage());
		}
	}

	public void getFolders(ItemFactory folderItemFactory) 
			throws ZmeException {
		try {
			putClientData(folderItemFactory);
			mSerializer.setPrefix("", NS_ZIMBRA_MAIL);
			mSerializer.startTag(NS_ZIMBRA_MAIL, EL_GETFOLDER_REQ);
			mSerializer.endTag(NS_ZIMBRA_MAIL, EL_GETFOLDER_REQ);
		} catch (IOException ex1) {
			//#debug
			System.out.println("MailCmds.getFolders: IOException " + ex1);
			throw new ZmeException(ZmeException.IO_ERROR, ex1.getMessage());
		}
	}

	public void getMsg(MsgItem m) 
			throws ZmeException {
		try {
			putClientData(m);
			mSerializer.setPrefix("", NS_ZIMBRA_MAIL);
			mSerializer.startTag(NS_ZIMBRA_MAIL, EL_GETMSG_REQ);
			mSerializer.startTag(null, EL_MSG);
			mSerializer.attribute(null, AT_ID, m.mId);
			mSerializer.attribute(null, AT_READ, "1");
			mSerializer.endTag(null, EL_MSG);
			mSerializer.endTag(NS_ZIMBRA_MAIL, EL_GETMSG_REQ);
		} catch (IOException ex1) {
			//#debug
			System.out.println("MailCmds.getMsg: IOException " + ex1);
			throw new ZmeException(ZmeException.IO_ERROR, ex1.getMessage());
		}
	}

	public void getTags() 
			throws ZmeException {
		try {
			putClientData(null);
			mSerializer.setPrefix("", NS_ZIMBRA_MAIL);
			mSerializer.startTag(NS_ZIMBRA_MAIL, EL_GETTAG_REQ);
			mSerializer.endTag(NS_ZIMBRA_MAIL, EL_GETTAG_REQ);
		} catch (IOException ex1) {
			//#debug
			System.out.println("MailCmds.getFolders: IOException " + ex1);
			throw new ZmeException(ZmeException.IO_ERROR, ex1.getMessage());
		}
	}


	public void searchConv(String convId, 
						   boolean expandFirstHit,
						   int numResults, 
						   MailItem lastItem,
						   ResultSet results) 
			throws ZmeException {
		try {
			putClientData(results);
			mSerializer.setPrefix("", NS_ZIMBRA_MAIL);
			mSerializer.startTag(NS_ZIMBRA_MAIL, EL_GETCONV_REQ);
			mSerializer.startTag(null, EL_CONV);
			mSerializer.attribute(null, AT_ID, convId);
			mSerializer.attribute(null, AT_LIMIT, Integer.toString(numResults));

			// XXX
			if (lastItem != null) {
				System.out.println("LAST ITEM NOT NULL");
				mSerializer.startTag(null, EL_CURSOR);
				System.out.println("lastItem.mId: " + lastItem.mId);
				mSerializer.attribute(null, AT_ID, lastItem.mId);
				System.out.println("lastItem.mSortField: " + lastItem.mSortField);
				mSerializer.attribute(null, AT_SORTVAL, lastItem.mSortField);
				System.out.println("LAST ITEM DONE");
				mSerializer.endTag(null, EL_CURSOR);				
			} else if (expandFirstHit) {
				mSerializer.attribute(null, AT_FETCH, "1");
				mSerializer.attribute(null, AT_READ, "1");
			}

			mSerializer.endTag(null, EL_CONV);
			mSerializer.endTag(NS_ZIMBRA_MAIL, EL_GETCONV_REQ);
		} catch (IOException ex1) {
			//#debug
			System.out.println("MailCmds.getConv: IOException " + ex1);
			throw new ZmeException(ZmeException.IO_ERROR, ex1.getMessage());
		}
	}

    public void searchFolderRest(
            String user,
            String folder, 
            int numResults, 
            MailItem lastItem,
            ResultSet results) 
    throws ZmeSvcException, IOException
    {
        StringBuffer buf = new StringBuffer();
        buf.append(mMbox.mRestUrl).append(user).append("/").append(folder);
        buf.append("?fmt=xml");
        
        mConn = (HttpConnection)Connector.open(buf.toString());
        try {
            putClientData(results);
            mConn.setRequestMethod(HttpConnection.GET);
            mConn.setRequestProperty("User-Agent", USER_AGENT);
            int rc = mConn.getResponseCode();
            if (rc != 200) {
                //#debug
                System.out.println("search returned an error: "+rc);
            }
            handleResp();
        } catch (XmlPullParserException e) {
            //#debug
            System.out.println("parse error: "+e.getMessage());
        } finally {
            mConn.close();
        }
    }
 
	/**
	 * Search
	 * 
	 * @param query Zimbra search query
	 * @param byConv true, then search is by converation
	 * @param numResults Number of results return
	 * @param lastItemWhen not null indicates that more hits are to be returned
	 * 		starting at this item
	 * @param authToken
	 * @param results
	 * @param conn
	 * @throws ZmeException
	 * @throws ZmeSvcException
	 */
	public void search(String query, 
					   boolean byConv, 
					   int numResults,
					   MailItem lastItem, 
					   ResultSet results) 
			throws ZmeException {
		try {
			putClientData(results);
			mSerializer.setPrefix("", NS_ZIMBRA_MAIL);
			mSerializer.startTag(NS_ZIMBRA_MAIL, EL_SEARCH_REQ);
			mSerializer.attribute(null, AT_LIMIT, Integer.toString(numResults));
			if (!byConv)
				mSerializer.attribute(null, AT_TYPE, MESSAGE);

			mSerializer.startTag(null, EL_TIMEZONE);
			mSerializer.attribute(null, AT_ID, mTZId);
			mSerializer.attribute(null, AT_STDOFFSET, Integer.toString(mTZOffset));
			// TODO DST?
			mSerializer.endTag(null, EL_TIMEZONE);

			mSerializer.startTag(null, EL_QUERY).text(query).endTag(null, EL_QUERY);

			if (lastItem != null) {
				mSerializer.startTag(null, EL_CURSOR);
				mSerializer.attribute(null, AT_ID, lastItem.mId);
				mSerializer.attribute(null, AT_SORTVAL, lastItem.mSortField);
				mSerializer.endTag(null, EL_CURSOR);
			}
			mSerializer.endTag(NS_ZIMBRA_MAIL, EL_SEARCH_REQ);
		} catch (IOException ex1) {
			//#debug
			System.out.println("MailCmds.search: IOException " + ex1);
			throw new ZmeException(ZmeException.IO_ERROR, ex1.getMessage());
		}
	}

	public void sendMsg(Vector toAddrs, 
						Vector ccAddrs, 
						Vector bccAddrs,
						String subject, 
						String body, 
						String originalId, 
						boolean isForward)
			throws ZmeException {
		
		try {
			putClientData(null);
			mSerializer.setPrefix("", NS_ZIMBRA_MAIL);
			mSerializer.startTag(NS_ZIMBRA_MAIL, EL_SENDMSG_REQ);
			mSerializer.startTag(null, EL_MSG);

			if (originalId != null) {
				mSerializer.attribute(null, AT_ORIGID, originalId);
				mSerializer.attribute(null, AT_REPLYTYPE, (isForward) ? FORWARD	: REPLY);
			}

			if (toAddrs != null)
				addEmailAddrs(TO_STR, toAddrs);

			if (ccAddrs != null)
				addEmailAddrs(CC_STR, ccAddrs);

			if (bccAddrs != null)
				addEmailAddrs(BCC_STR, bccAddrs);

			if (subject != null && subject.compareTo("") != 0)
				mSerializer.startTag(null, EL_SUBJECT).text(subject).endTag(null, EL_SUBJECT);

			if (body != null || body.compareTo("") != 0) {
				mSerializer.startTag(null, EL_MIMEPART);
				mSerializer.attribute(null, AT_CONTENT_TYPE, TEXT_PLAIN);
				mSerializer.startTag(null, EL_CONTENT).text(body).endTag(null, EL_CONTENT);
				mSerializer.endTag(null, EL_MIMEPART);
			}

			if (isForward) {
				mSerializer.startTag(null, EL_ATTACH);
				mSerializer.startTag(null, EL_MSG);
				mSerializer.attribute(null, AT_ID, originalId);
				mSerializer.endTag(null, EL_MSG);
				mSerializer.endTag(null, EL_ATTACH);
			}
			
			mSerializer.endTag(null, EL_MSG);
			mSerializer.endTag(NS_ZIMBRA_MAIL, EL_SENDMSG_REQ);
		} catch (IOException ex1) {
			//#debug
			System.out.println("MailCmds.sendMsgRequest: IOException " + ex1);
			throw new ZmeException(ZmeException.IO_ERROR, ex1.getMessage());
		}
	}

	private void addEmailAddrs(String type, 
							   Vector addrs) 
			throws IOException {
		Contact c;
		for (Enumeration e = addrs.elements(); e.hasMoreElements();) {
			c = (Contact)e.nextElement();
			mSerializer.startTag(null, EL_EMAILADDR);
			mSerializer.attribute(null, AT_ADDRTYPE, type);
			if (c.mEmail != null) {
				mSerializer.attribute(null, AT_EMAILADR, c.mEmail);
				if (c.mNew) {
					mSerializer.attribute(null, AT_ADD, "1");
					c.mNew = false;
				}
			}
			mSerializer.endTag(null, EL_EMAILADDR);
		}
	}

    public void createAppt(Appointment appt, ResultSet results) throws ZmeException {
        try {
            putClientData(results);
            mSerializer.setPrefix("", NS_ZIMBRA_MAIL);
            mSerializer.startTag(NS_ZIMBRA_MAIL, EL_CREATEAPPT_REQ);
            mSerializer.startTag(null, EL_MSG);
            mSerializer.startTag(null, EL_INVITE);
            
            // comp
            mSerializer.startTag(null, EL_COMP);
            mSerializer.attribute(null, AT_NAME, appt.mSubj);
            if (appt.mLocation != null && appt.mLocation.length() > 0)
                mSerializer.attribute(null, AT_LOC, appt.mLocation);
            
            // or
            /*
            mSerializer.startTag(null, EL_OR);
            mSerializer.attribute(null, AT_EMAILADR, mMbox.mMidlet.mSettings.getUsername());
            mSerializer.endTag(null, EL_OR);
            */
            
            // s
            mSerializer.startTag(null, EL_S);
            mSerializer.attribute(null, AT_DATE, appt.getStartDateTime());
            mSerializer.endTag(null, EL_S);
            
            // e
            mSerializer.startTag(null, EL_E);
            mSerializer.attribute(null, AT_DATE, appt.getEndDateTime());
            mSerializer.endTag(null, EL_E);
            
            mSerializer.endTag(null, EL_COMP);
            mSerializer.endTag(null, EL_INVITE);
            mSerializer.endTag(null, EL_MSG);
            mSerializer.endTag(NS_ZIMBRA_MAIL, EL_CREATEAPPT_REQ);
        } catch (IOException ioe) {
            //#debug
            System.out.println("ZClientMobile.createAppt: IOException " + ioe);
            throw new ZmeException(ZmeException.IO_ERROR, ioe.getMessage());
        }
    }
    
    public void modifyAppt(Appointment appt, ResultSet results) throws ZmeException {
        try {
            putClientData(results);
            mSerializer.setPrefix("", NS_ZIMBRA_MAIL);
            mSerializer.startTag(NS_ZIMBRA_MAIL, EL_MODIFYAPPT_REQ);
            mSerializer.attribute(null, AT_ID, appt.mId);
            mSerializer.attribute(null, AT_COMPNUM, "0");
            
            mSerializer.startTag(null, EL_MSG);
            mSerializer.startTag(null, EL_INVITE);
            
            // comp
            mSerializer.startTag(null, EL_COMP);
            if (appt.mSubj != null && appt.mSubj.length() > 0)
                mSerializer.attribute(null, AT_NAME, appt.mSubj);
            if (appt.mLocation != null && appt.mLocation.length() > 0)
                mSerializer.attribute(null, AT_LOC, appt.mLocation);
            
            // or
            /*
            mSerializer.startTag(null, EL_OR);
            mSerializer.attribute(null, AT_EMAILADR, mMbox.mMidlet.mSettings.getUsername());
            mSerializer.endTag(null, EL_OR);
            */
            
            String val = appt.getStartDateTime();
            if (val != null) {
                // s
                mSerializer.startTag(null, EL_S);
                mSerializer.attribute(null, AT_DATE, val);
                mSerializer.endTag(null, EL_S);
            }
            
            val = appt.getEndDateTime();
            if (val != null) {
                // e
                mSerializer.startTag(null, EL_E);
                mSerializer.attribute(null, AT_DATE, val);
                mSerializer.endTag(null, EL_E);
            }
            
            mSerializer.endTag(null, EL_COMP);
            mSerializer.endTag(null, EL_INVITE);
            mSerializer.endTag(null, EL_MSG);
            mSerializer.endTag(NS_ZIMBRA_MAIL, EL_MODIFYAPPT_REQ);
        } catch (IOException ioe) {
            //#debug
            System.out.println("ZClientMobile.createAppt: IOException " + ioe);
            throw new ZmeException(ZmeException.IO_ERROR, ioe.getMessage());
        }
    }
    
    public void sendInviteReply(String itemId, String compNum, String exceptionDate, String action) throws ZmeException {
        try {
            putClientData(null);
            mSerializer.setPrefix("", NS_ZIMBRA_MAIL);
            mSerializer.startTag(NS_ZIMBRA_MAIL, EL_SENDINVITEREPLY_REQ);
            mSerializer.attribute(null, AT_ID, itemId);
            mSerializer.attribute(null, AT_COMPNUM, compNum);
            mSerializer.attribute(null, AT_VERB, action);
            if (exceptionDate != null) {
                mSerializer.startTag(null, EL_EXCEPTID);
                mSerializer.attribute(null, AT_DATE, exceptionDate);
                mSerializer.endTag(null, EL_EXCEPTID);
            }
            mSerializer.endTag(NS_ZIMBRA_MAIL, EL_SENDINVITEREPLY_REQ);
        } catch (IOException ioe) {
            //#debug
            System.out.println("ZClientMobile.sendInviteReply: IOException " + ioe);
            throw new ZmeException(ZmeException.IO_ERROR, ioe.getMessage());
        }
    }
    
	/***************************************************************************
	 * RESPONSE HANDLING METHODS
	 **************************************************************************/

	private void handleAuthResp() 
			throws IOException, 
				   XmlPullParserException {
		int matches = 0;
		while (matches < 1) {
			mParser.nextTag();
			String elName = mParser.getName();
			if (elName.compareTo(EL_AUTH_TOKEN) == 0) {
				mMbox.mAuthToken = mParser.nextText();
				matches++;
			} else {
				skipToEnd(elName);
			}
		}
		skipToEnd(EL_AUTH_RESP);
	}

	private void handleItemActionResp() 
			throws IOException,
				   XmlPullParserException {
		skipToEnd(EL_ITEMACTION_RESP);
	}

	private void handleSendMsgResp() 
			throws IOException, 
				   XmlPullParserException {
		skipToEnd(EL_SENDMSG_RESP);
	}
	
    private void handleCreateApptResp(ResultSet results) 
        throws IOException, 
           XmlPullParserException {
        results.mResults.removeAllElements();
        results.mResults.addElement(mParser.getAttributeValue(null, AT_APPTID));
    }

    private void handleModifyApptResp(ResultSet results) 
        throws IOException, 
                XmlPullParserException {
        skipToEnd(EL_MODIFYAPPT_RESP);
    }

	private void handleCreateSearchFolderResp()
			throws XmlPullParserException, 
				   IOException {
		if (mMbox.mSavedSearches == null)
			mMbox.mSavedSearches = new Vector();
		mParser.next();
		addSavedSearch();
	}

	private void handleGetApptSummariesResp(ResultSet results)
			throws XmlPullParserException, 
			   	   IOException {
		results.mResults.removeAllElements();

		Appointment template = null;
		Appointment appt = null;
        boolean endElement = false;
        
        while (!endElement) {
            mParser.next();
            int evType = mParser.getEventType();
            String name = mParser.getName();
            switch (evType) {
            case XmlPullParser.START_TAG:
                if (name.compareTo(EL_APPT) == 0) {
                    template = new Appointment();
                    appt = template;
                    populateAppt(appt);
                } else if (name.compareTo(EL_INST) == 0) {
                    appt = new Appointment(template);
                    populateAppt(appt);
                    results.addAppointment(appt);
                } else if (name.compareTo(EL_FRAGMENT) == 0)
                    appt.mFragment = mParser.nextText();
                break;
            case XmlPullParser.END_TAG:
                if (name.compareTo(EL_GETAPPTSUMMARIES_RESP) == 0)
                    endElement = true;
                else if (name.compareTo(EL_INST) == 0)
                    appt = template;
                break;
            }
        }
    }

	private void populateAppt(Appointment a) {
		String tmp;

        a.mInvId = mParser.getAttributeValue(null, AT_ID, a.mInvId);
        a.mId = mParser.getAttributeValue(null, AT_INVID, a.mId);
        a.mFolderId = mParser.getAttributeValue(null, AT_FOLDERID, a.mFolderId);
        a.mSubj = mParser.getAttributeValue(null, AT_NAME, a.mSubj);
        a.mLocation = mParser.getAttributeValue(null, AT_LOC, a.mLocation);
        a.mStart = mParser.getAttributeValue(null, AT_START, a.mStart);
        a.mDuration = mParser.getAttributeValue(null, AT_DURATION, a.mDuration);
        a.mIsAllDay = mParser.getAttributeValue(null, AT_ALLDAY, a.mIsAllDay);
        a.mRecurring = mParser.getAttributeValue(null, AT_RECUR, a.mRecurring);
        a.mHasAlarm = mParser.getAttributeValue(null, AT_ALARM, a.mHasAlarm);
        a.mOtherAttendees = mParser.getAttributeValue(null, AT_OTHERATTENDEES, a.mOtherAttendees);
        a.mAmIOrganizer = mParser.getAttributeValue(null, AT_ISORG, a.mAmIOrganizer);

		if ((tmp = mParser.getAttributeValue(null, AT_STATUS)) != null) {
			if (tmp.compareTo(EVT_TENTATIVE) == 0)
				a.mApptStatus = Appointment.EVT_TENTATIVE;
			else if (tmp.compareTo(EVT_CANCELLED) == 0)
				a.mApptStatus = Appointment.EVT_CANCELLED;
			else
				a.mApptStatus = Appointment.EVT_CONFIRMED;
		}

		if ((tmp = mParser.getAttributeValue(null, AT_PARTICIPATIONSTATUS)) != null) {
			if (tmp.compareTo(NEEDS_ACTION) == 0)
				a.mMyStatus = Appointment.NEEDS_ACTION;
			else if (tmp.compareTo(ACCEPTED) == 0)
				a.mMyStatus = Appointment.ACCEPTED;
			else if (tmp.compareTo(DECLINED) == 0)
				a.mMyStatus = Appointment.DECLINED;
			else if (tmp.compareTo(TENTATIVE) == 0)
				a.mMyStatus = Appointment.TENTATIVE;
			else
				a.mMyStatus = Appointment.DELEGATED;
		}
	}

	private void handleGetContactsResp() 
			throws XmlPullParserException,
				   IOException {
		if (mMbox.mContacts == null)
			mMbox.mContacts = new Vector();

		String elName;
		String firstName;
		String lastName;
		String email;
		String email2;
		String email3;
		do {
			mParser.next();
			elName = mParser.getName();
			if (elName.compareTo(EL_CN) == 0) {
				firstName = lastName = email = email2 = email3 = null;
				do {
					mParser.next();
					elName = mParser.getName();
					if (elName.compareTo(EL_A) == 0) {
						String attrName = mParser.getAttributeValue(null, AT_N);
						if (attrName != null) {
							if (attrName.compareTo(EMAIL) == 0)
								email = mParser.nextText();
							else if (attrName.compareTo(EMAIL2) == 0)
								email2 = mParser.nextText();
							else if (attrName.compareTo(EMAIL3) == 0)
								email3 = mParser.nextText();
							else if (attrName.compareTo(FIRST_NAME) == 0)
								firstName = mParser.nextText();
							else if (attrName.compareTo(LAST_NAME) == 0)
								lastName = mParser.nextText();
						}
						skipToEnd(EL_A);
					}
				} while (elName.compareTo(EL_CN) != 0);
				if (email != null)
					setContact(firstName, lastName, email);
				if (email2 != null)
					setContact(firstName, lastName, email2);
				if (email3 != null)
					setContact(firstName, lastName, email3);
			}
		} while (elName.compareTo(EL_GETCONTACTS_RESP) != 0);
	}
	
	private void setContact(String firstName,
							String lastName,
							String email) {
		Contact c = new Contact();
		//#if (${bytes(polish.HeapSize)} >= ${bytes(1MB)}) or (polish.HeapSize == dynamic)
			c.mFirstName = firstName;
			c.mLastName = lastName;
		//#endif
		c.mEmail = email;
		mMbox.mContacts.addElement(c);
	}

	private void handleGetFolderResp(ItemFactory folderItemFactory) 
			throws XmlPullParserException,
				   IOException {
		if (mMbox.mSavedSearches == null)
			mMbox.mSavedSearches = new Vector();
		else
			mMbox.mSavedSearches.removeAllElements();

		mMbox.mRootFolder = new Folder();
        mParser.next();
        if (mParser.getName().equals(EL_FOLDER) && mParser.getEventType() == XmlPullParser.START_TAG)
            processFolder(mMbox.mRootFolder, folderItemFactory);
		skipToEnd(EL_GETFOLDER_RESP);
	}

	private void processFolder(Folder parent,
							   ItemFactory folderItemFactory) 
			throws XmlPullParserException,
				   IOException {

        boolean isCloseFolderTag = false;
        for ( ; !isCloseFolderTag; ) {
            mParser.next();
            String elName = mParser.getName();
            int evtType = mParser.getEventType();
            if (elName.compareTo(EL_SEARCH) == 0) {
                addSavedSearch();
                continue;
            } else if (elName.compareTo(EL_FOLDER) != 0) {
                continue;
            }
            switch (evtType) {
            case XmlPullParser.START_TAG:
                Folder f = new Folder();
                f.mView = mParser.getAttributeValue(null, AT_VIEW);
                f.mName = mParser.getAttributeValue(null, AT_NAME);
                f.mId = mParser.getAttributeValue(null, AT_ID);
                f.mParent = parent;
                parent.mSubfolders.addElement(f);
                processFolder(f, folderItemFactory);
                break;
            case XmlPullParser.END_TAG:
                isCloseFolderTag = true;
                break;
            }
        }
	}

	private void handleGetMsgResp(MsgItem m) 
			throws IOException,
				   XmlPullParserException {
		mParser.next(); // Get into the msg element
		handleMessage(m, true);
	}

	private void handleGetSearchFolderResp() 
			throws IOException,
				   XmlPullParserException {
		if (mMbox.mSavedSearches == null)
			mMbox.mSavedSearches = new Vector();
		else
			mMbox.mSavedSearches.removeAllElements();

		String elName;
		do {
			mParser.next();
			elName = mParser.getName();
			if (elName.compareTo(EL_SEARCH) == 0) {
				addSavedSearch();
			}
		} while (elName.compareTo(EL_GETSEARCHFOLDER_RESP) != 0);

	}

	private void handleGetTagResp() 
			throws IOException,
				   XmlPullParserException {
		if (mMbox.mTags == null)
			mMbox.mTags = new Vector();
		else
			mMbox.mTags.removeAllElements();
		
		String elName;
		do {
			mParser.next();
			elName = mParser.getName();
			if (elName.compareTo(EL_TAG) == 0) {
				Tag t = new Tag();
				t.mId = mParser.getAttributeValue(null, AT_ID);
				t.mName = mParser.getAttributeValue(null, AT_NAME);
				t.mColor = mParser.getAttributeValue(null, AT_COLOR);
				//#debug
				System.out.println("Added tag: " + t.mName);
				mMbox.mTags.addElement(t);
				mParser.next(); // Get out of the saved search
			}
		} while (elName.compareTo(EL_GETTAG_RESP) != 0);
	}


    private void handleSearchRestResp(ResultSet results)
    throws IOException, XmlPullParserException
    {
        String elName;
        MsgItem msg = null;
        String more;

        results.mResults.removeAllElements();
        results.mMore = ((more = mParser.getAttributeValue(null, AT_MORE)) != null 
                    && more.compareTo("1") == 0) ? true : false;
        do {
            mParser.next();
            elName = mParser.getName();
            if (elName.compareTo(EL_MSG) == 0) {
                msg = results.mItemFactory.createMsgItem();
                handleMessage(msg, false);
                results.mResults.addElement(msg);
            }
        } while (elName.compareTo(EL_ITEMS) != 0);
    }
	private void handleSearchResp(ResultSet results) 
				throws IOException,
					   XmlPullParserException {
		String elName;
		ConvItem c = null;
		String more;

		results.mResults.removeAllElements();
		results.mMore = ((more = mParser.getAttributeValue(null, AT_MORE)) != null 
					&& more.compareTo("1") == 0) ? true : false;
		do {
			mParser.next();
			elName = mParser.getName();
			if (elName.compareTo(EL_CONV) == 0) {
				c = results.mItemFactory.createConvItem();
				c.mId = mParser.getAttributeValue(null, AT_ID);
				c.mSortField = mParser.getAttributeValue(null, AT_SORTFIELD);
				c.setNumMsgsInConv(Integer.parseInt(mParser.getAttributeValue(null, AT_NUMMSGS)));
				c.setDate(Long.parseLong(mParser.getAttributeValue(null, AT_DATE)));

				String str = mParser.getAttributeValue(null, AT_FLAGS);
				if (str != null) {
					char[] a = str.toCharArray();
					int l = a.length;
					for (int i = 0; i < l; i++) {
						switch (a[i]) {
						case 'u':
							c.setUnread(true, false);
							break;
						case 'a':
							c.setHasAttach(true);
							break;
						case 'r':
							c.setReplied(true);
							break;
						case 'w':
							c.setForwarded(true);
							break;
						case 'f':
							c.setFlagged(true, false);
							break;
						}
					}
				}
				
				getTags(c);

				do {
					mParser.next();
					elName = mParser.getName();
					if (elName.compareTo(EL_SUBJECT) == 0) {
						c.setSubject(mParser.nextText());
					} else if (elName.compareTo(EL_FRAGMENT) == 0) {
						c.mFragment = mParser.nextText();
					} else if (elName.compareTo(EL_EMAILADDR) == 0) {
						String dispName = mParser.getAttributeValue(null, AT_DISPLAYNAME);
						if (dispName == null)
							dispName = mParser.getAttributeValue(null, AT_EMAILADR);
						c.addConvParticipant(dispName);
						skipToEnd(EL_EMAILADDR);
					}
				} while (elName.compareTo(EL_CONV) != 0);
				results.mResults.addElement(c);
			}
		} while (elName.compareTo(EL_SEARCH_RESP) != 0);
	}

	private void handleGetConvResp(ResultSet results) 
			throws IOException,
				   XmlPullParserException {
		String elName;
		MsgItem m = null;

		results.mResults.removeAllElements();
		int evt = mParser.getEventType();

		mParser.next();
		elName = mParser.getName();
		if (elName.compareTo(EL_CONV) != 0)
			return;
		do {
			mParser.next();
			elName = mParser.getName();
			evt = mParser.getEventType();
			if (mParser.getEventType() == XmlPullParser.START_TAG && elName.compareTo(EL_MSG) == 0) {
				//#debug
				System.out.println(">>>>>>>>>>>>>>>>> BEGIN MESSAGE");
				m = results.mItemFactory.createMsgItem();
				handleMessage(m, false);
				results.mResults.addElement(m);
				//#debug
				System.out.println("<<<<<<<<<<<<<<<<< END MESSAGE");
			}
		} while (elName == null || elName.compareTo(EL_GETCONV_RESP) != 0);
	}

	private void handleMessage(MsgItem m, 
							   boolean gettingMsg)
			throws XmlPullParserException, 
				   IOException {

		String elName;

		if (!gettingMsg) {
			m.mId = mParser.getAttributeValue(null, AT_ID);
			m.mCId = mParser.getAttributeValue(null, AT_CID);
			m.mSortField = mParser.getAttributeValue(null, AT_SORTFIELD);
			String dateStr = mParser.getAttributeValue(null, AT_DATE);
			m.setDate((dateStr != null) ? Long.parseLong(dateStr) : 0);
			dateStr = mParser.getAttributeValue(null, AT_SENTDATE);
			m.setSentDate((dateStr != null) ? Long.parseLong(dateStr) : 0);
		}

		String flags = mParser.getAttributeValue(null, AT_FLAGS);
		m.setUnread(false, false);

		if (flags != null) {
			char[] a = flags.toCharArray();
			int l = a.length;
			for (int i = 0; i < l; i++) {
				switch (a[i]) {
				case 'u':
					m.setUnread(true, false);
					break;
				case 'a':
					m.setHasAttach(true);
					break;
				case 'r':
					m.setReplied(true);
					break;
				case 'w':
					m.setForwarded(true);
					break;
				case 'f':
					m.setFlagged(true, false);
					break;
				}
			}
		}
		
		//Get tags
		getTags(m);

		do {
			mParser.next();
			elName = mParser.getName();
			//#debug
			System.out.println("ZClientMobile.handleMessage: Element is " + elName);
			if (!gettingMsg && elName.compareTo(EL_SUBJECT) == 0) {
				m.setSubject(mParser.nextText());
			} else if (!gettingMsg && elName.compareTo(EL_FRAGMENT) == 0) {
				m.mFragment = mParser.nextText();
			} else if (elName.compareTo(EL_INVITE) == 0) {
				m.mInvite = true;
                while (mParser.getName().compareTo(EL_COMP) != 0 ||
                        mParser.getEventType() != XmlPullParser.START_TAG)
                    mParser.next();
                m.mApptId = mParser.getAttributeValue(null, AT_APPTID);
				skipToEnd(EL_INVITE);
			} else if (elName.compareTo(EL_EMAILADDR) == 0) {
				// Could do each of these in the respective case statement and
				// save on some
				// processing?
				String emailAddr = mParser.getAttributeValue(null, AT_EMAILADR);
				String dispName = mParser.getAttributeValue(null, AT_DISPLAYNAME);
				if (dispName == null)
					dispName = emailAddr;
				// Check to see who it is!
				switch (mParser.getAttributeValue(null, AT_ADDRTYPE).charAt(0)) {
				case SENDER:
					m.setMsgSender(emailAddr, dispName);
					break;
				case REPLYTO:
					m.setMsgReplyTo(emailAddr, dispName);
					break;
				case FROM:
					m.setMsgFrom(emailAddr, dispName);
					break;
				case TO:
					m.addToRecipient(emailAddr, dispName);
					break;
				case CC:
					m.addCCRecipient(emailAddr, dispName);
					break;
				}
				skipToEnd(EL_EMAILADDR);
			} else if (elName.compareTo(EL_MIMEPART) == 0) {
				//#debug
				System.out.println("ZClientMobile.handleMessage: Found top multipart");
				getContentFromMime(m, 0, "");
				/*
				 * TODO - we could have loaded a message that has no <mp>
				 * elements so we need to handle that case
				 */
				m.setLoaded();
				m.setExpanded(true);
				// skipToEnd(EL_MIMEPART);
			} else {
				skipToEnd(elName);
			}
		} while (elName.compareTo(EL_MSG) != 0);
	}

	private void getContentFromMime(MsgItem m, 
									int level, 
									String parentType)
			throws XmlPullParserException, 
				   IOException {
		//#debug
		System.out.println("ZClientMobile.getContentFromMime: Level - " + level);
		String cType = mParser.getAttributeValue(null, AT_CONTENT_TYPE);
		//#debug
		System.out.println("ZClientMobile.getContentFromMime: Content Type: " + cType + " - Part: "
						   + mParser.getAttributeValue(null, "part"));
		if (cType.compareTo(MP_ALT) == 0 || cType.compareTo(MP_REL) == 0
			|| cType.compareTo(MP_MIX) == 0) {
			// If we are at the top level of the MIME tree, then parse into each
			// mime part. If we are in a
			// sub-part and come across one of the above mime types, simply
			// consider it an attachment
			int depth = mParser.getDepth();
			if (level == 0) {
				do {
					mParser.next();
					if (mParser.getEventType() != XmlPullParser.END_TAG)
						getContentFromMime(m, level + 1, cType);
				} while (mParser.getDepth() != depth
						|| mParser.getEventType() != XmlPullParser.END_TAG
						|| mParser.getName().compareTo(EL_MIMEPART) != 0);
			} else {
				//#debug
				System.out.println("ZClientMobile.getContentFromMime: Adding Attachment");
				addAttachment(m);
				skipOut(EL_MIMEPART, depth);
			}
		} else if (cType.compareTo(TEXT_PLAIN) == 0
				   && mParser.getAttributeValue(null, AT_BODY) != null) {
			//#debug
			System.out.println("ZClientMobile.getContentFromMime: Body Part Hit");
			// If we hit a text plain part see if it is a body part. If it is,
			// then append it to
			// the body text. If not, then consider it an attachment
			// get <content>
			mParser.next();
			if (mParser.getEventType() == XmlPullParser.START_TAG) {
				StringBuffer msgBody = m.getBody();
				if (msgBody == null)
					msgBody = new StringBuffer();
				
				int bodyLen = msgBody.length();
				String text = mParser.nextText();
				if (bodyLen < MAXBODY_LEN) {
					int textLen = text.length();
					int remainingBytes = MAXBODY_LEN - (textLen + bodyLen);
					
					//#debug
					System.out.println("textLen: " + textLen + ", remainingBytes: " + remainingBytes);
					
					if (remainingBytes <= 0) {
						m.append2Body(text.substring(0, MAXBODY_LEN - bodyLen));
						m.append2Body(Locale.get("main.MessageTruncated"));
					} else
						m.append2Body(text);
				}
			}
			mParser.next(); // get to </content>
		} else if (parentType.compareTo(MP_ALT) != 0) {
			// Add to attachment list if parent is not multipart/alternative
			//#debug
			System.out.println("ZClientMobile.getContentFromMime: Attachment hit not multipart - Adding");
			addAttachment(m);
		} else {
			// Parent is multipart-alternative, just skip to next element
			mParser.next();
		}
	}

	private void addAttachment(MsgItem m) 
			throws XmlPullParserException,
				   IOException {
		if (m.mAttachments == null)
			m.mAttachments = new Vector();
		Attachment a = new Attachment(mParser.getAttributeValue(null, AT_CONTENT_TYPE), 
									  mParser.getAttributeValue(null, AT_FILENAME),
									  m.mId,
									  mParser.getAttributeValue(null, AT_PART));
		m.mAttachments.addElement(a);
		//#debug
		System.out.println("Added attachment: Filename: " + a.mName
					+ ", Content-type: " + a.mType + ", MID: " + a.mMsgId
					+ ", Part: " + a.mPart);
		mParser.next();
	}

	/***************************************************************************
	 * SUPPORTING METHODS
	 **************************************************************************/
    private HttpConnection getConnection() 
			throws IOException {
		return (HttpConnection)Connector.open(mMbox.mServerUrl);
	}

    public void setAuthCookie(String authToken) throws IOException {
        //#debug
        System.out.println("URL: "+mMbox.mSetAuthCookieUrl+", authToken: "+authToken);
        mConn = (HttpConnection)Connector.open(mMbox.mSetAuthCookieUrl + "?authToken="+authToken);
        try {
            mConn.setRequestMethod(HttpConnection.GET);
            mConn.setRequestProperty("User-Agent", USER_AGENT);
            int rc = mConn.getResponseCode();
            if (rc != 200) {
                //#debug
                System.out.println("setauth returned an error: "+rc);
            }
        } finally {
            mConn.close();
        }
    }
    
	private void beginReq() 
			throws IOException {
		mConn = getConnection();
		try {
			mConn.setRequestMethod(HttpConnection.POST);
			mConn.setRequestProperty("User-Agent", USER_AGENT);
			mConn.setRequestProperty("Accept-Encoding", "gzip");

			mOs = mConn.openOutputStream();
			mSerializer.setOutput(mOs, "UTF-8");

			// mSerializer.setOutput(System.out, "UTF-8");
			mSerializer.startDocument("UTF-8", null);
			mSerializer.setPrefix(PR_SOAP, NS_SOAP);
			mSerializer.startTag(NS_SOAP, EL_ENV);
		} catch (IOException e) {
			if (mOs != null) {
				mOs.close();
				mOs = null;
			}
			mConn.close();
			throw e;
		}
	}

	private void setReqHeader(String authToken) 
			throws IOException {
		try {
			mSerializer.startTag(NS_SOAP, EL_HEADER);
			mSerializer.startTag(NS_ZIMBRA, EL_CONTEXT);

			mSerializer.startTag(null, EL_USER_AGENT);
			mSerializer.attribute(null, AT_NAME, USER_AGENT);
			mSerializer.attribute(null, AT_VERSION, VERSION);
			mSerializer.endTag(null, EL_USER_AGENT);

			// We don't need sessions
			mSerializer.startTag(null, EL_NOSESSION).endTag(null, EL_NOSESSION);

			if (authToken != null) {
				mSerializer.startTag(null, EL_AUTH_TOKEN);
				mSerializer.text(authToken);
				mSerializer.endTag(null, EL_AUTH_TOKEN);
			}

			mSerializer.endTag(NS_ZIMBRA, EL_CONTEXT);
			mSerializer.endTag(NS_SOAP, EL_HEADER);
		} catch (IOException e) {
			mOs.close();
			mOs = null;
			mConn.close();
			throw e;
		}
	}

	private void beginReqBody() 
			throws IOException {
		try {
			mSerializer.startTag(NS_SOAP, EL_BODY);
			if (mBatchRequest)
				mSerializer.startTag(NS_ZIMBRA, EL_BATCH_REQ);
		} catch (IOException e) {
			mOs.close();
			mOs = null;
			mConn.close();
			throw e;
		}
	}

	private void endReqBody() 
			throws IOException {
		try {
			if (mBatchRequest)
				mSerializer.endTag(NS_ZIMBRA, EL_BATCH_REQ);
			mSerializer.endTag(NS_SOAP, EL_BODY);
		} catch (IOException e) {
			mOs.close();
			mOs = null;
			mConn.close();
			throw e;
		}
	}

	private void endReq() 
			throws IOException, 
				   XmlPullParserException,
				   ZmeSvcException {
		try {
			mSerializer.endTag(NS_SOAP, EL_ENV);
			mSerializer.endDocument();
		} catch (IOException e) {
			mOs.close();
			mOs = null;
			mConn.close();
			throw e;
		}
		mOs.close();
		mOs = null;
	}

	private void handleResp() 
			throws IOException, 
				   XmlPullParserException,
				   ZmeSvcException {
		mIs = null;

		try {
			int rc = mConn.getResponseCode();
			switch (rc) {
			case HttpConnection.HTTP_OK:
			case HttpConnection.HTTP_INTERNAL_ERROR: // 500 happens on method failures
				break;

			default:
				throw new IOException("HTTP response code: " + rc);
			}

			String encoding = mConn.getEncoding();
			//#debug
			System.out.println("Content Encoding: " + encoding);
			
			mIs = mConn.openInputStream();
			
			if (encoding != null && encoding.compareTo("gzip") == 0)
				mIs = new GZIPInputStream(mIs);
			
			mParser.setInput(mIs, "UTF-8");

			int eventType = mParser.getEventType();
			if (eventType != XmlPullParser.START_DOCUMENT)
				throw new IOException("Invalid response from server");

			mParser.next();
			String elName = mParser.getName();
            if (elName.compareTo(EL_ITEMS) != 0) {
                if (elName.compareTo(EL_ENV) != 0)
                    throw new IOException("Invalid response: Expected Envelope encountered " + elName);

                mParser.next();
                if (mParser.getName().compareTo(EL_HEADER) == 0) {
                    processHeader();
                    mParser.next();
                }

                elName = mParser.getName();
            }
			if (elName.compareTo(EL_BODY) == 0) {
				mParser.next();
				elName = mParser.getName();
				if (elName.compareTo(EL_FAULT) == 0) {
					processFault();
				} else if (elName.compareTo(EL_BATCH_RESP) == 0) {
					//#debug
					System.out.println("Processing Batch response");
					mParser.next(); // Skip to the first command/fault
					do {
						if (elName.compareTo(EL_FAULT) == 0) {
							//#debug
							System.out.println("Soap Fault");
							getClientData();
							processFault();
						} else {
							//#debug
							System.out.println("Processing Command");
							dispatchReponse(getClientData());
						}
						mParser.next();
						elName = mParser.getName();
					} while (elName.compareTo(EL_BATCH_RESP) != 0);
					//#debug
					System.out.println("Done with Batch response");
				} else {
					dispatchReponse(getClientData());
				}
            } else if (elName.compareTo(EL_ITEMS) == 0) {
                dispatchReponse(getClientData());
			} else {
				throw new IOException(
						"Invalid response: Expected Body encountered " + elName);
			}
		} finally {
			if (mIs != null) {
				mIs.close();
				mIs = null;
			}
			mConn.close();
		}
	}

	private void processHeader() 
			throws IOException, 
				   XmlPullParserException {
		skipToEnd(EL_HEADER);
	}

	private void dispatchReponse(Object clientData) 
			throws IOException,
				   XmlPullParserException {
		String elName = mParser.getName();
		//#debug
		System.out.println("ELNAME IS: " + elName);
		if (elName.compareTo(EL_AUTH_RESP) == 0) {
			handleAuthResp();
		} else if (elName.compareTo(EL_CREATESEARCHFOLDER_RESP) == 0) {
			handleCreateSearchFolderResp();
		} else if (elName.compareTo(EL_GETAPPTSUMMARIES_RESP) == 0) {
			handleGetApptSummariesResp((ResultSet)clientData);
		} else if (elName.compareTo(EL_GETCONTACTS_RESP) == 0) {
			handleGetContactsResp();
		} else if (elName.compareTo(EL_GETFOLDER_RESP) == 0) {
			handleGetFolderResp((ItemFactory)clientData);
		} else if (elName.compareTo(EL_GETMSG_RESP) == 0) {
			handleGetMsgResp((MsgItem)clientData);
		} else if (elName.compareTo(EL_GETSEARCHFOLDER_RESP) == 0) {
			handleGetSearchFolderResp();
		} else if (elName.compareTo(EL_GETTAG_RESP) == 0) {
			handleGetTagResp();
		} else if (elName.compareTo(EL_ITEMACTION_RESP) == 0) {
			handleItemActionResp();
		} else if (elName.compareTo(EL_SEARCH_RESP) == 0) {
			handleSearchResp((ResultSet)clientData);
		} else if (elName.compareTo(EL_GETCONV_RESP) == 0) {
			handleGetConvResp((ResultSet)clientData);
		} else if (elName.compareTo(EL_SENDMSG_RESP) == 0) {
			handleSendMsgResp();
		} else if (elName.compareTo(EL_ITEMS) == 0) {
		    handleSearchRestResp((ResultSet)clientData);
        } else if (elName.compareTo(EL_CREATEAPPT_RESP) == 0) {
            handleCreateApptResp((ResultSet)clientData);
        } else if (elName.compareTo(EL_MODIFYAPPT_RESP) == 0) {
            handleModifyApptResp((ResultSet)clientData);
        }
	}

	private void processFault() 
			throws IOException, 
				   XmlPullParserException,
				   ZmeSvcException {
		System.out.println("PROCESSING SOAP FAULT");

		// Find the <Error> tag in the Fault block
		while (true) {
			mParser.next();
			if (mParser.getEventType() != XmlPullParser.START_TAG)
				continue;

			if (mParser.getName().compareTo(EL_ERROR) == 0)
				break;
		}

		// Now get all the juicy data
		Hashtable attrs = null;
		String code = null;

		while (true) {
			mParser.next();
			int evtType = mParser.getEventType();

			// If we are at the end of <Error> tag, then bail
			if (evtType == XmlPullParser.END_TAG
					&& mParser.getName().compareTo(EL_ERROR) == 0)
				break;

			// If this is not at the beginning of an element, continue
			if (evtType != XmlPullParser.START_TAG)
				continue;

			/*
			 * Check to see if it is the <Code> element of an <a> element and
			 * deal with appropriately
			 */
			String elName = mParser.getName();
			if (elName.compareTo(EL_CODE) == 0) {
				code = mParser.nextText();
				skipToEnd(EL_CODE);
			} else if (elName.compareTo(EL_A) == 0) {
				if (attrs == null)
					attrs = new Hashtable();
				attrs.put(mParser.getAttributeValue(null, AT_N), mParser.nextText());
				skipToEnd(EL_A);
			}
		}
		throw new ZmeSvcException(code, attrs);
	}

	private Object getClientData() {
		int size = mClientData.size();
		if (size == 0)
			return null;
		Object clientData = mClientData.elementAt(0);
		mClientData.removeElementAt(0);
		return (clientData == NULL) ? null : clientData;
	}

	private void putClientData(Object clientData) {
		if (clientData == null)
			clientData = NULL;
		mClientData.addElement(clientData);
	}

	/*
	 * Skips to the end of <i>elName</i>
	 * 
	 * @param elName Element to skip to the end of @throws IOException @throws
	 * XmlPullParserException @throws IOException
	 */
	private void skipToEnd(String elName) 
			throws IOException,
				   XmlPullParserException {
		while (true) {
			int evtType = mParser.getEventType();
			if (evtType == XmlPullParser.END_TAG
				&& mParser.getName().compareTo(elName) == 0)
				return;
			mParser.next();
		}
	}

	/*
	 * Skips to the end of <i>elName</i> at <i>depth</i>. This method is
	 * useful when there are nested elements with the same name (such as <mp>)
	 * 
	 * @param elName Element to skip out of @param depth Element depth @throws
	 * XmlPullParserException @throws IOException
	 */
	private void skipOut(String elName, 
					     int depth)
			throws XmlPullParserException, 
				   IOException {
		while (mParser.getDepth() != depth
			   || mParser.getEventType() != XmlPullParser.END_TAG
			   || mParser.getName().compareTo(elName) != 0) {
			mParser.next();
		}
		mParser.next();
	}

	private void addSavedSearch() 
			throws XmlPullParserException, 
				   IOException {
		String folderId = mParser.getAttributeValue(null, AT_FOLDERID);
		if (folderId == null 
			|| (folderId.compareTo(ID_FOLDER_TRASH) != 0 
			 && folderId.compareTo(ID_FOLDER_SPAM) != 0)) {
			SavedSearch ss = new SavedSearch();
			ss.mId = mParser.getAttributeValue(null, AT_ID);
			ss.mName = mParser.getAttributeValue(null, AT_NAME);
			ss.mQuery = mParser.getAttributeValue(null, AT_QUERY);
			ss.mSortBy = mParser.getAttributeValue(null, AT_SORTBY);
			ss.mTypes = mParser.getAttributeValue(null, AT_TYPES);
			//#debug
			System.out.println("Added saved search: " + ss.mName);
			mMbox.mSavedSearches.addElement(ss);
		}
		mParser.next(); // Get out of the saved search
	}
	
	private void getTags(MailItem mi) {
		String str = mParser.getAttributeValue(null, AT_TAGS);
		if (str != null) {
			StringTokenizer st = new StringTokenizer(str, ",");
			int numTags = st.countTokens();
			mi.mTags = new String[numTags];
			for (int i = 0; i < numTags; i++)
				mi.mTags[i] = st.nextToken();
		}
	}
 }
