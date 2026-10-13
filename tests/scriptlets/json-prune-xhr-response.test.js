/* eslint-disable no-underscore-dangle, no-console */
import {
    runScriptlet,
    clearGlobalProps,
    countCreatedErrors,
    getLogs,
    getSyncLogs,
    useFirefoxStackTraceFormat,
    useThrowingErrorConstructor,
    useUnreadableStackTrace,
    sleep,
} from '../helpers';

const { test, module } = QUnit;
const name = 'json-prune-xhr-response';

const FETCH_OBJECTS_PATH = './test-files';
const nativeXhrOpen = XMLHttpRequest.prototype.open;
const nativeXhrSend = XMLHttpRequest.prototype.send;
const nativeXhrSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
const nativeXhrGetResponseHeader = XMLHttpRequest.prototype.getResponseHeader;
const nativeXhrGetAllResponseHeaders = XMLHttpRequest.prototype.getAllResponseHeaders;
const nativeXhrAbort = XMLHttpRequest.prototype.abort;
const nativeConsole = console.log;

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    XMLHttpRequest.prototype.open = nativeXhrOpen;
    XMLHttpRequest.prototype.send = nativeXhrSend;
    XMLHttpRequest.prototype.setRequestHeader = nativeXhrSetRequestHeader;
    XMLHttpRequest.prototype.getResponseHeader = nativeXhrGetResponseHeader;
    XMLHttpRequest.prototype.getAllResponseHeaders = nativeXhrGetAllResponseHeaders;
    XMLHttpRequest.prototype.abort = nativeXhrAbort;
    console.log = nativeConsole;
};

module(name, { beforeEach, afterEach });

/**
 * Sends the request while the stack trace cannot be created or read.
 *
 * @param {XMLHttpRequest} xhr request to send
 * @param {Function} [useStackTraceFailure] function which makes creating or reading the stack trace throw
 * and returns a function which restores it
 */
const sendWithStackTraceFailure = (xhr, useStackTraceFailure = useUnreadableStackTrace) => {
    const restoreStackTrace = useStackTraceFailure();
    try {
        xhr.send();
    } finally {
        restoreStackTrace();
    }
};

/**
 * Sends the request and waits for its `load` event.
 *
 * @param {XMLHttpRequest} xhr opened request
 * @returns {Promise<void>} promise which is resolved on `load`
 */
const sendAndWaitForLoad = (xhr) => {
    const loaded = new Promise((resolve) => {
        xhr.onload = resolve;
    });
    xhr.send();
    return loaded;
};

const isSupported = typeof Proxy !== 'undefined';

