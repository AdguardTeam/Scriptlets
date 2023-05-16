/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'prevent-window-open';

const nativeOpen = window.open;
const nativeSetTimeout = window.setTimeout;
const nativeConsole = console.log;

const CHECK_PROP = 'openedCheck';

const mockedWindowOpen = () => {
    window[CHECK_PROP] = true;
};

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'value';
    };
    window.open = mockedWindowOpen;
};

const afterEach = () => {
    window.open = nativeOpen;
    console.log = nativeConsole;
    clearGlobalProps('hit', '__debug', CHECK_PROP);
};

module(name, { beforeEach, afterEach });

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-window.open-defuser.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('old syntax: string ', (assert) => {
    const scriptletArgs = ['1', 'test'];
    runScriptlet(name, scriptletArgs);
    window.open('test url', 'some target');
    assert.equal(window.hit, 'value', 'Hit function was executed');
});

test('old syntax: regexp ', (assert) => {
    const scriptletArgs = ['1', '/test/'];
    runScriptlet(name, scriptletArgs);
    window.open('test url', 'some target');
    assert.equal(window.hit, 'value', 'Hit function was executed');
});

test('old syntax: reverse + regexp ', (assert) => {
    const scriptletArgs = ['0', '/test/'];
    runScriptlet(name, scriptletArgs);
    window.open('some url', 'some target');
    assert.equal(window.hit, 'value', 'Hit function was executed because of reverse matching');
});

test('old syntax: match all + custom replacement: trueFunc', (assert) => {
    const scriptletArgs = ['1', '', 'trueFunc'];
    runScriptlet(name, scriptletArgs);
    const test = window.open('some url');
    const res = test();
    assert.equal(window.hit, 'value', 'Hit function was executed');
    assert.equal(res, true, 'window.open replaced by trueFunc');
});

test('old syntax: match all + custom replacement: {aa=noopFunc}', (assert) => {
    const scriptletArgs = ['1', '', '{aa=noopFunc}'];
    runScriptlet(name, scriptletArgs);
    const test = window.open('some test url');
    assert.equal(window.hit, 'value', 'Hit function was executed');
    assert.strictEqual(typeof test, 'object', 'replaced window.open returns an object');
    assert.strictEqual(typeof test.aa, 'function', 'and the object\'s property is a function');
    assert.strictEqual(typeof test.aa(), 'undefined', 'which is noopFunc');
});

test('old syntax: does not work - invalid regexp pattern', (assert) => {
    const scriptletArgs = ['1', '/*/'];

    runScriptlet(name, scriptletArgs);
    window.open('test_url', 'some target');
    assert.equal(window.hit, undefined, 'hit should not fire');
    assert.ok(window[CHECK_PROP], 'window.open has been executed');
});

test('new syntax: no args', (assert) => {
    runScriptlet(name);
    window.open('some url');
    assert.equal(window.hit, 'value', 'Hit function was executed');
});

test('new syntax: wildcard match', (assert) => {
    const scriptletArgs = ['*'];
    runScriptlet(name, scriptletArgs);
    window.open('some url');
    assert.equal(window.hit, 'value', 'Hit function was executed');
});

test('new syntax: string ', (assert) => {
    const scriptletArgs = ['test'];
    runScriptlet(name, scriptletArgs);
    window.open('test url', 'some target');
    assert.equal(window.hit, 'value', 'Hit function was executed');
});

test('new syntax: regexp ', (assert) => {
    const scriptletArgs = ['/test/'];
    runScriptlet(name, scriptletArgs);
    window.open('test url', 'some target');
    assert.equal(window.hit, 'value', 'Hit function was executed');
});

test('new syntax: reverse + regexp ', (assert) => {
    const scriptletArgs = ['!/test/'];
    runScriptlet(name, scriptletArgs);
    window.open('some url', 'some target');
    assert.equal(window.hit, 'value', 'Hit function was executed because of reverse matching');
});

