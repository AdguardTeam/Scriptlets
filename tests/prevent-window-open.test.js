/* global QUnit */
/* eslint-disable no-eval */
const {
    test,
    module,
    moduleStart,
    testDone,
} = QUnit;
const name = 'prevent-window-open';

// copy eval to prevent rollup warnings
const evalWrap = eval;

let nativeOpen;
moduleStart(() => {
    nativeOpen = window.open;
});

testDone(() => {
    window.open = nativeOpen;
    delete window.hit;
});

module(name);
test('prevent-window-open: adg no args', (assert) => {
    const params = {
        name,
        args: [],
        hit: () => {
            window.hit = 'value';
        },
    };
    const scriptlet = window.scriptlets.invoke(params);
    // run scriptlet code
    evalWrap(scriptlet);
    // check is scriptlet works
    window.open('some url');
    assert.equal(window.hit, 'value', 'Hit function was executed');
});

test('prevent-window-open: ubo alias: not reverse, string', (assert) => {
    const params = {
        name: 'ubo-window.open-defuser.js',
        args: ['', 'test'],
        hit: () => {
            window.hit = 'value';
        },
    };
    const scriptlet = window.scriptlets.invoke(params);
    // run scriptlet code
    evalWrap(scriptlet);
    // check is scriptlet works
    window.open('test url', 'some target');
    assert.equal(window.hit, 'value', 'Hit function was executed');
});

test('prevent-window-open: adg: regexp ', (assert) => {
    const params = {
        name,
        args: ['', '/test/'],
        hit: () => {
            window.hit = 'value';
        },
    };
    const scriptlet = window.scriptlets.invoke(params);
    // run scriptlet code
    evalWrap(scriptlet);
    // check is scriptlet works
    window.open('test url', 'some target');
    assert.equal(window.hit, 'value', 'Hit function was executed');
});

test('prevent-window-open: adg: reverse, regexp ', (assert) => {
    const params = {
        name,
        args: ['reverse', '/test/'],
        hit: () => {
            window.hit = 'value';
        },
    };
    const scriptlet = window.scriptlets.invoke(params);
    // run scriptlet code
    evalWrap(scriptlet);
    // check is scriptlet works
    window.open('some url', 'some target');
    assert.equal(window.hit, 'value', 'Hit function was executed');
});
