/* eslint-disable no-underscore-dangle, no-restricted-globals */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'prevent-refresh';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
};

const createMeta = (contentValue) => {
    const meta = document.createElement('meta');
    meta.setAttribute('http-equiv', 'refresh');
    meta.setAttribute('content', contentValue);
    document.body.appendChild(meta);
};

const removeMeta = () => {
    const meta = document.querySelectorAll('meta[content]');
    meta.forEach((el) => { el.remove(); });
};

module(name, { beforeEach, afterEach });

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-refresh-defuser.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('Prevent redirect, delay from meta', (assert) => {
    const REL_PAGE_PATH = './test-files/empty.html';
    const contentValue = `1;url=${REL_PAGE_PATH}`;
    createMeta(contentValue);

    runScriptlet(name);
    const done = assert.async();
    setTimeout(() => {
        assert.ok(location.href.includes('prevent-refresh'), 'Redirect prevented');
        assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
        done();
    }, 1 * 1000);
});

test('Prevent redirect, delay from arg (delay 0)', (assert) => {
    const REL_PAGE_PATH = './test-files/empty.html';
    const contentValue = `0;url=${REL_PAGE_PATH}`;
    createMeta(contentValue);

    runScriptlet(name, ['0']);
    const done = assert.async();
    setTimeout(() => {
        assert.ok(location.href.includes('prevent-refresh'), 'Redirect prevented');
        assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
        removeMeta();
        done();
    }, 1 * 1000);
});

test('Prevent redirect, delay from arg (delay 1)', (assert) => {
    const REL_PAGE_PATH = './test-files/empty.html';
    const contentValue = `1;url=${REL_PAGE_PATH}`;
    createMeta(contentValue);

    runScriptlet(name, ['1']);
    const done = assert.async();
    setTimeout(() => {
        assert.ok(location.href.includes('prevent-refresh'), 'Redirect prevented');
        assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
        removeMeta();
        done();
    }, 1 * 1000);
});

test('Prevent redirect in case of invalid content', (assert) => {
    const REL_PAGE_PATH = './test-files/empty.html';
    const contentValue = `invalid;url=${REL_PAGE_PATH}`;
    let testPassed = true;
    createMeta(contentValue);

    // Check if there is a "Reduce of empty array with no initial value" error in console
    // if so, then set "testPassed" to "false"
    const checkConsole = () => {
        const wrapperLog = (target, thisArg, args) => {
            if (args[0]?.message?.includes('Reduce of empty array with no initial value')) {
                testPassed = false;
            }
            return Reflect.apply(target, thisArg, args);
        };
        const handlerLog = {
            apply: wrapperLog,
        };
        window.console.log = new Proxy(window.console.log, handlerLog);
    };
    checkConsole();
    runScriptlet(name);
    const done = assert.async();
    setTimeout(() => {
        assert.ok(testPassed, 'No error');
        assert.strictEqual(window.hit, undefined, 'should not hit');
        removeMeta();
        done();
    }, 1 * 1000);
});
