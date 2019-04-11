/* global QUnit */
/* eslint-disable no-eval, no-console */
const { test, module, testDone } = QUnit;
const name = 'noeval';

module(name);

const nativeEval = window.eval;
const nativeConsole = console.log;

const hit = (payload) => {
    console.log(payload);
    window.hit = 'FIRED';
};

const runScriptlet = (name) => {
    const params = {
        name,
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
    console.log = nativeConsole;
});

test('ubo noeval alias', (assert) => {
    runScriptlet('noeval.js');

    const evalStr = '2';

    // set assertions amount
    assert.expect(3);

    console.log = function log(input) {
        assert.ok(input.includes('AdGuard has prevented eval:'), 'console.log should print info');
    };

    const evalWrapper = eval;
    const actual = evalWrapper(evalStr);

    assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
    assert.strictEqual(actual, undefined, 'result of eval evaluation should be undefined');
});

test('ubo silent-noeval alias', (assert) => {
    runScriptlet('silent-noeval.js');

    const evalStr = '2';

    // set assertions amount
    assert.expect(3);

    console.log = function log(input) {
        assert.ok(input.includes('AdGuard has prevented eval:'), 'console.log should print info');
    };

    const evalWrapper = eval;
    const actual = evalWrapper(evalStr);

    assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
    assert.strictEqual(actual, undefined, 'result of eval evaluation should be undefined');
});


test('AG noeval alias', (assert) => {
    runScriptlet(name);

    const evalStr = '2';

    // set assertions amount
    assert.expect(3);

    console.log = function log(input) {
        assert.ok(input.includes('AdGuard has prevented eval:'), 'console.log should print info');
    };

    const evalWrapper = eval;
    const actual = evalWrapper(evalStr);

    assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
    assert.strictEqual(actual, undefined, 'result of eval evaluation should be undefined');
});
