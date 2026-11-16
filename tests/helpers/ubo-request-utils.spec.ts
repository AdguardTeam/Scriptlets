import { describe, test, expect } from 'vitest';

import {
    parseUboPropsToMatch,
    matchUboProps,
    collateUboFetchArguments,
    type UboPropNeedle,
} from '../../src/helpers/ubo-request-utils';
import { getRegexpTester } from '../../src/helpers/regexp-utils';

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

    test('string and URL', () => {
        expect(collateUboFetchArguments('/api', { method: 'POST' }, nativeRequestClone))
            .toEqual({ url: '/api', method: 'POST' });
        expect(collateUboFetchArguments(new URL('https://example.org/api'), undefined, nativeRequestClone))
            .toEqual({ url: 'https://example.org/api' });
    });

    test('Request, with options which override its properties', () => {
        const request = new Request('https://example.org/api', { method: 'POST' });
        const props = collateUboFetchArguments(request, { method: 'PUT' }, nativeRequestClone);

        expect(props.url).toBe('https://example.org/api');
        expect(props.method).toBe('PUT');
    });
});
