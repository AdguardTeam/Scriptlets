import { hit } from './hit';
import { logMessage } from './log-message';
import { matchStackTrace, addStackTraceMessageLine, isValidStackPattern } from './match-stack';
import { getPropertyInChain } from './get-property-in-chain';
import { getMethodOwner, getFunctionProxyProperty } from './object-utils';
import { toRegExp } from './string-utils';
import { getNativeRegexpTest } from './regexp-utils';
import { parseUboOptions, uboPatternToRegExp } from './ubo-utils';
import { type Source } from '../scriptlets';

/**
 * Settings of `replaceOutboundText()`, which are parsed from the arguments of `trusted-replace-outbound-text` once,
 * by `getAdgOutboundTextReplacement()` or `getUboOutboundTextReplacement()`.
 */
export interface OutboundTextReplacement {
    /**
     * Path to the method whose returned text is replaced, e.g. `atob` or `TextDecoder.prototype.decode`.
     */
    methodPath: string;

    /**
     * Regular expression of the text to replace, or `null` to only log the text.
     */
    pattern: RegExp | null;

    /**
     * Text to replace with, may contain `$1` etc.
     */
    replacement: string;

    /**
     * Regular expression which the text, after it is decoded, has to match to be replaced, or `null` for any text.
     */
    condition: RegExp | null;

    /**
     * `base64` if the text is decoded before it is replaced, and encoded again after that,
     * or an empty string for the text as it is.
     */
    encoding: string;

    /**
     * If true, as in AdGuard syntax, the text is decoded only if it is valid base64 text without whitespaces,
     * i.e. if encoding the decoded text gives it back, and it is encoded again also if it has not been modified,
     * e.g. with padding added. Otherwise, as in uBO, any text which `atob()` decodes is decoded,
     * and the text which has not been modified is returned as it is.
     */
    isBase64Strict: boolean;

    /**
     * Stack trace pattern which the call has to match, or an empty string for any call.
     */
    stack: string;

    /**
     * If true, the original and the modified text are logged.
     */
    shouldLogContent: boolean;
}

/**
 * Parses the arguments of AdGuard `trusted-replace-outbound-text`. Positional arguments are parsed as before
 * the options have been added:
 * - `textToReplace` — string or regular expression, see `toRegExp()`, an empty one only logs the text;
 * - `replacement` — text to replace with;
 * - `decodeMethod` — `base64`, other values are ignored;
 * - `stack` — stack trace pattern;
 * - `logContent` — any value logs the original and the modified text.
 *
 * Extra arguments may be the option `condition`, followed by a string or a regular expression, see `toRegExp()`,
 * which the text, after it is decoded, has to match, e.g. `'condition', 'ads'`.
 *
 * Requires `logMessage`, `toRegExp`, `isValidStackPattern` and `parseUboOptions` in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param methodPath Path to the method.
 * @param textToReplace Text to replace, or a regular expression to match it.
 * @param replacement Text to replace with.
 * @param decodeMethod Method of decoding the text, i.e. `base64`.
 * @param stack Stack trace pattern.
 * @param logContent If set, the original and the modified text are logged.
 * @param args Options which follow `logContent`, e.g. `['condition', 'ads']`.
 *
 * @returns Settings of the replacement, or `null` if an argument is invalid, which is logged.
 */
export const getAdgOutboundTextReplacement = (
    source: Source,
    methodPath: string,
    textToReplace: string,
    replacement: string,
    decodeMethod: string,
    stack: string,
    logContent: string,
    args: unknown[],
): OutboundTextReplacement | null => {
    if (!methodPath) {
        return null;
    }

    // `matchStackTrace()` throws for `stack` which is an invalid regular expression, and so does `toRegExp()`
    // for such `textToReplace`, which would replace the result of each call, so such rule is not applied,
    // which is logged once
    if (stack && !isValidStackPattern(stack)) {
        logMessage(source, `Invalid stack: ${stack}`);
        return null;
    }

    let pattern: RegExp | null = null;
    try {
        const textRegExp = toRegExp(textToReplace);
        if (textToReplace) {
            pattern = textRegExp;
        }
    } catch {
        logMessage(source, `Invalid textToReplace: ${textToReplace}`);
        return null;
    }

    const options = parseUboOptions(args);
    let condition: RegExp | null = null;
    if (options.condition !== undefined) {
        try {
            condition = toRegExp(`${options.condition}`);
        } catch {
            logMessage(source, `Invalid condition: ${options.condition}`);
            return null;
        }
    }

    return {
        methodPath,
        pattern,
        replacement,
        condition,
        encoding: decodeMethod === 'base64' ? 'base64' : '',
        isBase64Strict: true,
        stack,
        shouldLogContent: !!logContent,
    };
};

