import {
    hit,
    getPropertyInChain,
    getMethodOwner,
    logMessage,
    isEmptyObject,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet call-nothrow
 *
 * @description
 * Prevents an exception from being thrown and returns undefined when a specific function is called.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#call-nothrowjs-
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('call-nothrow', functionName)
 * ```
 *
 * - `functionName` — required, the name of the function to trap
 *
 * ### Examples
 *
 * 1. Prevents an exception from being thrown when `Object.defineProperty` is called:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('call-nothrow', 'Object.defineProperty')
 *     ```
 *
 *     For instance, the following call normally throws an error, but the scriptlet catches it and returns undefined:
 *
 *     ```javascript
 *     Object.defineProperty(window, 'foo', { value: true });
 *     Object.defineProperty(window, 'foo', { value: false });
 *     ```
 *
 * 2. Prevents an exception from being thrown when `JSON.parse` is called:
 *
 *     ```adblock
 *     example.org#%#//scriptlet('call-nothrow', 'JSON.parse')
 *     ```
 *
 *     For instance, the following call normally throws an error, but the scriptlet catches it and returns undefined:
 *
 *     ```javascript
 *     JSON.parse('foo');
 *     ```
 *
 * @added v1.10.1.
 */
/* eslint-enable max-len */
export function callNoThrow(source, functionName) {
    if (!functionName) {
        return;
    }

    const { base, prop } = getPropertyInChain(window, functionName);
    if (!base || !prop || typeof base[prop] !== 'function') {
        const message = `${functionName} is not a function`;
        logMessage(source, message);
        return;
    }

    // Method of a storage is replaced in `Storage.prototype`, so only its calls on `base` are processed
    const methodOwner = getMethodOwner(base);

    const objectWrapper = (...args) => {
        // Arguments of the 'apply' trap are target, thisArg and arguments of the call
        if (methodOwner !== base && args[1] !== base) {
            return Reflect.apply(...args);
        }
        let result;
        try {
            result = Reflect.apply(...args);
        } catch (e) {
            const message = `Error calling ${functionName}: ${e.message}`;
            logMessage(source, message);
        }
        hit(source);
        return result;
    };

    const objectHandler = {
        apply: objectWrapper,
    };

    methodOwner[prop] = new Proxy(methodOwner[prop], objectHandler);
}

export const callNoThrowNames = [
    'call-nothrow',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'call-nothrow.js',
    'ubo-call-nothrow.js',
    'ubo-call-nothrow',
];

// eslint-disable-next-line prefer-destructuring
callNoThrow.primaryName = callNoThrowNames[0];

callNoThrow.injections = [
    hit,
    getPropertyInChain,
    getMethodOwner,
    logMessage,
    // following helpers are needed for helpers above
    isEmptyObject,
];
