/* eslint-disable no-eval, no-console, no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'prevent-eval-if';

const nativeEval = window.eval;

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
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
        name: 'ubo-noeval-if.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('AG prevent-eval-if works', (assert) => {
    runScriptlet(name, ['/\\(.*test.*\\(\\)/']);

    const agPreventEvalIf = 'agPreventEvalIf';

    const evalWrapper = eval;
    const firstActual = evalWrapper(`(function () {return '${agPreventEvalIf}'})()`);
    assert.strictEqual(window.hit, undefined, 'hit function should not fire for not matched function');
    assert.strictEqual(firstActual, agPreventEvalIf, 'result of eval evaluation should exist');

    const secondActual = evalWrapper(`(function () {const test = 0; return '${agPreventEvalIf}'})()`);
    assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
    assert.strictEqual(secondActual, undefined, 'result of eval evaluation should be undefined');
});

test('does not work -- invalid regexp pattern', (assert) => {
    runScriptlet(name, ['/\\/']);

    const agPreventEvalIf = 'agPreventEvalIf';

    const evalWrapper = eval;
    const firstActual = evalWrapper(`(function () {return '${agPreventEvalIf}'})()`);
    assert.strictEqual(window.hit, undefined, 'hit function should not fire');
    assert.strictEqual(firstActual, agPreventEvalIf, 'result of eval evaluation should exist');
});
