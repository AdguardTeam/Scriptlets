/* eslint-disable func-names */
import { hit, noopFunc } from '../helpers/index';

/**
 * @redirect gemius
 * @description
 * Mocks Gemius Analytics.
 * https://flowplayer.com/developers/plugins/gemius
 *
 * **Example**
 * ```
 * ||gapt.hit.gemius.pl/gplayer.js$script,redirect=gemius
 * ```
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
