/* eslint-disable no-console, func-names, no-multi-assign */
import { stringToFunc } from '../helpers';

/**
 * Set static properties to PopAds and popns
 *
 * @param {Source} source
 */
export function setPopadsDummy(source) {
    const hit = stringToFunc(source.hit);
    delete window.PopAds;
    delete window.popns;
    Object.defineProperties(window, {
        PopAds: { value: {} },
        popns: { value: {} },
    });
    hit();
}

setPopadsDummy.names = [
    'set-popads-dummy',
    'popads-dummy.js',
];

setPopadsDummy.injections = [stringToFunc];
