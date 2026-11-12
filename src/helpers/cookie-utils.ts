import { nativeIsNaN } from './number-utils';
import { hit } from './hit';
import { logMessage } from './log-message';
import { parseKeywordValue } from './parse-keyword-value';
import { parseUboOptions } from './ubo-utils';
import { type Source } from '../scriptlets';

/**
 * Checks whether the input path is supported
 *
 * @param rawPath input path
 * @returns if cookie path is valid
 */
export const isValidCookiePath = (rawPath: string): boolean => rawPath === '/' || rawPath === 'none';

/**
 * Returns 'path=/' if rawPath is '/'
 * or empty string '' for other cases, `rawPath === 'none'` included
 *
 * @param rawPath path argument of *set-cookie-* scriptlets
 * @returns cookie path
 */
export const getCookiePath = (rawPath: string): string => {
    if (rawPath === '/') {
        return 'path=/';
    }
    // otherwise do not set path as invalid
    // the same for pathArg === 'none'
    return '';
};

/**
 * Combines input cookie name, value, and path into string.
 *
 * @param name name argument of *set-cookie-* scriptlets
 * @param rawValue value argument of *set-cookie-* scriptlets
 * @param rawPath path argument of *set-cookie-* scriptlets
 * @param domainValue domain argument of *set-cookie-* scriptlets
 * @param shouldEncodeValue if cookie value should be encoded. Default is `true`
 *
 * @returns string OR `null` if name or value is invalid
 */
export const serializeCookie = (
    name: string,
    rawValue: string,
    rawPath: string,
    domainValue = '',
    shouldEncodeValue = true,
) => {
    const HOST_PREFIX = '__Host-';
    const SECURE_PREFIX = '__Secure-';
    const COOKIE_BREAKER = ';';

    // semicolon will cause the cookie to break
    if ((!shouldEncodeValue && `${rawValue}`.includes(COOKIE_BREAKER))
        || name.includes(COOKIE_BREAKER)) {
        return null;
    }

    const value = shouldEncodeValue ? encodeURIComponent(rawValue) : rawValue;

    let resultCookie = `${name}=${value}`;

    if (name.startsWith(HOST_PREFIX)) {
        // Cookie with "__Host-" prefix requires "secure" flag, path must be "/",
        // and must not have a domain specified
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#attributes
        // https://github.com/AdguardTeam/Scriptlets/issues/448
        resultCookie += '; path=/; secure';
        if (domainValue) {
            // eslint-disable-next-line no-console
            console.debug(
                `Domain value: "${domainValue}" has been ignored, because is not allowed for __Host- prefixed cookies`,
            );
        }
        return resultCookie;
    }
    const path = getCookiePath(rawPath);
    if (path) {
        resultCookie += `; ${path}`;
    }

    if (name.startsWith(SECURE_PREFIX)) {
        // Cookie with "__Secure-" prefix requires "secure" flag
        resultCookie += '; secure';
    }

    if (domainValue) {
        resultCookie += `; domain=${domainValue}`;
    }

    return resultCookie;
};

/**
 * Gets supported cookie value
 *
 * @param value input cookie value
 * @returns valid cookie string if ok OR null if not
 */
export const getLimitedCookieValue = (value: string): string | number | null => {
    if (!value) {
        return null;
    }

    const allowedCookieValues = new Set([
        'true',
        't',
        'false',
        'f',
        'yes',
        'y',
        'no',
        'n',
        'ok',
        'on',
        'off',
        'accept',
        'accepted',
        'notaccepted',
        'reject',
        'rejected',
        'allow',
        'allowed',
        'disallow',
        'deny',
        'denied',
        'enable',
        'enabled',
        'disable',
        'disabled',
        'necessary',
        'required',
        'hide',
        'hidden',
        'essential',
        'nonessential',
        'checked',
        'unchecked',
        'forbidden',
        'forever',
        'declined',
        'mandatory',
        'all',
    ]);

    let validValue;
    if (allowedCookieValues.has(value.toLowerCase())) {
        validValue = value;
    } else if (value === 'emptyArr') {
        validValue = '[]';
    } else if (value === 'emptyObj') {
        validValue = '{}';
    } else if (/^\d+$/.test(value)) {
        validValue = parseFloat(value);
        if (nativeIsNaN(validValue)) {
            return null;
        }
        if (Math.abs(validValue) < 0 || Math.abs(validValue) > 32767) {
            return null;
        }
    } else {
        return null;
    }

    return validValue;
};

