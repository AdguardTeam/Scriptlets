/* eslint-disable no-underscore-dangle, no-console */
import {
    runScriptlet,
    clearGlobalProps,
    countCreatedErrors,
    useFirefoxStackTraceFormat,
    useThrowingErrorConstructor,
    useUnreadableStackTrace,
} from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-json-set-xhr-response';

const FETCH_OBJECTS_PATH = './test-files';
const nativeXhrOpen = XMLHttpRequest.prototype.open;
const nativeXhrSend = XMLHttpRequest.prototype.send;
const nativeConsole = console.log;
const nativeJsonParse = JSON.parse;

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
    JSON.parse = nativeJsonParse;
};

module(name, { beforeEach, afterEach });

/**
 * Sends the request while the stack trace cannot be created or read.
 *
 * @param {XMLHttpRequest} xhr request to send
 * @param {Function} [useStackTraceFailure] function which makes creating or reading the stack trace throw
 * and returns a function which restores it
 */
const sendWithStackTraceFailure = (xhr, useStackTraceFailure = useUnreadableStackTrace) => {
    const restoreStackTrace = useStackTraceFailure();
    try {
        xhr.send();
    } finally {
        restoreStackTrace();
    }
};

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

    test('JSONPath mode can merge parsed json into an existing xhr response object', async (assert) => {
        runScriptlet(name, ['$.cc+={"blocked":{"enabled":true}}', '', '', 'test03', '', 'jsonpath']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test03.json`);
        xhr.onload = () => {
            assert.deepEqual(
                xhr.response.cc.blocked,
                { enabled: true },
                'jsonpath mode should merge parsed json into the target object',
            );
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

    test('applies when stack matches in Firefox stack trace format in xhr response', async (assert) => {
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

        // Stack trace of Firefox and Safari has no error message line,
        // so the frame of the function which calls the method should not be removed as the scriptlet's own one
        const restoreStackTraceFormat = useFirefoxStackTraceFormat();
        try {
            getXhrContent();
        } finally {
            restoreStackTraceFormat();
        }
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

    test('JSONPath mode prunes string-like JSON from xhr response', async (assert) => {
        runScriptlet(name, ['$..ads', '$remove$', '', 'string-like-json01', '', 'jsonpath']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/string-like-json01.txt`);
        xhr.onload = () => {
            const { responseText } = xhr;
            const adsIncluded = responseText.includes('"ads":{"content":"Sponsored"}');
            const contentIncluded = responseText.includes('"article":{"node":true,"content":"Article"}');

            assert.ok(contentIncluded, 'article object should still be present in the content');
            assert.notOk(adsIncluded, 'ads object should be removed from the content');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('JSONPath modifies ads.visibility to hidden in json-like response from xhr', async (assert) => {
        runScriptlet(name, ['$..ads.visibility=hidden', '', '', 'string-like-json01']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/string-like-json01.txt`);
        xhr.onload = () => {
            const { responseText } = xhr;
            const contentIncluded = responseText.includes('"article":{"node":true,"content":"Article"}');
            // eslint-disable-next-line max-len
            const adsVisibilityHiddenIncluded = responseText.includes('{"ads":{"content":"Sponsored","visibility":"hidden"}}');
            // eslint-disable-next-line max-len
            const adsVisibilityVisibleIncluded = responseText.includes('{"ads":{"content":"Sponsored","visibility":"visible"}}');

            assert.ok(contentIncluded, 'article object should still be present in the content');
            assert.ok(adsVisibilityHiddenIncluded, 'ads object should be removed from the content');
            assert.notOk(adsVisibilityVisibleIncluded, 'ads object should not be visible in the content');
            assert.ok(contentIncluded, 'article object should still be present in the content');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    // https://github.com/AdguardTeam/Scriptlets/issues/573
    test('legacy mode resolves $now$ for every response, not once', async (assert) => {
        runScriptlet(name, ['b2', '$now$', '', 'test01']);

        const done = assert.async();
        const scriptletRunTime = Date.now();

        /**
         * Sends a request and resolves with the modified 'b2' value.
         *
         * @returns {Promise<number>} value set instead of the '$now$' keyword
         */
        const requestTimeValue = () => {
            return new Promise((resolve) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
                xhr.onload = () => resolve(xhr.response.b2);
                xhr.responseType = 'json';
                xhr.send();
            });
        };

        const firstTimeValue = await requestTimeValue();
        // Delay guarantees that the time of the second response differs from the first one
        await new Promise((resolve) => {
            setTimeout(resolve, 20);
        });
        const secondTimeValue = await requestTimeValue();

        assert.strictEqual(typeof firstTimeValue, 'number', 'keyword has been replaced with time in ms');
        // Time of the response is set, not the time of the scriptlet run,
        // so the value is different for every response
        assert.ok(firstTimeValue >= scriptletRunTime, 'first response time is not earlier than the scriptlet run');
        assert.ok(secondTimeValue > firstTimeValue, 'second response time is later than the first one');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('legacy mode uses captured JSON.parse to resolve time keywords', async (assert) => {
        runScriptlet(name, ['cc', 'json:{"firstTime":$now$}', '', 'test03']);

        JSON.parse = () => ({ tampered: true });

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test03.json`);
        xhr.onload = () => {
            assert.strictEqual(
                typeof xhr.response.cc.firstTime,
                'number',
                'keyword has been resolved with the captured parser',
            );
            assert.strictEqual(
                xhr.response.cc.tampered,
                undefined,
                'page override has not affected the parsed value',
            );
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.responseType = 'json';
        xhr.send();
    });

    test('sets a property without stack if the stack trace cannot be read', async (assert) => {
        runScriptlet(name, ['a1', '10', '', 'test01']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.onload = () => {
            assert.deepEqual(xhr.response, { a1: 10, b2: 'test', c3: 3 }, 'response should be modified');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.responseType = 'json';
        sendWithStackTraceFailure(xhr);
    });

    test('sets a property without stack if the stack trace cannot be read — JSONPath', async (assert) => {
        runScriptlet(name, ['$.a1', '10', '', 'test01']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.onload = () => {
            assert.deepEqual(xhr.response, { a1: 10, b2: 'test', c3: 3 }, 'response should be modified');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.responseType = 'json';
        sendWithStackTraceFailure(xhr);
    });

    test('does not set a property with stack if the stack trace cannot be read', async (assert) => {
        runScriptlet(name, ['a1', '10', '', 'test01', 'getXhrContent']);

        const done = assert.async();
        const getXhrContent = () => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
            xhr.onload = () => {
                assert.deepEqual(xhr.response, { a1: 1, b2: 'test', c3: 3 }, 'response should stay intact');
                assert.strictEqual(window.hit, undefined, 'hit function should not fire');
                done();
            };
            xhr.responseType = 'json';
            sendWithStackTraceFailure(xhr);
        };

        getXhrContent();
    });

    test('sets a property without stack if the page has replaced Error', async (assert) => {
        runScriptlet(name, ['a1', '10', '', 'test01']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.onload = () => {
            assert.deepEqual(xhr.response, { a1: 10, b2: 'test', c3: 3 }, 'response should be modified');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.responseType = 'json';
        sendWithStackTraceFailure(xhr, useThrowingErrorConstructor);
    });

    test('does not read the stack trace without stack and verbose', async (assert) => {
        runScriptlet(name, ['a1', '10', '', 'test01']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.onload = () => {
            assert.deepEqual(xhr.response, { a1: 10, b2: 'test', c3: 3 }, 'response should be modified');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.responseType = 'json';

        assert.strictEqual(countCreatedErrors(() => xhr.send()), 0, 'No error created for the stack trace');
    });

    test('reads the stack trace with verbose', async (assert) => {
        runScriptlet(name, ['a1', '10', '', 'test01', '', '', 'true']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.onload = () => {
            assert.deepEqual(xhr.response, { a1: 10, b2: 'test', c3: 3 }, 'response should be modified');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.responseType = 'json';

        assert.strictEqual(countCreatedErrors(() => xhr.send()), 1, 'Error created for the stack trace');
    });

    test('sets a property in the response of each matched request of a reused XHR', async (assert) => {
        assert.timeout(3000);
        runScriptlet(name, ['a1', '10', '', 'test01']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        let loadsCount = 0;
        xhr.onload = () => {
            loadsCount += 1;
            assert.deepEqual(xhr.response, { a1: 10, b2: 'test', c3: 3 }, `response ${loadsCount} should be modified`);
            if (loadsCount === 2) {
                done();
                return;
            }
            xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
            xhr.responseType = 'json';
            xhr.send();
        };
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.responseType = 'json';
        xhr.send();
    });

    test('returns the native response of a reused XHR for a request which is not matched', async (assert) => {
        assert.timeout(3000);
        runScriptlet(name, ['a1', '10', '', 'test01']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
            assert.deepEqual(xhr.response, { a1: 10, b2: 'test', c3: 3 }, 'response of the matched request modified');

            xhr.onload = () => {
                assert.strictEqual(xhr.readyState, 4, 'native readyState after load');
                assert.deepEqual(xhr.response, { ad: 1, src: 'test', count: 3 }, 'native response returned');
                done();
            };
            const readyStatesDuringOpen = [];
            xhr.onreadystatechange = () => {
                readyStatesDuringOpen.push(xhr.readyState);
            };
            xhr.open('GET', `${FETCH_OBJECTS_PATH}/test02.json`);
            xhr.onreadystatechange = null;
            assert.notOk(readyStatesDuringOpen.includes(4), 'previous readyState should not be read during open()');
            assert.strictEqual(xhr.readyState, 1, 'native readyState after open()');
            xhr.responseType = 'json';
            xhr.send();
        };
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.responseType = 'json';
        xhr.send();
    });

    test('keeps the response of a synchronous request sent during open()', (assert) => {
        assert.timeout(3000);
        runScriptlet(name, ['a1', '10', '', 'test01']);

        const done = assert.async();
        const xhr = new XMLHttpRequest();
        let isSent = false;
        // `open()` fires it synchronously, and the request may be sent in it,
        // so its response is created before `open()` returns
        xhr.onreadystatechange = () => {
            if (!isSent && xhr.readyState === 1) {
                isSent = true;
                xhr.send();
            }
        };
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'readyState of the response');
            assert.strictEqual(xhr.status, 200, 'status of the response');
            assert.strictEqual(xhr.response, '{"a1":10,"b2":"test","c3":3}', 'response should be modified');
            done();
        };
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`, false);
    });

    test('keeps the previous response of a reused XHR if open() throws', async (assert) => {
        runScriptlet(name, ['a1', '10', '', 'test01']);

        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${FETCH_OBJECTS_PATH}/test01.json`);
        xhr.responseType = 'json';
        const loaded = new Promise((resolve) => {
            xhr.onload = resolve;
        });
        xhr.send();
        await loaded;

        // State of the object is not changed by `open()` which throws, e.g. for an invalid URL
        assert.throws(() => xhr.open('GET', 'http://['), 'open() throws for an invalid URL');
        assert.strictEqual(xhr.readyState, 4, 'readyState should be kept');
        assert.strictEqual(xhr.status, 200, 'status should be kept');
        assert.deepEqual(xhr.response, { a1: 10, b2: 'test', c3: 3 }, 'modified response should be kept');
    });
} else {
    test('unsupported', (assert) => {
        assert.ok(true, 'Browser does not support it');
    });
}
