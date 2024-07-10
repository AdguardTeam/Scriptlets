/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps, isSafariBrowser } from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-set-session-storage-item';

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
    window.sessionStorage.removeItem(iName);
};

if (isSafariBrowser()) {
    test('unsupported', (assert) => {
        assert.ok(true, 'does not work in Safari 10 while browserstack auto tests run');
    });
} else {
    test('Set sessionStorage item', (assert) => {
        let iName = '__test-item_true';
        let iValue = 'true';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.sessionStorage.getItem(iName), 'true', 'sessionStorage item has been set');
        clearStorageItem(iName);

        iName = '__test-item_false';
        iValue = 'false';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.sessionStorage.getItem(iName), 'false', 'sessionStorage item has been set');
        clearStorageItem(iName);

        iName = '__test-item_null';
        iValue = 'null';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.sessionStorage.getItem(iName), 'null', 'sessionStorage item has been set');
        clearStorageItem(iName);

        iName = '__test-item_undefined';
        iValue = 'undefined';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.sessionStorage.getItem(iName), 'undefined', 'sessionStorage item has been set');
        clearStorageItem(iName);

        iName = '__test-item_emptyStr';
        iValue = '';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.sessionStorage.getItem(iName), '', 'sessionStorage item has been set');
        clearStorageItem(iName);

        iName = '__test-item_object';
        iValue = '{"preferences":3,"marketing":false}';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.sessionStorage.getItem(iName), iValue, 'sessionStorage item has been set');
        clearStorageItem(iName);

        iName = '__test-item_array';
        iValue = '[1, 2, "test"]';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.sessionStorage.getItem(iName), iValue, 'sessionStorage item has been set');
        clearStorageItem(iName);

        iName = '__test-item_string';
        iValue = 'some arbitrary item value 111';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.sessionStorage.getItem(iName), iValue, 'sessionStorage item has been set');
        clearStorageItem(iName);

        iName = '__test-item_numbers';
        iValue = '123123';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.sessionStorage.getItem(iName), iValue, 'sessionStorage item has been set');
        clearStorageItem(iName);

        iName = '__test-item_mix';
        iValue = '123string_!!:;@#$';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.sessionStorage.getItem(iName), iValue, 'sessionStorage item has been set');
        clearStorageItem(iName);
    });

    test('Set sessionStorage item with $now$ keyword value', (assert) => {
        const iName = '__test-item_now';
        const iValue = '$now$';

        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');

        // Some time will pass between calling scriptlet
        // and qunit running assertion
        const tolerance = 20;
        const itemValue = window.sessionStorage.getItem(iName);
        const currentTime = Date.now();
        const timeDiff = currentTime - itemValue;

        assert.ok(timeDiff < tolerance, 'Item value has been set to current time');

        clearStorageItem(iName);
    });

    test('Set sessionStorage item with $currentDate$ keyword value', (assert) => {
        const iName = '__test-item_current_date';
        const iValue = '$currentDate$';

        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');

        const value = sessionStorage.getItem(iName);
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        const currentHour = currentDate.getHours();

        const currentValue = new Date(value);

        assert.strictEqual(currentValue.getFullYear(), currentYear, 'Year matched');
        assert.strictEqual(currentValue.getMonth(), currentMonth, 'Month matched');
        assert.strictEqual(currentValue.getHours(), currentHour, 'Hour matched');

        clearStorageItem(iName);
    });
}
