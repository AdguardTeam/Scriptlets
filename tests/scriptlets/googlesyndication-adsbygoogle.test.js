/* eslint-disable no-underscore-dangle */
import {
    clearGlobalProps,
    evalWrapper,
    getRedirectsInstance,
    runScriptlet,
    sleep,
} from '../helpers';

const { test, module } = QUnit;
const name = 'googlesyndication-adsbygoogle';

let redirects;

const before = async () => {
    redirects = await getRedirectsInstance();
};

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug', 'adsbygoogle');
    document.querySelectorAll('.adsbygoogle').forEach((element) => element.remove());
};

module(name, { before, beforeEach, afterEach });

/**
 * Adds an ad placeholder to the page, as AdSense code of a page does.
 *
 * @returns {HTMLElement} Placeholder.
 */
const addPlaceholder = () => {
    const placeholder = document.createElement('ins');
    placeholder.className = 'adsbygoogle';
    document.body.appendChild(placeholder);
    return placeholder;
};

/**
 * Adds a placeholder and pushes it as page code which observes its `data-ad-status` before the push,
 * e.g. on tempmail.ninja, and returns the values which the observer of the page has seen.
 *
 * @returns {{ placeholder: HTMLElement, statuses: Array<string|null>, stop: Function }} Placeholder and statuses.
 */
const pushObservedPlaceholder = () => {
    const placeholder = addPlaceholder();
    const statuses = [];
    const observer = new MutationObserver(() => statuses.push(placeholder.getAttribute('data-ad-status')));
    observer.observe(placeholder, { attributeFilter: ['data-ad-status'] });
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    return { placeholder, statuses, stop: () => observer.disconnect() };
};

test('Checking if alias names work', (assert) => {
    const getCode = (scriptletName) => window.scriptlets.invoke({
        name: scriptletName,
        engine: 'test',
        verbose: true,
    });
    const code = getCode(name);
    assert.strictEqual(getCode('ubo-googlesyndication_adsbygoogle.js'), code, 'ubo- prefixed name - ok');
    assert.strictEqual(getCode('googlesyndication_adsbygoogle.js'), code, 'ubo name - ok');
});

test('Run as a scriptlet before the page, the placeholders which the page pushes get the status', async (assert) => {
    runScriptlet(name);
    assert.strictEqual(typeof window.adsbygoogle.push, 'function', 'adsbygoogle is mocked');

    const { placeholder, statuses, stop } = pushObservedPlaceholder();
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.strictEqual(placeholder.getAttribute('data-adsbygoogle-status'), 'done', 'processing status at once');
    const frame = placeholder.querySelector('iframe[id^="aswift_"]');
    assert.strictEqual(frame.getAttribute('data-load-complete'), 'true', 'frame is loaded');

    await sleep(20);
    stop();
    assert.deepEqual(statuses, ['filled'], 'the observer of the page sees the ad status once');
});

test('Run as a scriptlet and a redirect, a placeholder is filled once and gets the status once', async (assert) => {
    runScriptlet(name);
    const { placeholder, statuses, stop } = pushObservedPlaceholder();
    // the redirect of the script of AdSense, which runs later, keeps the object of the scriptlet
    const mock = window.adsbygoogle;
    evalWrapper(redirects.getRedirect(name).content);
    assert.strictEqual(window.adsbygoogle, mock, 'the object of the scriptlet is kept');

    // and a placeholder which the page pushes after both have run
    const later = pushObservedPlaceholder();

    await sleep(20);
    stop();
    later.stop();
    assert.strictEqual(placeholder.querySelectorAll('iframe[id^="aswift_"]').length, 1, 'filled once');
    assert.deepEqual(statuses, ['filled'], 'ad status is set once');
    assert.strictEqual(later.placeholder.querySelectorAll('iframe[id^="aswift_"]').length, 1, 'later one filled once');
    assert.deepEqual(later.statuses, ['filled'], 'and its ad status is set once');
});

test('A status which the page or another rule has set is kept', async (assert) => {
    const placeholder = addPlaceholder();
    placeholder.setAttribute('data-ad-status', 'unfilled');
    runScriptlet(name);
    window.adsbygoogle.push({});
    await sleep(20);
    assert.strictEqual(placeholder.getAttribute('data-adsbygoogle-status'), 'done', 'processing status is set');
    assert.strictEqual(placeholder.getAttribute('data-ad-status'), 'unfilled', 'ad status is kept');
});
