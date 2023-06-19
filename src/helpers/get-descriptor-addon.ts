import { randomId } from './random-id';

interface DescriptorAddon {
    isAbortingSuspended: boolean;
    isolateCallback: (cb: ArbitraryFunction, ...args: unknown[]) => void;
}

/**
 * Prevents infinite loops when trapping props that could be used by scriptlet's own helpers
 * Example: window.RegExp, that is used by matchStackTrace > toRegExp
 *
 * https://github.com/AdguardTeam/Scriptlets/issues/251
 * https://github.com/AdguardTeam/Scriptlets/issues/226
 * https://github.com/AdguardTeam/Scriptlets/issues/232
 *
 * @returns descriptor addon
 */
export function getDescriptorAddon(): DescriptorAddon {
    return {
        isAbortingSuspended: false,
        isolateCallback(cb, ...args) {
            this.isAbortingSuspended = true;
            // try...catch is required in case there are more than one inline scripts
            // which should be aborted,
            // so after the first successful abortion, `cb(...args);` will throw error,
            // and we should not stop on that and continue to abort other scripts
            try {
                const result = cb(...args);
                this.isAbortingSuspended = false;
                return result;
            } catch {
                const rid = randomId();
                this.isAbortingSuspended = false;
                // It's necessary to throw error
                // otherwise script will be not aborted
                throw new ReferenceError(rid);
            }
        },
    };
}
