/* eslint-disable no-underscore-dangle, func-names */
import {
    clearGlobalProps,
    evalWrapper,
    getRedirectsInstance,
    sleep,
} from '../helpers';

const { test, module } = QUnit;
const name = 'adobe-target';

const PREHIDING_IDS = ['at-body-style', 'alloy-prehiding'];
const GLOBALS = ['adobe', 'mboxCreate', 'mboxDefine', 'mboxUpdate'];

const AT_EVENTS = [
    'at-library-loaded',
    'at-request-start',
    'at-request-succeeded',
    'at-request-failed',
    'at-content-rendering-start',
    'at-content-rendering-succeeded',
    'at-content-rendering-failed',
    'at-content-rendering-no-offers',
    'at-content-rendering-redirect',
];

let redirects;

const before = async () => {
    redirects = await getRedirectsInstance();
};

const afterEach = () => {
    clearGlobalProps(...GLOBALS);
    PREHIDING_IDS.forEach((id) => {
        const style = document.getElementById(id);
        if (style) {
            style.remove();
        }
    });
    delete document.readyState;
};

module(name, { before, afterEach });

const runRedirect = () => {
    evalWrapper(redirects.getRedirect(name).content);
};

const addPrehidingStyle = (id) => {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = 'body {opacity: 0 !important}';
    document.head.appendChild(style);
    return style;
};

/**
 * Records at.js events dispatched on the document.
 *
 * @returns {{ events: object[], stop: Function }} recorded events and a function which stops recording
 */
const recordEvents = () => {
    const events = [];
    const listener = (event) => events.push({
        type: event.type,
        detail: event.detail,
        bubbles: event.bubbles,
        isCustom: event instanceof CustomEvent,
    });
    AT_EVENTS.forEach((type) => document.addEventListener(type, listener));
    return {
        events,
        stop: () => AT_EVENTS.forEach((type) => document.removeEventListener(type, listener)),
    };
};

test('Installs the at.js API', (assert) => {
    runRedirect();

    const { target } = window.adobe;
    assert.strictEqual(target.VERSION, '2.11.8', 'VERSION');
    assert.deepEqual(
        Object.keys(target).filter((key) => typeof target[key] === 'function').sort(),
        [
            'applyOffer',
            'applyOffers',
            'getOffer',
            'getOffers',
            'init',
            'registerExtension',
            'sendNotifications',
            'trackEvent',
            'triggerView',
        ],
        'methods of at.js 2.x',
    );
    assert.deepEqual(target.event, {
        LIBRARY_LOADED: 'at-library-loaded',
        REQUEST_START: 'at-request-start',
        REQUEST_SUCCEEDED: 'at-request-succeeded',
        REQUEST_FAILED: 'at-request-failed',
        CONTENT_RENDERING_START: 'at-content-rendering-start',
        CONTENT_RENDERING_SUCCEEDED: 'at-content-rendering-succeeded',
        CONTENT_RENDERING_FAILED: 'at-content-rendering-failed',
        CONTENT_RENDERING_NO_OFFERS: 'at-content-rendering-no-offers',
        CONTENT_RENDERING_REDIRECT: 'at-content-rendering-redirect',
        ARTIFACT_DOWNLOAD_SUCCEEDED: 'artifactDownloadSucceeded',
        ARTIFACT_DOWNLOAD_FAILED: 'artifactDownloadFailed',
        GEO_LOCATION_UPDATED: 'geoLocationUpdated',
    }, 'event constants of at.js 2.11');
    ['mboxCreate', 'mboxDefine', 'mboxUpdate'].forEach((fn) => {
        assert.strictEqual(window[fn](), undefined, `legacy ${fn}()`);
    });
});

