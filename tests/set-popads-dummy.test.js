/* global QUnit, sinon */
/* eslint-disable no-eval */

import { clearProperties } from './helpers';

const { test, module, testDone } = QUnit;
const name = 'set-popads-dummy';

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

const popAdsProp = 'PopAds';
const popnsProp = 'popns';

testDone(() => {
    clearProperties('hit', popAdsProp, popnsProp);
});

const fillPopAdsWithValues = () => {
    window[popAdsProp] = popAdsProp;
    window[popnsProp] = popnsProp;
};

const isEmpty = obj => Object.keys(obj).length === 0 && obj.constructor === Object;

test('works', (assert) => {
    fillPopAdsWithValues();
    assert.strictEqual(window[popAdsProp], popAdsProp);
    assert.strictEqual(window[popnsProp], popnsProp);
    runScriptlet(name);
    assert.ok(isEmpty(window[popAdsProp]), 'should be empty');
    assert.ok(isEmpty(window[popnsProp]), 'should be empty');
    assert.strictEqual(window.hit, 'FIRED');
});

test('ag and ubo aliases work', (assert) => {
    const stub = sinon.stub(Object, 'defineProperties').callsFake((obj, props) => props);
    runScriptlet(name);
    assert.ok(stub.calledOnce, 'Object.defineProperties called once');
    assert.ok(stub.calledWith(window), 'Object.defineProperties called with window object');

    runScriptlet('popads-dummy.js');
    assert.ok(stub.calledTwice, 'Object.defineProperties called twice');
    assert.ok(stub.calledWith(window), 'Object.defineProperties called with window object');

    stub.restore();
});
