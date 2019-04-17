/* global QUnit, sinon */
/* eslint-disable no-eval */

import { clearProperties } from './helpers';

const { test, module, testDone } = QUnit;
const name = 'prevent-popads-net';

module(name);

const hit = () => {
    window.hit = 'FIRED';
};

const runScriptlet = (name) => {
    const params = {
        name,
        hit,
    };
    const resultString = window.scriptlets.invoke(params);
    const evalWrapper = eval;
    evalWrapper(resultString);
};

testDone(() => {
    clearProperties('hit');
});

test('ag and ubo aliases work', (assert) => {
    const stub = sinon.stub(Object, 'defineProperties').callsFake((obj, props) => props);
    runScriptlet(name);
    assert.ok(stub.calledOnce, 'Object.defineProperties called once');
    assert.ok(stub.calledWith(window), 'Object.defineProperties called with window object');

    runScriptlet('popads.net.js');
    assert.ok(stub.calledTwice, 'Object.defineProperties called twice');
    assert.ok(stub.calledWith(window), 'Object.defineProperties called with window object');

    assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');

    stub.restore();
});
