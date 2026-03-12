/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-json-set-xhr-response';

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
    test('sets an existing property in xhr json response', async (assert) => {
        runScriptlet(name, ['b2', 'changed', '', 'test01']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.onload = () => {
            assert.deepEqual(xhr.response, { a1: 1, b2: 'changed', c3: 3 }, 'response should be modified');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.responseType = 'json';
        xhr.send();
    });

    test('sets an existing property in xhr json response to empty string', async (assert) => {
        runScriptlet(name, ['b2', '', '', 'test01']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.onload = () => {
            assert.deepEqual(xhr.response, { a1: 1, b2: '', c3: 3 }, 'response should be modified');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.responseType = 'json';
        xhr.send();
    });

    test('forwards xhr send body without wrapping it into the proxy args array', async (assert) => {
        const body = new FormData();
        body.append('foo', 'bar');

        let forwardedArgs;
        XMLHttpRequest.prototype.send = function xhrSend(...sendArgs) {
            forwardedArgs = sendArgs;
            return nativeXhrSend.apply(this, sendArgs);
        };

        runScriptlet(name, ['b2', 'changed', '', 'test01']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.responseType = 'json';
        xhr.onload = () => {
            assert.strictEqual(forwardedArgs.length, 1, 'forged send should receive exactly one argument');
            assert.strictEqual(forwardedArgs[0], body, 'body should be forwarded as-is');
            assert.deepEqual(xhr.response, { a1: 1, b2: 'changed', c3: 3 }, 'response should still be modified');
            done();
        };

        xhr.send(body);
    });

    test('creates a nested path in xhr text response', async (assert) => {
        runScriptlet(name, ['cc.blocked.enabled', 'true', '', 'test03']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test03.json`);
        xhr.onload = () => {
            const actualJson = JSON.parse(xhr.responseText);
            assert.deepEqual(actualJson.cc.blocked, { enabled: true }, 'missing path should be created');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('replaces part of a string value in xhr response', async (assert) => {
        runScriptlet(name, ['b2', 'replace:/test/updated/', '', 'test01']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.onload = () => {
            const result = JSON.parse(xhr.responseText);
            assert.deepEqual(result, { a1: 1, b2: 'updated', c3: 3 }, 'string value should be replaced');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('merges parsed json value into an existing xhr response object', async (assert) => {
        runScriptlet(name, ['cc', 'json:{"blocked":{"enabled":true},"meta":{"v":1}}', '', 'test03']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test03.json`);
        xhr.onload = () => {
            assert.deepEqual(xhr.response, {
                aa: 1,
                bb: 'test',
                cc: {
                    id: 0,
                    src: 'example.org',
                    arr: [
                        { inner1: 123 },
                        { inner2: 456 },
                    ],
                    blocked: { enabled: true },
                    meta: { v: 1 },
                },
            }, 'existing response object should be merged with parsed json value');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.responseType = 'json';
        xhr.send();
    });

    test('does not modify unmatched xhr responses', async (assert) => {
        runScriptlet(name, ['b2', 'changed', '', 'not-matching-url']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.onload = () => {
            assert.deepEqual(
                JSON.parse(xhr.responseText),
                { a1: 1, b2: 'test', c3: 3 },
                'response should stay intact',
            );
            assert.strictEqual(window.hit, undefined, 'hit function should not fire');
            done();
        };
        xhr.send();
    });

    test('applies only when stack matches in xhr response', async (assert) => {
        runScriptlet(name, ['a1', '10', '', 'test01', 'getXhrContent']);

        const done = assert.async();
        const getXhrContent = () => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
            xhr.onload = () => {
                assert.deepEqual(xhr.response, { a1: 10, b2: 'test', c3: 3 }, 'response should be modified');
                assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
                done();
            };
            xhr.responseType = 'json';
            xhr.send();
        };

        getXhrContent();
    });

    test('keeps request data isolated for multiple matched xhr instances', async (assert) => {
        runScriptlet(name, ['b2', 'changed', 'b2', 'test']);

        const done = assert.async(2);

        const firstXhr = new XMLHttpRequest();
        firstXhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        firstXhr.responseType = 'json';

        const secondXhr = new XMLHttpRequest();
        secondXhr.open('GET', `${FETCH_OBJECTS_PATH}/test03.json`);
        secondXhr.responseType = 'json';

        firstXhr.onload = () => {
            assert.deepEqual(
                firstXhr.response,
                { a1: 1, b2: 'changed', c3: 3 },
                'first response should use first request data',
            );
            done();
        };

        secondXhr.onload = () => {
            assert.deepEqual(secondXhr.response, {
                aa: 1,
                bb: 'test',
                cc: {
                    id: 0,
                    src: 'example.org',
                    arr: [
                        { inner1: 123 },
                        { inner2: 456 },
                    ],
                },
            }, 'second response should use second request data');
            done();
        };

        firstXhr.send();
        secondXhr.send();
    });
} else {
    test('unsupported', (assert) => {
        assert.ok(true, 'Browser does not support it');
    });
}
