var EXPORTED_SYMBOLS = ["SSleuthUI"]

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://ssleuth/utils.js");
Cu.import("resource://ssleuth/cipher-suites.js");
Cu.import("resource://ssleuth/preferences.js");
Cu.import("resource://ssleuth/observer.js");
Cu.import("resource://ssleuth/panel.js");

var SSleuthUI = {
  ssleuthLoc: {
    URLBAR: 0,
    TOOLBAR: 1
  },
  ssleuthBtnLocation: null,
  // Reference to SSleuth.prefs
  prefs: null,
  panelMenuTemplate: null,

  startup: function (prefs) {
    this.prefs = prefs;
    loadStyleSheet();
  },

  shutdown: function () {
    removeStyleSheet();
  },

  init: function (win) {
    this.ssleuthBtnLocation = this.prefs.PREFS["notifier.location"];
    var ssleuthButton = createButton(win);
    installButton(ssleuthButton,
      true,
      win.document);

    createPanelMenu(win.document);

    createKeyShortcut(win.document);

    var ssleuthPanel = _ssleuthPanel(win);
    var panelVbox = SSleuthPanel(win);
    ssleuthPanel.appendChild(panelVbox);
    setPanelFont(this.prefs.PREFS["panel.fontsize"], win.document);
    // TODO : Optimize this handlings. Only when HTTP obs enabled ?
    //        Do init in preferences handler ?
    initDomainsPanel(win.document);
    initCiphersPanel(win.document);
    initPanelPreferences(win.document);
  },

  uninit: function (win) {
    // Cleanup everything! 
    // Removing the button deletes the overlay elements as well 
    try {
      removePanelMenu(win.document);
      removeButton(_ssleuthButton(win));
      deleteKeyShortcut(win.document);
    } catch (e) {
      dump("Error SSleuth UI uninit : " + e.message + "\n");
    }
  },

  onLocationChange: function (win, urlChanged) {
    // The document elements are not available until a 
    // successful init. So we need to add the child panel
    // for the first time 
    if (!win) return;

    // If the user is navigating with the domains tab
    // reload the data.
    // resetDomains(win.doc);
    if (win.document.getElementById('ssleuth-paneltab-domains')
     .getAttribute('_selected') === 'true') {
      loadDomainsTab();
    }

    // If the user navigates the tabs with the panel open, 
    //  make it appear smooth. 
    var ssleuthPanel = _ssleuthPanel(win);
    if (ssleuthPanel.state == "open") {
      showPanel(ssleuthPanel, true);
    }

  },

  protocolChange: function (proto, data, win) {
    var doc = win.document;
    switch (proto) {

    case 'unknown':
      setButtonRank(-1, proto, win);
      setBoxHidden('https', true, win);
      setBoxHidden('http', true, win);
      doc.getElementById('ssleuth-img-cipher-rank-star').hidden = true;
      break;

    case 'http':
      setButtonRank('0.0', proto, win);
      setBoxHidden('https', true, win);
      setBoxHidden('http', false, win);
      doc.getElementById('ssleuth-img-cipher-rank-star').hidden = true;

      var panelLink = doc.getElementById("ssleuth-panel-https-link");
      panelLink.href = data;
      panelLink.setAttribute("value", data);
      break;

    case 'https':
      setBoxHidden('https', false, win);
      setBoxHidden('http', true, win);
      doc.getElementById('ssleuth-img-cipher-rank-star').hidden = false;

      fillPanel(data, win); 
      break;
    }
    
    //dump ("Box height -- " + 
    //  doc.getElementById('ssleuth-panel-main-vbox').scrollHeight + "\n");
    
    //  Fixing the height of the panel is a pain. For some strange reasons, 
    //  without setting this twice, the panel height won't be proper.
    doc.getElementById('ssleuth-panel-domains-vbox')
      .setAttribute('maxheight', doc.getElementById('ssleuth-panel-main-vbox').scrollHeight); 
    doc.getElementById('ssleuth-panel-domains-vbox')
      .setAttribute('maxheight', doc.getElementById('ssleuth-panel-main-vbox').scrollHeight); 

  },

  onStateStop : function (tab, win) {
    showCrossDomainRating(tab, win);
  }, 

  prefListener: function (branch, name) {
    preferencesChanged(branch, name);
  },

  domainsUpdated: function () {
    // Reload the tab, only if user is navigating with domains
    if (_window().document.getElementById('ssleuth-paneltab-domains')
      .getAttribute('_selected') === 'true') {
      loadDomainsTab();
    }
  }

};

function _window() {
  return Services.wm.getMostRecentWindow("navigator:browser");
}

function _ssleuthButton(win) {
  const ui = SSleuthUI;
  if (ui.ssleuthBtnLocation == ui.ssleuthLoc.TOOLBAR) {
    return win.document.getElementById("ssleuth-tb-button");
  } else if (ui.ssleuthBtnLocation == ui.ssleuthLoc.URLBAR) {
    return win.document.getElementById("ssleuth-box-urlbar");
  }
}

function _ssleuthBtnImg(win) {
  const ui = SSleuthUI;
  if (ui.ssleuthBtnLocation == ui.ssleuthLoc.TOOLBAR) {
    return win.document.getElementById("ssleuth-tb-button");
  } else if (ui.ssleuthBtnLocation == ui.ssleuthLoc.URLBAR) {
    return win.document.getElementById("ssleuth-ub-img");
  }
}

function _ssleuthPanel(win) {
  return win.document.getElementById("ssleuth-panel");
}

