import {
    hit,
    matchStackTrace,
    getPropertyInChain,
    getWildcardPropertyInChain,
    logMessage,
    shouldAbortInlineOrInjectedScript,
    getNativeRegexpTest,
    toRegExp,
    isEmptyObject,
    backupRegExpValues,
    restoreRegExpValues,
} from '../helpers';
import { type Source } from './scriptlets';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-replace-outbound-text
 *
 * @description
 * Replace the text in the outbound function call.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/commit/21e1ee30ee36c1b9a7a3c9f43ac97e52d8e79661
 *
 * ### Syntax
 *
 * <!-- markdownlint-disable line-length -->
 * ```text
 * example.org#%#//scriptlet('trusted-replace-outbound-text', methodPath[, textToReplace[, replacement[, decodeMethod[, stack[, logContent]]]]])
 * ```
 * <!-- markdownlint-enable line-length -->
 *
 * - `methodPath` — required, the name of the function to trap, it must have an object as an argument.
 *   Call with only `methodPath` as an argument will log all text content of the specified function to console,
 *   but only if function call returns a string, otherwise it will log information that content is not a string.
 * - `textToReplace` — optional, string or regular expression which should be replaced.
 *   By default it's set to `''`. If it's not set to other value and `logContent` is set, it will log the original content.
 * - `replacement` — optional, string which replace the matched text.
 *   By default it's set to '', so matched content will removed.
 * - `decodeMethod` — optional, string which specifies the method used to decode the content.
 *   For now supported value is 'base64'. By default it's set to `''` and no decoding is performed.
 *   If it's set and `logContent` is also set and `textToReplace` and `replacement` are not set,
 *   then it will log the decoded content.
 * - `stack` — optional, string or regular expression that must match the current function call stack trace.
 *   If regular expression is invalid it will be skipped.
 * - `logContent` — optional, if set to any value, the original and modified content will be logged.
 *   By default it's set to '' and no content will be logged.
 *
 * > Logging content may be useful for debugging but it is not allowed for prod versions of filter lists.
 *
 * ### Examples
 *
 * <!-- markdownlint-disable line-length -->
 *
 * 1. Replace `foo` with 'bar' from the payload of the atob call:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-outbound-text', 'atob', 'foo', 'bar')
 *     ```
 *
 *     For instance, the following call will return `bar`
 *
 *     ```html
 *     const text = btoa('foo');
 *     atob(text);
 *     ```
 *
 * 1. Replace `disable_ads:false` with 'disable_ads:true' from the payload of the `Array.prototype.join` if content is encoded in base64:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-outbound-text', 'Array.prototype.join', 'disable_ads:false', 'disable_ads:true', 'base64')
 *     ```
 *
 *     For instance, the following call will return `ZGlzYWJsZV9hZHM6dHJ1ZQ==` which is `'disable_ads:true'` after decoding
 *
 *     ```html
 *     const arrayBase64 = ['ZGlzYWJsZV9h','ZHM6ZmFsc2U=']; // `ZGlzYWJsZV9hZHM6ZmFsc2U=` after decoding is `disable_ads:false`
 *     arrayBase64.join('');
 *     ```
 *
 * 1. Replace `"loadAds":true` with `"loadAds":false` from the payload of the JSON.stringify if the stack trace contains `testStackFunction`:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-outbound-text', 'JSON.stringify', '"loadAds":true', '"loadAds":false', '', 'testStackFunction')
 *     ```
 *
 *     For instance, the following call will return `'{"loadAds":false,"content":"bar"}'`
 *
 *     ```html
 *     const testStackFunction = () => JSON.stringify({ loadAds: true, content: 'bar' });
 *     testStackFunction();
 *     ```
 *
 * 1. Call with `decodeMethod` and `logContent` arguments will log original and decoded text content of the specified function:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-outbound-text', 'Array.prototype.join', '', '', 'base64', '', 'true')
 *     ```
 *
 * 1. Call with only first argument will log text content of the specified function:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-outbound-text', 'atob')
 *     ```
 *
 * 1. Call with `logContent` argument will log original and modified text content of the specified function:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-replace-outbound-text', 'atob', 'foo', 'bar', '', '', 'true')
 *     ```
 *
 * <!-- markdownlint-enable line-length -->
 *
 * @added v1.11.1.
 */
