/* eslint-disable no-underscore-dangle, no-console, func-names */
import {
    clearGlobalProps,
    evalWrapper,
    getRedirectsInstance,
    sleep,
} from '../helpers';

const { test, module } = QUnit;
const name = 'optimizely';

const CONTAINER_ID = 'optimizely-test';

// Lifecycle events are emitted in a timeout if the document has been parsed,
// as it has when the tests run.
const LIFECYCLE_DELAY_MS = 20;

const V0_COMMANDS = [
    'activateGeoDelayedExperiments',
    'activateSiteCatalyst',
    'bucketUser',
    'bucketVisitor',
    'disable',
    'log',
    'optOut',
    'setCookieDomain',
    'setCookieExpiration',
    'setDimensionValue',
    'setGA4UserId',
    'setUserId',
    'storeThirdPartyData',
    'trackEvent',
];

const V1_COMMANDS = [
    'activate',
    'addListener',
    'bucketVisitor',
    'clientMetadata',
    'cookieDomain',
    'cookieExpiration',
    'dataFromSource',
    'disable',
    'disableCrossOrigin',
    'event',
    'extendCookieLifetime',
    'ga4User',
    'holdEvents',
    'initialViewStates',
    'integrationSettings',
    'load',
    'loadEmbeddedEditor',
    'log',
    'microsnippetError',
    'optOut',
    'page',
    'priorRedirectString',
    'registerModule',
    'removeListener',
    'rum',
    'sendEvents',
    'tags',
    'user',
    'waitForOriginSync',
];

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
    clearGlobalProps('optimizely', '$', 'jQuery', 'optimizelyTestAfter', 'optimizelyTestMap');
    // the redirect wraps the methods as own properties of `history`
    delete window.history.pushState;
    delete window.history.replaceState;
    window.history.replaceState(null, '', initialUrl);
    const container = document.getElementById(CONTAINER_ID);
    if (container) {
        container.remove();
    }
    document.documentElement.classList.remove('optimizely-hide');
};

module(name, { before, beforeEach, afterEach });

const runRedirect = () => {
    evalWrapper(redirects.getRedirect(name).content);
};

/**
 * Runs the redirect while `document.currentScript` returns an object with given `src`,
 * as for a `<script>` element whose request has been redirected.
 *
 * @param {string} src URL of the snippet
 */
const runRedirectFromScript = (src) => {
    Object.defineProperty(document, 'currentScript', {
        configurable: true,
        get: () => ({ src }),
    });
    try {
        runRedirect();
    } finally {
        delete document.currentScript;
    }
};

const addToContainer = (html) => {
    const container = document.getElementById(CONTAINER_ID);
    container.insertAdjacentHTML('beforeend', html);
    return container.lastElementChild;
};

test('Checking if alias names work', (assert) => {
    const code = redirects.getRedirect(name).content;
    assert.strictEqual(redirects.getRedirect('ubo-optimizely.js').content, code, 'ubo- prefixed name - ok');
    assert.strictEqual(redirects.getRedirect('optimizely.js').content, code, 'ubo name - ok');
});

test('Installs the API', (assert) => {
    runRedirect();

    // `hit()` is not checked here: it reports only with `verbose`,
    // which redirects do not have; it is checked in the scriptlet test
    const api = window.optimizely;
    assert.notOk(Array.isArray(api), 'window.optimizely is not an array');
    assert.strictEqual(typeof api.push, 'function', 'push is a function');
    assert.strictEqual(typeof api.get, 'function', 'get is a function');
    assert.strictEqual(api.initialized, true, 'initialized is set synchronously');
    assert.deepEqual(
        api.data,
        { note: "Obsolete, use optimizely.get('data') instead" },
        'legacy data is the obsolete note',
    );
    assert.deepEqual(api.state, {}, 'legacy state is an empty object');
});

test('Keeps an initialized client and is not applied again', (assert) => {
    const client = { get: () => 'page client' };
    window.optimizely = client;
    runRedirect();
    assert.strictEqual(window.optimizely, client, 'existing client is kept');

    clearGlobalProps('optimizely');
    runRedirect();
    const first = window.optimizely;
    runRedirect();
    assert.strictEqual(window.optimizely, first, 'repeated loading keeps the first API');
});

test('Replaces other values of window.optimizely', (assert) => {
    window.optimizely = { initialized: true };
    runRedirect();
    assert.strictEqual(typeof window.optimizely.get, 'function', 'object without get() is replaced');

    clearGlobalProps('optimizely');
    window.optimizely = { get: 'not a function' };
    runRedirect();
    assert.strictEqual(typeof window.optimizely.get, 'function', 'object with non-function get is replaced');
});

