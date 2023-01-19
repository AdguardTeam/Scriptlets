import { toRegExp, isValidStrPattern } from './string-utils';
import { getObjectFromEntries } from './object-utils';

/**
 * Returns array of request props that are supported by fetch/xhr scriptlets.
 * Includes common 'url' and 'method' props and all other fetch-specific props
 *
 * @returns {string[]} list of request props
 */
export const getRequestProps = () => [
    'url',
    'method',
    'headers',
    'body',
    'mode',
    'credentials',
    'cache',
    'redirect',
    'referrer',
    'referrerPolicy',
    'integrity',
    'keepalive',
    'signal',
];

/**
 * Collects Request options to object
 *
 * @param {Request} request Request instance to collect properties from
 * @returns {Object} data object
 */
export const getRequestData = (request) => {
    const requestInitOptions = getRequestProps();
    const entries = requestInitOptions
        .map((key) => {
            // if request has no such option, value will be undefined
            const value = request[key];
            return [key, value];
        });
    return getObjectFromEntries(entries);
};

/**
 * Collects fetch args to object
 *
 * @param {any} args fetch args
 * @returns {Object} data object
 */
export const getFetchData = (args) => {
    const fetchPropsObj = {};

    let fetchUrl;
    let fetchInit;
    if (args[0] instanceof Request) {
        // if Request passed to fetch, it will be in array
        const requestData = getRequestData(args[0]);
        fetchUrl = requestData.url;
        fetchInit = requestData;
    } else {
        fetchUrl = args[0]; // eslint-disable-line prefer-destructuring
        fetchInit = args[1]; // eslint-disable-line prefer-destructuring
    }

    fetchPropsObj.url = fetchUrl;
    if (fetchInit instanceof Object) {
        Object.keys(fetchInit)
            .forEach((prop) => {
                fetchPropsObj[prop] = fetchInit[prop];
            });
    }
    return fetchPropsObj;
};

/**
 * Collect xhr.open arguments to object
 *
 * @param {string} method request method
 * @param {string} url request url
 * @param {string} async request async prop
 * @param {string} user request user prop
 * @param {string} password request password prop
 * @returns {Object} aggregated request data
 */
export const getXhrData = (method, url, async, user, password) => {
    return {
        method,
        url,
        async,
        user,
        password,
    };
};

/**
 * Parse propsToMatch input string into object;
 * used for prevent-fetch and prevent-xhr
 *
 * @param {string} propsToMatchStr string of space-separated request properties to match
 * @returns {Object} object where 'key' is prop name and 'value' is prop value
 */
export const parseMatchProps = (propsToMatchStr) => {
    const PROPS_DIVIDER = ' ';
    const PAIRS_MARKER = ':';
    const LEGAL_MATCH_PROPS = getRequestProps();

    const propsObj = {};
    const props = propsToMatchStr.split(PROPS_DIVIDER);

    props.forEach((prop) => {
        const dividerInd = prop.indexOf(PAIRS_MARKER);

        const key = prop.slice(0, dividerInd);
        const hasLegalMatchProp = LEGAL_MATCH_PROPS.indexOf(key) !== -1;

        if (hasLegalMatchProp) {
            const value = prop.slice(dividerInd + 1);
            propsObj[key] = value;
        } else {
            // Escape multiple colons in prop
            // i.e regex value and/or url with protocol specified, with or without 'url:' match prop
            // https://github.com/AdguardTeam/Scriptlets/issues/216#issuecomment-1178591463
            propsObj.url = prop;
        }
    });

    return propsObj;
};

/**
 * Validates parsed data values
 *
 * @param {Object} data request data
 * @returns {boolean} if data is valid
 */
export const validateParsedData = (data) => {
    return Object.values(data)
        .every((value) => isValidStrPattern(value));
};

/**
 * Converts valid parsed data to data obj for further matching
 *
 * @param {Object} data parsed request data
 * @returns {Object} data obj ready for matching
 */
export const getMatchPropsData = (data) => {
    const matchData = {};
    Object.keys(data)
        .forEach((key) => {
            matchData[key] = toRegExp(data[key]);
        });
    return matchData;
};
