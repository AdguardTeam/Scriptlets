import { describe, test, expect } from 'vitest';

import { getAdgConstantSetting, getUboConstantSetting } from '../../src/helpers/set-constant-utils';
import { wrapConstantValue } from '../../src/helpers/noop-utils';
import { type Source } from '../../src/scriptlets';

const source = { name: 'trusted-set-constant', args: [] } as unknown as Source;

describe('getAdgConstantSetting', () => {
    // Rules from AdGuard filter lists
    test.each([
        // letv8.cc,zhibo1.cc#%#//scriptlet('trusted-set-constant', 'adsv', '"Y"')
        ['adsv', '"Y"', 'Y'],
        // lexlege.pl#%#//scriptlet('trusted-set-constant', 'gapi', '{"plusone": {}}')
        ['gapi', '{"plusone": {}}', { plusone: {} }],
        // otakufilmes.org#%#//scriptlet('trusted-set-constant', 'otakuAdsState', 'clear')
        ['otakuAdsState', 'clear', 'clear'],
        ['number', '500', 500],
    ])('%s %s', (property, value, expected) => {
        const setting = getAdgConstantSetting(source, property, value, '', '', []);
        expect(setting?.value).toEqual(expected);
        expect(setting?.isCanceledByOtherType).toBe(true);
        expect(setting?.runAt).toBeUndefined();
    });

    test('rule is not applied without a property or with a too big number, as before', () => {
        expect(getAdgConstantSetting(source, '', '1', '', '', [])).toBeNull();
        expect(getAdgConstantSetting(source, 'number', '32768', '', '', [])).toBeNull();
    });

    test('valueWrapper, as in set-constant', () => {
        // lexlege.pl#%#//scriptlet('trusted-set-constant', 'gapi', '{"plusone": {}}'), with `asFunction`
        const setting = getAdgConstantSetting(source, 'gapi', '{"plusone": {}}', '', 'asFunction', []);
        expect((setting?.value as () => unknown)()).toEqual({ plusone: {} });
        // unknown wrapper is ignored, as in set-constant
        expect(getAdgConstantSetting(source, 'gapi', '{"plusone": {}}', '', 'function', [])?.value)
            .toEqual({ plusone: {} });
    });

    test('runAt option', () => {
        // letv8.cc,zhibo1.cc#%#//scriptlet('trusted-set-constant', 'adsv', '"Y"'), with `runAt`
        expect(getAdgConstantSetting(source, 'adsv', '"Y"', '', '', ['runAt', 'interactive'])?.runAt)
            .toBe('interactive');
    });

    test('stack', () => {
        expect(getAdgConstantSetting(source, 'document.first', '1', 'checking.js', '', [])?.stack).toBe('checking.js');
    });
});

describe('getUboConstantSetting', () => {
    // Rules from uBO filter lists, converted to AdGuard syntax by AGTree
    test.each([
        // octopusenergy.de##+js(trusted-set, cmp_importvendors, '{"value": ["s23","s2564"]}')
        ['cmp_importvendors', '{"value": ["s23","s2564"]}', ['s23', 's2564']],
        // littlebigsnake.com##+js(trusted-set, ADS.STATUS_ERROR, json:"COMPLETE")
        ['ADS.STATUS_ERROR', 'json:"COMPLETE"', 'COMPLETE'],
        // rooter.gg##+js(trusted-set, __NEXT_DATA__…remainingWatchDuration, json:9999999999), no limit of json:
        ['remainingWatchDuration', 'json:9999999999', 9999999999],
        // av1core.*##+js(trusted-set, document.visibilityState, visible), other text is undefined
        ['document.visibilityState', 'visible', undefined],
        // emturbovid.com,…##+js(trusted-set, premium, "'1'"), converted to `\'1\'`
        ['premium', "\\'1\\'", undefined],
    ])('%s %s', (chain, rawValue, expected) => {
        const setting = getUboConstantSetting(chain, rawValue, []);
        expect(setting?.value).toEqual(expected);
        expect(setting?.isCanceledByOtherType).toBe(false);
        expect(setting?.stack).toBe('');
    });

    test('options', () => {
        // eslint-disable-next-line max-len
        // sanadegreecollege.in,…##+js(trusted-set, document.activeElement, { "value": {"tagName": "IFRAME" }}, runAt, 2)
        expect(getUboConstantSetting('document.activeElement', '{ "value": {"tagName": "IFRAME" }}', ['runAt', '2']))
            .toEqual(expect.objectContaining({ value: { tagName: 'IFRAME' }, runAt: 2 }));

        // funradio.fr##+js(trusted-set, getUserConsentStatus, json:{"dailymotion":true}, as, function)
        const setting = getUboConstantSetting('getUserConsentStatus', 'json:{"dailymotion":true}', ['as', 'function']);
        expect((setting?.value as () => unknown)()).toEqual({ dailymotion: true });
    });

    test('noopFunc, trueFunc and falseFunc are cloaked', () => {
        const setting = getUboConstantSetting('ads.isEnabled', 'trueFunc', []);
        const fn = setting?.value as () => boolean;
        expect(fn()).toBe(true);
        expect(fn.name).toBe('isEnabled');
        expect(fn.toString()).toBe('function isEnabled() { [native code] }');
    });

    test('rule is not applied without a property, as in uBO', () => {
        expect(getUboConstantSetting('', 'true', [])).toBeNull();
        expect(getUboConstantSetting('ads.', 'true', [])).toBeNull();
    });
});

describe('wrapConstantValue', () => {
    test('wrappers of set-constant', async () => {
        expect((wrapConstantValue(1, 'asFunction') as () => unknown)()).toBe(1);
        expect(((wrapConstantValue(1, 'asCallback') as () => () => unknown)())()).toBe(1);
        await expect(wrapConstantValue(1, 'asResolved')).resolves.toBe(1);
        await expect(wrapConstantValue(1, 'asRejected')).rejects.toBe(1);
    });

    test('other names keep the value', () => {
        const value = {};
        expect(wrapConstantValue(value, '')).toBe(value);
        expect(wrapConstantValue(value, 'function')).toBe(value);
        expect(wrapConstantValue(value, undefined)).toBe(value);
    });
});
