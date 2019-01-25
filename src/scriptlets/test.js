import log from '../helpers/log';

/**
 * Test function to check is scriptlet works
 * Log an array of passed arguments
 * @param {string} args test arguments
 */
function test(...args) {
    log(args);
}
test.sName = 'test';
test.injections = [log];

export default test;