test('Replays queued commands in order', async (assert) => {
    const calls = [];
    const queue = [];
    window.optimizely = queue;
    queue.push({
        type: 'addListener',
        filter: { type: 'custom', name: 'first' },
        handler: () => calls.push('first'),
    });
    queue.push(['trackEvent', 'purchase', { revenue: 100 }]);
    queue.push('unknownCommand');
    queue.push({
        type: 'addListener',
        filter: { type: 'lifecycle', name: 'initialized' },
        handler: () => calls.push('initialized'),
    });
    queue.push({
        type: 'addListener',
        filter: { type: 'custom' },
        handler: () => calls.push('second'),
    });
    queue.push({ type: 'addListener' });

    runRedirect();

    assert.notStrictEqual(window.optimizely, queue, 'queue is replaced by the API');
    assert.strictEqual(typeof window.optimizely.get, 'function', 'API is installed');

    window.optimizely.get('event_emitter').emit({ type: 'custom', name: 'first' });
    assert.deepEqual(calls, ['first', 'second'], 'queued listeners are registered in order');

    await sleep(LIFECYCLE_DELAY_MS);
    assert.deepEqual(calls, ['first', 'second', 'initialized'], 'queued lifecycle listener is called');
});

test('push() return values', (assert) => {
    runRedirect();
    const { push } = window.optimizely;

    V0_COMMANDS.forEach((command) => {
        assert.strictEqual(push([command]), true, `v0 array command "${command}"`);
    });
    V1_COMMANDS.forEach((command) => {
        assert.strictEqual(push({ type: command }), true, `v1 object command "${command}"`);
    });
    assert.strictEqual(push('disable'), true, 'v0 string command');
    assert.strictEqual(push({ type: 'activate', version: 1 }), true, 'object with explicit version 1');
    assert.strictEqual(push({ type: 'trackEvent', version: 0 }), true, 'object with version 0');

    assert.strictEqual(push('activate'), false, 'v1 name as v0 string');
    assert.strictEqual(push(['activate']), false, 'v1 name as v0 array');
    assert.strictEqual(push({ type: 'trackEvent' }), false, 'v0 name as v1 object');
    assert.strictEqual(push({ type: 'activate', version: 2 }), false, 'version 2 table is empty');
    assert.strictEqual(push({ type: 'activate', version: 3 }), false, 'unknown version');
    assert.strictEqual(push({ type: 'unknown' }), false, 'unknown name');
    assert.strictEqual(push([]), false, 'empty array');
    assert.strictEqual(push(null), false, 'null');
    assert.strictEqual(push(undefined), false, 'undefined');
    assert.strictEqual(push(1), false, 'number');
    assert.strictEqual(push(() => {}), false, 'function');
});

test('Errors of commands and listeners are not thrown', (assert) => {
    runRedirect();
    const { push } = window.optimizely;

    assert.strictEqual(push({ type: 'addListener' }), true, 'addListener without handler');
    assert.strictEqual(push({ type: 'removeListener' }), true, 'removeListener without token');
    assert.strictEqual(push({ type: 'log' }), true, 'log without level');

    const calls = [];
    push({
        type: 'addListener',
        filter: { type: 'custom' },
        handler: () => {
            throw new Error('page handler');
        },
    });
    push({
        type: 'addListener',
        filter: { type: 'custom' },
        handler: () => calls.push('next'),
    });
    window.optimizely.get('event_emitter').emit({ type: 'custom' });
    assert.deepEqual(calls, ['next'], 'next listener is called after a throwing one');
});

