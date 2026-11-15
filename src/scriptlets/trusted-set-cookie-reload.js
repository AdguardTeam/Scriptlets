import {
    hit,
    logMessage,
    nativeIsNaN,
    isCookieSetWithValue,
    serializeCookie,
    isValidCookiePath,
    parseKeywordValue,
    getTrustedCookieOffsetMs,
    getCookiePath,
    parseCookieString,
    parseUboOptions,
    unescapeUboArgument,
    getUboCookieDomain,
    encodeUboCookieValue,
    getAdgCookieSettings,
    getUboCookieSettings,
    setCookieBySettings,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-set-cookie-reload
 *
 * @description
 * Sets a cookie with arbitrary name and value,
 * and with optional ability to offset cookie attribute 'expires', set path
 * and set domain.
 * Also reloads the current page after the cookie setting.
 * If reloading option is not needed, use the [`trusted-set-cookie` scriptlet](#trusted-set-cookie).
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('trusted-set-cookie-reload', name, value[, offsetExpiresSec[, path[, domain]]])
 * ```
 *
 * - `name` — required, cookie name to be set
 * - `value` — required, cookie value. Possible values:
 *     - arbitrary value
 *     - empty string for no value
 *     - `$now$` keyword for setting current time in ms, e.g 1667915146503
 *     - `$currentDate$` keyword for setting current time as string, e.g 'Tue Nov 08 2022 13:53:19 GMT+0300'
 *     - `$currentISODate$` keyword for setting current date in the date time string format,
 *       e.g '2022-11-08T13:53:19.650Z'
 *     - value with keywords listed above used as a part of it,
 *       e.g `{"count":1,"firstTime":$now$}`; more than one keyword can be used
 * - `offsetExpiresSec` — optional, offset from current time in seconds, after which cookie should expire;
 *   defaults to no offset. Possible values:
 *     - positive integer in seconds
 *     - `1year` keyword for setting expiration date to one year
 *     - `1day` keyword for setting expiration date to one day
 * - `path` — optional, argument for setting cookie path, defaults to `/`; possible values:
 *     - `/` — root path
 *     - `none` — to set no path at all
 * - `domain` — optional, cookie domain, if not set origin will be set as domain,
 *              if the domain does not match the origin, the cookie will not be set
 *
 * > Note that the scriptlet does not encode cookie names and values.
 * > As a result, if a cookie's name or value includes `;`,
 * > the scriptlet will not set the cookie since this may cause the cookie to break.
 *
 * ### uBO syntax
 *
 * uBO rules are supported with uBO arguments, e.g. `example.org##+js(trusted-set-cookie-reload, name, value)`,
 * as by [`trusted-set-cookie`](#trusted-set-cookie) with `reload, 1` option:
 *
 * ```text
 * example.org##+js(trusted-set-cookie-reload, name, value[, offsetExpiresSec[, path[, ...options]]])
 * ```
 *
 * The options are the same as in `trusted-set-cookie`, so `reload, 0` sets the cookie without reloading the page.
 *
 * ### Examples
 *
 * 1. Set cookie and reload the page after it
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', 'accept')
 *     ```
 *
 * 1. Set cookie with `new Date().getTime()` value and reload the page after it
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', '$now$')
 *     ```
 *
 * 1. Set cookie with keywords used as a part of the value and reload the page after it
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', '{"count":1,"firstTime":$now$}')
 *     ```
 *
 * 1. Set cookie which will expire in 3 days and reload the page after it
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', 'accept', '259200')
 *     ```
 *
 * 1. Set cookie which will expire in one year and reload the page after it
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', 'accept', '1year')
 *     ```
 *
 * 1. Set cookie with no 'expire' and no path, reload the page after it
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', 'decline', '', 'none')
 *     ```
 *
 * 1. Set cookie with domain
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-cookie-reload', 'cmpconsent', 'decline', '', 'none', 'example.org')
 *     ```
 *
 * @added v1.7.10.
 */
/* eslint-enable max-len */

export function trustedSetCookieReload(
    source,
    name,
    value,
    offsetExpiresSec = '',
    path = '/',
    domain = '',
    ...extraArgs
) {
    if (typeof name === 'undefined') {
        logMessage(source, 'Cookie name should be specified');
        return;
    }
    if (typeof value === 'undefined') {
        logMessage(source, 'Cookie value should be specified');
        return;
    }

    // Rules converted from uBO syntax have uBO names with `ubo-` prefix, and uBO arguments.
    // As in uBO, it is `trusted-set-cookie` with `reload, 1` option, which the options of the rule may override
    const cookieSettings = typeof source.name === 'string' && source.name.startsWith('ubo-')
        ? getUboCookieSettings(source, name, value, offsetExpiresSec, path, ['reload', '1', domain].concat(extraArgs))
        : getAdgCookieSettings(source, name, value, offsetExpiresSec, path, domain, true);

    if (cookieSettings === null) {
        return;
    }

    setCookieBySettings(source, cookieSettings);
}

export const trustedSetCookieReloadNames = [
    'trusted-set-cookie-reload',
    // aliases are needed for matching the related uBO scriptlet converted into our syntax,
    // trusted scriptlets support no other aliases
    'ubo-trusted-set-cookie-reload.js',
    'ubo-trusted-set-cookie-reload',
];

// eslint-disable-next-line prefer-destructuring
trustedSetCookieReload.primaryName = trustedSetCookieReloadNames[0];

trustedSetCookieReload.injections = [
    hit,
    logMessage,
    nativeIsNaN,
    isCookieSetWithValue,
    serializeCookie,
    isValidCookiePath,
    parseKeywordValue,
    getTrustedCookieOffsetMs,
    getCookiePath,
    parseCookieString,
    parseUboOptions,
    unescapeUboArgument,
    getUboCookieDomain,
    encodeUboCookieValue,
    getAdgCookieSettings,
    getUboCookieSettings,
    setCookieBySettings,
];
