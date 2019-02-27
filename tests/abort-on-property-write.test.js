/* global QUnit */
/* eslint-disable no-eval */
const { test, module, testDone } = QUnit;
const name = 'abort-on-property-write';
const PROPERTY = 'aaa';
const CHAIN_PROPERTY = 'aaa.bbb';
testDone(() => {
    delete window[PROPERTY];
});

module(name);
test('abort-on-property-write: ubo alias, set prop for existed prop', (assert) => {
    const params = {
        name: `ubo-${name}.js`,
        args: [PROPERTY],
    };
    window[PROPERTY] = 'value';
    const resString = window.scriptlets.invoke(params);
    eval(resString);
    assert.throws(
        () => {
            window[PROPERTY] = 'new value';
        },
        /ReferenceError/,
        `should throw Reference error when try to write property ${PROPERTY}`,
    );
});

test('abort-on-property-write: abp alias, set prop for existed prop', (assert) => {
    const params = {
        name: `abp-${name}`,
        args: [PROPERTY],
    };
    window[PROPERTY] = 'value';
    const resString = window.scriptlets.invoke(params);
    eval(resString);
    assert.throws(
        () => {
            window[PROPERTY] = 'new value';
        },
        /ReferenceError/,
        `should throw Reference error when try to write property ${PROPERTY}`,
    );
});

test('abort-on-property-write: adg alias, set prop for existed prop', (assert) => {
    const params = {
        name,
        args: [PROPERTY],
    };
    window[PROPERTY] = 'value';
    const resString = window.scriptlets.invoke(params);
    eval(resString);
    assert.throws(
        () => {
            window[PROPERTY] = 'new value';
        },
        /ReferenceError/,
        `should throw Reference error when try to access property ${PROPERTY}`,
    );
});

test('abort-on-property-write dot notation', (assert) => {
    const params = { name, args: [CHAIN_PROPERTY] };
    window.aaa = {
        bbb: 'value',
    };
    const resString = window.scriptlets.invoke(params);
    eval(resString);
    assert.throws(
        () => {
            window.aaa.bbb = 'new value';
        },
        /ReferenceError/,
        `should throw Reference error when try to access property ${CHAIN_PROPERTY}`,
    );
});

test('abort-on-property-write dot notation deferred defenition', (assert) => {
    const params = { name, args: [CHAIN_PROPERTY] };
    const resString = window.scriptlets.invoke(params);
    eval(resString);
    window.aaa = {};
    assert.throws(
        () => {
            window.aaa.bbb = 'new value';
        },
        /ReferenceError/,
        `should throw Reference error when try to access property ${CHAIN_PROPERTY}`,
    );
});
