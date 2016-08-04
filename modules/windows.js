var EXPORTED_SYMBOLS = ['listener', 'windows'];

const {
    classes: Cc,
    interfaces: Ci,
    utils: Cu
} = Components;

Cu.import('resource://ssleuth/observer.js');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://ssleuth/utils.js');

/*
 * Listener for messages from framescript, 
 * listener for tab close events.
 */
var listener = function (win) {
    'use strict';

    var browserMM;

    var init = function () {
        win.gBrowser.tabContainer.addEventListener('TabOpen', onTabOpen, false);

        windows.onUnload(win, function () {
            win.gBrowser.tabContainer.removeEventListener('TabOpen', onTabOpen);
            if (browserMM)
                browserMM.removeMessageListener('ssleuth@github:tab-close', onTabClose);
        });
    };

    var onTabClose = function (msg) {
        if (browserMM)
            browserMM.removeMessageListener('ssleuth@github:tab-close', onTabClose);
        if (observer)
            observer.deleteLoc(msg.data.id);
    };

    var onTabOpen = function (evt) {
        var browser = win.gBrowser.getBrowserForTab(evt.target);
        browserMM = browser.messageManager;

        browserMM.addMessageListener('ssleuth@github:tab-close', onTabClose, true);
    };

    var getFrameMessage = function (callback) {
        var mm = win.gBrowser.selectedBrowser.messageManager;

        // As per MDN 'if the same listener registers twice for the same message, the second
        // registration is ignored'. This works despite multiple message registrations.
        var frameMessageListener = function (msg) {

            mm.removeMessageListener('ssleuth@github:win-id', frameMessageListener);
            callback(msg.data);
        };

        mm.addMessageListener('ssleuth@github:win-id', frameMessageListener);
        win.gBrowser.selectedBrowser.messageManager.sendAsyncMessage('ssleuth@github:win-id', {});
    };

    return {
        init: init,
        getFrameMessage: getFrameMessage
    };

};

var windows = (function () {
    'use strict';

    const type = 'navigator:browser';
    var initCallback, uninitCallback,
        unloaders = [];

    var init = function (_initCallback, _uninitCallback) {
        initCallback = _initCallback;
        uninitCallback = _uninitCallback;

        forEachWindow(initCallback);

        Services.wm.addListener(windowListener);
    };

    var uninit = function () {

        unloaders.slice().forEach(function (unloader) {
            // TODO : If the unloader has already been called
            // previously when a window was closed, this becomes
            // a duplicate call. Optimize using indexes and remove
            // callbacks from unloaders upon invocation.
            unloader();
        });
        unloaders.length = 0;

        forEachWindow(uninitCallback);
        Services.wm.removeListener(windowListener);
    };

    // Apply a function to each open browser window 
    var forEachWindow = function (callback) {
        var browserWindows = Services.wm.getEnumerator(type);
        while (browserWindows.hasMoreElements())
            callback(browserWindows.getNext().QueryInterface(Ci.nsIDOMWindow));
    };

    var windowListener = {
        onOpenWindow: function (xulWindow) {
            var window = xulWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                .getInterface(Ci.nsIDOMWindow);

            function onWindowLoad() {
                window.removeEventListener('load', onWindowLoad);
                if (window.document.documentElement
                    .getAttribute('windowtype') === type)
                    initCallback(window);
            }
            window.addEventListener('load', onWindowLoad);
        },

        onCloseWindow: function (xulWindow) {
            var window = xulWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                .getInterface(Ci.nsIDOMWindow);

            if (window.document.documentElement
                .getAttribute('windowtype') === type)
                uninitCallback(window);
        }
    };

    var onUnload = function (win, callback) {
        unloaders.push(callback);

        function unloadListener() {
            win.removeEventListener('unload', unloadListener);
            var index = unloaders.indexOf(callback);
            if (index !== -1) {
                unloaders.splice(index, 1);
            }

            callback();
        };

        win.addEventListener('unload', unloadListener);
    };

    return {
        init: init,
        uninit: uninit,
        onUnload: onUnload,
        get recentWindow() {
            return Services.wm.getMostRecentWindow(type);
        }
    };

}());