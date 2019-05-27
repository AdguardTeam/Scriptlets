/* eslint-disable no-unused-vars, no-extra-bind, func-names */
import { createHitFunction, stringToFunc } from '../helpers';

/**
 * Disables WebRTC via blocking calls to the RTCPeerConnection()
 *
 * @param {Source} source
 */
export function nowebrtc(source) {
    const hit = createHitFunction(source);

    let propertyName = '';
    if (window.RTCPeerConnection) {
        propertyName = 'RTCPeerConnection';
    } else if (window.webkitRTCPeerConnection) {
        propertyName = 'webkitRTCPeerConnection';
    }

    if (propertyName === '') {
        return;
    }

    const rtcReplacement = (config) => {
        hit(`Document tried to create an RTCPeerConnection: ${config}`);
    };
    const noop = () => {};
    rtcReplacement.prototype = {
        close: noop,
        createDataChannel: noop,
        createOffer: noop,
        setRemoteDescription: noop,
    };
    const rtc = window[propertyName];
    window[propertyName] = rtcReplacement;
    if (rtc.prototype) {
        rtc.prototype.createDataChannel = function (a, b) {
            return {
                close: noop,
                send: noop,
            };
        }.bind(null);
    }
}

nowebrtc.names = [
    'nowebrtc',
    'ubo-nowebrtc.js',
];

nowebrtc.injections = [stringToFunc, createHitFunction];
