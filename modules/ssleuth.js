"use strict";

var EXPORTED_SYMBOLS = ["ssleuth"];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://ssleuth/cipher-suites.js"); 
Components.utils.import("resource://ssleuth/ssleuth-ui.js");
Components.utils.import("resource://ssleuth/utils.js");
Components.utils.import("resource://ssleuth/preferences.js");

var ssleuth = {
	prevURL: null,
	urlChanged: false,
	prefs: null, 
	prefRegistered : false,

	init: function(window) {

		dump("\nssleuth init \n"); 
		// Handle exceptions while init(). If the panel
		// is not properly installed for the buttons, the mainPopupSet 
		// panel elements will wreak havoc on the browser UI. 
		try {
			dump ("\nSSleuth init \n"); 
			window.gBrowser.addProgressListener(this);
			this.prefs = ssleuthPreferences.readInitPreferences(); 
			if (!this.prefRegistered) {
				prefListener.register(false); 
				this.prefRegistered = true; 
			}
			ssleuthUI.init(window); 
		} catch(e) {
			dump("\nError : " + e.message + "\n"); 
			this.uninit();
		}
	},

	uninit: function(window) {
		dump("\nUninit \n");
		ssleuthUI.uninit(window); 
		prefListener.unregister(); 
		window.gBrowser.removeProgressListener(this);
	},

	onLocationChange: function(aProgress, aRequest, aURI) {
		/* FIXME: This might throw error during startup with ff29! 
		 * 	Modified - Test! */
		var win = Services.wm.getMostRecentWindow("navigator:browser"); 
		if (win == null) {
			dump("Window is null\n"); 
			return;
		}

		dump("\n============================== \n"); 
		dump("onLocation change \n"); 
		if (aURI.spec == this.prevURL) {
			this.urlChanged = false; 
			return; 
		}
		this.urlChanged = true; 
		this.prevURL = aURI.spec; 

		ssleuthUI.onLocationChange(win); 
	},
	onProgressChange: function() {
		return;
	},
	onStatusChange: function() {
		return;
	},

    /* QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]), */

	onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {
		return; 
    },

	onSecurityChange: function(aWebProgress, aRequest, aState) {
		var win = Services.wm.getMostRecentWindow("navigator:browser");

		/* Get rid of this !! */
		var loc = win.content.location;

		dump("\nonSecurityChange: " + loc.protocol + "\n"); 
		if (loc.protocol == "https:" ) {
			try {
				protocolHttps(aWebProgress, aRequest, aState, win);
			} catch (e) {
				dump("Failed protocolHttps : " + e.message + "\n"); 
			}
		} else if(loc.protocol == "http:" ) {
			protocolHttp(loc);
		} else {
			protocolUnknown(); 
		}
	}
}; 

function protocolUnknown() {
	setButtonRank(-1); 
	setBoxHidden("http", true); 
	setBoxHidden("https", true); 
}

function protocolHttp(loc) {
	dump("\nprotocolHttp \n");
	setButtonRank(-1);
	setBoxHidden("https", true); 
	setBoxHidden("http", false); 

	var httpsURL = loc.toString().replace("http://", "https://"); 

	setHttpsLink(httpsURL); 
}

