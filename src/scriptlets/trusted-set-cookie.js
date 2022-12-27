import {
    hit,
    logMessage,
    nativeIsNaN,
    isCookieSetWithValue,
    concatCookieNameValuePath,
    isValidCookiePath,
    parseKeywordValue,
    getTrustedCookieOffsetMs,
    // following helpers should be imported and injected
    // because they are used by helpers above
    getCookiePath,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-set-cookie
 *
 * @description
 * Sets a cookie with arbitrary name and value,
 * and with optional ability to offset cookie attribute 'expires' and set path.
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('trusted-set-cookie', name, value[, offsetExpiresSec[, path]])
 * ```
 *
 * - `name` - required, cookie name to be set
 * - `value` - required, cookie value. Possible values:
 *   - arbitrary value
 *   - empty string for no value
 *   - `$now$` keyword for setting current time in ms, e.g 1667915146503
 *   - `$currentDate$` keyword for setting current time as string, e.g 'Tue Nov 08 2022 13:53:19 GMT+0300'
 * - `offsetExpiresSec` - optional, offset from current time in seconds, after which cookie should expire; defaults to no offset
 * Possible values:
 *   - positive integer in seconds
 *   - `1year` keyword for setting expiration date to one year
 *   - `1day` keyword for setting expiration date to one day
 * - `path` - optional, argument for setting cookie path, defaults to `/`; possible values:
 *   - `/` — root path
 *   - `none` — to set no path at all
 *
 * **Examples**
 * 1. Set cookie
 * ```
 * example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', 'accept')
 * example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', '1-accept_1')
 * ```
 *
 * 2. Set cookie with `new Date().getTime()` value
 * ```
 * example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', '$now$')
 * ```
 *
 * 3. Set cookie which will expire in 3 days
 * ```
 * example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', 'accept', '259200')
 * ```
 *
 * 4. Set cookie which will expire in one year
 * ```
 * example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', 'accept', '1year')
 * ```
 *
 * 5. Set cookie with no path
 * ```
 * example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', 'decline', '', 'none')
 * ```
 */
/* eslint-enable max-len */

export function trustedSetCookie(source, name, value, offsetExpiresSec = '', path = '/') {
    if (typeof name === 'undefined') {
        logMessage(source, 'Cookie name should be specified.');
        return;
    }
    if (typeof value === 'undefined') {
        logMessage(source, 'Cookie value should be specified.');
        return;
    }

    const parsedValue = parseKeywordValue(value);

    if (!isValidCookiePath(path)) {
        logMessage(source, `Invalid cookie path: '${path}'`);
        return;
    }

    let cookieToSet = concatCookieNameValuePath(name, parsedValue, path);
    if (!cookieToSet) {
        return;
    }

    if (offsetExpiresSec) {
        const parsedOffsetMs = getTrustedCookieOffsetMs(offsetExpiresSec);

        if (!parsedOffsetMs) {
            logMessage(source, `Invalid offsetExpiresSec value: ${offsetExpiresSec}`);
            return;
        }

        const expires = Date.now() + parsedOffsetMs;
        cookieToSet += ` expires=${new Date(expires).toUTCString()};`;
    }

    document.cookie = cookieToSet;
    hit(source);
}

trustedSetCookie.names = [
    'trusted-set-cookie',
    // trusted scriptlets support no aliases
];

trustedSetCookie.injections = [
    hit,
    logMessage,
    nativeIsNaN,
    isCookieSetWithValue,
    concatCookieNameValuePath,
    isValidCookiePath,
    getTrustedCookieOffsetMs,
    parseKeywordValue,
    getCookiePath,
];
