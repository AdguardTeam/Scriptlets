/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'prevent-setTimeout';

const nativeSetTimeout = window.setTimeout;
const nativeConsole = console.log; // eslint-disable-line no-console

const testTimeouts = [];

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    window.setTimeout = nativeSetTimeout;
    testTimeouts.forEach((t) => (clearTimeout(t)));
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
        name: 'ubo-no-setTimeout-if.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('no args -- logging', (assert) => {
    const agLogSetTimeout = 'agLogSetTimeout';
    function callback() {
        window[agLogSetTimeout] = 'changed';
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

    const timeoutId = setTimeout(callback, timeout);
    testTimeouts.push(timeoutId);

    // We need to run our assertion after all timeouts
    nativeSetTimeout(() => {
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        assert.strictEqual(
            loggedMessage,
            `prevent-setTimeout: setTimeout(${callback.toString()}, ${timeout})`,
            'console.hit input ok',
        );
        assert.strictEqual(window[agLogSetTimeout], 'changed', 'property changed');
        clearGlobalProps(agLogSetTimeout);
        done();
    }, 50);
});

test('setTimeout callback name matching', (assert) => {
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
    const timeoutTest = setTimeout(test, 50);
    testTimeouts.push(timeoutTest);

    // check if scriptlet doesn't affect on others timeouts
    const anotherTimeout = () => { window.two = 'new value'; };
    const timeoutAnother = setTimeout(anotherTimeout);
    testTimeouts.push(timeoutAnother);
});

test('code matching', (assert) => {
    const done = assert.async();
    window.one = 'value';
    window.two = 'value';
    // We need to run our assertion after all timeouts
    nativeSetTimeout(() => {
        assert.equal(window.one, 'value', 'Target property not changed');
        assert.equal(window.two, 'new value', 'Another property should  be successfully changed by another timeout');
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        done();
    }, 100);

    // run scriptlet code
    const scriptletArgs = ['one', '50'];
    runScriptlet(name, scriptletArgs);

    // check if scriptlet works
    const testCallback = () => { window.one = 'new value'; };
    const timeoutTest = setTimeout(testCallback, 50);
    testTimeouts.push(timeoutTest);

    // check if scriptlet doesn't affect on others timeouts
    const anotherTimeout = () => { window.two = 'new value'; };
    const timeoutAnother = setTimeout(anotherTimeout);
    testTimeouts.push(timeoutAnother);
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

    // only this one should not be prevented because of match = !one
    const first = () => { window.one = 'NEW ONE'; };
    const timeoutTest1 = setTimeout(first, 30);
    testTimeouts.push(timeoutTest1);

    const second = () => { window.two = 'NEW TWO'; };
    const timeoutTest2 = setTimeout(second, 40);
    testTimeouts.push(timeoutTest2);

    const third = () => { window.three = 'NEW THREE'; };
    const timeoutTest3 = setTimeout(third, 50);
    testTimeouts.push(timeoutTest3);
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
    const timeoutTest1 = setTimeout(first, 30);
    testTimeouts.push(timeoutTest1);

    const second = () => { window.two = 'NEW TWO'; };
    const timeoutTest2 = setTimeout(second, 0);
    testTimeouts.push(timeoutTest2);

    const third = () => { window.three = 'NEW THREE'; };
    const timeoutTest3 = setTimeout(third, 0);
    testTimeouts.push(timeoutTest3);
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
    }, 100);

    // run scriptlet code
    const scriptletArgs = ['test', '!50'];
    runScriptlet(name, scriptletArgs);

    const test1 = () => { window.one = 'CHANGED1'; };
    const timeoutTest1 = setTimeout(test1, 40);
    testTimeouts.push(timeoutTest1);

    const test2 = () => { window.two = 'CHANGED2'; };
    // only this one should not be prevented because of delay = !50
    const timeoutTest2 = setTimeout(test2, 50);
    testTimeouts.push(timeoutTest2);

    const test3 = () => { window.three = 'CHANGED3'; };
    const timeoutTest3 = setTimeout(test3, 60);
    testTimeouts.push(timeoutTest3);
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
    const timeoutTest120 = setTimeout(one20, 20);
    testTimeouts.push(timeoutTest120);

    const one50 = () => { window.two = 'first50'; };
    const timeoutTest150 = setTimeout(one50, 50);
    testTimeouts.push(timeoutTest150);

    const second20 = () => { window.three = 'second20'; };
    // only this one should be prevented because of match = !one && delay = !50
    const timeoutTest220 = setTimeout(second20, 20);
    testTimeouts.push(timeoutTest220);

    const second50 = () => { window.four = 'second50'; };
    const timeoutTest250 = setTimeout(second50, 50);
    testTimeouts.push(timeoutTest250);
});

