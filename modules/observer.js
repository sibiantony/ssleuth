"use strict";

var EXPORTED_SYMBOLS = ["SSleuthHttpObserver"];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

var SSleuthHttpObserver = {
  responseCache : [],
  maxTabId: null, 
  prefs: null, 
  utilCb: null, 

  init: function(cb) {
    try {
      this.utilCb = cb; 
      // TODO : Observer for cached content ?
      Services.obs.addObserver({observe: SSleuthHttpObserver.response},
        'http-on-examine-response', false); 

    } catch (e) {
      dump("error observer : " + e.message + "\n");
    }

  },
  
  initWindow: function(window) {
    window.gBrowser.tabContainer
                .addEventListener('TabClose', tabClosed, false);
  },

  uninit: function() {
    Services.obs.removeObserver({observe: SSleuthHttpObserver.response}, 
      'http-on-examine-response', false);
  },

  uninitWindow: function(window) {
    dump ("Uninit window http observer\n");
    window.gBrowser.tabContainer
              .removeEventListener('TabClose', tabClosed);
    for (var browser of window.gBrowser.browsers) {
      if (browser._ssleuthTabId) {
        this.deleteLoc(browser._ssleuthTabId);
      }
    } 

  }, 

  response: function(subject, topic, data) {
    if (topic !== 'http-on-examine-response') return; 
    if (!(subject instanceof Components.interfaces.nsIHttpChannel)) return; 

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
        // ffStatus : "", 
        // evCert : false, 
        reqs: {} 
    }; 
    return this.responseCache[tabId];
  },

  updateLoc: function(request) {
    updateResponseCache(request);
  },

  updateLocEntry: function(tabId, attrs) {
    for (var [atr, val] in Iterator(attrs)) {
        this.responseCache[tabId][atr] = val;
    }
  },

  deleteLoc: function(tabId) {
    delete SSleuthHttpObserver.responseCache[tabId];
  },

  getTab: function(request) {
    return getTabForReq(request); 
  },

};

function tabClosed(e) {
  try {
    var browser = _window().gBrowser.getBrowserForTab(e.target);
    dump("Tab closed. \n");
    if (browser._ssleuthTabId) {
      dump("ssleuth tab id : " + browser._ssleuthTabId);
      SSleuthHttpObserver.deleteLoc(browser._ssleuthTabId);
    }
  } catch(e) { dump("Error tabClosed : " + e.message + "\n");}
}

function updateResponseCache(channel) {
  try {
    const obs = SSleuthHttpObserver; 
    var url = channel.URI.asciiSpec;
    var hostId = channel.URI.scheme + ":" + channel.URI.hostPort;

    dump("url : " + url + " content : " + channel.contentType
        + " host ID : " + hostId + "\n"); 

    var browser = getTabForReq(channel); 

    if (!browser) {
      dump("Critical: No browser! \n");
      return;
    }

    // Checks : 
    // 1. HTTP/HTTPS
    // 3. Did the tab location url change ?
    //
    
    if (!("_ssleuthTabId" in browser)) {
      dump("No tab id present \n"); 
      // Use a string index - helps with deletion without problems.
      var tabId = browser._ssleuthTabId = (obs.maxTabId++).toString();

      SSleuthHttpObserver.newLoc(url, tabId); 

    } else {
      // dump("Found tab id " + browser._ssleuthTabId + " URI : "  
      //    + browser.contentWindow.location.toString() + "\n");
    }

    // Check for http 
    // if (!channel.originalURI.schemeIs("https")) {}

    var tab = browser._ssleuthTabId; 
    var hostEntry = obs.responseCache[tab].reqs[hostId];

    if (!hostEntry) {
      dump("index for " + hostId + " not present in reqs list\n"); 
       
      obs.responseCache[tab].reqs[hostId] = {
        count : 0, 
        ctype : {}, 
      }
      hostEntry = obs.responseCache[tab].reqs[hostId]; 

      if (channel.securityInfo) {
        var sslStatus = channel.securityInfo
                          .QueryInterface(Ci.nsISSLStatusProvider)
                          .SSLStatus.QueryInterface(Ci.nsISSLStatus); 
        if (!sslStatus) {
          dump ("Critical : No sslstatus \n"); 
        } else {
          dump("Secure channel :" + sslStatus.cipherName + "\n");
        }

        hostEntry.cipherName = sslStatus.cipherName; 
        hostEntry.certValid = obs.utilCb.isCertValid(sslStatus.serverCert);
        hostEntry.domMatch = !sslStatus.isDomainMismatch;
        hostEntry.csRating = obs.utilCb.getCipherSuiteRating(hostEntry.cipherName);
      }

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
    // At least 2 different types of errors to handle here:
    // 1. A REST Ajax request
    // Possibly also due to an incomplete response - downloading big files.
    // Error : getTabforReq : Component returned failure code: 
    //            0x80004002 (NS_NOINTERFACE) [nsIInterfaceRequestor.getInterface]
    // Requires a stream listener ? 
    // http://www.softwareishard.com/blog/firebug/nsitraceablechannel-intercept-http-traffic/
    //
    // 2. A firefox repeated pull
    // Error : getTabforReq : Component does not have requested interface'Component does 
    //          not have requested interface' when calling method: [nsIInterfaceRequestor::getInterface]
    // 
    // dump("Error : getTabforReq : " + e.message + "\n");
    return null;
  }

}

function _window() {
  return Services.wm.getMostRecentWindow("navigator:browser");
}

