/* eslint-disable no-underscore-dangle, no-eval */
/* global QUnit */
import { clearGlobalProps } from './helpers';

const { test, module } = QUnit;
const name = 'googlesyndication-adsbygoogle';

module(name);

const evalWrapper = eval;

const createAdElement = () => {
    // Create advertisment section
    const ad = document.createElement('div');
    ad.classList.add('adsbygoogle');
    document.body.appendChild(ad);
    return ad;
};

const removeBodyElement = (elem) => {
    document.body.removeChild(elem);
};

test('UBO alias', (assert) => {
    const params = {
        name: 'ubo-googlesyndication_adsbygoogle.js',
        verbose: true,
    };
    window.__debugScriptlets = () => { window.hit = 'FIRED'; };

    const ad = createAdElement();

    // run scriptlet
    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    // check if iframe was created by sciptlet
    const createdIframe = document.querySelector('#aswift_1');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    assert.ok(createdIframe, 'iframe was created by scriptlet');

    // check if API was mocked
    window.adsbygoogle.push('somedata');
    assert.strictEqual(window.adsbygoogle.length, 1, 'API was mocked');

    clearGlobalProps('__debugScriptlets', 'hit', 'adsbygoogle');
    removeBodyElement(ad);
    removeBodyElement(createdIframe);
});

test('UBO Syntax', (assert) => {
    const params = {
        name: 'googlesyndication_adsbygoogle.js',
        verbose: true,
    };
    window.__debugScriptlets = () => { window.hit = 'FIRED'; };

    const ad = createAdElement();

    // run scriptlet
    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    // check if iframe was created by sciptlet
    const createdIframe = document.querySelector('#aswift_1');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    assert.ok(createdIframe, 'iframe was created by scriptlet');

    // check if API was mocked
    window.adsbygoogle.push('somedata');
    assert.strictEqual(window.adsbygoogle.length, 1, 'API was mocked');

    clearGlobalProps('__debugScriptlets', 'hit', 'adsbygoogle');
    removeBodyElement(ad);
    removeBodyElement(createdIframe);
});

test('AdGuard Syntax', (assert) => {
    const params = {
        name,
        verbose: true,
    };
    window.__debugScriptlets = () => { window.hit = 'FIRED'; };

    const ad = createAdElement();

    // run scriptlet
    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    // check if iframe was created by sciptlet
    const createdIframe = document.querySelector('#aswift_1');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    assert.ok(createdIframe, 'iframe was created by scriptlet');

    // check if API was mocked
    window.adsbygoogle.push('somedata');
    assert.strictEqual(window.adsbygoogle.length, 1, 'API was mocked');

    clearGlobalProps('__debugScriptlets', 'hit', 'adsbygoogle');
    removeBodyElement(ad);
    removeBodyElement(createdIframe);
});
