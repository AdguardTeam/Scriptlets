import {
    hit,
    logMessage,
    nativeIsNaN,
    isCookieSetWithValue,
    getLimitedCookieValue,
    concatCookieNameValuePath,
    isValidCookiePath,
    // following helpers should be imported and injected
    // because they are used by helpers above
    getCookiePath,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet set-cookie
 *
 * @description
 * Sets a cookie with the specified name, value, and path.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#set-cookiejs-
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('set-cookie', name, value[, path])
 * ```
 *
 * - `name` — required, cookie name to be set
 * - `value` — required, cookie value; possible values:
 *     - number `>= 0 && <= 15`
 *     - one of the predefined constants in any case variation:
 *         - `true`
 *         - `false`
 *         - `yes` / `y`
 *         - `no` / `n`
 *         - `ok`
 *         - `on` / `off`
 *         - `accept`/ `accepted` / `notaccepted`
 *         - `reject` / `rejected`
 *         - `allow` / `allowed`
 *         - `disallow` / `deny`
 *         - `enable` / `enabled`
 *         - `disable` / `disabled`
 * - `path` — optional, cookie path, defaults to `/`; possible values:
 *     - `/` — root path
 *     - `none` — to set no path at all
 *
 * > Note that the scriptlet encodes cookie names and values,
 * > e.g value `"{ test: 'value'}"` becomes `%7B%20test%3A%20'value'%7D`.
 *
 * ### Examples
 *
 * ```adblock
 * example.org#%#//scriptlet('set-cookie', 'CookieConsent', '1')
 *
 * example.org#%#//scriptlet('set-cookie', 'gdpr-settings-cookie', 'true')
 *
 * example.org#%#//scriptlet('set-cookie', 'cookie_consent', 'ok', 'none')
 * ```
 *
 * @added v1.2.3.
 */
/* eslint-enable max-len */
export function setCookie(source, name, value, path = '/') {
    const validValue = getLimitedCookieValue(value);
    if (validValue === null) {
        logMessage(source, `Invalid cookie value: '${validValue}'`);
        return;
    }

    if (!isValidCookiePath(path)) {
        logMessage(source, `Invalid cookie path: '${path}'`);
        return;
    }

    const cookieToSet = concatCookieNameValuePath(name, validValue, path);
    if (!cookieToSet) {
        logMessage(source, 'Invalid cookie name or value');
        return;
    }

    hit(source);
    document.cookie = cookieToSet;
}

setCookie.names = [
    'set-cookie',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'set-cookie.js',
    'ubo-set-cookie.js',
    'ubo-set-cookie',
];

setCookie.injections = [
    hit,
    logMessage,
    nativeIsNaN,
    isCookieSetWithValue,
    getLimitedCookieValue,
    concatCookieNameValuePath,
    isValidCookiePath,
    getCookiePath,
];
