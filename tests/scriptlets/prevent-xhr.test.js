/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';
import { logMessage } from '../../src/helpers';

const { test, module } = QUnit;
const name = 'prevent-xhr';

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
            name: 'ubo-no-xhr-if.js',
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

        const done = assert.async();

        // mock console.log function for log checking
        console.log = function log(input) {
            if (input.includes('trace')) {
                return;
            }
            // eslint-disable-next-line max-len
            const EXPECTED_LOG_STR = `${name}: xhr( method:"${METHOD}" url:"${URL}" async:"undefined" user:"undefined" password:"undefined" )`;
            assert.ok(input.startsWith(EXPECTED_LOG_STR), 'console.hit input');
        };

        runScriptlet(name);

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.ok(xhr.response, 'Response data exists');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Empty arg, prevent all, do not randomize response text', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = [''];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.strictEqual(xhr.response, '', 'Response data mocked');
            assert.strictEqual(typeof xhr.responseText, 'string', 'Response text mocked');
            assert.ok(xhr.responseText.length === 0, 'Response text is not randomized');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Empty arg to prevent all, check getResponseHeader() and getAllResponseHeaders() methods', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = [''];
        const HEADER_NAME_1 = 'Test-Type';
        const HEADER_VALUE_1 = 'application/json';
        const HEADER_NAME_2 = 'Test-Length';
        const HEADER_VALUE_2 = '12345';
        const ABSENT_HEADER_NAME = 'Test-Absent';

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.setRequestHeader(HEADER_NAME_1, HEADER_VALUE_1);
        xhr.setRequestHeader(HEADER_NAME_2, HEADER_VALUE_2);

        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.strictEqual(xhr.response, '', 'Response data mocked');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();

        assert.strictEqual(
            xhr.getResponseHeader(HEADER_NAME_1),
            HEADER_VALUE_1,
            'getResponseHeader() is mocked, value 1 returned',
        );
        assert.strictEqual(
            xhr.getResponseHeader(HEADER_NAME_2),
            HEADER_VALUE_2,
            'getResponseHeader() is mocked',
        );
        assert.strictEqual(
            xhr.getResponseHeader(ABSENT_HEADER_NAME),
            null,
            'getResponseHeader() is mocked, null returned for non-existent header',
        );

        const expectedAllHeaders = [
            `${HEADER_NAME_1.toLowerCase()}: ${HEADER_VALUE_1}`,
            `${HEADER_NAME_2.toLowerCase()}: ${HEADER_VALUE_2}`,
        ].join('\r\n');
        assert.strictEqual(xhr.getAllResponseHeaders(), expectedAllHeaders, 'getAllResponseHeaders() is mocked');
    });

    test('Empty arg, prevent all, randomize response text', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', 'true'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(typeof xhr.responseText, 'string', 'Response text mocked');
            assert.ok(xhr.responseText.length > 0, 'Response text randomized');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Empty arg, prevent all, randomize response text (length:25000-30000)', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', 'length:25000-30000'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(typeof xhr.responseText, 'string', 'Response text mocked');
            assert.ok(
                xhr.responseText.length > 20000,
                `Response text randomized, response length: ${xhr.responseText.length}`,
            );
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Args, method matched, randomize response text (length:25000-30000)', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['method:GET', 'length:25000-30000'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.strictEqual(typeof xhr.responseText, 'string', 'Response text mocked');
            assert.ok(
                xhr.responseText.length > 20000,
                `Response text randomized, response length: ${xhr.responseText.length}`,
            );
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Args, method matched, randomize response text, rangeMin === rangeMax (length:100-100)', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['method:GET', 'length:100-100'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.strictEqual(typeof xhr.responseText, 'string', 'Response text mocked');
            assert.ok(
                xhr.responseText.length === 100,
                `Response text randomized, response length: ${xhr.responseText.length}`,
            );
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Args, method matched, randomize response text, limitRange (length:500000-500000)', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['method:GET', 'length:500000-500000'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.strictEqual(typeof xhr.responseText, 'string', 'Response text mocked');
            assert.ok(
                xhr.responseText.length === 500000,
                `Response text randomized, response length: ${xhr.responseText.length}`,
            );
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Empty arg, prevent all, dont randomize response - limit range (rangeMin+rangeMax-length)', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', 'length:8888888888888888-99999999999999999999999'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(typeof xhr.responseText, 'string', 'Response text mocked');
            assert.ok(xhr.responseText.length === 0, 'Response text is not randomized');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Empty arg, prevent all, dont randomize response text - limit range (rangeMax - length)', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', 'length:10000-600000'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(typeof xhr.responseText, 'string', 'Response text mocked');
            assert.ok(xhr.responseText.length === 0, 'Response text is not randomized');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Empty arg, prevent all, randomize response text - reverse range (length:300-100)', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', 'length:300-100'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(typeof xhr.responseText, 'string', 'Response text mocked');
            assert.ok(
                xhr.responseText.length >= 100 && xhr.responseText.length <= 300,
                `Response text randomized, response length: ${xhr.responseText.length}`,
            );
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Empty arg, prevent all, randomize response text - (length:010-0020)', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', 'length:010-0020'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(typeof xhr.responseText, 'string', 'Response text mocked');
            assert.ok(
                xhr.responseText.length >= 10 && xhr.responseText.length <= 20,
                `Response text randomized, response length: ${xhr.responseText.length}`,
            );
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Empty arg, prevent all, dont randomize response - invalid argument (length:test-30000)', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', 'length:test-30000'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(typeof xhr.responseText, 'string', 'Response text mocked');
            assert.ok(xhr.responseText.length === 0, 'Response text is not randomized');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Empty arg, prevent all, do not randomize response text - invalid argument (length:12345)', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', 'length:12345'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(typeof xhr.responseText, 'string', 'Response text mocked');
            assert.ok(xhr.responseText.length === 0, 'Response text is not randomized');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Empty arg, prevent all, do not randomize response text - invalid argument (12345)', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', '12345'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(typeof xhr.responseText, 'string', 'Response text mocked');
            assert.ok(xhr.responseText.length === 0, 'Response text is not randomized');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Empty arg, prevent all, dont randomize response - invalid argument (length:123-345-450)', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', 'length:123-345-450'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(typeof xhr.responseText, 'string', 'Response text mocked');
            assert.ok(xhr.responseText.length === 0, 'Response text is not randomized');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Empty arg, prevent all, dont randomize response - invalid argument (length:123---450)', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', 'length:123---450'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(typeof xhr.responseText, 'string', 'Response text mocked');
            assert.ok(xhr.responseText.length === 0, 'Response text is not randomized');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Empty arg, prevent all, dont randomize response - invalid argument (length::123-450)', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', 'length::123-450'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(typeof xhr.responseText, 'string', 'Response text mocked');
            assert.ok(xhr.responseText.length === 0, 'Response text is not randomized');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Empty arg, prevent all, do not randomize response text - invalid argument (test:123-450)', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', 'test:123-450'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(typeof xhr.responseText, 'string', 'Response text mocked');
            assert.ok(xhr.responseText.length === 0, 'Response text is not randomized');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Args, prevent matched', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = [`test01.json method:${METHOD}`];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.strictEqual(xhr.response, '', 'Response data mocked');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Args matched, prevent blocked request', async (assert) => {
        // blocked_request.json doesn't exist,
        // it's required for test for blocked requests
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/blocked_request.json`;
        const MATCH_DATA = [`blocked_request method:${METHOD}`];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const reqListener = (e) => {
            assert.strictEqual(e.target.status, 200, 'Status mocked');
            assert.ok(e.target.responseURL.includes('/blocked_request.json'), 'Origianl URL mocked');
            assert.strictEqual(e.target.readyState, 4, 'Response done');
            assert.strictEqual(e.target.response, '', 'Response data mocked');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.addEventListener('load', reqListener);
        xhr.send();
    });

    test('Args, match, listeners after .send work', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = [`test01.json method:${METHOD}`];

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

    test('Args, pass unmatched', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['not-test01.json'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.ok(xhr.response, 'Response data exists');
            assert.strictEqual(window.hit, undefined, 'hit should not fire');
            done();
        };
        xhr.send();
    });

    test('Args, pass partly matched', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['not-example.org method:GET'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.ok(xhr.response, 'Response data exists');
            assert.strictEqual(window.hit, undefined, 'hit should not fire');
            done();
        };
        xhr.send();
    });

    test('Args, pass unmatched - invalid regexp', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['/\\/'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.ok(xhr.response, 'Response data exists');
            assert.strictEqual(window.hit, undefined, 'hit should not fire');
            done();
        };
        xhr.send();
    });

    test('Args, prevent matched - blob', async (assert) => {
        const createImg = document.createElement('img');
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test-image.jpeg`;
        const MATCH_DATA = [`test-image.jpeg method:${METHOD}`];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.responseType = 'blob';
        xhr.onload = () => {
            try {
                createImg.setAttribute('src', window.URL.createObjectURL(xhr.response));
            } catch (error) {
                logMessage(error);
            }
            document.body.appendChild(createImg);
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.strictEqual(xhr.response instanceof Blob, true, 'Response data mocked');
            assert.ok(createImg.src.startsWith('blob:'), 'Image with source blob');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            createImg.remove();
            done();
        };
        xhr.send();
    });

    test('Args, prevent matched - arraybuffer', async (assert) => {
        const createImg = document.createElement('img');
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test-image.jpeg`;
        const MATCH_DATA = [`test-image.jpeg method:${METHOD}`];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
            const base64String = window.btoa(String.fromCharCode(...new Uint8Array(xhr.response)));
            createImg.setAttribute('src', `data:image/png;base64,${base64String}`);
            document.body.appendChild(createImg);
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.strictEqual(xhr.response instanceof ArrayBuffer, true, 'Response data mocked');
            assert.ok(createImg.src.startsWith('data:image/'), 'Image with source base64');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            createImg.remove();
            done();
        };
        xhr.send();
    });

    // https://github.com/AdguardTeam/Scriptlets/issues/261
    test('Works correctly with different parallel XHR requests', async (assert) => {
        const METHOD = 'GET';
        const URL_TO_BLOCK = `${FETCH_OBJECTS_PATH}/test01.json`;
        const URL_TO_PASS = `${FETCH_OBJECTS_PATH}/test02.json`;
        const MATCH_DATA = ['test01.json'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async(2);

        const xhr1 = new XMLHttpRequest();
        const xhr2 = new XMLHttpRequest();

        xhr1.open(METHOD, URL_TO_PASS);
        xhr2.open(METHOD, URL_TO_BLOCK);

        xhr1.onload = () => {
            assert.strictEqual(xhr1.readyState, 4, 'Response done');
            assert.ok(xhr1.responseURL.includes(URL_TO_PASS.substring(1)), 'Origianl URL mocked');
            assert.ok(xhr1.response, 'Response data exists');
            assert.strictEqual(window.hit, undefined, 'hit should not fire');
            done();
        };

        xhr2.onload = () => {
            assert.strictEqual(xhr2.readyState, 4, 'Response done');
            assert.ok(xhr2.responseURL.includes(URL_TO_BLOCK.substring(1)), 'Origianl URL mocked');
            assert.strictEqual(typeof xhr2.responseText, 'string', 'Response text mocked');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            clearGlobalProps('hit');
            done();
        };

        xhr1.send();
        // use timeout to avoid hit collisions
        setTimeout(() => xhr2.send(), 10);
    });

    // https://github.com/AdguardTeam/Scriptlets/issues/347
    test('Works correctly with different parallel XHR requests and blocked request', async (assert) => {
        const METHOD = 'GET';
        // advert.js does not exist, it imitate blocked request
        const URL_TO_BLOCK = `${FETCH_OBJECTS_PATH}/advert.js`;
        const URL_TO_PASS = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['advert.js'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async(2);

        const xhr1 = new XMLHttpRequest();
        const xhr2 = new XMLHttpRequest();

        xhr1.open(METHOD, URL_TO_BLOCK);
        xhr2.open(METHOD, URL_TO_PASS);

        xhr1.onload = () => {
            const responseHeader = xhr1.getResponseHeader('date');
            const responseHeaders = xhr1.getAllResponseHeaders();

            assert.strictEqual(xhr1.readyState, 4, 'Response done');
            assert.ok(responseHeaders.length === 0, 'Response header is empty');
            assert.strictEqual(responseHeader, null, 'Response header date returns null');
            assert.strictEqual(typeof xhr1.responseText, 'string', 'Response text');
            assert.ok(xhr1.responseText.length === 0, 'Response text is empty');
            assert.ok(xhr1.responseURL.includes(URL_TO_BLOCK.substring(1)), 'Origianl URL mocked');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };

        xhr2.onload = () => {
            const responseHeader = xhr2.getResponseHeader('date');
            const responseHeaders = xhr2.getAllResponseHeaders();

            assert.strictEqual(xhr2.readyState, 4, 'Response done');
            assert.ok(responseHeaders.length > 0, 'Response header contains data');
            assert.ok(responseHeader.length > 0, 'Response header date is not empty');
            assert.ok(xhr2.responseURL.includes(URL_TO_PASS.substring(1)), 'Origianl URL mocked');
            assert.strictEqual(typeof xhr2.responseText, 'string', 'Response text mocked');
            clearGlobalProps('hit');
            done();
        };

        xhr1.send();
        // use timeout to avoid hit collisions
        setTimeout(() => xhr2.send(), 10);
    });
} else {
    test('unsupported', (assert) => {
        assert.ok(true, 'Browser does not support it');
    });
}
