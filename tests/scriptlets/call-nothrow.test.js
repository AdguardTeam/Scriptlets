/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'call-nothrow';

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
