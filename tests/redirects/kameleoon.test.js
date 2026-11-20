/* eslint-disable no-underscore-dangle, func-names */
import {
    clearGlobalProps,
    evalWrapper,
    getRedirectsInstance,
    sleep,
} from '../helpers';

const { test, module } = QUnit;
const name = 'kameleoon';

const CONTAINER_ID = 'kameleoon-test';
const STYLE_ID = 'kameleoonLoadingStyleSheet';

const GLOBALS = [
    'Kameleoon',
    'kameleoonQueue',
    'kameleoonDisplayPage',
    'kameleoonDisplayPageTimeOut',
    'kameleoonTimeout',
    'kameleoonStartLoadTime',
    'kameleoonEndLoadTime',
];

const API_METHODS = {
    Core: [
        'disableLegalConsent',
        'enableDynamicRefresh',
        'enableLegalConsent',
        'enableSinglePageSupport',
        'getConfiguration',
        'load',
        'processRedirect',
        'runWhenConditionTrue',
        'runWhenElementPresent',
        'runWhenShadowRootElementPresent',
    ],
    Data: [
        'performRemoteSynchronization',
        'readLocalData',
        'resetCustomData',
        'retrieveDataFromRemoteSource',
        'setCustomData',
        'writeLocalData',
    ],
    Events: ['trigger'],
    Experiments: [
        'assignVariation',
        'block',
        'getActivatedInVisit',
        'getActive',
        'getAll',
        'getById',
        'getByName',
        'getTriggeredInVisit',
        'trigger',
        'triggerExperiment',
    ],
    Goals: ['cancelConversion', 'processConversion', 'processConversions'],
    Personalizations: [
        'block',
        'disable',
        'getActivatedInVisit',
        'getActive',
        'getAll',
        'getById',
        'getByName',
        'getTriggeredInVisit',
        'trigger',
    ],
    Products: [
        'obtainFullSearchProducts',
        'obtainInstantSearchProducts',
        'obtainProductData',
        'obtainProductInteractions',
        'obtainRecommendedCollections',
        'obtainRecommendedProducts',
        'trackAddToCart',
        'trackAddToWishList',
        'trackCategoryView',
        'trackProductView',
        'trackSearchQuery',
        'trackTransaction',
    ],
    Segments: ['getAll', 'getById', 'getByName', 'reevaluate', 'trigger'],
    Tracking: ['processOmniture'],
    Triggers: ['getAll', 'getById', 'getByName', 'reevaluate', 'trigger'],
    Utils: [
        'addEventListener',
        'addUniversalClickListener',
        'clearInterval',
        'clearTimeout',
        'createHash',
        'getURLParameters',
        'performRequest',
        'querySelectorAll',
        'setInterval',
        'setTimeout',
    ],
    Variations: ['execute'],
    Visitor: ['getCustomDataVisitor', 'setVisitorCode'],
};

let redirects;
let initialUrl;

const before = async () => {
    redirects = await getRedirectsInstance();
};

const beforeEach = () => {
    initialUrl = window.location.href;
    const container = document.createElement('div');
    container.id = CONTAINER_ID;
    document.body.appendChild(container);
};

const afterEach = () => {
    if (typeof window.kameleoonDisplayPageTimeOut === 'number') {
        clearTimeout(window.kameleoonDisplayPageTimeOut);
    }
    clearGlobalProps(...GLOBALS);
    const style = document.getElementById(STYLE_ID);
    if (style) {
        style.remove();
    }
    const container = document.getElementById(CONTAINER_ID);
    if (container) {
        container.remove();
    }
    window.history.replaceState(null, '', initialUrl);
};

module(name, { before, beforeEach, afterEach });

const runRedirect = () => {
    evalWrapper(redirects.getRedirect(name).content);
};

/**
 * Runs the anti-flicker snippet of the Kameleoon installation tag (asynchronous tag with anti-flicker).
 *
 * @param {number} timeout loading timeout in ms
 */
