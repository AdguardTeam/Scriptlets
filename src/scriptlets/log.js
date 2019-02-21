/**
 * Log an array of passed arguments
 * @param {string} args test arguments
 */
function log(...args) {
    console.log(args);
}
log.names = ['log'];

export default log;