test('Keeps the real at.js and other parts of window.adobe', (assert) => {
    const real = { getOffer: () => 'real' };
    window.adobe = { target: real };
    runRedirect();
    assert.strictEqual(window.adobe.target, real, 'existing at.js is kept');

    clearGlobalProps(...GLOBALS);
    const optIn = { isApproved: () => true };
    const pageMbox = () => 'page';
    window.adobe = { optIn };
    window.mboxCreate = pageMbox;
    runRedirect();
    assert.strictEqual(window.adobe.optIn, optIn, 'other parts of window.adobe are kept');
    assert.strictEqual(window.mboxCreate, pageMbox, 'legacy functions of the page are kept');
    const first = window.adobe.target;
    runRedirect();
    assert.strictEqual(window.adobe.target, first, 'repeated loading keeps the first API');
});

test('Return values, as at.js without offers', async (assert) => {
    runRedirect();
    const { target } = window.adobe;

    assert.deepEqual(await target.getOffers({
        request: {
            execute: { pageLoad: {}, mboxes: [{ index: 0, name: 'hero' }, { index: 1, name: 'footer' }] },
            prefetch: { mboxes: [{ index: 0, name: 'later' }], views: [{}] },
        },
    }), {
        execute: { pageLoad: {}, mboxes: [{ name: 'hero' }, { name: 'footer' }] },
        prefetch: { mboxes: [{ name: 'later' }], views: [] },
        meta: { decisioningMethod: 'server-side' },
    }, 'getOffers() resolves without offers');
    assert.deepEqual(
        await target.getOffers(),
        { meta: { decisioningMethod: 'server-side' } },
        'getOffers() without a request',
    );
    assert.ok(target.getOffers({}) instanceof Promise, 'getOffers() returns a native promise');
    assert.strictEqual(await target.applyOffers({ response: {} }), undefined, 'applyOffers() resolves undefined');
    ['applyOffer', 'triggerView', 'sendNotifications', 'registerExtension', 'init'].forEach((method) => {
        assert.strictEqual(target[method]({}), undefined, `${method}()`);
    });
});

test('getOffer() calls success with no offers asynchronously', async (assert) => {
    runRedirect();
    const { target } = window.adobe;
    const recorder = recordEvents();
    await sleep(10);
    recorder.events.length = 0;
    try {
        const calls = [];
        const result = target.getOffer({
            mbox: 'hero',
            success: (offer) => calls.push(['success', offer]),
            error: () => calls.push('error'),
        });
        assert.strictEqual(result, undefined, 'returns undefined');
        assert.deepEqual(calls, [], 'not synchronously');
        await sleep(10);
        assert.deepEqual(calls, [['success', []]], 'success with no actions');
        assert.deepEqual(
            recorder.events.map((event) => [event.type, event.detail.mbox]),
            [
                ['at-request-start', 'hero'],
                ['at-request-succeeded', 'hero'],
                ['at-content-rendering-no-offers', 'hero'],
            ],
            'request events with the mbox',
        );

        target.getOffer({
            mbox: 'x',
            success: () => {
                throw new Error('page callback');
            },
        });
        target.getOffer(null);
        target.getOffer('not options');
        await sleep(10);
        assert.ok(true, 'callback errors and invalid options do not throw');
    } finally {
        recorder.stop();
    }
});

test('trackEvent() calls success asynchronously', async (assert) => {
    runRedirect();
    const calls = [];
    const result = window.adobe.target.trackEvent({ mbox: 'click', success: () => calls.push('success') });
    assert.strictEqual(result, undefined, 'returns undefined');
    assert.strictEqual(window.adobe.target.trackEvent({}), undefined, 'without mbox and callbacks');
    assert.deepEqual(calls, [], 'not synchronously');
    await sleep(10);
    assert.deepEqual(calls, ['success'], 'success is called');
});