const runAntiFlickerSnippet = (timeout) => {
    window.kameleoonQueue = window.kameleoonQueue || [];
    window.kameleoonStartLoadTime = Date.now();
    if (!document.getElementById(STYLE_ID) && !window.kameleoonDisplayPageTimeOut) {
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = "html::after { content: ''; position: fixed; inset: 0; background: #fff; }";
        document.head.appendChild(style);
        window.kameleoonDisplayPage = function (fromEngine) {
            if (!fromEngine) {
                window.kameleoonTimeout = true;
            }
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        };
        window.kameleoonDisplayPageTimeOut = window.setTimeout(window.kameleoonDisplayPage, timeout);
    }
};

const addToContainer = (html) => {
    const container = document.getElementById(CONTAINER_ID);
    container.insertAdjacentHTML('beforeend', html);
    return container.lastElementChild;
};

test('Installs the API', (assert) => {
    runRedirect();

    const { Kameleoon } = window;
    assert.deepEqual(
        Object.keys(Kameleoon).sort(),
        ['API', 'Analyst', 'Gatherer', 'Internals', 'Loader', 'Targeting', 'Tracking', 'Utils'],
        'top-level objects',
    );
    assert.deepEqual(
        Object.keys(Kameleoon.API).sort(),
        Object.keys(API_METHODS).concat('CurrentVisit').sort(),
        'fourteen API namespaces',
    );
    Object.keys(API_METHODS).forEach((namespace) => {
        const methods = Object.keys(Kameleoon.API[namespace])
            .filter((key) => typeof Kameleoon.API[namespace][key] === 'function')
            .sort();
        assert.deepEqual(methods, API_METHODS[namespace], `${namespace} methods`);
    });
    assert.strictEqual(typeof Kameleoon.Analyst.load, 'function', 'Analyst.load');
    assert.strictEqual(typeof Kameleoon.Utils.runProtectedScript, 'function', 'Utils.runProtectedScript');
    assert.strictEqual(typeof window.kameleoonEndLoadTime, 'number', 'kameleoonEndLoadTime is set');
});

test('Keeps an existing engine and is not applied again', (assert) => {
    const engine = { API: { marker: true } };
    window.Kameleoon = engine;
    runRedirect();
    assert.strictEqual(window.Kameleoon, engine, 'existing engine is kept');
    assert.strictEqual(window.kameleoonQueue, undefined, 'queue is not touched');

    clearGlobalProps('Kameleoon');
    runRedirect();
    const first = window.Kameleoon;
    runRedirect();
    assert.strictEqual(window.Kameleoon, first, 'repeated loading keeps the first API');

    clearGlobalProps('Kameleoon');
    window.Kameleoon = { API: 'not an object' };
    runRedirect();
    assert.strictEqual(typeof window.Kameleoon.API.Core, 'object', 'object without API object is replaced');
});

test('Shows the page hidden by the anti-flicker snippet at once', async (assert) => {
    runAntiFlickerSnippet(100);
    assert.ok(document.getElementById(STYLE_ID), 'snippet hides the page');

    runRedirect();
    assert.notOk(document.getElementById(STYLE_ID), 'page is shown at once');
    assert.strictEqual(window.kameleoonTimeout, undefined, 'timeout flag is not set');

    await sleep(150);
    assert.strictEqual(window.kameleoonTimeout, undefined, 'snippet timeout is cleared');
});

test('Calls the display function of the page once with fromEngine', (assert) => {
    const calls = [];
    window.kameleoonDisplayPage = (...args) => calls.push(args);
    runRedirect();
    assert.deepEqual(calls, [[true]], 'called with true');

    clearGlobalProps(...GLOBALS);
    window.kameleoonDisplayPage = () => {
        throw new Error('page error');
    };
    runRedirect();
    assert.strictEqual(typeof window.Kameleoon.API, 'object', 'error of the display function is not thrown');
});

