import { nativeIsNaN } from './number-utils';
import { logMessage } from './log-message';

/**
 * Sets item to a specified storage, if storage isn't full.
 *
 * @param {Object} source scriptlet's configuration
 * @param {Storage} storage storage instance to set item into
 * @param {string} key storage key
 * @param {string} value staroge value
 */
export const setStorageItem = (source, storage, key, value) => {
    // setItem() may throw an exception if the storage is full.
    try {
        storage.setItem(key, value);
    } catch (e) {
        const message = `Unable to set sessionStorage item due to: ${e.message}`;
        logMessage(source, message);
    }
};

/**
 * Gets supported storage item value
 *
 * @param {string} value input item value
 * @returns {string|null|undefined|boolean} valid item value if ok OR null if not
 */
export const getLimitedStorageItemValue = (value) => {
    if (typeof value !== 'string') {
        throw new Error('Invalid value');
    }

    let validValue;
    if (value === 'undefined') {
        validValue = undefined;
    } else if (value === 'false') {
        validValue = false;
    } else if (value === 'true') {
        validValue = true;
    } else if (value === 'null') {
        validValue = null;
    } else if (value === 'emptyArr') {
        validValue = '[]';
    } else if (value === 'emptyObj') {
        validValue = '{}';
    } else if (value === '') {
        validValue = '';
    } else if (/^\d+$/.test(value)) {
        validValue = parseFloat(value);
        if (nativeIsNaN(validValue)) {
            throw new Error('Invalid value');
        }
        if (Math.abs(validValue) > 0x7FFF) {
            throw new Error('Invalid value');
        }
    } else if (value === 'yes') {
        validValue = 'yes';
    } else if (value === 'no') {
        validValue = 'no';
    } else {
        throw new Error('Invalid value');
    }

    return validValue;
};
