import {
    afterEach,
    beforeEach,
    describe,
    expect,
    test,
    vi,
} from 'vitest';

import {
    getAdgStorageItemSettings,
    getUboStorageItemSettings,
    setStorageItemBySettings,
    type StorageItemSettings,
} from '../../src/helpers/trusted-storage-utils';
import { type Source } from '../../src/scriptlets';
import { useJsdomStorages } from '../vitest-helpers';

const adgSource = { name: 'trusted-set-local-storage-item', verbose: false } as unknown as Source;
const uboSource = { name: 'ubo-trusted-set-local-storage-item', verbose: false } as unknown as Source;
const FIXED_TIME = 1700000000000;

/**
 * Returns the settings of the item, and fails if they are `null`.
 *
 * @param settings Settings returned by a parser.
 * @returns Settings of the item.
 */
const getSettings = (settings: StorageItemSettings | null): StorageItemSettings => {
    expect(settings).not.toBeNull();
    return settings as StorageItemSettings;
};

let jsdomWindow: ReturnType<typeof useJsdomStorages>;

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TIME);
    jsdomWindow = useJsdomStorages();
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('getAdgStorageItemSettings', () => {
    test('keyword of a real rule', () => {
        // alan.com#%#//scriptlet('trusted-set-local-storage-item', 'refusedCookiesAt', '$now$')
        const settings = getSettings(getAdgStorageItemSettings(adgSource, 'refusedCookiesAt', '$now$'));

        expect(settings.value).toBe(`${FIXED_TIME}`);
        expect(settings.isSetUnchanged).toBe(true);
        expect(settings.reloadDelay).toBeNull();
    });

    test('values of uBO are set as they are, as before', () => {
        expect(getSettings(getAdgStorageItemSettings(adgSource, 'consent', 'emptyObj')).value).toBe('emptyObj');
        expect(getSettings(getAdgStorageItemSettings(adgSource, 'consent', '$remove$')).removePattern).toBeNull();
    });

    test('rule without key or value is not applied', () => {
        expect(getAdgStorageItemSettings(adgSource, undefined, 'x')).toBeNull();
        expect(getAdgStorageItemSettings(adgSource, 'consent', undefined)).toBeNull();
    });
});

