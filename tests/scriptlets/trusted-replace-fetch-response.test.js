/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-replace-fetch-response';

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

if (!isSupported) {
    test('unsupported', (assert) => {
        assert.ok(true, 'Browser does not support it');
    });
} else {
    test('No arguments, no replacement, logging', async (assert) => {
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

        // no args -> just logging, no replacements
        runScriptlet(name);

        const response = await fetch(INPUT_JSON_PATH, init);
        const actualJson = await response.json();

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.deepEqual(actualJson, expectedJson);
        done();
    });

    test('Match all requests, replace by substring', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
        const TEST_METHOD = 'GET';
        const init = {
            method: TEST_METHOD,
        };

        const done = assert.async();

        const PATTERN = 'test';
        const REPLACEMENT = 'new content';
        runScriptlet(name, [PATTERN, REPLACEMENT]);

        const response = await fetch(INPUT_JSON_PATH, init);
        const actualJson = await response.json();

        const textContent = JSON.stringify(actualJson);

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.notOk(textContent.includes(PATTERN), 'Pattern is removed');
        assert.ok(textContent.includes(REPLACEMENT), 'New content is set');
        done();
    });

    test('Match all requests, replace by regex', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
        const TEST_METHOD = 'GET';
        const init = {
            method: TEST_METHOD,
        };

        const done = assert.async();

        const PATTERN = '/test/';
        const REPLACEMENT = 'new content';
        runScriptlet(name, [PATTERN, REPLACEMENT]);

        const response = await fetch(INPUT_JSON_PATH, init);
        const actualJson = await response.json();

        const textContent = JSON.stringify(actualJson);

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.notOk(textContent.includes(PATTERN), 'Pattern is removed');
        assert.ok(textContent.includes(REPLACEMENT), 'New content is set');
        done();
    });

    test('Match all requests, replace by regex with flag', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test03.json`;
        const TEST_METHOD = 'GET';
        const init = {
            method: TEST_METHOD,
        };

        const done = assert.async();

        const PATTERN = '/inner/g';
        const REPLACEMENT = 'qwerty';
        runScriptlet(name, [PATTERN, REPLACEMENT]);

        const response = await fetch(INPUT_JSON_PATH, init);
        const actualJson = await response.json();

        const textContent = JSON.stringify(actualJson);

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.notOk(textContent.includes(PATTERN), 'Pattern is removed');
        assert.ok(textContent.includes(REPLACEMENT), 'New content is set');
        done();
    });

    test('Match all requests, replace multiline content', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/empty.html`;
        const TEST_METHOD = 'GET';
        const init = {
            method: TEST_METHOD,
        };

        const done = assert.async();

        const PATTERN = '*';
        const REPLACEMENT = '';
        runScriptlet(name, [PATTERN, REPLACEMENT]);

        const response = await fetch(INPUT_JSON_PATH, init);
        const textContent = await response.text();

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.ok(textContent === '', 'Multiline content is removed');
        done();
    });

    test('Match request by url and method, remove all text content', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
        const TEST_METHOD = 'GET';
        const init = {
            method: TEST_METHOD,
        };

        const done = assert.async();

        const PATTERN = '*';
        const REPLACEMENT = '';
        const PROPS_TO_MATCH = 'test01 method:GET';
        runScriptlet(name, [PATTERN, REPLACEMENT, PROPS_TO_MATCH]);

        const response = await fetch(INPUT_JSON_PATH, init);
        const actualTextContent = await response.text();

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.strictEqual(actualTextContent, '', 'Content is removed');
        done();
    });

    test('Match request passed as URL object, remove all text content', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;

        const done = assert.async();

        const PATTERN = '*';
        const REPLACEMENT = '';
        const PROPS_TO_MATCH = 'test01';
        runScriptlet(name, [PATTERN, REPLACEMENT, PROPS_TO_MATCH]);

        const requestUrl = new URL(INPUT_JSON_PATH, window.location.href);
        const response = await fetch(requestUrl);
        const actualTextContent = await response.text();

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.strictEqual(actualTextContent, '', 'Content is removed');
        done();
    });

    test('Match request by url and method, replace text content and log', async (assert) => {
        assert.expect(4);

        console.log = (...args) => {
            if (args.length === 1 && args[0].includes('Original text content:')) {
                assert.ok(args[0].includes('Original text content: {\n    "a1": 1,\n'), 'should log text in console');
            }
            if (args.length === 1 && args[0].includes('Modified text content:')) {
                assert.ok(args[0].includes('Modified text content: foo bar'), 'should log text in console');
            }
            nativeConsole(...args);
        };

        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
        const TEST_METHOD = 'GET';
        const init = {
            method: TEST_METHOD,
        };

        const done = assert.async();

        const PATTERN = '*';
        const REPLACEMENT = 'foo bar';
        const PROPS_TO_MATCH = 'test01 method:GET';
        const VERBOSE = 'true';
        runScriptlet(name, [PATTERN, REPLACEMENT, PROPS_TO_MATCH, VERBOSE]);

        const response = await fetch(INPUT_JSON_PATH, init);
        const actualTextContent = await response.text();

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.strictEqual(actualTextContent, 'foo bar', 'Content is removed');
        done();
    });

    test('Unmatched request\'s content is not modified', async (assert) => {
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

        const PATTERN = '';
        const REPLACEMENT = '';
        const PROPS_TO_MATCH = 'test99 method:POST';
        runScriptlet(name, [PATTERN, REPLACEMENT, PROPS_TO_MATCH]);

        const done = assert.async();
        const response = await fetch(INPUT_JSON_PATH, init);
        const actualJson = await response.json();

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.deepEqual(actualJson, expectedJson, 'Content is intact');
        done();
    });

    test('Forged response props are copied properly', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
        const TEST_METHOD = 'GET';
        const init = {
            method: TEST_METHOD,
        };

        const done = assert.async();

        const PATTERN = '*';
        const REPLACEMENT = '';
        const PROPS_TO_MATCH = 'test01 method:GET';

        const expectedResponse = await fetch(INPUT_JSON_PATH, init);

        runScriptlet(name, [PATTERN, REPLACEMENT, PROPS_TO_MATCH]);

        const actualResponse = await fetch(INPUT_JSON_PATH, init);

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

        const {
            ok: okExpected,
            redirected: redirectedExpected,
            status: statusExpected,
            statusText: statusTextExpected,
            type: typeExpected,
            url: urlExpected,
        } = expectedResponse;

        const {
            ok,
            redirected,
            status,
            statusText,
            type,
            url,
        } = actualResponse;

        assert.strictEqual(ok, okExpected, 'response prop is copied');
        assert.strictEqual(redirected, redirectedExpected, 'response prop is copied');
        assert.strictEqual(status, statusExpected, 'response prop is copied');
        assert.strictEqual(statusText, statusTextExpected, 'response prop is copied');
        assert.strictEqual(type, typeExpected, 'response prop is copied');
        assert.strictEqual(url, urlExpected, 'response prop is copied');
        done();
    });

    test('URL matches but content pattern does not match, response is not modified', async (assert) => {
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

        // Use a broad URL pattern that matches, but a content pattern that doesn't exist
        const PATTERN = 'nonexistent_pattern_xyz';
        const REPLACEMENT = 'replacement';
        // /\\W/ matches any non-word character, so it matches all URLs
        const PROPS_TO_MATCH = '/\\W/';
        runScriptlet(name, [PATTERN, REPLACEMENT, PROPS_TO_MATCH]);

        const response = await fetch(INPUT_JSON_PATH, init);
        const actualJson = await response.json();

        assert.strictEqual(window.hit, undefined, 'hit should NOT fire when content pattern does not match');
        assert.deepEqual(actualJson, expectedJson, 'Response content is intact');
        done();
    });

    test('URL matches with broad regex, content pattern matches, response is modified', async (assert) => {
        const INPUT_JSON_PATH = `${FETCH_OBJECTS_PATH}/test01.json`;
        const TEST_METHOD = 'GET';
        const init = {
            method: TEST_METHOD,
        };

        const done = assert.async();

        const PATTERN = 'test';
        const REPLACEMENT = 'modified';
        // /\\W/ matches any non-word character, so it matches all URLs
        const PROPS_TO_MATCH = '/\\W/';
        runScriptlet(name, [PATTERN, REPLACEMENT, PROPS_TO_MATCH]);

        const response = await fetch(INPUT_JSON_PATH, init);
        const textContent = await response.text();

        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        assert.notOk(textContent.includes('test'), 'Pattern is replaced');
        assert.ok(textContent.includes('modified'), 'Replacement is present');
        done();
    });

    test('Data URL request, URL set by Object.defineProperty, content should NOT be replaced', async (assert) => {
        const JSON_CONTENT = '{"adPlacements":true,"playerAds":true,}';
        const BASE64 = btoa(JSON_CONTENT);
        const DATA_REQUEST = `data:application/json;base64,${BASE64}`;
        const REQUEST = new Request(DATA_REQUEST);
        Object.defineProperty(REQUEST, 'url', {
            get() {
                return 'https://www.example.org/ad_url_test';
            },
        });
        Object.defineProperty(REQUEST, 'method', {
            get() {
                return 'POST';
            },
        });
        Object.defineProperty(REQUEST, 'bodyUsed', {
            get() {
                return !0;
            },
        });
        Object.defineProperty(REQUEST, 'mode', {
            get() {
                return 'same-origin';
            },
        });
        Object.defineProperty(REQUEST, 'body', {
            get() {
                return new ReadableStream();
            },
        });

        const done = assert.async();

        const PATTERN = 'adPlacements';
        const REPLACEMENT = '';
        const PROPS_TO_MATCH = 'ad_url_test';
        runScriptlet(name, [PATTERN, REPLACEMENT, PROPS_TO_MATCH]);

        const response = await fetch(REQUEST);
        const actualTextContent = await response.text();

        assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
        assert.strictEqual(actualTextContent, JSON_CONTENT, 'Content is intact');
        done();
    });
    /**
     * Replaces `fetch` with a stub which resolves with a response of the text, or rejects,
     * so rules of real sites can be tested without requests, and counts its calls.
     * It has to be called before the scriptlet runs, as the scriptlet saves `fetch` then.
     *
     * @param {string} body text of the response
     * @param {boolean} [shouldReject] if true, the stub rejects, e.g. as `fetch` does on a network error
     * @returns {{ calls: number, response: Response|null }} state of the stub
     */
    const useFetchStub = (body, shouldReject = false) => {
        const stub = { calls: 0, response: null };
        // eslint-disable-next-line no-global-assign
        fetch = function fetch() {
            stub.calls += 1;
            if (shouldReject) {
                return Promise.reject(new TypeError('Failed to fetch'));
            }
            stub.response = new Response(body, { headers: { 'content-type': 'application/json' } });
            return Promise.resolve(stub.response);
        };
        return stub;
    };

    test.each(
        'uBO rule: replaces the text of a response of the matched URL',
        ['ubo-trusted-replace-fetch-response.js', 'ubo-trusted-replace-fetch-response', 'ubo-trusted-rpfr'],
        async (assert, uboName) => {
            // www.youtube.com##+js(trusted-rpfr, '"adPlacements"', '"no_ads"', player?)
            const stub = useFetchStub('{"adPlacements":[{"ad":1}],"videoDetails":{}}');
            runScriptlet(uboName, ['"adPlacements"', '"no_ads"', 'player?']);

            const response = await fetch('/youtubei/v1/player?prettyPrint=false');
            assert.strictEqual(await response.text(), '{"no_ads":[{"ad":1}],"videoDetails":{}}', 'Text replaced');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');

            const other = await fetch('/youtubei/v1/next');
            assert.strictEqual(other, stub.response, 'Response of another URL is the original one');
        },
    );

    test('uBO rule: replacement with escaped quotes is used as it is', async (assert) => {
        // deezer.com##+js(trusted-rpfr, /<VAST version.+VAST>/, <VAST version=\"4.0\"></VAST>, deezer.getAudiobreak)
        useFetchStub('<VAST version="3.0"><Ad id="1"></Ad></VAST>');
        runScriptlet('ubo-trusted-rpfr', [
            '/<VAST version.+VAST>/',
            '<VAST version=\\"4.0\\"></VAST>',
            'deezer.getAudiobreak',
        ]);

        const response = await fetch('/ajax/gw-light.php?method=deezer.getAudiobreak');
        assert.strictEqual(await response.text(), '<VAST version=\\"4.0\\"></VAST>', 'Escapes are kept, as in uBO');
    });

    test('uBO rule: URL matched by a regular expression with flags', async (assert) => {
        // eslint-disable-next-line max-len
        // tokopedia.com##+js(trusted-rpfr, '/\{"id":\d{9,11}(?:(?!"isTopads":false).)+?"isTopads":true.+?"__typename":"recommendationItem"\},/g', , /\/graphql\/productRecommendation/i)
        const body = '[{"id":1234567890,"isTopads":true,"__typename":"recommendationItem"},{"id":2}]';
        useFetchStub(body);
        runScriptlet('ubo-trusted-rpfr', [
            '/\\{"id":\\d{9,11}(?:(?!"isTopads":false).)+?"isTopads":true.+?"__typename":"recommendationItem"\\},/g',
            '',
            '/\\/graphql\\/productRecommendation/i',
        ]);

        const response = await fetch('/GraphQL/productRecommendation');
        assert.strictEqual(await response.text(), '[{"id":2}]', 'Ad item removed');
    });

    test('uBO rule: includes option', async (assert) => {
        // www.youtube.com##+js(trusted-rpfr, '"adPlacements"', '"no_ads"', player?), with `includes`
        const stub = useFetchStub('{"adPlacements":[]}');
        runScriptlet('ubo-trusted-rpfr', ['"adPlacements"', '"no_ads"', 'player?', 'includes', 'adSlots']);

        const response = await fetch('/youtubei/v1/player');
        assert.strictEqual(response, stub.response, 'Response which does not include the text is the original one');
        assert.strictEqual(window.hit, undefined, 'hit function not fired');
    });

    test('AdGuard rule: includes option', async (assert) => {
        // eslint-disable-next-line max-len
        // nytimes.com#%#//scriptlet('trusted-replace-fetch-response', '"show_ads":true', '"show_ads":false', 'statsig/initialize'),
        // with `includes`
        useFetchStub('{"show_ads":true,"user":"anonymous"}');
        runScriptlet(name, [
            '"show_ads":true',
            '"show_ads":false',
            'statsig/initialize',
            '',
            'includes',
            '"user":"anonymous"',
        ]);

        let response = await fetch('/statsig/initialize');
        assert.strictEqual(await response.text(), '{"show_ads":false,"user":"anonymous"}', 'Text replaced');

        useFetchStub('{"show_ads":true,"user":"subscriber"}');
        runScriptlet(name, [
            '"show_ads":true',
            '"show_ads":false',
            'statsig/initialize',
            '',
            'includes',
            '"user":"anonymous"',
        ]);
        response = await fetch('/statsig/initialize');
        assert.strictEqual(await response.text(), '{"show_ads":true,"user":"subscriber"}', 'Other text not replaced');
    });

    test('uBO rule: * is matched as the text .*, as in uBO', async (assert) => {
        const stub = useFetchStub('{"ads":1}');
        runScriptlet('ubo-trusted-rpfr', ['*', '']);

        const response = await fetch('/api');
        assert.strictEqual(response, stub.response, 'Response without the text .* is the original one');
    });

    test('uBO rule: empty pattern does nothing', async (assert) => {
        const logs = [];
        console.log = (...args) => logs.push(args.join(' '));
        const stub = useFetchStub('{"ads":1}');
        runScriptlet('ubo-trusted-rpfr', ['', '']);

        const response = await fetch('/api');
        assert.strictEqual(response, stub.response, 'Response is the original one');
        assert.notOk(logs.some((log) => log.includes('fetch(')), 'Calls are not logged');
    });

    test('uBO rule: negated URL in propsToMatch', async (assert) => {
        // rooter.gg##+js(trusted-rpfr, /"remainingWatchDuration":\d+/, "remainingWatchDuration":9999999999, /stream),
        // with a negated URL
        const stub = useFetchStub('{"remainingWatchDuration":30}');
        runScriptlet('ubo-trusted-rpfr', [
            '/"remainingWatchDuration":\\d+/',
            '"remainingWatchDuration":9999999999',
            '!/live/',
        ]);

        let response = await fetch('/api/stream');
        assert.strictEqual(await response.text(), '{"remainingWatchDuration":9999999999}', 'Other URL replaced');
        response = await fetch('/api/live/stream');
        assert.strictEqual(response, stub.response, 'Response of the negated URL is the original one');
    });

    test('uBO rule: quotes escaped by the converter are unescaped', async (assert) => {
        // A pattern with `'`, e.g. `it's`, is converted by AGTree to `it\'s`, which CoreLibs passes as it is
        useFetchStub('{"title":"it\'s an ad"}');
        runScriptlet('ubo-trusted-rpfr', ["it\\'s an ad", 'content']);

        const response = await fetch('/api');
        assert.strictEqual(await response.text(), '{"title":"content"}', 'Text replaced');
    });

    test.each(
        'rejected fetch is called once and its rejection is passed to the page',
        [
            // eslint-disable-next-line max-len
            // litv.tv#%#//scriptlet('trusted-replace-fetch-response', '"PlayAds":true', '"PlayAds":false', 'api/get-urls')
            { ruleName: name, args: ['"PlayAds":true', '"PlayAds":false', 'api/get-urls'] },
            // www.youtube.com##+js(trusted-rpfr, '"adSlots"', '"no_ads"', player?)
            { ruleName: 'ubo-trusted-rpfr', args: ['"adSlots"', '"no_ads"', 'player?'] },
        ],
        async (assert, { ruleName, args }) => {
            const stub = useFetchStub('', true);
            runScriptlet(ruleName, args);

            try {
                await fetch(ruleName === name ? '/api/get-urls' : '/youtubei/v1/player?');
                assert.ok(false, 'fetch should be rejected');
            } catch (e) {
                assert.strictEqual(e.message, 'Failed to fetch', 'Rejection is passed as it is');
            }
            assert.strictEqual(stub.calls, 1, 'fetch is called once');
        },
    );

    test.each(
        'error of matching the request is not thrown, and the call is passed through',
        [
            // eslint-disable-next-line max-len
            // litv.tv#%#//scriptlet('trusted-replace-fetch-response', '"PlayAds":true', '"PlayAds":false', 'api/get-urls')
            { ruleName: name, args: ['"PlayAds":true', '"PlayAds":false', 'api/get-urls'] },
            // www.youtube.com##+js(trusted-rpfr, '"adSlots"', '"no_ads"', player?)
            { ruleName: 'ubo-trusted-rpfr', args: ['"adSlots"', '"no_ads"', 'player?'] },
        ],
        async (assert, { ruleName, args }) => {
            const stub = useFetchStub('{"PlayAds":true,"adSlots":[]}');
            runScriptlet(ruleName, args);
            // e.g. options of the page with a getter which throws, which native `fetch()` passes as a rejection
            const options = {
                get method() {
                    throw new Error('page error');
                },
            };

            let result;
            try {
                result = fetch('/api/get-urls/player?', options);
            } catch (e) {
                assert.ok(false, `fetch should not throw: ${e.message}`);
            }
            assert.strictEqual(await result, stub.response, 'Original response of the call passed through');
            assert.strictEqual(stub.calls, 1, 'fetch is called once');
        },
    );

    test('AdGuard rule: request whose body has been used is passed through', async (assert) => {
        // eslint-disable-next-line max-len
        // litv.tv#%#//scriptlet('trusted-replace-fetch-response', '"PlayAds":true', '"PlayAds":false', 'api/get-urls')
        const stub = useFetchStub('{"PlayAds":true}');
        runScriptlet(name, ['"PlayAds":true', '"PlayAds":false', 'api/get-urls']);
        const request = new Request('/api/get-urls', { method: 'POST', body: 'id=1' });
        // a request whose body has been read cannot be cloned
        await request.text();

        let result;
        try {
            result = fetch(request);
        } catch (e) {
            assert.ok(false, `fetch should not throw: ${e.message}`);
        }
        assert.strictEqual(await result, stub.response, 'Original response of the call passed through');
        assert.strictEqual(stub.calls, 1, 'fetch is called once');
    });

    test('toString() of fetch returns the original value', (assert) => {
        const expected = fetch.toString();
        runScriptlet(name, ['"PlayAds":true', '"PlayAds":false', 'api/get-urls']);

        assert.strictEqual(fetch.toString(), expected, 'toString() is not changed');
    });
}
