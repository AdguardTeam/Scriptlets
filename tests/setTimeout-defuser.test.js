/* global QUnit */
/* eslint-disable no-eval */
const {
    test,
    module,
    moduleStart,
    testDone,
} = QUnit;
const name = 'setTimeout-defuser';

let nativeSetTimeout;
moduleStart(() => {
    nativeSetTimeout = window.setTimeout;
});

testDone(() => {
    window.setTimeout = nativeSetTimeout;
});

module(name);
test('setTimeout-defuser: adg no args', (assert) => {
    const params = { name, args: [] };
    const scriptlet = window.scriptlets.invoke(params);
    const done = assert.async();

    window.aaa = 'value';
    // We need to run our assertation after all timeouts
    setTimeout(() => {
        assert.equal(window.aaa, 'value', 'Target property not changed');
        done();
    }, 20);
    // run scriptlet code
    eval(scriptlet);
    // check is scriptlet works
    setTimeout(() => { window.aaa = 'new value'; });
});

test('setTimeout-defuser: ubo alias no args', (assert) => {
    const params = { name: `ubo-${name}.js`, args: [] };
    const scriptlet = window.scriptlets.invoke(params);
    const done = assert.async();

    window.aaa = 'value';
    // We need to run our assertation after all timeouts
    setTimeout(() => {
        assert.equal(window.aaa, 'value', 'Target property not changed');
        done();
    }, 20);
    // run scriptlet code
    eval(scriptlet);
    // check is scriptlet works
    setTimeout(() => { window.aaa = 'new value'; });
});

test('setTimeout-defuser: adg by timeout name', (assert) => {
    const params = { name, args: ['test'] };
    const scriptlet = window.scriptlets.invoke(params);
    const done = assert.async();

    window.bbb = 'value';
    window.ddd = 'value';
    // We need to run our assertation after all timeouts
    setTimeout(() => {
        assert.equal(window.bbb, 'value', 'Target Target property not changed');
        assert.equal(window.ddd, 'new value', 'Another property should successfully changed by another timeout');
        done();
    }, 20);

    // run scriptlet code
    eval(scriptlet);
    // check is scriptlet works
    const test = () => { window.bbb = 'new value'; };
    setTimeout(test);

    // check is scriptlet doesn't affect on others timeouts
    const anotherTimeout = () => { window.ddd = 'new value'; };
    setTimeout(anotherTimeout);
});
