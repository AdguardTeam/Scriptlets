import {
    hit,
    nativeIsNaN,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet set-local-storage-item
 *
 * @description
 * Adds specified key and its value to localStorage object, or updates the value of the key if it already exists.
 *
 * **Syntax**
 * ```
 * example.com#%#//scriptlet('set-local-storage-item', 'key', 'value')
 * ```
 *
 * - `key` — required, key name to be set.
 * - `value` - required, key value; possible values:
 *     - positive decimal integer `<= 32767`
 *     - one of the predefined constants:
 *         - `undefined`
 *         - `false`
 *         - `true`
 *         - `null`
 *         - `emptyObj` - empty object
 *         - `emptyArr` - empty array
 *         - `''` - empty string
 *         - `yes`
 *         - `no`
 *
 * **Examples**
 * ```
 * example.org#%#//scriptlet('set-local-storage-item', 'player.live.current.mute', 'false')
 *
 * example.org#%#//scriptlet('set-local-storage-item', 'exit-intent-marketing', '1')
 * ```
 */
/* eslint-enable max-len */

export function setLocalStorageItem(source, key, value) {
    if (!key || (!value && value !== '')) {
        return;
    }

    let keyValue;
    if (value === 'undefined') {
        keyValue = undefined;
    } else if (value === 'false') {
        keyValue = false;
    } else if (value === 'true') {
        keyValue = true;
    } else if (value === 'null') {
        keyValue = null;
    } else if (value === 'emptyArr') {
        keyValue = '[]';
    } else if (value === 'emptyObj') {
        keyValue = '{}';
    } else if (value === '') {
        keyValue = '';
    } else if (/^\d+$/.test(value)) {
        keyValue = parseFloat(value);
        if (nativeIsNaN(keyValue)) {
            return;
        }
        if (Math.abs(keyValue) > 0x7FFF) {
            return;
        }
    } else if (value === 'yes') {
        keyValue = 'yes';
    } else if (value === 'no') {
        keyValue = 'no';
    } else {
        return;
    }

    const setItem = (key, value) => {
        const { localStorage } = window;
        // setItem() may throw an exception if the storage is full.
        try {
            localStorage.setItem(key, value);
            hit(source);
        } catch (e) {
            if (source.verbose) {
                // eslint-disable-next-line no-console
                console.log(`Was unable to set localStorage item due to: ${e.message}`);
            }
        }
    };

    setItem(key, keyValue);
}

setLocalStorageItem.names = [
    'set-local-storage-item',
];

setLocalStorageItem.injections = [
    hit,
    nativeIsNaN,
];