test('prevent-setTimeout: does not work - invalid regexp pattern', (assert) => {
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
    const timeoutTest = setTimeout(callback, 50);
    testTimeouts.push(timeoutTest);
});

test('prevent-setTimeout: no callback for setTimeout considered as undefined', (assert) => {
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
    const timeoutTest = setTimeout(console.log('this is no callback'), 10); // eslint-disable-line no-console
    testTimeouts.push(timeoutTest);
});

test('prevent-setTimeout: null as callback', (assert) => {
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
    const timeoutTest = setTimeout(callback, 10);
    testTimeouts.push(timeoutTest);
});

test('prevent-setTimeout: single round bracket in matchCallback', (assert) => {
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
    const timeoutTest = setTimeout(callback, 10);
    testTimeouts.push(timeoutTest);
});

test('prevent-setTimeout: single square bracket in matchCallback', (assert) => {
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
    const timeoutTest = setTimeout(callback, 10);
    testTimeouts.push(timeoutTest);
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
    const timeoutTest1 = setTimeout(first, 30);
    testTimeouts.push(timeoutTest1);

    const second = () => { window.two = 'NEW TWO'; };
    const timeoutTest2 = setTimeout(second, 10.05);
    testTimeouts.push(timeoutTest2);

    const third = () => { window.three = 'NEW THREE'; };
    const timeoutTest3 = setTimeout(third, 10.95);
    testTimeouts.push(timeoutTest3);
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
    const timeoutTest1 = setTimeout(first, 25.123);
    testTimeouts.push(timeoutTest1);

    const second = () => { window.two = 'NEW TWO'; };
    const timeoutTest2 = setTimeout(second, null);
    testTimeouts.push(timeoutTest2);

    const third = () => { window.three = 'NEW THREE'; };
    const timeoutTest3 = setTimeout(third, true);
    testTimeouts.push(timeoutTest3);

    // test with string delays
    const fourth = () => { window.four = 'NEW FOUR'; };
    const timeoutTest4 = setTimeout(fourth, '25.123');
    testTimeouts.push(timeoutTest4);

    const fifth = () => { window.five = 'NEW FIVE'; };
    const timeoutTest5 = setTimeout(fifth, '10');
    testTimeouts.push(timeoutTest5);
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
    const timeoutTest1 = setTimeout(first, 0);
    testTimeouts.push(timeoutTest1);

    const second = () => { window.two = 'NEW TWO'; };
    const timeoutTest2 = setTimeout(second, null);
    testTimeouts.push(timeoutTest2);

    const third = () => { window.three = 'NEW THREE'; };
    const timeoutTest3 = setTimeout(third, undefined);
    testTimeouts.push(timeoutTest3);
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
    const timeoutTest1 = setTimeout(callback, 30);
    testTimeouts.push(timeoutTest1);
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
    const timeoutTest1 = setTimeout(callback, 30);
    testTimeouts.push(timeoutTest1);
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
    const timeoutTest1 = setTimeout(callback, 30);
    testTimeouts.push(timeoutTest1);
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
    const timeoutTest1 = setTimeout(callback, 30);
    testTimeouts.push(timeoutTest1);
});
