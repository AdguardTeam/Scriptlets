/* eslint-disable func-names, no-multi-assign */
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

export const setPopadsDummyNames = [
    'set-popads-dummy',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'popads-dummy.js',
    'ubo-popads-dummy.js',
    'ubo-popads-dummy',
];

// eslint-disable-next-line prefer-destructuring
setPopadsDummy.primaryName = setPopadsDummyNames[0];

setPopadsDummy.injections = [hit];
