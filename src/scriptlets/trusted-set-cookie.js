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
    shouldEncodeUboCookieValue,
    getAdgCookieSettings,
    getUboCookieSettings,
    setCookieBySettings,
    isDigits,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-set-cookie
 *
 * @description
 * Sets a cookie with arbitrary name and value,
 * and with optional ability to offset cookie attribute 'expires', set path
 * and set domain.
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('trusted-set-cookie', name, value[, offsetExpiresSec[, path[, domain]]])
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
 * uBO rules are supported with uBO arguments, e.g. `example.org##+js(trusted-set-cookie, name, value)`:
 *
 * ```text
 * example.org##+js(trusted-set-cookie, name[, value[, offsetExpiresSec[, path[, ...options]]]])
 * ```
 *
 * They differ from the AdGuard syntax as follows:
 *
 * - `name` — empty string sets no cookie, instead of a cookie without a name
 * - `value` — empty string if it is omitted, e.g. `example.org##+js(trusted-set-cookie, consent)`
 * - `offsetExpiresSec` — `0` is allowed, it expires the cookie at once, i.e. removes it
 * - `path` — empty string sets the root path `/`
 * - options are pairs of a name and a value which follow `path`:
 *     - `reload, 1` — reload the page after the cookie is set, unless it is set already
 *     - `domain, value` — cookie domain, the hostname of the page or its parent domain, also with a leading dot,
 *       or a regular expression whose match in the hostname is the domain
 *     - `dontOverwrite, 1` — do not set the cookie if a cookie with the same name exists
 * - a value with characters not allowed in cookies, e.g. `;`, is encoded instead of rejected, as a whole
 *   after keywords are replaced, e.g. `$currentDate$;x` as `Tue%2C%2008%20Nov%202022%2010%3A53%3A19%20GMT%3Bx`
 * - a name with `;` is not rejected, as uBO does not check names of trusted cookies,
 *   e.g. `ad_expire=true;` sets the cookie `ad_expire=true`
 * - `$currentDate$` keyword sets current time in UTC, e.g. 'Tue, 08 Nov 2022 10:53:19 GMT'
 *
 * ### Examples
 *
 * 1. Set cookie
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', 'accept')
 *     example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', '1-accept_1')
 *     ```
 *
 * 1. Set cookie with `new Date().getTime()` value
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', '$now$')
 *     ```
 *
 * 1. Set cookie with keywords used as a part of the value
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', '{"count":1,"firstTime":$now$}')
 *     ```
 *
 * 1. Set cookie which will expire in 3 days
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', 'accept', '259200')
 *     ```
 *
 * 1. Set cookie which will expire in one year
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', 'accept', '1year')
 *     ```
 *
 * 1. Set cookie with no path
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', 'decline', '', 'none')
 *
 * 1. Set cookie with domain
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-cookie', 'cmpconsent', 'decline', '', 'none', 'example.org')
 *     ```
 *
 * @added v1.7.3.
 */
/* eslint-enable max-len */

export function trustedSetCookie(
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
    // Rules converted from uBO syntax have uBO names with `ubo-` prefix, and uBO arguments,
    // in which the value may be omitted, as it is empty then
    const isUboRule = typeof source.name === 'string' && source.name.startsWith('ubo-');
    if (typeof value === 'undefined' && !isUboRule) {
        logMessage(source, 'Cookie value should be specified');
        return;
    }

    // uBO arguments have named options instead of `domain`
    const cookieSettings = isUboRule
        ? getUboCookieSettings(source, name, value, offsetExpiresSec, path, [domain].concat(extraArgs))
        : getAdgCookieSettings(source, name, value, offsetExpiresSec, path, domain, false);

    if (cookieSettings === null) {
        return;
    }

    setCookieBySettings(source, cookieSettings);
}

export const trustedSetCookieNames = [
    'trusted-set-cookie',
    // aliases are needed for matching the related uBO scriptlet converted into our syntax,
    // trusted scriptlets support no other aliases
    'ubo-trusted-set-cookie.js',
    'ubo-trusted-set-cookie',
];

// eslint-disable-next-line prefer-destructuring
trustedSetCookie.primaryName = trustedSetCookieNames[0];

trustedSetCookie.injections = [
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
    shouldEncodeUboCookieValue,
    getAdgCookieSettings,
    getUboCookieSettings,
    setCookieBySettings,
    // used by parseUboOptions() or getAdgJsonTextMatch()
    isDigits,
];
