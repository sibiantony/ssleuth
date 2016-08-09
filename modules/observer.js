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
                updateResponseCache(channel);
            } catch (e) {
                log.error('Error http response: ' + e.message);
            }

        },

        response: function (subject, topic, data) {
            if ((topic !== 'http-on-examine-response') &&
                (topic !== 'http-on-examine-cached-response') &&
                (topic !== 'http-on-examine-merged-response'))
                return;
            if (!(subject instanceof Ci.nsIHttpChannel)) return;

            try {
                var channel = subject.QueryInterface(Ci.nsIHttpChannel);
                updateResponseCache(channel);
            } catch (e) {
                log.error('Error http response: ' + e.message);
            }
        }
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
        updateHostEntries(tabId);
    };

    var deleteLoc = function (tabId) {
        delete responseCache[tabId];
    };

    var updateResponseCache = function (channel) {
        try {
            var url = channel.URI.asciiSpec,
                hostId = channel.URI.scheme + ':' + channel.URI.hostPort,
                tab = channel.loadInfo.parentOuterWindowID.toString();

            // ignore tab = 0
            if (tab === '0') return;

            // log.debug('url : ' + utils.cropText(url) + ' content : ' + channel.contentType + ' host ID : ' + hostId);

            if (!responseCache[tab]) {
                // Use a string index - helps with deletion without problems.
                newLoc(url, tab);
            }

            var hostEntry = responseCache[tab].reqs[hostId];

            if (!hostEntry) {

                hostEntry = responseCache[tab].reqs[hostId] = {
                    count: 0,
                    ctype: {},
                }

                if (channel.securityInfo) {
                    var sslStatus = channel.securityInfo
                        .QueryInterface(Ci.nsISSLStatusProvider)
                        .SSLStatus.QueryInterface(Ci.nsISSLStatus);
                    if (sslStatus) {
                        hostEntry.cipherName = sslStatus.cipherName;
                        hostEntry.certValid = utilCb.isCertValid(sslStatus.serverCert);
                        hostEntry.domMatch = !sslStatus.isDomainMismatch;
                        hostEntry.csRating = utilCb.getCipherSuiteRating(
                            hostEntry.cipherName);
                        hostEntry.pfs = utilCb.checkPFS(hostEntry.cipherName);
                        hostEntry.pubKeyAlg = utilCb.getCertificateAlg(
                            hostEntry.cipherName);
                        hostEntry.signature = utilCb.getSignatureAlg(sslStatus.serverCert);
                        hostEntry.pubKeySize = utilCb.getKeySize(sslStatus.serverCert,
                            hostEntry.pubKeyAlg);
                        // The evCert and ff status are not available per channel.
                        // Wait for it to be filled in after the main channel request.
                        hostEntry.cxRating = -1;
                    }
                }
            }

            // If the ff status/ev cert for main channel had already been filled,
            // then set the connection rating
            if ((channel.originalURI.schemeIs('https')) &&
                (hostEntry.cxRating === -1)) {
                setHostCxRating(tab, hostId);
                // TODO : do update notif for every response ?
                //        Need to see perf impact
                utilCb.domainsUpdated(tab);
            }

            hostEntry.count++;

            // Check content type - only save the top-level type for now.
            // application, text, image, video etc.
            var cType = channel.contentType.split('/')[0];
            if (!(cType in hostEntry.ctype)) {
                hostEntry.ctype[cType] = 0;
            }
            hostEntry.ctype[cType]++;

        } catch (e) {
            // TODO : Handle special cases. url links (no hostPort),
            //          sslStatus.cipherName unavailable etc.
            log.error('Error updateResponseCache : ' + e.message);
        }
    };

    var setHostCxRating = function (tab, hostId) {
        var evCert = responseCache[tab]['evCert'];
        var ffStatus = responseCache[tab]['ffStatus'];
        let hostEntry = responseCache[tab].reqs[hostId];

        if (ffStatus != null) {
            hostEntry.cxRating = utilCb.getConnectionRating(
                hostEntry.csRating,
                hostEntry.pfs,
                ffStatus, (hostEntry.domMatch && hostEntry.certValid),
                evCert,
                hostEntry.signature.rating);
        }
    };

    var updateHostEntries = function (tab) {

        var reqs = responseCache[tab].reqs;

        for (var [domain, hostEntry] in Iterator(reqs)) {
            if ((domain.indexOf('https:') !== -1) && (hostEntry.cxRating === -1)) {
                setHostCxRating(tab, domain);
            }
        }

        utilCb.domainsUpdated(tab);
    };

    return {
        init: init,
        uninit: uninit,
        newLoc: newLoc,
        updateLocEntry: updateLocEntry,
        deleteLoc: deleteLoc,
        get responseCache() {
            return responseCache;
        }
    };

}());
