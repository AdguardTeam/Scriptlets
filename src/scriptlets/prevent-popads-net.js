import { createHitFunction, createOnErrorHandler, randomId, stringToFunc } from '../helpers';

/**
 * Aborts on property write (PopAds, popns), throws reference error with random id
 *
 * @param {Source} source
 */
export function preventPopadsNet(source) {
    const hit = createHitFunction(source.hit, source.ruleText);
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
    hit();
}

preventPopadsNet.names = [
    'prevent-popads-net',
    'popads.net.js',
];

preventPopadsNet.injections = [stringToFunc, createOnErrorHandler, randomId, createHitFunction];
