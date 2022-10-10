/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-load-script';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'value';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
};

module(name, { beforeEach, afterEach });

test('Script is not loaded, invalid url', (assert) => {
    const done = assert.async();
    const URL = 'InvalidUrlScheme';

    runScriptlet(name, [URL]);

    setTimeout(() => {
        assert.strictEqual(window.hit, undefined, 'hit func should not execute');
        done();
    }, 100);
});
