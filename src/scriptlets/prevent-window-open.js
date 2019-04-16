import { toRegExp, stringToFunc } from '../helpers/string-utils';

/**
 * Prevent calls `window.open` when URL match or not match with passed params
 * @param {Source} source
 * @param {number|string} [inverse] inverse matching
 * @param {string} [match] matching with URL
 */
export function preventWindowOpen(source, inverse = false, match) {
    const nativeOpen = window.open;
    const hit = stringToFunc(source.hit);

    inverse = inverse
        ? !(+inverse)
        : inverse;
    match = match
        ? toRegExp(match)
        : toRegExp('/.?/');

    // eslint-disable-next-line consistent-return
    const openWrapper = (str, ...args) => {
        if (inverse === match.test(str)) {
            return nativeOpen.apply(window, [str, ...args]);
        }
        hit();
    };
    window.open = openWrapper;
}

preventWindowOpen.names = [
    'prevent-window-open',
    'ubo-window.open-defuser.js',
];

preventWindowOpen.injections = [toRegExp, stringToFunc];
