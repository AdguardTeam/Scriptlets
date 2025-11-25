import {
    describe,
    expect,
    test,
    it,
} from 'vitest';

import {
    isRedirectResourceCompatibleWithAdg,
    isValidAdgRedirectRule,
    isValidScriptletRule,
} from '../../src/validators';

describe('validators', () => {
    describe('isValidScriptletRule()', () => {
        describe('isValidScriptletRule()', () => {
            const validRules = [
                "example.org#%#//scriptlet('abort-on-property-read', 'I10C')",
                'example.org##+js(setTimeout-defuser.js, [native code], 8000)',
                // scriptlet rule converted from ubo syntax
                "example.org#%#//scriptlet('ubo-setTimeout-defuser.js', '[native code]', '8000')",
                'example.org#@%#//scriptlet("ubo-aopw.js", "notDetected")',
                // no space between parameters
                'example.org##+js(aopr,__cad.cpm_popup)',
                // set-constant empty string
                'example.org##+js(set-constant, config.ads.desktopAd, \'\')',
                // multiple selectors for remove-attr/class
                'example.org##+js(ra, href|target, #image > [href][onclick]\\, #page_effect > [href][onclick])',
            ];
            test.each(validRules)('%s', (rule: string) => {
                expect(isValidScriptletRule(rule)).toBeTruthy();
            });

            const invalidRules = [
                // unknown scriptlet name
                'example.org#@%#//scriptlet("ubo-abort-scriptlet.js", "notDetected")',
                // few abp snippets rule
                // eslint-disable-next-line max-len
                'example.org#$#hide-if-has-and-matches-style \'d[id^="_"]\' \'div > s\' \'display: none\'; hide-if-contains /.*/ .p \'a[href^="/ad__c?"]\'',
                // single abp snippet rule
                'example.org#$#hide-if-contains li.item \'li.item div.label\'',
                // invalid due to missed arg quotes
                'example.com#%#//scriptlet("abp-abort-current-inline-script", console.log", "Hello")',
            ];
            test.each(invalidRules)('%s', (rule: string) => {
                expect(isValidScriptletRule(rule)).toBeFalsy();
            });
        });

        describe('checks that allowlist script rules are valid', () => {
            it('correctly validates allowlist script rules', () => {
                expect(isValidScriptletRule('#@%#//scriptlet()')).toBeTruthy();
                expect(isValidScriptletRule('#@%#//scriptlet("set-cookie")')).toBeTruthy();
                expect(isValidScriptletRule('#@%#//scriptlet("set-cookie")')).toBeTruthy();
                expect(isValidScriptletRule("#@%#//scriptlet('')")).toBeFalsy();
                expect(isValidScriptletRule('#@%#//scriptlet("")')).toBeFalsy();
                expect(isValidScriptletRule('#@#+js()')).toBeTruthy();
                expect(isValidScriptletRule("#@#+js('')")).toBeFalsy();
                expect(isValidScriptletRule('#@#+js("")')).toBeFalsy();
                expect(isValidScriptletRule('||delivery.tf1.fr/pub')).toBeFalsy();
            });
        });
    });

    describe('isValidAdgRedirectRule()', () => {
        const validRules = [
            '||example.org$xmlhttprequest,redirect=noopvast-2.0',
            '||example.com/log$redirect=empty',
            '||example.org$xmlhttprequest,redirect=noopvast-4.0',
            '||example.org^$xmlhttprequest,redirect=noopjson',
            '||youtube.com/embed/$redirect=click2load.html,domain=example.org',
            // obsolete googletagmanager-gtm should be true as it is an alias for google-analytics
            '||example.org/script.js$script,redirect=googletagmanager-gtm',
            // valid adg name for the redirect
            '||cloudflare.com/ajax/libs/fingerprintjs2/$script,redirect=fingerprintjs2,important',
            // $redirect-rule
            '||example.org$xmlhttprequest,redirect-rule=noopvast-2.0',
            '||example.org/script.js$script,redirect-rule=googletagmanager-gtm',
            // with positive priority
            '||example.org^$xmlhttprequest,redirect=nooptext:1',
            '||example.org^$xmlhttprequest,redirect-rule=nooptext:100',
            // with negative priority
            '||example.org^$xmlhttprequest,redirect=nooptext:-1',
        ];
        test.each(validRules)('%s', (rule: string) => {
            expect(isValidAdgRedirectRule(rule)).toBeTruthy();
        });

        const invalidRules = [

            // ubo redirect name is not a valid adg redirect name
            '/blockadblock.$script,redirect=hd-main.js',
            '/blockadblock.$script,redirect-rule=hd-main.js',
            // invalid adg redirect name
            '||example.com/banner$image,redirect=redirect.png',
            '||example.com/banner$image,redirect-rule=redirect.png',
            // invalid redirect resource with priority
            '||example.com/banner$image,redirect=invalid:1',
            '||example.com/banner$image,redirect-rule=invalid:-1',
        ];
        test.each(invalidRules)('%s', (rule: string) => {
            expect(isValidAdgRedirectRule(rule)).toBeFalsy();
        });
    });

    describe('isRedirectResourceCompatibleWithAdg()', () => {
        const validRedirectNames = [
            'noopvast-4.0', // adg only
            'empty', // adg/ubo
            // with positive priority
            'nooptext:1',
            'nooptext:100',
            // with negative priority
            'nooptext:-1',
        ];
        test.each(validRedirectNames)('%s', (name: string) => {
            expect(isRedirectResourceCompatibleWithAdg(name)).toBeTruthy();
        });

        const invalidRedirectNames = [
            'outbrain-widget.js', // ubo only
            'stylesheet', // ubo only
            'invalid:1', // invalid resource even with priority
            'invalid:-1', // invalid resource even with negative priority
        ];
        test.each(invalidRedirectNames)('%s', (name: string) => {
            expect(isRedirectResourceCompatibleWithAdg(name)).toBeFalsy();
        });
    });
});
