'use strict';

var EXPORTED_SYMBOLS = ['ssleuth'];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');

Cu.import('resource://ssleuth/utils.js');
Cu.import('resource://ssleuth/cipher-suites.js');
Cu.import('resource://ssleuth/observer.js');
Cu.import('resource://ssleuth/ssleuth-ui.js');
Cu.import('resource://ssleuth/preferences.js');
Cu.import('resource://ssleuth/windows.js');

var ssleuth = (function () {
    var initPrefs = null;

    var startup = function (firstRun, reinstall) {
        try {
            initPrefs = preferences.init(prefListener);

            observer.init(observerCallbacks);

            ui.startup(initPrefs);
            windows.init(initWindow, uninitWindow);
        } catch (e) {
            log.error('Error preferences ssleuth init : ' + e.message);
        }
    };

    var shutdown = function () {

        windows.uninit();
        ui.shutdown();
        preferences.uninit();
        observer.uninit();
        log.unload();
    };

    var uninstall = function () {
        Services.prefs.getBranch('extensions.ssleuth').deleteBranch('');
    };

    var initWindow = function (win) {
        try {
            progressListener(win).init();
            listener(win).init();

            ui.init(win);

        } catch (e) {
            log.error('Error ssleuth init : ' + e.message);
            uninitWindow(win);
        }
    };

    var uninitWindow = function (win) {
        ui.uninit(win);

        // Listener and progresslisteners are unloaded along with window unloaders
    };

    return {
        startup: startup,
        shutdown: shutdown,
        uninstall: uninstall,
        get prefs() {
            return initPrefs;
        }
    };

}());

var progressListener = function (win) {

    var prevURL, urlChanged,
        msgListener = listener(win);

    var webProgressListener = {
        QueryInterface: XPCOMUtils.generateQI(['nsIWebProgressListener',
                                           'nsISupportsWeakReference']),

        onStateChange: function (progress, request, flag, status) {

            msgListener.getFrameMessage(function (msg) {
                if (!request) return;

                var winId = msg.id,
                    uri = msg.uri,
                    scheme = msg.scheme;

                // TODO check for request may not be necessary.
                // used before for passing on to updateResponseCache.
                if ((flag & Ci.nsIWebProgressListener.STATE_START) &&
                    (request instanceof Ci.nsIChannel)) {
                    // TODO : Can cause reload of cache if there is a statechange
                    // due to blocked contents

                    // Re-init. New location, new cache.
                    // This does re-init cache when the current tab loads another or reload.
                    log.debug('New location, new cache. winId : ' + winId + ' flag : ' + flag.toString(16));

                    observer.newLoc(uri, winId);
                }

                if ((flag & Ci.nsIWebProgressListener.STATE_STOP)) {

                    setCrossDomainRating(winId);
                    ui.onStateStop(win, winId); // TODO : optimize
                }

            });
        },

        onLocationChange: function (progress, request, uri, flag) {
            msgListener.getFrameMessage(function (msg) {

                var winId = msg.id,
                    scheme = msg.scheme;
                if (!winId) return;

                if ((scheme === 'https' || scheme === 'http') &&
                    (observer.responseCache[winId])) {
                    // onStateChange events will only be received for the current tab.
                    // So we won't catch the STOP event to compute ratings
                    // This is a workaround, and inefficient. 
                    setCrossDomainRating(winId);
                }

                urlChanged = !(uri.spec === prevURL);
                prevURL = uri.spec;

                ui.onLocationChange(win, winId, urlChanged);

            });
        },

        onSecurityChange: function (progress, request, state) {

            msgListener.getFrameMessage(function (msg) {
                if (state === 0) return;

                var scheme = msg.scheme,
                    uri = msg.uri,
                    winId = msg.id;

                try {
                    if (scheme === 'https') {
                        protocolHttps(progress, state, win, winId);
                    } else if (scheme === 'http') {
                        protocolHttp(uri, win, winId);
                    } else {
                        protocolUnknown(win, winId);
                    }
                } catch (e) {
                    log.error('Error onSecurityChange : ' + e.message);
                }
            });
        },
    };

    var init = function () {

        win.gBrowser.addProgressListener(webProgressListener);
        prevURL = null;
        urlChanged = false;

        windows.onUnload(win, function () {
            win.gBrowser.removeProgressListener(webProgressListener);
        });
    };

    return {
        init: init
    };

};

