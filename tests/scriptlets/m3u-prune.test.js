/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'm3u-prune';

// From nbc.com - https://github.com/AdguardTeam/AdguardFilters/issues/124745
// https://regex101.com/r/Kup9IL/1
const M3U8_OBJECTS_PATH_01 = './test-files/manifestM3U8-01.m3u8';
// From nbc.com - https://github.com/AdguardTeam/AdguardFilters/issues/124745
const M3U8_OBJECTS_PATH_02 = './test-files/manifestM3U8-02.m3u8';
// From fox.com, discovery.com and related - https://github.com/AdguardTeam/AdguardFilters/issues/20290
// https://regex101.com/r/ogqRZQ/1 - from https://www.fox.com/watch/1df49c86f927f5c840e8856c335e188b/
const M3U8_OBJECTS_PATH_03 = './test-files/manifestM3U8-03.m3u8';
// From sbs.com - https://github.com/AdguardTeam/AdguardFilters/issues/88692
// https://regex101.com/r/Kxtnng/1
const M3U8_OBJECTS_PATH_04 = './test-files/manifestM3U8-04.m3u8';
// https://github.com/AdguardTeam/Scriptlets/issues/354
const M3U8_OBJECTS_CR = './test-files/manifestM3U8-carriage-return.m3u8';

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
        const M3U8_PATH = M3U8_OBJECTS_PATH_01;
        const done = assert.async();

        runScriptlet(name);

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();

        assert.ok(responseM3U8.includes('tvessaiprod.nbcuni.com/video/'));
        assert.strictEqual(window.hit, undefined, 'should not hit');
        done();
    });

    test('fetch - no prune 2', async (assert) => {
        const M3U8_PATH = M3U8_OBJECTS_PATH_02;
        const done = assert.async();

        runScriptlet(name);

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();

        assert.ok(responseM3U8.includes('#EXT-X-VMAP-AD-BREAK'));
        assert.strictEqual(window.hit, undefined, 'should not hit');
        done();
    });

    test('fetch URL does not match - no prune 1', async (assert) => {
        const M3U8_PATH = M3U8_OBJECTS_PATH_01;
        const MATCH_DATA = 'tvessaiprod.nbcuni.com/video/';
        const MATCH_URL = 'noPrune';
        const scriptletArgs = [MATCH_DATA, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();
        assert.ok(responseM3U8.includes('tvessaiprod.nbcuni.com/video/'));
        assert.strictEqual(window.hit, undefined, 'should not hit');
        done();
    });

    test('fetch URL does not match - no prune 2', async (assert) => {
        const M3U8_PATH = M3U8_OBJECTS_PATH_02;
        const MATCH_DATA = 'tvessaiprod.nbcuni.com/video/';
        const MATCH_URL = 'noPrune';
        const scriptletArgs = [MATCH_DATA, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();

        assert.ok(responseM3U8.includes('#EXT-X-VMAP-AD-BREAK'));
        assert.strictEqual(window.hit, undefined, 'should not hit');
        done();
    });

    test('fetch - remove ads 1', async (assert) => {
        const M3U8_PATH = M3U8_OBJECTS_PATH_01;
        const MATCH_DATA = 'tvessaiprod.nbcuni.com/video/';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();

        assert.notOk(
            responseM3U8.includes('tvessaiprod.nbcuni.com/video/'),
            'check if "tvessaiprod.nbcuni.com/video/" has been removed',
        );
        assert.notOk(
            responseM3U8.includes('#EXT-X-CUE:TYPE="SpliceOut"'),
            'check if "#EXT-X-CUE:TYPE="SpliceOut"" has been removed',
        );
        assert.notOk(
            responseM3U8.includes('#EXT-X-CUE-IN'),
            'check if "#EXT-X-CUE-IN" has been removed',
        );
        assert.notOk(
            responseM3U8.includes('#EXT-X-ASSET:CAID'),
            'check if "#EXT-X-ASSET:CAID" has been removed',
        );
        assert.notOk(
            responseM3U8.includes('#EXT-X-SCTE35:'),
            'check if "#EXT-X-SCTE35:" has been removed',
        );
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch - remove ads 2 (COMCAST)', async (assert) => {
        const M3U8_PATH = M3U8_OBJECTS_PATH_02;
        const MATCH_DATA = 'VMAP-AD-BREAK';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();

        assert.notOk(
            responseM3U8.includes('#EXT-X-VMAP-AD-BREAK'),
            'check if "#EXT-X-VMAP-AD-BREAK" has been removed',
        );
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch - remove ads 3 (UPLYNK)', async (assert) => {
        const M3U8_PATH = M3U8_OBJECTS_PATH_03;
        const MATCH_DATA = '/#UPLYNK-SEGMENT:.*,ad/';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();

        assert.notOk(
            responseM3U8.includes(',ad'),
            'check if "UPLYNK" ad segment has been removed',
        );
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch - remove ads 4', async (assert) => {
        const M3U8_PATH = M3U8_OBJECTS_PATH_04;
        const MATCH_DATA = '/videoplayback.*&source=dclk_video_ads/';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();

        assert.notOk(
            responseM3U8.includes('dclk_video_ads'),
            'check if "dclk_video_ads" ad segment has been removed',
        );
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch - new Request() - remove ads ', async (assert) => {
        const M3U8_PATH = M3U8_OBJECTS_PATH_01;
        const MATCH_DATA = 'tvessaiprod.nbcuni.com/video/';
        const REQUEST = new Request(M3U8_PATH);

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const response = await fetch(REQUEST);
        const responseM3U8 = await response.text();

        assert.notOk(
            responseM3U8.includes('tvessaiprod.nbcuni.com/video/'),
            'check if "tvessaiprod.nbcuni.com/video/" has been removed',
        );
        assert.notOk(
            responseM3U8.includes('#EXT-X-CUE:TYPE="SpliceOut"'),
            'check if "#EXT-X-CUE:TYPE="SpliceOut"" has been removed',
        );
        assert.notOk(
            responseM3U8.includes('#EXT-X-CUE-IN'),
            'check if "#EXT-X-CUE-IN" has been removed',
        );
        assert.notOk(
            responseM3U8.includes('#EXT-X-ASSET:CAID'),
            'check if "#EXT-X-ASSET:CAID" has been removed',
        );
        assert.notOk(
            responseM3U8.includes('#EXT-X-SCTE35:'),
            'check if "#EXT-X-SCTE35:" has been removed',
        );
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch regexp propsToRemove - remove ads 1', async (assert) => {
        const M3U8_PATH = M3U8_OBJECTS_PATH_01;
        const MATCH_DATA = '/tvessaiprod\\.nbcuni\\.com/video//';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();
        assert.notOk(
            responseM3U8.includes('tvessaiprod.nbcuni.com/video/'),
            'check if "tvessaiprod.nbcuni.com/video/" has been removed',
        );
        assert.notOk(
            responseM3U8.includes('#EXT-X-CUE:TYPE="SpliceOut"'),
            'check if "#EXT-X-CUE:TYPE="SpliceOut"" has been removed',
        );
        assert.notOk(
            responseM3U8.includes('#EXT-X-CUE-IN'), 'check if "#EXT-X-CUE-IN" has been removed',
        );
        assert.notOk(
            responseM3U8.includes('#EXT-X-ASSET:CAID'), 'check if "#EXT-X-ASSET:CAID" has been removed',
        );
        assert.notOk(
            responseM3U8.includes('#EXT-X-SCTE35:'), 'check if "#EXT-X-SCTE35:" has been removed',
        );
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch regexp propsToRemove - remove ads 2', async (assert) => {
        const M3U8_PATH = M3U8_OBJECTS_PATH_02;
        const MATCH_DATA = '/VMAP.AD.BREAK/';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();
        assert.notOk(
            responseM3U8.includes('#EXT-X-VMAP-AD-BREAK'),
            'check if "#EXT-X-VMAP-AD-BREAK" has been removed',
        );
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch match URL - remove ads 1', async (assert) => {
        const M3U8_PATH = M3U8_OBJECTS_PATH_01;
        const MATCH_DATA = 'tvessaiprod.nbcuni.com/video/';
        const MATCH_URL = '.m3u8';
        const scriptletArgs = [MATCH_DATA, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();
        assert.notOk(
            responseM3U8.includes('tvessaiprod.nbcuni.com/video/'),
            'check if "tvessaiprod.nbcuni.com/video/" has been removed',
        );
        assert.notOk(
            responseM3U8.includes('#EXT-X-CUE:TYPE="SpliceOut"'),
            'check if "#EXT-X-CUE:TYPE="SpliceOut"" has been removed',
        );
        assert.notOk(
            responseM3U8.includes('#EXT-X-CUE-IN'),
            'check if "#EXT-X-CUE-IN" has been removed',
        );
        assert.notOk(
            responseM3U8.includes('#EXT-X-ASSET:CAID'),
            'check if "#EXT-X-ASSET:CAID" has been removed',
        );
        assert.notOk(
            responseM3U8.includes('#EXT-X-SCTE35:'),
            'check if "#EXT-X-SCTE35:" has been removed',
        );
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch match URL - remove ads 2', async (assert) => {
        const M3U8_PATH = M3U8_OBJECTS_PATH_02;
        const MATCH_DATA = 'VMAP-AD-BREAK';
        const MATCH_URL = '.m3u8';
        const scriptletArgs = [MATCH_DATA, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();
        assert.notOk(
            responseM3U8.includes('#EXT-X-VMAP-AD-BREAK'),
            'check if "#EXT-X-VMAP-AD-BREAK" has been removed',
        );
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('fetch - remove ads carriage return', async (assert) => {
        const M3U8_PATH = M3U8_OBJECTS_CR;
        const MATCH_DATA = 'advert.com';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const response = await fetch(M3U8_PATH);
        const responseM3U8 = await response.text();

        assert.notOk(
            responseM3U8.includes('advert.com'),
            'check if "advert.com" has been removed',
        );
        assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
        done();
    });

    test('xhr - no prune 1', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = M3U8_OBJECTS_PATH_01;
        const done = assert.async();

        runScriptlet(name);

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.onload = () => {
            assert.ok(
                xhr.responseText.includes('tvessaiprod.nbcuni.com/video/'),
                'line with "tvessaiprod.nbcuni.com/video/" should not be removed',
            );
            done();
        };
        xhr.send();
    });

    test('xhr - no prune 2', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = M3U8_OBJECTS_PATH_02;
        const done = assert.async();

        runScriptlet(name);

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.onload = () => {
            assert.ok(xhr.responseText.includes('#EXT-X-VMAP-AD-BREAK'));
            done();
        };
        xhr.send();
    });

    test('xhr match URL but do not match element to remove - no prune 1', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = M3U8_OBJECTS_PATH_01;
        const MATCH_DATA = 'DO-NOT-MATCH';
        const MATCH_URL = '.m3u8';
        const scriptletArgs = [MATCH_DATA, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.onload = () => {
            assert.ok(
                xhr.responseText.includes('tvessaiprod.nbcuni.com/video/'),
                'line with "tvessaiprod.nbcuni.com/video/" should not be removed',
            );
            done();
        };
        xhr.send();
    });

    test('xhr match URL but do not match element to remove - no prune 2', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = M3U8_OBJECTS_PATH_02;
        const MATCH_DATA = 'DO-NOT-MATCH';
        const MATCH_URL = '.m3u8';
        const scriptletArgs = [MATCH_DATA, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.onload = () => {
            assert.ok(
                xhr.responseText.includes('#EXT-X-VMAP-AD-BREAK'),
                'line with "#EXT-X-VMAP-AD-BREAK" should not be removed',
            );
            done();
        };
        xhr.send();
    });

    test('xhr - remove ads 1', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = M3U8_OBJECTS_PATH_01;
        const MATCH_DATA = 'tvessaiprod.nbcuni.com/video/';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.onload = () => {
            assert.notOk(
                xhr.responseText.includes('tvessaiprod.nbcuni.com/video/'),
                'check if "tvessaiprod.nbcuni.com/video/" has been removed',
            );
            assert.notOk(
                xhr.responseText.includes('#EXT-X-CUE:TYPE="SpliceOut"'),
                'check if "#EXT-X-CUE:TYPE="SpliceOut"" has been removed',
            );
            assert.notOk(
                xhr.responseText.includes('#EXT-X-CUE-IN'),
                'check if "#EXT-X-CUE-IN" has been removed',
            );
            assert.notOk(
                xhr.responseText.includes('#EXT-X-ASSET:CAID'),
                'check if "#EXT-X-ASSET:CAID" has been removed',
            );
            assert.notOk(
                xhr.responseText.includes('#EXT-X-SCTE35:'),
                'check if "#EXT-X-SCTE35:" has been removed',
            );
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('xhr - remove ads 2 (COMCAST)', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = M3U8_OBJECTS_PATH_02;
        const MATCH_DATA = 'VMAP-AD-BREAK';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.onload = () => {
            assert.notOk(
                xhr.responseText.includes('#EXT-X-VMAP-AD-BREAK'),
                'check if "#EXT-X-VMAP-AD-BREAK" has been removed',
            );
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('xhr - remove ads 3 (UPLYNK)', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = M3U8_OBJECTS_PATH_03;
        const MATCH_DATA = '/#UPLYNK-SEGMENT:.*,ad/';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.onload = () => {
            assert.notOk(xhr.responseText.includes(',ad'), 'check if "UPLYNK" ad segment has been removed');
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('xhr regexp propsToRemove - remove ads 1', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = M3U8_OBJECTS_PATH_01;
        const MATCH_DATA = '/tvessaiprod\\.nbcuni\\.com/video//';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.onload = () => {
            assert.notOk(
                xhr.responseText.includes('tvessaiprod.nbcuni.com/video/'),
                'check if "tvessaiprod.nbcuni.com/video/" has been removed',
            );
            assert.notOk(
                xhr.responseText.includes('#EXT-X-CUE:TYPE="SpliceOut"'),
                'check if "#EXT-X-CUE:TYPE="SpliceOut"" has been removed',
            );
            assert.notOk(
                xhr.responseText.includes('#EXT-X-CUE-IN'),
                'check if "#EXT-X-CUE-IN" has been removed',
            );
            assert.notOk(
                xhr.responseText.includes('#EXT-X-ASSET:CAID'),
                'check if "#EXT-X-ASSET:CAID" has been removed',
            );
            assert.notOk(
                xhr.responseText.includes('#EXT-X-SCTE35:'),
                'check if "#EXT-X-SCTE35:" has been removed',
            );
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('xhr regexp propsToRemove - remove ads 2', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = M3U8_OBJECTS_PATH_02;
        const MATCH_DATA = '/VMAP.AD.BREAK/';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.onload = () => {
            assert.notOk(
                xhr.responseText.includes('#EXT-X-VMAP-AD-BREAK'),
                'check if "#EXT-X-VMAP-AD-BREAK" has been removed',
            );
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('xhr match URL - remove ads 1', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = M3U8_OBJECTS_PATH_01;
        const MATCH_DATA = 'tvessaiprod.nbcuni.com/video/';
        const MATCH_URL = '.m3u8';
        const scriptletArgs = [MATCH_DATA, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.onload = () => {
            assert.notOk(
                xhr.responseText.includes('tvessaiprod.nbcuni.com/video/'),
                'check if "tvessaiprod.nbcuni.com/video/" has been removed',
            );
            assert.notOk(
                xhr.responseText.includes('#EXT-X-CUE:TYPE="SpliceOut"'),
                'check if "#EXT-X-CUE:TYPE="SpliceOut"" has been removed',
            );
            assert.notOk(
                xhr.responseText.includes('#EXT-X-CUE-IN'),
                'check if "#EXT-X-CUE-IN" has been removed',
            );
            assert.notOk(
                xhr.responseText.includes('#EXT-X-ASSET:CAID'),
                'check if "#EXT-X-ASSET:CAID" has been removed',
            );
            assert.notOk(
                xhr.responseText.includes('#EXT-X-SCTE35:'),
                'check if "#EXT-X-SCTE35:" has been removed',
            );
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('xhr match URL - remove ads 2', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = M3U8_OBJECTS_PATH_02;
        const MATCH_DATA = 'VMAP-AD-BREAK';
        const MATCH_URL = '.m3u8';
        const scriptletArgs = [MATCH_DATA, MATCH_URL];

        runScriptlet(name, scriptletArgs);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.onload = () => {
            assert.notOk(
                xhr.responseText.includes('#EXT-X-VMAP-AD-BREAK'),
                'check if "#EXT-X-VMAP-AD-BREAK" has been removed',
            );
            assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
            done();
        };
        xhr.send();
    });

    test('xhr - do nothing if response type is not a string', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = M3U8_OBJECTS_PATH_01;
        const done = assert.async();

        runScriptlet(name);

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.responseType = 'blob';
        xhr.onload = () => {
            assert.ok(xhr.response instanceof Blob, 'Blob response');
            assert.strictEqual(window.hit, undefined, 'should not hit');
            done();
        };
        xhr.send();
    });

    test('xhr - remove ads - addEventListener', async (assert) => {
        const METHOD = 'GET';
        const M3U8_PATH = M3U8_OBJECTS_PATH_01;
        const MATCH_DATA = 'tvessaiprod.nbcuni.com/video/';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const xhr = new XMLHttpRequest();
        xhr.open(METHOD, M3U8_PATH);
        xhr.addEventListener('readystatechange', () => {
            if (xhr.responseText && xhr.readyState >= 3) {
                assert.notOk(
                    xhr.responseText.includes('tvessaiprod.nbcuni.com/video/'),
                    'check if "tvessaiprod.nbcuni.com/video/" has been removed',
                );
                assert.notOk(
                    xhr.responseText.includes('#EXT-X-CUE:TYPE="SpliceOut"'),
                    'check if "#EXT-X-CUE:TYPE="SpliceOut"" has been removed',
                );
                assert.notOk(
                    xhr.responseText.includes('#EXT-X-CUE-IN'),
                    'check if "#EXT-X-CUE-IN" has been removed',
                );
                assert.notOk(
                    xhr.responseText.includes('#EXT-X-ASSET:CAID'),
                    'check if "#EXT-X-ASSET:CAID" has been removed',
                );
                assert.notOk(
                    xhr.responseText.includes('#EXT-X-SCTE35:'),
                    'check if "#EXT-X-SCTE35:" has been removed',
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
    test('fetch - Request with object as a body, do not match content', async (assert) => {
        const requestOptions = {
            method: 'POST',
            body: {
                0: 1,
            },
        };
        const request = new Request(M3U8_OBJECTS_PATH_01, requestOptions);
        const MATCH_DATA = 'do_not_match';

        runScriptlet(name, [MATCH_DATA]);

        const done = assert.async();

        const response = await fetch(request);
        const responseM3U8 = await response.text();

        assert.ok(
            responseM3U8.includes('tvessaiprod.nbcuni.com/video/'),
            'content should not been removed',
        );
        assert.strictEqual(window.hit, undefined, 'should not hit');
        done();
    });
}
