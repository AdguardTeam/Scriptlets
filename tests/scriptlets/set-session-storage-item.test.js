/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps, isSafariBrowser } from '../helpers';

const { test, module } = QUnit;
const name = 'set-session-storage-item';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
};

module(name, { beforeEach, afterEach });

const clearStorageItem = (cName) => {
    window.sessionStorage.removeItem(cName);
};

if (isSafariBrowser()) {
    // TODO: fix for safari 10
    test('unsupported', (assert) => {
        assert.ok(true, 'does not work in Safari 10 while browserstack auto tests run');
    });
} else {
    test('Set sessionStorage key with valid value', (assert) => {
        let cName = '__test-item_true';
        let cValue = 'true';
        runScriptlet(name, [cName, cValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.sessionStorage.getItem(cName), 'true', 'sessionStorage item has been set');
        clearStorageItem(cName);

        cName = '__test-item_false';
        cValue = 'false';
        runScriptlet(name, [cName, cValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.sessionStorage.getItem(cName), 'false', 'sessionStorage item has been set');
        clearStorageItem(cName);

        cName = '__test-item_null';
        cValue = 'null';
        runScriptlet(name, [cName, cValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.sessionStorage.getItem(cName), 'null', 'sessionStorage item has been set');
        clearStorageItem(cName);

        cName = '__test-item_undefined';
        cValue = 'undefined';
        runScriptlet(name, [cName, cValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.sessionStorage.getItem(cName), 'undefined', 'sessionStorage item has been set');
        clearStorageItem(cName);

        cName = '__test-item_emptyObj';
        cValue = 'emptyObj';
        runScriptlet(name, [cName, cValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.sessionStorage.getItem(cName), '{}', 'sessionStorage item has been set');
        clearStorageItem(cName);

        cName = '__test-item_emptyArr';
        cValue = 'emptyArr';
        runScriptlet(name, [cName, cValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.sessionStorage.getItem(cName), '[]', 'sessionStorage item has been set');
        clearStorageItem(cName);

        cName = '__test-item_emptyStr';
        cValue = '';
        runScriptlet(name, [cName, cValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.sessionStorage.getItem(cName), '', 'sessionStorage item has been set');
        clearStorageItem(cName);

        cName = '__test-item_int';
        cValue = '15';
        runScriptlet(name, [cName, cValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.sessionStorage.getItem(cName), '15', 'sessionStorage item has been set');
        clearStorageItem(cName);

        cName = '__test-item_yes';
        cValue = 'yes';
        runScriptlet(name, [cName, cValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.sessionStorage.getItem(cName), 'yes', 'sessionStorage item has been set');
        clearStorageItem(cName);

        cName = '__test-item_no';
        cValue = 'no';
        runScriptlet(name, [cName, cValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.sessionStorage.getItem(cName), 'no', 'sessionStorage item has been set');
        clearStorageItem(cName);
    });
}

test('Set sessionStorage key with invalid value', (assert) => {
    let cName = '__test-item_arrayItem';
    let cValue = '["item"]';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, undefined, 'Hit was not fired');
    assert.strictEqual(window.sessionStorage.getItem(cName), null, 'sessionStorage item has not been set');
    clearStorageItem(cName);

    cName = '__test-item_object';
    cValue = '{"key":value"}';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, undefined, 'Hit was not fired');
    assert.strictEqual(window.sessionStorage.getItem(cName), null, 'sessionStorage item has not been set');
    clearStorageItem(cName);

    cName = '__test-item_str';
    cValue = 'test_string';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, undefined, 'Hit was not fired');
    assert.strictEqual(window.sessionStorage.getItem(cName), null, 'sessionStorage item has not been set');
    clearStorageItem(cName);

    cName = '__test-item_bigInt';
    cValue = '999999';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, undefined, 'Hit was not fired');
    assert.strictEqual(window.sessionStorage.getItem(cName), null, 'sessionStorage item has not been set');
    clearStorageItem(cName);
});

test('Remove item from sessionStorage', (assert) => {
    const cName = '__test-item_remove';
    const cValue = '$remove$';

    sessionStorage.setItem(cName, 'true');

    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(window.sessionStorage.getItem(cName), null, 'sessionStorage item has been removed');
    clearStorageItem(cName);
});
