import { describe, test, expect } from 'vitest';

import {
    getAdgArgumentReplacement,
    getUboArgumentReplacement,
    type ArgumentReplacement,
} from '../../src/helpers/argument-replacement-utils';
import { type Source } from '../../src/scriptlets';

const adgSource = { name: 'trusted-replace-argument', args: [] } as unknown as Source;
const uboSource = { name: 'ubo-trusted-replace-argument', args: [] } as unknown as Source;

/**
 * Returns the settings of the replacement, and fails if they are `null`.
 *
 * @param replacement Settings returned by a parser.
 *
 * @returns Settings of the replacement.
 */
const getSettings = (replacement: ArgumentReplacement | null): ArgumentReplacement => {
    expect(replacement).not.toBeNull();
    return replacement as ArgumentReplacement;
};

describe('getAdgArgumentReplacement', () => {
    test('rule without argumentValue is not applied, unless it only logs', () => {
        // AdGuard rules with an empty value are not applied, as before
        expect(getAdgArgumentReplacement(adgSource, 'Element.prototype.setAttribute', '1', '', '/a/', '', 'false'))
            .toBeNull();
        expect(getAdgArgumentReplacement(adgSource, 'JSON.parse', '', '', '', '', 'true')?.position).toBeNull();
    });

    test('replace: keeps an argument which is not changed, with its type', () => {
        // eslint-disable-next-line max-len
        // buienalarm.nl,…#%#//scriptlet('trusted-replace-argument', 'Element.prototype.setAttribute', '1', 'replace:/.+(error-report|…).+//g')
        const settings = getSettings(getAdgArgumentReplacement(
            adgSource,
            'Element.prototype.setAttribute',
            '1',
            'replace:/.+(error-report|new Promise).+//g',
            '',
            '',
            'false',
        ));
        expect(settings.replace('fetch("/error-report")')).toBe('');
        expect(settings.replace(42)).toBe(42);
        expect(settings.isSetUnchanged).toBe(false);
        expect(settings.isSetBeyondArguments).toBe(true);
    });

    test('constant and pattern', () => {
        // idlixku.com#%#//scriptlet('trusted-replace-argument', 'Math.max', '0', '0', '/^7$/')
        const settings = getSettings(getAdgArgumentReplacement(adgSource, 'Math.max', '0', '0', '/^7$/', '', 'false'));
        expect(settings.position).toBe(0);
        expect(settings.isMatched(7)).toBe(true);
        expect(settings.isMatched(8)).toBe(false);
        expect(settings.replace(7)).toBe(0);
        expect(settings.isSetUnchanged).toBe(true);
    });

    test('text is kept as it is', () => {
        // fibwatch.art#%#//scriptlet('trusted-replace-argument', 'sessionStorage.getItem', '0', 'no_ads', 'w2pass_')
        const settings = getSettings(getAdgArgumentReplacement(
            adgSource,
            'sessionStorage.getItem',
            '0',
            'no_ads',
            'w2pass_',
            '',
            'false',
        ));
        expect(settings.isMatched('w2pass_1')).toBe(true);
        expect(settings.replace('w2pass_1')).toBe('no_ads');
    });

    test('this is the object which the method is called on', () => {
        const settings = getSettings(getAdgArgumentReplacement(
            adgSource,
            'String.prototype.includes',
            'this',
            'replace:/firefox/chrome/',
            'mozilla/5.0',
            '',
            'false',
        ));
        expect(settings.position).toBe('this');
        expect(settings.isMatched('mozilla/5.0 firefox/130.0')).toBe(true);
        expect(settings.replace('mozilla/5.0 firefox/130.0')).toBe('mozilla/5.0 chrome/130.0');
        // other text is still not a position
        expect(getAdgArgumentReplacement(adgSource, 'JSON.parse', 'first', 'x', '', '', 'false')?.position).toBeNaN();
    });

    test('pattern is matched against an object converted to JSON', () => {
        const settings = getSettings(getAdgArgumentReplacement(
            adgSource,
            'Object.defineProperty',
            '2',
            'json:{"value": "disabled"}',
            'enabled',
            '',
            'false',
        ));
        expect(settings.isMatched({ value: 'enabled' })).toBe(true);
        expect(settings.replace({})).toEqual({ value: 'disabled' });
    });
});

