import { hit } from '../helpers';
import { Source } from '../../types/types';

/**
 * @trustedScriptlet trusted-dispatch-event
 *
 * @description
 * Dispatches a custom event on a specified target.
 *
 * ### Syntax
 *
 * ```text
 * example.org#%#//scriptlet('trusted-dispatch-event', event[, target])
 * ```
 *
 * - `event` — required, name of the event to dispatch
 * - `target` — optional, target on which event will be invoked. Possible values:
 *     - CSS selector — dispatch event on the element with the specified selector
 *     - `window` — dispatch event on the window object
 *     - if not set, then "document" is used — it's default value
 *
 * ### Examples
 *
 * 1. Dispatches a custom event "click" on the document.
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-dispatch-event', 'click')
 *     ```
 *
 * 2. Dispatches a custom event "submit" on the element with the class "test".
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-dispatch-event', 'submit', '.test')
 *     ```
 *
 * 3. Dispatches a custom event "load" on the window object.
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-dispatch-event', 'load', 'window')
 *     ```
 *
 * @added v1.11.1.
 */

export function trustedDispatchEvent(
    source: Source,
    event: string,
    target: string,
) {
    if (!event) {
        return;
    }

    let hasBeenDispatched = false;

    let eventTarget: typeof window | Document | Element | null = document;
    if (target === 'window') {
        eventTarget = window;
    }

    const events = new Set<string>();

    const dispatch = () => {
        const customEvent = new Event(event);

        if (typeof target === 'string' && target !== 'window') {
            eventTarget = document.querySelector(target);
        }

        const isEventAdded = events.has(event);
        if (!hasBeenDispatched && isEventAdded && eventTarget) {
            hasBeenDispatched = true;
            hit(source);
            eventTarget.dispatchEvent(customEvent);
        }
    };

    const wrapper = (
        eventListener: typeof EventTarget.prototype.addEventListener,
        thisArg: Element,
        args: string[],
    ) => {
        const eventName = args[0];
        if (thisArg && eventName) {
            events.add(eventName);
            setTimeout(() => {
                dispatch();
            }, 1);
        }
        return Reflect.apply(eventListener, thisArg, args);
    };

    const handler = {
        apply: wrapper,
    };
    EventTarget.prototype.addEventListener = new Proxy(EventTarget.prototype.addEventListener, handler);
}

export const trustedDispatchEventNames = [
    'trusted-dispatch-event',
];

trustedDispatchEvent.injections = [
    hit,
];
