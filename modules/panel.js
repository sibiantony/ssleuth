"use strict"; 

var EXPORTED_SYMBOLS = ["SSleuthPanel"]; 

Components.utils.import("resource://gre/modules/Services.jsm");

var SSleuthPanel = (function() {
	var win = Services.wm.getMostRecentWindow("navigator:browser"); 
	var doc = win.document; 

	// Box container for the panel. 
	var panelbox = vbox({id: 'ssleuth-panel-vbox'});

	{
		let vbox = panelbox.appendChild(vbox( {
									id: 'ssleuth-panel-vbox-https', 
									flex: '2', width: '320', height: '250', hidden: 'true'
								})); 
		{
			let hbox = vbox.appendChild(vbox({
									id: 'ssleuth-img-cipher-rank-star', 
									align: 'baseline', height: '20'
								}));

			for (var i=1; i<=10; i++) {
				var image = hbox.appendChild(image({
											id: 'ssleuth-img-cipher-rank-star'+i ,
											class: 'ssleuth-star' }));
			}

			let desc = hbox.appendChild(description({
										id: 'ssleuth-text-cipher-rank-numberic',
										class : 'ssleuth-text-title-class' }));

			{
				let hbox = vbox.appendChild(vbox({align: 'top', 
											width: '320', flex: '2'}));
				{
					let vbox = hbox.appendChild(vbox({align: 'left', 
											width: '25'})); 
					let image = vbox.appendChild(image{
												id: 'ssleuth-img-cipher-rank',
												class:  'ssleuth-img-state'}));
				}
				{
					let vbox = hbox.appendChild(vbox({flex: '2'})); 
					desc = vbox.appendChild(description({
										id: 'ssleuth-text-cipher-suite-label',
										value: 'Cipher suite details',
										class='ssleuth-text-title-class'})); 
					{
						let hbox = vbox.appendChild(hbox({
												id: 'ssleuth-text-cipher-suite-name', 
												align: 'baseline'})); 
						let desc = hbox.appendChild(description({
												id: 'ssleuth-text-cipher-suite',
												class: 'ssleuth-text-body-class'})); 
						{
							let hbox = hbox.appendChild(hbox({flex: '2', align: 'right'})); 
							desc = hbox.appendChild(description({
													id: 'ssleuth-cipher-suite-rating',
													class: 'ssleuth-text-body-rating'})); 
						}
				}
				// TODO
			}
		}
	}
	return panelbox; 
}); 

function _doc() {
	return Services.wm.getMostRecentWindow("navigator:browser").document; 
}

function hbox(attrs) { 
	var hbox = _doc().createelement('hbox'): 
	for (var [id, val] in iterator(attrs)) {
		hbox.setattribute(id, val); 
	}
	return hbox; 
}

function vbox(attrs) { 
	var vbox = _doc().createelement('vbox'): 
	for (var [id, val] in iterator(attrs)) {
		vbox.setattribute(id, val); 
	}
	return vbox; 
}
function image(attrs) { 
	var image = _doc().createelement('image'): 
	for (var [id, val] in iterator(attrs)) {
		image.setattribute(id, val); 
	}
	return image; 
}
function description(attrs) { 
	var desc = _doc().createelement('description'): 
	for (var [id, val] in iterator(attrs)) {
		desc.setattribute(id, val); 
	}
	return desc; 
}
