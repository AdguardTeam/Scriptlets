/* eslint-disable no-underscore-dangle, func-names */
import {
    clearGlobalProps,
    evalWrapper,
    getRedirectsInstance,
    sleep,
} from '../helpers';

const { test, module } = QUnit;
const name = 'vwo';

const HIDING_ID = '_vis_opt_path_hides';

const GLOBALS = [
    'VWO',
    'Wingify',
    '_vwo_code',
    '_vwo_settings_timer',
    '_vwo_library_timer',
    'vwo_libExecuted',
    '_vwo_exp',
    '_vwo_exp_ids',
    '_vis_opt_queue',
    '_vis_opt_goal_conversion',
    '_vis_opt_revenue_conversion',
    '_vis_opt_register_conversion',
    '_vis_opt_createCookie',
    '_vis_opt_element_loaded',
    '_vis_opt_readCookie',
    'vwoTestSmartCodeRan',
];

let redirects;

const before = async () => {
    redirects = await getRedirectsInstance();
};

const afterEach = () => {
    if (typeof window._vwo_settings_timer === 'number') {
        clearTimeout(window._vwo_settings_timer);
    }
    clearGlobalProps(...GLOBALS);
    const hiding = document.getElementById(HIDING_ID);
    if (hiding) {
        hiding.remove();
    }
};

module(name, { before, afterEach });

const runRedirect = () => {
    evalWrapper(redirects.getRedirect(name).content);
};

/**
 * Runs a reduced asynchronous SmartCode: it hides the page, and shows it again
 * by `finish()` or after the settings timeout.
 *
 * @param {number} timeout settings timeout in ms
 * @returns {object[]} calls of `finish()`, and `receivers` with `this` of each call
 */
const runSmartCode = (timeout) => {
    const calls = [];
    calls.receivers = [];
    const style = document.createElement('style');
    style.id = HIDING_ID;
    style.textContent = 'body{opacity:0 !important}';
    document.head.appendChild(style);
    let finished = false;
    window._vwo_code = {
        finish(...args) {
            calls.push(args);
            calls.receivers.push(this);
            if (!finished) {
                finished = true;
                style.remove();
            }
        },
        finished: () => finished,
    };
    window._vwo_settings_timer = setTimeout(() => {
        calls.push('timeout');
        window._vwo_code.finish();
    }, timeout);
    return calls;
};

test('Installs the library globals', (assert) => {
    runRedirect();

    assert.strictEqual(window.vwo_libExecuted, true, 'vwo_libExecuted');
    ['VWO', 'Wingify'].forEach((queueName) => {
        const queue = window[queueName];
        assert.ok(Array.isArray(queue), `${queueName} is an array`);
        assert.strictEqual(typeof queue.push, 'function', `${queueName}.push`);
        assert.strictEqual(typeof queue.event, 'function', `${queueName}.event`);
        assert.strictEqual(typeof queue.visitor, 'function', `${queueName}.visitor`);
    });
    assert.deepEqual(window._vwo_exp, {}, '_vwo_exp');
    assert.deepEqual(window._vwo_exp_ids, [], '_vwo_exp_ids');
    assert.ok(Array.isArray(window._vis_opt_queue), '_vis_opt_queue');
    assert.strictEqual(window._vis_opt_readCookie('_vis_opt_exp_1_combi'), null, '_vis_opt_readCookie');
    [
        '_vis_opt_goal_conversion',
        '_vis_opt_revenue_conversion',
        '_vis_opt_register_conversion',
        '_vis_opt_createCookie',
        '_vis_opt_element_loaded',
    ].forEach((fn) => {
        assert.strictEqual(window[fn](1), undefined, fn);
    });

    const code = window._vwo_code;
    assert.strictEqual(code.libExecuted, true, '_vwo_code is defined if there is none');
    assert.strictEqual(code.finished(), true, '_vwo_code.finished()');
    assert.strictEqual(code.hide_element(), '', '_vwo_code.hide_element()');
    assert.strictEqual(code.hideEl(), '', '_vwo_code.hideEl()');
    assert.strictEqual(code.init(), undefined, '_vwo_code.init()');
});

test('Keeps the real library and is not applied again', (assert) => {
    window.vwo_libExecuted = true;
    runRedirect();
    assert.strictEqual(window.VWO, undefined, 'nothing is installed after the library');

    clearGlobalProps(...GLOBALS);
    const code = { libExecuted: true, finish: () => assert.ok(false, 'finish() is not called') };
    window._vwo_code = code;
    runRedirect();
    assert.strictEqual(window._vwo_code, code, 'library code is kept');
    assert.strictEqual(window.VWO, undefined, 'nothing is installed');

    clearGlobalProps(...GLOBALS);
    runRedirect();
    const first = window.VWO;
    runRedirect();
    assert.strictEqual(window.VWO, first, 'repeated loading keeps the first queue');
});

