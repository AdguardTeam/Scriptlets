/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';
import { startsWith } from '../../src/helpers/string-utils';

const { test, module } = QUnit;
const name = 'prevent-xhr';

const nativeXhrOpen = XMLHttpRequest.prototype.open;
const nativeConsole = console.log;

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    XMLHttpRequest.prototype.open = nativeXhrOpen;
    console.log = nativeConsole;
};

module(name, { beforeEach, afterEach });

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-no-xhr-if.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('No args, logging', async (assert) => {
    const XHR_DATA = {
        method: 'GET',
        url: 'http://www.example.org/',
    };
    const EXPECTED_READY_STATE = 1;

    const done = assert.async();

    // mock console.log function for log checking
    console.log = function log(input) {
        if (input.indexOf('trace') > -1) {
            return;
        }
        const EXPECTED_LOG_STR = `xhr( method:"${XHR_DATA.method}" url:"${XHR_DATA.url}" )`;
        assert.ok(startsWith(input, EXPECTED_LOG_STR), 'console.hit input');
    };

    runScriptlet(name);

    const xhr = new XMLHttpRequest();
    xhr.open(XHR_DATA.method, XHR_DATA.url);
    assert.strictEqual(xhr.readyState, EXPECTED_READY_STATE, 'Request passed');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    done();
});

test('Empty arg, prevent all', async (assert) => {
    const XHR_DATA = {
        method: 'GET',
        url: 'http://www.example.org/',
    };
    const EXPECTED_READY_STATE = 0;

    runScriptlet(name, ['']);

    const xhr = new XMLHttpRequest();
    xhr.open(XHR_DATA.method, XHR_DATA.url);
    assert.strictEqual(xhr.readyState, EXPECTED_READY_STATE, 'Request blocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('Args, prevent matched', async (assert) => {
    const XHR_DATA = {
        method: 'GET',
        url: 'http://www.example.org/',
    };
    const EXPECTED_READY_STATE = 0;

    runScriptlet(name, [`example.org method:${XHR_DATA.method}`]);

    const xhr = new XMLHttpRequest();
    xhr.open(XHR_DATA.method, XHR_DATA.url);
    assert.strictEqual(xhr.readyState, EXPECTED_READY_STATE, 'Request blocked');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});

test('Args, pass unmatched', async (assert) => {
    const XHR_DATA = {
        method: 'GET',
        url: 'http://www.example.org/',
    };
    const MATCH_DATA = 'not-example.org';
    const EXPECTED_READY_STATE = 1;

    runScriptlet(name, [MATCH_DATA]);

    const xhr = new XMLHttpRequest();
    xhr.open(XHR_DATA.method, XHR_DATA.url);
    assert.strictEqual(xhr.readyState, EXPECTED_READY_STATE, 'Request passed');
    assert.strictEqual(window.hit, undefined, 'hit should not fire');
});

test('Args, pass partly matched', async (assert) => {
    const XHR_DATA = {
        method: 'GET',
        url: 'http://www.example.org/',
    };
    const MATCH_DATA = 'not-example.org method:GET';
    const EXPECTED_READY_STATE = 1;

    runScriptlet(name, [MATCH_DATA]);

    const xhr = new XMLHttpRequest();
    xhr.open(XHR_DATA.method, XHR_DATA.url);
    assert.strictEqual(xhr.readyState, EXPECTED_READY_STATE, 'Request passed');
    assert.strictEqual(window.hit, undefined, 'hit should not fire');
});