if (isSupported) {
    test('Checking if alias name works', (assert) => {
        const adgParams = {
            name,
            engine: 'test',
            verbose: true,
        };
        const uboParams = {
            name: 'ubo-json-prune-xhr-response.js',
            engine: 'test',
            verbose: true,
        };

        const codeByAdgParams = window.scriptlets.invoke(adgParams);
        const codeByUboParams = window.scriptlets.invoke(uboParams);

        assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
    });

    test('Checking if json-edit-xhr-response alias name works', (assert) => {
        const adgParams = {
            name,
            engine: 'test',
            verbose: true,
        };
        const jsonEditParams = {
            name: 'json-edit-xhr-response',
            engine: 'test',
            verbose: true,
        };

        const codeByAdgParams = window.scriptlets.invoke(adgParams);
        const codeByJsonEditParams = window.scriptlets.invoke(jsonEditParams);

        assert.strictEqual(codeByAdgParams, codeByJsonEditParams, 'json-edit-xhr-response name - ok');
    });

    test('Checking if json-edit-xhr-response.js alias name works', (assert) => {
        const adgParams = {
            name: 'json-edit-xhr-response',
            engine: 'test',
            verbose: true,
        };
        const jsonEditJsParams = {
            name: 'json-edit-xhr-response.js',
            engine: 'test',
            verbose: true,
        };

        const codeByAdgParams = window.scriptlets.invoke(adgParams);
        const codeByJsonEditJsParams = window.scriptlets.invoke(jsonEditJsParams);

        assert.strictEqual(codeByAdgParams, codeByJsonEditJsParams, 'json-edit-xhr-response.js name - ok');
    });

    test('Checking if ubo-json-edit-xhr-response alias name works', (assert) => {
        const adgParams = {
            name,
            engine: 'test',
            verbose: true,
        };
        const uboJsonEditParams = {
            name: 'ubo-json-edit-xhr-response.js',
            engine: 'test',
            verbose: true,
        };

        const codeByAdgParams = window.scriptlets.invoke(adgParams);
        const codeByUboJsonEditParams = window.scriptlets.invoke(uboJsonEditParams);

        assert.strictEqual(codeByAdgParams, codeByUboJsonEditParams, 'ubo-json-edit-xhr-response name - ok');
    });

    test('json-edit-xhr-response alias prunes object properties via $-prefixed JSONPath', async (assert) => {
        const done = assert.async();
        runScriptlet(
            'json-edit-xhr-response',
            ['$.cc[?(@.src=="example.org")].src', '', `${FETCH_OBJECTS_PATH}/test03.json`, '', 'jsonpath'],
        );

        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test03.json`);
        xhr.onload = () => {
            assert.strictEqual(xhr.response.cc.src, undefined, '"cc.src" has been removed in jsonpath mode');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.responseType = 'json';
        xhr.send();
    });

    test('json-edit-xhr-response alias prunes object properties via dot-prefixed JSONPath', async (assert) => {
        const done = assert.async();
        runScriptlet(
            'json-edit-xhr-response',
            ['.cc.src', '', `${FETCH_OBJECTS_PATH}/test03.json`],
        );

        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test03.json`);
        xhr.onload = () => {
            assert.strictEqual(xhr.response.cc.src, undefined, '"cc.src" has been removed in jsonpath mode');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.responseType = 'json';
        xhr.send();
    });

    test('json-edit-xhr-response alias does not support setting values', async (assert) => {
        assert.expect(3);
        const done = assert.async();
        runScriptlet(
            'json-edit-xhr-response',
            ['$.cc[?(@.src=="example.org")].src=test.com', '', `${FETCH_OBJECTS_PATH}/test03.json`, '', 'jsonpath'],
        );

        const message = 'JSONPath set and append operations are allowed only in trusted scriptlets';

        // mock console.log function for log checking
        console.log = function log(input) {
            if (input.includes('trace')) {
                return;
            }
            console.debug(input);
            assert.ok(input.includes(message), 'should log message in console');
        };
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test03.json`);
        xhr.onload = () => {
            assert.strictEqual(xhr.response.cc.src, 'example.org', 'Content correctly fetched and not modified');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.responseType = 'json';
        xhr.send();
    });

    test('No args, logging', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const ASYNC = true;
        const USER = 'user';
        const PASSWORD = 'password';

        const expectedJson = {
            a1: 1,
            b2: 'test',
            c3: 3,
        };

        const done = assert.async();

        // mock console.log function for log checking
        console.log = function log(inputName, inputValue) {
            if (inputName.includes('trace') || !inputValue) {
                return;
            }
            console.debug(inputName, inputValue);
            const EXPECTED_LOG_STR_START = `${name}:`;
            assert.deepEqual(inputValue, expectedJson);
            assert.ok(inputName.startsWith(EXPECTED_LOG_STR_START), 'console.hit input');
        };
        const PATTERN = '';
        const REPLACEMENT = '';

        runScriptlet(name, [PATTERN, REPLACEMENT]);

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL, ASYNC, USER, PASSWORD);
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.ok(xhr.response, 'Response data exists');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Match request - json type, prune object', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const PROPS_TO_REMOVE = 'b2';
        const MATCH_DATA = [PROPS_TO_REMOVE, '', `${URL} method:${METHOD}`];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.strictEqual(xhr.response.a1, 1, '"a1" not changed');
            assert.strictEqual(xhr.response[PROPS_TO_REMOVE], undefined, '"b2" has been removed');

            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.responseType = 'json';
        xhr.send();
    });

    test('Match request - text type, prune object', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const PROPS_TO_REMOVE = 'b2';
        const MATCH_DATA = [PROPS_TO_REMOVE, '', `${URL} method:${METHOD}`];

        const expectedResponse = '{"a1":1,"c3":3}';

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.strictEqual(xhr.response, expectedResponse, '"b2" has been removed');

            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Match request - arraybuffer type, prune object', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const PROPS_TO_REMOVE = 'b2';
        const MATCH_DATA = [PROPS_TO_REMOVE, '', `${URL} method:${METHOD}`];

        const encode = (string) => new TextEncoder().encode(string);

        const expectedResponse = encode('{"a1":1,"c3":3}');

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.strictEqual(indexedDB.cmp(xhr.response, expectedResponse), 0, '"b2" has been removed');

            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.responseType = 'arraybuffer';
        xhr.send();
    });

    test('Match request - blob type, prune object', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const PROPS_TO_REMOVE = 'b2';
        const MATCH_DATA = [PROPS_TO_REMOVE, '', `${URL} method:${METHOD}`];

        const expectedResponseString = '{"a1":1,"c3":3}';

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = async () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.ok(xhr.response instanceof Blob, 'xhr.response is Blob');
            const stringFromBlob = await xhr.response.text();
            assert.strictEqual(stringFromBlob, expectedResponseString, '"b2" has been removed');

            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.responseType = 'blob';
        xhr.send();
    });

    test('Match request - json type, prune object, regexp URL', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test03.json`;

        const PROPS_TO_REMOVE = 'cc.src';
        const PATTERN = '/test/';
        const MATCH_DATA = [PROPS_TO_REMOVE, '', PATTERN];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.strictEqual(xhr.response.cc.id, 0, '"cc.id" not changed');
            assert.strictEqual(xhr.response.cc.src, undefined, '"cc.src" has been removed');

            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.responseType = 'json';
        xhr.send();
    });

    test('JSONPath mode prunes object properties from xhr response', async (assert) => {
        const done = assert.async();
        runScriptlet(
            name,
            ['$.cc[?(@.src=="example.org")].src', '', `${FETCH_OBJECTS_PATH}/test03.json`, '', 'jsonpath'],
        );

        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test03.json`);
        xhr.onload = () => {
            assert.strictEqual(xhr.response.cc.src, undefined, '"cc.src" has been removed in jsonpath mode');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.responseType = 'json';
        xhr.send();
    });

    test('Request is not modified because json-prune-xhr does not support setting values', async (assert) => {
        assert.expect(3);
        const done = assert.async();
        runScriptlet(
            name,
            ['$.cc[?(@.src=="example.org")].src=test.com', '', `${FETCH_OBJECTS_PATH}/test03.json`, '', 'jsonpath'],
        );

        const message = 'JSONPath set and append operations are allowed only in trusted scriptlets';

        // mock console.log function for log checking
        console.log = function log(input) {
            if (input.includes('trace')) {
                return;
            }
            console.debug(input);
            assert.ok(input.includes(message), 'should log message in console');
        };
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test03.json`);
        xhr.onload = () => {
            assert.strictEqual(xhr.response.cc.src, 'example.org', 'Content correctly fetched and not modified');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.responseType = 'json';
        xhr.send();
    });

    test('Match request by url and method - json type, prune object + required props', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test04.json`;

        const PROPS_TO_REMOVE = 'cc1.arr';
        const INITIAL_PROPS = 'bc';
        const PROPS_TO_MATCH = 'test04 method:GET';
        runScriptlet(name, [PROPS_TO_REMOVE, INITIAL_PROPS, PROPS_TO_MATCH]);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.strictEqual(xhr.response.ab, 'test', '"ab" not changed');
            assert.strictEqual(xhr.response.cc1.arr, undefined, 'Content is removed');

            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.responseType = 'json';
        xhr.send();
    });

    test('Not matched, response and responseText are intact', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const PATTERN = 'a1';
        const REPLACEMENT = 'x';
        const MATCH_DATA = [
            PATTERN,
            REPLACEMENT,
            `${FETCH_OBJECTS_PATH}/not_test01.json method:${METHOD}`,
        ];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.notOk(xhr.response.includes(REPLACEMENT), 'Response is intact');
            assert.notOk(xhr.responseText.includes(REPLACEMENT), 'Response text is intact');

            assert.strictEqual(window.hit, undefined, 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Matched, listeners after .send work', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const PROPS_TO_REMOVE = 'a1';
        const MATCH_DATA = [PROPS_TO_REMOVE, '', `${URL} method:${METHOD}`];

        runScriptlet(name, MATCH_DATA);

        const done1 = assert.async();
        const done2 = assert.async();
        const done3 = assert.async();
        assert.expect(0);

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.send();
        xhr.addEventListener('load', () => {
            done1();
        });
        xhr.onload = () => {
            done2();
        };
        xhr.addEventListener('loadend', () => {
            done3();
        });
    });

    test('Works correctly with different parallel XHR requests', async (assert) => {
        const URL_TO_PASS = `${FETCH_OBJECTS_PATH}/test02.json`;
        const INTACT_RESPONSE_PART = 'test';

        const METHOD = 'GET';
        const URL_TO_BLOCK = `${FETCH_OBJECTS_PATH}/test01.json`;
        const PROPS_TO_REMOVE = '*';
        const MATCH_DATA = [PROPS_TO_REMOVE, '', 'test01'];

        runScriptlet(name, MATCH_DATA);

        const done1 = assert.async();
        const done2 = assert.async();

        const xhr1 = new XMLHttpRequest();
        const xhr2 = new XMLHttpRequest();

        xhr1.open(METHOD, URL_TO_PASS);
        xhr2.open(METHOD, URL_TO_BLOCK);

        xhr1.onload = () => {
            assert.strictEqual(xhr1.readyState, 4, 'Response done');
            assert.ok(xhr1.response.includes(INTACT_RESPONSE_PART), 'Response is intact');
            done1();
        };

        xhr2.onload = () => {
            assert.strictEqual(xhr2.readyState, 4, 'Response done');
            assert.ok(xhr2.response === '{}', 'Response has been removed');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done2();
        };

        xhr1.send();
        // use timeout to avoid hit collisions
        setTimeout(() => xhr2.send(), 1);
    });

    test('Matched, string pattern, 2 separated scriptlets for the same request, test headers', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const HEADER_NAME_1 = 'first-header';
        const HEADER_VALUE_1 = 'foo';
        const HEADER_NAME_2 = 'second-header';
        const HEADER_VALUE_2 = 'bar';
        const HEADER_NAME_3 = 'test-header';
        const HEADER_VALUE_3 = '123';
        const PROPS_TO_REMOVE_1 = 'a1';
        const MATCH_DATA_1 = [PROPS_TO_REMOVE_1, '', `${URL} method:${METHOD}`];

        const PROPS_TO_REMOVE_2 = 'b2';
        const MATCH_DATA_2 = [PROPS_TO_REMOVE_2, '', `${URL} method:${METHOD}`];

        const EXPECTED_RESPONSE = '{"c3":3}';

        runScriptlet(name, MATCH_DATA_1);
        runScriptlet(name, MATCH_DATA_2);

        const done1 = assert.async();
        const done2 = assert.async();

        const xhr1 = new XMLHttpRequest();
        const xhr2 = new XMLHttpRequest();

        xhr1.open(METHOD, URL);
        xhr2.open(METHOD, URL);

        xhr1.setRequestHeader(HEADER_NAME_1, HEADER_VALUE_1);
        xhr2.setRequestHeader(HEADER_NAME_1, HEADER_VALUE_1);

        xhr1.setRequestHeader(HEADER_NAME_2, HEADER_VALUE_2);
        xhr2.setRequestHeader(HEADER_NAME_2, HEADER_VALUE_2);

        xhr1.setRequestHeader(HEADER_NAME_3, HEADER_VALUE_3);
        xhr2.setRequestHeader(HEADER_NAME_3, HEADER_VALUE_3);
        xhr1.setRequestHeader(HEADER_NAME_3, HEADER_VALUE_3);
        xhr2.setRequestHeader(HEADER_NAME_3, HEADER_VALUE_3);

        xhr1.onload = () => {
            xhr1.getAllResponseHeaders();
            assert.strictEqual(xhr1.readyState, 4, 'Response done');
            assert.strictEqual(xhr1.response, EXPECTED_RESPONSE, '"a1" has been removed');

            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done1();
        };

        xhr2.onload = () => {
            assert.strictEqual(xhr2.readyState, 4, 'Response done');
            assert.strictEqual(xhr2.response, EXPECTED_RESPONSE, '"b2" has been removed');

            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done2();
        };

        xhr1.send();
        setTimeout(() => xhr2.send(), 1);
    });

    test('Match stack trace - prune content', async (assert) => {
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const METHOD = 'GET';

        const expectedJson = {
            b2: 'test',
            c3: 3,
        };

        const PROPS_TO_REMOVE = 'a1';
        const PROPS_TO_MATCH = 'test01';
        const STACK = 'getContentFunc';
        runScriptlet(name, [PROPS_TO_REMOVE, '', PROPS_TO_MATCH, STACK]);

        const done = assert.async();
        const getContentFunc = () => {
            let actualJson;
            const xhr = new XMLHttpRequest();
            xhr.open(METHOD, URL);
            xhr.onload = () => {
                actualJson = xhr.response;
                assert.deepEqual(actualJson, expectedJson, 'Content pruned');
                assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
                done();
            };
            xhr.responseType = 'json';
            xhr.send();
        };
        getContentFunc();
    });

    test('Match stack trace in Firefox stack trace format - prune content', async (assert) => {
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const METHOD = 'GET';

        const expectedJson = {
            b2: 'test',
            c3: 3,
        };

        const PROPS_TO_REMOVE = 'a1';
        const PROPS_TO_MATCH = 'test01';
        const STACK = 'getContentFunc';
        runScriptlet(name, [PROPS_TO_REMOVE, '', PROPS_TO_MATCH, STACK]);

        const done = assert.async();
        const getContentFunc = () => {
            const xhr = new XMLHttpRequest();
            xhr.open(METHOD, URL);
            xhr.onload = () => {
                assert.deepEqual(xhr.response, expectedJson, 'Content pruned');
                assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
                done();
            };
            xhr.responseType = 'json';
            xhr.send();
        };

        // Stack trace of Firefox and Safari has no error message line,
        // so the frame of the function which calls the method should not be removed as the scriptlet's own one
        const restoreStackTraceFormat = useFirefoxStackTraceFormat();
        try {
            getContentFunc();
        } finally {
            restoreStackTraceFormat();
        }
    });

    test('Stack trace not matched - do not prune content', async (assert) => {
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const METHOD = 'GET';

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
        const getContentFunc = () => {
            let actualJson;
            const xhr = new XMLHttpRequest();
            xhr.open(METHOD, URL);
            xhr.onload = () => {
                actualJson = xhr.response;
                assert.deepEqual(actualJson, expectedJson, 'Content is intact');
                done();
            };
            xhr.responseType = 'json';
            xhr.send();
        };
        getContentFunc();
    });

    test('Stack trace cannot be read - prune content without stack', async (assert) => {
        runScriptlet(name, ['a1', '', 'test01']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.onload = () => {
            assert.deepEqual(xhr.response, { b2: 'test', c3: 3 }, 'Content pruned');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.responseType = 'json';
        sendWithStackTraceFailure(xhr);
    });

    test('Stack trace cannot be read - prune content without stack - JSONPath', async (assert) => {
        runScriptlet(name, ['$.a1', '', 'test01']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.onload = () => {
            assert.deepEqual(xhr.response, { b2: 'test', c3: 3 }, 'Content pruned');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.responseType = 'json';
        sendWithStackTraceFailure(xhr);
    });

    test('Stack trace cannot be read - do not prune content with stack', async (assert) => {
        runScriptlet(name, ['a1', '', 'test01', 'getContentFunc']);

        const done = assert.async();
        const getContentFunc = () => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
            xhr.onload = () => {
                assert.deepEqual(xhr.response, { a1: 1, b2: 'test', c3: 3 }, 'Content is intact');
                assert.strictEqual(window.hit, undefined, 'hit function should not fire');
                done();
            };
            xhr.responseType = 'json';
            sendWithStackTraceFailure(xhr);
        };
        getContentFunc();
    });

    test('Error replaced by the page - prune content without stack', async (assert) => {
        runScriptlet(name, ['a1', '', 'test01']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.onload = () => {
            assert.deepEqual(xhr.response, { b2: 'test', c3: 3 }, 'Content pruned');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.responseType = 'json';
        sendWithStackTraceFailure(xhr, useThrowingErrorConstructor);
    });

    test('Stack trace is not read without stack and logging', async (assert) => {
        runScriptlet(name, ['a1', '', 'test01']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.onload = () => {
            assert.deepEqual(xhr.response, { b2: 'test', c3: 3 }, 'Content pruned');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.responseType = 'json';

        assert.strictEqual(countCreatedErrors(() => xhr.send()), 0, 'No error created for the stack trace');
    });

    test('Stack trace is read for logging', async (assert) => {
        runScriptlet(name, ['', '', 'test01']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.onload = () => {
            assert.deepEqual(JSON.parse(xhr.response), { a1: 1, b2: 'test', c3: 3 }, 'Content is intact');
            done();
        };

        assert.strictEqual(countCreatedErrors(() => xhr.send()), 1, 'Error created for the stack trace');
    });

    [
        { responseType: 'json', getJson: (response) => response, ResponseClass: Object },
        {
            responseType: 'arraybuffer',
            getJson: (response) => JSON.parse(new TextDecoder().decode(response)),
            ResponseClass: ArrayBuffer,
        },
        { responseType: 'blob', getJson: async (response) => JSON.parse(await response.text()), ResponseClass: Blob },
    ].forEach(({ responseType, getJson, ResponseClass }) => {
        test(`Logging keeps the response type of the request - ${responseType}`, async (assert) => {
            runScriptlet(name, ['', '', 'test01']);

            const xhr = new XMLHttpRequest();
            xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
            xhr.responseType = responseType;
            const loaded = new Promise((resolve) => {
                xhr.onload = resolve;
            });
            xhr.send();
            await loaded;

            assert.ok(xhr.response instanceof ResponseClass, `Response is ${ResponseClass.name}`);
            assert.deepEqual(await getJson(xhr.response), { a1: 1, b2: 'test', c3: 3 }, 'Content is intact');
        });
    });

    test('Reused XHR - prune content of each matched request', async (assert) => {
        assert.timeout(3000);
        runScriptlet(name, ['a1', '', 'test01']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        let loadsCount = 0;
        xhr.onload = () => {
            loadsCount += 1;
            assert.deepEqual(xhr.response, { b2: 'test', c3: 3 }, `Content of request ${loadsCount} pruned`);
            if (loadsCount === 2) {
                done();
                return;
            }
            xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
            xhr.responseType = 'json';
            xhr.send();
        };
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.responseType = 'json';
        xhr.send();
    });

    test('Reused XHR - native response of a request which is not matched', async (assert) => {
        assert.timeout(3000);
        runScriptlet(name, ['a1', '', 'test01']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
            assert.deepEqual(xhr.response, { b2: 'test', c3: 3 }, 'Content of the matched request pruned');

            xhr.onload = () => {
                assert.strictEqual(xhr.readyState, 4, 'Native readyState after load');
                assert.deepEqual(xhr.response, { ad: 1, src: 'test', count: 3 }, 'Native content returned');
                done();
            };
            const readyStatesDuringOpen = [];
            xhr.onreadystatechange = () => {
                readyStatesDuringOpen.push(xhr.readyState);
            };
            xhr.open('GET', `${FETCH_OBJECTS_PATH}/test02.json`);
            xhr.onreadystatechange = null;
            assert.notOk(readyStatesDuringOpen.includes(4), 'Previous readyState is not read during open()');
            assert.strictEqual(xhr.readyState, 1, 'Native readyState after open()');
            xhr.responseType = 'json';
            xhr.send();
        };
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.responseType = 'json';
        xhr.send();
    });

    test('Response of a synchronous request sent during open() is kept', (assert) => {
        assert.timeout(3000);
        runScriptlet(name, ['a1', '', 'test01']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        let isSent = false;
        // `open()` fires it synchronously, and the request may be sent in it,
        // so its response is created before `open()` returns
        xhr.onreadystatechange = () => {
            if (!isSent && xhr.readyState === 1) {
                isSent = true;
                xhr.send();
            }
        };
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'readyState of the response');
            assert.strictEqual(xhr.status, 200, 'status of the response');
            assert.strictEqual(xhr.response, '{"b2":"test","c3":3}', 'Content pruned');
            done();
        };
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`, false);
    });

    test('Reused XHR - previous response is kept if open() throws', async (assert) => {
        runScriptlet(name, ['a1', '', 'test01']);

        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.responseType = 'json';
        const loaded = new Promise((resolve) => {
            xhr.onload = resolve;
        });
        xhr.send();
        await loaded;

        // State of the object is not changed by `open()` which throws, e.g. for an invalid URL
        assert.throws(() => xhr.open('GET', 'http://['), 'open() throws for an invalid URL');
        assert.strictEqual(xhr.readyState, 4, 'readyState is kept');
        assert.strictEqual(xhr.status, 200, 'status is kept');
        assert.deepEqual(xhr.response, { b2: 'test', c3: 3 }, 'Pruned content is kept');
    });

    test('Reused XHR - headers of each matched request are sent once', async (assert) => {
        const headerCalls = [];
        // Records the headers set by the page and by the scriptlet for the forged request
        XMLHttpRequest.prototype.setRequestHeader = function setRequestHeader(...args) {
            headerCalls.push({ target: this, args });
            return Reflect.apply(nativeXhrSetRequestHeader, this, args);
        };
        runScriptlet(name, ['a1', '', 'test01']);

        const xhr = new XMLHttpRequest();
        for (let i = 0; i < 2; i += 1) {
            xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
            xhr.setRequestHeader('X-Test', `value${i}`);
            xhr.responseType = 'json';
            // eslint-disable-next-line no-await-in-loop
            await sendAndWaitForLoad(xhr);
            assert.deepEqual(xhr.response, { b2: 'test', c3: 3 }, `Content of request ${i + 1} pruned`);
        }

        const forgedHeaderCalls = headerCalls.filter(({ target }) => target !== xhr);
        assert.deepEqual(
            forgedHeaderCalls.map(({ args }) => args),
            [['X-Test', 'value0'], ['X-Test', 'value1']],
            'Header of each request set once for its forged request',
        );
        assert.notOk(Object.prototype.hasOwnProperty.call(xhr, 'setRequestHeader'), 'Object has no own method');
    });

    [
        // e.g. a library which wraps the method of each object, and calls the native one saved before
        { method: 'native method saved before', getTarget: (savedMethod) => savedMethod },
        { method: 'method of the prototype', getTarget: () => XMLHttpRequest.prototype.setRequestHeader },
    ].forEach(({ method, getTarget }) => {
        test(`Headers set by an own method of the object which calls the ${method} are sent once`, async (assert) => {
            const headerCalls = [];
            // Records the headers set by the page and by the scriptlet for the forged request
            XMLHttpRequest.prototype.setRequestHeader = function setRequestHeader(...args) {
                headerCalls.push({ target: this, args });
                return Reflect.apply(nativeXhrSetRequestHeader, this, args);
            };
            const savedMethod = XMLHttpRequest.prototype.setRequestHeader;
            runScriptlet(name, ['a1', '', 'test01']);

            const xhr = new XMLHttpRequest();
            xhr.setRequestHeader = function ownSetRequestHeader(...args) {
                return Reflect.apply(getTarget(savedMethod), this, args);
            };
            for (let i = 0; i < 2; i += 1) {
                xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
                xhr.setRequestHeader('X-Test', `value${i}`);
                xhr.responseType = 'json';
                // eslint-disable-next-line no-await-in-loop
                await sendAndWaitForLoad(xhr);
                assert.deepEqual(xhr.response, { b2: 'test', c3: 3 }, `Content of request ${i + 1} pruned`);
            }

            const forgedHeaderCalls = headerCalls.filter(({ target }) => target !== xhr);
            assert.deepEqual(
                forgedHeaderCalls.map(({ args }) => args),
                [['X-Test', 'value0'], ['X-Test', 'value1']],
                'Header of each request set once for its forged request',
            );
        });
    });

    test('toString() of the intercepted methods returns the original value', (assert) => {
        runScriptlet(name, ['a1', '', 'test01']);

        [
            { method: 'open', nativeMethod: nativeXhrOpen },
            { method: 'send', nativeMethod: nativeXhrSend },
            { method: 'setRequestHeader', nativeMethod: nativeXhrSetRequestHeader },
            { method: 'getResponseHeader', nativeMethod: nativeXhrGetResponseHeader },
            { method: 'getAllResponseHeaders', nativeMethod: nativeXhrGetAllResponseHeaders },
            { method: 'abort', nativeMethod: nativeXhrAbort },
        ].forEach(({ method, nativeMethod }) => {
            assert.notStrictEqual(XMLHttpRequest.prototype[method], nativeMethod, `${method} intercepted`);
            assert.strictEqual(
                XMLHttpRequest.prototype[method].toString(),
                nativeMethod.toString(),
                `${method}.toString() returns the original value`,
            );
        });

        const xhr = new XMLHttpRequest();
        const ownSetRequestHeader = function setRequestHeader(...args) {
            return Reflect.apply(XMLHttpRequest.prototype.setRequestHeader, this, args);
        };
        xhr.setRequestHeader = ownSetRequestHeader;
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);

        assert.notStrictEqual(xhr.setRequestHeader, ownSetRequestHeader, 'Own method of the object wrapped');
        assert.strictEqual(
            xhr.setRequestHeader.toString(),
            ownSetRequestHeader.toString(),
            'toString() of the own method returns its source',
        );
    });

    /**
     * Returns the response headers of a native request, without the ones which differ between requests.
     *
     * @param {XMLHttpRequest} xhr loaded request
     * @returns {string} response headers as returned by `getAllResponseHeaders()`
     */
    const getStableResponseHeaders = (xhr) => {
        return xhr.getAllResponseHeaders()
            .split('\r\n')
            .filter((header) => !header.startsWith('date:'))
            .join('\r\n');
    };

    test('Response headers - headers of the forged response returned', async (assert) => {
        const nativeXhr = new XMLHttpRequest();
        nativeXhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        await sendAndWaitForLoad(nativeXhr);
        runScriptlet(name, ['a1', '', 'test01']);

        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        assert.strictEqual(xhr.getResponseHeader('Content-Type'), null, 'No headers before the response');
        await sendAndWaitForLoad(xhr);

        assert.strictEqual(xhr.response, '{"b2":"test","c3":3}', 'Content pruned');
        assert.ok(xhr.getResponseHeader('Content-Type').includes('application/json'), 'Content-Type returned');
        ['Content-Type', 'content-length', 'Cache-Control'].forEach((headerName) => {
            assert.strictEqual(
                xhr.getResponseHeader(headerName),
                nativeXhr.getResponseHeader(headerName),
                `${headerName} as the native one`,
            );
        });
        assert.strictEqual(xhr.getResponseHeader('X-Missing'), null, 'null returned for a missing header');
        assert.strictEqual(getStableResponseHeaders(xhr), getStableResponseHeaders(nativeXhr), 'All headers returned');
        assert.notOk(Object.prototype.hasOwnProperty.call(xhr, 'getResponseHeader'), 'Object has no own method');
        assert.throws(() => xhr.getResponseHeader(), TypeError, 'Error of the native method thrown');

        xhr.abort();
        assert.strictEqual(xhr.getResponseHeader('Content-Type'), null, 'No headers after abort()');
        assert.strictEqual(xhr.getAllResponseHeaders(), '', 'No headers after abort()');
    });

    test('Response headers - native headers after the object is opened again', async (assert) => {
        runScriptlet(name, ['a1', '', 'test01']);

        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        await sendAndWaitForLoad(xhr);
        assert.ok(xhr.getAllResponseHeaders().length > 0, 'Headers of the forged response returned');

        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test02.json`);
        assert.strictEqual(xhr.getAllResponseHeaders(), '', 'No headers after open()');
        await sendAndWaitForLoad(xhr);
        assert.ok(xhr.getResponseHeader('Content-Type').includes('application/json'), 'Native headers returned');
    });

    test('Response headers - own methods of the object which call the methods of the prototype', async (assert) => {
        runScriptlet(name, ['a1', '', 'test01']);

        const xhr = new XMLHttpRequest();
        // e.g. a library which changes the values of headers
        xhr.getResponseHeader = function getResponseHeader(...args) {
            const value = Reflect.apply(XMLHttpRequest.prototype.getResponseHeader, this, args);
            return value && value.toUpperCase();
        };
        xhr.getAllResponseHeaders = function getAllResponseHeaders(...args) {
            return Reflect.apply(XMLHttpRequest.prototype.getAllResponseHeaders, this, args).toUpperCase();
        };
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        await sendAndWaitForLoad(xhr);

        assert.strictEqual(xhr.getResponseHeader('Content-Type'), 'APPLICATION/JSON', 'Changed header returned');
        assert.ok(xhr.getAllResponseHeaders().includes('CONTENT-TYPE: APPLICATION/JSON'), 'Changed headers returned');
    });

    test('Response headers - results of own methods of the object which hide headers are kept', async (assert) => {
        runScriptlet(name, ['a1', '', 'test01']);

        const xhr = new XMLHttpRequest();
        // e.g. a library which hides headers on purpose
        xhr.getResponseHeader = function getResponseHeader(...args) {
            if (String(args[0]).toLowerCase() === 'content-type') {
                return null;
            }
            return Reflect.apply(XMLHttpRequest.prototype.getResponseHeader, this, args);
        };
        xhr.getAllResponseHeaders = () => '';
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        await sendAndWaitForLoad(xhr);

        assert.strictEqual(xhr.getResponseHeader('Content-Type'), null, 'Hidden header not returned');
        assert.strictEqual(xhr.getResponseHeader('Cache-Control'), 'max-age=3600', 'Other headers returned');
        assert.strictEqual(xhr.getAllResponseHeaders(), '', 'Hidden headers not returned');
    });

    test('toString() of an own method of the object which is fixed by the page can be read', (assert) => {
        runScriptlet(name, ['a1', '', 'test01']);

        const xhr = new XMLHttpRequest();
        const ownSetRequestHeader = function setRequestHeader(...args) {
            return Reflect.apply(XMLHttpRequest.prototype.setRequestHeader, this, args);
        };
        const pageToString = () => 'page method';
        Object.defineProperty(ownSetRequestHeader, 'toString', {
            value: pageToString,
            writable: false,
            configurable: false,
        });
        xhr.setRequestHeader = ownSetRequestHeader;
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);

        assert.notStrictEqual(xhr.setRequestHeader, ownSetRequestHeader, 'Own method of the object wrapped');
        assert.strictEqual(xhr.setRequestHeader.toString, pageToString, 'toString of the method returned');
        assert.strictEqual(xhr.setRequestHeader.toString(), 'page method', 'toString() returns its value');
    });

    test('Result of an own method of the object which sets headers is returned', async (assert) => {
        runScriptlet(name, ['a1', '', 'test01']);

        const xhr = new XMLHttpRequest();
        // e.g. a library which chains the calls
        xhr.setRequestHeader = function setRequestHeader(...args) {
            Reflect.apply(XMLHttpRequest.prototype.setRequestHeader, this, args);
            return this;
        };
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.responseType = 'json';
        const loaded = new Promise((resolve) => {
            xhr.onload = resolve;
        });
        xhr.setRequestHeader('X-Test', 'value').send();
        await loaded;

        assert.deepEqual(xhr.response, { b2: 'test', c3: 3 }, 'Content pruned');
    });

    test('Reused XHR - methods of the object are wrapped once by multiple rules', async (assert) => {
        runScriptlet(name, ['a1', '', 'test01']);
        runScriptlet('trusted-json-set-xhr-response', ['c3', '10', '', 'test01']);

        const xhr = new XMLHttpRequest();
        const setRequestHeaderMethods = [];
        for (let i = 0; i < 3; i += 1) {
            xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
            setRequestHeaderMethods.push(xhr.setRequestHeader);
            xhr.setRequestHeader('X-Test', `value${i}`);
            xhr.responseType = 'json';
            // eslint-disable-next-line no-await-in-loop
            await sendAndWaitForLoad(xhr);
            assert.deepEqual(xhr.response, { b2: 'test', c3: 10 }, `Content of request ${i + 1} modified by both`);
        }

        assert.ok(
            setRequestHeaderMethods.every((method) => method === setRequestHeaderMethods[0]),
            'Method of the object not wrapped again',
        );
    });

    test('Forged request is created by the native constructor if the page has replaced it', async (assert) => {
        runScriptlet(name, ['a1', '', 'test01']);

        const NativeXMLHttpRequest = window.XMLHttpRequest;
        const xhr = new NativeXMLHttpRequest();
        let loaded;
        // e.g. a library which wraps requests, and uses the native constructor itself
        window.XMLHttpRequest = function FakeXMLHttpRequest() {};
        try {
            xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
            xhr.responseType = 'json';
            loaded = sendAndWaitForLoad(xhr);
        } finally {
            window.XMLHttpRequest = NativeXMLHttpRequest;
        }
        await loaded;

        assert.deepEqual(xhr.response, { b2: 'test', c3: 3 }, 'Content pruned');
    });

    test('Reused XHR - request opened again before it is sent is matched again', async (assert) => {
        runScriptlet(name, ['a1', '', 'test01']);

        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test02.json`);
        xhr.responseType = 'json';
        await sendAndWaitForLoad(xhr);

        assert.deepEqual(xhr.response, { ad: 1, src: 'test', count: 3 }, 'Native content of the second request');
        assert.strictEqual(window.hit, undefined, 'hit should not fire');
    });

    test('Reused XHR - response of the previous request is not delivered after open()', async (assert) => {
        runScriptlet(name, ['a1', '', 'test01']);

        const xhr = new XMLHttpRequest();
        let loadsCount = 0;
        xhr.addEventListener('load', () => {
            loadsCount += 1;
        });
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.responseType = 'json';
        xhr.send();

        // Opened again while the forged request is in flight
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test02.json`);
        xhr.responseType = 'json';
        await sendAndWaitForLoad(xhr);
        await sleep(200);

        assert.strictEqual(loadsCount, 1, 'Only the second request is loaded');
        assert.deepEqual(xhr.response, { ad: 1, src: 'test', count: 3 }, 'Native content of the second request');
        assert.strictEqual(window.hit, undefined, 'hit should not fire');
    });

    test('Aborted request - events of an aborted request, and its response is not delivered', async (assert) => {
        runScriptlet(name, ['a1', '', 'test01']);

        const xhr = new XMLHttpRequest();
        const events = [];
        ['readystatechange', 'load', 'abort', 'loadend'].forEach((type) => {
            xhr.addEventListener(type, () => {
                events.push(`${type}:${xhr.readyState}`);
            });
        });
        const progressEvents = [];
        ['abort', 'loadend'].forEach((type) => {
            xhr.addEventListener(type, (event) => {
                progressEvents.push(event);
            });
        });
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        events.length = 0;
        xhr.send();
        xhr.abort();

        const ABORT_EVENTS = ['readystatechange:4', 'abort:4', 'loadend:4'];
        assert.deepEqual(events, ABORT_EVENTS, 'Events of an aborted request dispatched');
        assert.ok(
            progressEvents.every((event) => event instanceof ProgressEvent && event.loaded === 0),
            'abort and loadend are progress events of zero length',
        );
        assert.strictEqual(xhr.readyState, 0, 'readyState after abort()');
        assert.strictEqual(xhr.status, 0, 'status after abort()');
        assert.strictEqual(xhr.response, '', 'response after abort()');

        await sleep(200);
        assert.deepEqual(events, ABORT_EVENTS, 'Response of the aborted request not delivered');
        assert.strictEqual(window.hit, undefined, 'hit should not fire');

        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        assert.strictEqual(xhr.readyState, 1, 'Native readyState after open()');
        xhr.responseType = 'json';
        await sendAndWaitForLoad(xhr);
        assert.deepEqual(xhr.response, { b2: 'test', c3: 3 }, 'Content of the next request pruned');
    });

    test('Aborted request - events dispatched if the props of the response cannot be defined', async (assert) => {
        runScriptlet(name, ['a1', '', 'test01']);

        const xhr = new XMLHttpRequest();
        // e.g. the props of the previous response of a reused object defined by `trusted-replace-xhr-response`,
        // which are not configurable
        Object.defineProperties(xhr, {
            readyState: { value: 4, writable: false },
            status: { value: 200, writable: false },
            response: { value: 'previous', writable: false },
            responseText: { value: 'previous', writable: false },
        });
        const events = [];
        ['readystatechange', 'abort', 'loadend'].forEach((type) => {
            xhr.addEventListener(type, () => {
                events.push(type);
            });
        });

        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        events.length = 0;
        xhr.send();
        xhr.abort();
        assert.deepEqual(events, ['readystatechange', 'abort', 'loadend'], 'Events of an aborted request dispatched');

        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        await sendAndWaitForLoad(xhr);
        events.length = 0;
        xhr.abort();
        assert.deepEqual(events, [], 'No events dispatched by abort() of a loaded request');
        assert.strictEqual(xhr.response, 'previous', 'Props which cannot be defined are kept');
    });

    /**
     * Sends a request, calls the action in a listener of the given event of its response,
     * and returns the events of the response dispatched after that, with the final `readyState`.
     *
     * @param {string} url URL of the request
     * @param {string} listenedType type of the event in whose listener the action is called
     * @param {Function} act action, e.g. opening the object again
     * @returns {Promise<string[]>} types of the dispatched events, and the final `readyState`
     */
    const getEventsAfterAction = async (url, listenedType, act) => {
        const xhr = new XMLHttpRequest();
        const events = [];
        let isActed = false;
        const acted = new Promise((resolve) => {
            xhr.addEventListener(listenedType, () => {
                if (isActed || xhr.readyState !== 4) {
                    return;
                }
                isActed = true;
                act(xhr);
                resolve();
            });
        });
        ['load', 'loadend'].forEach((type) => {
            xhr.addEventListener(type, () => {
                if (isActed) {
                    events.push(type);
                }
            });
        });
        xhr.open('GET', url);
        xhr.send();
        await acted;
        await sleep(100);
        return [...events, `readyState:${xhr.readyState}`];
    };

    [
        { action: 'open()', act: (xhr) => xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`), readyState: 1 },
        { action: 'abort()', act: (xhr) => xhr.abort(), readyState: 0 },
    ].forEach(({ action, act, readyState }) => {
        ['readystatechange', 'load'].forEach((listenedType) => {
            test(`Response events - load and loadend dispatched after ${action} in ${listenedType}`, async (assert) => {
                runScriptlet(name, ['a1', '', 'test01']);

                const events = await getEventsAfterAction(`${FETCH_OBJECTS_PATH}/test01.json`, listenedType, act);

                // As in the specification and in Firefox, also after a listener of `readystatechange`,
                // although Chromium-based browsers do not dispatch them then
                assert.deepEqual(events, ['load', 'loadend', `readyState:${readyState}`], 'Events dispatched');
            });
        });
    });

    test('Response events - load and loadend are progress events of the response', async (assert) => {
        const getProgress = ({ lengthComputable, loaded, total }) => ({ lengthComputable, loaded, total });
        const nativeXhr = new XMLHttpRequest();
        nativeXhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        const nativeLoadEvent = await new Promise((resolve) => {
            nativeXhr.onload = resolve;
            nativeXhr.send();
        });

        runScriptlet(name, ['a1', '', 'test01']);

        const xhr = new XMLHttpRequest();
        const progressEvents = {};
        ['load', 'loadend'].forEach((type) => {
            xhr.addEventListener(type, (event) => {
                progressEvents[type] = event;
            });
        });
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        await sendAndWaitForLoad(xhr);

        ['load', 'loadend'].forEach((type) => {
            const event = progressEvents[type];
            assert.ok(event instanceof ProgressEvent, `${type} is a progress event`);
            assert.deepEqual(getProgress(event), getProgress(nativeLoadEvent), `${type} has the native progress`);
        });
    });

    test('Aborted request - events of an aborted request before the events of its response', async (assert) => {
        runScriptlet(name, ['a1', '', 'test01']);

        const xhr = new XMLHttpRequest();
        const events = [];
        ['readystatechange', 'load', 'abort', 'loadend'].forEach((type) => {
            xhr.addEventListener(type, () => {
                events.push(`${type}:${xhr.readyState}`);
            });
        });
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        events.length = 0;
        // Response of an asynchronous request is defined on the object before its events, which are deferred
        const nativeDefineProperties = Object.defineProperties;
        const responseDefined = new Promise((resolve) => {
            Object.defineProperties = function defineProperties(...args) {
                const result = Reflect.apply(nativeDefineProperties, this, args);
                if (args[0] === xhr) {
                    Object.defineProperties = nativeDefineProperties;
                    resolve();
                }
                return result;
            };
        });
        try {
            xhr.send();
            await responseDefined;
        } finally {
            Object.defineProperties = nativeDefineProperties;
        }
        assert.strictEqual(xhr.readyState, 4, 'Response defined');

        xhr.abort();

        const ABORT_EVENTS = ['readystatechange:4', 'abort:4', 'loadend:4'];
        assert.deepEqual(events, ABORT_EVENTS, 'Events of an aborted request dispatched');
        await sleep(100);
        assert.deepEqual(events, ABORT_EVENTS, 'Events of the response not dispatched');
        assert.strictEqual(xhr.readyState, 0, 'readyState after abort()');
    });

    test('Synchronous request - events of the response dispatched before send() returns', (assert) => {
        /**
         * Sends synchronous requests on the same object, and returns the events dispatched before `send()` returns.
         *
         * @param {string} url URL of the requests
         * @returns {string[]} events with `readyState`
         */
        const getSyncEvents = (url) => {
            const xhr = new XMLHttpRequest();
            const events = [];
            ['readystatechange', 'load', 'loadend'].forEach((type) => {
                xhr.addEventListener(type, () => {
                    events.push(`${type}:${xhr.readyState}`);
                });
            });
            for (let i = 0; i < 2; i += 1) {
                // e.g. the next request sent right after the previous one
                xhr.open('GET', url, false);
                events.push('send');
                xhr.send();
            }
            return events;
        };

        // Request which is not matched
        const nativeEvents = getSyncEvents(`${FETCH_OBJECTS_PATH}/test02.json`);
        runScriptlet(name, ['a1', '', 'test01']);
        const events = getSyncEvents(`${FETCH_OBJECTS_PATH}/test01.json`);

        assert.deepEqual(events, nativeEvents, `Events dispatched as native ones: ${nativeEvents}`);
        assert.ok(events.includes('load:4'), 'load dispatched');
    });

    test('Request opened without async is sent asynchronously', async (assert) => {
        runScriptlet(name, ['a1', '', 'test01']);

        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        const loaded = sendAndWaitForLoad(xhr);
        assert.strictEqual(xhr.readyState, 1, 'Response not received when send() returns');

        await loaded;
        assert.strictEqual(xhr.response, '{"b2":"test","c3":3}', 'Content pruned');
    });

    test('Failed synchronous request is not sent again', (assert) => {
        /**
         * Sends a synchronous request which fails, and returns its state after that.
         *
         * @returns {{xhr: XMLHttpRequest, state: string}} object of the request, and its state
         */
        const sendFailingRequest = () => {
            const xhr = new XMLHttpRequest();
            const events = [];
            ['readystatechange', 'load', 'error', 'loadend'].forEach((type) => {
                xhr.addEventListener(type, () => {
                    events.push(`${type}:${xhr.readyState}`);
                });
            });
            // Port which browsers block, so the request fails without connecting
            xhr.open('POST', 'http://127.0.0.1:1/', false);
            events.length = 0;
            let errorName = 'no error';
            try {
                xhr.send('body');
            } catch (error) {
                errorName = error.name;
            }
            const state = `${errorName}, readyState: ${xhr.readyState}, status: ${xhr.status}`
                + `, response: '${xhr.response}', events: [${events}]`;
            return { xhr, state };
        };

        const nativeState = sendFailingRequest().state;

        let sendCalls = 0;
        XMLHttpRequest.prototype.send = function send(...args) {
            sendCalls += 1;
            return Reflect.apply(nativeXhrSend, this, args);
        };
        runScriptlet(name, ['a1']);

        const { xhr, state } = sendFailingRequest();
        assert.strictEqual(state, nativeState, `State as of a native request: ${nativeState}`);
        assert.strictEqual(sendCalls, 1, 'Request sent once');

        const events = [];
        ['readystatechange', 'abort', 'loadend'].forEach((type) => {
            xhr.addEventListener(type, () => {
                events.push(type);
            });
        });
        xhr.abort();
        assert.deepEqual(events, [], 'No events dispatched by abort() of the failed request');
        assert.strictEqual(xhr.readyState, 0, 'readyState after abort()');
    });

    test('Invalid stack - request is not modified', async (assert) => {
        const runLogs = getSyncLogs(() => runScriptlet(name, ['a1', '', 'test01', '/(/']));
        assert.ok(runLogs.includes(`${name}: Invalid stack: /(/`), 'Invalid stack logged when the scriptlet runs');

        const xhr = new XMLHttpRequest();
        const requestLogs = await getLogs(async () => {
            for (let i = 0; i < 2; i += 1) {
                xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
                xhr.responseType = 'json';
                // eslint-disable-next-line no-await-in-loop
                await sendAndWaitForLoad(xhr);
            }
        });

        assert.deepEqual(xhr.response, { a1: 1, b2: 'test', c3: 3 }, 'Content is intact');
        assert.notOk(requestLogs.some((log) => log.includes('Invalid stack')), 'Invalid stack not logged on requests');
        assert.strictEqual(window.hit, undefined, 'hit should not fire');
    });

    test('Logging mode - deeply nested JSON response logged without its content - json', async (assert) => {
        runScriptlet(name);

        // Content which can be parsed, but not serialized again to be logged, as it is too deeply nested
        const NESTING_DEPTH = 12000;
        const json = `{"a1":1,"nested":${'['.repeat(NESTING_DEPTH)}${']'.repeat(NESTING_DEPTH)}}`;
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `data:application/json,${encodeURIComponent(json)}`);
        xhr.responseType = 'json';
        const logs = await getLogs(() => sendAndWaitForLoad(xhr));

        assert.ok(xhr.response !== null && typeof xhr.response === 'object', 'Response is an object');
        assert.strictEqual(xhr.response.a1, 1, 'Content is intact');
        assert.ok(
            logs.some((log) => log.includes('Content cannot be serialized')),
            'Content which cannot be serialized',
        );
    });

    test('Prune content of a deeply nested JSON response - json', async (assert) => {
        runScriptlet(name, ['a1']);

        // Content which can be parsed, but not serialized again, as it exceeds the maximum call stack size
        const NESTING_DEPTH = 12000;
        const json = `{"a1":1,"nested":${'['.repeat(NESTING_DEPTH)}${']'.repeat(NESTING_DEPTH)}}`;
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `data:application/json,${encodeURIComponent(json)}`);
        xhr.responseType = 'json';
        const loaded = new Promise((resolve) => {
            xhr.onload = resolve;
        });
        xhr.send();
        await loaded;

        assert.ok(xhr.response !== null && typeof xhr.response === 'object', 'Response is an object');
        assert.notOk(Object.prototype.hasOwnProperty.call(xhr.response, 'a1'), 'Content pruned');
        assert.ok(Array.isArray(xhr.response.nested), 'Other content is kept');
    });
} else {
    test('unsupported', (assert) => {
        assert.ok(true, 'Browser does not support it');
    });
}
