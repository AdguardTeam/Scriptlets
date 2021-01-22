/* eslint-disable no-underscore-dangle, no-eval */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'googlesyndication-adsbygoogle';

module(name);

const evalWrapper = eval;

// Create advertisement section
const createAdElement = () => {
    const ad = document.createElement('div');
    ad.classList.add('adsbygoogle');
    document.body.appendChild(ad);
    return ad;
};

const removeBodyElement = (elem) => {
    document.body.removeChild(elem);
};

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-googlesyndication_adsbygoogle.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.redirects.getCode(adgParams);
    const codeByUboParams = window.scriptlets.redirects.getCode(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams);
});

test('Redirect testing', (assert) => {
    const params = {
        name,
        verbose: true,
    };
    window.__debug = () => { window.hit = 'FIRED'; };

    const ad = createAdElement();

    // run scriptlet
    const resString = window.scriptlets.redirects.getCode(params);
    evalWrapper(resString);

    // check if iframes were created by scriptlet
    const adsbygoogleElems = document.getElementsByClassName('adsbygoogle');
    const hasAdAttr = adsbygoogleElems[0].hasAttribute('data-adsbygoogle-status');
    const createdIframes = adsbygoogleElems[0].getElementsByTagName('iframe');
    const aswiftIframe = document.querySelector('#aswift_1');
    const googleadsIframe = document.querySelector('#google_ads_iframe_1');

    assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    assert.strictEqual(hasAdAttr, true, '.adsbygoogle has \'data-adsbygoogle-status\' attribute');
    assert.ok(aswiftIframe, 'aswift iframe was created by scriptlet');
    assert.notEqual(aswiftIframe.contentWindow.length, 0, 'aswiftIframe.contentWindow was mocked by scriptlet');
    assert.ok(googleadsIframe, 'google_ads iframe was created by scriptlet');
    assert.notEqual(googleadsIframe.contentWindow.length, 0, 'aswiftIframe.contentWindow was mocked by scriptlet');
    assert.strictEqual(createdIframes.length, 2, '2 iframes was created as a child of .adsbygoogle');

    assert.strictEqual(window.adsbygoogle.length, undefined, 'adsbygoogle.length check');

    // check if API was mocked
    window.adsbygoogle.push('somedata');
    assert.strictEqual(window.adsbygoogle.length, 1, 'API was mocked');

    clearGlobalProps('__debug', 'hit', 'adsbygoogle');
    removeBodyElement(ad);
});