test('new syntax: iframe with delayed removing', (assert) => {
    const scriptletArgs = ['/test/', '1'];
    runScriptlet(name, scriptletArgs);
    const done = assert.async();

    const test = window.open('test-files/empty.html');
    let iframeEl = document.querySelector('body > iframe');
    assert.strictEqual(typeof test, 'object', 'mocked window.open returns an iframe');
    assert.strictEqual(typeof test.focus, 'function', 'and iframe\'s focus property is a function');
    assert.ok(iframeEl, 'decoy iframe was created');
    assert.strictEqual(typeof iframeEl, 'object', 'decoy iframe was created');
    assert.equal(window.hit, 'value', 'Hit function was executed');

    nativeSetTimeout(() => {
        iframeEl = document.querySelector('body > iframe');
        assert.strictEqual(iframeEl, null, 'decoy iframe was removed after set delay = 1 second');
        done();
    }, 1200);
});

test('new syntax: object with delayed removing', (assert) => {
    const scriptletArgs = ['/test/', '1', 'obj'];
    runScriptlet(name, scriptletArgs);
    const done = assert.async();

    const test = window.open('test-files/empty.html');
    const iframeEl = document.querySelector('body > iframe');
    let objEl = document.querySelector('body > object');
    // window.open returns 'undefined' in Edge 15
    // and 'null' in Safari 10 and Firefox 52
    if (test) {
        assert.strictEqual(typeof test, 'object', 'mocked window.open returns an object');
        assert.strictEqual(typeof test.focus, 'function', 'and object\'s focus property is a function');
    }
    assert.strictEqual(iframeEl, null, 'decoy iframe should not be created');
    assert.ok(objEl, 'decoy object was created');
    assert.equal(window.hit, 'value', 'hit function was executed');

    nativeSetTimeout(() => {
        objEl = document.querySelector('body > object');
        assert.strictEqual(objEl, null, 'decoy object was removed after set delay = 1 second');
        done();
    }, 1200);
});

test('new syntax: log checking - only url', (assert) => {
    const testUrl = 'test_url_for_logging_url';

    // mock console.log function for log checking
    // eslint-disable-next-line no-console
    console.log = function log(input) {
        if (input.includes('trace')) {
            return;
        }
        const EXPECTED_LOG_STR = `${name}: ${testUrl}`;
        assert.strictEqual(input, EXPECTED_LOG_STR, 'console.hit input');
    };

    const scriptletArgs = ['', '', 'log'];
    runScriptlet(name, scriptletArgs);

    window.open(testUrl);

    assert.equal(window.hit, 'value', 'hit fired');
});

test('new syntax: log checking - url + args', (assert) => {
    const testUrl = 'test-files/empty.html';
    const testWindowName = 'testName';
    const testWindowFeatures = 'menubar=yes, status=yes';

    // mock console.log function for log checking
    // eslint-disable-next-line no-console
    console.log = function log(input) {
        if (input.includes('trace')) {
            return;
        }
        const EXPECTED_LOG_STR = `${name}: ${testUrl}, ${testWindowName}, ${testWindowFeatures}`;
        assert.strictEqual(input, EXPECTED_LOG_STR, 'console.hit input');
    };

    const scriptletArgs = ['*', '0', 'log'];
    runScriptlet(name, scriptletArgs);

    window.open(testUrl, testWindowName, testWindowFeatures);

    assert.equal(window.hit, 'value', 'hit fired');
});

test('new syntax: native code check', (assert) => {
    window.open = nativeOpen;
    const testUrl = 'some test url';

    const scriptletArgs = [testUrl, '100'];
    runScriptlet(name, scriptletArgs);

    assert.equal(window.open.toString().includes('native code'), true, 'window.open.toString() returns native code');

    assert.equal(window.hit, undefined, 'hit should not fire');
});

test('new syntax: props mocked', (assert) => {
    const testUrl = 'test-files/empty.html';

    const scriptletArgs = [testUrl, '100'];
    runScriptlet(name, scriptletArgs);

    const decoy = window.open(testUrl);

    assert.strictEqual(decoy.closed, false, '.closed mocked');
    assert.strictEqual(decoy.opener, window, '.opener mocked');
    assert.strictEqual(decoy.frameElement, null, '.frameElement mocked');

    assert.equal(window.hit, 'value', 'hit fired');
});

test('new syntax: invalid regexp', (assert) => {
    const scriptletArgs = ['/*/'];
    runScriptlet(name, scriptletArgs);
    window.open('test url', 'some target');
    assert.equal(window.hit, undefined, 'Hit function was executed');
});
