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

const clearStorageItem = (iName) => {
    window.localStorage.removeItem(iName);
};

if (isSafariBrowser()) {
    // TODO: fix for safari 10
    test('unsupported', (assert) => {
        assert.ok(true, 'does not work in Safari 10 while browserstack auto tests run');
    });
} else {
    test('Checking if alias name works', (assert) => {
        const adgParams = {
            name,
            engine: 'test',
            verbose: true,
        };
        const uboParams = {
            name: 'ubo-set-local-storage-item.js',
            engine: 'test',
            verbose: true,
        };

        const codeByAdgParams = window.scriptlets.invoke(adgParams);
        const codeByUboParams = window.scriptlets.invoke(uboParams);

        assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
    });

    test('Set localStorage key with valid value', (assert) => {
        let iName = '__test-item_true';
        let iValue = 'true';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(iName), 'true', 'localStorage item has been set');
        clearStorageItem(iName);

        iName = '__test-item_false';
        iValue = 'false';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(iName), 'false', 'localStorage item has been set');
        clearStorageItem(iName);

        iName = '__test-item_null';
        iValue = 'null';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(iName), 'null', 'localStorage item has been set');
        clearStorageItem(iName);

        iName = '__test-item_undefined';
        iValue = 'undefined';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(iName), 'undefined', 'localStorage item has been set');
        clearStorageItem(iName);

        iName = '__test-item_emptyObj';
        iValue = 'emptyObj';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(iName), '{}', 'localStorage item has been set');
        clearStorageItem(iName);

        iName = '__test-item_emptyArr';
        iValue = 'emptyArr';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(iName), '[]', 'localStorage item has been set');
        clearStorageItem(iName);

        iName = '__test-item_emptyStr';
        iValue = '';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(iName), '', 'localStorage item has been set');
        clearStorageItem(iName);

        iName = '__test-item_int';
        iValue = '15';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(iName), '15', 'localStorage item has been set');
        clearStorageItem(iName);

        iName = '__test-item_yes';
        iValue = 'yes';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(iName), 'yes', 'localStorage item has been set');
        clearStorageItem(iName);

        iName = '__test-item_no';
        iValue = 'no';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(iName), 'no', 'localStorage item has been set');
        clearStorageItem(iName);
    });

    test('Set localStorage key with invalid value', (assert) => {
        let iName = '__test-item_arrayItem';
        let iValue = '["item"]';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, undefined, 'Hit was not fired');
        assert.strictEqual(window.localStorage.getItem(iName), null, 'localStorage item has not been set');
        clearStorageItem(iName);

        iName = '__test-item_object';
        iValue = '{"key":value"}';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, undefined, 'Hit was not fired');
        assert.strictEqual(window.localStorage.getItem(iName), null, 'localStorage item has not been set');
        clearStorageItem(iName);

        iName = '__test-item_str';
        iValue = 'test_string';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, undefined, 'Hit was not fired');
        assert.strictEqual(window.localStorage.getItem(iName), null, 'localStorage item has not been set');
        clearStorageItem(iName);

        iName = '__test-item_bigInt';
        iValue = '999999';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, undefined, 'Hit was not fired');
        assert.strictEqual(window.localStorage.getItem(iName), null, 'localStorage item has not been set');
        clearStorageItem(iName);
    });

    test('Remove item from localStorage', (assert) => {
        const iName = '__test-item_remove';
        const iValue = '$remove$';

        localStorage.setItem(iName, 'true');

        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(iName), null, 'localStorage item has been removed');
        clearStorageItem(iName);
    });
}
