import { isEmptyObject } from './object-utils';
import {
    nativeIsFinite,
    nativeIsNaN,
    getNumberFromString,
    getRandomIntInclusive,
} from './number-utils';

/**
 * A literal string or regexp pattern wrapped in forward slashes.
 * For example, 'simpleStr' or '/adblock|_0x/'.
 */
type RawStrPattern = string;

type MatchData = {
    isInvertedMatch: boolean;
    matchRegexp: RegExp;
    matchValue: string;
};

type DelayData = {
    isInvertedDelayMatch: boolean;
    delayMatch: number | null;
};

/**
 * String.prototype.replaceAll polyfill
 *
 * @param input input string
 * @param substr to look for
 * @param newSubstr replacement
 * @returns result string
 */
export const replaceAll = (
    input: string,
    substr: string,
    newSubstr: string,
): string => input.split(substr).join(newSubstr);

/**
 * Escapes special chars in string
 *
 * @param str raw string
 * @returns string with escaped special characters
 */
export const escapeRegExp = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Converts string to the regexp,
 * if string contains valid regexp flags it will be converted to regexp with flags
 * TODO think about nested dependencies, but be careful with dependency loops
 *
 * @param input literal string or regexp pattern; defaults to '' (empty string)
 * @returns regular expression; defaults to /.?/
 */
export const toRegExp = (input: RawStrPattern = ''): RegExp => {
    const DEFAULT_VALUE = '.?';
    const FORWARD_SLASH = '/';
    if (input === '') {
        return new RegExp(DEFAULT_VALUE);
    }

    const delimiterIndex = input.lastIndexOf(FORWARD_SLASH);
    const flagsPart = input.substring(delimiterIndex + 1);
    const regExpPart = input.substring(0, delimiterIndex + 1);

    /**
     * Checks whether the string is a valid regexp flag
     *
     * @param flag string
     * @returns True if regexp flag is valid, otherwise false.
     */
    const isValidRegExpFlag = (flag: string): boolean => {
        if (!flag) {
            return false;
        }
        try {
            // eslint-disable-next-line no-new
            new RegExp('', flag);
            return true;
        } catch (ex) {
            return false;
        }
    };

    /**
     * Checks whether the text string contains valid regexp flags,
     * and returns `flagsStr` if valid, otherwise empty string.
     *
     * @param regExpStr string
     * @param flagsStr string
     * @returns `flagsStr` if it is valid, otherwise empty string.
     */
    const getRegExpFlags = (regExpStr: string, flagsStr: string): string => {
        if (
            regExpStr.startsWith(FORWARD_SLASH)
            && regExpStr.endsWith(FORWARD_SLASH)
            // Not a correct regex if ends with '\\/'
            && !regExpStr.endsWith('\\/')
            && isValidRegExpFlag(flagsStr)
        ) {
            return flagsStr;
        }
        return '';
    };

    const flags = getRegExpFlags(regExpPart, flagsPart);

    if ((input.startsWith(FORWARD_SLASH) && input.endsWith(FORWARD_SLASH)) || flags) {
        const regExpInput = flags ? regExpPart : input;
        return new RegExp(regExpInput.slice(1, -1), flags);
    }

    const escaped = input
        // remove quotes' escapes for cases where scriptlet rule argument has own escaped quotes
        // e.g #%#//scriptlet('prevent-setTimeout', '.css(\'display\',\'block\');')
        .replace(/\\'/g, '\'')
        .replace(/\\"/g, '"')
        // escape special characters for following RegExp construction
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escaped);
};

/**
 * Checks whether the input string can be converted to regexp
 *
 * @param input literal string or regexp pattern
 * @returns if input can be converted to regexp
 */
