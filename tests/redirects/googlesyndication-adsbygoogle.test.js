import {
    clearGlobalProps,
    getRedirectsInstance,
    evalWrapper,
    sleep,
} from '../helpers';

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

test('Sets the status attributes of a filled placeholder, as AdSense', async (assert) => {
    const filled = createAdElement();
    // a status which the page or another rule has set is kept
    const preset = createAdElement();
    preset.setAttribute('data-ad-status', 'unfilled');
    evalWrapper(redirects.getRedirect(name).content);

    assert.strictEqual(filled.getAttribute('data-adsbygoogle-status'), 'done', 'processing status is set at once');
    assert.false(filled.hasAttribute('data-ad-status'), 'ad status is not set at once');
    const frame = filled.querySelector('iframe[id^="aswift_"]');
    assert.strictEqual(frame.getAttribute('data-load-complete'), 'true', 'frame is loaded');
    assert.false(
        filled.querySelector('iframe[id^="google_ads_iframe_"]').hasAttribute('data-load-complete'),
        'only the frame of AdSense gets data-load-complete',
    );

    // as page code which observes the placeholder, and then pushes it, e.g. on tempmail.ninja
    const observed = createAdElement();
    // the order of the changes, as by AdSense: processed, frame loaded, ad loaded
    const order = [];
    const orderObserver = new MutationObserver((records) => {
        records.forEach((record) => order.push(record.attributeName));
    });
    orderObserver.observe(observed, {
        attributeFilter: ['data-adsbygoogle-status', 'data-load-complete', 'data-ad-status'],
        subtree: true,
    });
    let statusAtLoad = 'not loaded';
    observed.addEventListener('load', (event) => {
        if (event.target.id.startsWith('aswift_')) {
            statusAtLoad = observed.getAttribute('data-adsbygoogle-status');
        }
    }, true);
    const statuses = [];
    const loaded = [];
    const observer = new MutationObserver((records) => {
        records.forEach((record) => {
            if (record.attributeName === 'data-ad-status') {
                statuses.push(observed.getAttribute('data-ad-status'));
            } else {
                loaded.push(`${record.target.id}:${record.target.getAttribute('data-load-complete')}`);
            }
        });
    });
    observer.observe(observed, {
        attributeFilter: ['data-ad-status', 'data-load-complete'],
        subtree: true,
    });
    // placeholders which AdSense itself has taken, e.g. if the resource runs as a scriptlet after it:
    // with its host element, and without it, e.g. for a placeholder without a size
    const taken = createAdElement();
    taken.setAttribute('data-adsbygoogle-status', 'done');
    const host = document.createElement('div');
    host.id = 'aswift_7_host';
    taken.appendChild(host);
    const takenWithoutHost = createAdElement();
    takenWithoutHost.setAttribute('data-adsbygoogle-status', 'done');
    const takenLoaded = [];
    const takenObserver = new MutationObserver((records) => {
        records.forEach((record) => takenLoaded.push(record.target.id));
    });
    [taken, takenWithoutHost].forEach((element) => {
        takenObserver.observe(element, { attributeFilter: ['data-load-complete'], subtree: true });
    });
    window.adsbygoogle.push({});

    await sleep(20);
    observer.disconnect();
    assert.strictEqual(filled.getAttribute('data-ad-status'), 'filled', 'ad status is set later');
    assert.strictEqual(preset.getAttribute('data-ad-status'), 'unfilled', 'existing ad status is kept');
    assert.deepEqual(statuses, ['filled'], 'the observer of the page sees the ad status');
    assert.strictEqual(loaded.length, 1, 'the observer of the page sees the loaded frame');
    assert.ok(/^aswift_\d+:true$/.test(loaded[0]), 'of AdSense');
    takenObserver.disconnect();
    orderObserver.disconnect();
    assert.deepEqual(
        order,
        ['data-adsbygoogle-status', 'data-load-complete', 'data-ad-status'],
        'processed, frame loaded, ad loaded',
    );
    assert.strictEqual(statusAtLoad, 'done', 'the placeholder is processed when its frame is loaded');
    assert.false(taken.hasAttribute('data-ad-status'), 'no ad status for a placeholder which AdSense has taken');
    assert.false(takenWithoutHost.hasAttribute('data-ad-status'), 'also without its host element');
    assert.deepEqual(takenLoaded, [], 'and their frames are not marked as loaded');
    assert.strictEqual(takenWithoutHost.querySelectorAll('iframe').length, 2, 'they are filled, as before');

    removeBodyElement(filled);
    removeBodyElement(preset);
    removeBodyElement(observed);
    removeBodyElement(taken);
    removeBodyElement(takenWithoutHost);
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

test('Handles objects which the page has pushed before, as AdSense', (assert) => {
    const ad = createAdElement();
    const calls = [];
    // as pages: `(adsbygoogle = window.adsbygoogle || []).push({})` before the script is loaded
    const queue = [];
    window.adsbygoogle = queue;
    queue.push({});
    queue.push({
        params: {
            google_ad_slot: '2860132821',
            google_ad_format: 'rewarded',
            google_ad_loaded_callback(...args) {
                calls.push(`callback ${args.length}`);
                // pushed to the array, which is not replaced yet, as by AdSense
                window.adsbygoogle.push({ nested() { calls.push('nested'); } });
            },
        },
    });
    queue.push({ adBreakDone(arg) { calls.push(`adBreakDone ${typeof arg}`); } });

    evalWrapper(redirects.getRedirect(name).content);
    assert.deepEqual(calls, ['callback 0', 'adBreakDone object', 'nested'], 'queued callbacks are called in order');
    assert.strictEqual(queue.length, 0, 'objects are removed from the array of the page');
    assert.notStrictEqual(window.adsbygoogle, queue, 'array is replaced');
    assert.true(window.adsbygoogle.loaded, 'by the mock');
    assert.strictEqual(window.adsbygoogle.length, undefined, 'length is not set by queued objects');
    assert.strictEqual(ad.querySelectorAll('iframe').length, 2, 'placeholder is filled once');

    removeBodyElement(ad);
});

test('Handles at most 20 objects pushed before, and a frozen array', (assert) => {
    const calls = [];
    const countCall = () => calls.push(1);
    const queue = [];
    for (let i = 0; i < 25; i += 1) {
        queue.push({ countCall });
    }
    window.adsbygoogle = queue;
    evalWrapper(redirects.getRedirect(name).content);
    assert.strictEqual(calls.length, 20, '20 objects are handled, as by AdSense');
    assert.strictEqual(queue.length, 5, 'other ones are left');

    // as AdSense, an error of one object does not stop the next ones
    window.adsbygoogle = [{
        get params() {
            throw new Error('error of the page');
        },
    }, { countCall }];
    evalWrapper(redirects.getRedirect(name).content);
    assert.strictEqual(calls.length, 21, 'object after an object which throws is handled');

    window.adsbygoogle = Object.freeze([{ countCall }]);
    evalWrapper(redirects.getRedirect(name).content);
    assert.true(window.adsbygoogle.loaded, 'frozen array is replaced');
    window.adsbygoogle.push({ countCall });
    assert.strictEqual(calls.length, 22, 'mock works');
});

test('Handles an object of another frame', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);
    const frame = document.createElement('iframe');
    document.body.appendChild(frame);
    const calls = [];
    frame.contentWindow.calls = calls;
    const arg = frame.contentWindow.eval(`({
        adBreakDone() { calls.push('adBreakDone'); },
        params: {
            google_ad_format: 'rewarded',
            google_ad_slot: '2860132821',
            google_ad_loaded_callback(...args) { calls.push('callback ' + args.length); },
        },
    })`);
    window.adsbygoogle.push(arg);
    assert.deepEqual(calls, ['adBreakDone', 'callback 0'], 'function and callback of the object are called');

    // e.g. options with defaults of the publisher
    const withDefaults = Object.create({ name: 'defaults' });
    withDefaults.adBreakDone = () => calls.push('adBreakDone with defaults');
    window.adsbygoogle.push(withDefaults);
    assert.deepEqual(calls, ['adBreakDone', 'callback 0', 'adBreakDone with defaults'], 'object with a prototype');
    calls.length = 2;

    const inherited = Object.create({ google_ad_loaded_callback: () => calls.push('inherited') });
    window.adsbygoogle.push({ params: inherited });
    assert.deepEqual(calls, ['adBreakDone', 'callback 0'], 'as AdSense, an inherited callback is not called');

    document.body.removeChild(frame);
});

