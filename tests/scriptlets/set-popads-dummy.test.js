/* global sinon */
/* eslint-disable no-eval, no-underscore-dangle */

import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'set-popads-dummy';
const popAdsProp = 'PopAds';
const popnsProp = 'popns';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug', popAdsProp, popnsProp);
};
module(name, { beforeEach, afterEach });

const evalWrapper = eval;

const runScriptlet = (name) => {
    const params = {
        name,
        verbose: true,
    };
    const resultString = window.scriptlets.invoke(params);
    evalWrapper(resultString);
};

const fillPopAdsWithValues = () => {
    window[popAdsProp] = popAdsProp;
    window[popnsProp] = popnsProp;
};

const isEmpty = (obj) => Object.keys(obj).length === 0 && obj.constructor === Object;

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-popads-dummy.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('works', (assert) => {
    fillPopAdsWithValues();
    assert.strictEqual(window[popAdsProp], popAdsProp);
    assert.strictEqual(window[popnsProp], popnsProp);
    runScriptlet(name);
    assert.ok(isEmpty(window[popAdsProp]), 'should be empty');
    assert.ok(isEmpty(window[popnsProp]), 'should be empty');
    assert.strictEqual(window.hit, 'FIRED');
});

test('ag works', (assert) => {
    const stub = sinon.stub(Object, 'defineProperties').callsFake((obj, props) => props);
    runScriptlet(name);

    assert.ok(stub.calledOnce, 'Object.defineProperties called once');
    assert.ok(stub.calledWith(window), 'Object.defineProperties called with window object');

    stub.restore();
});
