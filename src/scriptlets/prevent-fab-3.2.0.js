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
 * example.org#%#//scriptlet('prevent-fab-3.2.0')
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

    const fab = new Fab();
    const getSetFab = {
        get() { return Fab; },
        set() {},
    };
    const getsetfab = {
        get() { return fab; },
        set() {},
    };

    if (Object.prototype.hasOwnProperty.call(window, 'FuckAdBlock')) {
        window.FuckAdBlock = Fab;
    } else {
        Object.defineProperty(window, 'FuckAdBlock', getSetFab);
    }
    if (Object.prototype.hasOwnProperty.call(window, 'BlockAdBlock')) {
        window.BlockAdBlock = Fab;
    } else {
        Object.defineProperty(window, 'BlockAdBlock', getSetFab);
    }
    if (Object.prototype.hasOwnProperty.call(window, 'SniffAdBlock')) {
        window.SniffAdBlock = Fab;
    } else {
        Object.defineProperty(window, 'SniffAdBlock', getSetFab);
    }

    if (Object.prototype.hasOwnProperty.call(window, 'fuckAdBlock')) {
        window.fuckAdBlock = fab;
    } else {
        Object.defineProperty(window, 'fuckAdBlock', getsetfab);
    }
    if (Object.prototype.hasOwnProperty.call(window, 'blockAdBlock')) {
        window.blockAdBlock = fab;
    } else {
        Object.defineProperty(window, 'blockAdBlock', getsetfab);
    }
    if (Object.prototype.hasOwnProperty.call(window, 'sniffAdBlock')) {
        window.sniffAdBlock = fab;
    } else {
        Object.defineProperty(window, 'sniffAdBlock', getsetfab);
    }
}

preventFab.names = [
    'prevent-fab-3.2.0',
    'nofab.js',
    'ubo-nofab.js',
    'fuckadblock.js-3.2.0',
    'ubo-fuckadblock.js-3.2.0',
];

preventFab.injections = [hit, noopFunc, noopThis];
