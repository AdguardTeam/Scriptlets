import { nativeIsNaN } from './number-utils';
import { hit } from './hit';
import { logMessage } from './log-message';
import { parseKeywordValue } from './parse-keyword-value';
import { parseUboOptions, unescapeUboArgument } from './ubo-utils';
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
 * @param shouldValidateName if a name with `;` should be rejected. Default is `true`,
 * it is `false` only for uBO rules, as uBO does not check names of trusted cookies
 *
 * @returns string OR `null` if name or value is invalid
 */
export const serializeCookie = (
    name: string,
    rawValue: string,
    rawPath: string,
    domainValue = '',
    shouldEncodeValue = true,
    shouldValidateName = true,
) => {
    const HOST_PREFIX = '__Host-';
    const SECURE_PREFIX = '__Secure-';
    const COOKIE_BREAKER = ';';

    // semicolon will cause the cookie to break
    if ((!shouldEncodeValue && `${rawValue}`.includes(COOKIE_BREAKER))
        || (shouldValidateName && name.includes(COOKIE_BREAKER))) {
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
 * @param isValueEncoded if true, the cookie is matched as the value with the keywords replaced,
 * which has been encoded by `encodeURIComponent()` as a whole, as for uBO rules whose value has characters
 * not allowed in cookies, see `shouldEncodeUboCookieValue()`, defaults to false
 * @returns if cookie is already set
 */
export const isCookieSetWithValue = (
    cookieString: string,
    name: string,
    value: string,
    isUtcDate = false,
    isValueEncoded = false,
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
            const rawCookieValue = cookieStr.slice(pos + 1).trim();

            if (name !== cookieName) {
                return false;
            }

            // An encoded value is decoded to be matched as the value with the keywords replaced,
            // e.g. 'Tue%2C%2008%20Nov%202022%2010%3A53%3A19%20GMT%3Bx' as '$currentDate$;x',
            // but only if it is exactly the encoded value, as the value set by the rule is,
            // e.g. not a value which the page has set without encoding, or with '%' which is not an escape
            let cookieValue = rawCookieValue;
            if (isValueEncoded) {
                try {
                    cookieValue = decodeURIComponent(rawCookieValue);
                } catch {
                    return false;
                }
                if (encodeURIComponent(cookieValue) !== rawCookieValue) {
                    return false;
                }
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
 * Checks whether a value of uBO `trusted-set-cookie` is encoded by `encodeURIComponent()` as a whole,
 * i.e. after its keywords, e.g. `$now$`, have been replaced, as uBO `setCookieFn()` does if the value has
 * a character not allowed in cookies, e.g. `;`, instead of rejecting it.
 * The value with the keywords is checked, as the values they are replaced with have only allowed characters,
 * also `$currentDate$` in the format of `toUTCString()`, e.g. `Tue, 08 Nov 2022 10:53:19 GMT`, so the value
 * set by the rule needs encoding if and only if the value of the rule does.
 *
 * @param value Value of the cookie, possibly with keywords.
 *
 * @returns True if the value is encoded.
 */
export const shouldEncodeUboCookieValue = (value: string): boolean => {
    // !IMPORTANT: Do not move constants outside of this function
    // Characters allowed in cookie values by uBO, i.e. space to `:`, `<` to `[`, and `]` to `~`
    const UNSAFE_CHARS_REGEXP = /[^ -:<-[\]-~]/;
    return typeof value === 'string' && UNSAFE_CHARS_REGEXP.test(value);
};

/**
 * Settings of `setCookieBySettings()`, which are parsed from the arguments of `trusted-set-cookie`
 * or `trusted-set-cookie-reload` once, by `getAdgCookieSettings()` or `getUboCookieSettings()`.
 */
export interface CookieSettings {
    /**
     * Cookie name.
     */
    name: string;

    /**
     * Cookie value, possibly with keywords, e.g. `$now$`.
     */
    value: string;

    /**
     * If true, the value with the keywords replaced is encoded by `encodeURIComponent()` as a whole, as uBO does
     * for a value with characters not allowed in cookies, see `shouldEncodeUboCookieValue()`.
     */
    isValueEncoded: boolean;

    /**
     * Cookie path, `/` or `none`.
     */
    path: string;

    /**
     * Cookie domain, or an empty string for no domain.
     */
    domain: string;

    /**
     * Offset of the expiration time in milliseconds, or `null` for no expiration.
     */
    offsetExpiresMs: number | null;

    /**
     * If true, `$currentDate$` keyword is set and matched in the format of `toUTCString()`, as in uBO.
     */
    isUtcDate: boolean;

    /**
     * If true, the page is reloaded once the cookie is set, unless it has been set already.
     */
    shouldReload: boolean;

    /**
     * If true, the cookie is not set if a cookie with the same name exists.
     */
    shouldKeepExisting: boolean;

    /**
     * If true, a name with `;` is rejected. As uBO does not check names of trusted cookies,
     * uBO rules may use it to set a cookie whose value is in the name, e.g. `ad_expire=true;`.
     */
    shouldValidateName: boolean;

    /**
     * If true, the page is reloaded only if the cookie has the value which has been set, as in uBO,
     * otherwise if the cookie has a non-empty value, as in AdGuard `trusted-set-cookie-reload`.
     */
    isReloadCheckedByValue: boolean;
}

/**
 * Parses the arguments of AdGuard `trusted-set-cookie` and `trusted-set-cookie-reload`,
 * as they have been parsed before uBO arguments were supported:
 * - `path` has to be `/` or `none`;
 * - `domain` has to be a part of the origin of the page, an empty one sets no domain;
 * - `offsetExpiresSec` has to be a positive number of seconds, `1day` or `1year`, empty for no expiration.
 *
 * Requires `logMessage`, `nativeIsNaN`, `isValidCookiePath` and `getTrustedCookieOffsetMs`
 * in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param name Cookie name.
 * @param value Cookie value, possibly with keywords.
 * @param offsetExpiresSec Offset of the expiration time.
 * @param path Cookie path.
 * @param domain Cookie domain.
 * @param shouldReload If true, the page is reloaded once the cookie is set.
 *
 * @returns Settings of the cookie, or `null` if an argument is invalid, which is logged.
 */
export const getAdgCookieSettings = (
    source: Source,
    name: string,
    value: string,
    offsetExpiresSec: string,
    path: string,
    domain: string,
    shouldReload: boolean,
): CookieSettings | null => {
    if (!isValidCookiePath(path)) {
        logMessage(source, `Invalid cookie path: '${path}'`);
        return null;
    }

    if (!document.location.origin.includes(domain)) {
        logMessage(source, `Cookie domain not matched by origin: '${domain}'`);
        return null;
    }

    let offsetExpiresMs: number | null = null;
    if (offsetExpiresSec) {
        offsetExpiresMs = getTrustedCookieOffsetMs(offsetExpiresSec);
        // `0` is invalid, as well as other values which are not parsed
        if (!offsetExpiresMs) {
            logMessage(source, `Invalid offsetExpiresSec value: ${offsetExpiresSec}`);
            return null;
        }
    }

    return {
        name,
        value,
        isValueEncoded: false,
        path,
        domain,
        offsetExpiresMs,
        isUtcDate: false,
        shouldReload,
        shouldKeepExisting: false,
        shouldValidateName: true,
        isReloadCheckedByValue: false,
    };
};

/**
 * Parses the arguments of uBO `trusted-set-cookie` and `trusted-set-cookie-reload`, i.e. of rules converted
 * from uBO syntax, as uBO `trustedSetCookie()` and `setCookieFn()` do. They differ from AdGuard arguments:
 * - `offsetExpiresSec` may be `0`, which expires the cookie at once, i.e. removes it,
 *   but only digits and keywords are allowed, as in uBO;
 * - an empty `path` sets the root path `/`;
 * - named options follow `path` instead of `domain`:
 *     - `reload, 1` reloads the page once the cookie is set, unless it is set already;
 *     - `domain, value` is the cookie domain, see `getUboCookieDomain()`;
 *     - `dontOverwrite, 1` does not set the cookie if a cookie with the same name exists;
 * - an empty name sets no cookie, instead of a cookie without a name, and the value is empty if it is omitted;
 * - a value with characters not allowed in cookies, e.g. `;`, is encoded as a whole, after its keywords have been
 *   replaced, instead of rejected, see `shouldEncodeUboCookieValue()`;
 * - `$currentDate$` keyword is set in the format of `toUTCString()`;
 * - a name with `;` is not rejected, as uBO does not check names of trusted cookies.
 *
 * The converter escapes each `'` of the arguments, e.g. in `"{stamp:''}"`, which is unescaped,
 * as uBO receives the arguments without the escapes.
 *
 * Requires `logMessage`, `nativeIsNaN`, `isValidCookiePath`, `getTrustedCookieOffsetMs`, `parseUboOptions`,
 * `unescapeUboArgument`, `getUboCookieDomain` and `shouldEncodeUboCookieValue` in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param name Cookie name.
 * @param value Cookie value, possibly with keywords, e.g. `$now$`, or `undefined` if it is omitted.
 * @param offsetExpiresSec Offset of the expiration time in seconds, `1day` or `1year`, empty for no expiration.
 * @param path Cookie path, `/`, `none`, or empty for `/`.
 * @param args Named options which follow `path`, e.g. `['reload', '1', 'domain', 'example.org']`.
 *
 * @returns Settings of the cookie, or `null` if an argument is invalid, which is logged.
 */
export const getUboCookieSettings = (
    source: Source,
    name: string,
    value: string | undefined,
    offsetExpiresSec: string,
    path: string,
    args: unknown[],
): CookieSettings | null => {
    // uBO accepts only digits or keywords
    const UBO_OFFSET_EXPIRES_REGEXP = /^(?:\d+|1day|1year)$/;
    const cookieName = unescapeUboArgument(name) as string;
    // As in uBO, an omitted value is empty, e.g. `example.org##+js(trusted-set-cookie, consent)`
    const cookieValue = typeof value === 'undefined' ? '' : unescapeUboArgument(value) as string;
    const options = parseUboOptions(args.map(unescapeUboArgument));

    // As in uBO, e.g. `example.org##+js(trusted-set-cookie, , value)` sets no cookie, as `=value` would be one
    // without a name
    if (cookieName === '') {
        logMessage(source, 'Cookie name should be specified');
        return null;
    }

    const domain = getUboCookieDomain(options.domain, document.location.hostname);
    if (domain === null) {
        logMessage(source, `Cookie domain not matched by hostname: '${options.domain}'`);
        return null;
    }

    const cookiePath = path === '' ? '/' : path;
    if (!isValidCookiePath(cookiePath)) {
        logMessage(source, `Invalid cookie path: '${cookiePath}'`);
        return null;
    }

    let offsetExpiresMs: number | null = null;
    if (offsetExpiresSec) {
        // `0` is allowed, as it removes the cookie
        if (!UBO_OFFSET_EXPIRES_REGEXP.test(offsetExpiresSec)) {
            logMessage(source, `Invalid offsetExpiresSec value: ${offsetExpiresSec}`);
            return null;
        }
        offsetExpiresMs = getTrustedCookieOffsetMs(offsetExpiresSec) || 0;
    }

    return {
        name: cookieName,
        value: cookieValue,
        isValueEncoded: shouldEncodeUboCookieValue(cookieValue),
        path: cookiePath,
        domain,
        offsetExpiresMs,
        isUtcDate: true,
        shouldReload: !!options.reload,
        shouldKeepExisting: !!options.dontOverwrite,
        shouldValidateName: false,
        isReloadCheckedByValue: true,
    };
};

/**
 * Sets a cookie by the settings parsed from the arguments of `trusted-set-cookie` or `trusted-set-cookie-reload`,
 * and reloads the page once it is set if `shouldReload` is set, unless the cookie has been set already,
 * so that the page is not reloaded infinitely.
 *
 * Requires `hit`, `logMessage`, `isCookieSetWithValue`, `serializeCookie`, `getCookiePath`,
 * `parseKeywordValue` and `parseCookieString` in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param settings Settings of the cookie.
 */
export const setCookieBySettings = (source: Source, settings: CookieSettings): void => {
    const {
        name,
        value,
        isValueEncoded,
        path,
        domain,
        offsetExpiresMs,
        isUtcDate,
        shouldReload,
        shouldKeepExisting,
        shouldValidateName,
        isReloadCheckedByValue,
    } = settings;

    if (shouldKeepExisting && Object.prototype.hasOwnProperty.call(parseCookieString(document.cookie), name)) {
        return;
    }

    // Prevent infinite reloads if the cookie has been set already or blocked by the browser
    // https://github.com/AdguardTeam/Scriptlets/issues/212
    if (shouldReload && isCookieSetWithValue(document.cookie, name, value, isUtcDate, isValueEncoded)) {
        return;
    }

    const parsedValue = parseKeywordValue(value, isUtcDate);
    // As in uBO, keywords are replaced before the whole value is encoded,
    // e.g. '$currentDate$;x' is set as 'Tue%2C%2008%20Nov%202022%2010%3A53%3A19%20GMT%3Bx'
    const valueToSet = isValueEncoded ? encodeURIComponent(parsedValue) : parsedValue;

    let cookieToSet = serializeCookie(name, valueToSet, path, domain, false, shouldValidateName);
    if (!cookieToSet) {
        logMessage(source, 'Invalid cookie name or value');
        return;
    }

    if (offsetExpiresMs !== null) {
        const expires = Date.now() + offsetExpiresMs;
        cookieToSet += `; expires=${new Date(expires).toUTCString()}`;
    }

    document.cookie = cookieToSet;
    hit(source);

    if (!shouldReload) {
        return;
    }

    // Reload only if the cookie has actually been set, e.g. not blocked by the browser,
    // otherwise the page would be reloaded infinitely.
    // AdGuard rules check the value read back, in case if $now$ or $currentDate$ is used
    // https://github.com/AdguardTeam/Scriptlets/issues/291
    const isSet = isReloadCheckedByValue
        ? isCookieSetWithValue(document.cookie, name, value, isUtcDate, isValueEncoded)
        : isCookieSetWithValue(document.cookie, name, parseCookieString(document.cookie)[name] as string);
    if (isSet) {
        window.location.reload();
    }
};