test('get() modules', (assert) => {
    runRedirect();
    const { get } = window.optimizely;

    const data = get('data');
    assert.deepEqual(data, {
        accountId: null,
        audiences: {},
        campaigns: {},
        clientName: 'js',
        clientVersion: '0.261.0',
        dcpServiceId: null,
        events: {},
        experiments: {},
        groups: {},
        pages: {},
        projectId: null,
        revision: null,
        snippetId: null,
        variations: {},
    }, 'data of an empty project');

    const state = get('state');
    assert.strictEqual(state.getActivationId(), null, 'getActivationId');
    assert.deepEqual(state.getActiveExperimentIds(), [], 'getActiveExperimentIds');
    assert.deepEqual(state.getCampaignStateLists(), {}, 'getCampaignStateLists');
    assert.deepEqual(state.getCampaignStates({ isActive: true }), {}, 'getCampaignStates');
    assert.strictEqual(state.getDecisionObject(), null, 'getDecisionObject');
    assert.strictEqual(state.getDecisionString(), null, 'getDecisionString');
    assert.deepEqual(state.getExperimentStates(), {}, 'getExperimentStates');
    assert.deepEqual(state.getPageStates(), {}, 'getPageStates');
    assert.strictEqual(state.getRedirectInfo(), null, 'getRedirectInfo');
    assert.deepEqual(state.getTrafficExclusionStats(), {}, 'getTrafficExclusionStats');
    assert.deepEqual(state.getVariationMap(), {}, 'getVariationMap');
    assert.strictEqual(state.isGlobalHoldback(), false, 'isGlobalHoldback');
    assert.strictEqual(Object.keys(state).length, 12, 'twelve state methods');

    const visitor = get('visitor');
    assert.strictEqual(visitor.location.country, '', 'visitor.location.country');
    assert.deepEqual(
        Object.keys(visitor.location).sort(),
        ['city', 'continent', 'country', 'dma', 'region'],
        'visitor.location keys',
    );
    assert.strictEqual(visitor.first_session, true, 'visitor.first_session');
    assert.strictEqual(visitor.source_type, 'direct', 'visitor.source_type');
    assert.strictEqual(visitor.visitorId, null, 'visitor.visitorId');
    assert.deepEqual(visitor.customBehavior, [], 'visitor.customBehavior');
    assert.strictEqual(Object.keys(visitor).length, 21, 'twenty-one visitor keys');
    const timestamp = visitor.currentTimestamp;
    assert.ok(Math.abs(timestamp - Date.now()) < 1000, 'visitor.currentTimestamp is the current time');

    const visitorId = get('visitor_id');
    assert.ok(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(visitorId.randomId),
        'visitor_id.randomId is a UUID v4',
    );

    const utils = get('utils');
    assert.deepEqual(
        Object.keys(utils).sort(),
        ['Promise', 'observeSelector', 'onUrlChange', 'persistHtml', 'poll', 'waitForElement', 'waitUntil'],
        'utils keys',
    );
    assert.strictEqual(utils.Promise, window.Promise, 'utils.Promise is the page Promise');

    const emitter = get('event_emitter');
    assert.strictEqual(typeof emitter.on, 'function', 'event_emitter.on');
    assert.strictEqual(typeof emitter.off, 'function', 'event_emitter.off');
    assert.strictEqual(typeof emitter.emit, 'function', 'event_emitter.emit');

    assert.strictEqual(typeof get('behavior').query, 'function', 'behavior module');
    assert.strictEqual(get('unknown'), undefined, 'unknown module');
    assert.strictEqual(get('jquery'), undefined, 'jquery is undefined without window.$');
    window.jQuery = () => {};
    assert.strictEqual(get('jquery'), undefined, 'jquery is not taken from window.jQuery');
    window.$ = () => {};
    assert.strictEqual(get('jquery'), window.$, 'jquery is window.$');
});

test('get("behavior") validates descriptors', (assert) => {
    runRedirect();
    const behavior = window.optimizely.get('behavior');

    assert.deepEqual(behavior.getEvents(), [], 'getEvents() without descriptor');
    assert.deepEqual(behavior.getEvents(5), [], 'getEvents() with count');
    assert.throws(() => behavior.getEvents(0), /Count must be a positive integer, got 0/, 'getEvents(0)');
    assert.throws(() => behavior.getEvents(null), /Descriptor not defined/, 'getEvents(null)');
    assert.throws(() => behavior.getEvents({ count: 1 }), /Unexpected "count" clause/, 'getEvents() with count');
    assert.throws(
        () => behavior.getEvents({ pick: { modifier: 'most_frequent' } }),
        /Invalid "pick" modifier "most_frequent"/,
        'getEvents() with frequency modifier',
    );
    assert.throws(
        () => behavior.getEvents({ filters: [{ modifier: 'x' }] }),
        /Unexpected "filter" modifier "x"/,
        'getEvents() with filter modifier',
    );
    assert.deepEqual(behavior.getEvents({ pick: { modifier: 'most_recent' } }), [], 'getEvents() valid');

    assert.throws(() => behavior.getByFrequency(), /No "pick" clause/, 'getByFrequency() without pick');
    assert.throws(() => behavior.getByFrequency({ pick: {} }), /No field name/, 'getByFrequency() without name');
    assert.throws(
        () => behavior.getByFrequency({ pick: { name: 'a', modifier: 'most_recent' } }),
        /Invalid "pick" modifier "most_recent"/,
        'getByFrequency() with recency modifier',
    );
    assert.deepEqual(behavior.getByFrequency({ pick: { name: 'a' } }), [], 'getByFrequency() valid');

    assert.deepEqual(behavior.query(), [], 'query()');
    assert.strictEqual(behavior.query({ reduce: { aggregator: 'count' } }), undefined, 'reduced query()');
});