export const isValidStrPattern = (input: RawStrPattern): boolean => {
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
 *
 * @param str input string
 * @param rx find pattern
 * @returns result string
 */
export const getBeforeRegExp = (str: string, rx: RegExp) => {
    const index = str.search(rx);
    return str.substring(0, index);
};

export const substringAfter = (str: string, separator: string): string => {
    if (!str) {
        return str;
    }
    const index = str.indexOf(separator);
    return index < 0 ? '' : str.substring(index + separator.length);
};

export const substringBefore = (str: string, separator: string): string => {
    if (!str || !separator) {
        return str;
    }
    const index = str.indexOf(separator);
    return index < 0 ? str : str.substring(0, index);
};

/**
 * Wrap str in single quotes and replaces single quotes to double one
 *
 * @param str input string
 * @returns string with swapped quotes
 */
export const wrapInSingleQuotes = (str: string): string => {
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
 *
 * @param str input string
 * @returns substring
 */
export const getStringInBraces = (str: string): string => {
    const firstIndex = str.indexOf('(');
    const lastIndex = str.lastIndexOf(')');
    return str.substring(firstIndex + 1, lastIndex);
};

/**
 * Prepares RTCPeerConnection config as string for proper logging
 *
 * @param config RTC config
 * @returns stringified config
 */
export const convertRtcConfigToString = (config: RTCConfiguration): string => {
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
            && config[SERVERS_PROP_NAME]
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
 *
 * @param match literal string or regexp pattern
 * @returns true if input can be converted to regexp
 */
export const isValidMatchStr = (match: string): boolean => {
    const INVERT_MARKER = '!';
    let str = match;
    if (match?.startsWith(INVERT_MARKER)) {
        str = match.slice(1);
    }
    return isValidStrPattern(str);
};

/**
 * Validates the match input number,
 * used for match inputs with possible negation
 *
 * @param match string of match number
 * @returns if match number is valid
 */
export const isValidMatchNumber = (match: RawStrPattern): boolean => {
    const INVERT_MARKER = '!';
    let str = match;
    if (match?.startsWith(INVERT_MARKER)) {
        str = match.slice(1);
    }
    const num = parseFloat(str);
    return !nativeIsNaN(num) && nativeIsFinite(num);
};

/**
 * Parses match arg with possible negation for no matching.
 * Needed for prevent-setTimeout, prevent-setInterval,
 * prevent-requestAnimationFrame and prevent-window-open
 *
 * @param match matching arg
 * @returns data prepared for matching
 */
export const parseMatchArg = (match: string): MatchData => {
    const INVERT_MARKER = '!';
    // In case if "match" is "undefined" return "false"
    const isInvertedMatch = match ? match?.startsWith(INVERT_MARKER) : false;
    const matchValue = isInvertedMatch ? match.slice(1) : match;
    const matchRegexp = toRegExp(matchValue);
    return { isInvertedMatch, matchRegexp, matchValue };
};

/**
 * Parses delay arg with possible negation for no matching.
 * Needed for prevent-setTimeout and prevent-setInterval
 *
 * @param delay scriptlet's delay arg
 * @returns parsed delay data
 */
export const parseDelayArg = (delay: string): DelayData => {
    const INVERT_MARKER = '!';
    const isInvertedDelayMatch = delay?.startsWith(INVERT_MARKER);
    const delayValue = isInvertedDelayMatch ? delay.slice(1) : delay;
    const parsedDelay = parseInt(delayValue, 10);
    const delayMatch = nativeIsNaN(parsedDelay) ? null : parsedDelay;
    return { isInvertedDelayMatch, delayMatch };
};

/**
 * Converts object to string for logging
 *
 * @param obj data object
 * @returns object's string representation
 */
export const objectToString = (obj: ArbitraryObject): string => {
    // In case if the type of passed obj is different than Object
    // https://github.com/AdguardTeam/Scriptlets/issues/282
    if (!obj || typeof obj !== 'object') {
        return String(obj);
    }

    return isEmptyObject(obj)
        ? '{}'
        : Object.entries(obj)
            .map((pair) => {
                const key = pair[0];
                const value = pair[1];
                let recordValueStr = value;
                if (value instanceof Object) {
                    recordValueStr = `{ ${objectToString(value as ArbitraryObject)} }`;
                }
                return `${key}:"${recordValueStr}"`;
            })
            .join(' ');
};

/**
 * Converts types into a string
 *
 * @param value input value type
 * @returns type's string representation
 */
export const convertTypeToString = (value: unknown): string => {
    let output;
    if (typeof value === 'undefined') {
        output = 'undefined';
    } else if (typeof value === 'object') {
        if (value === null) {
            output = 'null';
        } else {
            output = objectToString(value as Record<string, unknown>);
        }
    } else {
        output = value.toString();
    }

    return output;
};

/**
 * Generate a random string, a length of the string is provided as an argument
 *
 * @param length output's length
 * @returns random string
 */
export function getRandomStrByLength(length: number): string {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+=~';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i += 1) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

/**
 * Generate a random string
 *
 * @param customResponseText response text to include in output
 * @returns random string or null if passed argument is invalid
 */
export function generateRandomResponse(customResponseText: string): string | null {
    let customResponse = customResponseText;

    if (customResponse === 'true') {
        // Generate random alphanumeric string of 10 symbols
        customResponse = Math.random().toString(36).slice(-10);
        return customResponse;
    }

    customResponse = customResponse.replace('length:', '');
    const rangeRegex = /^\d+-\d+$/;
    // Return empty string if range is invalid
    if (!rangeRegex.test(customResponse)) {
        return null;
    }

    let rangeMin = getNumberFromString(customResponse.split('-')[0]);
    let rangeMax = getNumberFromString(customResponse.split('-')[1]);

    if (!nativeIsFinite(rangeMin) || !nativeIsFinite(rangeMax)) {
        return null;
    }

    // If rangeMin > rangeMax, swap variables
    if ((rangeMin) > (rangeMax)) {
        const temp = rangeMin;
        rangeMin = rangeMax;
        rangeMax = temp;
    }

    const LENGTH_RANGE_LIMIT = 500 * 1000;
    if ((rangeMax as number) > LENGTH_RANGE_LIMIT) {
        return null;
    }

    const length = getRandomIntInclusive((rangeMin as number), (rangeMax as number));
    customResponse = getRandomStrByLength(length);
    return customResponse;
}

/**
 * Infers value from string argument
 * Inferring goes from more specific to more ambiguous options
 * Arrays, objects and strings are parsed via JSON.parse
 *
 * @param value arbitrary string
 * @returns converted value
 * @throws an error on unexpected input
 */
export function inferValue(value: string): unknown {
    if (value === 'undefined') {
        return undefined;
    } if (value === 'false') {
        return false;
    } if (value === 'true') {
        return true;
    } if (value === 'null') {
        return null;
    } if (value === 'NaN') {
        return NaN;
    }

    // Number class constructor works 2 times faster than JSON.parse
    // and wont interpret mixed inputs like '123asd' as parseFloat would
    const MAX_ALLOWED_NUM = 32767;
    const numVal = Number(value);
    if (!nativeIsNaN(numVal)) {
        if (Math.abs(numVal) > MAX_ALLOWED_NUM) {
            throw new Error('number values bigger than 32767 are not allowed');
        }
        return numVal;
    }

    let errorMessage = `'${value}' value type can't be inferred`;
    try {
        // Parse strings, arrays and objects represented as JSON strings
        // '[1,2,3,"string"]' > [1, 2, 3, 'string']
        // '"arbitrary string"' > 'arbitrary string'
        const parsableVal = JSON.parse(value);
        if (parsableVal instanceof Object || typeof parsableVal === 'string') {
            return parsableVal;
        }
    } catch (e) {
        errorMessage += `: ${e}`;
    }

    throw new TypeError(errorMessage);
}
