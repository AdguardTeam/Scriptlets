import {
    afterEach,
    describe,
    test,
    expect,
} from 'vitest';

import { parseKeywordValue } from '../../src/helpers/parse-keyword-value';

/**
 * Tolerance in ms which is used to check that parsed time
 * is close enough to the time of the assertion.
 *
 * Note that it should be greater than one second
 * because '$currentDate$' value has no milliseconds in it.
 */
const TOLERANCE_MS = 2000;

describe('parseKeywordValue', () => {
    describe('values without keywords do not depend on "Date"', () => {
        const NativeDate = Date;

        afterEach(() => {
            window.Date = NativeDate;
        });

        test.each([
            'true',
            '42',
            'json:{"a":1}',
            'replace:/foo/bar/',
            '{"preferences":3,"flag":false}',
        ])('%s is returned as is even if "Date" is broken', (rawValue) => {
            // Website may override "Date" with a throwing implementation
            window.Date = (() => {
                throw new Error('Date is not available');
            }) as unknown as DateConstructor;

            expect(parseKeywordValue(rawValue)).toBe(rawValue);
        });

        test('value with a keyword still uses "Date"', () => {
            window.Date = (() => {
                throw new Error('Date is not available');
            }) as unknown as DateConstructor;

            expect(() => parseKeywordValue('$now$')).toThrow();
        });
    });

    describe('values without keywords are not modified', () => {
        test.each([
            { actual: '' },
            { actual: 'true' },
            { actual: '123' },
            { actual: '{"preferences":3,"flag":false}' },
            // not supported keywords
            { actual: '$currentTime$' },
            { actual: '$NOW$' },
            // incomplete keywords
            { actual: '$now' },
            { actual: 'now$' },
            { actual: 'now' },
            // special replacement patterns should not be interpreted
            { actual: '$& $` $\' $1 $$' },
        ])('$actual', ({ actual }) => {
            expect(parseKeywordValue(actual)).toBe(actual);
        });
    });

    describe('standalone keyword', () => {
        test('$now$', () => {
            const parsed = parseKeywordValue('$now$');

            expect(parsed).toMatch(/^\d+$/);
            expect(Date.now() - Number(parsed)).toBeLessThan(TOLERANCE_MS);
        });

        test('$currentDate$', () => {
            const parsed = parseKeywordValue('$currentDate$');

            expect(Date.now() - new Date(parsed).getTime()).toBeLessThan(TOLERANCE_MS);
        });

        test('$currentISODate$', () => {
            const parsed = parseKeywordValue('$currentISODate$');

            expect(parsed).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            expect(Date.now() - new Date(parsed).getTime()).toBeLessThan(TOLERANCE_MS);
        });
    });

    describe('keyword as a part of the value', () => {
        // https://github.com/AdguardTeam/Scriptlets/issues/573
        test('$now$ inside json string', () => {
            const parsed = parseKeywordValue('{"count":1,"firstTime":$now$}');

            const parsedJson = JSON.parse(parsed);
            expect(parsedJson.count).toBe(1);
            expect(Date.now() - parsedJson.firstTime).toBeLessThan(TOLERANCE_MS);
        });

        test('$currentISODate$ inside json string', () => {
            const parsed = parseKeywordValue('{"consent":true,"date":"$currentISODate$"}');

            const parsedJson = JSON.parse(parsed);
            expect(parsedJson.consent).toBe(true);
            expect(Date.now() - new Date(parsedJson.date).getTime()).toBeLessThan(TOLERANCE_MS);
        });

        test('$currentDate$ inside arbitrary string', () => {
            const parsed = parseKeywordValue('accepted at $currentDate$!');

            expect(parsed.startsWith('accepted at ')).toBe(true);
            expect(parsed.endsWith('!')).toBe(true);

            const dateValue = parsed.slice('accepted at '.length, -1);
            expect(Date.now() - new Date(dateValue).getTime()).toBeLessThan(TOLERANCE_MS);
        });

        test('keyword glued to the text with no separators', () => {
            const parsed = parseKeywordValue('abc$now$def');

            expect(parsed).toMatch(/^abc\d+def$/);
        });

        test('keyword surrounded by dollar signs', () => {
            const parsed = parseKeywordValue('$$now$$');

            expect(parsed).toMatch(/^\$\d+\$$/);
        });
    });

    describe('multiple keywords', () => {
        test('different keywords in one value', () => {
            const parsed = parseKeywordValue('{"count":1,"firstTime":$now$,"foo":"$currentISODate$"}');

            const parsedJson = JSON.parse(parsed);
            expect(parsedJson.count).toBe(1);
            expect(Date.now() - parsedJson.firstTime).toBeLessThan(TOLERANCE_MS);
            expect(Date.now() - new Date(parsedJson.foo).getTime()).toBeLessThan(TOLERANCE_MS);
        });

        test('same keyword is replaced with the same value', () => {
            const parsed = parseKeywordValue('{"firstTime":$now$,"lastTime":$now$}');

            const parsedJson = JSON.parse(parsed);
            expect(parsedJson.firstTime).toBe(parsedJson.lastTime);
            expect(Date.now() - parsedJson.firstTime).toBeLessThan(TOLERANCE_MS);
        });

        test('same date keyword is replaced with the same value', () => {
            const parsed = parseKeywordValue('$currentDate$|$currentDate$');

            const [firstDate, secondDate] = parsed.split('|');
            expect(firstDate).toBe(secondDate);
            expect(Date.now() - new Date(firstDate).getTime()).toBeLessThan(TOLERANCE_MS);
        });

        test('keywords which are not separated by any other content', () => {
            const parsed = parseKeywordValue('$now$$now$');

            expect(parsed).toMatch(/^\d+$/);
        });

        test('$now$ used twice', () => {
            const parsed = parseKeywordValue('{"count":1,"firstTime":$now$,"lastTime":$now$}');

            expect(parsed).not.toContain('$now$');

            const parsedJson = JSON.parse(parsed);
            expect(parsedJson.count).toBe(1);
            expect(`${parsedJson.firstTime}`).toMatch(/^\d+$/);
            // both keywords are replaced with the very same time
            expect(parsedJson.firstTime).toBe(parsedJson.lastTime);
            expect(Date.now() - parsedJson.firstTime).toBeLessThan(TOLERANCE_MS);
        });

        test('$now$ used twice and $currentISODate$ used once', () => {
            const parsed = parseKeywordValue(
                '{"count":1,"firstTime":$now$,"lastTime":$now$,"date":"$currentISODate$"}',
            );

            expect(parsed).not.toContain('$now$');
            expect(parsed).not.toContain('$currentISODate$');

            const parsedJson = JSON.parse(parsed);
            expect(parsedJson.count).toBe(1);
            expect(parsedJson.firstTime).toBe(parsedJson.lastTime);
            expect(parsedJson.date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            // all the keywords are replaced with the very same time,
            // even if they are of different types
            expect(new Date(parsedJson.date).getTime()).toBe(parsedJson.firstTime);
            expect(Date.now() - parsedJson.firstTime).toBeLessThan(TOLERANCE_MS);
        });

        test('$now$ used twice and $currentISODate$ used once in a simple text value', () => {
            const parsed = parseKeywordValue('first:$now$ last:$now$ date:$currentISODate$');

            expect(parsed).not.toContain('$now$');
            expect(parsed).not.toContain('$currentISODate$');

            const [firstPart, lastPart, datePart] = parsed.split(' ');
            // text around the keywords is not modified
            expect(firstPart.startsWith('first:')).toBe(true);
            expect(lastPart.startsWith('last:')).toBe(true);
            expect(datePart.startsWith('date:')).toBe(true);

            const firstTime = firstPart.replace('first:', '');
            const lastTime = lastPart.replace('last:', '');
            const isoDate = datePart.replace('date:', '');

            expect(firstTime).toMatch(/^\d+$/);
            // both keywords are replaced with the very same time
            expect(firstTime).toBe(lastTime);
            expect(isoDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            // all the keywords are replaced with the very same time,
            // even if they are of different types
            expect(new Date(isoDate).getTime()).toBe(Number(firstTime));
            expect(Date.now() - Number(firstTime)).toBeLessThan(TOLERANCE_MS);
        });
    });
});
