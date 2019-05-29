/* global QUnit */
/* eslint-disable no-eval, no-underscore-dangle */

import { clearGlobalProps } from './helpers';

const { test, module } = QUnit;
const name = 'nowebrtc';

const beforeEach = () => {
    window.__debugScriptlets = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debugScriptlets');
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

test('ubo alias works', (assert) => {
    runScriptlet('ubo-nowebrtc.js');

    const localConnection = new RTCPeerConnection();

    const sendChannel = localConnection.createDataChannel('sendChannel');

    assert.strictEqual(window.hit, 'FIRED');
    assert.notOk(sendChannel);
});

test('does not allow to create webRTC', (assert) => {
    runScriptlet(name);

    const localConnection = new RTCPeerConnection();

    const sendChannel = localConnection.createDataChannel('sendChannel');

    assert.strictEqual(window.hit, 'FIRED');
    assert.notOk(sendChannel);
});
