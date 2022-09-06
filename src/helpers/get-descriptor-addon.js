/**
 * Prevent infinite loops when trapping props that could be used by scriptlet's own helpers
 * Example: window.RegExp, that is used by matchStackTrace > toRegExp
 *
 * https://github.com/AdguardTeam/Scriptlets/issues/226
 * https://github.com/AdguardTeam/Scriptlets/issues/232
 *
 * @return {Object}
 */
export function getDescriptorAddon() {
    return {
        isAbortingSuspended: false,
        isolateCallback(cb, ...args) {
            this.isAbortingSuspended = true;
            const result = cb(...args);
            this.isAbortingSuspended = false;
            return result;
        },
    };
}
