import {
    hit,
    getPropertyInChain,
    logMessage,
    // following helpers are needed for helpers above
    isEmptyObject,
} from '../helpers/index';

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

    const objectWrapper = (...args) => {
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

    base[prop] = new Proxy(base[prop], objectHandler);
}

callNoThrow.names = [
    'call-nothrow',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'call-nothrow.js',
    'ubo-call-nothrow.js',
    'ubo-call-nothrow',
];

callNoThrow.injections = [
    hit,
    getPropertyInChain,
    logMessage,
    // following helpers are needed for helpers above
    isEmptyObject,
];
