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
    const REL_PAGE_PATH = '../scriptlets/test-files/empty.html';
    const contentValue = `1;url=${REL_PAGE_PATH}`;
    createMeta(contentValue);

    runScriptlet(name);
    const done = assert.async();
    setTimeout(() => {
        assert.ok(location.href.indexOf('prevent-refresh') !== -1, 'Redirect prevented');
        assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
        done();
    }, 1 * 1000);
});

test('Prevent redirect, delay from arg', (assert) => {
    const REL_PAGE_PATH = '../scriptlets/test-files/empty.html';
    const contentValue = `1;url=${REL_PAGE_PATH}`;
    createMeta(contentValue);

    runScriptlet(name, ['1']);
    const done = assert.async();
    setTimeout(() => {
        assert.ok(location.href.indexOf('prevent-refresh') !== -1, 'Redirect prevented');
        assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
        done();
    }, 1 * 1000);
});