function protocolHttps(aWebProgress, aRequest, aState, win) {
	dump("\nprotocolHttps \n");
	const Cc = Components.classes; 
	const Ci = Components.interfaces;

	var secUI = win.gBrowser.securityUI; 
	setBoxHidden("https", false); 
	setBoxHidden("http", true); 

	if (secUI) {
		var sslStatus = secUI.SSLStatus; 
		if (!sslStatus) {
			dump("\nSSLStatus is null : Querying SSLstatus \n");
			secUI.QueryInterface(Ci.nsISSLStatusProvider); 
			if (secUI.SSLStatus) {
				sslStatus = secUI.SSLStatus; 
			}
			if (!sslStatus) {
				dump("\nSSLStatus is null \n");
				// 1. A rather annoying behaviour : Firefox do not seem to populate
				//  SSLStatus if a tab switches to a page with the same URL.
				//
				// 2. A page load event can fire even if there is 
				//  no connectivity and user attempts to reload a page. 
				//  The hidden=true should prevent stale values from getting 
				//  displayed 
				if (ssleuth.urlChanged) {
					setBoxHidden("https", true); 
				} 
				return; 
			}
		}
		
		const cs = ssleuthCipherSuites; 
		var securityState = "";
		var cipherName = sslStatus.cipherName; 
		var cipherSuite = null; 
		var keyLength = sslStatus.secretKeyLength; 
		var cert = sslStatus.serverCert;
		var extendedValidation = false;

		// Security Info - Firefox states
		if ((aState & Ci.nsIWebProgressListener.STATE_IS_SECURE)) {
			securityState = "Secure"; 
		} else if ((aState & Ci.nsIWebProgressListener.STATE_IS_INSECURE)) {
			securityState = "Insecure"; 
		} else if ((aState & Ci.nsIWebProgressListener.STATE_IS_BROKEN)) {
			securityState = "Broken"; 
		}

		if (aState & Ci.nsIWebProgressListener.STATE_IDENTITY_EV_TOPLEVEL) {
			extendedValidation = true; 
		}
		var domainNameMatched = "No"; 
		if (!sslStatus.isDomainMismatch) {
			domainNameMatched = "Yes"; 
		}


		cipherSuite = {name: cipherName, 
						rank: cs.cipherSuiteStrength.LOW, 
						pfs: 0, 
						notes: "",
						signatureKeyLen: 0, 
						keyExchange: null, 
						authentication: null, 
						bulkCipher: null, 
						HMAC: null 
					}; 
						
		// Key exchange
		for (var i=0; i<cs.keyExchange.length; i++) {
			if((cipherName.indexOf(cs.keyExchange[i].name) != -1)) {
				cipherSuite.keyExchange = cs.keyExchange[i];
				cipherSuite.pfs = cs.keyExchange[i].pfs; 
				break; 
			}
		}

		// Authentication
		for (i=0; i<cs.authentication.length; i++) {
			if((cipherName.indexOf(cs.authentication[i].name) != -1)) {
				cipherSuite.authentication = cs.authentication[i];
				break; 
			}
		}

		// Bulk cipher
		for (i=0; i<cs.bulkCipher.length; i++) {
			if((cipherName.indexOf(cs.bulkCipher[i].name) != -1)) {
				cipherSuite.bulkCipher = cs.bulkCipher[i];
				break; 
			}
		}
		// HMAC
		for (i=0; i<cs.HMAC.length; i++) {
			if((cipherName.indexOf(cs.HMAC[i].name) != -1)) {
				cipherSuite.HMAC = cs.HMAC[i];
				break; 
			}
		}

		if (!cipherSuite.keyExchange) {
			cipherSuite.keyExchange = {name: "",
										rank: 10,
										pfs: 0, 
										notes: "Unknown key exchange type"
									  };
		}

		if (!cipherSuite.bulkCipher) {
			cipherSuite.bulkCipher = {name: "",
										rank: 0,
										notes: "Unknown Bulk cipher"
									  }; 
			// Something's missing in our list.
			// Get the security strength from Firefox's own flags.
			// Set cipher rank
			if (aState & Ci.nsIWebProgressListener.STATE_SECURE_HIGH) { 
				cipherSuite.bulkCipher.rank = cs.cipherSuiteStrength.MAX; 
			} else if (aState & Ci.nsIWebProgressListener.STATE_SECURE_MED) { 
				cipherSuite.bulkCipher.rank = cs.cipherSuiteStrength.HIGH - 1; 
			} else if (aState & Ci.nsIWebProgressListener.STATE_SECURE_LOW) { 
				cipherSuite.bulkCipher.rank = cs.cipherSuiteStrength.MED - 1; 
			} 
		}

		if (!cipherSuite.HMAC) {
			cipherSuite.HMAC = {name: "",
										rank: 10,
										notes: "Unknown MAC Algorithm"
									  };
		}

		// Certificate signature alg. key size 
		cipherSuite.signatureKeyLen = getSignatureKeyLen(cert, 
										cipherSuite.authentication.ui); 

		cipherSuite.notes = cipherSuite.keyExchange.notes +
								cipherSuite.bulkCipher.notes +
								cipherSuite.HMAC.notes; 

		
		const csWeighting = ssleuth.prefs.PREFS["rating.ciphersuite.params"];
		// Calculate ciphersuite rank  - All the cipher suite params ratings
		// are out of 10, so this will get normalized to 10.
		cipherSuite.rank = ( cipherSuite.keyExchange.rank * csWeighting.keyExchange +
							cipherSuite.bulkCipher.rank * csWeighting.bulkCipher +
							cipherSuite.HMAC.rank * csWeighting.hmac )/csWeighting.total;

		const ratingParams = ssleuth.prefs.PREFS["rating.params"]; 
		var certValid = isCertValid(cert); 

		// Get the connection rating. Normalize the params to 10
		var rating = getConnectionRating(cipherSuite.rank, 
						cipherSuite.pfs * 10, 
						((securityState == "Secure") ? 1 : 0) * 10,
						Number(!sslStatus.isDomainMismatch && certValid) * 10,
						Number(extendedValidation) * 10, 
						ratingParams);

		var connectionRank = Number(rating).toFixed(1); 
		dump ("\nconnection rank : " + connectionRank + 
				" keylength : " + sslStatus.secretKeyLength + "\n"); 

		// Invoke the UI to do its job
		ssleuthUI.fillPanel(connectionRank, 
					cipherSuite,
					securityState,
					cert,
					certValid,
					sslStatus.isDomainMismatch,
					extendedValidation,
					ratingParams); 
	}
}

