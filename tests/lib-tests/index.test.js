/* eslint-disable max-len */

import {
    convertScriptletToAdg,
    convertAdgScriptletToUbo,
    convertRedirectToAdg,
    convertAdgRedirectToUbo,
    isValidScriptletRule,
} from '../../src/helpers/converter';

import validator from '../../src/helpers/validator';

const { test, module } = QUnit;
const name = 'scriptlets-redirects lib';

module(name);

test('Test scriptlet rule validation', (assert) => {
    let inputRule;

    inputRule = "example.org#%#//scriptlet('abort-on-property-read', 'I10C')";
    assert.strictEqual(isValidScriptletRule(inputRule), true);

    inputRule = 'example.org##+js(setTimeout-defuser.js, [native code], 8000)';
    assert.strictEqual(isValidScriptletRule(inputRule), true);

    inputRule = 'example.org#@%#//scriptlet("ubo-aopw.js", "notDetected")';
    assert.strictEqual(isValidScriptletRule(inputRule), true);

    // no space between parameters
    inputRule = 'example.org##+js(aopr,__cad.cpm_popunder)';
    assert.strictEqual(isValidScriptletRule(inputRule), true);

    // set-constant empty string
    inputRule = 'example.org##+js(set-constant, config.ads.desktopPreroll, \'\')';
    assert.strictEqual(isValidScriptletRule(inputRule), true);

    // multiple selectors for remove-attr/class
    inputRule = 'example.org##+js(ra, href|target, #image > [href][onclick]\\, #page_effect > [href][onclick]))';
    assert.strictEqual(isValidScriptletRule(inputRule), true, 'multiple selectors for remove-attr/class - OK');

    // invalid scriptlet name
    inputRule = 'example.org#@%#//scriptlet("ubo-abort-scriptlet.js", "notDetected")';
    assert.strictEqual(isValidScriptletRule(inputRule), false);

    inputRule = 'example.org#$#hide-if-has-and-matches-style \'d[id^="_"]\' \'div > s\' \'display: none\'; hide-if-contains /.*/ .p \'a[href^="/ad__c?"]\'';
    assert.strictEqual(isValidScriptletRule(inputRule), false);

    inputRule = 'example.org#$#hide-if-contains li.serp-item \'li.serp-item div.label\'';
    assert.strictEqual(isValidScriptletRule(inputRule), false);
});

test('Test comment', (assert) => {
    let comment = "! example.org#%#//scriptlet('abort-on-property-read', 'I10C')";
    let expComment = "! example.org#%#//scriptlet('abort-on-property-read', 'I10C')";
    assert.strictEqual(convertScriptletToAdg(comment)[0], expComment);

    comment = '! ||example.com^$xmlhttprequest,redirect=nooptext';
    expComment = '! ||example.com^$xmlhttprequest,redirect=nooptext';
    assert.strictEqual(convertScriptletToAdg(comment)[0], expComment);
});

test('Test Adguard scriptlet rule', (assert) => {
    const rule = "example.org#%#//scriptlet('abort-on-property-read', 'I10C')";
    const exp = "example.org#%#//scriptlet('abort-on-property-read', 'I10C')";
    assert.strictEqual(convertScriptletToAdg(rule)[0], exp);
});

test('Test Adguard scriptlet rule exception', (assert) => {
    const rule = "example.org#@%#//scriptlet('abort-on-property-read', 'I10C')";
    const exp = "example.org#@%#//scriptlet('abort-on-property-read', 'I10C')";
    assert.strictEqual(convertScriptletToAdg(rule)[0], exp);
});

