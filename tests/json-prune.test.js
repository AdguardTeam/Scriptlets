/* global QUnit */
/* eslint-disable no-eval, no-underscore-dangle */

const { test, module } = QUnit;
const name = 'json-prune';

const nativeParse = JSON.parse;
const nativeLog = console.log;

module(name);

const runScriptlet = (name, propsToRemove, obligatoryProps) => {
    const params = {
        name,
        args: [propsToRemove, obligatoryProps],
        verbose: true,
    };
    JSON.parse = nativeParse;
    const resultString = window.scriptlets.invoke(params);
    const evalWrapper = eval;
    evalWrapper(resultString);
};

test('removes correct properties', (assert) => {
    runScriptlet('json-prune', 'c');
    assert.deepEqual(JSON.parse('{"a":1,"b":2,"c":3}'), { a: 1, b: 2 }, 'should remove one property');
    runScriptlet('json-prune', 'b c');
    assert.deepEqual(JSON.parse('{"a":1,"b":2,"c":3}'), { a: 1 }, 'should remove multiple properties');
});

test('doesnt removes properties if invoked without parameter propsToRemove and return hostname', (assert) => {
    console.log = function (host, params) {
        assert.strictEqual(host, window.location.hostname, 'should log hostname in console');
        assert.deepEqual(params, {
            a: 1,
            b: 2,
        }, 'should log parameters in console');
    };
    runScriptlet('json-prune');
    assert.deepEqual(JSON.parse('{"a":1,"b":2}'), {
        a: 1,
        b: 2,
    }, 'should not remove any property if invoked without propsToRemove parameter');
    // reset console.log to the initial state
    console.log = nativeLog;
});

test('removes property only if it exists', (assert) => {
    runScriptlet('json-prune', 'b c');
    assert.deepEqual(JSON.parse('{"a":1,"b":2}'), { a: 1 }, 'should remove only existing property');
});

test('can NOT remove any property if obligatory for pruning property is absent', (assert) => {
    runScriptlet('json-prune', 'tryToRemove', 'obligatoryProp');
    assert.deepEqual(JSON.parse('{"tryToRemove":1}'), { tryToRemove: 1 }, 'should NOT remove property if the obligatory for pruning property is absent');
});
