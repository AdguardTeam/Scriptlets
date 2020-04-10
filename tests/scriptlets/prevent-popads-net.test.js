/* global sinon */
/* eslint-disable no-eval, no-underscore-dangle */

import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'prevent-popads-net';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
};

module(name, { beforeEach, afterEach });

const runScriptlet = (name) => {
    const params = {
        name,
        verbose: true,
    };
    const resultString = window.scriptlets.invoke(params);
    const evalWrapper = eval;
    evalWrapper(resultString);
};

test('ag and ubo aliases work', (assert) => {
    const stub = sinon.stub(Object, 'defineProperties').callsFake((obj, props) => props);
    runScriptlet(name);
    assert.ok(stub.calledOnce, 'Object.defineProperties called once');
    assert.ok(stub.calledWith(window), 'Object.defineProperties called with window object');

    runScriptlet('ubo-popads.net.js');
    assert.ok(stub.calledTwice, 'Object.defineProperties called twice');
    assert.ok(stub.calledWith(window), 'Object.defineProperties called with window object');

    assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');

    stub.restore();
});
