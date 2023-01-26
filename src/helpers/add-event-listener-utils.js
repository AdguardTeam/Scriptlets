/**
 * Validates event type
 *
 * @param {any} type event type
 * @returns {boolean} if type is valid
 */
export const validateType = (type) => {
    // https://github.com/AdguardTeam/Scriptlets/issues/125
    return typeof type !== 'undefined';
};

/**
 * Validates event listener
 *
 * @param {any} listener event listener
 * @returns {boolean} if listener callback is valid
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
 * @typedef {object|Function|null} EventListener
 */

/**
 * Serialize valid event listener
 * https://developer.mozilla.org/en-US/docs/Web/API/EventListener
 *
 * @param {EventListener} listener valid listener
 * @returns {string} listener string
 */
export const listenerToString = (listener) => {
    return typeof listener === 'function'
        ? listener.toString()
        : listener.handleEvent.toString();
};
