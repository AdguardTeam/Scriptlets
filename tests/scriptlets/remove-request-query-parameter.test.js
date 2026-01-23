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
    test('Match request - remove single query parameter', async (assert) => {
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

    // TODO: add more tests:
    // 1. Multiple parameters
    // 2. Parameter not present in URL
    // 3. No parameters to remove
    // 4. Empty URL to match
    // 5. URL to match not present in request URL
    // 6. Using fetch API
    // 7. All URL to match
    // 8. Invalid inputs (non-string parameter, non-string URL to match)

    // Add test for something like:
    // function reqListener() {
    //     console.log(this.responseText);
    // }
    // const req = new XMLHttpRequest();
    // req.addEventListener("load", reqListener);
    // req.open("GET", new URL('https://example.org/example.txt'));
    // req.send();
} else {
    test('unsupported', (assert) => {
        assert.ok(true, 'Browser does not support it');
    });
}
