import {
    hit,
    logMessage,
    parseKeywordValue,
    getThrownValueMessage,
    parseUboOptions,
    unescapeUboArgument,
    uboPatternToRegExp,
    getAdgStorageItemSettings,
    getUboStorageItemSettings,
    setStorageItemBySettings,
    isDigits,
} from '../helpers';

/* eslint-disable max-len */
/**
 * @trustedScriptlet trusted-set-local-storage-item
 *
 * @description
 * Adds item with arbitrary key and value to localStorage object, or updates the value of the key if it already exists.
 * Scriptlet won't set item if storage is full.
 *
 * ### Syntax
 *
 * ```adblock
 * example.com#%#//scriptlet('trusted-set-local-storage-item', 'key', 'value')
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
 * > Keywords listed above can be used as a part of the value as well,
 * > and more than one keyword can be used in it, e.g `'{"count":1,"firstTime":$now$}'`.
 *
 * ### uBO syntax
 *
 * uBO rules are supported with uBO arguments, e.g.
 * `example.org##+js(trusted-set-local-storage-item, consent, emptyObj, reload, 1)`:
 *
 * ```text
 * example.org##+js(trusted-set-local-storage-item, key[, value[, ...options]])
 * ```
 *
 * They differ from the AdGuard syntax as follows, as in uBO:
 *
 * - `value` — empty if it is omitted; `emptyArr` and `emptyObj` set `[]` and `{}`; `$remove$` removes the items
 *   whose keys match `key`, which is matched as the whole key, or as a regular expression, e.g. `/^ads_/`
 * - options are pairs of a name and a value which follow `value`:
 *     - `reload, value` — reloads the page after this number of milliseconds if the storage has been changed;
 *       for a value with keywords only if the item has not existed before, unlike uBO,
 *       which would reload the page each time
 * - the item is set only if it has another value
 * - a rule with an invalid regular expression of `key` is not applied
 *
 * ### Examples
 *
 * 1. Set local storage item
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-local-storage-item', 'player.live.current.mute', 'false')
 *
 *     example.org#%#//scriptlet('trusted-set-local-storage-item', 'COOKIE_CONSENTS', '{"preferences":3,"flag":false}')
 *
 *     example.org#%#//scriptlet('trusted-set-local-storage-item', 'providers', '[16364,88364]')
 *
 *     example.org#%#//scriptlet('trusted-set-local-storage-item', 'providers', '{"providers":[123,456],"consent":"all"}')
 *     ```
 *
 * 1. Set item with current time since unix epoch in ms
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-local-storage-item', 'player.live.current.play', '$now$')
 *     ```
 *
 * 1. Set item with current date, e.g 'Tue Nov 08 2022 13:53:19 GMT+0300'
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-local-storage-item', 'player.live.current.play', '$currentDate$')
 *     ```
 *
 * 1. Set item with keywords used as a part of the value
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-local-storage-item', 'storage_item', '{"count":1,"firstTime":$now$}')
 *     ```
 *
 * 1. Set item without value
 *
 *     ```adblock
 *     example.org#%#//scriptlet('trusted-set-local-storage-item', 'ppu_main_none', '')
 *     ```
 *
 * @added v1.7.3.
 */
/* eslint-enable max-len */

export function trustedSetLocalStorageItem(source, key, value, ...extraArgs) {
    // Rules converted from uBO syntax have uBO names with `ubo-` prefix, and uBO arguments, i.e. named options
    const settings = typeof source.name === 'string' && source.name.startsWith('ubo-')
        ? getUboStorageItemSettings(
            source,
            unescapeUboArgument(key),
            unescapeUboArgument(value),
            extraArgs.map(unescapeUboArgument),
        )
        : getAdgStorageItemSettings(source, key, value);

    if (settings === null) {
        return;
    }

    setStorageItemBySettings(source, window.localStorage, settings);
}

export const trustedSetLocalStorageItemNames = [
    'trusted-set-local-storage-item',
    // aliases are needed for matching the related uBO scriptlet converted into our syntax,
    // trusted scriptlets support no other aliases
    'ubo-trusted-set-local-storage-item.js',
    'ubo-trusted-set-local-storage-item',
];

// eslint-disable-next-line prefer-destructuring
trustedSetLocalStorageItem.primaryName = trustedSetLocalStorageItemNames[0];

trustedSetLocalStorageItem.injections = [
    hit,
    logMessage,
    parseKeywordValue,
    getThrownValueMessage,
    parseUboOptions,
    unescapeUboArgument,
    uboPatternToRegExp,
    getAdgStorageItemSettings,
    getUboStorageItemSettings,
    setStorageItemBySettings,
    // used by parseUboOptions() or getAdgJsonTextMatch()
    isDigits,
];
