import { hit } from './hit';
import { logMessage } from './log-message';
import { matchRequestProps } from './match-request-props';
import { type XMLHttpRequestSharedRequestData } from './request-utils';
import { objectToString } from './string-utils';
import { getRegexpTester } from './regexp-utils';
import { getThrownValueMessage } from './get-error-message';
import { parseUboPropsToMatch, matchUboProps } from './ubo-request-utils';
import {
    getAdgResponseTextReplacement,
    getUboResponseTextReplacement,
    replaceResponseText,
    type ResponseTextReplacement,
} from './response-text-utils';
import { interceptXhrResponses } from './xhr-response-utils';
import { type Source } from '../scriptlets';

/**
 * Settings of `replaceXhrResponses()`, which are parsed from the arguments of `trusted-replace-xhr-response`
 * once, by `getAdgXhrResponseReplacement()` or `getUboXhrResponseReplacement()`.
 * `pattern` is `null` to only log the requests.
 */
export interface XhrResponseReplacement extends ResponseTextReplacement {
    /**
     * Checks whether the response of the request is replaced, by the arguments of `open()`.
     */
    isRequestMatched: (xhrData: XMLHttpRequestSharedRequestData<any>) => boolean;

    /**
     * Checks whether the response of the request with the `responseType` is replaced,
     * otherwise the request is sent as it is, and its native response is not modified.
     */
    isResponseTypeReplaced: (responseType: XMLHttpRequestResponseType) => boolean;
}

/**
 * Parses the arguments of AdGuard `trusted-replace-xhr-response`, as before the options have been added,
 * see `getAdgResponseTextReplacement()`; `propsToMatch` are properties of the request, see `matchRequestProps()`.
 * An empty pattern with an empty replacement only logs the requests, when they are opened.
 * The text of the response is replaced for any `responseType` except `document`, and converted to it,
 * e.g. parsed as JSON for `json`; a request with `document` is sent as it is.
 *
 * Requires `getAdgResponseTextReplacement`, `hit`, `logMessage`, `toRegExp`, `parseUboOptions`,
 * `matchRequestProps` and `objectToString`, with their dependencies, in the injections of the scriptlet.
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
export const getAdgXhrResponseReplacement = (
    source: Source,
    pattern: string,
    replacement: string,
    propsToMatch: string,
    verbose: unknown,
    args: unknown[],
): XhrResponseReplacement | null => {
    // !IMPORTANT: Do not move constants outside of this function
    const DOCUMENT_RESPONSE_TYPE = 'document';

    const textReplacement = getAdgResponseTextReplacement(source, pattern, replacement, verbose, args);
    if (textReplacement === null) {
        return null;
    }

    // Requests are only logged when they are opened, and not modified
    const isRequestMatched = textReplacement.pattern === null
        ? (xhrData: XMLHttpRequestSharedRequestData<any>): boolean => {
            const description = objectToString(xhrData as unknown as Parameters<typeof objectToString>[0]);
            logMessage(source, `xhr( ${description} )`, true);
            hit(source);
            return false;
        }
        : (xhrData: XMLHttpRequestSharedRequestData<any>): boolean => {
            return matchRequestProps(source, propsToMatch, xhrData);
        };

    return {
        // Object spread is not used, as its helper of Babel is not available in the scriptlet runtime
        pattern: textReplacement.pattern,
        replacement: textReplacement.replacement,
        includes: textReplacement.includes,
        shouldLogContent: textReplacement.shouldLogContent,
        isUnchangedReturned: textReplacement.isUnchangedReturned,
        isRequestMatched,
        // A document cannot be created from the text as the browser does it, e.g. by its content type
        isResponseTypeReplaced: (responseType) => responseType !== DOCUMENT_RESPONSE_TYPE,
    };
};

/**
 * Parses the arguments of uBO `trusted-replace-xhr-response.js`, converted to AdGuard syntax, as uBO does,
 * see `getUboResponseTextReplacement()`, so an empty pattern prepends the replacement to the text.
 * `propsToMatch` are matched against the method and the URL passed to `open()`, see `parseUboPropsToMatch()`,
 * a pattern without a name is matched against the URL. As in uBO, only text responses are replaced,
 * i.e. with an empty `responseType` or `text`, and other requests are sent as they are.
 *
 * Requires `getUboResponseTextReplacement`, `logMessage`, `parseUboOptions`, `uboPatternToRegExp`,
 * `parseUboPropsToMatch`, `matchUboProps`, `getRegexpTester` and `getNativeRegexpTest`
 * in the injections of the scriptlet.
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
export const getUboXhrResponseReplacement = (
    source: Source,
    pattern: string,
    replacement: string,
    propsToMatch: string,
    args: unknown[],
): XhrResponseReplacement | null => {
    // !IMPORTANT: Do not move constants outside of this function
    const IMPLICIT_PROP = 'url';
    const TEXT_RESPONSE_TYPE = 'text';

    // As in uBO, an empty pattern matches the beginning of the text, unlike in `trusted-replace-fetch-response.js`
    const textReplacement = getUboResponseTextReplacement(source, pattern, replacement, args, true);
    if (textReplacement === null) {
        return null;
    }

    const needles = parseUboPropsToMatch(propsToMatch, IMPLICIT_PROP);
    if (needles === null) {
        logMessage(source, `Invalid regular expression of propsToMatch: ${propsToMatch}`);
        return null;
    }

    const testRegexp = getRegexpTester();

    return {
        // Object spread is not used, as its helper of Babel is not available in the scriptlet runtime
        pattern: textReplacement.pattern,
        replacement: textReplacement.replacement,
        includes: textReplacement.includes,
        shouldLogContent: textReplacement.shouldLogContent,
        isUnchangedReturned: textReplacement.isUnchangedReturned,
        // As in uBO, only the method and the URL as they are passed to `open()` are matched
        isRequestMatched: (xhrData: XMLHttpRequestSharedRequestData<any>): boolean => matchUboProps(
            needles,
            { method: xhrData.method, url: xhrData.url },
            testRegexp,
        ),
        isResponseTypeReplaced: (responseType) => responseType === '' || responseType === TEXT_RESPONSE_TYPE,
    };
};

/**
 * Replaces the text of the responses of `XMLHttpRequest` by the settings parsed by
 * `getAdgXhrResponseReplacement()` or `getUboXhrResponseReplacement()`, by `interceptXhrResponses()`,
 * which sends a forged request instead of each matched one. The replaced text is converted to
 * the `responseType` of the request, as the forged request has the default one.
 * An error of matching the request, e.g. thrown by a method of the page, is logged,
 * and the request is not matched, so it is sent as it is.
 *
 * Requires `hit`, `logMessage`, `replaceResponseText`, `getRegexpTester`, `getNativeRegexpTest`,
 * `getThrownValueMessage` and `interceptXhrResponses`, with their dependencies, in the injections
 * of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param settings Settings of the replacement.
 */
