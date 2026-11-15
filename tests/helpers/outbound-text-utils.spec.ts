import { describe, test, expect } from 'vitest';

import {
    getAdgOutboundTextReplacement,
    getUboOutboundTextReplacement,
    type OutboundTextReplacement,
} from '../../src/helpers/outbound-text-utils';
import { type Source } from '../../src/scriptlets';

const adgSource = { name: 'trusted-replace-outbound-text', args: [] } as unknown as Source;
const uboSource = { name: 'ubo-trusted-replace-outbound-text', args: [] } as unknown as Source;

/**
 * Returns the settings of the replacement, and fails if they are `null`.
 *
 * @param replacement Settings returned by a parser.
 *
 * @returns Settings of the replacement.
 */
const getSettings = (replacement: OutboundTextReplacement | null): OutboundTextReplacement => {
    expect(replacement).not.toBeNull();
    return replacement as OutboundTextReplacement;
};

describe('getAdgOutboundTextReplacement', () => {
    test('positional arguments are parsed as before', () => {
        // eslint-disable-next-line max-len
        // infinityscans.org,infinityscans.net,infinityscans.xyz#%#//scriptlet("trusted-replace-outbound-text", "atob", "window.matchMedia('(display-mode: standalone)').matches", "!0")
        const settings = getSettings(getAdgOutboundTextReplacement(
            adgSource,
            'atob',
            "window.matchMedia('(display-mode: standalone)').matches",
            '!0',
            '',
            '',
            '',
            [],
        ));

        expect(settings).toEqual({
            methodPath: 'atob',
            pattern: /window\.matchMedia\('\(display-mode: standalone\)'\)\.matches/,
            replacement: '!0',
            condition: null,
            encoding: '',
            isBase64Strict: true,
            stack: '',
            shouldLogContent: false,
        });
    });

    test('regular expression with flags', () => {
        // eslint-disable-next-line max-len
        // chatgpt.com#%#//scriptlet('trusted-replace-outbound-text', 'TextDecoder.prototype.decode', '/(<span\b(?![^>]*\bdata-clear-all)[^>]*\bdata-conversation-control=")assistant-ads"/g', '$1assistant-xds"')
        const settings = getSettings(getAdgOutboundTextReplacement(
            adgSource,
            'TextDecoder.prototype.decode',
            '/(<span\\b(?![^>]*\\bdata-clear-all)[^>]*\\bdata-conversation-control=")assistant-ads"/g',
            '$1assistant-xds"',
            '',
            '',
            '',
            [],
        ));

        expect(settings.pattern?.flags).toBe('g');
        expect('<span data-conversation-control="assistant-ads">'.replace(settings.pattern!, settings.replacement))
            .toBe('<span data-conversation-control="assistant-xds">');
    });

    test('empty textToReplace only logs the text', () => {
        expect(getSettings(getAdgOutboundTextReplacement(adgSource, 'atob', '', '', '', '', '', [])).pattern)
            .toBeNull();
    });

    test('json: replacement is literal text, as before', () => {
        expect(getSettings(getAdgOutboundTextReplacement(adgSource, 'atob', 'a', 'json:0', '', '', '', []))
            .replacement).toBe('json:0');
    });

    test('decodeMethod other than base64, stack and logContent', () => {
        const settings = getSettings(getAdgOutboundTextReplacement(
            adgSource,
            'Array.prototype.join',
            'foo',
            'bar',
            'hex',
            'testStackFunction',
            'true',
            [],
        ));

        expect(settings.encoding).toBe('');
        expect(settings.stack).toBe('testStackFunction');
        expect(settings.shouldLogContent).toBe(true);
        expect(getSettings(getAdgOutboundTextReplacement(adgSource, 'atob', 'a', '', 'base64', '', '', [])).encoding)
            .toBe('base64');
    });

    test('condition option', () => {
        const settings = getSettings(getAdgOutboundTextReplacement(
            adgSource,
            'atob',
            'foo',
            'bar',
            '',
            '',
            '',
            ['condition', '/^ads/'],
        ));
        expect(settings.condition).toEqual(/^ads/);
        expect(getSettings(getAdgOutboundTextReplacement(
            adgSource,
            'atob',
            'foo',
            'bar',
            '',
            '',
            '',
            ['condition', 'a.b'],
        )).condition).toEqual(/a\.b/);
    });

    test.each([
        { title: 'without methodPath', args: ['', 'foo', '', '', '', '', []] },
        { title: 'invalid stack', args: ['atob', 'foo', '', '', '/[/', '', []] },
        { title: 'invalid textToReplace', args: ['atob', '/[/', '', '', '', '', []] },
        { title: 'invalid condition', args: ['atob', 'foo', '', '', '', '', ['condition', '/[/']] },
    ])('rule $title is not applied', ({ args }) => {
        expect(getAdgOutboundTextReplacement(
            adgSource,
            ...(args as [string, string, string, string, string, string, string[]]),
        )).toBeNull();
    });
});

