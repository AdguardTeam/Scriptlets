/* global QUnit */
/* eslint-disable no-eval, no-underscore-dangle */

const { test, module } = QUnit;
const name = 'json-prune';

const nativeParse = JSON.parse;
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

test('removes properties', (assert) => {
    runScriptlet('json-prune', 'c');
    assert.deepEqual(JSON.parse('{"a":1,"b":2,"c":3}'), { a: 1, b: 2 }, 'should remove one property');
    runScriptlet('json-prune', 'b c');
    assert.deepEqual(JSON.parse('{"a":1,"b":2,"c":3}'), { a: 1 }, 'should remove multiple properties');
});

test('removes property only if it exists', (assert) => {
    runScriptlet('json-prune', 'b c');
    assert.deepEqual(JSON.parse('{"a":1,"b":2}'), { a: 1 }, 'should remove only existing property');
});

test('removes nested properties', (assert) => {
    runScriptlet('json-prune', 'nested.b');
    assert.deepEqual(JSON.parse('{"nested":{"a":1,"b":2}}'), { nested: { a: 1 } }, 'should remove one nested property');
    runScriptlet('json-prune', 'nested.c nested.b');
    assert.deepEqual(JSON.parse('{"nested":{"a":1,"b":2,"c":3}}'), { nested: { a: 1 } }, 'should remove multiple nested properties');
    runScriptlet('json-prune', 'nested.b nested.inner.x');
    assert.deepEqual(JSON.parse('{"nested":{"a":1,"b":2,"inner":{"x":true,"y":false}}}'),
        { nested: { a: 1, inner: { y: false } } }, 'should remove multiple nested properties');
});

test('can NOT remove any property if the obligatory for pruning property is absent', (assert) => {
    runScriptlet('json-prune', 'x', 'obligatoryProp');
    assert.deepEqual(JSON.parse('{"x":1}'), { x: 1 }, 'should NOT remove property if the obligatory for pruning property is absent');
    runScriptlet('json-prune', 'x y', 'obligatoryProp');
    assert.deepEqual(JSON.parse('{"x":1, "y":2}'), { x: 1, y: 2 }, 'should NOT remove multiple properties if the obligatory for pruning property is absent');
});

test('can NOT remove any property if the nested obligatory for pruning property is absent', (assert) => {
    runScriptlet('json-prune', 'nested.x', 'nested.obligatoryProp');
    assert.deepEqual(JSON.parse('{"nested":{"x":1}}'), { nested: { x: 1 } }, 'should NOT remove property if the nested obligatory for pruning property is absent');
    runScriptlet('json-prune', 'nested.x nested.y', 'nested.obligatoryProp');
    assert.deepEqual(JSON.parse('{"nested":{"x":1, "y":2}}'), { nested: { x: 1, y: 2 } }, 'should NOT remove multiple properties if the nested obligatory for pruning property is absent');
});

test('removes property if the obligatory for pruning property is present', (assert) => {
    runScriptlet('json-prune', 'y', 'y');
    assert.deepEqual(JSON.parse('{"z":1, "y":2}'), { z: 1 }, 'should remove specified property if it is the obligatory for pruning property');
    runScriptlet('json-prune', 'y', 'z');
    assert.deepEqual(JSON.parse('{"z":1, "y":2}'), { z: 1 }, 'should remove specified property if the obligatory for pruning property is present');
    runScriptlet('json-prune', 'y', 'z y');
    assert.deepEqual(JSON.parse('{"z":1, "y":2}'), { z: 1 }, 'should remove specified property if the obligatory for pruning properties are present');
    runScriptlet('json-prune', 'z y', 'z y');
    assert.deepEqual(JSON.parse('{"z":1, "y":2}'), { }, 'should remove specified properties if the obligatory for pruning properties are present');
});

test('removes nested property if obligatory for pruning property is present', (assert) => {
    runScriptlet('json-prune', 'x.a', 'x.a');
    assert.deepEqual(JSON.parse('{"x": {"a":1}}'), { x: { } }, 'should remove specified property if it is the nested obligatory for pruning property');
    runScriptlet('json-prune', 'x.b', 'x.a');
    assert.deepEqual(JSON.parse('{"x": {"a":1, "b":2}}'), { x: { a: 1 } }, 'should remove specified property if the nested obligatory for pruning property is present');
    runScriptlet('json-prune', 'x.b', 'x.a x.b');
    assert.deepEqual(JSON.parse('{"x": {"a":1, "b":2}}'), { x: { a: 1 } }, 'should remove specified property if the nested obligatory for pruning properties are present');
    runScriptlet('json-prune', 'x.a x.b', 'x.a x.b');
    assert.deepEqual(JSON.parse('{"x": {"a":1, "b":2}}'), { x: { } }, 'should remove specified properties if the obligatory for pruning properties are present');
});

test('does NOT remove properties if invoked without parameter propsToRemove and return hostname', (assert) => {
    console.log = function (host, params) {
        assert.strictEqual(host, window.location.hostname, 'should log hostname in console');
        assert.deepEqual(params, {
            a: 1,
            b: 2,
        }, 'should log parameters in console');
    };
    runScriptlet('json-prune');
    JSON.parse('{"a":1,"b":2}');
});
