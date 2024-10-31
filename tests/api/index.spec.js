import {
    convertScriptletToAdg,
    convertAdgScriptletToUbo,
    convertRedirectToAdg,
    convertAdgRedirectToUbo,
    isValidScriptletRule,
    convertRedirectNameToAdg,
} from '../../src/helpers/converter';
import validator from '../../src/validators/validator';

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

describe('Test scriptlet api methods', () => {
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
        test.each(validRules)('%s', (rule) => {
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
        test.each(invalidRules)('%s', (rule) => {
            expect(isValidScriptletRule(rule)).toBeFalsy();
        });
    });

    describe('convertScriptletToAdg(comment)', () => {
        const testCases = [
            {
                actual: "! example.org#%#//scriptlet('abort-on-property-read', 'I10C')",
                expected: "! example.org#%#//scriptlet('abort-on-property-read', 'I10C')",
            },
            {
                actual: '! ||example.com^$xmlhttprequest,redirect=nooptext',
                expected: '! ||example.com^$xmlhttprequest,redirect=nooptext',
            },
            {
                actual: '!||example.com^$xmlhttprequest,redirect=nooptext',
                expected: '!||example.com^$xmlhttprequest,redirect=nooptext',
            },
            {
                actual: '!!!  ||example.com^$xmlhttprequest,redirect=nooptext',
                expected: '!!!  ||example.com^$xmlhttprequest,redirect=nooptext',
            },
        ];
        test.each(testCases)('$actual', ({ actual, expected }) => {
            expect(convertScriptletToAdg(actual)[0]).toStrictEqual(expected);
        });
    });

    describe('convertScriptletToAdg(adg-rule)', () => {
        const validTestCases = [
            {
                actual: "example.org#%#//scriptlet('abort-on-property-read', 'I10C')",
                expected: "example.org#%#//scriptlet('abort-on-property-read', 'I10C')",
            },
            {
                actual: "example.org#@%#//scriptlet('abort-on-property-read', 'I10C')",
                expected: "example.org#@%#//scriptlet('abort-on-property-read', 'I10C')",
            },
        ];
        test.each(validTestCases)('$actual', ({ actual, expected }) => {
            expect(convertScriptletToAdg(actual)[0]).toStrictEqual(expected);
        });

        it('validates invalid scriptlet rule', () => {
            // invalid syntax rule
            const invalidRule = "example.org#%#//scriptlet('abort-on-property-read', I10C')";
            expect(convertScriptletToAdg(invalidRule).length).toBe(0);
        });
    });

    describe('convertScriptletToAdg(ubo-rule) -> adg', () => {
        const validTestCases = [
            {
                actual: 'example.org##+js(setTimeout-defuser.js, [native code], 8000)',
                expected: 'example.org#%#//scriptlet(\'ubo-setTimeout-defuser.js\', \'[native code]\', \'8000\')',
            },
            {
                // no space between parameters
                actual: 'example.org##+js(aopr,__ad)',
                expected: 'example.org#%#//scriptlet(\'ubo-aopr\', \'__ad\')',
            },
            {
                // '$' as parameter
                actual: 'example.org##+js(abort-current-inline-script, $, popup)',
                expected: 'example.org#%#//scriptlet(\'ubo-abort-current-inline-script\', \'$\', \'popup\')',
            },
            {
                // '' as set-constant parameter
                actual: 'example.org##+js(set-constant, config.ads.desktopAd, \'\')',
                expected: 'example.org#%#//scriptlet(\'ubo-set-constant\', \'config.ads.desktopAd\', \'\')',
            },
            {
                // multiple selectors for remove-attr/class
                // eslint-disable-next-line max-len
                actual: 'example.com##+js(ra, href, area[href*="discord-app.com/"]\\, area[href*="facebook.com/"]\\, area[href*="instagram.com/"])',
                // eslint-disable-next-line max-len
                expected: 'example.com#%#//scriptlet(\'ubo-ra\', \'href\', \'area[href*="discord-app.com/"], area[href*="facebook.com/"], area[href*="instagram.com/"]\')',
            },
            {
                // empty selector and specified applying for remove-attr/class
                actual: 'example.com##+js(rc, cookie--not-set, , stay)',
                expected: "example.com#%#//scriptlet('ubo-rc', 'cookie--not-set', '', 'stay')",
            },
            {
                // specified selectors and applying for remove-attr/class
                actual: 'memo-book.pl##+js(rc, .locked, body\\, html, stay)',
                expected: "memo-book.pl#%#//scriptlet('ubo-rc', '.locked', 'body, html', 'stay')",
            },
            {
                // specified selectors and applying for remove-attr/class - one backslash
                // eslint-disable-next-line no-useless-escape
                actual: 'memo-book.pl##+js(rc, .locked, body\, html, stay)',
                expected: "memo-book.pl#%#//scriptlet('ubo-rc', '.locked', 'body, html', 'stay')",
            },
            {
                // just two args for remove-attr/class
                actual: 'example.com##+js(ra, onselectstart)',
                expected: "example.com#%#//scriptlet('ubo-ra', 'onselectstart')",
            },
            {
                // double quotes in scriptlet parameter
                actual: 'example.com#@#+js(remove-attr.js, href, a[data-st-area="back"])',
                // eslint-disable-next-line max-len
                expected: String.raw`example.com#@%#//scriptlet('ubo-remove-attr.js', 'href', 'a[data-st-area="back"]')`,
            },
            {
                // the same but with single quotes
                actual: 'example.com#@#+js(remove-attr.js, href, a[data-st-area=\'back\'])',
                // eslint-disable-next-line max-len
                expected: String.raw`example.com#@%#//scriptlet('ubo-remove-attr.js', 'href', 'a[data-st-area=\'back\']')`,
            },
            {
                // name without '.js' at the end
                actual: 'example.org##+js(addEventListener-defuser, load, 2000)',
                expected: 'example.org#%#//scriptlet(\'ubo-addEventListener-defuser\', \'load\', \'2000\')',
            },
            {
                // short form of name
                actual: 'example.org##+js(nano-stb, timeDown)',
                expected: 'example.org#%#//scriptlet(\'ubo-nano-stb\', \'timeDown\')',
            },
            {
                actual: 'example.org#@#+js(setTimeout-defuser.js, [native code], 8000)',
                expected: 'example.org#@%#//scriptlet(\'ubo-setTimeout-defuser.js\', \'[native code]\', \'8000\')',
            },
            {
                actual: 'example.org#@#script:inject(abort-on-property-read.js, some.prop)',
                expected: 'example.org#@%#//scriptlet(\'ubo-abort-on-property-read.js\', \'some.prop\')',
            },
            {
                actual: 'example.org#@#+js(aopw, notDetected)',
                expected: 'example.org#@%#//scriptlet(\'ubo-aopw\', \'notDetected\')',
            },
            {
                // wildcard tld
                actual: 'example.*##+js(abort-on-stack-trace, Object.prototype.parallax, window.onload)',
                // eslint-disable-next-line max-len
                expected: 'example.*#%#//scriptlet(\'ubo-abort-on-stack-trace\', \'Object.prototype.parallax\', \'window.onload\')',
            },
            {
                actual: 'example.com##+js(remove-class, blur, , stay)',
                expected: "example.com#%#//scriptlet('ubo-remove-class', 'blur', '', 'stay')",
            },
            {
                actual: 'example.com##+js(set-cookie, CookieConsent, true)',
                expected: "example.com#%#//scriptlet('ubo-set-cookie', 'CookieConsent', 'true')",
            },
            {
                actual: 'example.com##+js(set-cookie-reload, isSet, 1)',
                expected: "example.com#%#//scriptlet('ubo-set-cookie-reload', 'isSet', '1')",
            },
            {
                actual: 'example.com##+js(set-local-storage-item, gdpr_popup, true)',
                expected: "example.com#%#//scriptlet('ubo-set-local-storage-item', 'gdpr_popup', 'true')",
            },
            {
                actual: 'example.com##+js(set-session-storage-item, acceptCookies, false)',
                expected: "example.com#%#//scriptlet('ubo-set-session-storage-item', 'acceptCookies', 'false')",
            },
            {
                actual: 'example.com##+js(spoof-css, .advert, display, block)',
                expected: "example.com#%#//scriptlet('ubo-spoof-css', '.advert', 'display', 'block')",
            },
            {
                actual: 'example.com##+js(spoof-css, .adsbygoogle\\, #ads\\, .adTest, visibility, visible)',
                // eslint-disable-next-line max-len
                expected: "example.com#%#//scriptlet('ubo-spoof-css', '.adsbygoogle, #ads, .adTest', 'visibility', 'visible')",
            },
            // https://github.com/AdguardTeam/Scriptlets/issues/404
            {
                actual: 'example.com##+js(set-local-storage-item, mode, $remove$)',
                expected: "example.com#%#//scriptlet('ubo-set-local-storage-item', 'mode', '$remove$')",
            },
        ];
        test.each(validTestCases)('$actual', ({ actual, expected }) => {
            expect(convertScriptletToAdg(actual)[0]).toStrictEqual(expected);
        });
    });

    describe('convertScriptletToAdg(abp-rule) -> adg', () => {
        const testCases = [
            {
                // eslint-disable-next-line max-len
                actual: 'example.org#$#abort-on-property-read atob; abort-on-property-write Fingerprint2; abort-on-property-read decodeURIComponent; abort-on-property-read RegExp',
                expected: [
                    "example.org#%#//scriptlet('abp-abort-on-property-read', 'atob')",
                    "example.org#%#//scriptlet('abp-abort-on-property-write', 'Fingerprint2')",
                    "example.org#%#//scriptlet('abp-abort-on-property-read', 'decodeURIComponent')",
                    "example.org#%#//scriptlet('abp-abort-on-property-read', 'RegExp')",
                ],
            },
            {
                actual: 'example.com#$#abort-current-inline-script onload;',
                expected: [
                    "example.com#%#//scriptlet('abp-abort-current-inline-script', 'onload')",
                ],
            },
            {
                // eslint-disable-next-line max-len
                actual: 'example.org#$#abort-on-property-read Object.prototype.createHostAsserter; abort-on-property-read Object.prototype.DlEDrf;',
                expected: [
                    "example.org#%#//scriptlet('abp-abort-on-property-read', 'Object.prototype.createHostAsserter')",
                    "example.org#%#//scriptlet('abp-abort-on-property-read', 'Object.prototype.DlEDrf')",
                ],
            },
            {
                // eslint-disable-next-line max-len
                actual: 'example.org#$#hide-if-has-and-matches-style \'d[id^="_"]\' \'div > s\' \'display: none\'; hide-if-contains /.*/ .p \'a[href^="/ad__c?"]\'',
                expected: [
                    // eslint-disable-next-line max-len
                    'example.org#%#//scriptlet(\'abp-hide-if-has-and-matches-style\', \'d[id^="_"]\', \'div > s\', \'display: none\')',
                    'example.org#%#//scriptlet(\'abp-hide-if-contains\', \'/.*/\', \'.p\', \'a[href^="/ad__c?"]\')',
                ],
            },
        ];

        test.each(testCases)('$actual', ({ actual, expected }) => {
            expect(convertScriptletToAdg(actual)).toStrictEqual(expected);
        });
    });

    describe('convertAdgScriptletToUbo(adg-rule) -> ubo', () => {
        describe('tests in group', () => {
            const testCases = [
                {
                    actual: 'example.org#%#//scriptlet(\'prevent-setTimeout\', \'[native code]\', \'8000\')',
                    expected: 'example.org##+js(no-setTimeout-if, [native code], 8000)',
                },
                {
                    // '' as set-constant parameter
                    actual: 'example.org#%#//scriptlet(\'set-constant\', \'config.ads.desktopAd\', \'\')',
                    expected: 'example.org##+js(set-constant, config.ads.desktopAd, \'\')',
                },
                {
                    // multiple selectors parameter for remove-attr/class
                    // eslint-disable-next-line max-len
                    actual: 'example.org#%#//scriptlet(\'remove-class\', \'promo\', \'a.class, div#id, div > #ad > .test\')',
                    expected: 'example.org##+js(remove-class, promo, a.class\\, div#id\\, div > #ad > .test)',
                },
                {
                    // scriptlet with no parameters
                    actual: 'example.com#%#//scriptlet("prevent-fab-3.2.0")',
                    expected: 'example.com##+js(prevent-fab-3.2.0)',
                },
                {
                    actual: 'example.org#@%#//scriptlet(\'prevent-setTimeout\', \'[native code]\', \'8000\')',
                    expected: 'example.org#@#+js(no-setTimeout-if, [native code], 8000)',
                },
                {
                    actual: 'example.org#%#//scriptlet("ubo-abort-on-property-read.js", "alert")',
                    expected: 'example.org##+js(abort-on-property-read, alert)',
                },
                {
                    actual: 'example.com#%#//scriptlet("abp-abort-current-inline-script", "console.log", "Hello")',
                    expected: 'example.com##+js(abort-current-script, console.log, Hello)',
                },
                {
                    actual: 'example.com#%#//scriptlet(\'prevent-fetch\', \'*\')',
                    expected: 'example.com##+js(prevent-fetch, /^/)',
                },
                {
                    actual: 'example.com#%#//scriptlet(\'close-window\')',
                    expected: 'example.com##+js(close-window)',
                },
                {
                    actual: "example.com#%#//scriptlet('set-cookie', 'CookieConsent', 'true')",
                    expected: 'example.com##+js(set-cookie, CookieConsent, true)',
                },
                {
                    actual: "example.com#%#//scriptlet('set-local-storage-item', 'gdpr_popup', 'true')",
                    expected: 'example.com##+js(set-local-storage-item, gdpr_popup, true)',
                },
                {
                    actual: "example.com#%#//scriptlet('set-session-storage-item', 'acceptCookies', 'false')",
                    expected: 'example.com##+js(set-session-storage-item, acceptCookies, false)',
                },
                {
                    // emptyArr as set-constant parameter
                    actual: "example.org#%#//scriptlet('set-constant', 'adUnits', 'emptyArr')",
                    expected: 'example.org##+js(set-constant, adUnits, [])',
                },
                {
                    // emptyObj as set-constant parameter
                    actual: "example.org#%#//scriptlet('set-constant', 'adUnits', 'emptyObj')",
                    expected: 'example.org##+js(set-constant, adUnits, {})',
                },
                {
                    // Escapes commas in params
                    actual: String.raw`example.com#%#//scriptlet('adjust-setInterval', ',dataType:_', '1000', '0.02')`,
                    expected: String.raw`example.com##+js(adjust-setInterval, \,dataType:_, 1000, 0.02)`,
                },
                {
                    actual: "example.com#%#//scriptlet('spoof-css', '.advert', 'display', 'block')",
                    expected: 'example.com##+js(spoof-css, .advert, display, block)',
                },
                {
                    // eslint-disable-next-line max-len
                    actual: "example.com#%#//scriptlet('spoof-css', '.adsbygoogle, #ads, .adTest', 'visibility', 'visible')",
                    expected: 'example.com##+js(spoof-css, .adsbygoogle\\, #ads\\, .adTest, visibility, visible)',
                },
                {
                    actual: "example.com#%#//scriptlet('set-cookie-reload', 'consent', 'true')",
                    expected: 'example.com##+js(set-cookie-reload, consent, true)',
                },
                // https://github.com/AdguardTeam/Scriptlets/issues/404
                {
                    actual: "example.com#%#//scriptlet('set-local-storage-item', 'mode', '$remove$')",
                    expected: 'example.com##+js(set-local-storage-item, mode, $remove$)',
                },
            ];
            test.each(testCases)('$actual', ({ actual, expected }) => {
                expect(convertAdgScriptletToUbo(actual)).toStrictEqual(expected);
            });
        });
    });
    it('converts empty scriptlets', () => {
        expect(convertAdgScriptletToUbo('example.org#@%#//scriptlet()')).toStrictEqual('example.org#@#+js()');
        expect(convertAdgScriptletToUbo('#@%#//scriptlet()')).toStrictEqual('#@#+js()');
    });
});