function loadStyleSheet() {
  registerSheet('ssleuth.css');
  if (getPlatform() == 'Darwin')
    registerSheet('darwin.css');

  function registerSheet(file) {
    var sss = Cc["@mozilla.org/content/style-sheet-service;1"]
      .getService(Components.interfaces.nsIStyleSheetService);
    var ios = Cc["@mozilla.org/network/io-service;1"]
      .getService(Components.interfaces.nsIIOService);
    var uri = ios.newURI("chrome://ssleuth/skin/" + file, null, null);
    if (!sss.sheetRegistered(uri, sss.USER_SHEET))
      sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
  }
}

function removeStyleSheet() {
  unregisterSheet('ssleuth.css'); 
  if (getPlatform() == 'Darwin')
    unregisterSheet('darwin.css'); 

  function unregisterSheet(file) {
    var sss = Cc["@mozilla.org/content/style-sheet-service;1"]
      .getService(Components.interfaces.nsIStyleSheetService);
    var ios = Cc["@mozilla.org/network/io-service;1"]
      .getService(Components.interfaces.nsIIOService);
    var uri = ios.newURI("chrome://ssleuth/skin/" + file, null, null);
    if (sss.sheetRegistered(uri, sss.USER_SHEET))
      sss.unregisterSheet(uri, sss.USER_SHEET);
  }
}

function createPanel(panelId, position, win) {
  var panel = create(win.document, 'panel', {
    id: panelId,
    position: position,
    type: 'arrow'
  });
  // Clicking on panel should retain the panel
  panel.addEventListener("click", function (e) {
    e.stopPropagation();
  }, false);
  return panel;
}

function installButton(ssleuthButton, firstRun, document) {
  try {
    const ui = SSleuthUI;
    if (ui.ssleuthBtnLocation == ui.ssleuthLoc.TOOLBAR) {
      // The whole thing helps in remembering the toolbar button location?
      //
      var toolbar = document.getElementById("nav-bar");
      var toolbarButton = ssleuthButton;
      var buttonId = "ssleuth-tb-button";

      var palette = document.getElementById("navigator-toolbox").palette;
      palette.appendChild(toolbarButton);
      var currentset = toolbar.getAttribute("currentset").split(",");
      var index = currentset.indexOf(buttonId);
      if (index == -1) {
        if (firstRun) {
          // No button yet so add it to the toolbar.
          toolbar.appendChild(toolbarButton);
          toolbar.setAttribute("currentset", toolbar.currentSet);
          document.persist(toolbar.id, "currentset");
        }
      } else {
        // The ID is in the currentset, so find the position and
        // insert the button there.
        var before = null;
        for (var i = index + 1; i < currentset.length; i++) {
          before = document.getElementById(currentset[i]);
          if (before) {
            toolbar.insertItem(buttonId, before);
            break;
          }
        }
        if (!before) {
          toolbar.insertItem(buttonId);
        }
      }
    } else if (ui.ssleuthBtnLocation == ui.ssleuthLoc.URLBAR) {
      var urlbar = document.getElementById("urlbar");
      urlbar.insertBefore(ssleuthButton,
        document.getElementById("identity-box"));
    } else {
      dump("ssleuthBtnLocation undefined! \n");
    }
  } catch (ex) {
    dump("\n Failed install button : " + ex.message + "\n");
  }
}

function createButton(win) {
  try {
    const doc = win.document;
    const ui = SSleuthUI;
    var button;
    var panelPosition;

    if (ui.ssleuthBtnLocation == ui.ssleuthLoc.TOOLBAR) {
      button = create(doc, 'toolbarbutton', {
        id: 'ssleuth-tb-button',
        removable: 'true',
        class: 'toolbarbutton-1 chromeclass-toolbar-additional',
        type: 'panel',
        rank: 'default'
      });
      panelPosition = "bottomcenter topright";

    } else if (ui.ssleuthBtnLocation == ui.ssleuthLoc.URLBAR) {
      button = create(doc, 'box', {
        id: 'ssleuth-box-urlbar',
        role: 'button',
        align: 'center',
        width: '40'
      });
      button.appendChild(create(doc, 'image', {
        id: 'ssleuth-ub-img',
        rank: 'default'
      }));
      panelPosition = "bottomcenter topleft";
    }

    button.setAttribute("label", "SSleuth");
    button.addEventListener("contextmenu", menuEvent, false);
    // button.setAttribute("oncommand", "null"); 
    button.addEventListener("click", panelEvent, false);
    button.addEventListener("keypress", panelEvent, false);

    button.appendChild(createPanel("ssleuth-panel",
      panelPosition, win));

    if (ui.ssleuthBtnLocation == ui.ssleuthLoc.URLBAR) {
      button.appendChild(create(doc, 'description', {
        'id': 'ssleuth-ub-rank',
        'class': 'ssleuth-text-body-class'
      }));
    }

  } catch (ex) {
    dump("\n Failed create button : " + ex.message + "\n");
  }
  return button;
}

function removeButton(button) {
  try {
    button.parentElement.removeChild(button);
  } catch (ex) {
    dump("\n Failed remove button : " + ex.message + "\n");
  }
}

function panelEvent(event) {
  if (event.type == "click" && event.button == 2) {
    /* ssleuth.openPreferences(); */
  } else {
    // The toolbar button, technically being a 'button'
    // and the panel as it's child, is automagically opened by firefox.
    // Unlike a shortcut-key or the urlbar notifier, we don't
    // need to open the panel in this case. 
    try {
      const ui = SSleuthUI;
      if (!(event.type == "click" &&
        event.button == 0 &&
        ui.ssleuthBtnLocation == ui.ssleuthLoc.TOOLBAR)) {
        togglePanel(_ssleuthPanel(_window()));

      }

    } catch (ex) {
      dump("Error during panelEvent action : " + ex.message + "\n");
    }
  }
}

