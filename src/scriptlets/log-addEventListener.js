import {
    hit,
    validateType,
    validateListener,
    listenerToString,
    convertTypeToString,
    // following helpers are needed for helpers above
    objectToString,
    isEmptyObject,
    getObjectEntries,
} from '../helpers';

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
    // eslint-disable-next-line no-console
    const log = console.log.bind(console);
    const nativeAddEventListener = window.EventTarget.prototype.addEventListener;

    function addEventListenerWrapper(type, listener, ...args) {
        if (validateType(type) && validateListener(listener)) {
            const logMessage = `addEventListener("${type}", ${listenerToString(listener)})`;
            log(logMessage);
            hit(source);
        } else if (source.verbose) {
            // logging while debugging
            const logMessage = `Invalid event type or listener passed to addEventListener:
type: ${convertTypeToString(type)}
listener: ${convertTypeToString(listener)}`;
            log(logMessage);
        }

        return nativeAddEventListener.apply(this, [type, listener, ...args]);
    }

    window.EventTarget.prototype.addEventListener = addEventListenerWrapper;
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
    objectToString,
    isEmptyObject,
    getObjectEntries,
];
