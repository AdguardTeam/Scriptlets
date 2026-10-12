/* eslint-disable no-underscore-dangle, no-console */
import {
    runScriptlet,
    clearGlobalProps,
    saveStorageMethods,
    getSyncLogs,
    useThrowingErrorConstructor,
} from '../helpers';

const { test, module } = QUnit;
const name = 'call-nothrow';

// Scriptlets replace methods of storages in Storage.prototype
const restoreStorage = saveStorageMethods();

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    restoreStorage();
};

module(name, { beforeEach, afterEach });

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-call-nothrow.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('call-nothrow - JSON.parse', (assert) => {
    let testPassed;

    runScriptlet(name, ['JSON.parse']);

    // JSON.parse('foo') throws an error,
    // so scriptlet should catch it and testPassed should be true
    try {
        JSON.parse('foo');
        testPassed = true;
    } catch (e) {
        testPassed = false;
    }
    assert.strictEqual(testPassed, true, 'testPassed set to true');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('call-nothrow - Object.defineProperty', (assert) => {
    let testPassed;
    const foo = {};
    Object.defineProperty(foo, 'bar', { value: true });

    runScriptlet(name, ['Object.defineProperty']);

    // Redefining foo.bar should throw an error,
    // so scriptlet should catch it and testPassed should be true
    try {
        Object.defineProperty(foo, 'bar', { value: false });
        testPassed = true;
    } catch (e) {
        testPassed = false;
    }
    assert.strictEqual(testPassed, true, 'testPassed set to true');
    assert.strictEqual(foo.bar, true, 'foo.bar set to true');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('Storage method: localStorage.getItem does not throw', (assert) => {
    runScriptlet(name, ['localStorage.getItem']);

    // Native method throws without arguments
    assert.strictEqual(localStorage.getItem(), undefined, 'Error not thrown');
    assert.throws(() => sessionStorage.getItem(), TypeError, 'Error of sessionStorage.getItem thrown');
    assert.strictEqual(localStorage.getItem('getItem'), null, 'Item named after the method was not stored');
    assert.notOk(Object.prototype.hasOwnProperty.call(localStorage, 'getItem'), 'Storage has no own method');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('Error which has no message does not escape - null', (assert) => {
    window.throwingFunc = () => {
        // eslint-disable-next-line no-throw-literal
        throw null;
    };
    runScriptlet(name, ['throwingFunc']);

    let result = 'not called';
    const logs = getSyncLogs(() => {
        result = window.throwingFunc();
    });

    assert.strictEqual(result, undefined, 'Error not thrown, undefined returned');
    assert.ok(logs.includes(`${name}: Error calling throwingFunc: null`), 'Error logged with its message');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

    clearGlobalProps('throwingFunc');
});

test('Error which has no message does not escape - undefined', (assert) => {
    window.throwingFunc = () => {
        // eslint-disable-next-line no-throw-literal
        throw undefined;
    };
    runScriptlet(name, ['throwingFunc']);

    let result = 'not called';
    getSyncLogs(() => {
        result = window.throwingFunc();
    });

    assert.strictEqual(result, undefined, 'Error not thrown, undefined returned');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

    clearGlobalProps('throwingFunc');
});

test('Error which has no message does not escape - Error replaced by the page', (assert) => {
    window.throwingFunc = () => {
        // eslint-disable-next-line no-throw-literal
        throw 'Page error';
    };
    runScriptlet(name, ['throwingFunc']);

    // A primitive has no message, so getting its message by creating an error throws as well
    let result = 'not called';
    const logs = getSyncLogs(() => {
        const restoreError = useThrowingErrorConstructor('Error cannot be created');
        try {
            result = window.throwingFunc();
        } finally {
            restoreError();
        }
    });

    assert.strictEqual(result, undefined, 'Error not thrown, undefined returned');
    assert.ok(logs.includes(`${name}: Error calling throwingFunc`), 'Error logged without its message');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

    clearGlobalProps('throwingFunc');
});