function protocolUnknown(win, winId) {
    setDomainStates('Insecure', false, winId);
    ui.protocolChange('unknown', '', win, winId);
}

function protocolHttp(loc, win, winId) {
    var httpsURL = loc.toString().replace('http://', 'https://');

    setDomainStates('Insecure', false, winId);
    ui.protocolChange('http', httpsURL, win, winId);
}

function protocolHttps(progress, state, win, winId) {
    var secUI = win.gBrowser.securityUI;
    if (!secUI) return;

    var sslStatus = secUI.SSLStatus;
    if (!sslStatus) {
        secUI.QueryInterface(Ci.nsISSLStatusProvider);
        if (secUI.SSLStatus) {
            sslStatus = secUI.SSLStatus;
        } else {
            // 1. Firefox do not seem to populate
            //  SSLStatus if a tab switches to a page with the same URL.
            //
            // 2. A page load event can fire even if there is 
            //  no connectivity and user attempts to reload a page. 
            //  Hide the panel to prevent stale values from getting 
            //  displayed 

            // TODO : Recheck urlChanged context for the redesign
            if (progressListener(win).urlChanged) {
                ui.protocolChange('unknown', '', win, winId);
            }
            return;
        }
    }

    const cs = ssleuthCipherSuites;
    var securityState = '';
    var cipherName = sslStatus.cipherName;
    var extendedValidation = false;

    // Security Info - Firefox states
    if ((state & Ci.nsIWebProgressListener.STATE_IS_SECURE)) {
        securityState = 'Secure';
    } else if ((state & Ci.nsIWebProgressListener.STATE_IS_INSECURE)) {
        securityState = 'Insecure';
    } else if ((state & Ci.nsIWebProgressListener.STATE_IS_BROKEN)) {
        securityState = 'Broken';
    }

    if (state & Ci.nsIWebProgressListener.STATE_IDENTITY_EV_TOPLEVEL) {
        extendedValidation = true;
    }

    setDomainStates(securityState, extendedValidation, winId);
    setTLSVersion(win, winId);

    var cipherSuite = {
        name: cipherName,
        rank: cs.cipherSuiteStrength.LOW,
        pfs: 0,
        cipherKeyLen: sslStatus.secretKeyLength,
        keyExchange: null,
        authentication: null,
        bulkCipher: null,
        HMAC: null
    };

    var cert = {
        serverCert: sslStatus.serverCert,
        pubKeySize: 0,
        pubKeyAlg: '',
        pubKeyMinSecure: false,
        isValid: false,
        signatureAlg: null
    };

    function getCsParam(param) {
        for (var i = 0; i < param.length; i++) {
            if ((cipherName.indexOf(param[i].name) != -1)) {
                return param[i];
            }
        }
        return null;
    }

    cipherSuite.keyExchange = getCsParam(cs.keyExchange);
    cipherSuite.authentication = getCsParam(cs.authentication);
    cipherSuite.bulkCipher = getCsParam(cs.bulkCipher);
    cipherSuite.HMAC = getCsParam(cs.HMAC);
    cipherSuite.pfs = cipherSuite.keyExchange.pfs;

    if (cipherSuite.bulkCipher.name === '') {
        // Something's missing in our list.
        // Get the security strength from Firefox's own flags.
        // Set cipher rank
        if (state & Ci.nsIWebProgressListener.STATE_SECURE_HIGH) {
            cipherSuite.bulkCipher.rank = cs.cipherSuiteStrength.MAX;
        } else if (state & Ci.nsIWebProgressListener.STATE_SECURE_MED) {
            cipherSuite.bulkCipher.rank = cs.cipherSuiteStrength.HIGH - 1;
        } else if (state & Ci.nsIWebProgressListener.STATE_SECURE_LOW) {
            cipherSuite.bulkCipher.rank = cs.cipherSuiteStrength.MED - 1;
        }
    }

    // Certificate public key algorithim, key size
    cert.pubKeyAlg = cipherSuite.authentication.cert;
    cert.pubKeySize = getKeySize(cert.serverCert, cert.pubKeyAlg);
    cert.pubKeyMinSecure =
        (cert.pubKeySize >= cipherSuite.authentication.minSecureKeyLength);
    cert.signatureAlg = getSignatureAlg(cert.serverCert);
    // Weak keys are rated down.
    !cert.pubKeyMinSecure && (cert.signatureAlg.rating = 0);

    const csWeighting = ssleuth.prefs['rating.ciphersuite.params'];
    // Calculate ciphersuite rank  - All the cipher suite params ratings
    // are out of 10, so this will get normalized to 10.
    cipherSuite.rank = (cipherSuite.keyExchange.rank * csWeighting.keyExchange +
        cipherSuite.bulkCipher.rank * csWeighting.bulkCipher +
        cipherSuite.HMAC.rank * csWeighting.hmac) / csWeighting.total;

    cert.isValid = isCertValid(cert.serverCert);

    var connectionRating = getConnectionRating(cipherSuite.rank,
        cipherSuite.pfs,
        securityState, (!sslStatus.isDomainMismatch && cert.isValid),
        extendedValidation,
        cert.signatureAlg.rating);

    // Invoke the UI to do its job
    ui.protocolChange('https', {
            rating: connectionRating,
            cipherSuite: cipherSuite,
            state: securityState,
            cert: cert,
            domMismatch: sslStatus.isDomainMismatch,
            ev: extendedValidation
        },
        win, winId);
}

