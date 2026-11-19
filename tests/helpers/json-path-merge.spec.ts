import {
    afterEach,
    describe,
    expect,
    test,
    vi,
} from 'vitest';

import { areJsonPathQueriesValid, jsonPath } from '../../src/helpers/json-path-utils';

const nativeObjects = { nativeParse: JSON.parse, nativeStringify: JSON.stringify };
const adgSource: any = { name: 'trusted-json-set', args: [], verbose: false };
const uboSource: any = { name: 'ubo-trusted-json-edit', args: [], verbose: false };

/**
 * Applies a query, and returns the result and how many times it has modified the value.
 *
 * @param query JSONPath query.
 * @param root Value to modify.
 * @param source Source of the scriptlet, AdGuard by default.
 * @returns Result and count of modifications.
 */
const run = (query: string, root: any, source: any = adgSource) => {
    let mutationCount = 0;
    const result = jsonPath(source, root, [query], nativeObjects, () => {
        mutationCount += 1;
    });
    return { result, mutationCount };
};

describe('`+=` merges as uBO, in place, for all names', () => {
    test.each([
        { name: 'AdGuard', source: adgSource },
        { name: 'uBO', source: uboSource },
    ])('$name: an object into an object, in place', ({ source }) => {
        const config = { a: 1, nested: { b: 2 } };
        const root = { config };
        const { result, mutationCount } = run('$.config+={"c":3,"nested":{"d":4}}', root, source);

        expect(result.config).toBe(config);
        // properties are assigned, not merged deeply, as by uBO
        expect(config).toEqual({ a: 1, nested: { d: 4 }, c: 3 });
        expect(mutationCount).toBe(1);
    });

    test('items of an array value into an array, and an object value as an item, in place', () => {
        const list = [1];
        const root = { list };
        run('$.list+=[2,3]', root);
        run('$.list+={"id":4}', root);

        expect(root.list).toBe(list);
        expect(list).toEqual([1, 2, 3, { id: 4 }]);
    });

    test('an array value into an object assigns its indexes, as Object.entries() of uBO', () => {
        const root = { o: { a: 1 } };
        run('$.o+=["x","y"]', root);

        expect(root.o).toEqual({ a: 1, 0: 'x', 1: 'y' });
    });

    // e.g. divicast.watch##+js(trusted-json-edit-fetch-response, $+={"ads_suppressed":true}, …)
    test('the root', () => {
        const root = { ads_mode: 1 };
        const { result, mutationCount } = run('$+={"ads_suppressed":true}', root, uboSource);

        expect(result).toBe(root);
        expect(root).toEqual({ ads_mode: 1, ads_suppressed: true });
        // counted, so e.g. a fetch rule returns the modified response, not the original one
        expect(mutationCount).toBe(1);
    });

    test.each([
        { query: '$.s+="!"', root: { s: 'a' } },
        { query: '$.n+={"a":1}', root: { n: 5 } },
        { query: '$.b+={"a":1}', root: { b: true } },
        { query: '$.z+={"a":1}', root: { z: null } },
        { query: '$.missing+={"a":1}', root: { other: 1 } },
        // a value which is not an object changes nothing
        { query: '$.o+=5', root: { o: { a: 1 } } },
        { query: '$.list+="x"', root: { list: [1] } },
    ])('$query changes nothing, as uBO', ({ query, root }) => {
        const before = JSON.parse(JSON.stringify(root));
        const { result, mutationCount } = run(query, root);

        expect(result).toEqual(before);
        expect(mutationCount).toBe(0);
    });

    test('assigns nothing to the matched property, so its setter is not called, as uBO', () => {
        const config = { a: 1 };
        const setter = vi.fn();
        const root = {};
        Object.defineProperty(root, 'config', { get: () => config, set: setter, enumerable: true });
        const { mutationCount } = run('$.config+={"b":2}', root);

        expect(config).toEqual({ a: 1, b: 2 });
        expect(setter).not.toHaveBeenCalled();
        expect(mutationCount).toBe(1);
    });

    test('adds items to an array of the page by index, not by push(), which a rule may intercept', () => {
        const nativePush = Array.prototype.push;
        const root = { list: [1] };
        let pushesOfList = 0;
        // a plain wrapper, as a mock would record its calls by push() itself
        // eslint-disable-next-line no-extend-native
        Array.prototype.push = function push(...args) {
            if (this === root.list) {
                pushesOfList += 1;
            }
            return Reflect.apply(nativePush, this, args);
        };
        try {
            run('$.list+=[2]', root);
        } finally {
            // eslint-disable-next-line no-extend-native
            Array.prototype.push = nativePush;
        }

        expect(root.list).toEqual([1, 2]);
        expect(pushesOfList).toBe(0);
    });

    // uBO applies the matched nodes from the last one, see `apply()` of
    // https://github.com/gorhill/uBlock/blob/master/src/js/jsonpath.js
    test.each([
        { name: 'AdGuard', source: adgSource },
        { name: 'uBO', source: uboSource },
    ])('$name: a node is merged before the nodes which contain it, as by uBO, so nothing is circular', ({ source }) => {
        const root = JSON.parse('{"config":{"config":{"old":1}}}');
        const { result, mutationCount } = run('..config+={"config":{"active":true}}', root, source);

        // the inner `config` gets `config` of the value first, and then the outer one gets it instead of the inner one,
        // while the outer one merged first would put the value into the inner one, which would get it from itself
        expect(JSON.stringify(result)).toBe('{"config":{"config":{"active":true}}}');
        expect(mutationCount).toBe(1);
    });
});

