/* eslint-disable no-eval, no-underscore-dangle */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'set-cookie-reload';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
};

module(name, { beforeEach, afterEach });

const evalWrapper = eval;

const runScriptlet = (name, ...args) => {
    const params = {
        name,
        args,
        verbose: true,
    };
    const resultString = window.scriptlets.invoke(params);
    evalWrapper(resultString);
};

test('Set cookie with valid value', (assert) => {
    // TODO: add set-cookie same tests after the task:
    // Divide tests to execute one test per page
    // cause reloading hangs tests executing
    assert.strictEqual(true, true, 'fake test to avoid qunit error');
});

test('Set cookie with invalid value', (assert) => {
    let cName = '__test2-cookie_approved';
    let cValue = 'approved';
    runScriptlet(name, cName, cValue);
    assert.strictEqual(window.hit, undefined, 'Hit was not fired');
    assert.strictEqual(document.cookie.includes(cName), false, 'Cookie has not been set');
    assert.strictEqual(document.cookie.includes(cValue), false, 'Cookie has not been set');

    cName = '__test2-cookie_dismiss';
    cValue = 'dismiss';
    runScriptlet(name, cName, cValue);
    assert.strictEqual(window.hit, undefined, 'Hit was not fired');
    assert.strictEqual(document.cookie.includes(cName), false, 'Cookie has not been set');
    assert.strictEqual(document.cookie.includes(cValue), false, 'Cookie has not been set');

    cName = '__test2-cookie_pcbc';
    cValue = '_pcbc';
    runScriptlet(name, cName, cValue);
    assert.strictEqual(window.hit, undefined, 'Hit was not fired');
    assert.strictEqual(document.cookie.includes(cName), false, 'Cookie has not been set');
    assert.strictEqual(document.cookie.includes(cValue), false, 'Cookie has not been set');
});
