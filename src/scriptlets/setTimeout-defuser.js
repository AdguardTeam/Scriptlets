/**
 * 
 * 
 * @param {Source} source
 * @param {string} match
 * @param {string} match
 */
function setTimeoutDefuser(source, match, delay) {
    let nativeTimeout = window.setTimeout;
    delay = parseInt(delay, 10);

    if (match === '') {
        match = '.?';
    } else if (match[0] === '/' && match[match.length - 1] === '/') {
        match = match.slice(1, -1);
    } else {
        match = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    match = new RegExp(match);
    window.setTimeout = function (a, b) {
        if ((isNaN(delay) || b == delay) && match.test(a.toString())) {
            return nativeTimeout(function () { }, b);
        }
        return nativeTimeout.apply(this, arguments);
    }.bind(window);
}

setTimeoutDefuser.names = [
    'setTimeout-defuser',
    'ubo-setTimeout-defuser.js',
];

export default setTimeoutDefuser;