function setBoxHidden(protocol, show, win) {
  var doc = win.document;
  switch (protocol) {
  case "http":
    doc.getElementById('ssleuth-panel-box-http').hidden = show;
    break;
  case "https":
    doc.getElementById('ssleuth-panel-vbox-https').hidden = show;
    break;
  default:
  }
}

function showPanel(panel, show) {
  if (show) {
    panel.openPopup(_ssleuthButton(_window()));
    panelVisible();
  } else {
    panel.hidePopup();
  }
}

function panelVisible() {
  // Special case : Firefox does not select menuitems unless the 
  //    panel is visible. Or loadTabs -> loadCiphersTab() ?
  loadCiphersTab();
  // loadDomainsTab();
}

function togglePanel(panel) {
  if (panel.state == "closed") {
    showPanel(panel, true);
  } else if (panel.state == "open") {
    showPanel(panel, false);
  }
}

function panelConnectionRank(rank, win) {
  var s = [];
  var doc = win.document;

  // I don't see any easy CSS hacks
  // without having to autogenerate spans in html.
  for (var i = 1; i <= 10; i++) {
    s[i] = doc.getElementById("ssleuth-img-cipher-rank-star-" + String(i));
    s[i].className = "ssleuth-star";
  }

  for (var i = 1; i <= 10; i++) {
    if (i <= rank) {
      s[i].className = "ssleuth-star-full";
      if (i == rank)
        break;
    }
    if ((i < rank) && (i + 1 > rank)) {
      s[i + 1].className = "ssleuth-star-half";
      break;
    }
  }
  doc.getElementById("ssleuth-text-cipher-rank-numeric")
    .textContent = (_fmt(rank) + "/10");
}

function fillPanel(data, win) {

    setButtonRank(data.rating, 'https', win);
    panelConnectionRank(data.rating, win);

    showCipherDetails(data.cipherSuite, win);
    showPFS(data.cipherSuite.pfs, win);
    showFFState(data.state, win);
    showCertDetails(data.cert, data.domMismatch, data.ev, win);
    showTLSVersion(win); 
    //TODO : Fix tab param
    showCrossDomainRating(-1, win); 
}
 
function setButtonRank(connectionRank, proto, win) {
  var doc = win.document;
  var buttonRank = getRatingClass(connectionRank);

  _ssleuthBtnImg(win).setAttribute('rank', buttonRank);

  if (SSleuthUI.ssleuthBtnLocation == SSleuthUI.ssleuthLoc.URLBAR) {
    var ssleuthUbRank = doc.getElementById('ssleuth-ub-rank');

    ssleuthUbRank.setAttribute('rank', buttonRank);
    // TODO : Decide on a text for warning in case of http
    //if (proto == 'http') {
    //  ssleuthUbRank.textContent = 'http';
    //} else if (connectionRank != -1) {
    if (connectionRank != -1) {
      ssleuthUbRank.textContent = _fmt(Number(connectionRank).toFixed(1));
    } else {
      ssleuthUbRank.textContent = '';
    }
    _ssleuthButton(win).setAttribute('rank', buttonRank);
    // TODO : (SSleuthUI.prefs.PREFS['ui.urlbar.colorize'] ? 'blank' : buttonRank)); 
  }

  // URL bar background gradient
  doc.getElementById('urlbar').setAttribute('_ssleuthrank', 
      (SSleuthUI.prefs.PREFS['ui.urlbar.colorize'] ? buttonRank : 'default'));
}

function showCipherDetails(cipherSuite, win) {
  var doc = win.document;
  const cs = ssleuthCipherSuites;
  const rp = SSleuthUI.prefs.PREFS["rating.params"];

  var marginCipherStatus = "low";
  if (cipherSuite.rank >= cs.cipherSuiteStrength.HIGH) {
    marginCipherStatus = "high";
  } else if (cipherSuite.rank > cs.cipherSuiteStrength.MEDIUM) {
    marginCipherStatus = "med";
  }

  doc.getElementById("ssleuth-img-cipher-rank")
    .setAttribute("status", marginCipherStatus);

  doc.getElementById("ssleuth-text-cipher-suite").textContent =
    (cipherSuite.name);

  var rating = Number(cipherSuite.rank * rp.cipherSuite / 10).toFixed(1);
  doc.getElementById("ssleuth-cipher-suite-rating").textContent =
    (_fmt(rating) + "/" + _fmt(rp.cipherSuite));

  doc.getElementById("ssleuth-text-cipher-suite-kxchange").textContent =
    (cipherSuite.keyExchange.ui + '.');
  doc.getElementById("ssleuth-text-cipher-suite-auth").textContent =
    (cipherSuite.authentication.ui + '. ');

  doc.getElementById("ssleuth-text-cipher-suite-bulkcipher").textContent =
    (cipherSuite.bulkCipher.ui + " " + cipherSuite.cipherKeyLen + 
    " " + getText('general.bits') + ".");
  doc.getElementById("ssleuth-text-cipher-suite-bulkcipher-notes").textContent =
    getText(cipherSuite.bulkCipher.notes);
  doc.getElementById("ssleuth-text-cipher-suite-hmac").textContent =
    (cipherSuite.HMAC.ui + ". ");
  doc.getElementById("ssleuth-text-cipher-suite-hmac-notes").textContent =
    getText(cipherSuite.HMAC.notes);

  const panelInfo = SSleuthUI.prefs.PREFS["panel.info"];
  doc.getElementById("ssleuth-text-authentication").hidden = !(panelInfo.authAlg);
  doc.getElementById("ssleuth-text-bulk-cipher").hidden = !(panelInfo.bulkCipher);
  doc.getElementById("ssleuth-text-hmac").hidden = !(panelInfo.HMAC);
  doc.getElementById("ssleuth-text-key-exchange").hidden = !(panelInfo.keyExchange);
}

