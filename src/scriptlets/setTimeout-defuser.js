/**
 * Replace setTimeout with empty function execution
 * @param {Source} source
 * @param {string} match can be regexp string
 * @param {string|number} delay
 */
function setTimeoutDefuser(source, match, delay) {
    const nativeTimeout = window.setTimeout;
    delay = parseInt(delay, 10);
    delay = Number.isNaN(delay) ? null : delay;
    const isStringRegexp = s => s[0] === '/' && s[s.length - 1] === '/';
    const escapeChars = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (!match) {
        match = '.?';
    } else if (isStringRegexp(match)) {
        match = match.slice(1, -1);
    } else {
        match = escapeChars(match);
    }
    match = new RegExp(match);

    const timeoutWrapper = (cb, d, ...args) => {
        if ((!delay || d === delay) && match.test(cb.toString())) {
            if (source.hit) {
                source.hit();
            }
            return nativeTimeout(() => { }, d);
        }
        return nativeTimeout.apply(window, [cb, d, ...args]);
    };
    window.setTimeout = timeoutWrapper;
}

setTimeoutDefuser.names = [
    'setTimeout-defuser',
    'ubo-setTimeout-defuser.js',
];

export default setTimeoutDefuser;
