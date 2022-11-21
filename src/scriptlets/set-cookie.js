import {
    hit,
    logMessage,
    nativeIsNaN,
    isCookieSetWithValue,
    getLimitedCookieValue,
    concatCookieNameValuePath,
    // following helpers should be imported and injected
    // because they are used by helpers above
    isValidCookieRawPath,
    getCookiePath,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet set-cookie
 *
 * @description
 * Sets a cookie with the specified name, value, and path.
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('set-cookie', name, value[, path])
 * ```
 *
 * - `name` - required, cookie name to be set
 * - `value` - required, cookie value; possible values:
 *     - number `>= 0 && <= 15`
 *     - one of the predefined constants:
 *         - `true` / `True`
 *         - `false` / `False`
 *         - `yes` / `Yes` / `Y`
 *         - `no`
 *         - `ok` / `OK`
 * - `path` - optional, cookie path, defaults to `/`; possible values:
 *     - `/` — root path
 *     - `none` — to set no path at all
 *
 * **Examples**
 * ```
 * example.org#%#//scriptlet('set-cookie', 'CookieConsent', '1')
 *
 * example.org#%#//scriptlet('set-cookie', 'gdpr-settings-cookie', 'true')
 *
 * example.org#%#//scriptlet('set-cookie', 'cookie_consent', 'ok', 'none')
 * ```
 */
/* eslint-enable max-len */
export function setCookie(source, name, value, path = '/') {
    const validValue = getLimitedCookieValue(source, value);
    if (validValue === null) {
        logMessage(source, `Invalid cookie value: '${validValue}'`);
        return;
    }

    const cookieData = concatCookieNameValuePath(source, name, validValue, path);

    if (cookieData) {
        hit(source);
        document.cookie = cookieData;
    }
}

setCookie.names = [
    'set-cookie',
];

setCookie.injections = [
    hit,
    logMessage,
    nativeIsNaN,
    isCookieSetWithValue,
    getLimitedCookieValue,
    concatCookieNameValuePath,
    isValidCookieRawPath,
    getCookiePath,
];
