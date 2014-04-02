"use strict"; 

var EXPORTED_SYMBOLS = ["SSleuthPanel"]; 

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

function SSleuthPanel(win) {
	try {
	var doc = win.document; 

	// dump("SSleuthPanel \n"); 
	// Box container for the panel. 
	var panelbox = vbox({id: 'ssleuth-panel-vbox'});
	/*{
		let vb = panelbox.appendChild(vbox({
									id: 'ssleuth-panel-vbox-https', 
									flex: '2', width: '300', height: '250', hidden: 'true'
								})); 
		{
			let hb = vb.appendChild(hbox({
									id: 'ssleuth-img-cipher-rank-star', 
									align: 'baseline', height: '20'
								}));

			for (var i=1; i<=10; i++) {
				hb.appendChild(image({
											id: 'ssleuth-img-cipher-rank-star-'+i ,
											class: 'ssleuth-star' }));
			}

			hb.appendChild(description({
										id: 'ssleuth-text-cipher-rank-numeric',
										class : 'ssleuth-text-title-class' }));
		}

		{
			let hb = vb.appendChild(hbox({align: 'top', 
										width: '300', flex: '2'}));
			{
				let vb = hb.appendChild(vbox({id: 'ssleuth-hbox-1-vbox-1',
										align: 'left', 
										width: '25'})); 
				vb.appendChild(image({
											id: 'ssleuth-img-cipher-rank',
											class:  'ssleuth-img-state'}));
			}
			{
				let vb = hb.appendChild(vbox({id: 'ssleuth-hbox-1-vbox-2', flex: '2'})); 
				vb.appendChild(description({
									id: 'ssleuth-text-cipher-suite-label',
									value: 'Cipher suite details',
									class: 'ssleuth-text-title-class'})); 
				{
					let hb = vb.appendChild(hbox({
											id: 'ssleuth-text-cipher-suite-name', 
											align: 'baseline'})); 
					hb.appendChild(description({
											id: 'ssleuth-text-cipher-suite',
											class: 'ssleuth-text-body-class'})); 
					{
						let chb = hb.appendChild(hbox({flex: '2', align: 'right'})); 
						chb.appendChild(description({
												id: 'ssleuth-cipher-suite-rating',
												class: 'ssleuth-text-body-rating'})); 
					}
				}
				{
					let hb = vb.appendChild(hbox({
												id: 'ssleuth-text-key-exchange',
												hidden: 'true'})); 
					hb.appendChild(description({
												id: 'ssleuth-text-key-exchange-label',
												value: 'Key exchange',
												class: 'ssleuth-text-body-class'})); 
					hb.appendChild(description({
												id: 'ssleuth-text-cipher-suite-kxchange',
												class: 'ssleuth-text-body-class'})); 
					hb.appendChild(description({
												id: 'ssleuth-text-cipher-suite-kxchange-notes',
												class: 'ssleuth-text-body-class' })); 
				}
				{
					let hb = vb.appendChild(hbox({
												id: 'ssleuth-text-authentication'}));
					hb.appendChild(description({
												id: 'ssleuth-text-authentication-label',
												value: 'Authentication', 
												class: 'ssleuth-text-body-class'})); 
					hb.appendChild(description({
												id: 'ssleuth-text-cipher-suite-auth',
												class: 'ssleuth-text-body-class'})); 
					hb.appendChild(description({
												id: 'ssleuth-text-cipher-suite-auth-key-text',
												value: 'Server key: ',
												class: 'ssleuth-text-body-class' })); 
					hb.appendChild(description({
												id: 'ssleuth-text-cipher-suite-auth-key',
												class: 'ssleuth-text-body-class'})); 
					hb.appendChild(description({
												id: 'ssleuth-text-cipher-suite-auth-notes',
												class: 'ssleuth-text-body-class'})); 
				}
				{
					let hb = vb.appendChild(hbox({
												id: 'ssleuth-text-bulk-cipher'})); 
					hb.appendChild(description({
												id: 'ssleuth-text-bulk-cipher-label',
												value: 'Bulk cipher: ', 
												class: 'ssleuth-text-body-class'})); 
					hb.appendChild(description({
												id: 'ssleuth-text-cipher-suite-bulkcipher',
												class: 'ssleuth-text-body-class'})); 
					hb.appendChild(description({
												id: 'ssleuth-text-cipher-suite-bulkcipher-notes',
												class: 'ssleuth-text-body-class' })); 
				}
				{
					let hb = vb.appendChild(hbox({
												id: 'ssleuth-text-hmac'})); 
					hb.appendChild(description({
												id: 'ssleuth-text-hmac-label',
												value: 'HMAC: ', 
												class: 'ssleuth-text-body-class'})); 
					hb.appendChild(description({
												id: 'ssleuth-text-cipher-suite-hmac',
												class: 'ssleuth-text-body-class'})); 
					hb.appendChild(description({
												id: 'ssleuth-text-cipher-suite-hmac-notes',
												class: 'ssleuth-text-body-class' })); 
				}
			} 
		}

		{
			let hb = vb.appendChild(hbox({
										id: 'ssleuth-hbox-2', align: 'top'})); 
			{
				let chb = hb.appendChild(hbox({
											align: 'left', width: '25' })); 
				chb.appendChild(image({ id: 'ssleuth-img-p-f-secrecy',
											class: 'ssleuth-img-state'})); 	
			}
			{
				let chb = hb.appendChild(hbox({
											align: 'baseline', flex: '2'}));
				chb.appendChild(description({id : 'ssleuth-text-p-f-secrecy', 
																class: 'ssleuth-text-title-class'})); 
				{
					let cchb = chb.appendChild(hbox({ flex: '2', align: 'right'})); 
					cchb.appendChild(description({id: 'ssleuth-p-f-secrecy-rating',
																class: 'ssleuth-text-body-rating'})); 
				}
			}
		}
		{
			let hb = vb.appendChild(hbox({ id: 'ssleuth-ff-connection-status'})); 
			{
				let vb = hb.appendChild(vbox({ align: 'left', width: '25'})); 
				vb.appendChild(image({ id: 'ssleuth-img-ff-connection-status', 
													class: 'ssleuth-img-state'})); 
			}
			{
				let vb = hb.appendChild(vbox({id: 'ssleuth-ff-connection-status-text-vbox', 
														flex: '2'})); 
				{
					let hb = vb.appendChild(hbox({
													id: 'ssleuth-ff-connection-status-text-hbox',
													align: 'baseline'})); 
					hb.appendChild(description({id: 'ssleuth-text-conn-status', 
												value:'Connection status (firefox):', 
												class: 'ssleuth-text-title-class'})); 
					hb.appendChild(description({id: 'ssleuth-text-ff-connection-status', 
												class: 'ssleuth-text-title-class'})); 
					{
						let chb = hb.appendChild(hbox({ flex: '2', align: 'right'})); 
						chb.appendChild(description({id : 'ssleuth-ff-connection-status-rating',
						class: 'ssleuth-text-body-rating'})); 
					}

				}
				
				vb.appendChild(description({id : 'ssleuth-text-ff-connection-status-broken',
														value : 'This page has either insecure content or a bad certificate.',
														hidden : true, 
														class : 'ssleuth-text-body-class'})); 
			}
		} 

		{
			let hb = vb.appendChild(hbox({
										height: '100', flex: '2'})); 
			{
				let chb = hb.appendChild(hbox({
											align: 'left', width: '25' })); 
				chb.appendChild(image({ id: 'ssleuth-img-cert-state',
											class: 'ssleuth-img-state'})); 	
			}

			{
				let vb = hb.appendChild(vbox({flex: '2'}));
				{
					let hb = vb.appendChild(hbox({align: 'baseline'})); 
					hb.appendChild(description({ id: 'ssleuth-text-cert-label', 
															value: 'Certificate details', 
															class: 'ssleuth-text-title-class'})); 
					{
						let chb = hb.appendChild(hbox({ flex: '2', align: 'right'})); 
						chb.appendChild(description({id: 'ssleuth-cert-status-rating', 
																class: 'ssleuth-text-body-rating'})); 
					}
				}

				{
					let hb = vb.appendChild(hbox({align: 'baseline'})); 
					hb.appendChild(description({id : 'ssleuth-text-cert-ev', 
																	value: 'Extended validation: ', 
																	class: 'ssleuth-text-body-class'})); 
					hb.appendChild(description({id: 'ssleuth-text-cert-extended-validation', 
																	class: 'ssleuth-text-body-class'})); 
					{
						let chb = hb.appendChild(hbox({ flex: '2', align: 'right'})); 
						chb.appendChild(description({id: 'ssleuth-cert-ev-rating',
																	class: 'ssleuth-text-body-rating'})); 
					}
				}

				vb.appendChild(description({ id: 'ssleuth-text-cert-domain-mismatch',
															value: 'Certificate domain name does not match.',
															class: 'ssleuth-text-body-class'})); 
				{
					let hb = vb.appendChild(hbox({align: 'baseline'})); 
					hb.appendChild(description({id : 'ssleuth-text-cert-cn-label', 
																	value: 'Common name: ', 
																	class: 'ssleuth-text-body-class'})); 
					hb.appendChild(description({id: 'ssleuth-text-cert-common-name', 
																	class: 'ssleuth-text-body-class'})); 
				}

			  {
					let hb = vb.appendChild(hbox({align: 'baseline'})); 
					hb.appendChild(description({id : 'ssleuth-text-cert-issuedto', 
																	value: 'Issued to: ', 
																	class: 'ssleuth-text-body-class'})); 
					{
						let vb = hb.appendChild(vbox({align: 'baseline'}));
						vb.appendChild(description({id: 'ssleuth-text-cert-org', 
																		class: 'ssleuth-text-title-class'})); 
						vb.appendChild(description({id: 'ssleuth-text-cert-org-unit', 
																		class: 'ssleuth-text-body-class'})); 
					}
				}
				{
					let hb = vb.appendChild(hbox({align: 'baseline'})); 
					hb.appendChild(description({id : 'ssleuth-text-cert-issuedby', 
																	value: 'Issued by: ', 
																	class: 'ssleuth-text-body-class'})); 
					{
						let vb = hb.appendChild(vbox({align: 'baseline'}));
						vb.appendChild(description({id: 'ssleuth-text-cert-issuer-org', 
																		class: 'ssleuth-text-title-class'})); 
						vb.appendChild(description({id: 'ssleuth-text-cert-issuer-org-unit', 
																		class: 'ssleuth-text-body-class'})); 
					}
				}
				{
					let hb = vb.appendChild(hbox({id: 'ssleuth-text-cert-validity-box', 
																align: 'baseline'})); 
					hb.appendChild(description({id : 'ssleuth-text-cert-validity-text', 
																	value: 'Validity: ', 
																	class: 'ssleuth-text-body-class'})); 
					hb.appendChild(description({id : 'ssleuth-text-cert-validity', 
																	class: 'ssleuth-text-body-class'})); 
				}
				vb.appendChild(description({id: 'ssleuth-text-cert-fingerprint', 
																		class: 'ssleuth-text-body-class'})); 
			}
		}
		
	}
	{
		// let vb = panelbox.appendChild(vbox({id: 'ssleuth-panel-vbox-http',
		//										width: '350', height: '100', hidden: 'true', flex: '2'})); 
		{
			let hb = panelbox.appendChild(hbox({id: 'ssleuth-panel-vbox-http', 
											align: 'baseline', flex: '2',
											width: '350', height: '100', hidden: 'true'})); 
			hb.appendChild(image({ id: 'ssleuth-img-http-omg', class: 'ssleuth-img-state'})); 
			{ 
				let vb = hb.appendChild(vbox({flex: '1'})); 
				let h1 = vb.appendChild(description({id: 'ssleuth-text-http-1', 
										class: 'ssleuth-text-title-class'})); 
				h1.setAttribute("value", "Your connection to this site is not encrypted.");
				vb.appendChild(description({id : 'ssleuth-text-http-2', 
										value: 'You can attempt connecting to the secure version of the site if available.',
										class: 'ssleuth-text-title-class'})); 
				vb.appendChild(label({id: 'ssleuth-panel-https-link',
										class:'text-link', crop: 'center', focus: 'true'})); 
				let d1 = vb.appendChild(description({id : 'ssleuth-text-http-note', 
										class: 'ssleuth-text-body-class'})); 
				d1.value = "Note: The availability of the above link depends on the site\'s offering of the same content over an https connection."; 
			}
		} 
	} 
	return panelbox; 
	*/
	} catch (e) { 
		dump("\nError creating panel : " + e.message ); 
	}
}

function _doc() {
	return Services.wm.getMostRecentWindow("navigator:browser").document; 
}

function hbox(attrs) { 
	var hbox = _doc().createElement('hbox');

	for (var [id, val] in Iterator(attrs)) {
		hbox.setAttribute(id, val); 
	}
	return hbox; 
}

function vbox(attrs) { 
	var vbox = _doc().createElement('vbox'); 

	for (var [id, val] in Iterator(attrs)) {
		vbox.setAttribute(id, val); 
	}
	return vbox; 
} 

function image(attrs) { 
	var image = _doc().createElement('image'); 
	for (var [id, val] in Iterator(attrs)) {
		image.setAttribute(id, val); 
	}
	return image; 
}
function description(attrs) { 
	var desc = _doc().createElement('description'); 
	for (var [id, val] in Iterator(attrs)) {
		desc.setAttribute(id, val); 
	}
	return desc; 
}

function label(attrs) { 
	var label = _doc().createElement('label'); 
	for (var [id, val] in Iterator(attrs)) {
		label.setAttribute(id, val); 
	}
	return label; 
}