test('Fills placeholders when a frame has no window, e.g. above the limit of frames', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);
    const descriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
    const failing = createAdElement();
    // e.g. as a placeholder of the page which throws
    failing.setAttribute = () => {
        throw new Error('error of the page');
    };
    const ad = createAdElement();
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', { configurable: true, get: () => null });
    try {
        window.adsbygoogle.push({});
    } finally {
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', descriptor);
    }
    assert.strictEqual(failing.querySelectorAll('iframe').length, 0, 'placeholder which throws is not filled');
    assert.strictEqual(ad.querySelectorAll(':scope > iframe').length, 2, 'next placeholder is filled');
    assert.strictEqual(ad.querySelectorAll('iframe iframe').length, 0, 'without frames inside');

    window.adsbygoogle.push({});
    assert.strictEqual(ad.querySelectorAll(':scope > iframe').length, 2, 'not filled again');

    removeBodyElement(failing);
    removeBodyElement(ad);
});

test('Fills placeholders once in a frame sandboxed without allow-same-origin', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);
    const descriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
    const ad = createAdElement();
    // as in such a frame, the document of a frame which it creates cannot be accessed
    const crossOriginWindow = Object.defineProperty({}, 'document', {
        get: () => {
            throw new DOMException('Blocked a frame from accessing a cross-origin frame.', 'SecurityError');
        },
    });
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
        configurable: true,
        get: () => crossOriginWindow,
    });
    try {
        window.adsbygoogle.push({});
        assert.strictEqual(ad.querySelectorAll(':scope > iframe').length, 2, 'filled by one push');
        for (let i = 0; i < 5; i += 1) {
            window.adsbygoogle.push({});
        }
    } finally {
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', descriptor);
    }
    assert.strictEqual(ad.querySelectorAll(':scope > iframe[id^="aswift_"]').length, 1, 'one aswift frame');
    const googleAdsFrames = ad.querySelectorAll(':scope > iframe[id^="google_ads_iframe_"]');
    assert.strictEqual(googleAdsFrames.length, 1, 'one google_ads frame');
    assert.strictEqual(ad.querySelectorAll('iframe iframe').length, 0, 'without frames inside');

    removeBodyElement(ad);
});

