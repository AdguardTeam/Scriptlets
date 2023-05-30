/* eslint-disable func-names, no-multi-assign */
import { hit } from '../helpers/index';

/**
 * @scriptlet set-popads-dummy
 *
 * @description
 * Sets static properties PopAds and popns.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#popads-dummyjs-
 *
 * ### Syntax
 *
 * ```adblock
 * example.org#%#//scriptlet('set-popads-dummy')
 * ```
 *
 * @added v1.0.4.
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
    // aliases are needed for matching the related scriptlet converted into our syntax
    'popads-dummy.js',
    'ubo-popads-dummy.js',
    'ubo-popads-dummy',
];

setPopadsDummy.injections = [hit];