test('Removes a remaining anti-flicker style', (assert) => {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
    runRedirect();
    assert.notOk(document.getElementById(STYLE_ID), 'style is removed');
});

test('Anti-flicker snippet which runs later does not hide the page', (assert) => {
    runRedirect();
    assert.strictEqual(window.kameleoonDisplayPageTimeOut, true, 'kameleoonDisplayPageTimeOut is set');

    runAntiFlickerSnippet(1000);
    assert.notOk(document.getElementById(STYLE_ID), 'snippet does not hide the page');

    clearGlobalProps(...GLOBALS);
    const timer = setTimeout(() => {}, 0);
    window.kameleoonDisplayPageTimeOut = timer;
    runRedirect();
    assert.strictEqual(window.kameleoonDisplayPageTimeOut, timer, 'value of the page is kept');
});

test('Runs queued commands, IMMEDIATE first', (assert) => {
    const calls = [];
    const queue = [
        () => calls.push('function'),
        ['Events.trigger', 'short'],
        ['Kameleoon.API.Events.trigger', 'prefixed'],
        { level: 'IMMEDIATE', command: () => calls.push('immediate') },
        { command: () => calls.push('object') },
        () => {
            throw new Error('page command');
        },
        ['Unknown.method', 1],
        ['Events.triggered'],
        ['Events'],
        [1],
        'string',
        null,
        () => calls.push('last'),
    ];
    window.kameleoonQueue = queue;
    runRedirect();

    assert.deepEqual(calls, ['immediate', 'function', 'object', 'last'], 'commands run in order');
    assert.deepEqual(window.Kameleoon.API.Events.triggered, ['short', 'prefixed'], 'array commands call the API');
    assert.strictEqual(window.kameleoonQueue, queue, 'queue array is kept');
    assert.strictEqual(queue.length, 0, 'queue is emptied');
    assert.ok(Object.prototype.hasOwnProperty.call(queue, 'push'), 'queue has an own push');
});

test('Commands pushed later run at once', (assert) => {
    runRedirect();
    const calls = [];
    const result = window.kameleoonQueue.push(
        () => calls.push('function'),
        ['Events.trigger', 'pushed'],
        { level: 'IMMEDIATE', command: () => calls.push('object') },
    );
    assert.strictEqual(result, undefined, 'push returns undefined');
    assert.deepEqual(calls, ['function', 'object'], 'commands run at once');
    assert.deepEqual(window.Kameleoon.API.Events.triggered, ['pushed'], 'array command calls the API');
    assert.ok(Array.isArray(window.kameleoonQueue), 'queue is an array');
    assert.strictEqual(window.kameleoonQueue.length, 0, 'commands are not stored');

    clearGlobalProps(...GLOBALS);
    window.kameleoonQueue = { push: 'not a queue' };
    runRedirect();
    assert.ok(Array.isArray(window.kameleoonQueue), 'non-array queue is replaced by an array');
});

test('Commands pushed by queued commands run as well', (assert) => {
    const calls = [];
    window.kameleoonQueue = [
        () => {
            calls.push('outer');
            window.kameleoonQueue.push(() => calls.push('inner'));
            window.kameleoonQueue.push(['Events.trigger', 'inner-array']);
        },
        { level: 'IMMEDIATE', command: () => window.kameleoonQueue.push(() => calls.push('from immediate')) },
    ];
    runRedirect();
    assert.deepEqual(calls, ['from immediate', 'outer', 'inner'], 'nested commands run at once');
    assert.deepEqual(window.Kameleoon.API.Events.triggered, ['inner-array'], 'nested array command runs');
    assert.strictEqual(window.kameleoonQueue.length, 0, 'queue is empty');
});

