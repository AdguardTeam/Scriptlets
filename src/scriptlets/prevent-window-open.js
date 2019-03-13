/* eslint-disable no-new-func */
import { toRegExp } from '../helpers/string-utils';

export function preventWindowOpen(source, inverse = false, match) {
    const nativeOpen = window.open;
    const hit = source.hit
        ? new Function(source.hit)
        : () => { };

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

preventWindowOpen.injections = [toRegExp];

export default preventWindowOpen;
