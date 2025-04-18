import { nativeIsNaN } from './number-utils';
import { logMessage } from './log-message';
import { isValidStrPattern, toRegExp } from './string-utils';
import { type StorageItemValue } from '../../types/types';
import { type Source } from '../scriptlets';

/**
 * Stores an item in the specified storage if there is available space.
 *
 * @param source The scriptlet's configuration object.
 * @param storage The storage instance where the item will be set.
 * @param key The key under which the item will be stored.
 * @param value The value to store.
 */
export const setStorageItem = (
    source: Source,
    storage: Storage,
    key: string,
    value: string,
): void => {
    // setItem() may throw an error if the storage is full.
    try {
        storage.setItem(key, value);
    } catch (e) {
        const message = `Unable to set storage item due to: ${(e as Error).message}`;
        logMessage(source, message);
    }
};

/**
 * Removes the key/value pair with the given `key` from the `storage`.
 * If unable to remove, logs the reason to console in debug mode.
 *
 * @param source scriptlet's configuration
 * @param storage storage instance from which item has to be removed
 * @param key storage key
 */
export const removeStorageItem = (source: Source, storage: Storage, key: string): void => {
    try {
        if (
            key.startsWith('/')
            && (key.endsWith('/') || key.endsWith('/i'))
            && isValidStrPattern(key)
        ) {
            const regExpKey = toRegExp(key);
            const storageKeys = Object.keys(storage);
            storageKeys.forEach((storageKey) => {
                if (regExpKey.test(storageKey)) {
                    storage.removeItem(storageKey);
                }
            });
        } else {
            storage.removeItem(key);
        }
    } catch (e) {
        const message = `Unable to remove storage item due to: ${(e as Error).message}`;
        logMessage(source, message);
    }
};

/**
 * Gets supported storage item value
 *
 * @param  value input item value
 * @returns valid item value if ok OR null if not
 */
export const getLimitedStorageItemValue = (value: string): StorageItemValue | null => {
    if (typeof value !== 'string') {
        throw new Error('Invalid value');
    }

    const allowedStorageValues = new Set([
        'undefined',
        'false',
        'true',
        'null',
        '',
        'yes',
        'no',
        'on',
        'off',
        'accept',
        'accepted',
        'reject',
        'rejected',
        'allowed',
        'denied',
        'forbidden',
        'forever',
    ]);

    let validValue;
    if (allowedStorageValues.has(value.toLowerCase())) {
        validValue = value;
    } else if (value === 'emptyArr') {
        validValue = '[]';
    } else if (value === 'emptyObj') {
        validValue = '{}';
    } else if (/^\d+$/.test(value)) {
        validValue = parseFloat(value);
        if (nativeIsNaN(validValue)) {
            throw new Error('Invalid value');
        }
        if (Math.abs(validValue) > 32767) {
            throw new Error('Invalid value');
        }
    } else if (value === '$remove$') {
        validValue = '$remove$';
    } else {
        throw new Error('Invalid value');
    }

    return validValue;
};
