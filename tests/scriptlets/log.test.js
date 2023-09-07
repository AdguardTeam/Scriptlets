/* eslint-disable no-console, no-new-func, no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'log';

const nativeConsole = console.log;

const afterEach = () => {
    console.log = nativeConsole;
    clearGlobalProps('hit', '__debug');
};

const beforeEach = () => { };

module(name, { afterEach, beforeEach });

test('log scriptlet', (assert) => {
    const TEST_ARGS = ['arg1', 'arg2'];

    console.log = function log(input) {
        assert.ok(input instanceof Array);
        TEST_ARGS.forEach((el) => assert.ok(input.includes(el)));
    };

    runScriptlet(name, TEST_ARGS);
});

test('checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };

    const abpParams = {
        name: 'abp-log',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByAbpParams = window.scriptlets.invoke(abpParams);

    assert.strictEqual(codeByAdgParams, codeByAbpParams, 'abp name - ok');
});
