/**
 * Validates event type
 *
 * @param type event type
 * @returns true if type is valid
 */
export const validateType = (type: unknown): boolean => {
    // https://github.com/AdguardTeam/Scriptlets/issues/125
    return typeof type !== 'undefined'
        // https://github.com/AdguardTeam/Scriptlets/issues/539
        && type !== null;
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
 * @param nativeToString native Function.prototype.toString method
 * @returns listener string
 */
export const listenerToString = (
    listener: EventListener | EventListenerObject,
    nativeToString: typeof Function.prototype.toString,
): string => {
    return typeof listener === 'function'
        // Using native toString() is required to fix issues
        // where websites redefine Function.prototype.toString
        // https://github.com/AdguardTeam/Scriptlets/issues/292
        ? nativeToString.call(listener)
        : nativeToString.call(listener.handleEvent);
};
