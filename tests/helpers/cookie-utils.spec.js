import { concatCookieNameValuePath } from '../../src/helpers/cookie-utils';

describe('concatCookieNameValuePath', () => {
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
        ])('$actual -> $expected', ({ actual, expected }) => {
            expect(concatCookieNameValuePath(...actual)).toBe(expected);
        });
    });

    describe('no cookie value encoding', () => {
        test.each([
            {
                actual: ['name', 'value', ''],
                expected: 'name=value',
            },
            {
                actual: ['__test-cookie_expires', 'expires', '/'],
                expected: '__test-cookie_expires=expires; path=/',
            },
            {
                actual: ['aa::bb::cc', '1', ''],
                expected: 'aa::bb::cc=1',
            },
            {
                actual: ['__w_cc11', '{%22cookies_statistical%22:false%2C%22cookies_ad%22:true}', ''],
                // do not encode cookie value
                // https://github.com/AdguardTeam/Scriptlets/issues/311
                expected: '__w_cc11={%22cookies_statistical%22:false%2C%22cookies_ad%22:true}',
            },
            // invalid name because of ';'
            {
                actual: ['a;bc', 'def', ''],
                expected: null,
            },
            // invalid value because of ';' and it is not being encoded
            {
                actual: ['abc', 'de;f', ''],
                expected: null,
            },
        ])('$actual -> $expected', ({ actual, expected }) => {
            // explicit 'false' to disable encoding
            expect(concatCookieNameValuePath(...actual, false)).toBe(expected);
        });
    });
});
