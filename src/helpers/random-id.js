/**
 * Generate random seven symbols id
 */
export function randomId() {
    return Math.random().toString(36).slice(2, 9);
}
