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

## Rating Rationale

The ranking mechanism is in the early stages now, and might change
in future. See the wiki page for more information.

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
mozilla guidelines for [modifiers](https://developer.mozilla.org/en-US/docs/XUL/Attribute/modifiers) and [keys](https://developer.mozilla.org/en-US/docs/XUL/Attribute/key) to set the shortcut. SSleuth uses 'keys' rather than 'keycodes'. 

