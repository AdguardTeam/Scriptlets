import { describe, expect, test } from 'vitest';

import { getJsonSetValue, parseJsonSetArgumentValue } from '../../src/helpers';

const source = {
    name: 'trusted-json-set',
    verbose: false,
};

describe('parseJsonSetArgumentValue tests', () => {
    test('parses replace marker', () => {
        const result = parseJsonSetArgumentValue(source, 'replace:/foo/bar/', JSON.parse);

        expect(result).not.toBeNull();
        expect(result.shouldReplaceArgument).toBe(true);
        expect(result.shouldMergeJsonValue).toBe(false);
        expect(result.constantValue).toBe('bar');
        expect(result.replaceRegexValue).toStrictEqual(/foo/);
    });

    test('parses json marker', () => {
        const result = parseJsonSetArgumentValue(
            source,
            'json:{"a":{"test":1},"b":{"c":1}}',
            JSON.parse,
        );

        expect(result).not.toBeNull();
        expect(result.shouldReplaceArgument).toBe(false);
        expect(result.shouldMergeJsonValue).toBe(true);
        expect(result.constantValue).toStrictEqual({
            a: { test: 1 },
            b: { c: 1 },
        });
    });

    test('parses predefined constant', () => {
        const result = parseJsonSetArgumentValue(source, 'true', JSON.parse);

        expect(result).not.toBeNull();
        expect(result.constantValue).toBe(true);
        expect(result.shouldReplaceArgument).toBe(false);
        expect(result.shouldMergeJsonValue).toBe(false);
    });

    test('returns null for invalid replace marker', () => {
        const result = parseJsonSetArgumentValue(source, 'replace:/(/bar/', JSON.parse);

        expect(result).toBeNull();
    });

    test('returns null for invalid json marker', () => {
        const result = parseJsonSetArgumentValue(source, 'json:{', JSON.parse);

        expect(result).toBeNull();
    });
});

describe('getJsonSetValue tests', () => {
    test('returns replaced string for replace marker', () => {
        const parsedArgumentValue = parseJsonSetArgumentValue(source, 'replace:/foo/bar/', JSON.parse);

        expect(getJsonSetValue('foo test', parsedArgumentValue)).toBe('bar test');
    });

    test('returns original non-string value for replace marker', () => {
        const parsedArgumentValue = parseJsonSetArgumentValue(source, 'replace:/1/2/', JSON.parse);

        expect(getJsonSetValue(123, parsedArgumentValue)).toBe(123);
    });

    test('shallow merges plain objects for json marker', () => {
        const parsedArgumentValue = parseJsonSetArgumentValue(
            source,
            'json:{"a":1,"nested":{"value":2}}',
            JSON.parse,
        );

        expect(getJsonSetValue({ keep: true, nested: { old: 1 } }, parsedArgumentValue)).toStrictEqual({
            keep: true,
            a: 1,
            nested: { value: 2 },
        });
    });

    test('replaces non-object current value for json marker', () => {
        const parsedArgumentValue = parseJsonSetArgumentValue(source, 'json:{"a":1}', JSON.parse);

        expect(getJsonSetValue('old', parsedArgumentValue)).toStrictEqual({ a: 1 });
    });

    test('returns constant value for plain values', () => {
        const parsedArgumentValue = parseJsonSetArgumentValue(source, 'true', JSON.parse);

        expect(getJsonSetValue('old', parsedArgumentValue)).toBe(true);
    });
});
