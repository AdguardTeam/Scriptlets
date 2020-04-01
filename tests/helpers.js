export const clearGlobalProps = (...props) => {
    props.forEach((prop) => {
        delete window[prop];
        // Safari does not allow to delete property
        // try {
        //     delete window[prop];
        // } catch (e) {
        //     // delete window[`${prop}`];
        //     window[prop] = undefined;
        // }
    });
};
