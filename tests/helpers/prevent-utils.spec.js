import { describe, test, expect } from 'vitest';

import {
    parseRawDelay,
    isPreventionNeeded,
    isValidCallback,
    callbackToString,
} from '../../src/helpers';

describe('isValidCallback', () => {
    test('ordinary function is valid', () => {
        const arrowFn = () => 'test';
        function namedFn() {
            return 'test';
        }
        expect(isValidCallback(arrowFn)).toBe(true);
        expect(isValidCallback(namedFn)).toBe(true);
    });

    test('async, generator and bound functions are valid', () => {
        const asyncFn = async () => 'test';
        function* genFn() {
            yield 'test';
        }
        function plainFn() {
            return 'test';
        }
        const boundFn = plainFn.bind(null);
        expect(isValidCallback(asyncFn)).toBe(true);
        expect(isValidCallback(genFn)).toBe(true);
        expect(isValidCallback(boundFn)).toBe(true);
    });

    test('function with replaced prototype is valid', () => {
        const fn = () => {};
        Object.setPrototypeOf(fn, { foo: 1 });
        expect(isValidCallback(fn)).toBe(true);
    });

    test('function with null prototype is valid', () => {
        const fn = () => {};
        Object.setPrototypeOf(fn, null);
        expect(isValidCallback(fn)).toBe(true);
    });

    test('string is valid', () => {
        expect(isValidCallback('window.test = 1;')).toBe(true);
    });

    test('non-function non-string values are invalid', () => {
        expect(isValidCallback(null)).toBe(false);
        expect(isValidCallback(undefined)).toBe(false);
        expect(isValidCallback(42)).toBe(false);
        expect(isValidCallback({})).toBe(false);
        expect(isValidCallback([])).toBe(false);
    });
});

describe('callbackToString', () => {
    test('returns source text of an ordinary function', () => {
        const fn = () => 'test';
        expect(callbackToString(fn)).toBe("() => 'test'");
    });

    test('returns source text of a function with replaced prototype', () => {
        // eslint-disable-next-line no-console
        const fn = () => console.log('Test');
        Object.setPrototypeOf(fn, { foo: 1 });
        expect(callbackToString(fn)).toBe("() => console.log('Test')");
    });

    test('does not throw for a function with null prototype', () => {
        const fn = () => 'test';
        Object.setPrototypeOf(fn, null);
        expect(callbackToString(fn)).toBe("() => 'test'");
    });

    test('ignores an overridden own toString and returns genuine source', () => {
        const fn = () => 'test';
        fn.toString = () => 'decoy';
        expect(callbackToString(fn)).toBe("() => 'test'");
    });

    test('returns a string callback as is', () => {
        expect(callbackToString('window.test = 1;')).toBe('window.test = 1;');
    });

    test('stringifies primitives', () => {
        expect(callbackToString(42)).toBe('42');
        expect(callbackToString(null)).toBe('null');
        expect(callbackToString(undefined)).toBe('undefined');
    });

    test('does not throw for a null-prototype object', () => {
        expect(callbackToString(Object.create(null))).toBe('[object Object]');
    });
});

describe('isPreventionNeeded with exotic callbacks', () => {
    test('callback with replaced prototype is matched by source text', () => {
        const fn = () => { window.test = 'value'; };
        Object.setPrototypeOf(fn, { foo: 1 });
        expect(isPreventionNeeded({
            callback: fn, delay: 30, matchCallback: 'test', matchDelay: '30',
        })).toBe(true);
    });

    test('callback with null prototype is matched without throwing', () => {
        const fn = () => { window.test = 'value'; };
        Object.setPrototypeOf(fn, null);
        expect(isPreventionNeeded({
            callback: fn, delay: 30, matchCallback: 'test', matchDelay: '30',
        })).toBe(true);
    });

    test('callback with replaced prototype not matching pattern is not prevented', () => {
        const fn = () => { window.other = 'value'; };
        Object.setPrototypeOf(fn, { foo: 1 });
        expect(isPreventionNeeded({
            callback: fn, delay: 30, matchCallback: 'test', matchDelay: '30',
        })).toBe(false);
    });
});

describe('Test parseRawDelay', () => {
    const testCases = [
        {
            actual: 0,
            expected: 0,
        },
        {
            actual: 10,
            expected: 10,
        },
        {
            actual: 10.123,
            expected: 10,
        },
        {
            actual: '0',
            expected: 0,
        },
        {
            actual: '10',
            expected: 10,
        },
        {
            actual: '10.123',
            expected: 10,
        },
        {
            actual: 'string',
            expected: 'string',
        },
        {
            actual: null,
            expected: null,
        },
        {
            actual: undefined,
            expected: undefined,
        },
        {
            actual: false,
            expected: false,
        },
    ];
    test.each(testCases)('$actual -> $expected', ({ actual, expected }) => {
        expect(parseRawDelay(actual)).toStrictEqual(expected);
    });

    test('parsing NaN', () => {
        const actual = NaN;
        expect(parseRawDelay(actual).toString()).toStrictEqual('NaN');
    });
});