test('trackEvent() with a selector calls success after each event', async (assert) => {
    runRedirect();
    const { target } = window.adobe;
    const link = document.createElement('a');
    link.href = '#tracked';
    const button = document.createElement('button');
    document.body.append(link, button);
    const calls = [];
    const bodyEvents = [];
    const onBodyClick = (event) => bodyEvents.push(event.target);
    document.body.addEventListener('click', onBodyClick);
    try {
        target.trackEvent({
            mbox: 'link', selector: link, type: 'click', success: () => calls.push('link'),
        });
        target.trackEvent({
            mbox: 'button',
            selector: 'button:last-of-type',
            type: 'click',
            preventDefault: true,
            success: () => calls.push('button'),
        });
        await sleep(10);
        assert.deepEqual(calls, [], 'success is not called before the event');

        const linkClick = new MouseEvent('click', { bubbles: true, cancelable: true });
        // keep the test page from navigating
        link.addEventListener('click', (event) => event.preventDefault(), { once: true });
        link.dispatchEvent(linkClick);
        assert.deepEqual(bodyEvents, [link], 'the event is propagated');
        await sleep(10);
        assert.deepEqual(calls, ['link'], 'success after the event of the element selected by the element');

        const buttonClick = new MouseEvent('click', { bubbles: true, cancelable: true });
        button.dispatchEvent(buttonClick);
        assert.ok(buttonClick.defaultPrevented, 'preventDefault option cancels the event');
        assert.deepEqual(bodyEvents, [link], 'and stops its propagation, as at.js');
        button.click();
        await sleep(10);
        assert.deepEqual(calls, ['link', 'button', 'button'], 'success after each event');

        target.trackEvent({ mbox: 'no-type', selector: 'button', success: () => calls.push('no type') });
        target.trackEvent({
            mbox: 'none', selector: '#not-existing', type: 'click', success: () => calls.push('none'),
        });
        target.trackEvent({
            mbox: 'invalid', selector: '##', type: 'click', success: () => calls.push('invalid'),
        });
        await sleep(10);
        assert.deepEqual(calls.slice(3), ['no type'], 'success at once without a type, never without elements');
    } finally {
        document.body.removeEventListener('click', onBodyClick);
        link.remove();
        button.remove();
    }
});

test('trackEvent() with preventDefault does not resume the action, as at.js 1.7 and 2.x', async (assert) => {
    runRedirect();
    const { target } = window.adobe;
    const hashBefore = window.location.hash;
    const link = document.createElement('a');
    link.href = '#resumed';
    // a submitted form would load the frame, not the test page
    const frame = document.createElement('iframe');
    frame.name = 'adobe-target-resume';
    const form = document.createElement('form');
    form.action = 'about:blank';
    form.target = frame.name;
    const submit = document.createElement('button');
    form.append(submit);
    document.body.append(link, frame, form);
    await sleep(10);
    let frameLoads = 0;
    frame.addEventListener('load', () => {
        frameLoads += 1;
    });
    const calls = [];
    try {
        target.trackEvent({
            selector: link, type: 'click', preventDefault: true, success: () => calls.push('link'),
        });
        target.trackEvent({
            selector: form, type: 'submit', preventDefault: true, success: () => calls.push('form'),
        });
        link.click();
        submit.click();
        await sleep(100);
        assert.deepEqual(calls, ['link', 'form'], 'success is called');
        assert.strictEqual(window.location.hash, hashBefore, 'the link is not followed');
        assert.strictEqual(frameLoads, 0, 'the form is not submitted');
    } finally {
        link.remove();
        frame.remove();
        form.remove();
    }
});

test('applyOffer() shows the default content of the mbox', async (assert) => {
    runRedirect();
    const { target } = window.adobe;
    // after the events of the page load
    await sleep(10);
    const recorder = recordEvents();
    const first = document.createElement('div');
    first.className = 'hero mboxDefault';
    const second = document.createElement('div');
    second.className = 'mboxDefault other';
    document.body.append(first, second);
    try {
        target.applyOffer({ mbox: 'hero', selector: '.hero', offer: [] });
        assert.strictEqual(first.className, 'hero', 'mboxDefault class removed from the selected element');
        assert.strictEqual(second.className, 'mboxDefault other', 'other default content is kept');
        assert.deepEqual(
            recorder.events.map((event) => [event.type, event.detail.mbox]),
            [['at-content-rendering-no-offers', 'hero']],
            'no offers event with the mbox, synchronously',
        );

        target.applyOffer({ mbox: 'other', selector: second, offer: [] });
        assert.strictEqual(second.className, 'other', 'element as the selector');

        const observer = new MutationObserver(() => {});
        observer.observe(document.body, { attributes: true, subtree: true });
        target.applyOffer({ mbox: 'hero', selector: '.hero', offer: [] });
        assert.deepEqual(observer.takeRecords(), [], 'no attribute change without the class');
        observer.disconnect();

        ['##', '', null, {}].forEach((selector) => {
            assert.strictEqual(target.applyOffer({ selector }), undefined, `invalid selector ${String(selector)}`);
        });
    } finally {
        recorder.stop();
        first.remove();
        second.remove();
    }
});

