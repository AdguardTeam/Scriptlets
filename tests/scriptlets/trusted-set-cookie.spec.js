/* eslint-disable no-underscore-dangle */
import {
    beforeEach,
    afterEach,
    describe,
    test,
    expect,
    vi,
} from 'vitest';

import { trustedSetCookie } from '../../src/scriptlets/trusted-set-cookie';
import { parseCookieString } from '../../src/helpers';
import { clearGlobalProps, clearCookie } from '../helpers';

let cookieSetter;

beforeEach(() => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
            reload: vi.fn(),
        },
    });
    window.console.trace = vi.fn();
    cookieSetter = vi.spyOn(Document.prototype, 'cookie', 'set');
});

afterEach(() => {
    clearGlobalProps('hit', '__debug');
    vi.restoreAllMocks();
});

/**
 * Returns the cookie strings written by the scriptlet.
 *
 * @returns {string[]} Written cookie strings.
 */
const getWrittenCookies = () => cookieSetter.mock.calls.map((call) => call[0]);

describe('trusted-set-cookie with uBO arguments', () => {
    const uboSource = { name: 'ubo-trusted-set-cookie', verbose: true };
    const adgSource = { name: 'trusted-set-cookie', verbose: true };

    test('empty path sets the root path', () => {
        const cName = '__test-ubo-empty-path';
        trustedSetCookie(uboSource, cName, 'accept', '', '');

        expect(getWrittenCookies()).toEqual([`${cName}=accept; path=/`]);
        expect(parseCookieString(document.cookie)[cName]).toBe('accept');
        expect(window.hit).toBe('FIRED');
        clearCookie(cName);
    });

    test('empty path is still invalid in AdGuard syntax', () => {
        const cName = '__test-adg-empty-path';
        trustedSetCookie(adgSource, cName, 'accept', '', '');

        expect(getWrittenCookies()).toEqual([]);
        expect(window.hit).toBeUndefined();
    });

    test('`none` path sets no path', () => {
        const cName = '__test-ubo-none-path';
        trustedSetCookie(uboSource, cName, 'accept', '', 'none');

        expect(getWrittenCookies()).toEqual([`${cName}=accept`]);
        clearCookie(cName);
    });

    test('reload option reloads once the cookie is set, and not again', () => {
        const cName = '__test-ubo-reload';
        trustedSetCookie(uboSource, cName, '1', '', '', 'reload', '1');

        expect(parseCookieString(document.cookie)[cName]).toBe('1');
        expect(window.location.reload).toHaveBeenCalledTimes(1);

        // after the reload the cookie is already set
        trustedSetCookie(uboSource, cName, '1', '', '', 'reload', '1');
        expect(getWrittenCookies().length).toBe(1);
        expect(window.location.reload).toHaveBeenCalledTimes(1);
        clearCookie(cName);
    });

    test('reload option with a time keyword does not reload again', () => {
        const cName = '__test-ubo-reload-now';
        trustedSetCookie(uboSource, cName, '{"time":$now$}', '', '', 'reload', '1');
        expect(window.location.reload).toHaveBeenCalledTimes(1);

        trustedSetCookie(uboSource, cName, '{"time":$now$}', '', '', 'reload', '1');
        expect(window.location.reload).toHaveBeenCalledTimes(1);
        clearCookie(cName);
    });

    test('reload option with 0 does not reload', () => {
        const cName = '__test-ubo-reload-0';
        trustedSetCookie(uboSource, cName, '1', '', '', 'reload', '0');

        expect(parseCookieString(document.cookie)[cName]).toBe('1');
        expect(window.location.reload).not.toHaveBeenCalled();
        clearCookie(cName);
    });

    test('dontOverwrite option keeps an existing cookie', () => {
        const cName = '__test-ubo-dont-overwrite';
        document.cookie = `${cName}=page`;
        cookieSetter.mockClear();

        trustedSetCookie(uboSource, cName, 'rule', '', '', 'dontOverwrite', '1');

        expect(getWrittenCookies()).toEqual([]);
        expect(parseCookieString(document.cookie)[cName]).toBe('page');
        expect(window.hit).toBeUndefined();
        clearCookie(cName);
    });

    test('dontOverwrite option sets a missing cookie', () => {
        const cName = '__test-ubo-dont-overwrite-missing';
        trustedSetCookie(uboSource, cName, 'rule', '', '', 'dontOverwrite', '1');

        expect(parseCookieString(document.cookie)[cName]).toBe('rule');
        clearCookie(cName);
    });

    test('dontOverwrite option with 0 overwrites an existing cookie', () => {
        const cName = '__test-ubo-dont-overwrite-0';
        document.cookie = `${cName}=page`;
        cookieSetter.mockClear();

        trustedSetCookie(uboSource, cName, 'rule', '', '', 'dontOverwrite', '0');

        expect(getWrittenCookies()).toEqual([`${cName}=rule; path=/`]);
        expect(parseCookieString(document.cookie)[cName]).toBe('rule');
        expect(window.hit).toBe('FIRED');
        clearCookie(cName);
    });

    test('dontOverwrite option keeps an existing cookie with an empty value', () => {
        const cName = '__test-ubo-dont-overwrite-empty';
        document.cookie = `${cName}=`;
        cookieSetter.mockClear();

        trustedSetCookie(uboSource, cName, 'rule', '', '', 'dontOverwrite', '1');

        expect(getWrittenCookies()).toEqual([]);
        expect(document.cookie.split(/;\s*/)).toContain(`${cName}=`);
        expect(window.hit).toBeUndefined();
        clearCookie(cName);
    });

    test('dontOverwrite option matches the exact cookie name', () => {
        const cName = '__test-ubo-dont-overwrite-name';
        // cookies whose names contain the name or are contained in it
        document.cookie = `${cName}-other=page`;
        document.cookie = `x${cName}=page`;
        document.cookie = `${cName.slice(0, -1)}=page`;
        cookieSetter.mockClear();

        trustedSetCookie(uboSource, cName, 'rule', '', '', 'dontOverwrite', '1');

        expect(getWrittenCookies()).toEqual([`${cName}=rule; path=/`]);
        expect(parseCookieString(document.cookie)[cName]).toBe('rule');
        clearCookie(cName);
        clearCookie(`${cName}-other`);
        clearCookie(`x${cName}`);
        clearCookie(cName.slice(0, -1));
    });

    test.each([
        { name: 'dontOverwrite first', options: ['dontOverwrite', '1', 'reload', '1'] },
        { name: 'reload first', options: ['reload', '1', 'dontOverwrite', '1'] },
    ])('dontOverwrite option with reload keeps an existing cookie and does not reload, $name', ({ options }) => {
        const cName = '__test-ubo-dont-overwrite-reload-existing';
        document.cookie = `${cName}=page`;
        cookieSetter.mockClear();

        trustedSetCookie(uboSource, cName, '{"time":$now$}', '', '', ...options);

        expect(getWrittenCookies()).toEqual([]);
        expect(parseCookieString(document.cookie)[cName]).toBe('page');
        expect(window.location.reload).not.toHaveBeenCalled();
        expect(window.hit).toBeUndefined();
        clearCookie(cName);
    });

    test.each([
        { name: 'dontOverwrite first', options: ['dontOverwrite', '1', 'reload', '1'] },
        { name: 'reload first', options: ['reload', '1', 'dontOverwrite', '1'] },
    ])('dontOverwrite option with reload sets a missing cookie and reloads once, $name', ({ options }) => {
        const cName = '__test-ubo-dont-overwrite-reload-missing';

        trustedSetCookie(uboSource, cName, '{"time":$now$}', '', '', ...options);

        expect(parseCookieString(document.cookie)[cName]).toMatch(/^\{"time":\d+\}$/);
        expect(window.location.reload).toHaveBeenCalledTimes(1);

        // after the reload the cookie exists, so it is neither set nor reloaded again
        trustedSetCookie(uboSource, cName, '{"time":$now$}', '', '', ...options);
        expect(getWrittenCookies().length).toBe(1);
        expect(window.location.reload).toHaveBeenCalledTimes(1);
        clearCookie(cName);
    });

    test('dontOverwrite is not an option in AdGuard syntax', () => {
        const cName = '__test-adg-dont-overwrite';
        document.cookie = `${cName}=page`;
        cookieSetter.mockClear();

        // `dontOverwrite` is the `domain` argument here, which does not match the origin
        trustedSetCookie(adgSource, cName, 'rule', '', '/', 'dontOverwrite', '1');

        expect(getWrittenCookies()).toEqual([]);
        expect(parseCookieString(document.cookie)[cName]).toBe('page');
        expect(window.hit).toBeUndefined();
        clearCookie(cName);
    });

    test('domain option', () => {
        const { hostname } = document.location;
        const cName = '__test-ubo-domain';

        trustedSetCookie(uboSource, cName, '1', '', '', 'domain', `.${hostname}`);
        expect(getWrittenCookies()).toEqual([`${cName}=1; path=/; domain=.${hostname}`]);
        cookieSetter.mockClear();

        // regular expression, its match in the hostname is the domain
        trustedSetCookie(uboSource, cName, '1', '', '', 'domain', `/^${hostname}$/`);
        expect(getWrittenCookies()).toEqual([`${cName}=1; path=/; domain=${hostname}`]);
        cookieSetter.mockClear();

        // regular expression which does not match sets no domain
        trustedSetCookie(uboSource, cName, '1', '', '', 'domain', '/^no-match$/');
        expect(getWrittenCookies()).toEqual([`${cName}=1; path=/`]);
        cookieSetter.mockClear();

        // domain options follow other options too
        trustedSetCookie(uboSource, cName, '1', '', '', 'dontOverwrite', '0', 'domain', hostname);
        expect(getWrittenCookies()).toEqual([`${cName}=1; path=/; domain=${hostname}`]);
        clearCookie(cName);
    });

    test('domain option which does not match the hostname sets no cookie', () => {
        const cName = '__test-ubo-domain-other';
        trustedSetCookie(uboSource, cName, '1', '', '', 'domain', 'example.com');

        expect(getWrittenCookies()).toEqual([]);
        expect(window.hit).toBeUndefined();
    });

    test('offsetExpiresSec 0 removes the cookie', () => {
        const cName = '__test-ubo-expires-0';
        document.cookie = `${cName}=1; path=/`;
        expect(parseCookieString(document.cookie)[cName]).toBe('1');

        trustedSetCookie(uboSource, cName, '', '0', '');

        expect(getWrittenCookies().at(-1)).toMatch(new RegExp(`^${cName}=; path=/; expires=`));
        expect(document.cookie.includes(cName)).toBe(false);
    });

    test('offsetExpiresSec which is not digits nor a keyword sets no cookie', () => {
        const cName = '__test-ubo-expires-invalid';
        trustedSetCookie(uboSource, cName, '1', '10s', '');

        expect(getWrittenCookies()).toEqual([]);
    });

    test('value with characters not allowed in cookies is encoded', () => {
        const cName = '__test-ubo-encoded';
        trustedSetCookie(uboSource, cName, 'a;b', '', '');

        expect(getWrittenCookies()).toEqual([`${cName}=a%3Bb; path=/`]);
        expect(parseCookieString(document.cookie)[cName]).toBe('a%3Bb');
        clearCookie(cName);
    });

    test('$currentDate$ is set in the format of toUTCString()', () => {
        const cName = '__test-ubo-current-date';
        trustedSetCookie(uboSource, cName, '$currentDate$', '', '');

        const cookieValue = parseCookieString(document.cookie)[cName];
        expect(cookieValue).toMatch(/^\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/);
        clearCookie(cName);
    });

    test('$currentDate$ is still set in the format of toString() in AdGuard syntax', () => {
        const cName = '__test-adg-current-date';
        trustedSetCookie(adgSource, cName, '$currentDate$');

        const cookieValue = parseCookieString(document.cookie)[cName];
        expect(cookieValue).toMatch(/^\w{3} \w{3} \d{2} \d{4} \d{2}:\d{2}:\d{2} GMT[+-]\d{4}/);
        clearCookie(cName);
    });

    test('reload option with $currentDate$ does not reload again', () => {
        const cName = '__test-ubo-reload-current-date';
        trustedSetCookie(uboSource, cName, '$currentDate$', '', '', 'reload', '1');
        expect(window.location.reload).toHaveBeenCalledTimes(1);

        trustedSetCookie(uboSource, cName, '$currentDate$', '', '', 'reload', '1');
        expect(window.location.reload).toHaveBeenCalledTimes(1);
        clearCookie(cName);
    });

    test('value with `;` is still rejected in AdGuard syntax', () => {
        const cName = '__test-adg-encoded';
        trustedSetCookie(adgSource, cName, 'a;b');

        expect(getWrittenCookies()).toEqual([]);
    });
});

