var EXPORTED_SYMBOLS = ['panel'];

const Cu = Components.utils;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://ssleuth/utils.js');

var panel = function (win) {
    const PANEL_ID = 'ssleuth-panel';

    var create = function (position) {
        var aPanel = win.document.createElement('panel');
        aPanel.setAttribute('id', PANEL_ID);
        aPanel.setAttribute('position', position);
        aPanel.setAttribute('type', 'arrow');

        // Clicking on panel should retain the panel
        aPanel.addEventListener('click', function (e) {
            e.stopPropagation();
        }, false);
        return aPanel;
    }

    var setFont = function (panelFont) {
        var doc = win.document,
            bodyFontClass = 'ssleuth-text-body-class',
            titleFontClass = 'ssleuth-text-title-class',
            imgStateClass = 'ssleuth-img-state';

        // 0 = default, 1 = medium, 2 = large
        var configBody = ['ssleuth-text-body-small', 'ssleuth-text-body-medium',
          'ssleuth-text-body-large'],
            configTitle = ['ssleuth-text-title-small', 'ssleuth-text-title-medium',
          'ssleuth-text-title-large'],
            configImg = ['ssleuth-img-state-small', 'ssleuth-img-state-medium',
          'ssleuth-img-state-large'];
        try {
            var bodyText = doc.getElementsByClassName(bodyFontClass),
                titleText = doc.getElementsByClassName(titleFontClass),
                stateImg = doc.getElementsByClassName(imgStateClass),
                i;

            for (i = 0; i < bodyText.length; i++) {
                bodyText[i].className = bodyFontClass + ' ' + configBody[panelFont];
            }
            for (i = 0; i < titleText.length; i++) {
                titleText[i].className = titleFontClass + ' ' + configTitle[panelFont];
            }
            for (i = 0; i < stateImg.length; i++) {
                stateImg[i].className = imgStateClass + ' ' +
                    configImg[panelFont];
            }

        } catch (e) {
            log.error('setPanelFont error : ' + e.message);
        }
    };

    var panelElement = function () {
        return win.document.getElementById(PANEL_ID);
    };

    var init = function (prefs) {
        panelElement().appendChild(panelbox(win));
        setFont(prefs['panel.fontsize']);
    };

    return {
        get element() {
            return panelElement();
        },
        init: init,
        create: create,
        setFont: setFont
    };
}

