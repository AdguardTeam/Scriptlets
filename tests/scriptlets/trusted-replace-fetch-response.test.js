/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';
import { startsWith } from '../../src/helpers/string-utils';

const { test, module } = QUnit;
const name = 'trusted-replace-fetch-response';

const FETCH_OBJECTS_PATH = './test-files';
const nativeFetch = fetch;
const nativeConsole = console.log;
const nativeResponseJson = Response.prototype.json;

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    fetch = nativeFetch; // eslint-disable-line no-global-assign
    console.log = nativeConsole;
    Response.prototype.json = nativeResponseJson;
};

module(name, { beforeEach, afterEach });

const isSupported = typeof fetch !== 'undefined' && typeof Proxy !== 'undefined' && typeof Response !== 'undefined';

if (!isSupported) {
    test('unsupported', (assert) => {
        assert.ok(true, 'Browser does not support it');
    });
} else {
    test('No arguments, no replacement, logging', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
        const TEST_METHOD = 'GET';
        const init = {
            method: TEST_METHOD,
        };
        const expectedJson = {
            a1: 1,
            b2: 'test',
            c3: 3,
        };
        const done = assert.async();

        // mock console.log function for log checking
        console.log = function log(input) {
            if (input.indexOf('trace') > -1) {
                return;
            }
            // eslint-disable-next-line max-len
            const EXPECTED_LOG_STR_START = `fetch( url:"${INPUT_JSON_PATH}" method:"${TEST_METHOD}"`;
            assert.ok(startsWith(input, EXPECTED_LOG_STR_START), 'console.hit input');
        };

        // no args -> just logging, no replacements
        runScriptlet(name);

        const response = await fetch(INPUT_JSON_PATH, init);
        const actualJson = await response.json();

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.deepEqual(actualJson, expectedJson);
        done();
    });

    test('Match all requests, replace by substring', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
        const TEST_METHOD = 'GET';
        const init = {
            method: TEST_METHOD,
        };

        const done = assert.async();

        const PATTERN = 'test';
        const REPLACEMENT = 'new content';
        runScriptlet(name, [PATTERN, REPLACEMENT]);

        const response = await fetch(INPUT_JSON_PATH, init);
        const actualJson = await response.json();

        const textContent = JSON.stringify(actualJson);

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.notOk(textContent.includes(PATTERN), 'Pattern is removed');
        assert.ok(textContent.includes(REPLACEMENT), 'New content is set');
        done();
    });

    test('Match all requests, replace by regex', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
        const TEST_METHOD = 'GET';
        const init = {
            method: TEST_METHOD,
        };

        const done = assert.async();

        const PATTERN = /test/;
        const REPLACEMENT = 'new content';
        runScriptlet(name, [PATTERN, REPLACEMENT]);

        const response = await fetch(INPUT_JSON_PATH, init);
        const actualJson = await response.json();

        const textContent = JSON.stringify(actualJson);

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.notOk(PATTERN.test(textContent), 'Pattern is removed');
        assert.ok(textContent.includes(REPLACEMENT), 'New content is set');
        done();
    });

    test('Match request by url and method, remove all text content', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
        const TEST_METHOD = 'GET';
        const init = {
            method: TEST_METHOD,
        };

        const done = assert.async();

        const PATTERN = '';
        const REPLACEMENT = '';
        const PROPS_TO_MATCH = 'test01 method:GET';
        runScriptlet(name, [PATTERN, REPLACEMENT, PROPS_TO_MATCH]);

        const response = await fetch(INPUT_JSON_PATH, init);
        const actualTextContent = await response.text();

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.strictEqual(actualTextContent, '', 'Content is removed');
        done();
    });

    test('Unmatched request\'s content is not modified', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
        const TEST_METHOD = 'GET';
        const init = {
            method: TEST_METHOD,
        };

        const expectedJson = {
            a1: 1,
            b2: 'test',
            c3: 3,
        };

        const PATTERN = '';
        const REPLACEMENT = '';
        const PROPS_TO_MATCH = 'test99 method:POST';
        runScriptlet(name, [PATTERN, REPLACEMENT, PROPS_TO_MATCH]);

        const done = assert.async();
        const response = await fetch(INPUT_JSON_PATH, init);
        const actualJson = await response.json();

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.deepEqual(actualJson, expectedJson, 'Content is intact');
        done();
    });

    test('Forged response props are copied properly', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
        const TEST_METHOD = 'GET';
        const init = {
            method: TEST_METHOD,
        };

        const done = assert.async();

        const PATTERN = '';
        const REPLACEMENT = '';
        const PROPS_TO_MATCH = 'test01 method:GET';

        const expectedResponse = await fetch(INPUT_JSON_PATH, init);

        runScriptlet(name, [PATTERN, REPLACEMENT, PROPS_TO_MATCH]);

        const actualResponse = await fetch(INPUT_JSON_PATH, init);

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

        const {
            bodyUsedExpected,
            headersExpected,
            okExpected,
            redirectedExpected,
            statusExpected,
            statusTextExpected,
            typeExpected,
            urlExpected,
        } = expectedResponse;

        const {
            bodyUsed,
            headers,
            ok,
            redirected,
            status,
            statusText,
            type,
            url,
        } = actualResponse;

        assert.strictEqual(bodyUsed, bodyUsedExpected, 'response prop is copied');
        assert.strictEqual(headers, headersExpected, 'response prop is copied');
        assert.strictEqual(ok, okExpected, 'response prop is copied');
        assert.strictEqual(redirected, redirectedExpected, 'response prop is copied');
        assert.strictEqual(status, statusExpected, 'response prop is copied');
        assert.strictEqual(statusText, statusTextExpected, 'response prop is copied');
        assert.strictEqual(type, typeExpected, 'response prop is copied');
        assert.strictEqual(url, urlExpected, 'response prop is copied');
        done();
    });
}
