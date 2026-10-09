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
import { clearGlobalProps, useFirefoxStackTraceFormat } from '../helpers';

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

// https://github.com/AdguardTeam/Scriptlets/issues/585
describe('Test trusted-json-set with promise results', () => {
    beforeEach(() => {
        vi.useRealTimers();
    });

    afterEach(() => {
        clearGlobalProps('getPayload');
    });

    test('keeps a thenable result which is not a promise synchronous', () => {
        const then = vi.fn();
        window.getPayload = () => ({ ads: { enabled: true }, then });
        trustedJsonSet(sourceParams, 'window.getPayload', 'ads.enabled', 'false');

        const result = window.getPayload();

        expect(result.ads.enabled).toBe(false);
        expect(then).not.toHaveBeenCalled();
    });

    test('uses native "then" instead of the one replaced on the promise by the page', async () => {
        const replacedThen = vi.fn();
        let returnedPromise;
        window.getPayload = () => {
            returnedPromise = Promise.resolve({ ads: { enabled: true } });
            returnedPromise.then = replacedThen;
            return returnedPromise;
        };
        trustedJsonSet(sourceParams, 'window.getPayload', 'ads.enabled', 'false');

        const promise = window.getPayload();

        expect(promise).not.toBe(returnedPromise);
        expect(replacedThen).not.toHaveBeenCalled();
        expect(await promise).toEqual({ ads: { enabled: false } });
    });

    test('returns an object which only inherits from Promise.prototype unchanged', () => {
        const fakePromise = Object.create(Promise.prototype);
        window.getPayload = () => fakePromise;
        trustedJsonSet(sourceParams, 'window.getPayload', 'ads.enabled', 'false');

        const result = window.getPayload();

        expect(result).toBe(fakePromise);
        expect(Object.keys(result)).toEqual([]);
        expect(window.hit).toBeUndefined();
    });

    test('calls the intercepted method once if it throws', () => {
        let shouldThrow = true;
        const target = vi.fn(() => {
            if (shouldThrow) {
                throw new Error('page error');
            }
            return Promise.resolve({ ads: { enabled: true } });
        });
        window.getPayload = target;
        trustedJsonSet(sourceParams, 'window.getPayload', 'ads.enabled', 'false');

        expect(() => window.getPayload()).toThrow('page error');
        expect(target).toHaveBeenCalledTimes(1);

        shouldThrow = false;
        // Matching should not be suspended after the error
        return expect(window.getPayload()).resolves.toEqual({ ads: { enabled: false } });
    });

    test('keeps synchronous result of JSON.parse synchronous', () => {
        trustedJsonSet(sourceParams, 'JSON.parse', 'ads.enabled', 'false');

        const result = JSON.parse('{"ads":{"enabled":true}}');

        expect(result).toEqual({ ads: { enabled: false } });
    });

    test('returns the original promise and logs its value in logging-only mode', async () => {
        const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
        let returnedPromise;
        window.getPayload = () => {
            returnedPromise = Promise.resolve({ ads: { enabled: true } });
            // e.g. a method which the page attaches to its promise
            returnedPromise.json = () => 'json';
            return returnedPromise;
        };
        trustedJsonSet(sourceParams, 'window.getPayload');

        try {
            const promise = window.getPayload();

            expect(promise).toBe(returnedPromise);
            expect(promise.json()).toBe('json');
            expect(await promise).toEqual({ ads: { enabled: true } });
            // Value is logged in the reaction which runs before the one of the caller
            const logs = consoleLog.mock.calls.map((args) => String(args[0]));
            expect(logs.some((log) => log.includes('Original content string of window.getPayload'))).toBe(true);
            expect(logs.some((log) => log.includes('"enabled": true'))).toBe(true);
        } finally {
            consoleLog.mockRestore();
        }
    });

    test('passes rejection of the original promise through in logging-only mode', async () => {
        let returnedPromise;
        window.getPayload = () => {
            returnedPromise = Promise.reject(new Error('network error'));
            return returnedPromise;
        };
        trustedJsonSet(sourceParams, 'window.getPayload');

        const promise = window.getPayload();

        expect(promise).toBe(returnedPromise);
        // Promise of the logging handler is not rejected unhandled, Vitest would fail the run otherwise
        await expect(promise).rejects.toThrow('network error');
    });
});

