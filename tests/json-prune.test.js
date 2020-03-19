/* global QUnit */
/* eslint-disable no-eval, no-underscore-dangle */

const { test, module } = QUnit;
const name = 'json-prune';

const nativeParse = JSON.parse;
module(name);

const runScriptlet = (name, propsToRemove, requiredInitialProps) => {
    const params = {
        name,
        args: [propsToRemove, requiredInitialProps],
        verbose: true,
    };
    JSON.parse = nativeParse;
    const resultString = window.scriptlets.invoke(params);
    const evalWrapper = eval;
    evalWrapper(resultString);
};

test('removes propsToRemove', (assert) => {
    runScriptlet('json-prune', 'c');
    assert.deepEqual(JSON.parse('{"a":1,"b":2,"c":3}'), { a: 1, b: 2 }, 'should remove single propsToRemove');
    runScriptlet('json-prune', 'b c');
    assert.deepEqual(JSON.parse('{"a":1,"b":2,"c":3}'), { a: 1 }, 'should remove multiple propsToRemove');
});

test('removes property only if it exists in the object', (assert) => {
    runScriptlet('json-prune', 'b c');
    assert.deepEqual(JSON.parse('{"a":1,"b":2}'), { a: 1 }, 'should remove only existing in the object property');
});

test('removes nested propsToRemove', (assert) => {
    runScriptlet('json-prune', 'nested.b');
    assert.deepEqual(JSON.parse('{"nested":{"a":1,"b":2}}'), { nested: { a: 1 } }, 'should remove single nested propsToRemove');
    runScriptlet('json-prune', 'nested.c nested.b');
    assert.deepEqual(JSON.parse('{"nested":{"a":1,"b":2,"c":3}}'), { nested: { a: 1 } }, 'should remove multiple nested propsToRemove');
    runScriptlet('json-prune', 'nested.b nested.inner.x');
    assert.deepEqual(JSON.parse('{"nested":{"a":1,"b":2,"inner":{"x":true,"y":false}}}'),
        { nested: { a: 1, inner: { y: false } } }, 'should remove multiple nested propsToRemove');
});

test('can NOT remove nested propsToRemove if parental parameter is absent in the object in the first place', (assert) => {
    runScriptlet('json-prune', 'nested.test');
    assert.deepEqual(JSON.parse('{"a":0,"messed":{"b":1,"c":2}}'), { a: 0, messed: { b: 1, c: 2 } }, 'should  NOT remove single nested propsToRemove');
    runScriptlet('json-prune', 'nested.b inner.x');
    assert.deepEqual(JSON.parse('{"messed":{"a":1,"b":2,"inner":{"x":true,"y":false}}}'),
        { messed: { a: 1, b: 2, inner: { x: true, y: false } } }, 'should NOT remove multiple nested propsToRemove');
    runScriptlet('json-prune', 'test.a.bb');
    assert.deepEqual(JSON.parse('{"nested":true}'), { nested: true }, `should NOT remove any nested propsToRemove
        and should NOT fail while operating propsToRemove with 2 or more levels of nesting`);
});

test('can NOT remove any propsToRemove if requiredInitialProps are absent in the object', (assert) => {
    runScriptlet('json-prune', 'x', 'requiredInitialProps');
    assert.deepEqual(JSON.parse('{"x":1}'), { x: 1 }, 'should NOT remove propsToRemove if single requiredInitialProps is absent in the object');
    runScriptlet('json-prune', 'x y', 'requiredInitialProps');
    assert.deepEqual(JSON.parse('{"x":1, "y":2}'), {
        x: 1,
        y: 2,
    }, 'should NOT remove multiple propsToRemove if single requiredInitialProps is absent in the object');
});

test('can NOT remove any propsToRemove if single nested requiredInitialProps is absent', (assert) => {
    runScriptlet('json-prune', 'nested.x', 'nested.requiredInitialProps');
    assert.deepEqual(JSON.parse('{"nested":{"x":1}}'), { nested: { x: 1 } }, 'should NOT remove propsToRemove if single nested requiredInitialProps is absent in the object');
    runScriptlet('json-prune', 'nested.x nested.y', 'nested.requiredInitialProps');
    assert.deepEqual(JSON.parse('{"nested":{"x":1, "y":2}}'), {
        nested: {
            x: 1,
            y: 2,
        },
    }, 'should NOT remove propsToRemove if single nested requiredInitialProps is absent in the object');
});

test('removes propsToRemove if single requiredInitialProps is specified', (assert) => {
    runScriptlet('json-prune', 'y', 'y');
    assert.deepEqual(JSON.parse('{"z":1, "y":2}'), { z: 1 }, 'should remove propsToRemove if equals to requiredInitialProps');
    runScriptlet('json-prune', 'y', 'z');
    assert.deepEqual(JSON.parse('{"z":1, "y":2}'), { z: 1 }, 'should remove propsToRemove if single requiredInitialProps is specified');
    runScriptlet('json-prune', 'y', 'z y');
    assert.deepEqual(JSON.parse('{"z":1, "y":2}'), { z: 1 }, 'should remove propsToRemove if multiple requiredInitialProps are specified');
    runScriptlet('json-prune', 'z y', 'z y');
    assert.deepEqual(JSON.parse('{"z":1, "y":2}'), {}, 'should remove propsToRemove if multiple requiredInitialProps are specified');
});

test('removes nested propsToRemove if single requiredInitialProps is specified', (assert) => {
    runScriptlet('json-prune', 'x.a', 'x.a');
    assert.deepEqual(JSON.parse('{"x": {"a":1}}'), { x: {} }, 'should remove propsToRemove if it equals to nested requiredInitialProps');
    runScriptlet('json-prune', 'x.b', 'x.a');
    assert.deepEqual(JSON.parse('{"x": {"a":1, "b":2}}'), { x: { a: 1 } }, 'should remove propsToRemove if single nested requiredInitialProps is specified');
    runScriptlet('json-prune', 'x.b', 'x.a x.b');
    assert.deepEqual(JSON.parse('{"x": {"a":1, "b":2}}'), { x: { a: 1 } }, 'should remove propsToRemove if multiple nested requiredInitialProps are specified');
    runScriptlet('json-prune', 'x.a x.b', 'x.a x.b');
    assert.deepEqual(JSON.parse('{"x": {"a":1, "b":2}}'), { x: {} }, 'should remove propsToRemove if multiple requiredInitialProps are specified');
});

test('removes propsToRemove if single nested requiredInitialProps is specified', (assert) => {
    runScriptlet('json-prune', 'x', 'x.a');
    assert.deepEqual(JSON.parse('{"x": {"a":1}}'), {}, 'should remove propsToRemove if it has single requiredInitialProps');
    runScriptlet('json-prune', 'x', 'x.b');
    assert.deepEqual(JSON.parse('{"x": {"a":1}}'), { x: { a: 1 } }, 'should NOT remove propsToRemove if single requiredInitialProps is absent');
});

test('does NOT remove propsToRemove if invoked without parameter propsToRemove and return hostname', (assert) => {
    // eslint-disable-next-line no-console
    console.log = (host, params) => {
        assert.strictEqual(host, window.location.hostname, 'should log hostname in console');
        assert.deepEqual(params, {
            a: 1,
            b: 2,
        }, 'should log parameters in console');
    };
    runScriptlet('json-prune');
    JSON.parse('{"a":1,"b":2}');
});
