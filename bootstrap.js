"use strict";

const Cu = Components.utils;
const Ci = Components.interfaces;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

// install & uninstall are called even for disabled extensions
function install(data, reason) {
}

function uninstall(data, reason) {
  registerResourceProtocol(data.resourceURI);

  // uninstall: remove storage, prefs
  if (reason === ADDON_UNINSTALL) { // updating=ADDON_UPGRADE
    var nw = {};
    Cu.import("resource://ssleuth/new-window.js", nw);
    nw.Bootstrap.extensionUninstall();
  }

  // update/uninstall: unload all modules
  unloadModules();
  registerResourceProtocol(null);
}

function startup(data, reason) {
  registerResourceProtocol(data.resourceURI);

  var firstRun = false;
  var reinstall = false;
  if (reason !== APP_STARTUP) {
    switch (reason) {
    case ADDON_INSTALL:
      firstRun = true;
      break;
    case ADDON_UPGRADE:
    case ADDON_DOWNGRADE:
      reinstall = true;
      break;
    }
  }

  var nw = {};
  Cu.import("resource://ssleuth/new-window.js", nw);
  nw.Bootstrap.extensionStartup(firstRun, reinstall);
}

function shutdown(data, reason) {
  if (reason === APP_SHUTDOWN) {
    return;
  }

  var nw = {};
  Cu.import("resource://ssleuth/new-window.js", nw);
  nw.Bootstrap.extensionShutdown();

  unloadModules();
  registerResourceProtocol(null);
}

function unloadModules() {
  Cu.unload("resource://ssleuth/panel.js");
  Cu.unload("resource://ssleuth/button.js");
  Cu.unload("resource://ssleuth/ssleuth.js");
  Cu.unload("resource://ssleuth/new-window.js");
}

function registerResourceProtocol(uri) { // null to unregister
  var io = Services.io;
  var module = uri ? io.newURI(uri.resolve("modules/"), null, null) : null;
  io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler)
      .setSubstitution("ssleuth", module);
}
