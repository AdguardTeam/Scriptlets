/* global QUnit */

import {
    convertScriptletToAdg,
    convertAdgScriptletToUbo,
    convertRedirectToAdg,
    convertAdgRedirectToUbo,
    isValidScriptletRule,
} from '../../src/helpers/converter';

import { isValidRedirectRule } from '../../src/helpers/validator';

const { test, module } = QUnit;
const name = 'debug-current-inline-script';

module(name);


/* eslint-disable max-len */

test('Test scriptlet rule validation', (assert) => {
    let inputRule = "example.org#%#//scriptlet('abort-on-property-read', 'I10C')";
    assert.strictEqual(isValidScriptletRule(inputRule), true);

    inputRule = 'example.org##+js(setTimeout-defuser.js, [native code], 8000)';
    assert.strictEqual(isValidScriptletRule(inputRule), true);

    inputRule = 'example.org#@%#//scriptlet("ubo-aopw.js", "notDetected")';
    assert.strictEqual(isValidScriptletRule(inputRule), true);

    // invalid scriptlet name
    inputRule = 'example.org#@%#//scriptlet("ubo-abort-scriptlet.js", "notDetected")';
    assert.strictEqual(isValidScriptletRule(inputRule), false);

    inputRule = 'example.org#$#hide-if-has-and-matches-style \'d[id^="_"]\' \'div > s\' \'display: none\'; hide-if-contains /.*/ .p \'a[href^="/ad__c?"]\'';
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
    // blocking rule
    let blockingRule = 'example.org##+js(setTimeout-defuser.js, [native code], 8000)';
    let expBlockRule = 'example.org#%#//scriptlet("ubo-setTimeout-defuser.js", "[native code]", "8000")';
    assert.strictEqual(convertScriptletToAdg(blockingRule)[0], expBlockRule);
    // name without '.js' at the end
    blockingRule = 'example.org##+js(addEventListener-defuser, load, 2000)';
    expBlockRule = 'example.org#%#//scriptlet("ubo-addEventListener-defuser.js", "load", "2000")';
    assert.strictEqual(convertScriptletToAdg(blockingRule)[0], expBlockRule);
    // short form of name
    blockingRule = 'example.org##+js(nano-stb, timeDown)';
    expBlockRule = 'example.org#%#//scriptlet("ubo-nano-stb.js", "timeDown")';
    assert.strictEqual(convertScriptletToAdg(blockingRule)[0], expBlockRule);

    // whitelist rule
    let whitelistRule = 'example.org#@#+js(setTimeout-defuser.js, [native code], 8000)';
    let expectedResult = 'example.org#@%#//scriptlet("ubo-setTimeout-defuser.js", "[native code]", "8000")';
    assert.strictEqual(convertScriptletToAdg(whitelistRule)[0], expectedResult);

    whitelistRule = 'example.org#@#script:inject(abort-on-property-read.js, some.prop)';
    expectedResult = 'example.org#@%#//scriptlet("ubo-abort-on-property-read.js", "some.prop")';
    assert.strictEqual(convertScriptletToAdg(whitelistRule)[0], expectedResult);

    whitelistRule = 'example.org#@#+js(aopw, notDetected)';
    expectedResult = 'example.org#@%#//scriptlet("ubo-aopw.js", "notDetected")';
    assert.strictEqual(convertScriptletToAdg(whitelistRule)[0], expectedResult);
});

test('Test SCRIPTLET converting - ABP -> ADG', (assert) => {
    const rule = "example.org#$#hide-if-contains li.serp-item 'li.serp-item div.label'";
    const exp = 'example.org#%#//scriptlet("abp-hide-if-contains", "li.serp-item", "li.serp-item div.label")';
    assert.strictEqual(convertScriptletToAdg(rule)[0], exp);
});

test('Test SCRIPTLET converting - multiple ABP -> ADG', (assert) => {
    const rule = 'example.org#$#hide-if-has-and-matches-style \'d[id^="_"]\' \'div > s\' \'display: none\'; hide-if-contains /.*/ .p \'a[href^="/ad__c?"]\'';
    const exp1 = 'example.org#%#//scriptlet("abp-hide-if-has-and-matches-style", "d[id^=\\"_\\"]", "div > s", "display: none")';
    const exp2 = 'example.org#%#//scriptlet("abp-hide-if-contains", "/.*/", ".p", "a[href^=\\"/ad__c?\\"]")';
    const res = convertScriptletToAdg(rule);

    assert.equal(res.length, 2);
    assert.strictEqual(res[0], exp1);
    assert.strictEqual(res[1], exp2);
});

