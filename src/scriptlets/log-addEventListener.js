/* eslint-disable no-new-func */

export function logAddEventListener(source) {
    const hit = source.hit
        ? new Function(source.hit)
        : () => {};
    const nativeConsole = console;
    const nativeLog = nativeConsole.log;
    const nativeAddEventListener = window.EventTarget.prototype.addEventListener;
    function addEventListenerWrapper(eventName, callback, ...args) {
        nativeLog.call(nativeConsole, `addEventListener("${eventName}", ${callback.toString()})`);
        hit();
        return nativeAddEventListener.apply(this, [eventName, callback, ...args]);
    }
    window.EventTarget.prototype.addEventListener = addEventListenerWrapper;
}

logAddEventListener.names = [
    'log-addEventListener',
    'addEventListener-logger.js',
];
