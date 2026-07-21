/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;

/**
 * Creates and registers the shared QUnit test suite for prevent-setTimeout / prevent-setInterval.
 *
 * @param {object} config
 * @param {string} config.name - Scriptlet name, e.g. 'prevent-setTimeout'
 * @param {string} config.uboAlias - uBO alias, e.g. 'ubo-no-setTimeout-if.js'
 * @param {Function} config.setTimer - Reference to the timer API (window.setTimeout or window.setInterval)
 * @param {Function} config.clearTimer - Reference to the clear API (window.clearTimeout or window.clearInterval)
 * @param {string} config.timerMethodName - 'setTimeout' or 'setInterval'
 */
export const createPreventTimerTests = (config) => {
    const {
        name,
        uboAlias,
        setTimer,
        clearTimer,
        timerMethodName,
    } = config;

    const nativeSetTimeout = window.setTimeout;
    const nativeConsole = console.log; // eslint-disable-line no-console

    const trackedTimers = [];

    const beforeEach = () => {
        window.__debug = () => {
            window.hit = 'FIRED';
        };
    };

    const afterEach = () => {
        window[timerMethodName] = setTimer;
        trackedTimers.forEach((id) => clearTimer(id));
        trackedTimers.length = 0;
        clearGlobalProps('hit', '__debug', 'one', 'two', 'three', 'four', 'five');
        console.log = nativeConsole; // eslint-disable-line no-console
    };

    module(name, { beforeEach, afterEach });

    test('Checking if alias name works', (assert) => {
        const adgParams = {
            name,
            engine: 'test',
            verbose: true,
        };
        const uboParams = {
            name: uboAlias,
            engine: 'test',
            verbose: true,
        };

        const codeByAdgParams = window.scriptlets.invoke(adgParams);
        const codeByUboParams = window.scriptlets.invoke(uboParams);

        assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
    });

    test('no args -- logging', (assert) => {
        const agLogProp = 'agLogTimer';
        function callback() {
            window[agLogProp] = 'changed';
        }
        const timeout = 10;

        let loggedMessage;
        // eslint-disable-next-line no-console
        console.log = function log(input) {
            if (input.includes('trace')) {
                return;
            }
            loggedMessage = input;
        };

        runScriptlet(name);
        const done = assert.async();

        const timerId = window[timerMethodName](callback, timeout);
        trackedTimers.push(timerId);

        // We need to run our assertion after all timeouts
        nativeSetTimeout(() => {
            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
            assert.strictEqual(
                loggedMessage,
                `${name}: ${timerMethodName}(${callback.toString()}, ${timeout})`,
                'console.hit input ok',
            );
            assert.strictEqual(window[agLogProp], 'changed', 'property changed');
            clearGlobalProps(agLogProp);
            done();
        }, 50);
    });

    test(`${timerMethodName} callback name matching`, (assert) => {
        const done = assert.async();
        window.one = 'value';
        window.two = 'value';
        // We need to run our assertion after all timeouts
        nativeSetTimeout(() => {
            assert.equal(window.one, 'value', 'Target property not changed');
            assert.equal(window.two, 'new value', 'Another property should successfully changed by another timeout');
            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
            done();
        }, 100);

        // run scriptlet code
        const scriptletArgs = ['test', '50'];
        runScriptlet(name, scriptletArgs);

        // check if scriptlet works
        const test = () => { window.one = 'new value'; };
        const timerId = window[timerMethodName](test, 50);
        trackedTimers.push(timerId);

        // check if scriptlet doesn't affect on others timeouts
        const anotherCallback = () => { window.two = 'new value'; };
        const anotherId = window[timerMethodName](anotherCallback);
        trackedTimers.push(anotherId);
    });

    test('code matching', (assert) => {
        const done = assert.async();
        window.one = 'value';
        window.two = 'value';
        // We need to run our assertion after all timeouts
        nativeSetTimeout(() => {
            assert.equal(window.one, 'value', 'Target property not changed');
            assert.equal(
                window.two,
                'new value',
                'Another property should  be successfully changed by another timeout',
            );
            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
            done();
        }, 100);

        // run scriptlet code
        const scriptletArgs = ['one', '50'];
        runScriptlet(name, scriptletArgs);

        // check if scriptlet works
        const testCallback = () => { window.one = 'new value'; };
        const timerId = window[timerMethodName](testCallback, 50);
        trackedTimers.push(timerId);

        // check if scriptlet doesn't affect on others timeouts
        const anotherCallback = () => { window.two = 'new value'; };
        const anotherId = window[timerMethodName](anotherCallback);
        trackedTimers.push(anotherId);
    });

    test('!match', (assert) => {
        const done = assert.async();
        window.one = 'one';
        window.two = 'two';
        window.three = 'three';
        // We need to run our assertion after all timeouts
        nativeSetTimeout(() => {
            assert.equal(window.one, 'NEW ONE', '!match-property not changed');
            assert.equal(window.two, 'two', 'Second property should be successfully changed');
            assert.equal(window.three, 'three', 'Third property should be successfully changed');
            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
            done();
        }, 200);

        // run scriptlet code
        const scriptletArgs = ['!first'];
        runScriptlet(name, scriptletArgs);

        // only this one should not be prevented because of match = !first
        const first = () => { window.one = 'NEW ONE'; };
        const timerId1 = window[timerMethodName](first, 30);
        trackedTimers.push(timerId1);

        const second = () => { window.two = 'NEW TWO'; };
        const timerId2 = window[timerMethodName](second, 40);
        trackedTimers.push(timerId2);

        const third = () => { window.three = 'NEW THREE'; };
        const timerId3 = window[timerMethodName](third, 50);
        trackedTimers.push(timerId3);
    });

    test('match any callback + delay = 0', (assert) => {
        const done = assert.async();
        window.one = 'one';
        window.two = 'two';
        window.three = 'three';
        // We need to run our assertion after all timeouts
        nativeSetTimeout(() => {
            assert.equal(window.one, 'NEW ONE', 'property \'one\' is changed due to none-zero delay');
            assert.equal(window.two, 'two', 'property \'two\' should NOT be changed');
            assert.equal(window.three, 'three', 'property \'three\' should NOT be changed');
            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
            done();
        }, 100);

        // run scriptlet code
        const scriptletArgs = ['', '0'];
        runScriptlet(name, scriptletArgs);

        // only this one SHOULD NOT be prevented because of delay mismatch
        const first = () => { window.one = 'NEW ONE'; };
        const timerId1 = window[timerMethodName](first, 30);
        trackedTimers.push(timerId1);

        const second = () => { window.two = 'NEW TWO'; };
        const timerId2 = window[timerMethodName](second, 0);
        trackedTimers.push(timerId2);

        const third = () => { window.three = 'NEW THREE'; };
        const timerId3 = window[timerMethodName](third, 0);
        trackedTimers.push(timerId3);
    });

    test('match + !delay', (assert) => {
        const done = assert.async();
        window.one = 'old one';
        window.two = 'old two';
        window.three = 'old three';
        // We need to run our assertion after all timeouts
        nativeSetTimeout(() => {
            assert.equal(window.one, 'old one', 'Target property not changed');
            assert.equal(window.two, 'CHANGED2', 'Second property should be successfully changed');
            assert.equal(window.three, 'old three', 'Target property not changed');
            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
            done();
        }, 200);

        // run scriptlet code
        const scriptletArgs = ['test', '!50'];
        runScriptlet(name, scriptletArgs);

        const test1 = () => { window.one = 'CHANGED1'; };
        const timerId1 = window[timerMethodName](test1, 40);
        trackedTimers.push(timerId1);

        const test2 = () => { window.two = 'CHANGED2'; };
        // only this one should not be prevented because of delay = !50
        const timerId2 = window[timerMethodName](test2, 50);
        trackedTimers.push(timerId2);

        const test3 = () => { window.three = 'CHANGED3'; };
        const timerId3 = window[timerMethodName](test3, 60);
        trackedTimers.push(timerId3);
    });

    test('!match + !delay', (assert) => {
        const done = assert.async();
        window.one = 'old';
        window.two = 'old';
        window.three = 'old';
        window.four = 'old';
        // We need to run our assertion after all timeouts
        nativeSetTimeout(() => {
            assert.equal(window.one, 'first20', 'property should be successfully changed');
            assert.equal(window.two, 'first50', 'property should be successfully changed');
            assert.equal(window.three, 'old', 'Target property not changed');
            assert.equal(window.four, 'second50', 'property should be successfully changed');
            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
            done();
        }, 100);

        // run scriptlet code
        const scriptletArgs = ['!one', '!50'];
        runScriptlet(name, scriptletArgs);

        const one20 = () => { window.one = 'first20'; };
        const timerId120 = window[timerMethodName](one20, 20);
        trackedTimers.push(timerId120);

        const one50 = () => { window.two = 'first50'; };
        const timerId150 = window[timerMethodName](one50, 50);
        trackedTimers.push(timerId150);

        const second20 = () => { window.three = 'second20'; };
        // only this one should be prevented because of match = !one && delay = !50
        const timerId220 = window[timerMethodName](second20, 20);
        trackedTimers.push(timerId220);

        const second50 = () => { window.four = 'second50'; };
        const timerId250 = window[timerMethodName](second50, 50);
        trackedTimers.push(timerId250);
    });

    test(`${name}: does not work - invalid regexp pattern`, (assert) => {
        const done = assert.async();
        window.one = 'value';
        // We need to run our assertion after all timeouts
        nativeSetTimeout(() => {
            assert.equal(window.one, 'changed', 'property should be changed');
            assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
            done();
        }, 100);

        // run scriptlet code
        const scriptletArgs = ['/\\/', '50'];
        runScriptlet(name, scriptletArgs);

        // check if scriptlet works
        const callback = () => { window.one = 'changed'; };
        const timerId = window[timerMethodName](callback, 50);
        trackedTimers.push(timerId);
    });

    test(`${name}: no callback for ${timerMethodName} considered as undefined`, (assert) => {
        const done = assert.async();
        window.one = 1;
        // We need to run our assertion after all timeouts
        nativeSetTimeout(() => {
            assert.equal(window.one, 1, 'property should not be changed');
            assert.strictEqual(window.hit, undefined, 'hit should NOT fire as callback is invalid');
            done();
        }, 100);

        // run scriptlet code — match any callback
        const scriptletArgs = ['.?'];
        runScriptlet(name, scriptletArgs);

        // callback is undefined is such case, should not hit
        // eslint-disable-next-line no-console
        const timerId = window[timerMethodName](console.log('this is no callback'), 10);
        trackedTimers.push(timerId);
    });

    test(`${name}: null as callback`, (assert) => {
        const done = assert.async();
        window.one = 1;
        // We need to run our assertion after all timeouts
        nativeSetTimeout(() => {
            assert.equal(window.one, 1, 'property should not be changed');
            assert.strictEqual(window.hit, undefined, 'hit should NOT fire as callback is null');
            done();
        }, 100);

        // run scriptlet code — match any callback
        const scriptletArgs = ['.?'];
        runScriptlet(name, scriptletArgs);

        const callback = null;
        const timerId = window[timerMethodName](callback, 10);
        trackedTimers.push(timerId);
    });

    test(`${name}: single round bracket in matchCallback`, (assert) => {
        // Single round bracket
        const done = assert.async();
        window.one = 1;

        nativeSetTimeout(() => {
            assert.equal(window.one, 1, 'property should not be changed');
            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
            done();
        }, 100);

        const scriptletArgs = ['baitFunc('];
        runScriptlet(name, scriptletArgs);

        const callback = () => {
            const baitFunc = (value) => {
                window.one = value;
            };
            baitFunc('new value');
        };
        const timerId = window[timerMethodName](callback, 10);
        trackedTimers.push(timerId);
    });

    test(`${name}: single square bracket in matchCallback`, (assert) => {
        const done = assert.async();
        window.one = 1;

        nativeSetTimeout(() => {
            assert.equal(window.one, 1, 'property should not be changed');
            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
            done();
        }, 100);

        const scriptletArgs = ['[1'];
        runScriptlet(name, scriptletArgs);

        const callback = () => {
            const baitFunc = () => {
                const bait = [1];
                window.one = bait;
            };
            baitFunc();
        };
        const timerId = window[timerMethodName](callback, 10);
        trackedTimers.push(timerId);
    });

    test('match any callback + decimal delay', (assert) => {
        const done = assert.async();
        window.one = 'one';
        window.two = 'two';
        window.three = 'three';
        // We need to run our assertion after all timeouts
        nativeSetTimeout(() => {
            assert.equal(window.one, 'NEW ONE', 'property \'one\' is changed due to non-matched delay');
            assert.equal(window.two, 'two', 'property \'two\' should NOT be changed');
            assert.equal(window.three, 'three', 'property \'three\' should NOT be changed');
            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
            done();
        }, 100);

        // run scriptlet code
        const scriptletArgs = ['', '10'];
        runScriptlet(name, scriptletArgs);

        // only this one SHOULD NOT be prevented because of delay mismatch
        const first = () => { window.one = 'NEW ONE'; };
        const timerId1 = window[timerMethodName](first, 30);
        trackedTimers.push(timerId1);

        const second = () => { window.two = 'NEW TWO'; };
        const timerId2 = window[timerMethodName](second, 10.05);
        trackedTimers.push(timerId2);

        const third = () => { window.three = 'NEW THREE'; };
        const timerId3 = window[timerMethodName](third, 10.95);
        trackedTimers.push(timerId3);
    });

    test('match any callback + non-number, decimal and string delays', (assert) => {
        const done = assert.async();
        window.one = 'one';
        window.two = 'two';
        window.three = 'three';
        window.four = 'old four';
        window.five = 'old five';
        // We need to run our assertion after all timeouts
        nativeSetTimeout(() => {
            assert.equal(window.one, 'one', 'property \'one\' should NOT be changed');
            assert.equal(window.two, 'NEW TWO', 'property \'two\' should be changed');
            assert.equal(window.three, 'NEW THREE', 'property \'three\' should be changed');

            assert.equal(window.four, 'old four', 'property \'four\' should NOT be changed');
            assert.equal(window.five, 'NEW FIVE', 'property \'five\' should be changed');

            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
            done();
        }, 100);

        // run scriptlet code
        const scriptletArgs = ['', '25'];
        runScriptlet(name, scriptletArgs);

        // only this one SHOULD NOT be prevented because of delay mismatch
        const first = () => { window.one = 'NEW ONE'; };
        const timerId1 = window[timerMethodName](first, 25.123);
        trackedTimers.push(timerId1);

        const second = () => { window.two = 'NEW TWO'; };
        const timerId2 = window[timerMethodName](second, null);
        trackedTimers.push(timerId2);

        const third = () => { window.three = 'NEW THREE'; };
        const timerId3 = window[timerMethodName](third, true);
        trackedTimers.push(timerId3);

        // test with string delays
        const fourth = () => { window.four = 'NEW FOUR'; };
        const timerId4 = window[timerMethodName](fourth, '25.123');
        trackedTimers.push(timerId4);

        const fifth = () => { window.five = 'NEW FIVE'; };
        const timerId5 = window[timerMethodName](fifth, '10');
        trackedTimers.push(timerId5);
    });

    test('match any callback, falsy non-numbers delays dont collide with 0 ', (assert) => {
        const done = assert.async();
        window.one = 'one';
        window.two = 'two';
        window.three = 'three';
        // We need to run our assertion after all timeouts
        nativeSetTimeout(() => {
            assert.equal(window.one, 'one', 'property \'one\' should NOT be changed');
            assert.equal(window.two, 'NEW TWO', 'property \'two\' should be changed');
            assert.equal(window.three, 'NEW THREE', 'property \'three\' should be changed');

            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
            done();
        }, 100);

        // run scriptlet code
        const scriptletArgs = ['', '0'];
        runScriptlet(name, scriptletArgs);

        const first = () => { window.one = 'NEW ONE'; };
        const timerId1 = window[timerMethodName](first, 0);
        trackedTimers.push(timerId1);

        const second = () => { window.two = 'NEW TWO'; };
        const timerId2 = window[timerMethodName](second, null);
        trackedTimers.push(timerId2);

        const third = () => { window.three = 'NEW THREE'; };
        const timerId3 = window[timerMethodName](third, undefined);
        trackedTimers.push(timerId3);
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
            done();
        }, 100);

        const CALLBACK_MATCH = String.raw`.css(\'display\',\'block\');`;

        // run scriptlet code
        const scriptletArgs = [CALLBACK_MATCH, '30'];
        runScriptlet(name, scriptletArgs);

        // eslint-disable-next-line quotes
        const callback = () => { window[markerProp] = ".css('display','block');"; };
        const timerId1 = window[timerMethodName](callback, 30);
        trackedTimers.push(timerId1);
    });

    test('match with unescaped single quotes', (assert) => {
        const markerProp = 'callbackFired';
        window[markerProp] = false;
        const done = assert.async();

        // We need to run our assertion after all timeouts
        nativeSetTimeout(() => {
            assert.notOk(window.callbackFired, 'callback was blocked');
            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
            done();
        }, 100);

        const CALLBACK_MATCH = String.raw`.css('display','block');`;

        // run scriptlet code
        const scriptletArgs = [CALLBACK_MATCH, '30'];
        runScriptlet(name, scriptletArgs);

        // eslint-disable-next-line quotes
        const callback = () => { window[markerProp] = ".css('display','block');"; };
        const timerId1 = window[timerMethodName](callback, 30);
        trackedTimers.push(timerId1);
    });

    test('match with escaped double quotes', (assert) => {
        const markerProp = 'callbackFired';
        window[markerProp] = false;
        const done = assert.async();

        // We need to run our assertion after all timeouts
        nativeSetTimeout(() => {
            assert.notOk(window.callbackFired, 'callback was blocked');
            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
            done();
        }, 100);

        const CALLBACK_MATCH = String.raw`.css(\"display\",\"block\");`;

        // run scriptlet code
        const scriptletArgs = [CALLBACK_MATCH, '30'];
        runScriptlet(name, scriptletArgs);

        const callback = () => { window[markerProp] = '.css("display","block");'; };
        const timerId1 = window[timerMethodName](callback, 30);
        trackedTimers.push(timerId1);
    });

    test('match with escaped double quotes', (assert) => {
        const markerProp = 'callbackFired';
        window[markerProp] = false;
        const done = assert.async();

        // We need to run our assertion after all timeouts
        nativeSetTimeout(() => {
            assert.notOk(window.callbackFired, 'callback was blocked');
            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
            done();
        }, 100);

        const CALLBACK_MATCH = '.css("display","block");';

        // run scriptlet code
        const scriptletArgs = [CALLBACK_MATCH, '30'];
        runScriptlet(name, scriptletArgs);

        const callback = () => { window[markerProp] = '.css("display","block");'; };
        const timerId1 = window[timerMethodName](callback, 30);
        trackedTimers.push(timerId1);
    });

    test('delay range: min-max prevents delays within range', (assert) => {
        const done = assert.async();
        window.one = 'old one';
        window.two = 'old two';
        window.three = 'old three';
        nativeSetTimeout(() => {
            assert.equal(window.one, 'NEW ONE', 'delay 10 is outside range 20-50, should change');
            assert.equal(window.two, 'old two', 'delay 30 is within range 20-50, should be prevented');
            assert.equal(window.three, 'old three', 'delay 50 is within range 20-50, should be prevented');
            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
            done();
        }, 100);

        const scriptletArgs = ['', '20-50'];
        runScriptlet(name, scriptletArgs);

        const one = () => { window.one = 'NEW ONE'; };
        const timerId1 = window[timerMethodName](one, 10);
        trackedTimers.push(timerId1);

        const two = () => { window.two = 'NEW TWO'; };
        const timerId2 = window[timerMethodName](two, 30);
        trackedTimers.push(timerId2);

        const three = () => { window.three = 'NEW THREE'; };
        const timerId3 = window[timerMethodName](three, 50);
        trackedTimers.push(timerId3);
    });

    test('delay range: min- prevents delays >= min', (assert) => {
        const done = assert.async();
        window.one = 'old one';
        window.two = 'old two';
        window.three = 'old three';
        nativeSetTimeout(() => {
            assert.equal(window.one, 'NEW ONE', 'delay 10 is below min 30, should change');
            assert.equal(window.two, 'old two', 'delay 30 is >= min 30, should be prevented');
            assert.equal(window.three, 'old three', 'delay 60 is >= min 30, should be prevented');
            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
            done();
        }, 100);

        const scriptletArgs = ['', '30-'];
        runScriptlet(name, scriptletArgs);

        const one = () => { window.one = 'NEW ONE'; };
        const timerId1 = window[timerMethodName](one, 10);
        trackedTimers.push(timerId1);

        const two = () => { window.two = 'NEW TWO'; };
        const timerId2 = window[timerMethodName](two, 30);
        trackedTimers.push(timerId2);

        const three = () => { window.three = 'NEW THREE'; };
        const timerId3 = window[timerMethodName](three, 60);
        trackedTimers.push(timerId3);
    });

    test('delay range: -max prevents delays <= max', (assert) => {
        const done = assert.async();
        window.one = 'old one';
        window.two = 'old two';
        window.three = 'old three';
        nativeSetTimeout(() => {
            assert.equal(window.one, 'old one', 'delay 10 is <= max 30, should be prevented');
            assert.equal(window.two, 'old two', 'delay 30 is <= max 30, should be prevented');
            assert.equal(window.three, 'NEW THREE', 'delay 60 is above max 30, should change');
            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
            done();
        }, 100);

        const scriptletArgs = ['', '-30'];
        runScriptlet(name, scriptletArgs);

        const one = () => { window.one = 'NEW ONE'; };
        const timerId1 = window[timerMethodName](one, 10);
        trackedTimers.push(timerId1);

        const two = () => { window.two = 'NEW TWO'; };
        const timerId2 = window[timerMethodName](two, 30);
        trackedTimers.push(timerId2);

        const three = () => { window.three = 'NEW THREE'; };
        const timerId3 = window[timerMethodName](three, 60);
        trackedTimers.push(timerId3);
    });

    test('delay range: !min-max inverted — prevents delays outside range', (assert) => {
        const done = assert.async();
        window.one = 'old one';
        window.two = 'old two';
        window.three = 'old three';
        nativeSetTimeout(() => {
            assert.equal(window.one, 'old one', 'delay 10 is outside range 20-50, should be prevented');
            assert.equal(window.two, 'NEW TWO', 'delay 30 is within range 20-50, should change');
            assert.equal(window.three, 'old three', 'delay 60 is outside range 20-50, should be prevented');
            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
            done();
        }, 100);

        const scriptletArgs = ['', '!20-50'];
        runScriptlet(name, scriptletArgs);

        const one = () => { window.one = 'NEW ONE'; };
        const timerId1 = window[timerMethodName](one, 10);
        trackedTimers.push(timerId1);

        const two = () => { window.two = 'NEW TWO'; };
        const timerId2 = window[timerMethodName](two, 30);
        trackedTimers.push(timerId2);

        const three = () => { window.three = 'NEW THREE'; };
        const timerId3 = window[timerMethodName](three, 60);
        trackedTimers.push(timerId3);
    });

    test('delay range: callback match + min-max delay range', (assert) => {
        const done = assert.async();
        window.one = 'old one';
        window.two = 'old two';
        window.three = 'old three';
        nativeSetTimeout(() => {
            assert.equal(window.one, 'NEW ONE', 'callback does not match, should change');
            assert.equal(window.two, 'old two', 'callback matches and delay 30 is in range 20-50, should be prevented');
            assert.equal(window.three, 'NEW THREE', 'callback matches but delay 60 is out of range, should change');
            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
            done();
        }, 100);

        const scriptletArgs = ['test', '20-50'];
        runScriptlet(name, scriptletArgs);

        const one = () => { window.one = 'NEW ONE'; };
        const timerId1 = window[timerMethodName](one, 30);
        trackedTimers.push(timerId1);

        const testCb = () => { window.two = 'NEW TWO'; };
        const timerId2 = window[timerMethodName](testCb, 30);
        trackedTimers.push(timerId2);

        const testCb2 = () => { window.three = 'NEW THREE'; };
        const timerId3 = window[timerMethodName](testCb2, 60);
        trackedTimers.push(timerId3);
    });

    test('delay range: callback match + min- delay range', (assert) => {
        const done = assert.async();
        window.one = 'old one';
        window.two = 'old two';
        window.three = 'old three';
        nativeSetTimeout(() => {
            assert.equal(window.one, 'NEW ONE', 'callback does not match, should change');
            assert.equal(window.two, 'old two', 'callback matches and delay 30 is >= min 30, should be prevented');
            assert.equal(window.three, 'NEW THREE', 'callback matches but delay 10 is below min 30, should change');
            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
            done();
        }, 100);

        const scriptletArgs = ['test', '30-'];
        runScriptlet(name, scriptletArgs);

        const one = () => { window.one = 'NEW ONE'; };
        const timerId1 = window[timerMethodName](one, 30);
        trackedTimers.push(timerId1);

        const testCb = () => { window.two = 'NEW TWO'; };
        const timerId2 = window[timerMethodName](testCb, 30);
        trackedTimers.push(timerId2);

        const testCb2 = () => { window.three = 'NEW THREE'; };
        const timerId3 = window[timerMethodName](testCb2, 10);
        trackedTimers.push(timerId3);
    });

    test('delay range: callback match + -max delay range', (assert) => {
        const done = assert.async();
        window.one = 'old one';
        window.two = 'old two';
        window.three = 'old three';
        nativeSetTimeout(() => {
            assert.equal(window.one, 'NEW ONE', 'callback does not match, should change');
            assert.equal(window.two, 'old two', 'callback matches and delay 20 is <= max 30, should be prevented');
            assert.equal(window.three, 'NEW THREE', 'callback matches but delay 60 is above max 30, should change');
            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
            done();
        }, 100);

        const scriptletArgs = ['test', '-30'];
        runScriptlet(name, scriptletArgs);

        const one = () => { window.one = 'NEW ONE'; };
        const timerId1 = window[timerMethodName](one, 20);
        trackedTimers.push(timerId1);

        const testCb = () => { window.two = 'NEW TWO'; };
        const timerId2 = window[timerMethodName](testCb, 20);
        trackedTimers.push(timerId2);

        const testCb2 = () => { window.three = 'NEW THREE'; };
        const timerId3 = window[timerMethodName](testCb2, 60);
        trackedTimers.push(timerId3);
    });

    test('delay range: callback match + !min-max delay range', (assert) => {
        const done = assert.async();
        window.one = 'old one';
        window.two = 'old two';
        window.three = 'old three';
        nativeSetTimeout(() => {
            assert.equal(window.one, 'NEW ONE', 'callback does not match, should change');
            assert.equal(window.two, 'NEW TWO', 'callback matches but delay 30 is within range 20-50, should change');
            assert.equal(window.three, 'old three', 'callback matches, delay 60 outside range, prevented');
            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
            done();
        }, 100);

        const scriptletArgs = ['test', '!20-50'];
        runScriptlet(name, scriptletArgs);

        const one = () => { window.one = 'NEW ONE'; };
        const timerId1 = window[timerMethodName](one, 60);
        trackedTimers.push(timerId1);

        const testCb = () => { window.two = 'NEW TWO'; };
        const timerId2 = window[timerMethodName](testCb, 30);
        trackedTimers.push(timerId2);

        const testCb2 = () => { window.three = 'NEW THREE'; };
        const timerId3 = window[timerMethodName](testCb2, 60);
        trackedTimers.push(timerId3);
    });

    test('delay range: invalid range abc-def does not prevent', (assert) => {
        const done = assert.async();
        window.one = 'old one';
        nativeSetTimeout(() => {
            assert.equal(window.one, 'NEW ONE', 'callback should not be prevented');
            assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
            done();
        }, 100);

        const scriptletArgs2 = ['', 'abc-def'];
        runScriptlet(name, scriptletArgs2);

        const cb = () => { window.one = 'NEW ONE'; };
        const timerId = window[timerMethodName](cb, 30);
        trackedTimers.push(timerId);
    });

    test('delay range: invalid range 123-def does not prevent', (assert) => {
        const done = assert.async();
        window.one = 'old one';
        nativeSetTimeout(() => {
            assert.equal(window.one, 'NEW ONE', 'callback should not be prevented');
            assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
            done();
        }, 100);

        const scriptletArgs2 = ['', '123-def'];
        runScriptlet(name, scriptletArgs2);

        const cb = () => { window.one = 'NEW ONE'; };
        const timerId = window[timerMethodName](cb, 30);
        trackedTimers.push(timerId);
    });

    test('delay range: invalid range abc-999 does not prevent', (assert) => {
        const done = assert.async();
        window.one = 'old one';
        nativeSetTimeout(() => {
            assert.equal(window.one, 'NEW ONE', 'callback should not be prevented');
            assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
            done();
        }, 100);

        const scriptletArgs2 = ['', 'abc-999'];
        runScriptlet(name, scriptletArgs2);

        const cb = () => { window.one = 'NEW ONE'; };
        const timerId = window[timerMethodName](cb, 30);
        trackedTimers.push(timerId);
    });

    test('delay range: invalid range with lone dash does not prevent', (assert) => {
        const done = assert.async();
        window.one = 'old one';
        nativeSetTimeout(() => {
            assert.equal(window.one, 'NEW ONE', 'callback should not be prevented');
            assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
            done();
        }, 100);

        const scriptletArgs2 = ['', '-'];
        runScriptlet(name, scriptletArgs2);

        const cb = () => { window.one = 'NEW ONE'; };
        const timerId = window[timerMethodName](cb, 30);
        trackedTimers.push(timerId);
    });

    test('delay range: min > max — nothing matches', (assert) => {
        const done = assert.async();
        window.one = 'old one';
        window.two = 'old two';
        window.three = 'old three';
        nativeSetTimeout(() => {
            assert.equal(window.one, 'NEW ONE', 'delay 10 not prevented');
            assert.equal(window.two, 'NEW TWO', 'delay 30 not prevented');
            assert.equal(window.three, 'NEW THREE', 'delay 60 not prevented');
            assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
            done();
        }, 100);

        // min=50 > max=20, no delay can satisfy >= 50 && <= 20
        const scriptletArgs = ['', '50-20'];
        runScriptlet(name, scriptletArgs);

        const one = () => { window.one = 'NEW ONE'; };
        const timerId1 = window[timerMethodName](one, 10);
        trackedTimers.push(timerId1);

        const two = () => { window.two = 'NEW TWO'; };
        const timerId2 = window[timerMethodName](two, 30);
        trackedTimers.push(timerId2);

        const three = () => { window.three = 'NEW THREE'; };
        const timerId3 = window[timerMethodName](three, 60);
        trackedTimers.push(timerId3);
    });

    test('delay range: callback + min > max — nothing matches', (assert) => {
        const done = assert.async();
        window.one = 'old one';
        window.two = 'old two';
        nativeSetTimeout(() => {
            assert.equal(window.one, 'NEW ONE', 'matching callback not prevented');
            assert.equal(window.two, 'NEW TWO', 'non-matching callback not prevented');
            assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
            done();
        }, 100);

        const scriptletArgs = ['test', '50-20'];
        runScriptlet(name, scriptletArgs);

        const testCb = () => { window.one = 'NEW ONE'; };
        const timerId1 = window[timerMethodName](testCb, 30);
        trackedTimers.push(timerId1);

        const other = () => { window.two = 'NEW TWO'; };
        const timerId2 = window[timerMethodName](other, 30);
        trackedTimers.push(timerId2);
    });

    test('callbacks with modified prototype are matched and prevented', (assert) => {
        const done = assert.async();

        window.one = 'value';
        window.two = 'value';
        // matchCallback matches both callback sources; matchDelay matches 100
        runScriptlet(name, ['changed', '100']);

        const protoCallback = () => {
            window.one = 'changed';
        };
        Object.setPrototypeOf(protoCallback, { foo: 1 });

        const nullProtoCallback = () => {
            window.two = 'changed';
        };
        Object.setPrototypeOf(nullProtoCallback, null);

        trackedTimers.push(window[timerMethodName](protoCallback, 100));
        trackedTimers.push(window[timerMethodName](nullProtoCallback, 100));

        nativeSetTimeout(() => {
            assert.strictEqual(window.one, 'value', 'replaced-prototype callback was prevented');
            assert.strictEqual(window.two, 'value', 'null-prototype callback was prevented');
            assert.strictEqual(window.hit, 'FIRED', 'hit fired');
            done();
        }, 200);
    });

    test('null-prototype callback is logged without errors', (assert) => {
        const done = assert.async();

        let loggedMessage;
        // eslint-disable-next-line no-console
        console.log = function log(input) {
            if (typeof input === 'string' && input.includes('trace')) {
                return;
            }
            loggedMessage = input;
        };

        // no args -> logging mode
        runScriptlet(name);

        const callback = () => {
            window.three = 'changed';
        };
        Object.setPrototypeOf(callback, null);

        trackedTimers.push(window[timerMethodName](callback, 10));

        nativeSetTimeout(() => {
            assert.ok(
                loggedMessage.includes(`${timerMethodName}(`),
                'null-prototype callback was logged without throwing',
            );
            assert.strictEqual(window.three, 'changed', 'callback still executed');
            done();
        }, 100);
    });
};
