/* eslint-disable no-underscore-dangle */
import { clearGlobalProps, evalWrapper, getRedirectsInstance } from '../helpers';

const { test, module } = QUnit;
const name = 'piano-analytics';

let redirects;

const before = async () => {
    redirects = await getRedirectsInstance();
};

const afterEach = () => {
    clearGlobalProps('pa', 'pianoAnalytics', '_paq', '_pac', 'customPA', 'customQueue');
};

module(name, { before, afterEach });

const runRedirect = () => {
    evalWrapper(redirects.getRedirect(name).content);
};

test('Installs the API, which the page uses without a check', (assert) => {
    runRedirect();
    const { pa } = window;
    // as the SDK, `pianoAnalytics` is its module
    assert.strictEqual(window.pianoAnalytics.pianoAnalytics, pa, 'pianoAnalytics of the module is pa');
    assert.strictEqual(window.pianoAnalytics.sendEvent, undefined, 'module is not pa');

    // as pages, e.g. campusfrance.org, toureiffel.paris and hikvision.com
    pa.setConfigurations({ site: 631934, collectDomain: 'https://log.xiti.com' });
    assert.strictEqual(pa.getConfiguration('site'), 631934, 'configuration is kept');
    pa.setConfiguration('privacyDefaultMode', 'exempt');
    assert.strictEqual(pa.getConfiguration('privacyDefaultMode'), 'exempt', 'setConfiguration()');
    assert.strictEqual(pa.getConfiguration('queueVarName'), '_paq', 'default queue name');
    // as the SDK: `null` for an unknown name, and empty values are ignored
    assert.strictEqual(pa.getConfiguration('unknown'), null, 'unknown configuration');
    assert.strictEqual(pa.getConfiguration(1), null, 'name which is not a string');
    pa.setConfiguration('site', '');
    pa.setConfiguration('site', null);
    pa.setConfigurations({ site: undefined, path: 'event' });
    assert.strictEqual(pa.getConfiguration('site'), 631934, 'empty values are ignored');
    assert.strictEqual(pa.getConfiguration('path'), 'event', 'other values are set');
    pa.setConfiguration('site', 0);
    assert.strictEqual(pa.getConfiguration('site'), 0, 'zero is not empty');
    [
        ['setProperties', { page_type: 'catalog' }, { persistent: true }],
        ['setProperty', 'page_chapter1', 'a'],
        ['deleteProperty', 'page_chapter1'],
        ['sendEvent', 'page.display', { page: 'home' }],
        ['sendEvents', [{ name: 'click.action', data: { click: 'a' } }]],
        ['setContentProperty', 'content_id', '1'],
        ['setContentProperties', { content_id: '1' }],
        ['setUser', 'user', 'premium'],
        ['refresh'],
    ].forEach((call) => {
        const method = call[0];
        assert.strictEqual(pa[method](...call.slice(1)), undefined, `${method}()`);
    });

    // visitor and user
    assert.strictEqual(pa.getVisitorId(), null, 'no visitor id');
    pa.setVisitorId('visitor');
    const ids = [];
    assert.strictEqual(pa.getVisitorId((id) => ids.push(id)), undefined, 'nothing is returned with a callback');
    assert.strictEqual(pa.getVisitorId(), 'visitor', 'visitor id set by the page');
    assert.deepEqual(ids, ['visitor'], 'callback is called with the visitor id');
    const users = [];
    pa.getUser((user) => users.push(user));
    pa.deleteUser(() => users.push('deleted'));
    pa.getUser(() => {
        throw new Error('error of the page');
    });
    assert.deepEqual(users, [null, 'deleted'], 'user callbacks are called');

    // privacy modes, e.g. `privacy.include.event()` of integrations
    assert.strictEqual(pa.privacy.getMode(), 'optin', 'default privacy mode');
    pa.privacy.setMode('exempt');
    assert.strictEqual(pa.privacy.getMode(), 'exempt', 'privacy mode set by the page');
    ['properties', 'property', 'storageKeys', 'storageKey', 'events', 'event'].forEach((method) => {
        pa.privacy.include[method]('a', ['exempt']);
        pa.privacy.exclude[method]('a', ['exempt']);
    });
    pa.privacy.createMode('custom', true);
    assert.true(pa.privacy.isEventAllowed('page.display'), 'events are allowed');
    assert.deepEqual(pa.privacy.getModeMetadata(), {}, 'no mode metadata');

    // consent modes, e.g. of the CMP adapter of futura-sciences.com
    assert.strictEqual(pa.consent.getMode(), 'opt-in', 'default consent mode');
    pa.consent.setMode('essential');
    assert.strictEqual(pa.consent.getMode(), 'essential', 'consent mode set by the page');
    pa.consent.setAllPurposes('opt-in');
    pa.consent.setByPurpose('AM', 'opt-out');
    assert.deepEqual(pa.consent.getByPurpose(), {}, 'no purposes');
    assert.false(pa.consent.isPAConsentDisabled(), 'consent is not disabled');
    const stored = [];
    pa.consent.setItem('key', 'value', new Date(), () => stored.push('consent'));
    pa.privacy.setItem('key', 'value', new Date(), () => stored.push('privacy'));
    assert.deepEqual(stored, ['consent', 'privacy'], 'setItem() calls its callback without storing');

    // AV Insights
    const media = new pa.avInsights.Media(5, 5, 'session');
    assert.true(media instanceof pa.avInsights.Media, 'media object');
    ['play', 'playbackStart', 'playbackPaused', 'heartbeat', 'set', 'setProps', 'seek', 'close'].forEach((method) => {
        assert.strictEqual(media[method]({ av_content: 'a' }), undefined, `media.${method}()`);
    });
    assert.deepEqual(media.getProps(), {}, 'no media properties');
    assert.strictEqual(media.getSessionID(), '', 'no media session');
});

