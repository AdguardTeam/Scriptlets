/* eslint-disable no-eval, no-underscore-dangle */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'debug-on-property-write';
const PROPERTY = 'aaa';
const CHAIN_PROPERTY = 'aaa.bbb';

// copy eval to prevent rollup warnings
const evalWrap = eval;

const changingProps = [PROPERTY, 'hit', '__debug'];

module(name);
test('debug-on-property-write: adg alias, set prop for existed prop', (assert) => {
    const params = {
        name,
        args: [PROPERTY],
        verbose: true,
    };
    window.__debug = () => {
        window.hit = 'value';
    };
    window[PROPERTY] = 'value';
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    window[PROPERTY] = 'new value';
    assert.equal(window.hit, 'value', 'Hit function was executed');
    clearGlobalProps(...changingProps);
});

test('debug-on-property-write dot notation', (assert) => {
    const params = {
        name,
        args: [CHAIN_PROPERTY],
        verbose: true,
    };
    window.__debug = () => {
        window.hit = 'value';
    };
    window.aaa = {
        bbb: 'value',
    };
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    window.aaa.bbb = 'new value';
    assert.equal(window.hit, 'value', 'Hit function was executed');
    clearGlobalProps(...changingProps);
});

test('debug-on-property-write dot notation deferred defenition', (assert) => {
    const params = {
        name,
        args: [CHAIN_PROPERTY],
        verbose: true,
    };
    window.__debug = () => {
        window.hit = 'value';
    };
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    window.aaa = {};
    window.aaa.bbb = 'new value';
    assert.equal(window.hit, 'value', 'Hit function was executed');
    clearGlobalProps(...changingProps);
});

test('debug-on-property-write: stack match', (assert) => {
    const params = {
        name,
        args: [
            [PROPERTY],
            '/test/',
        ],
        verbose: true,
    };
    window.__debug = () => {
        window.hit = 'value';
    };
    window[PROPERTY] = 'value';
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    window[PROPERTY] = 'new value';
    assert.equal(window.hit, 'value', 'Hit function was executed');
    clearGlobalProps(...changingProps);
});

test('debug-on-property-write: no stack match', (assert) => {
    const params = {
        name,
        args: [
            [PROPERTY],
            'no_match.js',
        ],
        verbose: true,
    };
    window.__debug = () => {
        window.hit = 'value';
    };
    window[PROPERTY] = 'value';
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    window[PROPERTY] = 'new value';
    assert.equal(window.hit, undefined, 'Hit function was NOT executed');
    clearGlobalProps(...changingProps);
});
