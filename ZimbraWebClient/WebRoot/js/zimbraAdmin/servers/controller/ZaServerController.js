/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2005, 2006, 2007, 2008, 2009, 2010 Zimbra, Inc.
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

/**
* @class ZaServerController controls display of a single Server
* @contructor ZaServerController
* @param appCtxt
* @param container
* @param abApp
* @author Greg Solovyev
**/

ZaServerController = function(appCtxt, container) {
	ZaXFormViewController.call(this, appCtxt, container,"ZaServerController");
	this._UICreated = false;
	this._helpURL = location.pathname + ZaUtil.HELP_URL + "managing_servers/managing_servers.htm?locid="+AjxEnv.DEFAULT_LOCALE;
	this._toolbarOperations = new Array();
	this.deleteMsg = ZaMsg.Q_DELETE_SERVER;	
	this.objType = ZaEvent.S_SERVER;	
	this.tabConstructor = ZaServerXFormView ;
}

ZaServerController.prototype = new ZaXFormViewController();
ZaServerController.prototype.constructor = ZaServerController;

ZaController.initToolbarMethods["ZaServerController"] = new Array();
ZaController.setViewMethods["ZaServerController"] = new Array();
ZaController.changeActionsStateMethods["ZaServerController"] = new Array();
ZaXFormViewController.preSaveValidationMethods["ZaServerController"] = new Array();
/**
*	@method show
*	@param entry - isntance of ZaServer class
*/
ZaServerController.prototype.show = 
function(entry) {
	if (! this.selectExistingTabByItemId(entry.id)){
		this._setView(entry, true);
		//this.setDirty(false);
	}
}

ZaServerController.changeActionsStateMethod = function () {
	if(this._toolbarOperations[ZaOperation.SAVE])
		this._toolbarOperations[ZaOperation.SAVE].enabled = false;
		
	if(this._toolbarOperations[ZaOperation.FLUSH_CACHE]) {
		if(!ZaItem.hasRight(ZaServer.FLUSH_CACHE_RIGHT,this._currentObject) || !this._currentObject.attrs[ZaServer.A_zimbraMailboxServiceEnabled] || !this._currentObject.attrs[ZaServer.A_zimbraMailboxServiceInstalled]) {
			this._toolbarOperations[ZaOperation.FLUSH_CACHE].enabled = false;
		}
	}
}
ZaController.changeActionsStateMethods["ZaServerController"].push(ZaServerController.changeActionsStateMethod);

ZaServerController.prototype.setEnabled = 
function(enable) {
	//this._view.setEnabled(enable);
}

/**
* Adds listener to modifications in the contained ZaServer 
* @param listener
**/
ZaServerController.prototype.addServerChangeListener = 
function(listener) {
	this._evtMgr.addListener(ZaEvent.E_MODIFY, listener);
}

/**
* Removes listener to modifications in the controlled ZaServer 
* @param listener
**/
ZaServerController.prototype.removeServerChangeListener = 
function(listener) {
	this._evtMgr.removeListener(ZaEvent.E_MODIFY, listener);    	
}


/**
* @param nextViewCtrlr - the controller of the next view
* Checks if it is safe to leave this view. Displays warning and Information messages if neccesary.
**/
ZaServerController.prototype.switchToNextView = 
function (nextViewCtrlr, func, params) {
	if(this._view.isDirty()) {
		//parameters for the confirmation dialog's callback 
		var args = new Object();		
		args["params"] = params;
		args["obj"] = nextViewCtrlr;
		args["func"] = func;
		//ask if the user wants to save changes			
		//ZaApp.getInstance().dialogs["confirmMessageDialog"] = ZaApp.getInstance().dialogs["confirmMessageDialog"] = new ZaMsgDialog(this._view.shell, null, [DwtDialog.YES_BUTTON, DwtDialog.NO_BUTTON, DwtDialog.CANCEL_BUTTON]);					
		ZaApp.getInstance().dialogs["confirmMessageDialog"].setMessage(ZaMsg.Q_SAVE_CHANGES, DwtMessageDialog.INFO_STYLE);
		ZaApp.getInstance().dialogs["confirmMessageDialog"].registerCallback(DwtDialog.YES_BUTTON, this.validateChanges, this, args);		
		ZaApp.getInstance().dialogs["confirmMessageDialog"].registerCallback(DwtDialog.NO_BUTTON, this.discardAndGoAway, this, args);		
		ZaApp.getInstance().dialogs["confirmMessageDialog"].popup();
	} else {
		ZaController.prototype.switchToNextView.call(this, nextViewCtrlr, func, params);
	}
}