/* eslint-enable max-len */
export function trustedReplaceOutboundText(
    source: Source,
    methodPath: string,
    textToReplace = '',
    replacement = '',
    decodeMethod = '',
    stack = '',
    logContent = '',
) {
    if (!methodPath) {
        return;
    }

    const getPathParts = getPropertyInChain as unknown as (base: Window, chain: string) => {
        base: Record<string, unknown>;
        prop: string;
        chain?: string;
    };

    const { base, chain, prop } = getPathParts(window, methodPath);

    if (typeof chain !== 'undefined') {
        logMessage(source, `Could not reach the end of the prop chain: ${methodPath}`);
        return;
    }

    const nativeMethod = base[prop];
    if (!nativeMethod || typeof nativeMethod !== 'function') {
        logMessage(source, `Could not retrieve the method: ${methodPath}`);
        return;
    }

    /**
     * A simple check if a string is a valid base64 encoded string.
     * If after decoding and encoding the string is not the same as the original string,
     * then the string is not a valid base64 encoded string.
     *
     * @param str - The string to be checked.
     * @returns A boolean indicating whether the string is a valid base64 encoded string.
     */
    const isValidBase64 = (str: string): boolean => {
        try {
            if (str === '') {
                return false;
            }
            const decodedString = atob(str);
            const encodedString = btoa(decodedString);
            // Encoded string may contains padding characters, so it's necessary to remove it before comparison
            const stringWithoutPadding = str.replace(/=+$/, '');
            const encodedStringWithoutPadding = encodedString.replace(/=+$/, '');
            return encodedStringWithoutPadding === stringWithoutPadding;
        } catch (e) {
            return false;
        }
    };

    /**
     * Decodes the content, replaces the matched pattern with the specified text replacement,
     * and returns the modified content.
     * If the decode method is not specified, then content is modified without decoding.
     *
     * @param content - The original content to be decoded and replaced.
     * @param pattern - The regular expression pattern to match.
     * @param textReplacement - The text to replace the matched pattern.
     * @param decode - The method used to decode the content. For now only supported value is 'base64'.
     * @param log - The string, if set, decoded content should be logged.
     * @returns The content after modifying.
     */
    const decodeAndReplaceContent = (
        content: string,
        pattern: RegExp,
        textReplacement: string,
        decode: string,
        log: string,
    ): String => {
        switch (decode) {
            case 'base64':
                try {
                    if (!isValidBase64(content)) {
                        logMessage(source, `Text content is not a valid base64 encoded string: ${content}`);
                        return content;
                    }
                    const decodedContent = atob(content);

                    if (log) {
                        logMessage(source, `Decoded text content: ${decodedContent}`);
                    }

                    const modifiedContent = textToReplace
                        ? decodedContent.replace(pattern, textReplacement)
                        : decodedContent;

                    if (log) {
                        const message = modifiedContent !== decodedContent
                            ? `Modified decoded text content: ${modifiedContent}`
                            : 'Decoded text content was not modified';

                        logMessage(source, message);
                    }

                    const encodedContent = btoa(modifiedContent);
                    return encodedContent;
                } catch (e) {
                    return content;
                }
            default:
                return content.replace(pattern, textReplacement);
        }
    };

    const logOriginalContent = !textToReplace || !!logContent;
    const logModifiedContent = !!logContent;
    const logDecodedContent = !!decodeMethod && !!logContent;

    // This flag allows to prevent infinite loops when trapping props that are used by scriptlet's own code.
    let isMatchingSuspended = false;

    const objectWrapper = (
        target: Function,
        thisArg: any,
        argumentsList: unknown[],
    ) => {
        if (isMatchingSuspended) {
            return Reflect.apply(target, thisArg, argumentsList);
        }
        isMatchingSuspended = true;
        hit(source);
        const result = Reflect.apply(target, thisArg, argumentsList);

        if (stack && !matchStackTrace(stack, new Error().stack || '')) {
            return result;
        }

        if (typeof result === 'string') {
            if (logOriginalContent) {
                logMessage(source, `Original text content: ${result}`);
            }

            const patternRegexp = toRegExp(textToReplace);
            const modifiedContent = textToReplace || logDecodedContent
                ? decodeAndReplaceContent(result, patternRegexp, replacement, decodeMethod, logContent)
                : result;

            if (logModifiedContent) {
                const message = modifiedContent !== result
                    ? `Modified text content: ${modifiedContent}`
                    : 'Text content was not modified';

                logMessage(source, message);
            }

            isMatchingSuspended = false;
            return modifiedContent;
        }
        isMatchingSuspended = false;
        logMessage(source, 'Content is not a string');
        return result;
    };

    const objectHandler = {
        apply: objectWrapper,
    };

    base[prop] = new Proxy(nativeMethod, objectHandler);
}

export const trustedReplaceOutboundTextNames = [
    'trusted-replace-outbound-text',
    // trusted scriptlets support no aliases
];

// eslint-disable-next-line prefer-destructuring
trustedReplaceOutboundText.primaryName = trustedReplaceOutboundTextNames[0];

trustedReplaceOutboundText.injections = [
    hit,
    matchStackTrace,
    getPropertyInChain,
    getWildcardPropertyInChain,
    logMessage,
    // following helpers are needed for helpers above
    shouldAbortInlineOrInjectedScript,
    getNativeRegexpTest,
    toRegExp,
    isEmptyObject,
    backupRegExpValues,
    restoreRegExpValues,
];