test('Test SCRIPTLET converting - UBO -> ADG', (assert) => {
    let blockingRule;
    let expBlockRule;
    // blocking rule
    blockingRule = 'example.org##+js(setTimeout-defuser.js, [native code], 8000)';
    expBlockRule = 'example.org#%#//scriptlet(\'ubo-setTimeout-defuser.js\', \'[native code]\', \'8000\')';
    assert.strictEqual(convertScriptletToAdg(blockingRule)[0], expBlockRule);

    // no space between parameters
    blockingRule = 'example.org##+js(aopr,__ad)';
    expBlockRule = 'example.org#%#//scriptlet(\'ubo-aopr.js\', \'__ad\')';
    assert.strictEqual(convertScriptletToAdg(blockingRule)[0], expBlockRule);

    // '$' as parameter
    blockingRule = 'example.org##+js(abort-current-inline-script, $, popup)';
    expBlockRule = 'example.org#%#//scriptlet(\'ubo-abort-current-inline-script.js\', \'$\', \'popup\')';
    assert.strictEqual(convertScriptletToAdg(blockingRule)[0], expBlockRule);

    // '' as set-constant parameter
    blockingRule = 'example.org##+js(set-constant, config.ads.desktopPreroll, \'\')';
    expBlockRule = 'example.org#%#//scriptlet(\'ubo-set-constant.js\', \'config.ads.desktopPreroll\', \'\')';
    assert.strictEqual(convertScriptletToAdg(blockingRule)[0], expBlockRule);

    // multiple selectors for remove-attr/class
    blockingRule = 'ubisoft.com##+js(ra, href, area[href*="discordapp.com/"]\\, area[href*="facebook.com/"]\\, area[href*="instagram.com/"])';
    expBlockRule = 'ubisoft.com#%#//scriptlet(\'ubo-ra.js\', \'href\', \'area[href*="discordapp.com/"], area[href*="facebook.com/"], area[href*="instagram.com/"]\')';
    assert.strictEqual(convertScriptletToAdg(blockingRule)[0], expBlockRule, 'multiple selectors for remove-attr/class - OK');

    // empty selector and specified applying for remove-attr/class
    blockingRule = 'foxracingshox.de##+js(rc, cookie--not-set, , stay)';
    expBlockRule = "foxracingshox.de#%#//scriptlet('ubo-rc.js', 'cookie--not-set', '', 'stay')";
    assert.strictEqual(convertScriptletToAdg(blockingRule)[0], expBlockRule, 'empty selector and specified applying - OK');

    // specified selectors and applying for remove-attr/class
    blockingRule = 'memo-book.pl##+js(rc, .locked, body\\, html, stay)';
    expBlockRule = "memo-book.pl#%#//scriptlet('ubo-rc.js', '.locked', 'body, html', 'stay')";
    assert.strictEqual(convertScriptletToAdg(blockingRule)[0], expBlockRule, 'specified selectors and applying - OK');

    // specified selectors and applying for remove-attr/class - one backslash
    // eslint-disable-next-line no-useless-escape
    blockingRule = 'memo-book.pl##+js(rc, .locked, body\, html, stay)';
    expBlockRule = "memo-book.pl#%#//scriptlet('ubo-rc.js', '.locked', 'body, html', 'stay')";
    assert.strictEqual(convertScriptletToAdg(blockingRule)[0], expBlockRule, 'specified selectors and applying - OK');

    // double quotes in scriptlet parameter
    blockingRule = 'example.com#@#+js(remove-attr.js, href, a[data-st-area="Header-back"])';
    expBlockRule = 'example.com#@%#//scriptlet(\'ubo-remove-attr.js\', \'href\', \'a[data-st-area="Header-back"]\')';
    assert.strictEqual(convertScriptletToAdg(blockingRule)[0], expBlockRule);

    // the same but with single quotes
    blockingRule = 'example.com#@#+js(remove-attr.js, href, a[data-st-area=\'Header-back\'])';
    assert.strictEqual(convertScriptletToAdg(blockingRule)[0], expBlockRule);

    // name without '.js' at the end
    blockingRule = 'example.org##+js(addEventListener-defuser, load, 2000)';
    expBlockRule = 'example.org#%#//scriptlet(\'ubo-addEventListener-defuser.js\', \'load\', \'2000\')';
    assert.strictEqual(convertScriptletToAdg(blockingRule)[0], expBlockRule);

    // short form of name
    blockingRule = 'example.org##+js(nano-stb, timeDown)';
    expBlockRule = 'example.org#%#//scriptlet(\'ubo-nano-stb.js\', \'timeDown\')';
    assert.strictEqual(convertScriptletToAdg(blockingRule)[0], expBlockRule);

    // whitelist rule
    let whitelistRule = 'example.org#@#+js(setTimeout-defuser.js, [native code], 8000)';
    let expectedResult = 'example.org#@%#//scriptlet(\'ubo-setTimeout-defuser.js\', \'[native code]\', \'8000\')';
    assert.strictEqual(convertScriptletToAdg(whitelistRule)[0], expectedResult);

    whitelistRule = 'example.org#@#script:inject(abort-on-property-read.js, some.prop)';
    expectedResult = 'example.org#@%#//scriptlet(\'ubo-abort-on-property-read.js\', \'some.prop\')';
    assert.strictEqual(convertScriptletToAdg(whitelistRule)[0], expectedResult);

    whitelistRule = 'example.org#@#+js(aopw, notDetected)';
    expectedResult = 'example.org#@%#//scriptlet(\'ubo-aopw.js\', \'notDetected\')';
    assert.strictEqual(convertScriptletToAdg(whitelistRule)[0], expectedResult);
});

