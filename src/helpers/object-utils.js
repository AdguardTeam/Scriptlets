/**
 * Checks whether the obj is an empty object
 *
 * @param {Object} obj arbitrary object
 * @returns {boolean} if object is empty
 */
export const isEmptyObject = (obj) => Object.keys(obj).length === 0 && !obj.prototype;

/**
 * Safely retrieve property descriptor
 *
 * @param {Object} obj target object
 * @param {string} prop target property
 * @returns {object|null} descriptor or null if it's not available or non-configurable
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
 *
 * @param {Object} object target object with property
 * @param {string} property property name
 * @param {Object} descriptor contains getter and setter functions
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