function getConnectionRating(csRating, pfs, ffStatus, certStatus, evCert, signature) {
    const rp = ssleuth.prefs['rating.params'];
    // Connection rating. Normalize the params to 10
    var rating = (csRating * rp.cipherSuite + pfs * 10 * rp.pfs +
        Number(ffStatus == 'Secure') * 10 * rp.ffStatus +
        Number(certStatus) * 10 * rp.certStatus + Number(evCert) * 10 * rp.evCert + signature * rp.signature) / rp.total;

    return Number(rating).toFixed(1);
}

function setDomainStates(ffStatus, evCert, winId) {
    observer.updateLocEntry(winId, {
        ffStatus: ffStatus,
        evCert: evCert
    });
}

function setTLSVersion(win, winId) {
    try {
        var index = '';
        var versionStrings = ['sslv3', 'tlsv1_0', 'tlsv1_1', 'tlsv1_2'];

        // TODO : At the moment, depends on observer module. Change.
        if (Services.vc.compare(Services.appinfo.platformVersion, '36.0') > -1) {
            var secUI = win.gBrowser.securityUI;
            if (secUI) {
                var sslStatus = secUI.SSLStatus;
                if (sslStatus)
                    index = versionStrings[sslStatus.protocolVersion & 0xFF];
            }
        } else if (Services.vc.compare(Services.appinfo.platformVersion, '29.0') < 0) {
            index = 'ff_29plus';
        }
        if (index !== '') {
            observer.updateLocEntry(winId, {
                tlsVersion: index,
            });
        }

    } catch (e) {
        log.error('Error setTLSVersion : ' + e.message);
    }
}

function setCrossDomainRating(tab) {
    try {
        var respCache = observer.responseCache[tab];

        if (!respCache) return;
        let reqs = respCache['reqs'];

        var cxRating = 0,
            count = 0,
            mixed = false;

        for (var [domain, stats] in Iterator(reqs)) {
            count += stats['count'];
            if (domain.indexOf('https:') != -1) {
                cxRating += stats['count'] * stats['cxRating'];
            } else if (domain.indexOf('http:') != -1) {
                mixed = true;
            }
        }

        if (count == 0) return;

        var rating = Number(cxRating / count).toFixed(1);
        observer.updateLocEntry(tab, {
            domainsRating: rating,
            mixedContent: mixed,
        });

    } catch (e) {
        log.error('Error setCrossDomainRating : ' + e.message);
    }

}

