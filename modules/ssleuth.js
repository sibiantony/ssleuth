"use strict";

var EXPORTED_SYMBOLS = ["ssleuth"];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://ssleuth/cipher-suites.js"); 
Components.utils.import("resource://ssleuth/ssleuth-ui.js");
Components.utils.import("resource://ssleuth/preferences.js");
Components.utils.import("resource://ssleuth/utils.js");

var ssleuth = {
	win : null, 
	prevURL: null,
	urlChanged: false,

	init: function(window) {

		dump("\n ssleuth init \n"); 
		/* Handle exceptions while init(). If the panel
		*  is not properly installed for the buttons, the mainPopupSet 
		*  panel elements will wreak havoc on the browser UI. */
		try {
			dump ("\nSSleuth init \n"); 

			this.win = window; 
			window.gBrowser.addProgressListener(this);
			ssleuthPreferences.init(); 
			ssleuthUI.init(window); 

		} catch(e) {
			dump("\n Error : " + e.message + "\n"); 
			this.uninit();
		}
	},

	uninit: function(window) {
		dump("\n Uninit \n");
		ssleuthUI.uninit(window); 
		ssleuthPreferences.uninit(); 
		window.gBrowser.removeProgressListener(this);
	},

	onLocationChange: function(aProgress, aRequest, aURI) {
		/* FIXME: This might throw error during startup with ff29! */
		var win = Cc["@mozilla.org/embedcomp/window-watcher;1"]
						.getService(Components.interfaces.nsIWindowWatcher)
						.activeWindow; 
		this.win = win; 
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

    QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),

	onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {
		return; 
    },

	onSecurityChange: function(aWebProgress, aRequest, aState) {
		var win = Cc["@mozilla.org/embedcomp/window-watcher;1"]
						.getService(Components.interfaces.nsIWindowWatcher)
						.activeWindow; 
		/* Get rid of this !! */
		this.win = win; 
		var loc = win.content.location;

		dump("\n onSecurityChange: " + loc.protocol + "\n"); 
		if (loc.protocol == "https:" ) {
			protocolHttps(aWebProgress, aRequest, aState);
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
	dump("\n protocolHttp \n");
	setButtonRank(-1);
	setBoxHidden("https", true); 
	setBoxHidden("http", false); 

	var httpsURL = loc.toString().replace("http://", "https://"); 

	setHttpsLink(httpsURL); 
}

function protocolHttps(aWebProgress, aRequest, aState) {
	dump("\n protocolHttps \n");
	try {
	const Cc = Components.classes; 
	const Ci = Components.interfaces;

	var secUI = ssleuth.win.gBrowser.securityUI; 
	setBoxHidden("https", false); 
	setBoxHidden("http", true); 

	if (secUI) {
		var sslStatus = secUI.SSLStatus; 
		if (!sslStatus) {
			dump("\n SSLStatus is null : Querying SSLstatus \n");
			secUI.QueryInterface(Ci.nsISSLStatusProvider); 
			if (secUI.SSLStatus) {
				sslStatus = secUI.SSLStatus; 
			}
		}

		if (sslStatus) {
			var securityState = "";
			var cipherName = sslStatus.cipherName; 
			var cipherSuite = null; 
			var keyLength = sslStatus.keyLength; 
			var secretKeyLength = sslStatus.secretKeyLength; 
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
							rank: cipherStrength.LOW, 
							pfs: 0, 
							notes: "",
							keyExchange: null, 
							bulkCipher: null, 
							HMAC: null 
						}; 
							
			// Key exchange
			for (var i=0; i<csKeyExchange.length; i++) {
				if((cipherName.indexOf(csKeyExchange[i].name) != -1)) {
					cipherSuite.keyExchange = csKeyExchange[i];
					cipherSuite.pfs = csKeyExchange[i].pfs; 
					break; 
				}
			}
			// Bulk cipher
			for (var i=0; i<csBulkCipher.length; i++) {
				if((cipherName.indexOf(csBulkCipher[i].name) != -1)) {
					cipherSuite.bulkCipher = csBulkCipher[i];
					break; 
				}
			}
			// HMAC
			for (var i=0; i<csHMAC.length; i++) {
				if((cipherName.indexOf(csHMAC[i].name) != -1)) {
					cipherSuite.HMAC = csHMAC[i];
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
				/* Something's missing in our list.
				 * Get the security strength from Firefox's own flags.*/
				// Set cipher rank
				if (aState & Ci.nsIWebProgressListener.STATE_SECURE_HIGH) { 
					cipherSuite.bulkCipher.rank = cipherStrength.MAX; 
				} else if (aState & Ci.nsIWebProgressListener.STATE_SECURE_MED) { 
					cipherSuite.bulkCipher.rank = cipherStrength.HIGH - 1; 
				} else if (aState & Ci.nsIWebProgressListener.STATE_SECURE_LOW) { 
					cipherSuite.bulkCipher.rank = cipherStrength.MED - 1; 
				} 
			}

			if (!cipherSuite.HMAC) {
				cipherSuite.HMAC = {name: "",
											rank: 10,
											notes: "Unknown MAC Algorithm"
										  };
			}

			cipherSuite.notes = cipherSuite.keyExchange.notes +
									cipherSuite.bulkCipher.notes +
									cipherSuite.HMAC.notes; 

			// Calculate ciphersuite rank  - adds up to 20. 
			cipherSuite.rank = ( cipherSuite.keyExchange.rank * csWeighting.keyExchange +
									cipherSuite.bulkCipher.rank * csWeighting.bulkCipher +
									cipherSuite.HMAC.rank * csWeighting.hmac )/csWeighting.total;

			// At the moment, cipher suite rank amounts to half of the connection rank.
			var connectionRank = cipherSuite.rank/2; 
			if (cipherSuite.pfs) {
				connectionRank += 2; 
			}

			if (extendedValidation) {
				connectionRank += 1; 
			}

			if (!sslStatus.isDomainMismatch && isCertValid(cert)) {
				connectionRank += 1; 
			}

			if (aState & Ci.nsIWebProgressListener.STATE_SECURE_HIGH) {
				connectionRank += 1; 
			}

			connectionRank = Number(connectionRank).toFixed(1); 
			dump ("\n connection rank : " + connectionRank + "\n"); 

			// Now set the appropriate button
			setButtonRank(connectionRank); 
			panelConnectionRank(connectionRank); 

			showCipherDetails(cipherSuite, keyLength); 
			showPFS(cipherSuite.pfs); 
			showFFState(securityState); 
			showCertDetails(cert, sslStatus.isDomainMismatch, extendedValidation); 
		} else {
			dump("\n SSLStatus is null \n");
			/* 1. A rather annoying behaviour : Firefox do not seem to populate
			 * SSLStatus if a tab switches to a page with the same URL.
			 */

			/* 2. A page load event can fire even if there is 
			 * no connectivity and user attempts to reload a page. 
			 * The hidden=true should prevent stale values from getting 
			 * displayed */
			if (ssleuth.urlChanged) {
				setBoxHidden("https", true); 
			} 
		}
	}
	} catch(e) {
		dump("Failed protocolHttps : " + e.message + "\n"); 
	}
}
