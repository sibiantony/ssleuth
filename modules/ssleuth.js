"use strict";

var EXPORTED_SYMBOLS = ["SSleuth"];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://ssleuth/cipher-suites.js"); 
Components.utils.import("resource://ssleuth/ssleuth-ui.js");
Components.utils.import("resource://ssleuth/preferences.js");

var SSleuth = {
  prevURL: null,
  urlChanged: false,
  prefs: null, 
  initComplete : false,
  maxTabId: null, 

  init: function(window) {

    // dump("\nSSleuth init \n"); 
    // Handle exceptions while init(). If the panel
    // is not properly installed for the buttons, the mainPopupSet 
    // panel elements will wreak havoc on the browser UI. 
    try {
      window.gBrowser.addProgressListener(this);
      this.prefs = SSleuthPreferences.readInitPreferences(); 
      if (!this.initComplete) {
        prefListener.register(false); 
        httpObserver.init(); 
        this.initComplete = true; 
      }
      SSleuthUI.init(window); 
    } catch(e) {
      dump("\nError ssleuth init : " + e.message + "\n"); 
      this.uninit();
    }
  },

  uninit: function(window) {
    // dump("\nUninit \n");
    SSleuthUI.uninit(window); 
    prefListener.unregister(); 
    this.initComplete = false; 
    window.gBrowser.removeProgressListener(this);
  },

  onLocationChange: function(aProgress, aRequest, aURI) {
    var win = Services.wm.getMostRecentWindow("navigator:browser"); 

    if (!win) return; 
    dump("onLocationChange : " + aURI.spec + "\n");

    if (aURI.spec == this.prevURL) {
      this.urlChanged = false; 
      return; 
    }
    this.urlChanged = true; 
    this.prevURL = aURI.spec; 

    SSleuthUI.onLocationChange(win); 
  },
  onProgressChange: function() {
    return;
  },
  onStatusChange: function() {
    return;
  },

  onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {
    return; 
  },

  onSecurityChange: function(aWebProgress, aRequest, aState) {
    var win = Services.wm.getMostRecentWindow("navigator:browser");
    var loc = win.content.location;

    dump("\nonSecurityChange: " + loc.protocol + "\n"); 
    if (loc.protocol == "https:" ) {
      protocolHttps(aWebProgress, aRequest, aState, win);
    } else if (loc.protocol == "http:" ) {
      protocolHttp(loc);
    } else {
      protocolUnknown(); 
    }
  }
}; 

function protocolUnknown() {
  SSleuthUI.protocolChange("unknown", ""); 
}

function protocolHttp(loc) {
  var httpsURL = loc.toString().replace("http://", "https://"); 
  SSleuthUI.protocolChange("http", httpsURL);
}

