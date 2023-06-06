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

/**
 * Returns the list of added nodes from the list of mutations
 *
 * @param {MutationRecord[]} mutations list of mutations
 * @returns {Node[]} list of added nodes
 */
export const getAddedNodes = (mutations) => {
    const nodes = [];
    for (let i = 0; i < mutations.length; i += 1) {
        const { addedNodes } = mutations[i];
        for (let j = 0; j < addedNodes.length; j += 1) {
            nodes.push(addedNodes[j]);
        }
    }
    return nodes;
};

/**
 * Creates and runs a MutationObserver on the document element with optional
 * throttling and disconnect timeout.
 *
 * @param {Function} callback MutationObserver callback
 * @param {Object} options MutationObserver options
 * @param {number|null} timeout Disconnect timeout in ms
 */
export const observeDocumentWithTimeout = (callback, options, timeout = 10000) => {
    const observer = new MutationObserver((mutations, observer) => {
        observer.disconnect();
        callback(mutations);
        observer.observe(document.documentElement, options);
    });
    observer.observe(document.documentElement, options);

    if (typeof timeout === 'number') {
        setTimeout(() => observer.disconnect(), timeout);
    }
};
