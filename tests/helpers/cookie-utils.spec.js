import { describe, test, expect } from 'vitest';

import { isCookieSetWithValue, serializeCookie } from '../../src/helpers/cookie-utils';
import { parseKeywordValue } from '../../src/helpers/parse-keyword-value';

describe('serializeCookie', () => {
    describe('encode cookie value', () => {
        test.each([
            {
                actual: ['name', 'value', ''],
                expected: 'name=value',
            },
            {
                actual: ['name', 'value', '/'],
                expected: 'name=value; path=/',
            },
            {
                actual: ['pop::138', '138', ''],
                // do not encode cookie name
                // https://github.com/AdguardTeam/Scriptlets/issues/408
                expected: 'pop::138=138',
            },
            {
                actual: ['aa::bb::cc', '1', ''],
                expected: 'aa::bb::cc=1',
            },
            // invalid path
            {
                actual: ['name', 'value', '/docs'],
                // no path is set if unsupported path values passed
                expected: 'name=value',
            },
            // invalid name because of ';'
            {
                actual: ['a;bc', 'def', ''],
                expected: null,
            },
            // value with ';' but it should be encoded so its ok
            {
                actual: ['abc', 'de;f', ''],
                expected: 'abc=de%3Bf',
            },
            // set domain
            {
                actual: ['test', '1', '', 'example.com'],
                expected: 'test=1; domain=example.com',
            },
            {
                actual: ['__Host-prefix', 'host_prefix', ''],
                expected: '__Host-prefix=host_prefix; path=/; secure',
            },
            {
                actual: ['__Host-prefix_domain', 'host_prefix_domain', '', 'example.com'],
                expected: '__Host-prefix_domain=host_prefix_domain; path=/; secure',
            },
            {
                actual: ['__Secure-prefix', 'secure_prefix', ''],
                expected: '__Secure-prefix=secure_prefix; secure',
            },
        ])('$actual -> $expected', ({ actual, expected }) => {
            expect(serializeCookie(...actual)).toBe(expected);
        });
    });

    describe('no cookie value encoding', () => {
        test.each([
            {
                actual: ['name', 'value', '', '', false],
                expected: 'name=value',
            },
            {
                actual: ['__test-cookie_expires', 'expires', '/', '', false],
                expected: '__test-cookie_expires=expires; path=/',
            },
            {
                actual: ['aa::bb::cc', '1', '', '', false],
                expected: 'aa::bb::cc=1',
            },
            {
                actual: ['__w_cc11', '{%22cookies_statistical%22:false%2C%22cookies_ad%22:true}', '', '', false],
                // do not encode cookie value
                // https://github.com/AdguardTeam/Scriptlets/issues/311
                expected: '__w_cc11={%22cookies_statistical%22:false%2C%22cookies_ad%22:true}',
            },
            // invalid name because of ';'
            {
                actual: ['a;bc', 'def', '', '', false],
                expected: null,
            },
            // invalid value because of ';' and it is not being encoded
            {
                actual: ['abc', 'de;f', '', '', false],
                expected: null,
            },
        ])('$actual -> $expected', ({ actual, expected }) => {
            // explicit 'false' to disable encoding
            expect(serializeCookie(...actual)).toBe(expected);
        });
    });
});

