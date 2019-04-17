/* global QUnit */
/* eslint-disable no-eval, no-console, no-new-func */
import { clearProperties } from './helpers';

const { test, module, testDone } = QUnit;
const name = 'log-eval';

module(name);

const evalWrapper = eval;

const runScriptlet = (hit) => {
    const params = {
        name,
        hit,
    };
    const resultString = window.scriptlets.invoke(params);
    evalWrapper(resultString);
};

const nativeEval = window.eval;
const nativeFunction = window.Function;
const nativeConsole = console.log;

const hit = () => {
    window.hit = 'FIRED';
};

testDone(() => {
    window.Function = nativeFunction;
    console.log = nativeConsole;
    window.eval = nativeEval;
});

test('logs eval calls', (assert) => {
    const agLogEval = 'agLogEval';

    const evalStr = `(function () {window.${agLogEval} = 'changed';})()`;

    console.log = function log(input) {
        assert.strictEqual(input, `eval("${evalStr}")`, 'console.log input should be equal');
    };
    runScriptlet(hit);
    const evalWrap = eval;
    evalWrap(evalStr);
    assert.strictEqual(window[agLogEval], 'changed', 'function in eval executed as expected');
    assert.strictEqual(window.hit, 'FIRED', 'scriptlet hit applied');

    clearProperties('hit', agLogEval);
});

test('logs new Function() calls', (assert) => {
    const agLogFunction = 'agLogFunction';

    const args = ['propName', 'propValue', 'window[propName] = propValue'];

    console.log = function log(input) {
        assert.strictEqual(input, `new Function(${args.join(', ')})`, 'console.log input should be equal');
    };

    runScriptlet(hit);
    const func = new Function(...args);
    func(agLogFunction, 'changed');

    assert.strictEqual(window[agLogFunction], 'changed', 'function in function call executed as expected');
    assert.strictEqual(window.hit, 'FIRED', 'scriptlet hit applied');
    clearProperties('hit', agLogFunction);
});
