/* eslint-disable no-console, func-names, no-multi-assign */
import { hit, noopFunc, noopThis } from '../helpers';

/**
 * @scriptlet prevent-fab-3.2.0
 *
 * @description
 * Prevents execution of the FAB script v3.2.0.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#fuckadblockjs-320-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("prevent-fab-3.2.0")
 * ```
 */
export function preventFab(source) {
    hit(source);
    const Fab = function () {};
    Fab.prototype.check = noopFunc;
    Fab.prototype.clearEvent = noopFunc;
    Fab.prototype.emitEvent = noopFunc;
    Fab.prototype.on = function (a, b) {
        if (!a) {
            b();
        }
        return this;
    };
    Fab.prototype.onDetected = noopThis;
    Fab.prototype.onNotDetected = function (a) {
        a();
        return this;
    };
    Fab.prototype.setOption = noopFunc;
    window.FuckAdBlock = window.BlockAdBlock = Fab;
    //
    window.fuckAdBlock = window.blockAdBlock = new Fab();
}

preventFab.names = [
    'prevent-fab-3.2.0',
    'fuckadblock.js-3.2.0',
    'ubo-fuckadblock.js-3.2.0',
    'nofab.js',
    'ubo-nofab.js',
];

preventFab.injections = [hit, noopFunc, noopThis];
