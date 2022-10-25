import { toRegExp, isValidStrPattern } from './string-utils';
import { getObjectFromEntries } from './object-utils';

/**
 * Collects Request options to object
 * @param {Request} request
 * @returns {Object} data object
 */
export const getRequestData = (request) => {
    const REQUEST_INIT_OPTIONS = [
        'url',
        'method',
        'headers',
        'body',
        'mode',
        'credentials',
        'cache',
        'redirect',
        'referrer',
        'integrity',
    ];
    const entries = REQUEST_INIT_OPTIONS
        .map((key) => {
            // if request has no such option, value will be undefined
            const value = request[key];
            return [key, value];
        });
    return getObjectFromEntries(entries);
};

/**
 * Collects fetch args to object
 * @param {*} args fetch args
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
 * @param {string} method
 * @param {string} url
 * @param {string} async
 * @param {string} user
 * @param {string} password
 * @returns {Object}
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
 * @param {string} propsToMatchStr
 * @returns {Object} object where 'key' is prop name and 'value' is prop value
 */
export const parseMatchProps = (propsToMatchStr) => {
    const PROPS_DIVIDER = ' ';
    const PAIRS_MARKER = ':';
    const LEGAL_MATCH_PROPS = [
        'method',
        'url',
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
        'async',
    ];

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
 * @param {Object} data
 * @returns {boolean}
 */
export const validateParsedData = (data) => {
    return Object.values(data)
        .every((value) => isValidStrPattern(value));
};

/**
 * Converts valid parsed data to data obj for further matching
 * @param {Object} data
 * @returns {Object}
 */
export const getMatchPropsData = (data) => {
    const matchData = {};
    Object.keys(data)
        .forEach((key) => {
            matchData[key] = toRegExp(data[key]);
        });
    return matchData;
};
