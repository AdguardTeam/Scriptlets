import {
    hit,
    noopObject,
    noopArray,
    nativeIsNaN,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @scriptlet set-local-storage-item
 *
 * @description
 * Sets given key and value to Storage object, or updates that key's value if it already exists.
 *
 * **Syntax**
 * ```
 * example.com#%#//scriptlet('set-local-storage-item', 'name', 'value')
 * ```
 *
 * - `name` — required, key name to be set.
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
 *
 * **Examples**
 * ```
 * example.org#%#//scriptlet('set-local-storage-item', 'player.live.current.mute', 'false')
 *
 * example.org#%#//scriptlet('set-local-storage-item', 'exit-intent-marketing', '1')
 * ```
 */
/* eslint-enable max-len */

export function setLocalStorageItem(source, name, value) {
    if (!name || !value) {
        return;
    }

    const emptyArr = noopArray();
    const emptyObj = noopObject();

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
        keyValue = emptyArr;
    } else if (value === 'emptyObj') {
        keyValue = emptyObj;
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
    } else {
        return;
    }

    const setItem = (name, value) => {
        const { localStorage } = window.localStorage;
        // setItem() may throw an exception if the storage is full.
        try {
            localStorage.setItem(name, value);
            if (localStorage.getItem(name)) {
                hit(source);
            }
        } catch (e) {
            // eslint-disable-next-line no-console
            console.log(`Was unable to set localStorage item due to: ${e.message}`);
            throw e;
        }
    };

    setItem(name, keyValue);
}

setLocalStorageItem.names = [
    'set-local-storage-item',
];

setLocalStorageItem.injections = [
    hit,
    noopObject,
    noopArray,
    nativeIsNaN,
];