test('Lifecycle events are emitted in order', async (assert) => {
    runRedirect();
    const names = [];
    window.optimizely.push({
        type: 'addListener',
        handler: (event) => names.push(`${event.type}:${event.name}`),
    });
    assert.deepEqual(names, [], 'nothing is emitted synchronously');

    await sleep(LIFECYCLE_DELAY_MS);
    assert.deepEqual(names, [
        'lifecycle:initialized',
        'lifecycle:originsSynced',
        'lifecycle:activate',
        'lifecycle:activated',
    ], 'lifecycle order');
});

test('Late listeners receive sticky lifecycle events', async (assert) => {
    runRedirect();
    await sleep(LIFECYCLE_DELAY_MS);

    const received = [];
    ['initialized', 'originsSynced', 'activate', 'activated'].forEach((eventName) => {
        window.optimizely.push({
            type: 'addListener',
            filter: { type: 'lifecycle', name: eventName },
            handler: (event) => received.push(event),
        });
    });
    assert.deepEqual(received, [
        { type: 'lifecycle', name: 'initialized' },
        { type: 'lifecycle', name: 'originsSynced' },
        { type: 'lifecycle', name: 'activated' },
    ], 'sticky events are delivered synchronously, activate is not sticky');

    received.length = 0;
    window.optimizely.get('event_emitter').on({
        filter: { type: 'lifecycle', name: 'initialized' },
        handler: (event) => received.push(event.name),
    });
    assert.deepEqual(received, ['initialized'], 'event_emitter.on() replays sticky events');
});

test('Listener tokens and removal', (assert) => {
    runRedirect();
    const { push } = window.optimizely;
    const emitter = window.optimizely.get('event_emitter');
    const calls = [];

    const spec = { filter: { type: 'custom' }, handler: () => calls.push('removed'), type: 'addListener' };
    push(spec);
    assert.ok(typeof spec.token === 'string' && spec.token.length === 36, 'token is set on the spec');
    push({ type: 'removeListener', token: spec.token });

    const ownToken = 'own-token';
    const specWithToken = {
        type: 'addListener',
        filter: { type: 'custom' },
        handler: () => calls.push('own'),
        token: ownToken,
    };
    push(specWithToken);
    assert.strictEqual(specWithToken.token, ownToken, 'own token is kept');

    const emitterToken = emitter.on({ filter: { type: 'custom' }, handler: () => calls.push('emitter') });
    assert.strictEqual(typeof emitterToken, 'string', 'event_emitter.on() returns the token');
    assert.strictEqual(emitter.on(null), undefined, 'event_emitter.on(null)');

    emitter.emit({ type: 'other' });
    emitter.emit(null);
    emitter.emit({ type: 'custom' });
    assert.deepEqual(calls, ['own', 'emitter'], 'only listeners matching the filter and not removed');

    emitter.off(emitterToken);
    push({ type: 'removeListener', token: ownToken });
    emitter.emit({ type: 'custom' });
    assert.deepEqual(calls, ['own', 'emitter'], 'removed listeners are not called');
});

test('Logging is silent unless enabled by the page', (assert) => {
    const nativeWarn = console.warn;
    const nativeError = console.error;
    const warnings = [];
    const errors = [];
    console.warn = (...args) => warnings.push(args.join(' '));
    console.error = (...args) => errors.push(args.join(' '));
    try {
        runRedirect();
        const { push, get } = window.optimizely;
        push('unknownCommand');
        get('unknownModule');
        assert.deepEqual(warnings, [], 'nothing is logged by default');

        push({ type: 'log', level: 'WARN' });
        push('unknownCommand');
        get('unknownModule');
        assert.strictEqual(warnings.length, 2, 'warnings are logged with level WARN');
        assert.ok(warnings[0].includes('API / No function found for "unknownCommand" (v0)'), 'unknown command');
        assert.ok(warnings[1].includes('Module "unknownModule" not found.'), 'unknown module');

        push({ type: 'log', level: 'ERROR' });
        push('unknownCommand');
        assert.strictEqual(warnings.length, 2, 'warnings are not logged with level ERROR');

        push(['log']);
        push('unknownCommand');
        assert.strictEqual(warnings.length, 3, 'legacy log command enables INFO');

        push({ type: 'log', level: 'bogus' });
        assert.deepEqual(errors, ['Unknown log level: bogus'], 'unknown level is reported');
    } finally {
        console.warn = nativeWarn;
        console.error = nativeError;
    }
});