/**
* @method initToolbarMethod
* This method creates ZaOperation objects 
* All the ZaOperation objects are added to this._toolbarOperations array which is then used to 
* create the toolbar for this view.
* Each ZaOperation object defines one toolbar button.
* Help button is always the last button in the toolbar
**/
ZaServerController.initToolbarMethod = 
function () {
	this._toolbarOrder.push(ZaOperation.SAVE);	
	this._toolbarOrder.push(ZaOperation.FLUSH_CACHE);	
	this._toolbarOrder.push(ZaOperation.DOWNLOAD_SERVER_CONFIG);
	this._toolbarOrder.push(ZaOperation.CLOSE);			
	this._toolbarOperations[ZaOperation.SAVE]=new ZaOperation(ZaOperation.SAVE,ZaMsg.TBB_Save, ZaMsg.SERTBB_Save_tt, "Save", "SaveDis", new AjxListener(this, this.saveButtonListener));
   	this._toolbarOperations[ZaOperation.FLUSH_CACHE] = new ZaOperation(ZaOperation.FLUSH_CACHE, ZaMsg.SERTBB_FlushCache, ZaMsg.SERTBB_FlushCache_tt, "FlushCache", "FlushCache", new AjxListener(this, ZaServerController.prototype.flushCacheButtonListener));	
	this._toolbarOperations[ZaOperation.DOWNLOAD_SERVER_CONFIG]=new ZaOperation(ZaOperation.DOWNLOAD_SERVER_CONFIG,ZaMsg.TBB_DownloadConfig, ZaMsg.SERTBB_DownloadConfig_tt, "DownloadServerConfig", "DownloadServerConfig", new AjxListener(this, this.downloadConfigButtonListener));	
	this._toolbarOperations[ZaOperation.CLOSE]=new ZaOperation(ZaOperation.CLOSE,ZaMsg.TBB_Close, ZaMsg.SERTBB_Close_tt, "Close", "CloseDis", new AjxListener(this, this.closeButtonListener));    	
}
ZaController.initToolbarMethods["ZaServerController"].push(ZaServerController.initToolbarMethod);

/**
*	@method setViewMethod 
*	@param entry - isntance of ZaDomain class
*/
ZaServerController.setViewMethod =
function(entry) {
	entry.load("id", entry.id, false, true);
	this._createUI(entry);
	ZaApp.getInstance().pushView(this.getContentViewId());
	this._view.setDirty(false);
	this._view.setObject(entry); 	//setObject is delayed to be called after pushView in order to avoid jumping of the view	
	this._currentObject = entry;
}
ZaController.setViewMethods["ZaServerController"].push(ZaServerController.setViewMethod);

/**
* @method _createUI
**/
ZaServerController.prototype._createUI =
function (entry) {
	this._contentView = this._view = new this.tabConstructor(this._container, entry);

	this._initToolbar();
	//always add Help button at the end of the toolbar
	this._toolbarOperations[ZaOperation.NONE] = new ZaOperation(ZaOperation.NONE);
	this._toolbarOperations[ZaOperation.HELP]=new ZaOperation(ZaOperation.HELP,ZaMsg.TBB_Help, ZaMsg.TBB_Help_tt, "Help", "Help", new AjxListener(this, this._helpButtonListener));
	this._toolbarOrder.push(ZaOperation.NONE);
	this._toolbarOrder.push(ZaOperation.HELP);								
	this._toolbar = new ZaToolBar(this._container, this._toolbarOperations,this._toolbarOrder,null,null, ZaId.VIEW_SERVER);		
	
	var elements = new Object();
	elements[ZaAppViewMgr.C_APP_CONTENT] = this._view;
	elements[ZaAppViewMgr.C_TOOLBAR_TOP] = this._toolbar;		
    var tabParams = {
		openInNewTab: true,
		tabId: this.getContentViewId()
	}
	ZaApp.getInstance().createView(this.getContentViewId(), elements, tabParams) ;
	this._UICreated = true;
	ZaApp.getInstance()._controllers[this.getContentViewId ()] = this ;
}

ZaServerController.prototype._saveChanges =
function () {
	var obj = this._view.getObject();
	this._currentObject.modify(obj);
	this._view.setDirty(false);	
	return true;
}

