/**
 * Set getter and setter to propety if it's configurable
 * @param {Object} object target object with proprty
 * @param {string} property property name
 * @param {Object} descriptor contains getter and setter functions
 * @returns {boolean} is operation successfull
 */
function setPropertyAccess(object, property, descriptor) {
    const currentDescriptor = Object.getOwnPropertyDescriptor(object, property);
    if (currentDescriptor && !currentDescriptor.configurable) {
        return false;
    }
    Object.defineProperty(object, property, descriptor);
    return true;
}

export default setPropertyAccess;