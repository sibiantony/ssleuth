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
    var ss = {};
    Cu.import("resource://ssleuth/ssleuth.js", ss);
    ss.SSleuth.extensionUninstall();
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

  try {
    var ss = {};
    Cu.import("resource://ssleuth/ssleuth.js", ss);
    ss.SSleuth.extensionStartup(firstRun, reinstall);
  } catch(e) { dump("Error bootstrap : " + e.message + "\n");}
}

function shutdown(data, reason) {
  if (reason === APP_SHUTDOWN) {
    return;
  }

  var ss = {};
  Cu.import("resource://ssleuth/ssleuth.js", ss);
  ss.SSleuth.extensionShutdown();

  unloadModules();
  registerResourceProtocol(null);
}

function unloadModules() {
  for (var module of ["preferences.js", 
                        "cipher-suites.js",
                        "utils.js", 
                        "ssleuth-ui.js",
                        "observer.js",
                        "ssleuth.js"])
  Cu.unload("resource://ssleuth/" + module);
}

function registerResourceProtocol(uri) { // null to unregister
  var io = Services.io;
  var module = uri ? io.newURI(uri.resolve("modules/"), null, null) : null;
  io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler)
      .setSubstitution("ssleuth", module);
}
