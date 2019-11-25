/* global QUnit */
/* eslint-disable no-eval, no-console, no-new-func, no-underscore-dangle */
import { clearGlobalProps } from './helpers';

const { test, module } = QUnit;
const name = 'log';

const nativeConsole = console.log;

const afterEach = () => {
    console.log = nativeConsole;
    clearGlobalProps('hit', '__debugScriptlets');
};

const beforeEach = () => { };

module(name, { afterEach, beforeEach });

const evalWrapper = eval;
const TEST_ARGS = ['arg1', 'arg2'];

const runScriptlet = () => {
    const params = {
        name,
        args: TEST_ARGS,
        verbose: true,
    };
    const resultString = window.scriptlets.invoke(params);
    evalWrapper(resultString);
};

test('log scriptlet', (assert) => {
    console.log = function log(input) {
        assert.ok(input instanceof Array);
        TEST_ARGS.forEach((el) => assert.ok(input.includes(el)));
    };
    runScriptlet();
});
