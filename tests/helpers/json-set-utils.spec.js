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

    // https://github.com/AdguardTeam/Scriptlets/issues/573
    describe('time keywords', () => {
        // Tolerance in ms, should be greater than one second
        // because '$currentDate$' value has no milliseconds in it
        const TOLERANCE_MS = 2000;

        test('standalone $now$ is set as a number', () => {
            const result = parseJsonSetArgumentValue(source, '$now$', JSON.parse);

            expect(typeof result.constantValue).toBe('number');
            expect(Date.now() - result.constantValue).toBeLessThan(TOLERANCE_MS);
        });

        test('standalone $currentDate$ is set as a string', () => {
            const result = parseJsonSetArgumentValue(source, '$currentDate$', JSON.parse);

            expect(typeof result.constantValue).toBe('string');
            expect(Date.now() - new Date(result.constantValue).getTime()).toBeLessThan(TOLERANCE_MS);
        });

        test('standalone $currentISODate$ is set as a string', () => {
            const result = parseJsonSetArgumentValue(source, '$currentISODate$', JSON.parse);

            expect(result.constantValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        });

        test('keyword as a part of the string value', () => {
            const result = parseJsonSetArgumentValue(source, 'set at $now$!', JSON.parse);

            expect(result.constantValue).toMatch(/^set at \d+!$/);
        });

        test('keyword inside json marker value', () => {
            const result = parseJsonSetArgumentValue(source, 'json:{"count":1,"firstTime":$now$}', JSON.parse);

            expect(result.shouldMergeJsonValue).toBe(true);
            expect(result.constantValue.count).toBe(1);
            expect(typeof result.constantValue.firstTime).toBe('number');
            expect(Date.now() - result.constantValue.firstTime).toBeLessThan(TOLERANCE_MS);
        });

        test('multiple keywords inside json marker value', () => {
            const result = parseJsonSetArgumentValue(
                source,
                'json:{"firstTime":$now$,"lastTime":$now$,"date":"$currentISODate$"}',
                JSON.parse,
            );

            const { firstTime, lastTime, date } = result.constantValue;
            // all the keywords are replaced with the very same time
            expect(firstTime).toBe(lastTime);
            expect(new Date(date).getTime()).toBe(firstTime);
            expect(Date.now() - firstTime).toBeLessThan(TOLERANCE_MS);
        });

        test('keyword inside replace marker regexp is used as is', () => {
            const result = parseJsonSetArgumentValue(source, 'replace:/$now$/hidden/', JSON.parse);

            // Regexp is a match pattern, so the keyword in it is not resolved
            expect(result.replaceRegexValue.source).toBe('$now$');
            expect(result.constantValue).toBe('hidden');
        });

        test('keyword inside replace marker replacement', () => {
            const result = parseJsonSetArgumentValue(source, 'replace:/foo/bar $now$/', JSON.parse);

            expect(result.shouldReplaceArgument).toBe(true);
            expect(result.constantValue).toMatch(/^bar \d+$/);
            expect(getJsonSetValue('foo test', result)).toMatch(/^bar \d+ test$/);
        });

        test.each([
            { value: '$now$', expected: true },
            { value: '{"count":1,"firstTime":$now$}', expected: true },
            { value: 'json:{"firstTime":$now$}', expected: true },
            { value: 'replace:/foo/$now$/', expected: true },
            // keyword in the regexp part is not resolved, so it is not reported
            { value: 'replace:/$now$/hidden/', expected: false },
            { value: 'true', expected: false },
            { value: 'json:{"a":1}', expected: false },
            { value: 'replace:/foo/bar/', expected: false },
        ])('hasTimeKeywords is $expected for $value', ({ value, expected }) => {
            expect(parseJsonSetArgumentValue(source, value, JSON.parse).hasTimeKeywords).toBe(expected);
        });

        test('keyword-like values are not modified', () => {
            const notKeywords = [
                '$now',
                'now$',
                '$NOW$',
                '$now2$',
                '$$',
            ];

            notKeywords.forEach((value) => {
                expect(parseJsonSetArgumentValue(source, value, JSON.parse).constantValue).toBe(value);
            });
        });
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
