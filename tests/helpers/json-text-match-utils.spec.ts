import {
    describe,
    expect,
    test,
    vi,
} from 'vitest';

import { getAdgJsonTextMatch, getUboJsonTextMatch, isJsonTextMatched } from '../../src/helpers/json-text-match-utils';
import { parseUboOptions } from '../../src/helpers/ubo-utils';
import { getRegexpTester } from '../../src/helpers/regexp-utils';
import { useThrowingMethod } from '../helpers';

const testRegexp = getRegexpTester();

/**
 * Checks whether the pattern matches the text, as a scriptlet does.
 *
 * @param matcher String or regular expression of the pattern.
 * @param text Tested value.
 *
 * @returns True if the text is matched.
 */
const isMatched = (matcher: string | RegExp | null, text: unknown): boolean => {
    if (matcher === null) {
        throw new Error('Pattern has no matcher');
    }
    return isJsonTextMatched(matcher, text, testRegexp);
};

/**
 * Sets `RegExp.$1` as the page may set it, by a successful match with a capturing group.
 *
 * @param value Value of `RegExp.$1`.
 */
const setRegExpCapture = (value: string): void => {
    new RegExp(`(${value})`).test(`x${value}x`);
};

describe('getAdgJsonTextMatch', () => {
    test.each([
        { extraArgs: [] },
        { extraArgs: ['matches'] },
        { extraArgs: ['matches', ''] },
        { extraArgs: ['verbose', 'true'] },
    ])('matches every value for $extraArgs', ({ extraArgs }) => {
        expect(getAdgJsonTextMatch(extraArgs)).toEqual({ isValid: true, pattern: '', matcher: null });
    });

    test('matches a string which the text contains', () => {
        const { matcher } = getAdgJsonTextMatch(['matches', '"ads":[']);
        expect(isMatched(matcher, '{"ads":[1]}')).toBe(true);
        expect(isMatched(matcher, '{"ads":1}')).toBe(false);
    });

    test('matches a regular expression with its flags', () => {
        const { matcher } = getAdgJsonTextMatch(['matches', '/"ADS"/i']);
        expect(isMatched(matcher, '{"ads":1}')).toBe(true);
        expect(isMatched(matcher, '{"data":1}')).toBe(false);
    });

    test('removes escapes of quotes of a string, as for other AdGuard arguments', () => {
        const { matcher } = getAdgJsonTextMatch(['matches', "it\\'s"]);
        expect(isMatched(matcher, '{"t":"it\'s"}')).toBe(true);
    });

    test('is found after other arguments, and its last value is used', () => {
        const { pattern } = getAdgJsonTextMatch(['other', 'matches', 'a', 'matches', 'b']);
        expect(pattern).toBe('b');
    });

    test('a value of the option may be the name of the option', () => {
        const { matcher } = getAdgJsonTextMatch(['matches', 'matches']);
        expect(isMatched(matcher, '{"matches":1}')).toBe(true);
    });

    test('is invalid for an invalid regular expression', () => {
        expect(getAdgJsonTextMatch(['matches', '/[/'])).toEqual({ isValid: false, pattern: '/[/', matcher: null });
    });
});

describe('getUboJsonTextMatch', () => {
    test.each([undefined, '', 0])('matches every value for %s, as uBO', (value) => {
        expect(getUboJsonTextMatch(value)).toEqual({ isValid: true, pattern: '', matcher: null });
    });

    test('matches a string which the text contains, with special characters', () => {
        const { matcher } = getUboJsonTextMatch('"ads":[');
        expect(isMatched(matcher, '{"ads":[1]}')).toBe(true);
        expect(isMatched(matcher, '{"ads":1}')).toBe(false);
    });

    test('matches digits as a string, which parseUboOptions() converts to a number', () => {
        const { matcher } = getUboJsonTextMatch(parseUboOptions(['matches', '117458']).matches);
        expect(isMatched(matcher, '{"id":"117458"}')).toBe(true);
        expect(isMatched(matcher, '{"id":"1"}')).toBe(false);
    });

    test('matches a regular expression literal of a real rule', () => {
        const { matcher } = getUboJsonTextMatch('/^.{1000,}/');
        expect(isMatched(matcher, `{"a":"${'x'.repeat(1000)}"}`)).toBe(true);
        expect(isMatched(matcher, '{"a":"x"}')).toBe(false);
    });

    test('keeps escapes of double quotes, as uBO', () => {
        const { matcher } = getUboJsonTextMatch('\\"ad\\"');
        expect(isMatched(matcher, '{"t":"\\"ad\\""}')).toBe(true);
        expect(isMatched(matcher, '{"t":"ad"}')).toBe(false);
    });

    test('is invalid for an invalid regular expression', () => {
        expect(getUboJsonTextMatch('/[/')).toEqual({ isValid: false, pattern: '/[/', matcher: null });
    });
});

