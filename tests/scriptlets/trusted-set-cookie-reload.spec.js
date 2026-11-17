/* eslint-disable no-underscore-dangle */
import {
    beforeEach,
    afterEach,
    describe,
    test,
    expect,
    vi,
} from 'vitest';

import { trustedSetCookieReload } from '../../src/scriptlets/trusted-set-cookie-reload';
import { parseCookieString } from '../../src/helpers';
import { clearGlobalProps, clearCookie } from '../helpers';

beforeEach(() => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
            reload:
                vi.fn(),
        },
    });

    // Mocking console.trace() because
    // it causes errors in tests using jest
    window.console.trace = vi.fn();
});

afterEach(() => {
    clearGlobalProps('hit', '__debug');
    vi.clearAllMocks();
});

describe('Test trusted-set-cookie-reload scriptlet', () => {
    const sourceParams = {
        name: 'trusted-set-cookie-reload',
        verbose: true,
    };

    test('Set cookie with current time value', () => {
        const cName = '__test-cookie_current_time';
        const cValue = '$now$';
        const expiresSec = '';
        const cPath = '/';

        trustedSetCookieReload(sourceParams, cName, cValue, expiresSec, cPath);

        // Some time will pass between calling scriptlet
        // and jest running test
        const tolerance = 125;
        const cookieValue = parseCookieString(document.cookie)[cName];
        const currentTime = new Date().getTime();
        const timeDiff = currentTime - cookieValue;

        expect(timeDiff).toBeLessThan(tolerance);
        expect(document.cookie.includes(cName)).toBeTruthy();
        expect(window.location.reload).toHaveBeenCalledTimes(1);
        expect(window.hit).toBe('FIRED');
        clearCookie(cName);
    });

    test('Set cookie with current date value', () => {
        const cName = '__test-cookie_current_date';
        const cValue = '$currentDate$';
        const expiresSec = '';
        const cPath = '/';

        trustedSetCookieReload(sourceParams, cName, cValue, expiresSec, cPath);

        // Some time will pass between calling scriptlet
        // and jest running test
        const cookieValue = parseCookieString(document.cookie)[cName];
        // Check only day, month and year
        const currentDate = Date().split(' ', 4).join(' ');
        const dateDiff = cookieValue.split(' ', 4).join(' ');

        expect(dateDiff.startsWith(currentDate)).toBeTruthy();
        expect(document.cookie.includes(cName)).toBeTruthy();
        expect(window.location.reload).toHaveBeenCalledTimes(1);
        expect(window.hit).toBe('FIRED');
        clearCookie(cName);
    });

    test('Set cookie with current ISO date value and reload', () => {
        const cName = '__test-cookie_current_date_reload';
        const cValue = '$currentISODate$';
        const expiresSec = '';
        const cPath = '/';

        trustedSetCookieReload(sourceParams, cName, cValue, expiresSec, cPath);

        // Some time will pass between calling scriptlet
        // and jest running test
        const cookieValue = parseCookieString(document.cookie)[cName];
        // Check only day, month and year
        const currentISODate = new Date().toISOString().split('T')[0];
        const dateDiff = cookieValue.split('T')[0];

        expect(dateDiff.startsWith(currentISODate)).toBeTruthy();
        expect(document.cookie.includes(cName)).toBeTruthy();
        expect(window.location.reload).toHaveBeenCalledTimes(1);
        expect(window.hit).toBe('FIRED');

        // Run scriptlet again to check if reload is called
        trustedSetCookieReload(sourceParams, cName, cValue, expiresSec, cPath);
        expect(window.location.reload).toHaveBeenCalledTimes(1);

        clearCookie(cName);
    });

    test('Set cookie with keyword used as a part of the value and reload', () => {
        // https://github.com/AdguardTeam/Scriptlets/issues/573
        const cName = '__test-cookie_now_in_value_reload';
        const cValue = '{"count":1,"firstTime":$now$}';
        const expiresSec = '';
        const cPath = '/';

        trustedSetCookieReload(sourceParams, cName, cValue, expiresSec, cPath);

        // Some time will pass between calling scriptlet
        // and vitest running test
        const tolerance = 125;
        const cookieValue = parseCookieString(document.cookie)[cName];
        const parsedCookieValue = JSON.parse(cookieValue);

        expect(parsedCookieValue.count).toBe(1);
        expect(Date.now() - parsedCookieValue.firstTime).toBeLessThan(tolerance);
        expect(window.location.reload).toHaveBeenCalledTimes(1);
        expect(window.hit).toBe('FIRED');

        // Run scriptlet again to check that the page is not reloaded
        // because the cookie is already set
        trustedSetCookieReload(sourceParams, cName, cValue, expiresSec, cPath);
        expect(window.location.reload).toHaveBeenCalledTimes(1);

        clearCookie(cName);
    });

    test('Set cookie with multiple keywords used as a part of the value and reload', () => {
        // https://github.com/AdguardTeam/Scriptlets/issues/573
        const cName = '__test-cookie_multiple_keywords_reload';
        const cValue = '{"firstTime":$now$,"date":"$currentISODate$"}';
        const expiresSec = '';
        const cPath = '/';

        trustedSetCookieReload(sourceParams, cName, cValue, expiresSec, cPath);

        const tolerance = 125;
        const cookieValue = parseCookieString(document.cookie)[cName];
        const parsedCookieValue = JSON.parse(cookieValue);

        expect(Date.now() - parsedCookieValue.firstTime).toBeLessThan(tolerance);
        expect(Date.now() - new Date(parsedCookieValue.date).getTime()).toBeLessThan(tolerance);
        expect(window.location.reload).toHaveBeenCalledTimes(1);
        expect(window.hit).toBe('FIRED');

        // Run scriptlet again to check that the page is not reloaded
        // because the cookie is already set
        trustedSetCookieReload(sourceParams, cName, cValue, expiresSec, cPath);
        expect(window.location.reload).toHaveBeenCalledTimes(1);

        clearCookie(cName);
    });

    test('Set cookie with $currentDate$ keyword as a part of the value and reload', () => {
        // https://github.com/AdguardTeam/Scriptlets/issues/573
        const cName = '__test-cookie_current_date_in_value_reload';
        const prefix = 'accepted at ';
        const cValue = `${prefix}$currentDate$`;
        const expiresSec = '';
        const cPath = '/';

        trustedSetCookieReload(sourceParams, cName, cValue, expiresSec, cPath);

        const cookieValue = parseCookieString(document.cookie)[cName];
        expect(cookieValue.startsWith(prefix)).toBeTruthy();

        const dateValue = cookieValue.slice(prefix.length);
        // Check only day, month and year
        expect(dateValue.startsWith(Date().split(' ', 4).join(' '))).toBeTruthy();
        expect(window.location.reload).toHaveBeenCalledTimes(1);
        expect(window.hit).toBe('FIRED');

        // Run scriptlet again to check that the page is not reloaded
        // because the cookie is already set
        trustedSetCookieReload(sourceParams, cName, cValue, expiresSec, cPath);
        expect(window.location.reload).toHaveBeenCalledTimes(1);

        clearCookie(cName);
    });

    test('Set cookie with adjacent keywords and reload', () => {
        // https://github.com/AdguardTeam/Scriptlets/issues/573
        const cName = '__test-cookie_adjacent_keywords_reload';
        const cValue = '$now$$now$';
        const expiresSec = '';
        const cPath = '/';

        trustedSetCookieReload(sourceParams, cName, cValue, expiresSec, cPath);

        const cookieValue = parseCookieString(document.cookie)[cName];
        const timeLength = `${Date.now()}`.length;

        expect(cookieValue).toHaveLength(timeLength * 2);
        expect(cookieValue.slice(0, timeLength)).toBe(cookieValue.slice(timeLength));
        expect(window.location.reload).toHaveBeenCalledTimes(1);
        expect(window.hit).toBe('FIRED');

        // Run scriptlet again to check that the page is not reloaded,
        // i.e. adjacent keywords do not cause infinite reloading
        trustedSetCookieReload(sourceParams, cName, cValue, expiresSec, cPath);
        expect(window.location.reload).toHaveBeenCalledTimes(1);

        clearCookie(cName);
    });

    test('Cookie set with keyword in the value more than a day ago, should be updated and reloaded', () => {
        const cName = '__test-cookie_outdated_now_in_value';
        const cValue = '{"count":1,"firstTime":$now$}';
        const expiresSec = '';
        const cPath = '/';

        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const outdatedTime = Date.now() - ONE_DAY_MS - 1000;
        document.cookie = `${cName}={"count":1,"firstTime":${outdatedTime}};`;

        trustedSetCookieReload(sourceParams, cName, cValue, expiresSec, cPath);

        const cookieValue = parseCookieString(document.cookie)[cName];
        const parsedCookieValue = JSON.parse(cookieValue);

        expect(Date.now() - parsedCookieValue.firstTime).toBeLessThan(125);
        expect(window.location.reload).toHaveBeenCalledTimes(1);
        expect(window.hit).toBe('FIRED');
        clearCookie(cName);
    });

    test('Set cookie string', () => {
        const cName = '__test-cookie_OK';
        const cValue = 'OK';
        const expiresSec = '';
        const cPath = '/';

        trustedSetCookieReload(sourceParams, cName, cValue, expiresSec, cPath);

        expect(document.cookie.includes(cName)).toBeTruthy();
        expect(document.cookie.includes(cValue)).toBeTruthy();
        expect(window.location.reload).toHaveBeenCalledTimes(1);
        expect(window.hit).toBe('FIRED');
        clearCookie(cName);
    });

    test('Cookie already set, should not reload', () => {
        const cName = '__test-cookie_set';
        const cValue = 'test';
        const expiresSec = '';
        const cPath = '/';

        document.cookie = `${cName}=${cValue};`;

        trustedSetCookieReload(sourceParams, cName, cValue, expiresSec, cPath);

        expect(window.location.reload).toHaveBeenCalledTimes(0);
        expect(window.hit).toBe(undefined);
        clearCookie(cName);
    });
});

