"use strict";

var EXPORTED_SYMBOLS = ["SSleuth"];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://ssleuth/cipher-suites.js"); 
Components.utils.import("resource://ssleuth/observer.js"); 
Components.utils.import("resource://ssleuth/ssleuth-ui.js");
Components.utils.import("resource://ssleuth/preferences.js");

var SSleuth = {
  prefs: null, 

  extensionStartup: function(firstRun, reinstall) {
    SSleuthPreferences.init(); 
    // TODO : Need to re-think about the callbacks.
    this.prefs = SSleuthPreferences.readInitPreferences();
    SSleuthHttpObserver.init( {
                            domainsUpdated : domainsUpdated, 
                            isCertValid: isCertValid,
                            getCipherSuiteRating: getCipherSuiteRating,
                            getAuthenticationAlg: getAuthenticationAlg,
                            getKeySize: getKeySize,
                            checkPFS : checkPFS, 
                            getConnectionRating: getConnectionRating, 
                            getSignatureAlg: getSignatureAlg}, 
                            this.prefs.PREFS['domains.observe']);

    prefListener.register(false);

    SSleuthUI.startup(this.prefs);
    forEachOpenWindow(SSleuth.initWindow); 
    Services.wm.addListener(WindowListener); 
  },

  extensionShutdown: function() {
    forEachOpenWindow(SSleuth.uninitWindow); 
    Services.wm.removeListener(WindowListener); 
    SSleuthUI.shutdown();

    SSleuthPreferences.uninit(); 
    SSleuthHttpObserver.uninit();
    prefListener.unregister(); 
  },

  extensionUninstall: function() {
  },

  initWindow: function(window) {
    dump("\nSSleuth init Window \n"); 
    try {
      window.gBrowser.addProgressListener(ProgressListener);
      SSleuthHttpObserver.initWindow(window);
      SSleuthUI.init(window); 
    } catch(e) {
      dump("\nError ssleuth init : " + e.message + "\n"); 
      this.uninit();
    }
  },

  uninitWindow: function(window) {
    dump("\nUninit window \n");
    SSleuthHttpObserver.uninitWindow(window);
    SSleuthUI.uninit(window); 
    // Add window remove listener.
    window.gBrowser.removeProgressListener(ProgressListener);
  }
};

var ProgressListener = {
  prevURL: null,
  urlChanged: false,

  onLocationChange: function(progress, request, uri) {
    var win = Services.wm.getMostRecentWindow("navigator:browser"); 
    if (!win) return; 

    dump("== onLocationChange : " + uri.spec + "\n");

    try {
      if (request && SSleuth.prefs.PREFS['domains.observe']) {
        var tab = SSleuthHttpObserver.getTab(request)._ssleuthTabId; 

        // Re-init. New location, new cache.
        // TODO : Optimize how tab id obtained ? move to newResponeEntry() ?
        // TODO : Do we need newLoc and updateLoc here ? Identify which is new
        //          locationChange and which is for update.
        SSleuthHttpObserver.newLoc(uri.asciiSpec, tab); 

        SSleuthHttpObserver.updateLoc(request);
      }
      dump("response cache so far : " 
              + JSON.stringify(SSleuthHttpObserver.responseCache, null, 2) + "\n");
    } catch(e) { 
      dump("Error onLocationChange " + e.message + "\n"); 
    }

    this.urlChanged = !(uri.spec === this.prevURL); 
    this.prevURL = uri.spec; 

    SSleuthUI.onLocationChange(win, this.urlChanged); 
  },

  onProgressChange: function() {
    return;
  },

  onStatusChange: function() {
    return;
  },

  onStateChange: function(progress, request, flag, status) {
    return; 
  },

  onSecurityChange: function(progress, request, state) {
    var win = Services.wm.getMostRecentWindow("navigator:browser");
    var loc = win.content.location;

    try {
    dump("\nonSecurityChange: " + loc.protocol + "\n"); 
    if (loc.protocol === "https:" ) {
      protocolHttps(progress, request, state, win);
    } else if (loc.protocol === "http:" ) {
      protocolHttp(loc, win);
    } else {
      protocolUnknown(win); 
    }
    } catch(e) { dump("----------- ERROR : " + e.message + " ------------ \n");}
  }

}; 

