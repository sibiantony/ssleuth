var EXPORTED_SYMBOLS = ['ciphersuites', 'connectionRating',
            'ffToggleDefault', 'tlsVersions'];

/* 
 * The cipher suites ratings are in its early stages now.
 * This is subject to change in future.
 */
const ciphersuites = {
    keyExchange: [{
            name: '_ECDHE_',
            rank: 10,
            pfs: 1,
            ui: 'Elliptic curve Diffie-Hellman',
            notes: ''
        }, {
            name: '_ECDH_',
            rank: 9,
            pfs: 0,
            ui: 'Elliptic curve Diffie-Hellman',
            notes: ''
        },
        {
            name: '_DHE_',
            rank: 9,
            pfs: 1,
            ui: 'Diffie-Hellman',
            notes: ''
        },
        {
            name: '_DH_',
            rank: 9,
            pfs: 0,
            ui: 'Diffie-Hellman',
            notes: ''
        },
        {
            name: 'TLS_RSA_WITH',
            rank: 6,
            pfs: 0,
            ui: 'RSA',
            notes: ''
        },
        {
            name: 'SSL_RSA_WITH',
            rank: 5,
            pfs: 0,
            ui: 'RSA',
            notes: ''
        },
        {
            name: 'SSL_RSA_FIPS',
            rank: 5,
            pfs: 0,
            ui: 'RSA',
            notes: ''
        },
        {
            name: 'TLS_RSA_EXPORT',
            rank: 2,
            pfs: 0,
            ui: 'RSA EXPORT',
            notes: ''
        },

        // Workaround for TLS 1.3 draft cipher suite strings.
        // Mozilla doesn't yet expose the key exchange in SSLStatus
        {
            name: 'TLS_AES',
            rank: 10,
            pfs: 1,
            ui: 'Unknown',
            notes: 'TLS 1.3'
        },
        {
            name: 'TLS_CHACHA20',
            rank: 10,
            pfs: 1,
            ui: 'Unknown',
            notes: 'TLS 1.3'
        },

        {
            name: '',
            rank: 0,
            pfs: 0,
            ui: 'Unknown',
            notes: ''
        }
    ],

    // No known weaknesses for the algorithms here. Except for the key length.
    // RSA secure minimum keyLength>=2048
    // ECC comparable keyLength>=263 [RFC 4492]
    // TODO : ECC list curve type/params
    authentication: [
    // Do not modify cert values. Used in extracting key length from certificate.
        {
            name: '_RSA_',
            rank: 10,
            minSecureKeyLength: 2048,
            ui: 'RSA',
            cert: 'RSA',
            notes: ''
        },
        {
            name: '_ECDSA_',
            rank: 10,
            minSecureKeyLength: 256,
            ui: 'ECDSA',
            cert: 'ECC',
            notes: ''
        },
        {
            name: '_DSS_',
            rank: 10,
            minSecureKeyLength: 2048,
            ui: 'DSA',
            cert: 'DSA',
            notes: ''
        },

        // Workaround for TLS 1.3 draft cipher suite strings.
        // Mozilla doesn't yet expose the authentication in SSLStatus
        {
            name: 'TLS_AES',
            rank: 10,
            minSecureKeyLength: 0,
            ui: 'Unknown',
            cert: '',
            notes: 'TLS 1.3'
        },
        {
            name: 'TLS_CHACHA20',
            rank: 10,
            minSecureKeyLength: 0,
            ui: 'Unknown',
            cert: '',
            notes: 'TLS 1.3'
        },

        {
            name: '',
            rank: 0,
            minSecureKeyLength: 0,
            ui: 'Unknown',
            cert: '',
            notes: ''
        },
    ],

    bulkCipher: [
        {
            name: 'CHACHA20_POLY1305',
            rank: 10,
            ui: 'ChaCha20',
            notes: 'AEAD'
        },
        {
            name: 'AES_256_GCM',
            rank: 10,
            ui: 'AES GCM',
            notes: 'AEAD'
        },
        {
            name: 'AES_128_GCM',
            rank: 10,
            ui: 'AES GCM',
            notes: 'AEAD'
        },
        {
            name: 'AES_256_CBC',
            rank: 8,
            ui: 'AES CBC',
            notes: ''
        },
        {
            name: 'AES_128_CBC',
            rank: 8,
            ui: 'AES CBC',
            notes: ''
        },
        {
            name: 'CAMELLIA_256_CBC',
            rank: 8,
            ui: 'CAMELLIA CBC',
            notes: ''
        },
        {
            name: 'CAMELLIA_128_CBC',
            rank: 8,
            ui: 'CAMELLIA CBC',
            notes: ''
        },
        {
            name: 'SEED_CBC',
            rank: 8,
            ui: 'SEED CBC',
            notes: ''
        },
        {
            name: '3DES_EDE_CBC',
            rank: 7,
            ui: '3DES EDE CBC',
            notes: ''
        },
        {
            name: 'RC4_128',
            rank: 5,
            ui: 'RC4',
            notes: 'note.unsafe'
        },
        {
            name: 'DES_CBC',
            rank: 2,
            ui: 'DES CBC',
            notes: 'note.weak'
        },
        {
            name: 'DES40_CBC',
            rank: 2,
            ui: 'DES CBC',
            notes: 'note.weak'
        },
        {
            name: 'RC2_CBC_40',
            rank: 2,
            ui: 'RC2 CBC',
            notes: 'note.weak'
        },
        {
            name: 'RC4_40',
            rank: 2,
            ui: 'RC4',
            notes: 'note.weak'
        },
        {
            name: '',
            rank: 0,
            ui: 'Unknown',
            notes: ''
        },
    ],

    // Again, ui fields are used in identifying TLS hash. Don't modify.
    // Update : Firefox broke the convention of naming signature alg.
    // in the cert fields. 'SHA256' mostly, while 'SHA-256' for some certs!
    // Bringing sigui for compat
    HMAC: [
        {
            name: 'SHA512',
            rank: 10,
            ui: 'SHA-512',
            sigui: 'SHA512',
            notes: ''
        },
        {
            name: 'SHA384',
            rank: 10,
            ui: 'SHA-384',
            sigui: 'SHA384',
            notes: ''
        },
        {
            name: 'SHA256',
            rank: 10,
            ui: 'SHA-256',
            sigui: 'SHA256',
            notes: ''
        },
        {
            name: 'SHA224',
            rank: 8,
            ui: 'SHA-224',
            notes: ''
        },
        {
            name: 'SHA',
            rank: 4,
            ui: 'SHA-1',
            notes: 'note.reportedlyweak'
        },
        {
            name: 'MD5',
            rank: 2,
            ui: 'MD5',
            notes: 'note.broken'
        },
        {
            name: '',
            rank: 0,
            ui: 'Unknown',
            notes: ''
        },
    ],

    strength: {
        MAX: 10,
        HIGH: 7,
        MEDIUM: 5,
        LOW: 0
    },

    weighting: {
        keyExchange: 3,
        bulkCipher: 3,
        hmac: 4,
        total: 10
    }
};

