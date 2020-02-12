/**
 * DOM tree changes observer. Used for 'remove-attr' and 'remove-class' scriptlets
 * @param {Function} callback
 * @param {Boolean} observeAttrs - optional parameter - should observer check attibutes changes
 */
export const observeDOMChanges = (callback, observeAttrs = false) => {
    /**
     * Returns a wrapper, passing the call to 'method' at maximum once per 'delay' milliseconds.
     * Those calls that fall into the “cooldown” period, are ignored
     * @param {Function} method
     * @param {Number} delay - milliseconds
     */
    const throttle = (method, delay) => {
        let wait = false;
        let savedArgs;

        const wrapper = (...args) => {
            if (wait) {
                savedArgs = args;
                return;
            }

            method(...args);
            wait = true;

            setTimeout(() => {
                wait = false;
                if (savedArgs) {
                    wrapper(savedArgs);
                    savedArgs = null;
                }
            }, delay);
        };

        return wrapper;
    };

    /**
     * 'delay' in milliseconds for 'throttle' method
     */
    const THROTTLE_DELAY_MS = 20;

    const observer = new MutationObserver(throttle(callback, THROTTLE_DELAY_MS));

    const defaultObserveProps = {
        childList: true,
        subtree: true,
    };
    const observeAttrsProps = {
        childList: true,
        subtree: true,
        attributes: true,
    };

    let finalProps;

    if (observeAttrs) {
        finalProps = observeAttrsProps;
    } else {
        finalProps = defaultObserveProps;
    }

    observer.observe(document.documentElement, finalProps);

    if (document.readyState === 'complete') {
        observer.disconnect();
    }
};
