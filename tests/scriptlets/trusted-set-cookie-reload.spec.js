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
