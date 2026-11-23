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