function protocolUnknown(win) {
  setDomainStates('Insecure', false, win); 
  SSleuthUI.protocolChange('unknown', ''); 
}

function protocolHttp(loc, win) {
  var httpsURL = loc.toString().replace('http://', 'https://'); 

  setDomainStates('Insecure', false, win); 
  SSleuthUI.protocolChange('http', httpsURL);
}

function protocolHttps(progress, request, state, win) {
  const Cc = Components.classes; 
  const Ci = Components.interfaces;

  SSleuthUI.protocolChange('https', ''); 

  var secUI = win.gBrowser.securityUI; 
  if (!secUI) return;
  
  var sslStatus = secUI.SSLStatus; 
  if (!sslStatus) {
    secUI.QueryInterface(Ci.nsISSLStatusProvider); 
    if (secUI.SSLStatus) {
      sslStatus = secUI.SSLStatus; 
    } else {
      // dump('\nSSLStatus null \n');
      // 1. A rather annoying behaviour : Firefox do not seem to populate
      //  SSLStatus if a tab switches to a page with the same URL.
      //
      // 2. A page load event can fire even if there is 
      //  no connectivity and user attempts to reload a page. 
      //  Hide the panel to prevent stale values from getting 
      //  displayed 

      // TODO : Recheck urlChanged context for the new redesign
      if (ProgressListener.urlChanged) {
        SSleuthUI.protocolChange('unknown', '');
      }
      return; 
    }
  }
  
  const cs = ssleuthCipherSuites; 
  var securityState = '';
  var cipherName = sslStatus.cipherName; 
  var extendedValidation = false;

  // Security Info - Firefox states
  if ((state & Ci.nsIWebProgressListener.STATE_IS_SECURE)) {
    securityState = 'Secure'; 
  } else if ((state & Ci.nsIWebProgressListener.STATE_IS_INSECURE)) {
    securityState = 'Insecure'; 
  } else if ((state & Ci.nsIWebProgressListener.STATE_IS_BROKEN)) {
    securityState = 'Broken'; 
  }

  if (state & Ci.nsIWebProgressListener.STATE_IDENTITY_EV_TOPLEVEL) {
    extendedValidation = true; 
  }

  setDomainStates(securityState, extendedValidation, win); 

  var cipherSuite = { 
    name: cipherName, 
    rank: cs.cipherSuiteStrength.LOW, 
    pfs: 0, 
    notes: '',
    cipherKeyLen: sslStatus.secretKeyLength,
    keyExchange: null, 
    authentication: null, 
    bulkCipher: null, 
    HMAC: null 
  }; 

  var cert = {
    serverCert : sslStatus.serverCert,
    pubKeySize : 0, 
    pubKeyAlg  : '', 
    pubKeyMinSecure: false, 
    isValid : false, 
    signatureAlg : null
  }; 

  function getCsParam(param) {
    for (var i=0; i<param.length; i++) {
      if ((cipherName.indexOf(param[i].name) != -1)) {
        return param[i];
      }
    }
    return null;
  }

  cipherSuite.keyExchange = getCsParam(cs.keyExchange);
  cipherSuite.authentication = getCsParam(cs.authentication);
  cipherSuite.bulkCipher = getCsParam(cs.bulkCipher);
  cipherSuite.HMAC = getCsParam(cs.HMAC);

  cipherSuite.pfs = cipherSuite.keyExchange.pfs;

  if (cipherSuite.bulkCipher.name === "") {
    // Something's missing in our list.
    // Get the security strength from Firefox's own flags.
    // Set cipher rank
    if (state & Ci.nsIWebProgressListener.STATE_SECURE_HIGH) { 
      cipherSuite.bulkCipher.rank = cs.cipherSuiteStrength.MAX; 
    } else if (state & Ci.nsIWebProgressListener.STATE_SECURE_MED) { 
      cipherSuite.bulkCipher.rank = cs.cipherSuiteStrength.HIGH - 1; 
    } else if (state & Ci.nsIWebProgressListener.STATE_SECURE_LOW) { 
      cipherSuite.bulkCipher.rank = cs.cipherSuiteStrength.MED - 1; 
    } 
  }

  // Certificate pubkey algorithim, key size
  cert.pubKeyAlg = cipherSuite.authentication.ui; 
  cert.pubKeySize = getKeySize(cert.serverCert, cert.pubKeyAlg); 
  cert.pubKeyMinSecure = 
      (cert.pubKeySize >= cipherSuite.authentication.minSecureKeyLength);
  cert.signatureAlg = getSignatureAlg(cert.serverCert); 
  // Weak keys are rated down.
  !cert.pubKeyMinSecure && (cert.signatureAlg.rating = 0); 

  cipherSuite.notes = cipherSuite.keyExchange.notes +
                        cipherSuite.bulkCipher.notes +
                        cipherSuite.HMAC.notes; 

  const csWeighting = SSleuth.prefs.PREFS['rating.ciphersuite.params'];
  // Calculate ciphersuite rank  - All the cipher suite params ratings
  // are out of 10, so this will get normalized to 10.
  cipherSuite.rank = ( cipherSuite.keyExchange.rank * csWeighting.keyExchange +
            cipherSuite.bulkCipher.rank * csWeighting.bulkCipher +
            cipherSuite.HMAC.rank * csWeighting.hmac )/csWeighting.total;

  cert.isValid = isCertValid(cert.serverCert); 

  var connectionRating = getConnectionRating(cipherSuite.rank, 
                  cipherSuite.pfs, 
                  securityState,
                  (!sslStatus.isDomainMismatch && cert.isValid),
                  extendedValidation, 
                  cert.signatureAlg.rating);

  // Invoke the UI to do its job
  SSleuthUI.fillPanel(connectionRating, 
        cipherSuite,
        securityState,
        cert,
        sslStatus.isDomainMismatch,
        extendedValidation); 
}

