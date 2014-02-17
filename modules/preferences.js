"use strict";

var EXPORTED_SYMBOLS = ["ssleuthPreferences"]; 

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://ssleuth/cipher-suites.js");

var ssleuthDefaultPrefs = {
	PREF_BRANCH : "extensions.ssleuth.", 
	PREFS : {
		"notifier.location" : 0,
		"panel.fontsize" : 1, 
		"ui.keyshortcut" : "control shift }",
		"rating.params"	 : ssleuthConnectionRating
   }
}; 

var ssleuthPreferences = {

	init : function() {
		this.setDefaultPreferences(); 
		/* Set trigger=false, or else preferences setting
		 * 	will conflict with a UI init. This is because, the overlay will
		 * 	not be merged immediately and is notified asynchronously.*/
		ssleuthPrefListener.register(false);

		return this.readInitPreferences(); 
	},

	uninit: function() {
		ssleuthPrefListener.unregister(); 
		this.closeDialog(); 
	},

	setDefaultPreferences: function() {
		let sp = ssleuthDefaultPrefs; 
		let branch = Services.prefs.getDefaultBranch(sp.PREF_BRANCH);
		for (let [key, val] in Iterator(sp.PREFS)) {
			switch (typeof val) {
				case "boolean":
					branch.setBoolPref(key, val);
					break;
				case "number":
					branch.setIntPref(key, val);
					break; 
				case "string":
					branch.setCharPref(key, val);
					break;
				default :
					dump("setDefaultPreferences Unknown preference: " + val); 
					branch.setCharPref(key, JSON.stringify(val));
			}
		}
	},

	openDialog : function(index) {
		let application = 
			Cc["@mozilla.org/fuel/application;1"].getService(Ci.fuelIApplication);
		const win = _window(); 
		var prefsWindow = win.document.getElementById("ssleuth-preferences"); 

		if (null == prefsWindow || prefsWindow.closed) {
			const instantApply =
				application.prefs.get("browser.preferences.instantApply");
			const features =
				"chrome,titlebar,toolbar,centerscreen" +
				(instantApply.value ? ",dialog=no" : ",modal");
			prefsWindow =
				win.openDialog(
				"chrome://ssleuth/content/preferences.xul",
				"ssleuth-preferences-window", features, 
				{tabIndex: index});
		}
		prefsWindow.focus();
		this.prefsWindow = prefsWindow; 
	}, 

	closeDialog: function() {
		const prefsWindow = this.prefsWindow; 
		if (prefsWindow && !prefsWindow.closed) {
			prefsWindow.close();
		} 
	},

	readInitPreferences: function() {
		const prefs =
			Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
		var sp = ssleuthDefaultPrefs; 
		for (let [key, val] in Iterator(sp.PREFS)) {
			switch (typeof val) {
				case "boolean":
					sp.PREFS[key] = prefs.getBoolPref(sp.PREF_BRANCH+key);
					break;
				case "number":
					sp.PREFS[key] = prefs.getIntPref(sp.PREF_BRANCH+key);
					break; 
				case "string":
					sp.PREFS[key] = prefs.getCharPref(sp.PREF_BRANCH+key);
					break;
				default :
					dump("setDefaultPreferences Unknown preference: " + val + "\n"); 
					sp.PREFS[key] = JSON.parse(prefs.getCharPref(sp.PREF_BRANCH+key));
			}
		}
		return sp; 
	}		
}; 

function PrefListener(branch_name, callback) {
	var prefService = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService);
	this._branch = prefService.getBranch(branch_name);
	this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
	this._callback = callback;
}

PrefListener.prototype.observe = function(subject, topic, data) {
	if (topic == 'nsPref:changed')
		this._callback(this._branch, data);
};

/**
 * @param {boolean=} trigger if true triggers the registered function
 *	 on registration, that is, when this method is called.
 */
PrefListener.prototype.register = function(trigger) {
	this._branch.addObserver('', this, false);
	if (trigger) {
		let that = this;
		this._branch.getChildList('', {}).
			forEach(function (pref_leaf_name) { 
				that._callback(that._branch, pref_leaf_name); 
			});
	}
};

PrefListener.prototype.unregister = function() {
	if (this._branch)
		this._branch.removeObserver('', this);
};

var ssleuthPrefListener = new PrefListener(
	ssleuthDefaultPrefs.PREF_BRANCH, 	
	function(branch, name) {
		switch (name) {
			case "notifier.location":
				/* Changing the notifier location requires tearing down
				 * everything. Button, panel.. and the panel overlay!
				 */
				forEachOpenWindow(function(win) {
					ssleuthUI.uninit(win); 
				}); 
			
				forEachOpenWindow(function(win) {
					ssleuthUI.init(win); 
				}); 
				break;
			case "panel.fontsize":
				forEachOpenWindow(function(win) {
					setPanelFont(branch.getIntPref(name), win.document); 
				}); 
				break;
			case "ui.keyshortcut":
				forEachOpenWindow(function(win) {
					deleteKeyShortcut(win.document); 
					createKeyShortcut(win.document); 
				}); 
				break;
			case "rating.params": 
				ssleuthPreferences.ratingParams = 
						JSON.parse(branch.getCharPref(name));
		}
	}
);

/* Move to utils ? */
function _window() {
	return Cc["@mozilla.org/embedcomp/window-watcher;1"]
						.getService(Components.interfaces.nsIWindowWatcher)
						.activeWindow; 
}
function forEachOpenWindow(todo)  // Apply a function to all open browser windows
{
	var windows = Services.wm.getEnumerator("navigator:browser");
	while (windows.hasMoreElements())
		todo(windows.getNext().QueryInterface(Components.interfaces.nsIDOMWindow));
}

Components.utils.import("resource://ssleuth/ssleuth-ui.js");
