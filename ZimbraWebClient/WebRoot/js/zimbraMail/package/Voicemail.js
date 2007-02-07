/*
 * Package: Voicemail
 * 
 * Supports: The Voicemail application
 * 
 * Loaded:
 * 	- When the user goes to the Voicemail application
 * 	- If a search for voicemails returns results
 */

AjxPackage.require("ajax.util.AjxPluginDetector");
AjxPackage.require("ajax.dwt.widgets.DwtSoundPlayer");

AjxPackage.require("zimbraMail.voicemail.model.ZmVoicemail");
AjxPackage.require("zimbraMail.voicemail.model.ZmVoicemailList");

AjxPackage.require("zimbraMail.voicemail.view.ZmVoicemailView");

AjxPackage.require("zimbraMail.voicemail.controller.ZmVoicemailController");

