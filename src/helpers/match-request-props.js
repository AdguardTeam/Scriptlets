import {
    getMatchPropsData,
    validateParsedData,
    parseMatchProps,
} from './request-utils';
import { logMessage } from './log-message';

/**
 * @typedef { import('../scriptlets/index').Source } Source
 */

/**
 * Checks if given propsToMatch string matches with given request data
 * This is used by prevent-xhr, prevent-fetch, trusted-replace-xhr-response
 * and  trusted-replace-fetch-response scriptlets
 * @param {Source} source
 * @param {string} propsToMatch
 * @param {Object} requestData object with standard properties of fetch/xhr like url, method etc
 * @returns {boolean}
 */
export const matchRequestProps = (source, propsToMatch, requestData) => {
    if (propsToMatch === '' || propsToMatch === '*') {
        return true;
    }

    let isMatched;

    const parsedData = parseMatchProps(propsToMatch);
    if (!validateParsedData(parsedData)) {
        logMessage(source, `Invalid parameter: ${propsToMatch}`);
        isMatched = false;
    } else {
        const matchData = getMatchPropsData(parsedData);
        // prevent only if all props match
        isMatched = Object.keys(matchData)
            .every((matchKey) => {
                const matchValue = matchData[matchKey];
                return Object.prototype.hasOwnProperty.call(requestData, matchKey)
                    && matchValue.test(requestData[matchKey]);
            });
    }

    return isMatched;
};
