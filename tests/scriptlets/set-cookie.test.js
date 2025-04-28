/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps, clearCookie } from '../helpers';

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

const cookies = [
    ['__test-cookie_OK', 'OK'],
    ['__test-cookie_true', 'true'],
    ['__test-cookie_true', 't'],
    ['__test-cookie_false', 'false'],
    ['__test-cookie_false', 'f'],
    ['__test-cookie_no', 'no'],
    ['__test-cookie_n', 'n'],
    ['__test-cookie_Accept', 'Accept'],
    ['__test-cookie_Reject', 'Reject'],
    ['__test-cookie_allow', 'allow'],
    ['__test-cookie_deny', 'deny'],
    ['__test-cookie_dENy', 'dENy'],
    ['__test-cookie_0', '0'],
    ['__test-cookie_1', '1'],
    ['__test-cookie_on', 'on'],
    ['__test-cookie_off', 'off'],
    ['__test-cookie_accepted', 'accepted'],
    ['__test-cookie_notaccepted', 'notaccepted'],
    ['__test-cookie_rejected', 'rejected'],
    ['__test-cookie_allowed', 'allowed'],
    ['__test-cookie_disallow', 'disallow'],
    ['__test-cookie_enable', 'enable'],
    ['__test-cookie_enabled', 'enabled'],
    ['__test-cookie_disable', 'disable'],
    ['__test-cookie_disabled', 'disabled'],
    ['__test-cookie_necessary', 'necessary'],
    ['__test-cookie_required', 'required'],
    ['__test-cookie_hide', 'hide'],
    ['__test-cookie_hidden', 'hidden'],
    ['__test-cookie_essential', 'essential'],
    ['__test-cookie_nonessential', 'nonessential'],
    ['__test-cookie_checked', 'checked'],
    ['__test-cookie_unchecked', 'unchecked'],
    ['__test-cookie_forbidden', 'forbidden'],
    ['__test-cookie_forever', 'forever'],
    ['__test-cookie_emptyArray', 'emptyArr'],
    ['__test-cookie_emptyObject', 'emptyObj'],
];

test.each('Set cookie with valid value', cookies, (assert, [cName, cValue]) => {
    const emptyArrValue = '[]';
    const emptyObjValue = '{}';

    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    switch (cValue) {
        case 'emptyArr':
            assert.strictEqual(
                document.cookie.includes(cName)
                && document.cookie.includes(emptyArrValue),
                true,
                'Cookie is set',
            );
            break;
        case 'emptyObj':
            assert.strictEqual(
                document.cookie.includes(cName)
                && document.cookie.includes(emptyObjValue),
                true,
                'Cookie is set');
            break;
        default:
            assert.strictEqual(
                document.cookie.includes(cName)
                && document.cookie.includes(cValue),
                true,
                'Cookie is set',
            );
    }
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
