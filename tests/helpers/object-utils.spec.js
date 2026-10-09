import {
    afterEach,
    describe,
    test,
    expect,
    vi,
} from 'vitest';

import { isEmptyObject, isNativePromise, getMethodOwner } from '../../src/helpers';

test('isEmptyObject() for different inputs', async () => {
    const emptyObj = {};
    const obj = { a: 1 };
    const emptyArr = [];
    const arr = [1, 2, 3];
    function func() {}

    expect(isEmptyObject(emptyObj)).toBeTruthy();
    expect(isEmptyObject(emptyArr)).toBeTruthy();

    expect(isEmptyObject(obj)).toBeFalsy();
    expect(isEmptyObject(arr)).toBeFalsy();
    expect(isEmptyObject(func)).toBeFalsy();

    expect(isEmptyObject(EventTarget)).toBeFalsy();
    expect(isEmptyObject(Array)).toBeFalsy();
    expect(isEmptyObject(Object)).toBeFalsy();
    expect(isEmptyObject(Function)).toBeFalsy();
});

// https://github.com/AdguardTeam/Scriptlets/issues/585
describe('isNativePromise()', () => {
    const NativePromise = window.Promise;

    test('detects native promises', async () => {
        const rejected = Promise.reject(new Error('rejected'));
        // Rejection is handled so that it is not reported as unhandled
        rejected.catch(() => {});

        class PromiseSubclass extends Promise {}

        expect(isNativePromise(Promise.resolve({ a: 1 }), NativePromise)).toBe(true);
        expect(isNativePromise(rejected, NativePromise)).toBe(true);
        expect(isNativePromise(new Promise(() => {}), NativePromise)).toBe(true);
        expect(isNativePromise((async () => ({ a: 1 }))(), NativePromise)).toBe(true);
        expect(isNativePromise(new Response('{"a":1}').json(), NativePromise)).toBe(true);
        expect(isNativePromise(PromiseSubclass.resolve(1), NativePromise)).toBe(true);
    });

    test.each([
        undefined,
        null,
        0,
        '',
        'Promise',
        true,
        {},
        [],
        { a: 1 },
        '{"a":1}',
        () => {},
        Promise,
        Promise.prototype.then,
    ])('does not detect %o as a promise', (value) => {
        expect(isNativePromise(value, NativePromise)).toBe(false);
    });

    test('does not detect thenables as promises', () => {
        const thenable = { then: vi.fn() };
        const thenableFunction = () => {};
        thenableFunction.then = vi.fn();

        expect(isNativePromise(thenable, NativePromise)).toBe(false);
        expect(isNativePromise(thenableFunction, NativePromise)).toBe(false);
        expect(thenable.then).not.toHaveBeenCalled();
        expect(thenableFunction.then).not.toHaveBeenCalled();
    });

    test('does not read the "then" property', () => {
        const thenGetter = vi.fn(() => {
            throw new Error('then should not be read');
        });
        const value = {};
        Object.defineProperty(value, 'then', { get: thenGetter });

        expect(isNativePromise(value, NativePromise)).toBe(false);
        expect(thenGetter).not.toHaveBeenCalled();
    });

    test('does not detect an object which only pretends to be a promise by its "toStringTag"', () => {
        const value = { [Symbol.toStringTag]: 'Promise' };

        expect(Object.prototype.toString.call(value)).toBe('[object Promise]');
        expect(isNativePromise(value, NativePromise)).toBe(false);
    });

    test('does not throw for a proxy which throws on prototype access', () => {
        const value = new Proxy({}, {
            getPrototypeOf() {
                throw new Error('getPrototypeOf trap');
            },
        });

        expect(isNativePromise(value, NativePromise)).toBe(false);
    });

    test('detects native promises but not polyfill ones after window.Promise is replaced', async () => {
        // Promise implementation of a polyfill or a library which replaces window.Promise,
        // e.g. 'ZoneAwarePromise' of zone.js
        function PolyfillPromise(executor) {
            this.nativePromise = new NativePromise(executor);
        }
        PolyfillPromise.prototype.then = function then(onFulfilled, onRejected) {
            return this.nativePromise.then(onFulfilled, onRejected);
        };
        PolyfillPromise.prototype[Symbol.toStringTag] = 'Promise';

        window.Promise = PolyfillPromise;
        try {
            // Async functions return native promises regardless of window.Promise, as native APIs do
            // in browsers, e.g. 'Response.prototype.json()', which is not native in Node.js though
            expect(isNativePromise((async () => ({ a: 1 }))(), NativePromise)).toBe(true);
            // Promises created by the page with the replaced window.Promise are not native
            const polyfillPromise = new window.Promise((resolve) => resolve({ a: 1 }));
            expect(isNativePromise(polyfillPromise, NativePromise)).toBe(false);
            expect(await polyfillPromise).toEqual({ a: 1 });
        } finally {
            window.Promise = NativePromise;
        }
    });
});

describe('getMethodOwner()', () => {
    // Storages are not available in some Node.js versions which run the tests, e.g. 26,
    // so objects which inherit from Storage.prototype are used here, and real ones are tested by QUnit tests.
    // Results are compared by `===`, as printing of Storage.prototype on a failure throws
    const createStorage = () => Object.create(Storage.prototype);

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('returns Storage.prototype for a storage', () => {
        expect(getMethodOwner(createStorage(), 'getItem') === Storage.prototype).toBe(true);
    });

    test('returns the storage itself if it has an own method', () => {
        // e.g. a wrapper which the page has assigned in Chrome
        const storage = createStorage();
        storage.getItem = () => null;

        expect(getMethodOwner(storage, 'getItem') === storage).toBe(true);
        expect(getMethodOwner(storage, 'setItem') === Storage.prototype).toBe(true);
    });

    test.each([
        { title: 'window', getBase: () => window },
        { title: 'document', getBase: () => document },
        { title: 'JSON', getBase: () => JSON },
        { title: 'a plain object', getBase: () => ({ method: () => {} }) },
        { title: 'Storage.prototype itself', getBase: () => Storage.prototype },
    ])('returns the object itself for $title', ({ getBase }) => {
        const base = getBase();
        expect(getMethodOwner(base, 'method') === base).toBe(true);
    });

    test('returns the object itself if Storage is not available', () => {
        const storage = createStorage();
        vi.stubGlobal('Storage', undefined);

        expect(getMethodOwner(storage, 'getItem') === storage).toBe(true);
    });

    test('does not throw for a proxy which throws on prototype access', () => {
        const base = new Proxy({}, {
            getPrototypeOf() {
                throw new Error('getPrototypeOf trap');
            },
        });

        expect(getMethodOwner(base, 'method') === base).toBe(true);
    });
});
