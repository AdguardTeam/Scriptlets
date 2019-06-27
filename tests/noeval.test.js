/* global QUnit */
/* eslint-disable no-eval, no-console, no-underscore-dangle */
import { clearGlobalProps } from './helpers';

const { test, module } = QUnit;
const name = 'noeval';

const nativeEval = window.eval;
const nativeConsole = console.log;

const beforeEach = () => {
    window.__debugScriptlets = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debugScriptlets');
    window.eval = nativeEval;
    console.log = nativeConsole;
};

module(name, { beforeEach, afterEach });

const runScriptlet = (name) => {
    const params = {
        name,
        verbose: true,
    };
    const resultString = window.scriptlets.invoke(params);
    nativeEval(resultString);
};

test('ubo noeval alias', (assert) => {
    runScriptlet('noeval.js');

    const evalStr = '2';

    console.log = function log(input) {
        nativeConsole(input);
        if (input.indexOf('trace') > -1) {
            return;
        }
        assert.ok(input.includes('AdGuard has prevented eval:'), 'console.hit should print info');
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
        if (input.indexOf('trace') > -1) {
            return;
        }
        assert.ok(input.includes('AdGuard has prevented eval:'), 'console.hit should print info');
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
        if (input.indexOf('trace') > -1) {
            return;
        }
        assert.ok(input.includes('AdGuard has prevented eval:'), 'console.hit should print info');
    };

    const evalWrapper = eval;
    const actual = evalWrapper(evalStr);

    assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
    assert.strictEqual(actual, undefined, 'result of eval evaluation should be undefined');
});
