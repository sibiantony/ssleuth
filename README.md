SSleuth
=======

SSleuth is a firefox addon that ranks an established SSL connection to estimate 
the connection strength. It also gives a brief summary of the important SSL connection 
parameters.

This addon was primarily developed with the intent to rate the ciphers used in an
SSL connection. The project maintains a list of cipher suites that are shipped with
Firefox and a rank for each of them.
The rankings are mainly inspired from Qualys's SSL labs server testing tool. The 
SSL labs testing is meant for web servers, more sophisticated and is much more 
than a cipher ranking service. However to know which ciphers are used when a user
connects to a website, browser support and/or an addon is necessary. Firefox started
exposing the full cipher suite name from version 25.0. Users can see the
cipher suite by going to the `URL notification lock icon -> More information`
or `Page Info -> Security -> Technical details`.
The user can see the cipher suite used for connection and firefox's
assessment of the strength of the cipher.

This addon attempts to enhance this visibility of ciphers to the user,
by ranking it and appropriateley color coding it. 
The addon panel also gives information on perfect forward secrecy, firefox 
connection status and the certificate details.

## Ranking Rationale

The ranking mechanism is in the early stages now, and might change
in future. User feedback and inputs on the ranking are welcome!

The overall connection rankings depend on these parameters
* Cipher suite rank
* Perfect forward secrecy
* Firefox Connection status
* A valid certificate (matching domain/ valid dates)
* And an extended validation certificate.

### Cipher suite ranking
Cipher suite rankings are based on the encryption algorithm used and
the HMAC. Stronger block ciphers (like AES-256, CAMELLIA-256) are ranked
the highest (10/10) while ciphers using smaller keylength (eg: DES) are demoted.
Although RC4 ciphers are broken, at the moment
for an attack to be practical, access to [huge amounts of data encrypted using different keys are necessary.](https://community.qualys.com/blogs/securitylabs/2013/03/19/rc4-in-tls-is-broken-now-what)
For this reason, although RC4 is ranked low, it is not the least.

SHA-1 and MD5 digests are reportedly weak, hence there are warning
texts on the addon panel to notify of the weakness.

The  cipher suite ranks can be found here : `chrome/content/cipherSuites.js`
While calculating the overall connection rank, SSleuth gives a weight
of 5/10 for cipher suite alone.

### Perfect forward secrecy
If the cipher suite supports perfect forward secrecy (Ephemeral Diffie-Hellmann
key exchange) a point of 1 is awarded. Since the points are given separately 
for PFS, the key exchange algorithm is not considered while ranking the
cipher suites.

### Firefox connection status
Another point is awarded for a 'Secure' connection status from Firefox's
own flags. The Firefox flag reports 3 states : 'Secure', 'Broken' or
'Insecure'. For the latter 2 states, the API does not really inform
of the reason as to why. Many a times, the 'Broken' state is due to http content
loaded over a secure connection. The same state can also be reported for potentially
insecure content (flash plugins). Firefox notifies the user
on these explicity via the browser UI. If the states are 'Broken' or
'Insecure' there are no points awarded.

### Valid certificate
A valid certificate earns another point. As of now, the validity is checked
for a matching domain name and valid dates on the certificate.
An extended validation (EV) certificate also gains another point out of 10.

This is how the overall connection ranking is calculated :

```Cipher rank(5) + 
    PFS(2) + 
    Extended Validation(1) + 
    Firefox connection status(1) + 
    Valid certificate(1) = Connection Rank(10)```

No claims are made that the above approach is the right way to
estimate connection strength. If possible, a future release of the
addon will make the ranking mechanism configurable, so advanced
users can tweak the way the strength is estimated.

### References

The cipher strength rankings and those reported by [SSL labs](https://www.ssllabs.com/ssltest/index.html)
were compared during the development.
Firefox developer Brian Smith [makes a proposal here](https://briansmith.org/browser-ciphersuites-01.html)
on the cipher suites to be enabled/disabled for all major browsers, along with a catalogue of common
cipher suites.

There is also an [IETF working group](https://datatracker.ietf.org/wg/uta/charter/) that aims to propose a set of
best practices for TLS clients and servers, including recommending
versions of TLS, cipher suites etc.
https://www.iana.org/assignments/tls-parameters/tls-parameters.xhtml#tls-parameters-4

## How to disable weak ciphers in Firefox

This addon only reports the states and do not attempt to make any
changes in the user security preferences.
If the user wishes to enable only strong ciphers, visit firefox
configuration (about:config) and play around with the flags
`security.ssl3.<cipher-suite-name>`
The flags are boolean and can be enabled/disabled quickly.
Please note that you must take extreme care while choosing to
disable cipher suites. You may end up unable to connect to some
web servers if you disable a lot of them!

## UI

There is a URL bar notification box (next to Firefox's own notification
area). A 'sleuth' cap and the rank notifies the user of the estimated strength.
There is an optional toolbar button mode (choose from preferences), if the
user wishes to move around a toolbar button. 

### Color coding

The color of the notification area changes from green (very good), to blue (good),
orange (medium) and red(bad). 

### Keyboard shortcut

The panel can be easily brought up with the key combinations 'Ctrl' + 'Shift' + '}'. 
If the keyboard shortcut interferes with any existing addon and/or your keyboard doesn't
support the key combination, please report it.
It is however possible to change the keyboard shortcut via configuration.
* Navigate to '`about:config`'
* Key in `extensions.ssleuth` to find all ssleuth configurables, and look for `extensions.ssleuth.ui.keyshortcut`
* The preference type is a string and you can change the modifieres and key. Please follow
[mozilla guidelines](https://developer.mozilla.org/en-US/docs/XUL/Tutorial/Keyboard_Shortcuts) to set the shortcut. SSleuth uses 'keys' rather than 'keycodes'. 

