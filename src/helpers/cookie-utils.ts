import { nativeIsNaN } from './number-utils';

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
 * @returns if cookie is already set
 */
export const isCookieSetWithValue = (
    cookieString: string,
    name: string,
    value: string,
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