/**
 * Runs the redirect in a frame with an ad placeholder which is pushed, and returns the attributes
 * of the placeholder and of its frame, which the frame posts once the ad status may be set.
 *
 * @param {string} content Code of the redirect.
 * @param {string|null} sandbox Value of the `sandbox` attribute of the frame, or `null` for a same-origin frame.
 * @returns {Promise<object>} Attributes.
 */
const runInFrame = (content, sandbox) => new Promise((resolve) => {
    const frame = document.createElement('iframe');
    if (sandbox !== null) {
        frame.setAttribute('sandbox', sandbox);
    }
    const id = `frame-${Math.random()}`;
    const onMessage = (event) => {
        if (event.data && event.data.id === id) {
            window.removeEventListener('message', onMessage);
            frame.remove();
            resolve(event.data);
        }
    };
    window.addEventListener('message', onMessage);
    // built at run time, as the tests are inlined into the test page in a script element
    const scriptEnd = ['<', '/script>'].join('');
    frame.srcdoc = `<ins class="adsbygoogle"></ins><script>${content}${scriptEnd}<script>
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setTimeout(() => {
            const ad = document.querySelector('ins');
            const adFrame = ad.querySelector('iframe[id^="aswift_"]');
            window.parent.postMessage({
                id: ${JSON.stringify(id)},
                status: ad.getAttribute('data-adsbygoogle-status'),
                adStatus: ad.getAttribute('data-ad-status'),
                loadComplete: adFrame && adFrame.getAttribute('data-load-complete'),
            }, '*');
        }, 50);
    ${scriptEnd}`;
    document.body.appendChild(frame);
});

