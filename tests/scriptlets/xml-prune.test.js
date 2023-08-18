/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'xml-prune';

const MPD_OBJECTS_PATH = './test-files/manifestMPD.mpd';
const GET_METHOD = 'GET';
const nativeFetch = fetch;
const nativeXhrOpen = XMLHttpRequest.prototype.open;
const nativeConsole = console.log;

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    fetch = nativeFetch; // eslint-disable-line no-global-assign
    console.log = nativeConsole;
    XMLHttpRequest.prototype.open = nativeXhrOpen;
};

module(name, { beforeEach, afterEach });

const isSupported = typeof fetch !== 'undefined' && typeof Proxy !== 'undefined' && typeof Response !== 'undefined';

if (!isSupported) {
    test('unsupported', (assert) => {
        assert.ok(true, 'Browser does not support it');
    });
} else {
    test('Checking if alias name works', (assert) => {
        const adgParams = {
            name,
            engine: 'test',
            verbose: true,
        };
        const uboParams = {
            name: 'xml-prune.js',
            engine: 'test',
            verbose: true,
        };

        const codeByAdgParams = window.scriptlets.invoke(adgParams);
        const codeByUboParams = window.scriptlets.invoke(uboParams);

        assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
    });

    test('fetch - no prune (log)', async (assert) => {
        const done = assert.async(2);

        // mock console.log function for log checking
        console.log = function log(...args) {
            const input = args[0];
            if (typeof input === 'string' && typeof args[1] === 'undefined') {
                if (input.includes('trace')) {
                    return;
                }
                const EXPECTED_LOG_STR_START = `xml-prune: fetch URL: ${MPD_OBJECTS_PATH}`;
                assert.ok(input.startsWith(EXPECTED_LOG_STR_START), 'console.hit input');
                assert.ok(input.includes('pre-roll-1-ad-1'));
                done();
            }
            nativeConsole(...args);
        };

        runScriptlet(name);

        const response = await fetch(MPD_OBJECTS_PATH);
        const responseMPD = await response.text();

        assert.ok(responseMPD.includes('pre-roll-1-ad-1'));
        assert.strictEqual(window.hit, undefined, 'should not hit');
        done();
    });

    test('fetch URL does not match - no prune', async (assert) => {
        const MATCH_DATA = "Period[id*='-ad-']";
        const OPTIONAL_MATCH = '';
        const MATCH_URL = 'noPrune';
        const scriptletArgs = [MATCH_DATA, OPTIONAL_MATCH, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const response = await fetch(MPD_OBJECTS_PATH);
        const responseMPD = await response.text();

        assert.ok(responseMPD.includes('pre-roll-1-ad-1'));
        assert.strictEqual(window.hit, undefined, 'should not hit');
        done();
    });

    test('fetch match URL, element to remove does not match - no prune', async (assert) => {
        const MATCH_DATA = "Period[id*='do-no-match']";
        const OPTIONAL_MATCH = '';
        const MATCH_URL = '.mpd';
        const scriptletArgs = [MATCH_DATA, OPTIONAL_MATCH, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const response = await fetch(MPD_OBJECTS_PATH);
        const responseMPD = await response.text();

        assert.ok(responseMPD.includes('pre-roll-1-ad-1'));
        assert.strictEqual(window.hit, undefined, 'should not hit');
        done();
    });

    test('fetch match URL, optional argument does not match - no prune', async (assert) => {
        const MATCH_DATA = "Period[id*='-ad-']";
        const OPTIONAL_MATCH = 'DO_NOT_MATCH';
        const MATCH_URL = '.mpd';
        const scriptletArgs = [MATCH_DATA, OPTIONAL_MATCH, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const response = await fetch(MPD_OBJECTS_PATH);
        const responseMPD = await response.text();

        assert.ok(responseMPD.includes('pre-roll-1-ad-1'));
        assert.strictEqual(window.hit, undefined, 'should not hit');
        done();
    });

    test('fetch - remove ads', async (assert) => {
        const MATCH_DATA = ["Period[id*='-ad-']"];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const response = await fetch(MPD_OBJECTS_PATH);
        const responseMPD = await response.text();

        assert.notOk(responseMPD.includes('pre-roll-1-ad-1'));
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch match URL - remove ads', async (assert) => {
        const MATCH_DATA = "Period[id*='-ad-']";
        const OPTIONAL_MATCH = '';
        const MATCH_URL = '.mpd';
        const scriptletArgs = [MATCH_DATA, OPTIONAL_MATCH, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const response = await fetch(MPD_OBJECTS_PATH);
        const responseMPD = await response.text();

        assert.notOk(responseMPD.includes('pre-roll-1-ad-1'));
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch match URL, match optional argument - remove ads', async (assert) => {
        const MATCH_DATA = "Period[id*='-ad-']";
        const OPTIONAL_MATCH = 'AdaptationSet';
        const MATCH_URL = '.mpd';
        const scriptletArgs = [MATCH_DATA, OPTIONAL_MATCH, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const response = await fetch(MPD_OBJECTS_PATH);
        const responseMPD = await response.text();

        assert.notOk(responseMPD.includes('pre-roll-1-ad-1'));
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch match URL - new Request() remove ads', async (assert) => {
        const MATCH_DATA = "Period[id*='-ad-']";
        const OPTIONAL_MATCH = '';
        const MATCH_URL = '.mpd';
        const REQUEST_URL = new Request(MPD_OBJECTS_PATH);
        const scriptletArgs = [MATCH_DATA, OPTIONAL_MATCH, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const response = await fetch(REQUEST_URL);
        const responseMPD = await response.text();

        assert.notOk(responseMPD.includes('pre-roll-1-ad-1'));
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('xhr - no prune (log)', async (assert) => {
        const done = assert.async(2);

        console.log = function log(...args) {
            const input = args[0];
            if (typeof input === 'string' && typeof args[1] === 'undefined') {
                if (input.includes('trace')) {
                    return;
                }
                const EXPECTED_LOG_STR_START = 'xml-prune: XMLHttpRequest.open() URL:';
                const EXPECTED_LOG_PATH = `${(MPD_OBJECTS_PATH).slice(1)}`;
                assert.ok(input.startsWith(EXPECTED_LOG_STR_START), 'console.hit input EXPECTED_LOG_STR_START');
                assert.ok(input.includes(EXPECTED_LOG_PATH), 'console.hit input EXPECTED_LOG_PATH');
                assert.ok(input.includes('pre-roll-1-ad-1'), 'console.hit input');
                done();
            }
            nativeConsole(...args);
        };

        runScriptlet(name);

        const xhr = new XMLHttpRequest();
        xhr.open(GET_METHOD, MPD_OBJECTS_PATH);
        xhr.onload = () => {
            assert.ok(xhr.responseText.includes('pre-roll-1-ad-1'));
            done();
        };
        xhr.send();
    });

    test('xhr URL does not match - no prune', async (assert) => {
        const MATCH_DATA = "Period[id*='-ad-']";
        const OPTIONAL_MATCH = '';
        const MATCH_URL = 'noPrune';
        const scriptletArgs = [MATCH_DATA, OPTIONAL_MATCH, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(GET_METHOD, MPD_OBJECTS_PATH);
        xhr.onload = () => {
            assert.ok(xhr.responseText.includes('pre-roll-1-ad-1'));
            done();
        };
        xhr.send();
    });

    test('xhr match URL, element to remove does not match - no prune', async (assert) => {
        const MATCH_DATA = "Period[id*='do-no-match']";
        const OPTIONAL_MATCH = '';
        const MATCH_URL = '.mpd';
        const scriptletArgs = [MATCH_DATA, OPTIONAL_MATCH, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(GET_METHOD, MPD_OBJECTS_PATH);
        xhr.onload = () => {
            assert.ok(xhr.responseText.includes('pre-roll-1-ad-1'));
            done();
        };
        xhr.send();
    });

    test('xhr match URL, optional argument does not match - no prune', async (assert) => {
        const MATCH_DATA = "Period[id*='-ad-']";
        const OPTIONAL_MATCH = 'DO_NOT_MATCH';
        const MATCH_URL = '.mpd';
        const scriptletArgs = [MATCH_DATA, OPTIONAL_MATCH, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(GET_METHOD, MPD_OBJECTS_PATH);
        xhr.onload = () => {
            assert.ok(xhr.responseText.includes('pre-roll-1-ad-1'));
            done();
        };
        xhr.send();
    });

    test('xhr - remove ads', async (assert) => {
        const MATCH_DATA = ["Period[id*='-ad-']"];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(GET_METHOD, MPD_OBJECTS_PATH);
        xhr.onload = () => {
            assert.notOk(xhr.responseText.includes('pre-roll-1-ad-1'));
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('xhr match URL - remove ads', async (assert) => {
        const MATCH_DATA = "Period[id*='-ad-']";
        const OPTIONAL_MATCH = '';
        const MATCH_URL = '.mpd';
        const scriptletArgs = [MATCH_DATA, OPTIONAL_MATCH, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(GET_METHOD, MPD_OBJECTS_PATH);
        xhr.onload = () => {
            assert.notOk(xhr.responseText.includes('pre-roll-1-ad-1'));
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('xhr match URL, match optional argument - remove ads', async (assert) => {
        const MATCH_DATA = "Period[id*='-ad-']";
        const OPTIONAL_MATCH = 'AdaptationSet';
        const MATCH_URL = '.mpd';
        const scriptletArgs = [MATCH_DATA, OPTIONAL_MATCH, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(GET_METHOD, MPD_OBJECTS_PATH);
        xhr.onload = () => {
            assert.notOk(xhr.responseText.includes('pre-roll-1-ad-1'));
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('xhr - do nothing if response type is not a string', async (assert) => {
        const METHOD = 'GET';
        const done = assert.async();

        runScriptlet(name);

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, MPD_OBJECTS_PATH);
        xhr.responseType = 'blob';
        xhr.onload = () => {
            assert.ok(xhr.response instanceof Blob, 'Blob response');
            assert.strictEqual(window.hit, undefined, 'should not hit');
            done();
        };
        xhr.send();
    });

    test('xhr - remove ads - addEventListener', async (assert) => {
        const MATCH_DATA = ["Period[id*='-ad-']"];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(GET_METHOD, MPD_OBJECTS_PATH);
        xhr.addEventListener('readystatechange', () => {
            if (xhr.responseText && xhr.readyState >= 3) {
                assert.notOk(
                    xhr.responseText.includes('pre-roll-1-ad-1'),
                    'check if "re-roll-1-ad-1" has been removed',
                );
            }
        });
        xhr.onload = () => {
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    // This test is for issue with - Request with body": Failed to execute 'fetch' on 'Window':
    // Cannot construct a Request with a Request object that has already been used
    test('fetch - Request with object as a body', async (assert) => {
        const requestOptions = {
            method: 'POST',
            body: {
                0: 1,
            },
        };
        const request = new Request(MPD_OBJECTS_PATH, requestOptions);
        const MATCH_DATA = 'do_not_match';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const response = await fetch(request);
        const responseMPD = await response.text();

        assert.ok(
            responseMPD.includes('pre-roll-'),
            'content should not been removed',
        );
        assert.strictEqual(window.hit, undefined, 'should not hit');
        done();
    });

    test('fetch - XPath remove ads ', async (assert) => {
        const MATCH_DATA = ['xpath(//*[name()="Period"][contains(@id, "pre-roll") and contains(@id, "-ad-")])'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const response = await fetch(MPD_OBJECTS_PATH);
        const responseMPD = await response.text();

        assert.notOk(responseMPD.includes('pre-roll-1-ad-1'));
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch - XPath remove attribute from element 1', async (assert) => {
        const MATCH_DATA = ['xpath(//*[name()="Period"]/@duration)'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const response = await fetch(MPD_OBJECTS_PATH);
        const responseMPD = await response.text();
        assert.notOk(responseMPD.includes('duration'));
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch - XPath remove attribute from element 2', async (assert) => {
        const MATCH_DATA = ['xpath(//*[name()="Period"]//*[name()="AdaptationSet"]/@contentType)'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const response = await fetch(MPD_OBJECTS_PATH);
        const responseMPD = await response.text();
        assert.notOk(responseMPD.includes('contentType'));
        assert.ok(responseMPD.includes('segmentAlignment'));
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch - XPath remove attribute from element + optional argument', async (assert) => {
        const MATCH_DATA = 'xpath(//*[name()="Period"]/@duration)';
        const OPTIONAL_MATCH = 'AdaptationSet';
        const MATCH_URL = '.mpd';
        const scriptletArgs = [MATCH_DATA, OPTIONAL_MATCH, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const response = await fetch(MPD_OBJECTS_PATH);
        const responseMPD = await response.text();
        assert.notOk(responseMPD.includes('duration'));
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch - XPath remove element and attribute from element', async (assert) => {
        // eslint-disable-next-line max-len
        const MATCH_DATA = ['xpath(//*[name()="Period"][contains(@id, "pre-roll") and contains(@id, "-ad-")] | //*[name()="Period"]/@duration)'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const response = await fetch(MPD_OBJECTS_PATH);
        const responseMPD = await response.text();
        assert.notOk(responseMPD.includes('pre-roll-1-ad-1'));
        assert.notOk(responseMPD.includes('duration'));
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch - invalid XPath', async (assert) => {
        const MATCH_DATA = ['xpath({})'];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const response = await fetch(MPD_OBJECTS_PATH);
        const responseMPD = await response.text();

        assert.ok(responseMPD.includes('pre-roll-1-ad-1'));
        assert.strictEqual(window.hit, undefined, 'should not hit');
        done();
    });
}
