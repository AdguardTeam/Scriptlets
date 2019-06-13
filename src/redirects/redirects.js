import jsYaml from 'js-yaml';

/**
 * Redirect - object used to redirect some requests
 * e.g.
 * {
 *      title: 1x1-transparent.gif
 *      comment: http://probablyprogramming.com/2009/03/15/the-tiniest-gif-ever
 *      contentType: image/gif;base64
 *      content: R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
 * }
 * @typedef {Object} Redirect
 * @property {string} title
 * @property {string} comment
 * @property {string} content
 * @property {string} contentType
 */

class Redirects {
    /**
     * Converts rawYaml into JS object with sources titles used as keys
     * @param rawYaml
     * @returns {Object<Redirect>} - return object with titles in the keys and RedirectSources
     * in the values
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
     * Returns redirect source object
     * @param {string} title
     * @return {Redirect}
     */
    getRedirect(title) {
        if (Object.prototype.hasOwnProperty.call(this.redirects, title)) {
            return this.redirects[title];
        }
        // look title among aliases
        return Object.values(this.redirects).find((redirect) => {
            const { aliases } = redirect;
            if (!aliases) {
                return false;
            }
            return aliases.includes(title);
        });
    }
}

export default Redirects;
