/* global QUnit */
/* eslint-disable no-eval, no-underscore-dangle */
import { clearGlobalProps } from '../helpers';

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

const runScriptlet = (name) => {
    const params = {
        name,
        verbose: true,
    };
    const evalWrapper = eval;
    const resultString = window.scriptlets.invoke(params);
    evalWrapper(resultString);
};

test('ag and ubo aliases work', (assert) => {
    assert.expect(4);
    const nativeDefineProperty = Object.defineProperty;
    Object.defineProperty = (arg1, arg2) => {
        assert.strictEqual(arg1, window, 'Object.defineProperty should be called with window');
        assert.strictEqual(arg2, 'ysmm', 'Object.defineProperty should be called with "ysmm"');
    };

    runScriptlet(name);
    runScriptlet('ubo-adfly-defuser.js');
    Object.defineProperty = nativeDefineProperty;
});
