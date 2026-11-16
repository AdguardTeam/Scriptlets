import { describe, test, expect } from 'vitest';

import {
    getAdgFetchResponseReplacement,
    getUboFetchResponseReplacement,
    type FetchResponseReplacement,
} from '../../src/helpers/fetch-response-utils';
import { type Source } from '../../src/scriptlets';

const adgSource = { name: 'trusted-replace-fetch-response', args: [] } as unknown as Source;
const uboSource = { name: 'ubo-trusted-rpfr', args: [] } as unknown as Source;

/**
 * Returns the settings of the replacement, and fails if they are `null`.
 *
 * @param replacement Settings returned by a parser.
 * @returns Settings of the replacement.
 */
const getSettings = (replacement: FetchResponseReplacement | null): FetchResponseReplacement => {
    expect(replacement).not.toBeNull();
    return replacement as FetchResponseReplacement;
};

describe('getAdgFetchResponseReplacement', () => {
    test('literal pattern of a real rule', () => {
        // litv.tv#%#//scriptlet('trusted-replace-fetch-response', '"PlayAds":true', '"PlayAds":false', 'api/get-urls')
        const settings = getSettings(getAdgFetchResponseReplacement(
            adgSource,
            '"PlayAds":true',
            '"PlayAds":false',
            'api/get-urls',
            false,
            [],
        ));

        expect(settings.pattern).toEqual(/"PlayAds":true/);
        expect(settings.includes).toBeNull();
        expect(settings.isUnchangedReturned).toBe(false);
        expect(settings.isRequestMatched(['https://www.litv.tv/api/get-urls'])).toBe(true);
        expect(settings.isRequestMatched(['https://www.litv.tv/api/other'])).toBe(false);
    });

    test('regular expression with flags of a real rule', () => {
        // eslint-disable-next-line max-len
        // otz.de#%#//scriptlet('trusted-replace-fetch-response', '/ads\.julephosting\.de/g', 'cdn.julephosting.de', '/-episode\.json/')
        const settings = getSettings(getAdgFetchResponseReplacement(
            adgSource,
            '/ads\\.julephosting\\.de/g',
            'cdn.julephosting.de',
            '/-episode\\.json/',
            false,
            [],
        ));

        expect(settings.pattern).toEqual(/ads\.julephosting\.de/g);
        expect(settings.isRequestMatched(['https://www.otz.de/podcast-episode.json'])).toBe(true);
    });

    test('* matches the whole text', () => {
        const settings = getSettings(getAdgFetchResponseReplacement(adgSource, '*', '', '', false, []));
        expect('line 1\nline 2'.replace(settings.pattern as RegExp, '')).toBe('');
    });

    test('empty pattern and replacement only log the calls', () => {
        expect(getSettings(getAdgFetchResponseReplacement(adgSource, '', '', '', false, [])).pattern).toBeNull();
    });

    test('includes option and verbose', () => {
        const settings = getSettings(getAdgFetchResponseReplacement(
            adgSource,
            '"show_ads":true',
            '"show_ads":false',
            'statsig/initialize',
            'true',
            ['includes', '/"user":"anonymous"/'],
        ));

        expect(settings.includes).toEqual(/"user":"anonymous"/);
        expect(settings.shouldLogContent).toBe(true);
    });

    test.each([
        { title: 'empty pattern with a replacement', args: ['', 'x', '', false, []] },
        { title: 'invalid pattern', args: ['/[/', 'x', '', false, []] },
        { title: 'invalid includes', args: ['a', 'x', '', false, ['includes', '/[/']] },
    ])('rule with $title is not applied', ({ args }) => {
        expect(getAdgFetchResponseReplacement(
            adgSource,
            ...(args as [string, string, string, unknown, unknown[]]),
        )).toBeNull();
    });
});

describe('getUboFetchResponseReplacement', () => {
    test('literal pattern and URL of a real rule', () => {
        // www.youtube.com##+js(trusted-rpfr, '"adPlacements"', '"no_ads"', player?)
        const settings = getSettings(getUboFetchResponseReplacement(
            uboSource,
            '"adPlacements"',
            '"no_ads"',
            'player?',
            [],
        ));

        expect(settings.pattern).toEqual(/"adPlacements"/);
        expect(settings.isUnchangedReturned).toBe(true);
        expect(settings.shouldLogContent).toBe(false);
        expect(settings.isRequestMatched(['/youtubei/v1/player?key=1'])).toBe(true);
        expect(settings.isRequestMatched(['/youtubei/v1/next'])).toBe(false);
    });

    test('regular expression with flags of a real rule', () => {
        // eslint-disable-next-line max-len
        // canela.tv##+js(trusted-rpfr, /#EXT-X-KEY:METHOD=NONE\n#EXT(?:INF:[^\n]+|-X-DISCONTINUITY)\n.+?(?=#EXT-X-KEY)/gms, , /media.m3u8)
        const settings = getSettings(getUboFetchResponseReplacement(
            uboSource,
            '/#EXT-X-KEY:METHOD=NONE\\n#EXT(?:INF:[^\\n]+|-X-DISCONTINUITY)\\n.+?(?=#EXT-X-KEY)/gms',
            '',
            '/media.m3u8',
            [],
        ));

        expect(settings.pattern?.flags).toBe('gms');
        expect(settings.isRequestMatched(['https://cdn.canela.tv/v1/media.m3u8'])).toBe(true);
    });

    test('* is matched as the text .*, as in uBO', () => {
        const settings = getSettings(getUboFetchResponseReplacement(uboSource, '*', 'X', '', []));
        expect('abc'.replace(settings.pattern as RegExp, 'X')).toBe('abc');
        expect('a.*c'.replace(settings.pattern as RegExp, 'X')).toBe('aXc');
    });

    test.each([
        { includes: '', expected: null },
        // As in uBO, `0` is falsy, so it matches any text
        { includes: '0', expected: null },
        { includes: 'adSlots', expected: /adSlots/ },
    ])('includes "$includes"', ({ includes, expected }) => {
        const settings = getSettings(getUboFetchResponseReplacement(
            uboSource,
            '"adPlacements"',
            '"no_ads"',
            'player?',
            ['includes', includes],
        ));
        expect(settings.includes).toEqual(expected);
    });

    test.each([
        { title: 'empty pattern, which does nothing in uBO', args: ['', '', '', []] },
        { title: 'invalid pattern', args: ['/[/', 'x', '', []] },
        { title: 'invalid includes', args: ['a', 'x', '', ['includes', '/[/']] },
        { title: 'invalid propsToMatch', args: ['a', 'x', '/[/', []] },
    ])('rule with $title is not applied', ({ args }) => {
        expect(getUboFetchResponseReplacement(
            uboSource,
            ...(args as [string, string, string, unknown[]]),
        )).toBeNull();
    });
});
