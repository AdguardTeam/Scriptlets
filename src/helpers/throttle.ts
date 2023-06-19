/**
 * Returns a wrapper, passing the call to 'method' at maximum once per 'delay' milliseconds.
 * Those calls that fall into the "cooldown" period, are ignored
 *
 * @param cb callback
 * @param delay - milliseconds
 * @returns throttled callback
 */
export const throttle = (
    cb: ArbitraryFunction,
    delay: number,
): (...params: unknown[]) => void => {
    let wait = false;
    let savedArgs: unknown[] | null;
    const wrapper = (...args: unknown[]) => {
        if (wait) {
            savedArgs = args;
            return;
        }

        cb(...args);
        wait = true;

        setTimeout(() => {
            wait = false;
            if (savedArgs) {
                // "savedArgs" might contains few arguments, so it's necessary to use spread operator
                // https://github.com/AdguardTeam/Scriptlets/issues/284#issuecomment-1419464354
                wrapper(...savedArgs);
                savedArgs = null;
            }
        }, delay);
    };
    return wrapper;
};