describe('isCookieSetWithValue', () => {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    describe('plain values', () => {
        test.each([
            {
                actual: ['name=value', 'name', 'value'],
                expected: true,
            },
            {
                actual: ['first=1; name=value; last=2', 'name', 'value'],
                expected: true,
            },
            {
                actual: ['name=value', 'name', 'anotherValue'],
                expected: false,
            },
            {
                actual: ['name=value', 'anotherName', 'value'],
                expected: false,
            },
            {
                actual: ['name', 'name', 'value'],
                expected: false,
            },
        ])('$actual -> $expected', ({ actual, expected }) => {
            expect(isCookieSetWithValue(...actual)).toBe(expected);
        });
    });

    describe('standalone time keyword', () => {
        // https://github.com/AdguardTeam/Scriptlets/issues/489
        test.each([
            '$now$',
            '$currentDate$',
            '$currentISODate$',
        ])('cookie set with %s just now is considered to be set', (keyword) => {
            const cookieString = `name=${parseKeywordValue(keyword)}`;

            expect(isCookieSetWithValue(cookieString, 'name', keyword)).toBe(true);
        });

        test.each([
            { keyword: '$now$', outdatedValue: `${Date.now() - ONE_DAY_MS - 1000}` },
            { keyword: '$currentDate$', outdatedValue: new Date(Date.now() - ONE_DAY_MS - 1000).toString() },
            { keyword: '$currentISODate$', outdatedValue: new Date(Date.now() - ONE_DAY_MS - 1000).toISOString() },
        ])('cookie set with $keyword more than a day ago should be set again', ({ keyword, outdatedValue }) => {
            const cookieString = `name=${outdatedValue}`;

            expect(isCookieSetWithValue(cookieString, 'name', keyword)).toBe(false);
        });

        test('cookie value which does not look like time should be set again', () => {
            expect(isCookieSetWithValue('name=accepted', 'name', '$now$')).toBe(false);
        });

        test.each([
            // recent dates but not in the format which `$currentDate$` sets
            { name: 'toUTCString()', cookieValue: new Date().toUTCString() },
            { name: 'toISOString()', cookieValue: new Date().toISOString() },
            { name: 'getTime()', cookieValue: `${Date.now()}` },
        ])('$currentDate$ cookie value in $name format should be set again', ({ cookieValue }) => {
            const cookieString = `name=${cookieValue}`;

            expect(isCookieSetWithValue(cookieString, 'name', '$currentDate$')).toBe(false);
        });

        test('$currentDate$ cookie value with no timezone name is recognized', () => {
            // timezone name is implementation-defined so it may be absent
            const cookieValue = new Date().toString().replace(/\s\(.+\)$/, '');
            const cookieString = `name=${cookieValue}`;

            expect(isCookieSetWithValue(cookieString, 'name', '$currentDate$')).toBe(true);
        });
    });

    describe('time keywords as a part of the value', () => {
        // https://github.com/AdguardTeam/Scriptlets/issues/573
        test.each([
            '{"count":1,"firstTime":$now$}',
            '{"count":1,"date":"$currentDate$"}',
            '{"count":1,"date":"$currentISODate$"}',
            '{"firstTime":$now$,"date":"$currentISODate$"}',
            '{"firstTime":$now$,"lastTime":$now$}',
            'accepted at $currentDate$!',
        ])('cookie set with %s just now is considered to be set', (value) => {
            const cookieString = `name=${parseKeywordValue(value)}`;

            expect(isCookieSetWithValue(cookieString, 'name', value)).toBe(true);
        });

        test.each([
            '$now$$now$',
            '$now$$currentISODate$',
            '$currentISODate$$now$',
        ])('cookie set with adjacent keywords %s just now is considered to be set', (value) => {
            const cookieString = `name=${parseKeywordValue(value)}`;

            expect(isCookieSetWithValue(cookieString, 'name', value)).toBe(true);
        });

        test('cookie with outdated time value should be set again', () => {
            const outdatedTime = Date.now() - ONE_DAY_MS - 1000;
            const cookieString = `name={"count":1,"firstTime":${outdatedTime}}`;

            expect(isCookieSetWithValue(cookieString, 'name', '{"count":1,"firstTime":$now$}')).toBe(false);
        });

        test('cookie should be set again if any of its time values is outdated', () => {
            const outdatedIsoDate = new Date(Date.now() - ONE_DAY_MS - 1000).toISOString();
            const cookieString = `name={"firstTime":${Date.now()},"date":"${outdatedIsoDate}"}`;
            const value = '{"firstTime":$now$,"date":"$currentISODate$"}';

            expect(isCookieSetWithValue(cookieString, 'name', value)).toBe(false);
        });

        test('cookie with different content should be set again', () => {
            const cookieString = `name={"count":2,"firstTime":${Date.now()}}`;

            expect(isCookieSetWithValue(cookieString, 'name', '{"count":1,"firstTime":$now$}')).toBe(false);
        });

        test('cookie which does not match the value at all should be set again', () => {
            expect(isCookieSetWithValue('name=accepted', 'name', '{"count":1,"firstTime":$now$}')).toBe(false);
        });

        test('value is not used as a regexp', () => {
            const cookieString = `name={"count":1,"firstTime":${Date.now()}}`;
            // '.' should not match any character
            const value = '{"count":1,"firstTime":$now$}.';

            expect(isCookieSetWithValue(cookieString, 'name', value)).toBe(false);
        });

        describe('special characters in the value are escaped', () => {
            test.each([
                // '[' and ']' make the regexp invalid if not escaped
                { value: '[$now$]', cookieValue: `[${Date.now()}]` },
                // '{' and '}' are parsed as a quantifier if not escaped
                { value: '{$now$}', cookieValue: `{${Date.now()}}` },
                { value: 'a+b($now$)', cookieValue: `a+b(${Date.now()})` },
                { value: 'a|b^c$now$', cookieValue: `a|b^c${Date.now()}` },
                { value: 'a\\b$now$', cookieValue: `a\\b${Date.now()}` },
            ])('$value is matched literally', ({ value, cookieValue }) => {
                expect(isCookieSetWithValue(`name=${cookieValue}`, 'name', value)).toBe(true);
            });

            test('dot does not match any character', () => {
                const cookieString = `name=axb:${Date.now()}`;

                expect(isCookieSetWithValue(cookieString, 'name', 'a.b:$now$')).toBe(false);
            });
        });

        describe('keyword-like values are compared as is', () => {
            test.each([
                '$now',
                'now$',
                '$NOW$',
                '$now2$',
                '$$',
            ])('%s', (value) => {
                expect(isCookieSetWithValue(`name=${value}`, 'name', value)).toBe(true);
                expect(isCookieSetWithValue(`name=${Date.now()}`, 'name', value)).toBe(false);
            });
        });
    });
});
