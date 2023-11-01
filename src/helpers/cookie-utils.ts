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
 * @param rawName name argument of *set-cookie-* scriptlets
 * @param rawValue value argument of *set-cookie-* scriptlets
 * @param rawPath path argument of *set-cookie-* scriptlets
 * @param shouldEncode if cookie's name and value should be encoded
 * @returns string OR `null` if name or value is invalid
 */
export const concatCookieNameValuePath = (
    rawName: string,
    rawValue: string,
    rawPath: string,
    shouldEncode = true,
) => {
    const COOKIE_BREAKER = ';';
    // semicolon will cause the cookie to break
    if (!shouldEncode && (rawName.includes(COOKIE_BREAKER) || `${rawValue}`.includes(COOKIE_BREAKER))) {
        return null;
    }
    const name = shouldEncode ? encodeURIComponent(rawName) : rawName;
    const value = shouldEncode ? encodeURIComponent(rawValue) : rawValue;
    return `${name}=${value}; ${getCookiePath(rawPath)};`;
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
        'false',
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
    ]);

    let validValue;
    if (allowedCookieValues.has(value.toLowerCase())) {
        validValue = value;
    } else if (/^\d+$/.test(value)) {
        validValue = parseFloat(value);
        if (nativeIsNaN(validValue)) {
            return null;
        }
        if (Math.abs(validValue) < 0 || Math.abs(validValue) > 15) {
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
export const isCookieSetWithValue = (cookieString: string, name: string, value: string): boolean => {
    return cookieString.split(';')
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