function getConnectionRating(csRating, pfs,
                              ffStatus,
                              certStatus,
                              evCert,
                              signature) {
  const rp = SSleuth.prefs.PREFS["rating.params"]; 
  // Connection rating. Normalize the params to 10
  let rating =  (csRating * rp.cipherSuite 
                  + pfs * 10 * rp.pfs
                  + Number(ffStatus == 'Secure') * 10 * rp.ffStatus
                  + Number(certStatus) * 10 * rp.certStatus
                  + Number(evCert) * 10 * rp.evCert 
                  + signature * rp.signature)/rp.total; 
  return Number(rating).toFixed(1); 
}

function setDomainStates(ffStatus, evCert, win) {
  try {
    if (SSleuth.prefs.PREFS['domains.observe']) {
      var tab = win.gBrowser.selectedBrowser._ssleuthTabId; 
      SSleuthHttpObserver.updateLocEntry(tab, 
                                        {ffStatus : ffStatus, 
                                         evCert : evCert});
    }
  } catch(e) {
    dump('Error Http Observer : ' + e.message + '\n');
  } 

}

function domainsUpdated() {
  SSleuthUI.domainsUpdated(); 
}

function isCertValid(cert) {
  var usecs = new Date().getTime(); 
  return ((usecs > cert.validity.notBefore/1000 && 
           usecs < cert.validity.notAfter/1000) ? true: false); 
}

function checkPFS(cipherName) {
  const csP = ssleuthCipherSuites.keyExchange; 
  for (var i=0; i<csP.length; i++) {
    if ((cipherName.indexOf(csP[i].name) != -1)) {
      return Boolean(csP[i].pfs);
    }
  }
  return false; 
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
}

function getKeySize(cert, auth) {
  var keySize = '';
  try {
    var certASN1 = Cc["@mozilla.org/security/nsASN1Tree;1"]
              .createInstance(Components.interfaces.nsIASN1Tree); 
    certASN1.loadASN1Structure(cert.ASN1Structure);

    // The public key size is not available directly as an attribute in any 
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
      // TODO : DSS
    }
  } catch (e) { 
    dump("Error getKeySize() : " + e.message + "\n"); 
  }
  return keySize;
}

