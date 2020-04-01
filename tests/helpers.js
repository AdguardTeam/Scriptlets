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