export const replaceXhrResponses = (source: Source, settings: XhrResponseReplacement): void => {
    const { pattern, isRequestMatched, isResponseTypeReplaced } = settings;

    const nativeParse = window.JSON.parse;
    const testRegexp = getRegexpTester();

    /**
     * Converts the text to the `responseType` of the request, as the response of a native request has it.
     *
     * @param text Text of the response.
     * @param responseType `responseType` of the request of the page.
     * @returns Response of the type.
     */
    const convertToResponseType = (text: string, responseType: XMLHttpRequestResponseType): unknown => {
        switch (responseType) {
            case 'json':
                try {
                    return nativeParse(text);
                } catch {
                    // As in a native request, the response of invalid JSON is `null`
                    return null;
                }
            case 'arraybuffer':
                return new TextEncoder().encode(text).buffer;
            case 'blob':
                return new Blob([text]);
            default:
                return text;
        }
    };

    const modifyResponse = (content: unknown, xhr: XMLHttpRequest): unknown => {
        if (typeof content !== 'string') {
            return content;
        }

        let text = content;
        if (pattern !== null) {
            const modifiedText = replaceResponseText(source, settings, pattern, content, testRegexp);
            if (modifiedText !== null) {
                text = modifiedText;
                hit(source);
            }
        }

        return convertToResponseType(text, xhr.responseType);
    };

    const isMatched = (xhrData: XMLHttpRequestSharedRequestData<any>): boolean => {
        try {
            return isRequestMatched(xhrData);
        } catch (error) {
            // e.g. thrown by the current `RegExp.prototype.test` of an accessor of another rule,
            // which should not stop the request of the page, so it is sent as it is.
            // Logging calls `console.log()` of the page, which may throw as well
            try {
                logMessage(source, `Request cannot be matched: ${getThrownValueMessage(error)}`);
            } catch {
                // nothing to do, the error cannot be logged
            }
            return false;
        }
    };

    interceptXhrResponses(
        source,
        '',
        false,
        isMatched,
        modifyResponse,
        (xhr) => isResponseTypeReplaced(xhr.responseType),
    );
};
