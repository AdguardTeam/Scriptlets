/* eslint-disable no-eval, no-underscore-dangle */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'prevent-bab';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
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

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-bab-defuser.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams.toString(), codeByUboParams.toString(), 'ubo name - ok');
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
