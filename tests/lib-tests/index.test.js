/* global QUnit */

import { convertScriptletToAdg, convertAdgToUbo } from '../../src/helpers/converter';

import { isValidScriptletRule } from '../../src/scriptlets/scriptlets';

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
    const comment = "! example.org#%#//scriptlet('abort-on-property-read', 'I10C')";
    const expComment = "! example.org#%#//scriptlet('abort-on-property-read', 'I10C')";
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

test('Test converter Ubo scriptlet rule', (assert) => {
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

test('Test converter Abp scriptlet rule', (assert) => {
    const rule = "example.org#$#hide-if-contains li.serp-item 'li.serp-item div.label'";
    const exp = 'example.org#%#//scriptlet("abp-hide-if-contains", "li.serp-item", "li.serp-item div.label")';
    assert.strictEqual(convertScriptletToAdg(rule)[0], exp);
});

test('Test converter multiple Abp scriptlet rule', (assert) => {
    const rule = 'example.org#$#hide-if-has-and-matches-style \'d[id^="_"]\' \'div > s\' \'display: none\'; hide-if-contains /.*/ .p \'a[href^="/ad__c?"]\'';
    const exp1 = 'example.org#%#//scriptlet("abp-hide-if-has-and-matches-style", "d[id^=\\"_\\"]", "div > s", "display: none")';
    const exp2 = 'example.org#%#//scriptlet("abp-hide-if-contains", "/.*/", ".p", "a[href^=\\"/ad__c?\\"]")';
    const res = convertScriptletToAdg(rule);

    assert.equal(res.length, 2);
    assert.strictEqual(res[0], exp1);
    assert.strictEqual(res[1], exp2);
});

test('Test converter AdGuard scriptlet rule to Ubo one', (assert) => {
    // blocking rule
    const rule = 'example.org#%#//scriptlet("prevent-setTimeout", "[native code]", "8000")';
    const exp = 'example.org##+js(setTimeout-defuser.js, [native code], 8000)';
    assert.strictEqual(convertAdgToUbo(rule), exp);
    // scriptlet with no parameters
    const inputAdgRule = 'example.com#%#//scriptlet("prevent-adfly")';
    const expectedUboResult = 'example.com##+js(adfly-defuser.js)';
    assert.strictEqual(convertAdgToUbo(inputAdgRule), expectedUboResult);
    // whitelist rule
    const whitelistRule = 'example.org#@%#//scriptlet("prevent-setTimeout", "[native code]", "8000")';
    const expectedResult = 'example.org#@#+js(setTimeout-defuser.js, [native code], 8000)';
    assert.strictEqual(convertAdgToUbo(whitelistRule), expectedResult);

    let actual = convertAdgToUbo('example.org#%#//scriptlet("ubo-abort-on-property-read.js", "alert")');
    let expected = 'example.org##+js(abort-on-property-read.js, alert)';
    assert.strictEqual(actual, expected);

    actual = convertAdgToUbo('example.com#%#//scriptlet("abp-abort-current-inline-script", "console.log", "Hello")');
    expected = 'example.com##+js(abort-current-inline-script.js, console.log, Hello)';
    assert.strictEqual(actual, expected);
});
/* eslint-enable max-len */