ZaServerController.prototype.validateMyNetworks = 
function (params) {
	if(!ZaItem.hasWritePermission(ZaServer.A_zimbraMtaMyNetworks,this._currentObject)) {
		this.runValidationStack(params);
		return;
	}	
	var obj = this._view.getObject();
        /*  if the user never edit the MTA Text field, the attribute doesn't exist. In this case
	 *  we don't use to check the value. Otherwise, if we continue to check, it will report 
 	 *  a error even the user never edit this item.  
	 */
	if(!obj.attrs.hasOwnProperty(ZaServer.A_zimbraMtaMyNetworks)) {
                this.runValidationStack(params);
                return;        
    }
	//find local networks
	var locals = [];
	var locals2 = [];
	var numIFs = 0;
	if(this._currentObject.nifs && this._currentObject.nifs.length) {
		numIFs = this._currentObject.nifs.length;
		for (var i = 0; i < numIFs; i++) {
			if(this._currentObject.nifs[i] && this._currentObject.nifs[i].attrs && this._currentObject.nifs[i].attrs.addr && this._currentObject.nifs[i].attrs.mask) {
				locals.push(
				 	{
				 		lAddr: ZaServer.octetsToLong(this._currentObject.nifs[i].attrs.addr),
				 		szAddr: this._currentObject.nifs[i].attrs.addr,
				 		iNetBits: ZaServer.DOT_TO_CIDR[this._currentObject.nifs[i].attrs.mask]
				 	}
				 );
				 locals2.push(
				 	{
				 		lAddr: ZaServer.octetsToLong(this._currentObject.nifs[i].attrs.addr),
				 		szAddr: this._currentObject.nifs[i].attrs.addr,
				 		iNetBits: ZaServer.DOT_TO_CIDR[this._currentObject.nifs[i].attrs.mask]
				 	}
				 );
			}
		}
	
	}	
	
	var IFCounter = numIFs;
	
	if(obj.attrs[ZaServer.A_zimbraMtaMyNetworks]) {
		var chunks = obj.attrs[ZaServer.A_zimbraMtaMyNetworks].split(/[\s,]+/);
		var cnt = chunks.length;
		var masks=[];
		var excludeMasks = [];
		var gotLocal = false;

		for(var i=0;i<cnt;i++){
			if(chunks[i]!=null && chunks[i].length>8) {
				if(chunks[i].indexOf("!")==0) {
					//exclude
					if(chunks[i].indexOf("/")>0) {
						//subnet
						var _lStartIP = ZaServer.lGetStartingAddress(chunks[i].substr(1));
						var _iNetBits = ZaServer.iGetNumNetBits(chunks[i].substring(1));
						var _obj = {
								lStartingAddr: _lStartIP,
								iNetBits: _iNetBits,
								lEndingAddr:ZaServer.lGetEndingAddress(_lStartIP,_iNetBits),
								szCIDR: chunks[i]
							};
							
						excludeMasks.push(_obj);						
						
						for(var j=(numIFs-1);j>=0;j--) {
							if(locals2[j].lAddr >= _obj.lStartingAddr && locals2[j].lAddr <= _obj.lEndingAddr /*&& locals2[j].iNetBits <= _obj.iNetBits*/) {
								throw new AjxException(AjxMessageFormat.format(ZaMsg.ERROR_LOCAL_ADDR_EXCLUDED,[locals2[j].szAddr, chunks[i]]),AjxException.INVALID_PARAM,"ZaServerController.prototype.validateMyNetworks");
							}
						}						
					} else {
						//address
						var addrNumber = ZaServer.octetsToLong(chunks[i].substr(1));
						if(addrNumber < 0) {
							throw new AjxException(AjxMessageFormat.format(ZaMsg.ERROR_INVALID_EXCLUDE_ADDR,[chunks[i]]),AjxException.INVALID_PARAM,"ZaServerController.prototype.validateMyNetworks");
						}
						
						for(var j=(numIFs-1);j>=0;j--) {
							if(locals2[j].lAddr == addrNumber) {
								throw new AjxException(AjxMessageFormat.format(ZaMsg.ERROR_LOCAL_ADDR_EXCLUDED,[locals2[j].szAddr,chunks[i]]),AjxException.INVALID_PARAM,"ZaServerController.prototype.validateMyNetworks");
							}
						}
					}
				} else {
					//include
					var _lStartIP = ZaServer.lGetStartingAddress(chunks[i]);
					var _iNetBits = ZaServer.iGetNumNetBits(chunks[i]);
					var _obj = {
							lStartingAddr: _lStartIP,
							iNetBits: _iNetBits,
							lEndingAddr:ZaServer.lGetEndingAddress(_lStartIP,_iNetBits),
							szCIDR: chunks[i]
						};
						
					masks.push(_obj);
					for(var j=(IFCounter-1);j>=0;j--) {
						if(locals[j].lAddr >= _obj.lStartingAddr && locals[j].lAddr <= _obj.lEndingAddr /*&& locals[j].iNetBits <= _obj.iNetBits*/) {
							locals.splice(j,1);
							IFCounter--;
						}
					}
				}
									

			} else {
				throw new AjxException(ZaMsg.ERROR_MISSING_LOCAL,AjxException.INVALID_PARAM,"ZaServerController.prototype.validateMyNetworks");	
			}
		}
		
		if(chunks.length<1) {
			//error! no valid subnets
			throw new AjxException(AjxMessageFormat.format(ZaMsg.ERROR_NO_VALID_SUBNETS,[obj.attrs[ZaServer.A_zimbraMtaMyNetworks]]),AjxException.INVALID_PARAM,"ZaServerController.prototype.validateMyNetworks");
		}
		
		//do we have a 127.0.0.0/8 (255.0.0.0) and other local interfaces
		if(IFCounter>0) {
			//error! missing local interfaces
			var missingIfs = [];
			for(var ix=0;ix<IFCounter;ix++) {
				missingIfs.push(locals[ix].szAddr);
			}
			throw new AjxException(AjxMessageFormat.format(ZaMsg.ERROR_MISSING_LOCAL,missingIfs.join(",")),AjxException.INVALID_PARAM,"ZaServerController.prototype.validateMyNetworks");
		}
		cnt = masks.length;
		for(var i=0;i<cnt;i++) {
			if(ZaServer.isValidPostfixSubnetString(masks[i].szCIDR) == ZaServer.ERR_NOT_CIDR) {
				throw new AjxException(AjxMessageFormat.format(ZaMsg.ERROR_NOT_CIDR,[masks[i].szCIDR]),AjxException.INVALID_PARAM,"ZaServerController.prototype.validateMyNetworks");
			} else if (ZaServer.isValidPostfixSubnetString(masks[i].szCIDR) == ZaServer.ERR_NOT_STARTING_ADDR) {
				throw new AjxException(AjxMessageFormat.format(ZaMsg.ERROR_NOT_STARTING_ADDR,[masks[i].szCIDR,ZaServer.longToOctets(masks[i].lStartingAddr)]),AjxException.INVALID_PARAM,"ZaServerController.prototype.validateMyNetworks");				
			}
		}
		
		cnt = excludeMasks.length;
		for(var i=0;i<cnt;i++) {
			if(ZaServer.isValidPostfixSubnetString(excludeMasks[i].szCIDR) == ZaServer.ERR_NOT_CIDR) {
				throw new AjxException(AjxMessageFormat.format(ZaMsg.ERROR_NOT_CIDR,[excludeMasks[i].szCIDR]),AjxException.INVALID_PARAM,"ZaServerController.prototype.validateMyNetworks");
			} else if (ZaServer.isValidPostfixSubnetString(excludeMasks[i].szCIDR) == ZaServer.ERR_NOT_STARTING_ADDR) {
				throw new AjxException(AjxMessageFormat.format(ZaMsg.ERROR_NOT_STARTING_ADDR,[excludeMasks[i].szCIDR,ZaServer.longToOctets(excludeMasks[i].lStartingAddr)]),AjxException.INVALID_PARAM,"ZaServerController.prototype.validateMyNetworks");				
			}
		}		
	} 

	this.runValidationStack(params);
}
ZaXFormViewController.preSaveValidationMethods["ZaServerController"].push(ZaServerController.prototype.validateMyNetworks);

