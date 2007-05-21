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

package com.zimbra.zme;

public interface ResponseHdlr {
	/**
	 * This method is called (by Mailbox run()) to alert the ResponseHdlr to 
	 * the thread that is handling the current request. The ResponseHdlr
	 * commonly passes this to Mailbox.cancelOp() should it wish to cancel
	 * the ongoing operation
	 * @param svcThreadName
	 */
	/*public void svcThread(String svcThreadName);*/

	public void handleResponse(Object op,
			                   Object resp);
}
