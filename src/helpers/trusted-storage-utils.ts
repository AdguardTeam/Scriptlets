import { hit } from './hit';
import { logMessage } from './log-message';
import { parseKeywordValue } from './parse-keyword-value';
import { getThrownValueMessage } from './get-error-message';
import { parseUboOptions, uboPatternToRegExp } from './ubo-utils';
import { type Source } from '../scriptlets';

/**
 * Settings of `setStorageItemBySettings()`, which are parsed from the arguments of `trusted-set-local-storage-item`
 * or `trusted-set-session-storage-item` once, by `getAdgStorageItemSettings()` or `getUboStorageItemSettings()`.
 */
export interface StorageItemSettings {
    /**
     * Key of the item.
     */
    key: string;

    /**
     * Value to set, with the keywords replaced, e.g. `$now$`.
     */
    value: string;

    /**
     * Regular expression of the keys of the items to remove instead, for `$remove$` of uBO, or `null` to set the item.
     */
    removePattern: RegExp | null;

    /**
     * Delay in milliseconds of reloading the page after the storage has been changed, or `null` not to reload it.
     */
    reloadDelay: number | null;

    /**
     * Regular expression of the values which the rule has set before, for a value with keywords,
     * e.g. `/^\{"ts":\d+\}$/` for `{"ts":$now$}`, or `null` for a value without them.
     * The page is not reloaded if the item has such a value already, as keywords change the value each time,
     * so the page would be reloaded each time otherwise.
     */
    previousValuePattern: RegExp | null;

    /**
     * If true, as in AdGuard syntax, the item is set even if it has the value already.
     */
    isSetUnchanged: boolean;
}

/**
 * Parses the arguments of AdGuard `trusted-set-local-storage-item` and `trusted-set-session-storage-item`,
 * as before: `key` and `value` are required, and the keywords of the value are replaced by `parseKeywordValue()`.
 *
 * Requires `logMessage` and `parseKeywordValue` in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param key Key of the item.
 * @param value Value of the item.
 *
 * @returns Settings of the item, or `null` if an argument is missing, which is logged.
 */
export const getAdgStorageItemSettings = (
    source: Source,
    key: string | undefined,
    value: string | undefined,
): StorageItemSettings | null => {
    if (typeof key === 'undefined') {
        logMessage(source, 'Item key should be specified');
        return null;
    }

    if (typeof value === 'undefined') {
        logMessage(source, 'Item value should be specified');
        return null;
    }

    return {
        key,
        value: parseKeywordValue(value),
        removePattern: null,
        reloadDelay: null,
        previousValuePattern: null,
        isSetUnchanged: true,
    };
};

/**
 * Parses the arguments of uBO `trusted-set-local-storage-item.js` and `trusted-set-session-storage-item.js`,
 * converted to AdGuard syntax, as uBO `setLocalStorageItemFn()` does for trusted rules:
 * - `key` is required, and the value is empty if it is omitted;
 * - `emptyArr` and `emptyObj` are `[]` and `{}`;
 * - the keywords `$now$`, `$currentDate$` and `$currentISODate$` are replaced in this order, as in uBO,
 *   by `Date.now()`, `Date()` and `toISOString()`;
 * - `$remove$` removes the items whose keys match the key, which is matched literally as the whole key,
 *   or as a regular expression, see `uboPatternToRegExp()`;
 * - named options follow the value: `reload, value` reloads the page after this number of milliseconds
 *   if the storage has been changed.
 *
 * Unlike uBO, which removes all the items by an invalid regular expression of the key, the rule with such one
 * is not applied, which is logged. For a value with keywords, the page is not reloaded if the item has a value
 * which the rule has set before, e.g. any time for `$now$`, as the keywords change the value each time,
 * so uBO would reload the page each time.
 *
 * Requires `logMessage`, `parseUboOptions` and `uboPatternToRegExp` in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param key Key of the item, or the pattern of the keys for `$remove$`.
 * @param value Value of the item.
 * @param args Named options which follow the value, e.g. `['reload', '1']`.
 *
 * @returns Settings of the item, or `null` if the rule is not applied, which is logged.
 */