ZaServerController.prototype.validateMTA =
function (params) {
	if(!ZaItem.hasWritePermission(ZaServer.A_zimbraSmtpHostname,this._currentObject)) {
		this.runValidationStack(params);
		return;
	}
	
	var obj = this._view.getObject();
	if((AjxUtil.isEmpty(obj.attrs[ZaServer.A_zimbraSmtpHostname])) && !AjxUtil.isEmpty(this._currentObject.attrs[ZaServer.A_zimbraSmtpHostname])) {
		if(ZaApp.getInstance().dialogs["confirmMessageDialog"])
			ZaApp.getInstance().dialogs["confirmMessageDialog"].popdown();
			
		ZaApp.getInstance().dialogs["confirmMessageDialog"]  = new ZaMsgDialog(this._view.shell, null, [DwtDialog.YES_BUTTON, DwtDialog.CANCEL_BUTTON], null, ZaId.CTR_PREFIX + ZaId.VIEW_STATUS + "_confirmMessage");	
		ZaApp.getInstance().dialogs["confirmMessageDialog"].setMessage(AjxMessageFormat.format(ZaMsg.WARNING_RESETING_SMTP_HOST,[obj._defaultValues.attrs[ZaServer.A_zimbraSmtpHostname].join(", "),obj._defaultValues.attrs[ZaServer.A_zimbraSmtpHostname].join(", ")]),  DwtMessageDialog.WARNING_STYLE);
		var args;
		var callBack = ZaServerController.prototype.runValidationStack;
		if(!params || !params["func"]) {
			args = null;
		} else {
			args = params;		
		}
		ZaApp.getInstance().dialogs["confirmMessageDialog"].registerCallback(DwtDialog.YES_BUTTON, callBack, this, args);		
		ZaApp.getInstance().dialogs["confirmMessageDialog"].popup();		
	} else {
		this.runValidationStack(params);
		return;
	}
}
ZaXFormViewController.preSaveValidationMethods["ZaServerController"].push(ZaServerController.prototype.validateMTA);

ZaServerController.prototype.validateVolumeChanges = 
function (params) {
	if(!ZaItem.hasRight(ZaServer.MANAGE_VOLUME_RIGHT,this._currentObject)) {
		this.runValidationStack(params);
		return;
	}
		
	var obj = this._view.getObject();
	if(obj[ZaServer.A_RemovedVolumes] && obj[ZaServer.A_RemovedVolumes].length > 0 ) {
		if(ZaApp.getInstance().dialogs["confirmMessageDialog"])
			ZaApp.getInstance().dialogs["confirmMessageDialog"].popdown();
			
		ZaApp.getInstance().dialogs["confirmMessageDialog"] = new ZaMsgDialog(this._view.shell, null, [DwtDialog.YES_BUTTON, DwtDialog.NO_BUTTON],null, ZaId.CTR_PREFIX + ZaId.VIEW_STATUS + "_confirmMessage");	

		ZaApp.getInstance().dialogs["confirmMessageDialog"].setMessage(ZaMsg.Q_DELETE_VOLUMES,  DwtMessageDialog.WARNING_STYLE);
		var args;
		var callBack = ZaServerController.prototype.runValidationStack;
		if(!params || !params["func"]) {
			args = null;
		} else {
			args = params;		
		}
		ZaApp.getInstance().dialogs["confirmMessageDialog"].registerCallback(DwtDialog.YES_BUTTON, callBack, this, args);		
		ZaApp.getInstance().dialogs["confirmMessageDialog"].popup();		
	} else {
		this.runValidationStack(params);
		return;
	}
}
ZaXFormViewController.preSaveValidationMethods["ZaServerController"].push(ZaServerController.prototype.validateVolumeChanges);

