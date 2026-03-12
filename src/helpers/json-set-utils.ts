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
import { extractRegexAndReplacement } from './string-utils';
import { type Source } from '../scriptlets';

type ParsedJsonSetArgumentValue = {
    constantValue: any;
    replaceRegexValue: RegExp | string;
    shouldReplaceArgument: boolean;
    shouldMergeJsonValue: boolean;
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

    if (argumentValue.startsWith(MARKERS.REPLACE)) {
        const replacementRegexPair = extractRegexAndReplacement(argumentValue);
        if (!replacementRegexPair) {
            logMessage(source, `Invalid argument value format: ${argumentValue}`);
            return null;
        }
        replaceRegexValue = replacementRegexPair.regexPart;
        constantValue = replacementRegexPair.replacementPart;
        shouldReplaceArgument = true;
    } else if (argumentValue.startsWith(MARKERS.JSON)) {
        try {
            constantValue = nativeParse(argumentValue.slice(MARKERS.JSON.length));
            shouldMergeJsonValue = true;
        } catch {
            logMessage(source, `Invalid JSON argument value: ${argumentValue}`);
            return null;
        }
    } else {
        const emptyArr = noopArray();
        const emptyObj = noopObject();
        if (argumentValue === 'undefined') {
            constantValue = undefined;
        } else if (argumentValue === 'false') {
            constantValue = false;
        } else if (argumentValue === 'true') {
            constantValue = true;
        } else if (argumentValue === 'null') {
            constantValue = null;
        } else if (argumentValue === 'NaN') {
            constantValue = NaN;
        } else if (argumentValue === 'emptyArr' || argumentValue === '[]') {
            constantValue = emptyArr;
        } else if (argumentValue === 'emptyObj' || argumentValue === '{}') {
            constantValue = emptyObj;
        } else if (argumentValue === 'noopFunc') {
            constantValue = noopFunc;
        } else if (argumentValue === 'noopCallbackFunc') {
            constantValue = noopCallbackFunc;
        } else if (argumentValue === 'trueFunc') {
            constantValue = trueFunc;
        } else if (argumentValue === 'falseFunc') {
            constantValue = falseFunc;
        } else if (argumentValue === 'throwFunc') {
            constantValue = throwFunc;
        } else if (argumentValue === 'noopPromiseResolve') {
            constantValue = noopPromiseResolve;
        } else if (argumentValue === 'noopPromiseReject') {
            constantValue = noopPromiseReject;
        } else if (/^-?\d+$/.test(argumentValue)) {
            constantValue = parseFloat(argumentValue);
            if (nativeIsNaN(constantValue)) {
                return null;
            }
        } else {
            constantValue = argumentValue;
        }
    }

    return {
        constantValue,
        replaceRegexValue,
        shouldReplaceArgument,
        shouldMergeJsonValue,
    };
};
