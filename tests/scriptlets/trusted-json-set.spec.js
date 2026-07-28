/* eslint-disable no-underscore-dangle */
import {
    beforeEach,
    afterEach,
    describe,
    test,
    expect,
    vi,
} from 'vitest';

import { trustedJsonSet } from '../../src/scriptlets/trusted-json-set';
import { clearGlobalProps } from '../helpers';

const nativeStringify = JSON.stringify;
const nativeParse = JSON.parse;
const NativeDate = Date;

// Number of nodes matched by a wildcard path in the payload
const NODES_COUNT = 100;

/**
 * Replaces global `Date` with the one which returns a time
 * one millisecond later on every `new Date()` call.
 *
 * It makes the value resolved for every matched node clearly distinguishable
 * from the value resolved once for the whole payload.
 */
const installTickingDate = () => {
    let tick = 0;
    window.Date = class TickingDate extends NativeDate {
        constructor(...args) {
            if (args.length === 0) {
                super(NativeDate.parse('2026-07-28T12:10:00.000Z') + tick);
                tick += 1;
                return;
            }
            super(...args);
        }
    };
};

// Time of the scriptlet run, i.e. when the method is intercepted
const SCRIPTLET_RUN_TIME = '2026-07-28T12:00:00.000Z';
// Time of the first interception, 10 minutes after the scriptlet run
const FIRST_RESPONSE_TIME = '2026-07-28T12:10:00.000Z';
// Time of the second interception, 20 minutes after the scriptlet run
const SECOND_RESPONSE_TIME = '2026-07-28T12:20:00.000Z';

const sourceParams = {
    name: 'trusted-json-set',
    verbose: true,
};

beforeEach(() => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
    // Mocking console.trace() because it causes noisy output in tests
    window.console.trace = vi.fn();
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
    window.Date = NativeDate;
    JSON.stringify = nativeStringify;
    JSON.parse = nativeParse;
    clearGlobalProps('hit', '__debug');
});

/**
 * Runs the intercepted method at the given time and returns the modified object.
 *
 * @param {string} time ISO time to set as the current one
 * @returns {object} parsed result of the intercepted 'JSON.stringify' call
 */
const stringifyAt = (time) => {
    vi.setSystemTime(new Date(time));
    return nativeParse(JSON.stringify({ data: { time: 0 } }));
};

