/* global QUnit */
/* eslint-disable no-eval */
const { test, module, testDone } = QUnit;
const name = 'nowebrtc';

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