/**
 * Object to represent document.cookie-like string
 */
type CookieData = Record<string, string | null>;

/**
 * Parses cookie string into object
 *
 * @param cookieString string that conforms to document.cookie format
 * @returns key:value object that corresponds with incoming cookies keys and values
 */
export const parseCookieString = (cookieString: string): CookieData => {
    const COOKIE_DELIMITER = '=';
    const COOKIE_PAIRS_DELIMITER = ';';

    // Get raw cookies
    const cookieChunks = cookieString.split(COOKIE_PAIRS_DELIMITER);
    const cookieData: CookieData = {};

    cookieChunks.forEach((singleCookie) => {
        let cookieKey: string;
        let cookieValue = '';
        const delimiterIndex = singleCookie.indexOf(COOKIE_DELIMITER);
        if (delimiterIndex === -1) {
            cookieKey = singleCookie.trim();
        } else {
            cookieKey = singleCookie.slice(0, delimiterIndex).trim();
            cookieValue = singleCookie.slice(delimiterIndex + 1);
        }
        // Save cookie key=value data with null instead of empty ('') values
        cookieData[cookieKey] = cookieValue || null;
    });

    return cookieData;
};

/**
 * Check if cookie with specified name and value is present in a cookie string.
 *
 * If `value` contains time keywords, e.g. '$now$' or '{"firstTime":$now$}',
 * cookie is considered to be set if its value matches such a value
 * and every time set by a keyword in it is not older than one day.
 *
 * @param cookieString 'document.cookie'-like string
 * @param name name argument of *set-cookie-* scriptlets
 * @param value value argument of *set-cookie-* scriptlets
 * @param isUtcDate if true, '$currentDate$' is matched in the format of `toUTCString()`,
 * as set by `parseKeywordValue()` for uBO rules, defaults to false;
 * should be set only for uBO rules, i.e. for scriptlets called by `ubo-` names,
 * as AdGuard rules keep the format of `toString()`
 * @returns if cookie is already set
 */
