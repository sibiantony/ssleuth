'use strict';

const Cu = Components.utils;
const Ci = Components.interfaces;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');

const scriptId = Date.now(),
    framescriptURI = 'chrome://ssleuth/content/framescript.js?' + scriptId;

// install & uninstall are called even for disabled extensions
function install(data, reason) {}

function uninstall(data, reason) {
    registerResourceProtocol(data.resourceURI);

    // uninstall: remove storage, prefs
    // updating=ADDON_UPGRADE
    if (reason === ADDON_UNINSTALL) {
        var ss = {};
        Cu.import('resource://ssleuth/ssleuth.js', ss);
        ss.ssleuth.uninstall();
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

        // Load framescript into all existing and future windows.
        Services.mm.loadFrameScript(framescriptURI, true);

        Services.mm.broadcastAsyncMessage('ssleuth@github:script-id', {
            id: scriptId
        });

        Cu.import('resource://ssleuth/ssleuth.js', ss);

        ss.ssleuth.startup(firstRun, reinstall);

    } catch (e) {
        dump('Error bootstrap : ' + e.message + '\n');
    }
}

function shutdown(data, reason) {
    if (reason === APP_SHUTDOWN)
        return;

    try {
        var ss = {};

        // Do not load framescripts any more to new windows
        Services.mm.removeDelayedFrameScript(framescriptURI);

        // Unload existing ones with a script id
        // bug 1202125, bug 1051238
        Services.mm.broadcastAsyncMessage('ssleuth@github:shutdown', {
            id: scriptId
        });

        Cu.import('resource://ssleuth/ssleuth.js', ss);
        ss.ssleuth.shutdown();

        unloadModules();
        registerResourceProtocol(null);
    } catch (e) {
        dump("Error shutdown bootstrap " + e.message + "\n");
    }
}

function unloadModules() {
    for (var module of['preferences.js',
            'cipher-suites.js',
            'panel.js',
            'ssleuth-ui.js',
            'observer.js',
            'ssleuth.js',
            'windows.js',
            'utils.js',
            ]) {
        Cu.unload('resource://ssleuth/' + module);
    }
}

function registerResourceProtocol(uri) { // null to unregister
    var io = Services.io;
    var module = uri ? io.newURI(uri.resolve('modules/'), null, null) : null;

    io.getProtocolHandler('resource').QueryInterface(Ci.nsIResProtocolHandler)
        .setSubstitution('ssleuth', module);
}