ZaServerController.changeProxyPorts = function () {
	if(ZaApp.getInstance().dialogs["confirmMessageDialog"]) {
		var obj = ZaApp.getInstance().dialogs["confirmMessageDialog"].getObject();
		if(obj) {
			if(obj.selectedChoice == 0) {
				//change
				this._view.getObject().attrs[obj.fieldRef] = obj.defVal;
			} else if (obj.selectedChoice == 2) {
				//do not change and disable service
				this._view.getObject().attrs[ZaServer.A_zimbraMailProxyServiceEnabled] = false;
			}
		}
	}
	ZaServerController.prototype.runValidationStack.call(this);
}
ZaServerController.prototype.validateImapBindPort =
function (params) {
	if(!ZaItem.hasWritePermission(ZaServer.A_zimbraImapBindPort,this._currentObject)) {
		this.runValidationStack(params);
		return;
	}		
	var obj = this._view.getObject();
 	var tmpObj = {selectedChoice:0, choice1Label:"",choice2Label:"",choice3Label:"",warningMsg:"",fieldRef:""};

	if( (obj.attrs[ZaServer.A_zimbraMailProxyServiceEnabled] != this._currentObject.attrs[ZaServer.A_zimbraMailProxyServiceEnabled] && obj.attrs[ZaServer.A_zimbraMailProxyServiceEnabled] == true)	
	) {
		if ((obj.attrs[ZaServer.A_zimbraImapBindPort] != ZaServer.DEFAULT_IMAP_PORT_ZCS && (obj.attrs[ZaServer.A_zimbraImapBindPort] != null)) || 
			(obj.attrs[ZaServer.A_zimbraImapBindPort] == null && (obj._defaultValues.attrs[ZaServer.A_zimbraImapBindPort] != ZaServer.DEFAULT_IMAP_PORT_ZCS))
			 ) {
			tmpObj.warningMsg = AjxMessageFormat.format(ZaMsg.Server_WrongPortWarning,[ZaMsg.IMAP_Port,obj.attrs[ZaServer.A_zimbraImapBindPort]]);
			tmpObj.choice1Label = AjxMessageFormat.format(ZaMsg.Server_WrongPortWarning_OP1,[ZaMsg.IMAP_Port,ZaServer.DEFAULT_IMAP_PORT_ZCS]);
			tmpObj.choice2Label = AjxMessageFormat.format(ZaMsg.Server_WrongPortWarning_OP2,[ZaMsg.IMAP_Port,obj.attrs[ZaServer.A_zimbraImapBindPort]]);			
			tmpObj.choice3Label = ZaMsg.Server_WrongPortWarning_OP3;		
			tmpObj.fieldRef = ZaServer.A_zimbraImapBindPort;
			tmpObj.defVal = ZaServer.DEFAULT_IMAP_PORT_ZCS;
			ZaServerController.showPortWarning.call(this, params,tmpObj);
		} else {
			this.runValidationStack(params);
			return;
		}
	} else {
		this.runValidationStack(params);
		return;
	}
}
ZaXFormViewController.preSaveValidationMethods["ZaServerController"].push(ZaServerController.prototype.validateImapBindPort);

ZaServerController.prototype.validateImapSSLBindPort =
function (params) {
	var obj = this._view.getObject();
 	var tmpObj = {selectedChoice:0, choice1Label:"",choice2Label:"",choice3Label:"",warningMsg:"",fieldRef:""};

	if( (obj.attrs[ZaServer.A_zimbraMailProxyServiceEnabled] != this._currentObject.attrs[ZaServer.A_zimbraMailProxyServiceEnabled] && obj.attrs[ZaServer.A_zimbraMailProxyServiceEnabled] == true)	
	) {
		if ((obj.attrs[ZaServer.A_ImapSSLBindPort] != ZaServer.DEFAULT_IMAP_SSL_PORT_ZCS && (obj.attrs[ZaServer.A_ImapSSLBindPort] != null)) || (obj.attrs[ZaServer.A_ImapSSLBindPort] == null && (obj._defaultValues.attrs[ZaServer.A_ImapSSLBindPort] != ZaServer.DEFAULT_IMAP_SSL_PORT_ZCS))) { 
			tmpObj.defVal = ZaServer.DEFAULT_IMAP_SSL_PORT_ZCS;
			tmpObj.warningMsg = AjxMessageFormat.format(ZaMsg.Server_WrongPortWarning,[ZaMsg.IMAP_Port,obj.attrs[ZaServer.A_ImapSSLBindPort]]);
			tmpObj.choice1Label = AjxMessageFormat.format(ZaMsg.Server_WrongPortWarning_OP1,[ZaMsg.IMAP_SSLPort,ZaServer.DEFAULT_IMAP_SSL_PORT_ZCS]);
			tmpObj.choice2Label = AjxMessageFormat.format(ZaMsg.Server_WrongPortWarning_OP2,[ZaMsg.IMAP_SSLPort,obj.attrs[ZaServer.A_ImapSSLBindPort]]);			
			tmpObj.choice3Label = ZaMsg.Server_WrongPortWarning_OP3;				
			tmpObj.fieldRef = ZaServer.A_ImapSSLBindPort;
			ZaServerController.showPortWarning.call(this, params,tmpObj);
		} else {
			this.runValidationStack(params);
			return;
		}
	} else {
		this.runValidationStack(params);
		return;
	}
}
ZaXFormViewController.preSaveValidationMethods["ZaServerController"].push(ZaServerController.prototype.validateImapSSLBindPort);

ZaServerController.prototype.validatePop3BindPort =
function (params) {
	if(!ZaItem.hasWritePermission(ZaServer.A_zimbraPop3BindPort,this._currentObject)) {
		this.runValidationStack(params);
		return;
	}
	var obj = this._view.getObject();
 	var tmpObj = {selectedChoice:0, choice1Label:"",choice2Label:"",choice3Label:"",warningMsg:"",fieldRef:""};

	if( (obj.attrs[ZaServer.A_zimbraMailProxyServiceEnabled] != this._currentObject.attrs[ZaServer.A_zimbraMailProxyServiceEnabled] && obj.attrs[ZaServer.A_zimbraMailProxyServiceEnabled] == true)	
	) {
		if ((obj.attrs[ZaServer.A_zimbraPop3BindPort] != ZaServer.DEFAULT_POP3_PORT_ZCS && (obj.attrs[ZaServer.A_zimbraPop3BindPort] != null)) || (obj.attrs[ZaServer.A_zimbraPop3BindPort] == null && (obj._defaultValues.attrs[ZaServer.A_zimbraPop3BindPort] != ZaServer.DEFAULT_POP3_PORT_ZCS))) {
			tmpObj.defVal = ZaServer.DEFAULT_POP3_PORT_ZCS;
			tmpObj.warningMsg = AjxMessageFormat.format(ZaMsg.Server_WrongPortWarning,[ZaMsg.NAD_POP_Port,obj.attrs[ZaServer.A_zimbraPop3BindPort]]);
			tmpObj.choice1Label = AjxMessageFormat.format(ZaMsg.Server_WrongPortWarning_OP1,[ZaMsg.NAD_POP_Port,ZaServer.DEFAULT_POP3_PORT_ZCS]);
			tmpObj.choice2Label = AjxMessageFormat.format(ZaMsg.Server_WrongPortWarning_OP2,[ZaMsg.NAD_POP_Port,obj.attrs[ZaServer.A_zimbraPop3BindPort]]);			
			tmpObj.choice3Label = ZaMsg.Server_WrongPortWarning_OP3;	
			tmpObj.fieldRef = ZaServer.A_zimbraPop3BindPort;	
			ZaServerController.showPortWarning.call(this, params,tmpObj);
		} else {
			this.runValidationStack(params);
			return;
		}
	} else {
		this.runValidationStack(params);
		return;
	}
}
ZaXFormViewController.preSaveValidationMethods["ZaServerController"].push(ZaServerController.prototype.validatePop3BindPort);

