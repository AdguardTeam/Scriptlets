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

const beforeEach = () => {
    window.__debugScriptlets = () => {
        window.hit = 'value';
    };
};

const afterEach = () => {
    window.setTimeout = nativeSetTimeout;
    clearGlobalProps('hit', 'aaa', '__debugScriptlets');
};

module(name, { beforeEach, afterEach });
test('prevent-setTimeout: adg no args', (assert) => {
    const params = {
        name,
        args: [],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    const done = assert.async();

    window.aaa = 'value';
    // We need to run our assertion after all timeouts
    setTimeout(() => {
        assert.equal(window.aaa, 'value', 'Target property not changed');
        assert.equal(window.hit, 'value', 'Hit function was executed');
        done();
    }, 20);
    // run scriptlet code
    evalWrap(scriptlet);
    // check if scriptlet works
    setTimeout(() => { window.aaa = 'new value'; });
});

test('prevent-setTimeout: ubo alias no args', (assert) => {
    const params = {
        name: 'ubo-setTimeout-defuser.js',
        args: [],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    const done = assert.async();

    window.aaa = 'value';
    // We need to run our assertion after all timeouts
    setTimeout(() => {
        assert.equal(window.aaa, 'value', 'Target property not changed');
        assert.equal(window.hit, 'value', 'Hit function was executed');
        done();
    }, 20);
    // run scriptlet code
    evalWrap(scriptlet);
    // check if scriptlet works
    setTimeout(() => { window.aaa = 'new value'; });
});

test('prevent-setTimeout: adg by timeout name', (assert) => {
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
