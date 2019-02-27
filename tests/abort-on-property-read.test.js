/* global QUnit */
/* eslint-disable no-eval, no-underscore-dangle */
const { test, module, testDone } = QUnit;
const name = 'abort-on-property-read';
const PROPERTY = 'aaa';
const CHAIN_PROPERTY = 'aaa.bbb';

// copy eval to prevent rollup warnings
const evalWrap = eval;

testDone(() => {
    delete window[PROPERTY];
});

module(name);
test('abort-on-property-read simple check ubo alias', (assert) => {
    const params = {
        name: `ubo-${name}.js`,
        args: [PROPERTY],
    };
    window[PROPERTY] = 'value';
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    assert.throws(
        () => window[PROPERTY],
        /ReferenceError/,
        `should throw Reference error when try to access property ${PROPERTY}`,
    );
});

test('abort-on-property-read simple check abp alias', (assert) => {
    const params = {
        name: `abp-${name}`,
        args: [PROPERTY],
    };
    window[PROPERTY] = 'value';
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    assert.throws(
        () => window[PROPERTY],
        /ReferenceError/,
        `should throw Reference error when try to access property ${PROPERTY}`,
    );
});

test('abort-on-property-read simple', (assert) => {
    const params = {
        name,
        args: [PROPERTY],
    };
    window[PROPERTY] = 'value';
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    assert.throws(
        () => window[PROPERTY],
        /ReferenceError/,
        `should throw Reference error when try to access property ${PROPERTY}`,
    );
});

test('abort-on-property-read dot notation', (assert) => {
    const params = { name, args: [CHAIN_PROPERTY] };
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
});

test('abort-on-property-read dot notation deferred defenition', (assert) => {
    const params = { name, args: [CHAIN_PROPERTY] };
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    window.aaa = {};
    window.aaa.bbb = 'value';
    assert.throws(
        () => window.aaa.bbb,
        /ReferenceError/,
        `should throw Reference error when try to access property ${CHAIN_PROPERTY}`,
    );
});
