/**
 * Generate random seven symbols id
 *
 * @returns randomized id
 */
export function randomId(): string {
    return Math.random().toString(36).slice(2, 9);
}

/**
 * Returns a random UUID of version 4, e.g. `3b241101-e2bb-4255-8caf-4136c566a962`, for ids which mocked libraries
 * generate, e.g. the id of an auction of Prebid.js or a token of a listener of Optimizely, so that a page
 * which uses or checks them gets the same kind of value as from the library.
 *
 * As the libraries, `crypto.randomUUID()` is used if it is available, i.e. in a secure context, as by
 * `generateUUID()` of Prebid.js, and otherwise 16 random bytes of `crypto.getRandomValues()`, which is available
 * also on `http:` pages, as by `generate()` of the Optimizely client, with the bits of the version, `4`,
 * and of the variant, `10`. `Math.random()` is used only if neither is available or works,
 * e.g. if the page has replaced them with functions which throw, as the ids are not secret.
 *
 * @returns Random UUID.
 */
export function randomUuid(): string {
    try {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }
    } catch (e) {
        // e.g. `randomUUID()` replaced by the page with a function which throws
    }
    const bytes = new Uint8Array(16);
    try {
        window.crypto.getRandomValues(bytes);
    } catch (e) {
        for (let i = 0; i < bytes.length; i += 1) {
            bytes[i] = Math.floor(Math.random() * 256);
        }
    }
    // version 4, i.e. `0100` in the highest bits of the 7th byte
    // eslint-disable-next-line no-bitwise
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    // variant `10` in the highest bits of the 9th byte
    // eslint-disable-next-line no-bitwise
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    let hex = '';
    for (let i = 0; i < bytes.length; i += 1) {
        hex += (bytes[i] + 0x100).toString(16).slice(1);
    }
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