function showPFS(pfs, win) {
  var doc = win.document;
  const rp = SSleuthUI.prefs.PREFS["rating.params"];

  const pfsImg = doc.getElementById("ssleuth-img-p-f-secrecy");
  const pfsTxt = doc.getElementById("ssleuth-text-p-f-secrecy");
  const pfsRating = doc.getElementById("ssleuth-p-f-secrecy-rating");

  var rating = Number(pfs * rp.pfs).toFixed(1);
  pfsRating.textContent = _fmt(rating) + "/" + _fmt(rp.pfs);

  if (pfs) {
    pfsTxt.textContent = getText('general.yes');
    pfsImg.setAttribute('status', 'yes');
  } else {
    pfsTxt.textContent = getText('general.no');
    pfsImg.setAttribute('status', 'no');
  }
}

function showFFState(state, win) {
  var doc = win.document;
  const rp = SSleuthUI.prefs.PREFS["rating.params"];

  doc.getElementById("ssleuth-img-ff-connection-status").setAttribute("state", state);
  doc.getElementById("ssleuth-text-ff-connection-status").textContent = 
      getText('connectionstatus.text.' + state.toLowerCase());
  const statusRating = doc.getElementById("ssleuth-ff-connection-status-rating");
  var brokenText = doc.getElementById("ssleuth-text-ff-connection-status-broken");

  var rating = Number(((state == "Secure") ? 1 : 0) * rp.ffStatus).toFixed(1);
  statusRating.textContent = _fmt(rating) + "/" + _fmt(rp.ffStatus);

  if (state == "Broken" || state == "Insecure") {
    brokenText.setAttribute("hidden", "false");
  } else {
    brokenText.setAttribute("hidden", "true");
  }
}

function showCertDetails(cert, domMismatch, ev, win) {
  var svCert = cert.serverCert;
  var validity = svCert.validity.QueryInterface(Ci.nsIX509CertValidity);
  var doc = win.document;
  const rp = SSleuthUI.prefs.PREFS["rating.params"];
  const panelInfo = SSleuthUI.prefs.PREFS["panel.info"];

  doc.getElementById("ssleuth-text-cert-common-name").textContent = svCert.commonName;
  var certRating = doc.getElementById("ssleuth-cert-status-rating");
  var evRating = doc.getElementById("ssleuth-cert-ev-rating");
  var elemEV = doc.getElementById("ssleuth-text-cert-extended-validation");
  if (ev) {
    elemEV.textContent = getText('general.yes');
    elemEV.setAttribute('ev', 'Yes');
  } else {
    elemEV.textContent = getText('general.no');
    elemEV.setAttribute('ev', 'No');
  }

  var rating = (Number(ev) * rp.evCert).toFixed(1);
  evRating.textContent = _fmt(rating) + "/" + _fmt(rp.evCert);

  for (var [id, text] in Iterator({
    "ssleuth-text-cert-org": svCert.organization,
    "ssleuth-text-cert-org-unit": svCert.organizationalUnit,
    "ssleuth-text-cert-issuer-org": svCert.issuerOrganization,
    "ssleuth-text-cert-issuer-org-unit": svCert.issuerOrganizationUnit
  })) {
    var elem = doc.getElementById(id);
    elem.textContent = text;
    elem.hidden = (text == "");
  }

  var certValidity = doc.getElementById("ssleuth-text-cert-validity");
  certValidity.setAttribute("valid", cert.isValid.toString());

  if (panelInfo.validityTime)
    certValidity.textContent = validity.notBeforeGMT +
    " -- " + validity.notAfterGMT;
  else
    certValidity.textContent = validity.notBeforeLocalDay +
    " -- " + validity.notAfterLocalDay;

  doc.getElementById("ssleuth-text-cert-domain-mismatch").hidden = !domMismatch;

  var rating = (Number(cert.isValid && !domMismatch) * rp.certStatus).toFixed(1);
  certRating.textContent = _fmt(rating) + "/" + _fmt(rp.certStatus);

  if (cert.isValid && !domMismatch) {
    doc.getElementById("ssleuth-img-cert-state").setAttribute("state", "good");
  } else {
    doc.getElementById("ssleuth-img-cert-state").setAttribute("state", "bad");
  }

  doc.getElementById("ssleuth-text-cert-pub-key")
    .textContent = (cert.pubKeySize + ' ' + getText('general.bits') 
    + ' '  + cert.pubKeyAlg);
  doc.getElementById("ssleuth-text-cert-pub-key")
    .setAttribute("secure", cert.pubKeyMinSecure.toString());

  doc.getElementById("ssleuth-text-cert-sigalg")
    .textContent = cert.signatureAlg.hmac + "/" + cert.signatureAlg.enc;
  rating = Number(cert.signatureAlg.rating * rp.signature / 10).toFixed(1);
  doc.getElementById('ssleuth-cert-sigalg-rating')
    .textContent = _fmt(rating) + "/" + _fmt(rp.signature);

  doc.getElementById("ssleuth-text-cert-fingerprint")
    .textContent = svCert.sha1Fingerprint.substring(0, 30) + ' ' +
                    svCert.sha1Fingerprint.substring(30);

  doc.getElementById("ssleuth-text-cert-validity-box").hidden 
      = !(panelInfo.certValidity);
  doc.getElementById("ssleuth-text-cert-fingerprint-box").hidden 
      = !(panelInfo.certFingerprint);
}