test('Test SCRIPTLET converting - ABP -> ADG', (assert) => {
    const rule = 'esheeq.co#$#abort-on-property-read atob; abort-on-property-write Fingerprint2; abort-on-property-read decodeURIComponent; abort-on-property-read RegExp';
    const exp = [
        'esheeq.co#%#//scriptlet(\'abp-abort-on-property-read\', \'atob\')',
        'esheeq.co#%#//scriptlet(\'abp-abort-on-property-write\', \'Fingerprint2\')',
        'esheeq.co#%#//scriptlet(\'abp-abort-on-property-read\', \'decodeURIComponent\')',
        'esheeq.co#%#//scriptlet(\'abp-abort-on-property-read\', \'RegExp\')',
    ];
    assert.deepEqual(convertScriptletToAdg(rule), exp);
});

test('Test SCRIPTLET converting - multiple ABP -> ADG', (assert) => {
    const rule = 'example.org#$#hide-if-has-and-matches-style \'d[id^="_"]\' \'div > s\' \'display: none\'; hide-if-contains /.*/ .p \'a[href^="/ad__c?"]\'';
    const exp1 = 'example.org#%#//scriptlet(\'abp-hide-if-has-and-matches-style\', \'d[id^="_"]\', \'div > s\', \'display: none\')';
    const exp2 = 'example.org#%#//scriptlet(\'abp-hide-if-contains\', \'/.*/\', \'.p\', \'a[href^="/ad__c?"]\')';
    const res = convertScriptletToAdg(rule);

    assert.equal(res.length, 2);
    assert.strictEqual(res[0], exp1);
    assert.strictEqual(res[1], exp2);
});

test('Test SCRIPTLET converting - ADG -> UBO', (assert) => {
    let inputAdg;
    let expectedUbo;
    // blocking rule
    inputAdg = 'example.org#%#//scriptlet(\'prevent-setTimeout\', \'[native code]\', \'8000\')';
    expectedUbo = 'example.org##+js(no-setTimeout-if, [native code], 8000)';
    assert.strictEqual(convertAdgScriptletToUbo(inputAdg), expectedUbo);

    // '' as set-constant parameter
    inputAdg = 'example.org#%#//scriptlet(\'set-constant\', \'config.ads.desktopPreroll\', \'\')';
    expectedUbo = 'example.org##+js(set-constant, config.ads.desktopPreroll, \'\')';
    assert.strictEqual(convertAdgScriptletToUbo(inputAdg), expectedUbo);

    // multiple selectors parameter for remove-attr/class
    inputAdg = 'example.org#%#//scriptlet(\'remove-class\', \'promo\', \'a.class, div#id, div > #ad > .test\')';
    expectedUbo = 'example.org##+js(remove-class, promo, a.class\\, div#id\\, div > #ad > .test)';
    assert.strictEqual(convertAdgScriptletToUbo(inputAdg), expectedUbo);

    // scriptlet with no parameters
    inputAdg = 'example.com#%#//scriptlet("prevent-adfly")';
    expectedUbo = 'example.com##+js(adfly-defuser)';
    assert.strictEqual(convertAdgScriptletToUbo(inputAdg), expectedUbo);

    // whitelist rule
    inputAdg = 'example.org#@%#//scriptlet(\'prevent-setTimeout\', \'[native code]\', \'8000\')';
    expectedUbo = 'example.org#@#+js(no-setTimeout-if, [native code], 8000)';
    assert.strictEqual(convertAdgScriptletToUbo(inputAdg), expectedUbo);

    inputAdg = 'example.org#%#//scriptlet("ubo-abort-on-property-read.js", "alert")';
    expectedUbo = 'example.org##+js(abort-on-property-read, alert)';
    assert.strictEqual(convertAdgScriptletToUbo(inputAdg), expectedUbo);

    inputAdg = 'example.com#%#//scriptlet("abp-abort-current-inline-script", "console.log", "Hello")';
    expectedUbo = 'example.com##+js(abort-current-script, console.log, Hello)';
    assert.strictEqual(convertAdgScriptletToUbo(inputAdg), expectedUbo);

    inputAdg = 'example.com#%#//scriptlet(\'prevent-fetch\', \'*\')';
    expectedUbo = 'example.com##+js(no-fetch-if, /^/)';
    assert.strictEqual(convertAdgScriptletToUbo(inputAdg), expectedUbo);

    inputAdg = 'example.com#%#//scriptlet(\'close-window\')';
    expectedUbo = 'example.com##+js(window-close-if)';
    assert.strictEqual(convertAdgScriptletToUbo(inputAdg), expectedUbo);
});

