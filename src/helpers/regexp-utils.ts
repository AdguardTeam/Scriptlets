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
 * @returns {Array} An array containing the values of the RegExp.$1, …, RegExp.$9 properties.
 */
export const backupRegExpValues = (): Array<any> => {
    try {
        const arrayOfRegexpValues = [];
        for (let index = 1; index < 10; index += 1) {
            const value = `$${index}`;
            if (!(RegExp as any)[value]) {
                break;
            }
            arrayOfRegexpValues.push((RegExp as any)[value]);
        }
        return arrayOfRegexpValues;
    } catch (error) {
        return [];
    }
};

/**
 * Sets previous values of the RegExp.$1, …, RegExp.$9 properties.
 *
 * @param {Array} array
 * @returns {void}
 */
export const restoreRegExpValues = (array: Array<any>): void => {
    if (!array.length) {
        return;
    }
    try {
        let stringPattern = '';
        if (array.length === 1) {
            stringPattern = `(${array[0]})`;
        } else {
            // Create a string pattern with a capturing group from passed array,
            // e.g. ['foo', 'bar', 'baz'] will create '(foo),(bar),(baz)' string
            stringPattern = array.reduce((accumulator, currentValue, currentIndex) => {
                if (currentIndex === 1) {
                    return `(${accumulator}),(${currentValue})`;
                }
                return `${accumulator},(${currentValue})`;
            });
        }
        const regExpGroup = new RegExp(stringPattern);
        array.toString().replace(regExpGroup, '');
    } catch (error) {
        const message = `Failed to restore RegExp values: ${error}`;
        // eslint-disable-next-line no-console
        console.log(message);
    }
};
