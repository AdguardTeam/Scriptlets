/* global QUnit */
/* eslint-disable no-eval, no-underscore-dangle */
const { test, module, testDone } = QUnit;
const name = 'prevent-bab';

module(name);

const evalWrapper = eval;


const hit = () => {
    window.hit = 'FIRED';
};

const runScriptlet = (name) => {
    const params = {
        name,
        hit,
    };
    const resultString = window.scriptlets.invoke(params);
    evalWrapper(resultString);
};

const clearProperties = (...props) => {
    props.forEach((prop) => {
        delete window[prop];
    });
};

testDone(() => {
    clearProperties('hit');
});

test('ubo alias works', (assert) => {
    runScriptlet('ubo-bab-defuser.js');

    const evalProp = 'evalProp';

    eval(`function test() { const temp = 'blockadblock'; window.${evalProp} = 'test';}`);

    assert.strictEqual(window[evalProp], undefined);
    assert.strictEqual(window.hit, 'FIRED');
    clearProperties(evalProp);
});

test('works eval with AdblockBlock', (assert) => {
    runScriptlet('prevent-bab');

    const evalProp = 'evalProp';

    eval(`function test() { const temp = 'babasbm'; window.${evalProp} = 'test';}`);

    assert.strictEqual(window[evalProp], undefined);
    assert.strictEqual(window.hit, 'FIRED');
    clearProperties(evalProp);
});

test('prevents set timeout with AdblockBlock', (assert) => {
    runScriptlet('prevent-bab');
    const timeoutProp = 'timeoutProp';
    const func = `(function test(id) {window.${timeoutProp} = 'test'})(test.bab_elementid)`;
    setTimeout(func);

    const done = assert.async();

    setTimeout(() => {
        assert.strictEqual(window.hit, 'FIRED');
        assert.strictEqual(window[timeoutProp], undefined);
        clearProperties(timeoutProp);
        done();
    }, 20);
});