describe('trusted-set-cookie-reload with uBO arguments', () => {
    const uboSource = { name: 'ubo-trusted-set-cookie-reload', verbose: true };
    const adgSource = { name: 'trusted-set-cookie-reload', verbose: true };

    let cookieSetter;

    beforeEach(() => {
        cookieSetter = vi.spyOn(Document.prototype, 'cookie', 'set');
    });

    afterEach(() => {
        cookieSetter.mockRestore();
    });

    /**
     * Returns the cookie strings written by the scriptlet.
     *
     * @returns {string[]} Written cookie strings.
     */
    const getWrittenCookies = () => cookieSetter.mock.calls.map((call) => call[0]);

    test('reloads once the cookie is set, and not again', () => {
        const cName = '__test-ubo-reload';
        trustedSetCookieReload(uboSource, cName, '1');

        expect(getWrittenCookies()).toEqual([`${cName}=1; path=/`]);
        expect(window.location.reload).toHaveBeenCalledTimes(1);
        expect(window.hit).toBe('FIRED');

        // after the reload the cookie is already set
        trustedSetCookieReload(uboSource, cName, '1');
        expect(getWrittenCookies().length).toBe(1);
        expect(window.location.reload).toHaveBeenCalledTimes(1);
        clearCookie(cName);
    });

    test('reload option with 0 sets the cookie without reloading', () => {
        const cName = '__test-ubo-reload-0';
        trustedSetCookieReload(uboSource, cName, '1', '', '', 'reload', '0');

        expect(parseCookieString(document.cookie)[cName]).toBe('1');
        expect(window.location.reload).not.toHaveBeenCalled();
        clearCookie(cName);
    });

    test('empty path sets the root path, and domain option is used', () => {
        const { hostname } = document.location;
        const cName = '__test-ubo-reload-path-domain';
        trustedSetCookieReload(uboSource, cName, '1', '', '', 'domain', hostname);

        expect(getWrittenCookies()).toEqual([`${cName}=1; path=/; domain=${hostname}`]);
        expect(window.location.reload).toHaveBeenCalledTimes(1);
        clearCookie(cName);
    });

    test('domain option which does not match the hostname sets no cookie', () => {
        const cName = '__test-ubo-reload-domain-other';
        trustedSetCookieReload(uboSource, cName, '1', '', '', 'domain', 'example.com');

        expect(getWrittenCookies()).toEqual([]);
        expect(window.location.reload).not.toHaveBeenCalled();
        expect(window.hit).toBeUndefined();
    });

    test('dontOverwrite option keeps an existing cookie and does not reload', () => {
        const cName = '__test-ubo-reload-dont-overwrite';
        document.cookie = `${cName}=page`;
        cookieSetter.mockClear();

        trustedSetCookieReload(uboSource, cName, 'rule', '', '', 'dontOverwrite', '1');

        expect(getWrittenCookies()).toEqual([]);
        expect(parseCookieString(document.cookie)[cName]).toBe('page');
        expect(window.location.reload).not.toHaveBeenCalled();
        clearCookie(cName);
    });

    test('value with characters not allowed in cookies is encoded', () => {
        const cName = '__test-ubo-reload-encoded';
        trustedSetCookieReload(uboSource, cName, 'a;b');

        expect(getWrittenCookies()).toEqual([`${cName}=a%3Bb; path=/`]);
        expect(window.location.reload).toHaveBeenCalledTimes(1);

        trustedSetCookieReload(uboSource, cName, 'a;b');
        expect(window.location.reload).toHaveBeenCalledTimes(1);
        clearCookie(cName);
    });

    test('omitted value sets an empty cookie, and is not reloaded again', () => {
        const cName = '__test-ubo-reload-omitted-value';
        trustedSetCookieReload(uboSource, cName);

        expect(getWrittenCookies()).toEqual([`${cName}=; path=/`]);
        expect(window.location.reload).toHaveBeenCalledTimes(1);

        trustedSetCookieReload(uboSource, cName);
        expect(getWrittenCookies().length).toBe(1);
        expect(window.location.reload).toHaveBeenCalledTimes(1);
        clearCookie(cName);
    });

    test('empty name sets no cookie and does not reload', () => {
        trustedSetCookieReload(uboSource, '', 'value');

        expect(getWrittenCookies()).toEqual([]);
        expect(window.location.reload).not.toHaveBeenCalled();
    });

    test('omitted value is still invalid in AdGuard syntax', () => {
        trustedSetCookieReload(adgSource, '__test-adg-reload-omitted-value');

        expect(getWrittenCookies()).toEqual([]);
        expect(window.location.reload).not.toHaveBeenCalled();
    });

    test('keywords are replaced before the whole value is encoded, and not reloaded again', () => {
        const cName = '__test-ubo-reload-encoded-keyword';
        trustedSetCookieReload(uboSource, cName, '$currentDate$;x');

        const cookieValue = parseCookieString(document.cookie)[cName];
        expect(cookieValue).toMatch(/^\w{3}%2C%20\d{2}%20\w{3}%20\d{4}%20\d{2}%3A\d{2}%3A\d{2}%20GMT%3Bx$/);
        expect(window.location.reload).toHaveBeenCalledTimes(1);

        trustedSetCookieReload(uboSource, cName, '$currentDate$;x');
        expect(getWrittenCookies().length).toBe(1);
        expect(window.location.reload).toHaveBeenCalledTimes(1);
        clearCookie(cName);
    });

    test('$currentDate$ is set in the format of toUTCString(), and not reloaded again', () => {
        const cName = '__test-ubo-reload-current-date';
        trustedSetCookieReload(uboSource, cName, '$currentDate$');

        const cookieValue = parseCookieString(document.cookie)[cName];
        expect(cookieValue).toMatch(/^\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/);
        expect(window.location.reload).toHaveBeenCalledTimes(1);

        trustedSetCookieReload(uboSource, cName, '$currentDate$');
        expect(window.location.reload).toHaveBeenCalledTimes(1);
        clearCookie(cName);
    });

    test('offsetExpiresSec 0 removes the cookie', () => {
        const cName = '__test-ubo-reload-expires-0';
        document.cookie = `${cName}=1; path=/`;
        cookieSetter.mockClear();

        trustedSetCookieReload(uboSource, cName, '', '0', '');

        expect(getWrittenCookies().at(-1)).toMatch(new RegExp(`^${cName}=; path=/; expires=`));
        expect(document.cookie.includes(cName)).toBe(false);
    });

    test('empty path and options are still invalid in AdGuard syntax', () => {
        const cName = '__test-adg-reload-options';
        trustedSetCookieReload(adgSource, cName, '1', '', '');
        // `dontOverwrite` is the `domain` argument here, which does not match the origin
        trustedSetCookieReload(adgSource, cName, '1', '', '/', 'dontOverwrite', '1');

        expect(getWrittenCookies()).toEqual([]);
        expect(window.location.reload).not.toHaveBeenCalled();
        expect(window.hit).toBeUndefined();
    });
});

