import {
    logMessage,
    getFetchData,
    objectToString,
    matchRequestProps,
    jsonSetter,
    getPrunePath,
    forgeResponse,
    type FetchResource,
    isPruningNeeded,
    matchStackTrace,
    toRegExp,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
    getRequestData,
    getRequestProps,
    parseMatchProps,
    isValidParsedData,
    getMatchPropsData,
    getWildcardPropertyInChain,
    shouldAbortInlineOrInjectedScript,
    getNativeRegexpTest,
    backupRegExpValues,
    restoreRegExpValues,
    isKeyInObject,
    noopArray,
    noopObject,
    noopCallbackFunc,
    noopFunc,
    trueFunc,
    falseFunc,
    throwFunc,
    noopPromiseReject,
    noopPromiseResolve,
    nativeIsNaN,
    extractRegexAndReplacement,
    getJsonSetValue,
    hit,
    parseJsonSetArgumentValue,
} from '../helpers';
import { type Source } from './scriptlets';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-json-set-fetch-response
 *
 * @description
 * Sets a property at the given path in the JSON response of a fetch call.
 * If the path does not exist, it is created together with any missing intermediate objects.
 *
 * ### Syntax
 *
 * <!-- markdownlint-disable line-length -->
 *
 * ```text
 * example.org#%#//scriptlet('trusted-json-set-fetch-response', propsPath, argumentValue[, requiredInitialProps[, propsToMatch[, stack[, verbose]]]])
 * ```
 *
 * <!-- markdownlint-enable line-length -->
 *
 * - `propsPath` — required, dot-separated path to the property to set.
 *   Supports wildcards `*` and `[]`, and value filtering with `.[=].value`.
 * - `argumentValue` — required, value to write at the target path.
 *   Supports the same constants, `json:{...}`, and `replace:/regex/replacement/` syntax
 *   as `trusted-json-set`.
 * - `requiredInitialProps` — optional, space-separated list of property paths
 *   which must all be present for the modification to occur.
 * - `propsToMatch` — optional, string of space-separated properties to match.
 *   Possible props:
 *     - string or regular expression for matching the URL passed to fetch call;
 *     - colon-separated pairs `name:value` for matching fetch init options.
 * - `stack` — optional, string or regular expression that must match the current function call stack trace.
 * - `verbose` — optional, if set to `true`, the scriptlet will log the original and modified JSON content.
 *
 * > Scriptlet does nothing if response body cannot be converted to JSON.
 *
 * ### Examples
 *
 * 1. Sets `ads.enabled` to `false` in the JSON response of any fetch call
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set-fetch-response', 'ads.enabled', 'false')
 *     ```
 *
 * 1. Creates `config.flags.blocked` path in matching fetch responses
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set-fetch-response', 'config.flags.blocked', 'true', '', 'api/config')
 *     ```
 *
 * 1. Merges a parsed JSON object into an existing response object property
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set-fetch-response', 'foo', 'json:{"a":{"test":1},"b":{"c":1}}')
 *     ```
 *
 * 1. Replaces a value in the JSON response using a regular expression
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-json-set-fetch-response', 'foo', 'replace:/advertisement/article/')
 *     ```
 *
 * @added unknown.
 */
