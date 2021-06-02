/**
 * Validates event type
 * @param {*} type
 * @returns {boolean}
 */
export const validateType = (type) => {
    // https://github.com/AdguardTeam/Scriptlets/issues/125
    return typeof type !== 'undefined';
};

/**
 * Validates event listener
 * @param {*} listener
 * @returns {boolean}
 */
export const validateListener = (listener) => {
    // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#parameters
    return typeof listener !== 'undefined'
        && (typeof listener === 'function'
            || (typeof listener === 'object'
                // https://github.com/AdguardTeam/Scriptlets/issues/76
                && listener !== null
                && typeof listener.handleEvent === 'function'));
};

/**
 * Serialize valid event listener
 * https://developer.mozilla.org/en-US/docs/Web/API/EventListener
 * @param {EventListener} listener valid listener
 * @returns {string}
 */
export const listenerToString = (listener) => {
    return typeof listener === 'function'
        ? listener.toString()
        : listener.handleEvent.toString();
};
