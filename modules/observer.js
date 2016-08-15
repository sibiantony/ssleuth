'use strict';

var EXPORTED_SYMBOLS = ['observer'];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://ssleuth/utils.js');

/**
 * HTTP observer for the Domains tab.  
 */
var observer = (function () {
    var responseCache = {},
        utilCb = null;

    var init = function (cb) {
        utilCb = cb;

        Services.obs.addObserver(responseObserver, 'http-on-examine-response', false);
        Services.obs.addObserver(responseObserver, 'http-on-examine-cached-response', false);
        // TODO : merged response necessary ? Never seen ff using it.
        Services.obs.addObserver(responseObserver, 'http-on-examine-merged-response', false);
    };

    var uninit = function () {
        Services.obs.removeObserver(responseObserver, 'http-on-examine-response', false);
        Services.obs.removeObserver(responseObserver, 'http-on-examine-cached-response', false);
        Services.obs.removeObserver(responseObserver, 'http-on-examine-merged-response', false);

        responseCache = null;
    };

    var responseObserver = {
        observe: function (subject, topic, data) {
            if ((topic !== 'http-on-examine-response') &&
                (topic !== 'http-on-examine-cached-response') &&
                (topic !== 'http-on-examine-merged-response'))
                return;
            if (!(subject instanceof Ci.nsIHttpChannel)) return;

            try {
                var channel = subject.QueryInterface(Ci.nsIHttpChannel);
                utilCb.onExamineResponse(channel);
            } catch (e) {
                log.error('Error http response: ' + e.message);
            }
        },
    };

    var newLoc = function (url, tabId) {
        responseCache[tabId] = {
            url: url,
            reqs: {}
        };
        return responseCache[tabId];
    };

    var updateLocEntry = function (tabId, attrs) {
        if (!responseCache[tabId]) {
            return;
        }

        for (var [atr, val] in Iterator(attrs)) {
            responseCache[tabId][atr] = val;
        }
        // mainly for the connection rating
        utilCb.updateHostEntries(tabId);
    };

    var deleteLoc = function (tabId) {
        delete responseCache[tabId];
    };

    var printCache = function () {
        log.debug('Responsecache : ' + JSON.stringify(observer.responseCache, null, 2) + '\n\n');
    };

    return {
        init: init,
        uninit: uninit,
        newLoc: newLoc,
        updateLocEntry: updateLocEntry,
        deleteLoc: deleteLoc,
        printCache: printCache,
        get responseCache() {
            return responseCache;
        }
    };

}());