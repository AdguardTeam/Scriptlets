import { hit, nativeIsNaN, prepareCookie } from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet set-cookie
 *
 * @description
 * Sets a cookie with the specified name and value. Cookie path defaults to root.
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('set-cookie', name, value)
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
 *
 * **Examples**
 * ```
 * example.org#%#//scriptlet('set-cookie', 'ReadlyCookieConsent', '1')
 *
 * example.org#%#//scriptlet('set-cookie', 'gdpr-settings-cookie', 'true')
 * ```
 */
/* eslint-enable max-len */
export function setCookie(source, name, value) {
    const cookieData = prepareCookie(name, value);

    if (cookieData) {
        hit(source);
        document.cookie = cookieData;
    }
}

setCookie.names = [
    'set-cookie',
];

setCookie.injections = [hit, nativeIsNaN, prepareCookie];
