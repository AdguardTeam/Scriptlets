/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';
import { isEmptyObject } from '../../src/helpers/object-utils';

const { test, module } = QUnit;
const name = 'prevent-fetch';

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

// TODO: add testcases with POST requests
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
            name: 'ubo-no-fetch-if.js',
            engine: 'test',
            verbose: true,
        };

        const codeByAdgParams = window.scriptlets.invoke(adgParams);
        const codeByUboParams = window.scriptlets.invoke(uboParams);

        assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
    });

    test('simple fetch - no args - logging', async (assert) => {
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
            if (input.includes('trace')) {
                return;
            }
            const EXPECTED_LOG_STR_START = `${name}: fetch( url:"${INPUT_JSON_PATH}" method:"${TEST_METHOD}"`;
            assert.ok(input.startsWith(EXPECTED_LOG_STR_START), 'console.hit input');
        };

        // no args -> just logging, no preventing
        runScriptlet(name);

        const response = await fetch(INPUT_JSON_PATH, init);
        const actualJson = await response.json();

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.deepEqual(actualJson, expectedJson);
        done();
    });

    test('simple fetch - no match props - no prevent', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
        const init = {
            method: 'GET',
        };
        const expectedJson = {
            a1: 1,
            b2: 'test',
            c3: 3,
        };

        // no url match
        runScriptlet(name, ['/test06/ method:POST']);
        const done = assert.async();

        const response = await fetch(INPUT_JSON_PATH, init);
        const actualJson = await response.json();

        assert.deepEqual(actualJson, expectedJson);
        assert.strictEqual(window.hit, undefined, 'hit should not fire');
        done();
    });

    test('prevent any fetch call', async (assert) => {
        const INPUT_JSON_PATH_1 = `${FETCH_OBJECTS_PATH}/test01.json`;
        const inputRequest1 = new Request(INPUT_JSON_PATH_1);

        const INPUT_JSON_PATH_2 = `${FETCH_OBJECTS_PATH}/test02.json`;
        const init2 = {
            method: 'GET',
        };

        const inputRequest2 = new Request(INPUT_JSON_PATH_2, init2);

        // match any fetch
        runScriptlet(name, ['*']);
        const done = assert.async(2);

        const response1 = await fetch(inputRequest1);
        const parsedData1 = await response1.json();

        assert.ok(isEmptyObject(parsedData1), 'Response is mocked');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
        // remove 'hit' property for following checking
        clearGlobalProps('hit');

        const response2 = await fetch(inputRequest2);
        const parsedData2 = await response2.json();

        assert.ok(isEmptyObject(parsedData2), 'Response is mocked');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('prevent not existing fetch call', async (assert) => {
        // blocked_request.json doesn't exist,
        // it's required for test for blocked requests
        const BLOCKED_REQUEST = `${FETCH_OBJECTS_PATH}/blocked_request.json`;
        const inputRequest = new Request(BLOCKED_REQUEST);

        runScriptlet(name, ['blocked_request']);
        const done = assert.async(1);

        const response = await fetch(inputRequest);
        const parsedData = await response.json();

        if (!response.ok) {
            assert.strictEqual(response.ok, true, 'Request blocked');
            done();
        }
        assert.ok(response.url.includes('/blocked_request.json'), 'Response URL is mocked');
        assert.ok(isEmptyObject(parsedData), 'Response is mocked');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('simple fetch - match single pair prop', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test03.json`;
        const options = {
            method: 'HEAD',
        };

        runScriptlet(name, ['method:HEAD']);
        const done = assert.async();

        const response = await fetch(INPUT_JSON_PATH, options);
        const parsedData = await response.json();

        assert.ok(isEmptyObject(parsedData), 'Response is mocked');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('simple fetch - match few props', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test04.json`;
        const init = {
            method: 'POST',
        };

        runScriptlet(name, ['/test04/ method:POST']);
        const done = assert.async();

        const response = await fetch(INPUT_JSON_PATH, init);
        const parsedData = await response.json();

        assert.ok(isEmptyObject(parsedData), 'Response is mocked');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch request - match few props', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test02.json`;
        const init = {
            method: 'HEAD',
        };

        const inputRequest = new Request(INPUT_JSON_PATH, init);

        runScriptlet(name, ['/02\\.json/ method:/GET|HEAD/']);
        const done = assert.async();

        const response = await fetch(inputRequest);
        const parsedData = await response.json();

        assert.ok(isEmptyObject(parsedData), 'Response is mocked');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch request - no match at all', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
        const init = {
            method: 'GET',
        };

        const inputRequest = new Request(INPUT_JSON_PATH, init);
        const expectedJson = {
            a1: 1,
            b2: 'test',
            c3: 3,
        };

        // no match at all
        runScriptlet(name, ['/06\\.json/ method:/HEAD|POST/']);
        const done = assert.async();

        const response = await fetch(inputRequest);
        const actualJson = await response.json();

        assert.deepEqual(actualJson, expectedJson);
        assert.strictEqual(window.hit, undefined, 'hit should not fire');
        done();
    });

    test('fetch request - no match - invalid regexp pattern', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
        const init = {
            method: 'GET',
        };

        const inputRequest = new Request(INPUT_JSON_PATH, init);
        const expectedJson = {
            a1: 1,
            b2: 'test',
            c3: 3,
        };

        // no match at all
        runScriptlet(name, ['/\\/ method:/*/']);
        const done = assert.async();

        const response = await fetch(inputRequest);
        const actualJson = await response.json();

        assert.deepEqual(actualJson, expectedJson);
        assert.strictEqual(window.hit, undefined, 'hit should not fire');
        done();
    });

    test('prevent all, fetch returns empty array', async (assert) => {
        const INPUT_JSON_PATH_1 = `${FETCH_OBJECTS_PATH}/test01.json`;
        const inputRequest1 = new Request(INPUT_JSON_PATH_1);

        // match any fetch
        runScriptlet(name, ['*', 'emptyArr']);
        const done = assert.async();

        const response = await fetch(inputRequest1);
        const parsedData = await response.json();

        assert.ok(Array.isArray(parsedData) && parsedData.length === 0, 'Response is empty array');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('simple fetch - returns empty string', async (assert) => {
        const INPUT_JSON_PATH_1 = `${FETCH_OBJECTS_PATH}/test01.json`;
        const inputRequest1 = new Request(INPUT_JSON_PATH_1);

        runScriptlet(name, ['test01', 'emptyStr']);
        const done = assert.async();

        const response = await fetch(inputRequest1);
        const parsedData = await response.text();
        assert.strictEqual(parsedData, '', 'Response is empty string');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('simple fetch - valid response type', async (assert) => {
        const OPAQUE_RESPONSE_TYPE = 'opaque';
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
        const init = {
            method: 'GET',
        };

        runScriptlet(name, ['*', '', OPAQUE_RESPONSE_TYPE]);
        const done = assert.async();

        const response = await fetch(INPUT_JSON_PATH, init);

        assert.strictEqual(response.type, OPAQUE_RESPONSE_TYPE, 'Response type is set');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('simple fetch - valid response type', async (assert) => {
        const OPAQUE_RESPONSE_TYPE = 'opaque';
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
        const init = {
            method: 'GET',
        };

        runScriptlet(name, ['*', '', OPAQUE_RESPONSE_TYPE]);
        const done = assert.async();

        const response = await fetch(INPUT_JSON_PATH, init);

        assert.strictEqual(response.type, OPAQUE_RESPONSE_TYPE, 'Response type is set');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('simple fetch - opaque response type', async (assert) => {
        const OPAQUE_RESPONSE_TYPE = 'opaque';
        // blocked_request.json doesn't exist,
        // it's required for test for blocked requests
        const BLOCKED_REQUEST = `${FETCH_OBJECTS_PATH}/blocked_request.json`;

        runScriptlet(name, ['blocked_request', '', OPAQUE_RESPONSE_TYPE]);
        const done = assert.async();

        const response = await fetch(BLOCKED_REQUEST);

        assert.strictEqual(response.type, OPAQUE_RESPONSE_TYPE, 'Response type is set');
        assert.strictEqual(response.status, 0, 'Response status is set to 0');
        assert.strictEqual(response.statusText, '', 'Response statusText is set to empty string');
        assert.strictEqual(response.body, null, 'Response body is set to null');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('simple fetch - invalid response type', async (assert) => {
        const INVALID_RESPONSE_TYPE = 'invalid_type';
        const BASIC_RESPONSE_TYPE = 'basic';
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
        const init = {
            method: 'GET',
        };

        const expectedJson = {
            a1: 1,
            b2: 'test',
            c3: 3,
        };

        runScriptlet(name, ['*', '', INVALID_RESPONSE_TYPE]);
        const done = assert.async();

        const response = await fetch(INPUT_JSON_PATH, init);
        const actualJson = await response.json();

        assert.deepEqual(actualJson, expectedJson, 'Request is not modified');

        assert.strictEqual(response.type, BASIC_RESPONSE_TYPE, 'Response type is not modified');
        assert.strictEqual(window.hit, undefined, 'hit function fired');
        done();
    });

    test('simple fetch -- all original response properties are not modified', async (assert) => {
        const TEST_FILE_NAME = 'test01.json';
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/${TEST_FILE_NAME}`;
        const inputRequest1 = new Request(INPUT_JSON_PATH);
        const done = assert.async();

        runScriptlet(name, ['*']);

        const response = await fetch(inputRequest1);

        /**
         * Previously, only one header was present in the returned response
         * which was `content-type: text/plain;charset=UTF-8`.
         * Since we are not modifying the headers, we expect to receive more than one header.
         * We cannot check the exact headers and their values
         * because the response may contain different headers
         * depending on whether the tests are run in Node or in a browser.
         */
        let headersCount = 0;
        // eslint-disable-next-line no-unused-vars
        for (const key of response.headers.keys()) {
            headersCount += 1;
        }

        assert.strictEqual(response.type, 'basic', 'response type is "basic" by default, not modified');
        assert.true(response.url.includes(TEST_FILE_NAME), 'response url not modified');
        assert.true(headersCount > 1, 'original headers not modified');

        const responseJsonData = await response.json();
        assert.ok(isEmptyObject(responseJsonData), 'response data is mocked');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('simple fetch -- original response properties are not modified except type', async (assert) => {
        const TEST_FILE_NAME = 'test01.json';
        const TEST_RESPONSE_TYPE = 'opaque';
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/${TEST_FILE_NAME}`;
        const inputRequest1 = new Request(INPUT_JSON_PATH);
        const done = assert.async();

        runScriptlet(name, ['*', 'emptyArr', TEST_RESPONSE_TYPE]);

        const response = await fetch(inputRequest1);

        let headersCount = 0;
        // eslint-disable-next-line no-unused-vars
        for (const key of response.headers.keys()) {
            headersCount += 1;
        }

        assert.strictEqual(
            response.type,
            TEST_RESPONSE_TYPE,
            `response type is modified, equals to ${TEST_RESPONSE_TYPE}`,
        );
        assert.true(response.url.includes(TEST_FILE_NAME), 'response url not modified');
        assert.true(headersCount > 1, 'original headers not modified');

        const responseJsonData = await response.json();
        assert.ok(
            Array.isArray(responseJsonData) && responseJsonData.length === 0,
            'response data is an empty array',
        );
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });
}
