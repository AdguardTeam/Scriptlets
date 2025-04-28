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

/* eslint-disable max-len */
/**
 * @scriptlet set-cookie
 *
 * @description
 * Sets a cookie with the specified name, value, path, and domain.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#set-cookiejs-
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('set-cookie', name, value[, path[, domain]])
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
 *         - `emptyArr` to set an empty array `[]`
 *         - `emptyObj` to set an empty object `{}`
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
 * example.org#%#//scriptlet('set-cookie', 'CookieConsent', '1')
 *
 * example.org#%#//scriptlet('set-cookie', 'gdpr-settings-cookie', 'true')
 *
 * example.org#%#//scriptlet('set-cookie', 'cookie_consent', 'ok', 'none')
 *
 * example.org#%#//scriptlet('set-cookie-reload', 'test', '1', 'none', 'example.org')
 * ```
 *
 * @added v1.2.3.
 */
/* eslint-enable max-len */
export function setCookie(source, name, value, path = '/', domain = '') {
    const validValue = getLimitedCookieValue(value);
    if (validValue === null) {
        logMessage(source, `Invalid cookie value: '${validValue}'`);
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

    const cookieToSet = serializeCookie(name, validValue, path, domain, false);
    if (!cookieToSet) {
        logMessage(source, 'Invalid cookie name or value');
        return;
    }

    hit(source);
    document.cookie = cookieToSet;
}

export const setCookieNames = [
    'set-cookie',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'set-cookie.js',
    'ubo-set-cookie.js',
    'ubo-set-cookie',
];

// eslint-disable-next-line prefer-destructuring
setCookie.primaryName = setCookieNames[0];

setCookie.injections = [
    hit,
    logMessage,
    nativeIsNaN,
    isCookieSetWithValue,
    getLimitedCookieValue,
    serializeCookie,
    isValidCookiePath,
    getCookiePath,
];
