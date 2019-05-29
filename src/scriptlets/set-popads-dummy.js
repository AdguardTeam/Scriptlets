/* eslint-disable no-console, func-names, no-multi-assign */
import { log } from '../helpers';

/**
 * Sets static properties PopAds and popns.
 *
 * @param {Source} source
 */
export function setPopadsDummy(source) {
    delete window.PopAds;
    delete window.popns;
    Object.defineProperties(window, {
        PopAds: {
            get: () => {
                log(source);
                return {};
            },
        },
        popns: {
            get: () => {
                log(source);
                return {};
            },
        },
    });
}

setPopadsDummy.names = [
    'set-popads-dummy',
    'popads-dummy.js',
];

setPopadsDummy.injections = [log];
