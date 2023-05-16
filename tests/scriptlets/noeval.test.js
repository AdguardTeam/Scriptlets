/* eslint-disable no-eval, no-console, no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'noeval';

const nativeEval = window.eval;
const nativeConsole = console.log;

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    window.eval = nativeEval;
    console.log = nativeConsole;
};

module(name, { beforeEach, afterEach });

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-noeval.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('AG noeval alias', (assert) => {
    runScriptlet(name);

    const evalStr = '2';

    // set assertions amount
    assert.expect(3);

    console.log = function log(input) {
        if (input.includes('trace')) {
            return;
        }
        assert.ok(input.includes(`${name}: AdGuard has prevented eval:`), 'console.hit should print info');
    };

    const evalWrapper = eval;
    const actual = evalWrapper(evalStr);

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
    assert.strictEqual(actual, undefined, 'result of eval evaluation should be undefined');
});
