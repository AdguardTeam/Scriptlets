/* global QUnit */
/* eslint-disable no-eval, no-underscore-dangle */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'abort-on-property-read';
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

test('abort-on-property-read simple check ubo alias', (assert) => {
    const params = {
        name: `ubo-${name}.js`,
        args: [PROPERTY],
        verbose: true,
    };

    window[PROPERTY] = 'value';
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    assert.throws(
        () => window[PROPERTY],
        /ReferenceError/,
        `should throw Reference error when try to access property ${PROPERTY}`,
    );
    assert.equal(window.hit, 'value', 'Hit function was executed');
});

test('abort-on-property-read simple check abp alias', (assert) => {
    const params = {
        name: `abp-${name}`,
        args: [PROPERTY],
        verbose: true,
    };
    window[PROPERTY] = 'value';
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    assert.throws(
        () => window[PROPERTY],
        /ReferenceError/,
        `should throw Reference error when try to access property ${PROPERTY}`,
    );
    assert.equal(window.hit, 'value', 'Hit function was executed');
});

test('abort-on-property-read simple', (assert) => {
    const params = {
        name,
        args: [PROPERTY],
        verbose: true,
    };
    window[PROPERTY] = 'value';
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    assert.throws(
        () => window[PROPERTY],
        /ReferenceError/,
        `should throw Reference error when try to access property ${PROPERTY}`,
    );
    assert.equal(window.hit, 'value', 'Hit function was executed');
});

test('abort-on-property-read dot notation', (assert) => {
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
    assert.throws(
        () => window.aaa.bbb,
        /ReferenceError/,
        `should throw Reference error when try to access property ${CHAIN_PROPERTY}`,
    );
    assert.equal(window.hit, 'value', 'Hit function was executed');
});

test('abort-on-property-read dot notation deferred defenition', (assert) => {
    const params = {
        name,
        args: [CHAIN_PROPERTY],
        verbose: true,
    };
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    window.aaa = {};
    window.aaa.bbb = 'value';
    assert.throws(
        () => window.aaa.bbb,
        /ReferenceError/,
        `should throw Reference error when try to access property ${CHAIN_PROPERTY}`,
    );
    assert.equal(window.hit, 'value', 'Hit function was executed');
});
