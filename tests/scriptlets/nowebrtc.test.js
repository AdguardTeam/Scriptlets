/* eslint-disable no-underscore-dangle */

import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'nowebrtc';

const nativeConsole = console.log; // eslint-disable-line no-console

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    console.log = nativeConsole; // eslint-disable-line no-console
};

module(name, { beforeEach, afterEach });

const TEST_URL_VALUE = 'stun:35.66.206.188:443';
const testServerConfig = {
    urls: [TEST_URL_VALUE],
};
const testPeerConfig = {
    iceServers: [testServerConfig],
};

const isSupported = typeof window.RTCPeerConnection !== 'undefined';

if (!isSupported) {
    test('unsupported', (assert) => {
        assert.ok(true, 'Browser does not support it');
    });
} else {
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

        assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
    });

    test('RTCPeerConnection without config', (assert) => {
        runScriptlet(name);

        const localConnection = new RTCPeerConnection();
        const sendChannel = localConnection.createDataChannel('sendChannel');

        assert.strictEqual(window.hit, 'FIRED');
        assert.notOk(sendChannel);
    });

    test('RTCPeerConnection with config', (assert) => {
        runScriptlet(name);

        const testPeer = new RTCPeerConnection(testPeerConfig);
        const dataChannel = testPeer.createDataChannel('', {
            reliable: true,
        });
        testPeer.createOffer((arg) => {
            testPeer.setLocalDescription(arg);
        }, () => {});

        assert.strictEqual(window.hit, 'FIRED');
        assert.notOk(dataChannel);
    });

    test('log checking', (assert) => {
        // mock console.log function for log checking
        // eslint-disable-next-line no-console
        console.log = function log(input) {
            if (input.includes('trace')) {
                return;
            }

            const EXPECTED_LOG_STR = `${name}: Document tried to create an RTCPeerConnection: ${TEST_URL_VALUE}`;
            assert.ok(input.endsWith(EXPECTED_LOG_STR), 'console.hit input');
        };

        runScriptlet(name);

        // eslint-disable-next-line no-unused-vars
        const testPeer = new RTCPeerConnection(testPeerConfig);

        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
    });
}
