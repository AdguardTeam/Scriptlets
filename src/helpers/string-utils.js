/**
 * Escapes special chars in string
 * @param {string} str
 * @returns {string}
 */
export const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Converts search string to the regexp
 * TODO think about nested dependencies, but be careful with dependency loops
 * @param {string} str search string
 * @returns {RegExp}
 */
export const toRegExp = (str) => {
    if (!str || str === '') {
        const DEFAULT_VALUE = '.?';
        return new RegExp(DEFAULT_VALUE);
    }
    if (str[0] === '/' && str[str.length - 1] === '/') {
        return new RegExp(str.slice(1, -1));
    }
    const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escaped);
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
 * Wrap str in single qoutes and replaces single quotes to doudle one
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
