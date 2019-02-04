
/**
 * Generate random six symbols id
 */
function randomId() {
    return Math.random().toString(36).substr(2, 9);
}
export default randomId;