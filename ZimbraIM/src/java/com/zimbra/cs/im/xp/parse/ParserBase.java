/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 * 
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 ("License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.zimbra.com/license
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is: Zimbra Collaboration Suite Server.
 * 
 * The Initial Developer of the Original Code is Zimbra, Inc.
 * Portions created by Zimbra are Copyright (C) 2005, 2006 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s): 
 * 
 * ***** END LICENSE BLOCK *****
 */
 
package com.zimbra.cs.im.xp.parse;

import java.util.Locale;

/**
 *
 * @version $Revision: 1.1 $ $Date: 1998/06/25 10:52:26 $
 */
public class ParserBase {
  protected EntityManager entityManager = new EntityManagerImpl();
  protected Locale locale = Locale.getDefault();

  public void setEntityManager(EntityManager entityManager) {
    if (entityManager == null)
      throw new NullPointerException();
    this.entityManager = entityManager;
  }

  public void setLocale(Locale locale) {
    if (locale == null)
      throw new NullPointerException();
    this.locale = locale;
  }
}