test('Runs the commands of the queue, and the ones pushed later', (assert) => {
    const ids = [];
    window._paq = [
        ['setConfigurations', { site: 1 }],
        ['consent.setMode', 'essential'],
        ['getVisitorId', (id) => ids.push(id)],
        ['sendEvent', 'page.display', { page: 'home' }],
        'invalid',
        ['noSuchMethod'],
        ['consent.noSuchMethod'],
        ['noSuchObject.setMode', 'a'],
        ['hasOwnProperty', 'a'],
        ['setProperties', null],
    ];
    const queue = window._paq;
    runRedirect();
    const { pa } = window;
    assert.strictEqual(pa.getConfiguration('site'), 1, 'queued configuration');
    assert.strictEqual(pa.consent.getMode(), 'essential', 'queued command of consent');
    assert.deepEqual(ids, [null], 'queued callback is called');
    assert.strictEqual(window._paq, queue, 'queue of the page is kept');

    const length = window._paq.push(['privacy.setMode', 'exempt'], ['setConfiguration', 'site', 2]);
    assert.strictEqual(pa.privacy.getMode(), 'exempt', 'pushed command is run at once');
    assert.strictEqual(pa.getConfiguration('site'), 2, 'pushed configuration');
    assert.strictEqual(length, window._paq.length, 'push() returns the length');
    assert.strictEqual(window._paq.length, 12, 'commands are kept in the queue, as by the SDK');
});

test('Runs the commands which the queued ones push, as the SDK', (assert) => {
    const calls = [];
    window._paq = [
        ['getVisitorId', () => {
            calls.push('queued');
            // e.g. a command of the page which sends an event once the visitor id is known
            window._paq.push(['getVisitorId', () => {
                calls.push('pushed by the queued one');
                window._paq.push(['getUser', () => calls.push('pushed by the pushed one')]);
            }]);
        }],
        ['getVisitorId', () => calls.push('queued after it')],
    ];
    runRedirect();
    assert.deepEqual(calls, [
        'queued',
        'queued after it',
        'pushed by the queued one',
        'pushed by the pushed one',
    ], 'commands pushed while the queue is run are run after the queued ones');
    window._paq.push(['getVisitorId', () => calls.push('pushed later')]);
    assert.strictEqual(calls[calls.length - 1], 'pushed later', 'command pushed later is run at once');
    assert.strictEqual(calls.length, 5, 'each command is run once');
});

test('Applies the configuration of the page, also the names of the global and of the queue', (assert) => {
    // e.g. to avoid a conflict with `_paq` of Matomo
    const matomoQueue = [['trackPageView']];
    window._paq = matomoQueue;
    window._pac = {
        globalVarName: 'customPA',
        queueVarName: 'customQueue',
        site: 5,
        privacy: { modes: {} },
    };
    const ids = [];
    window.customQueue = [['getVisitorId', (id) => ids.push(id)]];
    runRedirect();
    const pa = window.customPA;
    assert.strictEqual(typeof pa, 'object', 'global of the configured name');
    assert.strictEqual(window.pa, undefined, 'no global of the default name');
    assert.strictEqual(window.pianoAnalytics.pianoAnalytics, pa, 'pianoAnalytics of the module');
    assert.strictEqual(pa.getConfiguration('site'), 5, 'configuration of _pac');
    assert.strictEqual(pa.getConfiguration('privacy'), null, 'privacy of _pac is not a configuration');
    assert.deepEqual(ids, [null], 'commands of the configured queue are run');
    window.customQueue.push(['consent.setMode', 'essential']);
    assert.strictEqual(pa.consent.getMode(), 'essential', 'commands pushed to the configured queue are run');
    assert.strictEqual(window._paq, matomoQueue, 'other queue is not changed');
    assert.strictEqual(window._paq.push, Array.prototype.push, 'other queue is not taken over');
});

test('Applies the configuration of the data-config attribute of the script', (assert) => {
    const script = document.createElement('script');
    script.dataset.config = JSON.stringify({ globalVarName: 'customPA', collectDomain: 'https://log.xiti.com' });
    // as the redirect resource loaded by the script of the page
    script.textContent = redirects.getRedirect(name).content;
    document.body.appendChild(script);
    script.remove();
    assert.strictEqual(typeof window.customPA, 'object', 'global of the configured name');
    assert.strictEqual(window.customPA.getConfiguration('collectDomain'), 'https://log.xiti.com', 'configuration');

    clearGlobalProps('customPA', 'pianoAnalytics');
    const invalid = document.createElement('script');
    invalid.dataset.config = '{invalid';
    invalid.textContent = redirects.getRedirect(name).content;
    document.body.appendChild(invalid);
    invalid.remove();
    assert.strictEqual(typeof window.pa, 'object', 'invalid configuration is ignored');
});

