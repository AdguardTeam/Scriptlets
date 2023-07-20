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

/**
 * @scriptlet set-cookie-reload
 *
 * @description
 * Sets a cookie with the specified name and value, and path,
 * and reloads the current page after the cookie setting.
 * If reloading option is not needed, use [set-cookie](#set-cookie) scriptlet.
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('set-cookie-reload', name, value[, path])
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
 *         - `accept`/ `reject`
 *         - `allow` / `deny`
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
 * example.org#%#//scriptlet('set-cookie-reload', 'checking', 'ok')
 *
 * example.org#%#//scriptlet('set-cookie-reload', 'gdpr-settings-cookie', '1')
 *
 * example.org#%#//scriptlet('set-cookie-reload', 'cookie-set', 'true', 'none')
 * ```
 *
 * @added v1.3.14.
 */
export function setCookieReload(source, name, value, path = '/') {
    if (isCookieSetWithValue(document.cookie, name, value)) {
        return;
    }

    const validValue = getLimitedCookieValue(value);
    if (validValue === null) {
        logMessage(source, `Invalid cookie value: '${value}'`);
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

    document.cookie = cookieToSet;
    hit(source);

    // Only reload the page if cookie was set
    // https://github.com/AdguardTeam/Scriptlets/issues/212
    if (isCookieSetWithValue(document.cookie, name, value)) {
        window.location.reload();
    }
}

setCookieReload.names = [
    'set-cookie-reload',
];

setCookieReload.injections = [
    hit,
    logMessage,
    nativeIsNaN,
    isCookieSetWithValue,
    getLimitedCookieValue,
    concatCookieNameValuePath,
    isValidCookiePath,
    getCookiePath,
];
