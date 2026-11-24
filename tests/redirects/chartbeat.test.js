/* eslint-disable no-underscore-dangle, func-names */
import { clearGlobalProps, evalWrapper, getRedirectsInstance } from '../helpers';

const { test, module } = QUnit;
const name = 'chartbeat';

const HIDER_IDS = [
    'chartbeat-flicker-control-style',
    'chartbeat-flicker-control-style-ht',
    'chartbeat-flicker-control-style-it',
    'chartbeat-body-hider',
];

let redirects;

const before = async () => {
    redirects = await getRedirectsInstance();
};

const afterEach = () => {
    clearGlobalProps('pSUPERFLY', 'pSUPERFLY_mab', '_cba', '_cbq', '_sf_async_config', 'chartbeatFlicker');
    document.querySelectorAll('.chartbeat-test').forEach((element) => element.remove());
    document.body.style.visibility = '';
};

module(name, { before, afterEach });

/**
 * Runs the snippet of image and headline testing of the Chartbeat documentation, which hides headlines and images
 * of article blocks, and adds the class `cb-it-hide` to the images at `DOMContentLoaded`, i.e. its listener
 * is returned to be called by the test, see
 * https://docs.chartbeat.com/cbp/feature-integrations/testing/flicker-and-flicker-control
 *
 * @returns {Function} listener of `DOMContentLoaded` of the snippet
 */
const runImageTestingSnippet = () => {
    let onContentLoaded = null;
    const nativeAddEventListener = document.addEventListener;
    document.addEventListener = (type, listener) => {
        onContentLoaded = listener;
    };
    try {
        // the documented snippet, as it is, except the listener above
        // eslint-disable-next-line
        !function(){var headlineSelector="h3, h2, h1";var articleBlockSelector="article.chartbeat-test";var timeout=1000;if(!("srcset"in document.createElement("img")))return;const e=window.chartbeatFlicker=window.chartbeatFlicker||{};function t(e,t,c,o){const n=document.createElement("style"),i=function(e,t){return e.split(",").reduce((e,c)=>e+c+` ${t} { visibility: hidden; }\n`,"")}(c,o);n.id=t,n.className="chartbeat-test",e.appendChild(n),n.type="text/css",n.appendChild(document.createTextNode(i))}window._sf_async_config=window._sf_async_config||{},e.timeout=timeout||1e3,e.headlineSelector=headlineSelector||"h3, h2, h1",window._sf_async_config.articleBlockSelector=articleBlockSelector||"article, section";const c=window._sf_async_config.articleBlockSelector;e.timeoutFlag=!1,e.strategyFetched=e.strategyFetched||!1;const o=document.head||document.querySelector("head");t(o,"chartbeat-flicker-control-style-ht",c,e.headlineSelector),t(o,"chartbeat-flicker-control-style-it",c,"img"),document.addEventListener("DOMContentLoaded",()=>{if(e.timeoutFlag){const e=document.getElementById("chartbeat-flicker-control-style-it");return void(e&&e.parentNode.removeChild(e))}document.querySelectorAll(c).forEach(function(e){Array.prototype.slice.call(e.querySelectorAll("img")).forEach(function(e){e.getAttribute("pinger-seen")||e.classList.add("cb-it-hide")})});const t=document.getElementById("chartbeat-flicker-control-style-it");t&&t.parentNode.removeChild(t)})}();
    } finally {
        document.addEventListener = nativeAddEventListener;
    }
    return onContentLoaded;
};

/**
 * Adds an article block with a headline and images, and the style of the class which hides images.
 *
 * @returns {{ headline: HTMLElement, images: HTMLImageElement[] }} elements
 */
const addArticle = () => {
    const style = document.createElement('style');
    style.className = 'chartbeat-test';
    style.textContent = '.cb-it-hide { visibility: hidden; }';
    document.head.appendChild(style);
    const article = document.createElement('article');
    article.className = 'chartbeat-test';
    article.innerHTML = '<h2>Headline</h2><img alt="" width="10" height="10"><img alt="" width="10" height="10">';
    document.body.appendChild(article);
    return { headline: article.querySelector('h2'), images: Array.from(article.querySelectorAll('img')) };
};

/**
 * Returns the visibility of the elements.
 *
 * @param {Element[]} elements elements
 * @returns {string[]} visibility of each element
 */
const visibilityOf = (elements) => elements.map((element) => getComputedStyle(element).visibility);

const runRedirect = () => {
    evalWrapper(redirects.getRedirect(name).content);
};

/**
 * Adds a style of the flicker control of Chartbeat, as the snippet of the page adds it.
 *
 * @param {string} id id of the style
 * @returns {HTMLStyleElement} style
 */
const addHider = (id) => {
    const style = document.createElement('style');
    style.id = id;
    style.className = 'chartbeat-test';
    style.textContent = 'body { visibility: hidden !important; }';
    document.head.appendChild(style);
    return style;
};