test('A later run with other names of the global and the queue installs them, but runs each queue once', (assert) => {
    const calls = [];
    window._paq = [['getVisitorId', () => calls.push('default queue')]];
    // e.g. the scriptlet at document start, before the configuration of the page
    runRedirect();
    const first = window.pa;

    // the script of the page, redirected, with other names in its configuration
    window.customQueue = [['getVisitorId', () => calls.push('custom queue')]];
    const script = document.createElement('script');
    script.dataset.config = JSON.stringify({ globalVarName: 'customPA', queueVarName: 'customQueue', site: 7 });
    script.textContent = redirects.getRedirect(name).content;
    document.body.appendChild(script);
    script.remove();
    const custom = window.customPA;
    assert.strictEqual(typeof custom.sendEvent, 'function', 'global of the other name is installed');
    assert.notStrictEqual(custom, first, 'as another object, as by the SDK');
    assert.strictEqual(custom.getConfiguration('site'), 7, 'with its configuration');
    assert.strictEqual(window.pianoAnalytics.pianoAnalytics, custom, 'module has the last object, as by the SDK');
    assert.strictEqual(window.pa, first, 'first global is kept');
    // as by the SDK, each queue has its own object, so their states are independent
    window._paq.push(['setConfiguration', 'site', 30]);
    assert.strictEqual(first.getConfiguration('site'), 30, 'value set by the first queue');
    assert.strictEqual(custom.getConfiguration('site'), 7, 'is not set for the object of the other queue');
    assert.deepEqual(calls, ['default queue', 'custom queue'], 'each queue is run once');
    window.customQueue.push(['getVisitorId', () => calls.push('pushed to the custom queue')]);
    window._paq.push(['getVisitorId', () => calls.push('pushed to the default queue')]);
    assert.deepEqual(calls.slice(2), [
        'pushed to the custom queue',
        'pushed to the default queue',
    ], 'commands pushed later are run once');
});

test('A later run with another name of the global uses the same object for the queue', (assert) => {
    const calls = [];
    window._paq = [['getVisitorId', () => calls.push('queued')]];
    runRedirect();
    const { push } = window._paq;
    window._pac = { globalVarName: 'otherPA' };
    runRedirect();
    assert.strictEqual(typeof window.otherPA.sendEvent, 'function', 'global of the other name is installed');
    assert.strictEqual(window._paq.push, push, 'push() is not wrapped again');
    window._paq.push(['getVisitorId', () => calls.push('pushed')]);
    assert.deepEqual(calls, ['queued', 'pushed'], 'commands are run once');
    // e.g. a setting of the page, which the object of the other global has as well, as by the SDK
    window._paq.push(['setConfiguration', 'testSetting', 'fromQueue']);
    assert.strictEqual(window.otherPA.getConfiguration('testSetting'), 'fromQueue', 'other global');
    assert.strictEqual(window.pa.getConfiguration('testSetting'), 'fromQueue', 'first global');
    assert.strictEqual(window.otherPA, window.pa, 'object which has taken the queue');
    clearGlobalProps('otherPA');
});

test('A later run keeps the values which the object of the queue already has', (assert) => {
    window._pac = { site: 10 };
    window._paq = [['setConfiguration', 'site', 20]];
    runRedirect();
    assert.strictEqual(window.pa.getConfiguration('site'), 20, 'value set by a queued command');
    // the same configuration again, with a value which is not set yet
    window._pac = { site: 10, collectDomain: 'https://log.xiti.com' };
    runRedirect();
    assert.strictEqual(window.pa.getConfiguration('site'), 20, 'value is not reset to the one of the page');
    assert.strictEqual(window.pa.getConfiguration('collectDomain'), 'https://log.xiti.com', 'new value is set');
});

test('An object and a push() of the page are neither used nor replaced', (assert) => {
    // e.g. `pa` defined by rules with set-constant, and a queue with a `push()` of the page
    let sent = 0;
    const own = {
        sendEvent: () => {
            sent += 1;
        },
    };
    window.pa = own;
    const calls = [];
    window._paq = [
        ['sendEvent', 'page.display', {}],
        ['getVisitorId', () => calls.push('queued')],
    ];
    let pagePushes = 0;
    window._paq.push = function push(...commands) {
        pagePushes += 1;
        return Array.prototype.push.apply(this, commands);
    };
    runRedirect();
    assert.strictEqual(window.pa, own, 'object of the page is kept');
    assert.strictEqual(sent, 0, 'sendEvent() of the page is not called');
    const mock = window.pianoAnalytics.pianoAnalytics;
    assert.notStrictEqual(mock, own, 'module has the object of the mock');
    assert.strictEqual(typeof mock.getVisitorId, 'function', 'with the methods of the SDK');
    assert.deepEqual(calls, ['queued'], 'queued command is run by the mock');

    const length = window._paq.push(['getVisitorId', () => calls.push('pushed')]);
    assert.deepEqual(calls, ['queued', 'pushed'], 'pushed command is run by the mock');
    assert.strictEqual(pagePushes, 1, 'push() of the page is called');
    assert.strictEqual(length, 3, 'with its result');
    assert.strictEqual(window._paq.length, 3, 'command is kept in the queue');

    // another run: the queue is known by the object of the mock, not by its own push()
    runRedirect();
    window._paq.push(['sendEvent', 'click.action', {}]);
    assert.deepEqual(calls, ['queued', 'pushed'], 'commands are not run again');
    assert.strictEqual(sent, 0, 'sendEvent() of the page is still not called');
    assert.strictEqual(window.pianoAnalytics.pianoAnalytics, mock, 'module is kept');
});

