export const throttle = (method, delay) => {
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
