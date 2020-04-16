/* eslint-disable no-eval, no-underscore-dangle */

import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'nowebrtc';

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
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

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-nowebrtc.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams.toString(), codeByUboParams.toString(), 'ubo name - ok');
});

test('does not allow to create webRTC', (assert) => {
    if (!window.RTCPeerConnection) {
        assert.ok(true, 'Browser does not support RTCPeerConnection');
        return;
    }

    runScriptlet(name);

    const localConnection = new RTCPeerConnection();
    const sendChannel = localConnection.createDataChannel('sendChannel');

    assert.strictEqual(window.hit, 'FIRED');
    assert.notOk(sendChannel);
});
