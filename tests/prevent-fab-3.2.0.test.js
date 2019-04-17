/* global QUnit */
/* eslint-disable no-eval, no-multi-assign, func-names */
import { clearProperties } from './helpers';

const { test, module, testDone } = QUnit;
const name = 'prevent-fab-3.2.0';

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

testDone(() => {
    clearProperties('hit', 'FuckAdBlock', 'BlockAdBlock', 'fuckAdBlock', 'blockAdBlock');
});

const createFuckAdBlockSample = () => {
    function FuckAdBlock() {}
    FuckAdBlock.prototype.onDetected = function (fn) {
        fn();
        return this;
    };
    FuckAdBlock.prototype.check = function () {
        return 'true';
    };
    window.FuckAdBlock = window.BlockAdBlock = FuckAdBlock;
    window.fuckAdBlock = window.blockAdBlock = new FuckAdBlock();
};

test('ubo alias works', (assert) => {
    const uboFuckAdBlock = 'uboFuckAdBlock';
    createFuckAdBlockSample();
    assert.ok(window.fuckAdBlock.check());
    window.fuckAdBlock.onDetected(() => {
        window[uboFuckAdBlock] = uboFuckAdBlock;
    });
    assert.strictEqual(window[uboFuckAdBlock], uboFuckAdBlock, 'callback should apply');


    clearProperties(uboFuckAdBlock);
    runScriptlet('fuckadblock.js-3.2.0');

    assert.notOk(window.fuckAdBlock.check(), 'should be undefined');
    window.fuckAdBlock.onDetected(() => {
        window[uboFuckAdBlock] = uboFuckAdBlock;
    });
    assert.strictEqual(window[uboFuckAdBlock], undefined, 'callback should not be applied');

    assert.strictEqual(window.hit, 'FIRED');
    clearProperties(uboFuckAdBlock);
});

test('ag alias works', (assert) => {
    const agFuckAdBlock = 'agFuckAdBlock';
    createFuckAdBlockSample();
    assert.ok(window.fuckAdBlock.check());
    window.fuckAdBlock.onDetected(() => {
        window[agFuckAdBlock] = agFuckAdBlock;
    });
    assert.strictEqual(window[agFuckAdBlock], agFuckAdBlock, 'callback should apply');


    clearProperties(agFuckAdBlock);
    runScriptlet(name);

    assert.notOk(window.fuckAdBlock.check(), 'should be undefined');
    window.fuckAdBlock.onDetected(() => {
        window[agFuckAdBlock] = agFuckAdBlock;
    });
    assert.strictEqual(window[agFuckAdBlock], undefined, 'callback should not be applied');

    assert.strictEqual(window.hit, 'FIRED');
    clearProperties(agFuckAdBlock);
});
