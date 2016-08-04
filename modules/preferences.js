'use strict';

var EXPORTED_SYMBOLS = ['preferences'];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://ssleuth/cipher-suites.js');

var preferences = (function () {

    var defaultPreferences = {
        'notifier.location': 0,
        'panel.fontsize': 1,
        'ui.keyshortcut': 'control shift }',
        'ui.urlbar.colorize': false,
        'ui.notifier.colorize': false,
        'rating.params': ssleuthConnectionRating,
        'rating.ciphersuite.params': ssleuthCipherSuites.weighting,
        'suites.toggle': ffToggleDefault,
        'panel.info': {
            keyExchange: true,
            authAlg: true,
            bulkCipher: true,
            HMAC: true,
            certValidity: true,
            validityTime: false,
            certFingerprint: false
        },
        'domains.observe': true
    };

    var PREF_BRANCH = 'extensions.ssleuth.',
        prefService = Cc['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefBranch),
        _branch,
        _callback,
        prefsTab = null,
        prefsTabWin = null;

    var init = function (callback) {

        setDefaultPreferences();

        _branch = prefService.getBranch(PREF_BRANCH);
        _branch.QueryInterface(Ci.nsIPrefBranch2);
        _callback = callback;

        _branch.addObserver('', listener, false);

        return readInitPreferences();
    };

    var uninit = function () {
        closeTab();
        if (_branch) {
            _branch.removeObserver('', listener);
        }
    };

    var setDefaultPreferences = function () {
        let sp = defaultPreferences;
        let branch = Services.prefs.getDefaultBranch(PREF_BRANCH);
        for (let [key, val] in Iterator(sp)) {
            switch (typeof val) {
            case 'boolean':
                branch.setBoolPref(key, val);
                break;
            case 'number':
                branch.setIntPref(key, val);
                break;
            case 'string':
                branch.setCharPref(key, val);
                break;
            case 'object':
                branch.setCharPref(key, JSON.stringify(val));
            }
        }
    };

    var readInitPreferences = function () {
        var sp = defaultPreferences;
        for (let [key, val] in Iterator(sp)) {
            switch (typeof val) {
            case 'boolean':
                sp[key] = prefService.getBoolPref(PREF_BRANCH + key);
                break;
            case 'number':
                sp[key] = prefService.getIntPref(PREF_BRANCH + key);
                break;
            case 'string':
                sp[key] = prefService.getCharPref(PREF_BRANCH + key);
                break;
            case 'object':
                sp[key] = JSON.parse(prefService.getCharPref(PREF_BRANCH + key));
            }
        }
        return sp;
    };

    var openTab = function (index) {

        const win = Services.wm.getMostRecentWindow('navigator:browser');

        if (null == prefsTab || prefsTabWin.closed) {

            prefsTab = win.gBrowser.loadOneTab(
                'chrome://ssleuth/content/preferences.xul', {
                    inBackground: false
                });
            prefsTabWin = win;

            var prefsTabClosed = function (evt) {
                if (evt.target)
                    evt.target.removeEventListener('TabClose', prefsTabClosed);
                prefsTab = null;
                prefsTabWin = null;
            };

            prefsTab.addEventListener('TabClose', prefsTabClosed, false);
            win.addEventListener('unload', prefsTabClosed, false);

        } else {
            prefsTabWin.gBrowser.selectedTab = prefsTab;
            prefsTabWin.focus();
        }

        var event = new prefsTab.linkedBrowser
            .contentWindow.CustomEvent('ssleuth-prefwindow-index', {
                'detail': index
            });

        prefsTab.linkedBrowser.contentWindow.dispatchEvent(event);
        // This event won't be received for the first time - possible delay w.r.t 'load'
        // Doing a load event listener and sending the event will bring 
        // other problems
        //   - Will not receive the 'load' if the tab is already in focus.
        //   - Won't get the first event again, if we remove the event listener 
        //     from inside.
        // So send the tab index in a storage for the first time.
    };

    var closeTab = function () {
        if (prefsTab) {
            prefsTabWin.gBrowser.removeTab(prefsTab);
            prefsTab = null;
            prefsTabWin = null;
        }
    };

    var listener = {
        observe: function (subject, topic, data) {
            if (topic === 'nsPref:changed')
                _callback(_branch, data);
        }
    };

    return {
        init: init,
        uninit: uninit,
        openTab: openTab,
        PREF_BRANCH: PREF_BRANCH,
        prefService: prefService
    };

}());