/* eslint-disable no-underscore-dangle, no-console, no-eval */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'evaldata-prune';

const nativeEval = eval;
const nativeConsole = console.log;

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    console.log = nativeConsole;
    window.eval = nativeEval;
};

module(name, { beforeEach, afterEach });

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'evaldata-prune.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('removes propsToRemove', (assert) => {
    runScriptlet(name, ['c']);

    assert.deepEqual(eval({ a: 1, b: 2, c: 3 }), { a: 1, b: 2 }, 'should remove single propsToRemove');

    runScriptlet(name, ['b c']);
    assert.deepEqual(eval({ a: 1, b: 2, c: 3 }), { a: 1 }, 'should remove multiple propsToRemove');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('removes property only if it exists in the object', (assert) => {
    runScriptlet(name, ['b c']);
    assert.deepEqual(eval({ a: 1, b: 2 }), { a: 1 }, 'should remove only existing in the object property');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('removes nested propsToRemove 1', (assert) => {
    runScriptlet(name, ['nested.b']);
    assert.deepEqual(
        eval({ nested: { a: 1, b: 2 } }),
        { nested: { a: 1 } },
        'should remove single nested propsToRemove',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('removes nested propsToRemove 2', (assert) => {
    runScriptlet(name, ['nested.c nested.b']);
    assert.deepEqual(
        eval({ nested: { a: 1, b: 2, c: 3 } }),
        { nested: { a: 1 } },
        'should remove multiple nested propsToRemove',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('removes nested propsToRemove 3', (assert) => {
    runScriptlet(name, ['nested.b nested.inner.x']);
    assert.deepEqual(eval({ nested: { a: 1, b: 2, inner: { x: true, y: false } } }),
        { nested: { a: 1, inner: { y: false } } }, 'should remove multiple nested propsToRemove');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('removes nested propsToRemove 4', (assert) => {
    runScriptlet(name, ['nested.b.b1']);
    assert.deepEqual(
        eval({ nested: { a: 1, b: { b1: 11, b2: 22 } } }),
        { nested: { a: 1, b: { b2: 22 } } },
        'should remove single nested propsToRemove',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('removes propsToRemove with wildcard', (assert) => {
    runScriptlet(name, ['x.*.ad']);
    assert.deepEqual(
        eval({ x: { 0: { ad: 0, preview: true } } }),
        { x: { 0: { preview: true } } },
        'should remove propsToRemove with wildcard in the middle - single',
    );
    runScriptlet(name, ['a.b.*']);
    assert.deepEqual(
        eval({ a: { b: { c1: 1, c2: 2 }, bb: { cc1: 11, cc2: 22 } } }),
        { a: { b: {}, bb: { cc1: 11, cc2: 22 } } },
        'should remove propsToRemove with wildcard at the end',
    );
    runScriptlet(name, ['*.ad']);
    assert.deepEqual(
        // eslint-disable-next-line
        eval({ 0: { media: { id: 0, src: 0 }, ad: { id: 0, src: 0 } }, 1: { media: { id: 1, src: 1 }, ad: { id: 1, src: 1 } } }),
        { 0: { media: { id: 0, src: 0 } }, 1: { media: { id: 1, src: 1 } } },
        'should remove propsToRemove with wildcard at the start',
    );
});

test('can NOT remove nested propsToRemove if parental parameter is absent in the object', (assert) => {
    runScriptlet(name, ['nested.test']);
    assert.deepEqual(
        eval({ a: 0, messed: { b: 1, c: 2 } }),
        { a: 0, messed: { b: 1, c: 2 } },
        'should  NOT remove single nested propsToRemove',
    );
    runScriptlet(name, ['nested.b inner.x']);
    assert.deepEqual(eval({ messed: { a: 1, b: 2, inner: { x: true, y: false } } }),
        { messed: { a: 1, b: 2, inner: { x: true, y: false } } }, 'should NOT remove multiple nested propsToRemove');
    runScriptlet(name, ['test.a.bb']);
    assert.deepEqual(eval({ nested: true }), { nested: true }, `should NOT remove any nested propsToRemove
        and should NOT fail while operating propsToRemove with 2 or more levels of nesting`);
});

test('can NOT remove any propsToRemove if requiredInitialProps are absent in the object', (assert) => {
    runScriptlet(name, ['x', 'requiredInitialProps']);
    assert.deepEqual(
        eval({ x: 1 }),
        { x: 1 },
        'should NOT remove propsToRemove if single requiredInitialProps is absent in the object',
    );
    runScriptlet(name, ['x y', 'requiredInitialProps']);
    assert.deepEqual(
        eval({ x: 1, y: 2 }),
        { x: 1, y: 2 },
        'should NOT remove multiple propsToRemove if single requiredInitialProps is absent in the object',
    );
    runScriptlet(name, ['x y', 'z y x v']);
    assert.deepEqual(
        eval(
            {
                w: 0, z: 1, y: 2, x: 3,
            },
        ),
        {
            w: 0, z: 1, y: 2, x: 3,
        }, 'should remove propsToRemove if one of requiredInitialProps is absent',
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
    runScriptlet(name);
    eval({ a: 1, b: 2 });
});

test('removes propsToRemove + stack match', (assert) => {
    const firstStackMatch = 'testForFirstStackMatch';
    const secondStackMatch = 'testForSecondStackMatch';

    runScriptlet(name, ['c', '', firstStackMatch]);

    const testForFirstStackMatch = () => eval({ a: 1, b: 2, c: 3 });
    const firstResult = testForFirstStackMatch();

    assert.deepEqual(
        firstResult,
        { a: 1, b: 2 },
        'stack match: should remove single propsToRemove',
    );

    runScriptlet(name, ['nested.c nested.b', '', secondStackMatch]);
    const testForSecondStackMatch = () => eval({ nested: { a: 1, b: 2, c: 3 } });
    const secondResult = testForSecondStackMatch();

    assert.deepEqual(
        secondResult,
        { nested: { a: 1 } },
        'stack match: should remove multiple nested propsToRemove',
    );
});

test('can NOT remove propsToRemove because of no stack match', (assert) => {
    const stackNoMatch = 'no_match.js';

    runScriptlet(name, ['x', '', stackNoMatch]);
    assert.deepEqual(eval({ x: 1 }), { x: 1 }, 'should NOT remove propsToRemove if there in no stack match');
});

test('logs null', (assert) => {
    assert.expect(2);
    console.log = (message) => {
        assert.ok(message.includes(window.location.hostname), 'should log hostname in console');
        assert.ok(message.includes('null'), 'should log parameters in console');
        nativeConsole(message);
    };
    runScriptlet(name);
    eval(null);
});
