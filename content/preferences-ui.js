(function () {

	// cx = connection rating
	// cs = cipher suite rating
	var cxRatingIds = [
		"ssleuth-pref-cipher-suite-weight",
		"ssleuth-pref-pfs-weight",
		"ssleuth-pref-ev-weight",
		"ssleuth-pref-ffstatus-weight",
		"ssleuth-pref-certstate-weight"
	];
	var csRatingIds = [
		"ssleuth-pref-cs-kx-weight",
		"ssleuth-pref-cs-cipher-weight",
		"ssleuth-pref-cs-hmac-weight"
	];
	const Cc = Components.classes;
	const Ci = Components.interfaces;
	const prefs = Cc["@mozilla.org/preferences-service;1"]
						.getService(Ci.nsIPrefBranch);
	const PREF_CX_RATING = "extensions.ssleuth.rating.params"; 
	const PREF_CS_RATING = "extensions.ssleuth.rating.ciphersuite.params"; 
	const PREF_SUITES_TGL = "extensions.ssleuth.suites.toggle"; 

	var cxRating = JSON.parse(prefs.getCharPref(PREF_CX_RATING)); 
	var csRating = JSON.parse(prefs.getCharPref(PREF_CS_RATING)); 

	var prefUI = {
		init : function() {
			var prefTabbox = document.getElementById("ssleuth-preferences-tabbox");
			if("arguments" in window && window.arguments.length > 0) {
				prefTabbox.selectedIndex = window.arguments[0].tabIndex;
			}

			prefUI.initRatings(); 
			prefUI.initMngList(); 
			prefUI.addListeners(); 

		},

		initRatings: function() {
			document.getElementById("ssleuth-pref-cipher-suite-weight").value
					= cxRating.cipherSuite;
			document.getElementById("ssleuth-pref-pfs-weight").value
					= cxRating.pfs;
			document.getElementById("ssleuth-pref-ev-weight").value
					= cxRating.evCert;
			document.getElementById("ssleuth-pref-ffstatus-weight").value
					= cxRating.ffStatus;
			document.getElementById("ssleuth-pref-certstate-weight").value
					= cxRating.certStatus;

			document.getElementById("ssleuth-pref-cs-kx-weight").value 
					= csRating.keyExchange;
			document.getElementById("ssleuth-pref-cs-cipher-weight").value
					= csRating.bulkCipher;
			document.getElementById("ssleuth-pref-cs-hmac-weight").value
					= csRating.hmac;

			// Set the total value for the first time. 
			prefUI.cxRatingChanged(); 
			prefUI.csRatingChanged(); 
		}, 

		initMngList: function() {
			var csList = JSON.parse(prefs.getCharPref(PREF_SUITES_TGL));
			var csBox = document.getElementById("ssleuth-pref-mng-cs-entrybox"); 
			var csDeck = document.getElementById("ssleuth-pref-mng-cs-deck"); 
			
			for (var suite in csList) {
				var item = document.createElement("richlistitem");
				var hbox = document.createElement("hbox"); 
				var lb = document.createElement("label");
				hbox.setAttribute("equalsize", "always"); 
				hbox.setAttribute("flex", "1"); 
				lb.setAttribute("value", suite);
				lb.setAttribute("flex", "1");
				hbox.appendChild(lb);
				
				// cell.setAttribute("label", csList[suite].state);
				rg = document.createElement("radiogroup");
				rg.setAttribute("orient", "horizontal");
				rg.setAttribute("flex", "1");
				const rdStates = {	"default" : "Default", 
									"enabled" : "Enable", 
									"disabled" : "Disable"};
				for (var s in rdStates) {
					rd = document.createElement("radio"); 
					rd.setAttribute("label", rdStates[s]);
					if (csList[suite].state == s) {
						rd.setAttribute("selected", "true");
					}
					rg.appendChild(rd); 
				}

				hbox.appendChild(rg); 
				item.appendChild(hbox);
				csBox.appendChild(item); 
				
				var box = document.createElement("listbox");
				for (var i=0; i<csList[suite].list.length; i++) {
					var dItem = document.createElement("listitem"); 
					var dCell = document.createElement("listcell"); 
					
					dCell.setAttribute("label", csList[suite].list[i]);
					dItem.appendChild(dCell);
					box.appendChild(dItem);
				}
				csDeck.appendChild(box); 
			}
		},

		cxRatingChanged: function() {
			var total = 0; 
			for (i=0; i<cxRatingIds.length; i++) {
				total += Number(document.getElementById(cxRatingIds[i]).value);
			}
			document.getElementById("ssleuth-pref-cx-rating-total").value = total; 
		},
		csRatingChanged: function() {
			var total = 0; 
			for (i=0; i<csRatingIds.length; i++) {
				total += Number(document.getElementById(csRatingIds[i]).value); 
			}
			document.getElementById("ssleuth-pref-cs-rating-total").value = total; 
		},

		addListeners: function() {
			for (i=0; i<cxRatingIds.length; i++) {
				document.getElementById(cxRatingIds[i])  
					.addEventListener("change", prefUI.cxRatingChanged, false); 
			}
			for (i=0; i<csRatingIds.length; i++) {
				document.getElementById(csRatingIds[i]) 
					.addEventListener("change", prefUI.csRatingChanged, false); 
			}
			document.getElementById("ssleuth-pref-cx-ratings-apply")
				.addEventListener("command", prefUI.cxRatingApply, false); 
			document.getElementById("ssleuth-pref-cs-ratings-apply")
				.addEventListener("command", prefUI.csRatingApply, false); 
			document.getElementById("ssleuth-pref-mng-cs-entrybox")
				.addEventListener("select", prefUI.csMngEntrySelect, false);
			document.getElementById("ssleuth-pref-mng-cs-entry-new")
				.addEventListener("command", prefUI.csMngEntryNew, false); 
			document.getElementById("ssleuth-pref-mng-cs-entry-edit")
				.addEventListener("command", prefUI.csMngEntryEdit, false); 
			document.getElementById("ssleuth-pref-mng-cs-entry-remove")
				.addEventListener("command", prefUI.csMngEntryRemove, false); 
		}, 

		csMngEntryNew : function() {
			var csBox = document.getElementById("ssleuth-pref-mng-cs-entrybox"); 
			var csDeck = document.getElementById("ssleuth-pref-mng-cs-deck"); 

			var item = document.createElement("richlistitem");

			var hbox = document.createElement("hbox"); 
			var lb = document.createElement("label");
			hbox.setAttribute("equalsize", "always"); 
			hbox.setAttribute("flex", "1"); 

			lb.setAttribute("flex", "1");
			lb.setAttribute("value", "<Custom suites>");
			hbox.appendChild(lb);
			item.appendChild(hbox); 
			csBox.appendChild(item);
			csBox.selectItem(item);	

			// Deck 
			var box = document.createElement("listbox");
			var chList = prefs.getChildList("security.ssl3.", {}); 

			for (var i=0; i<chList.length; i++) {
				var dItem = document.createElement("listitem"); 
				var dCell = document.createElement("listcell"); 
					
				dCell.setAttribute("label", 
						chList[i].replace("security.ssl3.", ""));
				dItem.appendChild(dCell);
				box.appendChild(dItem);
			}
			csDeck.appendChild(box);
			prefUI.csMngEntryEdit();
			// prefUI.csMngEntryRemove();
		},

		csMngEntryEdit : function() {
			var csBox = document.getElementById("ssleuth-pref-mng-cs-entrybox"); 
			var csDeck = document.getElementById("ssleuth-pref-mng-cs-deck"); 

			var item = csBox.selectedItem;
			var lb = item.firstChild.firstChild; 
			var label = lb.value; 
			var rd = lb.nextSibling; 

			// Replace the label/radios and insert a textbox there.
			var tb = document.createElement("textbox");
			tb.setAttribute("flex", "1");

			if (rd != null) {
				item.firstChild.removeChild(rd); 
			}
			item.firstChild.replaceChild(tb, lb);
			tb.setAttribute("value", label);
			tb.select();

			// == Deck ==
			lb = csDeck.selectedPanel; 
			var csList = []; 
			if (lb.hasChildNodes()) {
				var li = lb.childNodes; 
				for (var i = 0; i<li.length; i++) {
					csList[i] = li[i].firstChild.label; 
					dump("child node : " + csList[i] + "\n"); 
				}
			}

		/*		for (var i=0; i<csList[suite].list.length; i++) {
					var dItem = document.createElement("listitem"); 
					var dCell = document.createElement("listcell"); 
					
					dCell.setAttribute("label", csList[suite].list[i]);
					dItem.appendChild(dCell);
					box.appendChild(dItem);
				}
		*/

			btnBox = document.getElementById("ssleuth-pref-mng-cs-edit-buttons");
			btnBox.hidden = "false"; 
			btnBox.setAttribute("hidden", "false");
			
		},

		csMngEntryRemove : function() {
		},

		csMngEntrySelect : function() {
			var csBox = document.getElementById("ssleuth-pref-mng-cs-entrybox"); 
			var csDeck = document.getElementById("ssleuth-pref-mng-cs-deck"); 
			csDeck.selectedIndex = csBox.selectedIndex; 
		},

		cxRatingApply : function() {
			cxRating.cipherSuite = 
				document.getElementById("ssleuth-pref-cipher-suite-weight").value; 
			cxRating.pfs = 
				document.getElementById("ssleuth-pref-pfs-weight").value;
			cxRating.evCert = 
				document.getElementById("ssleuth-pref-ev-weight").value;
			cxRating.ffStatus = 
				document.getElementById("ssleuth-pref-ffstatus-weight").value;
			cxRating.certStatus = 
				document.getElementById("ssleuth-pref-certstate-weight").value;
			cxRating.total = Number(cxRating.cipherSuite) +
								Number(cxRating.pfs) +
								Number(cxRating.evCert) +
								Number(cxRating.ffStatus) +
								Number(cxRating.certStatus); 
			prefs.setCharPref(PREF_CX_RATING, 
				JSON.stringify(cxRating)); 
		},

		csRatingApply : function() {
			csRating.keyExchange = 
				document.getElementById("ssleuth-pref-cs-kx-weight").value; 
			csRating.bulkCipher = 
				document.getElementById("ssleuth-pref-cs-cipher-weight").value;
			csRating.hmac = 
				document.getElementById("ssleuth-pref-cs-hmac-weight").value;
			csRating.total = Number(csRating.keyExchange) +
								Number(csRating.bulkCipher) +
								Number(csRating.hmac);
			prefs.setCharPref(PREF_CS_RATING, 
				JSON.stringify(csRating)); 
		},

	};
	window.addEventListener("load", prefUI.init, false); 

}());
