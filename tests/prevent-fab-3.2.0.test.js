/* global QUnit */
/* eslint-disable no-eval, no-multi-assign, func-names, no-underscore-dangle */
import { clearGlobalProps } from './helpers';

const { test, module } = QUnit;
const name = 'prevent-fab-3.2.0';

const evalWrapper = eval;

const beforeEach = () => {
    window.__debugScriptlets = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', 'FuckAdBlock', 'BlockAdBlock', 'fuckAdBlock', 'blockAdBlock', '__debugScriptlets');
};

module(name, { beforeEach, afterEach });

const runScriptlet = (name) => {
    const params = {
        name,
        verbose: true,
    };
    const resultString = window.scriptlets.invoke(params);
    evalWrapper(resultString);
};

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


    clearGlobalProps(uboFuckAdBlock);
    runScriptlet('fuckadblock.js-3.2.0');

    assert.notOk(window.fuckAdBlock.check(), 'should be undefined');
    window.fuckAdBlock.onDetected(() => {
        window[uboFuckAdBlock] = uboFuckAdBlock;
    });
    assert.strictEqual(window[uboFuckAdBlock], undefined, 'callback should not be applied');

    assert.strictEqual(window.hit, 'FIRED');
    clearGlobalProps(uboFuckAdBlock);
});

test('ag alias works', (assert) => {
    const agFuckAdBlock = 'agFuckAdBlock';
    createFuckAdBlockSample();
    assert.ok(window.fuckAdBlock.check());
    window.fuckAdBlock.onDetected(() => {
        window[agFuckAdBlock] = agFuckAdBlock;
    });
    assert.strictEqual(window[agFuckAdBlock], agFuckAdBlock, 'callback should apply');


    clearGlobalProps(agFuckAdBlock);
    runScriptlet(name);

    assert.notOk(window.fuckAdBlock.check(), 'should be undefined');
    window.fuckAdBlock.onDetected(() => {
        window[agFuckAdBlock] = agFuckAdBlock;
    });
    assert.strictEqual(window[agFuckAdBlock], undefined, 'callback should not be applied');

    assert.strictEqual(window.hit, 'FIRED');
    clearGlobalProps(agFuckAdBlock);
});