test('Takes a queue whose push() of the page is not configurable, or which is frozen', (assert) => {
    const calls = [];
    window._paq = [['getVisitorId', () => calls.push('queued')]];
    let pagePushes = 0;
    Object.defineProperty(window._paq, 'push', {
        writable: true,
        configurable: false,
        enumerable: false,
        value(...commands) {
            pagePushes += 1;
            return Array.prototype.push.apply(this, commands);
        },
    });
    runRedirect();
    assert.strictEqual(typeof window.pa.sendEvent, 'function', 'global is installed');
    window._paq.push(['getVisitorId', () => calls.push('pushed')]);
    assert.deepEqual(calls, ['queued', 'pushed'], 'queued and pushed commands are run');
    assert.strictEqual(pagePushes, 1, 'push() of the page is called');
    const descriptor = Object.getOwnPropertyDescriptor(window._paq, 'push');
    assert.deepEqual(
        [descriptor.writable, descriptor.configurable, descriptor.enumerable],
        [true, false, false],
        'attributes of the property of the page are kept',
    );

    // push() which cannot be replaced: the commands of the queue are run anyway
    clearGlobalProps('pa', 'pianoAnalytics', '_paq');
    window._paq = Object.freeze([['getVisitorId', () => calls.push('queued in a frozen queue')]]);
    runRedirect();
    assert.strictEqual(typeof window.pa.sendEvent, 'function', 'global is installed for a frozen queue');
    assert.strictEqual(typeof window.pianoAnalytics.pianoAnalytics.sendEvent, 'function', 'and the module');
    assert.strictEqual(calls[calls.length - 1], 'queued in a frozen queue', 'its commands are run');

    // a queue whose push() cannot be read
    clearGlobalProps('pa', 'pianoAnalytics', '_paq');
    window._paq = [['getVisitorId', () => calls.push('queued before a push() which throws')]];
    Object.defineProperty(window._paq, 'push', {
        configurable: true,
        get() {
            throw new Error('error of the page');
        },
    });
    runRedirect();
    assert.strictEqual(typeof window.pa.sendEvent, 'function', 'global is installed if push() cannot be read');
    assert.strictEqual(calls[calls.length - 1], 'queued before a push() which throws', 'its commands are run');
});

test('A later run runs the commands added to a taken queue by a push() of the page, once', (assert) => {
    const calls = [];
    window._paq = [['getVisitorId', () => calls.push('queued')]];
    runRedirect();
    // the page replaces push() of the same queue, so the commands are only added
    window._paq.push = function push(command) {
        return Array.prototype.push.call(this, command);
    };
    window._paq.push(['getVisitorId', () => {
        calls.push('pending');
        window._paq.push(['getVisitorId', () => calls.push('pushed by the pending one')]);
    }]);
    assert.deepEqual(calls, ['queued'], 'not run by push() of the page');

    window._pac = { globalVarName: 'otherPA' };
    runRedirect();
    assert.deepEqual(calls, ['queued', 'pending', 'pushed by the pending one'], 'pending commands are run, once');
    window._paq.push(['getVisitorId', () => calls.push('pushed')]);
    assert.strictEqual(calls[3], 'pushed', 'push() runs the commands again');
    assert.strictEqual(window._paq.length, 4, 'commands are kept in the queue');
    assert.strictEqual(window.otherPA, window.pa, 'by the object which has taken the queue');

    // push() which the page has wrapped still runs the commands: they are not run twice after another run
    const inner = window._paq.push;
    let wrapperCalls = 0;
    window._paq.push = function push(...commands) {
        wrapperCalls += 1;
        return inner.apply(this, commands);
    };
    window._pac = { globalVarName: 'thirdPA' };
    runRedirect();
    const command = ['getVisitorId', () => calls.push('pushed to the wrapped one')];
    window._paq.push(command);
    assert.deepEqual(calls.slice(4), ['pushed to the wrapped one'], 'command is run once');
    assert.strictEqual(wrapperCalls, 1, 'wrapper of the page is called');
    // as by the SDK, the same command pushed again is run again
    window._paq.push(command);
    assert.strictEqual(calls.length, 6, 'command pushed again is run again');
    clearGlobalProps('otherPA', 'thirdPA');
});

test('Runs each item of the queue, also the same command more than once, as the SDK', (assert) => {
    const calls = [];
    const first = ['setConfiguration', 'site', 1];
    const callback = ['getVisitorId', () => calls.push('callback')];
    window._paq = [first, ['setConfiguration', 'site', 2], first, callback, callback];
    runRedirect();
    assert.strictEqual(window.pa.getConfiguration('site'), 1, 'last command is the first one again');
    assert.deepEqual(calls, ['callback', 'callback'], 'command queued twice is run twice');
    window._paq.push(callback);
    assert.strictEqual(calls.length, 3, 'command pushed again is run again');
});

