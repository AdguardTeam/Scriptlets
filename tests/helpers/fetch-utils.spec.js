import { describe, test, expect } from 'vitest';

import { matchRequestProps, parseMatchProps } from '../../src/helpers';

const GET_METHOD = 'GET';
const METHOD_PROP = 'method';
const URL_PROP = 'url';

const URL1 = 'example.com';
const URL2 = 'http://example.com';
const URL3 = '/^https?://example.org/';
const URL4 = '/^https?://example.org/section#user:45/comments/';

const source = {
    name: 'match-request-props',
    verbose: false,
};

describe('Fetch utils test', () => {
    describe('test parseMatchProps with different url props', () => {
        describe('simple input - check parsed url', () => {
            const testCases = [
                {
                    actual: URL1,
                    expected: URL1,
                    description: 'no url match prop, no protocol, not regexp',
                },
                {
                    actual: `url:${URL1}`,
                    expected: URL1,
                    description: 'has url match prop, no protocol, not regexp',
                },
                {
                    actual: URL2,
                    expected: URL2,
                    description: 'no url match prop, has protocol, not regexp',
                },
                {
                    actual: `url:${URL2}`,
                    expected: URL2,
                    description: 'has url match prop, has protocol, not regexp',
                },
                {
                    actual: URL3,
                    expected: URL3,
                    description: 'no url match prop, has protocol, regexp',
                },
                {
                    actual: `url:${URL3}`,
                    expected: URL3,
                    description: 'has url match prop, has protocol, regexp',
                },
                {
                    actual: URL4,
                    expected: URL4,
                    description: 'no url match prop, has protocol, regexp, extra colon in url',
                },
                {
                    actual: `url:${URL4}`,
                    expected: URL4,
                    description: 'has url match prop, has protocol, extra colon in url',
                },
            ];

            test.each(testCases)('$description - $actual', ({ actual, expected }) => {
                expect(parseMatchProps(actual).url).toStrictEqual(expected);
            });
        });
    });

    describe('mixed input', () => {
        const testCases = [
            {
                actual: `${URL1} ${METHOD_PROP}:${GET_METHOD}`,
                expected: {
                    url: URL1,
                    [METHOD_PROP]: GET_METHOD,
                },
                description: 'no url match prop, no protocol, not regexp',
            },
            {
                actual: `${URL_PROP}:${URL1} ${METHOD_PROP}:${GET_METHOD}`,
                expected: {
                    url: URL1,
                    [METHOD_PROP]: GET_METHOD,
                },
                description: 'has url match prop, no protocol, not regexp',
            },
            {
                actual: `${URL2} ${METHOD_PROP}:${GET_METHOD}`,
                expected: {
                    url: URL2,
                    [METHOD_PROP]: GET_METHOD,
                },
                description: 'no url match prop, has protocol, not regexp',
            },
            {
                actual: `${URL_PROP}:${URL2} ${METHOD_PROP}:${GET_METHOD}`,
                expected: {
                    url: URL2,
                    [METHOD_PROP]: GET_METHOD,
                },
                description: 'has url match prop, has protocol, not regexp',
            },
            {
                actual: `${URL_PROP}:${URL2} ${METHOD_PROP}:${GET_METHOD}`,
                expected: {
                    url: URL2,
                    [METHOD_PROP]: GET_METHOD,
                },
                description: 'has url match prop, has protocol, not regexp',
            },
            {
                actual: `${URL3} ${METHOD_PROP}:${GET_METHOD}`,
                expected: {
                    url: URL3,
                    [METHOD_PROP]: GET_METHOD,
                },
                description: 'no url match prop, has protocol, regexp',
            },
            {
                actual: `${URL_PROP}:${URL3} ${METHOD_PROP}:${GET_METHOD}`,
                expected: {
                    url: URL3,
                    [METHOD_PROP]: GET_METHOD,
                },
                description: 'has url match prop, has protocol, regexp',
            },
            {
                actual: `${URL4} ${METHOD_PROP}:${GET_METHOD}`,
                expected: {
                    url: URL4,
                    [METHOD_PROP]: GET_METHOD,
                },
                description: 'no url match prop, has protocol, regexp, extra colon in url',
            },
            {
                actual: `${URL_PROP}:${URL4} ${METHOD_PROP}:${GET_METHOD}`,
                expected: {
                    url: URL4,
                    [METHOD_PROP]: GET_METHOD,
                },
                description: 'Has url match prop, has protocol, regexp, extra colon in url',
            },
        ];
        test.each(testCases)('$description', ({ actual, expected }) => {
            expect(parseMatchProps(actual)).toStrictEqual(expected);
        });
    });
});

describe('matchRequestProps', () => {
    const requestData = {
        method: GET_METHOD,
        url: 'https://example.org/api/users',
    };

    test.each(['', '*'])('Matches all requests for "%s"', (propsToMatch) => {
        expect(matchRequestProps(source, propsToMatch, requestData)).toBeTruthy();
    });

    test.each([
        {
            propsToMatch: 'example.org/api',
            description: 'URL shorthand',
        },
        {
            propsToMatch: 'url:example.org/api',
            description: 'explicit URL literal',
        },
        {
            propsToMatch: 'url:/^https:\\/\\/example\\.org\\/api\\//',
            description: 'explicit URL regular expression',
        },
        {
            propsToMatch: 'url:/EXAMPLE\\.ORG/i',
            description: 'regular expression with flags',
        },
        {
            propsToMatch: `url:example.org ${METHOD_PROP}:${GET_METHOD}`,
            description: 'multiple matching properties',
        },
    ])('Matches request data using $description', ({ propsToMatch }) => {
        expect(matchRequestProps(source, propsToMatch, requestData)).toBeTruthy();
    });

    test('Matches request data with a URL object', () => {
        const data = {
            url: new URL(requestData.url),
        };

        expect(matchRequestProps(source, 'example.org/api', data)).toBeTruthy();
    });

    test.each([
        {
            propsToMatch: 'url:example.com',
            data: requestData,
            description: 'different property value',
        },
        {
            propsToMatch: `url:example.org ${METHOD_PROP}:POST`,
            data: requestData,
            description: 'one mismatching property',
        },
        {
            propsToMatch: 'body:payload',
            data: requestData,
            description: 'missing property',
        },
        {
            propsToMatch: 'headers:test',
            data: {
                headers: new Headers({ test: 'value' }),
            },
            description: 'non-string property',
        },
        {
            propsToMatch: `url:${requestData.url}`,
            data: Object.create({ url: requestData.url }),
            description: 'inherited property',
        },
        {
            propsToMatch: 'url:/[/',
            data: requestData,
            description: 'invalid regular expression',
        },
    ])('Does not match request data with $description', ({ propsToMatch, data }) => {
        expect(matchRequestProps(source, propsToMatch, data)).toBeFalsy();
    });
});
