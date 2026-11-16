import { hit } from './hit';
import { logMessage } from './log-message';
import { matchRequestProps } from './match-request-props';
import { getFetchData } from './request-utils';
import { forgeResponse } from './response-utils';
import { objectToString } from './string-utils';
import { getFunctionProxyProperty } from './object-utils';
import { getRegexpTester } from './regexp-utils';
import { getThrownValueMessage } from './get-error-message';
import { parseUboPropsToMatch, matchUboProps, collateUboFetchArguments } from './ubo-request-utils';
import {
    getAdgResponseTextReplacement,
    getUboResponseTextReplacement,
    replaceResponseText,
    type ResponseTextReplacement,
} from './response-text-utils';
import { type Source } from '../scriptlets';

/**
 * Settings of `replaceFetchResponses()`, which are parsed from the arguments of `trusted-replace-fetch-response`
 * once, by `getAdgFetchResponseReplacement()` or `getUboFetchResponseReplacement()`.
 * `pattern` is `null` to only log the calls of `fetch()`.
 */
export interface FetchResponseReplacement extends ResponseTextReplacement {
    /**
     * Checks whether the response of the `fetch()` call is replaced, by its arguments.
     */
    isRequestMatched: (args: unknown[]) => boolean;
}

/**
 * Parses the arguments of AdGuard `trusted-replace-fetch-response`, as before the options have been added:
 * - `pattern` — `*` for the whole text, a string, or a regular expression, see `toRegExp()`;
 *   an empty one with an empty `replacement` only logs the calls of `fetch()`;
 * - `replacement` — text to replace with;
 * - `propsToMatch` — properties of the request, see `matchRequestProps()`;
 * - `verbose` — `true` logs the original and the modified text.
 *
 * Extra arguments may be the option `includes`, followed by a string or a regular expression, see `toRegExp()`,
 * which the text of the response has to match, e.g. `'includes', 'adPlacements'`.
 *
 * Requires `getAdgResponseTextReplacement`, `logMessage`, `toRegExp`, `parseUboOptions`, `matchRequestProps`
 * and `getFetchData`, with their dependencies, in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param pattern Text to replace, or a regular expression to match it.
 * @param replacement Text to replace with.
 * @param propsToMatch Properties of the request to match.
 * @param verbose `true` to log the content.
 * @param args Options which follow `verbose`, e.g. `['includes', 'ads']`.
 *
 * @returns Settings of the replacement, or `null` if an argument is invalid, which is logged.
 */
export const getAdgFetchResponseReplacement = (
    source: Source,
    pattern: string,
    replacement: string,
    propsToMatch: string,
    verbose: unknown,
    args: unknown[],
): FetchResponseReplacement | null => {
    const textReplacement = getAdgResponseTextReplacement(source, pattern, replacement, verbose, args);
    if (textReplacement === null) {
        return null;
    }

    const nativeRequestClone = Request.prototype.clone;

    return {
        // Object spread is not used, as its helper of Babel is not available in the scriptlet runtime
        pattern: textReplacement.pattern,
        replacement: textReplacement.replacement,
        includes: textReplacement.includes,
        shouldLogContent: textReplacement.shouldLogContent,
        isUnchangedReturned: textReplacement.isUnchangedReturned,
        isRequestMatched: (fetchArgs: unknown[]): boolean => matchRequestProps(
            source,
            propsToMatch,
            getFetchData(fetchArgs as Parameters<typeof getFetchData>[0], nativeRequestClone),
        ),
    };
};

/**
 * Parses the arguments of uBO `trusted-replace-fetch-response.js`, converted to AdGuard syntax,
 * as uBO `replaceFetchResponseFn()` does:
 * - `pattern` — a string, matched literally once, or a regular expression with its own flags,
 *   see `uboPatternToRegExp()`; `*` is matched as the text `.*`, as uBO escapes the `.*` it is replaced with,
 *   and an empty pattern replaces no response;
 * - `replacement` — text to replace with;
 * - `propsToMatch` — properties of the request, see `parseUboPropsToMatch()`, a pattern without a name is
 *   matched against the URL;
 * - named options follow `propsToMatch`: `includes, value` is a string or a regular expression which the text
 *   of the response has to match.
 *
 * Unlike uBO, which matches any text by an invalid regular expression of `pattern` or `includes`,
 * the rule with such one is not applied, which is logged.
 *
 * Requires `getUboResponseTextReplacement`, `logMessage`, `parseUboOptions`, `uboPatternToRegExp`,
 * `parseUboPropsToMatch`, `matchUboProps`, `collateUboFetchArguments`, `getRegexpTester`
 * and `getNativeRegexpTest` in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param pattern Text to replace, or a regular expression to match it.
 * @param replacement Text to replace with.
 * @param propsToMatch Properties of the request to match.
 * @param args Named options which follow `propsToMatch`, e.g. `['includes', 'ads']`.
 *
 * @returns Settings of the replacement, or `null` if the rule is not applied, e.g. with an invalid argument,
 * which is logged.
 */