test('Installs the API, and removes the styles which hide the page', (assert) => {
    const other = addHider('other-flicker-style');
    HIDER_IDS.forEach(addHider);
    assert.strictEqual(getComputedStyle(document.body).visibility, 'hidden', 'page is hidden by the snippet');
    const calls = [];
    // as the snippet of the page
    window._sf_async_config = { uid: 1, domain: 'example.org', flickerControl: true };
    window._cbq = [['_acct', 'anon']];
    window._cba = [
        () => calls.push('queued'),
        () => {
            throw new Error('error of the page');
        },
        'invalid',
    ];

    runRedirect();
    const sf = window.pSUPERFLY;
    assert.strictEqual(typeof sf, 'object', 'pSUPERFLY is defined');
    ['virtualPage', 'activity', 'endTracking'].forEach((method) => {
        assert.strictEqual(typeof sf[method], 'function', `pSUPERFLY.${method}()`);
        assert.strictEqual(sf[method]({ path: '/a' }), undefined, `pSUPERFLY.${method}() does nothing`);
    });
    assert.strictEqual(typeof window.pSUPERFLY_mab.evps, 'function', 'pSUPERFLY_mab.evps()');
    assert.strictEqual(typeof window.pSUPERFLY_mab.svps, 'function', 'pSUPERFLY_mab.svps()');
    const isRemoved = HIDER_IDS.every((id) => document.getElementById(id) === null);
    assert.true(isRemoved, 'styles of the flicker control are removed');
    assert.strictEqual(document.getElementById('other-flicker-style'), other, 'other styles are kept');
    other.remove();
    assert.strictEqual(getComputedStyle(document.body).visibility, 'visible', 'page is visible');

    assert.deepEqual(calls, ['queued'], 'queued functions are called');
    window._cba.push(() => calls.push('pushed'));
    assert.deepEqual(calls, ['queued', 'pushed'], 'pushed functions are called at once');
    window._cba.push(() => {
        throw new Error('error of the page');
    });
    assert.strictEqual(typeof window._cbq.push, 'function', '_cbq is taken over');
    assert.strictEqual(window._cbq.push(['_acct', 'other']), undefined, 'commands of _cbq are ignored');
});

test('Removes the styles which the page adds until it is loaded', (assert) => {
    const nativeAddEventListener = window.addEventListener;
    const loadListeners = [];
    window.addEventListener = function (type, listener, ...rest) {
        if (type === 'load') {
            loadListeners.push(listener);
            return undefined;
        }
        return nativeAddEventListener.call(this, type, listener, ...rest);
    };
    Object.defineProperty(document, 'readyState', { configurable: true, get: () => 'loading' });
    const done = assert.async();
    try {
        // as the scriptlet, before the snippet of the page
        runRedirect();
        assert.strictEqual(loadListeners.length, 1, 'load event is awaited');
        const hider = addHider('chartbeat-flicker-control-style');
        setTimeout(() => {
            assert.false(hider.isConnected, 'style added later is removed');
            loadListeners[0]();
            const late = addHider('chartbeat-body-hider');
            setTimeout(() => {
                assert.true(late.isConnected, 'styles are not watched after the page is loaded');
                done();
            }, 20);
        }, 20);
    } finally {
        delete document.readyState;
        window.addEventListener = nativeAddEventListener;
    }
});

test('Keeps pSUPERFLY of the real script, but removes the styles', (assert) => {
    // e.g. the real chartbeat.js, and the redirect for chartbeat_mab.js
    const real = { virtualPage: () => 'real' };
    const realMab = { evps: () => 'real' };
    const queue = [() => {}];
    window.pSUPERFLY = real;
    window.pSUPERFLY_mab = realMab;
    window._cba = queue;
    addHider('chartbeat-flicker-control-style');
    runRedirect();
    assert.strictEqual(window.pSUPERFLY, real, 'pSUPERFLY is kept');
    assert.strictEqual(window.pSUPERFLY_mab, realMab, 'pSUPERFLY_mab is kept');
    assert.strictEqual(window._cba, queue, 'queue is not taken over');
    assert.strictEqual(document.getElementById('chartbeat-flicker-control-style'), null, 'style is removed');

    // the redirect for both scripts
    clearGlobalProps('pSUPERFLY', 'pSUPERFLY_mab', '_cba');
    runRedirect();
    const mock = window.pSUPERFLY;
    window._cba.push(() => {});
    const cba = window._cba;
    runRedirect();
    assert.strictEqual(window.pSUPERFLY, mock, 'mock is not installed again');
    assert.strictEqual(window._cba, cba, 'queue is not taken over again');
});

test('Removes the styles also if a queue of the page throws', (assert) => {
    // e.g. a frozen array of the page
    window._cba = Object.freeze([() => {}]);
    const queue = window._cba;
    addHider('chartbeat-flicker-control-style');
    runRedirect();
    assert.strictEqual(document.getElementById('chartbeat-flicker-control-style'), null, 'style is removed');
    assert.strictEqual(window._cba, queue, 'frozen queue is kept');
    assert.strictEqual(typeof window.pSUPERFLY.virtualPage, 'function', 'pSUPERFLY is defined');
    assert.strictEqual(typeof window._cbq.push, 'function', 'other queue is taken over');

    // only the first argument of push() is called, as by chartbeat.js with its publisher module, i.e. `pSUPERFLY_pub`,
    // which takes over `_cba` (without it, chartbeat.js leaves `_cba` as it is)
    const calls = [];
    clearGlobalProps('pSUPERFLY', 'pSUPERFLY_mab', '_cba', '_cbq');
    runRedirect();
    window._cba.push(() => calls.push('first'), () => calls.push('second'));
    assert.deepEqual(calls, ['first'], 'only the first function is called, as by chartbeat.js with pSUPERFLY_pub');
});