describe('`++=` is the previous `+=` of AdGuard rules', () => {
    test('merges an object into a new object, and an array into a new array', () => {
        const config = { a: 1 };
        const list = [1];
        const root = { config, list };
        run('$.config++={"b":2}', root);
        run('$.list++=[2]', root);

        expect(root.config).not.toBe(config);
        expect(root).toEqual({ config: { a: 1, b: 2 }, list: [1, 2] });
        expect(config).toEqual({ a: 1 });
        expect(list).toEqual([1]);
    });

    test.each([
        { query: '$.s++=!', root: { s: 'a' }, expected: { s: 'a!' } },
        { query: '$.n++=5', root: { n: 1 }, expected: { n: 5 } },
        { query: '$.z++={"a":1}', root: { z: null }, expected: { z: { a: 1 } } },
    ])('$query joins strings and replaces other values, as before', ({ query, root, expected }) => {
        expect(run(query, root).result).toEqual(expected);
    });

    test('`++=` is not `+=` of a key which ends with `+`, which needs brackets then', () => {
        expect(run('$.a++={"b":1}', { a: {} }).result).toEqual({ a: { b: 1 } });
        expect(run('$["a+"]+={"b":1}', { 'a+': {} }).result).toEqual({ 'a+': { b: 1 } });
    });
});