test('Test $redirect validation', (assert) => {
    // checks if the rule is valid AdGuard redirect by checking it's name
    let inputRule = '||example.org$xmlhttprequest,redirect=noopvast-2.0';
    assert.strictEqual(validator.isValidAdgRedirectRule(inputRule), true);

    // check if 'empty' redirect is valid
    inputRule = '||example.com/log$redirect=empty';
    assert.strictEqual(validator.isValidAdgRedirectRule(inputRule), true);

    // obsolete googletagmanager-gtm should be true as it is an alias for google-analytics
    inputRule = '||example.org/script.js$script,redirect=googletagmanager-gtm';
    assert.strictEqual(validator.isAdgRedirectRule(inputRule), true);
    assert.strictEqual(validator.isValidAdgRedirectRule(inputRule), true);

    // old alias for adsbygoogle redirect should be valid
    inputRule = '||example.org^$script,redirect=googlesyndication.com/adsbygoogle.js';
    assert.strictEqual(validator.isAdgRedirectRule(inputRule), true, '$redirect isAdgRedirectRule googlesyndication.com/adsbygoogle.js');

    // redirect name is wrong, but this one only for checking ADG redirect marker "redirect="
    inputRule = '||example.com/banner$image,redirect=redirect.png';
    assert.strictEqual(validator.isAdgRedirectRule(inputRule), true);

    // js-rule with 'redirect=' in it should not be considered as redirect rule
    inputRule = 'intermarche.pl#%#document.cookie = "interapp_redirect=false; path=/;";';
    assert.strictEqual(validator.isAdgRedirectRule(inputRule), false);

    // rules with 'redirect=' marker in base rule part should be skipped
    inputRule = '_redirect=*://look.$popup';
    assert.strictEqual(validator.isAdgRedirectRule(inputRule), false, 'isAdgRedirectRule for base rule _redirect=');

    // rule with click2load redirect should be considered as valid redirect rule
    inputRule = '||youtube.com/embed/$redirect=click2load.html,domain=example.org';
    assert.strictEqual(validator.isAdgRedirectRule(inputRule), true);
    assert.strictEqual(validator.isValidAdgRedirectRule(inputRule), true);

    // rule with 'redirect-rule=' marker should be considered as redirect rules
    inputRule = '/blockadblock.$script,redirect=nobab.js';
    assert.strictEqual(validator.isAdgRedirectRule(inputRule), true);
    // but it's ubo redirect name so it's not valid adg redirect
    assert.strictEqual(validator.isValidAdgRedirectRule(inputRule), false);

    // check is adg redirect valid for conversion to ubo
    inputRule = '||example.orf^$media,redirect=noopmp4-1s,third-party';
    assert.strictEqual(validator.isAdgRedirectCompatibleWithUbo(inputRule), true);
    // check 'empty' redirect
    inputRule = '||example.com/log$redirect=empty';
    assert.strictEqual(validator.isAdgRedirectCompatibleWithUbo(inputRule), true);
    // check 'prevent-bab' redirect
    inputRule = '||example.com^$redirect=prevent-bab';
    assert.strictEqual(validator.isAdgRedirectCompatibleWithUbo(inputRule), true);
    // invalid redirect name
    inputRule = '||example.orf^$media,redirect=no-mp4';
    assert.strictEqual(validator.isAdgRedirectCompatibleWithUbo(inputRule), false);
    // no ubo analog for redirect
    inputRule = '||example.com/ad/vmap/*$xmlhttprequest,redirect=noopvmap-1.0';
    assert.strictEqual(validator.isAdgRedirectCompatibleWithUbo(inputRule), true, '$redirect isAdgRedirectCompatibleWithUbo noopvmap-1.0');
    // rules with 'redirect=' marker in base rule part should be skipped
    inputRule = '_redirect=*://look.$popup';
    assert.strictEqual(validator.isAdgRedirectCompatibleWithUbo(inputRule), false);
    // js-rule with 'redirect=' in it should not be considered as redirect rule
    inputRule = 'intermarche.pl#%#document.cookie = "interapp_redirect=false; path=/;";';
    assert.strictEqual(validator.isAdgRedirectCompatibleWithUbo(inputRule), false);

    // check is ubo redirect valid for conversion
    inputRule = '||example.orf^$media,redirect=noop-1s.mp4,third-party';
    assert.strictEqual(validator.isUboRedirectCompatibleWithAdg(inputRule), true);
    // check nobab.js
    inputRule = '||example.org^$redirect=nobab.js,third-party';
    assert.strictEqual(validator.isUboRedirectCompatibleWithAdg(inputRule), true);
    // invalid redirect name
    inputRule = '||example.orf^$media,redirect=no-mp4';
    assert.strictEqual(validator.isUboRedirectCompatibleWithAdg(inputRule), false);

    // check is abp redirect valid for conversion
    inputRule = '||example.com^$script,rewrite=abp-resource:blank-js';
    assert.strictEqual(validator.isAbpRedirectCompatibleWithAdg(inputRule), true);
    // invalid redirect name
    inputRule = '||example.com^$script,rewrite=abp-resource:noop-js';
    assert.strictEqual(validator.isAbpRedirectCompatibleWithAdg(inputRule), false);

    // do not confuse with other script rules
    inputRule = 'intermarche.pl#%#document.cookie = "interapp_redirect=false; path=/;";';
    assert.strictEqual(validator.isAbpRedirectCompatibleWithAdg(inputRule), false);

    // do not confuse with other script rules
    inputRule = 'intermarche.pl#%#document.cookie = "interapp_redirect=false; path=/;";';
    assert.strictEqual(validator.isUboRedirectCompatibleWithAdg(inputRule), false);

    inputRule = '&pub_redirect=';
    assert.strictEqual(validator.isUboRedirectCompatibleWithAdg(inputRule), false);

    inputRule = '@@||popsci.com/gdpr.html?redirect=';
    assert.strictEqual(validator.isUboRedirectCompatibleWithAdg(inputRule), false);
});

