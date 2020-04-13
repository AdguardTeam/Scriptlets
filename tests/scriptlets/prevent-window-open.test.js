/* eslint-disable no-eval, no-underscore-dangle */
import { clearGlobalProps } from '../helpers';

const {
    test,
    module,
} = QUnit;
const name = 'prevent-window-open';

// copy eval to prevent rollup warnings
const evalWrap = eval;

const nativeOpen = window.open;

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'value';
    };
};

const afterEach = () => {
    window.open = nativeOpen;
    clearGlobalProps('hit', '__debug');
};

module(name, { beforeEach, afterEach });

test('prevent-window-open: adg no args', (assert) => {
    const params = {
        name,
        args: [],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    // run scriptlet code
    evalWrap(scriptlet);
    // check if scriptlet works
    window.open('some url');
    assert.equal(window.hit, 'value', 'Hit function was executed');
});

test('prevent-window-open: ubo alias: not reverse, string', (assert) => {
    const params = {
        name: 'ubo-window.open-defuser.js',
        args: ['1', 'test'],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    // run scriptlet code
    evalWrap(scriptlet);
    // check if scriptlet works
    window.open('test url', 'some target');
    assert.equal(window.hit, 'value', 'Hit function was executed');
});

test('prevent-window-open: adg: regexp ', (assert) => {
    const params = {
        name,
        args: ['1', 'test'],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    // run scriptlet code
    evalWrap(scriptlet);
    // check if scriptlet works
    window.open('test url', 'some target');
    assert.equal(window.hit, 'value', 'Hit function was executed');
});

test('prevent-window-open: adg: regexp ', (assert) => {
    const params = {
        name,
        args: ['2', '/test/'],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    // run scriptlet code
    evalWrap(scriptlet);
    // check if scriptlet works
    window.open('test url', 'some target');
    assert.equal(window.hit, 'value', 'Hit function was executed');
});

test('prevent-window-open: adg: reverse, regexp ', (assert) => {
    const params = {
        name,
        args: ['0', '/test/'],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    // run scriptlet code
    evalWrap(scriptlet);
    // check if scriptlet works
    window.open('some url', 'some target');
    assert.equal(window.hit, 'value', 'Hit function was executed because of reverse matching');
});

test('prevent-window-open: adg with replacement', (assert) => {
    const params = {
        name,
        args: ['1', '', 'trueFunc'],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    // run scriptlet code
    evalWrap(scriptlet);
    // check if scriptlet works
    const test = window.open('some url');
    const res = test();
    assert.equal(window.hit, 'value', 'Hit function was executed');
    assert.equal(res, true, 'window.open replaced by trueFunc');
});

test('prevent-window-open: adg with replacement', (assert) => {
    const params = {
        name,
        args: ['1', '', '{aa=noopFunc}'],
        verbose: true,
    };
    const scriptlet = window.scriptlets.invoke(params);
    // run scriptlet code
    evalWrap(scriptlet);
    // check if scriptlet works
    const test = window.open('some test url');
    const res = test();
    assert.equal(window.hit, 'value', 'Hit function was executed');
    assert.strictEqual(typeof res, 'object', 'replaced window.open returns an object');
    assert.strictEqual(typeof res.aa, 'function', 'and the object\'s property is a function');
    assert.strictEqual(typeof res.aa(), 'undefined', 'which is noopFunc');
});
