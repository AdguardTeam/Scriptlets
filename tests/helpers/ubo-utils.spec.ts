import { describe, test, expect } from 'vitest';

import { parseUboOptions, uboPatternToRegExp } from '../../src/helpers/ubo-utils';

describe('parseUboOptions', () => {
    test.each([
        { args: [], expected: {} },
        { args: ['reload', '1'], expected: { reload: 1 } },
        { args: ['reload', '0'], expected: { reload: 0 } },
        { args: ['domain', '.example.org', 'reload', '1'], expected: { domain: '.example.org', reload: 1 } },
        // only digits are converted to numbers
        { args: ['domain', '/^www/', 'reload', '1s'], expected: { domain: '/^www/', reload: '1s' } },
        // key without a value
        { args: ['reload'], expected: {} },
        { args: ['reload', '1', 'domain'], expected: { reload: 1 } },
        // empty key
        { args: ['', '1'], expected: {} },
        // later value wins
        { args: ['reload', '1', 'reload', '0'], expected: { reload: 0 } },
    ])('$args', ({ args, expected }) => {
        expect({ ...parseUboOptions(args) }).toEqual(expected);
    });

    test('key cannot change the prototype', () => {
        const options = parseUboOptions(['__proto__', 'polluted']);
        expect(Object.getPrototypeOf(options)).toBe(null);
        expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });
});

describe('uboPatternToRegExp', () => {
    // pattern, flags, verbatim, expected regular expression
    test.each([
        // empty pattern matches any text
        ['', 'gms', false, /^/],
        // literal pattern is escaped and used with the flags
        ['keydown', 'gms', false, /keydown/gms],
        ['if(floovy()) {', 'gms', false, /if\(floovy\(\)\) \{/gms],
        ['Android/', 'gms', false, /Android\//gms],
        // verbatim literal pattern matches the whole text, e.g. node name
        ['script', 'i', true, /^script$/i],
        ['#text', 'i', true, /^#text$/i],
        // regular expression is used with its own flags only
        ['/initialTimeSeconds = \\d+/', 'gms', false, /initialTimeSeconds = \d+/],
        ['/android/gi', 'gms', false, /android/gi],
        ['/^script$/', 'i', true, /^script$/],
        // slashes inside of a regular expression
        ['/a/b/', '', false, /a\/b/],
        // not a regular expression, as the flags are not valid ones
        ['/ads/x', '', false, /\/ads\/x/],
    ] as [
        pattern: string,
        flags: string,
        verbatim: boolean,
        expected: RegExp,
    ][])('%s', (pattern, flags, verbatim, expected) => {
        const regexp = uboPatternToRegExp(pattern, flags, verbatim);
        expect(regexp).toBeInstanceOf(RegExp);
        expect(regexp?.source).toBe(expected.source);
        expect(regexp?.flags).toBe(expected.flags);
    });

    test('literal pattern matches the text literally', () => {
        const regexp = uboPatternToRegExp('$(function()', 'gms') as RegExp;
        expect('$(function(){})'.replace(regexp, 'x')).toBe('x{})');
    });

    test('invalid regular expression returns null', () => {
        expect(uboPatternToRegExp('/ads(/', 'gms')).toBeNull();
    });
});