test('Test Adguard $redirect', (assert) => {
    const rule = '||example.com/banner$image,redirect=32x32-transparent.png';
    const exp = '||example.com/banner$image,redirect=32x32-transparent.png';
    const res = convertRedirectToAdg(rule);
    assert.strictEqual(res, exp);
});

test('Test Adguard $redirect-rule', (assert) => {
    const rule = '||example.com/banner$image,redirect-rule=32x32-transparent.png';
    const exp = '||example.com/banner$image,redirect-rule=32x32-transparent.png';
    const res = convertRedirectToAdg(rule);
    assert.strictEqual(res, exp);
});

test('Test REDIRECT converting - UBO -> ADG', (assert) => {
    let uboRule = '||example.com/banner$image,redirect=32x32.png';
    let expectedAdgRule = '||example.com/banner$image,redirect=32x32-transparent.png';
    assert.strictEqual(convertRedirectToAdg(uboRule), expectedAdgRule);

    uboRule = '||example.orf^$media,redirect=noop-1s.mp4,third-party';
    expectedAdgRule = '||example.orf^$media,redirect=noopmp4-1s,third-party';
    assert.strictEqual(convertRedirectToAdg(uboRule), expectedAdgRule);

    // old ubo adsbygoogle alias works
    uboRule = '||googlesyndication.com^$script,redirect=googlesyndication.com/adsbygoogle.js,domain=darmowa-tv.ws';
    expectedAdgRule = '||googlesyndication.com^$script,redirect=googlesyndication-adsbygoogle,domain=darmowa-tv.ws';
    assert.strictEqual(convertRedirectToAdg(uboRule), expectedAdgRule);

    // newer alias works as well
    uboRule = '||googlesyndication.com^$script,redirect=googlesyndication_adsbygoogle.js,domain=darmowa-tv.ws';
    expectedAdgRule = '||googlesyndication.com^$script,redirect=googlesyndication-adsbygoogle,domain=darmowa-tv.ws';
    assert.strictEqual(convertRedirectToAdg(uboRule), expectedAdgRule);
});

test('Test REDIRECT-RULE converting - UBO -> ADG', (assert) => {
    let uboRule = '||example.com/banner$image,redirect-rule=32x32.png';
    let expectedAdgRule = '||example.com/banner$image,redirect-rule=32x32-transparent.png';
    assert.strictEqual(convertRedirectToAdg(uboRule), expectedAdgRule);

    uboRule = '||example.orf^$media,redirect-rule=noop-1s.mp4,third-party';
    expectedAdgRule = '||example.orf^$media,redirect-rule=noopmp4-1s,third-party';
    assert.strictEqual(convertRedirectToAdg(uboRule), expectedAdgRule);

    // old ubo adsbygoogle alias works
    uboRule = '||googlesyndication.com^$script,redirect-rule=googlesyndication.com/adsbygoogle.js,domain=darmowa-tv.ws';
    expectedAdgRule = '||googlesyndication.com^$script,redirect-rule=googlesyndication-adsbygoogle,domain=darmowa-tv.ws';
    assert.strictEqual(convertRedirectToAdg(uboRule), expectedAdgRule);

    // newer alias works as well
    uboRule = '||googlesyndication.com^$script,redirect-rule=googlesyndication_adsbygoogle.js,domain=darmowa-tv.ws';
    expectedAdgRule = '||googlesyndication.com^$script,redirect-rule=googlesyndication-adsbygoogle,domain=darmowa-tv.ws';
    assert.strictEqual(convertRedirectToAdg(uboRule), expectedAdgRule);
});

test('Test REDIRECT converting - ABP -> ADG', (assert) => {
    let abpRule = '||example.com^$script,rewrite=abp-resource:blank-js';
    let expectedAdgRule = '||example.com^$script,redirect=noopjs';
    assert.strictEqual(convertRedirectToAdg(abpRule), expectedAdgRule);

    abpRule = '||*/ad/$rewrite=abp-resource:blank-mp3,domain=example.org';
    expectedAdgRule = '||*/ad/$redirect=noopmp3-0.1s,domain=example.org';
    assert.strictEqual(convertRedirectToAdg(abpRule), expectedAdgRule);
});