/* global jsdom */
// Rules from AdGuard and uBO filter lists
describe('trusted-set-cookie-reload with rules from filter lists', () => {
    const initialUrl = document.location.href;

    afterEach(() => {
        jsdom.cookieJar.removeAllCookiesSync();
        jsdom.reconfigure({ url: initialUrl });
    });

    test.each([
        {
            // eslint-disable-next-line max-len
            // 4-bike.pl#%#//scriptlet('trusted-set-cookie-reload', 'CookieConsent', '{"required":true,…,"timestamp":$now$}')
            url: 'https://4-bike.pl/',
            name: 'trusted-set-cookie-reload',
            args: ['CookieConsent', '{"required":true,"timestamp":$now$}'],
            expected: /^\{"required":true,"timestamp":\d+\}$/,
        },
        {
            // blog.kilo.ai#%#//scriptlet('trusted-set-cookie-reload', 'intro_popup_last_hidden_at', '$currentISODate$')
            url: 'https://blog.kilo.ai/',
            name: 'trusted-set-cookie-reload',
            args: ['intro_popup_last_hidden_at', '$currentISODate$'],
            expected: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        },
        {
            // cockta.eu##+js(trusted-set-cookie-reload, cookies_confirm, true)
            url: 'https://www.cockta.eu/',
            name: 'ubo-trusted-set-cookie-reload',
            args: ['cookies_confirm', 'true'],
            expected: /^true$/,
        },
        {
            // filen.io,~app.filen.io##+js(trusted-set-cookie-reload, cookieConsent, onlyNeeded)
            url: 'https://filen.io/',
            name: 'ubo-trusted-set-cookie-reload',
            args: ['cookieConsent', 'onlyNeeded'],
            expected: /^onlyNeeded$/,
        },
    ])('$name $args', ({
        url,
        name,
        args,
        expected,
    }) => {
        jsdom.reconfigure({ url });

        trustedSetCookieReload({ name }, ...args);
        expect(parseCookieString(document.cookie)[args[0]]).toMatch(expected);
        expect(window.location.reload).toHaveBeenCalledTimes(1);

        // after the reload the cookie is already set
        trustedSetCookieReload({ name }, ...args);
        expect(window.location.reload).toHaveBeenCalledTimes(1);
    });
});
