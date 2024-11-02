import {
    hit,
    logMessage,
    nativeIsNaN,
    setStorageItem,
    parseKeywordValue,
} from '../helpers/index';
import { Source } from '../../types/types';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-set-session-storage-item
 *
 * @description
 * Adds item with arbitrary key and value to sessionStorage object, or updates the value of the key if it already exists.
 * Scriptlet won't set item if storage is full.
 *
 * ### Syntax
 *
 * ```adblock
 * example.com#%#//scriptlet('trusted-set-session-storage-item', 'key', 'value')
 * ```
 *
 * - `key` — required, key name to be set.
 * - `value` — required, key value; possible values:
 *     - arbitrary value
 *     - `$now$` keyword for setting current time in ms, corresponds to `Date.now()` and `(new Date).getTime()` calls
 *     - `$currentDate$` keyword for setting string representation of the current date and time,
 *       corresponds to `Date()` and `(new Date).toString()` calls
 *     - `$currentISODate$` keyword for setting current date in the date time string format,
 *       corresponds to `(new Date).toISOString()` call, e.g '2022-11-08T13:53:19.650Z'
 *
 * ### Examples
 *
 * 1. Set session storage item
 *
 *     <!-- markdownlint-disable line-length -->
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-session-storage-item', 'player.live.current.mute', 'false')
 *
 *     example.org#%#//scriptlet('trusted-set-session-storage-item', 'COOKIE_CONSENTS', '{"preferences":3,"flag":false}')
 *
 *     example.org#%#//scriptlet('trusted-set-session-storage-item', 'providers', '[16364,88364]')
 *
 *     example.org#%#//scriptlet('trusted-set-session-storage-item', 'providers', '{"providers":[123,456],"consent":"all"}')
 *     ```
 *
 *     <!-- markdownlint-enable line-length -->
 *
 * 1. Set item with current time since unix epoch in ms
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-session-storage-item', 'player.live.current.play', '$now$')
 *     ```
 *
 * 1. Set item with current date, e.g 'Tue Nov 08 2022 13:53:19 GMT+0300'
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-session-storage-item', 'player.live.current.play', '$currentDate$')
 *     ```
 *
 * 1. Set item without value
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-session-storage-item', 'ppu_main_none', '')
 *     ```
 *
 * @added v1.11.16.
 */
/* eslint-enable max-len */

export function trustedSetSessionStorageItem(
    source: Source,
    key: string,
    value: string,
) {
    if (typeof key === 'undefined') {
        logMessage(source, 'Item key should be specified');
        return;
    }

    if (typeof value === 'undefined') {
        logMessage(source, 'Item value should be specified');
        return;
    }

    const parsedValue = parseKeywordValue(value);

    const { sessionStorage } = window;
    setStorageItem(source, sessionStorage, key, parsedValue);
    hit(source);
}

export const trustedSetSessionStorageItemNames = [
    'trusted-set-session-storage-item',
    // trusted scriptlets support no aliases
];

// eslint-disable-next-line prefer-destructuring
trustedSetSessionStorageItem.primaryName = trustedSetSessionStorageItemNames[0];

trustedSetSessionStorageItem.injections = [
    hit,
    logMessage,
    nativeIsNaN,
    setStorageItem,
    parseKeywordValue,
];