test('Test $redirect validation for ADG -> UBO converting', (assert) => {
    let adgRule = '||example.com^$xmlhttprequest,redirect=nooptext';
    assert.strictEqual(validator.hasValidContentType(adgRule), true);

    adgRule = ' ||example.orf^$media,redirect=noopmp4-1s,third-party';
    assert.strictEqual(validator.hasValidContentType(adgRule), true);

    adgRule = '||example.com/images/*.png$image,important,redirect=1x1-transparent.gif,domain=example.com|example.org';
    assert.strictEqual(validator.hasValidContentType(adgRule), true);

    // abp rule ->> error because only ADG rules accepted
    assert.throws(() => {
        adgRule = '||example.com^$script,rewrite=abp-resource:blank-js';
        convertAdgRedirectToUbo(adgRule);
    }, 'unable to convert -- no such ubo redirect');

    // no source type
    adgRule = '||example.com^$important,redirect=nooptext';
    assert.strictEqual(validator.hasValidContentType(adgRule), false);

    // no source type for 'empty' is allowed
    adgRule = ' ||example.org^$redirect=empty,third-party';
    assert.strictEqual(validator.hasValidContentType(adgRule), true);

    // all source types for 'empty' are allowed
    adgRule = ' ||example.org^$script,redirect=empty,third-party';
    assert.strictEqual(validator.hasValidContentType(adgRule), true);
    // and 'media' too
    adgRule = ' ||example.org^$stylesheet,media,redirect=empty,third-party';
    assert.strictEqual(validator.hasValidContentType(adgRule), true);
});

test('Test $redirect-rule validation for ADG -> UBO converting', (assert) => {
    let adgRule = '||example.com^$xmlhttprequest,redirect-rule=nooptext';
    assert.strictEqual(validator.hasValidContentType(adgRule), true);

    adgRule = ' ||example.orf^$media,redirect-rule=noopmp4-1s,third-party';
    assert.strictEqual(validator.hasValidContentType(adgRule), true);

    adgRule = '||example.com/images/*.png$image,important,redirect-rule=1x1-transparent.gif,domain=example.com|example.org';
    assert.strictEqual(validator.hasValidContentType(adgRule), true);

    // no source type
    adgRule = '||example.com^$important,redirect-rule=nooptext';
    assert.strictEqual(validator.hasValidContentType(adgRule), false, '$redirect-rule hasValidContentType nooptext');

    // no source type for 'empty' is allowed
    adgRule = ' ||example.org^$redirect-rule=empty,third-party';
    assert.strictEqual(validator.hasValidContentType(adgRule), true);

    // all source types for 'empty' are allowed
    adgRule = ' ||example.org^$script,redirect-rule=empty,third-party';
    assert.strictEqual(validator.hasValidContentType(adgRule), true);
    // and 'media' too
    adgRule = ' ||example.org^$stylesheet,media,redirect-rule=empty,third-party';
    assert.strictEqual(validator.hasValidContentType(adgRule), true);
});

test('Test REDIRECT converting - ADG -> UBO', (assert) => {
    let adgRule;
    let expectedUboRule;

    adgRule = '||example.com^$xmlhttprequest,redirect=nooptext';
    expectedUboRule = '||example.com^$xmlhttprequest,redirect=noop.txt';
    assert.strictEqual(convertAdgRedirectToUbo(adgRule), expectedUboRule);

    // image type is supported by nooptext too
    adgRule = '||example.com^$image,redirect=nooptext';
    expectedUboRule = '||example.com^$image,redirect=noop.txt';
    assert.strictEqual(convertAdgRedirectToUbo(adgRule), expectedUboRule);

    adgRule = '||example.com/images/*.png$image,important,redirect=1x1-transparent.gif,domain=example.com|example.org';
    expectedUboRule = '||example.com/images/*.png$image,important,redirect=1x1.gif,domain=example.com|example.org';
    assert.strictEqual(convertAdgRedirectToUbo(adgRule), expectedUboRule);

    adgRule = '||example.com/vast/$important,redirect=empty,~thirt-party';
    expectedUboRule = '||example.com/vast/$important,redirect=empty,~thirt-party';
    assert.strictEqual(convertAdgRedirectToUbo(adgRule), expectedUboRule);

    assert.throws(() => {
        adgRule = '||example.com/ad/vmap/*$xmlhttprequest,redirect=noopvast-2.0';
        convertAdgRedirectToUbo(adgRule);
    }, 'unable to convert -- no such ubo redirect');

    // add source type modifiers while convertion if there is no one of them
    adgRule = '||example.com/images/*.png$redirect=1x1-transparent.gif,domain=example.com|example.org,important';
    expectedUboRule = '||example.com/images/*.png$redirect=1x1.gif,domain=example.com|example.org,important,image';
    assert.strictEqual(convertAdgRedirectToUbo(adgRule), expectedUboRule);

    adgRule = '||example.com/*.mp4$important,redirect=noopmp4-1s,~thirt-party';
    expectedUboRule = '||example.com/*.mp4$important,redirect=noop-1s.mp4,~thirt-party,media';
    assert.strictEqual(convertAdgRedirectToUbo(adgRule), expectedUboRule);

    adgRule = '||ad.example.com^$redirect=nooptext,important';
    expectedUboRule = '||ad.example.com^$redirect=noop.txt,important,image,media,subdocument,stylesheet,script,xmlhttprequest,other';
    assert.strictEqual(convertAdgRedirectToUbo(adgRule), expectedUboRule);

    assert.throws(
        () => {
            adgRule = '||example.com/ad/vmap/*$redirect=scorecardresearch-beacon';
            convertAdgRedirectToUbo(adgRule);
        },
        new RegExp('Unable to convert for uBO'), // specific error matcher
        'no TYPES to specify, ABSENT_SOURCE_TYPE_REPLACEMENT should be updated',
    );
});