test('IMMEDIATE command can override Kameleoon.Utils.runProtectedScript', (assert) => {
    const override = () => {};
    window.kameleoonQueue = [{
        level: 'IMMEDIATE',
        command: () => {
            window.Kameleoon.Utils.runProtectedScript = override;
        },
    }];
    runRedirect();
    assert.strictEqual(window.Kameleoon.Utils.runProtectedScript, override, 'override is kept');
});

test('Return values of the API', async (assert) => {
    runRedirect();
    const { API } = window.Kameleoon;

    ['Experiments', 'Personalizations'].forEach((namespace) => {
        ['getAll', 'getActive', 'getActivatedInVisit', 'getTriggeredInVisit'].forEach((method) => {
            assert.deepEqual(API[namespace][method](), [], `${namespace}.${method}()`);
        });
    });
    ['Experiments', 'Personalizations', 'Segments', 'Triggers'].forEach((namespace) => {
        assert.strictEqual(API[namespace].getById(1), null, `${namespace}.getById()`);
        assert.strictEqual(API[namespace].getByName('x'), null, `${namespace}.getByName()`);
    });
    assert.deepEqual(API.Segments.getAll(), [], 'Segments.getAll()');
    assert.deepEqual(API.Triggers.getAll(), [], 'Triggers.getAll()');
    assert.notStrictEqual(API.Experiments.getAll(), API.Experiments.getAll(), 'a new array each time');

    assert.strictEqual(API.Goals.processConversion(1), undefined, 'Goals.processConversion()');
    assert.strictEqual(API.Data.readLocalData('x'), null, 'Data.readLocalData()');

    const configuration = API.Core.getConfiguration();
    assert.deepEqual(
        Object.keys(configuration).sort(),
        ['generationTime', 'goals', 'singlePageSupport', 'siteCode'],
        'Core.getConfiguration() keys',
    );
    assert.strictEqual(configuration.siteCode, '', 'site code is not known without the engine URL');

    let remoteData;
    const promise = API.Data.retrieveDataFromRemoteSource('key', (data) => {
        remoteData = data;
    });
    assert.ok(promise instanceof Promise, 'retrieveDataFromRemoteSource() returns a promise');
    await promise;
    assert.deepEqual(remoteData, {}, 'callback gets an empty object');
    await API.Data.retrieveDataFromRemoteSource('key');
    assert.ok(true, 'callback is optional');

    API.Events.trigger('custom');
    assert.deepEqual(API.Events.triggered, ['custom'], 'Events.trigger() records the event');

    const { Visitor, CurrentVisit } = API;
    assert.ok(/^[a-z0-9]{16}$/.test(Visitor.code), 'Visitor.code');
    assert.strictEqual(Visitor.currentVisit, CurrentVisit, 'Visitor.currentVisit');
    assert.deepEqual(Visitor.visits, [CurrentVisit], 'Visitor.visits');
    assert.deepEqual(Visitor.getCustomDataVisitor(), {}, 'Visitor.getCustomDataVisitor()');
    assert.strictEqual(Visitor.experimentLegalConsent, false, 'Visitor.experimentLegalConsent');
    assert.strictEqual(Visitor.previousVisit, null, 'Visitor.previousVisit');
    assert.strictEqual(CurrentVisit.geolocation.country, '', 'CurrentVisit.geolocation.country');
    assert.strictEqual(CurrentVisit.device.browser, '', 'CurrentVisit.device.browser');
    assert.deepEqual(CurrentVisit.activatedExperiments, [], 'CurrentVisit.activatedExperiments');
    assert.strictEqual(Object.keys(CurrentVisit).length, 20, 'twenty CurrentVisit properties');
});