ZaServerController.prototype.validatePop3SSLBindPort =
function (params) {
	if(!ZaItem.hasWritePermission(ZaServer.A_zimbraPop3SSLBindPort,this._currentObject)) {
		this.runValidationStack(params);
		return;
	}		
	var obj = this._view.getObject();
 	var tmpObj = {selectedChoice:0, choice1Label:"",choice2Label:"",choice3Label:"",warningMsg:"",fieldRef:""};

	if( (obj.attrs[ZaServer.A_zimbraMailProxyServiceEnabled] != this._currentObject.attrs[ZaServer.A_zimbraMailProxyServiceEnabled] && obj.attrs[ZaServer.A_zimbraMailProxyServiceEnabled] == true)	
	) {
		 if ((obj.attrs[ZaServer.A_zimbraPop3SSLBindPort] != ZaServer.DEFAULT_POP3_SSL_PORT_ZCS && (obj.attrs[ZaServer.A_zimbraPop3SSLBindPort] != null)) || (obj.attrs[ZaServer.A_zimbraPop3SSLBindPort] == null && (obj._defaultValues.attrs[ZaServer.A_zimbraPop3SSLBindPort] != ZaServer.DEFAULT_POP3_SSL_PORT_ZCS))) {
			tmpObj.defVal = ZaServer.DEFAULT_POP3_SSL_PORT_ZCS;			
			tmpObj.warningMsg = AjxMessageFormat.format(ZaMsg.Server_WrongPortWarning,[ZaMsg.NAD_POP_SSL_Port,obj.attrs[ZaServer.A_zimbraPop3SSLBindPort]]);
			tmpObj.choice1Label = AjxMessageFormat.format(ZaMsg.Server_WrongPortWarning_OP1,[ZaMsg.NAD_POP_SSL_Port,ZaServer.DEFAULT_POP3_SSL_PORT_ZCS]);
			tmpObj.choice2Label = AjxMessageFormat.format(ZaMsg.Server_WrongPortWarning_OP2,[ZaMsg.NAD_POP_SSL_Port,obj.attrs[ZaServer.A_zimbraPop3SSLBindPort]]);			
			tmpObj.choice3Label = ZaMsg.Server_WrongPortWarning_OP3;				
			tmpObj.fieldRef = ZaServer.A_zimbraPop3SSLBindPort;	
			ZaServerController.showPortWarning.call(this, params,tmpObj);
		} else {
			this.runValidationStack(params);
			return;
		}
	} else {
		this.runValidationStack(params);
		return;
	}
}
ZaXFormViewController.preSaveValidationMethods["ZaServerController"].push(ZaServerController.prototype.validatePop3SSLBindPort);

ZaServerController.prototype.validateImapProxyBindPort =
function (params) {
	if(!ZaItem.hasWritePermission(ZaServer.A_zimbraImapProxyBindPort,this._currentObject)) {
		this.runValidationStack(params);
		return;
	}
	
	var obj = this._view.getObject();
 	var tmpObj = {selectedChoice:0, choice1Label:"",choice2Label:"",choice3Label:"",warningMsg:"",fieldRef:""};

	if( (obj.attrs[ZaServer.A_zimbraMailProxyServiceEnabled] != this._currentObject.attrs[ZaServer.A_zimbraMailProxyServiceEnabled] && obj.attrs[ZaServer.A_zimbraMailProxyServiceEnabled] == true)	
	) {
		 if ((obj.attrs[ZaServer.A_zimbraImapProxyBindPort] != ZaServer.DEFAULT_IMAP_PORT && (obj.attrs[ZaServer.A_zimbraImapProxyBindPort] != null)) || (obj.attrs[ZaServer.A_zimbraImapProxyBindPort] == null && (obj._defaultValues.attrs[ZaServer.A_zimbraImapProxyBindPort] != ZaServer.DEFAULT_IMAP_PORT))) {
			tmpObj.defVal = ZaServer.DEFAULT_IMAP_PORT;						
			tmpObj.warningMsg = AjxMessageFormat.format(ZaMsg.Server_WrongPortWarning,[ZaMsg.IMAP_Proxy_Port,obj.attrs[ZaServer.A_zimbraImapProxyBindPort]]);
			tmpObj.choice1Label = AjxMessageFormat.format(ZaMsg.Server_WrongPortWarning_OP1,[ZaMsg.IMAP_Proxy_Port,ZaServer.DEFAULT_IMAP_PORT]);
			tmpObj.choice2Label = AjxMessageFormat.format(ZaMsg.Server_WrongPortWarning_OP2,[ZaMsg.IMAP_Proxy_Port,obj.attrs[ZaServer.A_zimbraImapProxyBindPort]]);			
			tmpObj.choice3Label = ZaMsg.Server_WrongPortWarning_OP3;	
			tmpObj.fieldRef = ZaServer.A_zimbraImapProxyBindPort;			
			ZaServerController.showPortWarning.call(this, params,tmpObj);
		} else {
			this.runValidationStack(params);
			return;
		}
	} else {
		this.runValidationStack(params);
		return;
	}
}
ZaXFormViewController.preSaveValidationMethods["ZaServerController"].push(ZaServerController.prototype.validateImapProxyBindPort);


