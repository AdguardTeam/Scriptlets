/**
 * Sets item to a specified storage, if storage isn't full.
 * @param {Storage} storage storage instance to set item into
 * @param {string} key
 * @param {string} value
 * @param {boolean} shouldLog determines if helper should log on a failed set attempt
 */
export const setStorageItem = (storage, key, value, shouldLog) => {
    // eslint-disable-next-line no-console
    const log = console.log.bind(console);
    // setItem() may throw an exception if the storage is full.
    try {
        storage.setItem(key, value);
    } catch (e) {
        if (shouldLog) {
            log(`Unable to set sessionStorage item due to: ${e.message}`);
        }
    }
};
