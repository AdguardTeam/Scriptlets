import { clearGlobalProps, getRedirectsInstance, evalWrapper } from '../helpers';

const { test, module } = QUnit;
const name = 'googlesyndication-adsbygoogle';

const changingProps = ['adsbygoogle'];

const afterEach = () => {
    clearGlobalProps(...changingProps);
};

let redirects;
const before = async () => {
    redirects = await getRedirectsInstance();
};

module(name, { afterEach, before });

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
    const codeByAdgParams = redirects.getRedirect(name).content;
    const codeByUboParams = redirects.getRedirect('ubo-googlesyndication_adsbygoogle.js').content;

    assert.strictEqual(codeByAdgParams, codeByUboParams);
});

test('Redirect testing', (assert) => {
    const ad = createAdElement();
    evalWrapper(redirects.getRedirect(name).content);

    // check if iframes were created by scriptlet
    const adsbygoogleElems = document.getElementsByClassName('adsbygoogle');
    const hasAdAttr = adsbygoogleElems[0].hasAttribute('data-adsbygoogle-status');
    const createdIframes = adsbygoogleElems[0].getElementsByTagName('iframe');
    const aswiftIframe = document.querySelector('#aswift_0');
    const googleadsIframe = document.querySelector('#google_ads_iframe_0');

    assert.strictEqual(hasAdAttr, true, '.adsbygoogle has \'data-adsbygoogle-status\' attribute');
    assert.ok(aswiftIframe, 'aswift iframe was created by scriptlet');
    assert.notEqual(aswiftIframe.contentWindow.length, 0, 'aswiftIframe.contentWindow was mocked by scriptlet');
    assert.ok(googleadsIframe, 'google_ads iframe was created by scriptlet');
    assert.notEqual(googleadsIframe.contentWindow.length, 0, 'aswiftIframe.contentWindow was mocked by scriptlet');
    assert.strictEqual(createdIframes.length, 2, '2 iframes was created as a child of .adsbygoogle');

    assert.strictEqual(window.adsbygoogle.length, undefined, 'adsbygoogle.length check');
    assert.strictEqual(window.adsbygoogle.push.length, 1, 'push.length check');
    const pushCallback = (arg) => {
        try {
            // Test for https://github.com/AdguardTeam/Scriptlets/issues/252
            // If arg is not defined then error will be thrown
            if (arg.whatever) {
                arg.whatever = 1;
            }
            assert.ok(typeof arg !== 'undefined', 'arg is defined');
        } catch (error) {
            assert.ok(false, 'something went wrong');
        }
    };
    const pushArg = {
        test: 'test',
        callback: pushCallback,
    };
    window.adsbygoogle.push(pushArg);
    assert.strictEqual(window.adsbygoogle.length, 1, 'API was mocked');

    removeBodyElement(ad);
});

test('Calls the callback of a rewarded ad without an ad', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);
    const calls = [];
    // as ssstik.io: the page shows the rewarded ad in the callback, and continues without it
    window.adsbygoogle.push({
        params: {
            google_ad_slot: '2860132821',
            google_ad_format: 'rewarded',
            google_ad_loaded_callback(...args) {
                calls.push(args.length);
            },
        },
    });
    assert.deepEqual(calls, [0], 'callback is called once, without an argument');

    window.adsbygoogle.push({
        params: {
            google_ad_loaded_callback() {
                throw new Error('error of the page');
            },
        },
    });
    window.adsbygoogle.push({ params: null });
    window.adsbygoogle.push({ params: { google_ad_loaded_callback: 'not a function' } });
    assert.ok(true, 'errors of the page and invalid callbacks are ignored');
});

test('Fills placeholders which the page adds later', (assert) => {
    const first = createAdElement();
    evalWrapper(redirects.getRedirect(name).content);
    assert.strictEqual(first.querySelectorAll('iframe').length, 2, 'existing placeholder is filled');

    // as AdSense, the page pushes its ad after adding the placeholder
    const second = createAdElement();
    assert.strictEqual(second.querySelectorAll('iframe').length, 0, 'not filled before the push');
    window.adsbygoogle.push({});
    assert.strictEqual(second.getAttribute('data-adsbygoogle-status'), 'done', 'status of the new placeholder');
    assert.strictEqual(second.querySelectorAll('iframe').length, 2, 'new placeholder is filled on push');
    assert.strictEqual(first.querySelectorAll('iframe').length, 2, 'existing placeholder is not filled again');
    const ids = [...document.querySelectorAll('.adsbygoogle iframe')].map((frame) => frame.id).sort();
    assert.deepEqual(ids, ['aswift_0', 'aswift_1', 'google_ads_iframe_0', 'google_ads_iframe_1'], 'ids are unique');

    removeBodyElement(first);
    removeBodyElement(second);
});

test('Fills placeholders once the document is parsed, e.g. as a scriptlet', (assert) => {
    // as a scriptlet, the resource is run before the placeholders of the page are parsed
    Object.defineProperty(document, 'readyState', { configurable: true, get: () => 'loading' });
    try {
        evalWrapper(redirects.getRedirect(name).content);
    } finally {
        delete document.readyState;
    }
    const ad = createAdElement();
    assert.strictEqual(ad.querySelectorAll('iframe').length, 0, 'not filled before DOMContentLoaded');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    assert.strictEqual(ad.querySelectorAll('iframe').length, 2, 'filled on DOMContentLoaded');
    removeBodyElement(ad);
});

test('Fills a placeholder with other content only once', (assert) => {
    // as pages, e.g. a line break in `<ins class="adsbygoogle">\n</ins>`, a comment or an element
    const withText = createAdElement();
    withText.appendChild(document.createTextNode('\n'));
    const withContent = createAdElement();
    withContent.appendChild(document.createComment('ad'));
    withContent.appendChild(document.createElement('div'));
    const ownFrames = (elem) => elem.querySelectorAll(':scope > iframe').length;

    evalWrapper(redirects.getRedirect(name).content);
    assert.strictEqual(ownFrames(withText), 2, 'placeholder with a line break is filled');
    assert.strictEqual(ownFrames(withContent), 2, 'placeholder with a comment and an element is filled');

    window.adsbygoogle.push({});
    window.adsbygoogle.push({});
    window.adsbygoogle.push({});
    assert.strictEqual(ownFrames(withText), 2, 'not filled again on each push');
    assert.strictEqual(ownFrames(withContent), 2, 'not filled again on each push, with other content');
    assert.strictEqual(withContent.querySelectorAll(':scope > div').length, 1, 'content of the page is kept');

    // e.g. as a scriptlet and as a redirect
    evalWrapper(redirects.getRedirect(name).content);
    assert.strictEqual(ownFrames(withText), 2, 'not filled again by another run');

    removeBodyElement(withText);
    removeBodyElement(withContent);
});
