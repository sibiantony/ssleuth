/*jslint plusplus: true*/
// 'use strict'; 

var EXPORTED_SYMBOLS = ['utils', 'log']
Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://gre/modules/Log.jsm');

var utils = (function () {
    var cloneArray = function (obj) {
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
    };

    var cropText = function (str) {
        var len = 30;
        if (str.length <= len) return str;

        var sep = '...';

        var chars = len - sep.length,
            prefix = Math.ceil(chars / 2),
            suffix = Math.floor(chars / 2);

        return str.substr(0, prefix) +
            sep +
            str.substr(str.length - suffix);
    };

    var initLocale = function () {
        Services.strings.flushBundles();
    };

    var getText = function (name) {
        try {
            // TODO : flush bundle, and create new bundle
            var bundle = Services.strings
                .createBundle('chrome://ssleuth/locale/panel.properties');
            return bundle.GetStringFromName(name);
        } catch (e) {
            return name;
        }
    };

    var getPlatform = function () {
        return Components.classes['@mozilla.org/xre/app-info;1']
            .getService(Components.interfaces.nsIXULRuntime).OS;
    };

    return {
        cloneArray: cloneArray,
        cropText: cropText,
        initLocale: initLocale,
        getText: getText,
        getPlatform: getPlatform
    };

}());

var log = (function () {
    var logger = Log.repository.getLogger('[SSleuth] '),
        appender = new Log.ConsoleAppender(new Log.BasicFormatter());
    logger.level = Log.Level.Debug;
    logger.addAppender(appender);

    return {
        debug: function (x) {
            logger.debug(x);
        },
        error: function (x) {
            logger.error(x);
        },
        // If not removed, will get added to previous appender
        // upon upgrade/enable. 
        unload: function () {
            logger.removeAppender(appender);
        }
    };
}());
