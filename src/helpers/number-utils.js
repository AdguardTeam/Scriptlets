export const nativeIsNaN = (num) => {
    const native = Number.isNaN || window.isNaN; // eslint-disable-line compat/compat
    return native(num);
};

export const nativeIsFinite = (num) => {
    const native = Number.isFinite || window.isFinite; // eslint-disable-line compat/compat
    return native(num);
};