test('utils.observeSelector()', async (assert) => {
    runRedirect();
    const { observeSelector } = window.optimizely.get('utils');
    const existing = addToContainer('<p class="target">existing</p>');
    const seen = [];

    const unsubscribe = observeSelector(`#${CONTAINER_ID} .target`, (node) => seen.push(node));
    assert.deepEqual(seen, [existing], 'existing node is passed synchronously');

    const added = addToContainer('<p class="target">added</p>');
    await sleep(0);
    assert.deepEqual(seen, [existing, added], 'added node is passed once');

    addToContainer('<span>unrelated</span>');
    await sleep(0);
    assert.strictEqual(seen.length, 2, 'nodes are not passed again');

    unsubscribe();
    addToContainer('<p class="target">after unsubscribe</p>');
    await sleep(0);
    assert.strictEqual(seen.length, 2, 'no calls after unsubscribing');

    const once = [];
    observeSelector(`#${CONTAINER_ID} .target`, (node) => once.push(node), { once: true });
    addToContainer('<p class="target">another</p>');
    await sleep(0);
    assert.strictEqual(once.length, 1, 'once option stops after the first node');

    assert.throws(
        () => observeSelector('##invalid', () => {}),
        /observeSelector expects a valid css selector as its first argument/,
        'invalid selector',
    );
    assert.throws(
        () => observeSelector(1, () => {}),
        /observeSelector expects a valid css selector as its first argument/,
        'non-string selector',
    );
    assert.throws(
        () => observeSelector('p', 'callback'),
        /observeSelector expects a function as its second argument/,
        'non-function callback',
    );
    assert.throws(
        () => observeSelector('p', () => {}, 'options'),
        /observeSelector expects an object as its third argument/,
        'non-object options',
    );
    const unsubscribeNull = observeSelector('#missing-node', () => {}, null);
    assert.strictEqual(typeof unsubscribeNull, 'function', 'null options are accepted');
    unsubscribeNull();
});

test('utils.observeSelector() disconnects the observer when nothing is observed', (assert) => {
    const NativeMutationObserver = window.MutationObserver;
    let created = 0;
    let disconnected = 0;
    window.MutationObserver = class extends NativeMutationObserver {
        constructor(callback) {
            super(callback);
            created += 1;
        }

        disconnect() {
            disconnected += 1;
            super.disconnect();
        }
    };
    try {
        runRedirect();
        const { observeSelector } = window.optimizely.get('utils');
        const first = observeSelector('#missing-first', () => {});
        const second = observeSelector('#missing-second', () => {});
        assert.strictEqual(created, 1, 'one observer for all entries');

        first();
        assert.strictEqual(disconnected, 0, 'observer is kept while an entry is left');
        second();
        assert.strictEqual(disconnected, 1, 'observer is disconnected after the last entry');

        observeSelector('#missing-third', () => {})();
        assert.strictEqual(created, 2, 'a new observer is created for a new entry');
        assert.strictEqual(disconnected, 2, 'and disconnected again');
    } finally {
        window.MutationObserver = NativeMutationObserver;
    }
});

test('utils.waitForElement()', async (assert) => {
    runRedirect();
    const { waitForElement } = window.optimizely.get('utils');

    const existing = addToContainer('<p class="existing">existing</p>');
    assert.strictEqual(await waitForElement(`#${CONTAINER_ID} .existing`), existing, 'existing element');

    const pending = waitForElement(`#${CONTAINER_ID} .later`);
    const later = addToContainer('<p class="later">later</p>');
    assert.strictEqual(await pending, later, 'element added later');

    try {
        await waitForElement('##invalid');
        assert.ok(false, 'should reject');
    } catch (e) {
        assert.ok(/valid css selector/.test(e.message), 'invalid selector rejects');
    }
});

test('utils.waitUntil()', async (assert) => {
    runRedirect();
    const { waitUntil } = window.optimizely.get('utils');

    await waitUntil(() => true);
    assert.ok(true, 'truthy condition resolves');

    let ready = false;
    setTimeout(() => {
        ready = true;
    }, 50);
    await waitUntil(() => ready);
    assert.ok(ready, 'resolves when the condition becomes truthy');

    try {
        await waitUntil('not callable');
        assert.ok(false, 'should reject');
    } catch (e) {
        assert.ok(e instanceof TypeError, 'non-callable condition rejects');
    }
});

