/* eslint-disable no-console, func-names, no-multi-assign */
import { hit } from '../helpers';

/**
 * @scriptlet set-popads-dummy
 *
 * @description
 * Sets static properties PopAds and popns.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#popads-dummyjs-
 *
 * **Syntax**
 * ```
 * example.org#%#//scriptlet("set-popads-dummy")
 * ```
 */
export function setPopadsDummy(source) {
    delete window.PopAds;
    delete window.popns;
    Object.defineProperties(window, {
        PopAds: {
            get: () => {
                hit(source);
                return {};
            },
        },
        popns: {
            get: () => {
                hit(source);
                return {};
            },
        },
    });
}

setPopadsDummy.names = [
    'set-popads-dummy',
    'popads-dummy.js',
    'ubo-popads-dummy.js',
];

setPopadsDummy.injections = [hit];