test('Keeps pSUPERFLY_mab of the page, e.g. of chartbeat.js', (assert) => {
    const realMab = { evps: () => 'real', svps: () => 'real' };
    window.pSUPERFLY_mab = realMab;
    runRedirect();
    assert.strictEqual(typeof window.pSUPERFLY.virtualPage, 'function', 'pSUPERFLY is defined');
    assert.strictEqual(window.pSUPERFLY_mab, realMab, 'pSUPERFLY_mab is kept');
});

test('No requests, cookies or storage items', (assert) => {
    const calls = [];
    const record = (label) => () => {
        calls.push(label);
    };
    const nativeFetch = window.fetch;
    const nativeOpen = XMLHttpRequest.prototype.open;
    const nativeSetItem = Storage.prototype.setItem;
    const nativeImage = window.Image;
    window.fetch = record('fetch');
    XMLHttpRequest.prototype.open = record('XMLHttpRequest');
    navigator.sendBeacon = record('sendBeacon');
    Storage.prototype.setItem = record('setItem');
    window.Image = record('Image');
    Object.defineProperty(document, 'cookie', {
        configurable: true,
        get: () => '',
        set: record('cookie'),
    });
    const resourcesBefore = performance.getEntriesByType('resource').length;
    try {
        window._sf_async_config = { uid: 1, domain: 'example.org' };
        runRedirect();
        window.pSUPERFLY.virtualPage({ path: '/a', title: 'A' });
        window.pSUPERFLY.activity();
        window.pSUPERFLY.endTracking();
        window._cbq.push(['_acct', 'anon']);
        assert.deepEqual(calls, [], 'no request, cookie or storage item');
        assert.strictEqual(performance.getEntriesByType('resource').length, resourcesBefore, 'no resource is loaded');
    } finally {
        window.fetch = nativeFetch;
        XMLHttpRequest.prototype.open = nativeOpen;
        delete navigator.sendBeacon;
        Storage.prototype.setItem = nativeSetItem;
        window.Image = nativeImage;
        delete document.cookie;
    }
});

test('Shows headlines and images hidden by the snippet of image testing, after the snippet', (assert) => {
    const { headline, images } = addArticle();
    const onContentLoaded = runImageTestingSnippet();
    assert.deepEqual(visibilityOf([headline, ...images]), ['hidden', 'hidden', 'hidden'], 'hidden by the snippet');
    // the redirect resource is loaded after `DOMContentLoaded`
    onContentLoaded();
    assert.true(images.every((image) => image.classList.contains('cb-it-hide')), 'class is added to images');

    runRedirect();
    assert.deepEqual(visibilityOf([headline, ...images]), ['visible', 'visible', 'visible'], 'shown at once');
    assert.true(images.every((image) => !image.classList.contains('cb-it-hide')), 'class is removed');
    assert.strictEqual(document.getElementById('chartbeat-flicker-control-style-ht'), null, 'style is removed');
});

test('Shows images hidden by the snippet of image testing, before the snippet', (assert) => {
    const nativeAddEventListener = window.addEventListener;
    const loadListeners = [];
    window.addEventListener = function (type, listener, ...rest) {
        if (type === 'load') {
            loadListeners.push(listener);
            return undefined;
        }
        return nativeAddEventListener.call(this, type, listener, ...rest);
    };
    Object.defineProperty(document, 'readyState', { configurable: true, get: () => 'loading' });
    const done = assert.async();
    try {
        // as the scriptlet, run before the snippet and before the article is in the page
        runRedirect();
        const { headline, images } = addArticle();
        const onContentLoaded = runImageTestingSnippet();
        setTimeout(() => {
            assert.deepEqual(visibilityOf([headline, ...images]), ['visible', 'visible', 'visible'], 'styles removed');
            onContentLoaded();
            setTimeout(() => {
                const isRemoved = images.every((image) => !image.classList.contains('cb-it-hide'));
                assert.true(isRemoved, 'class added later is removed');
                assert.deepEqual(visibilityOf(images), ['visible', 'visible'], 'images are visible');
                // e.g. a variant of the snippet, which only adds the class; added in a new task and checked
                // in a microtask, before other changes of the page, e.g. the results of the test page,
                // as the callbacks of the observer are run as microtasks after any change
                setTimeout(() => {
                    images[0].classList.add('cb-it-hide');
                    Promise.resolve().then(() => {
                        assert.false(images[0].classList.contains('cb-it-hide'), 'class added alone is removed');
                        loadListeners.forEach((listener) => listener());
                        done();
                    });
                }, 0);
            }, 20);
        }, 20);
    } finally {
        delete document.readyState;
        window.addEventListener = nativeAddEventListener;
    }
});
