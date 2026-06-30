/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';
import { createPreventTimerTests } from './prevent-timer.helpers';

const { test } = QUnit;

const nativeSetTimeout = window.setTimeout;

createPreventTimerTests({
    name: 'prevent-setTimeout',
    uboAlias: 'ubo-no-setTimeout-if.js',
    setTimer: window.setTimeout,
    clearTimer: clearTimeout,
    timerMethodName: 'setTimeout',
});

/**
 * Following group tests for callback matching with escaped single and double quotes
 * inside match callback argument
 * https://github.com/AdguardTeam/Scriptlets/issues/286
 */
test('match with escaped single quotes', (assert) => {
    const markerProp = 'callbackFired';
    window[markerProp] = false;
    const done = assert.async();

    // We need to run our assertion after all timeouts
    nativeSetTimeout(() => {
        assert.notOk(window.callbackFired, 'callback was blocked');
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        clearGlobalProps('callbackFired', 'hit');
        done();
    }, 100);

    const CALLBACK_MATCH = String.raw`.css(\'display\',\'block\');`;

    // run scriptlet code
    const scriptletArgs = [CALLBACK_MATCH, '30'];
    runScriptlet('prevent-setTimeout', scriptletArgs);

    // eslint-disable-next-line quotes
    function callback() { window[markerProp] = ".css('display','block');"; }
    setTimeout(callback, 30);
});

test('match with unescaped single quotes', (assert) => {
    const markerProp = 'callbackFired';
    window[markerProp] = false;
    const done = assert.async();

    // We need to run our assertion after all timeouts
    nativeSetTimeout(() => {
        assert.notOk(window.callbackFired, 'callback was blocked');
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        clearGlobalProps('callbackFired', 'hit');
        done();
    }, 100);

    const CALLBACK_MATCH = String.raw`.css('display','block');`;

    // run scriptlet code
    const scriptletArgs = [CALLBACK_MATCH, '30'];
    runScriptlet('prevent-setTimeout', scriptletArgs);

    // eslint-disable-next-line quotes
    function callback() { window[markerProp] = ".css('display','block');"; }
    setTimeout(callback, 30);
});

test('match with escaped double quotes', (assert) => {
    const markerProp = 'callbackFired';
    window[markerProp] = false;
    const done = assert.async();

    // We need to run our assertion after all timeouts
    nativeSetTimeout(() => {
        assert.notOk(window.callbackFired, 'callback was blocked');
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        clearGlobalProps('callbackFired', 'hit');
        done();
    }, 100);

    // Use regex that matches both quoting styles
    const CALLBACK_MATCH = '/\\.css\\(.*display.*,.*block.*\\);/';

    // run scriptlet code
    const scriptletArgs = [CALLBACK_MATCH, '30'];
    runScriptlet('prevent-setTimeout', scriptletArgs);

    function callback() { window[markerProp] = '.css("display","block");'; }
    setTimeout(callback, 30);
});
