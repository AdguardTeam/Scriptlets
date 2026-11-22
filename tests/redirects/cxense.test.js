/* eslint-disable no-underscore-dangle, func-names */
import {
    clearCookie,
    clearGlobalProps,
    evalWrapper,
    getRedirectsInstance,
    sleep,
} from '../helpers';

const { test, module } = QUnit;
const name = 'cxense';

const SEARCH_URL = 'https://api.cxense.com/document/search?callback={{callback}}&persisted=abcdef&json=%7B%7D';

let redirects;

const before = async () => {
    redirects = await getRedirectsInstance();
};

const WIDGET_WATCH_AFTER_LOAD_MS = 10000;
const nativeSetTimeout = window.setTimeout;
// functions which stop watching for widget elements, 10 seconds after the page is loaded
let stopWatching = [];

/**
 * Stops the resources which watch for widget elements, as 10 seconds after the page is loaded.
 */
const stopWatchingWidgets = () => {
    stopWatching.forEach((stop) => stop());
    stopWatching = [];
};

const beforeEach = () => {
    // the timers which stop watching are kept, so that a resource does not show widgets in the next tests
    window.setTimeout = (callback, delay, ...args) => {
        if (delay === WIDGET_WATCH_AFTER_LOAD_MS) {
            stopWatching.push(callback);
            return 0;
        }
        return nativeSetTimeout(callback, delay, ...args);
    };
};

const afterEach = () => {
    stopWatchingWidgets();
    window.setTimeout = nativeSetTimeout;
    Object.keys(window)
        .filter((key) => key.indexOf('cXJsonpCB') === 0)
        .forEach((key) => clearGlobalProps(key));
    clearGlobalProps('cX', 'cxenseWidgetCode');
    document.querySelectorAll('.cxense-test').forEach((element) => element.remove());
};

module(name, { before, beforeEach, afterEach });

const runRedirect = () => {
    evalWrapper(redirects.getRedirect(name).content);
};

/**
 * Replaces `fetch()` with a mock which records its calls.
 *
 * @param {Function} respond returns the promise of a call
 * @returns {{ calls: object[], restore: Function }} recorded calls and a restore function
 */
const mockFetch = (respond, respondImage) => {
    const calls = [];
    const imageCalls = [];
    const nativeFetch = window.fetch;
    window.fetch = (url, init) => {
        // requests of images of widget items are recorded separately
        if (String(url).indexOf('https://api.cxense.com/') !== 0) {
            imageCalls.push({ url: String(url), init });
            // eslint-disable-next-line no-use-before-define
            return respondImage ? respondImage(String(url), init) : imageResponse();
        }
        calls.push({ url: String(url), init });
        return respond(url, init);
    };
    return {
        calls,
        imageCalls,
        restore: () => {
            window.fetch = nativeFetch;
        },
    };
};

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

/**
 * Returns a response with an image of one pixel.
 *
 * @param {string} [type] content type
 * @param {object} [headers] other headers
 * @param {number} [status] status
 * @returns {Promise<Response>} response
 */
const imageResponse = (type = 'image/png', headers = {}, status = 200) => {
    const bytes = Uint8Array.from(atob(PNG), (char) => char.charCodeAt(0));
    return Promise.resolve(new Response(new Blob([bytes]), {
        status,
        headers: { 'Content-Type': type, ...headers },
    }));
};

/**
 * Returns a response with JSON, after an optional delay.
 *
 * @param {object} data response data
 * @param {number} [delay] delay in ms
 * @returns {Promise<Response>} response
 */
const jsonResponse = (data, delay = 0, status = 200) => new Promise((resolve) => {
    setTimeout(() => resolve(new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })), delay);
});

const WIDGET_1 = '778bbff92ceb25d61d6157ffad062a3240da6995';
const WIDGET_2 = '25427cee0c1768c2cfd62ee52c95472874083301';
const WIDGET_3 = '5bb00fa54e03f5038464be0f263b7435f2a658a9';
const WIDGET_4 = '1986bba60554d553e308d4a2bf49064a96168dbd';
const IMAGE_URL = `${window.location.origin}/test-files/test-pixel.png`;
// the end tag of a script would end the script of the test page, in which the tests are inlined
const SCRIPT_END = ['<', '/script>'].join('');

/**
 * Returns the URL which the resource requests for a widget.
 *
 * @param {string} widgetId widget id
 * @returns {string} URL
 */
const getWidgetUrl = (widgetId) => {
    return `https://api.cxense.com/public/widget/data?json=%7B%22widgetId%22%3A%22${widgetId}%22%7D`;
};

/**
 * Returns the id of the widget which is requested by the URL.
 *
 * @param {string} url URL of a widget request
 * @returns {string} widget id
 */
const getWidgetIdOfUrl = (url) => /%22([0-9a-f]{40})%22%7D$/.exec(String(url))[1];

/**
 * Returns an item of a widget response, as a recommended article of the page's site.
 *
 * @param {number} number number of the article
 * @param {object} [extra] other fields
 * @returns {object} item
 */
const widgetItem = (number, extra = {}) => ({
    id: `781682883829c4d42d19e574e6a1994e9872${number}`,
    title: `Article ${number}`,
    url: `${window.location.origin}/articles/${number}`,
    click_url: `http://api.cxense.com/public/widget/click/${number}`,
    ...extra,
});

/**
 * Returns a widget response with the items, and with code which must not be run.
 *
 * @param {object[]} items items
 * @returns {object} response data
 */
const widgetData = (items) => ({
    items,
    template: `<script>window.cxenseWidgetCode = "template";${SCRIPT_END}<!--% window.cxenseWidgetCode = 1; %-->`,
    style: 'body { display: none !important; }',
    head: `<script>window.cxenseWidgetCode = "head";${SCRIPT_END}`,
    prnd: 'abc',
});

/**
 * Adds an element to the page, which is removed after the test.
 *
 * @param {string} id id of the element
 * @param {string} [tagName] tag name
 * @returns {HTMLElement} element
 */