test('A command is run once if a wrapper of the page passes a copy of it, or passes it later', async (assert) => {
    const calls = [];
    window._paq = [];
    runRedirect();
    // the page wraps push() of the mock, and passes a copy of the command
    const inner = window._paq.push;
    window._paq.push = function push(command) {
        return inner.call(this, command.slice());
    };
    window._pac = { globalVarName: 'otherPA' };
    runRedirect();
    window._paq.push(['getVisitorId', () => calls.push('copied')]);
    assert.deepEqual(calls, ['copied'], 'command passed as a copy is run once');
    assert.strictEqual(window._paq.length, 1, 'copy is added to the queue');

    // the page passes the command later, e.g. in a microtask
    clearGlobalProps('pa', 'pianoAnalytics', '_paq', '_pac', 'otherPA');
    window._paq = [];
    runRedirect();
    const later = window._paq.push;
    window._paq.push = function push(command) {
        Promise.resolve().then(() => later.call(this, command));
        return this.length;
    };
    window._pac = { globalVarName: 'otherPA' };
    runRedirect();
    window._paq.push(['getVisitorId', () => calls.push('passed later')]);
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(window._paq.length, 1, 'command is added to the queue later');
    window._paq.push(['getVisitorId', () => calls.push('next')]);
    await Promise.resolve();
    await Promise.resolve();
    // another run finds the commands which are already run in the queue
    window._pac = { globalVarName: 'thirdPA' };
    runRedirect();
    assert.deepEqual(calls.slice(1), ['passed later', 'next'], 'each command is run once');
    clearGlobalProps('otherPA', 'thirdPA');
});

test('Commands added without push() are run by another run, in the order of the queue, once', (assert) => {
    const calls = [];
    window._paq = [];
    runRedirect();
    // e.g. the page adds commands to the queue with the native method
    Array.prototype.push.call(window._paq, ['getVisitorId', () => {
        calls.push('added 1');
        // push() of the mock runs a command at once, also while the items of the queue are run
        window._paq.push(['getVisitorId', () => calls.push('pushed by added 1')]);
    }]);
    Array.prototype.push.call(window._paq, ['getVisitorId', () => calls.push('added 2')]);
    window._paq.push(['getVisitorId', () => {
        calls.push('pushed');
        Array.prototype.push.call(window._paq, ['getVisitorId', () => calls.push('added by pushed')]);
    }]);
    window._paq.push(['getVisitorId', () => calls.push('next')]);
    // as by the SDK, push() runs only the pushed commands
    assert.deepEqual(calls, ['pushed', 'next'], 'commands added without push() are not run by push()');

    window._pac = { globalVarName: 'otherPA' };
    runRedirect();
    assert.deepEqual(calls.slice(2), [
        'added 1',
        'pushed by added 1',
        'added 2',
        'added by pushed',
    ], 'they are run by another run, in the order of the queue, and the pushed ones are not run again');
    runRedirect();
    assert.strictEqual(calls.length, 6, 'they are run once');

    // the same command added again without push(), after it has been pushed, is run by another run
    const command = ['getVisitorId', () => calls.push('pushed, then added again')];
    window._paq.push(command);
    Array.prototype.push.call(window._paq, command);
    runRedirect();
    assert.deepEqual(calls.slice(6), [
        'pushed, then added again',
        'pushed, then added again',
    ], 'command added again is run again');
    clearGlobalProps('otherPA');
});

test('A later run runs the items of a queue which the page has emptied and used again', (assert) => {
    const calls = [];
    window._paq = [['getVisitorId', () => calls.push('a')], ['getVisitorId', () => calls.push('b')]];
    runRedirect();
    window._paq.length = 0;
    Array.prototype.push.call(window._paq, ['getVisitorId', () => calls.push('new')]);
    runRedirect();
    assert.deepEqual(calls, ['a', 'b', 'new'], 'new item at the index of an old one is run');
    runRedirect();
    assert.strictEqual(calls.length, 3, 'once');
});

test('A later run runs other commands which a push() of the page has added', (assert) => {
    const calls = [];
    window._paq = [];
    // push() of the page adds the pushed command, and its own one
    window._paq.push = function push(command) {
        Array.prototype.push.call(this, command);
        return Array.prototype.push.call(this, ['getVisitorId', () => calls.push('command of the page')]);
    };
    runRedirect();
    window._paq.push(['getVisitorId', () => calls.push('pushed')]);
    assert.deepEqual(calls, ['pushed'], 'push() runs the pushed command only, as by the SDK');
    runRedirect();
    assert.deepEqual(calls, ['pushed', 'command of the page'], 'other command is run by another run');
    runRedirect();
    assert.strictEqual(calls.length, 2, 'once');
});

test('A command which the page adds again after a push() of the page has added its copy is run', (assert) => {
    const calls = [];
    window._paq = [];
    window._paq.push = function push(command) {
        return Array.prototype.push.call(this, command.slice());
    };
    runRedirect();
    const command = ['getVisitorId', () => calls.push('callback')];
    window._paq.push(command);
    // the page adds the command again, as another item
    Array.prototype.push.call(window._paq, command);
    runRedirect();
    assert.deepEqual(calls, ['callback', 'callback'], 'both items are run');
    runRedirect();
    assert.strictEqual(calls.length, 2, 'once each');
});

test('Many pushed commands are run once, also after an item which the page has added itself', (assert) => {
    let count = 0;
    window._paq = [];
    runRedirect();
    const command = () => ['getVisitorId', () => {
        count += 1;
    }];
    Array.prototype.push.call(window._paq, command());
    for (let i = 0; i < 150; i += 1) {
        window._paq.push(command());
    }
    assert.strictEqual(count, 150, 'pushed commands are run');
    runRedirect();
    assert.strictEqual(count, 151, 'only the item which the page has added is run by another run');
});

