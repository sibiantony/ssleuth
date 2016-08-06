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
var observer = {
    // TODO convert obs from array to object
    responseCache: [],
    prefs: null,
    utilCb: null,

    init: function (cb) {
        try {
            this.utilCb = cb;

            // TODO : Observer for cached content ?
            Services.obs.addObserver(observer, 'http-on-examine-response', false);
            Services.obs.addObserver(observer, 'http-on-examine-cached-response', false);
            // TODO : merged response necessary ? Never seen ff using it.
            Services.obs.addObserver(observer, 'http-on-examine-merged-response', false);

        } catch (e) {
            log.error('error observer : ' + e.message);
        }

    },

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

    uninit: function () {

        try {
            Services.obs.removeObserver(observer,
                'http-on-examine-response', false);
            Services.obs.removeObserver(observer,
                'http-on-examine-cached-response', false);
            Services.obs.removeObserver(observer,
                'http-on-examine-merged-response', false);
        } catch (e) {
            log.error('Error removing http observer' + e.message);
        }

        this.responseCache = [];
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

    },

    newLoc: function (url, tabId) {
        this.responseCache[tabId] = {
            url: url,
            reqs: {}
        };
        return this.responseCache[tabId];
    },

    updateLoc: function (request) {
        updateResponseCache(request);
    },

    updateLocEntry: function (tabId, attrs) {
        if (!this.responseCache[tabId]) {
            return;
        }

        for (var [atr, val] in Iterator(attrs)) {
            this.responseCache[tabId][atr] = val;
        }
        // mainly for the connection rating
        updateHostEntries(tabId);
    },

    deleteLoc: function (tabId) {
        delete observer.responseCache[tabId];
    },
};

function updateResponseCache(channel) {
    try {
        const obs = observer;
        var url = channel.URI.asciiSpec;
        var hostId = channel.URI.scheme + ':' + channel.URI.hostPort;

        var tab = channel.loadInfo.parentOuterWindowID.toString();
        // ignore tab = 0 
        // TODO convert obs from array to object
        if (tab === '0') return;

        // log.debug('url : ' + utils.cropText(url) + ' content : ' + channel.contentType + ' host ID : ' + hostId);

        if (!obs.responseCache[tab]) {
            // Use a string index - helps with deletion without problems.
            observer.newLoc(url, tab);
        }

        var hostEntry = obs.responseCache[tab].reqs[hostId];

        if (!hostEntry) {

            hostEntry = obs.responseCache[tab].reqs[hostId] = {
                count: 0,
                ctype: {},
            }

            if (channel.securityInfo) {
                var sslStatus = channel.securityInfo
                    .QueryInterface(Ci.nsISSLStatusProvider)
                    .SSLStatus.QueryInterface(Ci.nsISSLStatus);
                if (sslStatus) {
                    hostEntry.cipherName = sslStatus.cipherName;
                    hostEntry.certValid = obs.utilCb.isCertValid(sslStatus.serverCert);
                    hostEntry.domMatch = !sslStatus.isDomainMismatch;
                    hostEntry.csRating = obs.utilCb.getCipherSuiteRating(
                        hostEntry.cipherName);
                    hostEntry.pfs = obs.utilCb.checkPFS(hostEntry.cipherName);
                    hostEntry.pubKeyAlg = obs.utilCb.getCertificateAlg(
                        hostEntry.cipherName);
                    hostEntry.signature = obs.utilCb.getSignatureAlg(sslStatus.serverCert);
                    hostEntry.pubKeySize = obs.utilCb.getKeySize(sslStatus.serverCert,
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
            (hostEntry.cxRating == -1)) {
            setHostCxRating(tab, hostId);
            // TODO : do update notif for every response ?
            //        Need to see perf impact
            obs.utilCb.domainsUpdated(tab);
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
}

function setHostCxRating(tab, hostId) {
    let obs = observer;
    var evCert = obs.responseCache[tab]['evCert'];
    var ffStatus = obs.responseCache[tab]['ffStatus'];
    let hostEntry = obs.responseCache[tab].reqs[hostId];

    if (ffStatus != null) {
        hostEntry.cxRating = obs.utilCb.getConnectionRating(
            hostEntry.csRating,
            hostEntry.pfs,
            ffStatus, (hostEntry.domMatch && hostEntry.certValid),
            evCert,
            hostEntry.signature.rating);
    }
}

function updateHostEntries(tab) {

    let reqs = observer.responseCache[tab].reqs;

    for (var [domain, hostEntry] in Iterator(reqs)) {
        if ((domain.indexOf('https:') != -1) &&
            (hostEntry.cxRating == -1)) {
            setHostCxRating(tab, domain);
        }
    }

    observer.utilCb.domainsUpdated(tab);
}