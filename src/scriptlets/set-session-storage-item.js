import {
    hit,
    logMessage,
    nativeIsNaN,
    setStorageItem,
    removeStorageItem,
    getLimitedStorageItemValue,
    isValidStrPattern,
    toRegExp,
    escapeRegExp,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet set-session-storage-item
 *
 * @description
 * Adds specified key and its value to sessionStorage object, or updates the value of the key if it already exists.
 * Scriptlet won't set item if storage is full.
 *
 * To remove item from sessionStorage use `$remove$` as a value.
 *
 * Related UBO scriptlet:
 * https://github.com/gorhill/uBlock/wiki/Resources-Library#set-session-storage-itemjs-
 *
 * ### Syntax
 *
 * ```text
 * example.com#%#//scriptlet('set-session-storage-item', 'key', 'value')
 * ```
 *
 * - `key` — required, key name to be set. Should be a string for setting,
 *   but it also can be a regular expression for removing items from localStorage.
 * - `value` — required, key value; possible values:
 *     - positive decimal integer `<= 32767`
 *     - one of the predefined constants in any case variation:
 *         - `undefined`
 *         - `false`
 *         - `true`
 *         - `null`
 *         - `emptyObj` — empty object
 *         - `emptyArr` — empty array
 *         - `''` — empty string
 *         - `yes`
 *         - `no`
 *         - `on`
 *         - `off`
 *         - `accept`
 *         - `accepted`
 *         - `reject`
 *         - `rejected`
 *         - `allowed`
 *         - `denied`
 *         - `$remove$` — remove specific item from sessionStorage
 *         - `forbidden`
 *         - `forever`
 *
 * ### Examples
 *
 * ```adblock
 * example.org#%#//scriptlet('set-session-storage-item', 'player.live.current.mute', 'false')
 *
 * example.org#%#//scriptlet('set-session-storage-item', 'exit-intent-marketing', '1')
 *
 * ! Removes the item with key 'foo' from session storage
 * example.org#%#//scriptlet('set-session-storage-item', 'foo', '$remove$')
 *
 * ! Removes from session storage all items whose key matches the regular expression `/mp_.*_mixpanel/`
 * example.org#%#//scriptlet('set-session-storage-item', '/mp_.*_mixpanel/', '$remove$')
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
    if (validValue === '$remove$') {
        removeStorageItem(source, sessionStorage, key);
    } else {
        setStorageItem(source, sessionStorage, key, validValue);
    }
    hit(source);
}

export const setSessionStorageItemNames = [
    'set-session-storage-item',
    // aliases are needed for matching the related scriptlet converted into our syntax
    'set-session-storage-item.js',
    'ubo-set-session-storage-item.js',
    'ubo-set-session-storage-item',
];

// eslint-disable-next-line prefer-destructuring
setSessionStorageItem.primaryName = setSessionStorageItemNames[0];

setSessionStorageItem.injections = [
    hit,
    logMessage,
    nativeIsNaN,
    setStorageItem,
    removeStorageItem,
    getLimitedStorageItemValue,
    // following helpers are needed for helpers above
    isValidStrPattern,
    toRegExp,
    escapeRegExp,
];