test('A push() of the mock which the page has saved runs commands after another run', (assert) => {
    const calls = [];
    window._paq = [];
    runRedirect();
    const saved = window._paq.push.bind(window._paq);
    const inner = window._paq.push;
    window._paq.push = function push(...commands) {
        return inner.apply(this, commands);
    };
    runRedirect();
    saved(['getVisitorId', () => calls.push('saved push()')]);
    window._paq.push(['getVisitorId', () => calls.push('push() of the queue')]);
    assert.deepEqual(calls, ['saved push()', 'push() of the queue'], 'each command is run once, at once');
    runRedirect();
    assert.strictEqual(calls.length, 2, 'and not again by another run');

    // a wrapper of the page which passes a copy of the command later
    clearGlobalProps('pa', 'pianoAnalytics', '_paq');
    window._paq = [];
    runRedirect();
    const older = window._paq.push;
    const passed = [];
    window._paq.push = function push(command) {
        passed.push(() => older.call(this, command.slice()));
        return this.length;
    };
    runRedirect();
    window._paq.push(['getVisitorId', () => calls.push('copy passed later')]);
    passed.forEach((pass) => pass());
    runRedirect();
    assert.deepEqual(calls.slice(2), ['copy passed later'], 'command is run once');
});

test('A command which the page removes from the queue and adds again is run again', (assert) => {
    const calls = [];
    const second = ['getVisitorId', () => calls.push('second')];
    window._paq = [['getVisitorId', () => calls.push('first')], second];
    runRedirect();
    // removed, then added again after another run
    window._paq.length = 1;
    runRedirect();
    Array.prototype.push.call(window._paq, second);
    runRedirect();
    assert.deepEqual(calls, ['first', 'second', 'second'], 'item added again at its old index is run');

    // the queue is emptied, a command is pushed, and the old command is added again at its old index
    window._paq.length = 0;
    window._paq.push(['getVisitorId', () => calls.push('pushed')]);
    Array.prototype.push.call(window._paq, second);
    runRedirect();
    assert.deepEqual(calls.slice(3), ['pushed', 'second'], 'also after a command is pushed to the emptied queue');

    // the queue is emptied, and the command which was at the first index is pushed, and then added again
    window._paq.length = 0;
    const first = ['getVisitorId', () => calls.push('first again')];
    window._paq.push(first);
    window._paq.length = 0;
    window._paq.push(first);
    Array.prototype.push.call(window._paq, first);
    runRedirect();
    assert.deepEqual(calls.slice(5), ['first again', 'first again', 'first again'], 'each of the three is run');

    // the page replaces a command with another value, and puts it back after another run
    const [replaced] = window._paq;
    window._paq[0] = null;
    runRedirect();
    window._paq[0] = replaced;
    runRedirect();
    assert.strictEqual(calls.length, 9, 'command put back at its index is run again');
    runRedirect();
    assert.strictEqual(calls.length, 9, 'once');
});

test('Commands which a push() of the page adds to the queue later are run once', (assert) => {
    const calls = [];
    let count = 0;
    const added = [];
    window._paq = [];
    // push() of the page adds the commands later, e.g. when the visitor has given consent
    window._paq.push = function push(command) {
        added.push(() => Array.prototype.push.call(this, command));
        return this.length;
    };
    runRedirect();
    const command = ['getVisitorId', () => calls.push('callback')];
    window._paq.push(command);
    window._paq.push(command);
    assert.deepEqual(calls, ['callback', 'callback'], 'command pushed twice is run twice, at once');
    added.splice(0).forEach((add) => add());
    runRedirect();
    assert.strictEqual(calls.length, 2, 'and not again by another run when it is in the queue');

    // more commands than are remembered until they are in the queue: the oldest ones are run again
    const countCall = () => {
        count += 1;
    };
    for (let i = 0; i < 150; i += 1) {
        window._paq.push(['getVisitorId', countCall]);
    }
    assert.strictEqual(count, 150, 'all commands are run at once');
    added.splice(0).forEach((add) => add());
    runRedirect();
    assert.strictEqual(count, 200, 'only the commands which are not remembered anymore are run again');
});

test('Each item of the queue is read once, and the run commands are not kept by the mock', (assert) => {
    const calls = [];
    let reads = 0;
    window._paq = [];
    // e.g. a getter which returns the command once
    Object.defineProperty(window._paq, 0, {
        configurable: true,
        enumerable: true,
        get() {
            reads += 1;
            return reads === 1 ? ['getVisitorId', () => calls.push('callback')] : undefined;
        },
    });
    window._paq.length = 1;
    window._paq[1] = 'not a command';
    window._paq[2] = ['getVisitorId', () => calls.push('second')];
    runRedirect();
    assert.deepEqual(calls, ['callback', 'second'], 'commands are run');
    assert.strictEqual(reads, 1, 'item is read once');

    // the record of the queue has only weak references to the commands, so that the page can release them
    window._paq.push(['getVisitorId', () => calls.push('pushed')]);
    // a value which is not a command is not remembered
    window._paq.push('not a command');
    const key = Object.getOwnPropertySymbols(window._paq)[0];
    const record = window._paq[key];
    const references = record.accounted.filter((reference) => reference !== undefined);
    assert.strictEqual(references.length, 3, 'run commands are accounted');
    assert.true(references.every((reference) => reference instanceof window.WeakRef), 'by weak references');
    assert.strictEqual(record.transit.length, 0, 'commands which are in the queue are not kept');
    assert.strictEqual(references[2].deref(), window._paq[3], 'reference to the pushed command');

    // a command which is not seen in the queue yet, e.g. as the page adds a copy of it, which is not recognized
    // as its argument is a getter, is kept by a weak reference only
    window._paq.push = ((push) => function wrapper(command) {
        return push.call(this, command.slice());
    })(window._paq.push);
    runRedirect();
    const command = ['getVisitorId'];
    Object.defineProperty(command, 1, { enumerable: true, get: () => () => calls.push('getter') });
    window._paq.push(command);
    assert.strictEqual(record.transit.length, 1, 'command is remembered');
    assert.true(record.transit[0] instanceof window.WeakRef, 'by a weak reference');
    assert.strictEqual(record.transit[0].deref(), command, 'to the command');
});

