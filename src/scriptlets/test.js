import log from '../snippets/log';

/**
 * Test function to check is scriptlet works
 * @param {string} args test arguments
 */
function test(...args) {
    log(args);
}
test.injections = [log];

export default test;