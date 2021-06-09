/* eslint-disable no-multi-assign, func-names, no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'prevent-fab-3.2.0';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', 'FuckAdBlock', 'BlockAdBlock', 'fuckAdBlock', 'blockAdBlock', '__debug');
};

module(name, { beforeEach, afterEach });

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

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-nofab.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('ag works', (assert) => {
    const agFuckAdBlock = 'agFuckAdBlock';
    createFuckAdBlockSample();
    assert.ok(window.fuckAdBlock.check());
    window.fuckAdBlock.onDetected(() => {
        window[agFuckAdBlock] = agFuckAdBlock;
    });
    assert.strictEqual(window[agFuckAdBlock], agFuckAdBlock, 'callback should apply');
    assert.notOk(window.fuckAdBlock.options);

    clearGlobalProps(agFuckAdBlock);
    runScriptlet(name);

    assert.notOk(window.fuckAdBlock.check(), 'should be undefined');
    window.fuckAdBlock.onDetected(() => {
        window[agFuckAdBlock] = agFuckAdBlock;
    });
    assert.strictEqual(window[agFuckAdBlock], undefined, 'callback should not be applied');
    assert.ok(window.fuckAdBlock.options);

    assert.strictEqual(window.hit, 'FIRED');
    clearGlobalProps(agFuckAdBlock);
});
