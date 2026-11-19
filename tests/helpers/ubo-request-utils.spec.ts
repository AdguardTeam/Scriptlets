import { describe, test, expect } from 'vitest';

import {
    parseUboPropsToMatch,
    matchUboProps,
    collateUboFetchArguments,
    type UboPropNeedle,
} from '../../src/helpers/ubo-request-utils';
import { getRegexpTester } from '../../src/helpers/regexp-utils';
import { parseUboOptions } from '../../src/helpers/ubo-utils';
import { useThrowingMethod } from '../helpers';

const testRegexp = getRegexpTester();

/**
 * Returns the parsed patterns, and fails if they are `null`.
 *
 * @param propsToMatch Properties to match.
 * @returns Patterns by the names of the properties.
 */
const parse = (propsToMatch: string): Record<string, UboPropNeedle> => {
    const needles = parseUboPropsToMatch(propsToMatch, 'url');
    expect(needles).not.toBeNull();
    return needles as Record<string, UboPropNeedle>;
};

/**
 * Checks whether the properties match the parsed patterns of `propsToMatch`.
 *
 * @param propsToMatch Properties to match.
 * @param props Properties of the request.
 * @returns True if they match.
 */
const isMatched = (propsToMatch: string, props: Record<string, unknown>): boolean => {
    return matchUboProps(parse(propsToMatch), props, testRegexp);
};

describe('parseUboPropsToMatch', () => {
    test.each([
        // www.youtube.com##+js(trusted-rpfr, '"adPlacements"', '"no_ads"', player?)
        { propsToMatch: 'player?', url: 'https://www.youtube.com/youtubei/v1/player?key=1', expected: true },
        { propsToMatch: 'player?', url: 'https://www.youtube.com/youtubei/v1/next', expected: false },
        // eslint-disable-next-line max-len
        // tokopedia.com##+js(trusted-rpfr, '/\{"id":\d{9,11}…"__typename":"recommendationItem"\},/g', , /\/graphql\/productRecommendation/i)
        {
            propsToMatch: '/\\/graphql\\/productRecommendation/i',
            url: 'https://gql.tokopedia.com/GraphQL/productRecommendation',
            expected: true,
        },
        // www.youtube.com##+js(trusted-rpfr, '"adSlots"', '"no_ads"', /^\W+$/), which matches no URL
        { propsToMatch: '/^\\W+$/', url: 'https://www.youtube.com/youtubei/v1/player', expected: false },
    ])('URL pattern of a real rule: $propsToMatch for $url', ({ propsToMatch, url, expected }) => {
        expect(isMatched(propsToMatch, { url })).toBe(expected);
    });

    test('negated pattern', () => {
        expect(isMatched('!/live/', { url: 'https://example.org/stream' })).toBe(true);
        expect(isMatched('!/live/', { url: 'https://example.org/live/stream' })).toBe(false);
    });

    test('named properties, separated by whitespaces', () => {
        expect(isMatched('method:POST\t\t/api/', { url: 'https://example.org/api/', method: 'POST' })).toBe(true);
        expect(isMatched('method:POST /api/', { url: 'https://example.org/api/', method: 'GET' })).toBe(false);
    });

    test('only the text up to the second colon is used, as in uBO', () => {
        // `https` is the pattern of `url`, so any URL with it is matched
        expect(parse('url:https://example.org/ads')).toEqual({ url: { regexp: /https/, expect: true } });
        // `https` is a name of a property, which requests do not have, so any request is matched
        expect(parse('https://example.org/ads')).toEqual({ https: { regexp: /\/\/example\.org\/ads/, expect: true } });
        expect(isMatched('https://example.org/ads', { url: 'https://other.org/' })).toBe(true);
        // a name with other characters makes the whole text a pattern of the URL
        expect(parse('/https:\\/\\/example\\.org/'))
            .toEqual({ url: { regexp: /https:\/\/example\.org/, expect: true } });
    });

    test('empty pattern matches any value, and a later pattern replaces an earlier one', () => {
        expect(parse('method:')).toEqual({ method: { regexp: null, expect: true } });
        expect(parse('method:GET method:POST')).toEqual({ method: { regexp: /POST/, expect: true } });
    });

    test('literal text is matched with escaped special characters', () => {
        expect(isMatched('a.b', { url: 'a.b' })).toBe(true);
        expect(isMatched('a.b', { url: 'axb' })).toBe(false);
    });

    test('invalid regular expression', () => {
        expect(parseUboPropsToMatch('/[/', 'url')).toBeNull();
    });

    test('pattern without a name is skipped without an implicit property', () => {
        expect(parseUboPropsToMatch('player?')).toEqual({});
    });
});