test('utils.poll() shares timers per interval and clears them', async (assert) => {
    const nativeSetInterval = window.setInterval;
    const nativeClearInterval = window.clearInterval;
    const created = [];
    const cleared = [];
    window.setInterval = (fn, ms) => {
        const id = nativeSetInterval(fn, ms);
        created.push({ id, ms });
        return id;
    };
    window.clearInterval = (id) => {
        cleared.push(id);
        nativeClearInterval(id);
    };
    try {
        runRedirect();
        const { poll } = window.optimizely.get('utils');
        let firstCalls = 0;
        let secondCalls = 0;
        const callback = () => {
            firstCalls += 1;
        };
        const cancelFirst = poll(callback);
        const cancelSecond = poll(() => {
            secondCalls += 1;
        });
        const cancelSame = poll(callback);
        const cancelOther = poll(() => {}, 30);
        assert.deepEqual(created.map((timer) => timer.ms), [20, 30], 'one timer per interval, default 20 ms');

        await sleep(70);
        assert.ok(secondCalls >= 1, 'callbacks are called');
        assert.strictEqual(firstCalls, secondCalls * 2, 'callback registered twice is called twice per tick');

        cancelFirst();
        cancelFirst();
        cancelSecond();
        assert.deepEqual(cleared, [], 'timer is kept while a callback is left');
        const callsBefore = firstCalls;
        cancelSame();
        assert.deepEqual(cleared, [created[0].id], 'timer is cleared after the last callback');
        cancelOther();
        assert.deepEqual(cleared, [created[0].id, created[1].id], 'other timer is cleared');

        await sleep(50);
        assert.strictEqual(firstCalls, callsBefore, 'no calls after cancelling');
    } finally {
        window.setInterval = nativeSetInterval;
        window.clearInterval = nativeClearInterval;
    }
});

test('utils.onUrlChange()', (assert) => {
    const nativePushState = window.history.pushState;
    const nativeReplaceState = window.history.replaceState;
    runRedirect();
    const { onUrlChange } = window.optimizely.get('utils');
    const urls = [];

    const noop = onUrlChange('not a function');
    assert.strictEqual(typeof noop, 'function', 'non-function handler returns a function');
    assert.strictEqual(window.history.pushState, nativePushState, 'history is not wrapped for it');

    const unsubscribe = onUrlChange((url) => urls.push(url));
    assert.notStrictEqual(window.history.pushState, nativePushState, 'pushState is wrapped');

    window.history.pushState(null, '', '#push');
    window.history.replaceState(null, '', '#replace');
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    assert.strictEqual(urls.length, 4, 'pushState, replaceState, popstate and hashchange notify');
    assert.ok(urls[0].endsWith('#push'), 'URL after pushState is passed');
    assert.ok(urls[1].endsWith('#replace'), 'URL after replaceState is passed');

    unsubscribe();
    assert.strictEqual(window.history.pushState, nativePushState, 'native pushState is restored');
    assert.strictEqual(window.history.replaceState, nativeReplaceState, 'native replaceState is restored');
    window.history.pushState(null, '', '#after');
    window.dispatchEvent(new PopStateEvent('popstate'));
    assert.strictEqual(urls.length, 4, 'no calls after unsubscribing');
});

test('utils.onUrlChange() keeps wrappers installed later by the page', (assert) => {
    runRedirect();
    const { onUrlChange } = window.optimizely.get('utils');
    let firstCalls = 0;
    let secondCalls = 0;

    const unsubscribeFirst = onUrlChange(() => {
        firstCalls += 1;
    });
    const redirectWrapper = window.history.pushState;
    const pageWrapper = function (...args) {
        return redirectWrapper.apply(window.history, args);
    };
    window.history.pushState = pageWrapper;
    window.history.pushState(null, '', '#first');
    assert.strictEqual(firstCalls, 1, 'handler is called through the wrapper of the page');

    unsubscribeFirst();
    assert.strictEqual(window.history.pushState, pageWrapper, 'wrapper of the page is kept');

    // the upstream resource recursed until the call stack was exceeded here
    const unsubscribeSecond = onUrlChange(() => {
        secondCalls += 1;
    });
    window.history.pushState(null, '', '#second');
    assert.ok(window.location.href.endsWith('#second'), 'URL is changed');
    assert.strictEqual(firstCalls, 1, 'unsubscribed handler is not called');
    assert.strictEqual(secondCalls, 1, 'handler is called once, not again by the retired wrapper');

    unsubscribeSecond();
    window.history.pushState(null, '', '#third');
    assert.ok(window.location.href.endsWith('#third'), 'URL is changed after the last unsubscription');
    assert.deepEqual([firstCalls, secondCalls], [1, 1], 'no handler is called after the last unsubscription');
});

