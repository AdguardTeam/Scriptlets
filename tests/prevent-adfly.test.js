/* global QUnit */
/* eslint-disable no-eval */
import { clearProperties } from './helpers';

const { test, module, testDone } = QUnit;
const name = 'prevent-adfly';

module(name);

const hit = () => {
    window.hit = 'FIRED';
};

const runScriptlet = (name) => {
    const params = {
        name,
        hit,
    };
    const evalWrapper = eval;
    const resultString = window.scriptlets.invoke(params);
    evalWrapper(resultString);
};

testDone(() => {
    clearProperties('hit');
});

test('ag and ubo aliases work', (assert) => {
    assert.expect(4);
    const nativeDefineProperty = Object.defineProperty;
    Object.defineProperty = (arg1, arg2) => {
        assert.strictEqual(arg1, window, 'Object.defineProperty should be called with window');
        assert.strictEqual(arg2, 'ysmm', 'Object.defineProperty should be called with "ysmm"');
    };

    runScriptlet(name);
    runScriptlet('adfly-defuser.js');
    Object.defineProperty = nativeDefineProperty;
});
