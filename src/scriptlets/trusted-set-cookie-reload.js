import {
    hit,
    logMessage,
    nativeIsNaN,
    isCookieSetWithValue,
    concatCookieNameValuePath,
    isValidCookiePath,
    parseKeywordValue,
    getTrustedCookieOffsetMs,
    parseCookieString,
    // following helpers should be imported and injected
    // because they are used by helpers above
    getCookiePath,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-set-cookie-reload
 *
 * @description
 * Sets a cookie with arbitrary name and value,
 * and with optional ability to offset cookie attribute 'expires' and set path.
 * Also reloads the current page after the cookie setting.
 * If reloading option is not needed, use the [`trusted-set-cookie` scriptlet](#trusted-set-cookie).
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('trusted-set-cookie-reload', name, value[, offsetExpiresSec[, path]])
 * ```
 *
 * - `name` — required, cookie name to be set
 * - `value` — required, cookie value. Possible values:
 *     - arbitrary value
 *     - empty string for no value
 *     - `$now$` keyword for setting current time in ms, e.g 1667915146503
 *     - `$currentDate$` keyword for setting current time as string, e.g 'Tue Nov 08 2022 13:53:19 GMT+0300'
 * - `offsetExpiresSec` — optional, offset from current time in seconds, after which cookie should expire;
 *   defaults to no offset. Possible values:
 *     - positive integer in seconds
 *     - `1year` keyword for setting expiration date to one year
 *     - `1day` keyword for setting expiration date to one day
 * - `path` — optional, argument for setting cookie path, defaults to `/`; possible values:
 *     - `/` — root path
 *     - `none` — to set no path at all
 *
 * > Note that the scriptlet does not encode cookie names and values.
 * > As a result, if a cookie's name or value includes `;`,
 * > the scriptlet will not set the cookie since this may cause the cookie to break.
 *
 * ### Examples
 *
 * 1. Set cookie and reload the page after it
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', 'accept')
 *     ```
 *
 * 1. Set cookie with `new Date().getTime()` value and reload the page after it
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', '$now$')
 *     ```
 *
 * 1. Set cookie which will expire in 3 days and reload the page after it
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', 'accept', '259200')
 *     ```
 *
 * 1. Set cookie which will expire in one year and reload the page after it
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', 'accept', '1year')
 *     ```
 *
 * 1. Set cookie with no 'expire' and no path, reload the page after it
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', 'decline', '', 'none')
 *     ```
 *
 * @added v1.7.10.
 */
/* eslint-enable max-len */

export function trustedSetCookieReload(source, name, value, offsetExpiresSec = '', path = '/') {
    if (typeof name === 'undefined') {
        logMessage(source, 'Cookie name should be specified');
        return;
    }
    if (typeof value === 'undefined') {
        logMessage(source, 'Cookie value should be specified');
        return;
    }

    // Prevent infinite reloads if cookie was already set or blocked by the browser
    // https://github.com/AdguardTeam/Scriptlets/issues/212
    if (isCookieSetWithValue(document.cookie, name, value)) {
        return;
    }

    const parsedValue = parseKeywordValue(value);

    if (!isValidCookiePath(path)) {
        logMessage(source, `Invalid cookie path: '${path}'`);
        return;
    }

    let cookieToSet = concatCookieNameValuePath(name, parsedValue, path, false);
    if (!cookieToSet) {
        logMessage(source, 'Invalid cookie name or value');
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

    // Get cookie value, it's required for checking purpose
    // in case if $now$ or $currentDate$ value is used
    // https://github.com/AdguardTeam/Scriptlets/issues/291
    const cookieValueToCheck = parseCookieString(document.cookie)[name];

    // Only reload the page if cookie was set
    // https://github.com/AdguardTeam/Scriptlets/issues/212
    if (isCookieSetWithValue(document.cookie, name, cookieValueToCheck)) {
        window.location.reload();
    }
}

trustedSetCookieReload.names = [
    'trusted-set-cookie-reload',
    // trusted scriptlets support no aliases
];

trustedSetCookieReload.injections = [
    hit,
    logMessage,
    nativeIsNaN,
    isCookieSetWithValue,
    concatCookieNameValuePath,
    isValidCookiePath,
    getTrustedCookieOffsetMs,
    parseKeywordValue,
    parseCookieString,
    getCookiePath,
];
