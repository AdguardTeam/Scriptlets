/**
 * Returns a wrapper, passing the call to 'method' at maximum once per 'delay' milliseconds.
 * Those calls that fall into the "cooldown" period, are ignored
 * @param {Function} method
 * @param {Number} delay - milliseconds
 */
export const throttle = (cb, delay) => {
    let wait = false;
    let savedArgs;
    const wrapper = (...args) => {
        if (wait) {
            savedArgs = args;
            return;
        }

        cb(...args);
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
