/* eslint-disable no-console, func-names, no-multi-assign */
import { createLogFunction } from '../helpers';

/**
 * Sets static properties PopAds and popns.
 *
 * @param {Source} source
 */
export function setPopadsDummy(source) {
    const log = createLogFunction(source);
    delete window.PopAds;
    delete window.popns;
    Object.defineProperties(window, {
        PopAds: {
            get: () => {
                log();
                return {};
            },
        },
        popns: {
            get: () => {
                log();
                return {};
            },
        },
    });
}

setPopadsDummy.names = [
    'set-popads-dummy',
    'popads-dummy.js',
];

setPopadsDummy.injections = [createLogFunction];
