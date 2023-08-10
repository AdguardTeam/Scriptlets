/* eslint-disable no-eval, no-underscore-dangle, no-console */
const { test, module } = QUnit;
const name = 'json-prune';

const nativeParse = JSON.parse;
const nativeConsole = console.log;

const FETCH_OBJECTS_PATH = './test-files';

const afterEach = () => {
    console.log = nativeConsole;
};

module(name, { afterEach });

// not a common method for running scriptlet
// can not be imported from helpers
const runScriptlet = (name, ...args) => {
    const params = {
        name,
        args,
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

test('Response.json() mocking -- remove single propsToRemove', async (assert) => {
    const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
    const inputRequest = new Request(INPUT_JSON_PATH);

    runScriptlet('json-prune', 'c3');
    const expectedJson = {
        a1: 1,
        b2: 'test',
    };
    const done = assert.async();

    const response = await fetch(inputRequest);
    const actualJson = await response.json();

    assert.deepEqual(actualJson, expectedJson);
    done();
});

test('Response.json() mocking -- remove multiple propsToRemove', async (assert) => {
    const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test02.json`;
    const inputRequest = new Request(INPUT_JSON_PATH);

    runScriptlet('json-prune', 'src count');
    const expectedJson = {
        ad: 1,
    };
    const done = assert.async();

    const response = await fetch(inputRequest);
    const actualJson = await response.json();

    assert.deepEqual(actualJson, expectedJson);
    done();
});

test('Response.json() mocking -- remove single nested property', async (assert) => {
    const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test03.json`;
    const inputRequest = new Request(INPUT_JSON_PATH);

    runScriptlet('json-prune', 'cc.arr');
    const expectedJson = {
        aa: 1,
        bb: 'test',
        cc: {
            id: 0,
            src: 'example.org',
        },
    };

    const done = assert.async();

    const response = await fetch(inputRequest);
    const actualJson = await response.json();

    assert.deepEqual(actualJson, expectedJson);
    done();
});

test('Response.json() mocking -- remove multiple mixed properties', async (assert) => {
    const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test04.json`;
    const inputRequest = new Request(INPUT_JSON_PATH);

    runScriptlet('json-prune', 'ab cc1.arr cc1.id');
    const expectedJson = {
        bc: 123,
        cc1: {
            src: 'example.org',
        },
    };

    const done = assert.async();

    const response = await fetch(inputRequest);
    const actualJson = await response.json();

    assert.deepEqual(actualJson, expectedJson);
    done();
});

test('Response.json() mocking -- remove single properties with * for any property', async (assert) => {
    const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test05.json`;
    const inputRequest = new Request(INPUT_JSON_PATH);

    runScriptlet('json-prune', '*.id');
    const expectedJson = {
        ax: 1,
        xx: {
            nested: {
                inner1: 123,
            },
        },
    };

    const done = assert.async();

    const response = await fetch(inputRequest);
    const actualJson = await response.json();

    assert.deepEqual(actualJson, expectedJson);
    done();
});

test('Response.json() mocking -- remove single properties with [] for any array item', async (assert) => {
    const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test06.json`;
    const inputRequest = new Request(INPUT_JSON_PATH);

    runScriptlet('json-prune', '[].content.[].source', 'state.ready');
    const expectedJson = [
        {
            content: [
                { id: 0 },
                { id: 1 },
            ],
            state: {
                ready: true,
            },
        },
    ];

    const done = assert.async();

    const response = await fetch(inputRequest);
    const actualJson = await response.json();

    assert.deepEqual(actualJson, expectedJson);
    done();
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
    assert.deepEqual(
        JSON.parse('{"nested":{"a":1,"b":2}}'),
        { nested: { a: 1 } },
        'should remove single nested propsToRemove',
    );
    runScriptlet('json-prune', 'nested.c nested.b');
    assert.deepEqual(
        JSON.parse('{"nested":{"a":1,"b":2,"c":3}}'),
        { nested: { a: 1 } },
        'should remove multiple nested propsToRemove',
    );
    runScriptlet('json-prune', 'nested.b nested.inner.x');
    assert.deepEqual(JSON.parse('{"nested":{"a":1,"b":2,"inner":{"x":true,"y":false}}}'),
        { nested: { a: 1, inner: { y: false } } }, 'should remove multiple nested propsToRemove');
    runScriptlet('json-prune', 'nested.b.b1');
    assert.deepEqual(
        JSON.parse('{"nested":{"a":1,"b":{"b1":11,"b2":22}}}'),
        { nested: { a: 1, b: { b2: 22 } } },
        'should remove single nested propsToRemove',
    );
});

test('can NOT remove nested propsToRemove if parental parameter is absent in the object', (assert) => {
    runScriptlet('json-prune', 'nested.test');
    assert.deepEqual(
        JSON.parse('{"a":0,"messed":{"b":1,"c":2}}'),
        { a: 0, messed: { b: 1, c: 2 } },
        'should  NOT remove single nested propsToRemove',
    );
    runScriptlet('json-prune', 'nested.b inner.x');
    assert.deepEqual(JSON.parse('{"messed":{"a":1,"b":2,"inner":{"x":true,"y":false}}}'),
        { messed: { a: 1, b: 2, inner: { x: true, y: false } } }, 'should NOT remove multiple nested propsToRemove');
    runScriptlet('json-prune', 'test.a.bb');
    assert.deepEqual(JSON.parse('{"nested":true}'), { nested: true }, `should NOT remove any nested propsToRemove
        and should NOT fail while operating propsToRemove with 2 or more levels of nesting`);
});

test('can NOT remove any propsToRemove if requiredInitialProps are absent in the object', (assert) => {
    runScriptlet('json-prune', 'x', 'requiredInitialProps');
    assert.deepEqual(
        JSON.parse('{"x":1}'),
        { x: 1 },
        'should NOT remove propsToRemove if single requiredInitialProps is absent in the object',
    );
    runScriptlet('json-prune', 'x y', 'requiredInitialProps');
    assert.deepEqual(
        JSON.parse('{"x":1, "y":2}'),
        { x: 1, y: 2 },
        'should NOT remove multiple propsToRemove if single requiredInitialProps is absent in the object',
    );
    runScriptlet('json-prune', 'x y', 'z y x v');
    assert.deepEqual(JSON.parse('{"w":0, "z":1, "y":2, "x":3}'),
        {
            w: 0, z: 1, y: 2, x: 3,
        }, 'should remove propsToRemove if one of requiredInitialProps is absent');
});

test('can NOT remove any propsToRemove if single nested requiredInitialProps is absent', (assert) => {
    runScriptlet('json-prune', 'nested.x', 'nested.requiredInitialProps');
    assert.deepEqual(
        JSON.parse('{"nested":{"x":1}}'),
        { nested: { x: 1 } },
        'should NOT remove propsToRemove if single nested requiredInitialProps is absent in the object',
    );
    runScriptlet('json-prune', 'nested.x nested.y', 'nested.requiredInitialProps');
    assert.deepEqual(
        JSON.parse('{"nested":{"x":1, "y":2}}'),
        { nested: { x: 1, y: 2 } },
        'should NOT remove propsToRemove if single nested requiredInitialProps is absent in the object',
    );
});

test('removes propsToRemove if requiredInitialProps are specified', (assert) => {
    runScriptlet('json-prune', 'y', 'y');
    assert.deepEqual(
        JSON.parse('{"z":1, "y":2}'),
        { z: 1 },
        'should remove propsToRemove if equals to requiredInitialProps',
    );
    runScriptlet('json-prune', 'y', 'z');
    assert.deepEqual(
        JSON.parse('{"z":1, "y":2}'),
        { z: 1 },
        'should remove propsToRemove if single requiredInitialProps is specified',
    );
    runScriptlet('json-prune', 'enabled', 'test');
    assert.deepEqual(
        JSON.parse('{"enabled":true, "strict":false, "test":"adnet"}'),
        { strict: false, test: 'adnet' },
        'should remove propsToRemove if single requiredInitialProps is specified',
    );
    runScriptlet('json-prune', 'y', 'z y');
    assert.deepEqual(
        JSON.parse('{"z":1, "y":2}'),
        { z: 1 },
        'should remove propsToRemove if multiple requiredInitialProps are specified',
    );
    runScriptlet('json-prune', 'z y', 'z y');
    assert.deepEqual(
        JSON.parse('{"z":1, "y":2}'),
        {},
        'should remove propsToRemove if multiple requiredInitialProps are specified',
    );
    runScriptlet('json-prune', 'y', 'z y x');
    assert.deepEqual(
        JSON.parse('{"z":1, "y":2, "x":3}'),
        { z: 1, x: 3 },
        'should remove propsToRemove if multiple requiredInitialProps are specified',
    );
    runScriptlet('json-prune', 'x y', 'z y x w');
    assert.deepEqual(
        JSON.parse('{"w":0, "z":1, "y":2, "x":3}'),
        { w: 0, z: 1 },
        'should remove propsToRemove if multiple requiredInitialProps are specified',
    );
});

test('removes nested propsToRemove if single requiredInitialProps is specified', (assert) => {
    runScriptlet('json-prune', 'x1.abc', 'x1.abc');
    assert.deepEqual(
        JSON.parse('{"x1": {"abc":1}}'),
        { x1: {} },
        'should remove propsToRemove if it equals to nested requiredInitialProps',
    );
    runScriptlet('json-prune', 'x.b', 'x.a');
    assert.deepEqual(
        JSON.parse('{"x": {"a":1, "b":2}}'),
        { x: { a: 1 } },
        'should remove propsToRemove if single nested requiredInitialProps is specified',
    );
    runScriptlet('json-prune', 'x.b', 'x.a x.b');
    assert.deepEqual(
        JSON.parse('{"x": {"a":1, "b":2}}'),
        { x: { a: 1 } },
        'should remove propsToRemove if multiple nested requiredInitialProps are specified',
    );
    runScriptlet('json-prune', 'x.a x.b', 'x.a x.b');
    assert.deepEqual(
        JSON.parse('{"x": {"a":1, "b":2}}'),
        { x: {} },
        'should remove propsToRemove if multiple requiredInitialProps are specified',
    );
});

test('removes propsToRemove if single nested requiredInitialProps is specified', (assert) => {
    runScriptlet('json-prune', 'x', 'x.a');
    assert.deepEqual(
        JSON.parse('{"x": {"a":1}}'),
        {},
        'should remove propsToRemove if it has single requiredInitialProps',
    );
    runScriptlet('json-prune', 'x', 'x.b');
    assert.deepEqual(
        JSON.parse('{"x": {"a":1}}'),
        { x: { a: 1 } },
        'should NOT remove propsToRemove if single requiredInitialProps is absent',
    );
});

test('removes propsToRemove with wildcard', (assert) => {
    runScriptlet('json-prune', 'x.*.ad');
    assert.deepEqual(
        JSON.parse('{"x": {"0": {"ad":0, "preview":true}}}'),
        { x: { 0: { preview: true } } },
        'should remove propsToRemove with wildcard in the middle - single',
    );
    runScriptlet('json-prune', 'x.*.ad');
    assert.deepEqual(
        JSON.parse('{"x": {"0": {"ad":0, "preview":true}, "1": {"ad":1, "preview":false}}}'),
        { x: { 0: { preview: true }, 1: { preview: false } } },
        'should remove propsToRemove with wildcard in the middle - multiple',
    );
    runScriptlet('json-prune', 'a.b.*');
    assert.deepEqual(
        JSON.parse('{"a": {"b": {"c1":1, "c2":2}, "bb": {"cc1":11, "cc2":22}}}'),
        { a: { b: {}, bb: { cc1: 11, cc2: 22 } } },
        'should remove propsToRemove with wildcard at the end',
    );
    runScriptlet('json-prune', '*.ad');
    assert.deepEqual(
        // eslint-disable-next-line
        JSON.parse('{"0": {"media": {"id":0, "src":0}, "ad": {"id":0, "src":0}}, "1": {"media": {"id":1, "src":1}, "ad": {"id":1, "src":1}}}'),
        { 0: { media: { id: 0, src: 0 } }, 1: { media: { id: 1, src: 1 } } },
        'should remove propsToRemove with wildcard at the start',
    );
    runScriptlet('json-prune', '*.ad.*');
    assert.deepEqual(
        // eslint-disable-next-line
        JSON.parse('{"0": {"media": {"id":0, "src":0}, "ad": {"id":0, "src":0}}, "1": {"media": {"id":1, "src":1}, "ad": {"id":1, "src":1}}}'),
        { 0: { media: { id: 0, src: 0 }, ad: {} }, 1: { media: { id: 1, src: 1 }, ad: {} } },
        'should remove propsToRemove with wildcard - mixed',
    );
    runScriptlet('json-prune', '*.*');
    assert.deepEqual(
        // eslint-disable-next-line
        JSON.parse('{"0": {"media": {"id":0, "src":0}, "ad": {"id":0, "src":0}}, "1": {"media": {"id":1, "src":1}, "ad": {"id":1, "src":1}}}'),
        { 0: {}, 1: {} },
        'should remove propsToRemove with wildcard',
    );
    runScriptlet('json-prune', '*.*.*');
    assert.deepEqual(
        // eslint-disable-next-line
        JSON.parse('{"0": {"media": {"id":0, "src":0}, "ad": {"id":0, "src":0}}, "1": {"media": {"id":1, "src":1}, "ad": {"id":1, "src":1}}}'),
        { 0: { media: {}, ad: {} }, 1: { media: {}, ad: {} } },
        'should remove propsToRemove with wildcard',
    );
    runScriptlet('json-prune', 'x.*.ad');
    assert.deepEqual(
        JSON.parse('{"x": {"0": {"ad":0, "preview":true}, "1": {"ad":1, "preview":false}}}'),
        { x: { 0: { preview: true }, 1: { preview: false } } },
        'should remove propsToRemove with wildcard in the middle - multiple',
    );
    runScriptlet('json-prune', '*.ad');
    assert.deepEqual(
        // eslint-disable-next-line
        JSON.parse('{"0": {"media": {"id":0, "src":0}, "ad": {"id":0, "src":0}}, "1": {"media": {"id":1, "src":1}, "ad": {"id":1, "src":1}}}'),
        { 0: { media: { id: 0, src: 0 } }, 1: { media: { id: 1, src: 1 } } },
        'should remove propsToRemove with wildcard at the start',
    );
    runScriptlet('json-prune', '*.ad.*');
    assert.deepEqual(
        // eslint-disable-next-line
        JSON.parse('{"0": {"media": {"id":0, "src":0}, "ad": {"id":0, "src":0}}, "1": {"media": {"id":1, "src":1}, "ad": {"id":1, "src":1}}}'),
        { 0: { media: { id: 0, src: 0 }, ad: {} }, 1: { media: { id: 1, src: 1 }, ad: {} } },
        'should remove propsToRemove with wildcard - mixed',
    );
    runScriptlet('json-prune', '*.*');
    assert.deepEqual(
        // eslint-disable-next-line
        JSON.parse('{"0": {"media": {"id":0, "src":0}, "ad": {"id":0, "src":0}}, "1": {"media": {"id":1, "src":1}, "ad": {"id":1, "src":1}}}'),
        { 0: {}, 1: {} },
        'should remove propsToRemove with wildcard',
    );
    runScriptlet('json-prune', '*.*.*');
    assert.deepEqual(
        // eslint-disable-next-line
        JSON.parse('{"0": {"media": {"id":0, "src":0}, "ad": {"id":0, "src":0}}, "1": {"media": {"id":1, "src":1}, "ad": {"id":1, "src":1}}}'),
        { 0: { media: {}, ad: {} }, 1: { media: {}, ad: {} } },
        'should remove propsToRemove with wildcard',
    );
    runScriptlet('json-prune', 'a.[].src');
    assert.deepEqual(
        // eslint-disable-next-line
        JSON.parse('{"a": [ {"id":0, "src":"ad_src_0"}, {"id":1, "src":"ad_src_1"}, {"id":2, "src":"ad_src_2"}], "b": {"ready":true, "preview":true}}'),
        { a: [{ id: 0 }, { id: 1 }, { id: 2 }], b: { ready: true, preview: true } },
        'should remove propsToRemove -- wildcard in propsToRemove for array',
    );
    runScriptlet('json-prune', '[].ads');
    assert.deepEqual(
        // eslint-disable-next-line
        JSON.parse('[ {"media":"ertu", "ads":"ad_src_0"}, {"media":"sgesr", "ads":"ad_src_1"}, {"media":"yhiuo", "ads":"ad_src_2"} ]'),
        [{ media: 'ertu' }, { media: 'sgesr' }, { media: 'yhiuo' }],
        'should remove propsToRemove -- wildcard in propsToRemove for array',
    );
});

test('removes propsToRemove if nested requiredInitialProps has wildcard', (assert) => {
    runScriptlet('json-prune', 'x', 'x.*.ad');
    assert.deepEqual(JSON.parse('{"x": {"a": {"ad":true}, "b": {"ad":1}}}'), {}, 'should remove propsToRemove');
    runScriptlet('json-prune', 'a.src', '*.preview');
    assert.deepEqual(
        JSON.parse('{"a": {"src":"ad_src"}, "b": {"preview":true}}'),
        { a: {}, b: { preview: true } },
        'should remove propsToRemove as well',
    );
    runScriptlet('json-prune', 'a.*.src', '*.preview');
    assert.deepEqual(
        // eslint-disable-next-line
        JSON.parse('{"a": { "0": {"id":0, "src":"ad_src_0"}, "1": {"id":1, "src":"ad_src_1"}, "2": {"id":2, "src":"ad_src_2"}}, "b": {"ready":true, "preview":true}}'),
        { a: { 0: { id: 0 }, 1: { id: 1 }, 2: { id: 2 } }, b: { ready: true, preview: true } },
        'should remove propsToRemove as well -- wildcard in propsToRemove and requiredInitialProps',
    );
    runScriptlet('json-prune', 'mov.[].src.[].*', '*.preview');
    assert.deepEqual(
        // eslint-disable-next-line
        JSON.parse('{"mov": [ {"id":0, "src": [ {"a0":"a00"} ]}, {"id":1, "src": [ {"b1":"b11"} ] } ], "b": {"ready":true, "preview":true} }'),
        { mov: [{ id: 0, src: [{}] }, { id: 1, src: [{}] }], b: { ready: true, preview: true } },
        'should remove propsToRemove as well -- wildcard in propsToRemove and requiredInitialProps',
    );
});

test('can NOT remove propsToRemove if nested requiredInitialProps has wildcard but there is no match', (assert) => {
    runScriptlet('json-prune', 'x', 'y.*.ad');
    assert.deepEqual(
        JSON.parse('{"x": {"a": {"ad":true}, "b": {"ad":1}}, "y": {"c": {"inner":true}}}'),
        { x: { a: { ad: true }, b: { ad: 1 } }, y: { c: { inner: true } } },
        'should not remove propsToRemove',
    );
    runScriptlet('json-prune', 'a.src', 'c.*.media');
    assert.deepEqual(
        JSON.parse('{"a": {"src":"ad_src"}, "b": {"0": { "media":"video"}}}'),
        { a: { src: 'ad_src' }, b: { 0: { media: 'video' } } },
        'should not remove propsToRemove as well',
    );
});

test('does NOT remove propsToRemove if invoked without parameter propsToRemove and return hostname', (assert) => {
    assert.expect(2);
    console.log = (...args) => {
        if (args.length === 1) {
            assert.ok(args[0].includes(window.location.hostname), 'should log hostname in console');
            assert.ok(args[0].includes('"a": 1,\n  "b": 2'), 'should log parameters in console');
        }
        nativeConsole(...args);
    };
    runScriptlet('json-prune');
    JSON.parse('{"a":1, "b":2}');
});

test('logs matched object and hostname if invoked with only second arg', (assert) => {
    assert.expect(2);
    console.log = (...args) => {
        if (args.length === 1) {
            assert.ok(args[0].includes(window.location.hostname), 'should log hostname in console');
            assert.ok(args[0].includes('"a": 1'), 'should log parameters in console');
        }
        nativeConsole(...args);
    };
    runScriptlet('json-prune', '', '"a":1');
    JSON.parse('{"a":1}');
    JSON.parse('{"b":2}');
});

test('removes propsToRemove + stack match', (assert) => {
    const stackMatch = 'json-prune';

    runScriptlet('json-prune', 'c', '', stackMatch);
    assert.deepEqual(
        JSON.parse('{"a":1,"b":2,"c":3}'),
        { a: 1, b: 2 },
        'stack match: should remove single propsToRemove',
    );
    runScriptlet('json-prune', 'b c', '', stackMatch);
    assert.deepEqual(
        JSON.parse('{"a":1,"b":2,"c":3}'),
        { a: 1 },
        'stack match: should remove few propsToRemove',
    );
    runScriptlet('json-prune', 'x.b', 'x.a', stackMatch);
    assert.deepEqual(
        JSON.parse('{"x": {"a":1, "b":2}}'),
        { x: { a: 1 } },
        'stack match: should remove propsToRemove if single nested requiredInitialProps is specified',
    );
    runScriptlet('json-prune', 'nested.c nested.b', '', stackMatch);
    assert.deepEqual(
        JSON.parse('{"nested":{"a":1,"b":2,"c":3}}'),
        { nested: { a: 1 } },
        'stack match: should remove multiple nested propsToRemove',
    );
});

test('can NOT remove propsToRemove because of no stack match', (assert) => {
    const stackNoMatch = 'no_match.js';

    runScriptlet('json-prune', 'x', '', stackNoMatch);
    assert.deepEqual(JSON.parse('{"x":1}'), { x: 1 }, 'should NOT remove propsToRemove if there in no stack match');
    runScriptlet('json-prune', 'x.b', 'x.a x.b', stackNoMatch);
    assert.deepEqual(
        JSON.parse('{"x": {"a":1, "b":2}}'),
        { x: { a: 1, b: 2 } },
        'should NOT remove propsToRemove if there in no stack match',
    );
    runScriptlet('json-prune', 'nested.c nested.b', '', stackNoMatch);
    assert.deepEqual(
        JSON.parse('{"nested":{"a":1,"b":2,"c":3}}'),
        { nested: { a: 1, b: 2, c: 3 } },
        'should NOT remove multiple nested propsToRemove if there in no stack match',
    );
});

test('does not remove propsToRemove - invalid regexp pattern for stack match', (assert) => {
    const stackArg = '/\\/';
    runScriptlet('json-prune', 'x', '', stackArg);
    assert.deepEqual(JSON.parse('{"x":1}'), { x: 1 }, 'should NOT remove propsToRemove');
});

test('logs null', (assert) => {
    assert.expect(2);
    console.log = (message) => {
        assert.ok(message.includes(window.location.hostname), 'should log hostname in console');
        assert.ok(message.includes('null'), 'should log parameters in console');
        nativeConsole(message);
    };
    runScriptlet('json-prune');
    JSON.parse(null);
});

test('logs 0', (assert) => {
    assert.expect(2);
    console.log = (message) => {
        assert.ok(message.includes(window.location.hostname), 'should log hostname in console');
        assert.ok(message.includes('localhost\n0\n'), 'should log parameters in console');
        nativeConsole(message);
    };
    runScriptlet('json-prune');
    JSON.parse(0);
});

test('logs 10', (assert) => {
    assert.expect(2);
    console.log = (message) => {
        assert.ok(message.includes(window.location.hostname), 'should log hostname in console');
        assert.ok(message.includes('localhost\n10\n'), 'should log parameters in console');
        nativeConsole(message);
    };
    runScriptlet('json-prune');
    JSON.parse(10);
});

test('check if log contains specific stack trace function', (assert) => {
    assert.expect(2);
    console.log = (message) => {
        assert.ok(message.includes(window.location.hostname), 'should log hostname in console');
        assert.ok(message.includes('logStackFunc'), 'should log parameters in console');
        nativeConsole(message);
    };
    runScriptlet('json-prune');
    const logStackFunc = () => {
        return JSON.parse(999);
    };
    logStackFunc();
});

test('removes propsToRemove + stack match function', (assert) => {
    const testFuncStack = () => {
        return JSON.parse('{"a":1,"b":2,"c":3}');
    };
    runScriptlet('json-prune', 'c', '', 'testFuncStack');
    assert.deepEqual(
        testFuncStack(),
        { a: 1, b: 2 },
        'stack match: should remove single propsToRemove',
    );

    const fewPropsStack = () => {
        return JSON.parse('{"a":1,"b":2,"c":3}');
    };
    runScriptlet('json-prune', 'b c', '', 'fewPropsStack');
    assert.deepEqual(
        fewPropsStack(),
        { a: 1 },
        'stack match: should remove few propsToRemove',
    );

    const requiredInitialPropsStack = () => {
        return JSON.parse('{"x": {"a":1, "b":2}}');
    };
    runScriptlet('json-prune', 'x.b', 'x.a', 'requiredInitialPropsStack');
    assert.deepEqual(
        requiredInitialPropsStack(),
        { x: { a: 1 } },
        'stack match: should remove propsToRemove if single nested requiredInitialProps is specified',
    );

    const nestedPropsStack = () => {
        return JSON.parse('{"nested":{"a":1,"b":2,"c":3}}');
    };
    runScriptlet('json-prune', 'nested.c nested.b', '', 'nestedPropsStack');
    assert.deepEqual(
        nestedPropsStack(),
        { nested: { a: 1 } },
        'stack match: should remove multiple nested propsToRemove',
    );
});

test('removes propsToRemove + stack match regex', (assert) => {
    const regexFuncStack = () => {
        return JSON.parse('{"a":1,"b":2,"c":3}');
    };
    runScriptlet('json-prune', 'c', '', '/regex.*Stack/');
    assert.deepEqual(
        regexFuncStack(),
        { a: 1, b: 2 },
        'stack match: should remove single propsToRemove',
    );
});

test('obligatory props does not exist, do NOT prune', (assert) => {
    runScriptlet('json-prune', 'whatever.qwerty advert', 'path.not.exist');
    assert.deepEqual(
        JSON.parse('{ "advert": "hello", "foo": { "bar" :1 } }'),
        { advert: 'hello', foo: { bar: 1 } },
        'should not remove any props',
    );
});

test('JSON with Array, wildcard [], should remove props', (assert) => {
    runScriptlet('json-prune', '[].foo.ads');
    assert.deepEqual(
        // eslint-disable-next-line
        JSON.parse('[ {"media":"ertu", "ads":"ad_src_0"}, {"foo": { "bar": 1, "ads":"ad_src_1"} }, {"media":"yhiuo", "ads":"ad_src_2"} ]'),
        [{ media: 'ertu', ads: 'ad_src_0' }, { foo: { bar: 1 } }, { media: 'yhiuo', ads: 'ad_src_2' }],
        'should remove propsToRemove -- wildcard in propsToRemove for array',
    );
});

test('JSON with Array, wildcard [] + obligatory props, should remove props', (assert) => {
    runScriptlet('json-prune', '[].content.[].source', 'state.ready');

    const expectedJson = [
        {
            content: [
                { id: 0 },
                { id: 1 },
            ],
            state: {
                ready: true,
            },
        },
    ];

    assert.deepEqual(
        // eslint-disable-next-line
        JSON.parse(`
        [{"content":[{"id":0,"source":"example.com"},{"id":1,"source":"example.org"}],"state":{"ready":true}}]`),
        expectedJson,
        'should remove propsToRemove -- wildcard in propsToRemove for array',
    );
});

test('JSON with Array, wildcard [] + obligatory props, should remove props', (assert) => {
    runScriptlet('json-prune', '[].content.[].source', 'state.ready');

    const expectedJson = [
        {
            content: [
                { id: 0 },
                { id: 1 },
            ],
            state: {
                ready: true,
            },
        },
        {
            content: [
                { id: 0 },
                { id: 1 },
            ],
            state: {
                ready: true,
            },
        },
    ];

    assert.deepEqual(
        // eslint-disable-next-line
        JSON.parse(`[{"content":[{"id":0,"source":"example.com"},{"id":1,"source":"example.org"}],"state":{"ready":true}}, {"content":[{"id":0,"source":"example.com"},{"id":1,"source":"example.org"}],"state":{"ready":true}}]`),
        expectedJson,
        'should remove propsToRemove -- wildcard in propsToRemove for array',
    );
});

test('JSON with Array, wildcard [] + obligatory props, should remove props', (assert) => {
    runScriptlet('json-prune', '[].content2.[].source', 'state.ready');

    const expectedJson = [
        {
            content1: [
                {
                    id: 0,
                    source: 'example.com',
                },
                {
                    id: 1,
                    source: 'example.org',
                },
            ],
            state: {
                ready: true,
            },
        },
        {
            content2: [
                { id: 0 },
                { id: 1 },
            ],
            state: {
                ready: true,
            },
        },
    ];

    assert.deepEqual(
        // eslint-disable-next-line
        JSON.parse(`[{"content1":[{"id":0,"source":"example.com"},{"id":1,"source":"example.org"}],"state":{"ready":true}}, {"content2":[{"id":0,"source":"example.com"},{"id":1,"source":"example.org"}],"state":{"ready":true}}]`),
        expectedJson,
        'should remove propsToRemove -- wildcard in propsToRemove for array',
    );
});

test('JSON with Array, should prune specific, should remove if obligatory props match', (assert) => {
    runScriptlet('json-prune', '1.content2.1.source', 'state.ready');

    const expectedJson = [
        {
            content1: [
                {
                    id: 0,
                    source: 'example.com',
                },
                {
                    id: 1,
                    source: 'example.org',
                },
            ],
            state: {
                ready: true,
            },
        },
        {
            content2: [
                {
                    id: 0,
                    source: 'example.com',
                },
                { id: 1 },
            ],
            state: {
                ready: true,
            },
        },
    ];

    assert.deepEqual(
        // eslint-disable-next-line
        JSON.parse(`[{"content1":[{"id":0,"source":"example.com"},{"id":1,"source":"example.org"}],"state":{"ready":true}}, {"content2":[{"id":0,"source":"example.com"},{"id":1,"source":"example.org"}],"state":{"ready":true}}]`),
        expectedJson,
        'should remove propsToRemove -- wildcard in propsToRemove for array',
    );
});

test('JSON with Array and empty Array as first element, should remove if obligatory props match', (assert) => {
    runScriptlet('json-prune', '2.content2.1.source', 'state.ready');

    const expectedJson = [
        [],
        {
            content1: [
                {
                    id: 0,
                    source: 'example.com',
                },
                {
                    id: 1,
                    source: 'example.org',
                },
            ],
            state: {
                ready: true,
            },
        },
        {
            content2: [
                {
                    id: 0,
                    source: 'example.com',
                },
                { id: 1 },
            ],
            state: {
                ready: true,
            },
        },
    ];

    assert.deepEqual(
        // eslint-disable-next-line
        JSON.parse(`[[],{"content1":[{"id":0,"source":"example.com"},{"id":1,"source":"example.org"}],"state":{"ready":true}}, {"content2":[{"id":0,"source":"example.com"},{"id":1,"source":"example.org"}],"state":{"ready":true}}]`),
        expectedJson,
        'should remove propsToRemove -- wildcard in propsToRemove for array',
    );
});

test('JSON with Array and empty Array as first element, should remove', (assert) => {
    runScriptlet('json-prune', '2.content2.1.source');

    const expectedJson = [
        [],
        {
            content1: [
                {
                    id: 0,
                    source: 'example.com',
                },
                {
                    id: 1,
                    source: 'example.org',
                },
            ],
            state: {
                ready: true,
            },
        },
        {
            content2: [
                {
                    id: 0,
                    source: 'example.com',
                },
                { id: 1 },
            ],
            state: {
                ready: true,
            },
        },
    ];

    assert.deepEqual(
        // eslint-disable-next-line
        JSON.parse(`[[],{"content1":[{"id":0,"source":"example.com"},{"id":1,"source":"example.org"}],"state":{"ready":true}}, {"content2":[{"id":0,"source":"example.com"},{"id":1,"source":"example.org"}],"state":{"ready":true}}]`),
        expectedJson,
        'should remove propsToRemove -- wildcard in propsToRemove for array',
    );
});
