(function () {
    "use strict";

    const Ci = Components.interfaces;
    var windowId = content.QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIDOMWindowUtils).outerWindowID;

    var scriptId = null;

    var cleanup = function () {
        removeEventListener("unload", onUnload);
        removeMessageListener("ssleuth@github:shutdown", onShutdown);
        removeMessageListener("ssleuth@github:win-id", sendWindowId);
    };

    var onShutdown = function (msg) {
        // Unload only if the script id matches. Workaround for bug 1202125
        if (msg.data.id === scriptId)
            cleanup();
    };

    var onUnload = function (evt) {

        sendAsyncMessage("ssleuth@github:tab-close", {
            id: windowId
        });

        cleanup();

    };

    var onScriptId = function (msg) {
        removeMessageListener("ssleuth@github:script-id", onScriptId);
        scriptId = msg.data.id;
    };

    var sendWindowId = function (evt) {
        var url = content.location,
            urlScheme = url.protocol.split(':')[0];

        sendAsyncMessage("ssleuth@github:win-id", {
            id: windowId,
            scheme: urlScheme,
            uri: url.toString()
        });

    };

    addEventListener("unload", onUnload);
    addMessageListener("ssleuth@github:script-id", onScriptId);
    addMessageListener("ssleuth@github:shutdown", onShutdown);
    addMessageListener("ssleuth@github:win-id", sendWindowId);

}());