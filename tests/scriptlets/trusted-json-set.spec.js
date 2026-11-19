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
import {
    clearGlobalProps,
    countCreatedErrors,
    useFirefoxStackTraceFormat,
    useThrowingErrorConstructor,
    useUnreadableStackTrace,
    useThrowingMethod,
} from '../helpers';

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

describe('Test trusted-json-set with a value which cannot be processed', () => {
    afterEach(() => {
        clearGlobalProps('getPayload');
    });

    test('returns the string unchanged without processing it again as line-delimited JSON', () => {
        const PAYLOAD = '{"ads":{"enabled":true}}';
        window.getPayload = () => PAYLOAD;
        // Saved by the scriptlet when it runs, so the modified value cannot be serialized
        JSON.stringify = () => {
            throw new Error('Value cannot be serialized');
        };
        const parse = vi.fn(nativeParse);
        JSON.parse = parse;
        trustedJsonSet(sourceParams, 'window.getPayload', 'ads.enabled', 'false');

        const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
        let result;
        try {
            result = window.getPayload();
        } finally {
            consoleLog.mockRestore();
        }

        expect(result).toBe(PAYLOAD);
        expect(parse.mock.calls.filter((args) => args[0] === PAYLOAD)).toHaveLength(1);
    });

    test('logs a value without a message thrown while it is modified', () => {
        window.getPayload = () => '{"ads":{"enabled":true}}';
        // Saved by the scriptlet when it runs, e.g. as `toJSON()` of the page throws `null`
        JSON.stringify = () => {
            // eslint-disable-next-line no-throw-literal
            throw null;
        };
        trustedJsonSet(sourceParams, 'window.getPayload', 'ads.enabled', 'false');

        const logs = [];
        const consoleLog = vi.spyOn(console, 'log').mockImplementation((message) => {
            logs.push(String(message));
        });
        try {
            window.getPayload();
        } finally {
            consoleLog.mockRestore();
        }

        expect(logs).toContain('trusted-json-set: Error during setting the result value: null');
    });

    test('logs a value without a message thrown while it is logged', () => {
        window.getPayload = () => ({
            ads: { enabled: true },
            toJSON: () => {
                // eslint-disable-next-line no-throw-literal
                throw null;
            },
        });
        trustedJsonSet(sourceParams, 'window.getPayload');

        const logs = [];
        const consoleLog = vi.spyOn(console, 'log').mockImplementation((message) => {
            logs.push(String(message));
        });
        try {
            window.getPayload();
        } finally {
            consoleLog.mockRestore();
        }

        expect(logs).toContain('trusted-json-set: Error during setting the result value: null');
    });

    test('modifies an object with verbose if its toJSON() throws while it is logged', () => {
        window.getPayload = () => ({
            ads: { enabled: true },
            toJSON: () => {
                throw new Error('Value cannot be serialized');
            },
        });
        trustedJsonSet(sourceParams, 'window.getPayload', 'ads.enabled', 'false', '', 'result', '', '', 'true');

        const logs = [];
        const consoleLog = vi.spyOn(console, 'log').mockImplementation((message) => {
            logs.push(String(message));
        });
        let result;
        try {
            result = window.getPayload();
        } finally {
            consoleLog.mockRestore();
        }

        expect(result.ads).toEqual({ enabled: false });
        expect(logs.some((log) => log.includes('Content cannot be serialized: Value cannot be serialized'))).toBe(true);
    });

    test('modifies a string with verbose if its content cannot be serialized to be logged', () => {
        window.getPayload = () => '{"ads":{"enabled":true}}';
        // Saved by the scriptlet when it runs, so the content cannot be serialized only to be logged,
        // e.g. as it is too deeply nested for `JSON.stringify()` with indentation
        JSON.stringify = function stringify(...args) {
            if (args[2] !== undefined) {
                throw new Error('Value cannot be serialized');
            }
            return Reflect.apply(nativeStringify, this, args);
        };
        trustedJsonSet(sourceParams, 'window.getPayload', 'ads.enabled', 'false', '', 'result', '', '', 'true');

        const logs = [];
        const consoleLog = vi.spyOn(console, 'log').mockImplementation((message) => {
            logs.push(String(message));
        });
        let result;
        try {
            result = window.getPayload();
        } finally {
            consoleLog.mockRestore();
        }

        expect(result).toBe('{"ads":{"enabled":false}}');
        expect(logs.some((log) => log.includes('Content cannot be serialized: Value cannot be serialized'))).toBe(true);
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

    describe.each([
        // e.g. by `Error.prepareStackTrace` of the page which throws
        { failure: 'cannot be read', useStackTraceFailure: useUnreadableStackTrace },
        // as the page has replaced `Error` with a constructor which throws
        { failure: 'cannot be created', useStackTraceFailure: useThrowingErrorConstructor },
    ])('which $failure', ({ useStackTraceFailure }) => {
        // Rules with stack are not applied, as it cannot be matched
        test.each([
            { propsPath: 'ads.enabled', stack: '', isModified: true },
            { propsPath: 'ads.enabled', stack: 'anyFunction', isModified: false },
            { propsPath: '$.ads.enabled', stack: '', isModified: true },
            { propsPath: '$.ads.enabled', stack: 'anyFunction', isModified: false },
        ])('path $propsPath with stack $stack modifies the value: $isModified', ({ propsPath, stack, isModified }) => {
            trustedJsonSet(sourceParams, 'JSON.parse', propsPath, 'false', '', 'result', stack);

            const restoreStackTrace = useStackTraceFailure();
            let result;
            try {
                result = JSON.parse('{"ads":{"enabled":true}}');
            } finally {
                restoreStackTrace();
            }

            expect(result).toEqual({ ads: { enabled: !isModified } });
        });
    });
});

describe('Test trusted-json-set stack trace reads', () => {
    test.each([
        { rule: 'without stack and logging', args: ['ads.enabled', 'false'], errorsCount: 0 },
        { rule: 'without stack and logging — JSONPath', args: ['$.ads.enabled', 'false'], errorsCount: 0 },
        { rule: 'with stack', args: ['ads.enabled', 'false', '', 'result', 'anyFunction'], errorsCount: 1 },
        { rule: 'in logging-only mode', args: [], errorsCount: 1 },
        { rule: 'with verbose', args: ['ads.enabled', 'false', '', 'result', '', '', 'true'], errorsCount: 1 },
    ])('creates the error for the stack trace only if it is needed — $rule', ({ args, errorsCount }) => {
        trustedJsonSet(sourceParams, 'JSON.parse', ...args);
        const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

        let createdErrorsCount;
        try {
            createdErrorsCount = countCreatedErrors(() => JSON.parse('{"ads":{"enabled":true}}'));
        } finally {
            consoleLog.mockRestore();
        }

        expect(createdErrorsCount).toBe(errorsCount);
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

describe('Test trusted-json-set with matches', () => {
    afterEach(() => {
        clearGlobalProps('getPayload');
    });

    /**
     * Runs the rule for `window.getPayload()`, which returns its argument, and returns the results for the values.
     *
     * @param {string[]} extraArgs Arguments after `verbose`.
     * @param {any[]} values Values returned by `window.getPayload()`.
     * @returns {{ results: any[], logs: string[] }} Results of the calls and logged messages.
     */
    const runWithValues = (extraArgs, values) => {
        window.getPayload = (value) => value;
        const logs = [];
        const consoleLog = vi.spyOn(console, 'log').mockImplementation((...args) => {
            logs.push(args.map(String).join(' '));
        });
        try {
            trustedJsonSet(sourceParams, 'window.getPayload', '$.ads', 'false', '', 'result', '', '', '', ...extraArgs);
            return { results: values.map((value) => window.getPayload(value)), logs };
        } finally {
            consoleLog.mockRestore();
        }
    };

    test('modifies only a string which the pattern matches, and does not parse other ones', () => {
        const parse = vi.fn(nativeParse);
        JSON.parse = parse;
        const { results } = runWithValues(
            ['matches', '"adPlacements"'],
            ['{"ads":true,"adPlacements":[]}', '{"ads":true}'],
        );

        expect(results).toEqual(['{"ads":false,"adPlacements":[]}', '{"ads":true}']);
        expect(parse.mock.calls.filter((args) => args[0] === '{"ads":true}')).toHaveLength(0);
    });

    test('matches a regular expression with its flags', () => {
        const { results } = runWithValues(['matches', '/"ADS":\\s*true/i'], ['{"ads": true}', '{"ads": 1}']);

        expect(results).toEqual(['{"ads":false}', '{"ads": 1}']);
    });

    test('does not modify a value which is not a string, as it has no text to test', () => {
        const value = { ads: true };
        const { results } = runWithValues(['matches', 'ads'], [value]);

        expect(results[0]).toBe(value);
        expect(value).toEqual({ ads: true });
    });

    test('modifies every value with an empty pattern', () => {
        const { results } = runWithValues(['matches', ''], ['{"ads":true}', { ads: true }]);

        expect(results).toEqual(['{"ads":false}', { ads: false }]);
    });

    test('is not applied with an invalid regular expression, which is logged', () => {
        const { results, logs } = runWithValues(['matches', '/[/'], ['{"ads":true}', { ads: true }]);

        expect(results).toEqual(['{"ads":true}', { ads: true }]);
        expect(logs).toEqual([expect.stringContaining('Invalid matches: /[/')]);
    });
});

describe('Test trusted-json-set with a string which is not JSON', () => {
    afterEach(() => {
        clearGlobalProps('getPayload');
    });

    test('returns a string without an object or an array unchanged, without a log', () => {
        window.getPayload = () => 'Ordinary text';
        trustedJsonSet(sourceParams, 'window.getPayload', '$.ads', 'false', '', 'result', '', '', 'true');

        const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
        let result;
        try {
            result = window.getPayload();
            expect(consoleLog).not.toHaveBeenCalled();
        } finally {
            consoleLog.mockRestore();
        }

        expect(result).toBe('Ordinary text');
    });
});

describe('Test trusted-json-set with targets of matches', () => {
    afterEach(() => {
        clearGlobalProps('getPayload');
    });

    /**
     * Runs a rule which sets `ads` to `false`, with `matches`.
     *
     * @param {string} methodPath Intercepted method.
     * @param {string} jsonSource Where the value is modified.
     * @param {string} option Name of the option, e.g. `matches this`.
     * @param {string} pattern Pattern of the option.
     * @param {string} [stack] Stack trace which has to match.
     */
    const runRule = (methodPath, jsonSource, option, pattern, stack = '') => {
        trustedJsonSet(sourceParams, methodPath, '$.ads', 'false', '', jsonSource, stack, '', '', option, pattern);
    };

    test('matches tests the first argument, e.g. the text of JSON.parse(), and modifies the result', () => {
        runRule('JSON.parse', 'result', 'matches', 'adPlacements');

        expect(JSON.parse('{"ads":true,"adPlacements":[]}')).toEqual({ ads: false, adPlacements: [] });
        expect(JSON.parse('{"ads":true}')).toEqual({ ads: true });
    });

    test('matches arg:N tests that argument', () => {
        window.getPayload = (text, payload) => payload;
        runRule('window.getPayload', 'arg:1', 'matches arg:0', 'ads');

        expect(window.getPayload('ads', '{"ads":true}')).toBe('{"ads":false}');
        expect(window.getPayload('other', '{"ads":true}')).toBe('{"ads":true}');
        // an argument which the call does not have is not matched
        expect(window.getPayload()).toBeUndefined();
    });

    test('matches this tests the text which the method is called on', () => {
        window.getPayload = function getPayload() {
            return nativeParse(this);
        };
        runRule('window.getPayload', 'result', 'matches this', '"ads"');

        // a method of `window` is called with another `this` by call()
        expect(window.getPayload.call('{"ads":true}')).toEqual({ ads: false });
        expect(window.getPayload.call('{"other":true}')).toEqual({ other: true });
    });

    test('matches result tests the result, and the value of a returned promise', async () => {
        window.getPayload = (value) => value;
        runRule('window.getPayload', 'result', 'matches result', 'adSlot');

        expect(window.getPayload('{"ads":true,"adSlot":1}')).toBe('{"ads":false,"adSlot":1}');
        expect(window.getPayload('{"ads":true}')).toBe('{"ads":true}');
        await expect(window.getPayload(Promise.resolve('{"ads":true,"adSlot":1}')))
            .resolves.toBe('{"ads":false,"adSlot":1}');
        await expect(window.getPayload(Promise.resolve('{"ads":true}'))).resolves.toBe('{"ads":true}');
    });

    test('matches result does not modify the arguments, which are passed before the result is known', () => {
        window.getPayload = (value) => `${value} result`;
        runRule('window.getPayload', 'all', 'matches result', 'result');

        expect(window.getPayload('{"ads":true}')).toBe('{"ads":true} result');
    });

    test('a call whose argument is not matched is passed through without reading the stack trace', () => {
        runRule('JSON.parse', 'result', 'matches', 'adPlacements', 'stackMatch');

        expect(countCreatedErrors(() => JSON.parse('{"ads":true}'))).toBe(0);
        expect(countCreatedErrors(() => JSON.parse('{"ads":true,"adPlacements":[]}'))).toBe(1);
    });

    test.each(['matches args', 'matches arg:x'])('%s is not applied, which is logged', (option) => {
        const logs = [];
        const consoleLog = vi.spyOn(console, 'log').mockImplementation((...args) => {
            logs.push(args.map(String).join(' '));
        });
        try {
            runRule('JSON.parse', 'result', option, 'ads');
        } finally {
            consoleLog.mockRestore();
        }

        expect(JSON.parse('{"ads":true}')).toEqual({ ads: true });
        expect(logs).toEqual([expect.stringContaining(`Invalid matches: ${option}`)]);
    });
});

describe('Test trusted-json-set with uBO arguments of trusted-json-edit', () => {
    const uboSource = { name: 'ubo-trusted-json-edit', verbose: true };

    test.each(['ubo-trusted-json-edit', 'ubo-trusted-json-edit.js'])('%s sets a value of the parsed JSON', (name) => {
        // e.g. deezer.com##+js(trusted-json-edit, ..ads_audio=false)
        trustedJsonSet({ name, verbose: true }, '..ads_audio=false');

        expect(JSON.parse('{"user":{"ads_audio":true}}')).toEqual({ user: { ads_audio: false } });
    });

    test('a query without its own value removes what it matches, as in uBO', () => {
        trustedJsonSet(uboSource, '.rules.*[?.name=="Ad Blocker"]');

        expect(JSON.parse('{"rules":[{"name":"Ad Blocker"},{"name":"Paywall"}]}'))
            .toEqual({ rules: [{ name: 'Paywall' }] });
    });

    test('matches tests the text of JSON.parse()', () => {
        trustedJsonSet(uboSource, '$.ads=false', 'matches', '/adPlacements/');

        expect(JSON.parse('{"ads":true,"adPlacements":[]}')).toEqual({ ads: false, adPlacements: [] });
        expect(JSON.parse('{"ads":true}')).toEqual({ ads: true });
    });

    test('other options and positional arguments of AdGuard syntax are ignored, e.g. stack', () => {
        trustedJsonSet(uboSource, '$.ads=false', 'propsToMatch', '/api', 'result', 'neverMatchedStack');

        expect(JSON.parse('{"ads":true}')).toEqual({ ads: false });
    });

    test('an option without its value is ignored, as in uBO, not read as a default of AdGuard syntax', () => {
        // the 4th argument is at the position of `jsonSource`, whose default `result` would be the value of `matches`
        trustedJsonSet(uboSource, '$.ads=false', 'matches', 'adSlot', 'matches');

        expect(JSON.parse('{"ads":true}')).toEqual({ ads: false });
    });

    test('the query is not split, as uBO ignores spaces in it', () => {
        // `$.ads $.b` would be two queries in AdGuard syntax, which would remove `ads`
        trustedJsonSet(uboSource, '$.ads $.b');

        expect(JSON.parse('{"ads":1,"b":2}')).toEqual({ ads: 1, b: 2 });
    });

    test('an empty query is not applied, which is logged', () => {
        const logs = [];
        const consoleLog = vi.spyOn(console, 'log').mockImplementation((...args) => {
            logs.push(args.map(String).join(' '));
        });
        const { parse } = JSON;
        try {
            trustedJsonSet(uboSource, '', 'matches', 'ads');
        } finally {
            consoleLog.mockRestore();
        }

        expect(JSON.parse).toBe(parse);
        expect(logs).toEqual([expect.stringContaining('Bad JSONPath query')]);
    });
});

describe('Test trusted-json-set with matches which calls the intercepted method', () => {
    const nativeIndexOf = String.prototype.indexOf;
    const nativePush = Array.prototype.push;

    afterEach(() => {
        // eslint-disable-next-line no-extend-native
        String.prototype.indexOf = nativeIndexOf;
        // eslint-disable-next-line no-extend-native
        Array.prototype.push = nativePush;
    });

    test('the text is tested while matching is suspended, e.g. by indexOf() of the intercepted method', () => {
        // a string of `matches` is tested by `indexOf()`, which would test it again, until the stack is exceeded
        const rule = ['String.prototype.indexOf', '$.ads', 'false', '', 'this', '', '', '', 'matches this', 'a'];
        trustedJsonSet(sourceParams, ...rule);

        // the matched call is processed, i.e. `this` is modified, while a test without the suspension would exceed
        // the call stack, which is caught as a text which is not matched, so the call would be passed through
        expect('{"ads":true}'.indexOf('false')).toBe(7);
        expect('other'.indexOf('t')).toBe(1);
    });

    test('a regular expression of matches calls no intercepted method, e.g. push() which saves RegExp.$1', () => {
        let pushCalls = 0;
        // eslint-disable-next-line no-extend-native
        Array.prototype.push = function push(...args) {
            pushCalls += 1;
            return Reflect.apply(nativePush, this, args);
        };
        const rule = ['Array.prototype.push', '$.a', 'false', '', 'arg:0', '', '', '', 'matches', '/(a)/'];
        trustedJsonSet(sourceParams, ...rule);

        pushCalls = 0;
        const list = [];
        list.push('a string');
        // read before the assertions, which call push() themselves
        const calls = pushCalls;
        expect(list).toEqual(['a string']);
        expect(calls).toBe(1);
    });
});

describe('Test trusted-json-set with uBO arguments and values which uBO does not modify', () => {
    test('a string which JSON.parse() returns is not parsed again', () => {
        trustedJsonSet({ name: 'ubo-trusted-json-edit', verbose: false }, '..ads');

        // e.g. a JSON text encoded twice, whose outer value is a string without `ads`
        expect(JSON.parse(nativeStringify('{"ads":true}'))).toBe('{"ads":true}');
    });

    test('a uBO rule is applied if RegExp.prototype.test throws while it runs, e.g. of another rule', () => {
        const restoreTest = useThrowingMethod(RegExp.prototype, 'test');
        try {
            trustedJsonSet({ name: 'ubo-trusted-json-edit', verbose: false }, '..ads');
        } finally {
            restoreTest();
        }

        expect(JSON.parse('{"a":{"ads":1,"b":2}}')).toEqual({ a: { b: 2 } });
    });
});
