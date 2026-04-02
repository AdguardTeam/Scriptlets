/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-json-set-fetch-response';

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
    window.fetch = nativeFetch;
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
    test('sets an existing property in the fetch JSON response', async (assert) => {
        const done = assert.async();
        runScriptlet(name, ['b2', 'changed', '', 'test01']);

        const response = await fetch(`${FETCH_OBJECTS_PATH}/test01.json`);
        const actualJson = await response.json();

        assert.deepEqual(actualJson, { a1: 1, b2: 'changed', c3: 3 }, 'response should be modified');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('sets an existing property in the fetch JSON response to empty string', async (assert) => {
        const done = assert.async();
        runScriptlet(name, ['b2', '', '', 'test01']);

        const response = await fetch(`${FETCH_OBJECTS_PATH}/test01.json`);
        const actualJson = await response.json();

        assert.deepEqual(actualJson, { a1: 1, b2: '', c3: 3 }, 'response should be modified');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('creates a nested path in the fetch JSON response', async (assert) => {
        const done = assert.async();
        runScriptlet(name, ['cc.blocked.enabled', 'true', '', 'test03']);

        const response = await fetch(`${FETCH_OBJECTS_PATH}/test03.json`);
        const actualJson = await response.json();

        const expectedJson = {
            aa: 1,
            bb: 'test',
            cc: {
                id: 0,
                src: 'example.org',
                arr: [
                    { inner1: 123 },
                    { inner2: 456 },
                ],
                blocked: {
                    enabled: true,
                },
            },
        };

        assert.deepEqual(
            actualJson,
            expectedJson,
            'missing path should be created and other properties should stay intact',
        );
        assert.strictEqual(actualJson.aa, 1, 'other properties should stay intact');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('replaces part of a string value in the fetch JSON response', async (assert) => {
        const done = assert.async();
        runScriptlet(name, ['b2', 'replace:/test/updated/', '', 'test01']);

        const response = await fetch(`${FETCH_OBJECTS_PATH}/test01.json`);
        const actualJson = await response.json();

        const expectedJson = {
            a1: 1,
            b2: 'updated',
            c3: 3,
        };

        assert.deepEqual(actualJson, expectedJson, 'string value should be replaced');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('merges parsed json value into an existing fetch response object', async (assert) => {
        const done = assert.async();
        runScriptlet(name, ['cc', 'json:{"blocked":{"enabled":true},"meta":{"v":1}}', '', 'test03']);

        const response = await fetch(`${FETCH_OBJECTS_PATH}/test03.json`);
        const actualJson = await response.json();

        assert.deepEqual(
            actualJson.cc,
            {
                id: 0,
                src: 'example.org',
                arr: [
                    { inner1: 123 },
                    { inner2: 456 },
                ],
                blocked: {
                    enabled: true,
                },
                meta: {
                    v: 1,
                },
            },
            'existing response object should be merged with parsed json value',
        );
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('JSONPath mode can merge parsed json into an existing fetch response object', async (assert) => {
        const done = assert.async();
        runScriptlet(name, ['$.cc+={"blocked":{"enabled":true}}', '', '', 'test03', '', 'jsonpath']);

        const response = await fetch(`${FETCH_OBJECTS_PATH}/test03.json`);
        const actualJson = await response.json();

        assert.deepEqual(
            actualJson.cc.blocked,
            { enabled: true },
            'jsonpath mode should merge parsed json into the target object',
        );
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('does not modify unmatched fetch responses', async (assert) => {
        const done = assert.async();
        runScriptlet(name, ['b2', 'changed', '', 'not-matching-url']);

        const response = await fetch(`${FETCH_OBJECTS_PATH}/test01.json`);
        const actualJson = await response.json();

        assert.deepEqual(actualJson, { a1: 1, b2: 'test', c3: 3 }, 'response should stay intact');
        assert.strictEqual(window.hit, undefined, 'hit function should not fire');
        done();
    });

    test('applies only when stack matches in fetch response', async (assert) => {
        const done = assert.async();
        runScriptlet(name, ['a1', '10', '', 'test01', 'getFetchContent']);

        const getFetchContent = async () => {
            const response = await fetch(`${FETCH_OBJECTS_PATH}/test01.json`);
            return response.json();
        };

        const actualJson = await getFetchContent();

        assert.deepEqual(actualJson, { a1: 10, b2: 'test', c3: 3 }, 'response should be modified when stack matches');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('JSONPath mode prunes string-like JSON from fetch response', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/string-like-json01.txt`;
        const done = assert.async();

        runScriptlet(name, ['$..ads', '$remove$', '', 'string-like-json01', '', 'jsonpath']);

        const response = await fetch(INPUT_JSON_PATH);
        const actualTextContent = await response.text();

        const adsIncluded = actualTextContent.includes('"ads":{"content":"Sponsored"}');
        const contentIncluded = actualTextContent.includes('"article":{"node":true,"content":"Article"}');

        assert.ok(contentIncluded, 'article object should still be present in the content');
        assert.notOk(adsIncluded, 'ads object should be removed from the content');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('JSONPath modifies ads.visibility to hidden in json-like response from fetch', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/string-like-json01.txt`;
        const done = assert.async();

        runScriptlet(name, ['$..ads.visibility=hidden', '', '', 'string-like-json01']);

        const response = await fetch(INPUT_JSON_PATH);
        const actualTextContent = await response.text();

        const contentIncluded = actualTextContent.includes('"article":{"node":true,"content":"Article"}');
        // eslint-disable-next-line max-len
        const adsVisibilityHiddenIncluded = actualTextContent.includes('{"ads":{"content":"Sponsored","visibility":"hidden"}}');
        // eslint-disable-next-line max-len
        const adsVisibilityVisibleIncluded = actualTextContent.includes('{"ads":{"content":"Sponsored","visibility":"visible"}}');

        assert.ok(contentIncluded, 'article object should still be present in the content');
        assert.ok(adsVisibilityHiddenIncluded, 'ads object should be removed from the content');
        assert.notOk(adsVisibilityVisibleIncluded, 'ads object should not be visible in the content');

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });
}
