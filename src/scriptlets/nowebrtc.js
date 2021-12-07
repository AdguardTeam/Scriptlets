/* eslint-disable no-unused-vars, no-extra-bind, func-names */
import {
    hit,
    noopFunc,
    convertRtcConfigToString,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet nowebrtc
 *
 * @description
 * Disables WebRTC by overriding `RTCPeerConnection`. The overridden function will log every attempt to create a new connection.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#nowebrtcjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet('nowebrtc')
 * ```
 */
/* eslint-enable max-len */
export function nowebrtc(source) {
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
        hit(source, `Document tried to create an RTCPeerConnection: ${convertRtcConfigToString(config)}`);
    };
    rtcReplacement.prototype = {
        close: noopFunc,
        createDataChannel: noopFunc,
        createOffer: noopFunc,
        setRemoteDescription: noopFunc,
    };
    const rtc = window[propertyName];
    window[propertyName] = rtcReplacement;
    if (rtc.prototype) {
        rtc.prototype.createDataChannel = function (a, b) {
            return {
                close: noopFunc,
                send: noopFunc,
            };
        }.bind(null);
    }
}

nowebrtc.names = [
    'nowebrtc',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'nowebrtc.js',
    'ubo-nowebrtc.js',
    'ubo-nowebrtc',
];

nowebrtc.injections = [
    hit,
    noopFunc,
    convertRtcConfigToString,
];