function showTLSVersion(win) {
  var doc = win.document; 
  var tab = win.gBrowser.selectedBrowser._ssleuthTabId;
  var tlsIndex = 'ff_cache';

  if (!SSleuthUI.prefs.PREFS['domains.observe']) 
    tlsIndex = 'ff_obs'; 
  else if ( SSleuthHttpObserver.responseCache[tab].tlsVersion ) 
    tlsIndex = SSleuthHttpObserver.responseCache[tab].tlsVersion;

  if (tlsIndex == '') 
    tlsIndex = 'ff_cache';

  doc.getElementById("ssleuth-text-tls-version").textContent = 
      ssleuthTlsVersions[tlsIndex].ui; 

  doc.getElementById("ssleuth-img-tls-version").setAttribute('state', 
      ssleuthTlsVersions[tlsIndex].state);
}

function showCrossDomainRating(tab, win) {
  var doc = win.document; 
  if (!SSleuthUI.prefs.PREFS['domains.observe']) {
    doc.getElementById('ssleuth-domains-rating-box').hidden = true;
    return;
  }
  doc.getElementById('ssleuth-domains-rating-box').hidden = false;
  
  var domainsRating = '...';
  if (tab == -1) 
    tab = win.gBrowser.selectedBrowser._ssleuthTabId;
  var respCache = SSleuthHttpObserver.responseCache[tab]; 

  if ( respCache.domainsRating &&
        respCache.domainsRating != -1 ) 
    domainsRating = respCache.domainsRating;

  doc.getElementById("ssleuth-text-domains-rating-numeric").textContent = 
    ' domains : ' + _fmt(domainsRating); 

  var ratingClass = getRatingClass(domainsRating);
  if ( respCache.mixedContent ) 
    ratingClass = 'low'; 
  doc.getElementById('ssleuth-img-domains-rating').setAttribute
      ('rank', ratingClass); 
}

function createKeyShortcut(doc) {
  var keyset = doc.createElement("keyset");
  const shortcut =
    SSleuthUI.prefs.PREFS["ui.keyshortcut"];
  var keys = shortcut.split(" ");
  var len = keys.length;

  // Mozilla, I have no clue, without pointing 'oncommand' to
  // something, the key events won't fire! I already have an 
  // event listener for 'command'.
  var key = create(doc, 'key', {
    id: 'ssleuth-panel-keybinding',
    oncommand: 'void(0);',
    key: keys.splice(len - 1, 1),
    modifiers: keys.join(" ")
  });
  key.addEventListener("command", panelEvent);
  keyset.appendChild(key);
  doc.documentElement.appendChild(keyset);
}

function deleteKeyShortcut(doc) {
  var keyset = doc.getElementById("ssleuth-panel-keybinding").parentElement;
  keyset.parentElement.removeChild(keyset);
}

function readUIPreferences() {
  const prefs = SSleuthPreferences.prefService;
  SSleuthUI.ssleuthBtnLocation =
    prefs.getIntPref("extensions.ssleuth.notifier.location");
}

function setPanelFont(panelFont, doc) {
  var bodyFontClass = "ssleuth-text-body-class";
  var titleFontClass = "ssleuth-text-title-class";
  var imgStateClass = "ssleuth-img-state";

  // 0 = default, 1 = medium, 2 = large
  var configBody = ["ssleuth-text-body-small", "ssleuth-text-body-medium",
          "ssleuth-text-body-large"];
  var configTitle = ["ssleuth-text-title-small", "ssleuth-text-title-medium",
          "ssleuth-text-title-large"];
  var configImg = ["ssleuth-img-state-small", "ssleuth-img-state-medium",
          "ssleuth-img-state-large"];
  try {
    var bodyText = doc.getElementsByClassName(bodyFontClass);
    var titleText = doc.getElementsByClassName(titleFontClass);
    var stateImg = doc.getElementsByClassName(imgStateClass);

    for (var i = 0; i < bodyText.length; i++) {
      bodyText[i].className = bodyFontClass + " " + configBody[panelFont];
    }
    for (var i = 0; i < titleText.length; i++) {
      titleText[i].className = titleFontClass + " " + configTitle[panelFont];
    }
    for (var i = 0; i < stateImg.length; i++) {
      stateImg[i].className = imgStateClass + " " +
        configImg[panelFont];
    }

  } catch (e) {
    dump("setPanelFont error : " + e.message + "\n");
  }
}

