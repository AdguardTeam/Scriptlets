/* eslint-disable no-new-func, no-unused-vars, no-extra-bind, no-console, func-names */

/**
 * Disables WebRTC via blocking calls to the RTCPeerConnection()
 *
 * @param {Source} source
 */
export function nowebrtc(source) {
    const hit = source.hit
        ? new Function(source.hit)
        : () => {};

    let propertyName = '';
    if (window.RTCPeerConnection) {
        propertyName = 'RTCPeerConnection';
    } else if (window.webkitRTCPeerConnection) {
        propertyName = 'webkitRTCPeerConnection';
    }

    if (propertyName === '') {
        return;
    }

    const log = console.log.bind(console);
    const rtcReplacement = (config) => {
        hit();
        log('Document tried to create an RTCPeerConnection: %o', config);
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
