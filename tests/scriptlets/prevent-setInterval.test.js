/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'prevent-setInterval';

const nativeSetInterval = window.setInterval;
const nativeConsole = console.log; // eslint-disable-line no-console

const testIntervals = [];

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    window.setInterval = nativeSetInterval;
    testIntervals.forEach((i) => (clearInterval(i)));
    clearGlobalProps('hit', '__debug', 'aaa', 'one', 'two', 'three', 'four');
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
        name: 'ubo-no-setInterval-if.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('no args -- logging', (assert) => {
    const agLogSetInterval = 'agLogSetInterval';
    function callback() {
        window[agLogSetInterval] = 'changed';
    }
    const timeout = 10;

    let loggedMessage;
    // eslint-disable-next-line no-console
    console.log = function log(input) {
        if (input.indexOf('trace') > -1) {
            return;
        }
        loggedMessage = input;
    };

    const done = assert.async();
    runScriptlet(name);

    const intervalId = setInterval(callback, timeout);
    testIntervals.push(intervalId);

    // We need to run our assertion after all timeouts
    setTimeout(() => {
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        assert.strictEqual(loggedMessage, `setInterval(${callback.toString()}, ${timeout})`, 'console.hit input ok');
        assert.strictEqual(window[agLogSetInterval], 'changed', 'property changed');
        clearGlobalProps(agLogSetInterval);
        done();
    }, 50);
});

test('setInterval callback name matching', (assert) => {
    const done = assert.async();
    window.one = 'value';
    window.two = 'value';
    // We need to run our assertion after all timeouts
    setTimeout(() => {
        assert.equal(window.one, 'value', 'Target property not changed');
        // eslint-disable-next-line max-len
        assert.equal(window.two, 'new value', 'Another property should successfully changed by another timeout');
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        done();
    }, 100);

    // run scriptlet code
    const scriptletArgs = ['test', '50'];
    runScriptlet(name, scriptletArgs);

    // check if scriptlet works
    const test = () => { window.one = 'new value'; };
    const intervalId = setInterval(test, 50);
    testIntervals.push(intervalId);

    // check if scriptlet doesn't affect on others timeouts
    const anotherTimeout = () => { window.two = 'new value'; };
    const intervalAnother = setInterval(anotherTimeout);
    testIntervals.push(intervalAnother);
});

test('code matching', (assert) => {
    const done = assert.async();
    window.one = 'value';
    window.two = 'value';
    // We need to run our assertion after all timeouts
    setTimeout(() => {
        assert.equal(window.one, 'value', 'Target property not changed');
        // eslint-disable-next-line max-len
        assert.equal(window.two, 'new value', 'Another property should  be successfully changed by another timeout');
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        done();
    }, 100);

    // run scriptlet code
    const scriptletArgs = ['one', '50'];
    runScriptlet(name, scriptletArgs);

    // check if scriptlet works
    const testCallback = () => { window.one = 'new value'; };
    const intervalId = setInterval(testCallback, 50);
    testIntervals.push(intervalId);

    // check if scriptlet doesn't affect on others timeouts
    const anotherTimeout = () => { window.two = 'new value'; };
    const intervalAnother = setInterval(anotherTimeout);
    testIntervals.push(intervalAnother);
});

test('!match', (assert) => {
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
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        done();
    }, 100);

    // run scriptlet code
    const scriptletArgs = ['!one'];
    runScriptlet(name, scriptletArgs);

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

test('match + !delay', (assert) => {
    const done = assert.async();
    window.one = 'old one';
    window.two = 'old two';
    window.three = 'old three';
    // We need to run our assertion after all timeouts
    setTimeout(() => {
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

test('!match + !delay', (assert) => {
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
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        done();
    }, 100);

    // run scriptlet code
    const scriptletArgs = ['!first', '!50'];
    runScriptlet(name, scriptletArgs);

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

test('prevent-setInterval: does not work - invalid regexp pattern', (assert) => {
    const done = assert.async();
    window.one = 'value';
    // We need to run our assertion after all timeouts
    setTimeout(() => {
        assert.equal(window.one, 'changed', 'property should be changed');
        assert.strictEqual(window.hit, undefined, 'hit should not fire');
        done();
    }, 100);

    // run scriptlet code
    const scriptletArgs = ['/\\/', '50'];
    runScriptlet(name, scriptletArgs);

    // check if scriptlet doesn't affect on others timeouts
    const callback = () => { window.one = 'changed'; };
    const testInterval = setInterval(callback, 50);
    testIntervals.push(testInterval);
});

test('prevent-setInterval: no callback for setInterval considered as undefined', (assert) => {
    const done = assert.async();
    window.one = 1;
    // We need to run our assertion after all timeouts
    setTimeout(() => {
        assert.equal(window.one, 1, 'property should not be changed');
        assert.strictEqual(window.hit, undefined, 'hit should NOT fire as callback is invalid');
        done();
    }, 100);

    // run scriptlet code — match any callback
    const scriptletArgs = ['.?'];
    runScriptlet(name, scriptletArgs);

    // callback is undefined is such case, should not hit
    const testInterval = setInterval(console.log('this is no callback'), 10); // eslint-disable-line no-console
    testIntervals.push(testInterval);
});

test('prevent-setInterval: null as callback', (assert) => {
    const done = assert.async();
    window.one = 1;
    // We need to run our assertion after all timeouts
    setTimeout(() => {
        assert.equal(window.one, 1, 'property should not be changed');
        assert.strictEqual(window.hit, undefined, 'hit should NOT fire as callback is null');
        done();
    }, 100);

    // run scriptlet code — match any callback
    const scriptletArgs = ['.?'];
    runScriptlet(name, scriptletArgs);

    const callback = null;
    const testInterval = setInterval(callback, 10);
    testIntervals.push(testInterval);
});
