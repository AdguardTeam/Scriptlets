/* global QUnit */
/* eslint-disable no-eval, no-underscore-dangle */
import { clearGlobalProps } from './helpers';

const {
    test,
    module,
} = QUnit;
const name = 'prevent-setInterval';

// copy eval to prevent rollup warnings
const evalWrap = eval;

const nativeSetInterval = window.setInterval;
const nativeConsole = console.log; // eslint-disable-line no-console

const beforeEach = () => {
    window.__debugScriptlets = () => {
        window.hit = 'value';
    };
};

const afterEach = () => {
    window.setInterval = nativeSetInterval;
    clearGlobalProps('hit', 'aaa', '__debugScriptlets');
    console.log = nativeConsole; // eslint-disable-line no-console
};

module(name, { beforeEach, afterEach });


test('prevent-setInterval: adg no args -- logging', (assert) => {
    const params = {
        name,
        args: [],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    evalWrap(scriptlet);
    const done = assert.async();

    const agLogSetInterval = 'agLogSetInterval';
    function callback() {
        window[agLogSetInterval] = 'changed';
    }
    const timeout = 10;

    setInterval(callback, timeout);

    // eslint-disable-next-line no-console
    console.log = function log(input) {
        if (input.indexOf('trace') > -1) {
            return;
        }
        assert.strictEqual(input, `setInterval("${callback.toString()}", ${timeout})`, 'console.hit input should be equal');
    };

    // We need to run our assertion after all timeouts
    setTimeout(() => {
        assert.equal(window.hit, 'value', 'Hit function was executed');
        assert.strictEqual(window[agLogSetInterval], 'changed', 'property changed');
        clearGlobalProps('hit', agLogSetInterval);
        done();
    }, 50);
});


test('prevent-setInterval: ubo alias no args -- logging', (assert) => {
    const params = {
        name: 'ubo-setInterval-defuser.js',
        args: [],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    evalWrap(scriptlet);
    const done = assert.async();

    const uboLogSetInterval = 'uboLogSetInterval';
    function callback() {
        window[uboLogSetInterval] = 'changed';
    }
    const timeout = 10;

    setInterval(callback, timeout);

    // eslint-disable-next-line no-console
    console.log = function log(input) {
        if (input.indexOf('trace') > -1) {
            return;
        }
        assert.strictEqual(input, `setInterval("${callback.toString()}", ${timeout})`, 'console.hit input should be equal');
    };

    // We need to run our assertion after all timeouts
    setTimeout(() => {
        assert.equal(window.hit, 'value', 'Hit function was executed');
        assert.strictEqual(window[uboLogSetInterval], 'changed', 'property changed');
        clearGlobalProps('hit', uboLogSetInterval);
        done();
    }, 50);
});


test('prevent-setInterval: adg by setInterval callback name', (assert) => {
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
    setInterval(test, 50);

    // check if scriptlet doesn't affect on others timeouts
    const anotherTimeout = () => { window.ddd = 'new value'; };
    setInterval(anotherTimeout);
});


test('prevent-setInterval: adg by code matching', (assert) => {
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
    setInterval(testCallback, 50);

    // check if scriptlet doesn't affect on others timeouts
    const anotherTimeout = () => { window.ddd = 'new value'; };
    setInterval(anotherTimeout);
});


test('prevent-setInterval: adg -- !match', (assert) => {
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
    setInterval(one, 25);

    const second = () => { window.second = 'second'; };
    setInterval(second, 40);

    const third = () => { window.third = 'third'; };
    setInterval(third, 50);
});


test('prevent-setInterval: adg -- match + !delay', (assert) => {
    const params = {
        name,
        args: ['test', '!50'],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    const done = assert.async();

    window.one = 'one';
    window.second = 'two';
    window.third = 'three';
    // We need to run our assertion after all timeouts
    setTimeout(() => {
        assert.equal(window.one, 'one', 'Target property not changed');
        assert.equal(window.second, 'second', 'Second property should be successfully changed');
        assert.equal(window.third, 'three', 'Target property not changed');
        assert.equal(window.hit, 'value', 'Hit function was executed');
        done();
    }, 200);

    // run scriptlet code
    evalWrap(scriptlet);


    const test1 = () => { window.one = 'first'; };
    setInterval(test1, 20);

    const test2 = () => { window.second = 'second'; };
    // only this one should not be prevented because of delay = !50
    setInterval(test2, 50);

    const test3 = () => { window.third = 'third'; };
    setInterval(test3, 60);
});


test('prevent-setInterval: adg -- !match + !delay', (assert) => {
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
    setInterval(one20, 20);

    const one50 = () => { window.first50 = 'first50'; };
    setInterval(one50, 50);

    const second20 = () => { window.second20 = 'second20'; };
    // only this one should not be prevented because of match = !one && delay = !50
    setInterval(second20, 20);

    const second50 = () => { window.second50 = 'second50'; };
    setInterval(second50, 50);
});
