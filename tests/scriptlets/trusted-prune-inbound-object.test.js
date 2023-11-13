/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-prune-inbound-object';

// It's used in tests which check if console.log was called to exclude puppeteer logs
// otherwise it will stuck in infinite loop
const PUPPETEER_MARKER = '"qunit_puppeteer_runner_log"';

const nativeConsole = console.log;
const nativeStringify = JSON.stringify;
const nativeObjKeys = Object.keys;
const nativeObjGetOwnPropNames = Object.getOwnPropertyNames;
const nativeSeal = Object.seal;
// eslint-disable-next-line no-eval
const nativeEval = eval;

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    console.log = nativeConsole;
    JSON.stringify = nativeStringify;
    Object.keys = nativeObjKeys;
    Object.getOwnPropertyNames = nativeObjGetOwnPropNames;
    Object.seal = nativeSeal;
    // eslint-disable-next-line no-eval
    window.eval = nativeEval;
};

module(name, { beforeEach, afterEach });

test('logs matched object and hostname if invoked with only first arg - JSON.stringify', (assert) => {
    console.log('This is a test');
    assert.expect(2);
    console.log = (...args) => {
        if (args.length === 1 && !args[0].includes(PUPPETEER_MARKER)) {
            assert.ok(args[0].includes(window.location.hostname), 'should log hostname in console');
            assert.ok(args[0].includes('"abcdef": 1'), 'should log parameters in console');
        }
        nativeConsole(...args);
    };
    runScriptlet(name, ['JSON.stringify']);
    JSON.stringify({ abcdef: 1 });
});

test('logs matched object and hostname if invoked with only first and third arg - JSON.stringify', (assert) => {
    assert.expect(4);
    console.log = (...args) => {
        if (args.length === 1 && !args[0].includes(PUPPETEER_MARKER)) {
            assert.ok(args[0].includes(window.location.hostname), 'should log hostname in console');
            assert.ok(args[0].includes('"testLog": 1'), 'should log parameters in console');
            assert.notOk(args[0].includes('doNotLog'), 'should not log parameters in console');
        }
        nativeConsole(...args);
    };

    runScriptlet(name, ['JSON.stringify', '', 'zx']);
    assert.deepEqual(
        JSON.stringify({ zx: { testLog: 1 }, y: 2 }),
        '{"zx":{"testLog":1},"y":2}',
        'content should not be pruned, only logged',
    );

    JSON.stringify({ asdfg: { doNotLog: 1 }, y: 2 });
});

test('removes propsToRemove - Object.getOwnPropertyNames, Object.keys , eval', (assert) => {
    runScriptlet(name, ['Object.getOwnPropertyNames', 'c']);
    assert.deepEqual(
        Object.getOwnPropertyNames({ a: 1, b: 2, c: 3 }),
        ['a', 'b'], 'should remove single propsToRemove',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

    runScriptlet(name, ['Object.keys', 'ads foo']);
    assert.deepEqual(
        Object.keys({ q: 1, ads: true, foo: 'bar' }),
        ['q'], 'should remove multiple propsToRemove',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

    runScriptlet(name, ['eval', 'ads foo']);
    assert.deepEqual(
        // eslint-disable-next-line no-eval
        eval({ q: 1, ads: true, foo: 'bar' }),
        { q: 1 }, 'should remove multiple propsToRemove',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('removes propsToRemove if requiredInitialProps are specified - JSON.stringify', (assert) => {
    runScriptlet(name, ['JSON.stringify', 'y', 'y']);
    assert.deepEqual(
        JSON.stringify({ z: 1, y: 2 }),
        '{"z":1}',
        'should remove propsToRemove if equals to requiredInitialProps',
    );
    runScriptlet(name, ['JSON.stringify', 'test', 'qwerty']);
    assert.deepEqual(
        JSON.stringify({ test: 1, qwerty: 2 }),
        '{"qwerty":2}',
        'should remove propsToRemove if single requiredInitialProps is specified',
    );
});

test('removes propsToRemove + stack match - Object.seal', (assert) => {
    const stackMatch = 'helloThere';

    runScriptlet(name, ['Object.seal', 'c', '', stackMatch]);

    const helloThere = () => Object.seal({ a: 1, b: 2, c: 3 });
    const result = helloThere();

    assert.deepEqual(
        result,
        { a: 1, b: 2 },
        'stack match: should remove single propsToRemove',
    );
});

test('can NOT remove propsToRemove because of no stack match - Object.seal', (assert) => {
    const stackNoMatch = 'no_match.js';

    runScriptlet(name, ['Object.seal', 'c', '', stackNoMatch]);
    assert.deepEqual(
        Object.seal({ a: 1, b: 2, c: 3 }),
        { a: 1, b: 2, c: 3 },
        'stack match: should remove single propsToRemove',
    );
});
