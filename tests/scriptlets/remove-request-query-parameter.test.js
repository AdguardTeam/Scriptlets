/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'remove-request-query-parameter';

const nativeXhrOpen = XMLHttpRequest.prototype.open;
const nativeFetch = window.fetch;

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    XMLHttpRequest.prototype.open = nativeXhrOpen;
    window.fetch = nativeFetch;
};

module(name, { beforeEach, afterEach });

const isSupported = typeof Proxy !== 'undefined';

if (isSupported) {
    test('XHR: remove single query parameter', async (assert) => {
        const METHOD = 'GET';
        const URL = '/test?utm=1';

        const expectedUrl = `${window.location.origin}/test`;

        const done = assert.async();

        const PARAMETER = 'utm';
        const URL_TO_MATCH = '/test';

        runScriptlet(name, [PARAMETER, URL_TO_MATCH]);

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.responseURL, expectedUrl, 'Response URL modified');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('XHR: remove multiple query parameters', async (assert) => {
        const METHOD = 'GET';
        const URL = '/test?utm_source=value1&utm_medium=value2&keep=1';

        const expectedUrl = `${window.location.origin}/test?keep=1`;

        const done = assert.async();

        const PARAMETERS = 'utm_source,utm_medium';
        const URL_TO_MATCH = '/test';

        runScriptlet(name, [PARAMETERS, URL_TO_MATCH]);

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.responseURL, expectedUrl, 'Response URL modified');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('XHR: remove parameters matching regex', async (assert) => {
        const METHOD = 'GET';
        const URL = '/test?utm_source=value1&utm_medium=value2&utm_campaign=value3&keep=1';

        const expectedUrl = `${window.location.origin}/test?keep=1`;

        const done = assert.async();

        const PARAMETERS = '/^utm_/';
        const URL_TO_MATCH = '/test';

        runScriptlet(name, [PARAMETERS, URL_TO_MATCH]);

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.responseURL, expectedUrl, 'Response URL modified');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('XHR: parameter not present in URL - no modification', async (assert) => {
        const METHOD = 'GET';
        const URL = '/test?keep=1';

        const expectedUrl = `${window.location.origin}/test?keep=1`;

        const done = assert.async();

        const PARAMETER = 'utm_source';
        const URL_TO_MATCH = '/test';

        runScriptlet(name, [PARAMETER, URL_TO_MATCH]);

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.responseURL, expectedUrl, 'Response URL not modified');
            assert.strictEqual(window.hit, undefined, 'hit function should not fire');
            done();
        };
        xhr.send();
    });

    test('XHR: URL does not match pattern - no modification', async (assert) => {
        const METHOD = 'GET';
        const URL = '/other?utm=1';

        const expectedUrl = `${window.location.origin}/other?utm=1`;

        const done = assert.async();

        const PARAMETER = 'utm';
        const URL_TO_MATCH = '/test';

        runScriptlet(name, [PARAMETER, URL_TO_MATCH]);

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.responseURL, expectedUrl, 'Response URL not modified');
            assert.strictEqual(window.hit, undefined, 'hit function should not fire');
            done();
        };
        xhr.send();
    });

    test('XHR: no URL pattern - matches all URLs', async (assert) => {
        const METHOD = 'GET';
        const URL = '/any-path?utm=1';

        const expectedUrl = `${window.location.origin}/any-path`;

        const done = assert.async();

        const PARAMETER = 'utm';

        runScriptlet(name, [PARAMETER]);

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.responseURL, expectedUrl, 'Response URL modified');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('XHR: URL pattern as regex', async (assert) => {
        const METHOD = 'GET';
        const URL = '/api/v1/data?ad_id=123&keep=1';

        const expectedUrl = `${window.location.origin}/api/v1/data?keep=1`;

        const done = assert.async();

        const PARAMETER = 'ad_id';
        const URL_TO_MATCH = '/\\/api\\/v\\d+\\//';

        runScriptlet(name, [PARAMETER, URL_TO_MATCH]);

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.responseURL, expectedUrl, 'Response URL modified');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('XHR with URL object: remove query parameter', async (assert) => {
        const METHOD = 'GET';
        const urlObj = new URL('/test?utm=1', window.location.origin);

        const expectedUrl = `${window.location.origin}/test`;

        const done = assert.async();

        const PARAMETER = 'utm';
        const URL_TO_MATCH = '/test';

        runScriptlet(name, [PARAMETER, URL_TO_MATCH]);

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, urlObj);
        xhr.onload = () => {
            assert.strictEqual(xhr.responseURL, expectedUrl, 'Response URL modified');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Fetch: remove single query parameter', async (assert) => {
        const URL = '/test?utm=1';

        const expectedUrl = `${window.location.origin}/test`;

        const done = assert.async();

        const PARAMETER = 'utm';
        const URL_TO_MATCH = '/test';

        runScriptlet(name, [PARAMETER, URL_TO_MATCH]);

        const response = await fetch(URL);
        assert.strictEqual(response.url, expectedUrl, 'Response URL modified');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('Fetch: remove multiple query parameters', async (assert) => {
        const URL = '/test?utm_source=value1&utm_medium=value2&keep=1';

        const expectedUrl = `${window.location.origin}/test?keep=1`;

        const done = assert.async();

        const PARAMETERS = 'utm_source,utm_medium';
        const URL_TO_MATCH = '/test';

        runScriptlet(name, [PARAMETERS, URL_TO_MATCH]);

        const response = await fetch(URL);
        assert.strictEqual(response.url, expectedUrl, 'Response URL modified');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('Fetch: remove parameters matching regex', async (assert) => {
        const URL = '/test?ad_config_id=123&ad_tag=abc&keep=1';

        const expectedUrl = `${window.location.origin}/test?keep=1`;

        const done = assert.async();

        const PARAMETERS = '/^ad_/';
        const URL_TO_MATCH = '/test';

        runScriptlet(name, [PARAMETERS, URL_TO_MATCH]);

        const response = await fetch(URL);
        assert.strictEqual(response.url, expectedUrl, 'Response URL modified');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('Fetch with Request object: remove query parameter', async (assert) => {
        const URL = '/test?utm=1';

        const expectedUrl = `${window.location.origin}/test`;

        const done = assert.async();

        const PARAMETER = 'utm';
        const URL_TO_MATCH = '/test';

        runScriptlet(name, [PARAMETER, URL_TO_MATCH]);

        const request = new Request(URL);
        const response = await fetch(request);
        assert.strictEqual(response.url, expectedUrl, 'Response URL modified');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('Fetch with URL object: remove query parameter', async (assert) => {
        const urlPath = '/test?utm=1';
        const urlObj = new URL(urlPath, window.location.origin);

        const expectedUrl = `${window.location.origin}/test`;

        const done = assert.async();

        const PARAMETER = 'utm';
        const URL_TO_MATCH = '/test';

        runScriptlet(name, [PARAMETER, URL_TO_MATCH]);

        const response = await fetch(urlObj);
        assert.strictEqual(response.url, expectedUrl, 'Response URL modified');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('Escaped comma in parameter name', async (assert) => {
        const METHOD = 'GET';
        // Unusual but valid: parameter name containing a comma
        const URL = '/test?a%2Cb=1&keep=1';

        const expectedUrl = `${window.location.origin}/test?keep=1`;

        const done = assert.async();

        // Escaped comma in scriptlet argument
        const PARAMETERS = 'a\\,b';
        const URL_TO_MATCH = '/test';

        runScriptlet(name, [PARAMETERS, URL_TO_MATCH]);

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.responseURL, expectedUrl, 'Response URL modified');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });
} else {
    test('unsupported', (assert) => {
        assert.ok(true, 'Browser does not support it');
    });
}
