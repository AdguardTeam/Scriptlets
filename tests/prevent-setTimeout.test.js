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

const beforeEach = () => {
    window.__debugScriptlets = () => {
        window.hit = 'value';
    };
};

const afterEach = () => {
    window.setTimeout = nativeSetTimeout;
    clearGlobalProps('hit', 'aaa', '__debugScriptlets');
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

    setTimeout(callback, timeout);

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
        name: 'ubo-setTimeout-defuser.js',
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

    setTimeout(callback, timeout);

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
        args: ['test', '500'],
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
    setTimeout(test, 500);

    // check if scriptlet doesn't affect on others timeouts
    const anotherTimeout = () => { window.ddd = 'new value'; };
    setTimeout(anotherTimeout);
});


test('prevent-setTimeout: adg by code matching', (assert) => {
    const params = {
        name,
        args: ['match', '500'],
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
    setTimeout(testCallback, 500);

    // check if scriptlet doesn't affect on others timeouts
    const anotherTimeout = () => { window.ddd = 'new value'; };
    setTimeout(anotherTimeout);
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
    setTimeout(one, 30);

    const second = () => { window.second = 'second'; };
    setTimeout(second, 40);

    const third = () => { window.third = 'third'; };
    setTimeout(third, 50);
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
    setTimeout(test1, 40);

    const test2 = () => { window.second = 'second'; };
    // only this one should not be prevented because of delay = !50
    setTimeout(test2, 50);

    const test3 = () => { window.third = 'third'; };
    setTimeout(test3, 60);
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
    setTimeout(one20, 20);

    const one50 = () => { window.first50 = 'first50'; };
    setTimeout(one50, 50);

    const second20 = () => { window.second20 = 'second20'; };
    // only this one should not be prevented because of match = !one && delay = !50
    setTimeout(second20, 20);

    const second50 = () => { window.second50 = 'second50'; };
    setTimeout(second50, 50);
});