// https://github.com/AdguardTeam/Scriptlets/issues/573
describe('Test trusted-json-set time keywords are not frozen', () => {
    test('legacy mode resolves $now$ on every interception', () => {
        vi.setSystemTime(new Date(SCRIPTLET_RUN_TIME));
        trustedJsonSet(sourceParams, 'JSON.stringify', 'data.time', '$now$');

        const firstResult = stringifyAt(FIRST_RESPONSE_TIME);
        const secondResult = stringifyAt(SECOND_RESPONSE_TIME);

        // Time of the interception is set, not the time of the scriptlet run
        expect(firstResult.data.time).toBe(Date.parse(FIRST_RESPONSE_TIME));
        expect(secondResult.data.time).toBe(Date.parse(SECOND_RESPONSE_TIME));
    });

    test('jsonpath mode resolves $now$ on every interception', () => {
        vi.setSystemTime(new Date(SCRIPTLET_RUN_TIME));
        trustedJsonSet(sourceParams, 'JSON.stringify', '$.data.time', '$now$', '', 'result', '', 'jsonpath');

        const firstResult = stringifyAt(FIRST_RESPONSE_TIME);
        const secondResult = stringifyAt(SECOND_RESPONSE_TIME);

        expect(firstResult.data.time).toBe(Date.parse(FIRST_RESPONSE_TIME));
        expect(secondResult.data.time).toBe(Date.parse(SECOND_RESPONSE_TIME));
    });

    test('legacy mode resolves keywords inside json: value on every interception', () => {
        vi.setSystemTime(new Date(SCRIPTLET_RUN_TIME));
        trustedJsonSet(
            sourceParams,
            'JSON.stringify',
            'data',
            'json:{"count":1,"firstTime":$now$,"date":"$currentISODate$"}',
        );

        const firstResult = stringifyAt(FIRST_RESPONSE_TIME);
        const secondResult = stringifyAt(SECOND_RESPONSE_TIME);

        expect(firstResult.data.count).toBe(1);
        expect(firstResult.data.firstTime).toBe(Date.parse(FIRST_RESPONSE_TIME));
        expect(firstResult.data.date).toBe(FIRST_RESPONSE_TIME);
        expect(secondResult.data.firstTime).toBe(Date.parse(SECOND_RESPONSE_TIME));
        expect(secondResult.data.date).toBe(SECOND_RESPONSE_TIME);
    });

    test('legacy mode resolves keywords inside replace: value on every interception', () => {
        vi.setSystemTime(new Date(SCRIPTLET_RUN_TIME));
        trustedJsonSet(sourceParams, 'JSON.stringify', 'data.time', 'replace:/^0$/$now$/');

        vi.setSystemTime(new Date(FIRST_RESPONSE_TIME));
        const firstResult = nativeParse(JSON.stringify({ data: { time: '0' } }));
        vi.setSystemTime(new Date(SECOND_RESPONSE_TIME));
        const secondResult = nativeParse(JSON.stringify({ data: { time: '0' } }));

        expect(firstResult.data.time).toBe(`${Date.parse(FIRST_RESPONSE_TIME)}`);
        expect(secondResult.data.time).toBe(`${Date.parse(SECOND_RESPONSE_TIME)}`);
    });

    test.each([
        { mode: '', propsPath: 'items.*.time', modeName: 'legacy' },
        { mode: 'jsonpath', propsPath: '$.items.*.time', modeName: 'jsonpath' },
    ])('$modeName mode sets the same time for every node matched by a wildcard path', ({ mode, propsPath }) => {
        // Ticking date is used instead of the fake timers
        // because a frozen time cannot reveal the value being resolved for every matched node
        vi.useRealTimers();
        installTickingDate();

        trustedJsonSet(sourceParams, 'JSON.stringify', propsPath, '$now$', '', 'result', '', mode);

        const items = {};
        for (let i = 0; i < NODES_COUNT; i += 1) {
            items[`item${i}`] = { time: 0 };
        }
        const result = nativeParse(JSON.stringify({ items }));

        const setTimes = Object.keys(result.items).map((key) => result.items[key].time);
        expect(setTimes).toHaveLength(NODES_COUNT);
        // All the matched nodes are set to the very same time,
        // i.e. the value is resolved once per payload, not once per matched node
        expect(new Set(setTimes).size).toBe(1);
    });

    test.each([
        // no keywords at all
        'replace:/foo/bar/',
        // keyword in the regexp part only, it is not resolved, so "Date" is not needed
        'replace:/$now$/hidden/',
    ])('scriptlet works with a broken "Date" for %s value', (argumentValue) => {
        vi.useRealTimers();
        // Website may override "Date" with a non-constructable implementation
        window.Date = () => {
            throw new Error('Date is not available');
        };

        trustedJsonSet(sourceParams, 'JSON.stringify', 'data.time', argumentValue);

        const result = nativeParse(JSON.stringify({ data: { time: 'foo' } }));

        // Scriptlet has been initialized and the interception works
        expect(result.data.time).toBe(argumentValue === 'replace:/foo/bar/' ? 'bar' : 'foo');
    });

    test('legacy mode sets the same value for a value without keywords', () => {
        vi.setSystemTime(new Date(SCRIPTLET_RUN_TIME));
        trustedJsonSet(sourceParams, 'JSON.stringify', 'data.time', '42');

        const firstResult = stringifyAt(FIRST_RESPONSE_TIME);
        const secondResult = stringifyAt(SECOND_RESPONSE_TIME);

        expect(firstResult.data.time).toBe(42);
        expect(secondResult.data.time).toBe(42);
    });
});