test('An item which a push() of the page adds as a getter is read only by another run', (assert) => {
    const calls = [];
    let reads = 0;
    window._paq = [];
    // push() of the page adds the pushed command, and its own one as a getter which returns it once
    window._paq.push = function push(command) {
        const length = Array.prototype.push.call(this, command);
        Object.defineProperty(this, length, {
            configurable: true,
            enumerable: true,
            get() {
                reads += 1;
                return reads === 1 ? ['getVisitorId', () => calls.push('command of the page')] : undefined;
            },
        });
        return length + 1;
    };
    runRedirect();
    const length = window._paq.push(['getVisitorId', () => calls.push('pushed')]);
    assert.strictEqual(length, 2, 'result of push() of the page');
    assert.strictEqual(reads, 0, 'getter is not read by push()');
    runRedirect();
    assert.deepEqual(calls, ['pushed', 'command of the page'], 'command of the getter is run by another run');
    assert.strictEqual(reads, 1, 'getter is read once');

    // a getter which throws does not make push() throw
    clearGlobalProps('pa', 'pianoAnalytics', '_paq');
    window._paq = [];
    window._paq.push = function push(command) {
        const added = Array.prototype.push.call(this, command);
        Object.defineProperty(this, added, {
            configurable: true,
            get() {
                throw new Error('error of the page');
            },
        });
        return added + 1;
    };
    runRedirect();
    assert.strictEqual(window._paq.push(['getVisitorId', () => calls.push('pushed again')]), 2, 'push() returns');
    assert.strictEqual(calls[calls.length - 1], 'pushed again', 'pushed command is run');

    // an added item which is compared with the pushed command and throws does not make push() throw either
    clearGlobalProps('pa', 'pianoAnalytics', '_paq');
    window._paq = [];
    window._paq.push = function push(command) {
        // added before the copy of the command, so it is compared with the command
        const item = [];
        Object.defineProperty(item, 0, {
            get() {
                throw new Error('error of the page');
            },
        });
        item.length = command.length;
        Array.prototype.push.call(this, item);
        return Array.prototype.push.call(this, command.slice());
    };
    runRedirect();
    assert.strictEqual(window._paq.push(['getVisitorId', () => calls.push('pushed with an item')]), 2, 'result');
    assert.strictEqual(calls[calls.length - 1], 'pushed with an item', 'pushed command is run');
});

test('Arguments of commands which are getters are not read when commands are compared', (assert) => {
    const calls = [];
    let reads = 0;
    window._paq = [];
    // push() of the page adds its own command before the pushed one, with a callback which is returned once
    window._paq.push = function push(command) {
        const own = ['getVisitorId'];
        Object.defineProperty(own, 1, {
            configurable: true,
            enumerable: true,
            get() {
                reads += 1;
                return reads === 1 ? () => calls.push('command of the page') : undefined;
            },
        });
        Array.prototype.push.call(this, own);
        return Array.prototype.push.call(this, command);
    };
    runRedirect();
    window._paq.push(['getVisitorId', () => calls.push('pushed')]);
    assert.strictEqual(reads, 0, 'getter is not read by push()');
    runRedirect();
    assert.deepEqual(calls, ['pushed', 'command of the page'], 'command of the page is run by another run');
    assert.strictEqual(reads, 1, 'getter is read once, when the command is run');

    // the pushed command has a getter as well: the command of the page is not taken for its copy
    reads = 0;
    const pushed = ['getVisitorId'];
    Object.defineProperty(pushed, 1, {
        configurable: true,
        enumerable: true,
        get: () => () => calls.push('pushed with a getter'),
    });
    window._paq.push(pushed);
    runRedirect();
    assert.deepEqual(calls.slice(2), [
        'pushed with a getter',
        'command of the page',
    ], 'both commands are run, once each');
});

test('Each value of the configuration of the page is read once', (assert) => {
    let reads = 0;
    let privacyReads = 0;
    window._pac = {
        // e.g. a getter which returns the value once
        get site() {
            reads += 1;
            return reads === 1 ? 7 : undefined;
        },
        get privacy() {
            privacyReads += 1;
            return {};
        },
    };
    runRedirect();
    assert.strictEqual(window.pa.getConfiguration('site'), 7, 'value of the first read');
    assert.strictEqual(reads, 1, 'read once');
    assert.strictEqual(privacyReads, 0, 'privacy is not read as a value of the configuration');
});

test('The object of a queue is kept in it without changing how the page sees the queue', (assert) => {
    window._paq = [['setConfiguration', 'site', 1]];
    runRedirect();
    assert.deepEqual(Object.keys(window._paq), ['0'], 'no enumerable property is added');
    assert.strictEqual(JSON.stringify(window._paq), '[["setConfiguration","site",1]]', 'queue is serialized as before');
    assert.strictEqual(window._paq.length, 1, 'length');
    // e.g. `Object.assign()` copies enumerable symbol properties
    const copy = Object.assign([], window._paq);
    assert.strictEqual(Object.getOwnPropertySymbols(copy).length, 0, 'a copy of the queue is a new queue');
});

