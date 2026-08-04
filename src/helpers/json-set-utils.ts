import { logMessage } from './log-message';
import {
    noopArray,
    noopObject,
    noopCallbackFunc,
    noopFunc,
    trueFunc,
    falseFunc,
    throwFunc,
    noopPromiseReject,
    noopPromiseResolve,
} from './noop-utils';
import { nativeIsNaN } from './number-utils';
import { parseKeywordValue } from './parse-keyword-value';
import { extractRegexAndReplacement } from './string-utils';
import { type Source } from '../scriptlets';

type ParsedJsonSetArgumentValue = {
    constantValue: any;
    replaceRegexValue: RegExp | string;
    shouldReplaceArgument: boolean;
    shouldMergeJsonValue: boolean;
    /**
     * Whether the value contains time keywords in a part where they are resolved.
     *
     * Scriptlets use it to know whether the value should be parsed again
     * on every interception; keywords in the regexp part of `replace:` values
     * are not counted because they are not resolved.
     */
    hasTimeKeywords: boolean;
};

/**
 * Computes the value to set given the current value at the target node.
 * For plain values, returns `constantValue` directly.
 * For the `json:` variant, if both `currentValue` and `constantValue` are
 * plain objects (non-array), returns a shallow merge of their own
 * properties with `constantValue` taking precedence. Otherwise, the parsed
 * JSON value replaces the current value as-is.
 * For the `replace:` variant, applies the regex substitution to the current
 * string value.
 *
 * @param currentValue current value of the target node
 * @param parsedArgumentValue parsed trusted-json-set argument descriptor
 * @returns value to write to the target node
 */
export const getJsonSetValue = (
    currentValue: any,
    parsedArgumentValue: ParsedJsonSetArgumentValue,
): any => {
    if (parsedArgumentValue.shouldReplaceArgument) {
        if (typeof currentValue === 'string') {
            return currentValue.replace(
                parsedArgumentValue.replaceRegexValue as RegExp,
                parsedArgumentValue.constantValue as string,
            );
        }
        return currentValue;
    }

    const shouldMergeObjects = parsedArgumentValue.shouldMergeJsonValue
        && currentValue !== null
        && typeof currentValue === 'object'
        && !Array.isArray(currentValue)
        && parsedArgumentValue.constantValue !== null
        && typeof parsedArgumentValue.constantValue === 'object'
        && !Array.isArray(parsedArgumentValue.constantValue);

    if (shouldMergeObjects) {
        return Object.assign({}, currentValue, parsedArgumentValue.constantValue);
    }

    return parsedArgumentValue.constantValue;
};

/**
 * Parses a trusted-json-set argument value into an executable value descriptor.
 * Supports special constants, `replace:` syntax, and `json:` syntax.
 *
 * Time keywords — `$now$`, `$currentDate$`, and `$currentISODate$` — are resolved
 * in any part of the value, and more than one keyword may be used in it,
 * e.g. `json:{"count":1,"firstTime":$now$}`.
 *
 * @param source scriptlet source for logging
 * @param argumentValue raw argument value string
 * @param nativeParse native JSON.parse reference
 * @returns parsed value descriptor or null when the input is invalid
 */
