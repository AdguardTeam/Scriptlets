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

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-json-prune.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

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
    runScriptlet('json-prune', 'nested.b.b1');
    assert.deepEqual(JSON.parse('{"nested":{"a":1,"b":{"b1":11,"b2":22}}}'), { nested: { a: 1, b: { b2: 22 } } }, 'should remove single nested propsToRemove');
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
    assert.deepEqual(JSON.parse('{"x":1, "y":2}'), { x: 1, y: 2 }, 'should NOT remove multiple propsToRemove if single requiredInitialProps is absent in the object');
});

test('can NOT remove any propsToRemove if single nested requiredInitialProps is absent', (assert) => {
    runScriptlet('json-prune', 'nested.x', 'nested.requiredInitialProps');
    assert.deepEqual(JSON.parse('{"nested":{"x":1}}'), { nested: { x: 1 } }, 'should NOT remove propsToRemove if single nested requiredInitialProps is absent in the object');
    runScriptlet('json-prune', 'nested.x nested.y', 'nested.requiredInitialProps');
    assert.deepEqual(JSON.parse('{"nested":{"x":1, "y":2}}'), { nested: { x: 1, y: 2 } }, 'should NOT remove propsToRemove if single nested requiredInitialProps is absent in the object');
});

test('removes propsToRemove if single requiredInitialProps is specified', (assert) => {
    runScriptlet('json-prune', 'y', 'y');
    assert.deepEqual(JSON.parse('{"z":1, "y":2}'), { z: 1 }, 'should remove propsToRemove if equals to requiredInitialProps');
    runScriptlet('json-prune', 'y', 'z');
    assert.deepEqual(JSON.parse('{"z":1, "y":2}'), { z: 1 }, 'should remove propsToRemove if single requiredInitialProps is specified');
    runScriptlet('json-prune', 'enabled', 'test');
    assert.deepEqual(JSON.parse('{"enabled":true, "strict":false, "test":"adnet"}'), { strict: false, test: 'adnet' }, 'should remove propsToRemove if single requiredInitialProps is specified');
    runScriptlet('json-prune', 'y', 'z y');
    assert.deepEqual(JSON.parse('{"z":1, "y":2}'), { z: 1 }, 'should remove propsToRemove if multiple requiredInitialProps are specified');
    runScriptlet('json-prune', 'z y', 'z y');
    assert.deepEqual(JSON.parse('{"z":1, "y":2}'), {}, 'should remove propsToRemove if multiple requiredInitialProps are specified');
    runScriptlet('json-prune', 'y', 'z y x');
    assert.deepEqual(JSON.parse('{"z":1, "y":2, "x":3}'), { z: 1, x: 3 }, 'should remove propsToRemove if multiple requiredInitialProps are specified');
    runScriptlet('json-prune', 'x y', 'z y x w');
    assert.deepEqual(JSON.parse('{"w":0, "z":1, "y":2, "x":3}'), { w: 0, z: 1 }, 'should remove propsToRemove if multiple requiredInitialProps are specified');
});

test('removes nested propsToRemove if single requiredInitialProps is specified', (assert) => {
    runScriptlet('json-prune', 'x1.abc', 'x1.abc');
    assert.deepEqual(JSON.parse('{"x1": {"abc":1}}'), { x1: {} }, 'should remove propsToRemove if it equals to nested requiredInitialProps');
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

test('removes propsToRemove with wildcard', (assert) => {
    runScriptlet('json-prune', 'x.*.ad');
    assert.deepEqual(JSON.parse('{"x": {"0": {"ad":0, "preview":true}}}'), { x: { 0: { preview: true } } }, 'should remove propsToRemove with wildcard in the middle - single');
    runScriptlet('json-prune', 'x.*.ad');
    assert.deepEqual(JSON.parse('{"x": {"0": {"ad":0, "preview":true}, "1": {"ad":1, "preview":false}}}'), { x: { 0: { preview: true }, 1: { preview: false } } }, 'should remove propsToRemove with wildcard in the middle - multiple');
    runScriptlet('json-prune', 'a.b.*');
    assert.deepEqual(JSON.parse('{"a": {"b": {"c1":1, "c2":2}, "bb": {"cc1":11, "cc2":22}}}'), { a: { b: {}, bb: { cc1: 11, cc2: 22 } } }, 'should remove propsToRemove with wildcard at the end');
    runScriptlet('json-prune', '*.ad');
    assert.deepEqual(JSON.parse('{"0": {"media": {"id":0, "src":0}, "ad": {"id":0, "src":0}}, "1": {"media": {"id":1, "src":1}, "ad": {"id":1, "src":1}}}'), { 0: { media: { id: 0, src: 0 } }, 1: { media: { id: 1, src: 1 } } }, 'should remove propsToRemove with wildcard at the start');
    runScriptlet('json-prune', '*.ad.*');
    assert.deepEqual(JSON.parse('{"0": {"media": {"id":0, "src":0}, "ad": {"id":0, "src":0}}, "1": {"media": {"id":1, "src":1}, "ad": {"id":1, "src":1}}}'), { 0: { media: { id: 0, src: 0 }, ad: {} }, 1: { media: { id: 1, src: 1 }, ad: {} } }, 'should remove propsToRemove with wildcard - mixed');
    runScriptlet('json-prune', '*.*');
    assert.deepEqual(JSON.parse('{"0": {"media": {"id":0, "src":0}, "ad": {"id":0, "src":0}}, "1": {"media": {"id":1, "src":1}, "ad": {"id":1, "src":1}}}'), { 0: {}, 1: {} }, 'should remove propsToRemove with wildcard');
    runScriptlet('json-prune', '*.*.*');
    assert.deepEqual(JSON.parse('{"0": {"media": {"id":0, "src":0}, "ad": {"id":0, "src":0}}, "1": {"media": {"id":1, "src":1}, "ad": {"id":1, "src":1}}}'), { 0: { media: {}, ad: {} }, 1: { media: {}, ad: {} } }, 'should remove propsToRemove with wildcard');
});

test('removes propsToRemove if nested requiredInitialProps has wildcard', (assert) => {
    runScriptlet('json-prune', 'x', 'x.*.ad');
    assert.deepEqual(JSON.parse('{"x": {"a": {"ad":true}, "b": {"ad":1}}}'), {}, 'should remove propsToRemove');
    runScriptlet('json-prune', 'a.src', '*.preview');
    assert.deepEqual(JSON.parse('{"a": {"src":"ad_src"}, "b": {"preview":true}}'), { a: {}, b: { preview: true } }, 'should remove propsToRemove as well');
    runScriptlet('json-prune', 'a.*.src', '*.preview');
    assert.deepEqual(JSON.parse('{"a": { "0": {"id":0, "src":"ad_src_0"}, "1": {"id":1, "src":"ad_src_1"}, "2": {"id":2, "src":"ad_src_2"}}, "b": {"ready":true, "preview":true}}'), { a: { 0: { id: 0 }, 1: { id: 1 }, 2: { id: 2 } }, b: { ready: true, preview: true } }, 'should remove propsToRemove as well -- wildcard in propsToRemove and requiredInitialProps');
});

test('does NOT remove propsToRemove if invoked without parameter propsToRemove and return hostname', (assert) => {
    // eslint-disable-next-line no-console
    console.log = (host, params) => {
        assert.strictEqual(host, window.location.hostname, 'should log hostname in console');
        assert.deepEqual(params, { a: 1, b: 2 }, 'should log parameters in console');
    };
    runScriptlet('json-prune');
    JSON.parse('{"a":1, "b":2}');
});
