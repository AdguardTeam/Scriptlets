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

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-set-cookie.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

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

    cName = '__test-cookie_allow';
    cValue = 'allow';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName) && document.cookie.includes(cValue), true, 'Cookie is set');
    clearCookie(cName);

    cName = '__test-cookie_deny';
    cValue = 'deny';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName) && document.cookie.includes(cValue), true, 'Cookie is set');
    clearCookie(cName);

    cName = '__test-cookie_dENy';
    cValue = 'dENy';
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

    cName = '__test-cookie_on';
    cValue = 'on';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName) && document.cookie.includes(cValue), true, 'Cookie is set');
    clearCookie(cName);

    cName = '__test-cookie_off';
    cValue = 'off';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName) && document.cookie.includes(cValue), true, 'Cookie is set');
    clearCookie(cName);

    cName = '__test-cookie_accepted';
    cValue = 'accepted';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName) && document.cookie.includes(cValue), true, 'Cookie is set');
    clearCookie(cName);

    cName = '__test-cookie_notaccepted';
    cValue = 'notaccepted';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName) && document.cookie.includes(cValue), true, 'Cookie is set');
    clearCookie(cName);

    cName = '__test-cookie_rejected';
    cValue = 'rejected';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName) && document.cookie.includes(cValue), true, 'Cookie is set');
    clearCookie(cName);

    cName = '__test-cookie_allowed';
    cValue = 'allowed';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName) && document.cookie.includes(cValue), true, 'Cookie is set');
    clearCookie(cName);

    cName = '__test-cookie_disallow';
    cValue = 'disallow';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName) && document.cookie.includes(cValue), true, 'Cookie is set');
    clearCookie(cName);

    cName = '__test-cookie_enable';
    cValue = 'enable';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName) && document.cookie.includes(cValue), true, 'Cookie is set');
    clearCookie(cName);

    cName = '__test-cookie_enabled';
    cValue = 'enabled';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName) && document.cookie.includes(cValue), true, 'Cookie is set');
    clearCookie(cName);

    cName = '__test-cookie_disable';
    cValue = 'disable';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName) && document.cookie.includes(cValue), true, 'Cookie is set');
    clearCookie(cName);

    cName = '__test-cookie_disabled';
    cValue = 'disabled';
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