function getSignatureAlg(cert) {
  try {
    var certASN1 = Cc["@mozilla.org/security/nsASN1Tree;1"]
              .createInstance(Components.interfaces.nsIASN1Tree); 
    certASN1.loadASN1Structure(cert.ASN1Structure);
    var sigText = certASN1.getDisplayData(4).replace(/PKCS #1/g, ''); 
    var signature = { hmac : "", enc : "", rating : 0};  

    const cs = ssleuthCipherSuites;
    for (var i=0; i<cs.HMAC.length; i++) {
      if ((sigText.indexOf(cs.HMAC[i].ui) != -1)) {
        signature.hmac += cs.HMAC[i].ui;
        signature.rating += cs.HMAC[i].rank; 
        break;
      }
    }
    for (var i=0; i<cs.authentication.length; i++) {
      if ((sigText.indexOf(cs.authentication[i].ui) != -1)) {
        signature.enc += cs.authentication[i].ui;
        signature.rating += cs.authentication[i].rank;
        signature.rating /= 2; 
        break;
      }
    }
    return signature; 

  } catch (e) { 
    dump("Error getSignatureAlg() : " + e.message + "\n"); 

  }
}

// TODO : optimize, combine the rating, cipher suite string matching 
//
function getAuthenticationAlg(cipherName) {
  const csA = ssleuthCipherSuites.authentication; 
  for (var i=0; i<csA.length; i++) {
    if ((cipherName.indexOf(csA[i].name) != -1)) {
      return csA[i].ui;
    }
  }
  return ''; 
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
  // Reload, if this tab is on https
  var browser = _window().gBrowser.selectedBrowser; 
  if (browser.currentURI.scheme === "https") {
    browser.reloadWithFlags(
        Components.interfaces.
        nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE);
  }
}

function toggleHttpObserver(enable) {
  if (enable) {
    SSleuthHttpObserver.init( {
                            domainsUpdated : domainsUpdated, 
                            isCertValid: isCertValid,
                            getCipherSuiteRating: getCipherSuiteRating,
                            getAuthenticationAlg: getAuthenticationAlg,
                            getKeySize: getKeySize,
                            checkPFS : checkPFS, 
                            getConnectionRating: getConnectionRating, 
                            getSignatureAlg: getSignatureAlg}, 
                            enable);
    forEachOpenWindow(SSleuthHttpObserver.initWindow); 
  } else {
    forEachOpenWindow(SSleuthHttpObserver.uninitWindow); 
    SSleuthHttpObserver.uninit();
  }
}

var prefListener = new ssleuthPrefListener(
  SSleuthPreferences.prefBranch,
  function(branch, name) {
    switch(name) {
      case "rating.params": 
        SSleuth.prefs.PREFS[name] = 
            JSON.parse(branch.getCharPref(name));
        break;
      case "rating.ciphersuite.params":
        SSleuth.prefs.PREFS[name] =
            JSON.parse(branch.getCharPref(name));
        break;
      case "suites.toggle" :
        // TODO : No need for a cloned array here ?
        var prefsOld = SSleuth.prefs.PREFS[name]; 
        SSleuth.prefs.PREFS[name] = 
            JSON.parse(branch.getCharPref(name));
        toggleCipherSuites(prefsOld); 
        break;
      case "domains.observe" : 
        SSleuth.prefs.PREFS[name] = 
            JSON.parse(branch.getBoolPref(name));
        toggleHttpObserver(SSleuth.prefs.PREFS[name]); 
        break;
    }

    SSleuthUI.prefListener(branch, name); 
  }
); 

function _window() {
    return Services.wm.getMostRecentWindow("navigator:browser"); 
}

// Apply a function to all open browser windows 
function forEachOpenWindow(todo)  {
  var windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements())
    todo(windows.getNext()
      .QueryInterface(Components.interfaces.nsIDOMWindow));
}

var WindowListener = {
  onOpenWindow: function(xulWindow) {
    var window = xulWindow
                  .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                  .getInterface(Components.interfaces.nsIDOMWindow);
    function onWindowLoad() {
      window.removeEventListener("load",onWindowLoad);
      if (window.document.documentElement
          .getAttribute("windowtype") == "navigator:browser")
        SSleuth.initWindow(window);
    }
    window.addEventListener("load",onWindowLoad);
  },
  onCloseWindow: function(xulWindow) { 
    dump ("onCloseWindow : \n");
    var window = xulWindow
                  .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                  .getInterface(Components.interfaces.nsIDOMWindow);
    if (window.document.documentElement
        .getAttribute("windowtype") == "navigator:browser")
      SSleuth.uninitWindow(window);
 
  },
  onWindowTitleChange: function(xulWindow, newTitle) { }
};