/* eslint-enable max-len */
export function trustedJsonSetFetchResponse(
    source: Source,
    propsPath: string,
    argumentValue: any,
    requiredInitialProps = '',
    propsToMatch = '',
    stack = '',
    verbose = '',
) {
    if (!propsPath || argumentValue === undefined) {
        return;
    }

    if (
        typeof fetch === 'undefined'
        || typeof Proxy === 'undefined'
        || typeof Response === 'undefined'
    ) {
        return;
    }

    const parsedArgumentValue = parseJsonSetArgumentValue(
        source,
        argumentValue,
        window.JSON.parse,
    );
    if (!parsedArgumentValue) {
        return;
    }

    const shouldLogContent = verbose === 'true';

    const parsedSetPaths = getPrunePath(propsPath);
    const setPathObj = parsedSetPaths[0];
    const requiredPaths = getPrunePath(requiredInitialProps);

    const nativeStringify = window.JSON.stringify;
    const nativeRequestClone = window.Request.prototype.clone;
    const nativeResponseClone = window.Response.prototype.clone;
    const nativeFetch = window.fetch;

    const getValueToSet = (currentValue: any): any => getJsonSetValue(currentValue, parsedArgumentValue);

    // TODO: Consider to move it to helper and share it with json-prune-fetch-response scriptlet
    const fetchHandlerWrapper = async (
        target: typeof fetch,
        thisArg: any,
        args: [FetchResource, RequestInit],
    ): Promise<Response> => {
        const fetchData = getFetchData(args, nativeRequestClone);

        if (!matchRequestProps(source, propsToMatch, fetchData)) {
            return Reflect.apply(target, thisArg, args);
        }

        let originalResponse;
        let clonedResponse;
        try {
            // eslint-disable-next-line prefer-spread
            originalResponse = await nativeFetch.apply(null, args);
            clonedResponse = nativeResponseClone.call(originalResponse);
        } catch {
            logMessage(source, `Could not make an original fetch request: ${fetchData.url}`);
            return Reflect.apply(target, thisArg, args);
        }

        let json;
        try {
            json = await originalResponse.json();
            if (shouldLogContent) {
                // eslint-disable-next-line max-len
                logMessage(source, `Original content:\n${window.location.hostname}\n${nativeStringify(json, null, 2)}\nStack trace:\n${new Error().stack || ''}`, true);
                logMessage(source, json, true, false);
            }
        } catch {
            const message = `Response body can't be converted to json: ${objectToString(fetchData)}`;
            logMessage(source, message);
            return clonedResponse;
        }

        const modifiedJson = jsonSetter(
            source,
            json,
            setPathObj?.path || '',
            setPathObj?.value,
            getValueToSet,
            requiredPaths,
            stack,
            {
                nativeStringify,
                nativeRequestClone,
                nativeResponseClone,
                nativeFetch,
            },
        );

        if (shouldLogContent) {
            // eslint-disable-next-line max-len
            logMessage(source, `Modified content:\n${window.location.hostname}\n${nativeStringify(modifiedJson, null, 2)}\nStack trace:\n${new Error().stack || ''}`, true);
            logMessage(source, modifiedJson, true, false);
        }

        return forgeResponse(
            originalResponse,
            nativeStringify(modifiedJson),
        );
    };

    const getWrapper = (target: typeof fetch, propName: string, receiver: any) => {
        if (propName === 'toString') {
            return target.toString.bind(target);
        }
        return Reflect.get(target, propName, receiver);
    };

    const fetchHandler = {
        apply: fetchHandlerWrapper,
        get: getWrapper,
    };

    window.fetch = new Proxy(window.fetch, fetchHandler);
}

export const trustedJsonSetFetchResponseNames = [
    'trusted-json-set-fetch-response',
    // trusted scriptlets support no aliases
];

// eslint-disable-next-line prefer-destructuring
trustedJsonSetFetchResponse.primaryName = trustedJsonSetFetchResponseNames[0];

trustedJsonSetFetchResponse.injections = [
    logMessage,
    getFetchData,
    objectToString,
    matchRequestProps,
    jsonSetter,
    getPrunePath,
    forgeResponse,
    isPruningNeeded,
    matchStackTrace,
    toRegExp,
    isValidStrPattern,
    escapeRegExp,
    isEmptyObject,
    getRequestData,
    getRequestProps,
    parseMatchProps,
    isValidParsedData,
    getMatchPropsData,
    getWildcardPropertyInChain,
    shouldAbortInlineOrInjectedScript,
    getNativeRegexpTest,
    backupRegExpValues,
    restoreRegExpValues,
    isKeyInObject,
    noopArray,
    noopObject,
    noopCallbackFunc,
    noopFunc,
    trueFunc,
    falseFunc,
    throwFunc,
    noopPromiseReject,
    noopPromiseResolve,
    nativeIsNaN,
    extractRegexAndReplacement,
    getJsonSetValue,
    hit,
    parseJsonSetArgumentValue,
];