ZaServerController.prototype.validateImapSSLProxyBindPort =
function (params) {
	if(!ZaItem.hasWritePermission(ZaServer.A_zimbraImapSSLProxyBindPort,this._currentObject)) {
		this.runValidationStack(params);
		return;
	}
	var obj = this._view.getObject();
 	var tmpObj = {selectedChoice:0, choice1Label:"",choice2Label:"",choice3Label:"",warningMsg:"",fieldRef:""};

	if( (obj.attrs[ZaServer.A_zimbraMailProxyServiceEnabled] != this._currentObject.attrs[ZaServer.A_zimbraMailProxyServiceEnabled] && obj.attrs[ZaServer.A_zimbraMailProxyServiceEnabled] == true)	
	) {
		if ((obj.attrs[ZaServer.A_zimbraImapSSLProxyBindPort] != ZaServer.DEFAULT_IMAP_SSL_PORT && (obj.attrs[ZaServer.A_zimbraImapSSLProxyBindPort] != null)) || (obj.attrs[ZaServer.A_zimbraImapSSLProxyBindPort] == null && (obj._defaultValues.attrs[ZaServer.A_zimbraImapSSLProxyBindPort] != ZaServer.DEFAULT_IMAP_SSL_PORT))) {
			tmpObj.defVal = ZaServer.DEFAULT_IMAP_SSL_PORT;									
			tmpObj.warningMsg = AjxMessageFormat.format(ZaMsg.Server_WrongPortWarning,[ZaMsg.IMAP_SSL_Proxy_Port,obj.attrs[ZaServer.A_zimbraImapSSLProxyBindPort]]);
			tmpObj.choice1Label = AjxMessageFormat.format(ZaMsg.Server_WrongPortWarning_OP1,[ZaMsg.IMAP_SSL_Proxy_Port,ZaServer.DEFAULT_IMAP_SSL_PORT]);
			tmpObj.choice2Label = AjxMessageFormat.format(ZaMsg.Server_WrongPortWarning_OP2,[ZaMsg.IMAP_SSL_Proxy_Port,obj.attrs[ZaServer.A_zimbraImapSSLProxyBindPort]]);			
			tmpObj.choice3Label = ZaMsg.Server_WrongPortWarning_OP3;				
			tmpObj.fieldRef = ZaServer.A_zimbraImapSSLProxyBindPort;		
			ZaServerController.showPortWarning.call(this, params,tmpObj);	
		} else {
			this.runValidationStack(params);
			return;
		}
	} else {
		this.runValidationStack(params);
		return;
	}
}
ZaXFormViewController.preSaveValidationMethods["ZaServerController"].push(ZaServerController.prototype.validateImapSSLProxyBindPort);


ZaServerController.prototype.validatePop3ProxyBindPort =
function (params) {
	if(!ZaItem.hasWritePermission(ZaServer.A_zimbraPop3ProxyBindPort,this._currentObject)) {
		this.runValidationStack(params);
		return;
	}
	
	var obj = this._view.getObject();
 	var tmpObj = {selectedChoice:0, choice1Label:"",choice2Label:"",choice3Label:"",warningMsg:"",fieldRef:""};

	if( (obj.attrs[ZaServer.A_zimbraMailProxyServiceEnabled] != this._currentObject.attrs[ZaServer.A_zimbraMailProxyServiceEnabled] && obj.attrs[ZaServer.A_zimbraMailProxyServiceEnabled] == true)	
	) {
		if ((obj.attrs[ZaServer.A_zimbraPop3ProxyBindPort] != ZaServer.DEFAULT_POP3_PORT && (obj.attrs[ZaServer.A_zimbraPop3ProxyBindPort] != null)) || (obj.attrs[ZaServer.A_zimbraPop3ProxyBindPort] == null && (obj._defaultValues.attrs[ZaServer.A_zimbraPop3ProxyBindPort] != ZaServer.DEFAULT_POP3_PORT))) {
			tmpObj.defVal = ZaServer.DEFAULT_POP3_PORT;												
			tmpObj.warningMsg = AjxMessageFormat.format(ZaMsg.Server_WrongPortWarning,[ZaMsg.NAD_POP_proxy_Port,obj.attrs[ZaServer.A_zimbraPop3ProxyBindPort]]);
			tmpObj.choice1Label = AjxMessageFormat.format(ZaMsg.Server_WrongPortWarning_OP1,[ZaMsg.NAD_POP_proxy_Port,ZaServer.DEFAULT_POP3_PORT]);
			tmpObj.choice2Label = AjxMessageFormat.format(ZaMsg.Server_WrongPortWarning_OP2,[ZaMsg.NAD_POP_proxy_Port,obj.attrs[ZaServer.A_zimbraPop3ProxyBindPort]]);			
			tmpObj.choice3Label = ZaMsg.Server_WrongPortWarning_OP3;				
			tmpObj.fieldRef = ZaServer.A_zimbraPop3ProxyBindPort;		
			ZaServerController.showPortWarning.call(this, params,tmpObj);
		} else {
			this.runValidationStack(params);
			return;
		}
	} else {
		this.runValidationStack(params);
		return;
	}
}
ZaXFormViewController.preSaveValidationMethods["ZaServerController"].push(ZaServerController.prototype.validatePop3ProxyBindPort);

