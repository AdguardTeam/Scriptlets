import v8 from 'node:v8';
import { describe, test, expect } from 'vitest';

import { jsonPath, splitJsonPathQueries, type JsonPathCache } from '../../src/helpers';
import { type Source } from '../../src/scriptlets';

/**
 * Performance of `jsonPath()`, which catches significant regressions, e.g. of the complexity of an operation.
 *
 * Absolute times differ between machines and on the shared CI builder, so each test compares two times
 * measured in the same test: of the same operation on a value 4 times as big, which is about 4 to 6 times
 * as long for a linear operation, also on a busy machine, and 16 times for a quadratic one, or of another
 * operation, e.g. `JSON.parse()` of the same value. Each time is the minimum of several runs, as a run may be
 * slowed down by other processes, and a failed test is run again.
 */

const source = {
    args: [],
    engine: 'test',
    name: 'trusted-json-set',
    verbose: false,
    version: '0.0.0',
} as unknown as Source;

const nativeObjects = {
    nativeParse: window.JSON.parse,
    nativeStringify: window.JSON.stringify,
};

const RUNS = 7;
const RETRY = { retry: 2 };

/**
 * Returns the minimum time of several runs of a function, each with a new value.
 *
 * @param prepare Function which creates the value for a run, which is not measured.
 * @param run Function which is measured.
 * @returns Minimum time of a run, in ms.
 */
const measure = <T>(prepare: () => T, run: (value: T) => void): number => {
    let minTime = Infinity;
    for (let i = 0; i < RUNS; i += 1) {
        const value = prepare();
        const start = performance.now();
        run(value);
        minTime = Math.min(minTime, performance.now() - start);
    }
    return minTime;
};

/**
 * Returns the number of bytes which a function allocates. `total_allocated_bytes` of V8 counts all of them,
 * regardless of garbage collection, but Node.js 22 does not have it, so the maximum growth of the used heap
 * of several runs is returned then, which garbage collection during a run may only decrease.
 *
 * @param prepare Function which creates the value for a run, which is not measured.
 * @param run Function which is measured.
 * @returns Number of allocated bytes, at least the maximum growth of the used heap.
 */
const measureAllocation = <T>(prepare: () => T, run: (value: T) => void): number => {
    let maxBytes = 0;
    for (let i = 0; i < RUNS; i += 1) {
        const value = prepare();
        const statsBefore = v8.getHeapStatistics() as v8.HeapInfo & { total_allocated_bytes?: number };
        const heapBefore = process.memoryUsage().heapUsed;
        run(value);
        const statsAfter = v8.getHeapStatistics() as v8.HeapInfo & { total_allocated_bytes?: number };
        const bytes = typeof statsBefore.total_allocated_bytes === 'number'
            && typeof statsAfter.total_allocated_bytes === 'number'
            ? statsAfter.total_allocated_bytes - statsBefore.total_allocated_bytes
            : process.memoryUsage().heapUsed - heapBefore;
        maxBytes = Math.max(maxBytes, bytes);
    }
    return maxBytes;
};

/**
 * Creates a payload like a response of a page, with some ads.
 *
 * @param size Number of items.
 * @returns Payload.
 */
const createPayload = (size: number) => ({
    items: Array.from({ length: size }, (_, i) => ({
        id: i % 100 === 0 ? 'ad' : `item-${i}`,
        title: `Item ${i}`,
        meta: { tags: ['a', 'b'], ad: i % 2 === 0, nested: { depth: { value: i } } },
    })),
    config: { ads: { enabled: true } },
});

