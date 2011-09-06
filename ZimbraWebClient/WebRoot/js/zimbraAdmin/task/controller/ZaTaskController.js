/**
 * Created by IntelliJ IDEA.
 * User: mingzhang
 * Date: 9/5/11
 * Time: 12:27 AM
 * To change this template use File | Settings | File Templates.
 */
ZaTaskController = function(appCtxt, container) {
	ZaController.call(this, appCtxt, container,"ZaTaskController");
}

ZaTaskController.prototype = new ZaController();
ZaTaskController.prototype.constructor = ZaTaskController;

ZaTaskController.prototype.getTaskHeaderPanel =
function() {
    if (!this._taskHeadPanel) {
        this._taskHeadPanel = new ZaTaskHeaderPanel(this._container);
    }
    return this._taskHeadPanel;
}

ZaTaskController.prototype.getTaskContentPanel =
function(entry) {
    if (!this._taskContentPanel) {
        if(!entry) {
            entry = new ZaTask();
            entry.load(false, false, true);
        }
        this._taskContentPanel = new ZaTaskContentView(this._container, entry);
        this._taskContentPanel.setObject(entry);
    }
    return this._taskContentPanel;
}