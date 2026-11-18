/**
 * Returns the native `RegExp.prototype.test` method if it exists.
 *
 * @returns The native `RegExp.prototype.test` method.
 * @throws If `RegExp.prototype.test` is not a function.
 */
export const getNativeRegexpTest = (): (string: string) => boolean => {
    const descriptor = Object.getOwnPropertyDescriptor(RegExp.prototype, 'test');
    const nativeRegexTest = descriptor?.value;
    if (descriptor && typeof descriptor.value === 'function') {
        return nativeRegexTest;
    }
    throw new Error('RegExp.prototype.test is not a function');
};

/**
 * Returns a function which tests the text by the regular expression with `RegExp.prototype.test` saved when this
 * function is called, e.g. when the rule runs, so that a rule which intercepts the method later, or the page,
 * cannot change the matching, e.g. by replacing the tested text.
 *
 * If the method cannot be saved, as it is not a function in a data property, e.g. an accessor defined
 * by `abort-current-inline-script` or `set-constant`, `test()` of the regular expression is called instead,
 * i.e. the current method, as before it was saved, so the rule is still applied. The method is not read
 * through the accessor here, as its getter may throw, e.g. while `abort-current-inline-script`
 * aborts the inline script in which the rule runs.
 *
 * Requires `getNativeRegexpTest` in the injections of the scriptlet.
 *
 * @returns Function which tests the text by the regular expression.
 */
export const getRegexpTester = (): (regexp: RegExp, text: string) => boolean => {
    let nativeRegexpTest: ((string: string) => boolean) | null = null;
    try {
        nativeRegexpTest = getNativeRegexpTest();
    } catch {
        // The current method is called by the regular expression instead
    }

    return (regexp: RegExp, text: string): boolean => (nativeRegexpTest !== null
        ? nativeRegexpTest.call(regexp, text)
        : regexp.test(text));
};

/**
 * Retrieves the values of the global RegExp.$1, …, RegExp.$9 properties
 * The problem is that RegExp.$1 is modified by scriptlet and according
 * to https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/n#description
 * the values of $1, …, $9 update whenever a RegExp instance makes a successful match
 * so we need to save these values and then change them back.
 * Related issue - https://github.com/AdguardTeam/Scriptlets/issues/384
 *
 * All nine values are saved, also empty ones, e.g. the empty `$1` of `/(sku-)?(\d+)/` for `42`, whose `$2` is `42`.
 *
 * @returns {Array} An array containing the values of the RegExp.$1, …, RegExp.$9 properties,
 * or an empty array if they cannot be read.
 */
export const backupRegExpValues = (): Array<any> => {
    try {
        const arrayOfRegexpValues = [];
        for (let index = 1; index < 10; index += 1) {
            arrayOfRegexpValues.push((RegExp as any)[`$${index}`]);
        }
        return arrayOfRegexpValues;
    } catch (error) {
        return [];
    }
};

/**
 * Sets previous values of the RegExp.$1, …, RegExp.$9 properties, if any of them has changed,
 * by matching their concatenation by a group for each of them, of the length of the value,
 * so the values are not a part of the regular expression, which would be invalid or too large otherwise,
 * e.g. for JSON which the page has extracted by a capture.
 * The last value which is not empty is matched by `*`, which is followed only by empty groups, so nothing
 * is backtracked, while `*` followed by a count would backtrack through the value for each of its characters,
 * e.g. for 2.6 s for a script and JSON in it of 65 KB, captured by the page together.
 * The values are not restored if the counted ones, i.e. the values before the last one which is not empty,
 * are longer than 1,000,000 UTF-16 code units in total, as a count of millions of them exceeds the call stack,
 * e.g. a script of more than 1 MB and JSON in it, captured together, while a single long value, or a long last one,
 * is restored. The page sees the changed values then, as before, only if it reads them after the intercepted call.
 * The saved values are strings, which are read as they are, without `String()`, which may be intercepted
 * by a rule whose getter restores the values itself, e.g. `log-on-stack-trace`, which would call it again.
 *
 * @param {Array} array values saved by `backupRegExpValues()`
 * @returns {void}
 */
export const restoreRegExpValues = (array: Array<any>): void => {
    // !IMPORTANT: Do not move constants outside of this function
    const ANY_CHARS_PATTERN = '[\\s\\S]';
    const MAX_COUNTED_LENGTH = 1000000;

    if (!array.length) {
        return;
    }
    try {
        let isChanged = false;
        let lastValueIndex = -1;
        for (let i = 0; i < array.length; i += 1) {
            const value = array[i];
            if (typeof value !== 'string') {
                return;
            }
            if (value !== (RegExp as any)[`$${i + 1}`]) {
                isChanged = true;
            }
            if (value.length > 0) {
                lastValueIndex = i;
            }
        }
        if (!isChanged) {
            return;
        }

        // e.g. ['foo', 'bazz', ''] creates '^([\s\S]{3})([\s\S]*)([\s\S]{0})$' for 'foobazz'
        let stringPattern = '';
        let text = '';
        let countedLength = 0;
        for (let i = 0; i < array.length; i += 1) {
            const value = array[i];
            if (i === lastValueIndex) {
                stringPattern += `(${ANY_CHARS_PATTERN}*)`;
            } else {
                stringPattern += `(${ANY_CHARS_PATTERN}{${value.length}})`;
                countedLength += value.length;
            }
            text += value;
        }
        if (countedLength > MAX_COUNTED_LENGTH) {
            return;
        }
        new RegExp(`^${stringPattern}$`).exec(text);
    } catch (error) {
        const message = `Failed to restore RegExp values: ${error}`;
        // eslint-disable-next-line no-console
        console.log(message);
    }
};
