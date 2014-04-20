
var EXPORTED_SYMBOLS = ["SSleuthPanel"] 
// This is kind of nasty. There are a hell lot of UI elements for the panel.
//    And an XUL overlay file is the right way to do these kind of stuff.
//    But now that overlays are not allowed for restartless addons, 
//    and that loadOverlay() is buggy, there must be an intuitive way to do this in js.
//    With XUL xml indentations, it is very easy to identify elements. 
//    Here I rely on javascript local scoping and re-use variable names to give
//    that 'intuitiveness'. 
function SSleuthPanel(win) {
  var doc = win.document; 
  const HTTPS_PANEL_WIDTH = '300';
  const HTTP_PANEL_WIDTH = '350';
  const IMG_MARGIN_WIDTH = '25';

  function create(elem, attrs) {
    // createElement() Regex warnings are targeting 'script' elements.
    // https://bugzilla.mozilla.org/show_bug.cgi?id=625690
    // I don't do script here.
    var e = doc.createElement(elem); 
    for (var [atr, val] in Iterator(attrs)) {
      e.setAttribute(atr, val); 
    }
    return e; 
  }

  // Box container for the panel. 
  var panelbox = create('vbox', {id: 'ssleuth-panel-vbox'}); {
    let vb = panelbox.appendChild(create('vbox', {
                  id: 'ssleuth-panel-vbox-https', 
                  flex: '2', width: HTTPS_PANEL_WIDTH, 
                  height: '250', hidden: 'true'
                })); {
      let hb = vb.appendChild(create('hbox', {
                  id: 'ssleuth-img-cipher-rank-star', 
                  align: 'baseline', height: '20'
                }));
      for (var i=1; i<=10; i++) {
        hb.appendChild(create('image', {
                      id: 'ssleuth-img-cipher-rank-star-'+i ,
                      class: 'ssleuth-star' }));
      }
      hb.appendChild(create('description', {
                    id: 'ssleuth-text-cipher-rank-numeric',
                    class : 'ssleuth-text-title-class' }));
    } {
      let hb = vb.appendChild(create('hbox', {align: 'top', 
                    width: HTTPS_PANEL_WIDTH, flex: '2'})); {
        let vb = hb.appendChild(create('vbox', {id: 'ssleuth-hbox-1-vbox-1',
                    align: 'left', 
                    width: IMG_MARGIN_WIDTH})); 
        vb.appendChild(create('image', {
                      id: 'ssleuth-img-cipher-rank',
                      class:  'ssleuth-img-state'}));
      } {
        let vb = hb.appendChild(create('vbox', {id: 'ssleuth-hbox-1-vbox-2', flex: '2'})); 
        vb.appendChild(create('description', {
                  id: 'ssleuth-text-cipher-suite-label',
                  value: 'Cipher suite details',
                  class: 'ssleuth-text-title-class'})); {
          let hb = vb.appendChild(create('hbox', {
                      id: 'ssleuth-text-cipher-suite-name', 
                      align: 'baseline'})); 
          hb.appendChild(create('description', {
                      id: 'ssleuth-text-cipher-suite',
                      class: 'ssleuth-text-body-class'})); {
            let chb = hb.appendChild(create('hbox', {flex: '2', align: 'right'})); 
            chb.appendChild(create('description', {
                        id: 'ssleuth-cipher-suite-rating',
                        class: 'ssleuth-text-body-rating'})); 
          }
        } {
          let hb = vb.appendChild(create('hbox', {
                        id: 'ssleuth-text-key-exchange',
                        hidden: 'true'})); 
          hb.appendChild(create('description', {
                        id: 'ssleuth-text-key-exchange-label',
                        value: 'Key exchange: ',
                        class: 'ssleuth-text-body-class'})); 
          hb.appendChild(create('description', {
                        id: 'ssleuth-text-cipher-suite-kxchange',
                        class: 'ssleuth-text-body-class'})); 
          hb.appendChild(create('description', {
                        id: 'ssleuth-text-cipher-suite-kxchange-notes',
                        class: 'ssleuth-text-body-class' })); 
        } {
          let hb = vb.appendChild(create('hbox', {
                        id: 'ssleuth-text-authentication'}));
          hb.appendChild(create('description', {
                        id: 'ssleuth-text-authentication-label',
                        value: 'Authentication: ', 
                        class: 'ssleuth-text-body-class'})); 
          hb.appendChild(create('description', {
                        id: 'ssleuth-text-cipher-suite-auth',
                        class: 'ssleuth-text-body-class'})); 
          hb.appendChild(create('description', {
                        id: 'ssleuth-text-cipher-suite-auth-key-text',
                        value: 'Server key: ',
                        class: 'ssleuth-text-body-class' })); 
          hb.appendChild(create('description', {
                        id: 'ssleuth-text-cipher-suite-auth-key',
                        class: 'ssleuth-text-body-class'})); 
          hb.appendChild(create('description', {
                        id: 'ssleuth-text-cipher-suite-auth-notes',
                        class: 'ssleuth-text-body-class'})); 
        } {
          let hb = vb.appendChild(create('hbox', {
                        id: 'ssleuth-text-bulk-cipher'})); 
          hb.appendChild(create('description', {
                        id: 'ssleuth-text-bulk-cipher-label',
                        value: 'Bulk cipher: ', 
                        class: 'ssleuth-text-body-class'})); 
          hb.appendChild(create('description', {
                        id: 'ssleuth-text-cipher-suite-bulkcipher',
                        class: 'ssleuth-text-body-class'})); 
          hb.appendChild(create('description', {
                        id: 'ssleuth-text-cipher-suite-bulkcipher-notes',
                        class: 'ssleuth-text-body-class' })); 
        } {
          let hb = vb.appendChild(create('hbox', {
                        id: 'ssleuth-text-hmac'})); 
          hb.appendChild(create('description', {
                        id: 'ssleuth-text-hmac-label',
                        value: 'HMAC: ', 
                        class: 'ssleuth-text-body-class'})); 
          hb.appendChild(create('description', {
                        id: 'ssleuth-text-cipher-suite-hmac',
                        class: 'ssleuth-text-body-class'})); 
          hb.appendChild(create('description', {
                        id: 'ssleuth-text-cipher-suite-hmac-notes',
                        class: 'ssleuth-text-body-class' })); 
        }
      } 
    } {
      let hb = vb.appendChild(create('hbox', {
                    id: 'ssleuth-hbox-2', align: 'top'})); {
        let chb = hb.appendChild(create('hbox', {
                      align: 'left', width: IMG_MARGIN_WIDTH })); 
        chb.appendChild(create('image', { id: 'ssleuth-img-p-f-secrecy',
                      class: 'ssleuth-img-state'}));   
      } {
        let chb = hb.appendChild(create('hbox', {
                      align: 'baseline', flex: '2'}));
        chb.appendChild(create('description', {
                          id : 'ssleuth-text-p-f-secrecy', 
                          class: 'ssleuth-text-title-class'})); 
        {
          let cchb = chb.appendChild(create('hbox', { 
                                      flex: '2', align: 'right'})); 
          cchb.appendChild(create('description', {
                            id: 'ssleuth-p-f-secrecy-rating',
                            class: 'ssleuth-text-body-rating'})); 
        }
      }
    } {
      let hb = vb.appendChild(create('hbox', { 
                  id: 'ssleuth-ff-connection-status'})); {
        let vb = hb.appendChild(create('vbox', { 
                                  align: 'left', width: IMG_MARGIN_WIDTH})); 
        vb.appendChild(create('image', { 
                          id: 'ssleuth-img-ff-connection-status', 
                          class: 'ssleuth-img-state'})); 
      } {
        let vb = hb.appendChild(create('vbox', {
                                  id: 'ssleuth-ff-connection-status-text-vbox', 
                                  flex: '2'})); {
          let hb = vb.appendChild(create('hbox', {
                          id: 'ssleuth-ff-connection-status-text-hbox',
                          align: 'baseline'})); 
          hb.appendChild(create('description', {
                          id: 'ssleuth-text-conn-status', 
                          value:'Connection status (firefox): ', 
                          class: 'ssleuth-text-title-class'})); 
          hb.appendChild(create('description', {
                          id: 'ssleuth-text-ff-connection-status', 
                          class: 'ssleuth-text-title-class'})); {
            let chb = hb.appendChild(create('hbox', { 
                                      flex: '2', align: 'right'})); 
            chb.appendChild(create('description', {
                              id : 'ssleuth-ff-connection-status-rating',
                              class: 'ssleuth-text-body-rating'})); 
          }
        }
        vb.appendChild(create('description', {
                        id : 'ssleuth-text-ff-connection-status-broken',
                        value : 'This page has either insecure content or a bad certificate.',
                        hidden : true, 
                        class : 'ssleuth-text-body-class'})); 
      }
    } {
      let hb = vb.appendChild(create('hbox', {
                    height: '100', flex: '2'})); {
        let chb = hb.appendChild(create('hbox', {
                      align: 'left', width: IMG_MARGIN_WIDTH })); 
        chb.appendChild(create('image', { id: 'ssleuth-img-cert-state',
                      class: 'ssleuth-img-state'}));   
      } {
        let vb = hb.appendChild(create('vbox', {flex: '2'})); {
          let hb = vb.appendChild(create('hbox', {align: 'baseline'})); 
          hb.appendChild(create('description', { 
                              id: 'ssleuth-text-cert-label', 
                              value: 'Certificate details', 
                              class: 'ssleuth-text-title-class'})); 
          {
            let chb = hb.appendChild(create('hbox', { 
                                      flex: '2', align: 'right'})); 
            chb.appendChild(create('description', {
                                id: 'ssleuth-cert-status-rating', 
                                class: 'ssleuth-text-body-rating'})); 
          }
        } {
          let hb = vb.appendChild(create('hbox', {align: 'baseline'})); 
          hb.appendChild(create('description', {id : 'ssleuth-text-cert-ev', 
                                  value: 'Extended validation: ', 
                                  class: 'ssleuth-text-body-class'})); 
          hb.appendChild(create('description', {
                            id: 'ssleuth-text-cert-extended-validation', 
                            class: 'ssleuth-text-body-class'})); 
          {
            let chb = hb.appendChild(create('hbox', { 
                                      flex: '2', align: 'right'})); 
            chb.appendChild(create('description', {
                                  id: 'ssleuth-cert-ev-rating',
                                  class: 'ssleuth-text-body-rating'})); 
          }
        }
        vb.appendChild(create('description', { 
                          id: 'ssleuth-text-cert-domain-mismatch',
                          value: 'Certificate domain name does not match.',
                          class: 'ssleuth-text-body-class'})); {
          let hb = vb.appendChild(create('hbox', {align: 'baseline'})); 
          hb.appendChild(create('description', {
                            id : 'ssleuth-text-cert-cn-label', 
                            value: 'Common name: ', 
                            class: 'ssleuth-text-body-class'})); 
          hb.appendChild(create('description', {
                            id: 'ssleuth-text-cert-common-name', 
                            class: 'ssleuth-text-body-class'})); 
        } {
          let hb = vb.appendChild(create('hbox', {align: 'baseline'})); 
          hb.appendChild(create('description', {
                            id : 'ssleuth-text-cert-issuedto', 
                            value: 'Issued to: ', 
                            class: 'ssleuth-text-body-class'})); {
            let vb = hb.appendChild(create('vbox', {align: 'baseline'}));
            vb.appendChild(create('description', {
                              id: 'ssleuth-text-cert-org', 
                              class: 'ssleuth-text-title-class'})); 
            vb.appendChild(create('description', {
                              id: 'ssleuth-text-cert-org-unit', 
                              class: 'ssleuth-text-body-class'})); 
          }
        } {
          let hb = vb.appendChild(create('hbox', {align: 'baseline'})); 
          hb.appendChild(create('description', {
                              id : 'ssleuth-text-cert-issuedby', 
                              value: 'Issued by: ', 
                              class: 'ssleuth-text-body-class'})); {
            let vb = hb.appendChild(create('vbox', {align: 'baseline'}));
            vb.appendChild(create('description', {
                              id: 'ssleuth-text-cert-issuer-org', 
                              class: 'ssleuth-text-title-class'})); 
            vb.appendChild(create('description', {
                              id: 'ssleuth-text-cert-issuer-org-unit', 
                              class: 'ssleuth-text-body-class'})); 
          }
        } {
          let hb = vb.appendChild(create('hbox', {
                                    id: 'ssleuth-text-cert-validity-box', 
                                    align: 'baseline'})); 
          hb.appendChild(create('description', {
                            id : 'ssleuth-text-cert-validity-text', 
                            value: 'Validity: ', 
                            class: 'ssleuth-text-body-class'})); 
          hb.appendChild(create('description', {
                            id : 'ssleuth-text-cert-validity', 
                            class: 'ssleuth-text-body-class'})); 
        }
        vb.appendChild(create('description', {
                            id: 'ssleuth-text-cert-fingerprint', 
                            class: 'ssleuth-text-body-class'})); 
      }
    }
  } {
    let hb = panelbox.appendChild(create('hbox', {
                    id: 'ssleuth-panel-box-http', 
                    align: 'baseline', flex: '2',
                    width: HTTP_PANEL_WIDTH, height: '100', hidden: 'true'})); {
      let vb = hb.appendChild(create('vbox', { 
                                align: 'left', width: IMG_MARGIN_WIDTH})); 
      vb.appendChild(create('image', { 
                        id: 'ssleuth-img-http-omg', 
                        class: 'ssleuth-img-state'})); 
    } {
      let vb = hb.appendChild(create('vbox', {flex: '1'})); 
      let h1 = vb.appendChild(create('description', {
                                id: 'ssleuth-text-http-1', 
                                class: 'ssleuth-text-title-class'})); 
      h1.textContent = "Your connection to this site is not encrypted.";
      let h2 = vb.appendChild(create('description', {
                                id : 'ssleuth-text-http-2', 
                                class: 'ssleuth-text-title-class'})); 

      h2.textContent = "You can attempt connecting to the secure version of the site if available."; 
      vb.appendChild(create('label', {id: 'ssleuth-panel-https-link', 
                        class:'text-link', crop: 'center', focus: 'true'}));
      let d1 = vb.appendChild(create('description', {
                                id : 'ssleuth-text-http-note', 
                                class: 'ssleuth-text-body-class'})); 
      d1.textContent = "Note: The availability of the above link depends on the site\'s offering of the same content over an https connection."; 

    }
  }
  return panelbox; 
}


