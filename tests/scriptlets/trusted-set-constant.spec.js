import { describe, expect, test } from 'vitest';

import { trustedSetConstant } from '../../src/scriptlets/trusted-set-constant';

// Rules from uBO filter lists, converted to AdGuard syntax by AGTree, which override properties of the page,
// so they are tested in a separate page of Vitest, as the trapped properties cannot be restored
describe('trusted-set-constant with uBO arguments', () => {
    const source = { name: 'ubo-trusted-set', verbose: false };

    test('json: string of document.visibilityState', () => {
        // m.youtube.com##+js(trusted-set, document.visibilityState, json:"visible")
        trustedSetConstant(source, 'document.visibilityState', 'json:"visible"');

        expect(document.visibilityState).toBe('visible');
    });

    test('{"value": …} of navigator.userAgent', () => {
        // eslint-disable-next-line max-len
        // upshrink.com##+js(trusted-set, navigator.userAgent, '{"value": "Mozilla/5.0 (iPhone14,3; U; CPU iPhone OS 15_0 like Mac OS X) …"}')
        const userAgent = 'Mozilla/5.0 (iPhone14,3; U; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/602.1.50 '
            + '(KHTML, like Gecko) Version/10.0 Mobile/19A346 Safari/602.1';
        trustedSetConstant(source, 'navigator.userAgent', `{"value": "${userAgent}"}`);

        expect(navigator.userAgent).toBe(userAgent);
    });

    test('runAt sets the property when the document is interactive', () => {
        // eslint-disable-next-line max-len
        // sanadegreecollege.in,powergam.online,qrixpe.com##+js(trusted-set, document.activeElement, { "value": {"tagName": "IFRAME" }}, runAt, 2)
        let readyState = 'loading';
        Object.defineProperty(document, 'readyState', { configurable: true, get: () => readyState });
        try {
            trustedSetConstant(source, 'document.activeElement', '{ "value": {"tagName": "IFRAME" }}', 'runAt', '2');
            expect(document.activeElement).toBe(document.body);

            readyState = 'interactive';
            document.dispatchEvent(new Event('readystatechange'));
            expect(document.activeElement).toEqual({ tagName: 'IFRAME' });
        } finally {
            delete document.readyState;
        }
    });
});

describe('trusted-set-constant with AdGuard arguments', () => {
    const source = { name: 'trusted-set-constant', verbose: false };

    test('runAt option sets the property when the document is interactive', () => {
        // letv8.cc,zhibo1.cc#%#//scriptlet('trusted-set-constant', 'adsv', '"Y"'), with `runAt`
        let readyState = 'loading';
        Object.defineProperty(document, 'readyState', { configurable: true, get: () => readyState });
        try {
            window.adsv = 'N';
            trustedSetConstant(source, 'adsv', '"Y"', '', '', 'runAt', 'interactive');
            expect(window.adsv).toBe('N');

            readyState = 'interactive';
            document.dispatchEvent(new Event('readystatechange'));
            expect(window.adsv).toBe('Y');
        } finally {
            delete document.readyState;
        }
    });
});
