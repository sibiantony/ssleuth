/*jslint plusplus: true*/
// "use strict"; 

var EXPORTED_SYMBOLS = ["ssleuthCloneArray", "cropText"];

function ssleuthCloneArray(obj) {
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
}

function cropText(str) {
  var len = 35;
  if (str.length <= len) return str;

  var sep = '...'; 

  var sepLen = sep.length,
      chars = len - sepLen,
      prefix = Math.ceil(chars/2),
      suffix = Math.floor(chars/2);

  return str.substr(0, prefix) + 
         sep + 
         str.substr(str.length - suffix);
};
