import {
    createLogFunction, createOnErrorHandler, randomId,
} from '../helpers';

/**
 * Aborts on property write (PopAds, popns), throws reference error with random id
 *
 * @param {Source} source
 */
export function preventPopadsNet(source) {
    const log = createLogFunction(source);
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
    log();
}

preventPopadsNet.names = [
    'prevent-popads-net',
    'popads.net.js',
];

preventPopadsNet.injections = [createOnErrorHandler, randomId, createLogFunction];
