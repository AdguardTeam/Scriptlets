export const getNativeRegexpTest = () => Object.getOwnPropertyDescriptor(RegExp.prototype, 'test').value;