function protocolHttps(aWebProgress, aRequest, aState, win) {
  // dump("\nprotocolHttps \n");
  const Cc = Components.classes; 
  const Ci = Components.interfaces;

  SSleuthUI.protocolChange("https", ""); 

  var secUI = win.gBrowser.securityUI; 
  if (!secUI) return;
  
  var sslStatus = secUI.SSLStatus; 
  if (!sslStatus) {
    secUI.QueryInterface(Ci.nsISSLStatusProvider); 
    if (secUI.SSLStatus) {
      sslStatus = secUI.SSLStatus; 
    } else {
      // dump("\nSSLStatus null \n");
      // 1. A rather annoying behaviour : Firefox do not seem to populate
      //  SSLStatus if a tab switches to a page with the same URL.
      //
      // 2. A page load event can fire even if there is 
      //  no connectivity and user attempts to reload a page. 
      //  Hide the panel to prevent stale values from getting 
      //  displayed 
      if (SSleuth.urlChanged) {
        SSleuthUI.protocolChange("unknown", "");
      }
      return; 
    }
  }
  
  const cs = ssleuthCipherSuites; 
  var securityState = "";
  var cipherName = sslStatus.cipherName; 
  var cert = sslStatus.serverCert;
  var extendedValidation = false;

  // Security Info - Firefox states
  if ((aState & Ci.nsIWebProgressListener.STATE_IS_SECURE)) {
    securityState = "Secure"; 
  } else if ((aState & Ci.nsIWebProgressListener.STATE_IS_INSECURE)) {
    securityState = "Insecure"; 
  } else if ((aState & Ci.nsIWebProgressListener.STATE_IS_BROKEN)) {
    securityState = "Broken"; 
  }

  if (aState & Ci.nsIWebProgressListener.STATE_IDENTITY_EV_TOPLEVEL) {
    extendedValidation = true; 
  }
  var domainNameMatched = "No"; 
  if (!sslStatus.isDomainMismatch) {
    domainNameMatched = "Yes"; 
  }

  var cipherSuite = { 
    name: cipherName, 
    rank: cs.cipherSuiteStrength.LOW, 
    pfs: 0, 
    notes: "",
    cipherKeyLen: sslStatus.secretKeyLength,
    signatureKeyLen: 0, 
    keyExchange: null, 
    authentication: null, 
    bulkCipher: null, 
    HMAC: null 
  }; 
          
  // Key exchange
  for (var i=0; i<cs.keyExchange.length; i++) {
    if((cipherName.indexOf(cs.keyExchange[i].name) != -1)) {
      cipherSuite.keyExchange = cs.keyExchange[i];
      cipherSuite.pfs = cs.keyExchange[i].pfs; 
      break; 
    }
  }

  // Authentication
  for (i=0; i<cs.authentication.length; i++) {
    if((cipherName.indexOf(cs.authentication[i].name) != -1)) {
      cipherSuite.authentication = cs.authentication[i];
      break; 
    }
  }

  // Bulk cipher
  for (i=0; i<cs.bulkCipher.length; i++) {
    if((cipherName.indexOf(cs.bulkCipher[i].name) != -1)) {
      cipherSuite.bulkCipher = cs.bulkCipher[i];
      break; 
    }
  }
  // HMAC
  for (i=0; i<cs.HMAC.length; i++) {
    if((cipherName.indexOf(cs.HMAC[i].name) != -1)) {
      cipherSuite.HMAC = cs.HMAC[i];
      break; 
    }
  }

  if (!cipherSuite.keyExchange) {
    cipherSuite.keyExchange = {name: "",
                  rank: 10,
                  pfs: 0, 
                  ui: "",
                  notes: "Unknown key exchange type"
                  };
  }

  if (!cipherSuite.bulkCipher) {
    cipherSuite.bulkCipher = {name: "",
                  rank: 0,
                  ui: "", 
                  notes: "Unknown Bulk cipher"
                  }; 
    // Something's missing in our list.
    // Get the security strength from Firefox's own flags.
    // Set cipher rank
    if (aState & Ci.nsIWebProgressListener.STATE_SECURE_HIGH) { 
      cipherSuite.bulkCipher.rank = cs.cipherSuiteStrength.MAX; 
    } else if (aState & Ci.nsIWebProgressListener.STATE_SECURE_MED) { 
      cipherSuite.bulkCipher.rank = cs.cipherSuiteStrength.HIGH - 1; 
    } else if (aState & Ci.nsIWebProgressListener.STATE_SECURE_LOW) { 
      cipherSuite.bulkCipher.rank = cs.cipherSuiteStrength.MED - 1; 
    } 
  }

  if (!cipherSuite.HMAC) {
    cipherSuite.HMAC = {name: "",
                  rank: 10,
                  ui: "",
                  notes: "Unknown MAC Algorithm"
                  };
  }

  // Certificate signature alg. key size 
  cipherSuite.signatureKeyLen = getSignatureKeyLen(cert, 
                  cipherSuite.authentication.ui); 

  cipherSuite.notes = cipherSuite.keyExchange.notes +
              cipherSuite.bulkCipher.notes +
              cipherSuite.HMAC.notes; 

  const csWeighting = SSleuth.prefs.PREFS["rating.ciphersuite.params"];
  // Calculate ciphersuite rank  - All the cipher suite params ratings
  // are out of 10, so this will get normalized to 10.
  cipherSuite.rank = ( cipherSuite.keyExchange.rank * csWeighting.keyExchange +
            cipherSuite.bulkCipher.rank * csWeighting.bulkCipher +
            cipherSuite.HMAC.rank * csWeighting.hmac )/csWeighting.total;

  const ratingParams = SSleuth.prefs.PREFS["rating.params"]; 
  var certValid = isCertValid(cert); 

  // Get the connection rating. Normalize the params to 10
  var rating = getConnectionRating(cipherSuite.rank, 
          cipherSuite.pfs * 10, 
          ((securityState == "Secure") ? 1 : 0) * 10,
          Number(!sslStatus.isDomainMismatch && certValid) * 10,
          Number(extendedValidation) * 10, 
          ratingParams);

  var connectionRank = Number(rating).toFixed(1); 
  // dump("Connection rank : " + connectionRank + "\n"); 

  // Invoke the UI to do its job
  SSleuthUI.fillPanel(connectionRank, 
        cipherSuite,
        securityState,
        cert,
        certValid,
        sslStatus.isDomainMismatch,
        extendedValidation,
        ratingParams); 
}