test('registerExtension() makes the extension available, as at.js 1.x', (assert) => {
    runRedirect();
    const { target } = window.adobe;
    const modules = [];
    const extension = () => 'extension';
    target.registerExtension({
        name: 'angular.setupCommon',
        modules: ['settings', 'logger', 'unknown'],
        register(...args) {
            modules.push(...args);
            return extension;
        },
    });
    assert.strictEqual(target.ext.angular.setupCommon, extension, 'returned value under the dotted name');
    assert.strictEqual(modules.length, 3, 'one argument per module');
    assert.deepEqual(modules[0], {
        clientCode: '',
        serverDomain: '',
        timeout: 3000,
        globalMboxName: 'target-global-mbox',
        globalMboxAutoCreate: false,
    }, 'settings module');
    assert.strictEqual(typeof modules[1].log, 'function', 'logger.log');
    assert.strictEqual(modules[1].error('x'), undefined, 'logger.error');
    assert.strictEqual(modules[2], undefined, 'unknown module');

    // as the angular extension of Adobe, which adds the next function itself
    target.ext.angular.initDirective = () => {};
    target.registerExtension({ name: 'angular.other', modules: [], register: () => 1 });
    assert.deepEqual(Object.keys(target.ext.angular), ['setupCommon', 'initDirective', 'other'], 'namespace kept');

    target.registerExtension({ name: 'constructor.prototype', modules: [], register: () => 'own' });
    assert.strictEqual(target.ext.constructor.prototype, 'own', 'own namespace, not of the prototype');
    assert.strictEqual(Object.prototype.constructor, Object, 'prototype is not changed');

    target.ext.primitive = 1;
    target.registerExtension({ name: 'primitive.inner', modules: [], register: () => 'inner' });
    assert.strictEqual(target.ext.primitive.inner, 'inner', 'a primitive is replaced by a namespace');

    target.registerExtension({
        name: 'thrower',
        modules: [],
        register: () => {
            throw new Error('extension');
        },
    });
    assert.ok('thrower' in target.ext, 'errors of the extension are not thrown');
    [null, 'x', {}, { name: 'a', modules: [] }, { name: 'a-b', register: () => 1 }, { name: 1, register: () => 1 }]
        .forEach((options) => {
            assert.strictEqual(target.registerExtension(options), undefined, `invalid ${JSON.stringify(options)}`);
        });
    assert.notOk('a' in target.ext || 'a-b' in target.ext, 'invalid extensions are not registered');
});

test('Dispatches the events of a page load without offers', async (assert) => {
    const recorder = recordEvents();
    // events of the resources run by the previous tests
    await sleep(20);
    recorder.events.length = 0;
    try {
        runRedirect();
        assert.deepEqual(recorder.events, [], 'not synchronously');
        await sleep(20);
        assert.deepEqual(recorder.events.map((event) => event.type), [
            'at-library-loaded',
            'at-request-start',
            'at-request-succeeded',
            'at-content-rendering-no-offers',
        ], 'order of at.js');
        assert.ok(recorder.events.every((event) => event.isCustom && !event.bubbles), 'CustomEvent on document');
        const sessionIds = recorder.events.map((event) => event.detail.tracking.sessionId);
        assert.ok(sessionIds.every((id) => /^[0-9a-f]{32}$/.test(id)), 'session id');
        assert.strictEqual(recorder.events[2].detail.redirect, false, 'request succeeded without redirect');
        assert.strictEqual(recorder.events[0].detail.type, 'at-library-loaded', 'type in the detail');
    } finally {
        recorder.stop();
    }
});

