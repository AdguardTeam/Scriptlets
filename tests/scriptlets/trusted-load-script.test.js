/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-load-script';

const TEST_FILES_DIR = './test-files/';
const TEST_SCRIPT03_FILENAME = 'test-script03.js';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'value';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
};

module(name, { beforeEach, afterEach });

test('Script is loaded', async (assert) => {
    const scriptPath = `${TEST_FILES_DIR}${TEST_SCRIPT03_FILENAME}`;
    const done = assert.async();

    const url = URL.createObjectURL(scriptPath);

    runScriptlet(name, [url]);

    setTimeout(() => {
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        done();
    }, 100);
});

test('Script is not loaded, invalid url', (assert) => {
    const done = assert.async();
    const URL = 'InvalidUrlScheme';

    runScriptlet(name, [URL]);

    setTimeout(() => {
        assert.strictEqual(window.hit, undefined, 'hit func should not execute');
        done();
    }, 100);
});
