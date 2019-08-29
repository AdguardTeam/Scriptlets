/* eslint-disable no-underscore-dangle, no-eval */
/* global QUnit */
import { clearGlobalProps } from './helpers';

const { test, module } = QUnit;
const name = 'googlesyndication-adsbygoogle';

module(name);

const evalWrapper = eval;

test('ubo alias', (assert) => {
    const params = {
        name: 'ubo-googlesyndication-adsbygoogle.js',
        verbose: true,
    };
    window.__debugScriptlets = () => {
        window.hit = 'FIRED';
    };

    // Create advertisment section
    const ad = document.createElement('div');
    ad.classList.add('adsbygoogle');
    document.body.appendChild(ad);

    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    assert.strictEqual(window.hit, 'FIRED');

    clearGlobalProps('__debugScriptlets', 'hit');
});

test('ubo', (assert) => {
    const params = {
        name: 'googlesyndication_adsbygoogle.js',
        verbose: true,
    };
    window.__debugScriptlets = () => {
        window.hit = 'FIRED';
    };

    // Create advertisment section
    const ad = document.createElement('div');
    ad.classList.add('adsbygoogle');
    document.body.appendChild(ad);

    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    assert.strictEqual(window.hit, 'FIRED');

    clearGlobalProps('__debugScriptlets', 'hit');
});

test('works', (assert) => {
    const params = {
        name,
        verbose: true,
    };
    window.__debugScriptlets = () => {
        window.hit = 'FIRED';
    };

    // Create advertisment section
    const ad = document.createElement('div');
    ad.classList.add('adsbygoogle');
    document.body.appendChild(ad);

    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    assert.strictEqual(window.hit, 'FIRED');
    clearGlobalProps('__debugScriptlets', 'hit');
});
