import {
    hit,
    nativeIsNaN,
    isCookieSetWithValue,
    getLimitedCookieValue,
    concatCookieNameValuePath,
    // following helpers should be imported and injected
    // because they are used by helpers above
    isValidCookieRawPath,
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
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('set-cookie-reload', name, value[, path])
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
 * example.org#%#//scriptlet('set-cookie-reload', 'checking', 'ok')
 *
 * example.org#%#//scriptlet('set-cookie-reload', 'gdpr-settings-cookie', '1')
 *
 * example.org#%#//scriptlet('set-cookie-reload', 'cookie-set', 'true', 'none')
 * ```
 */
export function setCookieReload(source, name, value, path = '/') {
    if (isCookieSetWithValue(name, value)) {
        return;
    }

    // eslint-disable-next-line no-console
    const log = console.log.bind(console);

    const validValue = getLimitedCookieValue(value);
    if (validValue === null) {
        log(`Invalid cookie value: '${validValue}'`);
        return;
    }

    const cookieData = concatCookieNameValuePath(name, validValue, path);

    if (cookieData) {
        document.cookie = cookieData;
        hit(source);

        // Only reload the page if cookie was set
        // https://github.com/AdguardTeam/Scriptlets/issues/212
        if (isCookieSetWithValue(document.cookie, name, value)) {
            window.location.reload();
        }
    }
}

setCookieReload.names = [
    'set-cookie-reload',
];

setCookieReload.injections = [
    hit,
    nativeIsNaN,
    isCookieSetWithValue,
    getLimitedCookieValue,
    concatCookieNameValuePath,
    isValidCookieRawPath,
    getCookiePath,
];