test('Dispatches the events of a page load once the document is parsed, if it is loading', async (assert) => {
    const recorder = recordEvents();
    // events of the resources run by the previous tests
    await sleep(20);
    recorder.events.length = 0;
    try {
        // as at document start, when the scriptlet runs before the inline scripts of the page
        Object.defineProperty(document, 'readyState', { configurable: true, get: () => 'loading' });
        runRedirect();
        delete document.readyState;
        await sleep(20);
        const beforeParsed = recorder.events.map((event) => event.type);
        // e.g. a listener of an inline script, added after the scriptlet
        const inline = [];
        document.addEventListener('at-library-loaded', () => inline.push('at-library-loaded'), { once: true });
        document.dispatchEvent(new Event('DOMContentLoaded'));
        const afterParsed = recorder.events.map((event) => event.type);
        assert.deepEqual(beforeParsed, [], 'not before the document is parsed');
        assert.deepEqual(afterParsed, [
            'at-library-loaded',
            'at-request-start',
            'at-request-succeeded',
            'at-content-rendering-no-offers',
        ], 'when it is parsed');
        assert.deepEqual(inline, ['at-library-loaded'], 'also to a listener added after the resource has run');
    } finally {
        recorder.stop();
    }
});

test('Calls before the startup events are completed after them, as at.js runs before them', async (assert) => {
    const recorder = recordEvents();
    await sleep(20);
    recorder.events.length = 0;
    const calls = [];
    try {
        Object.defineProperty(document, 'readyState', { configurable: true, get: () => 'loading' });
        runRedirect();
        delete document.readyState;
        // e.g. a page which adds its listener of the request results in the listener of `at-library-loaded`
        document.addEventListener('at-library-loaded', () => {
            document.addEventListener('at-request-succeeded', (event) => {
                calls.push(`succeeded:${event.detail.mbox || 'page load'}`);
            });
        }, { once: true });
        window.adobe.target.getOffer({ mbox: 'header', success: () => calls.push('success:header') });
        // options which the page reuses are read when the call is made
        const applyOptions = { mbox: 'header', offer: [] };
        window.adobe.target.applyOffer(applyOptions);
        applyOptions.mbox = 'second';
        window.adobe.target.applyOffer(applyOptions);
        window.adobe.target.getOffers({ request: { execute: { mboxes: [{ index: 0, name: 'x' }] } } })
            .then(() => calls.push('getOffers'));
        window.adobe.target.applyOffers({ response: {} }).then(() => calls.push('applyOffers'));
        window.adobe.target.trackEvent({ mbox: 'header', success: () => calls.push('trackEvent') });
        await sleep(20);
        const beforeParsed = recorder.events.map((event) => event.type);
        document.dispatchEvent(new Event('DOMContentLoaded'));
        await sleep(20);
        assert.deepEqual(beforeParsed, [], 'nothing before the startup events');
        const withMbox = (event) => `${event.type}${event.detail.mbox ? `:${event.detail.mbox}` : ''}`;
        assert.deepEqual(recorder.events.map(withMbox), [
            'at-library-loaded',
            'at-request-start',
            'at-request-succeeded',
            'at-content-rendering-no-offers',
            'at-content-rendering-no-offers:header',
            'at-content-rendering-no-offers:second',
            'at-request-start:header',
            'at-request-succeeded:header',
            'at-content-rendering-no-offers:header',
        ], 'the events of the calls follow the startup events');
        assert.deepEqual(
            calls,
            ['succeeded:page load', 'getOffers', 'applyOffers', 'succeeded:header', 'success:header', 'trackEvent'],
            'a listener added in the one of at-library-loaded gets the results of the early calls',
        );
    } finally {
        recorder.stop();
    }
});

