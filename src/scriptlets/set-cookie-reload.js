import {
    hit,
    nativeIsNaN,
    prepareCookie,
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
    const isCookieSetWithValue = (name, value) => {
        return document.cookie.split(';')
            .some((cookieStr) => {
                const pos = cookieStr.indexOf('=');
                if (pos === -1) {
                    return false;
                }
                const cookieName = cookieStr.slice(0, pos).trim();
                const cookieValue = cookieStr.slice(pos + 1).trim();

                return name === cookieName && value === cookieValue;
            });
    };

    if (isCookieSetWithValue(name, value)) {
        return;
    }

    const cookieData = prepareCookie(name, value, path);

    if (cookieData) {
        document.cookie = cookieData;
        hit(source);

        // Only reload the page if cookie was set
        // https://github.com/AdguardTeam/Scriptlets/issues/212
        if (isCookieSetWithValue(name, value)) {
            window.location.reload();
        }
    }
}

setCookieReload.names = [
    'set-cookie-reload',
];

setCookieReload.injections = [hit, nativeIsNaN, prepareCookie];
