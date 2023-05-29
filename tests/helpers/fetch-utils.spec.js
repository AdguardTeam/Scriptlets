import { parseMatchProps } from '../../src/helpers';

const GET_METHOD = 'GET';
const METHOD_PROP = 'method';
const URL_PROP = 'url';

const URL1 = 'example.com';
const URL2 = 'http://example.com';
const URL3 = '/^https?://example.org/';
const URL4 = '/^https?://example.org/section#user:45/comments/';

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
