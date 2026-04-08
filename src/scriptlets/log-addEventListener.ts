import {
    hit,
    validateType,
    validateListener,
    listenerToString,
    convertTypeToString,
    logMessage,
    objectToString,
    isEmptyObject,
    getElementAttributesWithValues,
} from '../helpers';
import { type Source } from './scriptlets';

/**
 * @scriptlet log-addEventListener
 *
 * @description
 * Logs all addEventListener calls to the console.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#addeventlistener-loggerjs-
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('log-addEventListener'[, noProtect])
 * ```
 *
 * - `noProtect` — optional, if set to `'true'`, the scriptlet will use simple assignment instead of
 *   `Object.defineProperty` with a no-op setter. This allows other scriptlets or tools to override
 *   `addEventListener` later if needed. By default, the scriptlet protects the override from being
 *   overwritten by website scripts. If compatibility with other scriptlets is needed,
 *   set this parameter to `'true'`.
 *
 * @added v1.0.4.
 */
export function logAddEventListener(source: Source, noProtect?: string) {
    const nativeAddEventListener = window.EventTarget.prototype.addEventListener;

    function addEventListenerWrapper(
        this: EventTarget | null | undefined,
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        ...args: [options?: boolean | AddEventListenerOptions]
    ) {
        if (validateType(type) && validateListener(listener)) {
            let targetElement: Element | undefined;
            let targetElementInfo: string | undefined;
            const listenerInfo = listenerToString(listener as EventListener | EventListenerObject);

            if (this) {
                if (this instanceof Window) {
                    targetElementInfo = 'window';
                } else if (this instanceof Document) {
                    targetElementInfo = 'document';
                } else if (this instanceof Element) {
                    targetElement = this;
                    targetElementInfo = getElementAttributesWithValues(this);
                }
            }

            if (targetElementInfo) {
                const message = `addEventListener("${type}", ${listenerInfo})\nElement: ${targetElementInfo}`;
                logMessage(source, message, true);
                if (targetElement) {
                    // eslint-disable-next-line no-console
                    console.log('log-addEventListener Element:', targetElement);
                }
            } else {
                const message = `addEventListener("${type}", ${listenerInfo})`;
                logMessage(source, message, true);
            }
            hit(source);
        } else {
            // logging while debugging
            const message = `Invalid event type or listener passed to addEventListener:
        type: ${convertTypeToString(type)}
        listener: ${convertTypeToString(listener)}`;
            logMessage(source, message, true);
        }

        // Avoid illegal invocations due to lost context
        // https://github.com/AdguardTeam/Scriptlets/issues/271
        let context = this;
        if (this && this.constructor?.name === 'Window' && this !== window) {
            context = window;
        }
        return nativeAddEventListener.apply(context, [type, listener, ...args]);
    }

    // https://github.com/AdguardTeam/Scriptlets/issues/551
    if (noProtect === 'true') {
        window.EventTarget.prototype.addEventListener = addEventListenerWrapper;
    } else {
        const descriptor = {
            configurable: true,
            set: () => { },
            get: () => addEventListenerWrapper,
        };
        // https://github.com/AdguardTeam/Scriptlets/issues/215
        // https://github.com/AdguardTeam/Scriptlets/issues/143
        Object.defineProperty(window.EventTarget.prototype, 'addEventListener', descriptor);
        Object.defineProperty(window, 'addEventListener', descriptor);
        Object.defineProperty(document, 'addEventListener', descriptor);
    }
}

export const logAddEventListenerNames = [
    'log-addEventListener',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'addEventListener-logger.js',
    'ubo-addEventListener-logger.js',
    'aell.js',
    'ubo-aell.js',
    'ubo-addEventListener-logger',
    'ubo-aell',
];

// eslint-disable-next-line prefer-destructuring
logAddEventListener.primaryName = logAddEventListenerNames[0];

logAddEventListener.injections = [
    hit,
    validateType,
    validateListener,
    listenerToString,
    convertTypeToString,
    logMessage,
    objectToString,
    isEmptyObject,
    getElementAttributesWithValues,
];
