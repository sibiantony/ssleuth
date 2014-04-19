"use strict";

var EXPORTED_SYMBOLS = ["SSleuthHttpObserver"];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

var SSleuthHttpObserver = {
  responseCache : [],
  maxTabId: null, 

  init: function() {
    // window.gBrowser.tabContainer.addEventListener('TabClose', tabClosed, false);
  },
  uninit: function() {
  },
  windowclose: function() {
    /* for (browser of window.gBrowser.browsers) {
      if (browser._ssleuthTabId) {
        dump ("Window removing.. _ssleuthTabId : " + browser._ssleuthTabId + "\n");
      }
    } */
  },
};

/*
function tabClosed(e) {
  try {
  var browser = _window().gBrowser.getBrowserForTab(e.target);
  dump("Tab closed. \n");
  if (browser._ssleuthTabId) {
    dump("ssleuth tab id : " + browser._ssleuthTabId);
  }
  } catch(e) { dump("Error tabClosed : " + e.message + "\n");}
}

// TODO : Proper way of doing.
// https://developer.mozilla.org/en/docs/Setting_HTTP_request_headers#All-in-one_example
var httpObserver = {
  init: function() {
    try {
      // TODO : Observer for cached content ?
      Services.obs.addObserver({observe: httpObserver.response},
        'http-on-examine-response', false); 
    } catch (e) {
      dump("error observer : " + e.message + "\n");
    }
  },

  uninit: function() {
    Services.obs.removeObserver({observe: httpObserver.response}, 
      'http-on-examine-response', false);
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
}; 

function updateResponseCache(channel) {
  try {
    var url = channel.URI.asciiSpec;
    var hostId = channel.URI.scheme + ":" + channel.URI.hostPort;

    // dump("url : " + url + " content : " + channel.contentType
    // + " host ID : " + hostId + "\n"); 

    var cWin = getTabForReq(channel); 
    if (!cWin) return; 
    var browser = _window().gBrowser.getBrowserForDocument(cWin.top.document);

    if (!browser) {
      dump("Critical: No browser! \n");
      return;
    }

    // Checks : 
    // 1. HTTP/HTTPS
    // 2. To which Tab this request belong to ?
    // 3. Did the tab location url change ?
    // 4. What is the content type of this request ?
    // 5. .. 
    //
    // TODO : 
    // If the tab is closed, cleanup - remove the entries.
    
    if (!("_ssleuthTabId" in browser)) {
      dump("Critical : no tab id present \n"); 
      // Use a string index - helps with deletion without problems.
      var tabId = browser._ssleuthTabId = (SSleuth.maxTabId++).toString();
      dump ("typeof tabId : " + typeof tabId + "\n");
      dump ("GBrowser tab index : " + _window().gBrowser.getBrowserIndexForDocument(cWin.top.document) + "\n");

      var tabNo = _window().gBrowser.getBrowserIndexForDocument(cWin.top.document);
      var tabElement = _window().gBrowser.tabs[tabNo];

      SSleuth.responseCache[tabId] = newResponseEntry(url); 
      // Replace with mutation observer ?
      browser.addEventListener("DOMNodeRemoved", function() {
          dump("tab removed : " +  "\n");
          delete SSleuth.responseCache[this._ssleuthTabId];
        }, false); 

    } else {
      // dump("Found tab id " + browser._ssleuthTabId + " URI : "  
      //    + browser.contentWindow.location.toString() + "\n");
    }

    // Check for http 
    // if (!channel.originalURI.schemeIs("https")) {}

    var tab = browser._ssleuthTabId; 
    var hostEntry = SSleuth.responseCache[tab].reqs[hostId];

    if (!hostEntry) {
      dump("index for " + hostId + " not present in reqs list\n"); 
       
      SSleuth.responseCache[tab].reqs[hostId] = {
        count : 0, 
        ctype : {}, 
      }
      hostEntry = SSleuth.responseCache[tab].reqs[hostId]; 

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
        hostEntry.certValid = isCertValid(sslStatus.serverCert);
        hostEntry.domMatch = !sslStatus.isDomainMismatch;
        hostEntry.csRating = getCipherSuiteRating(hostEntry.cipherName);

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

function newResponseEntry(url) {
  return { 
        url : url, 
        // ffStatus : "", 
        // evCert : false, 
        reqs: {} 
      }; 
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
    // cWin.addEventListener("beforeunload", function() {
    //      dump("beforeunload : \n"); 
    // }, false);
    return cWin; 
    // return (cWin ? 
    //          _window().gBrowser.getBrowserForDocument(cWin.top.document) : null); 
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

function getCipherSuiteRating(cipherName) {
  const cs = ssleuthCipherSuites; 
  const csW = SSleuth.prefs.PREFS["rating.ciphersuite.params"];

  function getRating(csParam) {
    for (var i=0; i<csParam.length; i++) {
      if ((cipherName.indexOf(csParam[i].name) != -1)) {
        return csParam[i].rank; 
      }
    }
    return null; 
  }
  var keyExchange = getRating(cs.keyExchange);
  var bulkCipher = getRating(cs.bulkCipher);
  var hmac = getRating(cs.HMAC); 
  
  if ((keyExchange && bulkCipher && hmac) == null)
    return null; 

  return ( (keyExchange * csW.keyExchange 
            + bulkCipher * csW.bulkCipher 
            + hmac * csW.hmac )/csW.total );
} */ 
