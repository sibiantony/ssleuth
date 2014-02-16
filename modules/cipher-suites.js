var EXPORTED_SYMBOLS = ["ssleuthCipherSuites"];

/* The cipher suites ratings are in its early stages now.
 * This is subject to change in future.
 */
const ssleuthCipherSuites = {
	keyExchange : [
		{ name: "TLS_ECDHE",	rank: 10,   pfs: 1, 
			ui: "ECDHE", 	notes: "" },
		{ name: "TLS_ECDH",		rank: 9,	pfs: 0, 
			ui: "ECDH", 	notes: "" },
		{ name: "TLS_DHE",		rank: 9,	pfs: 1, 
			ui: "DHE", 		notes: "" },
		{ name: "TLS_RSA_WITH",	rank: 6,	pfs: 0, 
			ui: "RSA", 		notes: "" },
		{ name: "SSL_RSA_WITH",	rank: 5,	pfs: 0, 
			ui: "RSA", 		notes: "" },
		{ name: "SSL_RSA_FIPS_WITH",	rank: 5,	pfs: 0, 
			ui: "RSA", 		notes: "" },
		{ name: "TLS_RSA_EXPORT",	rank: 2,	pfs: 0, 
			ui: "RSA EXPORT", 	notes: "Weak Kx. " },
	],

	/* No known weaknesses for the algorithms here. Except for the key length.
	 * RSA secure minimum keyLength>=2048
	 * ECDSA comparable keyLength>=263 [RFC 4492]
	 */
	authentication : [
		{ name: "_RSA_", 	rank: 10, 	minSecureKeyLength: 2048, 
			ui: "RSA", 		notes: "" },
		{ name: "_ECDSA_", 	rank: 10, 	minSecureKeyLength: 263, 
			ui: "ECDSA", 	notes: "" },
		{ name: "_DSS_", 	rank: 10, 	minSecureKeyLength: 2048, 
			ui: "DSA", 		notes: "" } 
	],

	bulkCipher : [
		{ name: "AES_256_GCM",		rank: 10,   notes: "" },
		{ name: "CAMELLIA_256_CBC", rank: 10,   notes: "" },
		{ name: "AES_256_CBC",		rank: 10,	notes: "" },
		{ name: "3DES_EDE_CBC",		rank: 9,	notes: "" },
		{ name: "AES_128_GCM",		rank: 8,	notes: "" },
		{ name: "AES_128_CBC",		rank: 8,	notes: "" },
		{ name: "CAMELLIA_128_CBC", rank: 8,	notes: "" },
		{ name: "SEED_CBC",			rank: 8,	notes: "" },
		{ name: "RC4_128",			rank: 6,	notes: "RC4 considered unsafe. " },
		{ name: "DES_CBC",			rank: 2,	notes: "Weak" },
		{ name: "DES40_CBC",		rank: 2,	notes: "Weak" },
		{ name: "RC2_CBC_40",		rank: 2,	notes: "Weak" },
		{ name: "RC4_40",			rank: 2,	notes: "Weak" },
	],

	HMAC : [
		{ name: "SHA512",	 rank: 10,	notes: ""},
		{ name: "SHA384",	 rank: 10,	notes: ""},
		{ name: "SHA256",	 rank: 10,	notes: ""},
		{ name: "SHA",	 rank:  6,	notes: "SHA-1 reportedly weak. "},
		{ name: "MD5",	 rank:  2,	notes: "MD5 is broken. "}
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
		hmac		: 2,
		total	   : 10
	}
}; 
