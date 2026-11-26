/**
 * Calls a callback of the page, e.g. one registered with a mocked API of a redirect resource,
 * as the mocked library calls it, and catches its errors,
 * so that one failing callback does not stop the resource or the other callbacks.
 * A value which is not a function is ignored.
 *
 * It is called by its own `apply()`, as e.g. the Visitor API, AppMeasurement and the SDK of Sensors Analytics
 * call callbacks, so an `apply` which the page has set on the callback is used. A library which calls a callback
 * directly, e.g. `handler(event)` or `code.finish()`, is mocked by passing an arrow function which calls it so,
 * e.g. `runProtected(() => code.finish(), [])`.
 * Without `receiver`, `this` of the callback is `null` in strict code, as with `apply(null, args)` of e.g.
 * the Visitor API. A given `receiver` is passed as it is, also `undefined`,
 * e.g. a tracker whose method is called, or the receiver of a `[receiver, callback]` pair of the page.
 *
 * Nothing is returned, also if the callback returns a value, so that a mocked method which returns
 * the result of this function, e.g. `getUser: (callback) => runProtected(callback, [null])`,
 * returns nothing, as the library.
 *
 * @param callback Callback of the page.
 * @param args Arguments for the callback.
 * @param receiver Optional receiver of the call, i.e. `this` of the callback.
 */
export function runProtected(callback: unknown, args: unknown[], receiver?: unknown): void {
    if (typeof callback !== 'function') {
        return;
    }
    // not a default parameter, as it would replace `undefined` given as the receiver with `null`
    const thisArg = arguments.length > 2 ? receiver : null;
    try {
        // a spread call would need a Babel helper which is not in the built resources
        // eslint-disable-next-line prefer-spread
        callback.apply(thisArg, args);
    } catch (e) {
        // ignore errors of the page callback
    }
}
