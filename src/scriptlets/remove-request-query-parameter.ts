import {
    hit,
    logMessage,
    splitByNotEscapedDelimiter,
    toRegExp,
} from '../helpers';
import { type Source } from './scriptlets';

/**
 * @scriptlet remove-request-query-parameter
 *
 * @description
 * Removes a specified query parameter from matched outgoing requests.
 *
 * Related ABP source:
 * https://gitlab.com/eyeo/anti-cv/snippets/-/blob/92f9b84bd0d34dbd0e3c1bfe3ff2062863c7714a/source/behavioral/strip-fetch-query-parameter.js
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('remove-request-query-parameter', parametersToRemove[, urlPattern])
 * ```
 *
 * - `parametersToRemove` — required, either a single regular expression (starting with `/`)
 *   or a list of literal query parameter names separated by `,`.
 *   Mixing regular expressions and literal strings is not allowed.
 * - `urlPattern` — optional, a string or regular expression to match request URLs.
 *
 * ### Examples
 *
 * 1. Remove a specific query parameter from all requests:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('remove-request-query-parameter', 'utm_source')
 *     ```
 *
 * 1. Remove multiple query parameters from all requests:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('remove-request-query-parameter', 'utm_source,utm_medium,utm_campaign')
 *     ```
 *
 * 1. Remove a specific query parameter from requests matching a URL pattern:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('remove-request-query-parameter', 'ad_config_id', '/playback/')
 *     ```
 *
 * 1. Remove query parameters matching a regular expression:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('remove-request-query-parameter', '/^utm_/', '/api/')
 *     ```
 *
 * @added unknown.
 */
export function removeRequestQueryParameter(source: Source, parametersToRemove: string, urlPattern?: string) {
    if (!parametersToRemove) {
        logMessage(source, 'Missing parameters to remove');
        return;
    }

    let urlPatternRegExp: RegExp | null = null;
    if (urlPattern) {
        try {
            urlPatternRegExp = toRegExp(urlPattern);
        } catch (e) {
            logMessage(source, `Invalid URL pattern: ${urlPattern}`);
            return;
        }
    }

    let regexpParamsToRemove: RegExp[];
    try {
        // If starts with `/`, treat the entire value as a single regex pattern
        if (parametersToRemove.startsWith('/')) {
            regexpParamsToRemove = [toRegExp(parametersToRemove)];
        } else {
            // Comma-separated literal parameter names
            const SEPARATOR_MARK = ',';
            const paramsToRemove = splitByNotEscapedDelimiter(parametersToRemove, SEPARATOR_MARK);
            // Convert each literal string to a RegExp (toRegExp escapes special chars for non-regex strings)
            regexpParamsToRemove = paramsToRemove.map((param) => toRegExp(param));
        }
    } catch (e) {
        logMessage(source, `Invalid parameter pattern: ${parametersToRemove}`);
        return;
    }

    /**
     * Removes query parameters from the URL.
     *
     * @param url URL to remove query parameters from.
     *
     * @returns Modified URL.
     */
    const removeParams = (url: string): string => {
        try {
            let modified = false;
            const urlObj = new URL(url, window.location.origin);

            // Get all parameter names to check against regexps
            const paramNames = Array.from(urlObj.searchParams.keys());

            paramNames.forEach((paramName) => {
                // Check if any of the param patterns match this parameter name
                // Reset lastIndex before each test to avoid stateful issues with `g` or `y` flags
                const shouldRemove = regexpParamsToRemove.some((regex) => {
                    regex.lastIndex = 0;
                    return regex.test(paramName);
                });
                if (shouldRemove) {
                    urlObj.searchParams.delete(paramName);
                    modified = true;
                }
            });

            if (modified) {
                hit(source);
                return urlObj.toString();
            }
        } catch (e) {
            logMessage(source, `Cannot remove query parameters from URL: ${url}`);
        }
        return url;
    };

    const xhrWrapper = (
        target: XMLHttpRequest['open'],
        thisArg: XMLHttpRequest,
        argumentsList: unknown[],
    ) => {
        const urlArg = argumentsList[1];
        if (!urlArg) {
            return Reflect.apply(target, thisArg, argumentsList);
        }

        let url: string;
        if (typeof urlArg === 'string') {
            url = urlArg;
        } else if (urlArg instanceof URL) {
            url = urlArg.toString();
        } else {
            return Reflect.apply(target, thisArg, argumentsList);
        }

        if (urlPatternRegExp && !urlPatternRegExp.test(url)) {
            return Reflect.apply(target, thisArg, argumentsList);
        }

        const newUrl = removeParams(url);
        argumentsList[1] = newUrl;

        return Reflect.apply(target, thisArg, argumentsList);
    };

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
        } else if (urlArg instanceof URL) {
            requestUrl.url = urlArg.toString();
            requestUrl.type = 'string';
        } else if (urlArg instanceof Request) {
            requestUrl.url = urlArg.url;
            requestUrl.type = 'request';
        }

        if (!requestUrl.url) {
            return Reflect.apply(target, thisArg, argumentsList);
        }

        if (urlPatternRegExp && !urlPatternRegExp.test(requestUrl.url)) {
            return Reflect.apply(target, thisArg, argumentsList);
        }

        const newUrl = removeParams(requestUrl.url);
        if (newUrl === requestUrl.url) {
            // No modification was made
            return Reflect.apply(target, thisArg, argumentsList);
        }
        if (requestUrl.type === 'string') {
            argumentsList[0] = newUrl;
        } else if (requestUrl.type === 'request') {
            // Request.url is read-only, so we need to create a new Request with the modified URL
            const originalRequest = argumentsList[0] as Request;
            argumentsList[0] = new Request(newUrl, originalRequest);
        }
        return Reflect.apply(target, thisArg, argumentsList);
    };

    const xhrHandler = {
        apply: xhrWrapper,
    };

    const fetchHandler = {
        apply: fetchWrapper,
    };

    window.XMLHttpRequest.prototype.open = new Proxy(
        window.XMLHttpRequest.prototype.open,
        xhrHandler,
    );

    window.fetch = new Proxy(
        window.fetch,
        fetchHandler,
    );
}

export const removeRequestQueryParameterNames = [
    'remove-request-query-parameter',
    'abp-strip-fetch-query-parameter',
];

// eslint-disable-next-line prefer-destructuring
removeRequestQueryParameter.primaryName = removeRequestQueryParameterNames[0];

removeRequestQueryParameter.injections = [
    hit,
    logMessage,
    splitByNotEscapedDelimiter,
    toRegExp,
];
