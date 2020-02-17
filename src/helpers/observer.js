/**
 * DOM tree changes observer. Used for 'remove-attr' and 'remove-class' scriptlets
 * @param {Function} callback
 * @param {Boolean} observeAttrs - optional parameter - should observer check attibutes changes
 */
export const observeDOMChanges = (callback, observeClasses = false) => {
    /**
     * Returns a wrapper, passing the call to 'method' at maximum once per 'delay' milliseconds.
     * Those calls that fall into the "cooldown" period, are ignored
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
    /**
     * Used for remove-class
     */
    const CLASS_ATTR_NAME = ['class'];
    // eslint-disable-next-line no-use-before-define
    const observer = new MutationObserver(throttle(callbackWrapper, THROTTLE_DELAY_MS));

    const connect = () => {
        if (observeClasses) {
            observer.observe(document.documentElement, {
                subtree: true,
                attributes: true,
                attributeFilter: CLASS_ATTR_NAME,
            });
        } else {
            observer.observe(document.documentElement, {
                subtree: true,
                attributes: true,
            });
        }
    };
    const disconnect = () => {
        observer.disconnect();
    };
    function callbackWrapper() {
        disconnect();
        callback();
        connect();
    }

    connect();
};