test('No startup events if at.js of the page replaces the mock before they are dispatched', async (assert) => {
    const recorder = recordEvents();
    await sleep(20);
    recorder.events.length = 0;
    const calls = [];
    try {
        Object.defineProperty(document, 'readyState', { configurable: true, get: () => 'loading' });
        runRedirect();
        delete document.readyState;
        // a call of the page to the mock, and its options changed before the result, as at.js reads the callback then
        const options = { mbox: 'early', success: () => calls.push('replaced success') };
        window.adobe.target.getOffer(options);
        options.success = () => calls.push('success');
        // at.js of the page, e.g. as it is not blocked, which dispatches its own events
        window.adobe.target = { VERSION: 'page' };
        document.dispatchEvent(new Event('DOMContentLoaded'));
        await sleep(20);
        const withMbox = (event) => `${event.type}${event.detail.mbox ? `:${event.detail.mbox}` : ''}`;
        assert.deepEqual(
            recorder.events.map(withMbox),
            ['at-request-start:early', 'at-request-succeeded:early', 'at-content-rendering-no-offers:early'],
            'no startup events of the mock, but the call made to it is completed',
        );
        assert.deepEqual(calls, ['success'], 'with the callback of the options when the request is completed');
    } finally {
        recorder.stop();
    }
});

test('Removes the prehiding styles', (assert) => {
    PREHIDING_IDS.forEach(addPrehidingStyle);
    runRedirect();
    PREHIDING_IDS.forEach((id) => assert.notOk(document.getElementById(id), `${id} is removed`));
});

test('Removes all prehiding styles of an id, e.g. of a snippet run twice', (assert) => {
    // the page is loaded, so the styles are not removed again by an observer
    const content = PREHIDING_IDS.map((id) => {
        addPrehidingStyle(id);
        addPrehidingStyle(id);
        // an element of the page which reuses the id
        const element = document.createElement('main');
        element.id = id;
        document.body.appendChild(element);
        return element;
    });
    runRedirect();
    PREHIDING_IDS.forEach((id) => {
        assert.strictEqual(document.querySelectorAll(`style[id="${id}"]`).length, 0, `all ${id} styles are removed`);
    });
    content.forEach((element) => {
        assert.true(element.isConnected, `element ${element.id} of the page is kept`);
        element.remove();
    });
});

test('Removes prehiding styles added later, until the page has loaded', async (assert) => {
    // as at document start, when the scriptlet runs before the prehiding snippet
    Object.defineProperty(document, 'readyState', { configurable: true, get: () => 'loading' });
    runRedirect();
    delete document.readyState;

    addPrehidingStyle('at-body-style');
    addPrehidingStyle('alloy-prehiding');
    await Promise.resolve();
    PREHIDING_IDS.forEach((id) => assert.notOk(document.getElementById(id), `${id} added later is removed`));

    window.dispatchEvent(new Event('load'));
    const later = addPrehidingStyle('at-body-style');
    await Promise.resolve();
    assert.ok(later.isConnected, 'no longer observed after the load event');
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
    const link = nativeCreateElement.call(document, 'a');
    link.href = '#tracked';
    document.body.append(link);
    const resourcesBefore = performance.getEntriesByType('resource').length;
    try {
        runRedirect();
        const { target } = window.adobe;
        target.getOffer({ mbox: 'm', success: () => {}, error: () => {} });
        await target.getOffers({ request: { execute: { pageLoad: {} } } });
        await target.applyOffers({ response: {} });
        target.trackEvent({ mbox: 'm', success: () => {} });
        target.trackEvent({
            mbox: 'm', selector: link, type: 'click', preventDefault: true, success: () => {},
        });
        link.click();
        target.triggerView('home');
        target.sendNotifications({ request: {} });
        await sleep(20);

        assert.deepEqual(calls, [], 'no request, cookie, storage or element creation');
        assert.strictEqual(performance.getEntriesByType('resource').length, resourcesBefore, 'no resource is loaded');
    } finally {
        window.fetch = nativeFetch;
        XMLHttpRequest.prototype.open = nativeOpen;
        delete navigator.sendBeacon;
        Storage.prototype.setItem = nativeSetItem;
        delete document.createElement;
        delete document.cookie;
        link.remove();
    }
});
