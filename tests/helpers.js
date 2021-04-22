export const clearGlobalProps = (...props) => {
    props.forEach((prop) => {
        try {
            delete window[prop];
        } catch (e) {
            // Safari does not allow to delete property
            window[prop] = null;
        }
    });
};

/**
 * Returns random number from range inclusively min and max
 * @param {number} min minimum range limit
 * @param {number} max maximum range limit
 * @returns {number}
 */
export const getRandomNumber = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
