/**
 * Converts object to array of pairs.
 * Object.entries() polyfill because it is not supported by IE
 * https://caniuse.com/?search=Object.entries
 * @param {Object} object
 * @returns {Array} array of pairs
 */
export const getObjectEntries = (object) => {
    const keys = Object.keys(object);
    const entries = [];
    keys.forEach((key) => entries.push([key, object[key]]));
    return entries;
};

/**
 * Converts array of pairs to object.
 * Object.fromEntries() polyfill because it is not supported by IE
 * https://caniuse.com/?search=Object.fromEntries
 * @param {Array} entries - array of pairs
 * @returns {Object}
 */
export const getObjectFromEntries = (entries) => {
    const output = entries
        .reduce((acc, el) => {
            const key = el[0];
            const value = el[1];
            acc[key] = value;
            return acc;
        }, {});
    return output;
};

/**
 * Checks whether the obj is an empty object
 * @param {Object} obj
 * @returns {boolean}
 */
export const isEmptyObject = (obj) => Object.keys(obj).length === 0;

/**
 * Checks whether the obj is an empty object
 * @param {Object} obj
 * @param {string} prop
 * @returns {Object|null}
 */
export const safeGetDescriptor = (obj, prop) => {
    const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
    if (descriptor && descriptor.configurable) {
        return descriptor;
    }
    return null;
};

/**
 * Set getter and setter to property if it's configurable
 * @param {Object} object target object with property
 * @param {string} property property name
 * @param {PropertyDescriptor} descriptor contains getter and setter functions
 * @returns {boolean} is operation successful
 */
export function setPropertyAccess(object, property, descriptor) {
    const currentDescriptor = Object.getOwnPropertyDescriptor(object, property);
    if (currentDescriptor && !currentDescriptor.configurable) {
        return false;
    }
    Object.defineProperty(object, property, descriptor);
    return true;
}
