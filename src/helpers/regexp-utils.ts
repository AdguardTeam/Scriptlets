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