test('Sets the ad status only in a frame which can access the top document, as AdSense', async (assert) => {
    const { content } = redirects.getRedirect(name);
    // a frame sandboxed without allow-same-origin cannot access the top document, as a cross-origin one
    const crossOrigin = await runInFrame(content, 'allow-scripts');
    assert.strictEqual(crossOrigin.status, 'done', 'cross-origin: processed');
    assert.strictEqual(crossOrigin.loadComplete, 'true', 'cross-origin: frame loaded');
    assert.strictEqual(crossOrigin.adStatus, null, 'cross-origin: no ad status');

    const sameOrigin = await runInFrame(content, null);
    assert.strictEqual(sameOrigin.status, 'done', 'same-origin: processed');
    assert.strictEqual(sameOrigin.loadComplete, 'true', 'same-origin: frame loaded');
    assert.strictEqual(sameOrigin.adStatus, 'filled', 'same-origin: ad status');
});

test('Appends only the missing frame to a placeholder', async (assert) => {
    evalWrapper(redirects.getRedirect(name).content);
    const ad = createAdElement();
    // e.g. a placeholder of the page which fails once to append the second frame
    let isFailing = true;
    ad.appendChild = function appendChild(node) {
        if (isFailing && node.id.startsWith('google_ads_iframe_')) {
            isFailing = false;
            throw new Error('error of the page');
        }
        return Node.prototype.appendChild.call(this, node);
    };
    const statusWrites = [];
    const observer = new MutationObserver((records) => {
        records.forEach((record) => statusWrites.push(record.attributeName));
    });
    observer.observe(ad, { attributeFilter: ['data-adsbygoogle-status'] });
    window.adsbygoogle.push({});
    assert.strictEqual(ad.querySelectorAll(':scope > iframe').length, 1, 'first frame is appended');
    window.adsbygoogle.push({});
    window.adsbygoogle.push({});
    const aswiftFrames = ad.querySelectorAll(':scope > iframe[id^="aswift_"]');
    assert.strictEqual(aswiftFrames.length, 1, 'first frame is not appended again');
    const googleAdsFrames = ad.querySelectorAll(':scope > iframe[id^="google_ads_iframe_"]');
    assert.strictEqual(googleAdsFrames.length, 1, 'missing frame is appended');
    await sleep(20);
    observer.disconnect();
    assert.deepEqual(statusWrites, ['data-adsbygoogle-status'], 'not marked as processed again');
    // the placeholder is not taken for one of AdSense, as it has a frame of this resource
    assert.strictEqual(ad.getAttribute('data-ad-status'), 'filled', 'ad status is set once it is filled');

    removeBodyElement(ad);
});

