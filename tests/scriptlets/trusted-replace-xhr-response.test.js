/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-replace-xhr-response';

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

    test('Matched, string pattern log', async (assert) => {
        assert.expect(6);

        console.log = (...args) => {
            if (args.length === 1 && args[0].includes('Original text content:')) {
                assert.ok(args[0].includes('Original text content: {\n    "a1": 1,\n'), 'should log text in console');
            }
            if (args.length === 1 && args[0].includes('Modified text content:')) {
                assert.ok(args[0].includes('Modified text content: foo bar'), 'should log text in console');
            }
            nativeConsole(...args);
        };

        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const PATTERN = '*';
        const REPLACEMENT = 'foo bar';
        const VERBOSE = 'true';
        const MATCH_DATA = [PATTERN, REPLACEMENT, `${URL} method:${METHOD}`, VERBOSE];

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

    test('Matched, regex pattern with flag', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test03.json`;

        const PATTERN = /inner/g;
        const REPLACEMENT = 'qwerty';
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

    test('Matched, string pattern, 2 separated scriptlets for the same request, test headers', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const HEADER_NAME_1 = 'first-header';
        const HEADER_VALUE_1 = 'foo';
        const HEADER_NAME_2 = 'second-header';
        const HEADER_VALUE_2 = 'bar';
        const HEADER_NAME_3 = 'test-header';
        const HEADER_VALUE_3 = '123';
        const PATTERN_1 = 'a1';
        const REPLACEMENT_1 = 'qwerty';
        const MATCH_DATA_1 = [PATTERN_1, REPLACEMENT_1, `${URL} method:${METHOD}`];

        const PATTERN_2 = 'test';
        const REPLACEMENT_2 = 'asdfgh';
        const MATCH_DATA_2 = [PATTERN_2, REPLACEMENT_2, `${URL} method:${METHOD}`];

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
            assert.notOk(xhr1.response.includes(PATTERN_1), 'Response has been modified');
            assert.ok(xhr1.response.includes(REPLACEMENT_1), 'Response text has been modified');

            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done1();
        };

        xhr2.onload = () => {
            assert.strictEqual(xhr2.readyState, 4, 'Response done');
            assert.notOk(xhr2.response.includes(PATTERN_2), 'Response has been modified');
            assert.ok(xhr2.response.includes(REPLACEMENT_2), 'Response text has been modified');

            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done2();
        };

        xhr1.send();
        setTimeout(() => xhr2.send(), 1);
    });
    test('URL matches but content pattern does not match, response is not modified', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;

        // Use a broad URL pattern that matches, but a content pattern that doesn't exist
        const PATTERN = 'nonexistent_pattern_xyz';
        const REPLACEMENT = 'replacement';
        // /\\W/ matches any non-word character, so it matches all URLs
        const PROPS_TO_MATCH = '/\\W/';
        const MATCH_DATA = [PATTERN, REPLACEMENT, PROPS_TO_MATCH];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.ok(xhr.response.includes('a1'), 'Response is intact');
            assert.ok(xhr.response.includes('test'), 'Response content is intact');
            assert.notOk(xhr.response.includes(REPLACEMENT), 'Replacement is not present');

            assert.strictEqual(window.hit, undefined, 'hit should NOT fire when content pattern does not match');
            done();
        };
        xhr.send();
    });

    test('URL matches with broad regex, content pattern matches, response is modified', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;

        const PATTERN = 'test';
        const REPLACEMENT = 'modified';
        // /\\W/ matches any non-word character, so it matches all URLs
        const PROPS_TO_MATCH = '/\\W/';
        const MATCH_DATA = [PATTERN, REPLACEMENT, PROPS_TO_MATCH];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.notOk(xhr.response.includes('test'), 'Pattern is replaced');
            assert.ok(xhr.response.includes('modified'), 'Replacement is present');

            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Matched, response headers are available on modified XHR', async (assert) => {
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

            const allHeaders = xhr.getAllResponseHeaders();
            assert.ok(typeof allHeaders === 'string' && allHeaders.length > 0, 'getAllResponseHeaders is not empty');
            assert.ok(
                allHeaders.toLowerCase().includes('content-type'),
                'getAllResponseHeaders contains content-type header',
            );
            assert.ok(
                xhr.getResponseHeader('Content-Type')?.includes('application/json'),
                'getResponseHeader returns the correct content-type value',
            );
            assert.strictEqual(
                xhr.getResponseHeader('non-existent-header'),
                null,
                'getResponseHeader returns null for missing header',
            );

            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    // bypass prevention: https://github.com/AdguardTeam/Scriptlets/issues/386
    test('Cannot be bypassed by setting shouldBePrevented = false on XHR object', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;

        const PATTERN = 'test';
        const REPLACEMENT = 'replaced';
        const PROPS_TO_MATCH = '';
        const MATCH_DATA = [PATTERN, REPLACEMENT, PROPS_TO_MATCH];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        // Attempt to bypass the scriptlet by setting shouldBePrevented to false
        xhr.shouldBePrevented = false;
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            // The scriptlet should still work despite the bypass attempt
            assert.notOk(xhr.response.includes('test'), 'Pattern is replaced despite bypass attempt');
            assert.ok(xhr.response.includes('replaced'), 'Replacement is present');

            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });
    // Fixtures of the test page have paths with the URLs of real rules, e.g. `youtubei/v1/player`
    const YOUTUBE_PLAYER_URL = `${FETCH_OBJECTS_PATH}/youtubei/v1/player`;
    const FACEBOOK_GRAPHQL_URL = `${FETCH_OBJECTS_PATH}/api/graphql`;
    const LOOKMOVIE_API_URL = `${FETCH_OBJECTS_PATH}/api/v1/config`;

    /**
     * Sends a request and resolves with it, and the events dispatched on it, once it is done.
     *
     * @param {string} url URL of the request
     * @param {object} [options] options of the request
     * @param {string} [options.responseType] response type
     * @param {boolean} [options.isAsync] false for a synchronous request
     * @returns {Promise<{ xhr: XMLHttpRequest, events: string[] }>} request and its events
     */
    const sendRequest = (url, { responseType = '', isAsync = true } = {}) => new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        const events = [];
        xhr.addEventListener('readystatechange', () => events.push(`readystatechange:${xhr.readyState}`));
        xhr.addEventListener('load', () => events.push('load'));
        xhr.addEventListener('error', () => events.push('error'));
        xhr.addEventListener('abort', () => events.push('abort'));
        xhr.addEventListener('loadend', () => {
            events.push('loadend');
            if (isAsync) {
                resolve({ xhr, events });
            }
        });
        xhr.open('GET', url, isAsync);
        // The response type of a synchronous request cannot be set, even to the default one
        if (responseType) {
            xhr.responseType = responseType;
        }
        xhr.send();
        if (!isAsync) {
            resolve({ xhr, events });
        }
    });

    test.each(
        'uBO rule: replaces the text of a response of the matched URL',
        ['ubo-trusted-replace-xhr-response.js', 'ubo-trusted-replace-xhr-response'],
        async (assert, uboName) => {
            // eslint-disable-next-line max-len
            // tv.youtube.com##+js(trusted-replace-xhr-response, '"adPlacements"', '"no_ads"', /playlist\?list=|\/player(?:\?.+)?$|watch\?[tv]=/)
            runScriptlet(uboName, [
                '"adPlacements"',
                '"no_ads"',
                '/playlist\\?list=|\\/player(?:\\?.+)?$|watch\\?[tv]=/',
            ]);

            const { xhr } = await sendRequest(YOUTUBE_PLAYER_URL);
            assert.ok(xhr.responseText.includes('"no_ads":[{'), 'Text replaced');
            assert.notOk(xhr.responseText.includes('"adPlacements"'), 'Pattern removed');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        },
    );

    test.each(
        'rule of both lists: removes the ad stories of facebook',
        [
            // eslint-disable-next-line max-len
            // facebook.com#%#//scriptlet('trusted-replace-xhr-response', '/\{"node":\{"__typename":"MarketplaceFeedAdStory"[^\n]+?"cursor":(?:null|"\{[^\n]+?\}"|[^\n]+?MarketplaceSearchFeedStoriesEdge")\}/g', '{}', '/api/graphql')
            name,
            // eslint-disable-next-line max-len
            // web.facebook.com##+js(trusted-replace-xhr-response, '/\{"node":\{"__typename":"MarketplaceFeedAdStory"[^\n]+?"cursor":(?:null|"\{[^\n]+?\}"|[^\n]+?MarketplaceSearchFeedStoriesEdge")\}/g', {}, /api/graphql)
            'ubo-trusted-replace-xhr-response',
        ],
        async (assert, ruleName) => {
            runScriptlet(ruleName, [
                // eslint-disable-next-line max-len
                '/\\{"node":\\{"__typename":"MarketplaceFeedAdStory"[^\\n]+?"cursor":(?:null|"\\{[^\\n]+?\\}"|[^\\n]+?MarketplaceSearchFeedStoriesEdge")\\}/g',
                '{}',
                '/api/graphql',
            ]);

            const { xhr } = await sendRequest(FACEBOOK_GRAPHQL_URL);
            assert.strictEqual(
                xhr.responseText,
                '{"data":{"edges":[{},{"node":{"__typename":"MarketplaceFeedListingStory","id":"2"},"cursor":null}]}}',
                'Ad story removed',
            );
        },
    );

    test('AdGuard rule: response of json responseType is parsed from the replaced text', async (assert) => {
        // lookmovie.pn#%#//scriptlet('trusted-replace-xhr-response', '/Timeout":\d+/', 'Timeout":0', '/api/v')
        runScriptlet(name, ['/Timeout":\\d+/', 'Timeout":0', '/api/v']);

        const { xhr } = await sendRequest(LOOKMOVIE_API_URL, { responseType: 'json' });
        assert.deepEqual(xhr.response, { adTimeout: 0, skipTimeout: 5 }, 'Object of the replaced text');
    });

    test('uBO rule: response of json responseType is not modified, as in uBO', async (assert) => {
        // lookmovie2.*##+js(trusted-replace-xhr-response, /Timeout":\d+/, Timeout":0, /api/v)
        runScriptlet('ubo-trusted-replace-xhr-response', ['/Timeout":\\d+/', 'Timeout":0', '/api/v']);

        const json = await sendRequest(LOOKMOVIE_API_URL, { responseType: 'json' });
        assert.deepEqual(json.xhr.response, { adTimeout: 15, skipTimeout: 5 }, 'Native response of json');
        const text = await sendRequest(LOOKMOVIE_API_URL);
        assert.strictEqual(text.xhr.responseText, '{"adTimeout":0,"skipTimeout":5}', 'Text response replaced');
    });

    test.each(
        'includes option',
        [
            // eslint-disable-next-line max-len
            // tv.youtube.com##+js(trusted-replace-xhr-response, '"adPlacements"', '"no_ads"', /playlist\?list=|\/player(?:\?.+)?$|watch\?[tv]=/), with `includes`
            {
                ruleName: 'ubo-trusted-replace-xhr-response',
                args: ['"adPlacements"', '"no_ads"', '/player', 'includes'],
            },
            // the same rule in AdGuard syntax
            { ruleName: name, args: ['"adPlacements"', '"no_ads"', '/player', '', 'includes'] },
        ],
        async (assert, { ruleName, args }) => {
            runScriptlet(ruleName, [...args, 'notInTheResponse']);
            let { xhr } = await sendRequest(YOUTUBE_PLAYER_URL);
            assert.ok(xhr.responseText.includes('"adPlacements"'), 'Text without the value not replaced');

            runScriptlet(ruleName, [...args, '"adSlots"']);
            ({ xhr } = await sendRequest(YOUTUBE_PLAYER_URL));
            assert.ok(xhr.responseText.includes('"no_ads"'), 'Text which includes the value replaced');
        },
    );

    test('uBO rule: empty pattern prepends the replacement, as in uBO', async (assert) => {
        runScriptlet('ubo-trusted-replace-xhr-response', ['', 'PREFIX-', '/api/v']);

        const { xhr } = await sendRequest(LOOKMOVIE_API_URL);
        assert.strictEqual(xhr.responseText, 'PREFIX-{"adTimeout":15,"skipTimeout":5}', 'Replacement prepended');
    });

    test('AdGuard rule: synchronous request gets its response when send() returns', async (assert) => {
        // lookmovie.pn#%#//scriptlet('trusted-replace-xhr-response', '/Timeout":\d+/', 'Timeout":0', '/api/v')
        runScriptlet(name, ['/Timeout":\\d+/', 'Timeout":0', '/api/v']);

        const { xhr, events } = await sendRequest(LOOKMOVIE_API_URL, { isAsync: false });
        assert.strictEqual(xhr.responseText, '{"adTimeout":0,"skipTimeout":5}', 'Text replaced');
        assert.ok(events.includes('load'), 'Events dispatched before send() returns');
    });

    test('AdGuard rule: aborted request is not completed', async (assert) => {
        // lookmovie.pn#%#//scriptlet('trusted-replace-xhr-response', '/Timeout":\d+/', 'Timeout":0', '/api/v')
        runScriptlet(name, ['/Timeout":\\d+/', 'Timeout":0', '/api/v']);
        const done = assert.async();
        const xhr = new XMLHttpRequest();
        const events = [];
        xhr.addEventListener('load', () => events.push('load'));
        xhr.addEventListener('abort', () => events.push('abort'));
        xhr.open('GET', LOOKMOVIE_API_URL);
        xhr.send();
        xhr.abort();

        setTimeout(() => {
            assert.deepEqual(events, ['abort'], 'Only abort is dispatched');
            assert.strictEqual(xhr.status, 0, 'Status of an aborted request');
            done();
        }, 300);
    });

    test('AdGuard rule: request of another object opened later is not sent instead', async (assert) => {
        // lookmovie.pn#%#//scriptlet('trusted-replace-xhr-response', '/Timeout":\d+/', 'Timeout":0', '/api/v')
        runScriptlet(name, ['/Timeout":\\d+/', 'Timeout":0', '/api/v']);
        const done = assert.async();
        const xhr = new XMLHttpRequest();
        const other = new XMLHttpRequest();
        xhr.open('GET', LOOKMOVIE_API_URL);
        other.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.addEventListener('loadend', () => {
            assert.strictEqual(xhr.responseText, '{"adTimeout":0,"skipTimeout":5}', 'Response of its own URL');
            done();
        });
        xhr.send();
    });

    test('uBO rule: error of matching the request is not thrown to the page', async (assert) => {
        const descriptor = Object.getOwnPropertyDescriptor(RegExp.prototype, 'test');
        // e.g. a method of an accessor of another rule which throws, only for the URL pattern of the rule here
        // eslint-disable-next-line no-extend-native
        Object.defineProperty(RegExp.prototype, 'test', {
            configurable: true,
            get: () => function test(text) {
                if (this.source === '\\/api\\/v') {
                    throw new Error('page error');
                }
                return descriptor.value.call(this, text);
            },
        });
        try {
            // lookmovie2.*##+js(trusted-replace-xhr-response, /Timeout":\d+/, Timeout":0, /api/v)
            runScriptlet('ubo-trusted-replace-xhr-response', ['/Timeout":\\d+/', 'Timeout":0', '/api/v']);

            const { xhr } = await sendRequest(LOOKMOVIE_API_URL);
            assert.strictEqual(xhr.responseText, '{"adTimeout":15,"skipTimeout":5}', 'Request sent as it is');
        } finally {
            // eslint-disable-next-line no-extend-native
            Object.defineProperty(RegExp.prototype, 'test', descriptor);
        }
    });
} else {
    test('unsupported', (assert) => {
        assert.ok(true, 'Browser does not support it');
    });
}