test('Shows the page hidden by the SmartCode at once', async (assert) => {
    const calls = runSmartCode(100);
    assert.ok(document.getElementById(HIDING_ID), 'SmartCode hides the page');

    runRedirect();
    assert.notOk(document.getElementById(HIDING_ID), 'page is shown at once');
    assert.deepEqual(calls, [[]], 'finish() is called once without arguments');
    assert.strictEqual(calls.receivers[0], window._vwo_code, 'finish() is called as a method of _vwo_code');
    assert.strictEqual(window._vwo_code.libExecuted, true, 'libExecuted stops the SmartCode from hiding it again');

    await sleep(150);
    assert.deepEqual(calls, [[]], 'settings timeout is cleared');
});

test('Errors of finish() are not thrown', (assert) => {
    window._vwo_code = {
        finish: () => {
            throw new Error('page error');
        },
    };
    runRedirect();
    assert.strictEqual(window.vwo_libExecuted, true, 'library globals are installed');
});

test('Removes a remaining hiding element', (assert) => {
    const overlay = document.createElement('div');
    overlay.id = HIDING_ID;
    document.body.appendChild(overlay);
    runRedirect();
    assert.notOk(document.getElementById(HIDING_ID), 'hiding element is removed');
});

test('Asynchronous SmartCode which runs later is skipped', (assert) => {
    runRedirect();
    // as the SmartCode: window._vwo_code || function () { ... }();
    evalWrapper('window._vwo_code || (function () { window.vwoTestSmartCodeRan = true; })();');
    assert.strictEqual(window.vwoTestSmartCodeRan, undefined, 'SmartCode does not run, so it does not hide the page');
});

test('Runs the queued commands of VWO and Wingify', (assert) => {
    const calls = [];
    const vwoQueue = [
        ['onLibLoaded', (data) => calls.push(['VWO onLibLoaded', data])],
        ['onCampaignsLoaded', (data) => calls.push(['VWO onCampaignsLoaded', data])],
        ['onVariationApplied', () => calls.push('never')],
        ['onEventReceive', 'vA', () => calls.push('never')],
        ['activate', { virtualPageUrl: '/page' }],
        ['onLibLoaded', () => {
            throw new Error('page callback');
        }],
        ['onLibLoaded'],
        'not a command',
        null,
    ];
    window.VWO = vwoQueue;
    window.Wingify = [['onLibLoaded', (data) => calls.push(['Wingify onLibLoaded', data])]];
    runRedirect();

    // as the library: the callbacks of the library being loaded first, then the ones of the campaigns
    assert.deepEqual(calls, [
        ['VWO onLibLoaded', [{}, []]],
        ['Wingify onLibLoaded', [{}, []]],
        ['VWO onCampaignsLoaded', { bucketed_campaigns: [] }],
    ], 'library callbacks are called without campaigns, other commands do nothing');
    assert.strictEqual(window.VWO, vwoQueue, 'VWO array is kept');
    assert.strictEqual(vwoQueue.length, 0, 'VWO queue is emptied');
});

test('Legacy callback names are called as the new ones', (assert) => {
    const calls = [];
    window.VWO = [
        ['onVWOCampaignsLoaded', (data) => calls.push(['onVWOCampaignsLoaded', data])],
        ['onVWOLoaded', (data) => calls.push(['onVWOLoaded', data])],
    ];
    runRedirect();
    assert.deepEqual(calls, [
        ['onVWOLoaded', [{}, []]],
        ['onVWOCampaignsLoaded', { bucketed_campaigns: [] }],
    ], 'queued legacy callbacks, library one first');

    calls.length = 0;
    window.VWO.push(['onVWOLoaded', (data) => calls.push(data)], ['onVWOCampaignsLoaded', (data) => calls.push(data)]);
    assert.deepEqual(calls, [[{}, []], { bucketed_campaigns: [] }], 'legacy callbacks pushed later');
});

test('Queued callbacks can use all globals of the library', (assert) => {
    const seen = [];
    window.VWO = [['onLibLoaded', () => {
        window._vis_opt_queue.push(() => seen.push('legacy queue'));
        window.Wingify.push(['onLibLoaded', () => seen.push('Wingify')]);
        seen.push(typeof window._vwo_exp, Array.isArray(window._vwo_exp_ids), typeof window._vis_opt_readCookie);
    }]];
    runRedirect();
    assert.deepEqual(
        seen,
        ['legacy queue', 'Wingify', 'object', true, 'function'],
        'queues and globals are installed before queued callbacks run',
    );
});

