import { describe, test, expect } from 'vitest';

import { jsonSetter, getPrunePath } from '../../src/helpers';

const source = 'trusted-json-set';
const nativeObjects = {
    nativeStringify: window.JSON.stringify,
};

describe('jsonSetter tests', () => {
    test('creates a missing nested path', () => {
        const root = {
            foo: {
                q: 1,
            },
            bar: 2,
        };

        const result = jsonSetter(
            source,
            root,
            'foo.qwerty.abc',
            undefined,
            () => true,
            getPrunePath(''),
            '',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            foo: {
                q: 1,
                qwerty: {
                    abc: true,
                },
            },
            bar: 2,
        });
    });

    test('overwrites an existing value', () => {
        const root = {
            foo: {
                bar: false,
                abc: 1,
            },
        };

        const result = jsonSetter(
            source,
            root,
            'foo.bar',
            undefined,
            () => true,
            getPrunePath(''),
            '',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            foo: {
                bar: true,
                abc: 1,
            },
        });
    });

    test('overwrites nested object', () => {
        const root = {
            foo: {
                bar: {
                    baz: {
                        test: 1,
                    },
                },
                abc: 1,
            },
        };

        const result = jsonSetter(
            source,
            root,
            'foo.bar',
            undefined,
            () => true,
            getPrunePath(''),
            '',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            foo: {
                bar: true,
                abc: 1,
            },
        });
    });

    test('updates wildcard-matched object children', () => {
        const root = {
            foo: {
                bar: {
                    a: { test: true },
                    b: { test: true },
                },
            },
        };

        const result = jsonSetter(
            source,
            root,
            'foo.bar.*.test',
            undefined,
            () => false,
            getPrunePath(''),
            '',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            foo: {
                bar: {
                    a: { test: false },
                    b: { test: false },
                },
            },
        });
    });

    test('updates wildcard-matched object children with propsPath value check', () => {
        const root = {
            foo: {
                bar: {
                    a: { test: 1 },
                    b: { test: true },
                    c: { test: 2 },
                },
            },
        };

        const parsedSetPath = getPrunePath('foo.bar.*.test.[=].true')[0];

        const result = jsonSetter(
            source,
            root,
            parsedSetPath.path,
            parsedSetPath.value,
            () => false,
            getPrunePath(''),
            '',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            foo: {
                bar: {
                    a: { test: 1 },
                    b: { test: false },
                    c: { test: 2 },
                },
            },
        });
    });

    test('updates wildcard-matched array elements', () => {
        const root = {
            items: [
                { enabled: true, id: 1 },
                { enabled: true, id: 2 },
            ],
        };

        const result = jsonSetter(
            source,
            root,
            'items.[].enabled',
            undefined,
            () => false,
            getPrunePath(''),
            '',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            items: [
                { enabled: false, id: 1 },
                { enabled: false, id: 2 },
            ],
        });
    });

    test('updates only values matching the value filter', () => {
        const root = {
            foo: {
                bar: {
                    a: { test: 1 },
                    b: { test: true },
                },
            },
        };

        const result = jsonSetter(
            source,
            root,
            'foo.bar.*.test',
            true,
            () => false,
            getPrunePath(''),
            '',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            foo: {
                bar: {
                    a: { test: 1 },
                    b: { test: false },
                },
            },
        });
    });

    test('does not create a value-filtered path when there is no match', () => {
        const root = {
            foo: {
                bar: 1,
            },
        };

        const result = jsonSetter(
            source,
            root,
            'foo.bar',
            99,
            () => true,
            getPrunePath(''),
            '',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            foo: {
                bar: 1,
            },
        });
    });

    test('does not modify when required paths are missing', () => {
        const root = {
            foo: 1,
        };

        const result = jsonSetter(
            source,
            root,
            'bar.enabled',
            undefined,
            () => true,
            getPrunePath('required.path'),
            '',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            foo: 1,
        });
    });

    test('supports object values', () => {
        const root = {
            foo: 1,
        };

        const result = jsonSetter(
            source,
            root,
            'bar',
            undefined,
            () => ({ enabled: true }),
            getPrunePath(''),
            '',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            foo: 1,
            bar: {
                enabled: true,
            },
        });
    });

    test('supports parsed json object values', () => {
        const root = {
            foo: {
                bar: 1,
            },
        };
        const parsedJsonValue = JSON.parse('{"a":{"test":1},"b":{"c":1}}');

        const result = jsonSetter(
            source,
            root,
            'foo',
            undefined,
            () => parsedJsonValue,
            getPrunePath(''),
            '',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            foo: {
                a: {
                    test: 1,
                },
                b: {
                    c: 1,
                },
            },
        });
    });

    test('supports merged parsed json object values', () => {
        const root = {
            foo: {
                bar: 1,
            },
            abc: 2,
        };
        const parsedJsonValue = JSON.parse('{"a":{"test":1},"b":{"c":1}}');

        const result = jsonSetter(
            source,
            root,
            'foo',
            undefined,
            (currentValue) => ({ ...currentValue, ...parsedJsonValue }),
            getPrunePath(''),
            '',
            nativeObjects,
        );

        expect(result).toStrictEqual({
            foo: {
                bar: 1,
                a: {
                    test: 1,
                },
                b: {
                    c: 1,
                },
            },
            abc: 2,
        });
    });
});