test('Utils', async (assert) => {
    window.history.replaceState(null, '', '?a=1&b=two');
    runRedirect();
    const { Utils } = window.Kameleoon.API;

    assert.strictEqual(Utils.createHash('abc'), 96354, 'createHash() is Java String.hashCode');
    assert.strictEqual(Utils.createHash(''), 0, 'createHash() of empty string');
    // documented limitation: the engine hashes the SHA-256 of the value with the flag, i.e. -902865482
    assert.strictEqual(Utils.createHash('abc', true), 96354, 'createHash() ignores useSha256');
    assert.deepEqual(Utils.getURLParameters(), { a: '1', b: 'two' }, 'getURLParameters()');
    const isTouch = 'ontouchend' in document.documentElement;
    assert.strictEqual(Utils.mouseDownEvent, isTouch ? 'touchend' : 'mousedown', 'mouseDownEvent');
    assert.strictEqual(Utils.touchMoveEvent, undefined, 'touchMoveEvent before a touch');

    const host = addToContainer('<div><p class="item"></p><p class="item"></p></div>');
    const items = Utils.querySelectorAll(`#${CONTAINER_ID} .item`);
    assert.ok(Array.isArray(items) && items.length === 2, 'querySelectorAll() returns an array');
    assert.strictEqual(Utils.querySelectorAll('.item', host).length, 2, 'querySelectorAll() with root');
    assert.deepEqual(Utils.querySelectorAll('##invalid'), [], 'invalid selector gives an empty array');

    let fired = 0;
    Utils.addEventListener(host, 'custom', () => {
        fired += 1;
    });
    host.dispatchEvent(new Event('custom'));
    assert.strictEqual(fired, 1, 'addEventListener()');
    Utils.addEventListener(null, 'custom', () => {});
    assert.ok(true, 'addEventListener() with invalid element does not throw');

    const clicks = [];
    Utils.addUniversalClickListener(host, (event) => clicks.push(event.type));
    Utils.addUniversalClickListener(host, () => {
        throw new Error('page listener');
    });
    if (!isTouch) {
        host.dispatchEvent(new MouseEvent('mousedown'));
        assert.deepEqual(clicks, ['mousedown'], 'addUniversalClickListener() listens to mousedown');
    }

    let timeouts = 0;
    const timeoutId = Utils.setTimeout(() => {
        timeouts += 1;
    }, 10);
    const cancelledId = Utils.setTimeout(() => {
        timeouts += 100;
    }, 10);
    Utils.clearTimeout(cancelledId);
    let intervals = 0;
    const intervalId = Utils.setInterval(() => {
        intervals += 1;
    }, 10);
    assert.strictEqual(typeof timeoutId, 'number', 'setTimeout() returns an id');
    await sleep(60);
    Utils.clearInterval(intervalId);
    const intervalsAfterClear = intervals;
    await sleep(30);
    assert.strictEqual(timeouts, 1, 'setTimeout() and clearTimeout()');
    assert.ok(intervalsAfterClear >= 2, 'setInterval()');
    assert.strictEqual(intervals, intervalsAfterClear, 'clearInterval()');
});

test('Core.runWhenConditionTrue()', async (assert) => {
    runRedirect();
    const { Core } = window.Kameleoon.API;
    const calls = [];

    Core.runWhenConditionTrue(() => true, (...args) => calls.push(['immediate', args.length]));
    assert.deepEqual(calls, [['immediate', 0]], 'true condition calls the callback at once without arguments');

    let ready = false;
    Core.runWhenConditionTrue(() => ready, () => calls.push('polled'), 10);
    Core.runWhenConditionTrue(() => {
        throw new Error('page condition');
    }, () => calls.push('never'), 10);
    Core.runWhenConditionTrue(() => true, () => {
        throw new Error('page callback');
    });
    Core.runWhenConditionTrue('not a function', () => calls.push('never'));
    await sleep(30);
    assert.strictEqual(calls.length, 1, 'waits while the condition is false');
    ready = true;
    await sleep(30);
    assert.deepEqual(calls, [['immediate', 0], 'polled'], 'callback is called once the condition is true');
    await sleep(30);
    assert.strictEqual(calls.length, 2, 'callback is called once');
});

