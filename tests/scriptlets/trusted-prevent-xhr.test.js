/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-prevent-xhr';

const FETCH_OBJECTS_PATH = './test-files';
const nativeXhrOpen = XMLHttpRequest.prototype.open;
const nativeXhrSend = XMLHttpRequest.prototype.send;
const nativeGetResponseHeader = XMLHttpRequest.prototype.getResponseHeader;
const nativeGetAllResponseHeaders = XMLHttpRequest.prototype.getAllResponseHeaders;
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
    XMLHttpRequest.prototype.getResponseHeader = nativeGetResponseHeader;
    XMLHttpRequest.prototype.getAllResponseHeaders = nativeGetAllResponseHeaders;
    console.log = nativeConsole;
};

module(name, { beforeEach, afterEach });

const isSupported = typeof Proxy !== 'undefined';

if (isSupported) {
    test('Args matched, literal text passthrough', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['test01.json', '{"blocked":true}'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.strictEqual(xhr.status, 200, 'status set to 200');
            assert.strictEqual(xhr.responseText, '{"blocked":true}', 'Literal response text');
            assert.strictEqual(xhr.response, '{"blocked":true}', 'Literal response');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Literal text - non-keyword string', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', 'hello world'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.responseText, 'hello world', 'Literal text returned as-is (trusted)');
            assert.strictEqual(xhr.response, 'hello world', 'Literal response');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Empty arg, prevent all, directive: emptyObj', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', 'emptyObj'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.responseText, '{}', 'Response text is empty object');
            assert.strictEqual(xhr.response, '{}', 'Response is empty object');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Empty arg, prevent all, directive: emptyArr', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', 'emptyArr'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.responseText, '[]', 'Response text is empty array');
            assert.strictEqual(xhr.response, '[]', 'Response is empty array');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Empty arg, prevent all, directive: emptyStr', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', 'emptyStr'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.responseText, '', 'Response text is empty string');
            assert.strictEqual(xhr.response, '', 'Response is empty string');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Randomize response text (true)', async (assert) => {
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
            assert.strictEqual(xhr.response, xhr.responseText, 'Response matches responseText');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Randomize response text - single length (length:50)', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', 'length:50'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.responseText.length, 50, 'Response text is 50 chars');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Randomize response text - range (length:100-300)', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', 'length:100-300'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(typeof xhr.responseText, 'string', 'Response text mocked');
            assert.ok(
                xhr.responseText.length >= 100 && xhr.responseText.length <= 300,
                `Response text randomized, length: ${xhr.responseText.length}`,
            );
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Randomize response text - limit range (length:600000)', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', 'length:600000'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.responseText.length, 0, 'Response text is not randomized (exceeds cap)');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Randomize response text - large length (length:100000)', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', 'length:100000'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.responseText.length, 100000, 'Response text is 100000 chars');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Randomize response text (true) - always 10 chars', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', 'true'];

        // Run multiple times to catch edge cases where Math.random() produces
        // very small values
        const lengths = [];
        for (let i = 0; i < 20; i += 1) {
            runScriptlet(name, MATCH_DATA);
            // eslint-disable-next-line no-await-in-loop
            await new Promise((resolve) => {
                const xhr = new XMLHttpRequest();
                xhr.open(METHOD, URL);
                xhr.onload = () => {
                    lengths.push(xhr.responseText.length);
                    resolve();
                };
                xhr.send();
            });
        }
        assert.ok(
            lengths.every((len) => len === 10),
            'Response text is always exactly 10 chars across 20 runs',
        );
    });

    test('Compound directive - length:50 with literal text', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', 'length:50 hello'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.responseText.length, 50, 'Response text is 50 chars');
            assert.ok(xhr.responseText.startsWith('hello'), 'Response starts with literal text');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Compound directive - literal text before length:', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', 'body ins.adsbygoogle length:100'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.strictEqual(xhr.responseText.length, 100, 'Response text is 100 chars');
            assert.ok(xhr.responseText.startsWith('body ins.adsbygoogle'), 'Response starts with literal text');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Compound directive - length: range with literal text', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['', 'length:80-120 test'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.onload = () => {
            assert.ok(
                xhr.responseText.length >= 80 && xhr.responseText.length <= 120,
                `Response text length in range [80,120]: ${xhr.responseText.length}`,
            );
            assert.ok(xhr.responseText.startsWith('test'), 'Response starts with literal text');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
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

    test('Empty arg, prevent all, check getResponseHeader() and getAllResponseHeaders()', async (assert) => {
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

    test('Check if all 4 readyState events were fired', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = [''];
        const done = assert.async();

        runScriptlet(name, MATCH_DATA);

        // track each readyState event
        const xhrEvents = [false, false, false, false];

        // track the last fired readyState to ensure no skipping
        let lastReadyState = 0;

        const xhr = new XMLHttpRequest();

        xhr.onreadystatechange = () => {
            // ensure no states are skipped
            assert.ok(
                xhr.readyState >= lastReadyState,
                `readyState moved forward from ${lastReadyState} to ${xhr.readyState}`,
            );
            lastReadyState = xhr.readyState;

            // mark each readyState event as fired
            xhrEvents[xhr.readyState - 1] = true;

            if (xhr.readyState === 4) {
                assert.strictEqual(xhr.responseURL, URL, 'URL mocked');
                assert.ok(xhrEvents.every((event) => event), 'All readyState change events were fired');
                done();
            }
        };

        xhr.open(METHOD, URL);
        xhr.send();
    });

    test('Prevent matched - blob responseType', async (assert) => {
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
                /* ignore */
            }
            document.body.appendChild(createImg);
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.strictEqual(xhr.response instanceof Blob, true, 'Response data mocked');
            assert.ok(createImg.src.startsWith('blob:'), 'Image with source blob');
            assert.throws(
                () => xhr.responseText,
                /InvalidStateError/,
                'responseText throws for blob responseType',
            );
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            createImg.remove();
            done();
        };
        xhr.send();
    });

    test('Prevent matched - arraybuffer responseType', async (assert) => {
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
            assert.throws(
                () => xhr.responseText,
                /InvalidStateError/,
                'responseText throws for arraybuffer responseType',
            );
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            createImg.remove();
            done();
        };
        xhr.send();
    });

    test('Prevent matched - document responseType', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = [`test01.json method:${METHOD}`];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.responseType = 'document';
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.ok(xhr.response instanceof Document, 'Response is a Document');
            assert.ok(xhr.responseXML instanceof Document, 'ResponseXML is a Document');
            assert.throws(
                () => xhr.responseText,
                /InvalidStateError/,
                'responseText throws for document responseType',
            );
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Prevent matched - json responseType', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = [`test01.json method:${METHOD}`];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.responseType = 'json';
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.propEqual(xhr.response, {}, 'Response is empty object');
            assert.throws(
                () => xhr.responseText,
                /InvalidStateError/,
                'responseText throws for json responseType',
            );
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('Prevent matched - json responseType with literal JSON (trusted)', async (assert) => {
        const METHOD = 'GET';
        const URL = `${FETCH_OBJECTS_PATH}/test01.json`;
        const MATCH_DATA = ['test01.json', '{"blocked":true}'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, URL);
        xhr.responseType = 'json';
        xhr.onload = () => {
            assert.strictEqual(xhr.readyState, 4, 'Response done');
            assert.propEqual(xhr.response, { blocked: true }, 'Response is parsed JSON object');
            assert.throws(
                () => xhr.responseText,
                /InvalidStateError/,
                'responseText throws for json responseType',
            );
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
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
    /**
     * Sends a request and waits for it to be done.
     *
     * @param {string} url URL of the request
     * @param {object} [options] options of the request
     * @param {string} [options.method] method of the request
     * @param {string} [options.type] `responseType` of the request
     * @returns {Promise<XMLHttpRequest>} request which is done
     */
    const sendRequest = (url, { method = 'GET', type = '' } = {}) => new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.responseType = type;
        xhr.onloadend = () => resolve(xhr);
        xhr.send();
    });

    const UBO_NAMES = ['ubo-trusted-prevent-xhr', 'ubo-trusted-prevent-xhr.js'];

    test.each('uBO rule: quotes escaped by the converter are unescaped', UBO_NAMES, async (assert, uboName) => {
        // namiko.net##+js(trusted-prevent-xhr, /googlesyndication|doubleclick/, "dataset.namikoVisitProbe='ready'"),
        // which AGTree converts with `\'`, and CoreLibs passes it as it is
        runScriptlet(uboName, ['/googlesyndication|doubleclick/', "dataset.namikoVisitProbe=\\'ready\\'"]);

        const xhr = await sendRequest(`${FETCH_OBJECTS_PATH}/test01.json?doubleclick`);

        assert.strictEqual(xhr.responseText, "dataset.namikoVisitProbe='ready'", 'Escape removed');
        assert.strictEqual(xhr.status, 200, 'status set to 200');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    });

    test('uBO rule: response headers as in uBO, an AdGuard rule returns the request headers', async (assert) => {
        // namiko.net##+js(trusted-prevent-xhr, /googlesyndication|doubleclick/, "dataset.namikoVisitProbe='ready'")
        runScriptlet('ubo-trusted-prevent-xhr', ['/googlesyndication|doubleclick/', 'probe']);
        const uboXhr = await sendRequest(`${FETCH_OBJECTS_PATH}/test01.json?googlesyndication`);

        assert.strictEqual(uboXhr.getResponseHeader('Content-Type'), 'text/plain', 'Content type of the text');
        assert.strictEqual(uboXhr.getResponseHeader('content-length'), '5', 'Length of the text');
        assert.ok(
            /^date: .+ GMT\r\ncontent-type: text\/plain\r\ncontent-length: 5\r\n$/.test(uboXhr.getAllResponseHeaders()),
            'All headers',
        );

        runScriptlet(name, ['test02.json', 'probe']);
        const adgXhr = new XMLHttpRequest();
        const done = assert.async();
        adgXhr.open('GET', `${FETCH_OBJECTS_PATH}/test02.json`);
        adgXhr.setRequestHeader('X-Test', '1');
        adgXhr.onloadend = () => {
            assert.strictEqual(adgXhr.getAllResponseHeaders(), 'x-test: 1', 'Request headers, as before');
            done();
        };
        adgXhr.send();
    });

    test('uBO rule: json response is an empty object, as in uBO, AdGuard rule parses the directive', async (assert) => {
        // eslint-disable-next-line max-len
        // sbs.com.au##+js(trusted-prevent-xhr, securepubads.g.doubleclick.net/pagead/ima_ppub_config?ippd=https%3A%2F%2Fwww.sbs.com.au%2Fondemand%2F&ord=, ["4117"])
        runScriptlet('ubo-trusted-prevent-xhr', ['test01.json', '["4117"]']);
        const uboXhr = await sendRequest(`${FETCH_OBJECTS_PATH}/test01.json`, { type: 'json' });
        assert.deepEqual(uboXhr.response, {}, 'Empty object by the uBO rule');
        assert.strictEqual(uboXhr.getResponseHeader('content-type'), 'application/json', 'Content type of JSON');

        runScriptlet(name, ['test02.json', '["4117"]']);
        const adgXhr = await sendRequest(`${FETCH_OBJECTS_PATH}/test02.json`, { type: 'json' });
        assert.deepEqual(adgXhr.response, ['4117'], 'Directive parsed by the AdGuard rule');
    });

    test('uBO rule: negated method, as in uBO', async (assert) => {
        runScriptlet('ubo-trusted-prevent-xhr', ['test01.json method:!POST', 'prevented']);

        const getXhr = await sendRequest(`${FETCH_OBJECTS_PATH}/test01.json`);
        assert.strictEqual(getXhr.responseText, 'prevented', 'GET request prevented');
        const postXhr = await sendRequest(`${FETCH_OBJECTS_PATH}/test01.json`, { method: 'POST' });
        assert.notStrictEqual(postXhr.responseText, 'prevented', 'POST request not prevented');
    });

    test('uBO rule: `*` is a text, as in uBO, an AdGuard rule matches all requests', async (assert) => {
        runScriptlet('ubo-trusted-prevent-xhr', ['*', 'by uBO rule']);
        const uboXhr = await sendRequest(`${FETCH_OBJECTS_PATH}/test01.json`);
        assert.notStrictEqual(uboXhr.responseText, 'by uBO rule', 'Not prevented by the uBO rule');

        runScriptlet(name, ['*', 'by AdGuard rule']);
        const adgXhr = await sendRequest(`${FETCH_OBJECTS_PATH}/test01.json`);
        assert.strictEqual(adgXhr.responseText, 'by AdGuard rule', 'Prevented by the AdGuard rule');
    });

    test('uBO rule: empty arguments log requests, as in uBO, an AdGuard rule prevents all requests', async (assert) => {
        runScriptlet('ubo-trusted-prevent-xhr', ['', '']);
        const uboXhr = await sendRequest(`${FETCH_OBJECTS_PATH}/test01.json`);
        assert.ok(uboXhr.responseText.length > 0, 'Not prevented by the uBO rule');

        runScriptlet(name, ['', '']);
        const adgXhr = await sendRequest(`${FETCH_OBJECTS_PATH}/test01.json`);
        assert.strictEqual(adgXhr.responseText, '', 'Prevented by the AdGuard rule');
    });

    test('uBO rule: directives of uBO', async (assert) => {
        runScriptlet('ubo-trusted-prevent-xhr', ['test01.json', 'join:||emptyObj||emptyArr']);
        runScriptlet('ubo-trusted-prevent-xhr', ['test02.json', 'length:20 body']);
        runScriptlet(name, ['test03.json', 'length:20 body']);

        const joined = await sendRequest(`${FETCH_OBJECTS_PATH}/test01.json`);
        assert.strictEqual(joined.responseText, '{}[]', 'Content of the directives joined');
        const uboLength = await sendRequest(`${FETCH_OBJECTS_PATH}/test02.json`);
        assert.strictEqual(uboLength.responseText, '', 'Length with a text is empty, as in uBO');
        const adgLength = await sendRequest(`${FETCH_OBJECTS_PATH}/test03.json`);
        assert.strictEqual(adgLength.responseText, 'bodybodybodybodybody', 'Text repeated by the AdGuard rule');
    });
} else {
    test('unsupported', (assert) => {
        assert.ok(true, 'Browser does not support it');
    });
}
