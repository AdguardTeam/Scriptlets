export const clearGlobalProps = (...props) => {
    props.forEach((prop) => {
        delete window[prop];
    });
};
