"use strict";

var EXPORTED_SYMBOLS = ["SSleuthUI"]

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

Components.utils.import("resource://ssleuth/utils.js");
Components.utils.import("resource://ssleuth/cipher-suites.js");
Components.utils.import("resource://ssleuth/preferences.js");
Components.utils.import("resource://ssleuth/observer.js");
Components.utils.import("resource://ssleuth/panel.js");

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

  init: function (window) {
    this.ssleuthBtnLocation = this.prefs.PREFS["notifier.location"];
    var ssleuthButton = createButton(window);
    installButton(ssleuthButton,
      true,
      window.document);

    createPanelMenu(window.document);

    createKeyShortcut(window.document);

    var ssleuthPanel = _ssleuthPanel(window);
    var panelVbox = SSleuthPanel(window);
    ssleuthPanel.appendChild(panelVbox);
    setPanelFont(this.prefs.PREFS["panel.fontsize"], window.document);
    // TODO : Optimize this handlings. Only when HTTP obs enabled ?
    //        Do init in preferences handler ?
    initDomainsPanel(window.document);
    initCiphersPanel(window.document);
    initPanelPreferences(window.document);
  },

  uninit: function (window) {
    // Cleanup everything! 
    // Removing the button deletes the overlay elements as well 
    try {
      removePanelMenu(window.document);
      removeButton(_ssleuthButton(window));
      deleteKeyShortcut(window.document);
    } catch (e) {
      dump("Error SSleuth UI uninit : " + e.message + "\n");
    }
  },

  onLocationChange: function (window, urlChanged) {
    // The document elements are not available until a 
    // successful init. So we need to add the child panel
    // for the first time 
    if (!window) return;

    // If the user is navigating with the domains tab
    // reload the data.
    loadDomainsTab();

    // If the user navigates the tabs with the panel open, 
    //  make it appear smooth. 
    var ssleuthPanel = _ssleuthPanel(window);
    if (ssleuthPanel.state == "open") {
      showPanel(ssleuthPanel, true);
    }

  },

  protocolChange: function (proto, data, win) {
    var doc = win.document;
    switch (proto) {

    case "unknown":
      setButtonRank(-1, win);
      setBoxHidden("https", true, win);
      setBoxHidden("http", true, win);
      doc.getElementById('ssleuth-img-cipher-rank-star').hidden = true;
      break;

    case "http":
      setButtonRank(-1, win);
      setBoxHidden("https", true, win);
      setBoxHidden("http", false, win);
      doc.getElementById('ssleuth-img-cipher-rank-star').hidden = true;

      var panelLink = doc.getElementById("ssleuth-panel-https-link");
      panelLink.href = data;
      panelLink.setAttribute("value", data);
      break;

    case "https":
      setBoxHidden("https", false, win);
      setBoxHidden("http", true, win);
      doc.getElementById('ssleuth-img-cipher-rank-star').hidden = false;
      break;
    }
    
    //doc.getElementById('ssleuth-panel-domains-vbox')
    //  .setAttribute('maxheight', doc.getElementById('ssleuth-panel-main-vbox').scrollHeight); 
    //dump ("Box height -- " + 
    //  doc.getElementById('ssleuth-panel-main-vbox').scrollHeight + "\n");
  },

  onStateStop : function (tab, win) {
    showCrossDomainRating(tab, win);
  }, 

  fillPanel: function (connectionRank,
                        cipherSuite,
                        securityState,
                        cert,
                        domMismatch,
                        ev,
                        win) {
    setButtonRank(connectionRank, win);
    panelConnectionRank(connectionRank, win);

    showCipherDetails(cipherSuite, win);
    showPFS(cipherSuite.pfs, win);
    showFFState(securityState, win);
    showCertDetails(cert, domMismatch, ev, win);
    showTLSVersion(win); 
    //TODO : Fix tab param
    showCrossDomainRating(-1, win); 
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

function _ssleuthButton(window) {
  const ui = SSleuthUI;
  const win = window;
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

function _ssleuthPanel(window) {
  return window.document.getElementById("ssleuth-panel");
}

function loadStyleSheet() {
  var sss = Cc["@mozilla.org/content/style-sheet-service;1"]
    .getService(Components.interfaces.nsIStyleSheetService);
  var ios = Cc["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);
  var uri = ios.newURI("chrome://ssleuth/skin/ssleuth.css", null, null);
  if (!sss.sheetRegistered(uri, sss.USER_SHEET))
    sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
}

function removeStyleSheet() {
  var sss = Cc["@mozilla.org/content/style-sheet-service;1"]
    .getService(Components.interfaces.nsIStyleSheetService);
  var ios = Cc["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);
  var uri = ios.newURI("chrome://ssleuth/skin/ssleuth.css", null, null);
  if (sss.sheetRegistered(uri, sss.USER_SHEET))
    sss.unregisterSheet(uri, sss.USER_SHEET);
}

function createPanel(panelId, position, window) {
  var panel = create(window.document, 'panel', {
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

function createButton(window) {
  try {
    const doc = window.document;
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
      panelPosition, window));

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
    .textContent = (rank + "/10");
}

function setButtonRank(connectionRank, win) {
  var buttonRank = "default";
  var doc = win.document;

  if (connectionRank <= -1) {
    buttonRank = "default";
  } else if (connectionRank < 5) {
    buttonRank = "low";
  } else if (connectionRank < 7) {
    buttonRank = "medium";
  } else if (connectionRank < 9) {
    buttonRank = "high";
  } else if (connectionRank <= 10) {
    buttonRank = "vhigh";
  }

  _ssleuthBtnImg(win).setAttribute("rank", buttonRank);

  if (SSleuthUI.ssleuthBtnLocation == SSleuthUI.ssleuthLoc.URLBAR) {
    var ssleuthUbRank = doc.getElementById("ssleuth-ub-rank");

    ssleuthUbRank.setAttribute("rank", buttonRank);
    if (connectionRank != -1) {
      ssleuthUbRank.textContent = String(Number(connectionRank).toFixed(1));
    } else {
      ssleuthUbRank.textContent = "";
    }
    _ssleuthButton(win).setAttribute("rank", buttonRank);
    // TODO : (SSleuthUI.prefs.PREFS['ui.urlbar.colorize'] ? 'blank' : buttonRank)); 
  }

  // URL bar background gradient
  doc.getElementById("urlbar").setAttribute("_ssleuthrank", 
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
    (rating + "/" + rp.cipherSuite);

  doc.getElementById("ssleuth-text-cipher-suite-kxchange").textContent =
    (cipherSuite.keyExchange.ui + '.');
  doc.getElementById("ssleuth-text-cipher-suite-auth").textContent =
    (cipherSuite.authentication.ui + '. ');

  doc.getElementById("ssleuth-text-cipher-suite-bulkcipher").textContent =
    (cipherSuite.bulkCipher.ui + " " + cipherSuite.cipherKeyLen + " bits.");
  doc.getElementById("ssleuth-text-cipher-suite-bulkcipher-notes").textContent =
    cipherSuite.bulkCipher.notes;
  doc.getElementById("ssleuth-text-cipher-suite-hmac").textContent =
    (cipherSuite.HMAC.ui + ". ");
  doc.getElementById("ssleuth-text-cipher-suite-hmac-notes").textContent =
    cipherSuite.HMAC.notes;

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
  pfsRating.textContent = rating + "/" + rp.pfs;

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
  doc.getElementById("ssleuth-text-ff-connection-status").textContent = state;
  const statusRating = doc.getElementById("ssleuth-ff-connection-status-rating");
  var brokenText = doc.getElementById("ssleuth-text-ff-connection-status-broken");

  var rating = Number(((state == "Secure") ? 1 : 0) * rp.ffStatus).toFixed(1);
  statusRating.textContent = rating + "/" + rp.ffStatus;

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
  evRating.textContent = rating + "/" + rp.evCert;

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
    " till " + validity.notAfterGMT;
  else
    certValidity.textContent = validity.notBeforeLocalDay +
    " till " + validity.notAfterLocalDay;

  doc.getElementById("ssleuth-text-cert-domain-mismatch").hidden = !domMismatch;

  var rating = (Number(cert.isValid && !domMismatch) * rp.certStatus).toFixed(1);
  certRating.textContent = rating + "/" + rp.certStatus;

  if (cert.isValid && !domMismatch) {
    doc.getElementById("ssleuth-img-cert-state").setAttribute("state", "good");
  } else {
    doc.getElementById("ssleuth-img-cert-state").setAttribute("state", "bad");
  }

  // Need to localize 'bits'. XUL - may not need ids. 
  doc.getElementById("ssleuth-text-cert-pub-key")
    .textContent = (cert.pubKeySize + " bits " + cert.pubKeyAlg);
  doc.getElementById("ssleuth-text-cert-pub-key")
    .setAttribute("secure", cert.pubKeyMinSecure.toString());

  doc.getElementById("ssleuth-text-cert-sigalg")
    .textContent = cert.signatureAlg.hmac + "/" + cert.signatureAlg.enc;
  rating = Number(cert.signatureAlg.rating * rp.signature / 10).toFixed(1);
  doc.getElementById('ssleuth-cert-sigalg-rating')
    .textContent = rating + "/" + rp.signature;

  doc.getElementById("ssleuth-text-cert-fingerprint")
    .textContent = svCert.sha1Fingerprint;

  doc.getElementById("ssleuth-text-cert-validity-box").hidden = !(panelInfo.certValidity);
  doc.getElementById("ssleuth-text-cert-fingerprint").hidden = !(panelInfo.certFingerprint);
}

function showTLSVersion(win) {
  var doc = win.document; 
  var tab = win.gBrowser.selectedBrowser._ssleuthTabId;
  var tlsIndex = 'ff_cache';

  if ( SSleuthHttpObserver.responseCache[tab].tlsVersion ) 
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
  var domainsRating = '...';
  if (tab == -1) 
    tab = win.gBrowser.selectedBrowser._ssleuthTabId;

  if ( SSleuthHttpObserver.responseCache[tab].domainsRating ) {
    domainsRating = SSleuthHttpObserver.responseCache[tab].domainsRating;
  }

  doc.getElementById("ssleuth-text-domains-rating-numeric").textContent = 
    ' | domains avg : ' + domainsRating; 
  doc.getElementById('ssleuth-text-domains-rating-numeric').setAttribute
      ('rank', getRatingClass(domainsRating));
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
        for (var rd of["Default", "Enable", "Disable"]) {
          var m_item = create(doc, 'menuitem', {
            type: 'radio',
            label: rd,
            value: rd.toLowerCase(),
            checked: (csList[i].state === rd.toLowerCase())
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
    label: 'Preferences'
  }));
  menupopup.appendChild(doc.createElement("menuseparator"));
  menupopup.appendChild(create(doc, 'menuitem', {
    id: 'ssleuth-menu-cs-reset-all',
    label: 'Reset All'
  }));
  menupopup.appendChild(create(doc, 'menuitem', {
    id: 'ssleuth-menu-cs-custom-list',
    label: 'Custom list'
  }));
  menupopup.appendChild(doc.createElement("menuseparator"));
  menupopup.appendChild(create(doc, 'menuitem', {
    id: 'ssleuth-menu-open-about',
    label: 'About'
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
  var panelPref = doc.getElementById('ssleuth-paneltab-pref-box'); 
  panelPref.addEventListener('click', function() {
    SSleuthPreferences.openTab(0);
    togglePanel(_ssleuthPanel(_window()));
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
    // dump ("Box height -- " + 
    //  doc.getElementById('ssleuth-panel-main-vbox').scrollHeight + "\n");

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
              str += 'txt: ';
              break;
            case 'image':
              str += 'img: ';
              break;
            case 'application':
              str += 'app: ';
              break;
            case 'audio':
              str += 'aud: ';
              break;
            case 'video':
              str += 'vid: ';
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
            str = stats['cxRating'] + '   ' + stats['cipherName'];
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
        if (stats['cxRating'] < 0) {
          cipherRating = 'default';
        } else if (stats['cxRating'] < 5) {
          cipherRating = 'low';
        } else if (stats['cxRating'] < 7) {
          cipherRating = 'medium';
        } else if (stats['cxRating'] < 9) {
          cipherRating = 'high';
        } else if (stats['cxRating'] <= 10) {
          cipherRating = 'vhigh';
        }
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

      for (var rd of["Default", "Enable", "Disable"]) {
        var mi = m_popup.appendChild(create(doc, 'menuitem', {
          label: rd,
          value: rd.toLowerCase()
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
