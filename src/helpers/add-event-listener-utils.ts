/**
 * Validates event type
 *
 * @param type event type
 * @returns true if type is valid
 */
export const validateType = (type: unknown): boolean => {
    // https://github.com/AdguardTeam/Scriptlets/issues/125
    return typeof type !== 'undefined';
};

/**
 * Validates event listener
 *
 * @param listener event listener
 * @returns true if listener callback is valid
 */
export const validateListener = (listener: unknown): boolean => {
    // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#parameters
    return typeof listener !== 'undefined'
        && (typeof listener === 'function'
            || (typeof listener === 'object'
                // https://github.com/AdguardTeam/Scriptlets/issues/76
                && listener !== null
                && 'handleEvent' in listener
                && typeof listener.handleEvent === 'function'));
};

/**
 * Serialize valid event listener
 * https://developer.mozilla.org/en-US/docs/Web/API/EventListener
 *
 * @param listener valid listener
 * @returns listener string
 */
export const listenerToString = (listener: EventListener | EventListenerObject): string => {
    return typeof listener === 'function'
        ? listener.toString()
        : listener.handleEvent.toString();
};
