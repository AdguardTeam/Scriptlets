/* eslint-disable no-underscore-dangle */

import { trustedSetCookieReload } from '../../src/scriptlets/trusted-set-cookie-reload';
import { parseCookieString } from '../../src/helpers';
import {
    clearGlobalProps,
    clearCookie,
} from '../helpers';

beforeEach(() => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
            reload:
                jest.fn(),
        },
    });

    // Mocking console.trace() because
    // it causes errors in tests using jest
    window.console.trace = jest.fn();
});

afterEach(() => {
    clearGlobalProps('hit', '__debug');
    jest.clearAllMocks();
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
