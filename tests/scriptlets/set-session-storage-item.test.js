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
    test('Checking if alias name works', (assert) => {
        const adgParams = {
            name,
            engine: 'test',
            verbose: true,
        };
        const uboParams = {
            name: 'ubo-set-session-storage-item.js',
            engine: 'test',
            verbose: true,
        };

        const codeByAdgParams = window.scriptlets.invoke(adgParams);
        const codeByUboParams = window.scriptlets.invoke(uboParams);

        assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
    });

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

        cName = '__test-item_on';
        cValue = 'on';
        runScriptlet(name, [cName, cValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.sessionStorage.getItem(cName), 'on', 'sessionStorage item has been set');
        clearStorageItem(cName);

        cName = '__test-item_ON';
        cValue = 'ON';
        runScriptlet(name, [cName, cValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.sessionStorage.getItem(cName), 'ON', 'sessionStorage item has been set');
        clearStorageItem(cName);

        cName = '__test-item_off';
        cValue = 'off';
        runScriptlet(name, [cName, cValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.sessionStorage.getItem(cName), 'off', 'sessionStorage item has been set');
        clearStorageItem(cName);
    });

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

    test('Remove item from sessionStorage - regexp', (assert) => {
        const iName = '/__test-.*_regexp/';
        const iValue = '$remove$';
        const firstRegexpStorageItem = '__test-first_item_remove_regexp';
        const secondRegexpStorageItem = '__test-second_item_remove_regexp';

        sessionStorage.setItem(firstRegexpStorageItem, '1');
        sessionStorage.setItem(secondRegexpStorageItem, '2');

        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(
            window.sessionStorage.getItem(firstRegexpStorageItem),
            null,
            'sessionStorage item has been removed',
        );
        assert.strictEqual(
            window.sessionStorage.getItem(secondRegexpStorageItem),
            null,
            'sessionStorage item has been removed',
        );
        clearStorageItem(firstRegexpStorageItem);
        clearStorageItem(secondRegexpStorageItem);
    });

    test('Remove item from sessionStorage - regexp with flag i', (assert) => {
        const iName = '/^__test-.*_regexp_case-insensitive/i';
        const iValue = '$remove$';
        const caseInsensitiveRegexpStorageItem = '__test-first_item_remove_regexp_CASE-inSensitive';

        sessionStorage.setItem(caseInsensitiveRegexpStorageItem, 'abc');

        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(
            window.sessionStorage.getItem(caseInsensitiveRegexpStorageItem),
            null,
            'sessionStorage item has been removed',
        );
        clearStorageItem(caseInsensitiveRegexpStorageItem);
    });

    test('Remove item from sessionStorage - not regexp, starts with forward slash', (assert) => {
        const iName = '/__test-';
        const iValue = '$remove$';

        sessionStorage.setItem(iName, '1');
        // should not be removed
        sessionStorage.setItem('/__test-2', '2');

        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.sessionStorage.getItem(iName), null, 'sessionStorage item has been removed');
        assert.strictEqual(
            window.sessionStorage.getItem('/__test-2'),
            '2',
            'not matched sessionStorage item should not be removed',
        );
        clearStorageItem(iName);
        clearStorageItem('/__test-2');
    });
}
