/* global QUnit */
/* eslint-disable no-eval, no-console */
const { test, module, testDone } = QUnit;
const name = 'prevent-eval-if';

module(name);

const nativeEval = window.eval;

const hit = () => {
    window.hit = 'FIRED';
};

const runScriptlet = (name, search) => {
    const params = {
        name,
        args: [search],
        hit,
    };
    const resultString = window.scriptlets.invoke(params);
    nativeEval(resultString);
};

const clearProperties = (...props) => {
    props.forEach((prop) => {
        delete window[prop];
    });
};

testDone(() => {
    clearProperties('hit');
    window.eval = nativeEval;
});

test('ubo noeval-if.js alias', (assert) => {
    runScriptlet('noeval-if.js', 'test');

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
