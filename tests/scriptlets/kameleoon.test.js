/* eslint-disable no-underscore-dangle, func-names */
import { clearGlobalProps, runScriptlet, sleep } from '../helpers';

const { test, module } = QUnit;
const name = 'kameleoon';

const STYLE_ID = 'kameleoonLoadingStyleSheet';

const GLOBALS = [
    'hit',
    '__debug',
    'Kameleoon',
    'kameleoonQueue',
    'kameleoonDisplayPage',
    'kameleoonDisplayPageTimeOut',
    'kameleoonTimeout',
    'kameleoonStartLoadTime',
    'kameleoonEndLoadTime',
];

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
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
};

module(name, { beforeEach, afterEach });

/**
 * Runs the anti-flicker snippet of the Kameleoon installation tag.
 *
 * @param {number} timeout loading timeout in ms
 */
const runAntiFlickerSnippet = (timeout) => {
    window.kameleoonQueue = window.kameleoonQueue || [];
    window.kameleoonStartLoadTime = Date.now();
    if (!document.getElementById(STYLE_ID) && !window.kameleoonDisplayPageTimeOut) {
        const style = document.createElement('style');
        style.id = STYLE_ID;
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

test('Installs the API without site code', async (assert) => {
    const calls = [];
    runScriptlet(name);

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    const { API } = window.Kameleoon;
    assert.strictEqual(typeof API.Core.runWhenElementPresent, 'function', 'API is installed');
    assert.strictEqual(API.Core.getConfiguration().siteCode, '', 'site code is not known');

    // the page initializes the queue after the scriptlet, as in the installation tag
    window.kameleoonQueue = window.kameleoonQueue || [];
    window.kameleoonQueue.push(() => calls.push('command'));
    assert.deepEqual(calls, ['command'], 'commands pushed by the page run at once');
    await sleep(10);
});

test('Anti-flicker snippet which runs after the scriptlet does not hide the page', (assert) => {
    runScriptlet(name);
    runAntiFlickerSnippet(1000);
    assert.notOk(document.getElementById(STYLE_ID), 'page is not hidden');
    assert.strictEqual(window.kameleoonTimeout, undefined, 'no timeout');
});

test('Works if run before the root element exists', (assert) => {
    // at document start, e.g. injected by the browser extension, there is no <html> element yet
    Object.defineProperty(document, 'documentElement', {
        configurable: true,
        get: () => null,
    });
    let eventBeforeRoot;
    try {
        runScriptlet(name);
        eventBeforeRoot = window.Kameleoon && window.Kameleoon.API.Utils.mouseDownEvent;
    } finally {
        delete document.documentElement;
    }

    assert.strictEqual(typeof window.Kameleoon.API, 'object', 'API is installed');
    assert.strictEqual(window.kameleoonDisplayPageTimeOut, true, 'later anti-flicker snippet is prevented');
    assert.strictEqual(
        eventBeforeRoot,
        'ontouchend' in window ? 'touchend' : 'mousedown',
        'click event is detected by the window before the root element exists',
    );
    assert.strictEqual(
        window.Kameleoon.API.Utils.mouseDownEvent,
        'ontouchend' in document.documentElement ? 'touchend' : 'mousedown',
        'click event is detected by the root element once it exists',
    );
});

test('Keeps an existing engine and is not applied twice', (assert) => {
    const engine = { API: {} };
    window.Kameleoon = engine;
    runScriptlet(name);
    assert.strictEqual(window.Kameleoon, engine, 'existing engine is kept');
    assert.strictEqual(window.hit, undefined, 'hit function not fired');

    clearGlobalProps('Kameleoon');
    runScriptlet(name);
    const first = window.Kameleoon;
    runScriptlet(name);
    assert.strictEqual(window.Kameleoon, first, 'second run keeps the first API');
});
