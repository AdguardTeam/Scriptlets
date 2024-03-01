/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'json-prune-fetch-response';

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
    test('Checking if alias name works', (assert) => {
        const adgParams = {
            name,
            engine: 'test',
            verbose: true,
        };
        const uboParams = {
            name: 'ubo-json-prune-fetch-response.js',
            engine: 'test',
            verbose: true,
        };

        const codeByAdgParams = window.scriptlets.invoke(adgParams);
        const codeByUboParams = window.scriptlets.invoke(uboParams);

        assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
    });

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
        console.log = function log(inputName, inputValue) {
            if (inputName.includes('trace')) {
                return;
            }
            console.debug(inputName, inputValue);
            const EXPECTED_LOG_STR_START = 'json-prune-fetch-response:';
            assert.deepEqual(inputValue, expectedJson);
            assert.ok(inputName.startsWith(EXPECTED_LOG_STR_START), 'console.hit input');
        };

        // no args -> just logging, no replacements
        runScriptlet(name);

        const response = await fetch(INPUT_JSON_PATH, init);
        const actualJson = await response.json();

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.deepEqual(actualJson, expectedJson);
        done();
    });

    test('Match request, prune object', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
        const TEST_METHOD = 'GET';
        const init = {
            method: TEST_METHOD,
        };

        const done = assert.async();

        const PROPS_TO_REMOVE = 'b2';
        const PATTERN = 'test01.json';
        runScriptlet(name, [PROPS_TO_REMOVE, '', PATTERN]);

        const response = await fetch(INPUT_JSON_PATH, init);
        const actualJson = await response.json();

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.strictEqual(actualJson.a1, 1, '"a1" not changed');
        assert.strictEqual(actualJson[PROPS_TO_REMOVE], undefined, '"b2" has been removed');
        done();
    });

    test('Match request, prune object, regexp URL', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test03.json`;
        const TEST_METHOD = 'GET';
        const init = {
            method: TEST_METHOD,
        };

        const done = assert.async();

        const PROPS_TO_REMOVE = 'cc.src';
        const PATTERN = '/test/';
        runScriptlet(name, [PROPS_TO_REMOVE, '', PATTERN]);

        const response = await fetch(INPUT_JSON_PATH, init);
        const actualJson = await response.json();

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.strictEqual(actualJson.cc.id, 0, '"cc.id" not changed');
        assert.strictEqual(actualJson.cc.src, undefined, '"cc.src" has been removed');
        done();
    });

    test('Match request by url and method, prune object + required props', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test04.json`;
        const TEST_METHOD = 'GET';
        const init = {
            method: TEST_METHOD,
        };

        const done = assert.async();

        const PROPS_TO_REMOVE = 'cc1.arr';
        const INITIAL_PROPS = 'bc';
        const PROPS_TO_MATCH = 'test04 method:GET';
        runScriptlet(name, [PROPS_TO_REMOVE, INITIAL_PROPS, PROPS_TO_MATCH]);

        const response = await fetch(INPUT_JSON_PATH, init);
        const actualJson = await response.json();

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.strictEqual(actualJson.cc1.arr, undefined, 'Content is removed');
        done();
    });

    test('Match request by url and method, do not prune, required props not match', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test04.json`;
        const TEST_METHOD = 'GET';
        const init = {
            method: TEST_METHOD,
        };

        const done = assert.async();

        const expectedJson = {
            ab: 'test',
            bc: 123,
            cc1: {
                id: 0,
                src: 'example.org',
                arr: [
                    { inner1: 123 },
                    { inner2: 456 },
                ],
            },
        };

        const PROPS_TO_REMOVE = 'cc1.arr';
        const INITIAL_PROPS = 'foo';
        const PROPS_TO_MATCH = 'test04 method:GET';
        runScriptlet(name, [PROPS_TO_REMOVE, INITIAL_PROPS, PROPS_TO_MATCH]);

        const response = await fetch(INPUT_JSON_PATH, init);
        const actualJson = await response.json();

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.deepEqual(actualJson, expectedJson, 'Content is intact');
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

        const PROPS_TO_REMOVE = 'a1';
        const PROPS_TO_MATCH = 'test99 method:POST';
        runScriptlet(name, [PROPS_TO_REMOVE, '', PROPS_TO_MATCH]);

        const done = assert.async();
        const response = await fetch(INPUT_JSON_PATH, init);
        const actualJson = await response.json();

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

        const PROPS_TO_REMOVE = '*';
        const PROPS_TO_MATCH = 'test01 method:GET';

        const expectedResponse = await fetch(INPUT_JSON_PATH, init);

        runScriptlet(name, [PROPS_TO_REMOVE, '', PROPS_TO_MATCH]);

        const actualResponse = await fetch(INPUT_JSON_PATH, init);

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

        const {
            ok: okExpected,
            redirected: redirectedExpected,
            status: statusExpected,
            statusText: statusTextExpected,
            type: typeExpected,
            url: urlExpected,
        } = expectedResponse;

        const {
            ok,
            redirected,
            status,
            statusText,
            type,
            url,
        } = actualResponse;

        assert.strictEqual(ok, okExpected, 'response prop is copied');
        assert.strictEqual(redirected, redirectedExpected, 'response prop is copied');
        assert.strictEqual(status, statusExpected, 'response prop is copied');
        assert.strictEqual(statusText, statusTextExpected, 'response prop is copied');
        assert.strictEqual(type, typeExpected, 'response prop is copied');
        assert.strictEqual(url, urlExpected, 'response prop is copied');
        done();
    });

    test('Data URL request, URL set by Object.defineProperty, content should NOT be replaced', async (assert) => {
        const JSON_CONTENT = '{"adPlacements":true,"playerAds":true,}';
        const BASE64 = btoa(JSON_CONTENT);
        const DATA_REQUEST = `data:application/json;base64,${BASE64}`;
        const REQUEST = new Request(DATA_REQUEST);
        Object.defineProperty(REQUEST, 'url', {
            get() {
                return 'https://www.example.org/ad_url_test';
            },
        });
        Object.defineProperty(REQUEST, 'method', {
            get() {
                return 'POST';
            },
        });
        Object.defineProperty(REQUEST, 'bodyUsed', {
            get() {
                return !0;
            },
        });
        Object.defineProperty(REQUEST, 'mode', {
            get() {
                return 'same-origin';
            },
        });
        Object.defineProperty(REQUEST, 'body', {
            get() {
                return new ReadableStream();
            },
        });

        const done = assert.async();

        const PROPS_TO_REMOVE = 'adPlacements';
        const PROPS_TO_MATCH = 'ad_url_test';
        runScriptlet(name, [PROPS_TO_REMOVE, '', PROPS_TO_MATCH]);

        const response = await fetch(REQUEST);
        const actualTextContent = await response.text();

        assert.strictEqual(actualTextContent, JSON_CONTENT, 'Content is intact');
        done();
    });

    test('Request is not JSON', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/empty.html`;
        const TEST_METHOD = 'GET';
        const init = {
            method: TEST_METHOD,
        };

        const done = assert.async();

        // mock console.log function for log checking
        console.log = function log(input) {
            if (input.includes('trace')) {
                return;
            }
            console.debug(input);
            const EXPECTED_LOG_INCLUDES = 'Response body can\'t be converted to json:';
            assert.ok(input.includes(EXPECTED_LOG_INCLUDES), 'console.hit input');
        };

        const PROPS_TO_REMOVE = 'b2';
        const PATTERN = 'empty';
        runScriptlet(name, [PROPS_TO_REMOVE, '', PATTERN]);

        const response = await fetch(INPUT_JSON_PATH, init);
        const actualTextContent = await response.text();

        assert.ok(actualTextContent.includes('lang="en"'), 'Content correctly fetched');
        done();
    });

    test('Match stack trace - prune content', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
        const TEST_METHOD = 'GET';
        const init = {
            method: TEST_METHOD,
        };

        const expectedJson = {
            b2: 'test',
            c3: 3,
        };

        const PROPS_TO_REMOVE = 'a1';
        const PROPS_TO_MATCH = 'test01';
        const STACK = 'getContentFunc';
        runScriptlet(name, [PROPS_TO_REMOVE, '', PROPS_TO_MATCH, STACK]);

        const done = assert.async();
        const getContentFunc = async () => {
            const response = await fetch(INPUT_JSON_PATH, init);
            const actualJson = await response.json();
            return actualJson;
        };

        const result = await getContentFunc();
        assert.deepEqual(result, expectedJson, 'Content pruned');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('Stack trace not matched - do not prune content', async (assert) => {
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

        const PROPS_TO_REMOVE = 'a1';
        const PROPS_TO_MATCH = 'test01';
        const STACK = 'stack_do_not_match';
        runScriptlet(name, [PROPS_TO_REMOVE, '', PROPS_TO_MATCH, STACK]);

        const done = assert.async();
        const getContentFunc = async () => {
            const response = await fetch(INPUT_JSON_PATH, init);
            const actualJson = await response.json();
            return actualJson;
        };

        const result = await getContentFunc();
        assert.deepEqual(result, expectedJson, 'Content is intact');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });
}
