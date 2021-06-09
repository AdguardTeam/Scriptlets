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