function getConnectionRating(csRating, pfs,
      ffStatus,
      certStatus,
      evCert,
      rp) {
  return ((csRating * rp.cipherSuite + pfs * rp.pfs +
        ffStatus * rp.ffStatus + certStatus * rp.certStatus +
        evCert * rp.evCert )/rp.total); 
}

function isCertValid(cert) {
  var usecs = new Date().getTime(); 
  var valid = false;
  if (usecs > cert.validity.notBefore/1000 && 
      usecs < cert.validity.notAfter/1000) {
    valid = true; 
  } 
  return valid; 
}

function getSignatureKeyLen(cert, auth) {
  var keySize = '';
  try {
    var certASN1 = Cc["@mozilla.org/security/nsASN1Tree;1"]
              .createInstance(Components.interfaces.nsIASN1Tree); 
    certASN1.loadASN1Structure(cert.ASN1Structure);

    // The key size is not available directly as an attribute in any 
    // interfaces. So we're on our own parsing the cert structure strings. 
    // Here I didn't want to mess around with strings in the structure
    // which could get localized.
    // So simply extract the first occuring digit from the string
    // corresponding to Subject's Public key. Hope this holds on. 
    switch(auth) {
      case "RSA" : 
        keySize = certASN1.getDisplayData(12)
                .split('\n')[0]
                .match(/\d+/g)[0]; 
          break; 
      case "ECDSA" : 
        keySize = certASN1.getDisplayData(14)
                .split('\n')[0]
                .match(/\d+/g)[0]; 
          break;
    }
  } catch (e) { 
    dump("Error getSignatureKeyLen() : " + e.message + "\n"); 
  }
  return keySize;
}