describe('getUboStorageItemSettings', () => {
    test('keywords of real rules', () => {
        // express.co.uk##+js(trusted-set-local-storage-item, CMPList, $currentDate$)
        expect(getSettings(getUboStorageItemSettings(uboSource, 'CMPList', '$currentDate$', [])).value)
            .toBe(new Date(FIXED_TIME).toString());
        // auf1.tv##+js(trusted-set-local-storage-item, trackingAllowedOrDeniedAt, $currentISODate$)
        expect(getSettings(getUboStorageItemSettings(uboSource, 'trackingAllowedOrDeniedAt', '$currentISODate$', []))
            .value).toBe(new Date(FIXED_TIME).toISOString());
    });

    test('adjacent keywords are replaced in the order of uBO', () => {
        // `$now$` is replaced first, so `$currentDate` is left without its closing `$`
        expect(getSettings(getUboStorageItemSettings(uboSource, 't', '$currentDate$now$', [])).value)
            .toBe(`$currentDate${FIXED_TIME}`);
    });

    test.each([
        { value: 'emptyObj', expected: '{}' },
        { value: 'emptyArr', expected: '[]' },
        { value: undefined, expected: '' },
    ])('value $value is $expected', ({ value, expected }) => {
        expect(getSettings(getUboStorageItemSettings(uboSource, 'consent', value, [])).value).toBe(expected);
    });

    test('$remove$ matches the whole key, or a regular expression', () => {
        expect(getSettings(getUboStorageItemSettings(uboSource, 'ads', '$remove$', [])).removePattern).toEqual(/^ads$/);
        expect(getSettings(getUboStorageItemSettings(uboSource, '/^prefix_/', '$remove$', [])).removePattern)
            .toEqual(/^prefix_/);
        expect(getUboStorageItemSettings(uboSource, '/[/', '$remove$', [])).toBeNull();
    });

    test.each([
        { args: ['reload', '1'], expected: 1 },
        // As in uBO, `0` is a number of milliseconds as well
        { args: ['reload', '0'], expected: 0 },
        { args: ['reload', 'yes'], expected: null },
        { args: [], expected: null },
    ])('reload option $args', ({ args, expected }) => {
        expect(getSettings(getUboStorageItemSettings(uboSource, 'consent', 'true', args)).reloadDelay).toBe(expected);
    });

    test('value which the converter has split at commas is set as uBO sets it', () => {
        // eslint-disable-next-line max-len
        // th.gl##+js(trusted-set-local-storage-item, account-storage, {"state":{"_hasHydrated":true,"userId":null,"decryptedUserId":null,"email":null,"perks":{"adRemoval":true,"comments":false,"premiumFeatures":true,"previewReleaseAccess":true},"showUserDialog":false},"version":2})
        // The value has commas which are not escaped, so uBO, and AGTree as well, split it into 10 arguments,
        // and the ones after the first one are taken as named options, which are not known.
        // uBO itself sets only the first part, which is not valid JSON, so the rule does not work in uBO either,
        // and it should have its value quoted, e.g. `'{"state":…}'`. It is not joined back here, as uBO rules
        // should work as in uBO, and the other parts may be real options, e.g. `reload, 1`
        const args = [
            '{"state":{"_hasHydrated":true',
            '"userId":null',
            '"decryptedUserId":null',
            '"email":null',
            '"perks":{"adRemoval":true',
            '"comments":false',
            '"premiumFeatures":true',
            '"previewReleaseAccess":true}',
            '"showUserDialog":false}',
            '"version":2}',
        ];
        const settings = getSettings(getUboStorageItemSettings(uboSource, 'account-storage', args[0], args.slice(1)));

        expect(settings.value).toBe('{"state":{"_hasHydrated":true');
        expect(settings.reloadDelay).toBeNull();
        expect(settings.removePattern).toBeNull();
    });

    test('quoted value with commas is set as a whole', () => {
        // eslint-disable-next-line max-len
        // th.gl##+js(trusted-set-local-storage-item, account-storage, '{"state":{"_hasHydrated":true,"userId":null,"decryptedUserId":null,"email":null,"perks":{"adRemoval":true,"comments":false,"premiumFeatures":true,"previewReleaseAccess":true},"showUserDialog":false},"version":2}'),
        // i.e. the rule above with its value quoted, which AGTree converts to a single argument
        const value = '{"state":{"_hasHydrated":true,"userId":null,"decryptedUserId":null,"email":null,'
            + '"perks":{"adRemoval":true,"comments":false,"premiumFeatures":true,"previewReleaseAccess":true},'
            + '"showUserDialog":false},"version":2}';
        const settings = getSettings(getUboStorageItemSettings(uboSource, 'account-storage', value, []));

        expect(settings.value).toBe(value);
        expect(JSON.parse(settings.value).state.perks.adRemoval).toBe(true);
    });

    test('quoted value with commas and a keyword of a real rule', () => {
        // eslint-disable-next-line max-len
        // ~logistics.vr.fi,vr.fi##+js(trusted-set-local-storage-item, cookieConsent, '{"consented":true,"consentId":"1","timestamp":"$now$","levels":{"level1":true,"level2":false,"level3":false,"level4":false}}')
        const value = '{"consented":true,"consentId":"1","timestamp":"$now$",'
            + '"levels":{"level1":true,"level2":false,"level3":false,"level4":false}}';
        const settings = getSettings(getUboStorageItemSettings(uboSource, 'cookieConsent', value, []));

        expect(JSON.parse(settings.value)).toEqual({
            consented: true,
            consentId: '1',
            timestamp: `${FIXED_TIME}`,
            levels: {
                level1: true,
                level2: false,
                level3: false,
                level4: false,
            },
        });
    });

    test('rule without key is not applied', () => {
        expect(getUboStorageItemSettings(uboSource, '', 'x', [])).toBeNull();
    });
});