function domainsUpdated(tab) {
    ui.domainsUpdated(tab);
}

function isCertValid(cert) {
    var usecs = new Date().getTime();
    return ((usecs > cert.validity.notBefore / 1000 &&
        usecs < cert.validity.notAfter / 1000) ? true : false);
}

function checkPFS(cipherName) {
    const csP = ssleuthCipherSuites.keyExchange;
    for (var i = 0; i < csP.length; i++) {
        if ((cipherName.indexOf(csP[i].name) != -1)) {
            return Boolean(csP[i].pfs);
        }
    }
    return false;
}

function getCipherSuiteRating(cipherName) {
    const cs = ssleuthCipherSuites;
    const csW = ssleuth.prefs['rating.ciphersuite.params'];

    function getRating(csParam) {
        for (var i = 0; i < csParam.length; i++) {
            if ((cipherName.indexOf(csParam[i].name) != -1)) {
                return csParam[i].rank;
            }
        }
        return null;
    }
    var keyExchange = getRating(cs.keyExchange);
    var bulkCipher = getRating(cs.bulkCipher);
    var hmac = getRating(cs.HMAC);

    if ((keyExchange && bulkCipher && hmac) == null)
        return null;

    return ((keyExchange * csW.keyExchange + bulkCipher * csW.bulkCipher + hmac * csW.hmac) / csW.total);
}

function getKeySize(cert, alg) {
    var keySize = '';
    try {
        var certASN1 = Cc['@mozilla.org/security/nsASN1Tree;1']
            .createInstance(Ci.nsIASN1Tree);
        certASN1.loadASN1Structure(cert.ASN1Structure);

        // The public key size is not available directly as an attribute in any 
        // interfaces. So we're on our own parsing the cert structure strings. 
        // Here I didn't want to mess around with strings in the structure
        // which could get localized.
        // So simply extract the first occuring digit from the string
        // corresponding to Subject's Public key. Hope this holds on. 
        switch (alg) {
        case 'RSA':
            keySize = certASN1.getDisplayData(12)
                .split('\n')[0]
                .match(/\d+/g)[0];
            break;
        case 'ECC':
            keySize = certASN1.getDisplayData(14)
                .split('\n')[0]
                .match(/\d+/g)[0];
            break;
            // TODO : DSS
        }
    } catch (e) {
        log.error('Error getKeySize() : ' + e.message);
    }
    return keySize;
}

