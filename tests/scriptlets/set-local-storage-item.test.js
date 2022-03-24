/* eslint-disable no-underscore-dangle, max-len */
import { runScriptlet, clearGlobalProps } from '../helpers';

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

// const isLocalStorageSupported = () => {
//     try {
//         const testKey = 'test';
//         const localStorageName = 'localStorage';
//         const storage = window[localStorageName];
//         storage.setItem(testKey, '1');
//         storage.removeItem(testKey);
//         return localStorageName in window && window[localStorageName];
//     } catch (e) {
//         return false;
//     }
// };

// test('Set localStorage key with valid value', (assert) => {
//     if (isLocalStorageSupported) {
//         let cName = '__test-item_true';
//         let cValue = 'true';
//         runScriptlet(name, [cName, cValue]);
//         assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
//         assert.strictEqual(window.localStorage.getItem(cName), 'true', 'localStorage item has been set');
//         clearStorageItem(cName);

//         cName = '__test-item_false';
//         cValue = 'false';
//         runScriptlet(name, [cName, cValue]);
//         assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
//         assert.strictEqual(window.localStorage.getItem(cName), 'false', 'localStorage item has been set');
//         clearStorageItem(cName);

//         cName = '__test-item_null';
//         cValue = 'null';
//         runScriptlet(name, [cName, cValue]);
//         assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
//         assert.strictEqual(window.localStorage.getItem(cName), 'null', 'localStorage item has been set');
//         clearStorageItem(cName);

//         cName = '__test-item_undefined';
//         cValue = 'undefined';
//         runScriptlet(name, [cName, cValue]);
//         assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
//         assert.strictEqual(window.localStorage.getItem(cName), 'undefined', 'localStorage item has been set');
//         clearStorageItem(cName);

//         cName = '__test-item_emptyObj';
//         cValue = 'emptyObj';
//         runScriptlet(name, [cName, cValue]);
//         assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
//         assert.strictEqual(window.localStorage.getItem(cName), '{}', 'localStorage item has been set');
//         clearStorageItem(cName);

//         cName = '__test-item_emptyArr';
//         cValue = 'emptyArr';
//         runScriptlet(name, [cName, cValue]);
//         assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
//         assert.strictEqual(window.localStorage.getItem(cName), '[]', 'localStorage item has been set');
//         clearStorageItem(cName);

//         cName = '__test-item_emptyStr';
//         cValue = '';
//         runScriptlet(name, [cName, cValue]);
//         assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
//         assert.strictEqual(window.localStorage.getItem(cName), '', 'localStorage item has been set');
//         clearStorageItem(cName);

//         cName = '__test-item_int';
//         cValue = '15';
//         runScriptlet(name, [cName, cValue]);
//         assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
//         assert.strictEqual(window.localStorage.getItem(cName), '15', 'localStorage item has been set');
//         clearStorageItem(cName);
//     } else {
//         assert.ok(true, 'test is not supported');
//     }
// });

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
