/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'm3u-prune';

const M3U8_OBJECTS_PATH_01 = './test-files/manifestM3U8-01.m3u8';
const M3U8_OBJECTS_PATH_02 = './test-files/manifestM3U8-02.m3u8';
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
            name: 'm3u-prune.js',
            engine: 'test',
            verbose: true,
        };

        const codeByAdgParams = window.scriptlets.invoke(adgParams);
        const codeByUboParams = window.scriptlets.invoke(uboParams);

        assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
    });

    test('fetch - no prune 1', async (assert) => {
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_01}`;
        const done = assert.async();

        runScriptlet(name);

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();

        assert.ok(responseM3U8.includes('tvessaiprod.nbcuni.com/video/'));
        assert.strictEqual(window.hit, undefined, 'should not hit');
        done();
    });

    test('fetch - no prune 2', async (assert) => {
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_02}`;
        const done = assert.async();

        runScriptlet(name);

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();

        assert.ok(responseM3U8.includes('#EXT-X-VMAP-AD-BREAK'));
        assert.strictEqual(window.hit, undefined, 'should not hit');
        done();
    });

    test('fetch URL does not match - no prune 1', async (assert) => {
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_01}`;
        const MATCH_DATA = 'tvessaiprod.nbcuni.com/video/';
        const MATCH_URL = 'noPrune';
        const scriptletArgs = [MATCH_DATA, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();
        assert.ok(responseM3U8.includes('tvessaiprod.nbcuni.com/video/'));
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch URL does not match - no prune 2', async (assert) => {
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_02}`;
        const MATCH_DATA = 'tvessaiprod.nbcuni.com/video/';
        const MATCH_URL = 'noPrune';
        const scriptletArgs = [MATCH_DATA, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();

        assert.ok(responseM3U8.includes('#EXT-X-VMAP-AD-BREAK'));
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch - remove ads 1', async (assert) => {
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_01}`;
        const MATCH_DATA = 'tvessaiprod.nbcuni.com/video/';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const response = await fetch(M3U8_PATH);
        const responseMPD = await response.text();

        assert.ok(!responseMPD.includes('tvessaiprod.nbcuni.com/video/'));
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch - remove ads 2', async (assert) => {
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_02}`;
        const MATCH_DATA = 'VMAP-AD-BREAK';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const response = await fetch(M3U8_PATH);
        const responseMPD = await response.text();

        assert.ok(!responseMPD.includes('#EXT-X-VMAP-AD-BREAK'));
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch match URL - remove ads 1', async (assert) => {
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_01}`;
        const MATCH_DATA = 'tvessaiprod.nbcuni.com/video/';
        const MATCH_URL = '.m3u8';
        const scriptletArgs = [MATCH_DATA, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();
        assert.ok(!responseM3U8.includes('tvessaiprod.nbcuni.com/video/'));
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch match URL - remove ads 2', async (assert) => {
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_02}`;
        const MATCH_DATA = 'VMAP-AD-BREAK';
        const MATCH_URL = '.m3u8';
        const scriptletArgs = [MATCH_DATA, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();
        assert.ok(!responseM3U8.includes('#EXT-X-VMAP-AD-BREAK'));
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch match URL, optional regexp - remove ads 1', async (assert) => {
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_01}`;
        const MATCH_DATA = 'tvessaiprod.nbcuni.com/video/';
        const MATCH_URL = '.m3u8';
        const OPTIONAL_REGEXP = '/#EXTINF:.*\\n.*tvessaiprod\\.nbcuni\\.com\\/video\\/[\\s\\S]*?#EXT-X-DISCONTINUITY|#EXT-X-VMAP-AD-BREAK[\\s\\S]*?#EXT-X-ENDLIST/';
        const scriptletArgs = [MATCH_DATA, MATCH_URL, OPTIONAL_REGEXP];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();
        assert.ok(!responseM3U8.includes('tvessaiprod.nbcuni.com/video/'));
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch match URL, optional regexp - remove ads 2', async (assert) => {
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_02}`;
        const MATCH_DATA = 'VMAP-AD-BREAK';
        const MATCH_URL = '.m3u8';
        const OPTIONAL_REGEXP = '/#EXTINF:.*\\n.*tvessaiprod\\.nbcuni\\.com\\/video\\/[\\s\\S]*?#EXT-X-DISCONTINUITY|#EXT-X-VMAP-AD-BREAK[\\s\\S]*?#EXT-X-ENDLIST/';
        const scriptletArgs = [MATCH_DATA, MATCH_URL, OPTIONAL_REGEXP];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();
        assert.ok(!responseM3U8.includes('#EXT-X-VMAP-AD-BREAK'));
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('xhr - no prune 1', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_01}`;
        const done = assert.async();

        runScriptlet(name);

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.onload = () => {
            assert.ok(xhr.responseText.includes('tvessaiprod.nbcuni.com/video/'));
            assert.strictEqual(window.hit, undefined, 'should not hit');
            done();
        };
        xhr.send();
    });

    test('xhr - no prune 2', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_02}`;
        const done = assert.async();

        runScriptlet(name);

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.onload = () => {
            assert.ok(xhr.responseText.includes('#EXT-X-VMAP-AD-BREAK'));
            assert.strictEqual(window.hit, undefined, 'should not hit');
            done();
        };
        xhr.send();
    });

    test('xhr match URL but do not match element to remove - no prune 1', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_01}`;
        const MATCH_DATA = 'DO-NOT-MATCH';
        const MATCH_URL = '.m3u8';
        const scriptletArgs = [MATCH_DATA, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.onload = () => {
            assert.ok(xhr.responseText.includes('tvessaiprod.nbcuni.com/video/'));
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('xhr match URL but do not match element to remove - no prune 2', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_02}`;
        const MATCH_DATA = 'DO-NOT-MATCH';
        const MATCH_URL = '.m3u8';
        const scriptletArgs = [MATCH_DATA, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.onload = () => {
            assert.ok(xhr.responseText.includes('#EXT-X-VMAP-AD-BREAK'));
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('xhr - remove ads 1', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_01}`;
        const MATCH_DATA = 'tvessaiprod.nbcuni.com/video/';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.onload = () => {
            assert.ok(!xhr.responseText.includes('tvessaiprod.nbcuni.com/video/'));
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('xhr - remove ads 2', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_02}`;
        const MATCH_DATA = 'VMAP-AD-BREAK';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.onload = () => {
            assert.ok(!xhr.responseText.includes('#EXT-X-VMAP-AD-BREAK'));
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('xhr match URL - remove ads 1', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_01}`;
        const MATCH_DATA = 'tvessaiprod.nbcuni.com/video/';
        const MATCH_URL = '.m3u8';
        const scriptletArgs = [MATCH_DATA, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.onload = () => {
            assert.ok(!xhr.responseText.includes('tvessaiprod.nbcuni.com/video/'));
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('xhr match URL - remove ads 2', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_02}`;
        const MATCH_DATA = 'VMAP-AD-BREAK';
        const MATCH_URL = '.m3u8';
        const scriptletArgs = [MATCH_DATA, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.onload = () => {
            assert.ok(!xhr.responseText.includes('#EXT-X-VMAP-AD-BREAK'));
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('xhr match URL, optional regexp - remove ads 1', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_01}`;
        const MATCH_DATA = 'tvessaiprod.nbcuni.com/video/';
        const MATCH_URL = '.m3u8';
        const OPTIONAL_REGEXP = '/#EXTINF:.*\\n.*tvessaiprod\\.nbcuni\\.com\\/video\\/[\\s\\S]*?#EXT-X-DISCONTINUITY|#EXT-X-VMAP-AD-BREAK[\\s\\S]*?#EXT-X-ENDLIST/';
        const scriptletArgs = [MATCH_DATA, MATCH_URL, OPTIONAL_REGEXP];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.onload = () => {
            assert.ok(!xhr.responseText.includes('tvessaiprod.nbcuni.com/video/'));
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('xhr match URL, optional regexp - remove ads 2', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_02}`;
        const MATCH_DATA = 'VMAP-AD-BREAK';
        const MATCH_URL = '.m3u8';
        const OPTIONAL_REGEXP = '/#EXTINF:.*\\n.*tvessaiprod\\.nbcuni\\.com\\/video\\/[\\s\\S]*?#EXT-X-DISCONTINUITY|#EXT-X-VMAP-AD-BREAK[\\s\\S]*?#EXT-X-ENDLIST/';
        const scriptletArgs = [MATCH_DATA, MATCH_URL, OPTIONAL_REGEXP];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.onload = () => {
            assert.ok(!xhr.responseText.includes('#EXT-X-VMAP-AD-BREAK'));
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });
}
