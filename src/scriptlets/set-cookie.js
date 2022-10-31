import { hit, nativeIsNaN, prepareCookie } from '../helpers/index';

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
    const cookieData = prepareCookie(name, value, path);

    if (cookieData) {
        hit(source);
        document.cookie = cookieData;
    }
}

setCookie.names = [
    'set-cookie',
];

setCookie.injections = [hit, nativeIsNaN, prepareCookie];
