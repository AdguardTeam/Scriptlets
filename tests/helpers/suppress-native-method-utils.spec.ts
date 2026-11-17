import { describe, test, expect } from 'vitest';

import { getAdgSuppressSettings, getUboSuppressSettings } from '../../src/helpers/suppress-native-method-utils';
import { type Source } from '../../src/scriptlets';

const adgSource = { name: 'trusted-suppress-native-method', args: [] } as unknown as Source;
const uboSource = { name: 'ubo-trusted-suppress-native-method', args: [] } as unknown as Source;

type ParserArgs = [
    methodPath: string | undefined,
    signature: string | undefined,
    how: string | undefined,
    stack: string | undefined,
];

/**
 * Parses AdGuard arguments.
 *
 * @param args Arguments of the scriptlet.
 * @returns Settings of the rule.
 */
const adg = (...args: ParserArgs) => {
    return getAdgSuppressSettings(adgSource, args[0] as string, args[1] as string, args[2], args[3]);
};

/**
 * Parses uBO arguments.
 *
 * @param args Arguments of the scriptlet.
 * @returns Settings of the rule.
 */
const ubo = (...args: ParserArgs) => getUboSuppressSettings(uboSource, args[0], args[1], args[2], args[3]);

describe('getAdgSuppressSettings', () => {
    test('arguments are parsed as before', () => {
        // eslint-disable-next-line max-len
        // euronews.com#%#//scriptlet('trusted-suppress-native-method', 'Element.prototype.setAttribute', ' |"adheader"', 'prevent')
        const settings = adg('Element.prototype.setAttribute', ' |"adheader"', 'prevent', undefined);
        expect(settings).toMatchObject({
            methodPath: 'Element.prototype.setAttribute',
            how: 'prevent',
            stack: '',
            isStackNegated: false,
            shouldLogCalls: false,
        });
        expect(settings?.isCallMatched(['class', 'adheader-top'])).toBe(true);
        expect(settings?.isCallMatched(['class', 'header'])).toBe(false);
    });

    test.each([
        { how: undefined, expected: 'abort' },
        { how: 'abort', expected: 'abort' },
        { how: 'prevent', expected: 'prevent' },
        { how: 'debug', expected: 'debug' },
        // any other value, also an empty one, prevents the call, as before
        { how: '', expected: 'prevent' },
        { how: 'DEBUG', expected: 'prevent' },
        { how: 'litespeed/js', expected: 'prevent' },
    ])('how $how is $expected', ({ how, expected }) => {
        expect(adg('fetch', '"ads"', how, undefined)?.how).toBe(expected);
    });

    test('object matcher', () => {
        // eslint-disable-next-line max-len
        // chzzkban.xyz#%#//scriptlet('trusted-suppress-native-method', 'Node.prototype.contains', '{"className":"adsbygoogle"}', 'abort')
        const settings = adg('Node.prototype.contains', '{"className":"adsbygoogle"}', 'abort', undefined);
        expect(settings?.isCallMatched([{ className: 'adsbygoogle' }])).toBe(true);
        expect(settings?.isCallMatched([{ className: 'other' }])).toBe(false);
    });

    test.each([
        ['', '"ads"'],
        ['fetch', ''],
        ['fetch', undefined],
    ])('missing path %j or signature %j is not applied', (methodPath, signature) => {
        expect(adg(methodPath, signature as string, undefined, undefined)).toBeNull();
    });
});

