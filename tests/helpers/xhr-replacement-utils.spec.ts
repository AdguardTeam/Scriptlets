import { describe, test, expect } from 'vitest';

import {
    getAdgXhrResponseReplacement,
    getUboXhrResponseReplacement,
    type XhrResponseReplacement,
} from '../../src/helpers/xhr-replacement-utils';
import {
    getAdgResponseTextReplacement,
    getUboResponseTextReplacement,
    replaceResponseText,
} from '../../src/helpers/response-text-utils';
import { getRegexpTester } from '../../src/helpers/regexp-utils';
import { getXhrData } from '../../src/helpers/request-utils';
import { type Source } from '../../src/scriptlets';

const adgSource = { name: 'trusted-replace-xhr-response', args: [] } as unknown as Source;
const uboSource = { name: 'ubo-trusted-replace-xhr-response', args: [] } as unknown as Source;
const testRegexp = getRegexpTester();

/**
 * Returns the settings of the replacement, and fails if they are `null`.
 *
 * @param replacement Settings returned by a parser.
 * @returns Settings of the replacement.
 */
const getSettings = (replacement: XhrResponseReplacement | null): XhrResponseReplacement => {
    expect(replacement).not.toBeNull();
    return replacement as XhrResponseReplacement;
};

/**
 * Replaces the text by the settings, as the engine does.
 *
 * @param settings Settings of the replacement.
 * @param text Text of the response.
 * @returns Replaced text, or `null` if it is not replaced.
 */
const replace = (settings: XhrResponseReplacement, text: string): string | null => {
    return replaceResponseText(adgSource, settings, settings.pattern as RegExp, text, testRegexp);
};

describe('getAdgXhrResponseReplacement', () => {
    test('literal pattern of a real rule replaces the first occurrence', () => {
        // fitforfun.de#%#//scriptlet('trusted-replace-xhr-response', 'true', 'false', 'global_config.json')
        const settings = getSettings(getAdgXhrResponseReplacement(
            adgSource,
            'true',
            'false',
            'global_config.json',
            false,
            [],
        ));

        expect(replace(settings, '{"ads":true,"tracking":true}')).toBe('{"ads":false,"tracking":true}');
        expect(settings.isRequestMatched(getXhrData('GET', '/config/global_config.json'))).toBe(true);
        expect(settings.isRequestMatched(getXhrData('GET', '/config/other.json'))).toBe(false);
    });

    test('* replaces the whole text', () => {
        // truthsocial.com#%#//scriptlet('trusted-replace-xhr-response', '*', '[{"ad":{…}}]', …), with a short value
        const settings = getSettings(getAdgXhrResponseReplacement(adgSource, '*', '[]', '', false, []));
        expect(replace(settings, '[{"id":1},\n{"id":2}]')).toBe('[]');
    });

    test('responseType document is not replaced, other ones are', () => {
        const settings = getSettings(getAdgXhrResponseReplacement(adgSource, 'a', 'b', '', false, []));

        const types: XMLHttpRequestResponseType[] = ['', 'text', 'json', 'arraybuffer', 'blob'];
        expect(types.every((type) => settings.isResponseTypeReplaced(type))).toBe(true);
        expect(settings.isResponseTypeReplaced('document')).toBe(false);
    });

    test('empty pattern and replacement only log the requests', () => {
        const settings = getSettings(getAdgXhrResponseReplacement(adgSource, '', '', '', false, []));

        expect(settings.pattern).toBeNull();
        // Requests are logged when they are opened, and not forged
        expect(settings.isRequestMatched(getXhrData('GET', '/api'))).toBe(false);
    });

    test('includes option', () => {
        // lookmovie.pn#%#//scriptlet('trusted-replace-xhr-response', '/Timeout":\d+/', 'Timeout":0', '/api/v'),
        // with `includes`
        const settings = getSettings(getAdgXhrResponseReplacement(
            adgSource,
            '/Timeout":\\d+/',
            'Timeout":0',
            '/api/v',
            '',
            ['includes', 'skip'],
        ));

        expect(replace(settings, '{"adTimeout":15,"skipTimeout":5}')).toBe('{"adTimeout":0,"skipTimeout":5}');
        expect(replace(settings, '{"adTimeout":15}')).toBeNull();
    });
});

