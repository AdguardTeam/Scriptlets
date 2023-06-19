import {
    getMatchPropsData,
    isValidParsedData,
    parseMatchProps,
} from './request-utils';
import type { LegalRequestProp, MatchPropsData } from './request-utils';
import { logMessage } from './log-message';

/**
 * Checks if given propsToMatch string matches with given request data
 * This is used by prevent-xhr, prevent-fetch, trusted-replace-xhr-response
 * and  trusted-replace-fetch-response scriptlets
 *
 * @param source scriptlet properties
 * @param propsToMatch string of space-separated request properties to match
 * @param requestData object with standard properties of fetch/xhr like url, method etc
 * @returns if request properties match
 */
export const matchRequestProps = (
    source: Source,
    propsToMatch: string,
    requestData: MatchPropsData,
): boolean => {
    if (propsToMatch === '' || propsToMatch === '*') {
        return true;
    }

    let isMatched: boolean;

    const parsedData = parseMatchProps(propsToMatch);
    if (!isValidParsedData(parsedData)) {
        logMessage(source, `Invalid parameter: ${propsToMatch}`);
        isMatched = false;
    } else {
        const matchData = getMatchPropsData(parsedData);
        const matchKeys = Object.keys(matchData) as LegalRequestProp[];
        // prevent only if all props match
        isMatched = matchKeys.every((matchKey) => {
            const matchValue = matchData[matchKey];
            const dataValue = requestData[matchKey];
            return Object.prototype.hasOwnProperty.call(requestData, matchKey)
                    && typeof dataValue === 'string'
                    && matchValue?.test(dataValue);
        });
    }

    return isMatched;
};
