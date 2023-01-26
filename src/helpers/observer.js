import { throttle } from './throttle';

/**
 * DOM tree changes observer. Used for 'remove-attr' and 'remove-class' scriptlets
 *
 * @param {Function} callback function to call on each mutation
 * @param {boolean} [observeAttrs] if observer should observe attributes changes
 * @param {Array} [attrsToObserve] list of attributes to observe
 */
export const observeDOMChanges = (callback, observeAttrs = false, attrsToObserve = []) => {
    /**
     * 'delay' in milliseconds for 'throttle' method
     */
    const THROTTLE_DELAY_MS = 20;
    /**
     * Used for remove-class
     */
    // eslint-disable-next-line no-use-before-define
    const observer = new MutationObserver(throttle(callbackWrapper, THROTTLE_DELAY_MS));

    const connect = () => {
        if (attrsToObserve.length > 0) {
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributes: observeAttrs,
                attributeFilter: attrsToObserve,
            });
        } else {
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributes: observeAttrs,
            });
        }
    };
    const disconnect = () => {
        observer.disconnect();
    };

    /**
     * Callback wrapper to prevent loops
     * when callback tinkers with attributes
     */
    function callbackWrapper() {
        disconnect();
        callback();
        connect();
    }

    connect();
};