test('Fills a placeholder whose first frame fails to be appended as its own', async (assert) => {
    evalWrapper(redirects.getRedirect(name).content);
    const ad = createAdElement();
    let isFailing = true;
    ad.appendChild = function appendChild(node) {
        if (isFailing && node.id.startsWith('aswift_')) {
            isFailing = false;
            throw new Error('error of the page');
        }
        return Node.prototype.appendChild.call(this, node);
    };
    const statusChanges = [];
    const observer = new MutationObserver((records) => {
        records.forEach((record) => statusChanges.push(record.attributeName));
    });
    observer.observe(ad, { attributeFilter: ['data-adsbygoogle-status'] });
    window.adsbygoogle.push({});
    assert.false(ad.hasAttribute('data-adsbygoogle-status'), 'not marked as processed if no frame is appended');
    await sleep(0);
    statusChanges.length = 0;
    window.adsbygoogle.push({});
    window.adsbygoogle.push({});
    await sleep(20);
    observer.disconnect();
    assert.strictEqual(ad.querySelectorAll(':scope > iframe').length, 2, 'both frames are appended on the next push');
    assert.strictEqual(ad.getAttribute('data-ad-status'), 'filled', 'it gets the ad status');
    const frame = ad.querySelector(':scope > iframe[id^="aswift_"]');
    assert.strictEqual(frame.getAttribute('data-load-complete'), 'true', 'its frame is marked as loaded');
    assert.deepEqual(statusChanges, ['data-adsbygoogle-status'], 'marked as processed once when it is filled');

    // a placeholder which AdSense has marked as processed keeps its status if the frame fails to be appended
    const taken = createAdElement();
    taken.setAttribute('data-adsbygoogle-status', 'done');
    taken.appendChild = () => {
        throw new Error('error of the page');
    };
    // a placeholder which AdSense has reserved for itself, e.g. of Auto ads, and one with another status,
    // e.g. set by another rule, keep their status as well
    const reserved = createAdElement();
    reserved.setAttribute('data-adsbygoogle-status', 'reserved');
    reserved.appendChild = taken.appendChild;
    const other = createAdElement();
    other.setAttribute('data-adsbygoogle-status', 'other');
    other.appendChild = taken.appendChild;
    window.adsbygoogle.push({});
    assert.strictEqual(taken.getAttribute('data-adsbygoogle-status'), 'done', 'status of AdSense is kept');
    assert.strictEqual(reserved.getAttribute('data-adsbygoogle-status'), 'reserved', 'reserved status is kept');
    assert.strictEqual(other.getAttribute('data-adsbygoogle-status'), 'other', 'other status is restored');

    removeBodyElement(ad);
    removeBodyElement(taken);
    removeBodyElement(reserved);
    removeBodyElement(other);
});

test('Does not take a placeholder which AdSense has reserved for itself', async (assert) => {
    evalWrapper(redirects.getRedirect(name).content);
    const reserved = createAdElement();
    reserved.setAttribute('data-adsbygoogle-status', 'reserved');
    const loaded = [];
    const observer = new MutationObserver((records) => {
        records.forEach((record) => loaded.push(record.attributeName));
    });
    observer.observe(reserved, { attributeFilter: ['data-load-complete', 'data-adsbygoogle-status'], subtree: true });
    window.adsbygoogle.push({});
    await sleep(20);
    observer.disconnect();
    assert.strictEqual(reserved.getAttribute('data-adsbygoogle-status'), 'reserved', 'it stays reserved for AdSense');
    assert.false(reserved.hasAttribute('data-ad-status'), 'it gets no ad status');
    assert.deepEqual(loaded, [], 'its frame is not marked as loaded, nor its status changed');

    removeBodyElement(reserved);
});

// callbacks of the Ad Placement API are called after the call of the page returns
const waitForCallbacks = () => new Promise((resolve) => {
    setTimeout(resolve, 20);
});

test('Answers adConfig() and breaks without an ad', async (assert) => {
    evalWrapper(redirects.getRedirect(name).content);
    const calls = [];
    // as Google's example
    const adBreak = (o) => window.adsbygoogle.push(o);
    const adConfig = adBreak;
    adConfig({ preloadAdBreaks: 'on', sound: 'on', onReady: (...args) => calls.push(`onReady ${args.length}`) });
    adConfig({ sound: 'off' });
    const breakOf = (type, breakName) => ({
        type,
        name: breakName,
        beforeAd: () => calls.push(`beforeAd ${breakName}`),
        afterAd: () => calls.push(`afterAd ${breakName}`),
        adBreakDone: (info) => calls.push(info),
    });
    adBreak(breakOf('preroll', 'start-game'));
    adBreak(breakOf('next', 'level-2'));
    adBreak(breakOf('preroll', 'again'));
    assert.deepEqual(calls, [], 'not called before the call of the page returns');

    await waitForCallbacks();
    assert.deepEqual(calls, [
        'onReady 0',
        {
            breakType: 'preroll', breakName: 'start-game', breakFormat: 'preroll', breakStatus: 'frequencyCapped',
        },
        {
            breakType: 'next', breakName: 'level-2', breakFormat: 'interstitial', breakStatus: 'frequencyCapped',
        },
        {
            breakType: 'preroll', breakName: 'again', breakFormat: 'preroll', breakStatus: 'invalid',
        },
    ], 'only onReady() and adBreakDone() are called, without an ad');
});