export const isCookieSetWithValue = (
    cookieString: string,
    name: string,
    value: string,
    isUtcDate = false,
): boolean => {
    // !IMPORTANT: Do not move constants outside of this function
    // If required, remember to sync new time keywords with the "parseKeywordValue" function
    const NOW_VALUE_KEYWORD = '$now$';
    const CURRENT_DATE_KEYWORD = '$currentDate$';
    const CURRENT_ISO_DATE_KEYWORD = '$currentISODate$';

    // Time keywords may be used in any part of the value, e.g. '{"count":1,"firstTime":$now$}',
    // and there may be more than one keyword in it
    // https://github.com/AdguardTeam/Scriptlets/issues/573
    const TIME_KEYWORDS_REGEXP = /\$(?:currentISODate|currentDate|now)\$/g;

    // The time after which the website will reload (1 day)
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    const usedTimeKeywords = typeof value === 'string'
        ? value.match(TIME_KEYWORDS_REGEXP)
        : null;

    // Regexp which matches a cookie value previously set by the same value with keywords,
    // e.g. '{"count":1,"firstTime":$now$}' matches '{"count":1,"firstTime":1667915146503}'.
    // Every time value set by a keyword is captured so it can be checked later
    let timeValueMatcher: RegExp | null = null;

    if (usedTimeKeywords) {
        // Parts of the value between the keywords are arbitrary text
        // which is used as a part of the regexp source below,
        // so all the special characters in them should be escaped.
        // Otherwise '{' and '}' in '{"count":1}' are parsed as a quantifier,
        // '.' matches any character, and '[' in '[16364,88364]' makes the regexp invalid
        // which causes "new RegExp()" to throw.
        // '$&' in the replacement string is the matched character itself
        const escapeRegExp = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const getKeywordPattern = (keyword: string): string => {
            switch (keyword) {
                case NOW_VALUE_KEYWORD:
                    // e.g. '1667915146503'.
                    // Exact number of digits is used instead of '\\d+'
                    // to split adjacent keywords properly, e.g. '$now$$now$'.
                    // Time set not more than one day ago always has the same number of digits
                    // as the current one, and only such a time is considered to be set anyway
                    return `(\\d{${`${Date.now()}`.length}})`;
                case CURRENT_DATE_KEYWORD:
                    if (isUtcDate) {
                        // Matches the format of `toUTCString()`, e.g. 'Tue, 28 Jul 2026 08:00:30 GMT'
                        // https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date.prototype.toutcstring
                        return '(\\w{3}, \\d{2} \\w{3} \\d{4} \\d{2}:\\d{2}:\\d{2} GMT)';
                    }
                    // Matches the format of `Date()` which is used to set such a value,
                    // e.g. 'Tue Jul 28 2026 10:00:30 GMT+0200 (Central European Summer Time)'.
                    // Timezone name is optional because it is implementation-defined,
                    // day and month names are not listed explicitly
                    // since the matched value is validated as a recent time later anyway
                    // https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date.prototype.tostring
                    return '(\\w{3} \\w{3} \\d{2} \\d{4} \\d{2}:\\d{2}:\\d{2} GMT[+-]\\d{4}(?: \\([^)]*\\))?)';
                case CURRENT_ISO_DATE_KEYWORD:
                    // e.g. '2022-11-08T13:53:19.650Z'
                    return '(\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z)';
                default:
                    return '';
            }
        };

        // Parts of the value between the keywords, e.g. ['{"firstTime":', '}']
        const rawChunks = value.split(TIME_KEYWORDS_REGEXP);
        const pattern = rawChunks
            .map((chunk, index) => {
                const keyword = usedTimeKeywords[index];
                return escapeRegExp(chunk) + (keyword ? getKeywordPattern(keyword) : '');
            })
            .join('');
        timeValueMatcher = new RegExp(`^${pattern}$`);
    }

    return cookieString.split(';')
        .some((cookieStr) => {
            const pos = cookieStr.indexOf('=');
            if (pos === -1) {
                return false;
            }
            const cookieName = cookieStr.slice(0, pos).trim();
            const cookieValue = cookieStr.slice(pos + 1).trim();

            if (name !== cookieName) {
                return false;
            }

            // Prevent webpage reloading when cookie value contains a time keyword
            // https://github.com/AdguardTeam/Scriptlets/issues/489
            if (timeValueMatcher) {
                const timeValuesMatch = timeValueMatcher.exec(cookieValue);
                // Cookie value does not look like a value set by such a rule,
                // so new cookie should be set
                if (timeValuesMatch === null) {
                    return false;
                }

                const now = Date.now();

                // If every time value is greater than now minus one day, return true,
                // otherwise return false and new cookie should be set
                return timeValuesMatch.slice(1).every((timeValue) => {
                    // Convert time value to milliseconds
                    const timeValueMs = /^\d+$/.test(timeValue)
                        ? parseInt(timeValue, 10)
                        : new Date(timeValue).getTime();
                    return timeValueMs > now - ONE_DAY_MS;
                });
            }

            return value === cookieValue;
        });
};

/**
 * Returns parsed offset expired number of ms or null if `offsetExpiresSec` is invalid
 *
 * @param offsetExpiresSec input offset param in seconds
 * @returns number is milliseconds OR null
 */