describe('isJsonTextMatched', () => {
    test.each([
        { value: { ads: 1 } },
        { value: ['ads'] },
        { value: null },
        { value: undefined },
        { value: 1 },
    ])('does not match a value which is not a string: $value', ({ value }) => {
        expect(isJsonTextMatched(/./, value, testRegexp)).toBe(false);
    });

    test('tests a regular expression with g flag from the start of each text', () => {
        const regexp = /ads/g;
        expect(isJsonTextMatched(regexp, '{"ads":1}', testRegexp)).toBe(true);
        expect(isJsonTextMatched(regexp, '{"ads":1}', testRegexp)).toBe(true);
    });

    test('does not throw an error of String.prototype.indexOf to the page', () => {
        const restoreIndexOf = useThrowingMethod(String.prototype, 'indexOf');
        let isMatchedText;
        try {
            isMatchedText = isJsonTextMatched('ads', '{"ads":1}', testRegexp);
        } finally {
            restoreIndexOf();
        }
        expect(isMatchedText).toBe(false);
    });

    test('does not throw an error of the tester to the page', () => {
        const throwingTester = () => {
            throw new Error('test');
        };
        expect(isJsonTextMatched(/ads/, '{"ads":1}', throwingTester)).toBe(false);
    });
});

describe('json text matchers do not change RegExp.$1 of the page', () => {
    test.each([
        { label: 'AdGuard string', match: getAdgJsonTextMatch(['matches', 'ads']) },
        { label: 'AdGuard string with an escaped quote', match: getAdgJsonTextMatch(['matches', "ad\\'s"]) },
        { label: 'AdGuard string which starts with a slash', match: getAdgJsonTextMatch(['matches', '/ads']) },
        { label: 'AdGuard regular expression', match: getAdgJsonTextMatch(['matches', '/(ads)/']) },
        { label: 'uBO string', match: getUboJsonTextMatch('(ads)') },
        { label: 'uBO regular expression', match: getUboJsonTextMatch('/(ads)/') },
        { label: 'uBO regular expression of a real rule', match: getUboJsonTextMatch('/ad_shield_wap/') },
    ])('$label', ({ match }) => {
        const texts: Record<string, string> = {
            ads: '{"ads":1}',
            "ad\\'s": '{"t":"ad\'s"}',
            '/ads': '{"u":"/ads"}',
            '/(ads)/': '{"ads":1}',
            '(ads)': '{"t":"(ads)"}',
            '/ad_shield_wap/': '{"ad_shield_wap":1}',
        };
        setRegExpCapture('42');
        expect(isMatched(match.matcher, texts[match.pattern])).toBe(true);
        expect(RegExp.$1).toBe('42');
    });

    test('a regular expression keeps a value after an empty one, also if it does not change the empty one', () => {
        // without a group, so only `$2` changes
        const { matcher } = getUboJsonTextMatch('/ads/');
        /(sku-)?(\d+)/.exec('42');
        expect(isMatched(matcher, '{"ads":1}')).toBe(true);
        expect([RegExp.$1, RegExp.$2]).toEqual(['', '42']);
    });

    test('a regular expression keeps JSON which the page has extracted by a capture, without a log', () => {
        const { matcher } = getUboJsonTextMatch('/ads/');
        const json = JSON.stringify({ ads: 1, items: Array.from({ length: 5000 }, (_, i) => ({ id: i })) });
        const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
        try {
            /<script>(.*)<\/script>/.exec(`<script>${json}</script>`);
            expect(isMatched(matcher, RegExp.$1)).toBe(true);
            expect(consoleLog).not.toHaveBeenCalled();
        } finally {
            consoleLog.mockRestore();
        }
        expect(RegExp.$1 === json).toBe(true);
    });

    test('a string is matched as a string, not as a regular expression', () => {
        expect(getAdgJsonTextMatch(['matches', '"ads":[']).matcher).toBe('"ads":[');
        expect(getAdgJsonTextMatch(['matches', "it\\'s \\\"x\\\""]).matcher).toBe('it\'s "x"');
        expect(getUboJsonTextMatch('"ads":[').matcher).toBe('"ads":[');
        expect(getUboJsonTextMatch('/ads').matcher).toBe('/ads');
    });
});