function getConnectionRating(csRating, pfs,
			ffStatus,
			certStatus,
			evCert,
			rp) {
	return ((csRating * rp.cipherSuite + pfs * rp.pfs +
				ffStatus * rp.ffStatus + certStatus * rp.certStatus +
				evCert * rp.evCert )/rp.total); 
}

function getSignatureKeyLen(cert, auth) {
	try {
		var certASN1 = Cc["@mozilla.org/security/nsASN1Tree;1"]
							.createInstance(Components.interfaces.nsIASN1Tree); 
		certASN1.loadASN1Structure(cert.ASN1Structure);

		// The key size is not available directly as an attribute in any 
		// interfaces. So we're on our own parsing the cert structure strings. 
		// Here I didn't want to mess around with strings like 'Modulus' or
		// 'bits' or '(' which could get localized.
		// So simply extract the first occuring digit from the string
		// corresponding to Subject's Public key. Hope this holds on. 
		var keySize = 0; 
		switch(auth) {
			case "RSA" : 
				keySize = certASN1.getDisplayData(12)
								.split('\n')[0]
								.match(/\d+/g)[0]; 
					break; 
			case "ECDSA" : 
				keySize = certASN1.getDisplayData(14)
								.split('\n')[0]
								.match(/\d+/g)[0]; 
					break;
		}
				
		return keySize;
	} catch (e) { 
		dump("Error getSignatureKeyLen() : " + e.message + "\n"); 
	}
}

function toggleCipherSuites(prefsOld) {
	const prefs = ssleuthPreferences.prefService;
	const br = "security.ssl3.";
	const SUITES_TOGGLE = "suites.toggle"; 
	const PREF_SUITES_TOGGLE = "extensions.ssleuth." + SUITES_TOGGLE;

	dump("Toggle cipher suites\n");
	for (var t=0; t<ssleuth.prefs.PREFS[SUITES_TOGGLE].length; t++) {
		
		var cs = ssleuth.prefs.PREFS[SUITES_TOGGLE][t]; 
		dump("cs. name : " + cs.name + " State : " + cs.state + "\n"); 
		switch(cs.state) {
			case "default" : 
				// Check if the element was present before.
				// Reset only if the old state was 'enable' or 'disable'.
				var j; 
				for (j=0; j<prefsOld.length; j++) {
					// FIXME : prefsOld has a reference and not a copy?
					dump("name : " + prefsOld[j].name + " j : " + j + "state : " + prefsOld[j].state + "\n");
					if(prefsOld[j].name === cs.name) {
						break;
					}
				}
				if (j == prefsOld.length) // not found
					continue; 
				if (prefsOld[j].state === "default") 
					continue; 
				dump("index : " + j + " last state : " + prefsOld[j].state + "\n"); 
				// Reset once
				for (var i=0; i<cs.list.length; i++) {
					prefs.clearUserPref(br+cs.list[i]);
				}
				ssleuth.prefs.PREFS[SUITES_TOGGLE][t] = cs; 
				prefs.setCharPref(PREF_SUITES_TOGGLE, 
						JSON.stringify(ssleuth.prefs.PREFS[SUITES_TOGGLE])); 
				break;

			// Only toggle these if they actually exist! Do not mess up
			// user profile with non-existing cipher suites. Do a 
			// check with getPrefType() before setting the prefs.
			case "enable" :
				for (var i=0; i<cs.list.length; i++) {
					if (prefs.getPrefType(br+cs.list[i]) == prefs.PREF_BOOL) {
						prefs.setBoolPref(br+cs.list[i], true);
					}
				}
				break;
			case "disable" :
				for (var i=0; i<cs.list.length; i++) {
					if (prefs.getPrefType(br+cs.list[i]) == prefs.PREF_BOOL) {
						prefs.setBoolPref(br+cs.list[i], false);
					}
				}
				break;
		}
	}
}

var prefListener = new PrefListener(
	ssleuthPreferences.prefBranch,
	function(branch, name) {
		switch(name) {
			case "rating.params": 
				ssleuth.prefs.PREFS["rating.params"] = 
						JSON.parse(branch.getCharPref(name));
				break;
			case "rating.ciphersuite.params":
				ssleuth.prefs.PREFS["rating.ciphersuite.params"] =
						JSON.parse(branch.getCharPref(name));
				break;
			case "suites.toggle" :
				var prefsOld = ssleuth.prefs.PREFS["suites.toggle"]; 
				ssleuth.prefs.PREFS["suites.toggle"] = 
						JSON.parse(branch.getCharPref(name));
				toggleCipherSuites(prefsOld); 
				break;
		}
	}
); 

