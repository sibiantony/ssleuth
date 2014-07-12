"use strict";

var EXPORTED_SYMBOLS = ["SSleuthHttpObserver"];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

var SSleuthHttpObserver = {
  responseCache : [],
  maxTabId: 0, 
  minTabId: 0, 
  prefs: null, 
  utilCb: null, 
  enabled: false, 

  init: function(cb, enable) {
    try {
      this.utilCb = cb; 
      this.enabled = enable; 

      if (!enable) return; 

      // TODO : Observer for cached content ?
      Services.obs.addObserver({observe: SSleuthHttpObserver.response},
        'http-on-examine-response', false); 
      Services.obs.addObserver({observe: SSleuthHttpObserver.response},
        'http-on-examine-cached-response', false); 
      // TODO : merged response necessary ? Never seen ff using it.
      Services.obs.addObserver({observe: SSleuthHttpObserver.response},
        'http-on-examine-merged-response', false); 

    } catch (e) {
      dump("error observer : " + e.message + "\n");
    }

  },
  
  initWindow: function(window) {
    if (!SSleuthHttpObserver.enabled) return; 

    window.gBrowser.tabContainer
                .addEventListener('TabClose', tabClosed, false);
  },

  uninit: function() {
    if (!this.enabled) return; 

    // TODO : Hits NS_ERROR_FAILURE upon removing the observer.
    // https://bugzilla.mozilla.org/show_bug.cgi?id=663769
    try {
      Services.obs.removeObserver({observe: SSleuthHttpObserver.response}, 
        'http-on-examine-response', false);
      Services.obs.removeObserver({observe: SSleuthHttpObserver.response}, 
        'http-on-examine-cached-response', false);
      Services.obs.removeObserver({observe: SSleuthHttpObserver.response}, 
        'http-on-examine-merged-response', false);
    } catch (e) {
      dump('Error removing http observer' + e.message + '\n'); 
    }

    // this.responseCache = []; 
    this.maxTabId = this.minTabId = 0; 
    this.enabled = false; 
  },

  uninitWindow: function(window) {
    if (!SSleuthHttpObserver.enabled) return; 

    window.gBrowser.tabContainer
              .removeEventListener('TabClose', tabClosed);
    for (var browser of window.gBrowser.browsers) {
      if (browser._ssleuthTabId) {
        SSleuthHttpObserver.deleteLoc(browser._ssleuthTabId);
        freeTabId(browser._ssleuthTabId);
        delete(browser['_ssleuthTabId']); 
      }
    } 

  }, 

  response: function(subject, topic, data) {
    if ((topic !== 'http-on-examine-response' ) && 
        (topic !== 'http-on-examine-cached-response') &&
        (topic !== 'http-on-examine-merged-response')) 
      return; 
    if (!(subject instanceof Components.interfaces.nsIHttpChannel)) return; 
    if (!SSleuthHttpObserver.enabled) return; 

    try {
      var channel = subject.QueryInterface(Ci.nsIHttpChannel); 
      updateResponseCache(channel);
    } catch(e) {
      dump("Error http response: " + e.message ); 
    }

  },

  newLoc: function(url, tabId) {
    this.responseCache[tabId] = { 
        url : url, 
        reqs: {} 
    }; 
    return this.responseCache[tabId];
  },

  updateLoc: function(request) {
    updateResponseCache(request);
  },

  updateLocEntry: function(tabId, attrs) {
    if (!this.responseCache[tabId])
      return; 

    for (var [atr, val] in Iterator(attrs)) {
        this.responseCache[tabId][atr] = val;
    }
    // mainly for the connection rating
    updateHostEntries(tabId); 
  },

  deleteLoc: function(tabId) {
    delete SSleuthHttpObserver.responseCache[tabId];
  },

  getTab: function(request) {
    return getTabForReq(request); 
  },

};

function tabClosed(e) {
  var browser = _window().gBrowser.getBrowserForTab(e.target);
  if (browser._ssleuthTabId) {
    SSleuthHttpObserver.deleteLoc(browser._ssleuthTabId);
    freeTabId(browser._ssleuthTabId);
    delete(browser['_ssleuthTabId']); 
  }
}

// These are to make sure that freed up indexes
//  are re-used. At the end, there will always be
//  null spots equal to max. opened tabs.
function freeTabId(id) {
  if (id < SSleuthHttpObserver.minTabId) 
    SSleuthHttpObserver.minTabId = id; 
}

