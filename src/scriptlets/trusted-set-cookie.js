import {
    hit,
    nativeIsNaN,
    isCookieSetWithValue,
    concatCookieNameValuePath,
    parseKeywordValue,
    // following helpers should be imported and injected
    // because they are used by helpers above
    isValidCookieRawPath,
    getCookiePath,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-set-cookie
 *
 * @description
 * Sets a cookie with arbitrary name and value, with optional path
 * and the ability to reload the page after cookie was set.
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('trusted-set-cookie', name, value[, offsetExpiresSec[, reload[, path]]])
 * ```
 *
 * - `name` - required, cookie name to be set
 * - `value` - required, cookie value. Possible values:
 *   - arbitrary value
 *   - empty string for no value
 *   - `$now$` keyword for setting current time
 * - 'offsetExpiresSec' - optional, offset from current time in seconds, after which cookie should expire; defaults to no offset
 * Possible values:
 *   - positive integer in seconds
 *   - `1year` keyword for setting expiration date to one year
 *   - `1day` keyword for setting expiration date to one day
 * - 'reload' - optional, boolean. Argument for reloading page after cookie is set. Defaults to `false`
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
 * example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', '$now')
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
 * 5. Reload the page if cookie was successfully set
 * ```
 * example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', 'decline', '', 'true')
 * ```
 *
 * 6. Set cookie with no path
 * ```
 * example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', 'decline', '', '', 'none')
 * ```
 */
/* eslint-enable max-len */

export function trustedSetCookie(source, name, value, offsetExpiresSec = '', reload = 'false', path = '/') {
    // eslint-disable-next-line no-console
    const log = console.log.bind(console);

    if (typeof name === 'undefined') {
        log('Cookie name should be specified.');
        return;
    }

    if (typeof value === 'undefined') {
        log('Cookie value should be specified.');
        return;
    }

    // Prevent infinite reloads if cookie was already set or blocked by the browser
    // https://github.com/AdguardTeam/Scriptlets/issues/212
    if (reload === 'true' && isCookieSetWithValue(document.cookie, name, value)) {
        return;
    }

    const ONE_YEAR_EXPIRATION_KEYWORD = '1year';
    const ONE_DAY_EXPIRATION_KEYWORD = '1day';

    const parsedValue = parseKeywordValue(value);

    let cookieToSet = concatCookieNameValuePath(name, parsedValue, path);
    if (!cookieToSet) {
        return;
    }

    // Set expiration date if offsetExpiresSec was passed
    if (offsetExpiresSec) {
        const MS_IN_SEC = 1000;
        const SECONDS_IN_YEAR = 365 * 24 * 60 * 60;
        const SECONDS_IN_DAY = 24 * 60 * 60;

        let parsedOffsetExpiresSec;

        // Set predefined expire value if corresponding keyword was passed
        if (offsetExpiresSec === ONE_YEAR_EXPIRATION_KEYWORD) {
            parsedOffsetExpiresSec = SECONDS_IN_YEAR;
        } else if (offsetExpiresSec === ONE_DAY_EXPIRATION_KEYWORD) {
            parsedOffsetExpiresSec = SECONDS_IN_DAY;
        } else {
            parsedOffsetExpiresSec = Number.parseInt(offsetExpiresSec, 10);

            // If offsetExpiresSec has been parsed to NaN - do not set cookie at all
            if (Number.isNaN(parsedOffsetExpiresSec)) {
                log(`log: Invalid offsetExpiresSec value: ${offsetExpiresSec}`);
                return;
            }
        }

        const expires = Date.now() + parsedOffsetExpiresSec * MS_IN_SEC;
        cookieToSet += ` expires=${new Date(expires).toUTCString()};`;
    }

    if (cookieToSet) {
        document.cookie = cookieToSet;
        hit(source);

        // Only reload the page if cookie was set
        // https://github.com/AdguardTeam/Scriptlets/issues/212
        if (reload === 'true' && isCookieSetWithValue(document.cookie, name, value)) {
            window.location.reload();
        }
    }
}

trustedSetCookie.names = [
    'trusted-set-cookie',
    // trusted scriptlets support no aliases
];

trustedSetCookie.injections = [
    hit,
    nativeIsNaN,
    isCookieSetWithValue,
    concatCookieNameValuePath,
    isValidCookieRawPath,
    parseKeywordValue,
    getCookiePath,
];