describe('Test redirects api methods', () => {
    describe('isRedirectResourceCompatibleWithAdg()', () => {
        const validRedirectNames = [
            'noopvast-4.0', // adg only
            'empty', // adg/ubo
        ];
        test.each(validRedirectNames)('%s', (name) => {
            expect(validator.isRedirectResourceCompatibleWithAdg(name)).toBeTruthy();
        });

        const invalidRedirectNames = [
            'outbrain-widget.js', // ubo only
            'stylesheet', // ubo only
        ];
        test.each(invalidRedirectNames)('%s', (name) => {
            expect(validator.isRedirectResourceCompatibleWithAdg(name)).toBeFalsy();
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
        ];
        test.each(validRules)('%s', (rule) => {
            expect(validator.isValidAdgRedirectRule(rule)).toBeTruthy();
        });

        const invalidRules = [

            // ubo redirect name is not a valid adg redirect name
            '/blockadblock.$script,redirect=hd-main.js',
            '/blockadblock.$script,redirect-rule=hd-main.js',
            // invalid adg redirect name
            '||example.com/banner$image,redirect=redirect.png',
            '||example.com/banner$image,redirect-rule=redirect.png',
        ];
        test.each(invalidRules)('%s', (rule) => {
            expect(validator.isValidAdgRedirectRule(rule)).toBeFalsy();
        });
    });

    describe('convertRedirectToAdg(ubo) -> adg', () => {
        const testCases = [
            {
                actual: '||cdn.cookielaw.org^$important,redirect=noop.js:99,script,domain=open.spotify.com',
                expected: '||cdn.cookielaw.org^$important,redirect=noopjs,script,domain=open.spotify.com',
            },
            {
                actual: '||example.com/banner$image,redirect=32x32-transparent.png',
                expected: '||example.com/banner$image,redirect=32x32-transparent.png',
            },
            {
                actual: '||example.com/banner$image,redirect=32x32.png',
                expected: '||example.com/banner$image,redirect=32x32-transparent.png',
            },
            {
                actual: '||example.orf^$media,redirect=noop-1s.mp4,third-party',
                expected: '||example.orf^$media,redirect=noopmp4-1s,third-party',
            },
            {
                // old ubo adsbygoogle alias works
                // eslint-disable-next-line max-len
                actual: '||googlesyndication.com^$script,redirect=googlesyndication.com/adsbygoogle.js,domain=example.org',
                expected: '||googlesyndication.com^$script,redirect=googlesyndication-adsbygoogle,domain=example.org',
            },
            {
                // new adsbygoogle alias works as well
                // eslint-disable-next-line max-len
                actual: '||googlesyndication.com^$script,redirect=googlesyndication_adsbygoogle.js,domain=example.org',
                expected: '||googlesyndication.com^$script,redirect=googlesyndication-adsbygoogle,domain=example.org',
            },
            {
                actual: '||g9g.eu^*fa.js$script,redirect=fuckadblock.js-3.2.0',
                expected: '||g9g.eu^*fa.js$script,redirect=prevent-fab-3.2.0',
            },
            {
                // eslint-disable-next-line max-len
                actual: '||imasdk.googleapis.com/js/sdkloader/ima3.js$script,important,redirect=google-ima.js,domain=example.org',
                // eslint-disable-next-line max-len
                expected: '||imasdk.googleapis.com/js/sdkloader/ima3.js$script,important,redirect=google-ima3,domain=example.org',
            },
            {
                actual: '||example.org^$stylesheet,redirect=noop.css,third-party',
                expected: '||example.org^$stylesheet,redirect=noopcss,third-party',
            },
            // $redirect-rule
            {
                actual: '||example.com/banner$image,redirect-rule=32x32-transparent.png',
                expected: '||example.com/banner$image,redirect-rule=32x32-transparent.png',
            },
            {
                actual: '||example.com/banner$image,redirect-rule=32x32.png',
                expected: '||example.com/banner$image,redirect-rule=32x32-transparent.png',
            },
            {
                actual: '||example.orf^$media,redirect-rule=noop-1s.mp4,third-party',
                expected: '||example.orf^$media,redirect-rule=noopmp4-1s,third-party',
            },
            {
                // old ubo adsbygoogle alias works
                // eslint-disable-next-line max-len
                actual: '||googlesyndication.com^$script,redirect-rule=googlesyndication.com/adsbygoogle.js,domain=example.org',
                // eslint-disable-next-line max-len
                expected: '||googlesyndication.com^$script,redirect-rule=googlesyndication-adsbygoogle,domain=example.org',
            },
            {
                // newer alias works as well
                // eslint-disable-next-line max-len
                actual: '||googlesyndication.com^$script,redirect-rule=googlesyndication_adsbygoogle.js,domain=example.org',
                // eslint-disable-next-line max-len
                expected: '||googlesyndication.com^$script,redirect-rule=googlesyndication-adsbygoogle,domain=example.org',
            },
            {
                actual: '||googletagmanager.com/gtag/js$script,redirect-rule=googletagmanager_gtm.js',
                expected: '||googletagmanager.com/gtag/js$script,redirect-rule=google-analytics',
            },
        ];
        test.each(testCases)('$actual', ({ actual, expected }) => {
            expect(convertRedirectToAdg(actual)).toStrictEqual(expected);
        });
    });

    describe('convertRedirectToAdg(abp-rule) -> adg', () => {
        const testCases = [
            {
                actual: '||example.com^$script,rewrite=abp-resource:blank-js',
                expected: '||example.com^$script,redirect=noopjs',
            },
            {
                actual: '||*/ad/$rewrite=abp-resource:blank-mp3,domain=example.org',
                expected: '||*/ad/$redirect=noopmp3-0.1s,domain=example.org',
            },
        ];
        test.each(testCases)('$actual', ({ actual, expected }) => {
            expect(convertRedirectToAdg(actual)).toStrictEqual(expected);
        });
    });

    describe('convertAdgRedirectToUbo(adg-rule) -> ubo', () => {
        const validTestCases = [
            {
                actual: '||example.com^$script,redirect=noopjs:99',
                expected: '||example.com^$script,redirect=noop.js',
            },
            {
                actual: '||example.com^$xmlhttprequest,redirect=nooptext',
                expected: '||example.com^$xhr,redirect=noop.txt',
            },
            {
                actual: '||example.com/*.css$important,redirect=noopcss',
                expected: '||example.com/*.css$important,redirect=noop.css,stylesheet',
            },
            {
                // image type is supported by nooptext too
                actual: '||example.com^$image,redirect=nooptext',
                expected: '||example.com^$image,redirect=noop.txt',
            },
            {
                // eslint-disable-next-line max-len
                actual: '||example.com/images/*.png$image,important,redirect=1x1-transparent.gif,domain=example.com|example.org',
                expected: '||example.com/images/*.png$image,important,redirect=1x1.gif,domain=example.com|example.org',
            },
            {
                actual: '||example.com/vast/$important,redirect=empty,~third-party',
                expected: '||example.com/vast/$important,redirect=empty,~3p',
            },
            {
                // add source type modifiers while conversion if there is no one of them
                // eslint-disable-next-line max-len
                actual: '||example.com/images/*.png$redirect=1x1-transparent.gif,domain=example.com|example.org,important',
                expected: '||example.com/images/*.png$redirect=1x1.gif,domain=example.com|example.org,important,image',
            },
            {
                actual: '||example.com/*.mp4$important,redirect=noopmp4-1s,~third-party',
                expected: '||example.com/*.mp4$important,redirect=noop-1s.mp4,~3p,media',
            },
            {
                actual: '||example.com/*.css$important,redirect=noopcss',
                expected: '||example.com/*.css$important,redirect=noop.css,stylesheet',
            },
            {
                actual: '||ad.example.com^$redirect=nooptext,important',
                // eslint-disable-next-line max-len
                expected: '||ad.example.com^$redirect=noop.txt,important,image,media,subdocument,stylesheet,script,xhr,other',
            },
            {
                // eslint-disable-next-line max-len
                actual: '||imasdk.googleapis.com/js/sdkloader/ima3.js$script,important,redirect=google-ima3,domain=example.org',
                // eslint-disable-next-line max-len
                expected: '||imasdk.googleapis.com/js/sdkloader/ima3.js$script,important,redirect=google-ima.js,domain=example.org',
            },
            // $redirect-rule
            {
                actual: '||example.com^$xmlhttprequest,redirect-rule=nooptext',
                expected: '||example.com^$xhr,redirect-rule=noop.txt',
            },
            {
                // image type is supported by nooptext too
                actual: '||example.com^$image,redirect-rule=nooptext',
                expected: '||example.com^$image,redirect-rule=noop.txt',
            },
            {
                // eslint-disable-next-line max-len
                actual: '||example.com/images/*.png$image,important,redirect-rule=1x1-transparent.gif,domain=example.com|example.org',
                // eslint-disable-next-line max-len
                expected: '||example.com/images/*.png$image,important,redirect-rule=1x1.gif,domain=example.com|example.org',
            },
            {
                actual: '||example.com/vast/$important,redirect-rule=empty,~third-party',
                expected: '||example.com/vast/$important,redirect-rule=empty,~3p',
            },
            {
                // add source type modifiers while conversion if there is no one of them
                // eslint-disable-next-line max-len
                actual: '||example.com/images/*.png$redirect-rule=1x1-transparent.gif,domain=example.com|example.org,important',
                // eslint-disable-next-line max-len
                expected: '||example.com/images/*.png$redirect-rule=1x1.gif,domain=example.com|example.org,important,image',
            },
            {
                actual: '||example.com/*.mp4$important,redirect-rule=noopmp4-1s,~third-party',
                expected: '||example.com/*.mp4$important,redirect-rule=noop-1s.mp4,~3p,media',
            },
            {
                actual: '||ad.example.com^$redirect-rule=nooptext,important',
                // eslint-disable-next-line max-len
                expected: '||ad.example.com^$redirect-rule=noop.txt,important,image,media,subdocument,stylesheet,script,xhr,other',
            },
        ];
        test.each(validTestCases)('$actual', ({ actual, expected }) => {
            expect(convertAdgRedirectToUbo(actual)).toStrictEqual(expected);
        });
    });

    describe('convertRedirectNameToAdg', () => {
        test.each([
            // Should return undefined if the redirect name doesn't exist
            {
                actual: 'this-redirect-name-does-not-exist',
                expected: undefined,
            },

            // Should return the original redirect name if its already an ADG redirect name
            // (i.e. leave ADG redirect names unchanged)
            {
                actual: '1x1-transparent.gif',
                expected: '1x1-transparent.gif',
            },

            // Should convert uBO -> ADG
            {
                actual: '1x1.gif',
                expected: '1x1-transparent.gif',
            },
            {
                actual: 'nobab.js',
                expected: 'prevent-bab',
            },
            {
                actual: 'noop.json',
                expected: 'noopjson',
            },
            // Valid uBO redirect name that aren't supported by ADG
            {
                actual: 'outbrain-widget.js',
                expected: undefined,
            },

            // Should convert ABP -> ADG
            {
                actual: '1x1-transparent-gif',
                expected: '1x1-transparent.gif',
            },
            {
                actual: 'blank-css',
                expected: 'noopcss',
            },
            // Should handle the case where the redirect name starts with 'abp-resource:'
            {
                actual: 'abp-resource:blank-js',
                expected: 'noopjs',
            },
        ])('$actual', ({ actual, expected }) => {
            expect(convertRedirectNameToAdg(actual)).toStrictEqual(expected);
        });
    });
});

describe('convertScriptletToAdg -- non-scriptlet rules', () => {
    const testRules = [
        '||example.com^$all',
        '||example.com/code/show.php$cookie=cookie_name',
        "example.com##div[class^='textLink' i]",
        '||example.com/pub$media,rewrite=abp-resource:blank-mp3,domain=example.org',
        '##.div',
        '##.banner:has(~ .right_bx, ~ div[class^="aside"])',
        'example.com#$#body { background: black; }',
        '||example.com^$script,redirect=noopjs.js',
        '||example.com^$removeparam=qwerty',
    ];

    test.each(testRules)('%s', (rule) => {
        // should not be changed
        expect(convertScriptletToAdg(rule)).toStrictEqual([rule]);
    });
});
