/* global QUnit */

import { convertScriptletToAdg, convertAdgToUbo } from '../../src/helpers/converter';

const { test, module } = QUnit;
const name = 'debug-current-inline-script';

module(name);


/* eslint-disable max-len */
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

test('Test converter Ubo scriptlet rule', (assert) => {
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

test('Test converter Abp scriptlet rule', (assert) => {
    const rule = "example.org#$#hide-if-contains li.serp-item 'li.serp-item div.label'";
    const exp = 'example.org#%#//scriptlet("abp-hide-if-contains", "li.serp-item", "li.serp-item div.label")';
    const res = convertScriptletToAdg(rule);
    assert.equal(res, exp);
});

test('Test converter multiple Abp scriptlet rule', (assert) => {
    const rule = 'example.org#$#hide-if-has-and-matches-style \'d[id^="_"]\' \'div > s\' \'display: none\'; hide-if-contains /.*/ .p \'a[href^="/ad__c?"]\'';
    const exp1 = 'example.org#%#//scriptlet("abp-hide-if-has-and-matches-style", "d[id^=\\"_\\"]", "div > s", "display: none")';
    const exp2 = 'example.org#%#//scriptlet("abp-hide-if-contains", "/.*/", ".p", "a[href^=\\"/ad__c?\\"]")';
    const res = convertScriptletToAdg(rule);

    assert.equal(res.length, 2);
    assert.equal(res[0], exp1);
    assert.equal(res[1], exp2);
});

test('Test converter AdGuard scriptlet rule to Ubo one', (assert) => {
    // blocking rule
    const rule = 'example.org#%#//scriptlet("prevent-setTimeout", "[native code]", "8000")';
    const exp = 'example.org##+js(setTimeout-defuser.js, [native code], 8000)';
    const res = convertAdgToUbo(rule);
    assert.equal(res, exp);
    // scriptlet with no parameters
    const inputAdgRule = 'example.com#%#//scriptlet("prevent-adfly")';
    const expectedUboResult = 'example.com##+js(adfly-defuser.js)';
    assert.equal(convertAdgToUbo(inputAdgRule), expectedUboResult);
    // whitelist rule
    const whitelistRule = 'example.org#@%#//scriptlet("prevent-setTimeout", "[native code]", "8000")';
    const expectedResult = 'example.org#@#+js(setTimeout-defuser.js, [native code], 8000)';
    assert.equal(convertAdgToUbo(whitelistRule), expectedResult);
});
/* eslint-enable max-len */