ZaServerController.prototype.validatePop3SSLProxyBindPort =
function (params) {
	if(!ZaItem.hasWritePermission(ZaServer.A_zimbraPop3SSLProxyBindPort,this._currentObject)) {
		this.runValidationStack(params);
		return;
	}
	
	var obj = this._view.getObject();
 	var tmpObj = {selectedChoice:0, choice1Label:"",choice2Label:"",choice3Label:"",warningMsg:"",fieldRef:""};

	if( (obj.attrs[ZaServer.A_zimbraMailProxyServiceEnabled] != this._currentObject.attrs[ZaServer.A_zimbraMailProxyServiceEnabled] && obj.attrs[ZaServer.A_zimbraMailProxyServiceEnabled] == true)	
	) {
		if ((obj.attrs[ZaServer.A_zimbraPop3SSLProxyBindPort] != ZaServer.DEFAULT_POP3_SSL_PORT && (obj.attrs[ZaServer.A_zimbraPop3SSLProxyBindPort] != null)) || (obj.attrs[ZaServer.A_zimbraPop3SSLProxyBindPort] == null && (obj._defaultValues.attrs[ZaServer.A_zimbraPop3SSLProxyBindPort] != ZaServer.DEFAULT_POP3_SSL_PORT))) {
			tmpObj.defVal = ZaServer.DEFAULT_POP3_SSL_PORT;															
			tmpObj.warningMsg = AjxMessageFormat.format(ZaMsg.Server_WrongPortWarning,[ZaMsg.NAD_POP_SSL_proxy_Port,obj.attrs[ZaServer.A_zimbraPop3SSLProxyBindPort]]);
			tmpObj.choice1Label = AjxMessageFormat.format(ZaMsg.Server_WrongPortWarning_OP1,[ZaMsg.NAD_POP_SSL_proxy_Port,ZaServer.DEFAULT_POP3_SSL_PORT]);
			tmpObj.choice2Label = AjxMessageFormat.format(ZaMsg.Server_WrongPortWarning_OP2,[ZaMsg.NAD_POP_SSL_proxy_Port,obj.attrs[ZaServer.A_zimbraPop3SSLProxyBindPort]]);			
			tmpObj.choice3Label = ZaMsg.Server_WrongPortWarning_OP3;	
			tmpObj.fieldRef = ZaServer.A_zimbraPop3SSLProxyBindPort;			
			ZaServerController.showPortWarning.call(this, params,tmpObj);
		} else {
			this.runValidationStack(params);
			return;
		}
	} else {
		this.runValidationStack(params);
		return;
	}
}
ZaXFormViewController.preSaveValidationMethods["ZaServerController"].push(ZaServerController.prototype.validatePop3SSLProxyBindPort);


ZaServerController.showPortWarning = function (params, instanceObj) {
	if(ZaApp.getInstance().dialogs["confirmMessageDialog"])
		ZaApp.getInstance().dialogs["confirmMessageDialog"].popdown();
		
	ZaApp.getInstance().dialogs["confirmMessageDialog"] = new ZaProxyPortWarningXDialog(ZaApp.getInstance().getAppCtxt().getShell(), "550px", "150px",ZaMsg.Server_WrongPortWarningTitle);	
	ZaApp.getInstance().dialogs["confirmMessageDialog"].setObject(instanceObj);
	ZaApp.getInstance().dialogs["confirmMessageDialog"].registerCallback(DwtDialog.OK_BUTTON, ZaServerController.changeProxyPorts, this, null);
	var args;
	if(!params || !params["func"]) {
		args = null;
	} else {
		args = params;		
	}
	ZaApp.getInstance().dialogs["confirmMessageDialog"].popup();		
}
/**
* handles "save" button click
* calls modify on the current ZaServer
**/
ZaServerController.prototype.saveButtonListener =
function(ev) {
	try {
		this.validateChanges();
		
	} catch (ex) {
		//if exception thrown - don' go away
		this._handleException(ex, "ZaServerController.prototype.saveButtonListener", null, false);
	}
}
/**
* handles "download" button click. Launches file download in a new window
**/
ZaServerController.prototype.downloadConfigButtonListener = 
function(ev) {
	window.open(["/service/collectconfig/?host=",this._currentObject.attrs[ZaServer.A_ServiceHostname]].join(""));
}

ZaServerController.prototype.flushCacheButtonListener = 
function(ev) {
	try {
		if(!ZaApp.getInstance().dialogs["flushCacheDialog"]) {
			ZaApp.getInstance().dialogs["flushCacheDialog"] = new ZaFlushCacheXDialog(this._container);
		}
		srvList = [];
		srvList._version = 1;
		var srv = this._currentObject;
		srv["status"] = 0;
		srvList.push(srv);
	
		obj = {statusMessage:null,flushZimlet:true,flushSkin:true,flushLocale:true,serverList:srvList,status:0};
		ZaApp.getInstance().dialogs["flushCacheDialog"].setObject(obj);
		ZaApp.getInstance().dialogs["flushCacheDialog"].popup();
	} catch (ex) {
		this._handleException(ex, "ZaServerController.prototype.flushCacheButtonListener", null, false);
	}
	return;
}