export const getUboStorageItemSettings = (
    source: Source,
    key: unknown,
    value: unknown,
    args: unknown[],
): StorageItemSettings | null => {
    // !IMPORTANT: Do not move constants outside of this function
    const REMOVE_VALUE = '$remove$';
    const EMPTY_ARRAY_VALUE = 'emptyArr';
    const EMPTY_OBJECT_VALUE = 'emptyObj';
    const NOW_VALUE_KEYWORD = '$now$';
    const CURRENT_DATE_KEYWORD = '$currentDate$';
    const CURRENT_ISO_DATE_KEYWORD = '$currentISODate$';

    if (typeof key !== 'string' || key === '') {
        return null;
    }

    let rawValue = typeof value === 'string' ? value : '';
    if (rawValue === EMPTY_ARRAY_VALUE) {
        rawValue = '[]';
    } else if (rawValue === EMPTY_OBJECT_VALUE) {
        rawValue = '{}';
    }

    // Keywords are replaced one after another, as in uBO, which matters for adjacent ones, e.g. `$currentDate$now$`.
    // The pattern of the values set by the rule is built in the same order, with placeholders of the keywords,
    // which cannot be in a rule, as they are control characters
    const NOW_PLACEHOLDER = '\u0001';
    const CURRENT_DATE_PLACEHOLDER = '\u0002';
    const CURRENT_ISO_DATE_PLACEHOLDER = '\u0003';
    const SPECIAL_CHARS_REGEXP = /[.*+?^${}()|[\]\\]/g;

    /**
     * Replaces all occurrences of the text, as `String.prototype.replaceAll()` does.
     *
     * @param text Text to replace in.
     * @param search Text to replace.
     * @param replacement Text to replace with.
     * @returns Replaced text.
     */
    const replaceText = (text: string, search: string, replacement: string): string => {
        return text.split(search).join(replacement);
    };

    let valueTemplate = replaceText(rawValue, NOW_VALUE_KEYWORD, NOW_PLACEHOLDER);
    valueTemplate = replaceText(valueTemplate, CURRENT_DATE_KEYWORD, CURRENT_DATE_PLACEHOLDER);
    valueTemplate = replaceText(valueTemplate, CURRENT_ISO_DATE_KEYWORD, CURRENT_ISO_DATE_PLACEHOLDER);

    let previousValuePattern: RegExp | null = null;
    if (valueTemplate !== rawValue) {
        let patternSource = valueTemplate.replace(SPECIAL_CHARS_REGEXP, '\\$&');
        patternSource = replaceText(patternSource, NOW_PLACEHOLDER, '\\d+');
        patternSource = replaceText(patternSource, CURRENT_DATE_PLACEHOLDER, '.+?');
        patternSource = replaceText(patternSource, CURRENT_ISO_DATE_PLACEHOLDER, '\\d{4}-\\d{2}-\\d{2}T[\\d:.]+Z');
        previousValuePattern = new RegExp(`^${patternSource}$`);
    }

    let parsedValue = rawValue;
    if (parsedValue.includes(NOW_VALUE_KEYWORD)) {
        parsedValue = replaceText(parsedValue, NOW_VALUE_KEYWORD, `${Date.now()}`);
    }
    if (parsedValue.includes(CURRENT_DATE_KEYWORD)) {
        parsedValue = replaceText(parsedValue, CURRENT_DATE_KEYWORD, `${Date()}`);
    }
    if (parsedValue.includes(CURRENT_ISO_DATE_KEYWORD)) {
        parsedValue = replaceText(parsedValue, CURRENT_ISO_DATE_KEYWORD, new Date().toISOString());
    }

    let removePattern: RegExp | null = null;
    if (parsedValue === REMOVE_VALUE) {
        removePattern = uboPatternToRegExp(key, '', true);
        if (removePattern === null) {
            logMessage(source, `Invalid regular expression of key: ${key}`);
            return null;
        }
    }

    const options = parseUboOptions(args);

    return {
        key,
        value: parsedValue,
        removePattern,
        // As in uBO, a number of milliseconds, also `0`, reloads the page
        reloadDelay: typeof options.reload === 'number' ? options.reload : null,
        previousValuePattern,
        isSetUnchanged: false,
    };
};

/**
 * Sets or removes the storage items by the settings parsed by `getAdgStorageItemSettings()`
 * or `getUboStorageItemSettings()`, and reloads the page if it is set and the storage has been changed.
 * An error of the storage, e.g. if it is full, is logged.
 *
 * Requires `hit`, `logMessage` and `getThrownValueMessage` in the injections of the scriptlet.
 *
 * @param source Scriptlet properties.
 * @param storage Storage of the item, i.e. `localStorage` or `sessionStorage`.
 * @param settings Settings of the item.
 */
export const setStorageItemBySettings = (
    source: Source,
    storage: Storage,
    settings: StorageItemSettings,
): void => {
    const {
        key,
        value,
        removePattern,
        reloadDelay,
        previousValuePattern,
        isSetUnchanged,
    } = settings;

    let isModified = false;
    let isSetBefore = false;
    try {
        if (removePattern !== null) {
            // Keys are collected before they are removed, as removing changes the indexes of the other ones
            const keysToRemove = [];
            for (let i = 0; i < storage.length; i += 1) {
                const storageKey = storage.key(i);
                removePattern.lastIndex = 0;
                if (storageKey !== null && removePattern.test(storageKey)) {
                    keysToRemove.push(storageKey);
                }
            }
            isModified = keysToRemove.length !== 0;
            for (let i = 0; i < keysToRemove.length; i += 1) {
                storage.removeItem(keysToRemove[i]);
            }
        } else {
            const previousValue = storage.getItem(key);
            isSetBefore = previousValue !== null
                && previousValuePattern !== null
                && previousValuePattern.test(previousValue);
            isModified = previousValue !== value;
            if (isModified || isSetUnchanged) {
                storage.setItem(key, value);
            }
        }
    } catch (error) {
        // e.g. if the storage is full
        logMessage(source, `Unable to set storage item due to: ${getThrownValueMessage(error)}`);
        // As before, AdGuard rules are counted even if the item cannot be set
        if (isSetUnchanged) {
            hit(source);
        }
        return;
    }

    if (isModified || isSetUnchanged) {
        hit(source);
    }

    if (reloadDelay !== null && isModified && !isSetBefore) {
        setTimeout(() => {
            window.location.reload();
        }, reloadDelay);
    }
};