describe('values of uBO rules are JSON', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test.each([
        // chatgpt.com##+js(trusted-json-edit, [?.type=="ads"].visibility.status="hidden")
        { query: '$.status="hidden"', expected: 'hidden' },
        // cwtv.com##+js(trusted-json-edit-xhr-response, ..ads_enabled="0", …)
        { query: '$.status="0"', expected: '0' },
        { query: '$.status=0', expected: 0 },
        { query: '$.status=false', expected: false },
        { query: '$.status=null', expected: null },
        // open.spotify.com##+js(trusted-json-edit-fetch-response, '.cdnurl=["data:video/mp4;…"]', …)
        { query: '$.status=["a","b"]', expected: ['a', 'b'] },
        // idlixku.com##+js(trusted-json-edit-fetch-response, '.ads={"movie":false,…}', …)
        { query: '$.status={"movie":false}', expected: { movie: false } },
    ])('$query sets $expected', ({ query, expected }) => {
        expect(run(query, { status: 'shown' }, uboSource).result).toEqual({ status: expected });
    });

    test.each([
        '$.status=hidden',
        '$.status=emptyObj',
        '$.status=$now$',
        '$.status=',
        '$.list+=emptyArr',
        '$.list++=hidden',
    ])('%s is not applied, as its value is not JSON', (query) => {
        const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
        const root = { status: 'shown', list: [1] };
        const { result, mutationCount } = run(query, root, { name: 'ubo-trusted-json-edit', verbose: true });

        expect(result).toEqual({ status: 'shown', list: [1] });
        expect(mutationCount).toBe(0);
        expect(consoleLog.mock.calls.flat().join('\n')).toContain('the value is not JSON');
    });

    test('of AdGuard rules are texts and constants, as before', () => {
        expect(run('$.status=hidden', { status: 'shown' }).result).toEqual({ status: 'hidden' });
        expect(run('$.status="hidden"', { status: 'shown' }).result).toEqual({ status: '"hidden"' });
        expect(run('$.status=emptyObj', { status: 'shown' }).result).toEqual({ status: {} });
    });

    /* eslint-disable no-template-curly-in-string */
    test('${now} of a string value is replaced by the current time when it is set, as by uBO', () => {
        vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

        // only the first one, as uBO replaces it by `String.prototype.replace()` of a text
        expect(run('$.t="${now} ${now}"', { t: 0 }, uboSource).result).toEqual({ t: '1700000000000 ${now}' });
        // AdGuard rules have time keywords instead, e.g. `$now$`
        expect(run('$.t="${now}"', { t: 0 }).result).toEqual({ t: '"${now}"' });
    });
    /* eslint-enable no-template-curly-in-string */

    test('areJsonPathQueriesValid() rejects a value which is not JSON, logged once, as it is cached', () => {
        const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
        const invalidCache = Object.create(null);
        const verboseUboSource: any = { name: 'ubo-trusted-json-edit', args: [], verbose: true };

        expect(areJsonPathQueriesValid(verboseUboSource, ['$.status=hidden'], nativeObjects, invalidCache)).toBe(false);
        expect(invalidCache['$.status=hidden']).toBeNull();
        expect(areJsonPathQueriesValid(verboseUboSource, ['$.status=hidden'], nativeObjects, invalidCache)).toBe(false);
        const errors = consoleLog.mock.calls.flat().filter((log) => String(log).includes('not JSON: hidden'));
        expect(errors).toHaveLength(1);

        // a valid query is parsed into the cache, from which the processed values use it
        const validCache = Object.create(null);
        expect(areJsonPathQueriesValid(uboSource, ['$.status="hidden"'], nativeObjects, validCache)).toBe(true);
        expect(validCache['$.status="hidden"']).toBeTruthy();
        const root = { status: 'shown' };
        jsonPath(uboSource, root, ['$.status="hidden"'], nativeObjects, undefined, '', false, validCache);
        expect(root).toEqual({ status: 'hidden' });

        // a text value of AdGuard rules is valid, as before
        expect(areJsonPathQueriesValid(adgSource, ['$.status=hidden'], nativeObjects, Object.create(null))).toBe(true);
    });

    test.each([
        // a trailing comma
        '$.title=repl({"pattern":"ads",})',
        // neither `regex` nor `pattern`
        '$.title=repl({"replacement":"x"})',
        // eslint-disable-next-line no-template-curly-in-string
        '$.ads=call(["${obj}",])',
    ])('%s of a uBO rule is rejected when it is parsed, as its payload is invalid', (query) => {
        const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
        const cache = Object.create(null);
        const verboseUboSource: any = { name: 'ubo-trusted-json-edit', args: [], verbose: true };

        expect(areJsonPathQueriesValid(verboseUboSource, [query], nativeObjects, cache)).toBe(false);
        expect(cache[query]).toBeNull();
        expect(consoleLog.mock.calls.flat().join('\n')).toContain('the payload is invalid');
        // checked when the mutation is built for AdGuard rules, as before
        expect(areJsonPathQueriesValid(adgSource, [query], nativeObjects, Object.create(null))).toBe(true);
    });

    test('repl(), call() and $remove$ are not parsed as JSON', () => {
        const replRoot = { s: 'ads' };
        run('$.s=repl({"pattern":"ads","replacement":"no"})', replRoot, uboSource);
        expect(replRoot).toEqual({ s: 'no' });

        const removeRoot = { ads: 1, keep: 1 };
        expect(run('$.ads=$remove$', removeRoot, uboSource).result).toEqual({ keep: 1 });
    });
});

