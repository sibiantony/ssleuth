// "use strict"; 

var EXPORTED_SYMBOLS = ["isCertValid", "cloneArray"]; 

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

function isCertValid(cert) {
	var usecs = new Date().getTime(); 
	var valid = false;
	if (usecs > cert.validity.notBefore/1000 && 
			usecs < cert.validity.notAfter/1000) {
		valid = true; 
	} 
	return valid; 
}

function cloneArray(obj) {
	if (Object.prototype.toString.call(obj) === '[object Array]') {
		var out = [], i = 0, len = obj.length;
		for ( ; i < len; i++ ) {
			out[i] = arguments.callee(obj[i]);
		}
		return out;
	}
	if (typeof obj === 'object') {
		var out = {}, i;
		for ( i in obj ) {
			out[i] = arguments.callee(obj[i]);
		}
		return out;
	}
	return obj;
}
