/* global QUnit */
/* eslint-disable no-eval, no-underscore-dangle */
import { clearGlobalProps } from './helpers';

const {
    test,
    module,
} = QUnit;
const name = 'prevent-setTimeout';

// copy eval to prevent rollup warnings
const evalWrap = eval;

const nativeSetTimeout = window.setTimeout;
const nativeConsole = console.log; // eslint-disable-line no-console

const testTimeouts = [];

const beforeEach = () => {
    window.__debugScriptlets = () => {
        window.hit = 'value';
    };
};

const afterEach = () => {
    window.setTimeout = nativeSetTimeout;
    clearGlobalProps('hit', '__debugScriptlets');
    testTimeouts.forEach((t) => (clearTimeout(t)));
    console.log = nativeConsole; // eslint-disable-line no-console
};


module(name, { beforeEach, afterEach });


test('prevent-setTimeout: adg no args -- logging', (assert) => {
    const params = {
        name,
        args: [],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    evalWrap(scriptlet);
    const done = assert.async();

    const agLogSetTimeout = 'agLogSetTimeout';
    function callback() {
        window[agLogSetTimeout] = 'changed';
    }
    const timeout = 10;

    const timeoutId = setTimeout(callback, timeout);
    testTimeouts.push(timeoutId);

    // eslint-disable-next-line no-console
    console.log = function log(input) {
        if (input.indexOf('trace') > -1) {
            return;
        }
        assert.strictEqual(input, `setTimeout("${callback.toString()}", ${timeout})`, 'console.hit input');
    };

    // We need to run our assertion after all timeouts
    setTimeout(() => {
        assert.equal(window.hit, 'value', 'Hit function was executed');
        assert.strictEqual(window[agLogSetTimeout], 'changed', 'property changed');
        clearGlobalProps('hit', agLogSetTimeout);
        done();
    }, 50);
});


test('prevent-setTimeout: ubo alias no args -- logging', (assert) => {
    const params = {
        name: 'ubo-no-setTimeout-if.js',
        args: [],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    evalWrap(scriptlet);
    const done = assert.async();

    const uboLogSetTimeout = 'uboLogSetTimeout';
    function callback() {
        window[uboLogSetTimeout] = 'changed';
    }
    const timeout = 10;

    const timeoutId = setTimeout(callback, timeout);
    testTimeouts.push(timeoutId);

    // eslint-disable-next-line no-console
    console.log = function log(input) {
        if (input.indexOf('trace') > -1) {
            return;
        }
        assert.strictEqual(input, `setTimeout("${callback.toString()}", ${timeout})`, 'console.hit input should be equal');
    };

    // We need to run our assertion after all timeouts
    setTimeout(() => {
        assert.equal(window.hit, 'value', 'Hit function was executed');
        assert.strictEqual(window[uboLogSetTimeout], 'changed', 'property changed');
        clearGlobalProps('hit', uboLogSetTimeout);
        done();
    }, 50);
});


test('prevent-setTimeout: adg by setTimeout callback name', (assert) => {
    const params = {
        name,
        args: ['test', '50'],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    const done = assert.async();

    window.bbb = 'value';
    window.ddd = 'value';
    // We need to run our assertion after all timeouts
    setTimeout(() => {
        assert.equal(window.bbb, 'value', 'Target Target property not changed');
        // eslint-disable-next-line max-len
        assert.equal(window.ddd, 'new value', 'Another property should successfully changed by another timeout');
        assert.equal(window.hit, 'value', 'Hit function was executed');
        done();
    }, 100);

    // run scriptlet code
    evalWrap(scriptlet);
    // check if scriptlet works
    const test = () => { window.bbb = 'new value'; };
    const timeoutTest = setTimeout(test, 50);
    testTimeouts.push(timeoutTest);

    // check if scriptlet doesn't affect on others timeouts
    const anotherTimeout = () => { window.ddd = 'new value'; };
    const timeoutAnother = setTimeout(anotherTimeout);
    testTimeouts.push(timeoutAnother);
});


test('prevent-setTimeout: adg by code matching', (assert) => {
    const params = {
        name,
        args: ['match', '50'],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    const done = assert.async();

    window.match = 'value';
    window.ddd = 'value';
    // We need to run our assertion after all timeouts
    setTimeout(() => {
        assert.equal(window.bbb, 'value', 'Target Target property not changed');
        // eslint-disable-next-line max-len
        assert.equal(window.ddd, 'new value', 'Another property should  be successfully changed by another timeout');
        assert.equal(window.hit, 'value', 'Hit function was executed');
        done();
    }, 100);

    // run scriptlet code
    evalWrap(scriptlet);
    // check if scriptlet works
    const testCallback = () => { window.match = 'new value'; };
    const timeoutTest = setTimeout(testCallback, 50);
    testTimeouts.push(timeoutTest);

    // check if scriptlet doesn't affect on others timeouts
    const anotherTimeout = () => { window.ddd = 'new value'; };
    const timeoutAnother = setTimeout(anotherTimeout);
    testTimeouts.push(timeoutAnother);
});


test('prevent-setTimeout: adg -- !match', (assert) => {
    const params = {
        name,
        args: ['!one'],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    const done = assert.async();

    window.first = 'one';
    window.second = 'two';
    window.third = 'three';
    // We need to run our assertion after all timeouts
    setTimeout(() => {
        assert.equal(window.first, 'NEW ONE', '!match-property not changed');
        // eslint-disable-next-line max-len
        assert.equal(window.second, 'two', 'Second property should be successfully changed');
        assert.equal(window.third, 'three', 'Third property should be successfully changed');
        assert.equal(window.hit, 'value', 'Hit function was executed');
        done();
    }, 100);

    // run scriptlet code
    evalWrap(scriptlet);

    // only this one should not be prevented because of match = !one
    const one = () => { window.first = 'NEW ONE'; };
    const timeoutTest1 = setTimeout(one, 30);
    testTimeouts.push(timeoutTest1);

    const second = () => { window.second = 'second'; };
    const timeoutTest2 = setTimeout(second, 40);
    testTimeouts.push(timeoutTest2);

    const third = () => { window.third = 'third'; };
    const timeoutTest3 = setTimeout(third, 50);
    testTimeouts.push(timeoutTest3);
});


test('prevent-setTimeout: adg -- match + !delay', (assert) => {
    const params = {
        name,
        args: ['test', '!50'],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    const done = assert.async();

    window.first = 'one';
    window.second = 'two';
    window.third = 'three';
    // We need to run our assertion after all timeouts
    setTimeout(() => {
        assert.equal(window.first, 'one', 'Target property not changed');
        assert.equal(window.second, 'second', 'Second property should be successfully changed');
        assert.equal(window.third, 'three', 'Target property not changed');
        assert.equal(window.hit, 'value', 'Hit function was executed');
        done();
    }, 100);

    // run scriptlet code
    evalWrap(scriptlet);

    const test1 = () => { window.first = 'first'; };
    const timeoutTest1 = setTimeout(test1, 40);
    testTimeouts.push(timeoutTest1);

    const test2 = () => { window.second = 'second'; };
    // only this one should not be prevented because of delay = !50
    const timeoutTest2 = setTimeout(test2, 50);
    testTimeouts.push(timeoutTest2);

    const test3 = () => { window.third = 'third'; };
    const timeoutTest3 = setTimeout(test3, 60);
    testTimeouts.push(timeoutTest3);
});


test('prevent-setTimeout: adg -- !match + !delay', (assert) => {
    const params = {
        name,
        args: ['!one', '!50'],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    const done = assert.async();

    window.first20 = 'one';
    window.first50 = 'one';
    window.second20 = 'two';
    window.second50 = 'two';
    // We need to run our assertion after all timeouts
    setTimeout(() => {
        assert.equal(window.first20, 'first20', 'property should be successfully changed');
        assert.equal(window.first50, 'first50', 'property should be successfully changed');
        assert.equal(window.second20, 'two', 'Target property not changed');
        assert.equal(window.second50, 'second50', 'property should be successfully changed');
        assert.equal(window.hit, 'value', 'Hit function was executed');
        done();
    }, 100);

    // run scriptlet code
    evalWrap(scriptlet);

    const one20 = () => { window.first20 = 'first20'; };
    const timeoutTest120 = setTimeout(one20, 20);
    testTimeouts.push(timeoutTest120);

    const one50 = () => { window.first50 = 'first50'; };
    const timeoutTest150 = setTimeout(one50, 50);
    testTimeouts.push(timeoutTest150);

    const second20 = () => { window.second20 = 'second20'; };
    // only this one should not be prevented because of match = !one && delay = !50
    const timeoutTest220 = setTimeout(second20, 20);
    testTimeouts.push(timeoutTest220);

    const second50 = () => { window.second50 = 'second50'; };
    const timeoutTest250 = setTimeout(second50, 50);
    testTimeouts.push(timeoutTest250);
});
