import {
    describe,
    test,
    expect,
    it,
} from 'vitest';

import {
    convertAdgRedirectToUbo,
    convertAdgScriptletToUbo,
    convertScriptletToAdg,
} from '../../src/converters/converters';

interface StringTestCase {
    actual: string;
    expected: string | undefined;
}

describe('converters', () => {
    describe('convertScriptletToAdg', () => {
        describe('convertScriptletToAdg(comment)', () => {
            const testCases: StringTestCase[] = [
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
            test.each(testCases)('$actual', ({ actual, expected }: StringTestCase) => {
                expect(convertScriptletToAdg(actual)[0]).toStrictEqual(expected);
            });
        });
        describe('convertScriptletToAdg(adg-rule)', () => {
            const validTestCases: StringTestCase[] = [
                {
                    actual: "example.org#%#//scriptlet('abort-on-property-read', 'I10C')",
                    expected: "example.org#%#//scriptlet('abort-on-property-read', 'I10C')",
                },
                {
                    actual: "example.org#@%#//scriptlet('abort-on-property-read', 'I10C')",
                    expected: "example.org#@%#//scriptlet('abort-on-property-read', 'I10C')",
                },
            ];
            test.each(validTestCases)('$actual', ({ actual, expected }: StringTestCase) => {
                expect(convertScriptletToAdg(actual)[0]).toStrictEqual(expected);
            });

            it('validates invalid scriptlet rule', () => {
                // invalid syntax rule
                const invalidRule = "example.org#%#//scriptlet('abort-on-property-read', I10C')";
                expect(convertScriptletToAdg(invalidRule).length).toBe(0);
            });
        });

        describe('convertScriptletToAdg(ubo-rule) -> adg', () => {
            const validTestCases: StringTestCase[] = [
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
            test.each(validTestCases)('$actual', ({ actual, expected }: StringTestCase) => {
                expect(convertScriptletToAdg(actual)[0]).toStrictEqual(expected);
            });
        });

        describe('convertScriptletToAdg(abp-rule) -> adg', () => {
            interface ConvertScriptletToAdgTestCase {
                actual: string;
                expected: string[];
            }
            const testCases: ConvertScriptletToAdgTestCase[] = [
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
                        // eslint-disable-next-line max-len
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

            test.each(testCases)('$actual', ({ actual, expected }: ConvertScriptletToAdgTestCase) => {
                expect(convertScriptletToAdg(actual)).toStrictEqual(expected);
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

            test.each(testRules)('%s', (rule: string) => {
                // should not be changed
                expect(convertScriptletToAdg(rule)).toStrictEqual([rule]);
            });
        });
    });

    describe('convertAdgScriptletToUbo(adg-rule) -> ubo', () => {
        it('converts empty scriptlets', () => {
            expect(convertAdgScriptletToUbo('example.org#@%#//scriptlet()')).toStrictEqual('example.org#@#+js()');
            expect(convertAdgScriptletToUbo('#@%#//scriptlet()')).toStrictEqual('#@#+js()');
        });

        describe('tests in group', () => {
            const testCases: StringTestCase[] = [
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
            test.each(testCases)('$actual', ({ actual, expected }: StringTestCase) => {
                expect(convertAdgScriptletToUbo(actual)).toStrictEqual(expected);
            });
        });
    });

    describe('convertAdgRedirectToUbo(adg-rule) -> ubo', () => {
        const validTestCases: StringTestCase[] = [
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
        test.each(validTestCases)('$actual', ({ actual, expected }: StringTestCase) => {
            expect(convertAdgRedirectToUbo(actual)).toStrictEqual(expected);
        });
    });
});
