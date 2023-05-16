/* eslint-disable no-eval, no-console, no-new-func, no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'log-eval';

const nativeEval = window.eval;
const nativeFunction = window.Function;
const nativeConsole = console.log;

const afterEach = () => {
    window.Function = nativeFunction;
    console.log = nativeConsole;
    window.eval = nativeEval;
    clearGlobalProps('hit', '__debug');
};

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

module(name, { afterEach, beforeEach });

test('logs eval calls', (assert) => {
    const agLogEval = 'agLogEval';

    const evalStr = `(function () {window.${agLogEval} = 'changed';})()`;

    console.log = function log(input) {
        if (input.includes('trace')) {
            return;
        }
        assert.strictEqual(input, `${name}: eval("${evalStr}")`, 'console.hit input should be equal');
    };
    runScriptlet(name);
    const evalWrap = eval;
    evalWrap(evalStr);
    assert.strictEqual(window[agLogEval], 'changed', 'function in eval executed as expected');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');

    clearGlobalProps(agLogEval);
});

test('logs new Function() calls', (assert) => {
    const agLogFunction = 'agLogFunction';

    const args = ['propName', 'propValue', 'window[propName] = propValue'];

    console.log = function log(input) {
        if (input.includes('trace')) {
            return;
        }
        assert.strictEqual(input, `${name}: new Function(${args.join(', ')})`, 'console.hit input should be equal');
    };

    runScriptlet(name);
    const func = new Function(...args);
    func(agLogFunction, 'changed');

    assert.strictEqual(window[agLogFunction], 'changed', 'function in function call executed as expected');
    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
    clearGlobalProps(agLogFunction);
});