function menuEvent(event) {
  try {
    event.preventDefault();
    var doc = _window().document;

    var ssleuthPanelMenu = doc.getElementById("ssleuth-panel-menu");
    var menupopup = SSleuthUI.panelMenuTemplate.cloneNode(true);

    // TODO : Replace with a traverse, and find ssleuth-menu-cs-reset-all
    // Note that this is the cloned node, and not yet inserted into doc
    var mi = menupopup.firstChild.nextSibling.nextSibling;

    // This has to be done everytime, as the preferences change.
    var csList = JSON.parse(SSleuthPreferences.prefService
      .getCharPref("extensions.ssleuth.suites.toggle"));
    if (csList.length > 0) {
      for (var i = 0; i < csList.length; i++) {
        var menu = create(doc, 'menu', {
          label: csList[i].name
        });

        var m_popup = doc.createElement("menupopup");
        for (var rd of["default", "enable", "disable"]) {
          var m_item = create(doc, 'menuitem', {
            type: 'radio',
            label: getText('general.' + rd),
            value: rd,
            checked: (csList[i].state === rd)
          });
          m_popup.appendChild(m_item);
        }
        m_popup.addEventListener("command", function (event) {
          var m = event.currentTarget.parentNode;
          // FIXME : The SSleuthUI.prefs is a reference to SSleuth.prefs
          //    which in turn seems to be a reference to preferences module var.
          //    This might work here, but not clean.
          var csTglList = cloneArray(SSleuthUI.prefs.PREFS["suites.toggle"]);
          for (var i = 0; i < csTglList.length; i++) {
            if (m.label === csTglList[i].name) {
              csTglList[i].state = event.target.value;
            }
          }
          SSleuthPreferences.prefService
            .setCharPref("extensions.ssleuth.suites.toggle", JSON.stringify(csTglList));
        });

        menu.appendChild(m_popup);
        menupopup.insertBefore(menu, mi);
      }
    }

    doc.documentElement.replaceChild(menupopup, ssleuthPanelMenu);
    // Add listeners. Since we use the id's to get the element, 
    // this can only be done after inserting the menupopup into the document. 
    for (var id of[
      "ssleuth-menu-open-preferences",
      "ssleuth-menu-open-about",
      "ssleuth-menu-cs-reset-all",
      "ssleuth-menu-cs-custom-list"
      ]) {
      doc.getElementById(id)
        .addEventListener("command", menuCommand, false);
    }

    menupopup.openPopup(_ssleuthButton(_window()));
  } catch (e) {
    dump("menuEvent error : " + e.message + "\n");
  }
}

function menuCommand(event) {
  var doc = _window().document;
  switch (event.target.id) {
  case 'ssleuth-menu-cs-reset-all':
    const prefs = SSleuthPreferences.prefService;

    var csList = prefs.getChildList("security.ssl3.", {});
    for (var i = 0; i < csList.length; i++) {
      prefs.clearUserPref(csList[i]);
    }

    var csTglList = cloneArray(SSleuthUI.prefs.PREFS["suites.toggle"]);
    for (i = 0; i < csTglList.length; i++) {
      csTglList[i].state = "default";
    }
    prefs.setCharPref("extensions.ssleuth.suites.toggle",
      JSON.stringify(csTglList));
    break;
  case 'ssleuth-menu-open-preferences':
    SSleuthPreferences.openTab(0);
    break;
  case 'ssleuth-menu-cs-custom-list':
    SSleuthPreferences.openTab(2);
    break;
  case 'ssleuth-menu-open-about':
    SSleuthPreferences.openTab(3);
    break;
  }
}

function createPanelMenu(doc) {
  var menupopup = create(doc, 'menupopup', {
    id: 'ssleuth-panel-menu',
    position: 'after_start'
  });

  // addEventLisetener() won't work if we clone the parent nodes.
  // the remaining option is to go with an in-line listener.
  menupopup.appendChild(create(doc, 'menuitem', {
    id: 'ssleuth-menu-open-preferences',
    label: getText('menu.preferences')
  }));
  menupopup.appendChild(doc.createElement("menuseparator"));
  menupopup.appendChild(create(doc, 'menuitem', {
    id: 'ssleuth-menu-cs-reset-all',
    label: getText('menu.resetall')
  }));
  menupopup.appendChild(create(doc, 'menuitem', {
    id: 'ssleuth-menu-cs-custom-list',
    label: getText('menu.customlist')
  }));
  menupopup.appendChild(doc.createElement("menuseparator"));
  menupopup.appendChild(create(doc, 'menuitem', {
    id: 'ssleuth-menu-open-about',
    label: getText('menu.about')
  }));
  SSleuthUI.panelMenuTemplate = menupopup.cloneNode(true);

  // Right place to insert the menupopup?
  doc.documentElement.appendChild(menupopup);
}

function removePanelMenu(doc) {
  var menupopup = doc.getElementById("ssleuth-panel-menu");

  menupopup.parentElement.removeChild(menupopup);
}

function forEachOpenWindow(todo) {
  var windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements())
    todo(windows.getNext()
      .QueryInterface(Components.interfaces.nsIDOMWindow));
}

function initDomainsPanel(doc) {
  var domainsTab = doc.getElementById('ssleuth-paneltab-domains');
  domainsTab.addEventListener('click', loadDomainsTab, false);
}

function initCiphersPanel(doc) {
  loadCiphersTab();
}

function initPanelPreferences(doc) {
  var panelPref = doc.getElementById('ssleuth-img-panel-pref-icon'); 
  panelPref.addEventListener('click', function() {
    SSleuthPreferences.openTab(0);
    togglePanel(_ssleuthPanel(_window()));
    }, false); 

  panelPref = doc.getElementById('ssleuth-img-panel-clipboard');
  panelPref.addEventListener('click', function() {
    copyToClipboard();
    }, false); 

}