export const getUboFetchResponseReplacement = (
    source: Source,
    pattern: string,
    replacement: string,
    propsToMatch: string,
    args: unknown[],
): FetchResponseReplacement | null => {
    // !IMPORTANT: Do not move constants outside of this function
    const IMPLICIT_PROP = 'url';

    // As in uBO, a rule without a pattern does nothing
    const textReplacement = getUboResponseTextReplacement(source, pattern, replacement, args, false);
    if (textReplacement === null) {
        return null;
    }

    const needles = parseUboPropsToMatch(propsToMatch, IMPLICIT_PROP);
    if (needles === null) {
        logMessage(source, `Invalid regular expression of propsToMatch: ${propsToMatch}`);
        return null;
    }

    const nativeRequestClone = Request.prototype.clone;
    const testRegexp = getRegexpTester();

    return {
        // Object spread is not used, as its helper of Babel is not available in the scriptlet runtime
        pattern: textReplacement.pattern,
        replacement: textReplacement.replacement,
        includes: textReplacement.includes,
        shouldLogContent: textReplacement.shouldLogContent,
        isUnchangedReturned: textReplacement.isUnchangedReturned,
        isRequestMatched: (fetchArgs: unknown[]): boolean => matchUboProps(
            needles,
            collateUboFetchArguments(fetchArgs[0], fetchArgs[1], nativeRequestClone),
            testRegexp,
        ),
    };
};

/**
 * Replaces the text of the responses of `fetch()` by the settings parsed by `getAdgFetchResponseReplacement()`
 * or `getUboFetchResponseReplacement()`.
 * `fetch()` is called once, so its rejection is passed to the page as is, and the request is not sent again.
 * An error of reading or replacing the text of its response is logged, and the original response is returned.
 *
 * An error of matching the request, e.g. thrown by a getter of its options, is logged, and the call is passed
 * through, as native `fetch()` does not throw.
 *
 * Requires `hit`, `logMessage`, `getFetchData`, `objectToString`, `forgeResponse`, `getFunctionProxyProperty`,
 * `getThrownValueMessage`, `replaceResponseText`, `getRegexpTester` and `getNativeRegexpTest`,
 * with their dependencies, in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param settings Settings of the replacement.
 */
export const replaceFetchResponses = (source: Source, settings: FetchResponseReplacement): void => {
    const { pattern, isRequestMatched } = settings;

    const nativeRequestClone = Request.prototype.clone;
    const nativeResponseClone = Response.prototype.clone;
    const nativeFetch = window.fetch;
    const testRegexp = getRegexpTester();

    /**
     * Returns the description of the request for logs, which may not be available after it is sent,
     * e.g. of a `Request` with a body.
     *
     * @param args Arguments of `fetch()`.
     * @returns Description of the request.
     */
    const getRequestDescription = (args: unknown[]): string => {
        try {
            return objectToString(getFetchData(args as Parameters<typeof getFetchData>[0], nativeRequestClone));
        } catch {
            return String(args[0]);
        }
    };

    /**
     * Sends the request and replaces the text of its response.
     *
     * @param args Arguments of `fetch()`.
     * @param regexp Regular expression of the text to replace.
     * @returns Response, forged if its text has been replaced.
     */
    const getReplacedResponse = async (args: unknown[], regexp: RegExp): Promise<Response> => {
        // Request is sent once, outside of `try`, so its rejection is passed to the page as is,
        // and it is not sent again, e.g. a POST request
        const response = await Reflect.apply(nativeFetch, null, args) as Response;

        // The response is delivered to the page even if it cannot be read or modified, as the request
        // has succeeded, so its `fetch()` is not rejected. The original response is returned then
        try {
            const text = await nativeResponseClone.call(response).text();
            const modifiedText = replaceResponseText(source, settings, regexp, text, testRegexp);
            if (modifiedText === null) {
                return response;
            }

            const forgedResponse = forgeResponse(response, modifiedText);
            hit(source);
            return forgedResponse;
        } catch {
            logMessage(source, `Response body can't be converted to text: ${getRequestDescription(args)}`);
            return response;
        }
    };

    const handlerWrapper = (target: typeof fetch, thisArg: unknown, args: unknown[]) => {
        let isMatched = false;
        try {
            if (pattern === null) {
                // Calls are only logged
                logMessage(source, `fetch( ${getRequestDescription(args)} )`, true);
                hit(source);
            } else {
                isMatched = isRequestMatched(args);
            }
        } catch (error) {
            // e.g. thrown by a getter of the options of the page, by a `Request` whose body has been used,
            // which cannot be cloned, or by `console.log()` of the page. Native `fetch()` does not throw,
            // so the call is passed through, and its result, e.g. a rejection, is returned to the page.
            // Logging calls `console.log()` of the page, which may throw as well
            try {
                logMessage(source, `Request cannot be matched: ${getThrownValueMessage(error)}`);
            } catch {
                // nothing to do, the error cannot be logged
            }
        }

        // The call which is not replaced is passed through outside of `try`, so its error, if any,
        // is passed to the page as is, and it is not called again
        if (!isMatched || pattern === null) {
            return Reflect.apply(target, thisArg, args);
        }

        return getReplacedResponse(args, pattern);
    };

    window.fetch = new Proxy(window.fetch, {
        apply: handlerWrapper,
        get: getFunctionProxyProperty,
    });
};
