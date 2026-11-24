import { describe, expect, test } from 'vitest';

import { getWurflDevice } from '../../src/helpers/wurfl-utils';

describe('getWurflDevice', () => {
    test.each([
        // as wurfl.io/wurfl.js answers them, 2026-11-23
        [
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36',
            'Google Chrome', 'Desktop', false,
        ],
        [
            'Mozilla/5.0 (X11; Linux x86_64; rv:150.0) Gecko/20100101 Firefox/150.0',
            'Mozilla Firefox', 'Desktop', false,
        ],
        [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 '
                + '(KHTML, like Gecko) Version/17.5 Safari/605.1.15',
            'Apple Safari', 'Desktop', false,
        ],
        [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, '
                + 'like Gecko) Chrome/141.0 Safari/537.36 Edg/141.0',
            'Microsoft Edge', 'Desktop', false,
        ],
        [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, '
                + 'like Gecko) Chrome/141.0 Safari/537.36 OPR/120.0',
            'Opera', 'Desktop', false,
        ],
        [
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) '
                + 'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
            'Apple iPhone', 'Smartphone', true,
        ],
        [
            'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 '
                + '(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
            'Apple iPad', 'Tablet', true,
        ],
        // the device name is not detected without the database of WURFL, e.g. `Google Pixel 8`
        [
            'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, '
                + 'like Gecko) Chrome/141.0 Mobile Safari/537.36',
            '', 'Smartphone', true,
        ],
        [
            'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, '
                + 'like Gecko) Chrome/141.0 Safari/537.36',
            '', 'Tablet', true,
        ],
        [
            'Mozilla/5.0 (Android 14; Mobile; rv:150.0) Gecko/150.0 Firefox/150.0',
            '', 'Smartphone', true,
        ],
        [
            'Mozilla/5.0 (Android 14; Tablet; rv:150.0) Gecko/150.0 Firefox/150.0',
            '', 'Tablet', true,
        ],
        [
            'Mozilla/5.0 (Linux; Android 11; KFTRWI) AppleWebKit/537.36 (KHTML, '
                + 'like Gecko) Silk/118.0 like Chrome/118.0 Safari/537.36',
            '', 'Tablet', true,
        ],
        [
            'Mozilla/5.0 (SMART-TV; Linux; Tizen 7.0) AppleWebKit/537.36 (KHTML, '
                + 'like Gecko) SamsungBrowser/6.0 Chrome/94.0 TV Safari/537.36',
            '', 'Smart-TV', false,
        ],
        [
            'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like '
                + 'Gecko) Chrome/94.0 Safari/537.36 WebAppManager',
            '', 'Smart-TV', false,
        ],
        [
            'Mozilla/5.0 (Linux; Android 9; AFTMM Build/PS7233) AppleWebKit/537.36 '
                + '(KHTML, like Gecko) Silk/112.0 like Chrome/112.0 Safari/537.36',
            '', 'Smart-TV', false,
        ],
        // as wurfl.io/wurfl.js answers them, 2026-11-24
        [
            'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 '
                + '(KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1',
            'Apple iPod Touch', 'Other Mobile', true,
        ],
        [
            'Mozilla/5.0 (Linux; Android 9; AFTKA Build/PS7633.3445N; wv) AppleWebKit/537.36 (KHTML, '
                + 'like Gecko) Version/4.0 Chrome/130.0.6723.102 Mobile Safari/537.36',
            '', 'Smart-TV', false,
        ],
        // Sharp AQUOS TVs, from the fixtures of Matomo's device-detector, which the service detects as `Smart-TV`
        // if it knows the model, e.g. `Sharp AQUOS TV Browser` or `Sharp AQUOS-TVX19A (2T-BG1X)`, while it falls back
        // to generic results for the other ones, e.g. `Feature Phone` for `AQUOS-TVX21A`
        [
            'Mozilla/5.0 (DTV) AppleWebKit/531.2+ (KHTML, like Gecko) Espial/6.1.5 AQUOSBrowser/2.0 '
                + '(US01DTV;V;0001;0001)',
            '', 'Smart-TV', false,
        ],
        [
            'Mozilla/5.0 (Linux; Android 11; AQUOS-TVE19A Build/RTOB.240320.001; wv) AppleWebKit/537.36 (KHTML, '
                + 'like Gecko) Version/4.0 Chrome/124.0.6367.123 YaBrowser/24.1.2.87 (lite) TV Safari/537.36',
            '', 'Smart-TV', false,
        ],
        ['Dalvik/2.1.0 (Linux; U; Android 10; AQUOS-TVX21A Build/QTG3.200913.001)', '', 'Smart-TV', false],
        ['Dalvik/2.1.0 (Linux; U; Android 9; AQUOS_TVE19A Build/PTO8.211107.001)', '', 'Smart-TV', false],
        [
            'Opera/9.80 (Linux armv6l; U; en) Presto/2.8.115 Version/11.10 AQUOS-AS/1.0 LC-40LE835X',
            '', 'Smart-TV', false,
        ],
        ['DLNADOC/1.50 SHARP-AQUOS-DMP/2.0W', '', 'Smart-TV', false],
        // phones whose name has `bot`, `AQUOS` or a word like `after`, which the service detects as phones,
        // e.g. as `Feature Phone` if it does not know the model, while it is `Smartphone` without its database
        [
            'Mozilla/5.0 (Linux; Android 12; KINGKONG 7 Build/SP1A.210812.016; CUBOT) AppleWebKit/537.36 '
                + '(KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36',
            '', 'Smartphone', true,
        ],
        [
            'Mozilla/5.0 (Linux; Android 13; CUBOT KINGKONG 9) AppleWebKit/537.36 (KHTML, '
                + 'like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
            '', 'Smartphone', true,
        ],
        [
            'Mozilla/5.0 (Linux; Android 13; AQUOS sense7) AppleWebKit/537.36 (KHTML, '
                + 'like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
            '', 'Smartphone', true,
        ],
        [
            'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, '
                + 'like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 after',
            '', 'Smartphone', true,
        ],
        ['Googlebot/2.1 (+http://www.google.com/bot.html)', '', 'Robot', false],
        [
            'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
            '', 'Robot', false,
        ],
        [
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/141.0 Safari/537.36',
            '', 'Robot', false,
        ],
        ['', '', 'Desktop', false],
    ])('%s', (userAgent, name, formFactor, isMobile) => {
        expect(getWurflDevice(userAgent)).toEqual({
            complete_device_name: name,
            form_factor: formFactor,
            is_mobile: isMobile,
        });
    });

    test('an iPad with the desktop User-Agent of Safari is detected by its touch points', () => {
        const ipadOs = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 '
            + '(KHTML, like Gecko) Version/17.5 Safari/605.1.15';
        expect(getWurflDevice(ipadOs, 5)).toEqual({
            complete_device_name: 'Apple iPad',
            form_factor: 'Tablet',
            is_mobile: true,
        });
        expect(getWurflDevice(ipadOs, 0).form_factor).toBe('Desktop');
        expect(getWurflDevice(ipadOs, 1).form_factor).toBe('Desktop');
        expect(getWurflDevice(ipadOs, '5').form_factor).toBe('Desktop');
    });

    test('a mobile browser is detected by its User-Agent Client Hint', () => {
        const ua = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like '
            + 'Gecko) Chrome/141.0 Safari/537.36';
        // the reduced User-Agent of Chrome has `Mobile` on phones only, so it is a tablet, also with the hint
        expect(getWurflDevice(ua).form_factor).toBe('Tablet');
        expect(getWurflDevice(ua, 5, true).form_factor).toBe('Tablet');
        const desktop = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like '
            + 'Gecko) Chrome/141.0 Safari/537.36';
        expect(getWurflDevice(desktop, 0, true)).toEqual({
            complete_device_name: '',
            form_factor: 'Smartphone',
            is_mobile: true,
        });
        expect(getWurflDevice(desktop, 0, false).form_factor).toBe('Desktop');
        expect(getWurflDevice(desktop, 0, 'true').form_factor).toBe('Desktop');
    });

    test.each([undefined, null, 1, {}, ['iPhone']])('no User-Agent: %j', (userAgent) => {
        expect(getWurflDevice(userAgent)).toEqual({
            complete_device_name: '',
            form_factor: 'Desktop',
            is_mobile: false,
        });
    });
});
