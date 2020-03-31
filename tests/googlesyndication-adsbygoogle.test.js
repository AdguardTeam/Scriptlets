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

    // check if iframes was created by sciptlet
    const adsbygoogleElems = document.getElementsByClassName('adsbygoogle');
    const hasAdAttr = adsbygoogleElems[0].hasAttribute('data-adsbygoogle-status');
    const createdIframes = adsbygoogleElems[0].getElementsByTagName('iframe');
    const aswiftIframe = document.querySelector('#aswift_1');
    const googleadsIframe = document.querySelector('#google_ads_iframe_0');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    assert.strictEqual(hasAdAttr, true, '.adsbygoogle has \'data-adsbygoogle-status\' attribute');
    assert.ok(aswiftIframe, 'aswift iframe was created by scriptlet');
    assert.ok(googleadsIframe, 'google_ads iframe was created by scriptlet');
    assert.strictEqual(createdIframes.length, 2, '2 iframes was created as a child of .adsbygoogle');

    // check if API was mocked
    window.adsbygoogle.push('somedata');
    assert.strictEqual(window.adsbygoogle.length, 1, 'API was mocked');

    clearGlobalProps('__debugScriptlets', 'hit', 'adsbygoogle');
    removeBodyElement(ad);
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

    // check if iframes was created by sciptlet
    const adsbygoogleElems = document.getElementsByClassName('adsbygoogle');
    const hasAdAttr = adsbygoogleElems[0].hasAttribute('data-adsbygoogle-status');
    const createdIframes = adsbygoogleElems[0].getElementsByTagName('iframe');
    const aswiftIframe = document.querySelector('#aswift_1');
    const googleadsIframe = document.querySelector('#google_ads_iframe_0');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    assert.strictEqual(hasAdAttr, true, '.adsbygoogle has \'data-adsbygoogle-status\' attribute');
    assert.ok(aswiftIframe, 'aswift iframe was created by scriptlet');
    assert.ok(googleadsIframe, 'google_ads iframe was created by scriptlet');
    assert.strictEqual(createdIframes.length, 2, '2 iframes was created as a child of .adsbygoogle');

    // check if API was mocked
    window.adsbygoogle.push('somedata');
    assert.strictEqual(window.adsbygoogle.length, 1, 'API was mocked');

    clearGlobalProps('__debugScriptlets', 'hit', 'adsbygoogle');
    removeBodyElement(ad);
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

    // check if iframes was created by sciptlet
    const adsbygoogleElems = document.getElementsByClassName('adsbygoogle');
    const hasAdAttr = adsbygoogleElems[0].hasAttribute('data-adsbygoogle-status');
    const createdIframes = adsbygoogleElems[0].getElementsByTagName('iframe');
    const aswiftIframe = document.querySelector('#aswift_1');
    const googleadsIframe = document.querySelector('#google_ads_iframe_0');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    assert.strictEqual(hasAdAttr, true, '.adsbygoogle has \'data-adsbygoogle-status\' attribute');
    assert.ok(aswiftIframe, 'aswift iframe was created by scriptlet');
    assert.ok(googleadsIframe, 'google_ads iframe was created by scriptlet');
    assert.strictEqual(createdIframes.length, 2, '2 iframes was created as a child of .adsbygoogle');

    // check if API was mocked
    window.adsbygoogle.push('somedata');
    assert.strictEqual(window.adsbygoogle.length, 1, 'API was mocked');

    clearGlobalProps('__debugScriptlets', 'hit', 'adsbygoogle');
    removeBodyElement(ad);
});
