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
    clearGlobalProps('hit', '__debug', 'one', 'two', 'three', 'four');
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
    runScriptlet(name);
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
    nativeSetTimeout(() => {
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
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
        // eslint-disable-next-line max-len
        assert.equal(window.two, 'two', 'Second property should be successfully changed');
        assert.equal(window.three, 'three', 'Third property should be successfully changed');
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        done();
    }, 100);

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
