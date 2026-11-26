// the URL of the page, as the domain depends on its host
// @vitest-environment-options { "url": "https://www.news.example.co.uk/page" }
import {
    afterEach,
    describe,
    expect,
    test,
    vi,
} from 'vitest';

import { getAdobeOptInCookieDomain } from '../../src/helpers/adobe-visitor-mock';

describe('getAdobeOptInCookieDomain', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('returns the widest domain of the host on which a cookie can be set', () => {
        // `co.uk` is a public suffix, which is refused, so the registrable domain is found, not guessed
        expect(getAdobeOptInCookieDomain()).toBe('example.co.uk');
        expect(getAdobeOptInCookieDomain('')).toBe('example.co.uk');
        expect(document.cookie).toBe('');
    });

    test('tries the domains from the widest one and removes the test cookie', () => {
        const written: string[] = [];
        const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') as PropertyDescriptor;
        vi.spyOn(document, 'cookie', 'set').mockImplementation((value: string) => {
            written.push(value);
            (descriptor.set as (value: string) => void).call(document, value);
        });
        getAdobeOptInCookieDomain();
        const name = (written[0].match(/^(TEST_AMCV_COOKIE_WRITE_[a-z0-9]+)=/) as RegExpMatchArray)[1];
        expect(written).toEqual([
            `${name}=cookie; path=/; domain=co.uk;`,
            `${name}=cookie; path=/; domain=example.co.uk;`,
            `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; domain=example.co.uk;`,
        ]);
    });

    test('takes only its own test cookie with its value for a written one', () => {
        // a cookie with the name of the test cookie, but another value which starts like the written one,
        // e.g. of the page, while the browser refuses all domains
        let testName = '';
        vi.spyOn(document, 'cookie', 'set').mockImplementation((value: string) => {
            [testName] = value.split('=');
        });
        vi.spyOn(document, 'cookie', 'get').mockImplementation(() => `${testName}=cookie-extra`);
        expect(getAdobeOptInCookieDomain()).toBe('');
    });

    test('returns the domain of the configuration without a test cookie', () => {
        const setter = vi.spyOn(document, 'cookie', 'set');
        expect(getAdobeOptInCookieDomain('news.example.co.uk')).toBe('news.example.co.uk');
        expect(getAdobeOptInCookieDomain('.example.co.uk')).toBe('.example.co.uk');
        expect(setter).not.toHaveBeenCalled();
    });

    test('returns an empty string for the host of the page, i.e. a cookie without a domain', () => {
        expect(getAdobeOptInCookieDomain('www.news.example.co.uk')).toBe('');
    });

    test('returns an empty string if cookies are not available', () => {
        vi.spyOn(document, 'cookie', 'set').mockImplementation(() => {
            throw new Error('The document is sandboxed');
        });
        expect(getAdobeOptInCookieDomain()).toBe('');
    });

    test('returns an empty string if no cookie can be set on a domain of the host', () => {
        vi.spyOn(document, 'cookie', 'set').mockImplementation(() => {});
        expect(getAdobeOptInCookieDomain()).toBe('');
    });

    test('avoids colliding with an existing host cookie of the probe name or prefix', () => {
        document.cookie = 'TEST_AMCV_COOKIE_WRITE=cookie-extra; path=/';
        try {
            expect(getAdobeOptInCookieDomain()).toBe('example.co.uk');
            expect(document.cookie).toBe('TEST_AMCV_COOKIE_WRITE=cookie-extra');
        } finally {
            document.cookie = 'TEST_AMCV_COOKIE_WRITE=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
    });

    test('matches only the exact probe name and value pair', () => {
        vi.spyOn(document, 'cookie', 'get')
            .mockReturnValueOnce('')
            .mockReturnValue('TEST_AMCV_COOKIE_WRITE=cookie-extra');
        vi.spyOn(document, 'cookie', 'set').mockImplementation(() => {});
        // Even if the same cookie name appears with another value, a prefix match is not accepted
        expect(getAdobeOptInCookieDomain()).toBe('');
    });
});
