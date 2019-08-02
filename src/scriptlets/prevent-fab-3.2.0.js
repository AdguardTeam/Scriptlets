/* eslint-disable no-console, func-names, no-multi-assign */
import { noop, hit } from '../helpers';

/**
 * Fuckadblock 3.2.0 defuser
 *
 * @param {Source} source
 */
export function preventFab(source) {
    hit(source);
    const Fab = function () {};
    Fab.prototype.check = noop;
    Fab.prototype.clearEvent = noop;
    Fab.prototype.emitEvent = noop;
    Fab.prototype.on = function (a, b) {
        if (!a) {
            b();
        }
        return this;
    };
    Fab.prototype.onDetected = function () {
        return this;
    };
    Fab.prototype.onNotDetected = function (a) {
        a();
        return this;
    };
    Fab.prototype.setOption = noop;
    window.FuckAdBlock = window.BlockAdBlock = Fab;
    //
    window.fuckAdBlock = window.blockAdBlock = new Fab();
}

preventFab.names = [
    'prevent-fab-3.2.0',
    'ubo-fuckadblock.js-3.2.0',
];

preventFab.injections = [noop, hit];
