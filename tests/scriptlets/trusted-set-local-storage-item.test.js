/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps, isSafariBrowser } from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-set-local-storage-item';

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
    test('unsupported', (assert) => {
        assert.ok(true, 'does not work in Safari 10 while browserstack auto tests run');
    });
} else {
    test('Set localStorage item', (assert) => {
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

        iName = '__test-item_emptyStr';
        iValue = '';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(iName), '', 'localStorage item has been set');
        clearStorageItem(iName);

        iName = '__test-item_object';
        iValue = '{"preferences":3,"marketing":false}';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(iName), iValue, 'localStorage item has been set');
        clearStorageItem(iName);

        iName = '__test-item_array';
        iValue = '[1, 2, "test"]';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(iName), iValue, 'localStorage item has been set');
        clearStorageItem(iName);

        iName = '__test-item_string';
        iValue = 'some arbitrary item value 111';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(iName), iValue, 'localStorage item has been set');
        clearStorageItem(iName);

        iName = '__test-item_numbers';
        iValue = '123123';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(iName), iValue, 'localStorage item has been set');
        clearStorageItem(iName);

        iName = '__test-item_mix';
        iValue = '123string_!!:;@#$';
        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
        assert.strictEqual(window.localStorage.getItem(iName), iValue, 'localStorage item has been set');
        clearStorageItem(iName);
    });

    test('Set localStorage item with $now$ keyword value', (assert) => {
        const iName = '__test-item_now';
        const iValue = '$now$';

        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');

        // Some time will pass between calling scriptlet
        // and qunit running assertion
        const tolerance = 20;
        const itemValue = window.localStorage.getItem(iName);
        const currentTime = Date.now();
        const timeDiff = currentTime - itemValue;

        assert.ok(timeDiff < tolerance, 'Item value has been set to current time');

        clearStorageItem(iName);
    });

    test('Set localStorage item with $currentDate$ keyword value', (assert) => {
        const iName = '__test-item_current_date';
        const iValue = '$currentDate$';

        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');

        const value = localStorage.getItem(iName);
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        const currentHour = currentDate.getHours();

        const currentValue = new Date(value);

        assert.strictEqual(currentValue.getFullYear(), currentYear, 'Years matched');
        assert.strictEqual(currentValue.getMonth(), currentMonth, 'Years matched');
        assert.strictEqual(currentValue.getHours(), currentHour, 'Years matched');

        clearStorageItem(iName);
    });

    test('Set localStorage item with $currentISODate$ keyword value', (assert) => {
        const iName = '__test-item_current_iso_date';
        const iValue = '$currentISODate$';

        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');

        const value = localStorage.getItem(iName);
        const currentIsoTime = new Date().toISOString();
        // Check only the date part of the ISO time (e.g. '2022-11-08')
        const isoTimeToCheck = currentIsoTime.split('T')[0];

        assert.ok(value.startsWith(isoTimeToCheck), 'Item value has been set to current ISO time');

        clearStorageItem(iName);
    });

    test('Set localStorage item with $now$ keyword as a part of the value', (assert) => {
        // https://github.com/AdguardTeam/Scriptlets/issues/573
        const iName = '__test-item_now_in_value';
        const iValue = '{"count":1,"firstTime":$now$}';

        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');

        // Some time will pass between calling scriptlet
        // and qunit running assertion
        const tolerance = 100;
        const itemValue = JSON.parse(window.localStorage.getItem(iName));

        assert.strictEqual(itemValue.count, 1, 'Other parts of the value have not been modified');
        assert.ok(
            Date.now() - itemValue.firstTime < tolerance,
            'Keyword has been replaced with current time',
        );

        clearStorageItem(iName);
    });

    test('Set localStorage item with $now$ keyword as a part of the simple value', (assert) => {
        // https://github.com/AdguardTeam/Scriptlets/issues/573
        const iName = '__test-item_now_in_simple_value';
        const prefix = 'time_now:';
        const iValue = `${prefix}$now$`;

        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');

        // Some time will pass between calling scriptlet
        // and qunit running assertion
        const tolerance = 100;
        const itemValue = window.localStorage.getItem(iName);

        assert.ok(itemValue.startsWith(prefix), 'Other parts of the value have not been modified');

        const timeValue = itemValue.slice(prefix.length);
        assert.ok(/^\d+$/.test(timeValue), 'Keyword has been replaced with time in ms');
        assert.ok(Date.now() - timeValue < tolerance, 'Keyword has been replaced with current time');

        clearStorageItem(iName);
    });

    test('Set localStorage item with keyword-like values which are not modified', (assert) => {
        // https://github.com/AdguardTeam/Scriptlets/issues/573
        const notKeywords = [
            '$now',
            'now$',
            '$NOW$',
            '$now2$',
            '$current-date$',
            '$$',
        ];

        notKeywords.forEach((iValue, index) => {
            const iName = `__test-item_not_keyword_${index}`;

            runScriptlet(name, [iName, iValue]);
            assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
            assert.strictEqual(
                window.localStorage.getItem(iName),
                iValue,
                `Value '${iValue}' has not been modified`,
            );

            clearStorageItem(iName);
        });
    });

    test('Set localStorage item with multiple keywords as a part of the value', (assert) => {
        // https://github.com/AdguardTeam/Scriptlets/issues/573
        const iName = '__test-item_multiple_keywords_in_value';
        const iValue = '{"count":1,"firstTime":$now$,"date":"$currentISODate$"}';

        runScriptlet(name, [iName, iValue]);
        assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');

        const tolerance = 100;
        const itemValue = JSON.parse(window.localStorage.getItem(iName));

        assert.strictEqual(itemValue.count, 1, 'Other parts of the value have not been modified');
        assert.ok(
            Date.now() - itemValue.firstTime < tolerance,
            '$now$ keyword has been replaced with current time',
        );
        assert.ok(
            Date.now() - new Date(itemValue.date).getTime() < tolerance,
            '$currentISODate$ keyword has been replaced with current ISO date',
        );

        clearStorageItem(iName);
    });
}