function loadDomainsTab() {

  try {
    const win = _window();
    const doc = win.document;
    resetDomains(doc);

    if (!SSleuthUI.prefs.PREFS['domains.observe']) {
      doc.getElementById('ssleuth-paneltab-domains-disabled-text').
      hidden = false;
      return;
    }
    doc.getElementById('ssleuth-paneltab-domains-disabled-text').
    hidden = true;

    var tab = win.gBrowser.selectedBrowser._ssleuthTabId;
    var respCache = SSleuthHttpObserver.responseCache[tab];

    if (!respCache) return;

    let reqs = respCache['reqs'];
    let rb = doc.getElementById('ssleuth-paneltab-domains-list');

    // TODO : Set maxheight to that of the main vbox
    // rb.maxheight = doc.getElementById('ssleuth-panel-main-vbox').height;
    // TODO : 1) Problem navigate http page/chrome page back and forth
    //        - Chops off main tab 
    //        2) Navigate https page to http, main tab is big, empty space.
    doc.getElementById('ssleuth-panel-domains-vbox')
      .setAttribute('maxheight', doc.getElementById('ssleuth-panel-main-vbox').scrollHeight); 

    for (var [domain, stats] in Iterator(reqs)) {
      let ri = rb.appendChild(create(doc, 'richlistitem', {
        class: 'ssleuth-paneltab-domains-item'
      }));
      let vb = ri.appendChild(create(doc, 'vbox', {})); {
        // Domain name + requests hbox
        let hb = vb.appendChild(create(doc, 'hbox', {})); {
          let str = domain.substring(domain.indexOf(':') + 1);
          hb.appendChild(create(doc, 'description', {
            value: cropText(str),
            style: 'font-size: 115%; font-weight: bold;'
          }));
          str = ' ' + stats['count'] + 'x   ';

          for (var [ctype, count] in Iterator(stats['ctype'])) {
            switch (ctype) {
            case 'text':
              str += getText('domains.text.short') + ' ';
              break;
            case 'image':
              str += getText('domains.image.short') + ' ';
              break;
            case 'application':
              str += getText('domains.application.short') + ' ';
              break;
            case 'audio':
              str += getText('domains.audio.short') + ' ';
              break;
            case 'video':
              str += getText('domains.video.short') + ' ';
              break;
            }
            str += count + ', ';
          }
          hb.appendChild(create(doc, 'description', {
            value: str
          }));

        }

        let str = '';
        // Cipher suite hbox
        hb = vb.appendChild(create(doc, 'hbox', {})); {
          if (domain.indexOf('https:') != -1) {
            str = _fmt(stats['cxRating']) + '   ' + stats['cipherName'];
            hb.appendChild(create(doc, 'description', {
              value: str
            }));

            let hbCert = vb.appendChild(create(doc, 'hbox', {})); {
              str = getText('certificate.short.text') + 
                    ' : ' + stats['signature'].hmac + '/' + stats['signature'].enc + '.  ';
              str += getText('certificate.key.short') + ' : ' + stats['pubKeySize'] 
                  + ' ' + getText('general.bits') + ' ' + stats['pubKeyAlg'];
              hbCert.appendChild(create(doc, 'description', {
                value: str
              }));
            }
          } else {
            str = getText('domains.insecurechannel');
            // TODO : To stylesheet
            hb.appendChild(create(doc, 'description', {
              value: str,
              style: 'color: #5e0a0a;'
            }));
          }
        }
      }
      var cipherRating = 'low';
      if (domain.indexOf('https:') != -1) {
        cipherRating = getRatingClass(stats['cxRating']);
      }
      ri.setAttribute('rank', cipherRating);
    }

  } catch (e) {
    dump("Error loadDomainsTab " + e.message + "\n");
  }
}

function resetDomains(doc) {
  let rb = doc.getElementById('ssleuth-paneltab-domains-list');

  while (rb.hasChildNodes()) {
    rb.removeChild(rb.firstChild);
  }

}

function loadCiphersTab() {
  try {
    var doc = _window().document;
    var rows = doc.getElementById("ssleuth-paneltab-ciphers-rows");

    // Reset anything before.
    while (rows.hasChildNodes()) {
      rows.removeChild(rows.firstChild);
    }

    // This has to be done everytime, as the preferences change.
    var csList = SSleuthUI.prefs.PREFS['suites.toggle'];

    for (var i = 0; i < csList.length; i++) {
      var row = rows.appendChild(create(doc, 'row', {
        align: 'baseline'
      }));
      row.appendChild(create(doc, 'description', {
        value: csList[i].name
      }));

      var m_list = row.appendChild(doc.createElement('menulist'));
      var m_popup = m_list.appendChild(doc.createElement("menupopup"));

      for (var rd of["default", "enable", "disable"]) {
        var mi = m_popup.appendChild(create(doc, 'menuitem', {
          label: getText('general.' + rd),
          value: rd
        }));
        // TODO : Some optimizations here in Firefox. Unless the panel is 
        //        visible, the selected item is not applied??
        if (csList[i].state === rd.toLowerCase()) {
          m_list.selectedItem = mi;
        }
      }
      m_popup.addEventListener("command", function (event) {
        var m = event.currentTarget.parentNode.parentNode.firstChild;
        var csTglList = cloneArray(
            SSleuthUI.prefs.PREFS["suites.toggle"]);
        for (var i = 0; i < csTglList.length; i++) {
          if (m.value === csTglList[i].name) {
            csTglList[i].state = event.target.value;
          }
        }
        SSleuthPreferences.prefService
          .setCharPref("extensions.ssleuth.suites.toggle", 
              JSON.stringify(csTglList));
      }, false);
    }

  } catch (e) {
    dump("Error loadCiphersTab " + e.message + "\n");
  }

}