describe('parseUboPropsToMatch with values of parseUboOptions() and methods which throw', () => {
    test.each([
        { value: '12345', url: '/api/12345', other: '/unrelated' },
        { value: '0', url: '/v0/api', other: '/v1/api' },
    ])('digits $value, converted to a number, are matched as a text, as in uBO', ({ value, url, other }) => {
        const needles = parseUboPropsToMatch(parseUboOptions(['propsToMatch', value]).propsToMatch, 'url');
        expect(matchUboProps(needles!, { url }, testRegexp)).toBe(true);
        expect(matchUboProps(needles!, { url: other }, testRegexp)).toBe(false);
    });

    test.each([
        // a name of letters, digits, `_`, `$`, ` ` and `-`
        { props: 'url:!private', name: 'url' },
        { props: 'method:POST', name: 'method' },
        { props: 'a_$-9:x', name: 'a_$-9' },
        // other characters make the whole text a pattern of the implicit property
        { props: '/api:x', name: 'url' },
        { props: 'a.b:x', name: 'url' },
        { props: 'é:x', name: 'url' },
    ])('$props is read as /[^$\\w -]/ reads the name, also if RegExp.prototype.test throws', ({ props, name }) => {
        const restoreTest = useThrowingMethod(RegExp.prototype, 'test');
        const restoreCharCodeAt = useThrowingMethod(String.prototype, 'charCodeAt');
        let needles;
        try {
            needles = parseUboPropsToMatch(props, 'url');
        } finally {
            restoreTest();
            restoreCharCodeAt();
        }
        expect(Object.keys(needles!)).toEqual([name]);
    });
});

describe('matchUboProps', () => {
    test('property which the request does not have is skipped', () => {
        expect(isMatched('method:POST', { url: 'https://example.org/' })).toBe(true);
    });

    test('value which is not a string is matched as JSON', () => {
        expect(isMatched('keepalive:true', { keepalive: true })).toBe(true);
        // A pattern with `:` would be cut at it, as in uBO
        expect(isMatched('headers:"ads"', { headers: { ads: '1' } })).toBe(true);
    });

    test('regular expression with g flag is matched from the beginning on each call', () => {
        const needles = parse('/ads/g');
        expect(matchUboProps(needles, { url: '/ads' }, testRegexp)).toBe(true);
        expect(matchUboProps(needles, { url: '/ads' }, testRegexp)).toBe(true);
    });
});

describe('collateUboFetchArguments', () => {
    const nativeRequestClone = Request.prototype.clone;
    const URL_AND_METHOD = ['url', 'method'];

    test('string and URL', () => {
        expect(collateUboFetchArguments('/api', { method: 'POST' }, nativeRequestClone, URL_AND_METHOD))
            .toEqual({ url: '/api', method: 'POST' });
        expect(collateUboFetchArguments(new URL('https://example.org/api'), undefined, nativeRequestClone, ['url']))
            .toEqual({ url: 'https://example.org/api' });
    });

    test('Request, with options which override its properties', () => {
        const request = new Request('https://example.org/api', { method: 'POST' });
        const props = collateUboFetchArguments(request, { method: 'PUT' }, nativeRequestClone, URL_AND_METHOD);

        expect(props.url).toBe('https://example.org/api');
        expect(props.method).toBe('PUT');
    });

    test('reads only the properties which the rule matches, each once', () => {
        let bodyReads = 0;
        let methodReads = 0;
        const options = {
            get body() {
                bodyReads += 1;
                return `message-${bodyReads}`;
            },
            get method() {
                methodReads += 1;
                return 'POST';
            },
        };

        // e.g. a pattern of the URL, so the body which native fetch() reads is not read before it
        expect(collateUboFetchArguments('/api', options, nativeRequestClone, ['url'])).toEqual({ url: '/api' });
        expect([bodyReads, methodReads]).toEqual([0, 0]);

        expect(collateUboFetchArguments('/api', options, nativeRequestClone, ['body', 'method']))
            .toEqual({ body: 'message-1', method: 'POST' });
        expect([bodyReads, methodReads]).toEqual([1, 1]);
    });

    test('converts a URL which is not a Request only if the rule matches it', () => {
        let conversions = 0;
        // e.g. a custom URL of the page, which is converted to another string on each call
        const resource = {
            toString() {
                conversions += 1;
                return `/api?seq=${conversions}`;
            },
        };

        expect(collateUboFetchArguments(resource, { method: 'POST' }, nativeRequestClone, ['method']))
            .toEqual({ method: 'POST' });
        expect(conversions).toBe(0);

        expect(collateUboFetchArguments(resource, undefined, nativeRequestClone, ['url']))
            .toEqual({ url: '/api?seq=1' });
        expect(conversions).toBe(1);
    });
});
