/* eslint-disable no-underscore-dangle */
import { clearGlobalProps, runScriptlet } from '../helpers';

const { test, module } = QUnit;
const name = 'chartbeat';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug', 'pSUPERFLY', 'pSUPERFLY_mab', '_cba', '_cbq');
    document.querySelectorAll('.chartbeat-test').forEach((element) => element.remove());
};

module(name, { beforeEach, afterEach });

test('Installs the API, which the page then uses', (assert) => {
    runScriptlet(name);
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

    // as the snippet of the page after the scriptlet
    const calls = [];
    window._cba = window._cba || [];
    window._cba.push(() => calls.push('callback'));
    window.pSUPERFLY.virtualPage({ path: '/a' });
    assert.deepEqual(calls, ['callback'], 'function is called at once');
});

test('Fires hit only if something is changed', (assert) => {
    window.pSUPERFLY = { virtualPage: () => {} };
    runScriptlet(name);
    assert.strictEqual(window.hit, undefined, 'hit function not fired for the real script without styles');

    const style = document.createElement('style');
    style.id = 'chartbeat-flicker-control-style';
    style.className = 'chartbeat-test';
    document.head.appendChild(style);
    runScriptlet(name);
    assert.false(style.isConnected, 'style is removed');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired for the removed style');
});

test('Fires hit for styles which the page adds later, also for the real script', (assert) => {
    // e.g. the real chartbeat.js, and the scriptlet for chartbeat_mab.js, before the snippet of the page
    window.pSUPERFLY = { virtualPage: () => {} };
    const nativeAddEventListener = window.addEventListener;
    const loadListeners = [];
    window.addEventListener = function addEventListener(type, listener, ...rest) {
        if (type === 'load') {
            loadListeners.push(listener);
            return undefined;
        }
        return nativeAddEventListener.call(this, type, listener, ...rest);
    };
    Object.defineProperty(document, 'readyState', { configurable: true, get: () => 'loading' });
    const done = assert.async();
    try {
        runScriptlet(name);
    } finally {
        delete document.readyState;
        window.addEventListener = nativeAddEventListener;
    }
    assert.strictEqual(window.hit, undefined, 'hit function not fired without styles');
    const style = document.createElement('style');
    style.id = 'chartbeat-flicker-control-style';
    style.className = 'chartbeat-test';
    document.head.appendChild(style);
    setTimeout(() => {
        assert.false(style.isConnected, 'style added later is removed');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        loadListeners.forEach((listener) => listener());
        done();
    }, 20);
});
