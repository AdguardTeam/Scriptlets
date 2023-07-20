import {
    hit,
    logMessage,
    nativeIsNaN,
    setStorageItem,
    removeStorageItem,
    getLimitedStorageItemValue,
} from '../helpers/index';

/* eslint-disable max-len */
/**
 * @scriptlet set-local-storage-item
 *
 * @description
 * Adds specified key and its value to localStorage object, or updates the value of the key if it already exists.
 * Scriptlet won't set item if storage is full.
 *
 * To remove item from localStorage use `$remove$` as a value.
 *
 * ### Syntax
 *
 * ```text
 * example.com#%#//scriptlet('set-local-storage-item', 'key', 'value')
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
 *         - `$remove$` — remove specific item from localStorage
 *
 * ### Examples
 *
 * ```adblock
 * example.org#%#//scriptlet('set-local-storage-item', 'player.live.current.mute', 'false')
 *
 * example.org#%#//scriptlet('set-local-storage-item', 'exit-intent-marketing', '1')
 *
 * ! Removes the item with key 'foo' from local storage
 * example.org#%#//scriptlet('set-local-storage-item', 'foo', '$remove$')
 * ```
 *
 * @added v1.4.3.
 */
/* eslint-enable max-len */

export function setLocalStorageItem(source, key, value) {
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

    const { localStorage } = window;
    if (validValue === '$remove$') {
        removeStorageItem(source, localStorage, key);
    } else {
        setStorageItem(source, localStorage, key, validValue);
    }
    hit(source);
}

setLocalStorageItem.names = [
    'set-local-storage-item',
];

setLocalStorageItem.injections = [
    hit,
    logMessage,
    nativeIsNaN,
    setStorageItem,
    removeStorageItem,
    getLimitedStorageItemValue,
];