/**
 * Side by side: the same document with `+=`, which merges as uBO does, and `++=`, which is `+=` of previous
 * versions. When to use which:
 * - `+=` changes only what is already an object or an array, and in place, so it is safe for a path
 *   which sometimes holds another value, e.g. `null` before a config is loaded, and the page sees the change
 *   through every reference to the object, e.g. a config which it has saved before;
 * - `++=` also joins texts, e.g. a suffix of a title, and replaces other values, e.g. `null` by an object,
 *   and puts a new merged object or array, so other references to the old one, e.g. in another part
 *   of a document of the page, are not changed.
 */
describe('difference between `+=` and `++=`', () => {
    test.each([
        {
            what: 'an object merged into an object',
            plus: '$.config+={"ads":false}',
            plusPlus: '$.config++={"ads":false}',
            root: () => ({ config: { id: 1 } }),
            // same content
            expectedPlus: { config: { id: 1, ads: false } },
            expectedPlusPlus: { config: { id: 1, ads: false } },
        },
        {
            what: 'items added to an array',
            plus: '$.list+=[2,3]',
            plusPlus: '$.list++=[2,3]',
            root: () => ({ list: [1] }),
            // same content
            expectedPlus: { list: [1, 2, 3] },
            expectedPlusPlus: { list: [1, 2, 3] },
        },
        {
            what: 'a text added to a text, e.g. a suffix of a title',
            plus: '$.title+=" (ad)"',
            plusPlus: '$.title++=(ad)',
            root: () => ({ title: 'News' }),
            // `+=` changes only objects and arrays, while `++=` joins texts
            expectedPlus: { title: 'News' },
            expectedPlusPlus: { title: 'News(ad)' },
        },
        {
            what: 'an object for a value which is null, e.g. before the page has loaded it',
            plus: '$.config+={"ads":false}',
            plusPlus: '$.config++={"ads":false}',
            root: () => ({ config: null }),
            // `+=` leaves it, while `++=` replaces it by the object
            expectedPlus: { config: null },
            expectedPlusPlus: { config: { ads: false } },
        },
        {
            what: 'a number which is not an object or an array',
            plus: '$.count+=5',
            plusPlus: '$.count++=5',
            root: () => ({ count: 1 }),
            // `+=` leaves it, while `++=` replaces it
            expectedPlus: { count: 1 },
            expectedPlusPlus: { count: 5 },
        },
        {
            what: 'a text added to an array',
            plus: '$.list+="x"',
            plusPlus: '$.list++=x',
            root: () => ({ list: [1] }),
            // `+=` adds only objects and arrays, while `++=` adds any value
            expectedPlus: { list: [1] },
            expectedPlusPlus: { list: [1, 'x'] },
        },
    ])('$what', ({
        plus, plusPlus, root, expectedPlus, expectedPlusPlus,
    }) => {
        expect(run(plus, root()).result).toEqual(expectedPlus);
        expect(run(plusPlus, root()).result).toEqual(expectedPlusPlus);
    });

    test('an object which the page holds is changed in place by `+=`, while `++=` puts a new one', () => {
        // e.g. a config which the page has saved before the rule modifies the document which refers to it
        const config = { id: 1 };
        const savedByPage = config;

        const plusRoot = { config };
        run('$.config+={"ads":false}', plusRoot);
        expect(plusRoot.config).toBe(savedByPage);
        expect(savedByPage).toEqual({ id: 1, ads: false });

        const otherConfig = { id: 2 };
        const otherSavedByPage = otherConfig;
        const plusPlusRoot = { config: otherConfig };
        run('$.config++={"ads":false}', plusPlusRoot);
        expect(plusPlusRoot.config).not.toBe(otherSavedByPage);
        expect(plusPlusRoot.config).toEqual({ id: 2, ads: false });
        // the page still has the object without the change
        expect(otherSavedByPage).toEqual({ id: 2 });
    });

    test('an object referred to twice is changed everywhere by `+=`, and only at the matched path by `++=`', () => {
        const shared = { id: 1 };
        const plusRoot = { a: shared, b: shared };
        run('$.a+={"ads":false}', plusRoot);
        expect(plusRoot.b).toEqual({ id: 1, ads: false });

        const otherShared = { id: 1 };
        const plusPlusRoot = { a: otherShared, b: otherShared };
        run('$.a++={"ads":false}', plusPlusRoot);
        expect(plusPlusRoot).toEqual({ a: { id: 1, ads: false }, b: { id: 1 } });
    });
});