function preferencesChanged(branch, name) {
  switch (name) {
  case "notifier.location":
    // Changing the notifier location requires tearing down
    // everything. Button, panel.. and the panel overlay!
    SSleuthUI.prefs.PREFS[name] = branch.getIntPref(name);
    forEachOpenWindow(function (win) {
      SSleuthUI.uninit(win);
    });

    forEachOpenWindow(function (win) {
      SSleuthUI.init(win);
    });
    break;
  case "panel.fontsize":
    SSleuthUI.prefs.PREFS[name] = branch.getIntPref(name);
    forEachOpenWindow(function (win) {
      setPanelFont(branch.getIntPref(name), win.document);
    });
    break;
  case "ui.keyshortcut":
    SSleuthUI.prefs.PREFS[name] = branch.getCharPref(name);
    forEachOpenWindow(function (win) {
      deleteKeyShortcut(win.document);
      createKeyShortcut(win.document);
    });
    break;
  case "panel.info":
    SSleuthUI.prefs.PREFS[name] =
      JSON.parse(branch.getCharPref(name));
    break;
  case "rating.params":
    // Prefs set from main
    break;
  case "domains.observe":
    // Prefs set from main
    break;
  case "suites.toggle":
    // Prefs set from main
    loadCiphersTab();
    break;
  case "ui.urlbar.colorize":
    SSleuthUI.prefs.PREFS[name] = branch.getBoolPref(name);
    break;
  }
}

function copyToClipboard() {
  try {
  const clipboardHelper = Cc["@mozilla.org/widget/clipboardhelper;1"]
                            .getService(Ci.nsIClipboardHelper);
  var str = ''; 
  var win = _window(); 
  var doc = win.document; 

  function elem(id) {
    return doc.getElementById(id); 
  }

  switch (win.content.location.protocol) {
    case 'http:'    : 
      str = elem('ssleuth-text-http-1').textContent + '\n' +
              elem('ssleuth-text-http-2').textContent + '\n' + 
              elem('ssleuth-panel-https-link').href + '\n' + 
              elem('ssleuth-text-http-note').textContent; 
      break;

    case 'https:'   :
      str = elem('ssleuth-text-cipher-suite-label').value + '\n' + 
              elem('ssleuth-text-cipher-suite').textContent + '\n\t' + 
              elem('ssleuth-text-key-exchange-label').value + ' ' + 
              elem('ssleuth-text-cipher-suite-kxchange').textContent + '\n\t' + 
              elem('ssleuth-text-authentication-label').value + ' ' + 
              elem('ssleuth-text-cipher-suite-auth').textContent + '\n\t' +
              elem('ssleuth-text-bulk-cipher-label').value + ' ' + 
              elem('ssleuth-text-cipher-suite-bulkcipher').textContent + '\n\t' + 
              elem('ssleuth-text-hmac-label').value + ' ' + 
              elem('ssleuth-text-cipher-suite-hmac').textContent + '\n';

      str += elem('ssleuth-text-p-f-secrecy-label').value + ' ' + 
              elem('ssleuth-text-p-f-secrecy').textContent + '\n' +
              elem('ssleuth-text-tls-version-label').value + ' ' + 
              elem('ssleuth-text-tls-version').textContent + '\n' +
              elem('ssleuth-text-conn-status').value + ' ' + 
              elem('ssleuth-text-ff-connection-status').textContent + '\n';
             
      str += elem('ssleuth-text-cert-label').value + '\n\t' + 
              elem('ssleuth-text-cert-ev').value + ' ' + 
              elem('ssleuth-text-cert-extended-validation').textContent + '\n\t' +
              elem('ssleuth-text-cert-sigalg-text').value + ' ' + 
              elem('ssleuth-text-cert-sigalg').textContent + '\n\t' + 
              elem('ssleuth-text-cert-pub-key-text').value + ' ' + 
              elem('ssleuth-text-cert-pub-key').textContent + '\n\t' +
              elem('ssleuth-text-cert-cn-label').value + ' ' +
              elem('ssleuth-text-cert-common-name').textContent + '\n\t' +
              elem('ssleuth-text-cert-issuedto').value + ' ' +
              elem('ssleuth-text-cert-org').textContent + ' ' + 
              elem('ssleuth-text-cert-org-unit').textContent + '\n\t' + 
              elem('ssleuth-text-cert-issuedby').value + ' ' +
              elem('ssleuth-text-cert-issuer-org').textContent + ' ' + 
              elem('ssleuth-text-cert-issuer-org-unit').textContent + '\n\t' + 
              elem('ssleuth-text-cert-validity-text').value + ' ' +
              elem('ssleuth-text-cert-validity').textContent + '\n\t' +
              elem('ssleuth-text-cert-fingerprint-label').value + ' ' +
              elem('ssleuth-text-cert-fingerprint').textContent ; 
      break;

    default:
      break;

  }
  clipboardHelper.copyString(str);

  } catch (e) {
    dump ('copyToClipboard error ' + e.message + '\n'); 
  }

}

function getRatingClass(rating) {
  var rank = 'default';
  if (rating <= -1) {
    rank = 'default';
  } else if (rating < 5) {
    rank = 'low';
  } else if (rating < 7) {
    rank = 'medium';
  } else if (rating < 9) {
    rank = 'high';
  } else if (rating <= 10) {
    rank = 'vhigh';
  }
  return rank; 
}

function _fmt(n) {
  if (isNaN(n)) return n; 

  // Check if we need decimals 
  return ( (String(n).indexOf('.') != -1)? 
    Number(n).toLocaleString(undefined, {minimumFractionDigits: 1}):
    Number(n).toLocaleString() );
}

function create(doc, elem, attrs) {
  // createElement() Regex warnings are targeting 'script' elements.
  // https://bugzilla.mozilla.org/show_bug.cgi?id=625690
  // I don't do script here.
  var e = doc.createElement(elem);
  for (var [atr, val] in Iterator(attrs)) {
    e.setAttribute(atr, val);
  }
  return e;
}
