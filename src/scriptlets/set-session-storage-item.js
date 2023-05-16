import {
    hit,
    logMessage,
    nativeIsNaN,
    setStorageItem,
    getLimitedStorageItemValue,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet set-session-storage-item
 *
 * @description
 * Adds specified key and its value to sessionStorage object, or updates the value of the key if it already exists.
 * Scriptlet won't set item if storage is full.
 *
 * **Syntax**
 * ```
 * example.com#%#//scriptlet('set-session-storage-item', 'key', 'value')
 * ```
 *
 * - `key` — required, key name to be set.
 * - `value` — required, key value; possible values:
 *     - positive decimal integer `<= 32767`
 *     - one of the predefined constants:
 *         - `undefined`
 *         - `false`
 *         - `true`
 *         - `null`
 *         - `emptyObj` — empty object
 *         - `emptyArr` — empty array
 *         - `''` — empty string
 *         - `yes`
 *         - `no`
 *
 * **Examples**
 * ```
 * example.org#%#//scriptlet('set-session-storage-item', 'player.live.current.mute', 'false')
 *
 * example.org#%#//scriptlet('set-session-storage-item', 'exit-intent-marketing', '1')
 * ```
 *
 * @added v1.4.3.
 */
/* eslint-enable max-len */

export function setSessionStorageItem(source, key, value) {
    if (typeof key === 'undefined') {
        logMessage(source, 'Item key should be specified.');
        return;
    }

    let validValue;
    try {
        validValue = getLimitedStorageItemValue(value);
    } catch {
        logMessage(source, `Invalid storage item value: '${value}'`);
        return;
    }

    const { sessionStorage } = window;
    setStorageItem(source, sessionStorage, key, validValue);
    hit(source);
}

setSessionStorageItem.names = [
    'set-session-storage-item',
];

setSessionStorageItem.injections = [
    hit,
    logMessage,
    nativeIsNaN,
    setStorageItem,
    getLimitedStorageItemValue,
];
