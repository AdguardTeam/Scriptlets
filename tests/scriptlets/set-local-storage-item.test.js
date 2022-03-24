/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps, isSafariBrowser } from '../helpers';

const { test, module } = QUnit;
const name = 'set-local-storage-item';

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
    window.localStorage.removeItem(cName);
};

if (isSafariBrowser()) {
    // TODO: fix for safari 10
    test('unsupported', (assert) => {
        assert.ok(true, 'does not work in Safari 10 while browserstack auto tests run');
    });
} else {
    test('Set localStorage key with valid value', (assert) => {
        let cName = '__test-item_true';
        let cValue = 'true';
        runScriptlet(name, [cName, cValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(cName), 'true', 'localStorage item has been set');
        clearStorageItem(cName);

        cName = '__test-item_false';
        cValue = 'false';
        runScriptlet(name, [cName, cValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(cName), 'false', 'localStorage item has been set');
        clearStorageItem(cName);

        cName = '__test-item_null';
        cValue = 'null';
        runScriptlet(name, [cName, cValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(cName), 'null', 'localStorage item has been set');
        clearStorageItem(cName);

        cName = '__test-item_undefined';
        cValue = 'undefined';
        runScriptlet(name, [cName, cValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(cName), 'undefined', 'localStorage item has been set');
        clearStorageItem(cName);

        cName = '__test-item_emptyObj';
        cValue = 'emptyObj';
        runScriptlet(name, [cName, cValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(cName), '{}', 'localStorage item has been set');
        clearStorageItem(cName);

        cName = '__test-item_emptyArr';
        cValue = 'emptyArr';
        runScriptlet(name, [cName, cValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(cName), '[]', 'localStorage item has been set');
        clearStorageItem(cName);

        cName = '__test-item_emptyStr';
        cValue = '';
        runScriptlet(name, [cName, cValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(cName), '', 'localStorage item has been set');
        clearStorageItem(cName);

        cName = '__test-item_int';
        cValue = '15';
        runScriptlet(name, [cName, cValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(cName), '15', 'localStorage item has been set');
        clearStorageItem(cName);
    });
}

test('Set localStorage key with invalid value', (assert) => {
    let cName = '__test-item_arrayItem';
    let cValue = '["item"]';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, undefined, 'Hit was not fired');
    assert.strictEqual(window.localStorage.getItem(cName), null, 'localStorage item has not been set');
    clearStorageItem(cName);

    cName = '__test-item_object';
    cValue = '{"key":value"}';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, undefined, 'Hit was not fired');
    assert.strictEqual(window.localStorage.getItem(cName), null, 'localStorage item has not been set');
    clearStorageItem(cName);

    cName = '__test-item_str';
    cValue = 'test_string';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, undefined, 'Hit was not fired');
    assert.strictEqual(window.localStorage.getItem(cName), null, 'localStorage item has not been set');
    clearStorageItem(cName);

    cName = '__test-item_bigInt';
    cValue = '999999';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, undefined, 'Hit was not fired');
    assert.strictEqual(window.localStorage.getItem(cName), null, 'localStorage item has not been set');
    clearStorageItem(cName);
});