/* global jsdom */
// Rules from AdGuard and uBO filter lists, uBO ones converted to AdGuard syntax by AGTree,
// so that their arguments are the same as received by the scriptlet, e.g. `'` is escaped by the converter
describe('trusted-set-cookie with rules from filter lists', () => {
    const NOW = new Date('2026-11-13T12:00:00.000Z');
    const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
    const initialUrl = document.location.href;

    /**
     * Opens the page of the rule, so that the domain of the cookie is checked against it.
     *
     * @param {string} url Page URL.
     */
    const openPage = (url) => {
        jsdom.reconfigure({ url });
    };

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'], now: NOW });
    });

    afterEach(() => {
        jsdom.cookieJar.removeAllCookiesSync();
        jsdom.reconfigure({ url: initialUrl });
        vi.useRealTimers();
    });

    test('AdGuard rule with path and domain', () => {
        // 116117.de#%#//scriptlet('trusted-set-cookie', 'cookieConsent', 'level1', '', '/', '116117.de')
        openPage('https://www.116117.de/');
        trustedSetCookie({ name: 'trusted-set-cookie' }, 'cookieConsent', 'level1', '', '/', '116117.de');

        expect(getWrittenCookies()).toEqual(['cookieConsent=level1; path=/; domain=116117.de']);
        expect(parseCookieString(document.cookie).cookieConsent).toBe('level1');
    });

    test('AdGuard rule with $currentDate$ keeps its format', () => {
        // eslint-disable-next-line max-len
        // auth.hbomax.com#%#//scriptlet('trusted-set-cookie', 'OptanonAlertBoxClosed', '$currentDate$', '', '/', 'hbomax.com')
        openPage('https://auth.hbomax.com/');
        trustedSetCookie(
            { name: 'trusted-set-cookie' },
            'OptanonAlertBoxClosed',
            '$currentDate$',
            '',
            '/',
            'hbomax.com',
        );

        expect(getWrittenCookies()).toEqual([`OptanonAlertBoxClosed=${NOW.toString()}; path=/; domain=hbomax.com`]);
    });

    test('AdGuard rule with 1year', () => {
        // bike24.de#%#//scriptlet('trusted-set-cookie', 'cookieConsent', '{"algolia":false,…}', '1year')
        openPage('https://www.bike24.de/');
        trustedSetCookie({ name: 'trusted-set-cookie' }, 'cookieConsent', '{"algolia":false}', '1year');

        const expires = new Date(NOW.getTime() + ONE_YEAR_MS).toUTCString();
        expect(getWrittenCookies()).toEqual([`cookieConsent={"algolia":false}; path=/; expires=${expires}`]);
    });

    test('uBO rule with 1year and domain option', () => {
        // eslint-disable-next-line max-len
        // softonic.com##+js(trusted-set-cookie, euconsent-v2, CP2KIMAP2KIMAAHABBENAcEgAAAAAAAAAAiQ…, 1year, , domain, softonic.com)
        openPage('https://en.softonic.com/');
        trustedSetCookie(
            { name: 'ubo-trusted-set-cookie' },
            'euconsent-v2',
            'CP2KIMAP2KIMAAHABBENAcEgAAAAAAAAAAiQ',
            '1year',
            '',
            'domain',
            'softonic.com',
        );

        const expires = new Date(NOW.getTime() + ONE_YEAR_MS).toUTCString();
        expect(getWrittenCookies()).toEqual([
            `euconsent-v2=CP2KIMAP2KIMAAHABBENAcEgAAAAAAAAAAiQ; path=/; domain=softonic.com; expires=${expires}`,
        ]);
    });

    test('uBO rule with offset in seconds', () => {
        // multitronic.fi##+js(trusted-set-cookie, consentCookieV2, '{"consentAnalytics":false,…}', 15778476)
        openPage('https://www.multitronic.fi/');
        trustedSetCookie(
            { name: 'ubo-trusted-set-cookie' },
            'consentCookieV2',
            '{"consentAnalytics":false}',
            '15778476',
        );

        const expires = new Date(NOW.getTime() + 15778476 * 1000).toUTCString();
        expect(getWrittenCookies()).toEqual([`consentCookieV2={"consentAnalytics":false}; path=/; expires=${expires}`]);
    });

    test('uBO rule with offset 0 removes the cookie', () => {
        // naszemiasto.pl##+js(trusted-set-cookie, _sharedid, , 0, , domain, .naszemiasto.pl)
        openPage('https://www.naszemiasto.pl/');
        document.cookie = '_sharedid=abc; path=/; domain=.naszemiasto.pl';
        expect(parseCookieString(document.cookie)._sharedid).toBe('abc');

        trustedSetCookie({ name: 'ubo-trusted-set-cookie' }, '_sharedid', '', '0', '', 'domain', '.naszemiasto.pl');

        expect(document.cookie.includes('_sharedid')).toBe(false);
    });

    test('uBO rule with reload option, not reloaded again', () => {
        // threads.com##+js(trusted-set-cookie, cb, '{"version":"1","date":"2029_07_03",…}', , ,reload, 1)
        openPage('https://www.threads.com/');
        const args = ['cb', '{"version":"1","date":"2029_07_03"}', '', '', 'reload', '1'];

        trustedSetCookie({ name: 'ubo-trusted-set-cookie' }, ...args);
        expect(parseCookieString(document.cookie).cb).toBe('{"version":"1","date":"2029_07_03"}');
        expect(window.location.reload).toHaveBeenCalledTimes(1);

        trustedSetCookie({ name: 'ubo-trusted-set-cookie' }, ...args);
        expect(window.location.reload).toHaveBeenCalledTimes(1);
    });

    test('uBO rule with value with characters not allowed in cookies', () => {
        // eslint-disable-next-line max-len
        // wavecon.de##+js(trusted-set-cookie, _pm_datenschutz_cookie, 80ce7170aa:false;4b086eb24b:true;3a0521a8ad:false, , , reload, 1)
        openPage('https://www.wavecon.de/');
        const value = '80ce7170aa:false;4b086eb24b:true;3a0521a8ad:false';
        trustedSetCookie({ name: 'ubo-trusted-set-cookie' }, '_pm_datenschutz_cookie', value, '', '', 'reload', '1');

        expect(parseCookieString(document.cookie)._pm_datenschutz_cookie).toBe(encodeURIComponent(value));
        expect(window.location.reload).toHaveBeenCalledTimes(1);
    });

    test('uBO rule with quotes escaped by the converter', () => {
        // asket.com##+js(trusted-set-cookie, CookieConsent, "{stamp:'',necessary:true,…,method:'explicit'}")
        openPage('https://www.asket.com/');
        trustedSetCookie(
            { name: 'ubo-trusted-set-cookie' },
            'CookieConsent',
            "{stamp:\\'\\',necessary:true,method:\\'explicit\\'}",
        );

        expect(parseCookieString(document.cookie).CookieConsent).toBe("{stamp:'',necessary:true,method:'explicit'}");
    });

    test('uBO rule with the value in the name, as uBO does not check names of trusted cookies', () => {
        // jobzhub.store,fitdynamos.com,labgame.io##+js(trusted-set-cookie, ad_expire=true;, $now$)
        openPage('https://jobzhub.store/');
        trustedSetCookie({ name: 'ubo-trusted-set-cookie' }, 'ad_expire=true;', '$now$');

        expect(parseCookieString(document.cookie).ad_expire).toBe('true');
    });

    test('AdGuard rule with `;` in the name is still rejected', () => {
        openPage('https://jobzhub.store/');
        trustedSetCookie({ name: 'trusted-set-cookie' }, 'ad_expire=true;', '$now$');

        expect(getWrittenCookies()).toEqual([]);
    });
});
