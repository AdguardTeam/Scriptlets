/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-replace-xhr-response';

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
    test('No args, logging', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const ASYNC = true;
        const USER = 'user';
        const PASSWORD = 'password';

        const done = assert.async();

        // mock console.log function for log checking
        console.log = function log(input) {
            if (input.includes('trace')) {
                return;
            }
            // eslint-disable-next-line max-len
            const EXPECTED_LOG_STR = `${name}: xhr( method:"${METHOD}" url:"${URL}" async:"${ASYNC}" user:"${USER}" password:"${PASSWORD}" )`;
            assert.ok(input.startsWith(EXPECTED_LOG_STR), 'console.hit input');
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

    test('Matched, string pattern', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const PATTERN = 'a1';
        const REPLACEMENT = 'z9';
        const MATCH_DATA = [PATTERN, REPLACEMENT, `${URL} method:${METHOD}`];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.notOk(xhr.response.includes(PATTERN), 'Response has been modified');
            assert.ok(xhr.response.includes(REPLACEMENT), 'Response text has been modified');

            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Matched, regex pattern', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;

        const PATTERN = /a1/;
        const REPLACEMENT = 'x';
        const MATCH_DATA = [`${PATTERN}`, REPLACEMENT, `${URL} method:${METHOD}`];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.ok(xhr.response.includes(REPLACEMENT) && !PATTERN.test(xhr.response), 'Response has been modified');
            assert.ok(
                xhr.responseText.includes(REPLACEMENT) && !PATTERN.test(xhr.responseText),
                'Response text has been modified',
            );

            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Matched, replaces multiline content', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/empty.html`;

        const PATTERN = '*';
        const REPLACEMENT = '';
        const MATCH_DATA = [`${PATTERN}`, REPLACEMENT, '*'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.ok(xhr.response === '', 'Response has been modified');
            assert.ok(xhr.responseText === '', 'Response text has been modified');

            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
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
        const PATTERN = 'a1';
        const REPLACEMENT = 'x';
        const MATCH_DATA = [PATTERN, REPLACEMENT, `${URL} method:${METHOD}`];

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
        const PATTERN = '*';
        const REPLACEMENT = '';
        const MATCH_DATA = [PATTERN, REPLACEMENT, 'test01'];

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
            assert.strictEqual(window.hit, undefined, 'hit should not fire');
            done1();
        };

        xhr2.onload = () => {
            assert.strictEqual(xhr2.readyState, 4, 'Response done');
            assert.ok(xhr2.response === '', 'Response has been removed');

            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done2();
        };

        xhr1.send();
        // use timeout to avoid hit collisions
        setTimeout(() => xhr2.send(), 1);
    });
} else {
    test('unsupported', (assert) => {
        assert.ok(true, 'Browser does not support it');
    });
}
