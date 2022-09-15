import { nativeIsFinite, nativeIsNaN } from './number-utils';
import { isEmptyObject, getObjectEntries } from './object-utils';

/**
 * String.prototype.replaceAll polyfill
 * @param {string} input input string
 * @param {string} substr to look for
 * @param {string} newSubstr replacement
 * @returns {string}
 */
export const replaceAll = (input, substr, newSubstr) => input.split(substr).join(newSubstr);

/**
 * Escapes special chars in string
 * @param {string} str
 * @returns {string}
 */
export const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A literal string or regexp pattern wrapped in forward slashes.
 * For example, 'simpleStr' or '/adblock|_0x/'.
 * @typedef {string} RawStrPattern
 */

/**
 * Converts string to the regexp
 * TODO think about nested dependencies, but be careful with dependency loops
 * @param {RawStrPattern} [input=''] literal string or regexp pattern; defaults to '' (empty string)
 * @returns {RegExp} regular expression; defaults to /.?/
 * @throws {SyntaxError} Throw an error for invalid regex pattern
 */
export const toRegExp = (input = '') => {
    const DEFAULT_VALUE = '.?';
    const FORWARD_SLASH = '/';
    if (input === '') {
        return new RegExp(DEFAULT_VALUE);
    }
    if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
        return new RegExp(input.slice(1, -1));
    }
    const escaped = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escaped);
};

/**
 * Checks whether the input string can be converted to regexp
 * @param {RawStrPattern} input literal string or regexp pattern
 * @returns {boolean}
 */
export const isValidStrPattern = (input) => {
    const FORWARD_SLASH = '/';
    let str = escapeRegExp(input);
    if (input[0] === FORWARD_SLASH && input[input.length - 1] === FORWARD_SLASH) {
        str = input.slice(1, -1);
    }

    let isValid;
    try {
        isValid = new RegExp(str);
        isValid = true;
    } catch (e) {
        isValid = false;
    }
    return isValid;
};

/**
 * Get string before regexp first match
 * @param {string} str
 * @param {RegExp} rx
 */
export const getBeforeRegExp = (str, rx) => {
    const index = str.search(rx);
    return str.substring(0, index);
};

/**
 * Checks whether the string starts with the substring
 * @param {string} str full string
 * @param {string} prefix substring
 * @returns {boolean}
 */
export const startsWith = (str, prefix) => {
    // if str === '', (str && false) will return ''
    // that's why it has to be !!str
    return !!str && str.indexOf(prefix) === 0;
};

/**
 * Checks whether the string ends with the substring
 * @param {string} str full string
 * @param {string} ending substring
 * @returns {boolean}
 */
export const endsWith = (str, ending) => {
    // if str === '', (str && false) will return ''
    // that's why it has to be !!str
    return !!str && str.indexOf(ending) === str.length - ending.length;
};

export const substringAfter = (str, separator) => {
    if (!str) {
        return str;
    }
    const index = str.indexOf(separator);
    return index < 0 ? '' : str.substring(index + separator.length);
};

export const substringBefore = (str, separator) => {
    if (!str || !separator) {
        return str;
    }
    const index = str.indexOf(separator);
    return index < 0 ? str : str.substring(0, index);
};

/**
 * Wrap str in single quotes and replaces single quotes to double one
 * @param {string} str
 */