test('Test REDIRECT-RULE converting - ADG -> UBO', (assert) => {
    let adgRule;
    let expectedUboRule;

    adgRule = '||example.com^$xmlhttprequest,redirect-rule=nooptext';
    expectedUboRule = '||example.com^$xmlhttprequest,redirect-rule=noop.txt';
    assert.strictEqual(convertAdgRedirectToUbo(adgRule), expectedUboRule);

    // image type is supported by nooptext too
    adgRule = '||example.com^$image,redirect-rule=nooptext';
    expectedUboRule = '||example.com^$image,redirect-rule=noop.txt';
    assert.strictEqual(convertAdgRedirectToUbo(adgRule), expectedUboRule);

    adgRule = '||example.com/images/*.png$image,important,redirect-rule=1x1-transparent.gif,domain=example.com|example.org';
    expectedUboRule = '||example.com/images/*.png$image,important,redirect-rule=1x1.gif,domain=example.com|example.org';
    assert.strictEqual(convertAdgRedirectToUbo(adgRule), expectedUboRule);

    adgRule = '||example.com/vast/$important,redirect-rule=empty,~thirt-party';
    expectedUboRule = '||example.com/vast/$important,redirect-rule=empty,~thirt-party';
    assert.strictEqual(convertAdgRedirectToUbo(adgRule), expectedUboRule);

    assert.throws(() => {
        adgRule = '||example.com/ad/vmap/*$xmlhttprequest,redirect-rule=noopvast-2.0';
        convertAdgRedirectToUbo(adgRule);
    }, 'unable to convert -- no such ubo redirect');

    // add source type modifiers while conversion if there is no one of them
    adgRule = '||example.com/images/*.png$redirect-rule=1x1-transparent.gif,domain=example.com|example.org,important';
    expectedUboRule = '||example.com/images/*.png$redirect-rule=1x1.gif,domain=example.com|example.org,important,image';
    assert.strictEqual(convertAdgRedirectToUbo(adgRule), expectedUboRule);

    adgRule = '||example.com/*.mp4$important,redirect-rule=noopmp4-1s,~thirt-party';
    expectedUboRule = '||example.com/*.mp4$important,redirect-rule=noop-1s.mp4,~thirt-party,media';
    assert.strictEqual(convertAdgRedirectToUbo(adgRule), expectedUboRule);

    adgRule = '||ad.example.com^$redirect-rule=nooptext,important';
    expectedUboRule = '||ad.example.com^$redirect-rule=noop.txt,important,image,media,subdocument,stylesheet,script,xmlhttprequest,other';
    assert.strictEqual(convertAdgRedirectToUbo(adgRule), expectedUboRule);

    assert.throws(
        () => {
            adgRule = '||example.com/ad/vmap/*$redirect-rule=scorecardresearch-beacon';
            convertAdgRedirectToUbo(adgRule);
        },
        new RegExp('Unable to convert for uBO'), // specific error matcher
        'no TYPES to specify, ABSENT_SOURCE_TYPE_REPLACEMENT should be updated',
    );
});

