import { attachdependencies, wrapInIIFE } from '../src/injector';
import log from '../src/helpers/log';
import testLog from '../src/scriptlets/test-log';

const { test, module } = QUnit;
const name = 'injector';

module(name);
test('should concat scriptlet and deps', (assert) => {
    const expResult = testLog.toString() + log.toString();
    const result = attachdependencies(testLog, [log]);
    assert.equal(result, expResult, 'result of concat the same as attachdependencies');
})
test('should wrap func in IIFE and convert to string', (assert) => {
    function test(arg) { return arg };
    const testStr = test.toString();
    const expRes = `"use strict";(${testStr})(1);`
    const res = wrapInIIFE(test, [1]);
    assert.equal(res, expRes, 'function must be wrapped in IIFE and passed args as string');
});