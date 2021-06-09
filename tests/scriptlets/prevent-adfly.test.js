/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'prevent-adfly';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('__debug', 'hit');
};

module(name, { beforeEach, afterEach });

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-adfly-defuser.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('ag works', (assert) => {
    assert.expect(2);
    const nativeDefineProperty = Object.defineProperty;
    Object.defineProperty = (arg1, arg2) => {
        assert.strictEqual(arg1, window, 'Object.defineProperty should be called with window');
        assert.strictEqual(arg2, 'ysmm', 'Object.defineProperty should be called with "ysmm"');
    };

    runScriptlet(name);
    Object.defineProperty = nativeDefineProperty;
});