describe('Test trusted-json-set with a stack trace which is not a string', () => {
    const nativePrepareStackTrace = Error.prepareStackTrace;

    afterEach(() => {
        Error.prepareStackTrace = nativePrepareStackTrace;
    });

    test('modifies the value without stack', () => {
        trustedJsonSet(sourceParams, 'JSON.parse', 'ads.enabled', 'false');
        // e.g. a library of the page which gets call sites of a stack trace
        Error.prepareStackTrace = (error, callSites) => callSites;

        const result = JSON.parse('{"ads":{"enabled":true}}');

        expect(result).toEqual({ ads: { enabled: false } });
    });

    describe('which cannot be read', () => {
        // Reading `stack` of an error throws if `Error.prepareStackTrace` of the page throws
        const throwingPrepareStackTrace = () => {
            throw new Error('prepareStackTrace error');
        };

        test('modifies the value without stack', () => {
            trustedJsonSet(sourceParams, 'JSON.parse', 'ads.enabled', 'false');

            Error.prepareStackTrace = throwingPrepareStackTrace;
            let result;
            try {
                result = JSON.parse('{"ads":{"enabled":true}}');
            } finally {
                Error.prepareStackTrace = nativePrepareStackTrace;
            }

            expect(result).toEqual({ ads: { enabled: false } });
        });

        test('does not modify the value with stack, as it cannot be matched', () => {
            trustedJsonSet(sourceParams, 'JSON.parse', 'ads.enabled', 'false', '', 'result', 'anyFunction');

            Error.prepareStackTrace = throwingPrepareStackTrace;
            let result;
            try {
                result = JSON.parse('{"ads":{"enabled":true}}');
            } finally {
                Error.prepareStackTrace = nativePrepareStackTrace;
            }

            expect(result).toEqual({ ads: { enabled: true } });
        });
    });
});

describe('Test trusted-json-set stack matching with Firefox stack trace format', () => {
    const nativeResponseJson = Response.prototype.json;
    let restoreStackTraceFormat;

    beforeEach(() => {
        vi.useRealTimers();
        restoreStackTraceFormat = useFirefoxStackTraceFormat();
    });

    afterEach(() => {
        restoreStackTraceFormat();
        Response.prototype.json = nativeResponseJson;
    });

    test.each([
        { mode: '', propsPath: 'ads.enabled', modeName: 'legacy' },
        { mode: 'jsonpath', propsPath: '$.ads.enabled', modeName: 'jsonpath' },
    ])('$modeName mode matches the function which calls the method', ({ mode, propsPath }) => {
        trustedJsonSet(sourceParams, 'JSON.parse', propsPath, 'false', '', 'result', 'parseAdsConfig', mode);

        const parseAdsConfig = () => JSON.parse('{"ads":{"enabled":true}}');
        const parseContent = () => JSON.parse('{"ads":{"enabled":true}}');

        expect(parseAdsConfig()).toEqual({ ads: { enabled: false } });
        expect(parseContent()).toEqual({ ads: { enabled: true } });
    });

    test('matches the function which calls the method returning a promise', async () => {
        trustedJsonSet(sourceParams, 'Response.prototype.json', 'ads.enabled', 'false', '', 'result', 'loadAdsConfig');

        const loadAdsConfig = () => new Response('{"ads":{"enabled":true}}').json();
        const loadContent = () => new Response('{"ads":{"enabled":true}}').json();

        expect(await loadAdsConfig()).toEqual({ ads: { enabled: false } });
        expect(await loadContent()).toEqual({ ads: { enabled: true } });
    });
});