describe('getUboSuppressSettings', () => {
    test('quoted text is contained in the argument converted to a string', () => {
        // t.17track.net##+js(trusted-suppress-native-method, Function.prototype.constructor, '"debugger"', abort)
        const settings = ubo('Function.prototype.constructor', '"debugger"', 'abort', undefined);
        expect(settings).toMatchObject({
            how: 'abort',
            shouldLogCalls: false,
        });
        expect(settings?.isCallMatched(['debugger'])).toBe(true);
        expect(settings?.isCallMatched(['while (true) { debugger; }'])).toBe(true);
        expect(settings?.isCallMatched(['return 1'])).toBe(false);
        // a missing argument is `undefined`, which does not contain the text
        expect(settings?.isCallMatched([])).toBe(false);
    });

    test('regular expression in quotes', () => {
        // nxbrew.net,tresdaos.com##+js(trusted-suppress-native-method, eval, '"/chp_?ad/"', prevent)
        const settings = ubo('eval', '"/chp_?ad/"', 'prevent', undefined);
        expect(settings?.isCallMatched(['window.chpad = 1'])).toBe(true);
        expect(settings?.isCallMatched(['window.chp_ad = 1'])).toBe(true);
        expect(settings?.isCallMatched(['window.chp = 1'])).toBe(false);
        // flags are allowed in quotes
        const flagged = ubo('eval', '"/CHP_?AD/i"', 'prevent', undefined);
        expect(flagged?.isCallMatched(['window.chpad = 1'])).toBe(true);
    });

    test('regular expression matches the argument converted to a string', () => {
        // eslint-disable-next-line max-len
        // dragontea.ink##+js(trusted-suppress-native-method, Node.prototype.removeChild, /^\[object HTMLImageElement\]$/, prevent, /emojis8\.js:/)
        const settings = getUboSuppressSettings(
            uboSource,
            'Node.prototype.removeChild',
            '/^\\[object HTMLImageElement\\]$/',
            'prevent',
            '/emojis8\\.js:/',
        );
        expect(settings).toMatchObject({ how: 'prevent', stack: '/emojis8\\.js:/', isStackNegated: false });
        expect(settings?.isCallMatched([{ toString: () => '[object HTMLImageElement]' }])).toBe(true);
        expect(settings?.isCallMatched([{ toString: () => '[object HTMLDivElement]' }])).toBe(false);
    });

    test('regular expression literal with flags is ignored, as in uBO', () => {
        const settings = ubo('eval', '/ADS/i', 'prevent', undefined);
        expect(settings?.isCallMatched(['other'])).toBe(true);
    });

    test('invalid regular expression matches any argument, as in uBO', () => {
        expect(ubo('eval', '/[/', 'prevent', undefined)?.isCallMatched(['x'])).toBe(true);
        expect(ubo('eval', '"/[/"', 'prevent', undefined)?.isCallMatched(['x'])).toBe(true);
    });

    test('text without quotes, a number or an object is ignored, as in uBO', () => {
        // shomareh-yab.ir##+js(trusted-suppress-native-method, Storage.prototype.setItem, searchCount)
        const unquoted = ubo('Storage.prototype.setItem', 'searchCount', undefined, undefined);
        expect(unquoted?.isCallMatched(['other', '1'])).toBe(true);

        // eslint-disable-next-line max-len
        // chzzkban.xyz##+js(trusted-suppress-native-method, Node.prototype.contains, '{"className":"adsbygoogle"}', abort)
        const object = ubo('Node.prototype.contains', '{"className":"adsbygoogle"}', 'abort', undefined);
        expect(object?.isCallMatched([{ className: 'other' }])).toBe(true);

        expect(ubo('eval', '1', 'prevent', undefined)?.isCallMatched([2])).toBe(true);
    });

    test('exact values', () => {
        const settings = ubo('fn', 'true|false|null|undefined', 'prevent', undefined);
        expect(settings?.isCallMatched([true, false, null, undefined])).toBe(true);
        expect(settings?.isCallMatched([true, false, null])).toBe(true);
        expect(settings?.isCallMatched(['true', false, null, undefined])).toBe(false);
        expect(settings?.isCallMatched([true, 0, null, undefined])).toBe(false);
    });

    test('matchers are separated by `|` with whitespaces around it, also inside a regular expression', () => {
        const settings = ubo('fn', '"a" | "b"', 'prevent', undefined);
        expect(settings?.isCallMatched(['xa', 'xb'])).toBe(true);
        expect(settings?.isCallMatched(['xa', 'xc'])).toBe(false);
        // `/a|b/` is split into `/a` and `b/`, which are ignored
        expect(ubo('fn', '/a|b/', 'prevent', undefined)?.isCallMatched(['c'])).toBe(true);
    });

    test('empty matcher is ignored', () => {
        const settings = ubo('fn', '|"b"', 'prevent', undefined);
        expect(settings?.isCallMatched(['x', 'b'])).toBe(true);
        expect(settings?.isCallMatched(['x', 'c'])).toBe(false);
    });

    test.each([
        // as in cimanow.cc,freex2line.online##+js(trusted-suppress-native-method, fetch, '"flashtalking"')
        { how: undefined, expected: 'prevent' },
        { how: '', expected: 'prevent' },
        { how: 'prevent', expected: 'prevent' },
        { how: 'PREVENT', expected: 'prevent' },
        { how: 'abort', expected: 'abort' },
        { how: 'debug', expected: 'debug' },
    ])('how $how is $expected', ({ how, expected }) => {
        expect(ubo('fetch', '"flashtalking"', how, undefined)?.how).toBe(expected);
    });

    test('empty or omitted signature only logs the calls', () => {
        expect(ubo('fetch', undefined, undefined, undefined)?.shouldLogCalls).toBe(true);
        expect(ubo('fetch', '', 'abort', undefined)?.shouldLogCalls).toBe(true);
    });

    test('stack may be negated', () => {
        expect(ubo('fetch', '"ads"', '', '!inlineScript')).toMatchObject({
            stack: 'inlineScript',
            isStackNegated: true,
        });
        // eslint-disable-next-line max-len
        // comingsoon.net,superherohype.com##+js(trusted-suppress-native-method, HTMLScriptElement.prototype.setAttribute, '"data-sdk"', abort, inlineScript)
        expect(ubo('HTMLScriptElement.prototype.setAttribute', '"data-sdk"', 'abort', 'inlineScript')).toMatchObject({
            stack: 'inlineScript',
            isStackNegated: false,
        });
    });

    test('empty path is not applied', () => {
        expect(ubo('', '"ads"', 'abort', undefined)).toBeNull();
        expect(ubo(undefined, '"ads"', 'abort', undefined)).toBeNull();
    });
});