describe('getUboOutboundTextReplacement', () => {
    test('string pattern is matched literally once', () => {
        // shein.com##+js(trusted-replace-outbound-text, String.prototype.trim, iframe, nonframe)
        const settings = getSettings(getUboOutboundTextReplacement(
            uboSource,
            'String.prototype.trim',
            'iframe',
            'nonframe',
            [],
        ));

        expect(settings).toEqual({
            methodPath: 'String.prototype.trim',
            pattern: /iframe/,
            replacement: 'nonframe',
            condition: null,
            encoding: '',
            isBase64Strict: false,
            stack: '',
            shouldLogContent: false,
        });
    });

    test('regular expression with flags, and condition', () => {
        // eslint-disable-next-line max-len
        // ab.nanacdn.com,abysscdn.com,…##+js(trusted-replace-outbound-text, Array.prototype.shift, /^.+$/s, '', condition, https)
        const settings = getSettings(getUboOutboundTextReplacement(
            uboSource,
            'Array.prototype.shift',
            '/^.+$/s',
            '',
            ['condition', 'https'],
        ));

        expect(settings.pattern).toEqual(/^.+$/s);
        expect(settings.replacement).toBe('');
        expect(settings.condition).toEqual(/https/);
    });

    test('empty pattern only logs the text', () => {
        // pahe.ink##+js(trusted-replace-outbound-text, decodeURIComponent, /^[0-9a-f]__$/) has a pattern,
        // while an empty one is used for logging
        const logSettings = getSettings(getUboOutboundTextReplacement(uboSource, 'atob', '', '', []));
        expect(logSettings.pattern).toBeNull();
        expect(logSettings.shouldLogContent).toBe(true);
        expect(getSettings(getUboOutboundTextReplacement(uboSource, 'decodeURIComponent', '/^[0-9a-f]__$/', '', []))
            .pattern).toEqual(/^[0-9a-f]__$/);
    });

    test.each([
        { condition: '', expected: null },
        // As in uBO, `0` is falsy, so it matches any text
        { condition: '0', expected: null },
        { condition: '/www|cloudfront/', expected: /www|cloudfront/ },
    ])('condition "$condition"', ({ condition, expected }) => {
        // animefire.io##+js(trusted-replace-outbound-text, atob, /.+/, , condition, /www|cloudfront/)
        const settings = getSettings(getUboOutboundTextReplacement(
            uboSource,
            'atob',
            '/.+/',
            '',
            ['condition', condition],
        ));
        expect(settings.condition).toEqual(expected);
    });

    test('json: replacement', () => {
        expect(getSettings(getUboOutboundTextReplacement(uboSource, 'atob', 'a', 'json:"\\"ads\\":0"', []))
            .replacement).toBe('"ads":0');
        expect(getSettings(getUboOutboundTextReplacement(uboSource, 'atob', 'a', 'json:0', [])).replacement)
            .toBe('0');
    });

    test('encoding option', () => {
        expect(getSettings(getUboOutboundTextReplacement(uboSource, 'atob', 'a', '', ['encoding', 'base64']))
            .encoding).toBe('base64');
        expect(getSettings(getUboOutboundTextReplacement(uboSource, 'atob', 'a', '', ['encoding', 'hex']))
            .encoding).toBe('');
    });

    test.each([
        { title: 'without methodPath', args: ['', 'foo', '', []] },
        { title: 'invalid pattern', args: ['atob', '/[/', '', []] },
        { title: 'invalid condition', args: ['atob', 'foo', '', ['condition', '/[/']] },
        { title: 'invalid JSON of replacement', args: ['atob', 'foo', 'json:{', []] },
    ])('rule $title is not applied', ({ args }) => {
        expect(getUboOutboundTextReplacement(
            uboSource,
            ...(args as [string, string, string, string[]]),
        )).toBeNull();
    });
});
