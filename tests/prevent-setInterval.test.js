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

const testIntervals = [];

const beforeEach = () => {
    window.__debugScriptlets = () => {
        window.hit = 'value';
    };
};

const afterEach = () => {
    window.setInterval = nativeSetInterval;
    clearGlobalProps('hit', '__debugScriptlets', 'one', 'two', 'three', 'four');
    testIntervals.forEach((i) => (clearInterval(i)));
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

    const intervalId = setInterval(callback, timeout);
    testIntervals.push(intervalId);

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
        clearGlobalProps(agLogSetInterval);
        done();
    }, 50);
});


test('prevent-setInterval: ubo alias no args -- logging', (assert) => {
    const params = {
        name: 'ubo-no-setInterval-if.js',
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

    const intervalId = setInterval(callback, timeout);
    testIntervals.push(intervalId);

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
        clearGlobalProps(uboLogSetInterval);
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

    window.one = 'value';
    window.two = 'value';
    // We need to run our assertion after all timeouts
    setTimeout(() => {
        assert.equal(window.one, 'value', 'Target property not changed');
        // eslint-disable-next-line max-len
        assert.equal(window.two, 'new value', 'Another property should successfully changed by another timeout');
        assert.equal(window.hit, 'value', 'Hit function was executed');
        done();
    }, 100);

    // run scriptlet code
    evalWrap(scriptlet);
    // check if scriptlet works
    const test = () => { window.one = 'new value'; };
    const intervalId = setInterval(test, 50);
    testIntervals.push(intervalId);

    // check if scriptlet doesn't affect on others timeouts
    const anotherTimeout = () => { window.two = 'new value'; };
    const intervalAnother = setInterval(anotherTimeout);
    testIntervals.push(intervalAnother);
});


test('prevent-setInterval: adg by code matching', (assert) => {
    const params = {
        name,
        args: ['one', '50'],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    const done = assert.async();

    window.one = 'value';
    window.two = 'value';
    // We need to run our assertion after all timeouts
    setTimeout(() => {
        assert.equal(window.one, 'value', 'Target property not changed');
        // eslint-disable-next-line max-len
        assert.equal(window.two, 'new value', 'Another property should  be successfully changed by another timeout');
        assert.equal(window.hit, 'value', 'Hit function was executed');
        done();
    }, 100);

    // run scriptlet code
    evalWrap(scriptlet);
    // check if scriptlet works
    const testCallback = () => { window.one = 'new value'; };
    const intervalId = setInterval(testCallback, 50);
    testIntervals.push(intervalId);

    // check if scriptlet doesn't affect on others timeouts
    const anotherTimeout = () => { window.two = 'new value'; };
    const intervalAnother = setInterval(anotherTimeout);
    testIntervals.push(intervalAnother);
});


test('prevent-setInterval: adg -- !match', (assert) => {
    const params = {
        name,
        args: ['!one'],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    const done = assert.async();

    window.one = 'old one';
    window.two = 'old two';
    window.three = 'old three';
    // We need to run our assertion after all timeouts
    setTimeout(() => {
        assert.equal(window.one, 'NEW ONE', '!match-property not changed');
        // eslint-disable-next-line max-len
        assert.equal(window.two, 'old two', 'Second property should be successfully changed');
        assert.equal(window.three, 'old three', 'Third property should be successfully changed');
        assert.equal(window.hit, 'value', 'Hit function was executed');
        done();
    }, 100);

    // run scriptlet code
    evalWrap(scriptlet);

    // only this one should not be prevented because of match = !one
    const one = () => { window.one = 'NEW ONE'; };
    const intervalTest1 = setInterval(one, 25);
    testIntervals.push(intervalTest1);

    const second = () => { window.two = 'NEW TWO'; };
    const intervalTest2 = setInterval(second, 40);
    testIntervals.push(intervalTest2);

    const third = () => { window.three = 'NEW THREE'; };
    const intervalTest3 = setInterval(third, 50);
    testIntervals.push(intervalTest3);
});


test('prevent-setInterval: adg -- match + !delay', (assert) => {
    const params = {
        name,
        args: ['test', '!50'],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    const done = assert.async();

    window.one = 'old one';
    window.two = 'old two';
    window.three = 'old three';
    // We need to run our assertion after all timeouts
    setTimeout(() => {
        assert.equal(window.one, 'old one', 'Target property not changed');
        assert.equal(window.two, 'CHANGED2', 'Second property should be successfully changed');
        assert.equal(window.three, 'old three', 'Target property not changed');
        assert.equal(window.hit, 'value', 'Hit function was executed');
        done();
    }, 200);

    // run scriptlet code
    evalWrap(scriptlet);

    const test1 = () => { window.one = 'CHANGED1'; };
    const intervalTest1 = setInterval(test1, 20);
    testIntervals.push(intervalTest1);

    const test2 = () => { window.two = 'CHANGED2'; };
    // only this one should not be prevented because of delay = !50
    const intervalTest2 = setInterval(test2, 50);
    testIntervals.push(intervalTest2);

    const test3 = () => { window.three = 'CHANGED3'; };
    const intervalTest3 = setInterval(test3, 60);
    testIntervals.push(intervalTest3);
});


test('prevent-setInterval: adg -- !match + !delay', (assert) => {
    const params = {
        name,
        args: ['!first', '!50'],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    const done = assert.async();

    window.one = 'old';
    window.two = 'old';
    window.three = 'old';
    window.four = 'old';
    // We need to run our assertion after all timeouts
    setTimeout(() => {
        assert.equal(window.one, 'first20', 'property should be successfully changed');
        assert.equal(window.two, 'first50', 'property should be successfully changed');
        assert.equal(window.three, 'old', 'Target property not changed');
        assert.equal(window.four, 'second50', 'property should be successfully changed');
        assert.equal(window.hit, 'value', 'Hit function was executed');
        done();
    }, 100);

    // run scriptlet code
    evalWrap(scriptlet);

    const first20 = () => { window.one = 'first20'; };
    const intervalTest120 = setInterval(first20, 20);
    testIntervals.push(intervalTest120);

    const first50 = () => { window.two = 'first50'; };
    const intervalTest150 = setInterval(first50, 50);
    testIntervals.push(intervalTest150);

    const second20 = () => { window.three = 'second20'; };
    // only this one should be prevented because of match = !one && delay = !50
    const intervalTest220 = setInterval(second20, 20);
    testIntervals.push(intervalTest220);

    const second50 = () => { window.four = 'second50'; };
    const intervalTest250 = setInterval(second50, 50);
    testIntervals.push(intervalTest250);
});
