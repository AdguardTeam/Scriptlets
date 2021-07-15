/* eslint-disable no-underscore-dangle */
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

test('Set localStorage key with valid value', (assert) => {
    const cName = '__test-item_undefined';
    const cValue = 'true';
    runScriptlet(name, [cName, cValue]);
    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(window.localStorage.getItem(cName), 'true', 'localStorage item has been set');
    clearStorageItem(cName);
});
