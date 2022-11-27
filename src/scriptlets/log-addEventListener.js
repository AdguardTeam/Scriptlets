import {
    hit,
    validateType,
    validateListener,
    listenerToString,
    convertTypeToString,
    logMessage,
    // following helpers are needed for helpers above
    objectToString,
    isEmptyObject,
    getObjectEntries,
} from '../helpers/index';

/**
 * @scriptlet log-addEventListener
 *
 * @description
 * Logs all addEventListener calls to the console.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#addeventlistener-loggerjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('log-addEventListener')
 * ```
 */
export function logAddEventListener(source) {
    const nativeAddEventListener = window.EventTarget.prototype.addEventListener;

    function addEventListenerWrapper(type, listener, ...args) {
        if (validateType(type) && validateListener(listener)) {
            const message = `addEventListener("${type}", ${listenerToString(listener)})`;
            logMessage(source, message, true);
            hit(source);
        }

        // logging while debugging
        const message = `Invalid event type or listener passed to addEventListener:
type: ${convertTypeToString(type)}
listener: ${convertTypeToString(listener)}`;
        logMessage(source, message, true);

        return nativeAddEventListener.apply(this, [type, listener, ...args]);
    }

    const descriptor = {
        configurable: true,
        set: () => {},
        get: () => addEventListenerWrapper,
    };
    // https://github.com/AdguardTeam/Scriptlets/issues/215
    // https://github.com/AdguardTeam/Scriptlets/issues/143
    Object.defineProperty(window.EventTarget.prototype, 'addEventListener', descriptor);
    Object.defineProperty(window, 'addEventListener', descriptor);
    Object.defineProperty(document, 'addEventListener', descriptor);
}

logAddEventListener.names = [
    'log-addEventListener',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'addEventListener-logger.js',
    'ubo-addEventListener-logger.js',
    'aell.js',
    'ubo-aell.js',
    'ubo-addEventListener-logger',
    'ubo-aell',
];

logAddEventListener.injections = [
    hit,
    validateType,
    validateListener,
    listenerToString,
    convertTypeToString,
    logMessage,
    objectToString,
    isEmptyObject,
    getObjectEntries,
];
