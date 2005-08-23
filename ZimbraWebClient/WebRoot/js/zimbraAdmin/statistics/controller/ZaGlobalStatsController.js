/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: ZPL 1.1
 * 
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.1 ("License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.zimbra.com/license
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is: Zimbra Collaboration Suite.
 * 
 * The Initial Developer of the Original Code is Zimbra, Inc.
 * Portions created by Zimbra are Copyright (C) 2005 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s):
 * 
 * ***** END LICENSE BLOCK *****
 */

/**
* @class ZaGlobalStatsController 
* @contructor ZaGlobalStatsController
* @param appCtxt
* @param container
* @param app
* @author Greg Solovyev
**/
function ZaGlobalStatsController(appCtxt, container, app) {

	ZaController.call(this, appCtxt, container, app);
}

ZaGlobalStatsController.prototype = new ZaController();
ZaGlobalStatsController.prototype.constructor = ZaGlobalStatsController;

ZaGlobalStatsController.STATUS_VIEW = "ZaGlobalStatsController.STATUS_VIEW";

ZaGlobalStatsController.prototype.show = 
function() {
    if (!this._appView) {
		this._contentView = new ZaGlobalStatsView(this._container, this._app);
		this._appView = this._app.createView(ZaGlobalStatsController.STATUS_VIEW, [this._contentView]);
	}
	this._app.pushView(ZaGlobalStatsController.STATUS_VIEW);
	this._app.setCurrentController(this);
}

/**
* @param nextViewCtrlr - the controller of the next view
* Checks if it is safe to leave this view. Displays warning and Information messages if neccesary.
**/
ZaGlobalStatsController.prototype.switchToNextView = 
function (nextViewCtrlr, func, params) {
	func.call(nextViewCtrlr, params);
}