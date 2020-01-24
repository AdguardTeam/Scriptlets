/* global QUnit */

import { convertScriptletToAdg } from '../../src/helpers/converter';

const { test, module } = QUnit;
const name = 'debug-current-inline-script';

module(name);


// console.log('XXXXXXXXXXXXXXXXX');

/* eslint-disable max-len */
// test('Test scriptlet adguard rule', (assert) => {
//     const rule = "example.org#%#//scriptlet('abort-on-property-read', 'I10C')";
//     const exp = "example.org#%#//scriptlet('abort-on-property-read', 'I10C')";
//     const res = convertScriptletToAdg(rule);
//     assert.equal(res, exp);
// });

test('Test scriptlet adguard rule exception', (assert) => {
    const rule = "example.org#@%#//scriptlet('abort-on-property-read', 'I10C')";
    const exp = "example.org#@%#//scriptlet('abort-on-property-read', 'I10C')";
    const res = convertScriptletToAdg(rule);
    assert.equal(res, exp);
});

test('Test converter scriptlet ubo rule', (assert) => {
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

test('Test converter scriptlet abp rule', (assert) => {
    const rule = "example.org#$#hide-if-contains li.serp-item 'li.serp-item div.label'";
    const exp = 'example.org#%#//scriptlet("abp-hide-if-contains", "li.serp-item", "li.serp-item div.label")';
    const res = convertScriptletToAdg(rule);
    assert.equal(res, exp);
});

// test('Test converter scriptlet multiple abp rule', (assert) => {
//     const rule = 'example.org#$#hide-if-has-and-matches-style \'d[id^="_"]\' \'div > s\' \'display: none\'; hide-if-contains /.*/ .p \'a[href^="/ad__c?"]\'';
//     const exp1 = 'example.org#%#//scriptlet("abp-hide-if-has-and-matches-style", "d[id^=\\"_\\"]", "div > s", "display: none")';
//     const exp2 = 'example.org#%#//scriptlet("abp-hide-if-contains", "/.*/", ".p", "a[href^=\\"/ad__c?\\"]")';
//     const res = convertScriptletToAdg(rule);

//     assert.equal(res.length, 2);
//     assert.equal(res[0], exp1);
//     assert.equal(res[1], exp2);
// });
/* eslint-enable max-len */