/**
 * Parses the arguments of uBO `trusted-replace-outbound-text.js`, converted to AdGuard syntax,
 * as uBO `trustedReplaceOutboundText()` does:
 * - `pattern` — string, matched literally once, or a regular expression with its own flags,
 *   see `uboPatternToRegExp()`, an empty one only logs the text;
 * - `replacement` — text to replace with, or `json:` followed by JSON of a value converted to text;
 * - named options follow `replacement`: `condition, value` is a string or a regular expression which the text,
 *   after it is decoded, has to match, and `encoding, base64` decodes the text before it is replaced.
 *
 * Unlike uBO, which matches any text by an invalid regular expression of `pattern` or `condition`,
 * the rule with such one is not applied, which is logged.
 *
 * Requires `logMessage`, `parseUboOptions` and `uboPatternToRegExp` in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param methodPath Path to the method.
 * @param rawPattern Text to replace, or a regular expression to match it.
 * @param rawReplacement Text to replace with, or `json:` followed by JSON.
 * @param args Named options which follow `replacement`, e.g. `['condition', 'ads']`.
 *
 * @returns Settings of the replacement, or `null` if an argument is invalid, which is logged.
 */
export const getUboOutboundTextReplacement = (
    source: Source,
    methodPath: string,
    rawPattern: string,
    rawReplacement: string,
    args: unknown[],
): OutboundTextReplacement | null => {
    // !IMPORTANT: Do not move constants outside of this function
    const JSON_MARKER = 'json:';

    if (!methodPath) {
        return null;
    }

    let pattern: RegExp | null = null;
    if (rawPattern !== '') {
        pattern = uboPatternToRegExp(rawPattern);
        if (pattern === null) {
            logMessage(source, `Invalid regular expression of pattern: ${rawPattern}`);
            return null;
        }
    }

    let replacement = rawReplacement;
    if (rawReplacement.startsWith(JSON_MARKER)) {
        try {
            // A value which is not a function is converted to text by `String.prototype.replace()` as well
            replacement = String(JSON.parse(rawReplacement.slice(JSON_MARKER.length)));
        } catch {
            logMessage(source, `Invalid JSON of replacement: ${rawReplacement}`);
            return null;
        }
    }

    const options = parseUboOptions(args);
    let condition: RegExp | null = null;
    // As in uBO, a condition which is empty or `0` matches any text
    if (options.condition) {
        condition = uboPatternToRegExp(`${options.condition}`);
        if (condition === null) {
            logMessage(source, `Invalid regular expression of condition: ${options.condition}`);
            return null;
        }
    }

    return {
        methodPath,
        pattern,
        replacement,
        condition,
        encoding: options.encoding === 'base64' ? 'base64' : '',
        isBase64Strict: false,
        stack: '',
        // As in uBO, an empty pattern logs the text, after it is decoded
        shouldLogContent: pattern === null,
    };
};

/**
 * Replaces the text which the method returns, by the settings parsed by `getAdgOutboundTextReplacement()`
 * or `getUboOutboundTextReplacement()`. A result which is not a string is returned as it is,
 * as well as the text which cannot be decoded or encoded again. A call made while a call is processed,
 * e.g. of the method which the scriptlet uses itself, is passed through.
 *
 * Requires `hit`, `logMessage`, `matchStackTrace`, `addStackTraceMessageLine`, `getPropertyInChain`,
 * `getMethodOwner`, `getFunctionProxyProperty` and `getNativeRegexpTest` in the injections of the scriptlet,
 * and the helpers they require.
 *
 * @param source Scriptlet properties.
 * @param settings Settings of the replacement.
 */