export const wrapInSingleQuotes = (str) => {
    if ((str[0] === '\'' && str[str.length - 1] === '\'')
        || (str[0] === '"' && str[str.length - 1] === '"')) {
        str = str.substring(1, str.length - 1);
    }
    // eslint-disable-next-line no-useless-escape
    str = str.replace(/\'/g, '"');

    return `'${str}'`;
};

/**
 * Returns substring enclosed in the widest braces
 * @param {string} str
 */
export const getStringInBraces = (str) => {
    const firstIndex = str.indexOf('(');
    const lastIndex = str.lastIndexOf(')');
    return str.substring(firstIndex + 1, lastIndex);
};

/**
 * Prepares RTCPeerConnection config as string for proper logging
 * @param {*} config
 * @returns {string} stringified config
*/
export const convertRtcConfigToString = (config) => {
    const UNDEF_STR = 'undefined';
    let str = UNDEF_STR;

    if (config === null) {
        str = 'null';
    } else if (config instanceof Object) {
        const SERVERS_PROP_NAME = 'iceServers';
        const URLS_PROP_NAME = 'urls';
        /*
            const exampleConfig = {
                'iceServers': [
                    'urls': ['stun:35.66.206.188:443'],
                ],
            };
        */
        if (Object.prototype.hasOwnProperty.call(config, SERVERS_PROP_NAME)
            && Object.prototype.hasOwnProperty.call(config[SERVERS_PROP_NAME][0], URLS_PROP_NAME)
            && !!(config[SERVERS_PROP_NAME][0][URLS_PROP_NAME])) {
            str = config[SERVERS_PROP_NAME][0][URLS_PROP_NAME].toString();
        }
    }
    return str;
};

/**
 * Checks whether the match input string can be converted to regexp,
 * used for match inputs with possible negation
 * @param {string} match literal string or regexp pattern
 * @returns {boolean}
 */
export const isValidMatchStr = (match) => {
    const INVERT_MARKER = '!';
    let str = match;
    if (startsWith(match, INVERT_MARKER)) {
        str = match.slice(1);
    }
    return isValidStrPattern(str);
};

/**
 * Validates the match input number,
 * used for match inputs with possible negation
 * @param {string} match string of match number
 * @returns {boolean}
 */
export const isValidMatchNumber = (match) => {
    const INVERT_MARKER = '!';
    let str = match;
    if (startsWith(match, INVERT_MARKER)) {
        str = match.slice(1);
    }
    const num = parseFloat(str);
    return !nativeIsNaN(num) && nativeIsFinite(num);
};

/**
 * @typedef {Object} MatchData
 * @property {boolean} isInvertedMatch
 * @property {RegExp} matchRegexp
 */

/**
 * Parses match arg with possible negation for no matching.
 * Needed for prevent-setTimeout, prevent-setInterval,
 * prevent-requestAnimationFrame and prevent-window-open
 * @param {string} match
 * @returns {MatchData}
 */
export const parseMatchArg = (match) => {
    const INVERT_MARKER = '!';
    const isInvertedMatch = startsWith(match, INVERT_MARKER);
    const matchValue = isInvertedMatch ? match.slice(1) : match;
    const matchRegexp = toRegExp(matchValue);
    return { isInvertedMatch, matchRegexp };
};

/**
 * @typedef {Object} DelayData
 * @property {boolean} isInvertedDelayMatch
 * @property {number|null} delayMatch
 */

/**
 * Parses delay arg with possible negation for no matching.
 * Needed for prevent-setTimeout and prevent-setInterval
 * @param {string} delay
 * @returns {DelayData} `{ isInvertedDelayMatch, delayMatch }` where:
 * `isInvertedDelayMatch` is boolean,
 * `delayMatch` is number OR null for invalid `delay`
 */
export const parseDelayArg = (delay) => {
    const INVERT_MARKER = '!';
    const isInvertedDelayMatch = startsWith(delay, INVERT_MARKER);
    let delayValue = isInvertedDelayMatch ? delay.slice(1) : delay;
    delayValue = parseInt(delayValue, 10);
    const delayMatch = nativeIsNaN(delayValue) ? null : delayValue;
    return { isInvertedDelayMatch, delayMatch };
};

/**
 * Converts object to string for logging
 * @param {Object} obj data object
 * @returns {string}
 */
export const objectToString = (obj) => {
    return isEmptyObject(obj)
        ? '{}'
        : getObjectEntries(obj)
            .map((pair) => {
                const key = pair[0];
                const value = pair[1];
                let recordValueStr = value;
                if (value instanceof Object) {
                    recordValueStr = `{ ${objectToString(value)} }`;
                }
                return `${key}:"${recordValueStr}"`;
            })
            .join(' ');
};

/**
 * Converts types into a string
 * @param {*} value
 * @returns {string}
 */
export const convertTypeToString = (value) => {
    let output;
    if (typeof value === 'undefined') {
        output = 'undefined';
    } else if (typeof value === 'object') {
        if (value === null) {
            output = 'null';
        } else {
            output = objectToString(value);
        }
    } else {
        output = value.toString();
    }

    return output;
};
