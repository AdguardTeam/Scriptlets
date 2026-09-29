import { describe, test, expect } from 'vitest';

import { getUrlParamValue } from '../../src/helpers/url-utils';

type TestCase = {
    /**
     * Search and hash of the URL with the parameter, e.g. '?url=https://example.org/'.
     */
    query: string;
    /**
     * Name of the parameter, defaults to 'url'.
     */
    name?: string;
    expected: string;
};

/**
 * Gets the value of the parameter from the redirect URL with given search and hash.
 *
 * @param query Search and hash of the URL.
 * @param name Name of the parameter.
 *
 * @returns The value of the parameter.
 */
const getValue = (query: string, name = 'url'): string => {
    return getUrlParamValue(new URL(`https://tracker.example/out${query}`), name);
};

/**
 * Form-encodes the value of the 'url' parameter, e.g. as URLSearchParams or PHP urlencode() do,
 * so a whitespace is encoded as '+'.
 *
 * @param value Value of the parameter.
 *
 * @returns Search string with the encoded parameter.
 */
const formEncode = (value: string): string => `?${new URLSearchParams({ url: value })}`;

describe('getUrlParamValue', () => {
    test.each<TestCase>([
        { query: '', expected: '' },
        { query: '?a=1', expected: '' },
        { query: '?url', expected: '' },
        { query: '?url=', expected: '' },
        { query: '?url=+', expected: ' ' },
    ])('missing or empty parameter: "$query"', ({ query, name, expected }) => {
        expect(getValue(query, name)).toBe(expected);
    });

    test.each<TestCase>([
        { query: '?url=https://example.org/', expected: 'https://example.org/' },
        { query: '?url=https%3A%2F%2Fexample.org%2Fc%2B%2B', expected: 'https://example.org/c++' },
        { query: '?url=https://example.org/a%20b', expected: 'https://example.org/a b' },
        // hash of the URL with the parameter is not a part of the value
        { query: '?url=https://example.org/a#b', expected: 'https://example.org/a' },
    ])('value without "+" is the same as by searchParams: "$query"', ({ query, name, expected }) => {
        expect(getValue(query, name)).toBe(expected);
        expect(getValue(query, name)).toBe(new URL(`https://tracker.example/out${query}`).searchParams.get('url'));
    });

    test.each<TestCase>([
        { query: '?q=red+shoes', name: 'q', expected: 'red shoes' },
        { query: '?url=red+shoes&x=1', expected: 'red shoes' },
    ])('"+" in value which is not a URL is a whitespace: "$query"', ({ query, name, expected }) => {
        expect(getValue(query, name)).toBe(expected);
    });

    test.each<TestCase>([
        { query: '?url=https://example.org/c++/docs', expected: 'https://example.org/c++/docs' },
        {
            query: '?url=https://example.org/search?q=hello+world',
            expected: 'https://example.org/search?q=hello+world',
        },
        // only the scheme separator is encoded
        { query: '?url=https%3A//example.org/c++/colon', expected: 'https://example.org/c++/colon' },
        { query: '?url=HTTPS%3a//example.org/c++', expected: 'HTTPS://example.org/c++' },
        // other percent-encoded characters are decoded
        { query: '?url=https://example.org/%C3%BCber+uns', expected: 'https://example.org/über+uns' },
        { query: '?url=https://example.org/s?q=caf%C3%A9+au+lait', expected: 'https://example.org/s?q=café+au+lait' },
    ])('"+" in URL which is not encoded is kept: "$query"', ({ query, name, expected }) => {
        expect(getValue(query, name)).toBe(expected);
    });

    test.each<TestCase>([
        { query: '?url=/search?q=a+b', expected: '/search?q=a+b' },
        { query: '?url=./c++/docs', expected: './c++/docs' },
        { query: '?url=../c++/docs', expected: '../c++/docs' },
        { query: '?url=?q=a+b', expected: '?q=a+b' },
    ])('"+" in path is kept: "$query"', ({ query, name, expected }) => {
        expect(getValue(query, name)).toBe(expected);
    });

    test.each<TestCase>([
        // before the query '+' is a form-encoded whitespace
        { query: formEncode('https://example.org/red shoes'), expected: 'https://example.org/red shoes' },
        // in the query '+' means a whitespace anyway, so it is kept
        { query: formEncode('https://example.org/s?q=red shoes'), expected: 'https://example.org/s?q=red+shoes' },
        { query: '?url=page.html?q=a+b', expected: 'page.html?q=a+b' },
    ])('"+" in encoded URL is kept only in its query: "$query"', ({ query, name, expected }) => {
        expect(getValue(query, name)).toBe(expected);
    });

    test.each<TestCase>([
        // hash router, whose query is in the hash
        {
            query: formEncode('https://example.org/#/search?q=red shoes'),
            expected: 'https://example.org/#/search?q=red shoes',
        },
        {
            query: formEncode('https://example.org/#/search/red shoes'),
            expected: 'https://example.org/#/search/red shoes',
        },
        {
            query: formEncode('https://example.org/?v=2#/search/red shoes'),
            expected: 'https://example.org/?v=2#/search/red shoes',
        },
        // '+' in the query before the hash is kept
        {
            query: formEncode('https://example.org/s?q=red shoes#tag cloud'),
            expected: 'https://example.org/s?q=red+shoes#tag cloud',
        },
    ])('"+" in the hash of encoded URL is a whitespace: "$query"', ({ query, name, expected }) => {
        expect(getValue(query, name)).toBe(expected);
    });

    test.each<TestCase>([
        { query: '?url=https://a.example/x+y&url=https://b.example/', expected: 'https://a.example/x+y' },
        { query: '?url=a+b&url=https://b.example/c+d', expected: 'a b' },
    ])('value of the first parameter with the name is returned: "$query"', ({ query, name, expected }) => {
        expect(getValue(query, name)).toBe(expected);
    });

    test.each<TestCase>([
        // encoded name
        { query: '?u%72l=https://example.org/a+b', expected: 'https://example.org/a+b' },
        // '+' in the name is a whitespace
        { query: '?my+url=https://example.org/a+b', name: 'my url', expected: 'https://example.org/a+b' },
        // leading '?' is a part of the name
        {
            query: '??url=https://evil.example/a+b&url=https://good.example/c+d',
            expected: 'https://good.example/c+d',
        },
        { query: '??url=https://example.org/a+b', name: '?url', expected: 'https://example.org/a+b' },
    ])('parameter name is matched as by searchParams: "$query"', ({ query, name, expected }) => {
        expect(getValue(query, name)).toBe(expected);
    });

    test.each<TestCase>([
        { query: '?=https://example.org/c++', name: '', expected: 'https://example.org/c++' },
        // empty pairs are not the parameter with empty name
        { query: '?&=https://example.org/c++', name: '', expected: 'https://example.org/c++' },
        { query: '?url=x&&=https://example.org/c++', name: '', expected: 'https://example.org/c++' },
        { query: '?url=a+b', name: '', expected: '' },
    ])('parameter with empty name: "$query"', ({ query, name, expected }) => {
        expect(getValue(query, name)).toBe(expected);
    });
});
