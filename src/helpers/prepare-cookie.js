import { nativeIsNaN } from './number-utils';
/**
 * Prepares cookie string if given parameters are ok
 * @param {string} name cookie name to set
 * @param {string} value cookie value to set
 * @returns {string|null} cookie string if ok OR null if not
 */
export const prepareCookie = (name, value) => {
    if (!name || !value) {
        return null;
    }

    let valueToSet;
    if (value === 'true') {
        valueToSet = 'true';
    } else if (value === 'True') {
        valueToSet = 'True';
    } else if (value === 'false') {
        valueToSet = 'false';
    } else if (value === 'False') {
        valueToSet = 'False';
    } else if (value === 'yes') {
        valueToSet = 'yes';
    } else if (value === 'Yes') {
        valueToSet = 'Yes';
    } else if (value === 'Y') {
        valueToSet = 'Y';
    } else if (value === 'no') {
        valueToSet = 'no';
    } else if (value === 'ok') {
        valueToSet = 'ok';
    } else if (value === 'OK') {
        valueToSet = 'OK';
    } else if (/^\d+$/.test(value)) {
        valueToSet = parseFloat(value);
        if (nativeIsNaN(valueToSet)) {
            return null;
        }
        if (Math.abs(valueToSet) < 0 || Math.abs(valueToSet) > 15) {
            return null;
        }
    } else {
        return null;
    }

    const pathToSet = 'path=/;';
    // eslint-disable-next-line max-len
    const cookieData = `${encodeURIComponent(name)}=${encodeURIComponent(valueToSet)}; ${pathToSet}`;

    return cookieData;
};