test('Core.runWhenElementPresent()', async (assert) => {
    runRedirect();
    const { Core } = window.Kameleoon.API;
    const existing = addToContainer('<p class="present">existing</p>');

    const once = [];
    Core.runWhenElementPresent(`#${CONTAINER_ID} .present`, (elements) => once.push(elements));
    assert.deepEqual(once, [[existing]], 'existing elements are passed at once as an array');

    const later = [];
    Core.runWhenElementPresent(`#${CONTAINER_ID} .later`, (elements) => later.push(elements));
    const added = addToContainer('<p class="later">added</p>');
    await sleep(0);
    addToContainer('<p class="later">second</p>');
    await sleep(0);
    assert.deepEqual(later, [[added]], 'element added later is passed once');

    const dynamic = [];
    const dynamicSelector = `#${CONTAINER_ID} .dynamic`;
    Core.runWhenElementPresent(dynamicSelector, (elements) => dynamic.push(elements.length), undefined, true);
    addToContainer('<p class="dynamic"></p>');
    await sleep(0);
    addToContainer('<p class="dynamic"></p><p class="dynamic"></p>');
    await sleep(0);
    assert.deepEqual(dynamic, [1, 2], 'dynamic: each batch of new elements is passed, once');

    const polled = [];
    Core.runWhenElementPresent(`#${CONTAINER_ID} .polled`, (elements) => polled.push(elements.length), 10);
    addToContainer('<p class="polled"></p>');
    await sleep(40);
    assert.deepEqual(polled, [1], 'polling interval');

    Core.runWhenElementPresent('##invalid', () => polled.push('never'));
    Core.runWhenElementPresent(`#${CONTAINER_ID} .present`, () => {
        throw new Error('page callback');
    });
    await sleep(0);
    assert.deepEqual(polled, [1], 'invalid selector and callback errors are ignored');
});

test('Core.runWhenElementPresent() reacts to attribute changes', async (assert) => {
    runRedirect();
    const { Core } = window.Kameleoon.API;
    const withClass = addToContainer('<p id="kameleoon-probe-class"></p>');
    const withAttribute = addToContainer('<p id="kameleoon-probe-attribute"></p>');

    // No assertion until the changes are observed: an assertion changes the QUnit report in the document,
    // and an observer of child nodes only would check the elements again then.
    const calls = [];
    Core.runWhenElementPresent('#kameleoon-probe-class.ready', (elements) => calls.push(elements));
    Core.runWhenElementPresent('#kameleoon-probe-attribute[data-state="done"]', (elements) => calls.push(elements));
    const callsBefore = calls.length;
    withClass.classList.add('ready');
    withAttribute.setAttribute('data-state', 'done');
    // Mutation observer callbacks run before a microtask continues.
    await Promise.resolve();
    const callsAfter = calls.slice();

    assert.strictEqual(callsBefore, 0, 'not called before the elements match');
    assert.deepEqual(callsAfter, [[withClass], [withAttribute]], 'called once a class or an attribute matches');
});

test('Core.runWhenShadowRootElementPresent()', async (assert) => {
    runRedirect();
    const { Core } = window.Kameleoon.API;
    const host = addToContainer('<div class="shadow-host"></div>');
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = '<span class="inner"></span>';

    const calls = [];
    Core.runWhenShadowRootElementPresent(
        `#${CONTAINER_ID} .shadow-host`,
        '.inner',
        (elements) => calls.push(elements),
    );
    assert.deepEqual(calls, [[root.firstElementChild]], 'element in the shadow root is passed at once');

    const later = [];
    Core.runWhenShadowRootElementPresent(
        `#${CONTAINER_ID} .shadow-host`,
        '.later',
        (elements) => later.push(elements.length),
        true,
    );
    const addLater = () => {
        const span = document.createElement('span');
        span.className = 'later';
        root.appendChild(span);
    };
    addLater();
    await sleep(200);
    addLater();
    await sleep(200);
    assert.deepEqual(later, [1, 1], 'dynamic: elements added later in the shadow root are polled');
});