test('Test $redirect-rule validation', (assert) => {
    // checks if the rule is valid AdGuard redirect by checking it's name
    let inputRule = '||example.org$xmlhttprequest,redirect-rule=noopvast-2.0';
    assert.strictEqual(validator.isValidAdgRedirectRule(inputRule), true, '$redirect-rule isValidAdgRedirectRule noopvast-2.0');

    // obsolete googletagmanager-gtm should be true as it is an alias for google-analytics
    inputRule = '||example.org/script.js$script,redirect-rule=googletagmanager-gtm';
    assert.strictEqual(validator.isAdgRedirectRule(inputRule), true, '$redirect-rule isAdgRedirectRule googletagmanager-gtm');
    assert.strictEqual(validator.isValidAdgRedirectRule(inputRule), true, '$redirect-rule isValidAdgRedirectRule googletagmanager-gtm');

    // old alias for adsbygoogle redirect should be valid
    inputRule = '||example.org^$script,redirect-rule=googlesyndication.com/adsbygoogle.js';
    assert.strictEqual(validator.isAdgRedirectRule(inputRule), true, '$redirect-rule isAdgRedirectRule googlesyndication.com/adsbygoogle.js');

    // redirect name is wrong, but this one only for checking ADG redirect marker "redirect="
    inputRule = '||example.com/banner$image,redirect-rule=redirect.png';
    assert.strictEqual(validator.isAdgRedirectRule(inputRule), true);

    // js-rule with 'redirect=' in it should not be considered as redirect rule
    inputRule = 'intermarche.pl#%#document.cookie = "interapp_redirect-rule=false; path=/;";';
    assert.strictEqual(validator.isAdgRedirectRule(inputRule), false);

    // rules with 'redirect=' marker in base rule part should be skipped
    inputRule = '_redirect-rule=*://look.$popup';
    assert.strictEqual(validator.isAdgRedirectRule(inputRule), false, 'isAdgRedirectRule for base rule _redirect-rule');

    // rule with 'redirect-rule=' marker should be considered as redirect rules
    inputRule = '/blockadblock.$script,redirect-rule=nobab.js';
    assert.strictEqual(validator.isAdgRedirectRule(inputRule), true);
    // but it's ubo redirect name so it's not valid adg redirect
    assert.strictEqual(validator.isValidAdgRedirectRule(inputRule), false);

    // check is adg redirect valid for conversion to ubo
    inputRule = '||example.orf^$media,redirect-rule=noopmp4-1s,third-party';
    assert.strictEqual(validator.isAdgRedirectCompatibleWithUbo(inputRule), true, '$redirect-rule isAdgRedirectCompatibleWithUbo noopmp4-1s');
    // check 'prevent-bab' redirect
    inputRule = '||example.com^$redirect-rule=prevent-bab';
    assert.strictEqual(validator.isAdgRedirectCompatibleWithUbo(inputRule), true, '$redirect-rule isAdgRedirectCompatibleWithUbo prevent-bab');
    // invalid redirect name
    inputRule = '||example.orf^$media,redirect-rule=no-mp4';
    assert.strictEqual(validator.isAdgRedirectCompatibleWithUbo(inputRule), false, '$redirect-rule isAdgRedirectCompatibleWithUbo no-mp4');
    // no ubo analog for redirect
    inputRule = '||example.com/ad/vmap/*$xmlhttprequest,redirect-rule=noopvmap-1.0';
    assert.strictEqual(validator.isAdgRedirectCompatibleWithUbo(inputRule), true, '$redirect-rule isAdgRedirectCompatibleWithUbo noopvmap-1.0');
    // rules with 'redirect=' marker in base rule part should be skipped
    inputRule = '_redirect-rule=*://look.$popup';
    assert.strictEqual(validator.isAdgRedirectCompatibleWithUbo(inputRule), false);
    // js-rule with 'redirect=' in it should not be considered as redirect rule
    inputRule = 'intermarche.pl#%#document.cookie = "interapp_redirect-rule=false; path=/;";';
    assert.strictEqual(validator.isAdgRedirectCompatibleWithUbo(inputRule), false);

    // check is ubo redirect valid for conversion
    inputRule = '||example.orf^$media,redirect-rule=noop-1s.mp4,third-party';
    assert.strictEqual(validator.isUboRedirectCompatibleWithAdg(inputRule), true, '$redirect-rule isUboRedirectCompatibleWithAdg noop-1s.mp4');
    // check nobab.js
    inputRule = '||example.org^$redirect-rule=nobab.js,third-party';
    assert.strictEqual(validator.isUboRedirectCompatibleWithAdg(inputRule), true, '$redirect-rule isUboRedirectCompatibleWithAdg nobab.js');
    // 1x1.gif
    inputRule = '*$image,redirect-rule=1x1.gif,domain=play.cadenaser.com';
    assert.strictEqual(validator.isUboRedirectCompatibleWithAdg(inputRule), true, '$redirect-rule isUboRedirectCompatibleWithAdg 1x1.gif');

    // invalid redirect name
    inputRule = '||example.orf^$media,redirect-rule=no-mp4';
    assert.strictEqual(validator.isUboRedirectCompatibleWithAdg(inputRule), false);

    // do not confuse with other rules
    inputRule = '&pub_redirect-rule=';
    assert.strictEqual(validator.isUboRedirectCompatibleWithAdg(inputRule), false);

    inputRule = '@@||popsci.com/gdpr.html?redirect-rule=';
    assert.strictEqual(validator.isUboRedirectCompatibleWithAdg(inputRule), false);
});
