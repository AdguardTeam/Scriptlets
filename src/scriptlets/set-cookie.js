import { hit } from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet set-cookie
 *
 * @description
 * Sets a cookie with the specified name and value. Cookie path defaults to root.
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('set-cookie', name, value, reload)
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
 * - `reload` - optional, page reload flag;
 * any positive number or non-empty string for 'true', 0 or empty string for 'false'; defaults to `false`
 *
 * **Examples**
 * ```
 * example.org#%#//scriptlet('set-cookie', 'checking', 'ok')
 *
 * example.org#%#//scriptlet('set-cookie', 'gdpr-settings-cookie', '1')
 *
 * // for reloading -- both are correct
 * example.org#%#//scriptlet('set-cookie', 'ReadlyCookieConsent', '1', '1')
 * example.org#%#//scriptlet('set-cookie', 'ReadlyCookieConsent', '1', 'reload')
 * ```
 */
/* eslint-enable max-len */
export function setCookie(source, name, value, reload = false) {
    if (!name || !value) {
        return;
    }

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

    // https://github.com/AdguardTeam/Scriptlets/issues/111
    const shouldReload = !!reload && !isCookieAlreadySet;

    const nativeIsNaN = Number.isNaN || window.isNaN; // eslint-disable-line compat/compat
    let valueToSet;
    if (value === 'true') {
        valueToSet = 'true';
    } else if (value === 'True') {
        valueToSet = 'True';
    } else if (value === 'false') {
        valueToSet = 'false';
    } else if (value === 'False') {
        valueToSet = 'False';
    } else if (value === 'yes') {
        valueToSet = 'yes';
    } else if (value === 'Yes') {
        valueToSet = 'Yes';
    } else if (value === 'Y') {
        valueToSet = 'Y';
    } else if (value === 'no') {
        valueToSet = 'no';
    } else if (value === 'ok') {
        valueToSet = 'ok';
    } else if (value === 'OK') {
        valueToSet = 'OK';
    } else if (/^\d+$/.test(value)) {
        valueToSet = parseFloat(value);
        if (nativeIsNaN(valueToSet)) {
            return;
        }
        if (Math.abs(valueToSet) < 0 || Math.abs(valueToSet) > 15) {
            return;
        }
    } else {
        return;
    }

    const pathToSet = 'path=/;';

    const cookieData = `${encodeURIComponent(name)}=${encodeURIComponent(valueToSet)}; ${pathToSet}`;

    hit(source);
    document.cookie = cookieData;

    if (shouldReload) {
        document.location.reload();
    }
}

setCookie.names = [
    'set-cookie',
];

setCookie.injections = [hit];
