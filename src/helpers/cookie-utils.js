import { nativeIsNaN } from './number-utils';

/**
 * Checks whether the input path is supported
 *
 * @param {string} rawPath input path
 *
 * @returns {boolean}
 */
export const isValidCookieRawPath = (rawPath) => rawPath === '/' || rawPath === 'none';

/**
 * Returns 'path=/' if rawPath is '/'
 * or empty string '' for other cases, `rawPath === 'none'` included
 *
 * @param {string} rawPath
 *
 * @returns {string}
 */
export const getCookiePath = (rawPath) => {
    if (rawPath === '/') {
        return 'path=/';
    }
    // otherwise do not set path as invalid
    // the same for pathArg === 'none'
    //
    return '';
};

/**
 * Combines input cookie name, value, and path into string.
 *
 * @param {string} rawName
 * @param {string} rawValue
 * @param {string} rawPath
 *
 * @returns {string} string OR `null` if path is not supported
 */
export const concatCookieNameValuePath = (rawName, rawValue, rawPath) => {
    const log = console.log.bind(console); // eslint-disable-line no-console
    if (!isValidCookieRawPath(rawPath)) {
        log(`Invalid cookie path: '${rawPath}'`);
        return null;
    }
    // eslint-disable-next-line max-len
    return `${encodeURIComponent(rawName)}=${encodeURIComponent(rawValue)}; ${getCookiePath(rawPath)}`;
};

/**
 * Gets supported cookie value
 *
 * @param {string} value input cookie value
 *
 * @returns {string|null} valid cookie string if ok OR null if not
 */
export const getLimitedCookieValue = (value) => {
    if (!value) {
        return null;
    }
    const log = console.log.bind(console); // eslint-disable-line no-console
    let validValue;
    if (value === 'true') {
        validValue = 'true';
    } else if (value === 'True') {
        validValue = 'True';
    } else if (value === 'false') {
        validValue = 'false';
    } else if (value === 'False') {
        validValue = 'False';
    } else if (value === 'yes') {
        validValue = 'yes';
    } else if (value === 'Yes') {
        validValue = 'Yes';
    } else if (value === 'Y') {
        validValue = 'Y';
    } else if (value === 'no') {
        validValue = 'no';
    } else if (value === 'ok') {
        validValue = 'ok';
    } else if (value === 'OK') {
        validValue = 'OK';
    } else if (/^\d+$/.test(value)) {
        validValue = parseFloat(value);
        if (nativeIsNaN(validValue)) {
            log(`Invalid cookie value: '${value}'`);
            return null;
        }
        if (Math.abs(validValue) < 0 || Math.abs(validValue) > 15) {
            log(`Invalid cookie value: '${value}'`);
            return null;
        }
    } else {
        return null;
    }

    return validValue;
};

/**
 * Parses cookie string into object
 * @param {string} cookieString string that conforms to document.cookie format
 * @returns {Object} key:value object that corresponds with incoming cookies keys and values
 */
export const parseCookieString = (cookieString) => {
    const COOKIE_DELIMITER = '=';
    const COOKIE_PAIRS_DELIMITER = ';';

    // Get raw cookies
    const cookieChunks = cookieString.split(COOKIE_PAIRS_DELIMITER);
    const cookieData = {};

    cookieChunks.forEach((singleCookie) => {
        let cookieKey;
        let cookieValue;
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
 * @param {string} cookieString
 * @param {string} name
 * @param {string} value
 * @returns {boolean}
 */
export const isCookieSetWithValue = (cookieString, name, value) => {
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
