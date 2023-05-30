/* eslint-disable func-names */
import { hit, noopFunc } from '../helpers/index';

/**
 * @redirect gemius
 *
 * @description
 * Mocks Gemius Analytics.
 * https://flowplayer.com/developers/plugins/gemius
 *
 * ### Examples
 *
 * ```adblock
 * ||example.org/gplayer.js$script,redirect=gemius
 * ```
 *
 * @added v1.5.0.
 */
export function Gemius(source) {
    const GemiusPlayer = function () {};
    GemiusPlayer.prototype = {
        setVideoObject: noopFunc,
        newProgram: noopFunc,
        programEvent: noopFunc,
        newAd: noopFunc,
        adEvent: noopFunc,
    };

    window.GemiusPlayer = GemiusPlayer;

    hit(source);
}

Gemius.names = [
    'gemius',
];

Gemius.injections = [hit, noopFunc];