var panelbox = function (win) {
    var doc = win.document;
    // With the new tabbed panel, the actual width is determined
    // by the tabs width. So these are just relics. 
    // Check : This might help with the flex for right-side ratings text.
    const HTTPS_PANEL_WIDTH = '300';
    const HTTP_PANEL_WIDTH = '330';

    const IMG_MARGIN_WIDTH = '25';

    var elem = function (type, attrs) {
        // createElement() Regex warnings are targeting 'script' elements.
        // https://bugzilla.mozilla.org/show_bug.cgi?id=625690
        // I don't do script here.
        var e = doc.createElement(type);
        for (var [atr, val] in Iterator(attrs)) {
            e.setAttribute(atr, val);
        }
        return e;
    };

    /* 
     * There are a hell lot of UI elements for the panel.
     * And an XUL overlay file is the right way to do these kind of stuff.
     * But now that overlays are not allowed for restartless addons,
     * and that loadOverlay() is buggy, there must be an intuitive way to do this in js.
     * With XUL xml indentations, it is very easy to identify elements.
     * Here I rely on javascript local scoping and re-use variable names to give
     * that 'intuitiveness'. This is kind of nasty.
     */
    var create = function () {
        try {
            function panelMain() {
                let mainVbox = elem('vbox', {
                    id: 'ssleuth-panel-main-vbox',
                    flex: '2'
                }); {
                    let httpsBox = mainVbox.appendChild(elem('vbox', {
                        id: 'ssleuth-panel-vbox-https',
                        flex: '2',
                        width: HTTPS_PANEL_WIDTH,
                        // height: '250',
                        hidden: 'true'
                    })); {
                        let hb = httpsBox.appendChild(elem('hbox', {
                            align: 'top',
                            width: HTTPS_PANEL_WIDTH,
                            flex: '2'
                        })); {
                            let vb = hb.appendChild(elem('vbox', {
                                align: 'left',
                                width: IMG_MARGIN_WIDTH
                            }));
                            vb.appendChild(elem('image', {
                                id: 'ssleuth-img-cipher-rank',
                                class: 'ssleuth-img-state'
                            }));
                        } {
                            let vb = hb.appendChild(elem('vbox', {
                                flex: '2'
                            }));
                            vb.appendChild(elem('description', {
                                id: 'ssleuth-text-cipher-suite-label',
                                value: utils.getText('ciphersuite.text'),
                                class: 'ssleuth-text-title-class'
                            })); {
                                let hb = vb.appendChild(elem('hbox', {
                                    id: 'ssleuth-text-cipher-suite-name',
                                    align: 'baseline'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-cipher-suite',
                                    class: 'ssleuth-text-body-class'
                                })); {
                                    let chb = hb.appendChild(elem('hbox', {
                                        flex: '2',
                                        align: 'right'
                                    }));
                                    chb.appendChild(elem('description', {
                                        id: 'ssleuth-cipher-suite-rating',
                                        class: 'ssleuth-text-body-rating'
                                    }));
                                }
                            } {
                                let hb = vb.appendChild(elem('hbox', {
                                    id: 'ssleuth-text-key-exchange',
                                    hidden: 'true'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-key-exchange-label',
                                    value: utils.getText('keyexchange.text'),
                                    class: 'ssleuth-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-cipher-suite-kxchange',
                                    class: 'ssleuth-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-cipher-suite-kxchange-notes',
                                    class: 'ssleuth-text-body-class'
                                }));
                            } {
                                let hb = vb.appendChild(elem('hbox', {
                                    id: 'ssleuth-text-authentication'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-authentication-label',
                                    value: utils.getText('authentication.text'),
                                    class: 'ssleuth-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-cipher-suite-auth',
                                    class: 'ssleuth-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-cipher-suite-auth-notes',
                                    class: 'ssleuth-text-body-class'
                                }));
                            } {
                                let hb = vb.appendChild(elem('hbox', {
                                    id: 'ssleuth-text-bulk-cipher'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-bulk-cipher-label',
                                    value: utils.getText('bulkcipher.text'),
                                    class: 'ssleuth-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-cipher-suite-bulkcipher',
                                    class: 'ssleuth-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-cipher-suite-bulkcipher-notes',
                                    class: 'ssleuth-text-body-class'
                                }));
                            } {
                                let hb = vb.appendChild(elem('hbox', {
                                    id: 'ssleuth-text-hmac'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-hmac-label',
                                    value: utils.getText('hmac.text'),
                                    class: 'ssleuth-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-cipher-suite-hmac',
                                    class: 'ssleuth-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-cipher-suite-hmac-notes',
                                    class: 'ssleuth-text-body-class'
                                }));
                            }
                        }
                    } {
                        let hb = httpsBox.appendChild(elem('hbox', {
                            id: 'ssleuth-hbox-2',
                            align: 'top'
                        })); {
                            let chb = hb.appendChild(elem('hbox', {
                                align: 'left',
                                width: IMG_MARGIN_WIDTH
                            }));
                            chb.appendChild(elem('image', {
                                id: 'ssleuth-img-p-f-secrecy',
                                class: 'ssleuth-img-state'
                            }));
                        } {
                            let chb = hb.appendChild(elem('hbox', {
                                align: 'baseline',
                                flex: '2'
                            }));
                            chb.appendChild(elem('description', {
                                id: 'ssleuth-text-p-f-secrecy-label',
                                value: utils.getText('pfs.text'),
                                class: 'ssleuth-text-title-class'
                            }));
                            chb.appendChild(elem('description', {
                                id: 'ssleuth-text-p-f-secrecy',
                                class: 'ssleuth-text-title-class'
                            })); {
                                let cchb = chb.appendChild(elem('hbox', {
                                    flex: '2',
                                    align: 'right'
                                }));
                                cchb.appendChild(elem('description', {
                                    id: 'ssleuth-p-f-secrecy-rating',
                                    class: 'ssleuth-text-body-rating'
                                }));
                            }
                        }
                    } {
                        let hb = httpsBox.appendChild(elem('hbox', {
                            id: 'ssleuth-hbox-3',
                            align: 'top'
                        })); {
                            let chb = hb.appendChild(elem('hbox', {
                                align: 'left',
                                width: IMG_MARGIN_WIDTH
                            }));
                            chb.appendChild(elem('image', {
                                id: 'ssleuth-img-tls-version',
                                class: 'ssleuth-img-state'
                            }));
                        } {
                            let chb = hb.appendChild(elem('hbox', {
                                align: 'baseline',
                                flex: '2'
                            }));
                            chb.appendChild(elem('description', {
                                id: 'ssleuth-text-tls-version-label',
                                value: utils.getText('ssltlsversion.text'),
                                class: 'ssleuth-text-title-class'
                            }));
                            chb.appendChild(elem('description', {
                                id: 'ssleuth-text-tls-version',
                                class: 'ssleuth-text-title-class'
                            }));
                            /* {
                                         let cchb = chb.appendChild(elem('hbox', {
                                           flex: '2',
                                           align: 'right'
                                         }));
                                         cchb.appendChild(elem('description', {
                                           id: 'ssleuth-tls-version-rating',
                                           class: 'ssleuth-text-body-rating'
                                         }));
                                       } */
                        }
                    } {
                        let hb = httpsBox.appendChild(elem('hbox', {
                            id: 'ssleuth-ff-connection-status',
                            flex: '2'
                        })); {
                            let vb = hb.appendChild(elem('vbox', {
                                align: 'left',
                                width: IMG_MARGIN_WIDTH
                            }));
                            vb.appendChild(elem('image', {
                                id: 'ssleuth-img-ff-connection-status',
                                class: 'ssleuth-img-state'
                            }));
                        } {
                            let vb = hb.appendChild(elem('vbox', {
                                id: 'ssleuth-ff-connection-status-text-vbox',
                                flex: '1'
                            })); {
                                let hb = vb.appendChild(elem('hbox', {
                                    id: 'ssleuth-ff-connection-status-text-hbox',
                                    align: 'baseline'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-conn-status',
                                    value: utils.getText('connectionstatus.text'),
                                    class: 'ssleuth-text-title-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-ff-connection-status',
                                    class: 'ssleuth-text-title-class'
                                })); {
                                    let chb = hb.appendChild(elem('hbox', {
                                        flex: '2',
                                        align: 'right'
                                    }));
                                    chb.appendChild(elem('description', {
                                        id: 'ssleuth-ff-connection-status-rating',
                                        class: 'ssleuth-text-body-rating'
                                    }));
                                }
                            }
                            let desc1 = vb.appendChild(elem('description', {
                                id: 'ssleuth-text-ff-connection-status-broken',
                                hidden: true,
                                class: 'ssleuth-text-body-class'
                            }));
                            desc1.textContent = utils.getText('connectionstatus.insecure');
                        }
                    } {
                        let hb = httpsBox.appendChild(elem('hbox', {
                            height: '100',
                            flex: '2'
                        })); {
                            let chb = hb.appendChild(elem('hbox', {
                                align: 'left',
                                width: IMG_MARGIN_WIDTH
                            }));
                            chb.appendChild(elem('image', {
                                id: 'ssleuth-img-cert-state',
                                class: 'ssleuth-img-state'
                            }));
                        } {
                            let vb = hb.appendChild(elem('vbox', {
                                flex: '2'
                            })); {
                                let hb = vb.appendChild(elem('hbox', {
                                    align: 'baseline'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-cert-label',
                                    value: utils.getText('certificate.text'),
                                    class: 'ssleuth-text-title-class'
                                })); {
                                    let chb = hb.appendChild(elem('hbox', {
                                        flex: '2',
                                        align: 'right'
                                    }));
                                    chb.appendChild(elem('description', {
                                        id: 'ssleuth-cert-status-rating',
                                        class: 'ssleuth-text-body-rating'
                                    }));
                                }
                            }
                            vb.appendChild(elem('description', {
                                id: 'ssleuth-text-cert-domain-mismatch',
                                value: utils.getText('certificate.dommismatch'),
                                class: 'ssleuth-text-body-class'
                            })); {
                                let hb = vb.appendChild(elem('hbox', {
                                    align: 'baseline'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-cert-ev',
                                    value: utils.getText('extendedvalidation.text'),
                                    class: 'ssleuth-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-cert-extended-validation',
                                    class: 'ssleuth-text-body-class'
                                })); {
                                    let chb = hb.appendChild(elem('hbox', {
                                        flex: '2',
                                        align: 'right'
                                    }));
                                    chb.appendChild(elem('description', {
                                        id: 'ssleuth-cert-ev-rating',
                                        class: 'ssleuth-text-body-rating'
                                    }));
                                }
                            } {
                                let hb = vb.appendChild(elem('hbox', {
                                    align: 'baseline'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-cert-sigalg-text',
                                    value: utils.getText('signature.text'),
                                    class: 'ssleuth-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-cert-sigalg',
                                    class: 'ssleuth-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-cert-pub-key-text',
                                    value: utils.getText('certificate.key'),
                                    class: 'ssleuth-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-cert-pub-key',
                                    class: 'ssleuth-text-body-class'
                                })); {
                                    let chb = hb.appendChild(elem('hbox', {
                                        flex: '2',
                                        align: 'right'
                                    }));
                                    chb.appendChild(elem('description', {
                                        id: 'ssleuth-cert-sigalg-rating',
                                        class: 'ssleuth-text-body-rating'
                                    }));
                                }
                            } {
                                let hb = vb.appendChild(elem('hbox', {
                                    align: 'baseline'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-cert-cn-label',
                                    value: utils.getText('certificate.commonname'),
                                    class: 'ssleuth-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-cert-common-name',
                                    class: 'ssleuth-text-body-class'
                                }));
                            } {
                                let hb = vb.appendChild(elem('hbox', {
                                    align: 'baseline'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-cert-issuedto',
                                    value: utils.getText('certificate.issuedto'),
                                    class: 'ssleuth-text-body-class'
                                })); {
                                    let vb = hb.appendChild(elem('vbox', {
                                        align: 'baseline',
                                        flex: '1'
                                    }));
                                    vb.appendChild(elem('description', {
                                        id: 'ssleuth-text-cert-org',
                                        class: 'ssleuth-text-title-class'
                                    }));
                                    vb.appendChild(elem('description', {
                                        id: 'ssleuth-text-cert-org-unit',
                                        class: 'ssleuth-text-body-class'
                                    }));
                                }
                            } {
                                let hb = vb.appendChild(elem('hbox', {
                                    align: 'baseline'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-cert-issuedby',
                                    value: utils.getText('certificate.issuedby'),
                                    class: 'ssleuth-text-body-class'
                                })); {
                                    let vb = hb.appendChild(elem('vbox', {
                                        align: 'baseline',
                                        flex: '1'
                                    }));
                                    vb.appendChild(elem('description', {
                                        id: 'ssleuth-text-cert-issuer-org',
                                        class: 'ssleuth-text-title-class'
                                    }));
                                    vb.appendChild(elem('description', {
                                        id: 'ssleuth-text-cert-issuer-org-unit',
                                        class: 'ssleuth-text-body-class'
                                    }));
                                }
                            } {
                                let hb = vb.appendChild(elem('hbox', {
                                    id: 'ssleuth-text-cert-validity-box',
                                    align: 'baseline'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-cert-validity-text',
                                    value: utils.getText('certificate.validity'),
                                    class: 'ssleuth-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'ssleuth-text-cert-validity',
                                    class: 'ssleuth-text-body-class'
                                }));
                            } {
                                let hb1 = vb.appendChild(elem('hbox', {
                                    id: 'ssleuth-text-cert-fingerprint-label-box',
                                    align: 'baseline',
                                })); 
                                let hb2 = vb.appendChild(elem('hbox', {
                                    id: 'ssleuth-text-cert-fingerprint-box',
                                    align: 'baseline',
                                })); {
                                    let chb = hb2.appendChild(elem('hbox', {
                                        align: 'left',
                                        width: IMG_MARGIN_WIDTH
                                    }));

                                    let canvas = doc.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
                                    canvas.setAttribute('id', 'ssleuth-img-cert-fingerprint-identicon');
                                    canvas.setAttribute('width', 58);
                                    canvas.setAttribute('height', 58);

                                    chb.appendChild(canvas);
                                } {
                                    let vb = hb2.appendChild(elem('vbox', {
                                        align: 'baseline',
                                        flex: '1'
                                    }));
                                    vb.appendChild(elem('description', {
                                        id: 'ssleuth-text-cert-fingerprint-label',
                                        value: utils.getText('certificate.fingerprint'),
                                        class: 'ssleuth-text-body-class',
                                    }));
                                    vb.appendChild(elem('description', {
                                        id: 'ssleuth-text-cert-fingerprint-1',
                                        class: 'ssleuth-text-body-class'
                                    }));
                                    vb.appendChild(elem('description', {
                                        id: 'ssleuth-text-cert-fingerprint-2',
                                        class: 'ssleuth-text-body-class'
                                    }));
                                    vb.appendChild(elem('description', {
                                        id: 'ssleuth-text-cert-fingerprint-3',
                                        class: 'ssleuth-text-body-class'
                                    }));
                                }
                            }
                        }
                    }

                } {
                    let httpBox = mainVbox.appendChild(elem('hbox', {
                        id: 'ssleuth-panel-box-http',
                        align: 'baseline',
                        flex: '2',
                        width: HTTP_PANEL_WIDTH,
                        //height: '100',
                        hidden: 'true'
                    })); {
                        let vb = httpBox.appendChild(elem('vbox', {
                            align: 'left',
                            width: IMG_MARGIN_WIDTH
                        }));
                        vb.appendChild(elem('image', {
                            id: 'ssleuth-img-http-omg',
                            class: 'ssleuth-img-state'
                        }));
                    } {
                        let vb = httpBox.appendChild(elem('vbox', {
                            flex: '1'
                        }));
                        let h1 = vb.appendChild(elem('description', {
                            id: 'ssleuth-text-http-1',
                            class: 'ssleuth-text-title-class'
                        }));
                        h1.textContent = utils.getText('http.unencrypted');
                        let h2 = vb.appendChild(elem('description', {
                            id: 'ssleuth-text-http-2',
                            class: 'ssleuth-text-title-class'
                        }));

                        h2.textContent = utils.getText('http.connectattempt');
                        vb.appendChild(elem('label', {
                            id: 'ssleuth-panel-https-link',
                            class: 'text-link',
                            crop: 'center',
                            focus: 'true'
                        }));
                        let d1 = vb.appendChild(elem('description', {
                            id: 'ssleuth-text-http-note',
                            class: 'ssleuth-text-body-class'
                        }));
                        d1.textContent = utils.getText('http.link.disclaimer');
                    }
                }

                return mainVbox;
            }

            function panelDomains() {
                // Fix richlistbox maxheight when loading the content ?
                // Or follow something like this : 
                //  http://mike.kaply.com/2011/08/05/richlistbox-tricks-for-your-add-on/
                let domainsVb = elem('vbox', {
                    id: 'ssleuth-panel-domains-vbox',
                    width: HTTPS_PANEL_WIDTH,
                    flex: '1'
                });

                let rb = domainsVb.appendChild(elem('richlistbox', {
                    id: 'ssleuth-paneltab-domains-list',
                    // TODO : Fix. css in sheet is not working! 
                    style: '-moz-appearance: none; background-color: rgba(0, 0, 0, 0);',
                    flex: '1',
                    // maxheight: '150'
                })); {
                    //flex: '1'})); {//, maxheight: '150'})); {
                }

                return domainsVb;
            }

            function panelCipherSuites() {
                let csVb = elem('vbox', {
                    id: 'ssleuth-paneltab-ciphers',
                    width: HTTPS_PANEL_WIDTH,
                    flex: '1'
                });
                let desc = csVb.appendChild(elem('description', {}));
                desc.textContent = utils.getText('tab.ciphersuites.note');
                let grid = csVb.appendChild(elem('grid', {})); {
                    let cols = grid.appendChild(elem('columns', {}));
                    cols.appendChild(elem('column', {}));
                    cols.appendChild(elem('column', {}));
                } {
                    grid.appendChild(elem('rows', {
                        id: 'ssleuth-paneltab-ciphers-rows'
                    }));
                }
                csVb.appendChild(elem('separator', {
                    class: 'groove-thin',
                    orient: 'horizontal'
                }));
                let hb = csVb.appendChild(elem('hbox', {})); {
                    hb.appendChild(elem('button', {
                        label: utils.getText('menu.resetall'),
                        id: 'ssleuth-paneltab-ciphers-btn-reset',
                    }));
                    hb.appendChild(elem('button', {
                        label: utils.getText('menu.customlist'),
                        id: 'ssleuth-paneltab-ciphers-btn-custom',
                    }));
                }

                return csVb;
            }

            // Box container for the panel. 
            let panelvbox = elem('vbox', {
                id: 'ssleuth-panel-vbox'
            }); {
                {
                    let hb = panelvbox.appendChild(elem('hbox', {
                        id: 'ssleuth-img-cipher-rank-star',
                        align: 'baseline',
                        height: '20'
                    }));

                    for (var i = 1; i <= 10; i++) {
                        hb.appendChild(elem('image', {
                            id: 'ssleuth-img-cipher-rank-star-' + i,
                            class: 'ssleuth-star'
                        }));
                    }

                    hb.appendChild(elem('description', {
                        id: 'ssleuth-text-cipher-rank-numeric',
                        class: 'ssleuth-text-title-class'
                    })); {
                        let chb = hb.appendChild(elem('hbox', {
                            id: 'ssleuth-domains-rating-box',
                            align: 'baseline',
                        }));

                        chb.appendChild(elem('description', {
                            id: 'ssleuth-text-domains-rating-separator',
                            value: ' | ',
                        }));
                        chb.appendChild(elem('image', {
                            id: 'ssleuth-img-domains-rating',
                            width: '8',
                        }));
                        chb.appendChild(elem('description', {
                            id: 'ssleuth-text-domains-rating-numeric',
                        }));
                    }
                } {
                    // Why not just use tabs ? Why this mess ?
                    // tabs - gives poor rendering on the panel with unneccesary paddings. 
                    //        - Margins can't be corrected
                    //        - They look heavy and bloated.
                    //        - Advantage is, it is a standard approach + user can navigate. But..
                    // A horizontal listitem/toolbar radio mode buttons doesn't behave well as expected.
                    // Then the remaining option is to hack up tabs on my own.
                    let hb = panelvbox.appendChild(elem('hbox', {
                        class: 'ssleuth-paneltab-box'
                    })); {
                        let chb = hb.appendChild(elem('hbox', {
                            id: 'ssleuth-paneltab-main',
                            _selected: 'true',
                            class: 'ssleuth-paneltab-tab'
                        })); {
                            chb.appendChild(elem('description', {
                                value: utils.getText('tab.primary')
                            }));
                        }

                        // TODO : 'true' 'false' to boolean? _selected is needed for css. 
                        //          CSS can't check boolean ?
                        chb.addEventListener('click', function () {
                            doc.getElementById('ssleuth-panel-deck').selectedIndex = 0;
                            doc.getElementById('ssleuth-paneltab-domains').setAttribute('_selected', 'false');
                            doc.getElementById('ssleuth-paneltab-cipher').setAttribute('_selected', 'false');
                            doc.getElementById('ssleuth-paneltab-main').setAttribute('_selected', 'true');
                        }, false);
                        chb = hb.appendChild(elem('hbox', {
                            id: 'ssleuth-paneltab-domains',
                            _selected: 'false',
                            class: 'ssleuth-paneltab-tab'
                        })); {
                            chb.appendChild(elem('description', {
                                value: utils.getText('tab.domains')
                            }));
                        }
                        chb.addEventListener('click', function () {
                            doc.getElementById('ssleuth-panel-deck').selectedIndex = 1;
                            doc.getElementById('ssleuth-paneltab-main').setAttribute('_selected', 'false');
                            doc.getElementById('ssleuth-paneltab-cipher').setAttribute('_selected', 'false');
                            doc.getElementById('ssleuth-paneltab-domains').setAttribute('_selected', 'true');
                        }, false);
                        chb = hb.appendChild(elem('hbox', {
                            id: 'ssleuth-paneltab-cipher',
                            _selected: 'false',
                            class: 'ssleuth-paneltab-tab'
                        })); {
                            chb.appendChild(elem('description', {
                                value: utils.getText('tab.ciphersuites')
                            }));
                        }
                        chb.addEventListener('click', function () {
                            doc.getElementById('ssleuth-panel-deck').selectedIndex = 2;
                            doc.getElementById('ssleuth-paneltab-main').setAttribute('_selected', 'false');
                            doc.getElementById('ssleuth-paneltab-domains').setAttribute('_selected', 'false');
                            doc.getElementById('ssleuth-paneltab-cipher').setAttribute('_selected', 'true');
                        }, false);

                        chb = hb.appendChild(elem('hbox', {
                            class: 'ssleuth-paneltab-tab',
                            align: 'baseline',
                            _selected: 'false'
                        })); {
                            phb = chb.appendChild(elem('hbox', {
                                id: 'ssleuth-paneltab-pref-box',
                                style: 'margin-left: 50px;'
                            }));
                            var clipboard = phb.appendChild(elem('image', {
                                id: 'ssleuth-img-panel-clipboard',
                                tooltiptext: utils.getText('panel.tooltip.clipboard'),
                            }));
                            phb.appendChild(elem('image', {
                                id: 'ssleuth-img-panel-pref-icon',
                                tooltiptext: utils.getText('panel.tooltip.preferences'),
                            }));
                        }
                    }
                } {
                    let deck = panelvbox.appendChild(elem('deck', {
                        id: 'ssleuth-panel-deck'
                    }));
                    deck.appendChild(panelMain());
                    deck.appendChild(panelDomains());
                    deck.appendChild(panelCipherSuites());
                }
            }

            return panelvbox;

        } catch (e) {
            log.error('Error ssleuth panel : ' + e.message);
        }
    };

    return create();
};
