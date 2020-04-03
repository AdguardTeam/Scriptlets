/* global QUnit */
/* eslint-disable no-eval, no-underscore-dangle */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'prevent-bab';

const beforeEach = () => {
    window.__debugScriptlets = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debugScriptlets');
};

module(name, { beforeEach, afterEach });

const evalWrapper = eval;

const runScriptlet = (name) => {
    const params = {
        name,
        verbose: true,
    };
    const resultString = window.scriptlets.invoke(params);
    evalWrapper(resultString);
};

test('ubo alias works', (assert) => {
    runScriptlet('ubo-bab-defuser.js');

    const evalProp = 'evalProp';

    const evalWrap = eval;

    evalWrap(`(function test() { const temp = 'blockadblock'; window.${evalProp} = 'test';})()`);

    assert.strictEqual(window[evalProp], undefined);
    assert.strictEqual(window.hit, 'FIRED');
    clearGlobalProps(evalProp);
});

test('works eval with AdblockBlock', (assert) => {
    runScriptlet('prevent-bab');

    const evalProp = 'evalProp';

    const evalWrap = eval;

    evalWrap(`(function test() { const temp = 'babasbm'; window.${evalProp} = 'test';})()`);

    assert.strictEqual(window[evalProp], undefined);
    assert.strictEqual(window.hit, 'FIRED');
    clearGlobalProps(evalProp);
});

test('sample eval script works', (assert) => {
    runScriptlet('prevent-bab');

    const evalProp = 'evalProp';

    const evalWrap = eval;

    evalWrap(`(function test() { const temp = 'temp'; window.${evalProp} = 'test';})()`);

    assert.strictEqual(window[evalProp], 'test');
    assert.strictEqual(window.hit, undefined);
    clearGlobalProps(evalProp);
});

test('prevents set timeout with AdblockBlock', (assert) => {
    runScriptlet('prevent-bab');
    const timeoutProp = 'timeoutProp';
    const func = `(function test(id) {window.${timeoutProp} = 'test'})(test.bab_elementid)`;
    setTimeout(func);

    const done = assert.async();

    setTimeout(() => {
        assert.strictEqual(window.hit, 'FIRED');
        assert.strictEqual(window[timeoutProp], undefined);
        clearGlobalProps(timeoutProp);
        done();
    }, 20);
});