export const replaceOutboundText = (source: Source, settings: OutboundTextReplacement): void => {
    const {
        methodPath,
        pattern,
        replacement,
        condition,
        encoding,
        isBase64Strict,
        stack,
        shouldLogContent,
    } = settings;

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

    // Method of a storage is replaced in `Storage.prototype`, so only its calls on `base` are processed
    const methodOwner = getMethodOwner(base, prop);
    const nativeMethod = methodOwner[prop];
    if (!nativeMethod || typeof nativeMethod !== 'function') {
        logMessage(source, `Could not retrieve the method: ${methodPath}`);
        return;
    }

    // `test` is saved when the rule runs, so that a rule which intercepts it later, or the page,
    // cannot change the matching of the condition, and only if it is needed, as it throws for a replaced `test`
    const nativeRegexpTest = condition !== null ? getNativeRegexpTest() : null;

    /**
     * Checks whether the text, after it is decoded, matches the condition.
     *
     * @param text Text to check.
     * @returns True if the text is replaced.
     */
    const isConditionMatched = (text: string): boolean => {
        if (condition === null || nativeRegexpTest === null) {
            return true;
        }
        condition.lastIndex = 0;
        return nativeRegexpTest.call(condition, text);
    };

    /**
     * Replaces the text if it matches the condition.
     *
     * @param text Text to replace, after it is decoded.
     * @returns Replaced text, or the text itself if it is not replaced.
     */
    const replaceText = (text: string): string => {
        if (pattern === null || !isConditionMatched(text)) {
            return text;
        }
        // The pattern is shared by all calls, so a sticky one would continue from the previous match otherwise
        pattern.lastIndex = 0;
        return text.replace(pattern, replacement);
    };

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
     * Decodes the base64 text, replaces it and encodes it again.
     *
     * @param content Base64 text.
     * @returns Replaced base64 text, or the text itself if it is not valid base64 text or cannot be encoded.
     */
    const replaceBase64Text = (content: string): string => {
        try {
            if (isBase64Strict && !isValidBase64(content)) {
                logMessage(source, `Text content is not a valid base64 encoded string: ${content}`);
                return content;
            }
            const decodedContent = atob(content);

            if (shouldLogContent) {
                logMessage(source, `Decoded text content: ${decodedContent}`);
            }

            const modifiedContent = replaceText(decodedContent);

            if (shouldLogContent) {
                const message = modifiedContent !== decodedContent
                    ? `Modified decoded text content: ${modifiedContent}`
                    : 'Decoded text content was not modified';

                logMessage(source, message);
            }

            if (!isBase64Strict && modifiedContent === decodedContent) {
                return content;
            }

            return btoa(modifiedContent);
        } catch (e) {
            return content;
        }
    };

    /**
     * Replaces the text which the method has returned, and logs it if needed.
     *
     * @param content Text which the method has returned.
     * @returns Replaced text.
     */
    const replaceContent = (content: string): string => {
        if (pattern === null || shouldLogContent) {
            logMessage(source, `Original text content: ${content}`);
        }

        let modifiedContent = content;
        if (encoding === 'base64') {
            // Text is decoded only to be replaced, or to be logged
            if (pattern !== null || shouldLogContent) {
                modifiedContent = replaceBase64Text(content);
            }
        } else {
            modifiedContent = replaceText(content);
        }

        if (shouldLogContent) {
            const message = modifiedContent !== content
                ? `Modified text content: ${modifiedContent}`
                : 'Text content was not modified';

            logMessage(source, message);
        }

        return modifiedContent;
    };

    // This flag allows to prevent infinite loops when trapping props that are used by scriptlet's own code.
    let isMatchingSuspended = false;

    const objectWrapper = (
        target: Function,
        thisArg: any,
        argumentsList: unknown[],
    ) => {
        if (isMatchingSuspended || (methodOwner !== base && thisArg !== base)) {
            return Reflect.apply(target, thisArg, argumentsList);
        }
        isMatchingSuspended = true;
        try {
            const result = Reflect.apply(target, thisArg, argumentsList);

            // Stack trace is read only if it is matched. The page may make creating or reading it throw,
            // e.g. by replacing `Error` or by `Error.prepareStackTrace`, which should not replace the result
            // of the call which has already succeeded, so it is done separately
            let stackTrace = '';
            let isStackTraceRead = false;
            if (stack) {
                try {
                    stackTrace = String(new Error().stack || '');
                    isStackTraceRead = true;
                } catch {
                    // Content is not modified, as `stack` cannot be matched
                }
            }

            // Error message line is added to the stack trace created here, in the wrapper called by the page,
            // as Firefox and Safari do not have it, so `matchStackTrace()` keeps the frame of the caller
            if (stack && (!isStackTraceRead || !matchStackTrace(stack, addStackTraceMessageLine(stackTrace)))) {
                return result;
            }

            // Only the calls which match `stack` are counted
            hit(source);

            if (typeof result === 'string') {
                return replaceContent(result);
            }
            logMessage(source, 'Content is not a string');
            return result;
        } finally {
            // Matching is resumed on every return path, including a stack trace which does not match
            // and an error thrown by the intercepted method, as the next calls would not be processed otherwise
            isMatchingSuspended = false;
        }
    };

    const objectHandler = {
        apply: objectWrapper,
        get: getFunctionProxyProperty,
    };

    methodOwner[prop] = new Proxy(nativeMethod, objectHandler);
};
