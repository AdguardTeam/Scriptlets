import { hit, prepareCookie } from '../helpers';

/**
 * @scriptlet set-cookie-reload
 *
 * @description
 * Sets a cookie with the specified name and value with page reloading for proper cookie setting.
 * If reloading option is not needed, use [set-cookie](#set-cookie) scriptlet.
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('set-cookie-reload', name, value)
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
 * example.org#%#//scriptlet('set-cookie-reload', 'checking', 'ok')
 *
 * example.org#%#//scriptlet('set-cookie-reload', 'gdpr-settings-cookie', '1')
 * ```
 */
export function setCookieReload(source, name, value) {
    const isCookieAlreadySet = document.cookie.split(';')
        .some((cookieStr) => {
            const pos = cookieStr.indexOf('=');
            if (pos === -1) {
                return false;
            }
            const cookieName = cookieStr.slice(0, pos).trim();
            const cookieValue = cookieStr.slice(pos + 1).trim();

            return name === cookieName && value === cookieValue;
        });

    const shouldReload = !isCookieAlreadySet;

    const cookieData = prepareCookie(name, value);

    if (cookieData) {
        hit(source);
        document.cookie = cookieData;

        if (shouldReload) {
            window.location.reload();
        }
    }
}

setCookieReload.names = [
    'set-cookie-reload',
];

setCookieReload.injections = [hit, prepareCookie];
