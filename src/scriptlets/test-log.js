import log from '../helpers/log';

/**
 * Test function to check is scriptlet works
 * Log an array of passed arguments
 * @param {string} args test arguments
 */
function testLog(...args) {
    log(args);
}
testLog.sName = 'test';
testLog.injections = [log];

export default testLog;