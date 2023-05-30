import {
    hit, createOnErrorHandler, randomId,
} from '../helpers/index';

/**
 * @scriptlet prevent-popads-net
 *
 * @description
 * Aborts on property write (PopAds, popns), throws reference error with random id.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#popadsnetjs-
 *
 * ### Syntax
 *
 * ```adblock
 * example.org#%#//scriptlet('prevent-popads-net')
 * ```
 *
 * @added v1.0.4.
 */
export function preventPopadsNet(source) {
    const rid = randomId();

    const throwError = () => {
        throw new ReferenceError(rid);
    };

    delete window.PopAds;
    delete window.popns;
    Object.defineProperties(window, {
        PopAds: { set: throwError },
        popns: { set: throwError },
    });

    window.onerror = createOnErrorHandler(rid).bind();
    hit(source);
}

preventPopadsNet.names = [
    'prevent-popads-net',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'popads.net.js',
    'ubo-popads.net.js',
    'ubo-popads.net',
];

preventPopadsNet.injections = [createOnErrorHandler, randomId, hit];
