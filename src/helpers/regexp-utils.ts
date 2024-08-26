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
