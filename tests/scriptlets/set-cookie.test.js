/* eslint-disable no-underscore-dangle */
import {
    runScriptlet,
    clearGlobalProps,
    clearCookie,
} from '../helpers';

const { test, module } = QUnit;
const name = 'set-cookie';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
};

module(name, { beforeEach, afterEach });

test('Set cookie with valid value', (assert) => {
    let cName = '__test-cookie_OK';
    let cValue = 'OK';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName) && document.cookie.includes(cValue), true, 'Cookie is set');
    clearCookie(cName);

    cName = '__test-cookie_true';
    cValue = 'true';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName) && document.cookie.includes(cValue), true, 'Cookie is set');
    clearCookie(cName);

    cName = '__test-cookie_false';
    cValue = 'false';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName) && document.cookie.includes(cValue), true, 'Cookie is set');
    clearCookie(cName);

    cName = '__test-cookie_no';
    cValue = 'no';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName) && document.cookie.includes(cValue), true, 'Cookie is set');
    clearCookie(cName);

    cName = '__test-cookie_n';
    cValue = 'n';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName) && document.cookie.includes(cValue), true, 'Cookie is set');
    clearCookie(cName);

    cName = '__test-cookie_Accept';
    cValue = 'Accept';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName) && document.cookie.includes(cValue), true, 'Cookie is set');
    clearCookie(cName);

    cName = '__test-cookie_Reject';
    cValue = 'Reject';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName) && document.cookie.includes(cValue), true, 'Cookie is set');
    clearCookie(cName);

    cName = '__test-cookie_0';
    cValue = '0';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName) && document.cookie.includes(cValue), true, 'Cookie is set');
    clearCookie(cName);

    cName = '__test-cookie_1';
    cValue = '1';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName) && document.cookie.includes(cValue), true, 'Cookie is set');
    clearCookie(cName);
});

test('Set cookie with invalid value', (assert) => {
    let cName = '__test2-cookie_approved';
    let cValue = 'approved';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, undefined, 'Hit was not fired');
    assert.strictEqual(document.cookie.includes(cName), false, 'Cookie has not been set');
    assert.strictEqual(document.cookie.includes(cValue), false, 'Cookie has not been set');

    cName = '__test2-cookie_dismiss';
    cValue = 'dismiss';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, undefined, 'Hit was not fired');
    assert.strictEqual(document.cookie.includes(cName), false, 'Cookie has not been set');
    assert.strictEqual(document.cookie.includes(cValue), false, 'Cookie has not been set');

    cName = '__test2-cookie_pcbc';
    cValue = '_pcbc';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, undefined, 'Hit was not fired');
    assert.strictEqual(document.cookie.includes(cName), false, 'Cookie has not been set');
    assert.strictEqual(document.cookie.includes(cValue), false, 'Cookie has not been set');
});
