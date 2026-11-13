import { describe, test, expect } from 'vitest';

import {
    encodeUboCookieValue,
    getAdgCookieSettings,
    getUboCookieDomain,
    getUboCookieSettings,
    isCookieSetWithValue,
    serializeCookie,
} from '../../src/helpers/cookie-utils';
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

        describe('$currentDate$ in the format of toUTCString() for uBO rules', () => {
            test('cookie set just now is considered to be set', () => {
                const cookieString = `name=${parseKeywordValue('{"date":"$currentDate$"}', true)}`;

                expect(isCookieSetWithValue(cookieString, 'name', '{"date":"$currentDate$"}', true)).toBe(true);
            });

            test('cookie set more than a day ago should be set again', () => {
                const cookieString = `name=${new Date(Date.now() - ONE_DAY_MS - 1000).toUTCString()}`;

                expect(isCookieSetWithValue(cookieString, 'name', '$currentDate$', true)).toBe(false);
            });

            test('cookie value in the format of toString() should be set again', () => {
                const cookieString = `name=${new Date().toString()}`;

                expect(isCookieSetWithValue(cookieString, 'name', '$currentDate$', true)).toBe(false);
            });
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

describe('getUboCookieDomain', () => {
    const hostname = 'www.example.org';

    test.each([
        // no domain option
        { domain: undefined, expected: '' },
        { domain: '', expected: '' },
        // hostname and its parent domains, also with a leading dot
        { domain: 'www.example.org', expected: 'www.example.org' },
        { domain: 'example.org', expected: 'example.org' },
        { domain: '.example.org', expected: '.example.org' },
        { domain: 'EXAMPLE.org', expected: 'EXAMPLE.org' },
        // not the hostname nor its parent domain
        { domain: 'example.com', expected: null },
        { domain: 'ample.org', expected: null },
        { domain: 'sub.www.example.org', expected: null },
        // regular expression, its match in the hostname is the domain
        { domain: '/[^.]+\\.[^.]+$/', expected: 'example.org' },
        // no match, no domain
        { domain: '/example\\.com$/', expected: '' },
        // invalid regular expression
        { domain: '/(/', expected: null },
    ])('$domain -> $expected', ({ domain, expected }) => {
        expect(getUboCookieDomain(domain, hostname)).toBe(expected);
    });
});

describe('encodeUboCookieValue', () => {
    test.each([
        // allowed characters are kept as they are
        { value: 'accept', expected: 'accept' },
        { value: '{"a":1,"b":[2]}', expected: '{"a":1,"b":[2]}' },
        { value: 'a b', expected: 'a b' },
        { value: '$now$', expected: '$now$' },
        // the whole value is encoded if it has a character not allowed in cookies
        { value: 'a;b', expected: 'a%3Bb' },
        { value: 'a\\b', expected: 'a%5Cb' },
        { value: 'zażółć', expected: 'za%C5%BC%C3%B3%C5%82%C4%87' },
        // keywords are kept for parseKeywordValue() and isCookieSetWithValue()
        { value: 'a;$now$;b', expected: 'a%3B$now$%3Bb' },
        { value: '$currentDate$;$currentISODate$', expected: '$currentDate$%3B$currentISODate$' },
    ])('$value -> $expected', ({ value, expected }) => {
        expect(encodeUboCookieValue(value)).toBe(expected);
    });
});

describe('serializeCookie name validation', () => {
    test('name with `;` is rejected unless validation is disabled for uBO rules', () => {
        expect(serializeCookie('ad_expire=true;', '1', '/', '', false)).toBeNull();
        expect(serializeCookie('ad_expire=true;', '1', '/', '', false, false)).toBe('ad_expire=true;=1; path=/');
    });
});

describe('getAdgCookieSettings', () => {
    const source = { name: 'trusted-set-cookie' };

    test('settings of AdGuard rules', () => {
        expect(getAdgCookieSettings(source, 'consent', '1', '1day', 'none', '', true)).toEqual({
            name: 'consent',
            value: '1',
            path: 'none',
            domain: '',
            offsetExpiresMs: 24 * 60 * 60 * 1000,
            isUtcDate: false,
            shouldReload: true,
            shouldKeepExisting: false,
            shouldValidateName: true,
            isReloadCheckedByValue: false,
        });
        // the value is kept as it is
        expect(getAdgCookieSettings(source, 'consent', "it\\'s;", '', '/', '', false)?.value).toBe("it\\'s;");
        // the offset is parsed by `parseInt()`, as before
        expect(getAdgCookieSettings(source, 'consent', '1', '10s', '/', '', false)?.offsetExpiresMs).toBe(10000);
    });

    test.each([
        // path has to be `/` or `none`
        ['consent', '1', '', '', ''],
        ['consent', '1', '', '/path', ''],
        // offset 0 is invalid, and so is the one which is not a number
        ['consent', '1', '0', '/', ''],
        ['consent', '1', 'abc', '/', ''],
        // domain has to be a part of the origin
        ['consent', '1', '', '/', 'other.org'],
    ])('invalid %j is not applied', (name, value, offset, path, domain) => {
        expect(getAdgCookieSettings(source, name, value, offset, path, domain, false)).toBeNull();
    });
});

describe('getUboCookieSettings', () => {
    const source = { name: 'ubo-trusted-set-cookie' };
    const { hostname } = document.location;

    test('settings of uBO rules', () => {
        expect(getUboCookieSettings(source, 'consent', 'a;b', '0', '', ['reload', '1', 'dontOverwrite', '1'])).toEqual({
            name: 'consent',
            value: 'a%3Bb',
            path: '/',
            domain: '',
            offsetExpiresMs: 0,
            isUtcDate: true,
            shouldReload: true,
            shouldKeepExisting: true,
            shouldValidateName: false,
            isReloadCheckedByValue: true,
        });
        expect(getUboCookieSettings(source, 'consent', '1', '', '', ['domain', hostname])?.domain).toBe(hostname);
    });

    test('quotes escaped by the converter are unescaped', () => {
        // asket.com##+js(trusted-set-cookie, CookieConsent, "{stamp:'',necessary:true,…}")
        const settings = getUboCookieSettings(source, 'CookieConsent', "{stamp:\\'\\',necessary:true}", '', '', []);
        expect(settings?.value).toBe("{stamp:'',necessary:true}");
    });

    test.each([
        // only digits and keywords
        ['10s', '', []],
        // path has to be `/`, `none` or empty
        ['', '/path', []],
        // domain has to match the hostname
        ['', '', ['domain', 'other.org']],
    ])('invalid offset %j, path %j or options %j is not applied', (offset, path, args) => {
        expect(getUboCookieSettings(source, 'consent', '1', offset, path, args)).toBeNull();
    });
});