test('A later run takes a queue which the page has replaced, or of another name', (assert) => {
    const calls = [];
    window._paq = [['getVisitorId', () => calls.push('first queue')]];
    runRedirect();
    // the page replaces the queue before the SDK is loaded
    window._paq = [['getVisitorId', () => calls.push('replaced queue')]];
    window._pac = { globalVarName: 'sitePA' };
    runRedirect();
    window._paq.push(['getVisitorId', () => calls.push('pushed to the replaced queue')]);
    assert.deepEqual(calls, ['first queue', 'replaced queue', 'pushed to the replaced queue'], 'replaced queue');

    // only the name of the queue changes
    window.siteQueue = [['getVisitorId', () => calls.push('queue of another name')]];
    window._pac = { queueVarName: 'siteQueue' };
    runRedirect();
    window.siteQueue.push(['getVisitorId', () => calls.push('pushed to it')]);
    window._paq.push(['getVisitorId', () => calls.push('pushed to the default queue')]);
    assert.deepEqual(calls.slice(3), [
        'queue of another name',
        'pushed to it',
        'pushed to the default queue',
    ], 'queue of another name is taken, and each command is run once');
    clearGlobalProps('sitePA', 'siteQueue');
});

test('A later run installs the global which the page has cleared, without running the queue again', (assert) => {
    const calls = [];
    window._paq = [['getVisitorId', () => calls.push('queued')]];
    runRedirect();
    const first = window.pa;
    window.pa = null;
    runRedirect();
    assert.strictEqual(window.pa, first, 'global is installed again');
    assert.deepEqual(calls, ['queued'], 'queue is not run again');
});

test('Empty values of the configuration of the page are ignored, as by the SDK', (assert) => {
    window._pac = { site: '', globalVarName: '', collectDomain: null };
    const script = document.createElement('script');
    script.dataset.config = JSON.stringify({ site: 7, collectDomain: 'https://log.xiti.com' });
    script.textContent = redirects.getRedirect(name).content;
    document.body.appendChild(script);
    script.remove();
    const { pa } = window;
    assert.strictEqual(typeof pa, 'object', 'global of the default name');
    assert.strictEqual(pa.getConfiguration('globalVarName'), 'pa', 'default name is kept');
    assert.strictEqual(pa.getConfiguration('site'), 7, 'value of data-config is kept');
    assert.strictEqual(pa.getConfiguration('collectDomain'), 'https://log.xiti.com', 'null is ignored');
});

test('Keeps the SDK which is already on the page', (assert) => {
    // objects of the SDK have its constructor
    const sdk = { sendEvent: () => 'real', PA() {} };
    window.pa = sdk;
    runRedirect();
    assert.strictEqual(window.pa, sdk, 'SDK is kept');
    assert.strictEqual(window.pianoAnalytics, undefined, 'nothing is added');
    assert.strictEqual(window._paq, undefined, 'no queue is added');

    clearGlobalProps('pa');
    runRedirect();
    const mock = window.pa;
    runRedirect();
    assert.strictEqual(window.pa, mock, 'mock is not installed again');

    // as the SDK, the global is not replaced if the page has defined it otherwise, e.g. as an empty object
    clearGlobalProps('pa', 'pianoAnalytics', '_paq');
    const own = {};
    window.pa = own;
    const calls = [];
    window._paq = [['getVisitorId', () => calls.push('queued')]];
    runRedirect();
    assert.strictEqual(window.pa, own, 'object of the page is kept');
    const mockModule = window.pianoAnalytics;
    assert.strictEqual(typeof mockModule.pianoAnalytics.sendEvent, 'function', 'pianoAnalytics is the mock');

    // e.g. the scriptlet and then the redirect resource: the queue is not run again
    const { push } = window._paq;
    runRedirect();
    assert.deepEqual(calls, ['queued'], 'queued commands are not run again');
    assert.strictEqual(window.pianoAnalytics, mockModule, 'module is not replaced');
    assert.strictEqual(window._paq.push, push, 'push() is not wrapped again');
    window._paq.push(['getVisitorId', () => calls.push('pushed')]);
    assert.deepEqual(calls, ['queued', 'pushed'], 'pushed command is run once');

    // the module of the SDK, whose global is an object of the page
    clearGlobalProps('pa', 'pianoAnalytics', '_paq');
    const sdkModule = { pianoAnalytics: { sendEvent: () => 'real', PA() {} } };
    window.pianoAnalytics = sdkModule;
    window.pa = own;
    runRedirect();
    assert.strictEqual(window.pianoAnalytics, sdkModule, 'module of the SDK is kept');
    assert.strictEqual(window.pa, own, 'object of the page is kept');
    assert.strictEqual(window._paq, undefined, 'queue is not taken');
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
        window._paq = [['sendEvent', 'page.display', {}]];
        runRedirect();
        const { pa } = window;
        pa.setConfigurations({ site: 1, collectDomain: 'https://log.xiti.com' });
        pa.setUser('user', 'premium');
        pa.setVisitorId('visitor');
        pa.sendEvent('click.action', { click: 'a' });
        pa.privacy.setMode('optout');
        pa.consent.setMode('opt-out');
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
