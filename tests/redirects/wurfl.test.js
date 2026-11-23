/* eslint-disable no-underscore-dangle, func-names */
import { clearGlobalProps, evalWrapper, getRedirectsInstance } from '../helpers';

const { test, module } = QUnit;
const name = 'wurfl';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 '
    + '(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const CHROME = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';

let redirects;

const before = async () => {
    redirects = await getRedirectsInstance();
};

const afterEach = () => {
    clearGlobalProps('WURFL', 'WURFLPromises', '__wurfljs_das_finalize');
    delete navigator.userAgent;
    delete navigator.maxTouchPoints;
};

module(name, { before, afterEach });

const runRedirect = () => {
    evalWrapper(redirects.getRedirect(name).content);
};

/**
 * Makes the browser report the User-Agent and touch points, as another device.
 *
 * @param {string} userAgent User-Agent
 * @param {number} [maxTouchPoints] touch points
 */
const setDevice = (userAgent, maxTouchPoints = 0) => {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, get: () => userAgent });
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => maxTouchPoints });
};

/**
 * Records the events of WURFL.js which are dispatched on the document.
 *
 * @returns {{ events: object[], stop: Function }} events, and a function which stops recording
 */
const recordEvents = () => {
    const events = [];
    const listener = (event) => events.push({ type: event.type, bubbles: event.bubbles, detail: event.detail });
    ['WurflJSInitComplete', 'WurflJSDetectionComplete'].forEach((type) => document.addEventListener(type, listener));
    return {
        events,
        stop: () => {
            ['WurflJSInitComplete', 'WurflJSDetectionComplete'].forEach((type) => {
                document.removeEventListener(type, listener);
            });
        },
    };
};

test('Defines the device of the browser, as WURFL.js Lite', (assert) => {
    setDevice(IPHONE);
    runRedirect();
    assert.deepEqual(window.WURFL, {
        complete_device_name: 'Apple iPhone',
        form_factor: 'Smartphone',
        is_mobile: true,
    }, 'smartphone');
    // as page code, e.g. of ramahdarom.org and onlinetouch.nl
    assert.true(window.WURFL.is_mobile === true && window.WURFL.form_factor === 'Smartphone', 'page code works');

    clearGlobalProps('WURFL', 'WURFLPromises');
    setDevice(CHROME);
    runRedirect();
    assert.deepEqual(window.WURFL, {
        complete_device_name: 'Google Chrome',
        form_factor: 'Desktop',
        is_mobile: false,
    }, 'desktop');

    clearGlobalProps('WURFL', 'WURFLPromises');
    // iPadOS with the User-Agent of Safari on a Mac
    setDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 '
        + '(KHTML, like Gecko) Version/17.5 Safari/605.1.15', 5);
    runRedirect();
    assert.strictEqual(window.WURFL.form_factor, 'Tablet', 'iPad by its touch points');
});

test('Resolves the promises, calls the finalize function and dispatches the events', async (assert) => {
    setDevice(CHROME);
    const finalized = [];
    window.__wurfljs_das_finalize = (wurfl) => {
        finalized.push(wurfl);
        throw new Error('error of the page');
    };
    const recorder = recordEvents();
    try {
        runRedirect();
        const { WURFL } = window;
        assert.deepEqual(finalized, [WURFL], 'finalize function is called with WURFL, and its error is caught');
        assert.deepEqual(
            recorder.events.map((event) => event.type),
            ['WurflJSInitComplete', 'WurflJSDetectionComplete'],
            'events are dispatched at once on a loaded document',
        );
        assert.true(recorder.events.every((event) => event.bubbles), 'events bubble');
        assert.true(recorder.events.every((event) => event.detail.WURFL === WURFL), 'events have WURFL as detail');
        const init = await window.WURFLPromises.init;
        const complete = await window.WURFLPromises.complete;
        assert.strictEqual(init.WURFL, WURFL, 'init promise is resolved with WURFL');
        assert.strictEqual(complete.WURFL, WURFL, 'complete promise is resolved with WURFL');
    } finally {
        recorder.stop();
    }
});

test('Dispatches the events at DOMContentLoaded while the document is being loaded', (assert) => {
    const nativeAddEventListener = document.addEventListener;
    const contentLoaded = [];
    document.addEventListener = function (type, listener, ...rest) {
        if (type === 'DOMContentLoaded') {
            contentLoaded.push(listener);
            return undefined;
        }
        return nativeAddEventListener.call(this, type, listener, ...rest);
    };
    Object.defineProperty(document, 'readyState', { configurable: true, get: () => 'loading' });
    let recorder;
    try {
        // as the scriptlet, run before the page
        runRedirect();
        assert.strictEqual(typeof window.WURFL, 'object', 'WURFL is defined at once');
        assert.strictEqual(contentLoaded.length, 1, 'DOMContentLoaded is awaited');
        // a listener of the page, added after the scriptlet has run
        recorder = recordEvents();
        assert.strictEqual(recorder.events.length, 0, 'no events yet');
        contentLoaded[0]();
        assert.deepEqual(
            recorder.events.map((event) => event.type),
            ['WurflJSInitComplete', 'WurflJSDetectionComplete'],
            'events are dispatched at DOMContentLoaded',
        );
    } finally {
        if (recorder) {
            recorder.stop();
        }
        delete document.readyState;
        document.addEventListener = nativeAddEventListener;
    }
});

test('Keeps WURFL which is already on the page', (assert) => {
    // e.g. WURFL.js bundled in the code of the page, or the real script
    const real = { complete_device_name: 'Google Pixel 8', form_factor: 'Smartphone', is_mobile: true };
    window.WURFL = real;
    const recorder = recordEvents();
    try {
        runRedirect();
        assert.strictEqual(window.WURFL, real, 'WURFL is kept');
        assert.strictEqual(window.WURFLPromises, undefined, 'no promises');
        assert.strictEqual(recorder.events.length, 0, 'no events');

        // the mock is not installed again
        clearGlobalProps('WURFL');
        runRedirect();
        const mock = window.WURFL;
        const { length } = recorder.events;
        runRedirect();
        assert.strictEqual(window.WURFL, mock, 'mock is kept');
        assert.strictEqual(recorder.events.length, length, 'events are not dispatched again');
    } finally {
        recorder.stop();
    }
});

test('No requests, cookies or storage items', (assert) => {
    const calls = [];
    const record = (label) => () => {
        calls.push(label);
    };
    const nativeFetch = window.fetch;
    const nativeOpen = XMLHttpRequest.prototype.open;
    const nativeSetItem = Storage.prototype.setItem;
    window.fetch = record('fetch');
    XMLHttpRequest.prototype.open = record('XMLHttpRequest');
    navigator.sendBeacon = record('sendBeacon');
    Storage.prototype.setItem = record('setItem');
    Object.defineProperty(document, 'cookie', {
        configurable: true,
        get: () => '',
        set: record('cookie'),
    });
    const resourcesBefore = performance.getEntriesByType('resource').length;
    const hadUaData = 'userAgentData' in navigator;
    try {
        runRedirect();
        assert.deepEqual(calls, [], 'no request, cookie or storage item');
        assert.strictEqual(performance.getEntriesByType('resource').length, resourcesBefore, 'no resource is loaded');
        assert.strictEqual('userAgentData' in navigator, hadUaData, 'navigator.userAgentData is not added');
    } finally {
        window.fetch = nativeFetch;
        XMLHttpRequest.prototype.open = nativeOpen;
        delete navigator.sendBeacon;
        Storage.prototype.setItem = nativeSetItem;
        delete document.cookie;
    }
});
