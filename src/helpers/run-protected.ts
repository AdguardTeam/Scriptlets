/**
 * Calls a callback of the page, e.g. one registered with a mocked API of a redirect resource,
 * without a receiver, as the mocked library calls it, and catches its errors,
 * so that one failing callback does not stop the resource or the other callbacks.
 * A value which is not a function is ignored.
 *
 * @param callback Callback of the page.
 * @param args Arguments for the callback.
 */
export function runProtected(callback: unknown, args: unknown[]): void {
    if (typeof callback !== 'function') {
        return;
    }
    try {
        // a spread call would need a Babel helper which is not in the built resources
        // eslint-disable-next-line prefer-spread
        callback.apply(null, args);
    } catch (e) {
        // ignore errors of the page callback
    }
}
