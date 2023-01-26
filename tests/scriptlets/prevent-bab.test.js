/* eslint-disable no-eval, no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'prevent-bab';

const testProp = 'evalProp';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps(testProp, 'hit', '__debug');
};

module(name, { beforeEach, afterEach });

test('works eval with AdblockBlock', (assert) => {
    runScriptlet(name);

    const evalWrap = eval;
    evalWrap(`(function test() { const temp = 'babasbm'; window.${testProp} = 'test';})()`);

    assert.strictEqual(window[testProp], undefined);
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
});

test('sample eval script works', (assert) => {
    runScriptlet(name);

    const evalWrap = eval;
    evalWrap(`(function test() { const temp = 'temp'; window.${testProp} = 'test';})()`);

    assert.strictEqual(window[testProp], 'test');
    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('non-string eval works', (assert) => {
    runScriptlet(name);

    const evalWrap = eval;

    assert.strictEqual(evalWrap(2), 2);
    assert.strictEqual(evalWrap(2 + 2), 4);
    assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
});

test('prevents set timeout with AdblockBlock', (assert) => {
    runScriptlet(name);

    const func = `(function test(id) {window.${testProp} = 'test'})(test.bab_elementid)`;
    setTimeout(func); // eslint-disable-line no-implied-eval

    const done = assert.async();

    setTimeout(() => {
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        assert.strictEqual(window[testProp], undefined);
        clearGlobalProps(testProp);
        done();
    }, 20);
});
