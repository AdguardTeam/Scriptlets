import { expect, test } from 'vitest';

import {
    clickElement,
    createSpoofedClicks,
    getSpoofedClicks,
    spoofClickEventsIsTrusted,
} from '../../src/helpers/click-utils';
import { useViewlessMouseEvents } from '../vitest-helpers';

// Unlike other specs, this one does not use allowSpoofedClicksReset(), so the property cannot be deleted,
// and it runs in its own environment, so it does not affect them
const spoofedClicksKey = Symbol.for('adg-spoof-click-isTrusted');

test('property of spoofed clicks cannot be replaced by the page once the hook is installed', () => {
    useViewlessMouseEvents();
    expect(spoofClickEventsIsTrusted()).toBe(true);
    const spoofedClicks = getSpoofedClicks();

    expect(Object.getOwnPropertyDescriptor(EventTarget.prototype, spoofedClicksKey)).toEqual({
        value: spoofedClicks,
        writable: false,
        enumerable: false,
        configurable: false,
    });

    // E.g. the page replaces it with its own functions, to get the events of the scriptlet and switch spoofing off
    const pageClicks = createSpoofedClicks();
    expect(() => {
        Object.defineProperty(EventTarget.prototype, spoofedClicksKey, { value: pageClicks });
    }).toThrow(TypeError);
    expect(Reflect.set(EventTarget.prototype, spoofedClicksKey, pageClicks)).toBe(false);
    expect(Reflect.deleteProperty(EventTarget.prototype, spoofedClicksKey)).toBe(false);
    expect(getSpoofedClicks()).toBe(spoofedClicks);

    const target = document.createElement('button');
    document.body.append(target);
    const received: boolean[] = [];
    target.addEventListener('click', (event) => { received.push(event.isTrusted); });
    clickElement(target);

    expect(received).toEqual([true]);
});