function toggleCipherSuites(prefsOld) {
  const prefs = SSleuthPreferences.prefService;
  const br = "security.ssl3.";
  const SUITES_TOGGLE = "suites.toggle"; 
  const PREF_SUITES_TOGGLE = "extensions.ssleuth." + SUITES_TOGGLE;

  for (var t=0; t<SSleuth.prefs.PREFS[SUITES_TOGGLE].length; t++) {
    
    var cs = SSleuth.prefs.PREFS[SUITES_TOGGLE][t]; 
    switch(cs.state) {
      case "default" : 
        // Check if the element was present before.
        // Reset only if the old state was 'enable' or 'disable'.
        var j; 
        for (j=0; j<prefsOld.length; j++) {
          if (prefsOld[j].name === cs.name) 
            break;
        }
        if (j == prefsOld.length) // not found
          continue; 
        if (prefsOld[j].state === "default") 
          continue; 
        // Reset once
        for (var i=0; i<cs.list.length; i++) {
          prefs.clearUserPref(br+cs.list[i]);
        }
        SSleuth.prefs.PREFS[SUITES_TOGGLE][t] = cs; 
        prefs.setCharPref(PREF_SUITES_TOGGLE, 
            JSON.stringify(SSleuth.prefs.PREFS[SUITES_TOGGLE])); 
        break;

      // Only toggle these if they actually exist! Do not mess up
      // user profile with non-existing cipher suites. Do a 
      // check with getPrefType() before setting the prefs.
      case "enable" :
        for (var i=0; i<cs.list.length; i++) {
          if (prefs.getPrefType(br+cs.list[i]) === prefs.PREF_BOOL) {
            prefs.setBoolPref(br+cs.list[i], true);
          }
        }
        break;
      case "disable" :
        for (var i=0; i<cs.list.length; i++) {
          if (prefs.getPrefType(br+cs.list[i]) === prefs.PREF_BOOL) {
            prefs.setBoolPref(br+cs.list[i], false);
          }
        }
        break;
    }
  }
}

var prefListener = new ssleuthPrefListener(
  SSleuthPreferences.prefBranch,
  function(branch, name) {
    switch(name) {
      case "rating.params": 
        SSleuth.prefs.PREFS["rating.params"] = 
            JSON.parse(branch.getCharPref(name));
        break;
      case "rating.ciphersuite.params":
        SSleuth.prefs.PREFS["rating.ciphersuite.params"] =
            JSON.parse(branch.getCharPref(name));
        break;
      case "suites.toggle" :
        // TODO : No need for a cloned array here ?
        var prefsOld = SSleuth.prefs.PREFS["suites.toggle"]; 
        SSleuth.prefs.PREFS["suites.toggle"] = 
            JSON.parse(branch.getCharPref(name));
        toggleCipherSuites(prefsOld); 
        break;
    }

  }
); 

var httpObserver = {
  init: function() {
    try {
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
  
  response: function(aSubject, aTopic, aData) {
    if (aTopic !== 'http-on-examine-response') return; 
    if (!(aSubject instanceof Components.interfaces.nsIHttpChannel)) return; 

    try {
      var channel = aSubject.QueryInterface(Ci.nsIHttpChannel); 
      var url = channel.URI.asciiSpec;
      dump(url + " original URI : " + channel.originalURI.asciiSpec + "\n"); 

      var browser = getTabForReq(aSubject); 
      if (!browser) return; 

      dump("Browser !\n");
      if (!("_ssleuthTabId" in browser)) {
        dump("Critical : no tab id present \n"); 
        browser._ssleuthTabId = ++SSleuth.maxTabId;
      } else {
        dump("Found tab id " + browser._ssleuthTabId + "\n");
      }

      if (channel.securityInfo) {
        var sslStatus = channel.securityInfo
                          .QueryInterface(Ci.nsISSLStatusProvider)
                          .SSLStatus.QueryInterface(Ci.nsISSLStatus); 
        dump("Secure channel :" + sslStatus.cipherName + "\n");
      }
      // Check for http 
      // if (!channel.originalURI.schemeIs("https")) {}

      // Unique tab ID : browser._ssleuthTabId 

    } catch(e) {
      dump("Error http response: " + e.message ); 
    }

  },
}; 

function getTabForReq(req) {
  var cWin = null; 
  if (!req || !(req instanceof Ci.nsIRequest)) return null; 

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
    // A REST Ajax request
    // Error : getTabforReq : Component returned failure code: 0x80004002 (NS_NOINTERFACE) [nsIInterfaceRequestor.getInterface]
    // A firefox repeated pull
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
