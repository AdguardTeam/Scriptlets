/* eslint-disable no-eval, no-underscore-dangle, no-console */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'debug-on-property-read';
const PROPERTY = 'aaa';
const CHAIN_PROPERTY = 'aaa.bbb';

// copy eval to prevent rollup warnings
const evalWrap = eval;

const changingProps = [PROPERTY, 'hit', '__debug'];

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'value';
    };
};

const afterEach = () => {
    clearGlobalProps(...changingProps);
};

module(name, { beforeEach, afterEach });

test('debug-on-property-read simple', (assert) => {
    const params = {
        name,
        args: [PROPERTY],
        verbose: true,
    };
    window[PROPERTY] = 'value';
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    console.log(window[PROPERTY]);
    assert.equal(window.hit, 'value', 'Hit function was executed');
});

test('debug-on-property-read dot notation', (assert) => {
    const params = {
        name,
        args: [CHAIN_PROPERTY],
        verbose: true,
    };
    window.aaa = {
        bbb: 'value',
    };
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    console.log(window.aaa.bbb);
    assert.equal(window.hit, 'value', 'Hit function was executed');
});

test('debug-on-property-read dot notation deferred defenition', (assert) => {
    const params = {
        name,
        args: [CHAIN_PROPERTY],
        verbose: true,
    };
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    window.aaa = {};
    window.aaa.bbb = 'value';
    console.log(window.aaa.bbb);
    assert.equal(window.hit, 'value', 'Hit function was executed');
});
