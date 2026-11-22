/* eslint-disable no-underscore-dangle */
import { clearGlobalProps, runScriptlet, sleep } from '../helpers';

const { test, module } = QUnit;
const name = 'cxense';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug', 'cX');
};

module(name, { beforeEach, afterEach });

test('Installs the API, which the page then uses', (assert) => {
    runScriptlet(name);
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

    // as the documented snippet, after the scriptlet
    const calls = [];
    window.cX = window.cX || {};
    window.cX.callQueue = window.cX.callQueue || [];
    window.cX.callQueue.push(['setSiteId', '1234567890']);
    window.cX.callQueue.push(['invoke', () => calls.push('invoke')]);
    assert.strictEqual(window.cX.getSiteId(), '1234567890', 'pushed command is applied at once');
    assert.deepEqual(calls, [], 'invoke callback is not run');
    assert.strictEqual(window.cX.JSON.stringify({ q: 'a' }), '{"q":"a"}', 'cX.JSON');
});

test('Is not applied twice', (assert) => {
    runScriptlet(name);
    const first = window.cX;
    const { getSegments } = first;
    clearGlobalProps('hit');
    runScriptlet(name);
    assert.strictEqual(window.cX.getSegments, getSegments, 'second run keeps the first API');
    assert.strictEqual(window.hit, undefined, 'hit function not fired again');

    // the scriptlet for cx.cce.js after a real cx.js: only CCE is added
    clearGlobalProps('cX');
    const realGetUserId = () => 'real';
    window.cX = { getUserId: realGetUserId };
    runScriptlet(name);
    assert.strictEqual(window.cX.getUserId, realGetUserId, 'real cx.js is kept');
    assert.strictEqual(typeof window.cX.CCE.run, 'function', 'CCE is added');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired for the added CCE');
});

test('Shows a widget of an element named after it', async (assert) => {
    const WIDGET = '778bbff92ceb25d61d6157ffad062a3240da6995';
    const target = document.createElement('div');
    target.id = `cx_${WIDGET}`;
    document.body.appendChild(target);
    const urls = [];
    const nativeFetch = window.fetch;
    window.fetch = (url) => {
        urls.push(String(url));
        return Promise.resolve(new Response(JSON.stringify({
            items: [
                { id: 'a', title: 'Article', url: `${window.location.origin}/articles/1` },
                { slot: '1', title: 'Sponsored', url: `${window.location.origin}/articles/2` },
            ],
            template: '<!--% window.hit = "template"; %-->',
        })));
    };
    try {
        runScriptlet(name);
        await sleep(120);
        assert.deepEqual(
            urls,
            [`https://api.cxense.com/public/widget/data?json=%7B%22widgetId%22%3A%22${WIDGET}%22%7D`],
            'widget is requested by its id only',
        );
        const links = target.firstElementChild.shadowRoot.querySelectorAll('a');
        assert.strictEqual(links.length, 1, 'recommended page is shown, sponsored one is not');
        assert.strictEqual(links[0].textContent, 'Article', 'title of the page');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired, and no code of the response is run');
    } finally {
        window.fetch = nativeFetch;
        target.remove();
    }
});
