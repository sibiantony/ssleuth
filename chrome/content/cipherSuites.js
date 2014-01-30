var EXPORTED_SYMBOLS = ["ssleuthCipherSuites"];

const ssleuthCipherSuites = {
    keyExchange : [
        { name: "TLS_ECDHE_RSA",    rank: 10,   pfs: 1, notes: "", },
        { name: "TLS_ECDHE_ECDSA",  rank: 10,   pfs: 1, notes: "", },
        { name: "TLS_ECDH_ECDSA",   rank: 9,    pfs: 0, notes: "", },
        { name: "TLS_ECDH_RSA",     rank: 9,    pfs: 0, notes: "", },
        { name: "TLS_DHE_RSA",      rank: 9,    pfs: 1, notes: "", },
        { name: "TLS_DHE_DSS",      rank: 9,    pfs: 1, notes: "", },
        { name: "TLS_RSA",          rank: 6,    pfs: 0, notes: "", },
        { name: "SSL_RSA",          rank: 5,    pfs: 0, notes: "", },
        { name: "TLS_DHE_RSA_EXPORT",   rank: 5,pfs: 1, notes: "", },
        { name: "TLS_RSA_EXPORT",   rank: 4,    pfs: 0, notes: "", },
        { name: "TLS_EMPTY_RENEGOTIATION_INFO_SCSV",    rank: 0,    pfs: 0, notes: "" }
    ],

    bulkCipher : [
        { name: "AES_256_GCM",        rank: 10,   notes: "" },
        { name: "CAMELLIA_256_CBC",   rank: 10,   notes: "" },
        { name: "AES_256_CBC",        rank: 10,   notes: "" },
        { name: "3DES_EDE_CBC",       rank: 9,    notes: "" },
        { name: "AES_128_GCM",        rank: 8,    notes: "" },
        { name: "AES_128_CBC",        rank: 8,    notes: "" },
        { name: "CAMELLIA_128_CBC",   rank: 8,    notes: "" },
        { name: "SEED_CBC",           rank: 8,    notes: "" },
        { name: "RC4_128",            rank: 6,    notes: "RC4 considered unsafe. " },
        { name: "DES_CBC",            rank: 2,    notes: "Weak" },
        { name: "DES40_CBC",          rank: 2,    notes: "Weak" },
        { name: "RC2_CBC_40",         rank: 2,    notes: "Weak" },
        { name: "RC4_40",             rank: 2,    notes: "Weak" },
    ],

    HMAC : [
        { name: "SHA512",     rank: 10,    notes: ""},
        { name: "SHA384",     rank: 10,    notes: ""},
        { name: "SHA256",     rank:  9,    notes: ""},
        { name: "SHA",     rank:  6,    notes: "SHA-1 reportedly weak. "},
        { name: "MD5",     rank:  2,    notes: "MD5 is broken. "}
    ],

    cipherStrength : {
        MAX: 10, 
        HIGH: 7, 
        MEDIUM: 5, 
        LOW: 0
    },

    weighting : {
        keyExchange : 2,
        bulkCipher  : 6,
        hmac        : 2,
        total       : 10
    }
}; 
