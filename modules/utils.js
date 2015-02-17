/*jslint plusplus: true*/
// "use strict"; 

var EXPORTED_SYMBOLS = ["utils"]
Components.utils.import("resource://gre/modules/Services.jsm");

var utils = { 
  cloneArray : function(obj) {
    if (Object.prototype.toString.call(obj) === '[object Array]') {
      var out = [],
        i = 0,
        len = obj.length;
      for (i; i < len; i++) {
        out[i] = arguments.callee(obj[i]);
      }
      return out;
    }
    if (typeof obj === 'object') {
      var out = {},
        i;
      for (i in obj) {
        out[i] = arguments.callee(obj[i]);
      }
      return out;
    }
    return obj;
  }, 

  cropText : function(str) {
    var len = 30;
    if (str.length <= len) return str;

    var sep = '...'; 

    var chars = len - sep.length,
        prefix = Math.ceil(chars/2),
        suffix = Math.floor(chars/2);

    return str.substr(0, prefix) + 
           sep + 
           str.substr(str.length - suffix);
  }, 

  initLocale : function() {
    Services.strings.flushBundles();
  },

  getText : function(name) {
    try {
      // TODO : flush bundle, and create new bundle
      var bundle = Services.strings
                    .createBundle("chrome://ssleuth/locale/panel.properties"); 
      return bundle.GetStringFromName(name); 
    } catch(e) {
      return name; 
    }
  }, 

  getPlatform : function() {
    return Components.classes["@mozilla.org/xre/app-info;1"]  
             .getService(Components.interfaces.nsIXULRuntime).OS;  
  },

}; 
