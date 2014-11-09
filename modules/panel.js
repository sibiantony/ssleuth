var EXPORTED_SYMBOLS = ["SSleuthPanel"]

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

Components.utils.import("resource://ssleuth/utils.js");
/* There are a hell lot of UI elements for the panel.
 *    And an XUL overlay file is the right way to do these kind of stuff.
 *    But now that overlays are not allowed for restartless addons,
 *    and that loadOverlay() is buggy, there must be an intuitive way to do this in js.
 *    With XUL xml indentations, it is very easy to identify elements.
 *    Here I rely on javascript local scoping and re-use variable names to give
 *    that 'intuitiveness'. This is kind of nasty.
 */
function SSleuthPanel(win) {
  var doc = win.document;
  // With the new tabbed panel, the actual width is determined
  // by the tabs width. So these are just relics. 
  // Check : This might help with the flex for right-side ratings text.
  const HTTPS_PANEL_WIDTH = '300';
  const HTTP_PANEL_WIDTH = '330';

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

  try {

    function panelMain() {
      let mainVbox = create('vbox', {
        id: 'ssleuth-panel-main-vbox',
        flex: '2'
      }); {
        let httpsBox = mainVbox.appendChild(create('vbox', {
          id: 'ssleuth-panel-vbox-https',
          flex: '2',
          width: HTTPS_PANEL_WIDTH,
          height: '250',
          hidden: 'true'
        })); {
          let hb = httpsBox.appendChild(create('hbox', {
            align: 'top',
            width: HTTPS_PANEL_WIDTH,
            flex: '2'
          })); {
            let vb = hb.appendChild(create('vbox', {
              align: 'left',
              width: IMG_MARGIN_WIDTH
            }));
            vb.appendChild(create('image', {
              id: 'ssleuth-img-cipher-rank',
              class: 'ssleuth-img-state'
            }));
          } {
            let vb = hb.appendChild(create('vbox', {
              flex: '2'
            }));
            vb.appendChild(create('description', {
              id: 'ssleuth-text-cipher-suite-label',
              value: getText('ciphersuite.text'),
              class: 'ssleuth-text-title-class'
            })); {
              let hb = vb.appendChild(create('hbox', {
                id: 'ssleuth-text-cipher-suite-name',
                align: 'baseline'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-cipher-suite',
                class: 'ssleuth-text-body-class'
              })); {
                let chb = hb.appendChild(create('hbox', {
                  flex: '2',
                  align: 'right'
                }));
                chb.appendChild(create('description', {
                  id: 'ssleuth-cipher-suite-rating',
                  class: 'ssleuth-text-body-rating'
                }));
              }
            } {
              let hb = vb.appendChild(create('hbox', {
                id: 'ssleuth-text-key-exchange',
                hidden: 'true'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-key-exchange-label',
                value: getText('keyexchange.text'),
                class: 'ssleuth-text-body-class'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-cipher-suite-kxchange',
                class: 'ssleuth-text-body-class'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-cipher-suite-kxchange-notes',
                class: 'ssleuth-text-body-class'
              }));
            } {
              let hb = vb.appendChild(create('hbox', {
                id: 'ssleuth-text-authentication'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-authentication-label',
                value: getText('authentication.text'),
                class: 'ssleuth-text-body-class'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-cipher-suite-auth',
                class: 'ssleuth-text-body-class'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-cipher-suite-auth-notes',
                class: 'ssleuth-text-body-class'
              }));
            } {
              let hb = vb.appendChild(create('hbox', {
                id: 'ssleuth-text-bulk-cipher'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-bulk-cipher-label',
                value: getText('bulkcipher.text'),
                class: 'ssleuth-text-body-class'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-cipher-suite-bulkcipher',
                class: 'ssleuth-text-body-class'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-cipher-suite-bulkcipher-notes',
                class: 'ssleuth-text-body-class'
              }));
            } {
              let hb = vb.appendChild(create('hbox', {
                id: 'ssleuth-text-hmac'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-hmac-label',
                value: getText('hmac.text'), 
                class: 'ssleuth-text-body-class'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-cipher-suite-hmac',
                class: 'ssleuth-text-body-class'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-cipher-suite-hmac-notes',
                class: 'ssleuth-text-body-class'
              }));
            }
          }
        } {
          let hb = httpsBox.appendChild(create('hbox', {
            id: 'ssleuth-hbox-2',
            align: 'top'
          })); {
            let chb = hb.appendChild(create('hbox', {
              align: 'left',
              width: IMG_MARGIN_WIDTH
            }));
            chb.appendChild(create('image', {
              id: 'ssleuth-img-p-f-secrecy',
              class: 'ssleuth-img-state'
            }));
          } {
            let chb = hb.appendChild(create('hbox', {
              align: 'baseline',
              flex: '2'
            }));
            chb.appendChild(create('description', {
              value: getText('pfs.text'), 
              class: 'ssleuth-text-title-class'
            }));
            chb.appendChild(create('description', {
              id: 'ssleuth-text-p-f-secrecy',
              class: 'ssleuth-text-title-class'
            })); {
              let cchb = chb.appendChild(create('hbox', {
                flex: '2',
                align: 'right'
              }));
              cchb.appendChild(create('description', {
                id: 'ssleuth-p-f-secrecy-rating',
                class: 'ssleuth-text-body-rating'
              }));
            }
          }
        } {
          let hb = httpsBox.appendChild(create('hbox', {
            id: 'ssleuth-hbox-3',
            align: 'top'
          })); {
            let chb = hb.appendChild(create('hbox', {
              align: 'left',
              width: IMG_MARGIN_WIDTH
            }));
            chb.appendChild(create('image', {
              id: 'ssleuth-img-tls-version',
              class: 'ssleuth-img-state'
            }));
          } {
            let chb = hb.appendChild(create('hbox', {
              align: 'baseline',
              flex: '2'
            }));
            chb.appendChild(create('description', {
              value: getText('ssltlsversion.text'), 
              class: 'ssleuth-text-title-class'
            }));
            chb.appendChild(create('description', {
              id: 'ssleuth-text-tls-version',
              class: 'ssleuth-text-title-class'
            })); /* {
              let cchb = chb.appendChild(create('hbox', {
                flex: '2',
                align: 'right'
              }));
              cchb.appendChild(create('description', {
                id: 'ssleuth-tls-version-rating',
                class: 'ssleuth-text-body-rating'
              }));
            } */
          }
        } {
          let hb = httpsBox.appendChild(create('hbox', {
            id: 'ssleuth-ff-connection-status'
          })); {
            let vb = hb.appendChild(create('vbox', {
              align: 'left',
              width: IMG_MARGIN_WIDTH
            }));
            vb.appendChild(create('image', {
              id: 'ssleuth-img-ff-connection-status',
              class: 'ssleuth-img-state'
            }));
          } {
            let vb = hb.appendChild(create('vbox', {
              id: 'ssleuth-ff-connection-status-text-vbox',
              flex: '2'
            })); {
              let hb = vb.appendChild(create('hbox', {
                id: 'ssleuth-ff-connection-status-text-hbox',
                align: 'baseline'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-conn-status',
                value: getText('connectionstatus.text'), 
                class: 'ssleuth-text-title-class'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-ff-connection-status',
                class: 'ssleuth-text-title-class'
              })); {
                let chb = hb.appendChild(create('hbox', {
                  flex: '2',
                  align: 'right'
                }));
                chb.appendChild(create('description', {
                  id: 'ssleuth-ff-connection-status-rating',
                  class: 'ssleuth-text-body-rating'
                }));
              }
            }
            vb.appendChild(create('description', {
              id: 'ssleuth-text-ff-connection-status-broken',
              value: getText('connectionstatus.insecure'),
              hidden: true,
              class: 'ssleuth-text-body-class'
            }));
          }
        } {
          let hb = httpsBox.appendChild(create('hbox', {
            height: '100',
            flex: '2'
          })); {
            let chb = hb.appendChild(create('hbox', {
              align: 'left',
              width: IMG_MARGIN_WIDTH
            }));
            chb.appendChild(create('image', {
              id: 'ssleuth-img-cert-state',
              class: 'ssleuth-img-state'
            }));
          } {
            let vb = hb.appendChild(create('vbox', {
              flex: '2'
            })); {
              let hb = vb.appendChild(create('hbox', {
                align: 'baseline'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-cert-label',
                value: getText('certificate.text'), 
                class: 'ssleuth-text-title-class'
              })); {
                let chb = hb.appendChild(create('hbox', {
                  flex: '2',
                  align: 'right'
                }));
                chb.appendChild(create('description', {
                  id: 'ssleuth-cert-status-rating',
                  class: 'ssleuth-text-body-rating'
                }));
              }
            }
            vb.appendChild(create('description', {
              id: 'ssleuth-text-cert-domain-mismatch',
              value: getText('certificate.dommismatch'),
              class: 'ssleuth-text-body-class'
            })); {
              let hb = vb.appendChild(create('hbox', {
                align: 'baseline'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-cert-ev',
                value: getText('extendedvalidation.text'),
                class: 'ssleuth-text-body-class'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-cert-extended-validation',
                class: 'ssleuth-text-body-class'
              })); {
                let chb = hb.appendChild(create('hbox', {
                  flex: '2',
                  align: 'right'
                }));
                chb.appendChild(create('description', {
                  id: 'ssleuth-cert-ev-rating',
                  class: 'ssleuth-text-body-rating'
                }));
              }
            } {
              let hb = vb.appendChild(create('hbox', {
                align: 'baseline'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-cert-sigalg-text',
                value: getText('signature.text'),
                class: 'ssleuth-text-body-class'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-cert-sigalg',
                class: 'ssleuth-text-body-class'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-cert-pub-key-text',
                value: getText('certificate.key'),
                class: 'ssleuth-text-body-class'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-cert-pub-key',
                class: 'ssleuth-text-body-class'
              })); {
                let chb = hb.appendChild(create('hbox', {
                  flex: '2',
                  align: 'right'
                }));
                chb.appendChild(create('description', {
                  id: 'ssleuth-cert-sigalg-rating',
                  class: 'ssleuth-text-body-rating'
                }));
              }
            } {
              let hb = vb.appendChild(create('hbox', {
                align: 'baseline'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-cert-cn-label',
                value: getText('certificate.commonname'),
                class: 'ssleuth-text-body-class'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-cert-common-name',
                class: 'ssleuth-text-body-class'
              }));
            } {
              let hb = vb.appendChild(create('hbox', {
                align: 'baseline'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-cert-issuedto',
                value: getText('certificate.issuedto'),
                class: 'ssleuth-text-body-class'
              })); {
                let vb = hb.appendChild(create('vbox', {
                  align: 'baseline',
                  flex: '1'
                }));
                vb.appendChild(create('description', {
                  id: 'ssleuth-text-cert-org',
                  class: 'ssleuth-text-title-class'
                }));
                vb.appendChild(create('description', {
                  id: 'ssleuth-text-cert-org-unit',
                  class: 'ssleuth-text-body-class'
                }));
              }
            } {
              let hb = vb.appendChild(create('hbox', {
                align: 'baseline'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-cert-issuedby',
                value: getText('certificate.issuedby'),
                class: 'ssleuth-text-body-class'
              })); {
                let vb = hb.appendChild(create('vbox', {
                  align: 'baseline',
                  flex: '1'
                }));
                vb.appendChild(create('description', {
                  id: 'ssleuth-text-cert-issuer-org',
                  class: 'ssleuth-text-title-class'
                }));
                vb.appendChild(create('description', {
                  id: 'ssleuth-text-cert-issuer-org-unit',
                  class: 'ssleuth-text-body-class'
                }));
              }
            } {
              let hb = vb.appendChild(create('hbox', {
                id: 'ssleuth-text-cert-validity-box',
                align: 'baseline'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-cert-validity-text',
                value: getText('certificate.validity'),
                class: 'ssleuth-text-body-class'
              }));
              hb.appendChild(create('description', {
                id: 'ssleuth-text-cert-validity',
                class: 'ssleuth-text-body-class'
              }));
            }
            vb.appendChild(create('description', {
              id: 'ssleuth-text-cert-fingerprint',
              class: 'ssleuth-text-body-class'
            }));
          }
        }

      } {
        let httpBox = mainVbox.appendChild(create('hbox', {
          id: 'ssleuth-panel-box-http',
          align: 'baseline',
          flex: '2',
          width: HTTP_PANEL_WIDTH,
          height: '100',
          hidden: 'true'
        })); {
          let vb = httpBox.appendChild(create('vbox', {
            align: 'left',
            width: IMG_MARGIN_WIDTH
          }));
          vb.appendChild(create('image', {
            id: 'ssleuth-img-http-omg',
            class: 'ssleuth-img-state'
          }));
        } {
          let vb = httpBox.appendChild(create('vbox', {
            flex: '1'
          }));
          let h1 = vb.appendChild(create('description', {
            id: 'ssleuth-text-http-1',
            class: 'ssleuth-text-title-class'
          }));
          h1.textContent = getText('http.unencrypted');
          let h2 = vb.appendChild(create('description', {
            id: 'ssleuth-text-http-2',
            class: 'ssleuth-text-title-class'
          }));

          h2.textContent = getText('http.connectattempt');
          vb.appendChild(create('label', {
            id: 'ssleuth-panel-https-link',
            class: 'text-link',
            crop: 'center',
            focus: 'true'
          }));
          let d1 = vb.appendChild(create('description', {
            id: 'ssleuth-text-http-note',
            class: 'ssleuth-text-body-class'
          }));
          d1.textContent = getText('http.link.disclaimer');
        }
      }

      return mainVbox;
    }

    function panelDomains() {
      // Fix richlistbox maxheight when loading the content ?
      // Or follow something like this : 
      //  http://mike.kaply.com/2011/08/05/richlistbox-tricks-for-your-add-on/
      let domainsVb = create('vbox', {
        id: 'ssleuth-panel-domains-vbox'
      }); {
        let hb = domainsVb.appendChild(create('hbox', {
          id: 'ssleuth-paneltab-domains-disabled-text',
          maxheight: '150',
          hidden: true
        }));
        hb.appendChild(create('description', {
          value: getText('observer.disabled')
        }));
      }
      let rb = domainsVb.appendChild(create('richlistbox', {
        id: 'ssleuth-paneltab-domains-list',
        // TODO : Fix this! css in sheet is not working! 
        style: '-moz-appearance: none; background-color: rgba(0, 0, 0, 0);',
        flex: '1',
        // maxheight: '150'
      })); {
        //flex: '1'})); {//, maxheight: "150"})); {
      }

      return domainsVb;
    }

    function panelCipherSuites() {
      let csVb = create('vbox', {
        id: 'ssleuth-paneltab-ciphers',
        width: HTTPS_PANEL_WIDTH,
        flex: '1'
      });
      let desc = csVb.appendChild(create('description', {}));
      desc.textContent = getText('tab.ciphersuites.note');
      let grid = csVb.appendChild(create('grid', {})); {
        let cols = grid.appendChild(create('columns', {}));
        cols.appendChild(create('column', {}));
        cols.appendChild(create('column', {}));
      } {
        grid.appendChild(create('rows', {
          id: 'ssleuth-paneltab-ciphers-rows'
        }));
      }

      return csVb;
    }

    // Box container for the panel. 
    let panelbox = create('vbox', {
      id: 'ssleuth-panel-vbox'
    }); {
      {
        let hb = panelbox.appendChild(create('hbox', {
          id: 'ssleuth-img-cipher-rank-star',
          align: 'baseline',
          height: '20'
        }));

        for (var i = 1; i <= 10; i++) {
          hb.appendChild(create('image', {
            id: 'ssleuth-img-cipher-rank-star-' + i,
            class: 'ssleuth-star'
          }));
        }

        hb.appendChild(create('description', {
          id: 'ssleuth-text-cipher-rank-numeric',
          class: 'ssleuth-text-title-class'
        }));

        hb.appendChild(create('description', {
          id: 'ssleuth-text-domains-rating-numeric',
        }));
      } {
        // Why not just use tabs ? Why this mess ?
        // tabs - gives poor rendering on the panel with unneccesary paddings. 
        //        - Margins can't be corrected
        //        - They look heavy and bloated.
        //        - Advantage is, it is a standard approach + user can navigate. But..
        // A horizontal listitem/toolbar radio mode buttons doesn't behave well as expected.
        // Then the remaining option is to hack up tabs on my own.
        let hb = panelbox.appendChild(create('hbox', {
          class: 'ssleuth-paneltab-box'
        })); {
          let chb = hb.appendChild(create('hbox', {
            id: 'ssleuth-paneltab-main',
            _selected: 'true',
            class: 'ssleuth-paneltab-tab'
          })); {
            chb.appendChild(create('description', {
              value: getText('tab.primary')
            }));
          }

          // TODO : 'true' 'false' to boolean? _selected is needed for css. 
          //          CSS can't check boolean ?
          chb.addEventListener('click', function () {
            doc.getElementById('ssleuth-panel-deck').selectedIndex = 0;
            doc.getElementById('ssleuth-paneltab-domains').setAttribute('_selected', 'false');
            doc.getElementById('ssleuth-paneltab-cipher').setAttribute('_selected', 'false');
            this.setAttribute('_selected', 'true');
          }, false);
          chb = hb.appendChild(create('hbox', {
            id: 'ssleuth-paneltab-domains',
            _selected: 'false',
            class: 'ssleuth-paneltab-tab'
          })); {
            chb.appendChild(create('description', {
              value: getText('tab.domains')
            }));
          }
          chb.addEventListener('click', function () {
            doc.getElementById('ssleuth-panel-deck').selectedIndex = 1;
            doc.getElementById('ssleuth-paneltab-main').setAttribute('_selected', 'false');
            doc.getElementById('ssleuth-paneltab-cipher').setAttribute('_selected', 'false');
            this.setAttribute('_selected', 'true');
          }, false);
          chb = hb.appendChild(create('hbox', {
            id: 'ssleuth-paneltab-cipher',
            _selected: 'false',
            class: 'ssleuth-paneltab-tab'
          })); {
            chb.appendChild(create('description', {
              value: getText('tab.ciphersuites')
            }));
          }
          chb.addEventListener('click', function () {
            doc.getElementById('ssleuth-panel-deck').selectedIndex = 2;
            doc.getElementById('ssleuth-paneltab-main').setAttribute('_selected', 'false');
            doc.getElementById('ssleuth-paneltab-domains').setAttribute('_selected', 'false');
            this.setAttribute('_selected', 'true');
          }, false);

          chb = hb.appendChild(create('hbox', {
            class: 'ssleuth-paneltab-tab',
            align: 'baseline', 
            _selected: 'false'
          })); {
            phb = chb.appendChild(create('hbox', {
              id: 'ssleuth-paneltab-pref-box',
              style: 'margin-left: 70px;'
            })); 
            phb.appendChild(create('image', {
              id : 'ssleuth-img-panel-pref-icon',
            })); 
          }
        }
      } {
        let deck = panelbox.appendChild(create('deck', {
          id: 'ssleuth-panel-deck'
        }));
        deck.appendChild(panelMain());
        deck.appendChild(panelDomains());
        deck.appendChild(panelCipherSuites());

      }
    }

    return panelbox;
  } catch (e) {
    dump("Error ssleuth panel : " + e.message + "\n");
  }
}