export const getTrustedCookieOffsetMs = (offsetExpiresSec: string): number | null => {
    const ONE_YEAR_EXPIRATION_KEYWORD = '1year';
    const ONE_DAY_EXPIRATION_KEYWORD = '1day';

    const MS_IN_SEC = 1000;
    const SECONDS_IN_YEAR = 365 * 24 * 60 * 60;
    const SECONDS_IN_DAY = 24 * 60 * 60;

    let parsedSec;
    // Set predefined expire value if corresponding keyword was passed
    if (offsetExpiresSec === ONE_YEAR_EXPIRATION_KEYWORD) {
        parsedSec = SECONDS_IN_YEAR;
    } else if (offsetExpiresSec === ONE_DAY_EXPIRATION_KEYWORD) {
        parsedSec = SECONDS_IN_DAY;
    } else {
        parsedSec = Number.parseInt(offsetExpiresSec, 10);
        // If offsetExpiresSec has been parsed to NaN - do not set cookie at all
        if (Number.isNaN(parsedSec)) {
            return null;
        }
    }
    return parsedSec * MS_IN_SEC;
};

/**
 * Returns the cookie domain for the `domain` option of uBO `trusted-set-cookie`.
 * As in uBO, the option may be a regular expression, e.g. `/[^.]+\.[^.]+$/`,
 * whose match in the hostname is the domain, or no domain if it does not match.
 * Otherwise it has to be the hostname or its parent domain, also with a leading dot,
 * e.g. `.example.org`, which the browser ignores, as it would not set the cookie anyway.
 *
 * @param rawDomain Value of the `domain` option, `undefined` if it is not set.
 * @param hostname Hostname of the page, e.g. `www.example.org`.
 *
 * @returns Domain to set, an empty string to set no domain,
 * or `null` if the domain is invalid or does not match the hostname.
 */
export const getUboCookieDomain = (rawDomain: unknown, hostname: string): string | null => {
    if (typeof rawDomain === 'undefined' || rawDomain === '') {
        return '';
    }

    const domain = String(rawDomain);

    if (domain.length > 2 && domain.startsWith('/') && domain.endsWith('/')) {
        let domainRegexp;
        try {
            domainRegexp = new RegExp(domain.slice(1, -1));
        } catch {
            return null;
        }
        const match = domainRegexp.exec(hostname);
        return match ? match[0] : '';
    }

    const lowerCaseHostname = hostname.toLowerCase();
    const bareDomain = (domain.startsWith('.') ? domain.slice(1) : domain).toLowerCase();
    if (lowerCaseHostname === bareDomain || lowerCaseHostname.endsWith(`.${bareDomain}`)) {
        return domain;
    }

    return null;
};

/**
 * Encodes a value of uBO `trusted-set-cookie` which contains characters not allowed in cookies, e.g. `;`,
 * by `encodeURIComponent()`, as uBO does, instead of rejecting it.
 * Keywords of the value, e.g. `$now$`, are kept as they are, so that `parseKeywordValue()`
 * and `isCookieSetWithValue()` still recognize them, as the values they are replaced with need no encoding.
 *
 * @param value Value of the cookie, possibly with keywords.
 *
 * @returns Value with encoded parts between keywords if any part needs encoding, otherwise the value as is.
 */
export const encodeUboCookieValue = (value: string): string => {
    // !IMPORTANT: keep the keywords in sync with "parseKeywordValue"
    const KEYWORDS_REGEXP = /(\$(?:currentISODate|currentDate|now)\$)/;
    // Characters allowed in cookie values by uBO, i.e. space to `:`, `<` to `[`, and `]` to `~`
    const UNSAFE_CHARS_REGEXP = /[^ -:<-[\]-~]/;

    if (typeof value !== 'string' || !UNSAFE_CHARS_REGEXP.test(value)) {
        return value;
    }

    // Keywords are captured by the regexp, so they are at odd indexes after splitting
    return value
        .split(KEYWORDS_REGEXP)
        .map((chunk, index) => (index % 2 === 1 ? chunk : encodeURIComponent(chunk)))
        .join('');
};

