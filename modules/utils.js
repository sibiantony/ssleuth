"use strict"; 

var EXPORTED_SYMBOLS = ["isCertValid"]; 

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

function isCertValid(cert) {
	var usecs = new Date().getTime(); 
	var valid = false;
	if (usecs > cert.validity.notBefore/1000 && usecs < cert.validity.notAfter/1000) {
		valid = true; 
	} 
	return valid; 
}
