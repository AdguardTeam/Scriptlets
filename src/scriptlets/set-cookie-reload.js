import {
    hit,
    logMessage,
    nativeIsNaN,
    isCookieSetWithValue,
    getLimitedCookieValue,
    serializeCookie,
    isValidCookiePath,
    getCookiePath,
} from '../helpers';

/**
 * @scriptlet set-cookie-reload
 *
 * @description
 * Sets a cookie with the specified name and value, path, and domain,
 * and reloads the current page after the cookie setting.
 * If reloading option is not needed, use [set-cookie](#set-cookie) scriptlet.
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('set-cookie-reload', name, value[, path[, domain]])
 * ```
 *
 * - `name` — required, cookie name to be set
 * - `value` — required, cookie value; possible values:
 *     - positive decimal integer `<= 32767`
 *     - one of the predefined constants in any case variation:
 *         - `true` / `t`
 *         - `false` / `f`
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
 *         - `necessary` / `required`
 *         - `hide` / `hidden`
 *         - `essential` / `nonessential`
 *         - `checked` / `unchecked`
 *         - `forbidden` / `forever`
 * - `path` — optional, cookie path, defaults to `/`; possible values:
 *     - `/` — root path
 *     - `none` — to set no path at all
 * - `domain` — optional, cookie domain, if not set origin will be set as domain,
 *              if the domain does not match the origin, the cookie will not be set
 *
 * > Note that the scriptlet does not encode a cookie name,
 * > e.g. name 'a:b' will be set as 'a:b' and not as 'a%3Ab'.
 * >
 * > Also if a cookie name includes `;`, the cookie will not be set since this may cause the cookie to break.
 *
 * ### Examples
 *
 * ```adblock
 * example.org#%#//scriptlet('set-cookie-reload', 'checking', 'ok')
 *
 * example.org#%#//scriptlet('set-cookie-reload', 'gdpr-settings-cookie', '1')
 *
 * example.org#%#//scriptlet('set-cookie-reload', 'cookie-set', 'true', 'none')
 *
 * example.org#%#//scriptlet('set-cookie-reload', 'test', '1', 'none', 'example.org')
 * ```
 *
 * @added v1.3.14.
 */
export function setCookieReload(source, name, value, path = '/', domain = '') {
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

    if (!document.location.origin.includes(domain)) {
        logMessage(source, `Cookie domain not matched by origin: '${domain}'`);
        return;
    }

    const cookieToSet = serializeCookie(name, validValue, path, domain);
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

export const setCookieReloadNames = [
    'set-cookie-reload',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'set-cookie-reload.js',
    'ubo-set-cookie-reload.js',
    'ubo-set-cookie-reload',
];

// eslint-disable-next-line prefer-destructuring
setCookieReload.primaryName = setCookieReloadNames[0];

setCookieReload.injections = [
    hit,
    logMessage,
    nativeIsNaN,
    isCookieSetWithValue,
    getLimitedCookieValue,
    serializeCookie,
    isValidCookiePath,
    getCookiePath,
];
