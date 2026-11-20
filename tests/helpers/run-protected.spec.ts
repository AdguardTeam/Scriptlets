import { describe, expect, test } from 'vitest';

import { runProtected } from '../../src/helpers/run-protected';

describe('runProtected', () => {
    test('calls the callback with the arguments', () => {
        const calls: unknown[][] = [];
        runProtected((...args: unknown[]) => calls.push(args), [1, 'two', { three: 3 }]);
        expect(calls).toEqual([[1, 'two', { three: 3 }]]);
    });

    test('calls the callback without a receiver', () => {
        let receiver: unknown = 'not called';
        runProtected(function callback(this: unknown) {
            receiver = this;
        }, []);
        // `null` in strict code; `globalThis` in sloppy code, as for any call without a receiver
        expect(receiver === null || receiver === undefined || receiver === globalThis).toBe(true);
    });

    test('returns nothing, also if the callback returns a value', () => {
        expect(runProtected(() => 'value', [])).toBeUndefined();
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
