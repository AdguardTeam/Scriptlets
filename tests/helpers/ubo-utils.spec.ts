import { describe, test, expect } from 'vitest';

import {
    parseUboOptions,
    uboPatternToRegExp,
    parseUboReplaceDirective,
    getUboConstantValue,
    unescapeUboArgument,
} from '../../src/helpers/ubo-utils';

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

describe('parseUboReplaceDirective', () => {
    // directive, expected pattern, flags and replacement, or null
    test.each([
        // rules from uBO filter lists
        // mega.nz##+js(trusted-replace-argument, RegExp.prototype.test, 0, repl:/\.mp4$/.mp3/, condition, .mp4)
        ['/\\.mp4$/.mp3/', ['\\.mp4$', '', '.mp3']],
        // yt1s.com.co>>##+js(trusted-replace-argument, window.open, 1, repl:/blank/self/)
        ['/blank/self/', ['blank', '', 'self']],
        // eslint-disable-next-line max-len
        // bild.de##+js(trusted-replace-argument, JSON.parse, 0, repl:/"adBlockWallEnabled":true/"adBlockWallEnabled":false/, …)
        [
            '/"adBlockWallEnabled":true/"adBlockWallEnabled":false/',
            ['"adBlockWallEnabled":true', '', '"adBlockWallEnabled":false'],
        ],
        // flags
        ['/ads/no_ads/gi', ['ads', 'gi', 'no_ads']],
        // escaped separator is a part of the pattern or the replacement,
        // `source` of the pattern `a/b` escapes the slash itself
        ['/a\\/b/c/', ['a\\/b', '', 'c']],
        ['/a/b\\/c/', ['a', '', 'b/c']],
        // escaped backslash before the separator does not escape it
        ['/a\\\\/b/', ['a\\\\', '', 'b']],
        // whitespaces are trimmed
        ['/ a / b /', ['a', '', 'b']],
        // quotes followed by the separator are removed
        ['/"a"/"b"/', ['a', '', 'b']],
        // empty replacement
        ['/a//', ['a', '', '']],
        // invalid ones
        ['a/b/', null],
        ['//b/', null],
        ['/a/b', null],
        ['/(/x/', null],
        ['/a/b/z', null],
    ] as [string, [string, string, string] | null][])('%s', (directive, expected) => {
        const result = parseUboReplaceDirective(directive);
        if (expected === null) {
            expect(result).toBeNull();
            return;
        }
        expect(result?.regexp.source).toBe(expected[0]);
        expect(result?.regexp.flags).toBe(expected[1]);
        expect(result?.replacement).toBe(expected[2]);
    });
});

describe('getUboConstantValue', () => {
    test.each([
        ['undefined', undefined],
        ['false', false],
        ['true', true],
        ['null', null],
        ['', ''],
        ["''", ''],
        ['[]', []],
        ['emptyArr', []],
        ['{}', {}],
        ['emptyObj', {}],
        ['42', 42],
        ['-32767', -32767],
        // out of range integers and other text are undefined, as in uBO
        ['32768', undefined],
        ['body', undefined],
        ['1.5', undefined],
        // rules from uBO filter lists
        // enternity.gr##+js(trusted-replace-argument, document.getElementById, 0, json:"header", …)
        ['json:"header"', 'header'],
        // eslint-disable-next-line max-len
        // purepeople.com##+js(trusted-replace-argument, document.querySelector, 0, {"value": ".ad-placement-interstitial"}, …)
        ['{"value": ".ad-placement-interstitial"}', '.ad-placement-interstitial'],
        // invalid JSON is undefined
        ['json:{', undefined],
        ['{"value": }', undefined],
    ])('%j', (raw, expected) => {
        expect(getUboConstantValue(raw, {})).toEqual(expected);
    });

    test('functions', () => {
        expect((getUboConstantValue('noopFunc', {}) as () => unknown)()).toBeUndefined();
        expect((getUboConstantValue('trueFunc', {}) as () => unknown)()).toBe(true);
        expect((getUboConstantValue('falseFunc', {}) as () => unknown)()).toBe(false);
        expect(getUboConstantValue('throwFunc', {})).toThrow();
    });

    test('as option', async () => {
        expect((getUboConstantValue('true', { as: 'function' }) as () => unknown)()).toBe(true);
        expect(((getUboConstantValue('true', { as: 'callback' }) as () => () => unknown)())()).toBe(true);
        await expect(getUboConstantValue('true', { as: 'resolved' })).resolves.toBe(true);
        await expect(getUboConstantValue('true', { as: 'rejected' })).rejects.toBe(true);
    });
});

describe('unescapeUboArgument', () => {
    test.each([
        // camere-live.ro##+js(rmnt, script, "'contextmenu'"), converted by AGTree to `\'contextmenu\'`
        ["\\'contextmenu\\'", "'contextmenu'"],
        // www.lenovo.com##+js(trusted-replace-argument, history.replaceState, 2, "''", condition, ?orgRef)
        ["\\'\\'", "''"],
        // `\"` is kept, as uBO keeps it, e.g. u.co.uk##+js(trusted-rpnt, script, …, \"ad_block\":false, …)
        ['\\"ad_block\\":false', '\\"ad_block\\":false'],
        ['no quotes', 'no quotes'],
        ['', ''],
    ])('%s', (arg, expected) => {
        expect(unescapeUboArgument(arg)).toBe(expected);
    });

    test('other values are returned as they are', () => {
        const object = {};
        expect(unescapeUboArgument(undefined)).toBeUndefined();
        expect(unescapeUboArgument(1)).toBe(1);
        expect(unescapeUboArgument(object)).toBe(object);
    });
});
