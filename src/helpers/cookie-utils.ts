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
 * Check if cookie with specified name and value is present in a cookie string
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
    return cookieString.split(';')
        .some((cookieStr) => {
            const pos = cookieStr.indexOf('=');
            if (pos === -1) {
                return false;
            }
            const cookieName = cookieStr.slice(0, pos).trim();
            const cookieValue = cookieStr.slice(pos + 1).trim();

            // If required, remember to sync new time keywords with the "parseKeywordValue" function
            const timeKeywords = new Set([
                '$now$',
                '$currentDate$',
                '$currentISODate$',
            ]);
            const isValueTimeKeyword = timeKeywords.has(value);

            // Prevent webpage reloading when cookie value is a time keyword
            // https://github.com/AdguardTeam/Scriptlets/issues/489
            if (isValueTimeKeyword) {
                // The time after which the website will reload (1 day)
                const ONE_DAY_MS = 24 * 60 * 60 * 1000;
                const now = Date.now();
                // Convert cookie value to milliseconds
                const cookieValueMs = /^\d+$/.test(cookieValue)
                    ? parseInt(cookieValue, 10)
                    : new Date(cookieValue).getTime();

                // If cookie value is greater than now minus one day, return true,
                // otherwise return false and new cookie should be set
                return name === cookieName && cookieValueMs > now - ONE_DAY_MS;
            }

            return name === cookieName && value === cookieValue;
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
