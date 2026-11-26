import { describe, expect, test } from 'vitest';

import { runProtected } from '../../src/helpers/run-protected';

describe('runProtected', () => {
    test('calls the callback with the arguments', () => {
        const calls: unknown[][] = [];
        runProtected((...args: unknown[]) => calls.push(args), [1, 'two', { three: 3 }]);
        expect(calls).toEqual([[1, 'two', { three: 3 }]]);
    });

    test('calls the callback by `apply(null, args)` without a receiver', () => {
        let receiver: unknown = 'not called';
        // this spec is a module, i.e. strict code, so `this` is not replaced with `globalThis`
        runProtected(function callback(this: unknown) {
            receiver = this;
        }, []);
        expect(receiver).toBeNull();
    });

    test('calls the callback with the given receiver as it is, also `undefined`', () => {
        const receivers: unknown[] = [];
        const callback = function callback(this: unknown, ...args: unknown[]) {
            receivers.push(this, args);
        };
        const tracker = { name: 'tracker' };
        runProtected(callback, ['a'], tracker);
        runProtected(callback, ['b'], undefined);
        runProtected(callback, ['c'], null);
        expect(receivers).toEqual([tracker, ['a'], undefined, ['b'], null, ['c']]);
        expect(receivers[0]).toBe(tracker);
    });

    test('calls the callback by its own `apply`, as the libraries which call callbacks by `apply()`', () => {
        const calls: unknown[] = [];
        const receiver = {};
        const withOwnApply = Object.assign(() => {
            calls.push('callback');
        }, {
            apply(this: unknown, thisArg: unknown, args: unknown[]) {
                calls.push('own apply', this === withOwnApply, thisArg, args);
            },
        });
        runProtected(withOwnApply, ['a'], receiver);
        expect(calls).toEqual(['own apply', true, receiver, ['a']]);
        expect(calls[2]).toBe(receiver);

        // `apply()` of the library throws then, which is caught
        const withoutApply = Object.assign(() => {
            calls.push('not called');
        }, { apply: null });
        expect(() => runProtected(withoutApply, [])).not.toThrow();
        expect(calls).not.toContain('not called');
    });

    test('returns nothing, also if the callback returns a value', () => {
        expect(runProtected(() => 'value', [])).toBeUndefined();
        expect(runProtected(() => 'value', [], {})).toBeUndefined();
    });

    test('catches errors of the callback, also of thrown non-errors', () => {
        expect(() => runProtected(() => {
            throw new Error('page error');
        }, [])).not.toThrow();
        expect(() => runProtected(() => {
            // pages may throw any value
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw null;
        }, [])).not.toThrow();
    });

    test('ignores values which are not functions', () => {
        [undefined, null, 1, 'callback', {}, []].forEach((value) => {
            expect(() => runProtected(value, [])).not.toThrow();
        });
    });
});
