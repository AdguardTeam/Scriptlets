/* eslint-disable no-eval, no-console, no-underscore-dangle */
import { clearGlobalProps, runRedirect } from '../helpers';

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
        name: 'ubo-silent-noeval.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.redirects.getCode(adgParams);
    const codeByUboParams = window.scriptlets.redirects.getCode(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('AG noeval alias', (assert) => {
    runRedirect(name);

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

    assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
    assert.strictEqual(actual, undefined, 'result of eval evaluation should be undefined');
});