const addElement = (id, tagName = 'div') => {
    const element = document.createElement(tagName);
    element.id = id;
    element.className = 'cxense-test';
    document.body.appendChild(element);
    return element;
};

/**
 * Returns the links of the widget which the resource has shown in the element.
 *
 * @param {Element} target element of the widget
 * @returns {object[]|null} `href`, text and image of the links, or `null` if no widget is shown
 */
const getWidgetLinks = (target) => {
    const host = target.querySelector('div');
    if (!host || !host.shadowRoot) {
        return null;
    }
    return Array.from(host.shadowRoot.querySelectorAll('ul > li > a')).map((link) => {
        const image = link.querySelector('img');
        return {
            href: link.href,
            text: link.textContent,
            // an image is shown from a blob, after it is requested without cookies
            image: image ? image.src.slice(0, 5) : null,
        };
    });
};

/**
 * Waits until the resource has searched for widget elements and the mocked responses are processed.
 */
const waitForWidgets = () => sleep(120);

const IMAGE_REQUEST = { credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error' };

/**
 * Scrolls to the widget, as its images are requested only near the viewport, and waits for them.
 *
 * @param {Element} target element of the widget
 */
const waitForImages = async (target) => {
    target.scrollIntoView();
    await sleep(300);
};

/**
 * Returns the names of the JSONP callbacks of the resource.
 *
 * @returns {string[]} names
 */
const getCallbackNames = () => Object.keys(window).filter((key) => /^cXJsonpCB\d+$/.test(key));

test('Installs the API', (assert) => {
    runRedirect();
    const { cX } = window;

    [
        'setSiteId', 'sendPageViewEvent', 'setCustomParameters', 'sendEvent', 'setEventAttributes',
        'getUserSegmentIds', 'getSegments', 'jsonpRequest', 'invoke', 'loadScript', 'insertWidget',
    ].forEach((method) => assert.strictEqual(typeof cX[method], 'function', `cX.${method}()`));
    ['run', 'runMulti', 'sendPageViewEvent', 'sendConversionEvent', 'invoke'].forEach((method) => {
        assert.strictEqual(typeof cX.CCE[method], 'function', `cX.CCE.${method}()`);
    });
    assert.strictEqual(cX.CCE.library, undefined, 'no CCE library, so that a real cx.cce.js sets itself up');
    assert.strictEqual(cX.getUserId(), null, 'no user id');
    assert.strictEqual(cX.getSessionId(), '', 'no session id');
    assert.strictEqual(cX.library.m_rnd, '', 'library.m_rnd');
    assert.strictEqual(cX.loaded, true, 'loaded');
    assert.strictEqual(cX.JSON.stringify({ a: [1] }), '{"a":[1]}', 'JSON.stringify()');
    assert.deepEqual(cX.JSON.parse('{"a":1}'), { a: 1 }, 'JSON.parse()');

    // as the library: array-like collections, and the collection as the third argument
    const seen = [];
    const paragraphs = document.querySelectorAll('#qunit, #qunit-fixture');
    cX.Array.forEach(paragraphs, (value, index, collection) => {
        seen.push([value.id, index, collection === paragraphs]);
    });
    const object = { x: 1 };
    cX.Object.forEach(object, (value, key, collection) => seen.push([value, key, collection === object]));
    assert.deepEqual(
        seen,
        [['qunit', 0, true], ['qunit-fixture', 1, true], [1, 'x', true]],
        'Array.forEach() with a NodeList, and Object.forEach()',
    );
    assert.strictEqual(cX.Array.some([1, 2], (value) => (value === 2 ? 'found' : 0)), 'found', 'Array.some()');
    assert.strictEqual(cX.Array.some([1, 2], () => 0), 0, 'Array.some() without a truthy result');
    assert.strictEqual(cX.Object.some({ a: 1 }, (value, key) => key === 'a'), true, 'Object.some()');
    const list = ['a', 'b'];
    assert.strictEqual(cX.Array.remove(list, 'a'), list, 'Array.remove() returns the array');
    assert.deepEqual(list, ['b'], 'Array.remove() removes the item');
    assert.strictEqual(cX.Array.remove(list, 'z'), list, 'Array.remove() returns the array without the item');
    assert.deepEqual(cX.Object.keys({ x: 1, y: 2 }), ['x', 'y'], 'Object.keys()');
    assert.true(cX.isArray([]), 'isArray()');
    assert.strictEqual(cX.isPageViewReported(), false, 'isPageViewReported()');
});

test('Processes queued commands, but does not run invoke callbacks', (assert) => {
    const calls = [];
    const queue = [
        ['setSiteId', '1234567890'],
        ['invoke', () => calls.push('queued invoke')],
        ['getUserSegmentIds', {
            persistedQueryId: 'abcdef',
            callback: (ids) => calls.push(['segments', ids]),
        }],
        ['noSuchMethod'],
        ['getUserSegmentIds', {
            persistedQueryId: 'abcdef',
            callback: () => {
                throw new Error('page callback');
            },
        }],
        'not a command',
    ];
    const cceQueue = [['invoke', () => calls.push('queued CCE invoke')], ['run', { widgetId: 'abc' }]];
    window.cX = { callQueue: queue, CCE: { callQueue: cceQueue } };
    runRedirect();
    const { cX } = window;

    assert.strictEqual(cX.callQueue, queue, 'callQueue array is kept');
    assert.strictEqual(cX.CCE.callQueue, cceQueue, 'CCE callQueue array is kept');
    assert.strictEqual(queue.length, 0, 'callQueue is emptied');
    assert.strictEqual(cceQueue.length, 0, 'CCE callQueue is emptied');
    assert.strictEqual(cX.getSiteId(), '1234567890', 'queued setSiteId is applied');
    assert.deepEqual(calls, [['segments', []]], 'queued segment callback is called, invoke callbacks are not');

    calls.length = 0;
    assert.strictEqual(cX.callQueue.push(['setAccountId', '42']), 0, 'push() returns the length');
    assert.strictEqual(cX.getAccountId(), '42', 'pushed command is applied at once');
    cX.callQueue.push(['invoke', () => calls.push('pushed invoke')]);
    cX.invoke(() => calls.push('cX.invoke'));
    cX.CCE.callQueue.push(['invoke', () => calls.push('pushed CCE invoke')]);
    cX.CCE.invoke(() => calls.push('cX.CCE.invoke'));
    assert.deepEqual(calls, [], 'invoke callbacks are never run');
});

test('Segment callbacks are called with no segments', async (assert) => {
    runRedirect();
    const { cX } = window;
    const calls = [];

    const result = cX.getUserSegmentIds({
        persistedQueryId: 'abcdef',
        defaultValue: ['default'],
        callback: (ids) => calls.push(['user', ids]),
    });
    assert.deepEqual(result, [], 'getUserSegmentIds() returns no segments');
    assert.deepEqual(calls, [['user', ['default']]], 'getUserSegmentIds() calls back at once with the default');

    calls.length = 0;
    cX.getSegments('abcdef', (segments) => calls.push(['id', segments]));
    cX.getSegments({ persistedQueryId: 'abcdef', callback: (segments) => calls.push(['object', segments]) });
    assert.deepEqual(calls, [], 'getSegments() calls back asynchronously, as after its request');
    await sleep(10);
    assert.deepEqual(calls, [['id', []], ['object', []]], 'getSegments() calls back with no segments');
});

test('jsonpRequest() sends only search requests, as JSON requests without cookies', async (assert) => {
    runRedirect();
    const { cX } = window;
    // the JSON response, which the JSONP one wraps with the status
    const json = { totalCount: 1, matches: [] };
    const data = { httpStatus: 200, response: json };
    const scriptsBefore = document.querySelectorAll('script').length;
    let respond = () => jsonResponse(json);
    const fetchMock = mockFetch(() => respond());
    try {
        // search with a callback placeholder, e.g. of nikkansports.com
        const responses = [];
        cX.jsonpRequest(SEARCH_URL, (...args) => {
            responses.push(args);
        });
        assert.strictEqual(fetchMock.calls.length, 1, 'search request is sent');
        assert.strictEqual(
            fetchMock.calls[0].url,
            'https://api.cxense.com/document/search?persisted=abcdef&json=%7B%7D',
            'as a JSON request, without the callback parameter',
        );
        assert.deepEqual(
            fetchMock.calls[0].init,
            { credentials: 'omit', referrerPolicy: 'no-referrer' },
            'without cookies and referrer',
        );
        assert.deepEqual(responses, [], 'callback is called asynchronously');
        await sleep(20);
        assert.deepEqual(responses, [[data]], 'parsed response is passed as the JSONP one');
        const names = getCallbackNames();
        window[names[names.length - 1]]({ late: true });
        assert.strictEqual(responses.length, 1, 'callback is called once');

        // search with its own callback, e.g. of itmedia.co.jp
        const ownCallbackCalls = [];
        const passedCallbackCalls = [];
        window._cxSearchCallback = (response) => ownCallbackCalls.push(response);
        cX.jsonpRequest(
            'https://api.cxense.com/document/search?callback=_cxSearchCallback&json=%7B%7D',
            () => passedCallbackCalls.push('called'),
        );
        assert.strictEqual(fetchMock.calls[1].url, 'https://api.cxense.com/document/search?json=%7B%7D', 'URL');
        await sleep(20);
        assert.deepEqual(ownCallbackCalls, [data], 'the global function named in the URL is called');
        assert.deepEqual(passedCallbackCalls, [], 'passed callback is not called without a timeout');

        // error response of the endpoint, e.g. for an invalid query
        const errors = [];
        respond = () => jsonResponse({ error: 'Invalid request' }, 0, 400);
        cX.jsonpRequest(SEARCH_URL, (response) => errors.push(response));
        await sleep(20);
        assert.deepEqual(errors, [{ httpStatus: 400, response: { error: 'Invalid request' } }], 'error status');

        assert.strictEqual(document.querySelectorAll('script').length, scriptsBefore, 'no script element is added');
    } finally {
        fetchMock.restore();
        clearGlobalProps('_cxSearchCallback');
    }
});

test('jsonpRequest() behaves as a failed request for other requests and failed responses', async (assert) => {
    runRedirect();
    const { cX } = window;
    let respond = () => jsonResponse({ httpStatus: 200 });
    const fetchMock = mockFetch(() => respond());
    try {
        const calls = [];
        // other requests: nothing is sent, the callback is called only on timeout, without arguments
        cX.jsonpRequest('https://api.cxense.com/profile/user/segment?callback={{callback}}', () => {
            calls.push('no timeout');
        });
        cX.jsonpRequest(
            'https://example.org/?url=https://api.cxense.com/document/search&callback={{callback}}',
            (...args) => calls.push(['other', args.length]),
            { timeout: 10 },
        );
        // search without a callback has no callback to call
        cX.jsonpRequest('https://api.cxense.com/document/search?json=%7B%7D', () => calls.push('no callback'));
        assert.strictEqual(fetchMock.calls.length, 0, 'other requests are not sent');
        await sleep(40);
        assert.deepEqual(calls, [['other', 0]], 'called only on timeout, without data');

        // invalid response and network error
        calls.length = 0;
        respond = () => Promise.resolve(new Response('cb({})', { status: 200 }));
        cX.jsonpRequest(SEARCH_URL, (...args) => calls.push(['invalid', args.length]), { timeout: 30 });
        respond = () => Promise.reject(new TypeError('Failed to fetch'));
        cX.jsonpRequest(SEARCH_URL, (...args) => calls.push(['network error', args.length]), { timeout: 30 });
        await sleep(10);
        assert.deepEqual(calls, [], 'no callback for a failed response');
        await sleep(60);
        assert.deepEqual(calls, [['invalid', 0], ['network error', 0]], 'called on timeout, without data');

        // late response after the timeout
        calls.length = 0;
        respond = () => jsonResponse({ httpStatus: 200 }, 40);
        cX.jsonpRequest(SEARCH_URL, (...args) => calls.push(args.length), { timeout: 10 });
        await sleep(80);
        assert.deepEqual(calls, [0], 'timeout calls the callback without data, the late response is ignored');
    } finally {
        fetchMock.restore();
    }
});

test('Consent', (assert) => {
    runRedirect();
    const { cX } = window;
    // the same results as of the library, checked with cx.js on a page without other scripts
    assert.strictEqual(cX.isConsentRequired(), false, 'consent is not required by default');
    assert.strictEqual(cX.hasConsent('pv'), false, 'no consent which the page has not set, even if not required');
    assert.strictEqual(cX.hasConsent('device'), true, 'device does not depend on the consent');
    assert.strictEqual(cX.hasConsent('geo'), true, 'geo does not depend on the consent');
    cX.setConsent({ recs: true });
    assert.strictEqual(cX.hasConsent('recs'), true, 'consent set by the page while it is not required');

    cX.callQueue.push(['requireConsent']);
    assert.strictEqual(cX.isConsentRequired(), true, 'requireConsent');
    assert.strictEqual(cX.hasConsent('pv'), false, 'no consent once it is required');
    assert.strictEqual(cX.hasConsent('recs'), true, 'consent set before is kept');
    cX.setConsent({ pv: true, segment: false, device: false });
    assert.strictEqual(cX.hasConsent('pv'), true, 'consent set by the page');
    assert.strictEqual(cX.hasConsent('segment'), false, 'consent denied by the page');
    assert.strictEqual(cX.hasConsent('device'), true, 'device cannot be denied in the version 1');
    assert.strictEqual(cX.hasConsent('other'), false, 'unknown consent');
    assert.deepEqual(
        cX.allUserConsents(),
        {
            recs: true,
            pv: true,
            segment: false,
            device: false,
        },
        'allUserConsents()',
    );

    cX.requireConsent(2);
    assert.strictEqual(cX.isConsentRequired(), true, 'consent of the version 2 is required');
    assert.strictEqual(cX.hasConsent('device'), false, 'device denied by the page in the version 2');
    assert.strictEqual(cX.hasConsent('geo'), false, 'geo not set by the page in the version 2');
    assert.strictEqual(cX.hasConsent('pv'), true, 'other consents are kept');

    cX.requireConsent(false);
    assert.strictEqual(cX.isConsentRequired(), false, 'consent is not required again');
    assert.strictEqual(cX.hasConsent('device'), true, 'the version 1 again');
});

test('getCookie() reads cookies of the page', (assert) => {
    document.cookie = 'cxenseTestCookie=a%20b; path=/';
    try {
        runRedirect();
        assert.strictEqual(window.cX.getCookie('cxenseTestCookie'), 'a b', 'existing cookie');
        assert.strictEqual(window.cX.getCookie('cxenseMissingCookie'), null, 'missing cookie');
    } finally {
        clearCookie('cxenseTestCookie');
    }
});

test('Keeps the real library, and completes only what is missing', (assert) => {
    const realGetUserId = () => 'real';
    const realQueue = [];
    // real cx.js, then the redirect served for cx.cce.js
    window.cX = { getUserId: realGetUserId, callQueue: realQueue };
    runRedirect();
    assert.strictEqual(window.cX.getUserId, realGetUserId, 'real cx.js is kept');
    assert.strictEqual(window.cX.callQueue.push, Array.prototype.push, 'real queue is not processed');
    assert.strictEqual(typeof window.cX.CCE.run, 'function', 'CCE is added');

    // both scripts are loaded already, e.g. the redirect for cx.js and then for cx.cce.js
    const installed = window.cX;
    const { getSegments } = installed;
    runRedirect();
    assert.strictEqual(window.cX, installed, 'cX is kept');
    assert.strictEqual(window.cX.getSegments, getSegments, 'nothing is replaced');
});

test('No requests, cookies or storage items', async (assert) => {
    const calls = [];
    const record = (label) => () => {
        calls.push(label);
    };
    const nativeFetch = window.fetch;
    const nativeOpen = XMLHttpRequest.prototype.open;
    const nativeSetItem = Storage.prototype.setItem;
    const nativeCreateElement = document.createElement;
    window.fetch = record('fetch');
    XMLHttpRequest.prototype.open = record('XMLHttpRequest');
    navigator.sendBeacon = record('sendBeacon');
    Storage.prototype.setItem = record('setItem');
    document.createElement = function (...args) {
        calls.push(`createElement:${args[0]}`);
        return nativeCreateElement.apply(document, args);
    };
    Object.defineProperty(document, 'cookie', {
        configurable: true,
        get: () => '',
        set: record('cookie'),
    });
    const resourcesBefore = performance.getEntriesByType('resource').length;
    try {
        window.cX = {
            callQueue: [
                ['setSiteId', '1'], ['sendPageViewEvent'], ['setCustomParameters', { a: '1' }],
                ['sendEvent', 'click', { a: 1 }], ['sync', 'frk'], ['getUserSegmentIds', { persistedQueryId: 'abc' }],
            ],
        };
        runRedirect();
        const { cX } = window;
        cX.setCookie('name', 'value');
        cX.loadScript('/cxense/cx-custom.js');
        cX.insertWidget({ widgetId: 'abc' });
        cX.jsonpRequest('https://api.cxense.com/public/widget/data?json=%7B%7D&callback={{callback}}', () => {});
        cX.CCE.run({ widgetId: 'abc' });
        cX.CCE.sendConversionEvent({ productId: 'abc' }, { callback: record('conversion callback') });
        cX.getSegments('abc', () => {});
        await sleep(20);

        assert.deepEqual(calls, [], 'no request, cookie, storage, element creation or callback');
        assert.strictEqual(performance.getEntriesByType('resource').length, resourcesBefore, 'no resource is loaded');
    } finally {
        window.fetch = nativeFetch;
        XMLHttpRequest.prototype.open = nativeOpen;
        delete navigator.sendBeacon;
        Storage.prototype.setItem = nativeSetItem;
        delete document.createElement;
        delete document.cookie;
    }
});

test('Shows a widget which the page requests as a list of links, without code of the response', async (assert) => {
    // the widget is far from the viewport, so that its image is not requested at once
    addElement('cxenseTestSpacer').style.height = '3000px';
    const target = addElement('cxenseTestTarget');
    target.innerHTML = '<p>Loading</p>';
    const callbacks = [];
    const fetchMock = mockFetch(() => jsonResponse(widgetData([
        widgetItem(1, { 'og-image': IMAGE_URL }),
        widgetItem(2, { title: '<img src="x" onerror="window.cxenseWidgetCode = 1"><b>bold</b>' }),
        widgetItem(3, { dominantimage: 'https://images.example.net/3.jpg' }),
    ])));
    try {
        runRedirect();
        const params = {
            widgetId: WIDGET_1,
            targetElementId: 'cxenseTestTarget',
            renderFunction: () => callbacks.push('renderFunction'),
        };
        window.cX.CCE.run(params, { context: { url: window.location.href } }, () => callbacks.push('callback'));
        await waitForWidgets();

        assert.strictEqual(fetchMock.calls.length, 1, 'one request');
        assert.strictEqual(fetchMock.calls[0].url, getWidgetUrl(WIDGET_1), 'only the id of the widget is sent');
        assert.deepEqual(
            fetchMock.calls[0].init,
            { credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error' },
            'without cookies and referrer',
        );
        assert.strictEqual(fetchMock.imageCalls.length, 0, 'image is not requested before the widget is visible');
        await waitForImages(target);
        assert.deepEqual(getWidgetLinks(target), [
            { href: `${window.location.origin}/articles/1`, text: 'Article 1', image: 'blob:' },
            {
                href: `${window.location.origin}/articles/2`,
                text: '<img src="x" onerror="window.cxenseWidgetCode = 1"><b>bold</b>',
                image: null,
            },
            { href: `${window.location.origin}/articles/3`, text: 'Article 3', image: null },
        ], 'links with titles as text, and an image only of the same site');
        assert.strictEqual(target.children.length, 1, 'content of the element is replaced');
        const root = target.firstElementChild.shadowRoot;
        assert.strictEqual(root.querySelectorAll('script, b, iframe').length, 0, 'no markup of the response');
        assert.deepEqual(
            fetchMock.imageCalls,
            [{ url: IMAGE_URL, init: IMAGE_REQUEST }],
            'image is requested without cookies and referrer, and a redirect is an error',
        );
        const image = root.querySelector('img');
        assert.strictEqual(image.getAttribute('alt'), '', 'image is decorative');
        assert.true(image.naturalWidth > 0, 'image is loaded');
        assert.strictEqual(image.nextElementSibling.tagName, 'SPAN', 'image is before the title');
        const hasStyle = root.adoptedStyleSheets.length === 1 || root.querySelector('style') !== null;
        assert.true(hasStyle, 'list has its own style');
        assert.strictEqual(getComputedStyle(root.querySelector('ul')).listStyleType, 'none', 'style is applied');
        assert.strictEqual(document.body.style.display, '', 'style of the response is not applied');
        assert.strictEqual(window.cxenseWidgetCode, undefined, 'no code of the response is run');
        assert.deepEqual(callbacks, [], 'callbacks of the page are not called');

        // the same widget again
        window.cX.CCE.run(params);
        window.cX.insertWidget(params);
        await waitForWidgets();
        assert.strictEqual(fetchMock.calls.length, 1, 'widget is requested once for the element');
    } finally {
        fetchMock.restore();
    }
});

test('Shows widgets requested with other methods and with queued commands', async (assert) => {
    const ids = ['Queued', 'Multi1', 'Multi2', 'Display', 'Version', 'Insert', 'Pushed', 'List'];
    const targets = {};
    ids.forEach((id) => {
        targets[id] = addElement(`cxenseTest${id}`, id === 'List' ? 'ul' : 'div');
    });
    const fetchMock = mockFetch((url) => {
        const number = fetchMock.calls.length;
        return jsonResponse(widgetData([widgetItem(number, { title: getWidgetIdOfUrl(url) })]));
    });
    try {
        window.cX = {
            callQueue: [['insertWidget', { widgetId: WIDGET_1, targetElementId: 'cxenseTestQueued' }]],
            CCE: { callQueue: [['run', { widgetId: WIDGET_2, targetElementId: 'cxenseTestList' }]] },
        };
        runRedirect();
        const { cX } = window;
        cX.CCE.runMulti([
            { widgetParams: { widgetId: WIDGET_1, targetElementId: 'cxenseTestMulti1' }, widgetContext: {} },
            { widgetParams: { widgetId: WIDGET_2, targetElementId: 'cxenseTestMulti2' } },
            null,
            {},
        ], true);
        cX.CCE.displayWidget('cxenseTestDisplay', { widgetId: WIDGET_3 });
        cX.CCE.runCxVersion('test', 'cxenseTestVersion', { widgetId: WIDGET_4 });
        cX.insertWidget({ widgetId: WIDGET_3, targetElementId: 'cxenseTestInsert' });
        cX.CCE.callQueue.push(['run', { widgetId: WIDGET_4, targetElementId: 'cxenseTestPushed' }]);
        await waitForWidgets();

        const shown = {};
        ids.forEach((id) => {
            const links = getWidgetLinks(targets[id]);
            shown[id] = links && links.length === 1 ? links[0].text : links;
        });
        assert.deepEqual(shown, {
            Queued: WIDGET_1,
            Multi1: WIDGET_1,
            Multi2: WIDGET_2,
            Display: WIDGET_3,
            Version: WIDGET_4,
            Insert: WIDGET_3,
            Pushed: WIDGET_4,
            List: WIDGET_2,
        }, 'each element shows its widget');
        assert.strictEqual(fetchMock.calls.length, ids.length, 'one request for each element');
        assert.strictEqual(targets.List.firstElementChild.tagName, 'LI', 'list item is added to a list element');
        assert.strictEqual(targets.List.children.length, 1, 'one list item');

        // calls without a valid widget id or an element
        const callsBefore = fetchMock.calls.length;
        const other = addElement('cxenseTestOther');
        cX.CCE.run({ widgetId: 'abc', targetElementId: 'cxenseTestOther' });
        cX.CCE.run({ widgetId: `${WIDGET_1}0`, targetElementId: 'cxenseTestOther' });
        cX.CCE.run({ widgetId: WIDGET_1.toUpperCase(), targetElementId: 'cxenseTestOther' });
        cX.CCE.run({ widgetId: `${WIDGET_1}"}&a=1`, targetElementId: 'cxenseTestOther' });
        cX.CCE.run({ widgetId: [WIDGET_1], targetElementId: 'cxenseTestOther' });
        cX.CCE.run({ widgetId: WIDGET_1 });
        cX.CCE.run({ widgetId: WIDGET_1, targetElementId: '' });
        cX.CCE.run({ widgetId: WIDGET_1, targetElementId: other });
        cX.CCE.run();
        cX.CCE.run('cxenseTestOther');
        cX.CCE.runMulti({ widgetParams: { widgetId: WIDGET_1, targetElementId: 'cxenseTestOther' } });
        cX.CCE.displayWidget({ widgetId: WIDGET_1, targetElementId: 'cxenseTestOther' });
        cX.CCE.insertMaster(WIDGET_1);
        cX.CCE.runTest('test', 'cxenseTestOther', 0.5, { widgetId: WIDGET_1 });
        cX.insertWidget();
        await waitForWidgets();
        assert.strictEqual(fetchMock.calls.length, callsBefore, 'no request');
        assert.strictEqual(other.childNodes.length, 0, 'element is not changed');
    } finally {
        fetchMock.restore();
    }
});

test('Shows widgets of empty elements named after them, also of the ones added later', async (assert) => {
    const first = addElement(`cx_${WIDGET_1}`);
    const second = addElement(`cxense-${WIDGET_2}`);
    second.textContent = ' ';
    const notEmpty = addElement(`cx_${WIDGET_3}`);
    notEmpty.innerHTML = '<span>content of the page</span>';
    const others = [
        addElement('cx_abc'),
        addElement(`cx_${WIDGET_4}0`),
        addElement(`cx-${WIDGET_4}`),
        addElement(`cxense_${WIDGET_4}`),
        addElement(`cx_${WIDGET_4.toUpperCase()}`),
        addElement(`my_cx_${WIDGET_4}`),
    ];
    const fetchMock = mockFetch(() => jsonResponse(widgetData([widgetItem(fetchMock.calls.length)])));
    try {
        runRedirect();
        await waitForWidgets();
        assert.deepEqual(fetchMock.calls.map((call) => call.url), [
            getWidgetUrl(WIDGET_1),
            getWidgetUrl(WIDGET_2),
        ], 'widgets of the empty elements are requested');
        assert.strictEqual(getWidgetLinks(first).length, 1, 'widget in the element with the cx_ prefix');
        assert.strictEqual(getWidgetLinks(second).length, 1, 'widget in the element with the cxense- prefix');
        assert.strictEqual(notEmpty.innerHTML, '<span>content of the page</span>', 'content of the page is kept');
        assert.true(others.every((element) => element.childNodes.length === 0), 'other elements are not changed');

        // added by the page later, e.g. by Piano Composer
        const later = addElement(`cxense-${WIDGET_4}`);
        const wrapper = addElement('cxenseTestWrapper');
        wrapper.innerHTML = `<section><div id="cx_${WIDGET_3}0"></div><ol id="cxense-${WIDGET_3}"></ol></section>`;
        await waitForWidgets();
        assert.deepEqual(fetchMock.calls.slice(2).map((call) => call.url).sort(), [
            getWidgetUrl(WIDGET_4),
            getWidgetUrl(WIDGET_3),
        ].sort(), 'widgets of the added elements are requested');
        assert.strictEqual(getWidgetLinks(later).length, 1, 'widget in the added element');
        assert.strictEqual(getWidgetLinks(wrapper.querySelector('ol')).length, 1, 'widget in the added subtree');

        // the page empties its element later
        notEmpty.textContent = '';
        await waitForWidgets();
        assert.strictEqual(fetchMock.calls.length, 5, 'widget of the emptied element is requested');
        assert.strictEqual(getWidgetLinks(notEmpty).length, 1, 'widget in the emptied element');

        // other changes of the page do not request the widgets again
        first.textContent = '';
        addElement('cxenseTestUnrelated');
        await waitForWidgets();
        assert.strictEqual(fetchMock.calls.length, 5, 'each widget is requested once');
    } finally {
        fetchMock.restore();
    }
});

test('Skips sponsored and other items, and changes nothing if no item is left', async (assert) => {
    const mixed = addElement(`cx_${WIDGET_1}`);
    const sponsored = addElement(`cx_${WIDGET_2}`);
    const called = addElement('cxenseTestSponsored');
    called.innerHTML = '<p>Loading</p>';
    const responses = {
        [WIDGET_1]: [
            widgetItem(1, { slot: '1', 'pst-show-ad': 'Sponsored' }),
            widgetItem(2),
            { templateName: 'banner-ad', banner: 'https://content.cxpublic.com/a', url: `${window.location.origin}/member` },
            widgetItem(3, { url: 'https://other.example.org/articles/3' }),
            { type: 'free' },
            widgetItem(4, { id: undefined, _type: 'search' }),
        ],
        [WIDGET_2]: [
            widgetItem(5, { slot: '1' }),
            widgetItem(6, { slot: '2' }),
        ],
    };
    const fetchMock = mockFetch((url) => jsonResponse(widgetData(responses[getWidgetIdOfUrl(url)])));
    try {
        runRedirect();
        window.cX.CCE.run({ widgetId: WIDGET_2, targetElementId: 'cxenseTestSponsored' });
        await waitForWidgets();
        assert.deepEqual(
            getWidgetLinks(mixed).map((link) => link.text),
            ['Article 2', 'Article 4'],
            'only recommended pages of the site are shown',
        );
        assert.strictEqual(sponsored.childNodes.length, 0, 'element of a widget with no items left is not changed');
        assert.strictEqual(called.innerHTML, '<p>Loading</p>', 'content of the requested element is kept');
        assert.strictEqual(fetchMock.calls.length, 3, 'one request for each element');

        // changes of the page, and the same calls, do not request them again
        addElement('cxenseTestUnrelated');
        window.cX.CCE.run({ widgetId: WIDGET_2, targetElementId: 'cxenseTestSponsored' });
        await waitForWidgets();
        assert.strictEqual(fetchMock.calls.length, 3, 'widgets with no items left are not requested again');
    } finally {
        fetchMock.restore();
    }
});

test('Changes nothing if the widget request fails', async (assert) => {
    const targets = [WIDGET_1, WIDGET_2, WIDGET_3, WIDGET_4].map((id) => addElement(`cx_${id}`));
    const responses = {
        // blocked, e.g. by a filter or by a Content Security Policy
        [WIDGET_1]: () => Promise.reject(new TypeError('Failed to fetch')),
        [WIDGET_2]: () => Promise.resolve(new Response('<html>', { status: 200 })),
        [WIDGET_3]: () => jsonResponse({ error: 'Invalid widget id' }, 0, 400),
        [WIDGET_4]: () => {
            throw new Error('fetch of the page throws');
        },
    };
    const errors = [];
    const onUnhandled = (event) => errors.push(event.reason);
    window.addEventListener('unhandledrejection', onUnhandled);
    const fetchMock = mockFetch((url) => responses[getWidgetIdOfUrl(url)]());
    try {
        runRedirect();
        await waitForWidgets();
        assert.strictEqual(fetchMock.calls.length, 4, 'each widget is requested');
        assert.true(targets.every((target) => target.childNodes.length === 0), 'elements are not changed');
        assert.deepEqual(errors, [], 'no unhandled rejection');
        assert.strictEqual(typeof window.cX.getUserId, 'function', 'resource is installed');

        addElement('cxenseTestUnrelated');
        await waitForWidgets();
        assert.strictEqual(fetchMock.calls.length, 4, 'failed requests are not sent again');
    } finally {
        fetchMock.restore();
        window.removeEventListener('unhandledrejection', onUnhandled);
    }
});

test('Shows a requested widget when its element is added, and stops watching 10 seconds after load', async (assert) => {
    const fetchMock = mockFetch(() => jsonResponse(widgetData([widgetItem(fetchMock.calls.length)])));
    try {
        // queued before the element is in the page
        window.cX = { CCE: { callQueue: [['run', { widgetId: WIDGET_1, targetElementId: 'cxenseTestQueuedLater' }]] } };
        runRedirect();
        window.cX.CCE.run({ widgetId: WIDGET_2, targetElementId: 'cxenseTestLater' });
        await waitForWidgets();
        assert.strictEqual(fetchMock.calls.length, 0, 'no request without an element');

        const queuedLater = addElement('cxenseTestQueuedLater');
        const later = addElement('cxenseTestLater');
        await waitForWidgets();
        assert.strictEqual(getWidgetLinks(queuedLater).length, 1, 'widget of the queued command is shown');
        assert.strictEqual(getWidgetLinks(later).length, 1, 'widget of the call is shown');
        assert.deepEqual(
            fetchMock.calls.map((call) => call.url).sort(),
            [getWidgetUrl(WIDGET_1), getWidgetUrl(WIDGET_2)].sort(),
            'widgets are requested when their elements are added',
        );

        window.cX.CCE.run({ widgetId: WIDGET_3, targetElementId: 'cxenseTestTooLate' });
        assert.strictEqual(stopWatching.length, 1, 'one timer to stop watching, as the page is loaded');
        stopWatchingWidgets();
        const tooLate = addElement('cxenseTestTooLate');
        const container = addElement(`cx_${WIDGET_4}`);
        window.cX.CCE.run({ widgetId: WIDGET_4, targetElementId: 'cxenseTestNotAdded' });
        addElement('cxenseTestNotAdded');
        await waitForWidgets();
        assert.strictEqual(fetchMock.calls.length, 2, 'no requests for elements added after watching has stopped');
        assert.strictEqual(tooLate.childNodes.length + container.childNodes.length, 0, 'elements are not changed');

        // a widget which the page requests for an element in the page is still shown
        window.cX.CCE.run({ widgetId: WIDGET_3, targetElementId: 'cxenseTestTooLate' });
        await waitForWidgets();
        assert.strictEqual(getWidgetLinks(tooLate).length, 1, 'requested widget is shown');
    } finally {
        fetchMock.restore();
    }
});

test('Watches until 10 seconds after the load event of a page which is still loading', async (assert) => {
    const fetchMock = mockFetch(() => jsonResponse(widgetData([widgetItem(1)])));
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
    try {
        runRedirect();
        assert.strictEqual(loadListeners.length, 1, 'load event is awaited');
        assert.strictEqual(stopWatching.length, 0, 'no timer before the page is loaded');
        const first = addElement(`cx_${WIDGET_1}`);
        await waitForWidgets();
        assert.strictEqual(getWidgetLinks(first).length, 1, 'widget is shown while the page is loading');

        loadListeners[0]();
        assert.strictEqual(stopWatching.length, 1, 'timer is set when the page is loaded');
        const second = addElement(`cx_${WIDGET_2}`);
        await waitForWidgets();
        assert.strictEqual(getWidgetLinks(second).length, 1, 'widget is shown after the page is loaded');
    } finally {
        delete document.readyState;
        window.addEventListener = nativeAddEventListener;
        fetchMock.restore();
    }
});

test('Shows no widgets for the real library, and watches once', async (assert) => {
    const fetchMock = mockFetch(() => jsonResponse(widgetData([widgetItem(1)])));
    try {
        // real cx.js, and the redirect served for cx.cce.js
        const realInsertWidget = () => {};
        window.cX = { getUserId: () => 'real', insertWidget: realInsertWidget };
        const container = addElement(`cx_${WIDGET_1}`);
        const target = addElement('cxenseTestTarget');
        runRedirect();
        window.cX.CCE.run({ widgetId: WIDGET_2, targetElementId: 'cxenseTestTarget' });
        window.cX.CCE.runMulti([{ widgetParams: { widgetId: WIDGET_2, targetElementId: 'cxenseTestTarget' } }]);
        window.cX.CCE.displayWidget('cxenseTestTarget', { widgetId: WIDGET_2 });
        addElement(`cx_${WIDGET_3}`);
        await waitForWidgets();
        assert.strictEqual(fetchMock.calls.length, 0, 'no widget request');
        assert.strictEqual(container.childNodes.length + target.childNodes.length, 0, 'elements are not changed');
        assert.strictEqual(window.cX.insertWidget, realInsertWidget, 'insertWidget() of the library is kept');
        assert.strictEqual(stopWatching.length, 0, 'elements are not watched');

        // the redirect served for cx.js and then for cx.cce.js
        clearGlobalProps('cX');
        runRedirect();
        runRedirect();
        await waitForWidgets();
        assert.strictEqual(stopWatching.length, 1, 'elements are watched once');
        assert.deepEqual(
            fetchMock.calls.map((call) => call.url).sort(),
            [getWidgetUrl(WIDGET_1), getWidgetUrl(WIDGET_3)].sort(),
            'each widget is requested once',
        );
    } finally {
        fetchMock.restore();
    }
});

test('Requests images only from the site and from hosts of images of the page, without cookies', async (assert) => {
    ['https://images.example.net/page.jpg', 'https://refusing.example.net/page.jpg'].forEach((src) => {
        const pageImage = document.createElement('img');
        pageImage.className = 'cxense-test';
        // not loaded: only its host matters
        pageImage.setAttribute('src', src);
        document.body.appendChild(pageImage);
    });
    const target = addElement(`cx_${WIDGET_1}`);
    const FILES = `${window.location.origin}/test-files`;
    const images = [
        // of a host of an image of the page
        'https://images.example.net/1.jpg',
        'https://images.example.net/2.jpg',
        // of the site
        IMAGE_URL,
        // of other hosts: not requested
        'https://other.example.net/4.jpg',
        'https://content-thumbnail.cxpublic.com/content/dominantthumbnail/5.jpg',
        'https://sub.images.example.net/6.jpg',
        // not shown
        `${FILES}/missing.png`,
        `${FILES}/page.html`,
        `${FILES}/vector.svg`,
        `${FILES}/large.png`,
        `${FILES}/empty.png`,
        // of a host which does not allow the request, e.g. without CORS headers, or which redirects
        'https://refusing.example.net/12.jpg',
        'https://refusing.example.net/13.jpg',
        'https://refusing.example.net/14.jpg',
    ];
    const fetchMock = mockFetch(
        () => jsonResponse(widgetData(images.map((image, index) => widgetItem(index + 1, { 'og-image': image })))),
        (url) => {
            if (url.indexOf('https://refusing.example.net/') === 0) {
                return Promise.reject(new TypeError('Failed to fetch'));
            }
            switch (url.slice(url.lastIndexOf('/') + 1)) {
                case 'missing.png': return imageResponse('image/png', {}, 404);
                case 'page.html': return imageResponse('text/html');
                case 'vector.svg': return imageResponse('image/svg+xml');
                case 'large.png': return imageResponse('image/png', { 'Content-Length': '5242881' });
                case 'empty.png': return Promise.resolve(new Response('', {
                    headers: { 'Content-Type': 'image/png' },
                }));
                default: return imageResponse(url.indexOf('2.jpg') !== -1 ? 'IMAGE/JPEG; charset=binary' : 'image/png');
            }
        },
    );
    try {
        runRedirect();
        await waitForWidgets();
        await waitForImages(target);
        assert.deepEqual(
            getWidgetLinks(target).map((link) => link.image),
            ['blob:', 'blob:', 'blob:', null, null, null, null, null, null, null, null, null, null, null],
            'images of allowed hosts and of raster types are shown',
        );
        assert.deepEqual(getWidgetLinks(target).map((link) => link.text), images.map((image, index) => {
            return `Article ${index + 1}`;
        }), 'links without an image are kept');
        assert.deepEqual(fetchMock.imageCalls.map((call) => call.url).sort(), [
            images[0], images[1], images[2], images[6], images[7], images[8], images[9], images[10], images[11],
        ].sort(), 'other hosts are not requested, and a host which refuses the request is requested once');
        assert.true(
            fetchMock.imageCalls.every((call) => JSON.stringify(call.init) === JSON.stringify(IMAGE_REQUEST)),
            'each image is requested without cookies and referrer, and a redirect is an error',
        );
        const shown = target.firstElementChild.shadowRoot.querySelectorAll('img');
        assert.true(Array.from(shown).every((image) => image.naturalWidth > 0), 'images are loaded');

        // another widget does not request the refusing host again
        const second = addElement(`cx_${WIDGET_2}`);
        await waitForWidgets();
        await waitForImages(second);
        const refused = fetchMock.imageCalls.filter((call) => call.url.indexOf('https://refusing.example.net/') === 0);
        assert.strictEqual(refused.length, 1, 'refusing host is not requested again');
        assert.strictEqual(getWidgetLinks(second)[0].image, 'blob:', 'images of the other hosts are shown');
    } finally {
        fetchMock.restore();
    }
});
