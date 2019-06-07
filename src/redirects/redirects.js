import jsYaml from 'js-yaml';

class Redirects {
    /**
     * Converts rawYaml into JS object with sources titles used as keys
     * @param rawYaml
     */
    constructor(rawYaml) {
        try {
            const arrOfRedirects = jsYaml.safeLoad(rawYaml);
            this.redirects = arrOfRedirects.reduce((acc, redirect) => {
                return {
                    ...acc,
                    [redirect.title]: redirect,
                };
            }, {});
        } catch (e) {
            // eslint-disable-next-line no-console
            console.log(`Was unable to load YAML into JS due to: ${e.message}`);
            throw e;
        }
    }

    /**
     * Returns string representation of source by title
     * @param {string} title
     * @return {string}
     */
    getSource(title) {
        return this.redirects[title].content;
    }
}

export default Redirects;
