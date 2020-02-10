/* global QUnit */

import {
    convertScriptletToAdg,
    convertAdgScriptletToUbo,
    convertRedirectToAdg,
    convertAdgRedirectToUbo,
} from '../../src/helpers/converter';

const { test, module } = QUnit;
const name = 'debug-current-inline-script';

module(name);


/* eslint-disable max-len */
test('Test comment', (assert) => {
    let comment = "! example.org#%#//scriptlet('abort-on-property-read', 'I10C')";
    let expComment = "! example.org#%#//scriptlet('abort-on-property-read', 'I10C')";
    assert.equal(convertScriptletToAdg(comment), expComment);

    comment = '! ||example.com^$xmlhttprequest,redirect=nooptext';
    expComment = '! ||example.com^$xmlhttprequest,redirect=nooptext';
    assert.equal(convertScriptletToAdg(comment), expComment);
});

test('Test Adguard scriptlet rule', (assert) => {
    const rule = "example.org#%#//scriptlet('abort-on-property-read', 'I10C')";
    const exp = "example.org#%#//scriptlet('abort-on-property-read', 'I10C')";
    const res = convertScriptletToAdg(rule);
    assert.equal(res, exp);
});

test('Test Adguard scriptlet rule exception', (assert) => {
    const rule = "example.org#@%#//scriptlet('abort-on-property-read', 'I10C')";
    const exp = "example.org#@%#//scriptlet('abort-on-property-read', 'I10C')";
    const res = convertScriptletToAdg(rule);
    assert.equal(res, exp);
});

test('Test SCRIPTLET converting - UBO -> ADG', (assert) => {
    // blocking rule
    const rule = 'example.org##+js(setTimeout-defuser.js, [native code], 8000)';
    const exp = 'example.org#%#//scriptlet("ubo-setTimeout-defuser.js", "[native code]", "8000")';
    const res = convertScriptletToAdg(rule);
    assert.equal(res, exp);
    // whitelist rule
    let whitelistRule = 'example.org#@#+js(setTimeout-defuser.js, [native code], 8000)';
    let expectedResult = 'example.org#@%#//scriptlet("ubo-setTimeout-defuser.js", "[native code]", "8000")';
    assert.equal(convertScriptletToAdg(whitelistRule), expectedResult);

    whitelistRule = 'example.org#@#script:inject(abort-on-property-read.js, some.prop)';
    expectedResult = 'example.org#@%#//scriptlet("ubo-abort-on-property-read.js", "some.prop")';
    assert.equal(convertScriptletToAdg(whitelistRule), expectedResult);
});

test('Test SCRIPTLET converting - ABP -> ADG', (assert) => {
    const rule = "example.org#$#hide-if-contains li.serp-item 'li.serp-item div.label'";
    const exp = 'example.org#%#//scriptlet("abp-hide-if-contains", "li.serp-item", "li.serp-item div.label")';
    const res = convertScriptletToAdg(rule);
    assert.equal(res, exp);
});

test('Test SCRIPTLET converting - multiple ABP -> ADG', (assert) => {
    const rule = 'example.org#$#hide-if-has-and-matches-style \'d[id^="_"]\' \'div > s\' \'display: none\'; hide-if-contains /.*/ .p \'a[href^="/ad__c?"]\'';
    const exp1 = 'example.org#%#//scriptlet("abp-hide-if-has-and-matches-style", "d[id^=\\"_\\"]", "div > s", "display: none")';
    const exp2 = 'example.org#%#//scriptlet("abp-hide-if-contains", "/.*/", ".p", "a[href^=\\"/ad__c?\\"]")';
    const res = convertScriptletToAdg(rule);

    assert.equal(res.length, 2);
    assert.equal(res[0], exp1);
    assert.equal(res[1], exp2);
});

test('Test SCRIPTLET converting - ADG -> UBO', (assert) => {
    // blocking rule
    const rule = 'example.org#%#//scriptlet("prevent-setTimeout", "[native code]", "8000")';
    const exp = 'example.org##+js(setTimeout-defuser.js, [native code], 8000)';
    const res = convertAdgScriptletToUbo(rule);
    assert.equal(res, exp);
    // scriptlet with no parameters
    const inputAdgRule = 'example.com#%#//scriptlet("prevent-adfly")';
    const expectedUboResult = 'example.com##+js(adfly-defuser.js)';
    assert.equal(convertAdgScriptletToUbo(inputAdgRule), expectedUboResult);
    // whitelist rule
    const whitelistRule = 'example.org#@%#//scriptlet("prevent-setTimeout", "[native code]", "8000")';
    const expectedResult = 'example.org#@#+js(setTimeout-defuser.js, [native code], 8000)';
    assert.equal(convertAdgScriptletToUbo(whitelistRule), expectedResult);

    let actual = convertAdgScriptletToUbo('example.org#%#//scriptlet("ubo-abort-on-property-read.js", "alert")');
    let expected = 'example.org##+js(abort-on-property-read.js, alert)';
    assert.equal(actual, expected);

    actual = convertAdgScriptletToUbo('example.com#%#//scriptlet("abp-abort-current-inline-script", "console.log", "Hello")');
    expected = 'example.com##+js(abort-current-inline-script.js, console.log, Hello)';
    assert.equal(actual, expected);
});

test('Test Adguard redirect resource rule', (assert) => {
    const rule = '||example.com/banner$image,redirect=32x32-transparent.png';
    const exp = '||example.com/banner$image,redirect=32x32-transparent.png';
    const res = convertRedirectToAdg(rule);
    assert.equal(res, exp);
});

test('Test REDIRECT converting - UBO -> ADG', (assert) => {
    let uboRule = '||example.com/banner$image,redirect=32x32.png';
    let expectedAdgRule = '||example.com/banner$image,redirect=32x32-transparent.png';
    assert.equal(convertRedirectToAdg(uboRule), expectedAdgRule);

    uboRule = '||example.orf^$media,redirect=noop-1s.mp4,third-party';
    expectedAdgRule = '||example.orf^$media,redirect=noopmp4-1s,third-party';
    assert.equal(convertRedirectToAdg(uboRule), expectedAdgRule);
});

test('Test REDIRECT converting - ABP -> ADG', (assert) => {
    let abpRule = '||example.com^$script,rewrite=abp-resource:blank-js';
    let expectedAdgRule = '||example.com^$script,redirect=noopjs';
    assert.equal(convertRedirectToAdg(abpRule), expectedAdgRule);

    abpRule = '||*/ad/$rewrite=abp-resource:blank-mp3,domain=example.org';
    expectedAdgRule = '||*/ad/$redirect=noopmp3.0.1s,domain=example.org';
    assert.equal(convertRedirectToAdg(abpRule), expectedAdgRule);
});


test('Test REDIRECT converting - ADG -> UBO', (assert) => {
    let adgRule = '||example.com^$xmlhttprequest,redirect=nooptext';
    let expectedUboRule = '||example.com^$xmlhttprequest,redirect=noop.txt';
    assert.equal(convertAdgRedirectToUbo(adgRule), expectedUboRule);

    adgRule = '||example.com/images/*.png$image,important,redirect=1x1-transparent.gif,domain=example.com|example.org';
    expectedUboRule = '||example.com/images/*.png$image,important,redirect=1x1.gif,domain=example.com|example.org';
    assert.equal(convertAdgRedirectToUbo(adgRule), expectedUboRule);
});
/* eslint-enable max-len */
