/* global QUnit */
/* eslint-disable no-eval */
const { test, module, testDone } = QUnit;
const name = 'abort-on-property-write';
const PROPERTY = 'aaa';
const CHAIN_PROPERTY = 'aaa.bbb';

// copy eval to prevent rollup warnings
const evalWrap = eval;

testDone(() => {
    delete window[PROPERTY];
    delete window.hit;
});

module(name);
test('abort-on-property-write: ubo alias, set prop for existed prop', (assert) => {
    const params = {
        name: `ubo-${name}.js`,
        args: [PROPERTY],
        hit: () => {
            window.hit = 'value';
        },
    };
    window[PROPERTY] = 'value';
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    assert.throws(
        () => {
            window[PROPERTY] = 'new value';
        },
        /ReferenceError/,
        `should throw Reference error when try to write property ${PROPERTY}`,
    );
    assert.equal(window.hit, 'value', 'Hit function was executed');
});

test('abort-on-property-write: abp alias, set prop for existed prop', (assert) => {
    const params = {
        name: `abp-${name}`,
        args: [PROPERTY],
        hit: () => {
            window.hit = 'value';
        },
    };
    window[PROPERTY] = 'value';
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    assert.throws(
        () => {
            window[PROPERTY] = 'new value';
        },
        /ReferenceError/,
        `should throw Reference error when try to write property ${PROPERTY}`,
    );
    assert.equal(window.hit, 'value', 'Hit function was executed');
});

test('abort-on-property-write: adg alias, set prop for existed prop', (assert) => {
    const params = {
        name,
        args: [PROPERTY],
        hit: () => {
            window.hit = 'value';
        },
    };
    window[PROPERTY] = 'value';
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    assert.throws(
        () => {
            window[PROPERTY] = 'new value';
        },
        /ReferenceError/,
        `should throw Reference error when try to access property ${PROPERTY}`,
    );
    assert.equal(window.hit, 'value', 'Hit function was executed');
});

test('abort-on-property-write dot notation', (assert) => {
    const params = {
        name,
        args: [CHAIN_PROPERTY],
        hit: () => {
            window.hit = 'value';
        },
    };
    window.aaa = {
        bbb: 'value',
    };
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    assert.throws(
        () => {
            window.aaa.bbb = 'new value';
        },
        /ReferenceError/,
        `should throw Reference error when try to access property ${CHAIN_PROPERTY}`,
    );
    assert.equal(window.hit, 'value', 'Hit function was executed');
});

test('abort-on-property-write dot notation deferred defenition', (assert) => {
    const params = {
        name,
        args: [CHAIN_PROPERTY],
        hit: () => {
            window.hit = 'value';
        },
    };
    const resString = window.scriptlets.invoke(params);
    evalWrap(resString);
    window.aaa = {};
    assert.throws(
        () => {
            window.aaa.bbb = 'new value';
        },
        /ReferenceError/,
        `should throw Reference error when try to access property ${CHAIN_PROPERTY}`,
    );
    assert.equal(window.hit, 'value', 'Hit function was executed');
});
