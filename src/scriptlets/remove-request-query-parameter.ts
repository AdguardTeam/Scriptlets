import { hit, logMessage, toRegExp } from '../helpers';
import { type Source } from './scriptlets';

/**
 * @scriptlet remove-request-query-parameter
 *
 * @description
 * Removes a specified query parameter from matched outgoing requests.
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('remove-request-query-parameter', parametersToRemove[, urlPattern])
 * ```
 *
 * - `parametersToRemove`: List of query parameter names to be removed from outgoing requests, separated by `,`.
 * - `urlPattern`: A string pattern to match URLs.
 *
 * ### Examples
 *
 * 1. Remove a specific query parameter from all requests:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('remove-request-query-parameter', 'utm_source')
 *     ```
 *
 * 1. Remove a specific query parameter from requests matching a URL pattern:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('remove-request-query-parameter', 'utm_source', '/api')
 *     ```
 *
 * @added unknown.
 */
export function removeRequestQueryParameter(source: Source, parametersToRemove: string, urlPattern: string) {
    if (!parametersToRemove) {
        logMessage(source, 'remove-request-query-parameter: Missing parameters to remove');
        return;
    }

    const splitByNotEscapedDelimiter = (string: string, delimiter: string) => {
        const BACKSLASH = '\\';
        let shouldFixEscaped = true;

        const splitByDelimiter = {
            [Symbol.split](str: string) {
                let stringIndex = 0;
                let currentIPosition = 0;
                const result: string[] = [];
                while (currentIPosition < str.length) {
                    const matchPos = str.indexOf(delimiter, currentIPosition);
                    if (matchPos === -1) {
                        shouldFixEscaped = false;
                        result.push(str);
                        break;
                    }
                    if (matchPos > 0 && str[matchPos - 1] === BACKSLASH) {
                        currentIPosition = matchPos + 1;
                        continue;
                    }
                    result.push(str.substring(stringIndex, matchPos));
                    stringIndex = matchPos + 1;
                    currentIPosition = stringIndex;
                }
                return result;
            },
        };

        const fixEscapedDelimiters = (arr: string[]) => {
            const escapedDelimiterRegex = new RegExp(`\\\\${delimiter}`, 'g');
            return arr.map((item) => item.replace(escapedDelimiterRegex, delimiter));
        };

        const result = string.split(splitByDelimiter);
        return shouldFixEscaped ? fixEscapedDelimiters(result) : result;
    };

    // TODO: add tests
    // console.log(splitByNotEscapedDelimiter("a,b,c\\,c5,d,3e\\,4,f", ','));
    // Expected output: [ 'a', 'b', 'c,c5', 'd', '3e,4', 'f' ]

    // console.log(splitByNotEscapedDelimiter("a,b,c,one\\;two;three\\,four,five", ','));
    // Expected output: [ 'a', 'b', 'c', 'one\\;two;three,four', 'five' ]

    const urlPatternRegExp = urlPattern ? toRegExp(urlPattern) : null;
    const SEPARATOR_MARK = '|';
    const paramsToRemove = splitByNotEscapedDelimiter(parametersToRemove, SEPARATOR_MARK);

    const removeParams = (url: string) => {
        try {
            let modified = false;
            const urlObj = new URL(url, window.location.origin);

            paramsToRemove.forEach((param) => {
                if (urlObj.searchParams.has(param)) {
                    urlObj.searchParams.delete(param);
                    modified = true;
                }
            });

            if (modified) {
                hit(source);
                return urlObj.toString();
            }
        } catch (e) {
            logMessage(source, `remove-request-query-parameter: Invalid URL - ${url}`);
        }
        return url;
    };

    const xhrWrapper = (
        target: XMLHttpRequest['open'],
        thisArg: XMLHttpRequest,
        argumentsList: unknown[],
    ) => {
        const url = argumentsList[1] as string;
        if (!url || typeof url !== 'string') {
            return Reflect.apply(target, thisArg, argumentsList);
        }

        if (urlPatternRegExp && !urlPatternRegExp.test(url)) {
            return Reflect.apply(target, thisArg, argumentsList);
        }

        const newUrl = removeParams(url);
        argumentsList[1] = newUrl;

        return Reflect.apply(target, thisArg, argumentsList);
    };

    const xhrHandler = {
        apply: xhrWrapper,
    };

    window.XMLHttpRequest.prototype.open = new Proxy(
        window.XMLHttpRequest.prototype.open,
        xhrHandler,
    );

    const fetchWrapper = (
        target: typeof window.fetch,
        thisArg: typeof window,
        argumentsList: unknown[],
    ) => {
        const requestUrl = {
            url: '',
            type: '',
        };

        const urlArg = argumentsList[0];
        if (!urlArg) {
            return Reflect.apply(target, thisArg, argumentsList);
        }

        if (typeof urlArg === 'string') {
            requestUrl.url = urlArg;
            requestUrl.type = 'string';
        } else if (urlArg instanceof Request) {
            requestUrl.url = (urlArg as { url: string }).url;
            requestUrl.type = 'object';
        }

        if (!requestUrl.url) {
            return Reflect.apply(target, thisArg, argumentsList);
        }

        if (urlPatternRegExp && !urlPatternRegExp.test(requestUrl.url)) {
            return Reflect.apply(target, thisArg, argumentsList);
        }

        const newUrl = removeParams(requestUrl.url);
        if (requestUrl.type === 'string') {
            argumentsList[0] = newUrl;
        } else if (requestUrl.type === 'object') {
            (argumentsList[0] as { url: string }).url = newUrl;
        }
        return Reflect.apply(target, thisArg, argumentsList);
    };

    const fetchHandler = {
        apply: fetchWrapper,
    };

    window.fetch = new Proxy(
        window.fetch,
        fetchHandler,
    );
}

export const removeRequestQueryParameterNames = [
    'remove-request-query-parameter',
];

// eslint-disable-next-line prefer-destructuring
removeRequestQueryParameter.primaryName = removeRequestQueryParameterNames[0];

removeRequestQueryParameter.injections = [
    hit,
    logMessage,
    toRegExp,
];