describe('getUboXhrResponseReplacement', () => {
    test('URL of a real rule is matched against the URL passed to open()', () => {
        // eslint-disable-next-line max-len
        // tv.youtube.com##+js(trusted-replace-xhr-response, '"adPlacements"', '"no_ads"', /playlist\?list=|\/player(?:\?.+)?$|watch\?[tv]=/)
        const settings = getSettings(getUboXhrResponseReplacement(
            uboSource,
            '"adPlacements"',
            '"no_ads"',
            '/playlist\\?list=|\\/player(?:\\?.+)?$|watch\\?[tv]=/',
            [],
        ));

        expect(settings.isRequestMatched(getXhrData('POST', '/youtubei/v1/player?key=1'))).toBe(true);
        expect(settings.isRequestMatched(getXhrData('POST', '/youtubei/v1/next'))).toBe(false);
        expect(replace(settings, '{"adPlacements":[]}')).toBe('{"no_ads":[]}');
        // As in uBO, the text which has not changed is not replaced
        expect(replace(settings, '{"videoDetails":{}}')).toBeNull();
    });

    test('method is matched as well', () => {
        const settings = getSettings(getUboXhrResponseReplacement(uboSource, 'ads', 'x', 'method:POST /api/', []));

        expect(settings.isRequestMatched(getXhrData('POST', '/api/'))).toBe(true);
        expect(settings.isRequestMatched(getXhrData('GET', '/api/'))).toBe(false);
    });

    test('only text response types are replaced, as in uBO', () => {
        const settings = getSettings(getUboXhrResponseReplacement(uboSource, 'a', 'b', '', []));

        expect(settings.isResponseTypeReplaced('')).toBe(true);
        expect(settings.isResponseTypeReplaced('text')).toBe(true);
        const types: XMLHttpRequestResponseType[] = ['json', 'arraybuffer', 'blob', 'document'];
        expect(types.some((type) => settings.isResponseTypeReplaced(type))).toBe(false);
    });

    test('empty pattern prepends the replacement, unlike in trusted-replace-fetch-response', () => {
        const settings = getSettings(getUboXhrResponseReplacement(uboSource, '', 'PREFIX-', '', []));
        expect(replace(settings, 'text')).toBe('PREFIX-text');
    });

    test.each([
        { title: 'invalid pattern', args: ['/[/', 'x', '', []] },
        { title: 'invalid includes', args: ['a', 'x', '', ['includes', '/[/']] },
        { title: 'invalid propsToMatch', args: ['a', 'x', '/[/', []] },
    ])('rule with $title is not applied', ({ args }) => {
        expect(getUboXhrResponseReplacement(uboSource, ...(args as [string, string, string, unknown[]]))).toBeNull();
    });
});

describe('response text parsers', () => {
    test('empty uBO pattern does nothing in trusted-replace-fetch-response', () => {
        expect(getUboResponseTextReplacement(uboSource, '', 'x', [], false)).toBeNull();
        expect(getUboResponseTextReplacement(uboSource, '', 'x', [], true)?.pattern).toEqual(/^/);
    });

    test('* of uBO is matched as the text .*', () => {
        const settings = getUboResponseTextReplacement(uboSource, '*', 'X', [], true);
        expect(settings?.pattern).toEqual(/\.\*/);
    });

    test('AdGuard pattern which is found is replaced even if the text does not change', () => {
        const settings = getAdgResponseTextReplacement(adgSource, 'ads', 'ads', false, []);
        expect(replaceResponseText(adgSource, settings!, settings!.pattern as RegExp, 'ads', testRegexp)).toBe('ads');
    });

    test('pattern with g flag is matched from the beginning of each text', () => {
        const settings = getAdgResponseTextReplacement(adgSource, '/a/g', 'b', false, []);
        const pattern = settings!.pattern as RegExp;

        expect(replaceResponseText(adgSource, settings!, pattern, 'aa', testRegexp)).toBe('bb');
        expect(replaceResponseText(adgSource, settings!, pattern, 'aa', testRegexp)).toBe('bb');
    });
});