function getSignatureAlg(cert) {
    try {
        var certASN1 = Cc['@mozilla.org/security/nsASN1Tree;1']
            .createInstance(Ci.nsIASN1Tree);
        certASN1.loadASN1Structure(cert.ASN1Structure);
        var sigText = certASN1.getDisplayData(4).replace(/PKCS #1/g, '');
        var signature = {
            hmac: '',
            enc: '',
            rating: 0
        };

        // Some certs only have OIDs in them.
        // 1 2 840 10045 = ANSI X9.62 ECDSA signatures
        if (sigText.indexOf('1 2 840 10045') != -1) {
            if (sigText.indexOf('1 2 840 10045 4 1') != -1) {
                sigText = 'ECDSA with SHA-1';
            } else if (sigText.indexOf('1 2 840 10045 4 3 1') != -1) {
                sigText = 'ECDSA with SHA-224';
            } else if (sigText.indexOf('1 2 840 10045 4 3 2') != -1) {
                sigText = 'ECDSA with SHA-256';
            } else if (sigText.indexOf('1 2 840 10045 4 3 3') != -1) {
                sigText = 'ECDSA with SHA-384';
            } else if (sigText.indexOf('1 2 840 10045 4 3 4') != -1) {
                sigText = 'ECDSA with SHA-512';
            }
        }

        const cs = ssleuthCipherSuites;
        for (var i = 0; i < cs.HMAC.length; i++) {
            if ((sigText.indexOf(cs.HMAC[i].ui) != -1) || ((cs.HMAC[i].sigui) &&
                    (sigText.indexOf(cs.HMAC[i].sigui) != -1))) {
                signature.hmac += cs.HMAC[i].ui;
                signature.rating += cs.HMAC[i].rank;
                break;
            }
        }
        for (var i = 0; i < cs.authentication.length; i++) {
            if ((sigText.indexOf(cs.authentication[i].ui) != -1)) {
                signature.enc += cs.authentication[i].ui;
                signature.rating += cs.authentication[i].rank;
                signature.rating /= 2;
                break;
            }
        }
        return signature;

    } catch (e) {
        log.error('Error getSignatureAlg() : ' + e.message);
    }
}

// TODO : optimize, combine the rating, cipher suite string matching 
//
function getCertificateAlg(cipherName) {
    const csA = ssleuthCipherSuites.authentication;
    for (var i = 0; i < csA.length; i++) {
        if ((cipherName.indexOf(csA[i].name) != -1)) {
            return csA[i].cert;
        }
    }
    return '';
}

function toggleCipherSuites(prefsOld) {
    const prefs = preferences.service;
    const br = 'security.ssl3.';
    const SUITES_TOGGLE = 'suites.toggle';
    const PREF_SUITES_TOGGLE = 'extensions.ssleuth.' + SUITES_TOGGLE;

    for (var t = 0; t < ssleuth.prefs[SUITES_TOGGLE].length; t++) {

        var cs = ssleuth.prefs[SUITES_TOGGLE][t];
        switch (cs.state) {
        case 'default':
            // Check if the element was present before.
            // Reset only if the old state was 'enable' or 'disable'.
            var j;
            for (j = 0; j < prefsOld.length; j++) {
                if (prefsOld[j].name === cs.name)
                    break;
            }
            if (j == prefsOld.length) // not found
                continue;
            if (prefsOld[j].state === 'default')
                continue;
            // Reset once
            for (var i = 0; i < cs.list.length; i++) {
                prefs.clearUserPref(br + cs.list[i]);
            }
            ssleuth.prefs[SUITES_TOGGLE][t] = cs;
            prefs.setCharPref(PREF_SUITES_TOGGLE,
                JSON.stringify(ssleuth.prefs[SUITES_TOGGLE]));
            break;

            // Only toggle these if they actually exist! Do not mess up
            // user profile with non-existing cipher suites. Do a 
            // check with getPrefType() before setting the prefs.
        case 'enable':
            for (var i = 0; i < cs.list.length; i++) {
                if (prefs.getPrefType(br + cs.list[i]) === prefs.PREF_BOOL) {
                    prefs.setBoolPref(br + cs.list[i], true);
                }
            }
            break;
        case 'disable':
            for (var i = 0; i < cs.list.length; i++) {
                if (prefs.getPrefType(br + cs.list[i]) === prefs.PREF_BOOL) {
                    prefs.setBoolPref(br + cs.list[i], false);
                }
            }
            break;
        }
    }

    // Reload, if this tab is on https
    var browser = windows.recentWindow.gBrowser.selectedBrowser;
    if (browser.currentURI.scheme === 'https') {
        browser.reloadWithFlags(
            Ci.nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE);
    }
}

var observerCallbacks = {
    domainsUpdated: domainsUpdated,
    isCertValid: isCertValid,
    getCipherSuiteRating: getCipherSuiteRating,
    getCertificateAlg: getCertificateAlg,
    getKeySize: getKeySize,
    checkPFS: checkPFS,
    getConnectionRating: getConnectionRating,
    getSignatureAlg: getSignatureAlg
};

var prefListener = function (branch, name) {
    switch (name) {
    case 'rating.params':
        ssleuth.prefs[name] =
            JSON.parse(branch.getCharPref(name));
        break;
    case 'rating.ciphersuite.params':
        ssleuth.prefs[name] =
            JSON.parse(branch.getCharPref(name));
        break;
    case 'suites.toggle':
        // TODO : No need for a cloned array here ?
        var prefsOld = ssleuth.prefs[name];
        ssleuth.prefs[name] =
            JSON.parse(branch.getCharPref(name));
        toggleCipherSuites(prefsOld);
        break;
    }

    ui.prefListener(branch, name);

};