/**
 * Sets a cookie by the arguments of uBO `trusted-set-cookie` and `trusted-set-cookie-reload`,
 * i.e. of rules converted from uBO syntax, as uBO `setCookieFn()` does. They differ from AdGuard arguments:
 * - `offsetExpiresSec` may be `0`, which expires the cookie at once, i.e. removes it,
 *   but only digits and keywords are allowed, as in uBO;
 * - an empty `path` sets the root path `/`;
 * - named options follow `path` instead of `domain`:
 *     - `reload, 1` reloads the page once the cookie is set, unless it is set already;
 *     - `domain, value` is the cookie domain, see `getUboCookieDomain()`;
 *     - `dontOverwrite, 1` does not set the cookie if a cookie with the same name exists;
 * - a value with characters not allowed in cookies, e.g. `;`, is encoded instead of rejected,
 *   see `encodeUboCookieValue()`;
 * - `$currentDate$` keyword is set in the format of `toUTCString()`.
 *
 * Requires `hit`, `logMessage`, `nativeIsNaN`, `isCookieSetWithValue`, `serializeCookie`,
 * `isValidCookiePath`, `getTrustedCookieOffsetMs`, `parseKeywordValue`, `getCookiePath`,
 * `parseUboOptions`, `getUboCookieDomain`, `encodeUboCookieValue` and `parseCookieString`
 * in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param name Cookie name.
 * @param value Cookie value, possibly with keywords, e.g. `$now$`.
 * @param offsetExpiresSec Offset of the expiration time in seconds, `1day` or `1year`, empty for no expiration.
 * @param path Cookie path, `/`, `none`, or empty for `/`.
 * @param args Named options which follow `path`, e.g. `['reload', '1', 'domain', 'example.org']`.
 */
export const setUboCookie = (
    source: Source,
    name: string,
    value: string,
    offsetExpiresSec: string,
    path: string,
    args: unknown[],
): void => {
    // uBO accepts only digits or keywords
    const UBO_OFFSET_EXPIRES_REGEXP = /^(?:\d+|1day|1year)$/;

    const options = parseUboOptions(args);

    const domain = getUboCookieDomain(options.domain, document.location.hostname);
    if (domain === null) {
        logMessage(source, `Cookie domain not matched by hostname: '${options.domain}'`);
        return;
    }

    const cookiePath = path === '' ? '/' : path;
    const cookieValue = encodeUboCookieValue(value);

    if (
        options.dontOverwrite
        && Object.prototype.hasOwnProperty.call(parseCookieString(document.cookie), name)
    ) {
        return;
    }

    const shouldReload = !!options.reload;
    // Prevent infinite reloads if the cookie has been set already
    if (shouldReload && isCookieSetWithValue(document.cookie, name, cookieValue, true)) {
        return;
    }

    const parsedValue = parseKeywordValue(cookieValue, true);

    if (!isValidCookiePath(cookiePath)) {
        logMessage(source, `Invalid cookie path: '${cookiePath}'`);
        return;
    }

    let cookieToSet = serializeCookie(name, parsedValue, cookiePath, domain, false);
    if (!cookieToSet) {
        logMessage(source, 'Invalid cookie name or value');
        return;
    }

    if (offsetExpiresSec) {
        // `0` is allowed, as it removes the cookie
        if (!UBO_OFFSET_EXPIRES_REGEXP.test(offsetExpiresSec)) {
            logMessage(source, `Invalid offsetExpiresSec value: ${offsetExpiresSec}`);
            return;
        }

        const expires = Date.now() + (getTrustedCookieOffsetMs(offsetExpiresSec) || 0);
        cookieToSet += `; expires=${new Date(expires).toUTCString()}`;
    }

    document.cookie = cookieToSet;
    hit(source);

    // Reload only if the cookie has actually been set, e.g. not blocked by the browser,
    // otherwise the page would be reloaded infinitely
    if (shouldReload && isCookieSetWithValue(document.cookie, name, cookieValue, true)) {
        window.location.reload();
    }
};
