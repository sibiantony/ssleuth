"use strict";

var EXPORTED_SYMBOLS = ["Bootstrap", "forEachOpenWindow"];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://ssleuth/ssleuth.js");

var Bootstrap = {

	extensionStartup: function(firstRun, reinstall) {
		forEachOpenWindow(initWindow); 
		Services.wm.addListener(WindowListener); 
	},

	extensionShutdown: function() {
		forEachOpenWindow(unloadWindow); 
		Services.wm.removeListener(WindowListener); 
	},

	extensionUninstall: function() {
	}

};

function initWindow(window) {
	dump("\n New window callback"); 
	try {
		ssleuth.init(window); 
	} catch(ex) {
		dump("\n Error ssleuth init: " + ex.message + "\n"); 
	}

}
function unloadWindow(window) {
	dump("\n Shutdown \n"); 

	ssleuth.uninit(window); 

}
function forEachOpenWindow(todo)  // Apply a function to all open browser windows
{
	var windows = Services.wm.getEnumerator("navigator:browser");
	while (windows.hasMoreElements())
		todo(windows.getNext().QueryInterface(Components.interfaces.nsIDOMWindow));
}
var WindowListener =
{
	onOpenWindow: function(xulWindow)
	{
		var window = 
			xulWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
							  .getInterface(Components.interfaces.nsIDOMWindow);
		function onWindowLoad()
		{
			window.removeEventListener("load",onWindowLoad);
			if (window.document.documentElement.getAttribute("windowtype") == "navigator:browser")
				initWindow(window);
		}
		window.addEventListener("load",onWindowLoad);
	},
	onCloseWindow: function(xulWindow) { },
	onWindowTitleChange: function(xulWindow, newTitle) { }
};
