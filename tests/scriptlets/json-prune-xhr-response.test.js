/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'json-prune-xhr-response';

const FETCH_OBJECTS_PATH = './test-files';
const nativeXhrOpen = XMLHttpRequest.prototype.open;
const nativeXhrSend = XMLHttpRequest.prototype.send;
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
    console.log = nativeConsole;
};

module(name, { beforeEach, afterEach });

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
} else {
    test('unsupported', (assert) => {
        assert.ok(true, 'Browser does not support it');
    });
}