describe('isPreventionNeeded with delay ranges', () => {
    const callback = () => { window.test = 'value'; };

    describe('min-max range', () => {
        test('delay within range is prevented', () => {
            expect(isPreventionNeeded({
                callback, delay: 30, matchCallback: '', matchDelay: '20-50',
            })).toBe(true);
        });

        test('delay at min boundary is prevented', () => {
            expect(isPreventionNeeded({
                callback, delay: 20, matchCallback: '', matchDelay: '20-50',
            })).toBe(true);
        });

        test('delay at max boundary is prevented', () => {
            expect(isPreventionNeeded({
                callback, delay: 50, matchCallback: '', matchDelay: '20-50',
            })).toBe(true);
        });

        test('delay below range is not prevented', () => {
            expect(isPreventionNeeded({
                callback, delay: 10, matchCallback: '', matchDelay: '20-50',
            })).toBe(false);
        });

        test('delay above range is not prevented', () => {
            expect(isPreventionNeeded({
                callback, delay: 60, matchCallback: '', matchDelay: '20-50',
            })).toBe(false);
        });
    });

    describe('min- range (open upper bound)', () => {
        test('delay at min is prevented', () => {
            expect(isPreventionNeeded({
                callback, delay: 30, matchCallback: '', matchDelay: '30-',
            })).toBe(true);
        });

        test('delay above min is prevented', () => {
            expect(isPreventionNeeded({
                callback, delay: 100, matchCallback: '', matchDelay: '30-',
            })).toBe(true);
        });

        test('delay below min is not prevented', () => {
            expect(isPreventionNeeded({
                callback, delay: 10, matchCallback: '', matchDelay: '30-',
            })).toBe(false);
        });
    });

    describe('-max range (open lower bound)', () => {
        test('delay at max is prevented', () => {
            expect(isPreventionNeeded({
                callback, delay: 50, matchCallback: '', matchDelay: '-50',
            })).toBe(true);
        });

        test('delay below max is prevented', () => {
            expect(isPreventionNeeded({
                callback, delay: 10, matchCallback: '', matchDelay: '-50',
            })).toBe(true);
        });

        test('delay above max is not prevented', () => {
            expect(isPreventionNeeded({
                callback, delay: 60, matchCallback: '', matchDelay: '-50',
            })).toBe(false);
        });
    });

    describe('inverted range !min-max', () => {
        test('delay within range is NOT prevented', () => {
            expect(isPreventionNeeded({
                callback, delay: 30, matchCallback: '', matchDelay: '!20-50',
            })).toBe(false);
        });

        test('delay outside range is prevented', () => {
            expect(isPreventionNeeded({
                callback, delay: 10, matchCallback: '', matchDelay: '!20-50',
            })).toBe(true);
        });

        test('delay above range is prevented', () => {
            expect(isPreventionNeeded({
                callback, delay: 60, matchCallback: '', matchDelay: '!20-50',
            })).toBe(true);
        });
    });

    describe('range with callback match', () => {
        const testCb = () => { window.test = 'value'; };

        test('callback matches and delay in range — prevented', () => {
            expect(isPreventionNeeded({
                callback: testCb,
                delay: 30,
                matchCallback: 'test',
                matchDelay: '20-50',
            })).toBe(true);
        });

        test('callback matches but delay out of range — not prevented', () => {
            expect(isPreventionNeeded({
                callback: testCb,
                delay: 60,
                matchCallback: 'test',
                matchDelay: '20-50',
            })).toBe(false);
        });

        test('callback does not match — not prevented', () => {
            const otherCb = () => { window.other = 'value'; };
            expect(isPreventionNeeded({
                callback: otherCb,
                delay: 30,
                matchCallback: 'test',
                matchDelay: '20-50',
            })).toBe(false);
        });
    });

    describe('min > max range (unsatisfiable)', () => {
        test('no delay matches when min > max', () => {
            expect(isPreventionNeeded({
                callback, delay: 10, matchCallback: '', matchDelay: '50-20',
            })).toBe(false);
            expect(isPreventionNeeded({
                callback, delay: 30, matchCallback: '', matchDelay: '50-20',
            })).toBe(false);
            expect(isPreventionNeeded({
                callback, delay: 60, matchCallback: '', matchDelay: '50-20',
            })).toBe(false);
        });
    });

    describe('invalid delay values', () => {
        test('invalid range abc-def — not prevented', () => {
            expect(isPreventionNeeded({
                callback, delay: 30, matchCallback: '', matchDelay: 'abc-def',
            })).toBe(false);
        });

        test('invalid range 100-abc — not prevented', () => {
            expect(isPreventionNeeded({
                callback, delay: 130, matchCallback: '', matchDelay: '100-abc',
            })).toBe(false);
        });

        test('invalid range abc-100 — not prevented', () => {
            expect(isPreventionNeeded({
                callback, delay: 10, matchCallback: '', matchDelay: 'abc-100',
            })).toBe(false);
        });

        test('lone dash — not prevented', () => {
            expect(isPreventionNeeded({
                callback, delay: 30, matchCallback: '', matchDelay: '-',
            })).toBe(false);
        });
    });

    describe('decimal delay with range', () => {
        test('decimal delay 30.5 is floored to 30 and matches range', () => {
            expect(isPreventionNeeded({
                callback, delay: 30.5, matchCallback: '', matchDelay: '20-50',
            })).toBe(true);
        });

        test('decimal delay 19.9 is floored to 19 and does not match range', () => {
            expect(isPreventionNeeded({
                callback, delay: 19.9, matchCallback: '', matchDelay: '20-50',
            })).toBe(false);
        });
    });

    describe('negative delay matched by -0', () => {
        test('negative delay is prevented by -0', () => {
            expect(isPreventionNeeded({
                callback, delay: -111, matchCallback: '', matchDelay: '-0',
            })).toBe(true);
        });
    });
});
