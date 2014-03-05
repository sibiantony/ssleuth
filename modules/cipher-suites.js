var EXPORTED_SYMBOLS = ["ssleuthCipherSuites", "ssleuthConnectionRating",
						"ffToggleDefault"];

/* The cipher suites ratings are in its early stages now.
 * This is subject to change in future.
 */
const ssleuthCipherSuites = {
	keyExchange : [
		{ name: "_ECDHE_",	rank: 10,   pfs: 1, 
			ui: "ECDHE", 	notes: "" },
		{ name: "_ECDH_",		rank: 9,	pfs: 0, 
			ui: "ECDH", 	notes: "" },
		{ name: "_DHE_",		rank: 9,	pfs: 1, 
			ui: "DHE", 		notes: "" },
		{ name: "_DH_",		rank: 9,		pfs: 1, 
			ui: "DH", 		notes: "" },
		{ name: "TLS_RSA_WITH",	rank: 6,	pfs: 0, 
			ui: "RSA", 		notes: "" },
		{ name: "SSL_RSA_WITH",	rank: 5,	pfs: 0, 
			ui: "RSA", 		notes: "" },
		{ name: "SSL_RSA_FIPS",	rank: 5,	pfs: 0, 
			ui: "RSA", 		notes: "" },
		{ name: "TLS_RSA_EXPORT",	rank: 2,	pfs: 0, 
			ui: "RSA EXPORT", 	notes: "Weak Kx. " },
	],

	// No known weaknesses for the algorithms here. Except for the key length.
	// RSA secure minimum keyLength>=2048
	// ECDSA comparable keyLength>=263 [RFC 4492]
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
		{ name: "AES_128_GCM",		rank: 8,	notes: "" },
		{ name: "AES_128_CBC",		rank: 8,	notes: "" },
		{ name: "CAMELLIA_128_CBC", rank: 8,	notes: "" },
		{ name: "SEED_CBC",			rank: 8,	notes: "" },
		{ name: "3DES_EDE_CBC",		rank: 8,	notes: "" },
		{ name: "RC4_128",			rank: 6,	notes: "RC4 considered unsafe." },
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

	cipherSuiteStrength : {
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

const ssleuthConnectionRating = {
	cipherSuite : 5,
	pfs			: 2,
	ffStatus	: 1, 
	certStatus	: 1,
	evCert		: 1,
	total		: 10
};

const ffToggleDefault = {
	rc4Suites : {
		list : [
			"ecdh_ecdsa_rc4_128_sha",
			"ecdh_rsa_rc4_128_sha",
			"ecdhe_ecdsa_rc4_128_sha",
			"ecdhe_rsa_rc4_128_sha",
			"rsa_rc4_128_md5",
			"rsa_rc4_128_sha"
		],
		state : "default"
	}, 
	noPFSSuites : {
		list : [
			"ecdh_ecdsa_aes_256_sha",
			"ecdh_ecdsa_des_ede3_sha",
			"ecdh_ecdsa_rc4_128_sha",
			"ecdh_rsa_aes_128_sha",
			"ecdh_rsa_aes_256_sha",
			"ecdh_rsa_des_ede3_sha",
			"ecdh_rsa_rc4_128_sha",
			"rsa_aes_128_sha",
			"rsa_aes_256_sha",
			"rsa_camellia_128_sha",
			"rsa_camellia_256_sha",
			"rsa_des_ede3_sha",
			"rsa_fips_des_ede3_sha",
			"rsa_rc4_128_md5",
			"rsa_rc4_128_sha",
			"rsa_seed_sha",
		],
		state : "default"
	}
}