const connectionRating = {
    cipherSuite: 4,
    pfs: 2,
    ffStatus: 1,
    certStatus: 1,
    evCert: 1,
    signature: 1,
    total: 10
};

/* The cipher suites preferences are boolean flags, and can be toggled
 * to true/false. However, SSleuth maintains 4 states for a toggle.
 * - 4 states mainly for being nice to other addons doing toggle
 * and to respect user's own preferences.
 *    1. default - nothing is done in this case.
 *    2. reset->default   - clear any existing preferences to their default values
 *    3. enable  - enable the cipher suites in the list
 *    4. disable - disable the cipher suites in the list
 *
 * By default nothing will be done, unless the user initiates
 *    an enable, disable or reset through UI/config window.
 * 'reset->default' is only a transition state, which means once the reset
 *    is done, the state is set to 'default'.
 * 'enable' and 'disable' are permanent states, ie. everytime the preferences
 * are loaded, these states are checked and cipher suites
 * are enabled/disabled.
 */
const ffToggleDefault = [
    {
        name: 'RC4 suites',
        list: [
            'ecdh_ecdsa_rc4_128_sha',
            'ecdh_rsa_rc4_128_sha',
            'ecdhe_ecdsa_rc4_128_sha',
            'ecdhe_rsa_rc4_128_sha',
            'rsa_rc4_128_md5',
            'rsa_rc4_128_sha'
        ],
        state: 'disable'
    },
    {
        name: 'Non PFS, non RC4 suites',
        list: [
            'ecdh_ecdsa_aes_256_sha',
            'ecdh_ecdsa_des_ede3_sha',
            'ecdh_rsa_aes_128_sha',
            'ecdh_rsa_aes_256_sha',
            'ecdh_rsa_des_ede3_sha',
            'rsa_aes_128_sha',
            'rsa_aes_256_sha',
            'rsa_camellia_128_sha',
            'rsa_camellia_256_sha',
            'rsa_des_ede3_sha',
            'rsa_fips_des_ede3_sha',
            'rsa_seed_sha',
        ],
        state: 'default'
    }
];

const tlsVersions = {
    sslv3: {
        ui: 'SSLv3.0',
        state: 'bad'
    },
    tlsv1_0: {
        ui: 'TLSv1.0',
        state: 'med'
    },
    tlsv1_1: {
        ui: 'TLSv1.1',
        state: 'okay'
    },
    tlsv1_2: {
        ui: 'TLSv1.2',
        state: 'okay'
    },
    tlsv1_3: {
        ui: 'TLSv1.3',
        state: 'okay'
    },


    ff_cache: {
        ui: '<Firefox cache. Reload page>',
        state: 'okay'
    }
}