test('utils.poll() and utils.onUrlChange() call callbacks without a receiver', async (assert) => {
    runRedirect();
    const { poll, onUrlChange } = window.optimizely.get('utils');
    // `undefined` in strict code, `window` in sloppy code, as for any call without a receiver
    const isNoReceiver = (receiver) => receiver === undefined || receiver === window;

    let pollReceiver = null;
    const cancel = poll(function () {
        pollReceiver = this;
    });
    await sleep(50);
    cancel();
    assert.ok(isNoReceiver(pollReceiver), 'poll() callback');

    let urlReceiver = null;
    const unsubscribe = onUrlChange(function () {
        urlReceiver = this;
    });
    window.history.pushState(null, '', '#receiver');
    unsubscribe();
    assert.ok(isNoReceiver(urlReceiver), 'onUrlChange() handler');
});

test('utils.persistHtml()', (assert) => {
    runRedirect();
    const { persistHtml } = window.optimizely.get('utils');
    addToContainer('<p id="optimizely-anchor">anchor</p>');
    const anchor = document.getElementById('optimizely-anchor');

    const result = persistHtml('<i id="before"></i>', '#optimizely-anchor');
    assert.strictEqual(typeof result, 'function', 'returns a function');
    persistHtml('<i id="after"></i>', '#optimizely-anchor', 'after');
    persistHtml('<i id="first"></i>', '#optimizely-anchor', 'first_child');
    persistHtml('<i id="last"></i>', '#optimizely-anchor', 'last_child');

    assert.strictEqual(anchor.previousElementSibling.id, 'before', 'default placement is before');
    assert.strictEqual(anchor.nextElementSibling.id, 'after', 'after');
    assert.strictEqual(anchor.firstElementChild.id, 'first', 'first_child');
    assert.strictEqual(anchor.lastElementChild.id, 'last', 'last_child');

    assert.throws(() => persistHtml('', '#optimizely-anchor'), /html must be a non-empty string/, 'empty html');
    assert.throws(() => persistHtml('<i></i>', '##invalid'), /invalid CSS selector: ##invalid/, 'invalid selector');
    assert.throws(
        () => persistHtml('<i></i>', '#optimizely-anchor', 'inside'),
        /placement must be one of: before, after, first_child, last_child/,
        'invalid placement',
    );
    assert.throws(
        () => persistHtml('<i></i>', '#missing-node'),
        /no element found for selector "#missing-node"/,
        'no element',
    );
});

test('Project identity from the URL of the snippet', (assert) => {
    const cases = [
        {
            src: 'https://cdn.optimizely.com/js/1234567890.js',
            expected: { accountId: null, projectId: '1234567890', revision: null },
            message: 'snippet',
        },
        {
            src: 'https://cdn.optimizely.com/public/111222/333444/5555_abcdef_edge_helper.js',
            expected: { accountId: '111222', projectId: '333444', revision: '5555' },
            message: 'Performance Edge snippet',
        },
        {
            src: 'https://cdn.optimizely.com/public/111222/333444/abcdef_edge_helper.js',
            expected: { accountId: '111222', projectId: '333444', revision: null },
            message: 'Performance Edge snippet without revision',
        },
        {
            src: 'https://cdn-pci.optimizely.com/public/111222/s/sales_snippet.js',
            expected: { accountId: null, projectId: null, revision: null },
            message: 'custom snippet has no project id in its URL',
        },
        {
            src: 'https://cdn.optimizely.com/js/geo2.js',
            expected: { accountId: null, projectId: null, revision: null },
            message: 'unrelated URL',
        },
        {
            src: 'https://cdn.optimizely.com/js/1234567890.js?v=1#x',
            expected: { accountId: null, projectId: '1234567890', revision: null },
            message: 'snippet with query and hash',
        },
        {
            src: 'https://example.org/loader.js?url=https://cdn.optimizely.com/js/1234567890.js',
            expected: { accountId: null, projectId: null, revision: null },
            message: 'snippet URL in a query parameter',
        },
        {
            src: 'https://example.org/loader.js#https://cdn.optimizely.com/public/111222/333444/5555_x_edge_helper.js',
            expected: { accountId: null, projectId: null, revision: null },
            message: 'Performance Edge URL in the hash',
        },
    ];
    cases.forEach(({ src, expected, message }) => {
        clearGlobalProps('optimizely');
        runRedirectFromScript(src);
        const data = window.optimizely.get('data');
        assert.deepEqual(
            { accountId: data.accountId, projectId: data.projectId, revision: data.revision },
            expected,
            message,
        );
        assert.strictEqual(data.snippetId, expected.projectId, `${message}: snippetId`);
    });

    clearGlobalProps('optimizely');
    Object.defineProperty(document, 'currentScript', {
        configurable: true,
        get: () => {
            throw new Error('page getter');
        },
    });
    try {
        runRedirect();
    } finally {
        delete document.currentScript;
    }
    assert.strictEqual(window.optimizely.get('data').projectId, null, 'throwing currentScript getter');
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
    const localStorageLength = localStorage.length;
    const sessionStorageLength = sessionStorage.length;
    const resourcesBefore = performance.getEntriesByType('resource').length;
    const addedNodes = [];
    const observer = new MutationObserver((records) => {
        const qunit = document.getElementById('qunit');
        records.forEach((mutation) => {
            // ignore updates of the QUnit report
            if (qunit && qunit.contains(mutation.target)) {
                return;
            }
            mutation.addedNodes.forEach((node) => addedNodes.push(node.nodeName));
        });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    try {
        window.optimizely = [
            ['trackEvent', 'purchase'],
            ['setUserId', 'user'],
            ['bucketVisitor', 1, 2],
            { type: 'user', attributes: { plan: 'pro' } },
            { type: 'event', eventName: 'click', tags: { revenue: 1 } },
            { type: 'page', pageName: 'home' },
            { type: 'activate' },
            { type: 'sendEvents' },
            { type: 'rum' },
            { type: 'optOut', isOptOut: true },
        ];
        runRedirect();
        const { get } = window.optimizely;
        ['data', 'state', 'visitor', 'visitor_id', 'utils', 'behavior', 'event_emitter'].forEach((module) => {
            get(module);
        });
        const state = get('state');
        Object.keys(state).forEach((method) => state[method]());
        await sleep(LIFECYCLE_DELAY_MS);

        assert.deepEqual(calls, [], 'no request, cookie, storage or element creation');
        assert.deepEqual(addedNodes, [], 'no nodes are added');
        assert.strictEqual(localStorage.length, localStorageLength, 'localStorage is unchanged');
        assert.strictEqual(sessionStorage.length, sessionStorageLength, 'sessionStorage is unchanged');
        assert.strictEqual(
            performance.getEntriesByType('resource').length,
            resourcesBefore,
            'no resource is loaded',
        );
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

test('Unguarded page code runs and an anti-flicker snippet shows the page', async (assert) => {
    const html = document.documentElement;
    const antiFlicker = () => {
        // Typical anti-flicker snippet: hide the page until the client is initialized, or a timeout.
        html.classList.add('optimizely-hide');
        const show = () => html.classList.remove('optimizely-hide');
        const timeoutId = setTimeout(show, 3000);
        window.optimizely = window.optimizely || [];
        window.optimizely.push({
            type: 'addListener',
            filter: { type: 'lifecycle', name: 'initialized' },
            handler: () => {
                clearTimeout(timeoutId);
                show();
            },
        });
    };
    const pageCode = 'window.optimizelyTestMap = window.optimizely.get("state").getVariationMap();'
        + 'window.optimizelyTestAfter = true;';

    // without the redirect, i.e. the snippet is blocked
    antiFlicker();
    assert.throws(() => evalWrapper(pageCode), TypeError, 'blocked snippet: unguarded page code throws');
    assert.strictEqual(window.optimizelyTestAfter, undefined, 'blocked snippet: next page code does not run');
    await sleep(LIFECYCLE_DELAY_MS);
    assert.ok(html.classList.contains('optimizely-hide'), 'blocked snippet: page is still hidden');

    html.classList.remove('optimizely-hide');
    clearGlobalProps('optimizely');

    // with the redirect
    antiFlicker();
    runRedirect();
    const script = document.createElement('script');
    script.textContent = pageCode;
    document.body.appendChild(script);
    script.remove();
    assert.deepEqual(window.optimizelyTestMap, {}, 'unguarded page code gets an empty variation map');
    assert.strictEqual(window.optimizelyTestAfter, true, 'next page code runs');
    await sleep(LIFECYCLE_DELAY_MS);
    assert.notOk(html.classList.contains('optimizely-hide'), 'page is shown before the anti-flicker timeout');
});
