import { expect, test } from 'vitest';

import { clickElement, getSpoofedClicks, spoofClickEventsIsTrusted } from '../../src/helpers/click-utils';
import { useViewlessMouseEvents } from '../vitest-helpers';

// The prototype cannot be unsealed, so this spec runs in its own environment, so it does not affect others
const spoofedClicksKey = Symbol.for('adg-spoof-click-isTrusted');

test('hook is not installed if its spoofed clicks cannot be stored, but clicks still work', () => {
    useViewlessMouseEvents();
    const nativeAddEventListener = EventTarget.prototype.addEventListener;
    const nativeRemoveEventListener = EventTarget.prototype.removeEventListener;
    // E.g. the page has sealed the prototype, so its methods can be replaced, but no property can be added
    Object.seal(EventTarget.prototype);

    expect(spoofClickEventsIsTrusted()).toBe(false);
    // No wrapper is left installed without the shared spoofed clicks
    expect(EventTarget.prototype.addEventListener).toBe(nativeAddEventListener);
    expect(EventTarget.prototype.removeEventListener).toBe(nativeRemoveEventListener);
    expect(Reflect.has(EventTarget.prototype, spoofedClicksKey)).toBe(false);
    expect(getSpoofedClicks()).toBe(false);

    const target = document.createElement('button');
    document.body.append(target);
    const received: boolean[] = [];
    target.addEventListener('click', (event) => { received.push(event.isTrusted); });
    target.onclick = (event) => { received.push(event.isTrusted); };
    clickElement(target);

    // Listeners are not hooked, but the inline handler is still spoofed by clickElement()
    expect(received).toEqual([false, true]);
});