test('Grants the reward of a reward break once the player accepts it', async (assert) => {
    evalWrapper(redirects.getRedirect(name).content);
    const calls = [];
    let showAdFn;
    window.adsbygoogle.push({
        type: 'reward',
        name: 'continue',
        beforeReward: (show) => {
            calls.push(`beforeReward ${typeof show}`);
            showAdFn = show;
        },
        beforeAd: () => calls.push('beforeAd'),
        afterAd: () => calls.push('afterAd'),
        adDismissed: () => calls.push('adDismissed'),
        adViewed: () => calls.push('adViewed'),
        adBreakDone: (info) => calls.push(info.breakStatus),
    });
    // as AdSense, e.g. so that the game can enable its reward button at once
    assert.deepEqual(calls, ['beforeReward function'], 'reward is offered before the call returns');
    await waitForCallbacks();
    assert.deepEqual(calls, ['beforeReward function'], 'reward is offered, not granted yet');

    // the player clicks the button of the game
    showAdFn();
    showAdFn();
    await waitForCallbacks();
    assert.deepEqual(calls, [
        'beforeReward function',
        'beforeAd',
        'adViewed',
        'afterAd',
        'viewed',
    ], 'reward is granted once, as for a watched ad, and adDismissed() is not called');

    // e.g. after the player has clicked a button to get a reward, the game shows the ad at once
    window.adsbygoogle.push({
        type: 'reward',
        name: 'coins',
        beforeReward: (show) => show(),
        adViewed: () => calls.push('adViewed coins'),
    });
    await waitForCallbacks();
    assert.strictEqual(calls[calls.length - 1], 'adViewed coins', 'reward accepted in beforeReward() is granted');
});

test('Ends an offered reward with the ignored status on the next break', async (assert) => {
    evalWrapper(redirects.getRedirect(name).content);
    const calls = [];
    let showFirst;
    window.adsbygoogle.push({
        type: 'reward',
        name: 'first',
        beforeReward: (show) => {
            showFirst = show;
        },
        adViewed: () => calls.push('adViewed first'),
        adBreakDone: (info) => calls.push(`${info.breakName} ${info.breakStatus}`),
    });
    await waitForCallbacks();
    window.adsbygoogle.push({
        type: 'next',
        name: 'second',
        adBreakDone: (info) => calls.push(`${info.breakName} ${info.breakStatus}`),
    });
    await waitForCallbacks();
    showFirst();
    await waitForCallbacks();
    assert.deepEqual(calls, ['first ignored', 'second frequencyCapped'], 'reward is not granted after the next break');

    // a reward break without beforeReward() cannot offer the reward
    window.adsbygoogle.push({
        type: 'reward',
        name: 'third',
        adViewed: () => calls.push('adViewed third'),
        adBreakDone: (info) => calls.push(`${info.breakName} ${info.breakFormat} ${info.breakStatus}`),
    });
    await waitForCallbacks();
    assert.strictEqual(calls[2], 'third reward frequencyCapped', 'without beforeReward() as without an ad');
});

