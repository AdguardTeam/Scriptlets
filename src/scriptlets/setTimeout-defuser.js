/**
 * 
 * @param {Source} source
 * @param {string} match
 * @param {string} match
 */
function setTimeoutDefuser(source, match, delay) {
    const nativeTimeout = window.setTimeout;
    delay = parseInt(delay, 10);
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

    const timeoutWrapper = function (cb, d) {
        return (isNaN(delay) || d === delay) && match.test(cb.toString())
            ? nativeTimeout(() => { }, d)
            : nativeTimeout.apply(window, arguments)
    };

    window.setTimeout = timeoutWrapper;
}

setTimeoutDefuser.names = [
    'setTimeout-defuser',
    'ubo-setTimeout-defuser.js',
];

export default setTimeoutDefuser;
