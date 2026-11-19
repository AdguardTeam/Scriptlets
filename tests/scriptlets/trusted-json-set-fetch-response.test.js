/* eslint-disable no-underscore-dangle, no-console */
import {
    runScriptlet,
    clearGlobalProps,
    useUnreadableStackTrace,
    useThrowingMethod,
    getLogs,
} from '../helpers';

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

    test('sets an existing property when fetch receives a URL object', async (assert) => {
        const done = assert.async();
        runScriptlet(name, ['b2', 'changed', '', 'test01']);

        const requestUrl = new URL(`${FETCH_OBJECTS_PATH}/test01.json`, window.location.href);
        const response = await fetch(requestUrl);
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

    test('modifies the fetch response with verbose if the stack trace cannot be read', async (assert) => {
        const done = assert.async();
        runScriptlet(name, ['b2', 'changed', '', 'test01', '', '', 'true']);
        // Content is logged in verbose mode
        console.log = () => {};

        // Stack trace cannot be read also when the response is processed after it is awaited
        const restoreStackTrace = useUnreadableStackTrace();
        let response;
        try {
            response = await fetch(`${FETCH_OBJECTS_PATH}/test01.json`);
        } finally {
            restoreStackTrace();
        }
        const actualJson = await response.json();

        assert.deepEqual(actualJson, { a1: 1, b2: 'changed', c3: 3 }, 'response should be modified');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('modifies the response with verbose if its content cannot be serialized to be logged', async (assert) => {
        const nativeStringify = JSON.stringify;
        // Saved by the scriptlet when it runs, so the content cannot be serialized only to be logged,
        // e.g. as it is too deeply nested for `JSON.stringify()` with indentation
        JSON.stringify = function stringify(...args) {
            if (args[2] !== undefined) {
                throw new Error('Value cannot be serialized');
            }
            return Reflect.apply(nativeStringify, this, args);
        };
        try {
            runScriptlet(name, ['a1', '10', '', 'test01', '', '', 'true']);
        } finally {
            JSON.stringify = nativeStringify;
        }

        let actualJson;
        const logs = await getLogs(async () => {
            const response = await fetch(`${FETCH_OBJECTS_PATH}/test01.json`);
            actualJson = await response.json();
        });

        assert.deepEqual(actualJson, { a1: 10, b2: 'test', c3: 3 }, 'response should be modified');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.ok(
            logs.some((log) => log.includes('Original content:') && log.includes('Content cannot be serialized')),
            'original content which cannot be serialized logged',
        );
        assert.ok(
            logs.some((log) => log.includes('Modified content:') && log.includes('Content cannot be serialized')),
            'modified content which cannot be serialized logged',
        );
    });

    test('applies when stack matches a function which returns the promise of fetch', async (assert) => {
        runScriptlet(name, ['a1', '10', '', 'test01', 'getFetchResponse']);

        // The function is no longer in the stack when the response is awaited
        const getFetchResponse = () => fetch(`${FETCH_OBJECTS_PATH}/test01.json`);
        const response = await getFetchResponse();
        const actualJson = await response.json();

        assert.deepEqual(actualJson, { a1: 10, b2: 'test', c3: 3 }, 'response should be modified');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    });

    test('does not apply when stack does not match, and leaves the response as is', async (assert) => {
        runScriptlet(name, ['a1', '10', '', 'test01', 'notMatchingStack']);

        const response = await fetch(`${FETCH_OBJECTS_PATH}/test01.json`);
        const actualJson = await response.json();

        assert.deepEqual(actualJson, { a1: 1, b2: 'test', c3: 3 }, 'response should stay intact');
        assert.strictEqual(window.hit, undefined, 'hit function should not fire');
    });

    test('sends the request once and passes its rejection through', async (assert) => {
        let calls = 0;
        window.fetch = () => {
            calls += 1;
            return Promise.reject(new TypeError('Failed to fetch'));
        };
        runScriptlet(name, ['a1', '10', '', 'test01']);

        await assert.rejects(
            fetch(`${FETCH_OBJECTS_PATH}/test01.json`, { method: 'POST' }),
            /Failed to fetch/,
            'rejection of the request passed through',
        );
        assert.strictEqual(calls, 1, 'request sent once');
        assert.strictEqual(window.hit, undefined, 'hit function should not fire');
    });

    test('sends the request once and returns the response if it cannot be cloned', async (assert) => {
        let calls = 0;
        let receivedResponse;
        window.fetch = async () => {
            calls += 1;
            receivedResponse = new Response('{"a1":1}');
            // Response with a used body cannot be cloned
            await receivedResponse.text();
            return receivedResponse;
        };
        runScriptlet(name, ['a1', '10', '', 'test01']);

        const response = await fetch(`${FETCH_OBJECTS_PATH}/test01.json`, { method: 'POST' });

        assert.strictEqual(response, receivedResponse, 'received response returned');
        assert.strictEqual(calls, 1, 'request sent once');
        assert.strictEqual(window.hit, undefined, 'hit function should not fire');
    });

    test('does not process a JSON body again as line-delimited JSON if it cannot be modified', async (assert) => {
        const nativeParse = JSON.parse;
        const nativeStringify = JSON.stringify;
        let bodyParses = 0;
        // Saved by the scriptlet when it runs, so the modified value cannot be serialized
        JSON.parse = function parse(...args) {
            if (typeof args[0] === 'string' && args[0].includes('"a1"')) {
                bodyParses += 1;
            }
            return Reflect.apply(nativeParse, this, args);
        };
        // Only the content is not serialized, as the arguments of the scriptlet are serialized to run it
        JSON.stringify = function stringify(...args) {
            if (args[0] !== null && typeof args[0] === 'object' && 'a1' in args[0]) {
                throw new Error('Value cannot be serialized');
            }
            return Reflect.apply(nativeStringify, this, args);
        };
        try {
            runScriptlet(name, ['a1', '10', '', 'test01']);
        } finally {
            JSON.parse = nativeParse;
            JSON.stringify = nativeStringify;
        }

        const response = await fetch(`${FETCH_OBJECTS_PATH}/test01.json`);
        const actualJson = await response.json();

        assert.deepEqual(actualJson, { a1: 1, b2: 'test', c3: 3 }, 'response should stay intact');
        assert.strictEqual(bodyParses, 1, 'body should be parsed once');
    });

    test('returns the original value from toString() of fetch', (assert) => {
        runScriptlet(name, ['a1', '10', '', 'test01']);

        assert.notStrictEqual(window.fetch, nativeFetch, 'fetch intercepted');
        assert.strictEqual(window.fetch.toString(), nativeFetch.toString(), 'toString() returns the original value');
    });

    test('does not modify the response if stack is an invalid regular expression', async (assert) => {
        runScriptlet(name, ['a1', '10', '', 'test01', '/(/']);

        const response = await fetch(`${FETCH_OBJECTS_PATH}/test01.json`);
        const actualJson = await response.json();

        assert.deepEqual(actualJson, { a1: 1, b2: 'test', c3: 3 }, 'response should stay intact');
        assert.strictEqual(window.hit, undefined, 'hit function should not fire');
    });

    test('JSONPath: several queries modify the response once', async (assert) => {
        const done = assert.async();
        runScriptlet(name, ['$.a1 $.c3=0', '$remove$', '', 'test01']);

        const response = await fetch(`${FETCH_OBJECTS_PATH}/test01.json`);
        const actualJson = await response.json();

        assert.deepEqual(actualJson, { b2: 'test', c3: 0 }, 'each query should modify the response');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('JSONPath: `$remove$` as a value of a query removes its nodes, in any order', async (assert) => {
        const done = assert.async();
        runScriptlet(name, ['$.c3=0 $.a1=$remove$', '', '', 'test01']);

        const response = await fetch(`${FETCH_OBJECTS_PATH}/test01.json`);
        const actualJson = await response.json();

        assert.deepEqual(actualJson, { b2: 'test', c3: 0 }, '`a1` should be removed and `c3` set');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('JSONPath: documented example with $remove$ and repl() values', async (assert) => {
        runScriptlet(name, ['$.ads=$remove$ $..title=repl({"pattern":" (Ad)","replacement":""})', '', '', 'api/feed']);

        const response = await fetch(`${FETCH_OBJECTS_PATH}/api/feed.json`);
        const actualJson = await response.json();

        assert.deepEqual(
            actualJson,
            { items: [{ url: 'https://ads.example.org/1', title: 'Ad' }, { url: 'https://example.org/2', title: 'News' }] },
            'modified',
        );
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    });

    /**
     * Fetches the test file and returns its parsed response.
     *
     * @param {string} file Name of the test file, e.g. `test01`.
     * @returns {Promise<object>} Parsed response.
     */
    const fetchJson = async (file) => (await fetch(`${FETCH_OBJECTS_PATH}/${file}.json`)).json();

    test('ubo-trusted-json-edit-fetch-response sets a value of a matching response', async (assert) => {
        // e.g. novelgames.com##+js(trusted-json-edit-fetch-response, .adShowPreload=false, propsToMatch, …)
        // `..src` matches in both files, so only `propsToMatch` limits the rule to the first one
        runScriptlet('ubo-trusted-json-edit-fetch-response', ['..src="changed"', 'propsToMatch', 'test02']);

        assert.strictEqual((await fetchJson('test02')).src, 'changed', 'matching response is modified');
        assert.strictEqual((await fetchJson('test03')).cc.src, 'example.org', 'other response should not be modified');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    });

    test('ubo-trusted-json-edit-fetch-response.js removes what a query without a value matches', async (assert) => {
        runScriptlet('ubo-trusted-json-edit-fetch-response.js', ['.b2', 'propsToMatch', 'test01']);

        assert.deepEqual(await fetchJson('test01'), { a1: 1, c3: 3 }, 'property should be removed');
    });

    test('uBO arguments of trusted-json-edit-fetch-response are read as uBO reads them', async (assert) => {
        // idlixku.com##+js(trusted-json-edit-fetch-response, .preroll.ad, , propsToMatch, /play):
        // the empty argument shifts the pairs, so uBO has no propsToMatch, and every response is modified
        runScriptlet('ubo-trusted-json-edit-fetch-response', ['.b2', '', 'propsToMatch', 'test03']);
        assert.deepEqual(await fetchJson('test01'), { a1: 1, c3: 3 }, 'every response should be modified');

        // positional arguments of AdGuard syntax are not read, e.g. `stack`
        window.fetch = nativeFetch;
        runScriptlet('ubo-trusted-json-edit-fetch-response', ['.b2=false', '', '', '', 'neverMatchedStack']);
        assert.deepEqual(await fetchJson('test01'), { a1: 1, b2: false, c3: 3 }, 'stack should not be read');

        // the query is not split, as uBO ignores spaces in it, so `$.b2 $.c3` does not remove both properties
        window.fetch = nativeFetch;
        runScriptlet('ubo-trusted-json-edit-fetch-response', ['$.b2 $.c3']);
        assert.deepEqual(await fetchJson('test01'), { a1: 1, b2: 'test', c3: 3 }, 'one query should be applied');
    });

    test('ubo-trusted-json-edit-fetch-response returns the original text if nothing is matched', async (assert) => {
        const path = `${FETCH_OBJECTS_PATH}/test-big-number.json`;
        const originalText = await (await nativeFetch(path)).text();
        runScriptlet('ubo-trusted-json-edit-fetch-response', ['..ads']);

        // the number would change if the response were parsed and serialized again
        assert.strictEqual(await (await fetch(path)).text(), originalText, 'response text should be original');
    });

    test('ubo-trusted-json-edit-fetch-response matches negated propsToMatch, as uBO', async (assert) => {
        runScriptlet('ubo-trusted-json-edit-fetch-response', ['..src="changed"', 'propsToMatch', 'url:!test03']);

        assert.strictEqual((await fetchJson('test02')).src, 'changed', 'other URL should be modified');
        assert.strictEqual((await fetchJson('test03')).cc.src, 'example.org', 'excluded URL should not be modified');
    });

    test('ubo-trusted-json-edit-fetch-response does not modify line-delimited JSON, as uBO', async (assert) => {
        const path = `${FETCH_OBJECTS_PATH}/string-like-json01.txt`;
        const originalText = await (await nativeFetch(path)).text();
        runScriptlet('ubo-trusted-json-edit-fetch-response', ['..ads']);

        assert.strictEqual(await (await fetch(path)).text(), originalText, 'response text should be original');
    });

    test('ubo-trusted-json-edit-fetch-response with an invalid value reads no response', async (assert) => {
        const nativeClone = Response.prototype.clone;
        let clones = 0;
        // eslint-disable-next-line func-names
        Response.prototype.clone = function () {
            clones += 1;
            return Reflect.apply(nativeClone, this, []);
        };
        const logs = [];
        console.log = (...args) => {
            logs.push(args.join(' '));
        };
        let responses;
        try {
            // a value without quotes, and a payload with a trailing comma, which uBO does not apply either
            runScriptlet('ubo-trusted-json-edit-fetch-response', ['.b2=hidden']);
            runScriptlet('ubo-trusted-json-edit-fetch-response', ['.b2=repl({"pattern":"test",})']);
            responses = [await fetchJson('test01'), await fetchJson('test01')];
        } finally {
            console.log = nativeConsole;
            Response.prototype.clone = nativeClone;
        }

        // so e.g. a streaming response is not held until its end for a rule which is not applied
        assert.strictEqual(clones, 0, 'the body of a response should not be read');
        assert.strictEqual(responses[1].b2, 'test', 'response should not be modified');
        const valueErrors = logs.filter((log) => log.includes('the value is not JSON: hidden'));
        assert.strictEqual(valueErrors.length, 1, 'the value should be logged once');
        const payloadErrors = logs.filter((log) => log.includes('the payload is invalid'));
        assert.strictEqual(payloadErrors.length, 1, 'the payload should be logged once');
    });

    test('ubo-trusted-json-edit-fetch-response is applied if RegExp test throws in the first fetch', async (assert) => {
        runScriptlet('ubo-trusted-json-edit-fetch-response', ['.cc.arr[0].inner1']);
        // as by `abort-current-inline-script` with `RegExp.prototype.test` for a request of an inline script,
        // while the query, whose parsing calls it, e.g. for `[0]`, is parsed once `fetch()` is fulfilled
        const restoreTest = useThrowingMethod(RegExp.prototype, 'test');
        let first;
        try {
            first = fetch(`${FETCH_OBJECTS_PATH}/test03.json`);
        } finally {
            restoreTest();
        }

        assert.deepEqual((await (await first).json()).cc.arr, [{}, { inner2: 456 }], 'inner1 should be removed');
        assert.deepEqual((await fetchJson('test03')).cc.arr, [{}, { inner2: 456 }], 'and for the next request');
    });

    test('ubo-trusted-json-edit-fetch-response does not change RegExp.$1 in the call of fetch', async (assert) => {
        // `RegExp.$1` is not updated in the realm of the test page, so the rule runs in a frame
        const frame = document.createElement('iframe');
        document.body.appendChild(frame);
        try {
            const frameEval = frame.contentWindow.eval;
            const args = ['.cc.arr[0].inner1'];
            frameEval(window.scriptlets.invoke({ name: 'ubo-trusted-json-edit-fetch-response', args, verbose: false }));
            const url = new URL(`${FETCH_OBJECTS_PATH}/test03.json`, window.location.href).href;
            const result = frameEval(`/(42)/.test('x42'); [fetch('${url}'), RegExp.$1];`);

            assert.strictEqual(result[1], '42', 'RegExp.$1 should be kept');
            // objects of the frame are compared as JSON, as they have its prototypes
            const json = await (await result[0]).json();
            assert.strictEqual(JSON.stringify(json.cc.arr), '[{},{"inner2":456}]', 'inner1 should be removed');
        } finally {
            frame.remove();
        }
    });

    test('ubo-trusted-json-edit-fetch-response is applied if RegExp test throws while it runs', async (assert) => {
        // as by `abort-current-inline-script` with `RegExp.prototype.test`, while parsing `[0]` calls it
        const restoreTest = useThrowingMethod(RegExp.prototype, 'test');
        try {
            runScriptlet('ubo-trusted-json-edit-fetch-response', ['.cc.arr[0].inner1']);
        } finally {
            restoreTest();
        }

        const json = await fetchJson('test03');
        assert.deepEqual(json.cc.arr, [{}, { inner2: 456 }], 'inner1 should be removed');
    });

    test('ubo-trusted-json-edit-fetch-response with invalid propsToMatch is not applied', async (assert) => {
        const logs = [];
        console.log = (...args) => {
            logs.push(args.join(' '));
        };
        runScriptlet('ubo-trusted-json-edit-fetch-response', ['.b2=false', 'propsToMatch', '/[/']);
        const json = await fetchJson('test01');
        console.log = nativeConsole;

        assert.strictEqual(json.b2, 'test', 'response should not be modified');
        assert.ok(logs.some((log) => log.includes('Invalid propsToMatch')), 'should be logged when the rule runs');
    });

    test('a second uBO rule which matches nothing returns the response of the first one as it is', async (assert) => {
        const path = `${FETCH_OBJECTS_PATH}/test01.json`;
        const nativeResponse = await nativeFetch(path);
        runScriptlet('ubo-trusted-json-edit-fetch-response', ['.b2']);
        runScriptlet('ubo-trusted-json-edit-fetch-response', ['..sponsors']);

        const response = await fetch(path);
        assert.strictEqual(response.url, nativeResponse.url, 'url should be kept');
        assert.strictEqual(response.type, nativeResponse.type, 'type should be kept');
        assert.deepEqual(await response.json(), { a1: 1, c3: 3 }, 'the first rule should be applied');
    });

    test('a retry of a request whose body is used reaches the network, as it is not matched', async (assert) => {
        runScriptlet('ubo-trusted-json-edit-fetch-response', ['..ads', 'propsToMatch', 'other-url']);
        const request = new Request(`${FETCH_OBJECTS_PATH}/test01.json`, { method: 'POST', body: 'first' });
        await request.text();

        // a native fetch() accepts the request with another body, while cloning the used request throws
        const response = await fetch(request, { body: 'retry' });
        assert.true(response instanceof Response, 'request should be sent');
    });

    test('bodyUsed of an edited response tells whether the page has read it', async (assert) => {
        runScriptlet('ubo-trusted-json-edit-fetch-response', ['.b2']);

        const response = await fetch(`${FETCH_OBJECTS_PATH}/test01.json`);
        assert.false(response.bodyUsed, 'body should not be used before it is read');
        assert.deepEqual(await response.json(), { a1: 1, c3: 3 }, 'response should be modified');
        assert.true(response.bodyUsed, 'body should be used after it is read');
    });

    test('a rule without propsToMatch modifies a retry of a request whose body is used', async (assert) => {
        runScriptlet(name, ['b2', 'changed']);
        const request = new Request(`${FETCH_OBJECTS_PATH}/test01.json`, { method: 'POST', body: 'first' });
        await request.text();

        // the data of the request is not needed, so it is not collected, which would throw for the used request
        const response = await fetch(request, { body: 'retry' });
        assert.deepEqual(await response.json(), { a1: 1, b2: 'changed', c3: 3 }, 'response should be modified');
    });

    /**
     * Sends a POST request whose options have a getter of the body, which returns another value on each read,
     * e.g. of a sequence number, and returns how many times it has been read.
     *
     * @returns {Promise<number>} Count of the reads of the body.
     */
    const countBodyReads = async () => {
        let reads = 0;
        const options = {
            method: 'POST',
            get body() {
                reads += 1;
                return `message-${reads}`;
            },
        };
        await fetch(`${FETCH_OBJECTS_PATH}/test01.json`, options);
        return reads;
    };

    test('uBO rules do not read the body before native fetch, without propsToMatch or of the URL', async (assert) => {
        const nativeReads = await countBodyReads();

        runScriptlet('ubo-trusted-json-edit-fetch-response', ['..ads']);
        assert.strictEqual(await countBodyReads(), nativeReads, 'body should be read as natively without propsToMatch');

        window.fetch = nativeFetch;
        runScriptlet('ubo-trusted-json-edit-fetch-response', ['..ads', 'propsToMatch', 'other-url']);
        assert.strictEqual(await countBodyReads(), nativeReads, 'body should be read as natively for a URL pattern');
    });
}
