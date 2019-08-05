/* global QUnit */
/* eslint-disable no-eval, no-console, no-underscore-dangle */
import { clearGlobalProps } from './helpers';

const { test, module } = QUnit;
const name = 'prevent-eval-if';

const nativeEval = window.eval;

const beforeEach = () => {
    window.__debugScriptlets = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debugScriptlets');
    window.eval = nativeEval;
};

module(name, { beforeEach, afterEach });

const runScriptlet = (name, search) => {
    const params = {
        name,
        args: [search],
        verbose: true,
    };
    const resultString = window.scriptlets.invoke(params);
    nativeEval(resultString);
};

test('ubo noeval-if.js alias', (assert) => {
    runScriptlet('ubo-noeval-if.js', 'test');

    const uboNoEvalIf = 'uboNoEvalIf';

    const evalWrapper = eval;
    const firstActual = evalWrapper(`(function () {return '${uboNoEvalIf}'})()`);
    assert.strictEqual(window.hit, undefined, 'hit function should not fire for not matched function');
    assert.strictEqual(firstActual, uboNoEvalIf, 'result of eval evaluation should exist');

    const secondActual = evalWrapper(`(function () {const test = 0; return '${uboNoEvalIf}'})()`);
    assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
    assert.strictEqual(secondActual, undefined, 'result of eval evaluation should be undefined');
});


test('AG prevent-eval-if', (assert) => {
    runScriptlet(name, '/\\(.*test.*\\(\\)/');

    const agPreventEvalIf = 'agPreventEvalIf';

    const evalWrapper = eval;
    const firstActual = evalWrapper(`(function () {return '${agPreventEvalIf}'})()`);
    assert.strictEqual(window.hit, undefined, 'hit function should not fire for not matched function');
    assert.strictEqual(firstActual, agPreventEvalIf, 'result of eval evaluation should exist');

    const secondActual = evalWrapper(`(function () {const test = 0; return '${agPreventEvalIf}'})()`);
    assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
    assert.strictEqual(secondActual, undefined, 'result of eval evaluation should be undefined');
});
