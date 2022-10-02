/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'xml-prune';

const MPD_OBJECTS_PATH = './test-files/manifestMPD.mpd';
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

    test('fetch - no prune', async (assert) => {
        const MPD_PATH = `${MPD_OBJECTS_PATH}`;
        const done = assert.async();

        runScriptlet(name);

        const response = await fetch(MPD_PATH);
        const responseMPD = await response.text();

        assert.ok(responseMPD.includes('pre-roll-1-ad-1'));
        assert.strictEqual(window.hit, undefined, 'should not hit');
        done();
    });

    test('fetch URL does not match - no prune', async (assert) => {
        const MPD_PATH = `${MPD_OBJECTS_PATH}`;
        const MATCH_DATA = "Period[id*='-ad-']";
        const OPTIONAL_MATCH = '';
        const MATCH_URL = 'noPrune';
        const scriptletArgs = [MATCH_DATA, OPTIONAL_MATCH, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const response = await fetch(MPD_PATH);
        const responseMPD = await response.text();

        assert.ok(responseMPD.includes('pre-roll-1-ad-1'));
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch match URL, element to remove does not match - no prune', async (assert) => {
        const MPD_PATH = `${MPD_OBJECTS_PATH}`;
        const MATCH_DATA = "Period[id*='do-no-match']";
        const OPTIONAL_MATCH = '';
        const MATCH_URL = '.mpd';
        const scriptletArgs = [MATCH_DATA, OPTIONAL_MATCH, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const response = await fetch(MPD_PATH);
        const responseMPD = await response.text();

        assert.ok(responseMPD.includes('pre-roll-1-ad-1'));
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch match URL, optional argument does not match - no prune', async (assert) => {
        const MPD_PATH = `${MPD_OBJECTS_PATH}`;
        const MATCH_DATA = "Period[id*='-ad-']";
        const OPTIONAL_MATCH = 'DO_NOT_MATCH';
        const MATCH_URL = '.mpd';
        const scriptletArgs = [MATCH_DATA, OPTIONAL_MATCH, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const response = await fetch(MPD_PATH);
        const responseMPD = await response.text();

        assert.ok(responseMPD.includes('pre-roll-1-ad-1'));
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch - remove ads', async (assert) => {
        const MPD_PATH = `${MPD_OBJECTS_PATH}`;
        const MATCH_DATA = ["Period[id*='-ad-']"];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const response = await fetch(MPD_PATH);
        const responseMPD = await response.text();

        assert.ok(!responseMPD.includes('pre-roll-1-ad-1'));
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch match URL - remove ads', async (assert) => {
        const MPD_PATH = `${MPD_OBJECTS_PATH}`;
        const MATCH_DATA = "Period[id*='-ad-']";
        const OPTIONAL_MATCH = '';
        const MATCH_URL = '.mpd';
        const scriptletArgs = [MATCH_DATA, OPTIONAL_MATCH, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const response = await fetch(MPD_PATH);
        const responseMPD = await response.text();

        assert.ok(!responseMPD.includes('pre-roll-1-ad-1'));
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch match URL, match optional argument - remove ads', async (assert) => {
        const MPD_PATH = `${MPD_OBJECTS_PATH}`;
        const MATCH_DATA = "Period[id*='-ad-']";
        const OPTIONAL_MATCH = 'SegmentTemplate';
        const MATCH_URL = '.mpd';
        const scriptletArgs = [MATCH_DATA, OPTIONAL_MATCH, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const response = await fetch(MPD_PATH);
        const responseMPD = await response.text();

        assert.ok(!responseMPD.includes('pre-roll-1-ad-1'));
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('xhr - no prune', async (assert) => {
        const METHOD = 'GET';
        const MPD_PATH = `${MPD_OBJECTS_PATH}`;
        const done = assert.async();

        runScriptlet(name);

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, MPD_PATH);
        xhr.onload = () => {
            assert.ok(xhr.responseText.includes('pre-roll-1-ad-1'));
            assert.strictEqual(window.hit, undefined, 'should not hit');
            done();
        };
        xhr.send();
    });

    test('xhr URL does not match - no prune', async (assert) => {
        const METHOD = 'GET';
        const MPD_PATH = `${MPD_OBJECTS_PATH}`;
        const MATCH_DATA = "Period[id*='do-no-match']";
        const OPTIONAL_MATCH = '';
        const MATCH_URL = '.mpd';
        const scriptletArgs = [MATCH_DATA, OPTIONAL_MATCH, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, MPD_PATH);
        xhr.onload = () => {
            assert.ok(xhr.responseText.includes('pre-roll-1-ad-1'));
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('xhr match URL, element to remove does not match - no prune', async (assert) => {
        const METHOD = 'GET';
        const MPD_PATH = `${MPD_OBJECTS_PATH}`;
        const MATCH_DATA = "Period[id*='do-no-match']";
        const OPTIONAL_MATCH = '';
        const MATCH_URL = '.mpd';
        const scriptletArgs = [MATCH_DATA, OPTIONAL_MATCH, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, MPD_PATH);
        xhr.onload = () => {
            assert.ok(xhr.responseText.includes('pre-roll-1-ad-1'));
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('xhr match URL, optional argument does not match - no prune', async (assert) => {
        const METHOD = 'GET';
        const MPD_PATH = `${MPD_OBJECTS_PATH}`;
        const MATCH_DATA = "Period[id*='-ad-']";
        const OPTIONAL_MATCH = 'DO_NOT_MATCH';
        const MATCH_URL = '.mpd';
        const scriptletArgs = [MATCH_DATA, OPTIONAL_MATCH, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, MPD_PATH);
        xhr.onload = () => {
            assert.ok(xhr.responseText.includes('pre-roll-1-ad-1'));
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('xhr - remove ads', async (assert) => {
        const METHOD = 'GET';
        const MPD_PATH = `${MPD_OBJECTS_PATH}`;
        const MATCH_DATA = ["Period[id*='-ad-']"];

        runScriptlet(name, MATCH_DATA);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, MPD_PATH);
        xhr.onload = () => {
            assert.ok(!xhr.responseText.includes('pre-roll-1-ad-1'));
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('xhr match URL - remove ads', async (assert) => {
        const METHOD = 'GET';
        const MPD_PATH = `${MPD_OBJECTS_PATH}`;
        const MATCH_DATA = "Period[id*='-ad-']";
        const OPTIONAL_MATCH = '';
        const MATCH_URL = '.mpd';
        const scriptletArgs = [MATCH_DATA, OPTIONAL_MATCH, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, MPD_PATH);
        xhr.onload = () => {
            assert.ok(!xhr.responseText.includes('pre-roll-1-ad-1'));
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('xhr match URL, match optional argument - remove ads', async (assert) => {
        const METHOD = 'GET';
        const MPD_PATH = `${MPD_OBJECTS_PATH}`;
        const MATCH_DATA = "Period[id*='-ad-']";
        const OPTIONAL_MATCH = 'SegmentTemplate';
        const MATCH_URL = '.mpd';
        const scriptletArgs = [MATCH_DATA, OPTIONAL_MATCH, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, MPD_PATH);
        xhr.onload = () => {
            assert.ok(!xhr.responseText.includes('pre-roll-1-ad-1'));
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });
}
