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

        assert.ok(responseM3U8.indexOf('tvessaiprod.nbcuni.com/video/') > -1);
        assert.strictEqual(window.hit, undefined, 'should not hit');
        done();
    });

    test('fetch - no prune 2', async (assert) => {
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_02}`;
        const done = assert.async();

        runScriptlet(name);

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();

        assert.ok(responseM3U8.indexOf('#EXT-X-VMAP-AD-BREAK') > -1);
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
        assert.ok(responseM3U8.indexOf('tvessaiprod.nbcuni.com/video/') > -1);
        assert.strictEqual(window.hit, undefined, 'should not hit');
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

        assert.ok(responseM3U8.indexOf('#EXT-X-VMAP-AD-BREAK') > -1);
        assert.strictEqual(window.hit, undefined, 'should not hit');
        done();
    });

    test('fetch - remove ads 1', async (assert) => {
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_01}`;
        const MATCH_DATA = 'tvessaiprod.nbcuni.com/video/';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();

        assert.notOk(responseM3U8.indexOf('tvessaiprod.nbcuni.com/video/') > -1, 'check if "tvessaiprod.nbcuni.com/video/" has been removed');
        assert.notOk(responseM3U8.indexOf('#EXT-X-CUE:TYPE="SpliceOut"') > -1, 'check if "#EXT-X-CUE:TYPE="SpliceOut"" has been removed');
        assert.notOk(responseM3U8.indexOf('#EXT-X-CUE-IN') > -1, 'check if "#EXT-X-CUE-IN" has been removed');
        assert.notOk(responseM3U8.indexOf('#EXT-X-ASSET:CAID') > -1, 'check if "#EXT-X-ASSET:CAID" has been removed');
        assert.notOk(responseM3U8.indexOf('#EXT-X-SCTE35:') > -1, 'check if "#EXT-X-SCTE35:" has been removed');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch - remove ads 2', async (assert) => {
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_02}`;
        const MATCH_DATA = 'VMAP-AD-BREAK';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();

        assert.notOk(responseM3U8.indexOf('#EXT-X-VMAP-AD-BREAK') > -1, 'check if "#EXT-X-VMAP-AD-BREAK" has been removed');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch regexp propsToRemove - remove ads 1', async (assert) => {
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_01}`;
        const MATCH_DATA = '/tvessaiprod\\.nbcuni\\.com/video//';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();
        assert.notOk(responseM3U8.indexOf('tvessaiprod.nbcuni.com/video/') > -1, 'check if "tvessaiprod.nbcuni.com/video/" has been removed');
        assert.notOk(responseM3U8.indexOf('#EXT-X-CUE:TYPE="SpliceOut"') > -1, 'check if "#EXT-X-CUE:TYPE="SpliceOut"" has been removed');
        assert.notOk(responseM3U8.indexOf('#EXT-X-CUE-IN') > -1, 'check if "#EXT-X-CUE-IN" has been removed');
        assert.notOk(responseM3U8.indexOf('#EXT-X-ASSET:CAID') > -1, 'check if "#EXT-X-ASSET:CAID" has been removed');
        assert.notOk(responseM3U8.indexOf('#EXT-X-SCTE35:') > -1, 'check if "#EXT-X-SCTE35:" has been removed');
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch regexp propsToRemove - remove ads 2', async (assert) => {
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_02}`;
        const MATCH_DATA = '/VMAP.AD.BREAK/';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();
        assert.notOk(responseM3U8.indexOf('#EXT-X-VMAP-AD-BREAK') > -1, 'check if "#EXT-X-VMAP-AD-BREAK" has been removed');
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
        assert.notOk(responseM3U8.indexOf('tvessaiprod.nbcuni.com/video/') > -1, 'check if "tvessaiprod.nbcuni.com/video/" has been removed');
        assert.notOk(responseM3U8.indexOf('#EXT-X-CUE:TYPE="SpliceOut"') > -1, 'check if "#EXT-X-CUE:TYPE="SpliceOut"" has been removed');
        assert.notOk(responseM3U8.indexOf('#EXT-X-CUE-IN') > -1, 'check if "#EXT-X-CUE-IN" has been removed');
        assert.notOk(responseM3U8.indexOf('#EXT-X-ASSET:CAID') > -1, 'check if "#EXT-X-ASSET:CAID" has been removed');
        assert.notOk(responseM3U8.indexOf('#EXT-X-SCTE35:') > -1, 'check if "#EXT-X-SCTE35:" has been removed');
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
        assert.notOk(responseM3U8.indexOf('#EXT-X-VMAP-AD-BREAK') > -1, 'check if "#EXT-X-VMAP-AD-BREAK" has been removed');
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
            assert.ok(xhr.responseText.indexOf('tvessaiprod.nbcuni.com/video/') > -1, 'line with "tvessaiprod.nbcuni.com/video/" should not be removed');
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
            assert.ok(xhr.responseText.indexOf('#EXT-X-VMAP-AD-BREAK') > -1);
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
            assert.ok(xhr.responseText.indexOf('tvessaiprod.nbcuni.com/video/') > -1, 'line with "tvessaiprod.nbcuni.com/video/" should not be removed');
            assert.strictEqual(window.hit, undefined, 'should not hit');
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
            assert.ok(xhr.responseText.indexOf('#EXT-X-VMAP-AD-BREAK') > -1, 'line with "#EXT-X-VMAP-AD-BREAK" should not be removed');
            assert.strictEqual(window.hit, undefined, 'should not hit');
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
            assert.notOk(xhr.responseText.indexOf('tvessaiprod.nbcuni.com/video/') > -1, 'check if "tvessaiprod.nbcuni.com/video/" has been removed');
            assert.notOk(xhr.responseText.indexOf('#EXT-X-CUE:TYPE="SpliceOut"') > -1, 'check if "#EXT-X-CUE:TYPE="SpliceOut"" has been removed');
            assert.notOk(xhr.responseText.indexOf('#EXT-X-CUE-IN') > -1, 'check if "#EXT-X-CUE-IN" has been removed');
            assert.notOk(xhr.responseText.indexOf('#EXT-X-ASSET:CAID') > -1, 'check if "#EXT-X-ASSET:CAID" has been removed');
            assert.notOk(xhr.responseText.indexOf('#EXT-X-SCTE35:') > -1, 'check if "#EXT-X-SCTE35:" has been removed');
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
            assert.notOk(xhr.responseText.indexOf('#EXT-X-VMAP-AD-BREAK') > -1, 'check if "#EXT-X-VMAP-AD-BREAK" has been removed');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('xhr regexp propsToRemove - remove ads 1', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_01}`;
        const MATCH_DATA = '/tvessaiprod\\.nbcuni\\.com/video//';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.onload = () => {
            assert.notOk(xhr.responseText.indexOf('tvessaiprod.nbcuni.com/video/') > -1, 'check if "tvessaiprod.nbcuni.com/video/" has been removed');
            assert.notOk(xhr.responseText.indexOf('#EXT-X-CUE:TYPE="SpliceOut"') > -1, 'check if "#EXT-X-CUE:TYPE="SpliceOut"" has been removed');
            assert.notOk(xhr.responseText.indexOf('#EXT-X-CUE-IN') > -1, 'check if "#EXT-X-CUE-IN" has been removed');
            assert.notOk(xhr.responseText.indexOf('#EXT-X-ASSET:CAID') > -1, 'check if "#EXT-X-ASSET:CAID" has been removed');
            assert.notOk(xhr.responseText.indexOf('#EXT-X-SCTE35:') > -1, 'check if "#EXT-X-SCTE35:" has been removed');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('xhr regexp propsToRemove - remove ads 2', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = `${M3U8_OBJECTS_PATH_02}`;
        const MATCH_DATA = '/VMAP.AD.BREAK/';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.onload = () => {
            assert.notOk(xhr.responseText.indexOf('#EXT-X-VMAP-AD-BREAK') > -1, 'check if "#EXT-X-VMAP-AD-BREAK" has been removed');
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
            assert.notOk(xhr.responseText.indexOf('tvessaiprod.nbcuni.com/video/') > -1, 'check if "tvessaiprod.nbcuni.com/video/" has been removed');
            assert.notOk(xhr.responseText.indexOf('#EXT-X-CUE:TYPE="SpliceOut"') > -1, 'check if "#EXT-X-CUE:TYPE="SpliceOut"" has been removed');
            assert.notOk(xhr.responseText.indexOf('#EXT-X-CUE-IN') > -1, 'check if "#EXT-X-CUE-IN" has been removed');
            assert.notOk(xhr.responseText.indexOf('#EXT-X-ASSET:CAID') > -1, 'check if "#EXT-X-ASSET:CAID" has been removed');
            assert.notOk(xhr.responseText.indexOf('#EXT-X-SCTE35:') > -1, 'check if "#EXT-X-SCTE35:" has been removed');
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
            assert.notOk(xhr.responseText.indexOf('#EXT-X-VMAP-AD-BREAK') > -1, 'check if "#EXT-X-VMAP-AD-BREAK" has been removed');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });
}
