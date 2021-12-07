import { toRegExp, validateStrPattern } from './string-utils';
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
 * Parse propsToMatch input string into object;
 * used for prevent-fetch and prevent-xhr
 * @param {string} propsToMatchStr
 * @returns {Object} object where 'key' is prop name and 'value' is prop value
 */
export const parseMatchProps = (propsToMatchStr) => {
    const PROPS_DIVIDER = ' ';
    const PAIRS_MARKER = ':';

    const propsObj = {};
    const props = propsToMatchStr.split(PROPS_DIVIDER);

    props.forEach((prop) => {
        const dividerInd = prop.indexOf(PAIRS_MARKER);
        if (dividerInd === -1) {
            propsObj.url = prop;
        } else {
            const key = prop.slice(0, dividerInd);
            const value = prop.slice(dividerInd + 1);
            propsObj[key] = value;
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
        .every((value) => validateStrPattern(value));
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