describe('JSONPath performance', () => {
    test('removal of many items of an array is linear', RETRY, () => {
        // e.g. by `splice()` for each item it would be quadratic
        const time = (size: number) => measure(
            () => createPayload(size),
            (payload) => jsonPath(source, payload, '$.items[?(@.meta.ad==true)]', nativeObjects),
        );
        const ratio = time(40000) / time(10000);
        // about 5, or 6 on a busy machine, as garbage collection takes longer for a bigger array
        expect(ratio).toBeLessThan(10);
    });

    test('removal of the last item does not depend on the length of an array', RETRY, () => {
        // e.g. by checking each index of the array it would be linear
        const time = (size: number) => measure(
            () => ({ list: Array.from({ length: size }, (_, i) => i) }),
            (value) => {
                for (let i = 0; i < 200; i += 1) {
                    value.list.push(i);
                    jsonPath(source, value, ['$.list[-1]'], nativeObjects);
                }
            },
        );
        const ratio = time(100000) / time(1000);
        expect(ratio).toBeLessThan(10);
    });

    /**
     * Returns a test that an expression takes about 4 times as long for a payload 4 times as big.
     *
     * @param path JSONPath expression.
     * @returns Test function.
     */
    const testLinearPath = (path: string) => () => {
        const time = (size: number) => measure(
            () => createPayload(size),
            (payload) => jsonPath(source, payload, path, nativeObjects),
        );
        const ratio = time(20000) / time(5000);
        expect(ratio).toBeLessThan(10);
    };

    // Separate tests with names, as e.g. VS Code shows a name of `test.each()` with `%s` as a test which is not run
    test('recursive descent $..ad is linear', RETRY, testLinearPath('$..ad'));
    test('recursive filter $..[?(@.id=="ad")] is linear', RETRY, testLinearPath('$..[?(@.id=="ad")]'));
    test(
        'filter with && and a nested path is linear',
        RETRY,
        testLinearPath('$.items[?(@.id && @.meta.nested.depth.value > 100)].meta'),
    );

    test('recursive filter takes a small multiple of the time of JSON.parse() of the payload', RETRY, () => {
        // About 4 times in Vitest now, also on a busy machine, and 8 to 11 times before, when the path of each node
        // was built, and candidates were created for primitive values which the filter cannot match, so a regression
        // to that is caught, while a smaller one, e.g. of only the paths, about 6.5 times, is not
        const text = JSON.stringify(createPayload(5000));
        const parseTime = measure(() => text, (value) => JSON.parse(value));
        const pathTime = measure(
            () => JSON.parse(text),
            (payload) => jsonPath(source, payload, '$..[?(@.id=="ad")]', nativeObjects),
        );
        expect(pathTime / parseTime).toBeLessThan(7.5);
    });

    test('filter of an array skips the primitive items which it cannot match', RETRY, () => {
        // e.g. an array of ids with a few objects: about 0.1 to 0.2 of the time of a filter which tests each item,
        // also on a busy machine, and 1.3 to 1.6 of it before, when each primitive item was tested as well
        const text = JSON.stringify({
            items: Array.from({ length: 60000 }, (_, i) => (i % 1000 === 0 ? { id: 'ad' } : i)),
        });
        const filterTime = (path: string) => measure(
            () => JSON.parse(text),
            (payload) => jsonPath(source, payload, path, nativeObjects),
        );
        const skippedTime = filterTime('$.items[?(@.id=="ad")]');
        const testedTime = filterTime('$.items[?(@=="ad")]');
        expect(skippedTime / testedTime).toBeLessThan(0.5);
    });

    test('rule which reuses its parsed queries takes less than half the time for small values', RETRY, () => {
        // e.g. of `trusted-json-set` with `Array.isArray`, which is called very often with small values
        const path = ['[?(@.ads && @.config)]$.items[?(@.meta.ad==true && @.id=="ad")].meta'];
        const calls = (cache?: JsonPathCache) => measure(
            () => ({ value: { a: 1, b: [1] } }),
            ({ value }) => {
                for (let i = 0; i < 5000; i += 1) {
                    jsonPath(source, value, path, nativeObjects, undefined, '', false, cache);
                }
            },
        );
        const uncachedTime = calls();
        const cachedTime = calls(Object.create(null));
        expect(cachedTime / uncachedTime).toBeLessThan(0.5);
    });

    test('removal of one item takes about the time of splice() of the array', RETRY, () => {
        // e.g. with a record of each item which may be moved, it would be 100 times as long
        const SIZE = 100000;
        const pathTime = measure(
            () => ({ items: Array.from({ length: SIZE }, (_, i) => i) }),
            (value) => {
                for (let i = 0; i < 100; i += 1) {
                    value.items.unshift(i);
                    jsonPath(source, value, ['$.items[0]'], nativeObjects);
                }
            },
        );
        const spliceTime = measure(
            () => Array.from({ length: SIZE }, (_, i) => i),
            (list) => {
                for (let i = 0; i < 100; i += 1) {
                    list.unshift(i);
                    list.splice(0, 1);
                }
            },
        );
        expect(pathTime / spliceTime).toBeLessThan(10);
    });

    test('removal of items does not allocate memory for each item of the array', RETRY, () => {
        // e.g. a record of each of 100,000 items which may be moved takes 10 to 14 MB,
        // while `splice()` itself may copy the array of numbers, i.e. about 1 MB
        const SIZE = 100000;
        const MAX_BYTES = 4e6;
        const prepare = () => ({ items: Array.from({ length: SIZE }, (_, i) => i) });
        expect(measureAllocation(prepare, (value) => {
            jsonPath(source, value, ['$.items[0]'], nativeObjects);
        })).toBeLessThan(MAX_BYTES);
        expect(measureAllocation(prepare, (value) => {
            jsonPath(source, value, ['$.items[0,50000,-1]'], nativeObjects);
        })).toBeLessThan(MAX_BYTES);
    });

    test('splitting reads each regular expression once, so it is at most quadratic', RETRY, () => {
        // The splitter is quadratic for arguments of thousands of tokens, which is accepted, see AGENTS.md,
        // but without remembering the end of each regular expression, which may be read up to the end
        // of the argument, e.g. of `[?.a=/f0 [?.a=/f1`, it would be cubic, i.e. 64 times as long for an argument
        // 4 times as big, instead of 16, e.g. 1.5 s instead of 26 ms for 5 KB
        const time = (n: number) => measure(
            () => `$.note=x ${Array.from({ length: n }, (_, i) => `[?.a=/f${i}`).join(' ')}`,
            (expression) => splitJsonPathQueries(expression),
        );
        expect(time(240) / time(60)).toBeLessThan(32);
    });
});