describe('setStorageItemBySettings', () => {
    const nativeLocation = window.location;
    let reload: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        reload = vi.fn();
        Object.defineProperty(window, 'location', { configurable: true, value: { reload } });
    });

    afterEach(() => {
        Object.defineProperty(window, 'location', { configurable: true, value: nativeLocation });
    });

    /**
     * Applies a uBO rule to the local storage.
     *
     * @param key Key of the item.
     * @param value Value of the item.
     * @param args Named options.
     */
    const applyUboRule = (key: string, value: string, args: string[] = []) => {
        const settings = getSettings(getUboStorageItemSettings(uboSource, key, value, args));
        setStorageItemBySettings(uboSource, localStorage, settings);
    };

    test('$remove$ does not remove a longer key', () => {
        localStorage.setItem('ads', '1');
        localStorage.setItem('ads2', '1');
        applyUboRule('ads', '$remove$');

        expect(localStorage.getItem('ads')).toBeNull();
        expect(localStorage.getItem('ads2')).toBe('1');
    });

    test('$remove$ with a regular expression with g flag removes all the matching keys, unlike uBO', () => {
        ['ads', 'ads2', 'prefix_ads', 'other'].forEach((key) => localStorage.setItem(key, '1'));
        applyUboRule('/ads/g', '$remove$');

        expect(Object.keys(localStorage)).toEqual(['other']);
    });

    test('uBO rule sets the item only if it has another value, and reloads the page after it', () => {
        // start-nrw.de##+js(trusted-set-session-storage-item, _pv_CookieOptInt, closed), in the local storage
        applyUboRule('_pv_CookieOptInt', 'closed', ['reload', '1']);
        vi.runAllTimers();
        expect(localStorage.getItem('_pv_CookieOptInt')).toBe('closed');
        expect(reload).toHaveBeenCalledTimes(1);

        applyUboRule('_pv_CookieOptInt', 'closed', ['reload', '1']);
        vi.runAllTimers();
        expect(reload).toHaveBeenCalledTimes(1);
    });

    test('value with keywords which the rule has set before does not reload the page again', () => {
        // eslint-disable-next-line max-len
        // ~logistics.vr.fi,vr.fi##+js(trusted-set-local-storage-item, cookieConsent, '{"consented":true,"consentId":"1","timestamp":"$now$",…}'), with `reload`
        const value = '{"consented":true,"timestamp":"$now$"}';
        localStorage.setItem('cookieConsent', '{"consented":true,"timestamp":"1690000000000"}');
        applyUboRule('cookieConsent', value, ['reload', '1']);
        vi.runAllTimers();

        expect(localStorage.getItem('cookieConsent')).toBe(`{"consented":true,"timestamp":"${FIXED_TIME}"}`);
        expect(reload).not.toHaveBeenCalled();

        // A value which the page has set is replaced, and the page is reloaded then
        localStorage.setItem('cookieConsent', '{"consented":false}');
        applyUboRule('cookieConsent', value, ['reload', '1']);
        vi.runAllTimers();
        expect(reload).toHaveBeenCalledTimes(1);
    });

    test('AdGuard rule sets the item also if it has the value', () => {
        // linkedin.com#%#//scriptlet('trusted-set-session-storage-item', 'blocking-upsell', '"DISMISSED"')
        const setItem = vi.spyOn(jsdomWindow.Storage.prototype, 'setItem');
        sessionStorage.setItem('blocking-upsell', '"DISMISSED"');
        setItem.mockClear();
        setStorageItemBySettings(
            adgSource,
            sessionStorage,
            getSettings(getAdgStorageItemSettings(adgSource, 'blocking-upsell', '"DISMISSED"')),
        );

        expect(setItem).toHaveBeenCalledTimes(1);
        setItem.mockRestore();
    });
});