test('Commands pushed later run at once', (assert) => {
    const pageEvent = () => {};
    window.VWO = [];
    window.VWO.event = pageEvent;
    window.Wingify = { push: 'not a queue' };
    runRedirect();

    const calls = [];
    const result = window.VWO.push(
        ['onLibLoaded', (data) => calls.push(data)],
        ['onCampaignsLoaded', (data) => calls.push(data)],
    );
    assert.deepEqual(calls, [[{}, []], { bucketed_campaigns: [] }], 'callbacks are called at once');
    assert.strictEqual(typeof result, 'number', 'push() returns a number, as the library');
    assert.strictEqual(window.VWO.length, 0, 'commands are not stored');
    assert.strictEqual(window.VWO.event, pageEvent, 'event() of the page is kept');

    assert.ok(Array.isArray(window.Wingify), 'non-array Wingify is replaced by an array');
    window.Wingify.push(['onLibLoaded', (data) => calls.push(data)]);
    assert.strictEqual(calls.length, 3, 'Wingify commands run at once');
    assert.strictEqual(window.Wingify.event('name', {}), undefined, 'Wingify.event()');
    assert.strictEqual(window.Wingify.visitor({}), undefined, 'Wingify.visitor()');
});

test('Direct APIs of the library', async (assert) => {
    const calls = [];
    window.Wingify = [
        // documented example, queued before the library
        ['onCampaignsLoaded', () => {
            calls.push(window.Wingify.visitorConfig.destroySession());
        }, { count: 1 }],
    ];
    runRedirect();
    assert.strictEqual(calls.length, 1, 'queued callback can call destroySession()');
    assert.ok(calls[0] instanceof Promise, 'destroySession() returns a promise');
    assert.strictEqual(await calls[0], undefined, 'promise is resolved with undefined');

    window.Wingify.push(['onCampaignsLoaded', () => {
        calls.push(window.Wingify.visitorConfig.destroySession());
    }, { count: 1 }]);
    assert.strictEqual(calls.length, 2, 'pushed callback can call destroySession()');
    assert.strictEqual(await calls[1], undefined, 'pushed: promise is resolved with undefined');

    ['VWO', 'Wingify'].forEach((queueName) => {
        const queue = window[queueName];
        // documented usage for links to other domains
        const info = queue.getCrossDomainInfo();
        assert.deepEqual(info, { q: 'vwo_q', d: '' }, `${queueName}.getCrossDomainInfo() without a visitor id`);
        assert.strictEqual(`?${info.q}=${info.d}`, '?vwo_q=', `${queueName}: link query as without the module`);
        assert.notStrictEqual(queue.getCrossDomainInfo(), info, `${queueName}: a new object on each call`);
        assert.deepEqual(queue.visitorConfig.getInfo(), { loc: {} }, `${queueName}.visitorConfig.getInfo()`);
        assert.strictEqual(queue.getInfo, undefined, `${queueName}: getInfo() is a method of visitorConfig only`);
    });
});

test('Direct APIs keep the ones of the page and its storage key prefix', (assert) => {
    const pageInfo = () => 'page';
    const pageGetInfo = () => 'page';
    const pageConfig = { getInfo: pageGetInfo };
    window.VWO = [];
    window.VWO._ = { sKP: 'wingify' };
    window.VWO.visitorConfig = pageConfig;
    window.Wingify = [];
    window.Wingify.getCrossDomainInfo = pageInfo;
    runRedirect();

    assert.deepEqual(window.VWO.getCrossDomainInfo(), { q: 'wingify_q', d: '' }, 'prefix set by the SmartCode');
    assert.strictEqual(window.Wingify.getCrossDomainInfo, pageInfo, 'getCrossDomainInfo() of the page is kept');
    assert.strictEqual(window.VWO.visitorConfig, pageConfig, 'visitorConfig of the page is completed in place');
    assert.strictEqual(pageConfig.getInfo, pageGetInfo, 'getInfo() of the page is kept');
    assert.strictEqual(typeof pageConfig.destroySession, 'function', 'missing destroySession() is added');
});

test('Runs functions of the legacy queue', (assert) => {
    const calls = [];
    const pageReadCookie = () => 'page';
    window._vis_opt_readCookie = pageReadCookie;
    window._vis_opt_queue = [
        () => {
            calls.push('queued');
            window._vis_opt_revenue_conversion(10);
        },
        () => {
            throw new Error('page function');
        },
        'not a function',
    ];
    runRedirect();
    assert.deepEqual(calls, ['queued'], 'queued functions run');
    assert.strictEqual(window._vis_opt_queue.length, 0, 'queue is emptied');

    window._vis_opt_queue.push(() => calls.push('pushed'));
    assert.deepEqual(calls, ['queued', 'pushed'], 'pushed functions run at once');
    assert.strictEqual(window._vis_opt_readCookie, pageReadCookie, 'globals of the page are kept');
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
        window.VWO = [['activate', {}], ['event', 'purchase', { revenue: 1 }], ['visitor', { plan: 'pro' }]];
        window._vis_opt_queue = [() => {
            window._vis_opt_goal_conversion(1);
            window._vis_opt_createCookie('name', 'value', 1);
        }];
        runRedirect();
        window.Wingify.event('click', {});
        window.VWO.push(['setVisitorId', 'id']);
        window.VWO.getCrossDomainInfo();
        window.Wingify.visitorConfig.getInfo();
        await window.Wingify.visitorConfig.destroySession();
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