test('Test SCRIPTLET converting - ADG -> UBO', (assert) => {
    // blocking rule
    const rule = 'example.org#%#//scriptlet("prevent-setTimeout", "[native code]", "8000")';
    const exp = 'example.org##+js(setTimeout-defuser, [native code], 8000)';
    assert.strictEqual(convertAdgScriptletToUbo(rule), exp);
    // scriptlet with no parameters
    const inputAdgRule = 'example.com#%#//scriptlet("prevent-adfly")';
    const expectedUboResult = 'example.com##+js(adfly-defuser)';
    assert.strictEqual(convertAdgScriptletToUbo(inputAdgRule), expectedUboResult);
    // whitelist rule
    const whitelistRule = 'example.org#@%#//scriptlet("prevent-setTimeout", "[native code]", "8000")';
    const expectedResult = 'example.org#@#+js(setTimeout-defuser, [native code], 8000)';
    assert.strictEqual(convertAdgScriptletToUbo(whitelistRule), expectedResult);

    let actual = convertAdgScriptletToUbo('example.org#%#//scriptlet("ubo-abort-on-property-read.js", "alert")');
    let expected = 'example.org##+js(abort-on-property-read, alert)';
    assert.strictEqual(actual, expected);

    actual = convertAdgScriptletToUbo('example.com#%#//scriptlet("abp-abort-current-inline-script", "console.log", "Hello")');
    expected = 'example.com##+js(abort-current-inline-script, console.log, Hello)';
    assert.strictEqual(actual, expected);
});

test('Test Adguard redirect resource rule', (assert) => {
    const rule = '||example.com/banner$image,redirect=32x32-transparent.png';
    const exp = '||example.com/banner$image,redirect=32x32-transparent.png';
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
});

test('Test REDIRECT converting - ABP -> ADG', (assert) => {
    let abpRule = '||example.com^$script,rewrite=abp-resource:blank-js';
    let expectedAdgRule = '||example.com^$script,redirect=noopjs';
    assert.strictEqual(convertRedirectToAdg(abpRule), expectedAdgRule);

    abpRule = '||*/ad/$rewrite=abp-resource:blank-mp3,domain=example.org';
    expectedAdgRule = '||*/ad/$redirect=noopmp3.0.1s,domain=example.org';
    assert.strictEqual(convertRedirectToAdg(abpRule), expectedAdgRule);
});

test('Test redirect rule validation for ADG -> UBO converting', (assert) => {
    let adgRule = '||example.com^$xmlhttprequest,redirect=nooptext';
    assert.strictEqual(isValidRedirectRule(adgRule), true);

    adgRule = '||example.orf^$media,redirect=noopmp4-1s,third-party';
    assert.strictEqual(isValidRedirectRule(adgRule), true);

    adgRule = '||example.com/images/*.png$image,important,redirect=1x1-transparent.gif,domain=example.com|example.org';
    assert.strictEqual(isValidRedirectRule(adgRule), true);

    // abp rule ->> false
    adgRule = '||example.com^$script,rewrite=abp-resource:blank-js';
    assert.strictEqual(isValidRedirectRule(adgRule), false);

    // no source type
    adgRule = '||example.com^$important,redirect=nooptext';
    assert.strictEqual(isValidRedirectRule(adgRule), false);
});

test('Test REDIRECT converting - ADG -> UBO', (assert) => {
    let adgRule = '||example.com^$xmlhttprequest,redirect=nooptext';
    let expectedUboRule = '||example.com^$xmlhttprequest,redirect=noop.txt';
    assert.strictEqual(convertAdgRedirectToUbo(adgRule), expectedUboRule);

    adgRule = '||example.com/images/*.png$image,important,redirect=1x1-transparent.gif,domain=example.com|example.org';
    expectedUboRule = '||example.com/images/*.png$image,important,redirect=1x1.gif,domain=example.com|example.org';
    assert.strictEqual(convertAdgRedirectToUbo(adgRule), expectedUboRule);
});
/* eslint-enable max-len */
