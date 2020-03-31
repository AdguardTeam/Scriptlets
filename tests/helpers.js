export const clearGlobalProps = (...props) => {
    props.forEach((prop) => {
        // Safari does not allow to delete property
        try {
            delete window[prop];
        } catch (e) {
            window[prop] = null;
        }
    });
};