test('Answers calls of the Ad Placement API queued before, and errors of callbacks', async (assert) => {
    const calls = [];
    // as Google's example, before the script is loaded
    window.adsbygoogle = window.adsbygoogle || [];
    const adBreak = (o) => window.adsbygoogle.push(o);
    const adConfig = adBreak;
    adConfig({
        preloadAdBreaks: 'on',
        onReady: () => {
            calls.push('onReady');
            throw new Error('error of the page');
        },
    });
    adBreak({
        type: 'preroll',
        name: 'start',
        adBreakDone: () => {
            calls.push('adBreakDone');
            throw new Error('error of the page');
        },
    });
    evalWrapper(redirects.getRedirect(name).content);
    let showAdFn;
    adBreak({
        type: 'reward',
        name: 'coins',
        beforeReward: (show) => {
            showAdFn = show;
        },
        beforeAd: () => {
            throw new Error('error of the page');
        },
        adViewed: () => calls.push('adViewed'),
    });
    await waitForCallbacks();
    showAdFn();
    await waitForCallbacks();
    assert.deepEqual(calls, ['onReady', 'adBreakDone', 'adViewed'], 'queued calls are answered, errors are ignored');
});

test('Offers only the reward of the last of two reward breaks, as AdSense', async (assert) => {
    evalWrapper(redirects.getRedirect(name).content);
    const calls = [];
    const shows = {};
    const rewardBreak = (breakName) => ({
        type: 'reward',
        name: breakName,
        beforeReward: (show) => {
            calls.push(`beforeReward ${breakName}`);
            shows[breakName] = show;
        },
        adViewed: () => calls.push(`adViewed ${breakName}`),
        adBreakDone: (info) => calls.push(`${breakName} ${info.breakStatus}`),
    });
    // e.g. both queued before the script is loaded, or one after another
    window.adsbygoogle.push(rewardBreak('first'));
    window.adsbygoogle.push(rewardBreak('second'));
    assert.deepEqual(calls, ['beforeReward first', 'beforeReward second'], 'each offered before its call returns');
    await waitForCallbacks();
    shows.first();
    shows.second();
    await waitForCallbacks();
    assert.deepEqual(calls, [
        'beforeReward first',
        'beforeReward second',
        'first ignored',
        'adViewed second',
        'second viewed',
    ], 'first one is ignored after the second call returns');
});

test('Keeps the state of breaks when the resource runs twice, e.g. as a scriptlet and a redirect', async (assert) => {
    evalWrapper(redirects.getRedirect(name).content);
    const mock = window.adsbygoogle;
    const calls = [];
    let showFirst;
    window.adsbygoogle.push({
        type: 'preroll',
        name: 'first-preroll',
        adBreakDone: (info) => calls.push(`${info.breakName} ${info.breakStatus}`),
    });
    window.adsbygoogle.push({
        type: 'reward',
        name: 'reward',
        beforeReward: (show) => {
            showFirst = show;
        },
        adViewed: () => calls.push('adViewed'),
        adBreakDone: (info) => calls.push(`${info.breakName} ${info.breakStatus}`),
    });
    await waitForCallbacks();

    evalWrapper(redirects.getRedirect(name).content);
    assert.strictEqual(window.adsbygoogle, mock, 'loaded object is kept');
    window.adsbygoogle.push({
        type: 'preroll',
        name: 'second-preroll',
        adBreakDone: (info) => calls.push(`${info.breakName} ${info.breakStatus}`),
    });
    await waitForCallbacks();
    showFirst();
    await waitForCallbacks();
    assert.deepEqual(calls, [
        'first-preroll frequencyCapped',
        'reward ignored',
        'second-preroll invalid',
    ], 'offered reward is ended by the next break, second preroll is invalid');

    // an array of the page is replaced, even if another rule has set its `loaded`
    const queue = [{ name: 'queued', adBreakDone: () => calls.push('queued') }];
    queue.loaded = true;
    window.adsbygoogle = queue;
    evalWrapper(redirects.getRedirect(name).content);
    assert.notStrictEqual(window.adsbygoogle, queue, 'array is replaced');
    assert.strictEqual(calls[3], 'queued', 'its objects are handled');
});
