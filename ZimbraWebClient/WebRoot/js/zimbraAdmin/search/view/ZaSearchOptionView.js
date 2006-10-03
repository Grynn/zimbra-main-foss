/**
 * @param optionId : the Search Option type ID
 * @param width : the width of the option view
 * @param position : the current option view's array index in the option view container
 * 
 * 
 */

function ZaSearchOptionView (parent, app, optionId, width, position){
	DwtComposite.call(this, parent, "ZaSearchOptionView", Dwt.ABSOLUTE_STYLE, true);		
	this._width = width || ZaSearchOptionView.WIDTH ;
	var height = parent.getH () - 5;
	var x = parent.getNextOptionX();
	var y = 0 ;
	this.setBounds (x, y, this._width, height);
	this._app = app;
	this._position = position ;
	this._optionId = optionId ;
	this._controller = this._app.getSearchBuilderController () ;
	//this._label = new DwtLabel (this._header, DwtLabel.IMAGE_LEFT | DwtLabel.ALIGN_LEFT);
	this._label;
	if (optionId == ZaSearchOption.OBJECT_TYPE_ID) {
		this._label = new ZaOperation (ZaOperation.LABEL, ZaMsg.searchByAddressType, null, "SearchAll", "SearchAll");
	}else if (optionId == ZaSearchOption.DOMAIN_ID) {
		this._label = new ZaOperation(ZaOperation.LABEL, ZaMsg.SearchFilter_Domains, null, "Domain", "DomainDis");
	}else if (optionId == ZaSearchOption.SERVER_ID) {
		this._label = new ZaOperation(ZaOperation.LABEL, ZaMsg.searchByServer, null, "Server", "ServerDis");
	}else if (optionId == ZaSearchOption.BASIC_TYPE_ID) {
		this._label = new ZaOperation (ZaOperation.LABEL, ZaMsg.searchByBasic, null, "SearchAll", "SearchAll");
	}
	
	var tb_items = [];
	tb_items.push(this._label);	
	tb_items.push(new ZaOperation(ZaOperation.NONE));
	tb_items.push(new ZaOperation(ZaOperation.CLOSE, null, ZaMsg.ALTBB_Close_tt, "Close", "CloseDis", new AjxListener(this, this.closeButtonListener)));    	
	
	this._header = new ZaToolBar (this, tb_items) ;
	this._header.setSize (this._width, 25);
	
	this.initForm (ZaSearchOption.getObjectTypeXModel(optionId), ZaSearchOption.getObjectTypeXForm (optionId), ZaSearchOption.getDefaultInstance(optionId));
}

ZaSearchOptionView.prototype = new DwtComposite ;
ZaSearchOptionView.prototype.constructor = ZaSearchOptionView ;

ZaSearchOptionView.WIDTH = 150 ;
ZaSearchOptionView.BASIC_OPTION_WIDTH = 200 ;
ZaSearchOptionView.MARGIN = 1 ;

ZaSearchOptionView.prototype.closeButtonListener = 
function (event){
	DBG.println (AjxDebug.DBG1, "Close options ... ");	
	//splice from option view array, update the query and dispose the component, 
	
	this._controller.removeOptionView(this._position, true) ;
}

ZaSearchOptionView.prototype.setPosition = 
function (p) {
	this._position = p ;	
}

ZaSearchOptionView.prototype.getPosition = 
function () {
	return this._position ;	
}

ZaSearchOptionView.prototype.initForm = 
function (xModelMetaData, xFormMetaData, xFormInstance) {
	if(xModelMetaData == null || xFormMetaData == null)
		throw new AjxException("Metadata for XForm and/or XModel are not defined", AjxException.INVALID_PARAM, "DwtXWizardDialog.prototype._initForm");

	this._localXModel = new XModel(xModelMetaData);
	//
	this._localXForm = new XForm(xFormMetaData, this._localXModel, xFormInstance , this);
	this._localXForm.setController(this._app);
	this._localXForm.draw();
	this._drawn = true;
}


