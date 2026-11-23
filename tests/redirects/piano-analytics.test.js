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
    assert.strictEqual(window.pianoAnalytics, pa, 'pianoAnalytics is pa');

    // as pages, e.g. campusfrance.org, toureiffel.paris and hikvision.com
    pa.setConfigurations({ site: 631934, collectDomain: 'https://log.xiti.com' });
    assert.strictEqual(pa.getConfiguration('site'), 631934, 'configuration is kept');
    pa.setConfiguration('privacyDefaultMode', 'exempt');
    assert.strictEqual(pa.getConfiguration('privacyDefaultMode'), 'exempt', 'setConfiguration()');
    assert.strictEqual(pa.getConfiguration('queueVarName'), '_paq', 'default queue name');
    assert.strictEqual(pa.getConfiguration('unknown'), undefined, 'unknown configuration');
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
    assert.strictEqual(window.pianoAnalytics, pa, 'pianoAnalytics');
    assert.strictEqual(pa.getConfiguration('site'), 5, 'configuration of _pac');
    assert.strictEqual(pa.getConfiguration('privacy'), undefined, 'privacy of _pac is not a configuration');
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

test('Keeps the SDK which is already on the page', (assert) => {
    const sdk = { sendEvent: () => 'real' };
    window.pa = sdk;
    runRedirect();
    assert.strictEqual(window.pa, sdk, 'SDK is kept');
    assert.strictEqual(window.pianoAnalytics, undefined, 'nothing is added');

    clearGlobalProps('pa');
    runRedirect();
    const mock = window.pa;
    runRedirect();
    assert.strictEqual(window.pa, mock, 'mock is not installed again');

    // as the SDK, the global is not replaced if the page has defined it otherwise, e.g. by set-constant
    clearGlobalProps('pa', 'pianoAnalytics');
    const own = {};
    window.pa = own;
    runRedirect();
    assert.strictEqual(window.pa, own, 'object of the page is kept');
    assert.strictEqual(typeof window.pianoAnalytics.sendEvent, 'function', 'pianoAnalytics is the mock');
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
