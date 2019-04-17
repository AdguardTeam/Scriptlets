export const clearProperties = (...props) => {
    props.forEach((prop) => {
        delete window[prop];
    });
};