function getTabId() {
  const obs = SSleuthHttpObserver; 
  var id = obs.minTabId; 

  while ((obs.responseCache[id] != null) && (obs.minTabId < obs.maxTabId)) {
      // This spot is occupied. Find the next free one.
      id = ++obs.minTabId;
  }

  if (obs.minTabId == obs.maxTabId) 
    obs.minTabId = ++obs.maxTabId;

  return id; 
}

function updateResponseCache(channel) {
  try {
    const obs = SSleuthHttpObserver; 
    var url = channel.URI.asciiSpec;
    var hostId = channel.URI.scheme + ":" + channel.URI.hostPort;

    // dump("url : " + url + " content : " + channel.contentType
    //   + " host ID : " + hostId + "\n"); 

    var browser = getTabForReq(channel); 

    if (!browser) {
      // dump("Critical: No browser! \n");
      return;
    }

    // 3. Did the tab location url change ?
    //
    
    if (!("_ssleuthTabId" in browser)) {
      // dump("No tab id present \n"); 
      // Use a string index - helps with deletion without problems.
      var tabId = browser._ssleuthTabId = getTabId().toString();

      SSleuthHttpObserver.newLoc(url, tabId); 

    } else {
      // dump("Found tab id " + browser._ssleuthTabId + " URI : "  
      //    + browser.contentWindow.location.toString() + "\n");
    }

    var tab = browser._ssleuthTabId; 
    var hostEntry = obs.responseCache[tab].reqs[hostId];

    if (!hostEntry) {
      hostEntry = obs.responseCache[tab].reqs[hostId] = {
        count : 0, 
        ctype : {}, 
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
          hostEntry.pubKeyAlg = obs.utilCb.getAuthenticationAlg(
                                    hostEntry.cipherName); 
          hostEntry.signature = obs.utilCb.getSignatureAlg(sslStatus.serverCert); 
          hostEntry.pubKeySize = obs.utilCb.getKeySize(sslStatus.serverCert, 
                                    hostEntry.pubKeyAlg ); 
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
      obs.utilCb.domainsUpdated(); 
    }

    hostEntry.count++;

    // Check content type - only save the top-level type for now. 
    // application, text, image, video etc.
    var cType = channel.contentType.split('/')[0]; 
    if (!(cType in hostEntry.ctype)) {
      hostEntry.ctype[cType] = 0;
    }
    hostEntry.ctype[cType]++;
  } catch(e) {
    dump("Error updateResponseCache : " + e.message + "\n");
  }
}

function setHostCxRating(tab, hostId) {
  let obs = SSleuthHttpObserver; 
  var evCert = obs.responseCache[tab]['evCert']; 
  var ffStatus = obs.responseCache[tab]['ffStatus']; 
  let hostEntry = obs.responseCache[tab].reqs[hostId]; 

  if (ffStatus != null)  {
    hostEntry.cxRating = obs.utilCb.getConnectionRating (
                          hostEntry.csRating, 
                          hostEntry.pfs, 
                          ffStatus, 
                          (hostEntry.domMatch && hostEntry.certValid), 
                          evCert, 
                          hostEntry.signature.rating); 
  }
}

function updateHostEntries(tab) {

  let reqs = SSleuthHttpObserver.responseCache[tab].reqs;

  for (var [domain, hostEntry] in Iterator(reqs)) {
    if ((domain.indexOf('https:') != -1) &&
         ( hostEntry.cxRating == -1)) {
      setHostCxRating(tab, domain); 
    }
  }

  SSleuthHttpObserver.utilCb.domainsUpdated(); 

}

function getTabForReq(req) {
  var cWin = null; 
  if (!(req instanceof Ci.nsIRequest)) return null; 

  try {
    var notifCB = req.notificationCallbacks ? 
                    req.notificationCallbacks : 
                    req.loadGroup.notificationCallbacks;
    if (!notifCB) return null;

    cWin = notifCB.getInterface(Ci.nsILoadContext).associatedWindow;
    return (cWin ? 
            _window().gBrowser.getBrowserForDocument(cWin.top.document) : null); 
  } catch (e) {
    // TODO : At least 2 different types of errors to handle here:
    // 1. A REST Ajax request
    // Possibly also due to an incomplete response - downloading big files.
    // Error : getTabforReq : Component returned failure code: 
    //    0x80004002 (NS_NOINTERFACE) [nsIInterfaceRequestor.getInterface]
    // Requires a stream listener ? 
    //
    // 2. A firefox repeated pull
    // Error : getTabforReq : Component does not have requested interface
    //    'Component does not have requested interface' 
    //    when calling method: [nsIInterfaceRequestor::getInterface]
    // dump("Error : getTabforReq : " + e.message + "\n");
    return null;
  }

}

function _window() {
  return Services.wm.getMostRecentWindow("navigator:browser");
}

