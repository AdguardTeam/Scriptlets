/* eslint-disable func-names, no-multi-assign */
import { hit, noopFunc, noopThis } from '../helpers/index';

/**
 * @scriptlet prevent-fab-3.2.0
 *
 * @description
 * Prevents execution of the FAB script v3.2.0.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#fuckadblockjs-320-
 *
 * ### Syntax
 *
 * ```adblock
 * example.org#%#//scriptlet('prevent-fab-3.2.0')
 * ```
 *
 * @added v1.0.4.
 */
export function preventFab(source) {
    hit(source);

    // redefines Fab function for adblock detection
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
    Fab.prototype.options = {
        set: noopFunc,
        get: noopFunc,
    };

    const fab = new Fab();
    const getSetFab = {
        get() { return Fab; },
        set() {},
    };
    const getsetfab = {
        get() { return fab; },
        set() {},
    };

    // redefined Fab data properties which if 'FuckAdBlock' variable exists
    if (Object.prototype.hasOwnProperty.call(window, 'FuckAdBlock')) {
        window.FuckAdBlock = Fab;
    } else {
        // or redefined Fab accessor properties
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
    // aliases are needed for matching the related scriptlet converted into our syntax
    'nofab.js',
    'ubo-nofab.js',
    'fuckadblock.js-3.2.0',
    'ubo-fuckadblock.js-3.2.0',
    'ubo-nofab',
];

preventFab.injections = [hit, noopFunc, noopThis];
