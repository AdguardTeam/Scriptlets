/* eslint-disable no-underscore-dangle */
import { clearGlobalProps, runScriptlet } from '../helpers';

const { test, module } = QUnit;
const name = 'adobe-target';

const GLOBALS = ['hit', '__debug', 'adobe', 'mboxCreate', 'mboxDefine', 'mboxUpdate'];

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps(...GLOBALS);
    const style = document.getElementById('at-body-style');
    if (style) {
        style.remove();
    }
    delete document.readyState;
};

module(name, { beforeEach, afterEach });

test('Installs the at.js API', (assert) => {
    runScriptlet(name);
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.strictEqual(typeof window.adobe.target.getOffer, 'function', 'adobe.target is installed');
});

test('Removes the prehiding style of a snippet which runs after the scriptlet', async (assert) => {
    // at document start, before the prehiding snippet of the page
    Object.defineProperty(document, 'readyState', { configurable: true, get: () => 'loading' });
    runScriptlet(name);
    delete document.readyState;

    const style = document.createElement('style');
    style.id = 'at-body-style';
    style.textContent = 'body {opacity: 0 !important}';
    document.head.appendChild(style);
    await Promise.resolve();
    assert.notOk(style.isConnected, 'prehiding style is removed when it is added');
});

test('Keeps the real at.js and is not applied twice', (assert) => {
    const real = { getOffer: () => 'real' };
    window.adobe = { target: real };
    runScriptlet(name);
    assert.strictEqual(window.adobe.target, real, 'existing at.js is kept');
    assert.strictEqual(window.hit, undefined, 'hit function not fired');

    clearGlobalProps('adobe');
    runScriptlet(name);
    const first = window.adobe.target;
    runScriptlet(name);
    assert.strictEqual(window.adobe.target, first, 'second run keeps the first API');
});