test('Utils.getURLParameters() reads the query and the hash as the engine', (assert) => {
    window.history.replaceState(null, '', '?plain=ok&a=1%202&b=x=y&flag#route?tab=details&plain=hash');
    runRedirect();
    assert.deepEqual(window.Kameleoon.API.Utils.getURLParameters(), {
        plain: 'hash',
        a: '1 2',
        b: 'x',
        flag: null,
        route: null,
        tab: 'details',
    }, 'parameters of the query and the hash');

    window.history.replaceState(null, '', '?bad=%E0%A4%A');
    const expected = { bad: unescape('%E0%A4%A') };
    assert.deepEqual(window.Kameleoon.API.Utils.getURLParameters(), expected, 'malformed URI escape');
});

test('Utils.addUniversalClickListener() on touch devices', (assert) => {
    const root = document.documentElement;
    const hadOwnTouchEnd = Object.prototype.hasOwnProperty.call(root, 'ontouchend');
    if (!hadOwnTouchEnd) {
        root.ontouchend = null;
    }
    try {
        runRedirect();
        const { Utils } = window.Kameleoon.API;
        assert.strictEqual(Utils.mouseDownEvent, 'touchend', 'mouseDownEvent is touchend');

        const button = addToContainer('<button><span class="label"></span></button>');
        const disabled = addToContainer('<button disabled><span class="label"></span></button>');
        const taps = [];
        Utils.addUniversalClickListener(button, (event) => taps.push(event.type));
        Utils.addUniversalClickListener(disabled, () => taps.push('disabled'));
        const touch = (type, target) => target.dispatchEvent(new Event(type, { bubbles: true }));

        touch('touchstart', button.firstElementChild);
        touch('touchend', button.firstElementChild);
        assert.deepEqual(taps, ['touchend'], 'tap calls the listener');

        button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        assert.deepEqual(taps, ['touchend'], 'mousedown is not listened to');

        touch('touchstart', button);
        touch('touchmove', button);
        assert.strictEqual(Utils.touchMoveEvent, true, 'touchMoveEvent after a move');
        touch('touchend', button);
        assert.deepEqual(taps, ['touchend'], 'a touch which has moved is not a click');

        touch('touchstart', disabled.firstElementChild);
        touch('touchend', disabled.firstElementChild);
        assert.deepEqual(taps, ['touchend'], 'a tap on a disabled control is not a click');

        touch('touchstart', button);
        touch('touchend', button);
        assert.deepEqual(taps, ['touchend', 'touchend'], 'next tap calls the listener');
    } finally {
        if (!hadOwnTouchEnd) {
            delete root.ontouchend;
        }
    }
});

test('Dispatches Kameleoon::Loaded and Kameleoon::Started', async (assert) => {
    const events = [];
    const listener = (event) => events.push({
        type: event.type,
        detail: event.detail,
        bubbles: event.bubbles,
        isCustom: event instanceof CustomEvent,
        apiReady: !!(window.Kameleoon && window.Kameleoon.API),
    });
    // events of the resources run by the previous tests
    await sleep(20);
    window.addEventListener('Kameleoon::Loaded', listener);
    window.addEventListener('Kameleoon::Started', listener);
    try {
        window.kameleoonStartLoadTime = Date.now() - 1000;
        runRedirect();
        assert.deepEqual(events, [], 'events are not dispatched synchronously');
        await sleep(20);

        assert.deepEqual(events.map((event) => event.type), ['Kameleoon::Loaded', 'Kameleoon::Started'], 'order');
        const loaded = events[0];
        assert.strictEqual(loaded.detail.timeout, false, 'Loaded: timeout is false');
        assert.ok(loaded.detail.loadTime >= 1000, 'Loaded: loadTime from kameleoonStartLoadTime');
        assert.strictEqual(typeof loaded.detail.time, 'number', 'Loaded: time');
        assert.strictEqual(events[1].detail.newVisitorCode, true, 'Started: newVisitorCode');
        assert.ok(events.every((event) => event.isCustom && !event.bubbles && event.apiReady), 'CustomEvent on window');
    } finally {
        window.removeEventListener('Kameleoon::Loaded', listener);
        window.removeEventListener('Kameleoon::Started', listener);
    }
});