describe('getUboArgumentReplacement', () => {
    test('repl: converts the argument to a string, also if not matched, as in uBO', () => {
        // eslint-disable-next-line max-len
        // bild.de##+js(trusted-replace-argument, JSON.parse, 0, repl:/"adBlockWallEnabled":true/"adBlockWallEnabled":false/, condition, adBlockWallEnabled)
        const settings = getSettings(getUboArgumentReplacement(
            uboSource,
            'JSON.parse',
            '0',
            'repl:/"adBlockWallEnabled":true/"adBlockWallEnabled":false/',
            ['condition', 'adBlockWallEnabled'],
        ));
        expect(settings.isMatched('{"adBlockWallEnabled":true}')).toBe(true);
        expect(settings.isMatched('{"other":true}')).toBe(false);
        expect(settings.replace('{"adBlockWallEnabled":true}')).toBe('{"adBlockWallEnabled":false}');
        expect(settings.replace(5)).toBe('5');
        expect(settings.isSetUnchanged).toBe(false);
        expect(settings.isSetBeyondArguments).toBe(false);
    });

    test('condition is a string or a regular expression, matched against the argument converted to a string', () => {
        // eslint-disable-next-line max-len
        // enternity.gr##+js(trusted-replace-argument, document.getElementById, 0, json:"header", condition, /^[A-Za-z]{12}$/)
        const settings = getSettings(getUboArgumentReplacement(
            uboSource,
            'document.getElementById',
            '0',
            'json:"header"',
            ['condition', '/^[A-Za-z]{12}$/'],
        ));
        expect(settings.isMatched('AbcdefGhijkl')).toBe(true);
        expect(settings.isMatched('Abc')).toBe(false);
        expect(settings.replace('AbcdefGhijkl')).toBe('header');

        // copyseeker.net##+js(trusted-replace-argument, document.getElementById, 0, null, condition, adsense-container)
        const stringSettings = getSettings(getUboArgumentReplacement(
            uboSource,
            'document.getElementById',
            '0',
            'null',
            ['condition', 'adsense-container'],
        ));
        expect(stringSettings.isMatched('my-adsense-container')).toBe(true);
        expect(stringSettings.isMatched({ toString: () => 'adsense-container' })).toBe(true);
        expect(stringSettings.replace('adsense-container')).toBeNull();
    });

    test('positions', () => {
        // eslint-disable-next-line max-len
        // cap3.*##+js(trusted-replace-argument, String.prototype.includes, this, 'json:"mozilla/5.0 …"', condition, mozilla/5.0)
        expect(getUboArgumentReplacement(uboSource, 'String.prototype.includes', 'this', 'json:"ua"', [])?.position)
            .toBe('this');
        expect(getUboArgumentReplacement(uboSource, 'JSON.parse', '', '', [])?.position).toBeNull();
        expect(getUboArgumentReplacement(uboSource, 'JSON.parse', '-1', '', [])?.position).toBe(-1);
        // as in uBO, a position which is not a number is the first one
        expect(getUboArgumentReplacement(uboSource, 'JSON.parse', 'first', '', [])?.position).toBe(0);
    });

    test('add:', () => {
        const settings = getSettings(getUboArgumentReplacement(uboSource, 'setTimeout', '1', 'add:-5000', []));
        expect(settings.replace('8000')).toBe(3000);
        expect(getUboArgumentReplacement(uboSource, 'setTimeout', '1', 'add:many', [])).toBeNull();
    });

    test.each([
        ['repl:/(/x/', []],
        ['repl:/a/b', []],
        ['json:1', ['condition', '/(/']],
    ])('invalid %s %j is not applied', (argraw, args) => {
        expect(getUboArgumentReplacement(uboSource, 'JSON.parse', '0', argraw, args)).toBeNull();
    });
});
