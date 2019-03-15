/* global QUnit */
/* eslint-disable no-eval */
const {
    test,
    module,
    moduleStart,
    testDone,
} = QUnit;
const name = 'prevent-setInterval';

// copy eval to prevent rollup warnings
const evalWrap = eval;

let nativeSetInterval;
moduleStart(() => {
    nativeSetInterval = window.setInterval;
});

testDone(() => {
    window.setInterval = nativeSetInterval;
    delete window.hit;
    delete window.aaa;
});

module(name);
test('prevent-setTimeout: adg no args', (assert) => {
    const params = {
        name,
        args: [],
        hit: () => {
            window.hit = 'value';
        },
    };
    const scriptlet = window.scriptlets.invoke(params);
    const done = assert.async();

    window.aaa = 'value';
    // We need to run our assertation after all timeouts
    setTimeout(() => {
        assert.equal(window.aaa, 'value', 'Target property not changed');
        assert.equal(window.hit, 'value', 'Hit function was executed');
        done();
    }, 20);
    // run scriptlet code
    evalWrap(scriptlet);
    // check is scriptlet works
    setInterval(() => { window.aaa = 'new value'; });
});

test('prevent-setTimeout: ubo alias no args', (assert) => {
    const params = {
        name: 'ubo-setInterval-defuser.js',
        args: [],
        hit: () => {
            window.hit = 'value';
        },
    };
    const scriptlet = window.scriptlets.invoke(params);
    const done = assert.async();

    window.aaa = 'value';
    // We need to run our assertation after all timeouts
    setTimeout(() => {
        assert.equal(window.aaa, 'value', 'Target property not changed');
        assert.equal(window.hit, 'value', 'Hit function was executed');
        done();
    }, 20);
    // run scriptlet code
    evalWrap(scriptlet);
    // check is scriptlet works
    setInterval(() => { window.aaa = 'new value'; });
});

test('prevent-setTimeout: adg by timeout name', (assert) => {
    const params = {
        name,
        args: ['test', '500'],
        hit: () => {
            window.hit = 'value';
        },
    };
    const scriptlet = window.scriptlets.invoke(params);
    const done = assert.async();

    window.bbb = 'value';
    window.ddd = 'value';
    // We need to run our assertation after all timeouts
    setTimeout(() => {
        assert.equal(window.bbb, 'value', 'Target Target property not changed');
        assert.equal(window.ddd, 'new value', 'Another property should successfully changed by another timeout');
        assert.equal(window.hit, 'value', 'Hit function was executed');
        done();
    }, 20);

    // run scriptlet code
    evalWrap(scriptlet);
    // check is scriptlet works
    const test = () => { window.bbb = 'new value'; };
    setInterval(test, 500);

    // check is scriptlet doesn't affect on others timeouts
    const anotherTimeout = () => { window.ddd = 'new value'; };
    setInterval(anotherTimeout);
});
