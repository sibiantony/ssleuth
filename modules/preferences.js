"use strict";

var EXPORTED_SYMBOLS = ["ssleuthPreferences", 
							"PrefListener"]; 

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://ssleuth/cipher-suites.js");

var ssleuthDefaultPrefs = {
	PREF_BRANCH : "extensions.ssleuth.", 
	PREFS : {
		"notifier.location" 	: 0,
		"panel.fontsize" 		: 1, 
		"ui.keyshortcut" 		: "control shift }",
		"rating.params"	 		: ssleuthConnectionRating,
		"rating.ciphersuite.params"	: ssleuthCipherSuites.weighting,
		"suites.toggle" 		: ffToggleDefault,
   }
}; 

var ssleuthPreferences = {
	prefBranch : ssleuthDefaultPrefs.PREF_BRANCH, 
	prefService: null, 

	init : function() {
		this.setDefaultPreferences(); 
		this.prefService = 
			Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
	},

	uninit: function() {
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
				case "object" :
					branch.setCharPref(key, JSON.stringify(val));
			}
		}
	},

	openDialog : function(index) {
		let application = 
			Cc["@mozilla.org/fuel/application;1"].getService(Ci.fuelIApplication);
		application.storage.set("ssleuth.prefwindow.tabindex", index); 

		const win = _window(); 

		if (null == this.prefsTab || this.prefsTabWin.closed) {
			var prefsTab =
				win.gBrowser.loadOneTab(
					"chrome://ssleuth/content/preferences.xul",
					{inBackground: false});
			this.prefsTab = prefsTab; 
			this.prefsTabWin = win; 
			prefsTab.addEventListener("TabClose", function() {
						ssleuthPreferences.prefsTab = null; 
						ssleuthPreferences.prefsTabWin = null; 
						}, false); 
			win.addEventListener("unload", function() {
						ssleuthPreferences.prefsTab = null; 
						ssleuthPreferences.prefsTabWin = null; 
						}, false); 
		} else {
			this.prefsTabWin.gBrowser.selectedTab = this.prefsTab; 
			this.prefsTabWin.focus();
		}
		/* var event = new this.prefsTabWin.CustomEvent("ssleuth-prefwindow-focus",
							{"detail": index}); */
		// var event = this.prefsTabWin.document.createEvent("CustomEvent");
		// event.initCustomEvent("ssleuth-prefwindow-focus", true, true, {}); 
		var prefWin = this.prefsTabWin; 

		this.prefsTab.addEventListener("load", function() {
			var event = new prefWin.CustomEvent("ssleuth-prefwindow-focus"); 
			prefWin.dispatchEvent(event);
		}, false); 
	}, 


	closeDialog: function() {
		const prefsTab = this.prefsTab; 
		if (prefsTab && !prefsTab.closed) {
			prefsTab.close();
		}
	},

	readInitPreferences: function() {
		const prefs = ssleuthPreferences.prefService;
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
				case "object":
					sp.PREFS[key] = JSON.parse(prefs.getCharPref(sp.PREF_BRANCH+key));
			}
		}
		return sp; 
	}
}; 

function PrefListener(branch_name, callback) {
	var prefService = Cc["@mozilla.org/preferences-service;1"]
		.getService(Ci.nsIPrefService);
	this._branch = prefService.getBranch(branch_name);
	this._branch.QueryInterface(Ci.nsIPrefBranch2);
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

/* Move to utils ? */
function _window() {
	return Services.wm.getMostRecentWindow("navigator:browser");
}

