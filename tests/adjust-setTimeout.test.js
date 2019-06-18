/* global QUnit */
/* eslint-disable no-eval, no-underscore-dangle */
import { clearGlobalProps } from './helpers';

const { test, module } = QUnit;
const name = 'adjust-setTimeout';
const nativeSetTimeout = window.setTimeout;

const afterEach = () => {
    window.setTimeout = nativeSetTimeout;
    clearGlobalProps('hit', '__debugScriptlets', 'intervalValue', 'someKey');
};

module(name, { afterEach });

const createHit = () => {
    window.__debugScriptlets = () => {
        window.hit = 'FIRED';
    };
};

const evalWrapper = eval;

test('ubo alias', (assert) => {
    createHit();
    const params = {
        name: 'ubo-nano-setTimeout-booster.js',
        args: ['intervalValue', '100', '2'],
        verbose: true,
    };

    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    const done1 = assert.async();
    const done2 = assert.async();

    const timeout = setTimeout(() => {
        window.intervalValue = 'value';
    }, 100);

    setTimeout(() => {
        assert.notOk(window.intervalValue, 'Still not defined');
        done1();
    }, 150);

    setTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Defined after boosted setTimeout');
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        clearTimeout(timeout);
        done2();
    }, 250);
});

test('Adg no args', (assert) => {
    createHit();
    const params = {
        name,
        args: [],
        verbose: true,
    };

    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    const done = assert.async();

    const timeout = setTimeout(() => {
        window.intervalValue = 'value';
    }, 1000);

    setTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined because default boost value equal 0.05');
        clearTimeout(timeout);
        done();
    }, 100);
});

test('Adg: match param', (assert) => {
    createHit();
    const params = {
        name,
        args: ['intervalValue'],
        verbose: true,
    };

    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    const done1 = assert.async();
    const done2 = assert.async();
    const done3 = assert.async();

    const timeout = setTimeout(() => {
        window.intervalValue = 'value';
    }, 1000);

    const regularTimeout = setTimeout(() => {
        window.someKey = 'value';
    }, 200);

    setTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined because default boost value equal 0.05');
        clearTimeout(timeout);
        done1();
    }, 100);

    setTimeout(() => {
        assert.notOk(window.someKey);
        done2();
    }, 150);

    setTimeout(() => {
        assert.strictEqual(window.someKey, 'value', 'All others timeouts should be okay');
        clearTimeout(regularTimeout);
        done3();
    }, 250);
});

test('Adg: match param and timeout', (assert) => {
    createHit();
    const params = {
        name,
        args: ['intervalValue', '500'],
        verbose: true,
    };

    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    const done = assert.async();

    const timeout = setTimeout(() => {
        window.intervalValue = 'value';
    }, 500);

    setTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined because default boost value equal 0.05');
        clearTimeout(timeout);
        done();
    }, 50);
});

test('Adg: all params', (assert) => {
    createHit();
    const params = {
        name,
        args: ['intervalValue', '100', '2'],
        verbose: true,
    };

    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    const done1 = assert.async();
    const done2 = assert.async();

    const timeout = setTimeout(() => {
        window.intervalValue = 'value';
    }, 100);

    setTimeout(() => {
        assert.notOk(window.intervalValue, 'Still not defined');
        done1();
    }, 150);

    setTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined');
        clearTimeout(timeout);
        done2();
    }, 250);
});