export const parseJsonSetArgumentValue = (
    source: Source,
    argumentValue: string,
    nativeParse: typeof JSON.parse,
): ParsedJsonSetArgumentValue | null => {
    const MARKERS = {
        JSON: 'json:',
        REPLACE: 'replace:',
    };

    let constantValue;
    let replaceRegexValue: RegExp | string = '';
    let shouldReplaceArgument = false;
    let shouldMergeJsonValue = false;
    // Set only if keywords are found in a part of the value where they are resolved
    let hasTimeKeywords = false;

    if (argumentValue.startsWith(MARKERS.REPLACE)) {
        const replacementRegexPair = extractRegexAndReplacement(argumentValue);
        if (!replacementRegexPair) {
            logMessage(source, `Invalid argument value format: ${argumentValue}`);
            return null;
        }
        replaceRegexValue = replacementRegexPair.regexPart;
        // Time keywords are resolved in the replacement part only —
        // the regexp part is a match pattern, so it is used as is
        // https://github.com/AdguardTeam/Scriptlets/issues/573
        constantValue = parseKeywordValue(replacementRegexPair.replacementPart);
        hasTimeKeywords = constantValue !== replacementRegexPair.replacementPart;
        shouldReplaceArgument = true;
    } else if (argumentValue.startsWith(MARKERS.JSON)) {
        try {
            // Time keywords are resolved before the value is parsed
            // because 'json:{"firstTime":$now$}' is not a valid JSON until they are resolved.
            // Raw 'argumentValue' is still used for logging to show what has been passed in the rule
            // https://github.com/AdguardTeam/Scriptlets/issues/573
            const rawJsonValue = argumentValue.slice(MARKERS.JSON.length);
            const parsedJsonValue = parseKeywordValue(rawJsonValue);
            hasTimeKeywords = parsedJsonValue !== rawJsonValue;
            constantValue = nativeParse(parsedJsonValue);
            shouldMergeJsonValue = true;
        } catch {
            logMessage(source, `Invalid JSON argument value: ${argumentValue}`);
            return null;
        }
    } else {
        const emptyArr = noopArray();
        const emptyObj = noopObject();
        // Time keywords may be used in any part of a plain value,
        // e.g. '{"count":1,"firstTime":$now$}'
        // https://github.com/AdguardTeam/Scriptlets/issues/573
        const parsedArgument = parseKeywordValue(argumentValue);
        hasTimeKeywords = parsedArgument !== argumentValue;
        if (parsedArgument === 'undefined') {
            constantValue = undefined;
        } else if (parsedArgument === 'false') {
            constantValue = false;
        } else if (parsedArgument === 'true') {
            constantValue = true;
        } else if (parsedArgument === 'null') {
            constantValue = null;
        } else if (parsedArgument === 'NaN') {
            constantValue = NaN;
        } else if (parsedArgument === 'emptyArr' || parsedArgument === '[]') {
            constantValue = emptyArr;
        } else if (parsedArgument === 'emptyObj' || parsedArgument === '{}') {
            constantValue = emptyObj;
        } else if (parsedArgument === 'noopFunc') {
            constantValue = noopFunc;
        } else if (parsedArgument === 'noopCallbackFunc') {
            constantValue = noopCallbackFunc;
        } else if (parsedArgument === 'trueFunc') {
            constantValue = trueFunc;
        } else if (parsedArgument === 'falseFunc') {
            constantValue = falseFunc;
        } else if (parsedArgument === 'throwFunc') {
            constantValue = throwFunc;
        } else if (parsedArgument === 'noopPromiseResolve') {
            constantValue = noopPromiseResolve;
        } else if (parsedArgument === 'noopPromiseReject') {
            constantValue = noopPromiseReject;
        } else if (/^-?\d+$/.test(parsedArgument)) {
            constantValue = parseFloat(parsedArgument);
            if (nativeIsNaN(constantValue)) {
                return null;
            }
        } else {
            constantValue = parsedArgument;
        }
    }

    return {
        constantValue,
        replaceRegexValue,
        shouldReplaceArgument,
        shouldMergeJsonValue,
        hasTimeKeywords,
    };
};

/**
 * Returns the argument value descriptor which should be used for the payload being mutated.
 *
 * Values with time keywords are parsed again for every intercepted payload,
 * so the time is not frozen at the moment of the scriptlet run —
 * the same way as it works in `jsonpath` mode.
 * It is done once per payload, not once per matched node,
 * so every node matched by a wildcard path gets the very same time.
 *
 * Values with no time keywords are returned as is, without being parsed again.
 *
 * @param source scriptlet source for logging
 * @param argumentValue raw argument value string
 * @param nativeParse native JSON.parse reference
 * @param parsedArgumentValue value descriptor parsed on the scriptlet run
 * @returns value descriptor to use, or the passed one if there is nothing to resolve
 */
export const resolveJsonSetTimeKeywords = <T extends ParsedJsonSetArgumentValue | null | undefined>(
    source: Source,
    argumentValue: string,
    nativeParse: typeof JSON.parse,
    parsedArgumentValue: T,
): T | ParsedJsonSetArgumentValue => {
    if (!parsedArgumentValue || !parsedArgumentValue.hasTimeKeywords) {
        return parsedArgumentValue;
    }

    return parseJsonSetArgumentValue(source, argumentValue, nativeParse) || parsedArgumentValue;
};