test('Site code from the URL of the engine', (assert) => {
    const cases = [
        ['https://abc123def4.kameleoon.io/engine.js', 'abc123def4'],
        ['https://abc123def4.kameleoon.eu/kameleoon.js', 'abc123def4'],
        ['https://example.org/engine.js?u=https://abc123def4.kameleoon.io/engine.js', ''],
    ];
    cases.forEach(([src, expected]) => {
        clearGlobalProps('Kameleoon');
        Object.defineProperty(document, 'currentScript', {
            configurable: true,
            get: () => ({ src }),
        });
        try {
            runRedirect();
        } finally {
            delete document.currentScript;
        }
        assert.strictEqual(window.Kameleoon.API.Core.getConfiguration().siteCode, expected, src);
    });
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
    const addedNodes = [];
    const observer = new MutationObserver((records) => {
        const qunit = document.getElementById('qunit');
        records.forEach((mutation) => {
            if (qunit && qunit.contains(mutation.target)) {
                return;
            }
            mutation.addedNodes.forEach((node) => addedNodes.push(node.nodeName));
        });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    try {
        window.kameleoonQueue = [
            ['Goals.processConversion', 1],
            ['Experiments.assignVariation', 1, 2, true],
            ['Core.enableLegalConsent'],
            ['Data.setCustomData', 'key', 'value'],
            ['Products.trackTransaction', {}],
        ];
        runRedirect();
        const { API } = window.Kameleoon;
        API.Utils.performRequest('https://example.org/', () => calls.push('performRequest callback'));
        await API.Data.retrieveDataFromRemoteSource('key', () => {});
        API.Data.writeLocalData('key', 'value');
        API.Visitor.setVisitorCode('code');
        await sleep(20);

        assert.deepEqual(calls, [], 'no request, cookie, storage or element creation');
        assert.deepEqual(addedNodes, [], 'no nodes are added');
        assert.strictEqual(performance.getEntriesByType('resource').length, resourcesBefore, 'no resource is loaded');
    } finally {
        observer.disconnect();
        window.fetch = nativeFetch;
        XMLHttpRequest.prototype.open = nativeOpen;
        delete navigator.sendBeacon;
        Storage.prototype.setItem = nativeSetItem;
        delete document.createElement;
        delete document.cookie;
    }
});

test('Unguarded page code runs and the page is shown', (assert) => {
    const pageCode = 'Kameleoon && Kameleoon.API.Goals.processConversion(1);'
        + 'Kameleoon.API.Goals.processConversion(2);'
        + 'window.kameleoonTestAfter = true;';

    // without the redirect, i.e. the engine is blocked
    runAntiFlickerSnippet(1000);
    assert.throws(() => evalWrapper(pageCode), ReferenceError, 'blocked engine: unguarded page code throws');
    assert.ok(document.getElementById(STYLE_ID), 'blocked engine: page is hidden');

    clearTimeout(window.kameleoonDisplayPageTimeOut);
    document.getElementById(STYLE_ID).remove();
    clearGlobalProps(...GLOBALS);

    // with the redirect
    runAntiFlickerSnippet(1000);
    runRedirect();
    try {
        evalWrapper(pageCode);
        assert.strictEqual(window.kameleoonTestAfter, true, 'next page code runs');
    } finally {
        clearGlobalProps('kameleoonTestAfter');
    }
    assert.notOk(document.getElementById(STYLE_ID), 'page is shown');
});
